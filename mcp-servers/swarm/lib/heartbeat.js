/**
 * Swarm Heartbeat Module
 *
 * Manages agent liveness detection and stale task recovery.
 */

import { updateHeartbeat, recoverStaleTasks } from "./task-manager.js";

// Heartbeat interval: 30 seconds
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

// Stale timeout: 5 minutes (must match lease duration)
const STALE_TIMEOUT_MS = 5 * 60 * 1000;

// Active heartbeat intervals by agent ID
const activeIntervals = new Map();

/**
 * Start heartbeat for an agent
 */
export function startHeartbeat(directory, agentId, agentType) {
  // Stop any existing heartbeat for this agent
  stopHeartbeat(agentId);

  // Send initial heartbeat
  updateHeartbeat(directory, agentId, agentType);

  // Start periodic heartbeat
  const interval = setInterval(() => {
    try {
      updateHeartbeat(directory, agentId, agentType);
    } catch (err) {
      console.error(`Heartbeat failed for ${agentId}:`, err.message);
    }
  }, HEARTBEAT_INTERVAL_MS);

  activeIntervals.set(agentId, interval);

  return {
    success: true,
    agent_id: agentId,
    interval_ms: HEARTBEAT_INTERVAL_MS,
  };
}

/**
 * Stop heartbeat for an agent
 */
export function stopHeartbeat(agentId) {
  const interval = activeIntervals.get(agentId);
  if (interval) {
    clearInterval(interval);
    activeIntervals.delete(agentId);
    return { success: true, agent_id: agentId };
  }
  return { success: false, reason: "No active heartbeat for agent" };
}

/**
 * Run stale task recovery
 */
export function runRecovery(directory) {
  return recoverStaleTasks(directory, STALE_TIMEOUT_MS);
}

/**
 * Get active heartbeat agents
 */
export function getActiveAgents() {
  return Array.from(activeIntervals.keys());
}
