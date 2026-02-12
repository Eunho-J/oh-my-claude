---
name: autopilot
description: Unified autonomous workflow from spec to validation (replaces ultrawork)
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
  - Bash
  - mcp__chronos__autopilot_*
  - mcp__chronos__ralph_*
  - mcp__chronos__boulder_*
  - mcp__chronos__ecomode_*
  - mcp__chronos__workmode_*
  - mcp__chronos__ui_verification_*
  - mcp__chronos__model_router_*
  - mcp__chronos__chronos_status
  - mcp__swarm__*
---

# Autopilot - Unified Autonomous Workflow

Execute a complete workflow from initial request to validated code. This skill replaces and extends the previous ultrawork skill.

## Invocation

```
/autopilot "Add user authentication with JWT"
/autopilot --fast "Fix all TypeScript errors"      # Fast mode (ulw alias)
/autopilot --swarm 5 "Implement all API endpoints" # Parallel execution
/autopilot --ui "Build dashboard page"             # With UI verification
```

## Aliases

- `ulw` - Alias for `/autopilot --fast`
- `ultrawork` - Alias for `/autopilot --fast`

## Modes

| Mode | Phases | Use Case |
|------|--------|----------|
| **Full** (default) | 0-4 | Complex features, new systems |
| **Fast** (`--fast`) | 1-2 only | Bug fixes, simple changes |
| **Swarm** (`--swarm N`) | Parallel execution | Multiple independent tasks |
| **UI** (`--ui`) | + UI verification | Frontend development |

## 5 Phases

| Phase | Name | Agent | Gate Criteria |
|-------|------|-------|---------------|
| 0 | Expansion | Metis (GPT-5.3-Codex) | spec.md created |
| 1 | Planning | Prometheus → Momus | plan approved |
| 2 | Execution | Atlas → Junior | all tasks done |
| 3 | QA | Junior | build + lint + tests (+ ui) pass |
| 4 | Validation | Oracle (GPT-5.3-Codex) | security + code review |

## Options

| Flag | Description |
|------|-------------|
| `--fast` | Skip Metis/Momus (equivalent to `ulw`) |
| `--swarm N` | Use N parallel agents in execution |
| `--ui` | Enable Playwright + Gemini UI verification in QA |
| `--no-qa` | Skip QA phase |
| `--no-validation` | Skip Oracle validation |

## Workmode

When autopilot starts, **workmode** is automatically enabled:
- Sisyphus cannot directly modify code
- All code changes must go through Atlas → Junior
- This ensures consistent orchestration

To stop: `/autopilot off` or `mcp__chronos__workmode_disable()`

## Workflow

### Initialization

```markdown
1. Start autopilot with workmode:
   mcp__chronos__autopilot_start(name, request, options)
   → Automatically enables workmode

2. Start Ralph Loop for continuity:
   mcp__chronos__ralph_start(completion_promise, max_iterations)
```

### Phase 0: Expansion (Metis)

```markdown
Skip if: --fast

1. Delegate to Metis agent (GPT-5.3-Codex xhigh reasoning)
2. Metis creates: .sisyphus/specs/{name}.md
3. Set output: mcp__chronos__autopilot_set_output(0, spec_path)
4. Advance: mcp__chronos__autopilot_advance()
```

### Phase 1: Planning (Prometheus + Momus)

```markdown
1. Delegate to Prometheus agent with spec
2. Prometheus creates plan: .sisyphus/plans/{name}.md
3. Momus reviews (GPT-5.3-Codex xhigh) unless --fast
4. Set output and advance
```

### Phase 2: Execution (Atlas or Swarm)

```markdown
If --swarm N:
  1. Parse plan into tasks
  2. Initialize swarm: mcp__swarm__swarm_init(tasks)
  3. Launch N junior agents in parallel
  4. Monitor: mcp__swarm__swarm_stats()

Else:
  1. Delegate to Atlas
  2. Atlas creates todos and delegates to Junior
  3. Monitor via TaskList

Update progress: mcp__chronos__autopilot_update_progress(2, {done, total})
```

### Phase 3: QA

```markdown
Standard checks:
1. Build: npm run build / tsc
2. Lint: npm run lint
3. Tests: npm test

If --ui enabled:
4. Playwright screenshot capture
5. Gemini analyzes screenshot
6. Compare against expectations

Update: mcp__chronos__autopilot_update_progress(3, {build, lint, tests, ui})

All must pass to advance.
```

### Phase 4: Validation (Oracle)

```markdown
Skip if: --no-validation

1. Delegate to Oracle (Codex primary)
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

### Completion

```markdown
1. All phases pass
2. Disable workmode: mcp__chronos__workmode_disable()
3. Clear autopilot: mcp__chronos__autopilot_clear()
4. Stop Ralph Loop: mcp__chronos__ralph_stop(reason="completed")
5. Report summary to user
```

## State Tracking

State file: `.sisyphus/autopilot.json`

```json
{
  "id": "autopilot-20260131-auth",
  "current_phase": 2,
  "status": "running",
  "options": {
    "fast": false,
    "ui": true,
    "use_swarm": true,
    "swarm_agents": 3,
    "skip_qa": false,
    "skip_validation": false
  },
  "phases": {
    "0": { "status": "completed", "output": ".sisyphus/specs/auth.md" },
    "1": { "status": "completed", "output": ".sisyphus/plans/auth.md" },
    "2": { "status": "in_progress", "progress": { "done": 3, "total": 7 } },
    "3": { "status": "pending" },
    "4": { "status": "pending" }
  }
}
```

## Model Routing

External models are used to reduce Claude API costs:

| Agent | Primary Model | Fallback |
|-------|---------------|----------|
| Metis | GPT-5.3-Codex (xhigh) | Claude Sonnet |
| Momus | GPT-5.3-Codex (xhigh) | Claude Sonnet |
| Oracle | GPT-5.3-Codex | Claude Sonnet |
| Multimodal-looker | Gemini | Claude Sonnet |
| Librarian | GLM-5 | Claude Haiku |

Junior agent tiers based on task complexity:

| Complexity | Criteria | Agent |
|------------|----------|-------|
| Low | 1 file, <20 lines | junior-low (Sonnet) |
| Medium | 2-5 files, 20-100 lines | junior (Sonnet) |
| High | 6+ files, 100+ lines | junior-high (Opus) |

## Examples

### Full Run (Default)

```
/autopilot "Add user profile page with avatar upload"

Phase 0: Metis → spec
Phase 1: Prometheus → plan, Momus → review
Phase 2: Atlas → Junior (parallel tasks)
Phase 3: Build/Lint/Tests pass
Phase 4: Oracle approves
```

### Fast Mode (ulw alias)

```
ulw "Fix login button styling"

Phase 1: Prometheus → quick plan
Phase 2: Junior executes
→ Complete (QA/Validation skipped by default in fast mode)
```

### Parallel Swarm

```
/autopilot --swarm 5 "Implement all REST endpoints"

Phase 2: 5 junior agents work in parallel
→ Each claims tasks atomically from swarm pool
→ Monitor: mcp__swarm__swarm_stats()
```

### UI Verification

```
/autopilot --ui "Build dashboard page"

Phase 3 (QA):
1. Playwright captures screenshot
2. Gemini analyzes UI
3. Compares against expectations
4. Reports issues
```

## Error Handling

If phase fails:

```markdown
1. mcp__chronos__autopilot_fail(error="Description")
2. Status becomes "failed"
3. Workmode remains active
4. Report to user with details
5. User can fix and retry with /autopilot --resume
```

## Related Commands

- `/autopilot on "task"` - Start autopilot (same as `/autopilot "task"`)
- `/autopilot off` - Stop and clear autopilot, disable workmode
- `/autopilot status` - Show current autopilot state
- `/ecomode on` - Enable resource-efficient mode
