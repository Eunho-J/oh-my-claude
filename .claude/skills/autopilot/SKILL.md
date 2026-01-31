---
name: autopilot
description: 5-phase autonomous workflow from spec to validation
invocation: user
allowed_tools:
  - Task
  - TaskCreate
  - TaskUpdate
  - TaskList
  - Read
  - Glob
  - Grep
  - Bash
  - mcp__chronos__autopilot_*
  - mcp__chronos__ralph_*
  - mcp__chronos__boulder_*
  - mcp__chronos__ecomode_*
  - mcp__chronos__chronos_status
  - mcp__swarm__*
---

# Autopilot - 5-Phase Autonomous Workflow

Execute a complete workflow from initial request to validated code.

## Invocation

```
/autopilot "Add user authentication with JWT"
/autopilot --fast "Fix all TypeScript errors"
/autopilot --swarm 5 "Implement all API endpoints"
```

## 5 Phases

| Phase | Name | Agent | Gate Criteria |
|-------|------|-------|---------------|
| 0 | Expansion | Metis | spec.md created |
| 1 | Planning | Prometheus → Momus | plan approved |
| 2 | Execution | Atlas → Junior | all tasks done |
| 3 | QA | Junior | build + lint + tests pass |
| 4 | Validation | Oracle | security + code review |

## Options

| Flag | Description |
|------|-------------|
| `--fast` | Skip Metis/Momus (ecomode) |
| `--swarm N` | Use N parallel agents in execution |
| `--no-qa` | Skip QA phase |
| `--no-validation` | Skip Oracle validation |

## Workflow

### Phase 0: Expansion (Metis)

```markdown
1. Start autopilot: mcp__chronos__autopilot_start(name, request)
2. Delegate to Metis agent
3. Metis creates: .sisyphus/specs/{name}.md
4. Set output: mcp__chronos__autopilot_set_output(0, spec_path)
5. Check gate: mcp__chronos__autopilot_check_gate()
6. Advance: mcp__chronos__autopilot_advance()
```

### Phase 1: Planning (Prometheus + Momus)

```markdown
1. Delegate to Prometheus agent with spec
2. Prometheus creates plan: .sisyphus/plans/{name}.md
3. Momus reviews (unless --fast)
4. Set output: mcp__chronos__autopilot_set_output(1, plan_path)
5. Check gate and advance
```

### Phase 2: Execution (Atlas or Swarm)

```markdown
If --swarm:
  1. Parse plan into tasks
  2. Initialize swarm: mcp__swarm__swarm_init(tasks)
  3. Launch N agents
  4. Monitor: mcp__swarm__swarm_stats()

Else:
  1. Delegate to Atlas
  2. Atlas creates todos and delegates to Junior
  3. Monitor via TaskList

Update progress: mcp__chronos__autopilot_update_progress(2, {done, total})
```

### Phase 3: QA

```markdown
1. Run build: npm run build / tsc
2. Run lint: npm run lint
3. Run tests: npm test

Update: mcp__chronos__autopilot_update_progress(3, {build, lint, tests})

All must pass to advance.
```

### Phase 4: Validation (Oracle)

```markdown
1. Delegate to Oracle for security review
2. Oracle checks:
   - Security vulnerabilities
   - Code quality
   - Architecture compliance

Update: mcp__chronos__autopilot_update_progress(4, {
  blocking_issues: 0,
  warnings: [],
  approved: true
})
```

## State Tracking

State file: `.sisyphus/autopilot.json`

```json
{
  "id": "autopilot-20260131-auth",
  "current_phase": 2,
  "phases": {
    "0": { "status": "completed", "output": ".sisyphus/specs/auth.md" },
    "1": { "status": "completed", "output": ".sisyphus/plans/auth.md" },
    "2": { "status": "in_progress", "progress": { "done": 3, "total": 7 } },
    "3": { "status": "pending" },
    "4": { "status": "pending" }
  }
}
```

## Phase Gates

Each phase has gate criteria that must pass before advancing:

| Phase | Gate Criteria |
|-------|---------------|
| 0 | Spec file exists |
| 1 | Plan file exists |
| 2 | All tasks completed |
| 3 | build=true, lint=true, tests=true |
| 4 | blocking_issues=0 |

## Error Handling

If phase fails:

```markdown
1. mcp__chronos__autopilot_fail(error="Description")
2. Status becomes "failed"
3. Report to user with details
4. User can fix and retry with /autopilot --resume
```

## Example: Full Run

```
User: /autopilot "Add user profile page with avatar upload"

Phase 0 (Expansion):
  Metis analyzes → creates spec with:
  - User requirements
  - Technical requirements
  - Acceptance criteria

Phase 1 (Planning):
  Prometheus plans → creates plan with:
  - Implementation steps
  - File structure
  - Task breakdown
  Momus reviews → approves or suggests changes

Phase 2 (Execution):
  Atlas executes → delegates to Junior:
  - Create ProfilePage component
  - Add avatar upload logic
  - Create API endpoint
  - Add tests

Phase 3 (QA):
  Build → passes
  Lint → passes
  Tests → passes

Phase 4 (Validation):
  Oracle reviews:
  - No security issues
  - Code follows patterns
  - Approved

Result: Feature complete and validated
```

## Completion

Autopilot is complete when:
- All 5 phases pass
- mcp__chronos__autopilot_status shows status="completed"
- Report summary to user
