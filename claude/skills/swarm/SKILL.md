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

### Phase 2: Agent Team Creation

```markdown
1. Create an Agent Team with N teammates:
   "Create an agent team with N teammates.
    Each teammate should:
    - Claim one task from the task list
    - Execute it independently
    - Report completion via TaskUpdate(status: completed)
    - Claim the next available task until none remain"

2. Activate delegation mode (leader doesn't write code directly)
   → Equivalent to workmode: all code goes through teammates
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
   TaskCreate("Implement User CRUD endpoints")
   TaskCreate("Implement Product CRUD endpoints")
   TaskCreate("Implement Order CRUD endpoints")

2. Create Agent Team:
   "Create a team with 3 junior teammates.
    Each teammate: claim a pending task, implement it, mark complete, repeat."

3. Monitor via TaskList until all tasks completed
```

## Example: Documentation Fixes

```
User: /swarm 5:junior "Fix all typos in README files"

Skill:
1. Find all README files: Glob(pattern="**/README*.md")
2. Create one task per file
3. Create Agent Team:
   "Create a team with 5 junior teammates.
    Each teammate: claim one README task, fix typos, mark complete."
4. Monitor completion
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

## Completion

Team is done when:
- All tasks in TaskList are `completed`
- Report final summary to user
- Clean up the team: "The task is done, clean up the team"
