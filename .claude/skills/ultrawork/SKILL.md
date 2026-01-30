---
name: ultrawork
description: Auto-parallel agent execution, continues until completion
argument-hint: "[task description]"
agent: atlas
allowed-tools:
  - Task
  - Read
  - Grep
  - Glob
  - TaskCreate
  - TaskUpdate
  - TaskList
  - TaskGet
  - mcp__chronos__ralph_*
  - mcp__chronos__boulder_*
  - mcp__chronos__chronos_status
---

# Ultrawork Skill

Auto-parallel agent execution for complex tasks that continues until completion.

## Trigger Keywords

- `ultrawork`
- `ulw`
- `ultrawork mode`

## Workflow

### Phase 1: Planning

1. **Requirements Analysis**
   - Parse user input
   - Check for existing plans (`.sisyphus/plans/`)

2. **Prometheus Activation** (for complex tasks)
   ```
   Task(subagent_type="prometheus", prompt="Create plan: {task_description}")
   ```

3. **Plan Review** (optional)
   ```
   Task(subagent_type="momus", prompt="Review plan: .sisyphus/plans/{plan_file}")
   ```

### Phase 2: Ralph Loop Activation

1. **Start Ralph Loop** (via Chronos MCP)
   ```
   mcp__chronos__ralph_start(completion_promise="unique-task-id", max_iterations=50)
   ```

2. **Start Boulder** (via Chronos MCP)
   ```
   mcp__chronos__boulder_start(plan_path=".sisyphus/plans/{plan_file}", session_id="current-session")
   ```

### Phase 3: Parallel Execution

1. **Task Distribution**
   ```markdown
   Execute independent tasks concurrently:
   - Task A → junior (run_in_background: true)
   - Task B → junior (run_in_background: true)
   - Task C → junior (run_in_background: true)
   ```

2. **Progress Monitoring**
   - Check status with TaskList
   - Retry failed tasks

3. **Result Integration**
   - Confirm all tasks complete
   - Resolve conflicts

### Phase 4: Verification and Completion

1. **Quality Verification**
   ```bash
   # Type check
   npx tsc --noEmit

   # Lint
   npm run lint

   # Tests
   npm test
   ```

2. **Completion Declaration**
   ```markdown
   <promise>unique-task-id</promise>
   Task completed successfully.
   ```

3. **State Cleanup** (via Chronos MCP)
   ```
   mcp__chronos__ralph_stop(reason="task_completed")
   mcp__chronos__boulder_clear()
   ```

## Usage Examples

### Basic Usage
```
ulw Add user authentication with JWT
```

### With Detailed Requirements
```
ultrawork
- Add login/logout functionality
- Implement JWT token management
- Add protected routes
- Create user profile page
```

### Reference Plan File
```
ulw Execute plan in .sisyphus/plans/20250130-auth-implementation.md
```

## Stopping and Resuming

### Manual Stop (via Chronos MCP)
```
mcp__chronos__ralph_stop(reason="manual_stop")
```

### Resume
```
ulw continue
```

## Limitations

- Max iterations: 50 (configurable)
- Concurrent agents: 5 recommended
- Single task timeout: 10 minutes

## Related Agents

- **Atlas**: Orchestration (executes this skill)
- **Prometheus**: Planning
- **Momus**: Plan review
- **Junior**: Code implementation
- **Oracle**: Architecture advice
- **Librarian**: Documentation/code search
- **Explore**: Codebase exploration
