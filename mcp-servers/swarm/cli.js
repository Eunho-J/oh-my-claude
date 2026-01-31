#!/usr/bin/env node

/**
 * Swarm CLI
 *
 * Command line interface for swarm operations.
 *
 * Usage:
 *   node cli.js init <tasks.json>
 *   node cli.js claim <agent_id> [agent_type]
 *   node cli.js complete <task_id> <agent_id> [result]
 *   node cli.js fail <task_id> <agent_id> [error]
 *   node cli.js heartbeat <agent_id> [agent_type]
 *   node cli.js recover [timeout_ms]
 *   node cli.js stats
 *   node cli.js list [status]
 *   node cli.js add <subject> [description]
 */

import {
  initSwarm,
  claimTask,
  completeTask,
  failTask,
  updateHeartbeat,
  recoverStaleTasks,
  getSwarmStats,
  listTasks,
  addTask,
} from "./lib/task-manager.js";
import fs from "fs";

const directory = process.cwd();
const args = process.argv.slice(2);
const command = args[0];

function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

function error(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

switch (command) {
  case "init": {
    const tasksFile = args[1];
    if (!tasksFile) {
      error("Usage: swarm init <tasks.json>");
    }
    try {
      const tasks = JSON.parse(fs.readFileSync(tasksFile, "utf-8"));
      const result = initSwarm(directory, tasks);
      output(result);
    } catch (e) {
      error(`Failed to initialize: ${e.message}`);
    }
    break;
  }

  case "claim": {
    const agentId = args[1];
    const agentType = args[2] || "cli";
    if (!agentId) {
      error("Usage: swarm claim <agent_id> [agent_type]");
    }
    const task = claimTask(directory, agentId, agentType);
    output(task ? { success: true, task } : { success: false, reason: "No pending tasks" });
    break;
  }

  case "complete": {
    const taskId = args[1];
    const agentId = args[2];
    const result = args[3];
    if (!taskId || !agentId) {
      error("Usage: swarm complete <task_id> <agent_id> [result]");
    }
    output(completeTask(directory, taskId, agentId, result));
    break;
  }

  case "fail": {
    const taskId = args[1];
    const agentId = args[2];
    const errorMsg = args[3];
    if (!taskId || !agentId) {
      error("Usage: swarm fail <task_id> <agent_id> [error]");
    }
    output(failTask(directory, taskId, agentId, errorMsg));
    break;
  }

  case "heartbeat": {
    const agentId = args[1];
    const agentType = args[2];
    if (!agentId) {
      error("Usage: swarm heartbeat <agent_id> [agent_type]");
    }
    output(updateHeartbeat(directory, agentId, agentType));
    break;
  }

  case "recover": {
    const timeoutMs = args[1] ? parseInt(args[1], 10) : undefined;
    output(recoverStaleTasks(directory, timeoutMs));
    break;
  }

  case "stats": {
    output(getSwarmStats(directory));
    break;
  }

  case "list": {
    const status = args[1];
    if (status && !["pending", "claimed", "done", "failed"].includes(status)) {
      error("Status must be one of: pending, claimed, done, failed");
    }
    output(listTasks(directory, status));
    break;
  }

  case "add": {
    const subject = args[1];
    const description = args[2];
    if (!subject) {
      error("Usage: swarm add <subject> [description]");
    }
    output(addTask(directory, subject, description));
    break;
  }

  default:
    console.log(`Swarm CLI - SQLite-based task pool for parallel agents

Usage:
  swarm init <tasks.json>              Initialize with tasks from JSON file
  swarm claim <agent_id> [type]        Claim next available task
  swarm complete <task_id> <agent_id>  Mark task as completed
  swarm fail <task_id> <agent_id>      Mark task as failed
  swarm heartbeat <agent_id> [type]    Update agent heartbeat
  swarm recover [timeout_ms]           Recover stale tasks
  swarm stats                          Show task statistics
  swarm list [status]                  List tasks (optionally filtered)
  swarm add <subject> [description]    Add a single task

Examples:
  swarm init '[{"subject":"Task 1"},{"subject":"Task 2"}]'
  swarm claim agent-1 junior
  swarm complete abc123 agent-1 "Implemented feature"
`);
}
