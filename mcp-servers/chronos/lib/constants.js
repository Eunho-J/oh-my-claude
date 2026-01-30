/**
 * Sisyphus Constants
 *
 * Shared constants for Ralph Loop and Boulder state management.
 */

export const SISYPHUS_DIR = ".sisyphus";
export const RALPH_STATE_FILE = "ralph-state.json";
export const BOULDER_FILE = "boulder.json";
export const PLANS_DIR = "plans";
export const NOTEPADS_DIR = "notepads";

// Full paths
export const RALPH_STATE_PATH = `${SISYPHUS_DIR}/${RALPH_STATE_FILE}`;
export const BOULDER_STATE_PATH = `${SISYPHUS_DIR}/${BOULDER_FILE}`;
export const PROMETHEUS_PLANS_DIR = `${SISYPHUS_DIR}/${PLANS_DIR}`;

// Ralph Loop defaults
export const DEFAULT_MAX_ITERATIONS = 50;
