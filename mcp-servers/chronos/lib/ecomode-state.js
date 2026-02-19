/**
 * Ecomode State Manager
 *
 * Manages ecomode settings for resource-efficient operation.
 */

import fs from "fs";
import path from "path";

const ECOMODE_FILENAME = "ecomode.json";

/**
 * Get the ecomode state file path
 */
function getEcomodePath(directory) {
  return path.join(directory, ".sisyphus", ECOMODE_FILENAME);
}

/**
 * Default ecomode state
 */
function getDefaultState() {
  return {
    enabled: false,
    settings: {
      prefer_haiku: true,
      skip_metis: true,
      shorter_responses: true,
    },
    enabled_at: null,
    disabled_at: null,
  };
}

/**
 * Read ecomode state from file
 */
export function readEcomodeState(directory) {
  const statePath = getEcomodePath(directory);

  if (!fs.existsSync(statePath)) {
    return getDefaultState();
  }

  try {
    const content = fs.readFileSync(statePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading ecomode state:", err);
    return getDefaultState();
  }
}

/**
 * Write ecomode state to file
 */
function writeEcomodeState(directory, state) {
  const statePath = getEcomodePath(directory);
  const sisyphusDir = path.dirname(statePath);

  if (!fs.existsSync(sisyphusDir)) {
    fs.mkdirSync(sisyphusDir, { recursive: true });
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return state;
}

/**
 * Enable ecomode
 */
export function enableEcomode(directory, customSettings = {}) {
  const state = readEcomodeState(directory);

  state.enabled = true;
  state.enabled_at = new Date().toISOString();
  state.disabled_at = null;

  // Merge custom settings
  if (Object.keys(customSettings).length > 0) {
    state.settings = { ...state.settings, ...customSettings };
  }

  return writeEcomodeState(directory, state);
}

/**
 * Disable ecomode
 */
export function disableEcomode(directory) {
  const state = readEcomodeState(directory);

  state.enabled = false;
  state.disabled_at = new Date().toISOString();

  return writeEcomodeState(directory, state);
}

/**
 * Get recommended tier based on ecomode and task type
 */
export function getRecommendedTier(directory, taskType) {
  const state = readEcomodeState(directory);

  // Default tiers (when ecomode disabled)
  const defaultTiers = {
    junior: "sonnet",
    oracle: "sonnet",
    explore: "haiku",
    librarian: "haiku",
  };

  // Ecomode tiers (prefer lower models)
  const ecoTiers = {
    junior: "haiku",
    oracle: "haiku", // oracle → oracle-low
    explore: "haiku",
    librarian: "haiku",
  };

  if (!state.enabled) {
    return {
      ecomode: false,
      task_type: taskType,
      tier: defaultTiers[taskType] || "sonnet",
      agent_suffix: null,
    };
  }

  const tier = ecoTiers[taskType] || "haiku";

  // Determine agent suffix
  let agentSuffix = null;
  if (taskType === "oracle" && state.settings.prefer_haiku) {
    agentSuffix = "-low";
  }

  return {
    ecomode: true,
    task_type: taskType,
    tier,
    agent_suffix: agentSuffix,
    skip_metis: state.settings.skip_metis,
    shorter_responses: state.settings.shorter_responses,
  };
}

/**
 * Check if a planning phase should be skipped
 */
export function shouldSkipPhase(directory, phase) {
  const state = readEcomodeState(directory);

  if (!state.enabled) {
    return false;
  }

  switch (phase) {
    case "metis":
      return state.settings.skip_metis;
    default:
      return false;
  }
}

/**
 * Update ecomode settings
 */
export function updateSettings(directory, settings) {
  const state = readEcomodeState(directory);

  state.settings = { ...state.settings, ...settings };

  return writeEcomodeState(directory, state);
}
