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
`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
