---
name: swarm
description: Parallel agent execution with Claude Code's native Agent Teams
invocation: user
allowed_tools:
  - Task
  - TaskCreate
  - TaskUpdate
  - TaskList
  - TaskGet
  - TeamCreate
  - TeamDelete
  - SendMessage
  - Read
  - Glob
  - Grep
  - mcp__chronos__ralph_*
  - mcp__chronos__chronos_status
---

# Swarm - Parallel Agent Execution via Agent Teams

Launch an Agent Team to execute tasks in parallel using Claude Code's native Agent Teams feature.

## Invocation

```
/swarm N:agent "task description"
/swarm 3:junior "Implement all API endpoints from the plan"
/swarm 5:junior "Fix all typos in documentation files"
```

## Format

```
/swarm <count>:<agent_type> "<task_pool_description>"
```

- `count`: Number of team members (1-10)
- `agent_type`: Agent role for team members (junior, oracle, explore, etc.)
- `task_pool_description`: Description of the work to parallelize

## How It Works

Agent Teams is Claude Code's native experimental feature for parallel execution.
Unlike the old SQLite-based swarm, Agent Teams provides:
- Direct teammate-to-teammate communication (mailbox)
- Native task list with built-in atomic claiming
- Delegation mode: leader cannot modify code directly (same concept as workmode)
- Plan approval mode: leader approves before teammates execute

## Workflow

### Phase 1: Task Decomposition

```markdown
1. Parse user request into independent tasks
2. Create task list via TaskCreate for each subtask
3. Brief: describe the parallelization strategy
```

### Phase 2: Agent Team Creation and Execution

```markdown
1. Check agent limiter capacity:
   mcp__chronos__agent_limiter_can_spawn()
   → If blocked (limit reached), notify user and stop

2. Create the team:
   TeamCreate(team_name="swarm-{Date.now()}")

3. Assign each task to a named worker:
   TaskUpdate(taskId="task-1", owner="worker-1")
   TaskUpdate(taskId="task-2", owner="worker-2")
   ...

4. Spawn teammates (one Task call per worker):
   Task(
     team_name="swarm-{timestamp}",
     name="worker-1",
     subagent_type="junior",
     prompt="You are a teammate in team swarm-{timestamp}.
     Check TaskList for tasks assigned to owner='worker-1'.
     Execute each task, mark it completed via TaskUpdate,
     then report to the team leader via SendMessage.
     Team config: ~/.claude/teams/swarm-{timestamp}/config.json"
   )
   (repeat for worker-2, worker-3, …)

5. Wait for completion messages from teammates (auto-delivered).
```

### Phase 3: Monitoring

```markdown
1. Monitor via TaskList - check pending/in_progress/completed counts
2. Teammates communicate directly if they have dependencies
3. Leader reviews and synthesizes results
```

## Example: Implementing API Endpoints

```
User: /swarm 3:junior "Implement all CRUD endpoints for User, Product, Order"

Skill:
1. Create tasks:
   TaskCreate("Implement User CRUD endpoints")   → taskId: "1"
   TaskCreate("Implement Product CRUD endpoints") → taskId: "2"
   TaskCreate("Implement Order CRUD endpoints")   → taskId: "3"

2. Check limiter and create team:
   mcp__chronos__agent_limiter_can_spawn()
   TeamCreate(team_name="swarm-1234567890")

3. Assign and spawn:
   TaskUpdate(taskId="1", owner="worker-1")
   TaskUpdate(taskId="2", owner="worker-2")
   TaskUpdate(taskId="3", owner="worker-3")
   Task(team_name="swarm-1234567890", name="worker-1", subagent_type="junior", prompt="...")
   Task(team_name="swarm-1234567890", name="worker-2", subagent_type="junior", prompt="...")
   Task(team_name="swarm-1234567890", name="worker-3", subagent_type="junior", prompt="...")

4. Receive completion messages, then:
   SendMessage(type="shutdown_request", recipient="worker-1", content="done")
   SendMessage(type="shutdown_request", recipient="worker-2", content="done")
   SendMessage(type="shutdown_request", recipient="worker-3", content="done")
   TeamDelete()
```

## Example: Documentation Fixes

```
User: /swarm 5:junior "Fix all typos in README files"

Skill:
1. Find all README files: Glob(pattern="**/README*.md") → 5 files
2. Create one task per file: TaskCreate × 5 → taskIds: "1".."5"
3. Check limiter and create team:
   mcp__chronos__agent_limiter_can_spawn()
   TeamCreate(team_name="swarm-1234567890")
4. Assign tasks and spawn 5 workers:
   TaskUpdate(taskId="1", owner="worker-1") ... TaskUpdate(taskId="5", owner="worker-5")
   Task(team_name="swarm-1234567890", name="worker-1", subagent_type="junior", prompt="...") × 5
5. Receive completion messages, cleanup:
   SendMessage(shutdown_request) × 5 → TeamDelete()
```

## Agent Teams vs Old Swarm

| Feature | Old Swarm (SQLite) | Agent Teams (Native) |
|---------|-------------------|----------------------|
| Task claiming | mcp__swarm__swarm_claim | Native task list |
| Heartbeat | mcp__swarm__swarm_heartbeat | Automatic |
| Recovery | mcp__swarm__swarm_recover | Automatic |
| Communication | None (isolated) | Direct mailbox |
| Delegation mode | N/A | Built-in (Shift+Tab) |
| Plan approval | N/A | Built-in |

## Completion and Cleanup

When all tasks show `completed` in TaskList:

```markdown
1. Send shutdown requests to all teammates:
   SendMessage(type="shutdown_request", recipient="worker-1", content="All tasks complete, shutting down")
   SendMessage(type="shutdown_request", recipient="worker-2", content="All tasks complete, shutting down")
   ...

2. Delete the team:
   TeamDelete()

3. Report final summary to user
```
