#!/usr/bin/env node

/**
 * Chronos MCP Server
 *
 * Manages Ralph Loop, Boulder state, and Debate sessions for orchestration.
 *
 * Tools:
 * - ralph_get_state: Get Ralph Loop state
 * - ralph_start: Start Ralph Loop
 * - ralph_increment: Increment iteration count
 * - ralph_stop: Stop Ralph Loop
 * - ralph_check_promise: Check completion promise
 * - boulder_get_state: Get Boulder state
 * - boulder_start: Start new plan work
 * - boulder_add_session: Add session ID
 * - boulder_clear: Clear Boulder state
 * - boulder_get_progress: Get plan progress
 * - boulder_list_plans: List Prometheus plans
 * - debate_start: Start a new multi-model debate
 * - debate_get_state: Get current debate state
 * - debate_add_analysis: Add model analysis
 * - debate_add_round: Add debate round
 * - debate_vote: Record a vote
 * - debate_conclude: Conclude the debate
 * - debate_list_history: List past debates
 * - chronos_status: Get full status
 * - chronos_should_continue: Check if should continue
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  readRalphState,
  startRalphLoop,
  incrementIteration,
  stopRalphLoop,
  checkCompletionPromise,
  shouldContinue as ralphShouldContinue,
} from "./lib/ralph-state.js";

import {
  readBoulderState,
  startBoulder,
  appendSessionId,
  clearBoulderState,
  getPlanProgress,
  getActivePlanProgress,
  findPrometheusPlans,
  getPlanName,
} from "./lib/boulder-state.js";

import {
  readDebateState,
  startDebate,
  addAnalysis,
  addDebateRound,
  addVote,
  concludeDebate,
  clearDebate,
  listDebateHistory,
  getDebateSummary,
  checkConsensus,
} from "./lib/debate-state.js";

import {
  readEcomodeState,
  enableEcomode,
  disableEcomode,
  getRecommendedTier,
  shouldSkipPhase,
  updateSettings as updateEcomodeSettings,
} from "./lib/ecomode-state.js";

import {
  readAutopilotState,
  startAutopilot,
  getCurrentPhase,
  checkPhaseGate,
  advancePhase,
  updatePhaseProgress,
  setPhaseOutput,
  failAutopilot,
  getAutopilotStatus,
  clearAutopilot,
  loopBackToPhase,
  PHASE_NAMES,
  PHASE_DESCRIPTIONS,
} from "./lib/autopilot-state.js";

import {
  readWorkmodeState,
  enableWorkmode,
  disableWorkmode,
  updateWorkmodeOptions,
  shouldBlockModification,
  getWorkmodeStatus,
} from "./lib/workmode-state.js";

import {
  createVerificationConfig,
  recordVerificationResult,
  generatePlaywrightCommand,
  generateAnalysisPrompt,
  getVerificationStatus,
  verificationPassed,
} from "./lib/ui-verification.js";

import {
  getRecommendedModel,
  getJuniorTier,
  getAgentModel,
  generateToolCall,
  TASK_TYPES,
  MODELS,
} from "./lib/model-router.js";

import {
  readAgentLimiterState,
  canSpawnAgent,
  registerAgent,
  heartbeatAgent,
  unregisterAgent,
  setAgentLimit,
  getAgentLimiterStatus,
  cleanupStaleAgents,
  clearAllAgents,
} from "./lib/agent-limiter.js";

// Default to current working directory
const getDirectory = () => process.cwd();

// Initialize the MCP server
const server = new McpServer({
  name: "chronos",
  version: "1.0.0",
});

// ============================================================================
// Ralph State Tools
// ============================================================================

server.tool(
  "ralph_get_state",
  "Get the current Ralph Loop state",
  {},
  async () => {
    const state = readRalphState(getDirectory());
    return {
      content: [
        {
          type: "text",
          text: state
            ? JSON.stringify(state, null, 2)
            : "Ralph Loop not active (no state file)",
        },
      ],
    };
  }
);

server.tool(
  "ralph_start",
  "Start a new Ralph Loop for continuous execution",
  {
    completion_promise: z
      .string()
      .optional()
      .describe("Promise text to detect completion"),
    max_iterations: z
      .number()
      .optional()
      .describe("Maximum iterations (default: 50)"),
  },
  async ({ completion_promise, max_iterations }) => {
    const state = startRalphLoop(getDirectory(), {
      completion_promise,
      max_iterations,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: true, message: "Ralph Loop started", state },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "ralph_increment",
  "Increment the Ralph Loop iteration count",
  {},
  async () => {
    const state = incrementIteration(getDirectory());
    if (!state) {
      return {
        content: [
          { type: "text", text: "Ralph Loop not active or no state file" },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              iteration: state.iteration,
              max_iterations: state.max_iterations,
              active: state.active,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "ralph_stop",
  "Stop the Ralph Loop",
  {
    reason: z.string().optional().describe("Reason for stopping"),
  },
  async ({ reason }) => {
    const state = stopRalphLoop(getDirectory(), reason);
    if (!state) {
      return {
        content: [{ type: "text", text: "Ralph Loop not found" }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: true, message: "Ralph Loop stopped", state },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "ralph_check_promise",
  "Check if the completion promise is found in recent transcripts",
  {},
  async () => {
    const result = checkCompletionPromise(getDirectory());
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ============================================================================
// Boulder State Tools
// ============================================================================

server.tool(
  "boulder_get_state",
  "Get the current Boulder (active plan) state",
  {},
  async () => {
    const state = readBoulderState(getDirectory());
    return {
      content: [
        {
          type: "text",
          text: state
            ? JSON.stringify(state, null, 2)
            : "No active Boulder (no plan in progress)",
        },
      ],
    };
  }
);

server.tool(
  "boulder_start",
  "Start working on a new plan",
  {
    plan_path: z.string().describe("Path to the plan file"),
    session_id: z.string().describe("Current session ID"),
  },
  async ({ plan_path, session_id }) => {
    const state = startBoulder(getDirectory(), plan_path, session_id);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: true, message: "Boulder started", state },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "boulder_add_session",
  "Add a session ID to the current Boulder",
  {
    session_id: z.string().describe("Session ID to add"),
  },
  async ({ session_id }) => {
    const state = appendSessionId(getDirectory(), session_id);
    if (!state) {
      return {
        content: [{ type: "text", text: "No active Boulder to update" }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, state }, null, 2),
        },
      ],
    };
  }
);

server.tool("boulder_clear", "Clear the Boulder state (finish work)", {}, async () => {
  const success = clearBoulderState(getDirectory());
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success,
          message: success ? "Boulder cleared" : "Failed to clear Boulder",
        }),
      },
    ],
  };
});

server.tool(
  "boulder_get_progress",
  "Get progress for the active plan or a specific plan file",
  {
    plan_path: z
      .string()
      .optional()
      .describe("Path to plan file (uses active plan if not specified)"),
  },
  async ({ plan_path }) => {
    if (plan_path) {
      const progress = getPlanProgress(plan_path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { plan_path, plan_name: getPlanName(plan_path), ...progress },
              null,
              2
            ),
          },
        ],
      };
    }

    const progress = getActivePlanProgress(getDirectory());
    if (!progress) {
      return {
        content: [{ type: "text", text: "No active plan" }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(progress, null, 2) }],
    };
  }
);

server.tool(
  "boulder_list_plans",
  "List all Prometheus plan files",
  {},
  async () => {
    const plans = findPrometheusPlans(getDirectory());
    const planInfos = plans.map((p) => ({
      path: p,
      name: getPlanName(p),
      progress: getPlanProgress(p),
    }));
    return {
      content: [
        {
          type: "text",
          text:
            planInfos.length > 0
              ? JSON.stringify(planInfos, null, 2)
              : "No Prometheus plans found",
        },
      ],
    };
  }
);

// ============================================================================
// Debate Tools
// ============================================================================

server.tool(
  "debate_start",
  "Start a new multi-model debate for critical decision making",
  {
    topic: z.string().describe("The topic or question to debate"),
    context: z
      .string()
      .optional()
      .describe("Additional context for the debate"),
    max_rounds: z
      .number()
      .optional()
      .describe("Maximum debate rounds (default: 20)"),
  },
  async ({ topic, context, max_rounds }) => {
    const state = startDebate(getDirectory(), topic, context, max_rounds);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: true, message: "Debate started", state: getDebateSummary(state) },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "debate_get_state",
  "Get the current debate state and progress",
  {},
  async () => {
    const state = readDebateState(getDirectory());
    if (!state) {
      return {
        content: [{ type: "text", text: "No active debate" }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              summary: getDebateSummary(state),
              full_state: state,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "debate_add_analysis",
  "Add a model's independent analysis to the debate",
  {
    model: z
      .enum(["opus", "gpt52", "gemini", "glm"])
      .describe("The model providing the analysis (opus, gpt52, gemini, glm)"),
    summary: z.string().describe("Analysis summary"),
    position: z.string().describe("Model's position on the topic"),
  },
  async ({ model, summary, position }) => {
    const state = addAnalysis(getDirectory(), model, summary, position);
    if (!state) {
      return {
        content: [{ type: "text", text: "No active debate or failed to add analysis" }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: `${model} analysis added`,
              status: state.status,
              phase: state.phase,
              analyses_complete: Object.keys(state.analyses).length,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "debate_add_round",
  "Add a debate round (statement and responses)",
  {
    speaker: z
      .enum(["opus", "gpt52", "gemini", "glm"])
      .describe("The model speaking (opus, gpt52, gemini, glm)"),
    content: z.string().describe("What the model said"),
    agreements: z
      .array(z.enum(["opus", "gpt52", "gemini", "glm"]))
      .optional()
      .describe("Models that agreed"),
    disagreements: z
      .array(z.enum(["opus", "gpt52", "gemini", "glm"]))
      .optional()
      .describe("Models that disagreed"),
  },
  async ({ speaker, content, agreements, disagreements }) => {
    const state = addDebateRound(
      getDirectory(),
      speaker,
      content,
      agreements || [],
      disagreements || []
    );
    if (!state) {
      return {
        content: [{ type: "text", text: "No active debate in debating phase" }],
      };
    }

    const consensus = checkConsensus(state);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              round: state.round,
              total_entries: state.debate_log.length,
              status: state.status,
              consensus_reached: consensus.reached,
              consensus_position: consensus.position,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "debate_vote",
  "Record a model's vote on a specific item",
  {
    item: z.string().describe("The item being voted on"),
    model: z
      .enum(["opus", "gpt52", "gemini", "glm"])
      .describe("The voting model (opus, gpt52, gemini, glm)"),
    vote: z.boolean().describe("The vote (true = yes/agree, false = no/disagree)"),
  },
  async ({ item, model, vote }) => {
    const state = addVote(getDirectory(), item, model, vote);
    if (!state) {
      return {
        content: [{ type: "text", text: "No active debate" }],
      };
    }

    const itemVotes = state.votes[item];
    const votedCount = Object.values(itemVotes).filter((v) => v !== null).length;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              item,
              votes: itemVotes,
              votes_recorded: votedCount,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "debate_conclude",
  "Conclude the debate with a final decision",
  {
    summary: z.string().describe("Conclusion summary"),
    decision: z.string().describe("The final decision"),
    method: z
      .enum(["consensus", "majority", "no_consensus"])
      .describe("How the conclusion was reached"),
    details: z
      .object({})
      .passthrough()
      .optional()
      .describe("Additional details about the conclusion"),
  },
  async ({ summary, decision, method, details }) => {
    const state = concludeDebate(getDirectory(), summary, decision, method, details || {});
    if (!state) {
      return {
        content: [{ type: "text", text: "No active debate" }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: "Debate concluded",
              conclusion: state.conclusion,
              archived: true,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "debate_list_history",
  "List past debate sessions",
  {},
  async () => {
    const history = listDebateHistory(getDirectory());
    return {
      content: [
        {
          type: "text",
          text:
            history.length > 0
              ? JSON.stringify(history, null, 2)
              : "No debate history found",
        },
      ],
    };
  }
);

server.tool(
  "debate_clear",
  "Clear the active debate (archives it first)",
  {},
  async () => {
    const success = clearDebate(getDirectory());
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success,
            message: success ? "Debate cleared and archived" : "Failed to clear debate",
          }),
        },
      ],
    };
  }
);

// ============================================================================
// Ecomode Tools
// ============================================================================

server.tool(
  "ecomode_enable",
  "Enable ecomode for resource-efficient operation",
  {
    prefer_haiku: z
      .boolean()
      .optional()
      .describe("Use Haiku variants for agents (default: true)"),
    skip_metis: z
      .boolean()
      .optional()
      .describe("Skip Metis pre-planning phase (default: true)"),
    skip_momus: z
      .boolean()
      .optional()
      .describe("Skip Momus plan review phase (default: true)"),
    shorter_responses: z
      .boolean()
      .optional()
      .describe("Request shorter responses from agents (default: true)"),
  },
  async ({ prefer_haiku, skip_metis, skip_momus, shorter_responses }) => {
    const customSettings = {};
    if (prefer_haiku !== undefined) customSettings.prefer_haiku = prefer_haiku;
    if (skip_metis !== undefined) customSettings.skip_metis = skip_metis;
    if (skip_momus !== undefined) customSettings.skip_momus = skip_momus;
    if (shorter_responses !== undefined) customSettings.shorter_responses = shorter_responses;

    const state = enableEcomode(getDirectory(), customSettings);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: true, message: "Ecomode enabled", state },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool("ecomode_disable", "Disable ecomode", {}, async () => {
  const state = disableEcomode(getDirectory());
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { success: true, message: "Ecomode disabled", state },
          null,
          2
        ),
      },
    ],
  };
});

server.tool("ecomode_status", "Get current ecomode status", {}, async () => {
  const state = readEcomodeState(getDirectory());
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(state, null, 2),
      },
    ],
  };
});

server.tool(
  "ecomode_get_tier",
  "Get recommended tier for a task type based on ecomode settings",
  {
    task_type: z
      .enum(["junior", "oracle", "explore", "librarian"])
      .describe("Type of task/agent"),
  },
  async ({ task_type }) => {
    const recommendation = getRecommendedTier(getDirectory(), task_type);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(recommendation, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "ecomode_should_skip",
  "Check if a planning phase should be skipped in ecomode",
  {
    phase: z.enum(["metis", "momus"]).describe("Planning phase to check"),
  },
  async ({ phase }) => {
    const skip = shouldSkipPhase(getDirectory(), phase);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ phase, skip }, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Autopilot Tools
// ============================================================================

server.tool(
  "autopilot_start",
  "Start a new 5-phase autopilot workflow (Phase 0: Debate Planning, Phase 1: Prometheus+Metis, Phase 2: Execution, Phase 3: QA, Phase 4: Debate Code Review)",
  {
    name: z.string().describe("Name of the autopilot session"),
    request: z.string().describe("The original user request"),
    skip_debate: z.boolean().optional().describe("Skip Debate planning phase (Phase 0)"),
    use_swarm: z.boolean().optional().describe("Use swarm for parallel execution"),
    swarm_agents: z.number().optional().describe("Number of swarm agents (default: 3)"),
    fast: z.boolean().optional().describe("Fast mode: skip Debate/Metis phases (alias for --fast)"),
    ui: z.boolean().optional().describe("Enable UI verification in QA phase"),
    skip_qa: z.boolean().optional().describe("Skip QA phase"),
    skip_validation: z.boolean().optional().describe("Skip code review phase"),
  },
  async ({ name, request, skip_debate, use_swarm, swarm_agents, fast, ui, skip_qa, skip_validation }) => {
    const options = {
      skip_debate: fast || skip_debate,
      use_swarm,
      swarm_agents,
      fast: fast || false,
      ui: ui || false,
      skip_qa: skip_qa || false,
      skip_validation: skip_validation || false,
    };

    // Enable workmode when autopilot starts
    enableWorkmode(getDirectory(), "autopilot", options);

    const state = startAutopilot(getDirectory(), name, request, options);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: "Autopilot started",
              id: state.id,
              current_phase: state.current_phase,
              phase_name: PHASE_NAMES[state.current_phase],
              workmode: "enabled",
              options: {
                fast: options.fast,
                ui: options.ui,
                swarm: options.use_swarm ? options.swarm_agents : null,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool("autopilot_get_phase", "Get current autopilot phase", {}, async () => {
  const phase = getCurrentPhase(getDirectory());
  if (!phase) {
    return {
      content: [{ type: "text", text: "No active autopilot" }],
    };
  }
  return {
    content: [{ type: "text", text: JSON.stringify(phase, null, 2) }],
  };
});

server.tool(
  "autopilot_check_gate",
  "Check if current phase gate criteria are met",
  {},
  async () => {
    const result = checkPhaseGate(getDirectory());
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "autopilot_advance",
  "Advance to the next phase (checks gate first)",
  {
    output: z.string().optional().describe("Output file path for current phase"),
  },
  async ({ output }) => {
    const result = advancePhase(getDirectory(), output);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "autopilot_update_progress",
  "Update phase progress data",
  {
    phase: z.number().min(0).max(4).describe("Phase number (0-4)"),
    progress: z.object({}).passthrough().describe("Progress data object"),
  },
  async ({ phase, progress }) => {
    const state = updatePhaseProgress(getDirectory(), phase, progress);
    if (!state) {
      return {
        content: [{ type: "text", text: "No active autopilot" }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: true, phase, progress: state.phases[phase] },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "autopilot_set_output",
  "Set output file for a phase",
  {
    phase: z.number().min(0).max(4).describe("Phase number (0-4)"),
    output: z.string().describe("Output file path"),
  },
  async ({ phase, output }) => {
    const state = setPhaseOutput(getDirectory(), phase, output);
    if (!state) {
      return {
        content: [{ type: "text", text: "No active autopilot" }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, phase, output }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "autopilot_fail",
  "Mark autopilot as failed",
  {
    error: z.string().describe("Error message"),
  },
  async ({ error }) => {
    const state = failAutopilot(getDirectory(), error);
    if (!state) {
      return {
        content: [{ type: "text", text: "No active autopilot" }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, status: "failed", error }, null, 2),
        },
      ],
    };
  }
);

server.tool("autopilot_status", "Get full autopilot status", {}, async () => {
  const status = getAutopilotStatus(getDirectory());
  if (!status) {
    return {
      content: [{ type: "text", text: "No active autopilot" }],
    };
  }
  return {
    content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
  };
});

server.tool("autopilot_clear", "Clear the autopilot state (archives it first)", {}, async () => {
  const success = clearAutopilot(getDirectory());

  // Also disable workmode when autopilot clears
  disableWorkmode(getDirectory());

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success,
          message: success ? "Autopilot cleared and archived, workmode disabled" : "No autopilot to clear",
          workmode: "disabled",
        }),
      },
    ],
  };
});

server.tool(
  "autopilot_loop_back",
  "Loop back to an earlier phase after Debate code review failure (increments review_loop_count)",
  {
    target_phase: z.number().min(0).max(3).describe("Phase to loop back to (typically 2 = execution)"),
    reason: z.string().optional().describe("Reason for looping back (from code review feedback)"),
  },
  async ({ target_phase, reason }) => {
    const result = loopBackToPhase(getDirectory(), target_phase, reason || "");
    if (result.error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: result.error }) }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Workmode Tools
// ============================================================================

server.tool(
  "workmode_enable",
  "Enable workmode to block direct code modification from main agent",
  {
    mode: z.enum(["autopilot", "swarm"]).describe("Workmode type"),
    fast: z.boolean().optional().describe("Fast mode option"),
    swarm: z.number().optional().describe("Number of swarm agents"),
    ui: z.boolean().optional().describe("Enable UI verification"),
  },
  async ({ mode, fast, swarm, ui }) => {
    const state = enableWorkmode(getDirectory(), mode, { fast, swarm, ui });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: true, message: "Workmode enabled", state },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool("workmode_disable", "Disable workmode", {}, async () => {
  const result = disableWorkmode(getDirectory());
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

server.tool("workmode_status", "Get workmode status", {}, async () => {
  const status = getWorkmodeStatus(getDirectory());
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(status, null, 2),
      },
    ],
  };
});

server.tool(
  "workmode_check",
  "Check if code modification should be blocked",
  {
    agent: z.string().describe("Agent name (main, atlas, junior, etc.)"),
    file_path: z.string().optional().describe("File being modified"),
  },
  async ({ agent, file_path }) => {
    const result = shouldBlockModification(getDirectory(), agent, file_path);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// UI Verification Tools
// ============================================================================

server.tool(
  "ui_verification_config",
  "Create UI verification configuration",
  {
    url: z.string().describe("URL to verify"),
    expectations: z.array(z.string()).optional().describe("List of expected UI elements/behaviors"),
    screenshot_path: z.string().optional().describe("Path to save screenshot"),
    session_id: z.string().optional().describe("Autopilot session ID"),
  },
  async ({ url, expectations, screenshot_path, session_id }) => {
    const config = createVerificationConfig(getDirectory(), {
      url,
      expectations: expectations || [],
      screenshotPath: screenshot_path,
      sessionId: session_id,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: true, config },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "ui_verification_record",
  "Record UI verification result",
  {
    session_id: z.string().optional().describe("Session ID"),
    overall_status: z.enum(["pass", "fail", "warn", "error"]).describe("Overall status"),
    checks: z.array(z.object({
      expectation: z.string(),
      status: z.enum(["pass", "fail", "warn"]),
      details: z.string().optional(),
    })).optional().describe("Individual check results"),
    issues: z.array(z.object({
      type: z.string(),
      severity: z.enum(["error", "warning"]),
      description: z.string(),
    })).optional().describe("Found issues"),
    summary: z.string().optional().describe("Summary"),
  },
  async ({ session_id, overall_status, checks, issues, summary }) => {
    const result = recordVerificationResult(getDirectory(), session_id, {
      overall_status,
      checks: checks || [],
      issues: issues || [],
      summary: summary || "",
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: true, result },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "ui_verification_status",
  "Get UI verification status",
  {
    session_id: z.string().optional().describe("Session ID"),
  },
  async ({ session_id }) => {
    const status = getVerificationStatus(getDirectory(), session_id);
    return {
      content: [
        {
          type: "text",
          text: status
            ? JSON.stringify(status, null, 2)
            : "No verification result found",
        },
      ],
    };
  }
);

server.tool(
  "ui_verification_command",
  "Generate Playwright screenshot command",
  {
    url: z.string().describe("URL to capture"),
    output_path: z.string().describe("Screenshot output path"),
  },
  async ({ url, output_path }) => {
    const command = generatePlaywrightCommand(url, output_path);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ command }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "ui_verification_prompt",
  "Generate Gemini analysis prompt for UI verification",
  {
    expectations: z.array(z.string()).optional().describe("List of expected UI elements/behaviors"),
  },
  async ({ expectations }) => {
    const prompt = generateAnalysisPrompt(expectations || []);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ prompt }, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Model Router Tools
// ============================================================================

server.tool(
  "model_router_recommend",
  "Get recommended model for a task type",
  {
    task_type: z.enum([
      "code_analysis",
      "code_review",
      "architecture",
      "image_analysis",
      "ui_verification",
      "doc_search",
      "code_search",
      "complex_implementation",
      "simple_implementation",
      "refactoring",
      "bug_fix",
    ]).describe("Type of task"),
  },
  async ({ task_type }) => {
    const recommendation = getRecommendedModel(task_type);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(recommendation, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "model_router_junior_tier",
  "Get Junior tier based on task complexity",
  {
    files: z.number().optional().describe("Number of files affected"),
    lines: z.number().optional().describe("Estimated lines of code"),
    type: z.enum(["feature", "bugfix", "refactor"]).optional().describe("Type of change"),
  },
  async ({ files, lines, type }) => {
    const tier = getJuniorTier({ files, lines, type });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(tier, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "model_router_agent",
  "Get model configuration for an agent",
  {
    agent: z.string().describe("Agent name"),
    ecomode: z.boolean().optional().describe("Whether ecomode is enabled"),
  },
  async ({ agent, ecomode }) => {
    const config = getAgentModel(agent, ecomode || false);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(config, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Integrated Tools
// ============================================================================

server.tool(
  "chronos_status",
  "Get full Chronos status (Ralph Loop + Boulder + Ecomode + Workmode + Autopilot + Agent Limiter)",
  {},
  async () => {
    const ralph = readRalphState(getDirectory());
    const boulder = readBoulderState(getDirectory());
    const progress = boulder ? getActivePlanProgress(getDirectory()) : null;
    const plans = findPrometheusPlans(getDirectory());
    const ecomode = readEcomodeState(getDirectory());
    const workmode = readWorkmodeState(getDirectory());
    const autopilot = readAutopilotState(getDirectory());
    const agentLimiter = getAgentLimiterStatus(getDirectory());

    const status = {
      ralph_loop: ralph || { active: false },
      boulder: boulder || null,
      plan_progress: progress,
      available_plans: plans.length,
      ecomode: {
        enabled: ecomode.enabled,
        settings: ecomode.settings,
      },
      workmode: {
        active: workmode.active,
        mode: workmode.mode,
        options: workmode.options,
      },
      autopilot: autopilot ? {
        id: autopilot.id,
        status: autopilot.status,
        current_phase: autopilot.current_phase,
        phase_name: PHASE_NAMES[autopilot.current_phase],
        review_loop_count: autopilot.review_loop_count || 0,
        options: autopilot.options,
      } : null,
      agent_limiter: {
        active: agentLimiter.active,
        limit: agentLimiter.limit,
        available: agentLimiter.available,
      },
    };

    return {
      content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
    };
  }
);

server.tool(
  "chronos_should_continue",
  "Determine if execution should continue (used by hooks)",
  {},
  async () => {
    const directory = getDirectory();

    // Check Ralph Loop first
    const ralphDecision = ralphShouldContinue(directory);
    if (ralphDecision.continue) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                decision: "continue",
                source: "ralph",
                reason: ralphDecision.reason,
                iteration: ralphDecision.iteration,
                max_iterations: ralphDecision.max_iterations,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Check Boulder progress
    const progress = getActivePlanProgress(directory);
    if (progress && !progress.isComplete) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                decision: "continue",
                source: "boulder",
                reason: `Plan "${progress.plan_name}" has ${progress.total - progress.completed}/${progress.total} tasks remaining`,
                progress: {
                  completed: progress.completed,
                  total: progress.total,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // No reason to continue
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              decision: "stop",
              reason: ralphDecision.reason || "no_active_work",
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ============================================================================
// Agent Limiter Tools (OOM Prevention)
// ============================================================================

server.tool(
  "agent_limiter_status",
  "Get current agent limiter status (active agents, limit, available slots)",
  {},
  async () => {
    const status = getAgentLimiterStatus(getDirectory());
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "agent_limiter_can_spawn",
  "Check if a new agent can be spawned",
  {},
  async () => {
    const result = canSpawnAgent(getDirectory());
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "agent_limiter_register",
  "Register a new agent (call when spawning background agent)",
  {
    agent_id: z.string().describe("Unique agent ID"),
    agent_type: z.string().describe("Agent type (e.g., junior, explore)"),
  },
  async ({ agent_id, agent_type }) => {
    const result = registerAgent(getDirectory(), agent_id, agent_type);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "agent_limiter_heartbeat",
  "Update agent heartbeat (keeps agent from being marked stale)",
  {
    agent_id: z.string().describe("Agent ID to update"),
  },
  async ({ agent_id }) => {
    const result = heartbeatAgent(getDirectory(), agent_id);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "agent_limiter_unregister",
  "Unregister an agent (call when agent completes or fails)",
  {
    agent_id: z.string().describe("Agent ID to unregister"),
    reason: z.string().optional().describe("Reason for unregistering (completed/failed)"),
  },
  async ({ agent_id, reason }) => {
    const result = unregisterAgent(getDirectory(), agent_id, reason || "completed");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "agent_limiter_set_limit",
  "Set maximum concurrent agents (1-20)",
  {
    limit: z.number().min(1).max(20).describe("New agent limit"),
  },
  async ({ limit }) => {
    const result = setAgentLimit(getDirectory(), limit);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "agent_limiter_cleanup",
  "Clean up stale agents (no heartbeat for 5+ minutes)",
  {},
  async () => {
    const result = cleanupStaleAgents(getDirectory());
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "agent_limiter_clear",
  "Clear all agents (for recovery from stuck state)",
  {},
  async () => {
    const result = clearAllAgents(getDirectory());
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Chronos MCP Server running on stdio");
}

main().catch(console.error);
