---
name: swarm
description: Parallel agent execution with SQLite atomic task claiming
invocation: user
allowed_tools:
  - Task
  - TaskCreate
  - TaskUpdate
  - TaskList
  - TaskGet
  - Read
  - Glob
  - Grep
  - mcp__swarm__*
  - mcp__chronos__ralph_*
  - mcp__chronos__chronos_status
---

# Swarm - Parallel Agent Execution

Launch multiple agents to execute tasks in parallel with atomic claiming.

## Invocation

```
/swarm N:agent "task description"
/swarm 3:junior "Implement all API endpoints from the plan"
/swarm 5:junior-low "Fix all typos in documentation files"
```

## Format

```
/swarm <count>:<agent_type> "<task_pool_description>"
```

- `count`: Number of parallel agents (1-10)
- `agent_type`: Agent to use (junior, junior-low, junior-high, etc.)
- `task_pool_description`: Description of the task pool to create

## Workflow

### Phase 1: Task Pool Setup

```markdown
1. Parse user request
2. Break down into individual tasks
3. Initialize swarm with tasks via mcp__swarm__swarm_init
4. Start Ralph Loop for completion tracking
```

### Phase 2: Agent Launch

```markdown
1. Launch N agents in parallel via Task tool
2. Each agent:
   a. Claims task via mcp__swarm__swarm_claim
   b. Executes task
   c. Reports completion via mcp__swarm__swarm_complete
   d. Claims next task (repeat until no tasks)
```

### Phase 3: Monitoring

```markdown
1. Ralph Loop monitors progress
2. Periodic recovery via mcp__swarm__swarm_recover
3. Track stats via mcp__swarm__swarm_stats
```

## Agent Template

Each spawned agent receives:

```markdown
You are a swarm worker agent. Your job is to:

1. Claim a task: mcp__swarm__swarm_claim(agent_id="<unique_id>", agent_type="<type>")
2. Execute the task
3. Report result: mcp__swarm__swarm_complete(task_id="<id>", agent_id="<id>")
4. Repeat until no more tasks

If task fails, use: mcp__swarm__swarm_fail(task_id="<id>", agent_id="<id>", error="<message>")

IMPORTANT: Send heartbeat periodically: mcp__swarm__swarm_heartbeat(agent_id="<id>")
```

## Example: Implementing API Endpoints

```
User: /swarm 3:junior "Implement all CRUD endpoints for User, Product, Order"

Skill:
1. Create tasks:
   - "Implement User CRUD endpoints"
   - "Implement Product CRUD endpoints"
   - "Implement Order CRUD endpoints"

2. Initialize swarm:
   mcp__swarm__swarm_init(tasks=[...])

3. Launch 3 junior agents in parallel:
   Task(subagent_type="junior", run_in_background=true, ...)
   Task(subagent_type="junior", run_in_background=true, ...)
   Task(subagent_type="junior", run_in_background=true, ...)

4. Monitor until all tasks complete
```

## Example: Documentation Fixes

```
User: /swarm 5:junior-low "Fix all typos in README files"

Skill:
1. Find all README files: Glob(pattern="**/README*.md")
2. Create task for each file
3. Initialize swarm with tasks
4. Launch 5 junior-low agents
5. Monitor completion
```

## Task Recovery

If an agent dies or becomes unresponsive:

```markdown
1. Heartbeat timeout: 5 minutes
2. Recovery via mcp__swarm__swarm_recover
3. Stale tasks return to pending status
4. Other agents can claim them
```

## Completion

Swarm is complete when:
- mcp__swarm__swarm_stats shows 0 pending and 0 claimed
- All tasks are done or failed
- Report final summary to user
