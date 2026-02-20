#!/usr/bin/env node

/**
 * Chronos CLI
 *
 * Command-line interface for hooks to interact with Chronos state.
 *
 * Usage:
 *   chronos ralph-status        - Get Ralph Loop status
 *   chronos ralph-start [opts]  - Start Ralph Loop
 *   chronos ralph-continue      - Continue Ralph Loop (increment + check)
 *   chronos ralph-stop [reason] - Stop Ralph Loop
 *   chronos boulder-status      - Get Boulder status
 *   chronos should-continue     - Check if should continue (for hooks)
 *   chronos status              - Get full status
 */

import {
  readRalphState,
  startRalphLoop,
  stopRalphLoop,
  shouldContinue as ralphShouldContinue,
} from "./lib/ralph-state.js";

import {
  readBoulderState,
  getActivePlanProgress,
} from "./lib/boulder-state.js";

import { readAutopilotState, PHASE_NAMES } from "./lib/autopilot-state.js";
import { readDebateState } from "./lib/debate-state.js";
import { readEcomodeState } from "./lib/ecomode-state.js";
import {
  readWorkmodeState,
  enableWorkmode,
  disableWorkmode,
  shouldBlockModification,
} from "./lib/workmode-state.js";

import {
  canSpawnAgent,
  getAgentLimiterStatus,
  setAgentLimit,
  cleanupStaleAgents,
  clearAllAgents,
} from "./lib/agent-limiter.js";

const directory = process.cwd();
const command = process.argv[2];
const args = process.argv.slice(3);

function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

function outputHookDecision(shouldContinue, reason) {
  // Hook schema: { continue: boolean, reason?: string }
  console.log(JSON.stringify({ continue: shouldContinue, reason }));
}

async function main() {
  switch (command) {
    case "ralph-status": {
      const state = readRalphState(directory);
      if (state) {
        output(state);
      } else {
        output({ active: false, message: "No Ralph state" });
      }
      break;
    }

    case "ralph-start": {
      const opts = {};
      for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace(/^--/, "");
        const value = args[i + 1];
        if (key === "promise") opts.completion_promise = value;
        if (key === "max") opts.max_iterations = parseInt(value, 10);
      }
      const state = startRalphLoop(directory, opts);
      output({ success: true, state });
      break;
    }

    case "ralph-continue": {
      const decision = ralphShouldContinue(directory);
      if (decision.continue) {
        outputHookDecision(
          true,
          `Continuing iteration ${decision.iteration}/${decision.max_iterations}. Resume work on incomplete tasks.`
        );
      } else {
        // Don't output anything when stopping - just exit silently
        process.exit(0);
      }
      break;
    }

    case "ralph-stop": {
      const reason = args[0] || "manual_stop";
      const state = stopRalphLoop(directory, reason);
      output({ success: !!state, state });
      break;
    }

    case "boulder-status": {
      const state = readBoulderState(directory);
      const progress = getActivePlanProgress(directory);
      output({ state, progress });
      break;
    }

    case "should-continue": {
      // Main hook entry point
      const ralph = readRalphState(directory);

      // If Ralph is active, use Ralph's decision
      if (ralph?.active) {
        const decision = ralphShouldContinue(directory);
        if (decision.continue) {
          outputHookDecision(
            true,
            `Continuing iteration ${decision.iteration}/${decision.max_iterations}. Resume work on incomplete tasks.`
          );
        }
        // If not continuing, exit silently
        process.exit(0);
        return;
      }

      // Check Boulder progress
      const progress = getActivePlanProgress(directory);
      if (progress && !progress.isComplete) {
        outputHookDecision(
          true,
          `Plan "${progress.plan_name}" has ${progress.total - progress.completed} task(s) remaining. Continue working on incomplete todos.`
        );
        process.exit(0);
        return;
      }

      // No reason to continue - exit silently
      process.exit(0);
      break;
    }

    case "status": {
      const ralph = readRalphState(directory);
      const boulder = readBoulderState(directory);
      const progress = getActivePlanProgress(directory);
      output({
        ralph: ralph || { active: false },
        boulder: boulder || null,
        progress: progress || null,
      });
      break;
    }

    case "workmode-status": {
      const state = readWorkmodeState(directory);
      output(state);
      break;
    }

    case "workmode-enable": {
      const mode = args[0] || "autopilot";
      const opts = {};
      for (let i = 1; i < args.length; i += 2) {
        const key = args[i]?.replace(/^--/, "");
        const value = args[i + 1];
        if (key === "fast") opts.fast = true;
        if (key === "swarm") opts.swarm = parseInt(value, 10);
        if (key === "ui") opts.ui = true;
      }
      const state = enableWorkmode(directory, mode, opts);
      output({ success: true, state });
      break;
    }

    case "workmode-disable": {
      const result = disableWorkmode(directory);
      output(result);
      break;
    }

    case "workmode-check": {
      const agent = args[0] || "main";
      const filePath = args[1] || "";
      const result = shouldBlockModification(directory, agent, filePath);
      output(result);
      break;
    }

    case "context-reminder": {
      // Read all states
      const ralph = readRalphState(directory);
      const boulder = readBoulderState(directory);
      const autopilot = readAutopilotState(directory);
      const ecomode = readEcomodeState(directory);
      const debate = readDebateState(directory);
      const workmode = readWorkmodeState(directory);

      // Check if any active workflow exists
      const hasActiveWork =
        ralph?.active ||
        boulder?.plan_path ||
        autopilot?.status === "running" ||
        debate?.status === "analyzing" ||
        debate?.status === "debating" ||
        debate?.status === "voting" ||
        workmode?.active;

      // If no active work, exit silently
      if (!hasActiveWork) {
        process.exit(0);
      }

      // Output reminder
      console.log("⚠️ POST-COMPACT STATE RECOVERY");
      console.log("");
      console.log(
        "This session resumed after compact. Review the following state:"
      );
      console.log("");

      if (workmode?.active) {
        console.log(`📍 Workmode: ${workmode.mode} (active)`);
        if (workmode.options?.fast) console.log("   - Fast mode");
        if (workmode.options?.swarm) console.log(`   - Swarm: ${workmode.options.swarm} agents`);
        if (workmode.options?.ui) console.log("   - UI verification enabled");
      }

      if (ralph?.active) {
        console.log(
          `📍 Ralph Loop: active (${ralph.iteration}/${ralph.max_iterations})`
        );
      }

      if (boulder?.plan_path) {
        const progress = getActivePlanProgress(directory);
        console.log(`📍 Boulder: ${progress?.plan_name || "active"}`);
        if (progress) {
          console.log(`   Progress: ${progress.completed}/${progress.total} tasks`);
        }
      }

      if (autopilot?.status === "running") {
        console.log(
          `📍 Autopilot: Phase ${autopilot.current_phase} (${PHASE_NAMES[autopilot.current_phase]})`
        );
        if (autopilot.options?.fast) console.log("   - Fast mode");
        if (autopilot.options?.use_agent_teams) console.log(`   - Agent Teams: ${autopilot.options.team_size} members`);
        if (autopilot.options?.ui) console.log("   - UI verification enabled");
      }

      if (
        debate?.status === "analyzing" ||
        debate?.status === "debating" ||
        debate?.status === "voting"
      ) {
        console.log(`📍 Debate: ${debate.topic} [${debate.phase}]`);
      }

      if (ecomode?.enabled) {
        console.log(`📍 Ecomode: enabled`);
      }

      console.log("");
      console.log("🚨 WORK INSTRUCTIONS:");
      if (workmode?.active) {
        console.log("1. ⛔ Workmode active: Sisyphus CANNOT modify code directly");
        console.log("2. Delegate all work through Atlas");
      } else {
        console.log("1. Sisyphus should NOT write code directly");
        console.log("2. If work is in progress, delegate to Atlas");
      }
      console.log("3. If Ralph Loop is active, continue execution");

      break;
    }

    // Agent Limiter commands
    case "agent-limiter-status": {
      const status = getAgentLimiterStatus(directory);
      output(status);
      break;
    }

    case "agent-limiter-can-spawn": {
      const result = canSpawnAgent(directory);
      output(result);
      break;
    }

    case "agent-limiter-set-limit": {
      const limit = parseInt(args[0], 10);
      if (isNaN(limit) || limit < 1 || limit > 20) {
        console.error("Error: Limit must be between 1 and 20");
        process.exit(1);
      }
      const result = setAgentLimit(directory, limit);
      output(result);
      break;
    }

    case "agent-limiter-cleanup": {
      const result = cleanupStaleAgents(directory);
      output(result);
      break;
    }

    case "agent-limiter-clear": {
      const result = clearAllAgents(directory);
      output(result);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error(`
Usage:
  chronos ralph-status        - Get Ralph Loop status
  chronos ralph-start [opts]  - Start Ralph Loop
  chronos ralph-continue      - Continue Ralph Loop
  chronos ralph-stop [reason] - Stop Ralph Loop
  chronos boulder-status      - Get Boulder status
  chronos should-continue     - Check if should continue (for hooks)
  chronos status              - Get full status
  chronos context-reminder    - Output context reminder after compact

Workmode:
  chronos workmode-status     - Get workmode status
  chronos workmode-enable <mode> [--fast] [--swarm N] [--ui]
                              - Enable workmode (autopilot|swarm)
  chronos workmode-disable    - Disable workmode
  chronos workmode-check <agent> [file_path]
                              - Check if modification should be blocked

Agent Limiter (OOM Prevention):
  chronos agent-limiter-status    - Get current agent status
  chronos agent-limiter-can-spawn - Check if new agent can spawn
  chronos agent-limiter-set-limit <N>
                                  - Set max concurrent agents (1-20)
  chronos agent-limiter-cleanup   - Remove stale agents
  chronos agent-limiter-clear     - Clear all agents (recovery)
`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
