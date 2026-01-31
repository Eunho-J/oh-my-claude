/**
 * Workmode State Manager
 *
 * Manages workmode state to block direct code modification from main agent
 * when autopilot or other automated workflows are active.
 *
 * When workmode is active, Sisyphus cannot directly modify code and must
 * delegate through Atlas.
 */

import fs from "fs";
import path from "path";

const WORKMODE_FILENAME = "workmode.json";

/**
 * Get the workmode state file path
 */
function getWorkmodePath(directory) {
  return path.join(directory, ".sisyphus", WORKMODE_FILENAME);
}

/**
 * Read workmode state from file
 */
export function readWorkmodeState(directory) {
  const statePath = getWorkmodePath(directory);

  if (!fs.existsSync(statePath)) {
    return {
      active: false,
      mode: null,
      started_at: null,
      options: {},
    };
  }

  try {
    const content = fs.readFileSync(statePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading workmode state:", err);
    return {
      active: false,
      mode: null,
      started_at: null,
      options: {},
    };
  }
}

/**
 * Write workmode state to file
 */
function writeWorkmodeState(directory, state) {
  const statePath = getWorkmodePath(directory);
  const sisyphusDir = path.dirname(statePath);

  if (!fs.existsSync(sisyphusDir)) {
    fs.mkdirSync(sisyphusDir, { recursive: true });
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return state;
}

// Default threshold for simple task bypass
const DEFAULT_SIMPLE_TASK_THRESHOLD = 10;

/**
 * Enable workmode
 *
 * @param {string} directory - Working directory
 * @param {string} mode - Workmode type (autopilot, swarm)
 * @param {object} options - Mode-specific options
 */
export function enableWorkmode(directory, mode, options = {}) {
  const now = new Date().toISOString();

  const state = {
    active: true,
    mode,
    started_at: now,
    updated_at: now,
    options: {
      fast: options.fast || false,
      swarm: options.swarm || null,
      ui: options.ui || false,
      // Simple task bypass settings
      allow_simple_edits: true,
      simple_task_threshold: options.simple_task_threshold || DEFAULT_SIMPLE_TASK_THRESHOLD,
      ...options,
    },
  };

  return writeWorkmodeState(directory, state);
}

/**
 * Disable workmode
 */
export function disableWorkmode(directory) {
  const statePath = getWorkmodePath(directory);

  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
    return { success: true, message: "Workmode disabled" };
  }

  return { success: true, message: "Workmode was not active" };
}

/**
 * Update workmode options
 */
export function updateWorkmodeOptions(directory, options) {
  const state = readWorkmodeState(directory);

  if (!state.active) {
    return null;
  }

  state.options = { ...state.options, ...options };
  state.updated_at = new Date().toISOString();

  return writeWorkmodeState(directory, state);
}

/**
 * Check if code modification should be blocked
 *
 * @param {string} directory - Working directory
 * @param {string} agent - Agent name (main, atlas, junior, etc.)
 * @param {string} filePath - File being modified
 * @returns {object} { blocked: boolean, reason: string, simple_allowed: boolean }
 */
export function shouldBlockModification(directory, agent, filePath) {
  const state = readWorkmodeState(directory);

  // If workmode is not active, allow all
  if (!state.active) {
    return { blocked: false };
  }

  // Always allow .sisyphus/ modifications
  if (filePath && (filePath.startsWith(".sisyphus/") || filePath.includes("/.sisyphus/"))) {
    return { blocked: false };
  }

  // Check for simple task bypass for main agent (Sisyphus)
  if (agent === "main" || agent === "sisyphus") {
    const allowSimple = state.options?.allow_simple_edits !== false;
    const threshold = state.options?.simple_task_threshold || DEFAULT_SIMPLE_TASK_THRESHOLD;

    if (allowSimple) {
      // Allow with reminder about threshold
      return {
        blocked: false,
        simple_allowed: true,
        threshold: threshold,
        reminder: `Simple task bypass active (≤${threshold} lines, single file). For larger changes, delegate to Atlas.`,
        mode: state.mode,
      };
    }

    // Strict mode - block all Sisyphus edits
    return {
      blocked: true,
      reason: `Workmode (${state.mode}) is active. Delegate to Atlas instead of directly modifying code.`,
      mode: state.mode,
      options: state.options,
    };
  }

  // Allow other agents (atlas delegates to junior, etc.)
  return { blocked: false };
}

/**
 * Get workmode status summary
 */
export function getWorkmodeStatus(directory) {
  const state = readWorkmodeState(directory);

  return {
    active: state.active,
    mode: state.mode,
    started_at: state.started_at,
    options: state.options,
    message: state.active
      ? `Workmode (${state.mode}) is active since ${state.started_at}`
      : "Workmode is not active",
  };
}
