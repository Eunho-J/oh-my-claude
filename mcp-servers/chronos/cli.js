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

    case "context-reminder": {
      // Read all states
      const ralph = readRalphState(directory);
      const boulder = readBoulderState(directory);
      const autopilot = readAutopilotState(directory);
      const ecomode = readEcomodeState(directory);
      const debate = readDebateState(directory);

      // Check if any active workflow exists
      const hasActiveWork =
        ralph?.active ||
        boulder?.plan_path ||
        autopilot?.status === "running" ||
        debate?.status === "analyzing" ||
        debate?.status === "debating" ||
        debate?.status === "voting";

      // If no active work, exit silently
      if (!hasActiveWork) {
        process.exit(0);
      }

      // Output reminder
      console.log("⚠️ COMPACT 후 작업 상태 복구");
      console.log("");
      console.log(
        "이 세션은 compact 후 재개되었습니다. 아래 상태를 확인하세요:"
      );
      console.log("");

      if (ralph?.active) {
        console.log(
          `📍 Ralph Loop: 활성 (${ralph.iteration}/${ralph.max_iterations})`
        );
      }

      if (boulder?.plan_path) {
        const progress = getActivePlanProgress(directory);
        console.log(`📍 Boulder: ${progress?.plan_name || "active"}`);
        if (progress) {
          console.log(`   진행: ${progress.completed}/${progress.total} tasks`);
        }
      }

      if (autopilot?.status === "running") {
        console.log(
          `📍 Autopilot: Phase ${autopilot.current_phase} (${PHASE_NAMES[autopilot.current_phase]})`
        );
      }

      if (
        debate?.status === "analyzing" ||
        debate?.status === "debating" ||
        debate?.status === "voting"
      ) {
        console.log(`📍 Debate: ${debate.topic} [${debate.phase}]`);
      }

      if (ecomode?.enabled) {
        console.log(`📍 Ecomode: 활성화`);
      }

      console.log("");
      console.log("🚨 작업 지침:");
      console.log("1. Sisyphus는 직접 코드를 작성하지 마세요");
      console.log("2. 작업이 진행 중이라면 Atlas에게 위임하세요");
      console.log("3. Ralph Loop이 활성화되어 있다면 계속 실행하세요");

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
`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
