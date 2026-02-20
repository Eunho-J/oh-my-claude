---
name: autopilot
description: Unified autonomous workflow from spec to validated code (Debate-First)
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
  - Bash
  - mcp__chronos__autopilot_*
  - mcp__chronos__ralph_*
  - mcp__chronos__boulder_*
  - mcp__chronos__ecomode_*
  - mcp__chronos__workmode_*
  - mcp__chronos__ui_verification_*
  - mcp__chronos__model_router_*
  - mcp__chronos__debate_*
  - mcp__chronos__chronos_status
---

# Autopilot - Unified Autonomous Workflow (Debate-First)

Execute a complete workflow from initial request to validated code. Uses a debate-first approach where 4 AI models collaboratively plan before execution.

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
| **Agent Teams** (`--swarm N`) | Parallel execution via Agent Teams | Multiple independent tasks |
| **UI** (`--ui`) | + UI verification | Frontend development |

## 5 Phases

| Phase | Name | Agent | Gate Criteria |
|-------|------|-------|---------------|
| 0 | Debate Planning | Debate (4 models) | debate concluded with plan |
| 1 | Structuring | Prometheus → Metis loop | plan approved by Metis |
| 2 | Execution | Atlas → Junior/codex-spark | all tasks done |
| 3 | QA | Junior | build + lint + tests (+ ui) pass |
| 4 | Code Review | Debate (4 models) | debate APPROVED |

## Options

| Flag | Description |
|------|-------------|
| `--fast` | Skip Debate planning, simplified Metis review (equivalent to `ulw`) |
| `--swarm N` | Use N parallel agents in execution |
| `--ui` | Enable Playwright + Gemini UI verification in QA |
| `--no-qa` | Skip QA phase |
| `--no-validation` | Skip code review phase |

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

### Phase 0: Debate Planning

```markdown
Skip if: --fast

1. Start debate for planning:
   mcp__chronos__debate_start({ topic: request, context: codebase_context })

2. Each model provides planning analysis:
   - Opus (native): Analyze request and propose implementation approach
   - gpt-5.3-codex: Relayed via debate-relay teammate (model: "gpt-5.3-codex")
   - Gemini-3-Pro-Preview: Independent analysis via mcp__gemini__chat (model: "gemini-3-pro-preview")
   - GLM-4.7: Independent analysis via mcp__zai-glm__chat (model: "glm-4.7")

3. Record each model's analysis:
   mcp__chronos__debate_add_analysis({ model: "opus", summary: "...", position: "..." })
   mcp__chronos__debate_add_analysis({ model: "gpt52", summary: "...", position: "..." })
   mcp__chronos__debate_add_analysis({ model: "gemini", summary: "...", position: "..." })
   mcp__chronos__debate_add_analysis({ model: "glm", summary: "...", position: "..." })

4. Conduct debate rounds until 3/4 consensus

5. Conclude with implementation plan:
   mcp__chronos__debate_conclude({ decision: "Implementation plan...", method: "consensus" })

6. Set output: mcp__chronos__autopilot_set_output(0, debate_id)
7. Advance: mcp__chronos__autopilot_advance()
```

### Phase 1: Structuring (Prometheus + Metis Loop)

```markdown
1. Delegate to Prometheus with debate conclusions
   - Prometheus creates: .sisyphus/plans/{name}.md
   - Uses debate consensus as planning input

2. Prometheus+Metis review loop:
   a. Prometheus submits plan to Metis for review
   b. Metis reviews plan against debate conclusions (GPT-5.3-Codex xhigh)
   c. If NEEDS REVISION → Prometheus revises plan
   d. Repeat until Metis returns APPROVED

3. Set output and advance
```

### Phase 2: Execution (Atlas or Agent Teams)

```markdown
If --swarm N:
  1. Parse plan into independent tasks via TaskCreate (one per subtask)

  2. Check agent limiter capacity:
     mcp__chronos__agent_limiter_can_spawn()
     → If blocked, reduce N to available slots or fall back to sequential

  3. Create team:
     TeamCreate(team_name="autopilot-{name}-{Date.now()}")

  4. Assign each task to a named worker:
     TaskUpdate(taskId="...", owner="worker-1")
     TaskUpdate(taskId="...", owner="worker-2")
     ...

  5. Spawn N teammates (single message, all Task calls in parallel):
     Task(
       team_name="autopilot-{name}-{timestamp}",
       name="worker-N",
       subagent_type="junior",
       prompt="You are a teammate in team autopilot-{name}-{timestamp}.
       Check TaskList for tasks with owner='worker-N', execute them,
       mark completed via TaskUpdate, then report via SendMessage.
       Team config: ~/.claude/teams/autopilot-{name}-{timestamp}/config.json"
     )

  6. Wait for completion messages from all teammates (auto-delivered)

  7. Cleanup:
     SendMessage(type="shutdown_request", recipient="worker-N", content="done") × N
     TeamDelete()

Else:
  1. Delegate to Atlas
  2. Atlas creates todos and delegates to Junior
     (Junior uses codex-spark for code generation)
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

### Phase 4: Code Review (Debate)

```markdown
Skip if: --no-validation

1. Gather code changes:
   - git diff summary
   - Key changed files content
   - Playwright screenshots (if --ui)

2. Start code review debate:
   mcp__chronos__debate_start({ topic: "Code review for: " + name, context: diff_content })

3. Each model reviews the changes:
   - Opus (native): Review implementation quality, patterns, edge cases
   - gpt-5.3-codex: Security and correctness review (relayed via debate-relay teammate)
   - Gemini-3-Pro-Preview: UI/UX and user experience review via mcp__gemini__chat (model: "gemini-3-pro-preview")
   - GLM-4.7: Documentation and completeness review via mcp__zai-glm__chat (model: "glm-4.7")

4. Record all reviews:
   mcp__chronos__debate_add_analysis({ model: "opus", summary: "...", position: "APPROVED|REJECTED" })
   mcp__chronos__debate_add_analysis({ model: "gpt52", summary: "...", position: "APPROVED|REJECTED" })
   mcp__chronos__debate_add_analysis({ model: "gemini", summary: "...", position: "APPROVED|REJECTED" })
   mcp__chronos__debate_add_analysis({ model: "glm", summary: "...", position: "APPROVED|REJECTED" })

5. Debate until 3/4 consensus on APPROVED or REJECTED

5a. If APPROVED (3/4 agree):
    mcp__chronos__autopilot_update_progress(4, { approved: true })
    → Advance to completion

5b. If REJECTED:
    mcp__chronos__debate_conclude({ decision: "REJECTED: [reasons]" })
    → Prometheus creates fix plan based on rejection reasons
    → Loop back to Phase 2:
       mcp__chronos__autopilot_loop_back({ target_phase: 2, reason: "rejection reasons" })
    → Continue execution with fix plan (unlimited loops)
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
  "id": "autopilot-20260219-auth",
  "current_phase": 2,
  "status": "running",
  "review_loop_count": 0,
  "options": {
    "fast": false,
    "ui": true,
    "use_agent_teams": true,
    "team_size": 3,
    "skip_qa": false,
    "skip_validation": false
  },
  "phases": {
    "0": { "status": "completed", "output": "debate-id" },
    "1": { "status": "completed", "output": ".sisyphus/plans/auth.md" },
    "2": { "status": "in_progress", "progress": { "done": 3, "total": 7 } },
    "3": { "status": "pending" },
    "4": { "status": "pending" }
  }
}
```

## Model Routing

| Agent | Primary Model | Purpose |
|-------|---------------|---------|
| Debate | Opus-4.6 + gpt-5.3-codex + Gemini-3-Pro-Preview + GLM-4.7 | Planning & code review |
| Prometheus | Claude Opus-4.6 | Plan structuring |
| Metis | GPT-5.3-Codex (xhigh) | Plan review |
| Junior* | gpt-5.3-codex-spark | Code generation |
| Atlas | Claude Sonnet-4.6 | Orchestration |

Junior routing: all complexity levels → `junior` (codex-spark primary)

## Examples

### Full Run (Default)

```
/autopilot "Add user profile page with avatar upload"

Phase 0: 4 models debate implementation approach
Phase 1: Prometheus structures plan, Metis reviews until approved
Phase 2: Atlas → Junior/codex-spark (parallel tasks)
Phase 3: Build/Lint/Tests pass
Phase 4: 4 models review code → APPROVED
```

### Fast Mode (ulw alias)

```
ulw "Fix login button styling"

Phase 1: Prometheus → quick plan (Metis review skipped)
Phase 2: Junior/codex-spark executes
→ Complete (QA/Code Review skipped by default in fast mode)
```

### Parallel Agent Teams

```
/autopilot --swarm 5 "Implement all REST endpoints"

Phase 2: Agent Team with 5 members works in parallel
→ Each teammate claims tasks from shared task list
→ Leader in delegation mode (no direct code changes)
→ Monitor via TaskList
```

### UI Verification

```
/autopilot --ui "Build dashboard page"

Phase 3 (QA):
1. Playwright captures screenshot
2. Gemini analyzes UI
3. Compares against expectations
4. Reports issues

Phase 4 (Code Review):
→ Playwright screenshot included in debate context
```

### Code Review Loop

```
Phase 4: Debate REJECTS code (security issue found)
→ review_loop_count: 1
→ Prometheus creates fix plan
→ Loop back to Phase 2
Phase 2: Junior fixes security issue
Phase 3: QA passes again
Phase 4: Debate APPROVES → Complete
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
