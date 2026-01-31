/**
 * Autopilot State Manager
 *
 * Manages the 5-phase autopilot workflow state.
 *
 * Phases:
 * 0. Expansion - Metis analyzes and creates spec
 * 1. Planning - Prometheus creates plan, Momus reviews
 * 2. Execution - Atlas executes via Junior (or Swarm)
 * 3. QA - Build, lint, and tests pass
 * 4. Validation - Oracle security/code review
 */

import fs from "fs";
import path from "path";

const AUTOPILOT_FILENAME = "autopilot.json";

/**
 * Phase definitions
 */
export const PHASES = {
  EXPANSION: 0,
  PLANNING: 1,
  EXECUTION: 2,
  QA: 3,
  VALIDATION: 4,
};

export const PHASE_NAMES = {
  0: "expansion",
  1: "planning",
  2: "execution",
  3: "qa",
  4: "validation",
};

export const PHASE_DESCRIPTIONS = {
  0: "Metis analyzes request and creates spec",
  1: "Prometheus creates plan, Momus reviews",
  2: "Atlas executes via Junior agents",
  3: "Build, lint, and tests pass",
  4: "Oracle security and code review",
};

/**
 * Get the autopilot state file path
 */
function getAutopilotPath(directory) {
  return path.join(directory, ".sisyphus", AUTOPILOT_FILENAME);
}

/**
 * Generate a unique autopilot ID
 */
function generateAutopilotId(name) {
  const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 30);
  return `autopilot-${date}-${slug}`;
}

/**
 * Create initial phase state
 */
function createPhaseState() {
  return {
    0: { status: "pending", output: null, started_at: null, completed_at: null },
    1: { status: "pending", output: null, started_at: null, completed_at: null },
    2: { status: "pending", output: null, started_at: null, completed_at: null, progress: null },
    3: { status: "pending", output: null, started_at: null, completed_at: null, results: null },
    4: { status: "pending", output: null, started_at: null, completed_at: null, findings: null },
  };
}

/**
 * Read autopilot state from file
 */
export function readAutopilotState(directory) {
  const statePath = getAutopilotPath(directory);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(statePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading autopilot state:", err);
    return null;
  }
}

/**
 * Write autopilot state to file
 */
function writeAutopilotState(directory, state) {
  const statePath = getAutopilotPath(directory);
  const sisyphusDir = path.dirname(statePath);

  if (!fs.existsSync(sisyphusDir)) {
    fs.mkdirSync(sisyphusDir, { recursive: true });
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return state;
}

/**
 * Start a new autopilot workflow
 */
export function startAutopilot(directory, name, request, options = {}) {
  const id = generateAutopilotId(name);
  const now = new Date().toISOString();

  const state = {
    id,
    name,
    request,
    current_phase: 0,
    status: "running",
    phases: createPhaseState(),
    created_at: now,
    updated_at: now,
    options: {
      skip_metis: options.skip_metis || false,
      skip_momus: options.skip_momus || false,
      use_swarm: options.use_swarm || false,
      swarm_agents: options.swarm_agents || 3,
    },
  };

  // Mark first phase as in_progress
  state.phases[0].status = "in_progress";
  state.phases[0].started_at = now;

  // If skipping Metis, start at planning phase
  if (options.skip_metis) {
    state.phases[0].status = "skipped";
    state.phases[0].completed_at = now;
    state.current_phase = 1;
    state.phases[1].status = "in_progress";
    state.phases[1].started_at = now;
  }

  return writeAutopilotState(directory, state);
}

/**
 * Get current phase info
 */
export function getCurrentPhase(directory) {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }

  return {
    phase: state.current_phase,
    name: PHASE_NAMES[state.current_phase],
    description: PHASE_DESCRIPTIONS[state.current_phase],
    status: state.phases[state.current_phase].status,
    overall_status: state.status,
  };
}

/**
 * Phase gate criteria
 */
const GATE_CRITERIA = {
  0: (state) => {
    // Expansion complete when spec file exists
    const specPath = state.phases[0].output;
    if (!specPath) return { passed: false, reason: "No spec file created" };
    return { passed: true };
  },
  1: (state) => {
    // Planning complete when plan file exists
    const planPath = state.phases[1].output;
    if (!planPath) return { passed: false, reason: "No plan file created" };
    return { passed: true };
  },
  2: (state) => {
    // Execution complete when all tasks done
    const progress = state.phases[2].progress;
    if (!progress) return { passed: false, reason: "No execution progress recorded" };
    if (progress.done < progress.total) {
      return { passed: false, reason: `${progress.total - progress.done} tasks remaining` };
    }
    return { passed: true };
  },
  3: (state) => {
    // QA complete when build, lint, tests pass
    const results = state.phases[3].results;
    if (!results) return { passed: false, reason: "No QA results recorded" };
    if (!results.build) return { passed: false, reason: "Build failed" };
    if (!results.lint) return { passed: false, reason: "Lint failed" };
    if (!results.tests) return { passed: false, reason: "Tests failed" };
    return { passed: true };
  },
  4: (state) => {
    // Validation complete when review done
    const findings = state.phases[4].findings;
    if (!findings) return { passed: false, reason: "No validation findings recorded" };
    if (findings.blocking_issues > 0) {
      return { passed: false, reason: `${findings.blocking_issues} blocking issues found` };
    }
    return { passed: true };
  },
};

/**
 * Check if current phase gate is passed
 */
export function checkPhaseGate(directory) {
  const state = readAutopilotState(directory);
  if (!state) {
    return { error: "No active autopilot" };
  }

  const phase = state.current_phase;
  const gateCheck = GATE_CRITERIA[phase];

  if (!gateCheck) {
    return { error: `No gate criteria for phase ${phase}` };
  }

  return {
    phase,
    name: PHASE_NAMES[phase],
    ...gateCheck(state),
  };
}

/**
 * Complete current phase and advance to next
 */
export function advancePhase(directory, output = null, metadata = {}) {
  const state = readAutopilotState(directory);
  if (!state) {
    return { error: "No active autopilot" };
  }

  const currentPhase = state.current_phase;
  const now = new Date().toISOString();

  // Check gate criteria
  const gateResult = checkPhaseGate(directory);
  if (!gateResult.passed && currentPhase < 4) {
    return {
      success: false,
      reason: gateResult.reason,
      phase: currentPhase,
    };
  }

  // Mark current phase as completed
  state.phases[currentPhase].status = "completed";
  state.phases[currentPhase].completed_at = now;
  if (output) {
    state.phases[currentPhase].output = output;
  }

  // Merge additional metadata
  Object.assign(state.phases[currentPhase], metadata);

  // Advance to next phase or complete
  if (currentPhase >= 4) {
    state.status = "completed";
    state.completed_at = now;
  } else {
    state.current_phase = currentPhase + 1;

    // Handle skips
    if (state.current_phase === 1 && state.options.skip_momus) {
      // Note: skip_momus means Prometheus handles it alone
    }

    state.phases[state.current_phase].status = "in_progress";
    state.phases[state.current_phase].started_at = now;
  }

  state.updated_at = now;

  return {
    success: true,
    previous_phase: currentPhase,
    current_phase: state.current_phase,
    status: state.status,
    state: writeAutopilotState(directory, state),
  };
}

/**
 * Update phase progress (for execution phase)
 */
export function updatePhaseProgress(directory, phase, progressData) {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }

  const now = new Date().toISOString();

  if (phase === 2) {
    state.phases[2].progress = progressData;
  } else if (phase === 3) {
    state.phases[3].results = progressData;
  } else if (phase === 4) {
    state.phases[4].findings = progressData;
  }

  state.updated_at = now;

  return writeAutopilotState(directory, state);
}

/**
 * Set phase output file
 */
export function setPhaseOutput(directory, phase, output) {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }

  state.phases[phase].output = output;
  state.updated_at = new Date().toISOString();

  return writeAutopilotState(directory, state);
}

/**
 * Fail the autopilot with error
 */
export function failAutopilot(directory, error) {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }

  const now = new Date().toISOString();
  const currentPhase = state.current_phase;

  state.phases[currentPhase].status = "failed";
  state.phases[currentPhase].error = error;
  state.status = "failed";
  state.failed_at = now;
  state.updated_at = now;

  return writeAutopilotState(directory, state);
}

/**
 * Get full autopilot status
 */
export function getAutopilotStatus(directory) {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }

  const phasesSummary = {};
  for (let i = 0; i <= 4; i++) {
    phasesSummary[PHASE_NAMES[i]] = {
      status: state.phases[i].status,
      output: state.phases[i].output,
    };
  }

  return {
    id: state.id,
    name: state.name,
    status: state.status,
    current_phase: state.current_phase,
    current_phase_name: PHASE_NAMES[state.current_phase],
    phases: phasesSummary,
    options: state.options,
    created_at: state.created_at,
    updated_at: state.updated_at,
  };
}

/**
 * Clear autopilot state
 */
export function clearAutopilot(directory) {
  const statePath = getAutopilotPath(directory);

  if (fs.existsSync(statePath)) {
    // Archive before deleting
    const state = readAutopilotState(directory);
    if (state) {
      const archiveDir = path.join(directory, ".sisyphus", "autopilot-history");
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      const archivePath = path.join(archiveDir, `${state.id}.json`);
      fs.writeFileSync(archivePath, JSON.stringify(state, null, 2));
    }

    fs.unlinkSync(statePath);
    return true;
  }
  return false;
}
