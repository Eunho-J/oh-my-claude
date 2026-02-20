/**
 * Debate State Management
 *
 * Manages multi-model debate sessions for critical decision making.
 * Four AI models (Opus-4.6, GPT-5.2, Gemini, GLM-4.7) debate topics and reach consensus.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  renameSync,
} from "node:fs";
import { join, basename } from "node:path";
import { SISYPHUS_DIR } from "./constants.js";
import { ensureSisyphusDir, nowISO, safeJsonParse } from "./utils.js";

// Constants
export const DEBATES_DIR = "debates";
export const ACTIVE_DEBATE_FILE = "active-debate.json";
export const HISTORY_DIR = "history";
export const DEFAULT_MAX_ROUNDS = 6;

/**
 * @typedef {Object} ModelAnalysis
 * @property {string} summary - Analysis summary
 * @property {string} position - Model's position on the topic
 * @property {string} timestamp - When analysis was provided
 */

/**
 * @typedef {Object} DebateRound
 * @property {number} round - Round number
 * @property {string} speaker - Model that spoke (opus, gpt52, gemini, glm)
 * @property {string} content - What the model said
 * @property {string[]} agreements - Models that agreed
 * @property {string[]} disagreements - Models that disagreed
 * @property {string} timestamp - When the round occurred
 */

/**
 * @typedef {Object} DebateVote
 * @property {boolean|null} opus - Opus's vote
 * @property {boolean|null} gpt52 - GPT-5.2's vote
 * @property {boolean|null} gemini - Gemini's vote
 * @property {boolean|null} glm - GLM-4.7's vote
 */

/**
 * @typedef {Object} DebateState
 * @property {string} id - Unique debate ID
 * @property {string} topic - Debate topic/question
 * @property {string} context - Additional context for the debate
 * @property {'pending'|'analyzing'|'debating'|'voting'|'concluded'} status - Current phase
 * @property {string} phase - Current phase name for display
 * @property {number} round - Current round number
 * @property {number} max_rounds - Maximum rounds before forced conclusion
 * @property {Object.<string, ModelAnalysis>} analyses - Model analyses
 * @property {DebateRound[]} debate_log - History of debate rounds
 * @property {Object.<string, DebateVote>} votes - Votes on specific items
 * @property {Object|null} conclusion - Final conclusion
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Last update timestamp
 */

/**
 * Get debates directory path.
 * @param {string} directory - Base directory
 * @returns {string} Path to debates directory
 */
export function getDebatesDir(directory) {
  return join(directory, SISYPHUS_DIR, DEBATES_DIR);
}

/**
 * Get active debate file path.
 * @param {string} directory - Base directory
 * @returns {string} Path to active debate file
 */
export function getActiveDebateFilePath(directory) {
  return join(getDebatesDir(directory), ACTIVE_DEBATE_FILE);
}

/**
 * Get debate history directory path.
 * @param {string} directory - Base directory
 * @returns {string} Path to history directory
 */
export function getHistoryDir(directory) {
  return join(getDebatesDir(directory), HISTORY_DIR);
}

/**
 * Ensure debates directories exist.
 * @param {string} directory - Base directory
 */
export function ensureDebatesDir(directory) {
  ensureSisyphusDir(directory);
  const debatesDir = getDebatesDir(directory);
  const historyDir = getHistoryDir(directory);

  if (!existsSync(debatesDir)) {
    mkdirSync(debatesDir, { recursive: true });
  }
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true });
  }
}

/**
 * Generate a unique debate ID.
 * @param {string} topic - Debate topic
 * @returns {string} Unique ID
 */
export function generateDebateId(topic) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30)
    .replace(/-+$/, "");
  return `debate-${timestamp}-${slug}`;
}

/**
 * Read active debate state.
 * @param {string} directory - Base directory
 * @returns {DebateState|null} Debate state or null
 */
export function readDebateState(directory) {
  const filePath = getActiveDebateFilePath(directory);

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
 * Write debate state to file.
 * @param {string} directory - Base directory
 * @param {DebateState} state - State to write
 * @returns {boolean} Success
 */
export function writeDebateState(directory, state) {
  try {
    ensureDebatesDir(directory);
    state.updated_at = nowISO();
    const filePath = getActiveDebateFilePath(directory);
    writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Start a new debate.
 * @param {string} directory - Base directory
 * @param {string} topic - Debate topic
 * @param {string} [context] - Additional context
 * @param {number} [maxRounds] - Maximum rounds
 * @returns {DebateState} New debate state
 */
export function startDebate(directory, topic, context = "", maxRounds = DEFAULT_MAX_ROUNDS) {
  const state = {
    id: generateDebateId(topic),
    topic,
    context,
    status: "analyzing",
    phase: "Independent Analysis",
    round: 0,
    max_rounds: maxRounds,
    analyses: {},
    debate_log: [],
    votes: {},
    conclusion: null,
    created_at: nowISO(),
    updated_at: nowISO(),
  };

  writeDebateState(directory, state);
  return state;
}

/**
 * Add model analysis to debate.
 * @param {string} directory - Base directory
 * @param {string} model - Model name (opus, gpt, gemini)
 * @param {string} summary - Analysis summary
 * @param {string} position - Model's position
 * @returns {DebateState|null} Updated state or null
 */
export function addAnalysis(directory, model, summary, position) {
  const state = readDebateState(directory);
  if (!state) return null;

  state.analyses[model] = {
    summary,
    position,
    timestamp: nowISO(),
  };

  // Check if all analyses are complete (4 models)
  const allModels = ["opus", "gpt52", "gemini", "glm"];
  const completedAnalyses = Object.keys(state.analyses);
  if (allModels.every((m) => completedAnalyses.includes(m))) {
    state.status = "debating";
    state.phase = "Debate";
    state.round = 1;
  }

  writeDebateState(directory, state);
  return state;
}

/**
 * Add a debate round.
 * @param {string} directory - Base directory
 * @param {string} speaker - Speaker model
 * @param {string} content - What was said
 * @param {string[]} [agreements] - Models that agreed
 * @param {string[]} [disagreements] - Models that disagreed
 * @returns {DebateState|null} Updated state or null
 */
export function addDebateRound(
  directory,
  speaker,
  content,
  agreements = [],
  disagreements = []
) {
  const state = readDebateState(directory);
  if (!state || state.status !== "debating") return null;

  state.debate_log.push({
    round: state.round,
    speaker,
    content,
    agreements,
    disagreements,
    timestamp: nowISO(),
  });

  // Increment round after all 4 models have spoken in current round
  const currentRoundEntries = state.debate_log.filter(
    (entry) => entry.round === state.round
  );
  if (currentRoundEntries.length >= 4) {
    state.round += 1;
  }

  // Check if max rounds reached
  if (state.round > state.max_rounds) {
    state.status = "voting";
    state.phase = "Voting";
  }

  writeDebateState(directory, state);
  return state;
}

/**
 * Check if consensus has been reached (3/4 majority for 4 models).
 * @param {DebateState} state - Current debate state
 * @returns {{reached: boolean, position: string|null}} Consensus status
 */
export function checkConsensus(state) {
  const totalModels = 4;
  const majorityThreshold = 3; // 3/4 majority

  if (!state.analyses || Object.keys(state.analyses).length < totalModels) {
    return { reached: false, position: null };
  }

  const positions = Object.values(state.analyses).map((a) => a.position.toLowerCase());
  const uniquePositions = [...new Set(positions)];

  // Unanimous agreement
  if (uniquePositions.length === 1) {
    return { reached: true, position: uniquePositions[0] };
  }

  // Check for 3/4 majority
  for (const pos of uniquePositions) {
    const count = positions.filter((p) => p === pos).length;
    if (count >= majorityThreshold) {
      return { reached: true, position: pos };
    }
  }

  // Check recent debate rounds for agreement (3/4 models agree)
  if (state.debate_log.length >= 4) {
    const recentRounds = state.debate_log.slice(-4);
    const allAgree = recentRounds.every(
      (r) => r.agreements && r.agreements.length >= majorityThreshold - 1
    );
    if (allAgree) {
      return { reached: true, position: recentRounds[0].content.slice(0, 100) };
    }
  }

  return { reached: false, position: null };
}

/**
 * Record a vote on a specific item.
 * @param {string} directory - Base directory
 * @param {string} item - Item being voted on
 * @param {string} model - Voting model
 * @param {boolean} vote - The vote
 * @returns {DebateState|null} Updated state or null
 */
export function addVote(directory, item, model, vote) {
  const state = readDebateState(directory);
  if (!state) return null;

  if (!state.votes[item]) {
    state.votes[item] = { opus: null, gpt52: null, gemini: null, glm: null };
  }

  state.votes[item][model] = vote;

  writeDebateState(directory, state);
  return state;
}

/**
 * Calculate majority vote result.
 * @param {DebateVote} votes - Votes object
 * @returns {{result: boolean, count: {yes: number, no: number}}} Vote result
 */
export function calculateMajority(votes) {
  const values = Object.values(votes).filter((v) => v !== null);
  const yes = values.filter((v) => v === true).length;
  const no = values.filter((v) => v === false).length;

  return {
    result: yes >= no,
    count: { yes, no },
  };
}

/**
 * Conclude the debate.
 * @param {string} directory - Base directory
 * @param {string} summary - Conclusion summary
 * @param {string} decision - Final decision
 * @param {'consensus'|'majority'|'no_consensus'} method - How conclusion was reached
 * @param {Object} [details] - Additional details
 * @returns {DebateState|null} Final state or null
 */
export function concludeDebate(directory, summary, decision, method, details = {}) {
  const state = readDebateState(directory);
  if (!state) return null;

  state.status = "concluded";
  state.phase = "Concluded";
  state.conclusion = {
    summary,
    decision,
    method,
    details,
    concluded_at: nowISO(),
  };

  writeDebateState(directory, state);

  // Archive to history
  archiveDebate(directory, state);

  return state;
}

/**
 * Archive completed debate to history.
 * @param {string} directory - Base directory
 * @param {DebateState} state - Debate state to archive
 */
export function archiveDebate(directory, state) {
  try {
    ensureDebatesDir(directory);
    const historyPath = join(getHistoryDir(directory), `${state.id}.json`);
    writeFileSync(historyPath, JSON.stringify(state, null, 2), "utf-8");
  } catch {
    // Silently fail archive
  }
}

/**
 * Clear active debate.
 * @param {string} directory - Base directory
 * @returns {boolean} Success
 */
export function clearDebate(directory) {
  const filePath = getActiveDebateFilePath(directory);

  try {
    if (existsSync(filePath)) {
      const state = readDebateState(directory);
      if (state) {
        archiveDebate(directory, state);
      }
      // Remove active debate file
      const historyPath = join(getHistoryDir(directory), `${state?.id || "unknown"}.json`);
      renameSync(filePath, historyPath);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * List debate history.
 * @param {string} directory - Base directory
 * @returns {Object[]} List of past debates
 */
export function listDebateHistory(directory) {
  const historyDir = getHistoryDir(directory);

  if (!existsSync(historyDir)) {
    return [];
  }

  try {
    const files = readdirSync(historyDir).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
      const content = readFileSync(join(historyDir, f), "utf-8");
      const debate = safeJsonParse(content, null);
      if (!debate) return null;
      return {
        id: debate.id,
        topic: debate.topic,
        status: debate.status,
        decision: debate.conclusion?.decision || null,
        method: debate.conclusion?.method || null,
        created_at: debate.created_at,
        concluded_at: debate.conclusion?.concluded_at || null,
      };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get debate summary for display.
 * @param {DebateState} state - Debate state
 * @returns {Object} Summary object
 */
export function getDebateSummary(state) {
  if (!state) return null;

  const consensus = checkConsensus(state);

  return {
    id: state.id,
    topic: state.topic,
    status: state.status,
    phase: state.phase,
    round: state.round,
    max_rounds: state.max_rounds,
    analyses_complete: Object.keys(state.analyses).length,
    debate_rounds: state.debate_log.length,
    consensus_reached: consensus.reached,
    consensus_position: consensus.position,
    votes_recorded: Object.keys(state.votes).length,
    has_conclusion: state.conclusion !== null,
  };
}
