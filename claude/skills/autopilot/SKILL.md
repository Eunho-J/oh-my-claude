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
| 1 | Structuring | Planning Team: Prometheus + [Explore×2 research sub-team] → Metis loop | plan approved by Metis |
| 2 | Execution | Atlas → [sub-atlas × domains → Junior × N] OR flat Junior × N | all tasks done |
| 3 | QA | qa-orchestrator → [build → lint + test + ui in parallel] | build + lint + tests (+ ui) pass |
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

Delegate to the debate agent — it handles team creation and all MCP calls internally:

Task(
  subagent_type="debate",
  prompt="Run a planning debate for the following autopilot request.

  Topic: {request}
  Context: {codebase_context}
  Purpose: Phase 0 planning — 4 models analyze the request and reach consensus on implementation approach.

  After concluding, report back with:
  - The debate conclusion / decision
  - Key agreed-upon implementation points
  - Any strong dissenting views to consider"
)

The debate agent will:
1. mcp__chronos__debate_start(...)
2. TeamCreate("debate-{ts}") → spawn opus-participant + gpt-relay + gemini-relay + glm-relay
3. Run independent analysis → debate rounds → consensus/voting
4. mcp__chronos__debate_conclude(...)
5. TeamDelete() and report result

After debate agent returns:
  mcp__chronos__autopilot_set_output(0, debate_id)
  mcp__chronos__autopilot_advance()
```

### Phase 1: Structuring (Planning Team — Prometheus + Research Sub-Team + Metis Loop)

```markdown
1. Delegate to Prometheus (as team leader of plan-{ts}):
   Task(
     subagent_type="prometheus",
     prompt="Lead the planning phase for: {request}.

     Debate conclusions: {debate_conclusions}
     Fast mode: {fast_flag}

     Steps:
     1. If NOT fast: Create research sub-team (plan-{ts}) with explore-impl + explore-test workers
        → Gather codebase context in parallel before writing plan
        → Clean up research team after
     2. If fast: Skip research, plan directly from debate conclusions
     3. Write plan to .sisyphus/plans/{name}.md
     4. Submit to Metis for review (skip if fast and plan has <3 tasks)
     5. Iterate until APPROVED

     Output: .sisyphus/plans/{name}.md (approved)"
   )

2. Prometheus internal workflow:
   a. [Non-fast] Research sub-team:
      - TeamCreate("plan-{ts}")
      - Spawn explore-impl + explore-test (+ optional librarian) in parallel
      - Wait for research reports via SendMessage
      - TeamDelete("plan-{ts}")
   b. Write plan using debate conclusions + research findings
   c. Metis review loop:
      - Prometheus submits plan to Metis (GPT-5.3-Codex xhigh)
      - If NEEDS REVISION → revise plan
      - Repeat until APPROVED (skip if fast + <3 tasks)

3. Set output and advance:
   mcp__chronos__autopilot_set_output(1, plan_path)
   mcp__chronos__autopilot_advance()
```

### Phase 2: Execution (Atlas with Hierarchical Domain Teams)

```markdown
Delegate to Atlas with the approved plan:
Task(
  subagent_type="atlas",
  prompt="Execute Phase 2 of autopilot. Plan: {plan_path}

  Use hierarchical domain execution when the plan has 4+ tasks:
  1. Classify tasks into domains (feature/test/infra)
  2. Check fallback conditions (60%+ in one domain → flat execution)
  3. Check agent limiter (increase limit to 10 if needed)
  4. Create outer exec team (exec-{ts}) with sub-atlas workers
  5. sub-atlas workers create inner domain teams and delegate to Junior
  6. Cross-domain dependency: test tasks blocked by feature tasks

  For --swarm N (override): use N flat Junior workers in single exec team.

  Use flat Junior execution (fallback) when:
  - Fewer than 4 tasks
  - Domain classification produces only 1 domain
  - Agent limiter cannot accommodate hierarchical structure

  Report completion when all tasks done."
)

Atlas internal workflow:
  [Hierarchical — 4+ tasks, multiple domains]:
    1. Parse plan → classify tasks by domain
    2. Check fallback conditions
    3. mcp__chronos__agent_limiter_set_limit(10)  # Raise limit for nested teams
    4. TeamCreate("exec-{ts}")
    5. Spawn sub-atlas-feature + sub-atlas-test + sub-atlas-infra (in parallel)
    6. Each sub-atlas creates inner team → spawns Junior workers
    7. Wait for sub-atlas completion messages
    8. Shutdown sub-atlas workers + TeamDelete("exec-{ts}")

  [Flat — <4 tasks, single domain, or fallback]:
    1. TeamCreate("atlas-{ts}") (if 2+ parallel tasks)
    2. Spawn Junior workers directly
    3. Wait for completion
    4. TeamDelete()

  [--swarm N]:
    1. TeamCreate("autopilot-{name}-{ts}")
    2. Assign tasks to worker-1..worker-N
    3. Spawn N Junior workers
    4. Wait + cleanup

Update progress: mcp__chronos__autopilot_update_progress(2, {done, total})
```

### Phase 3: QA (Parallel QA Team)

```markdown
Spawn QA Orchestrator as team leader:
Task(
  subagent_type="qa-orchestrator",
  prompt="Run QA for autopilot phase 3.

  Leader name: {your_name_or_sisyphus}
  UI flag: {ui_flag}
  Plan path: {plan_path}
  Changed files: {list_of_changed_files_from_git}

  Steps:
  1. Analyze project for UI verification need (if ui_flag=true OR autonomous judgment)
  2. Create QA team (qa-{ts})
  3. Run build-worker first (sequential)
  4. If build fails: report QA_FAILED immediately
  5. If build passes: spawn lint-worker + test-worker in parallel
     (+ ui-worker if UI check conditions met)
  6. Collect results
  7. Report QA_PASSED or QA_FAILED to this leader

  Report via SendMessage when complete."
)

QA Orchestrator internal workflow:
  1. Pre-analysis: read package.json, check UI frameworks + changed file paths
  2. TeamCreate("qa-{ts}")
  3. Spawn build-worker → wait
  4. If BUILD_FAILED: cleanup + report failure
  5. If BUILD_SUCCESS: spawn lint-worker + test-worker (+ ui-worker if needed) in parallel
  6. Collect all results → compile report
  7. TeamDelete()
  8. SendMessage to leader with QA_PASSED or QA_FAILED

Update: mcp__chronos__autopilot_update_progress(3, {build, lint, tests, ui})

All checks must pass (or SKIPPED) to advance to Phase 4.

UI verification is triggered by:
- --ui flag explicitly provided, OR
- qa-orchestrator autonomous judgment: project has UI framework AND changed files include UI paths
```

### Phase 4: Code Review (Debate)

```markdown
Skip if: --no-validation

1. Gather code changes first (before spawning debate agent):
   - git diff summary
   - Key changed files content
   - Playwright screenshots path (if --ui)

2. Delegate to the debate agent — it handles team creation and all MCP calls internally:

Task(
  subagent_type="debate",
  prompt="Run a code review debate for the following changes.

  Topic: Code review for autopilot task: {name}
  Context (git diff + key files):
  {diff_content}

  Purpose: Phase 4 code review — each model reviews implementation quality and votes APPROVED or REJECTED.
  Each model should evaluate: correctness, security, patterns, edge cases, test coverage.

  After concluding, report back with:
  - Final verdict: APPROVED or REJECTED
  - If REJECTED: specific issues that must be fixed (detailed list)
  - Individual model positions"
)

The debate agent will:
1. mcp__chronos__debate_start(...)
2. TeamCreate("debate-{ts}") → spawn opus-participant + gpt-relay + gemini-relay + glm-relay
3. Each model reviews and votes APPROVED/REJECTED
4. Reach 3/4 consensus or majority vote
5. mcp__chronos__debate_conclude(...)
6. TeamDelete() and report verdict

3. After debate agent returns:

   If APPROVED (3/4 agree):
     mcp__chronos__autopilot_update_progress(4, { approved: true })
     → Advance to completion

   If REJECTED:
     → Prometheus creates fix plan based on rejection reasons
     → Loop back to Phase 2:
        mcp__chronos__autopilot_loop_back({ target_phase: 2, reason: "rejection reasons from debate" })
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
| Debate | Opus-4.6 + gpt-5.3-codex + Gemini-3-Pro + GLM-4.7 | Planning & code review |
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
