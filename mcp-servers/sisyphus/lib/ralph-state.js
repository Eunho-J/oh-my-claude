/**
 * Ralph State Management
 *
 * Manages the Ralph Loop state for continuous execution until completion.
 * Named after Ralph from The Simpsons - "I'm helping!"
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  SISYPHUS_DIR,
  RALPH_STATE_FILE,
  DEFAULT_MAX_ITERATIONS,
} from "./constants.js";
import { ensureSisyphusDir, nowISO, safeJsonParse } from "./utils.js";

/**
 * @typedef {Object} RalphState
 * @property {boolean} active - Whether Ralph Loop is active
 * @property {number} iteration - Current iteration count
 * @property {number} max_iterations - Maximum iterations allowed
 * @property {string} [completion_promise] - Promise text to detect completion
 * @property {string} [started_at] - ISO timestamp when started
 * @property {string} [last_continue] - ISO timestamp of last continue
 * @property {string} [completed_at] - ISO timestamp when completed
 * @property {string} [reason] - Reason for stopping
 */

/**
 * Get Ralph state file path.
 * @param {string} directory - Base directory
 * @returns {string} Full path to ralph-state.json
 */
export function getRalphStatePath(directory) {
  return join(directory, SISYPHUS_DIR, RALPH_STATE_FILE);
}

/**
 * Read Ralph state from file.
 * @param {string} directory - Base directory
 * @returns {RalphState|null} Ralph state or null if not found
 */
export function readRalphState(directory) {
  const filePath = getRalphStatePath(directory);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    return safeJsonParse(content, null);
  } catch {
    return null;
  }
}

/**
 * Write Ralph state to file.
 * @param {string} directory - Base directory
 * @param {RalphState} state - State to write
 * @returns {boolean} Success
 */
export function writeRalphState(directory, state) {
  try {
    ensureSisyphusDir(directory);
    const filePath = getRalphStatePath(directory);
    writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Start Ralph Loop.
 * @param {string} directory - Base directory
 * @param {Object} options - Options
 * @param {string} [options.completion_promise] - Promise text to detect completion
 * @param {number} [options.max_iterations] - Maximum iterations
 * @returns {RalphState} New state
 */
export function startRalphLoop(directory, options = {}) {
  const state = {
    active: true,
    iteration: 0,
    max_iterations: options.max_iterations || DEFAULT_MAX_ITERATIONS,
    started_at: nowISO(),
  };

  if (options.completion_promise) {
    state.completion_promise = options.completion_promise;
  }

  writeRalphState(directory, state);
  return state;
}

/**
 * Increment iteration count.
 * @param {string} directory - Base directory
 * @returns {RalphState|null} Updated state or null
 */
export function incrementIteration(directory) {
  const state = readRalphState(directory);
  if (!state || !state.active) {
    return null;
  }

  state.iteration = (state.iteration || 0) + 1;
  state.last_continue = nowISO();

  if (state.iteration >= state.max_iterations) {
    state.active = false;
    state.reason = "max_iterations_reached";
  }

  writeRalphState(directory, state);
  return state;
}

/**
 * Stop Ralph Loop.
 * @param {string} directory - Base directory
 * @param {string} [reason] - Reason for stopping
 * @returns {RalphState|null} Updated state or null
 */
export function stopRalphLoop(directory, reason = "manual_stop") {
  const state = readRalphState(directory);
  if (!state) {
    return null;
  }

  state.active = false;
  state.completed_at = nowISO();
  state.reason = reason;

  writeRalphState(directory, state);
  return state;
}

/**
 * Check if completion promise is found in recent transcript.
 * @param {string} directory - Base directory
 * @returns {Object} Result with found status and details
 */
export function checkCompletionPromise(directory) {
  const state = readRalphState(directory);
  if (!state || !state.completion_promise) {
    return { found: false, reason: "no_promise_set" };
  }

  const promise = state.completion_promise;
  const claudeProjectsDir = join(homedir(), ".claude", "projects");

  if (!existsSync(claudeProjectsDir)) {
    return { found: false, reason: "no_claude_projects_dir" };
  }

  try {
    // Search for recent .jsonl files (modified in last 5 minutes)
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Find project directories and their session files
    const projectDirs = readdirSync(claudeProjectsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(claudeProjectsDir, d.name));

    for (const projectDir of projectDirs) {
      const files = readdirSync(projectDir, { withFileTypes: true })
        .filter((f) => f.isFile() && f.name.endsWith(".jsonl"))
        .map((f) => ({
          path: join(projectDir, f.name),
          mtime: require("node:fs").statSync(join(projectDir, f.name)).mtimeMs,
        }))
        .filter((f) => f.mtime > fiveMinutesAgo);

      for (const file of files) {
        const content = readFileSync(file.path, "utf-8");
        const promiseTag = `<promise>${promise}</promise>`;

        if (content.includes(promiseTag)) {
          // Found! Stop the loop
          stopRalphLoop(directory, "promise_fulfilled");
          return {
            found: true,
            promise,
            file: file.path,
          };
        }
      }
    }

    return { found: false, reason: "promise_not_found" };
  } catch (error) {
    return { found: false, reason: "search_error", error: error.message };
  }
}

/**
 * Determine if Ralph Loop should continue.
 * @param {string} directory - Base directory
 * @returns {Object} Decision object with continue flag and reason
 */
export function shouldContinue(directory) {
  const state = readRalphState(directory);

  if (!state || !state.active) {
    return { continue: false, reason: "ralph_not_active" };
  }

  // Check for completion promise first
  const promiseCheck = checkCompletionPromise(directory);
  if (promiseCheck.found) {
    return { continue: false, reason: "promise_fulfilled" };
  }

  // Check iteration limit
  if (state.iteration >= state.max_iterations) {
    stopRalphLoop(directory, "max_iterations_reached");
    return {
      continue: false,
      reason: `max_iterations_reached (${state.max_iterations})`,
    };
  }

  // Continue
  const newState = incrementIteration(directory);
  return {
    continue: true,
    reason: `iteration ${newState.iteration}/${newState.max_iterations}`,
    iteration: newState.iteration,
    max_iterations: newState.max_iterations,
  };
}
