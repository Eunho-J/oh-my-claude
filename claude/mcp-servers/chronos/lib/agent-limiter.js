/**
 * Agent Limiter - Prevents OOM by limiting concurrent agents
 *
 * Tracks active background agents and blocks new spawns when limit is reached.
 */

import fs from "fs";
import path from "path";
import { SISYPHUS_DIR } from "./constants.js";

const AGENT_LIMITER_FILE = "active-agents.json";
const DEFAULT_LIMIT = 5;
const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the agent limiter state file path
 */
function getStatePath(directory) {
  return path.join(directory, SISYPHUS_DIR, AGENT_LIMITER_FILE);
}

/**
 * Ensure .sisyphus directory exists
 */
function ensureDirectory(directory) {
  const sisyphusDir = path.join(directory, SISYPHUS_DIR);
  if (!fs.existsSync(sisyphusDir)) {
    fs.mkdirSync(sisyphusDir, { recursive: true });
  }
}

/**
 * Read current agent limiter state
 */
export function readAgentLimiterState(directory) {
  const statePath = getStatePath(directory);

  if (!fs.existsSync(statePath)) {
    return {
      agents: [],
      limit: DEFAULT_LIMIT,
      stale_timeout_ms: STALE_TIMEOUT_MS,
    };
  }

  try {
    const content = fs.readFileSync(statePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return {
      agents: [],
      limit: DEFAULT_LIMIT,
      stale_timeout_ms: STALE_TIMEOUT_MS,
    };
  }
}

/**
 * Write agent limiter state
 */
function writeState(directory, state) {
  ensureDirectory(directory);
  const statePath = getStatePath(directory);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Clean up stale agents (no heartbeat for stale_timeout_ms)
 */
export function cleanupStaleAgents(directory) {
  const state = readAgentLimiterState(directory);
  const now = Date.now();
  const staleTimeout = state.stale_timeout_ms || STALE_TIMEOUT_MS;

  const activeAgents = state.agents.filter((agent) => {
    const lastSeen = new Date(agent.last_heartbeat || agent.started_at).getTime();
    return now - lastSeen < staleTimeout;
  });

  const removedCount = state.agents.length - activeAgents.length;

  state.agents = activeAgents;
  writeState(directory, state);

  return {
    removed: removedCount,
    active: activeAgents.length,
  };
}

/**
 * Check if a new agent can be spawned
 */
export function canSpawnAgent(directory) {
  // First cleanup stale agents
  cleanupStaleAgents(directory);

  const state = readAgentLimiterState(directory);
  const activeCount = state.agents.length;
  const limit = state.limit || DEFAULT_LIMIT;

  return {
    allowed: activeCount < limit,
    current: activeCount,
    limit: limit,
    available: Math.max(0, limit - activeCount),
  };
}

/**
 * Register a new agent
 */
export function registerAgent(directory, agentId, agentType, metadata = {}) {
  // First check if we can spawn
  const check = canSpawnAgent(directory);
  if (!check.allowed) {
    return {
      success: false,
      reason: "limit_reached",
      current: check.current,
      limit: check.limit,
    };
  }

  const state = readAgentLimiterState(directory);
  const now = new Date().toISOString();

  // Check if agent already registered
  const existing = state.agents.find((a) => a.id === agentId);
  if (existing) {
    // Update heartbeat
    existing.last_heartbeat = now;
    writeState(directory, state);
    return {
      success: true,
      action: "updated",
      current: state.agents.length,
      limit: state.limit,
    };
  }

  // Add new agent
  state.agents.push({
    id: agentId,
    type: agentType,
    started_at: now,
    last_heartbeat: now,
    ...metadata,
  });

  writeState(directory, state);

  return {
    success: true,
    action: "registered",
    current: state.agents.length,
    limit: state.limit,
  };
}

/**
 * Update agent heartbeat
 */
export function heartbeatAgent(directory, agentId) {
  const state = readAgentLimiterState(directory);
  const agent = state.agents.find((a) => a.id === agentId);

  if (!agent) {
    return {
      success: false,
      reason: "not_found",
    };
  }

  agent.last_heartbeat = new Date().toISOString();
  writeState(directory, state);

  return {
    success: true,
    agent: agent,
  };
}

/**
 * Unregister an agent (completed or failed)
 */
export function unregisterAgent(directory, agentId, reason = "completed") {
  const state = readAgentLimiterState(directory);
  const index = state.agents.findIndex((a) => a.id === agentId);

  if (index === -1) {
    return {
      success: false,
      reason: "not_found",
    };
  }

  const removed = state.agents.splice(index, 1)[0];
  writeState(directory, state);

  return {
    success: true,
    removed: removed,
    reason: reason,
    current: state.agents.length,
    limit: state.limit,
  };
}

/**
 * Set the agent limit
 */
export function setAgentLimit(directory, limit) {
  if (limit < 1 || limit > 20) {
    return {
      success: false,
      reason: "invalid_limit",
      message: "Limit must be between 1 and 20",
    };
  }

  const state = readAgentLimiterState(directory);
  const oldLimit = state.limit;
  state.limit = limit;
  writeState(directory, state);

  return {
    success: true,
    old_limit: oldLimit,
    new_limit: limit,
    current: state.agents.length,
  };
}

/**
 * Get agent limiter status
 */
export function getAgentLimiterStatus(directory) {
  // Cleanup stale first
  const cleanup = cleanupStaleAgents(directory);
  const state = readAgentLimiterState(directory);

  return {
    active: state.agents.length,
    limit: state.limit || DEFAULT_LIMIT,
    available: Math.max(0, (state.limit || DEFAULT_LIMIT) - state.agents.length),
    stale_removed: cleanup.removed,
    agents: state.agents.map((a) => ({
      id: a.id,
      type: a.type,
      started_at: a.started_at,
      age_seconds: Math.floor((Date.now() - new Date(a.started_at).getTime()) / 1000),
    })),
  };
}

/**
 * Clear all agents (for recovery)
 */
export function clearAllAgents(directory) {
  const state = readAgentLimiterState(directory);
  const count = state.agents.length;
  state.agents = [];
  writeState(directory, state);

  return {
    success: true,
    cleared: count,
  };
}
