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
export const SPECS_DIR = "specs";
export const WORKMODE_FILE = "workmode.json";
export const UI_VERIFICATION_DIR = "ui-verification";

// Full paths
export const RALPH_STATE_PATH = `${SISYPHUS_DIR}/${RALPH_STATE_FILE}`;
export const BOULDER_STATE_PATH = `${SISYPHUS_DIR}/${BOULDER_FILE}`;
export const PROMETHEUS_PLANS_DIR = `${SISYPHUS_DIR}/${PLANS_DIR}`;
export const SPECS_PATH = `${SISYPHUS_DIR}/${SPECS_DIR}`;
export const WORKMODE_STATE_PATH = `${SISYPHUS_DIR}/${WORKMODE_FILE}`;

// Ralph Loop defaults
export const DEFAULT_MAX_ITERATIONS = 50;

// Workmode types
export const WORKMODE_TYPES = {
  AUTOPILOT: "autopilot",
  SWARM: "swarm",
};
