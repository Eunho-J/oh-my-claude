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
  PHASE_NAMES,
  PHASE_DESCRIPTIONS,
} from "./lib/autopilot-state.js";

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
      .enum(["opus", "gpt", "gemini"])
      .describe("The model providing the analysis"),
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
      .enum(["opus", "gpt", "gemini"])
      .describe("The model speaking"),
    content: z.string().describe("What the model said"),
    agreements: z
      .array(z.enum(["opus", "gpt", "gemini"]))
      .optional()
      .describe("Models that agreed"),
    disagreements: z
      .array(z.enum(["opus", "gpt", "gemini"]))
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
      .enum(["opus", "gpt", "gemini"])
      .describe("The voting model"),
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
  "Start a new 5-phase autopilot workflow",
  {
    name: z.string().describe("Name of the autopilot session"),
    request: z.string().describe("The original user request"),
    skip_metis: z.boolean().optional().describe("Skip Metis expansion phase"),
    skip_momus: z.boolean().optional().describe("Skip Momus review in planning"),
    use_swarm: z.boolean().optional().describe("Use swarm for parallel execution"),
    swarm_agents: z.number().optional().describe("Number of swarm agents (default: 3)"),
  },
  async ({ name, request, skip_metis, skip_momus, use_swarm, swarm_agents }) => {
    const options = { skip_metis, skip_momus, use_swarm, swarm_agents };
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
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success,
          message: success ? "Autopilot cleared and archived" : "No autopilot to clear",
        }),
      },
    ],
  };
});

// ============================================================================
// Integrated Tools
// ============================================================================

server.tool(
  "chronos_status",
  "Get full Chronos status (Ralph Loop + Boulder + Ecomode)",
  {},
  async () => {
    const ralph = readRalphState(getDirectory());
    const boulder = readBoulderState(getDirectory());
    const progress = boulder ? getActivePlanProgress(getDirectory()) : null;
    const plans = findPrometheusPlans(getDirectory());
    const ecomode = readEcomodeState(getDirectory());

    const status = {
      ralph_loop: ralph || { active: false },
      boulder: boulder || null,
      plan_progress: progress,
      available_plans: plans.length,
      ecomode: {
        enabled: ecomode.enabled,
        settings: ecomode.settings,
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Chronos MCP Server running on stdio");
}

main().catch(console.error);
