/**
 * Model Router
 *
 * Smart routing of tasks to appropriate models (Claude vs external).
 * Optimizes for cost and capability.
 *
 * Strategy:
 * - Code analysis/review → Codex (GPT)
 * - Architecture decisions → Codex (xhigh reasoning)
 * - Image/UI analysis → Gemini
 * - Documentation search → GLM-4.7
 * - Complex implementation → Claude Opus
 * - Simple implementation → Claude Sonnet/Haiku
 */

/**
 * Task type definitions
 */
export const TASK_TYPES = {
  CODE_ANALYSIS: "code_analysis",
  CODE_REVIEW: "code_review",
  ARCHITECTURE: "architecture",
  IMAGE_ANALYSIS: "image_analysis",
  UI_VERIFICATION: "ui_verification",
  DOC_SEARCH: "doc_search",
  CODE_SEARCH: "code_search",
  COMPLEX_IMPLEMENTATION: "complex_implementation",
  SIMPLE_IMPLEMENTATION: "simple_implementation",
  REFACTORING: "refactoring",
  BUG_FIX: "bug_fix",
};

/**
 * Model definitions
 */
export const MODELS = {
  // External models
  CODEX: "codex",
  CODEX_XHIGH: "codex_xhigh",
  CODEX_SPARK: "codex_spark",
  GEMINI: "gemini",
  GLM: "glm-4.7",

  // Claude models
  CLAUDE_OPUS: "claude_opus",
  CLAUDE_SONNET: "claude_sonnet",
  CLAUDE_HAIKU: "claude_haiku",
};

/**
 * Model routing rules
 */
const ROUTING_RULES = {
  [TASK_TYPES.CODE_ANALYSIS]: {
    primary: MODELS.CODEX,
    fallback: MODELS.CLAUDE_SONNET,
    reasoning: null,
  },
  [TASK_TYPES.CODE_REVIEW]: {
    primary: MODELS.CODEX,
    fallback: MODELS.CLAUDE_SONNET,
    reasoning: null,
  },
  [TASK_TYPES.ARCHITECTURE]: {
    primary: MODELS.CODEX_XHIGH,
    fallback: MODELS.CLAUDE_OPUS,
    reasoning: "xhigh",
  },
  [TASK_TYPES.IMAGE_ANALYSIS]: {
    primary: MODELS.GEMINI,
    fallback: MODELS.CLAUDE_SONNET,
    reasoning: null,
  },
  [TASK_TYPES.UI_VERIFICATION]: {
    primary: MODELS.GEMINI,
    fallback: MODELS.CLAUDE_SONNET,
    reasoning: null,
  },
  [TASK_TYPES.DOC_SEARCH]: {
    primary: MODELS.GLM,
    fallback: MODELS.CLAUDE_HAIKU,
    reasoning: null,
  },
  [TASK_TYPES.CODE_SEARCH]: {
    primary: MODELS.GLM,
    fallback: MODELS.CLAUDE_HAIKU,
    reasoning: null,
  },
  [TASK_TYPES.COMPLEX_IMPLEMENTATION]: {
    primary: MODELS.CLAUDE_OPUS,
    fallback: MODELS.CLAUDE_SONNET,
    reasoning: null,
  },
  [TASK_TYPES.SIMPLE_IMPLEMENTATION]: {
    primary: MODELS.CLAUDE_SONNET,
    fallback: MODELS.CLAUDE_HAIKU,
    reasoning: null,
  },
  [TASK_TYPES.REFACTORING]: {
    primary: MODELS.CLAUDE_SONNET,
    fallback: MODELS.CODEX,
    reasoning: null,
  },
  [TASK_TYPES.BUG_FIX]: {
    primary: MODELS.CLAUDE_SONNET,
    fallback: MODELS.CODEX,
    reasoning: null,
  },
};

/**
 * Complexity thresholds for Junior tier routing
 */
const COMPLEXITY_THRESHOLDS = {
  LOW: {
    max_files: 1,
    max_lines: 20,
    agents: ["junior"],
    model: MODELS.CODEX_SPARK,
  },
  MEDIUM: {
    max_files: 5,
    max_lines: 100,
    agents: ["junior"],
    model: MODELS.CODEX_SPARK,
  },
  HIGH: {
    max_files: Infinity,
    max_lines: Infinity,
    agents: ["junior"],
    model: MODELS.CODEX_SPARK,
  },
};

/**
 * Get recommended model for a task type
 *
 * @param {string} taskType - Task type from TASK_TYPES
 * @returns {object} { primary, fallback, reasoning }
 */
export function getRecommendedModel(taskType) {
  const rule = ROUTING_RULES[taskType];

  if (!rule) {
    return {
      primary: MODELS.CLAUDE_SONNET,
      fallback: MODELS.CLAUDE_HAIKU,
      reasoning: null,
    };
  }

  return rule;
}

/**
 * Get Junior tier based on task complexity
 *
 * @param {object} taskMetrics - Task complexity metrics
 * @param {number} taskMetrics.files - Number of files affected
 * @param {number} taskMetrics.lines - Estimated lines of code
 * @param {string} taskMetrics.type - Type of change (feature, bugfix, refactor)
 * @returns {object} { tier, agent, model }
 */
export function getJuniorTier(taskMetrics) {
  const { files = 1, lines = 10, type = "feature" } = taskMetrics;

  // Bug fixes typically use medium tier
  if (type === "bugfix" && files <= 3) {
    return {
      tier: "medium",
      agent: "junior",
      model: MODELS.CODEX_SPARK,
    };
  }

  // All tiers now use a single junior agent
  return {
    tier: "standard",
    agent: "junior",
    model: MODELS.CODEX_SPARK,
  };
}

/**
 * Map agent name to recommended model
 *
 * @param {string} agentName - Agent name
 * @param {boolean} ecomode - Whether ecomode is enabled
 * @returns {object} { model, external, tier }
 */
export function getAgentModel(agentName, ecomode = false) {
  const agentModels = {
    // Planning agents - use external models primarily
    metis: {
      model: MODELS.CODEX_XHIGH,
      external: true,
      tier: null,
      description: "GPT-5.3-Codex with xhigh reasoning for pre-planning analysis",
    },
    // Advisory agents - prefer external models
    oracle: {
      model: ecomode ? MODELS.CLAUDE_HAIKU : MODELS.CODEX,
      external: !ecomode,
      tier: ecomode ? "low" : null,
      description: "Opus-4.6 + GPT-5.3-Codex for architecture advice (Haiku in ecomode)",
    },
    "oracle-low": {
      model: MODELS.CLAUDE_HAIKU,
      external: false,
      tier: "low",
      description: "Quick architecture lookups",
    },

    // Search agents - prefer external models
    librarian: {
      model: MODELS.GLM,
      external: true,
      tier: null,
      description: "GLM-4.7 for documentation and code search",
    },

    // Analysis agents
    "multimodal-looker": {
      model: MODELS.GEMINI,
      external: true,
      tier: null,
      description: "Gemini for image/PDF analysis",
    },

    // Exploration agents
    explore: {
      model: MODELS.CLAUDE_HAIKU,
      external: false,
      tier: "low",
      description: "Fast codebase exploration",
    },
    "explore-high": {
      model: MODELS.CLAUDE_SONNET,
      external: false,
      tier: "medium",
      description: "Deep codebase analysis",
    },

    // Execution agent (codex-spark primary)
    junior: {
      model: MODELS.CODEX_SPARK,
      external: true,
      tier: "standard",
      description: "Task execution via gpt-5.3-codex-spark (Haiku shell)",
    },

    // Orchestration agents
    atlas: {
      model: MODELS.CLAUDE_SONNET,
      external: false,
      tier: null,
      description: "Orchestration (no direct code modification)",
    },
    prometheus: {
      model: MODELS.CLAUDE_OPUS,
      external: false,
      tier: null,
      description: "Strategic planning (Opus-4.6)",
    },
    sisyphus: {
      model: MODELS.CLAUDE_SONNET,
      external: false,
      tier: null,
      description: "Primary user-facing agent (Sonnet-4.6)",
    },

    // Debate agent
    debate: {
      model: MODELS.CLAUDE_OPUS,
      external: true,
      tier: null,
      description: "Multi-model debate (Opus-4.6 + GPT-5.2 + Gemini + GLM-4.7)",
    },
  };

  const agentConfig = agentModels[agentName];

  if (!agentConfig) {
    // Default fallback
    return {
      model: ecomode ? MODELS.CLAUDE_HAIKU : MODELS.CLAUDE_SONNET,
      external: false,
      tier: ecomode ? "low" : "medium",
      description: "Unknown agent, using default",
    };
  }

  // Apply ecomode downgrades
  if (ecomode && !agentConfig.external) {
    if (agentConfig.model === MODELS.CLAUDE_OPUS) {
      return { ...agentConfig, model: MODELS.CLAUDE_SONNET, tier: "medium" };
    }
    if (agentConfig.model === MODELS.CLAUDE_SONNET && agentConfig.tier !== "low") {
      return { ...agentConfig, tier: "low" };
    }
  }

  return agentConfig;
}

/**
 * Generate MCP tool call based on model recommendation
 *
 * @param {string} model - Model from MODELS
 * @param {string} prompt - Prompt to send
 * @param {object} options - Additional options
 * @returns {object} { tool, params }
 */
export function generateToolCall(model, prompt, options = {}) {
  switch (model) {
    case MODELS.CODEX:
    case MODELS.CODEX_XHIGH:
    case MODELS.CODEX_SPARK:
      return {
        tool: "mcp__codex__codex",
        params: {
          prompt,
          model: model === MODELS.CODEX_XHIGH
            ? "gpt-5.3-codex"
            : model === MODELS.CODEX_SPARK
              ? "gpt-5.3-codex-spark"
              : undefined,
          config: model === MODELS.CODEX_XHIGH
            ? { reasoning: { effort: "xhigh" } }
            : undefined,
          ...options,
        },
      };

    case MODELS.GEMINI:
      if (options.filePath) {
        return {
          tool: "mcp__gemini__analyzeFile",
          params: {
            filePath: options.filePath,
            prompt,
          },
        };
      }
      return {
        tool: "mcp__gemini__chat",
        params: { prompt },
      };

    case MODELS.GLM:
      return {
        tool: "mcp__zai-glm__chat",
        params: {
          prompt,
          model: "glm-4.7",
        },
      };

    default:
      // For Claude models, return Task tool suggestion
      return {
        tool: "Task",
        params: {
          prompt,
          model: model === MODELS.CLAUDE_OPUS
            ? "opus"
            : model === MODELS.CLAUDE_HAIKU
              ? "haiku"
              : "sonnet",
        },
      };
  }
}

/**
 * Estimate cost tier for a model
 *
 * @param {string} model - Model from MODELS
 * @returns {string} Cost tier (low, medium, high)
 */
export function estimateCostTier(model) {
  const costTiers = {
    [MODELS.CLAUDE_HAIKU]: "low",
    [MODELS.CLAUDE_SONNET]: "medium",
    [MODELS.CLAUDE_OPUS]: "high",
    [MODELS.CODEX]: "low",
    [MODELS.CODEX_XHIGH]: "medium",
    [MODELS.CODEX_SPARK]: "low",
    [MODELS.GEMINI]: "low",
    [MODELS.GLM]: "low",
  };

  return costTiers[model] || "medium";
}
