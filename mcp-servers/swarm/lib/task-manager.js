/**
 * Swarm Task Manager
 *
 * Handles atomic task claiming and management.
 */

import { getDatabase, closeDatabase, initializeDatabase } from "./database.js";
import { v4 as uuidv4 } from "uuid";

// Default lease duration: 5 minutes
const DEFAULT_LEASE_DURATION_MS = 5 * 60 * 1000;

/**
 * Initialize the swarm with tasks
 */
export function initSwarm(directory, tasks) {
  initializeDatabase(directory);
  const db = getDatabase(directory);

  try {
    // Clear existing tasks
    db.exec("DELETE FROM tasks");
    db.exec("DELETE FROM heartbeats");

    // Insert new tasks
    const insert = db.prepare(`
      INSERT INTO tasks (id, subject, description, status)
      VALUES (?, ?, ?, 'pending')
    `);

    const insertMany = db.transaction((tasks) => {
      for (const task of tasks) {
        const id = task.id || uuidv4();
        insert.run(id, task.subject, task.description || null);
      }
    });

    insertMany(tasks);

    return {
      success: true,
      task_count: tasks.length,
    };
  } finally {
    closeDatabase(db);
  }
}

/**
 * Atomically claim a task
 * Uses SELECT + UPDATE in a transaction with row locking
 */
export function claimTask(directory, agentId, agentType, leaseDurationMs = DEFAULT_LEASE_DURATION_MS) {
  const db = getDatabase(directory);

  try {
    const now = new Date().toISOString();
    const leaseExpires = new Date(Date.now() + leaseDurationMs).toISOString();

    // Atomic claim: find pending task and update in one transaction
    const claim = db.transaction(() => {
      // Find first pending task
      const task = db.prepare(`
        SELECT id, subject, description
        FROM tasks
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1
      `).get();

      if (!task) {
        return null;
      }

      // Update task status
      db.prepare(`
        UPDATE tasks
        SET status = 'claimed',
            owner_agent = ?,
            claimed_at = ?,
            lease_expires_at = ?
        WHERE id = ? AND status = 'pending'
      `).run(agentId, now, leaseExpires, task.id);

      // Update or insert heartbeat
      db.prepare(`
        INSERT OR REPLACE INTO heartbeats (agent_id, agent_type, last_heartbeat, current_task)
        VALUES (?, ?, ?, ?)
      `).run(agentId, agentType, now, task.id);

      return {
        ...task,
        claimed_at: now,
        lease_expires_at: leaseExpires,
      };
    });

    return claim();
  } finally {
    closeDatabase(db);
  }
}

/**
 * Mark a task as completed
 */
export function completeTask(directory, taskId, agentId, result = null) {
  const db = getDatabase(directory);

  try {
    const now = new Date().toISOString();

    const update = db.prepare(`
      UPDATE tasks
      SET status = 'done',
          completed_at = ?,
          result = ?
      WHERE id = ? AND owner_agent = ? AND status = 'claimed'
    `);

    const info = update.run(now, result, taskId, agentId);

    // Clear agent's current task
    db.prepare(`
      UPDATE heartbeats
      SET current_task = NULL, last_heartbeat = ?
      WHERE agent_id = ?
    `).run(now, agentId);

    return {
      success: info.changes > 0,
      task_id: taskId,
      completed_at: now,
    };
  } finally {
    closeDatabase(db);
  }
}

/**
 * Mark a task as failed
 */
export function failTask(directory, taskId, agentId, error = null) {
  const db = getDatabase(directory);

  try {
    const now = new Date().toISOString();

    const update = db.prepare(`
      UPDATE tasks
      SET status = 'failed',
          completed_at = ?,
          error = ?
      WHERE id = ? AND owner_agent = ? AND status = 'claimed'
    `);

    const info = update.run(now, error, taskId, agentId);

    // Clear agent's current task
    db.prepare(`
      UPDATE heartbeats
      SET current_task = NULL, last_heartbeat = ?
      WHERE agent_id = ?
    `).run(now, agentId);

    return {
      success: info.changes > 0,
      task_id: taskId,
      failed_at: now,
    };
  } finally {
    closeDatabase(db);
  }
}

/**
 * Update heartbeat for an agent
 */
export function updateHeartbeat(directory, agentId, agentType = null) {
  const db = getDatabase(directory);

  try {
    const now = new Date().toISOString();

    // Get current task
    const current = db.prepare(`
      SELECT current_task FROM heartbeats WHERE agent_id = ?
    `).get(agentId);

    db.prepare(`
      INSERT OR REPLACE INTO heartbeats (agent_id, agent_type, last_heartbeat, current_task)
      VALUES (?, COALESCE(?, (SELECT agent_type FROM heartbeats WHERE agent_id = ?)), ?, ?)
    `).run(agentId, agentType, agentId, now, current?.current_task || null);

    return {
      success: true,
      agent_id: agentId,
      last_heartbeat: now,
    };
  } finally {
    closeDatabase(db);
  }
}

/**
 * Recover stale tasks (agents that haven't sent heartbeat in timeout period)
 */
export function recoverStaleTasks(directory, timeoutMs = DEFAULT_LEASE_DURATION_MS) {
  const db = getDatabase(directory);

  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - timeoutMs).toISOString();

    // Find and reset stale tasks
    const staleTasks = db.prepare(`
      SELECT t.id, t.subject, t.owner_agent
      FROM tasks t
      LEFT JOIN heartbeats h ON t.owner_agent = h.agent_id
      WHERE t.status = 'claimed'
        AND (h.last_heartbeat IS NULL OR h.last_heartbeat < ? OR t.lease_expires_at < ?)
    `).all(cutoff, now.toISOString());

    if (staleTasks.length === 0) {
      return { recovered: 0, tasks: [] };
    }

    // Reset stale tasks to pending
    const reset = db.prepare(`
      UPDATE tasks
      SET status = 'pending',
          owner_agent = NULL,
          claimed_at = NULL,
          lease_expires_at = NULL
      WHERE id = ?
    `);

    const resetMany = db.transaction((tasks) => {
      for (const task of tasks) {
        reset.run(task.id);
      }
    });

    resetMany(staleTasks);

    return {
      recovered: staleTasks.length,
      tasks: staleTasks.map((t) => ({ id: t.id, subject: t.subject })),
    };
  } finally {
    closeDatabase(db);
  }
}

/**
 * Get swarm statistics
 */
export function getSwarmStats(directory) {
  const db = getDatabase(directory);

  try {
    const stats = db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM tasks
      GROUP BY status
    `).all();

    const agents = db.prepare(`
      SELECT
        agent_id,
        agent_type,
        last_heartbeat,
        current_task
      FROM heartbeats
      ORDER BY last_heartbeat DESC
    `).all();

    const statusCounts = {
      pending: 0,
      claimed: 0,
      done: 0,
      failed: 0,
    };

    for (const row of stats) {
      statusCounts[row.status] = row.count;
    }

    return {
      tasks: statusCounts,
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      agents: agents,
      active_agents: agents.filter((a) => a.current_task !== null).length,
    };
  } finally {
    closeDatabase(db);
  }
}

/**
 * List all tasks
 */
export function listTasks(directory, status = null) {
  const db = getDatabase(directory);

  try {
    let query = "SELECT * FROM tasks";
    let params = [];

    if (status) {
      query += " WHERE status = ?";
      params.push(status);
    }

    query += " ORDER BY created_at ASC";

    return db.prepare(query).all(...params);
  } finally {
    closeDatabase(db);
  }
}

/**
 * Add a single task to the swarm
 */
export function addTask(directory, subject, description = null) {
  const db = getDatabase(directory);

  try {
    const id = uuidv4();

    db.prepare(`
      INSERT INTO tasks (id, subject, description, status)
      VALUES (?, ?, ?, 'pending')
    `).run(id, subject, description);

    return {
      success: true,
      task: { id, subject, description, status: "pending" },
    };
  } finally {
    closeDatabase(db);
  }
}
