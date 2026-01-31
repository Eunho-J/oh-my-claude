#!/usr/bin/env node

/**
 * Swarm MCP Server
 *
 * SQLite-based atomic task claiming for parallel agent execution.
 *
 * Tools:
 * - swarm_init: Initialize task pool
 * - swarm_claim: Atomic claim task
 * - swarm_complete: Mark task done
 * - swarm_fail: Mark task failed
 * - swarm_heartbeat: Update agent liveness
 * - swarm_recover: Reclaim stale tasks
 * - swarm_stats: Get task statistics
 * - swarm_list: List all tasks
 * - swarm_add: Add a single task
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

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

// Default to current working directory
const getDirectory = () => process.cwd();

// Initialize the MCP server
const server = new McpServer({
  name: "swarm",
  version: "1.0.0",
});

// ============================================================================
// Swarm Tools
// ============================================================================

server.tool(
  "swarm_init",
  "Initialize the swarm task pool with tasks",
  {
    tasks: z
      .array(
        z.object({
          id: z.string().optional().describe("Task ID (auto-generated if not provided)"),
          subject: z.string().describe("Task title"),
          description: z.string().optional().describe("Task description"),
        })
      )
      .describe("Array of tasks to add to the pool"),
  },
  async ({ tasks }) => {
    const result = initSwarm(getDirectory(), tasks);
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
  "swarm_claim",
  "Atomically claim the next available task",
  {
    agent_id: z.string().describe("Unique agent identifier"),
    agent_type: z.string().optional().describe("Agent type (e.g., 'junior', 'junior-low')"),
    lease_duration_ms: z
      .number()
      .optional()
      .describe("Lease duration in milliseconds (default: 5 minutes)"),
  },
  async ({ agent_id, agent_type, lease_duration_ms }) => {
    const task = claimTask(getDirectory(), agent_id, agent_type || "unknown", lease_duration_ms);

    if (!task) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, reason: "No pending tasks available" }),
          },
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
              task,
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
  "swarm_complete",
  "Mark a claimed task as completed",
  {
    task_id: z.string().describe("Task ID to complete"),
    agent_id: z.string().describe("Agent that claimed the task"),
    result: z.string().optional().describe("Result or summary of completion"),
  },
  async ({ task_id, agent_id, result }) => {
    const outcome = completeTask(getDirectory(), task_id, agent_id, result);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(outcome, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "swarm_fail",
  "Mark a claimed task as failed",
  {
    task_id: z.string().describe("Task ID that failed"),
    agent_id: z.string().describe("Agent that claimed the task"),
    error: z.string().optional().describe("Error message or reason for failure"),
  },
  async ({ task_id, agent_id, error }) => {
    const outcome = failTask(getDirectory(), task_id, agent_id, error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(outcome, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "swarm_heartbeat",
  "Update agent heartbeat (call periodically to prevent task recovery)",
  {
    agent_id: z.string().describe("Agent identifier"),
    agent_type: z.string().optional().describe("Agent type"),
  },
  async ({ agent_id, agent_type }) => {
    const result = updateHeartbeat(getDirectory(), agent_id, agent_type);
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
  "swarm_recover",
  "Recover stale tasks from unresponsive agents",
  {
    timeout_ms: z
      .number()
      .optional()
      .describe("Consider tasks stale after this many ms (default: 5 minutes)"),
  },
  async ({ timeout_ms }) => {
    const result = recoverStaleTasks(getDirectory(), timeout_ms);
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

server.tool("swarm_stats", "Get swarm task statistics", {}, async () => {
  const stats = getSwarmStats(getDirectory());
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(stats, null, 2),
      },
    ],
  };
});

server.tool(
  "swarm_list",
  "List all tasks in the swarm",
  {
    status: z
      .enum(["pending", "claimed", "done", "failed"])
      .optional()
      .describe("Filter by status"),
  },
  async ({ status }) => {
    const tasks = listTasks(getDirectory(), status);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(tasks, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "swarm_add",
  "Add a single task to the swarm pool",
  {
    subject: z.string().describe("Task title"),
    description: z.string().optional().describe("Task description"),
  },
  async ({ subject, description }) => {
    const result = addTask(getDirectory(), subject, description);
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
  console.error("Swarm MCP Server running on stdio");
}

main().catch(console.error);
