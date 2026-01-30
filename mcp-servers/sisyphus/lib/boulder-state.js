/**
 * Boulder State Management
 *
 * Manages active plan tracking for Sisyphus orchestrator.
 * Named after Sisyphus's boulder - the eternal task that must be rolled.
 *
 * Ported from reference/src/features/boulder-state/storage.ts
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, basename } from "node:path";
import { SISYPHUS_DIR, BOULDER_FILE, PROMETHEUS_PLANS_DIR } from "./constants.js";
import { ensureSisyphusDir, nowISO, safeJsonParse } from "./utils.js";

/**
 * @typedef {Object} BoulderState
 * @property {string} active_plan - Absolute path to the active plan file
 * @property {string} started_at - ISO timestamp when work started
 * @property {string[]} session_ids - Session IDs that have worked on this plan
 * @property {string} plan_name - Plan name derived from filename
 * @property {string} [status] - Optional status field
 * @property {number} [pending_tasks] - Optional pending tasks count
 */

/**
 * @typedef {Object} PlanProgress
 * @property {number} total - Total number of checkboxes
 * @property {number} completed - Number of completed checkboxes
 * @property {boolean} isComplete - Whether all tasks are done
 */

/**
 * Get Boulder state file path.
 * @param {string} directory - Base directory
 * @returns {string} Full path to boulder.json
 */
export function getBoulderFilePath(directory) {
  return join(directory, SISYPHUS_DIR, BOULDER_FILE);
}

/**
 * Read Boulder state from file.
 * @param {string} directory - Base directory
 * @returns {BoulderState|null} Boulder state or null if not found
 */
export function readBoulderState(directory) {
  const filePath = getBoulderFilePath(directory);

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
 * Write Boulder state to file.
 * @param {string} directory - Base directory
 * @param {BoulderState} state - State to write
 * @returns {boolean} Success
 */
export function writeBoulderState(directory, state) {
  try {
    ensureSisyphusDir(directory);
    const filePath = getBoulderFilePath(directory);
    writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear Boulder state (delete file).
 * @param {string} directory - Base directory
 * @returns {boolean} Success
 */
export function clearBoulderState(directory) {
  const filePath = getBoulderFilePath(directory);

  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract plan name from file path.
 * @param {string} planPath - Path to plan file
 * @returns {string} Plan name without extension
 */
export function getPlanName(planPath) {
  return basename(planPath, ".md");
}

/**
 * Create a new Boulder state for a plan.
 * @param {string} planPath - Path to the plan file
 * @param {string} sessionId - Session ID
 * @returns {BoulderState} New state object
 */
export function createBoulderState(planPath, sessionId) {
  return {
    active_plan: planPath,
    started_at: nowISO(),
    session_ids: [sessionId],
    plan_name: getPlanName(planPath),
  };
}

/**
 * Start working on a new plan.
 * @param {string} directory - Base directory
 * @param {string} planPath - Path to the plan file
 * @param {string} sessionId - Session ID
 * @returns {BoulderState} New state
 */
export function startBoulder(directory, planPath, sessionId) {
  const state = createBoulderState(planPath, sessionId);
  writeBoulderState(directory, state);
  return state;
}

/**
 * Add a session ID to Boulder state.
 * @param {string} directory - Base directory
 * @param {string} sessionId - Session ID to add
 * @returns {BoulderState|null} Updated state or null
 */
export function appendSessionId(directory, sessionId) {
  const state = readBoulderState(directory);
  if (!state) return null;

  if (!state.session_ids.includes(sessionId)) {
    state.session_ids.push(sessionId);
    if (writeBoulderState(directory, state)) {
      return state;
    }
  }

  return state;
}

/**
 * Find Prometheus plan files for this project.
 * @param {string} directory - Base directory
 * @returns {string[]} Array of plan file paths, sorted by modification time (newest first)
 */
export function findPrometheusPlans(directory) {
  const plansDir = join(directory, PROMETHEUS_PLANS_DIR);

  if (!existsSync(plansDir)) {
    return [];
  }

  try {
    const files = readdirSync(plansDir);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(plansDir, f))
      .sort((a, b) => {
        // Sort by modification time, newest first
        const aStat = statSync(a);
        const bStat = statSync(b);
        return bStat.mtimeMs - aStat.mtimeMs;
      });
  } catch {
    return [];
  }
}

/**
 * Parse a plan file and count checkbox progress.
 * @param {string} planPath - Path to plan file
 * @returns {PlanProgress} Progress information
 */
export function getPlanProgress(planPath) {
  if (!existsSync(planPath)) {
    return { total: 0, completed: 0, isComplete: true };
  }

  try {
    const content = readFileSync(planPath, "utf-8");

    // Match markdown checkboxes: - [ ] or - [x] or - [X]
    const uncheckedMatches = content.match(/^[-*]\s*\[\s*\]/gm) || [];
    const checkedMatches = content.match(/^[-*]\s*\[[xX]\]/gm) || [];

    const total = uncheckedMatches.length + checkedMatches.length;
    const completed = checkedMatches.length;

    return {
      total,
      completed,
      isComplete: total === 0 || completed === total,
    };
  } catch {
    return { total: 0, completed: 0, isComplete: true };
  }
}

/**
 * Get progress for the active Boulder plan.
 * @param {string} directory - Base directory
 * @returns {Object} Progress with plan info or null
 */
export function getActivePlanProgress(directory) {
  const state = readBoulderState(directory);
  if (!state || !state.active_plan) {
    return null;
  }

  const progress = getPlanProgress(state.active_plan);
  return {
    plan_name: state.plan_name,
    plan_path: state.active_plan,
    started_at: state.started_at,
    session_count: state.session_ids.length,
    ...progress,
  };
}
