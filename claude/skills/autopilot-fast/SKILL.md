---
name: autopilot-fast
description: Fast autonomous workflow — Plan + Execute only (no Debate planning, no Code Review). Aliases ulw/ultrawork.
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
  - mcp__chronos__workmode_*
  - mcp__chronos__chronos_status
---

# Autopilot Fast - Quick Plan + Execute Workflow

Fast-path autonomous workflow for bug fixes, simple changes, and quick iterations.
Skips Debate planning (Phase 0) and Code Review (Phase 4). Executes Phase 1 and 2 only.

## Invocation

```
/autopilot-fast "Fix all TypeScript errors"
ulw "Fix login button styling"
ultrawork "Add null check to user service"
```

## Aliases

- `ulw` → `/autopilot-fast`
- `ultrawork` → `/autopilot-fast`

## Phases

| Phase | Name | Agent | Gate Criteria |
|-------|------|-------|---------------|
| ~~0~~ | ~~Debate Planning~~ | **SKIPPED** | — |
| 1 | Structuring | Prometheus (no research sub-team, lightweight Metis) | plan written |
| 2 | Execution | Atlas → flat Junior × N | all tasks done |
| ~~3~~ | ~~QA~~ | **SKIPPED** by default | — |
| ~~4~~ | ~~Code Review~~ | **SKIPPED** | — |

## Options

| Flag | Description |
|------|-------------|
| `--swarm N` | Use N parallel Junior workers in execution |
| `--qa` | Enable QA phase (build/lint/tests) after execution |

## Workmode

Workmode is automatically enabled on start. All code changes go through Atlas → Junior.

To stop: `/autopilot off` or `mcp__chronos__workmode_disable()`

## Team Lifecycle Rules

**MANDATORY for all phase teams and inner teams.**

### Teammate Termination — Tool Calling ONLY

**NEVER terminate teammates via process-level commands:**
- `tmux kill-session` — FORBIDDEN
- `tmux kill-pane` / `tmux kill-window` — FORBIDDEN
- `kill`, `kill -9`, `pkill` — FORBIDDEN
- Any Bash command that terminates agent processes — FORBIDDEN

**ALWAYS use tool calling to manage teammate lifecycle:**
```
1. SendMessage(type="shutdown_request", recipient="{agent-name}", content="Done")
2. Wait for shutdown_response (or reasonable timeout)
3. TeamDelete()
```

Process-level killing leaves agents in a dirty state: agent limiter slots are not freed, chronos state is not cleaned up, and orphaned teams persist. Tool calling ensures proper cleanup.

### Phase Transition Cleanup

**Before advancing to the next phase, the CURRENT phase team MUST be fully cleaned up:**

```
Phase N complete → cleanup sequence:
1. Verify inner agent reported completion via SendMessage
2. TeamDelete("ap-pN-{ts}")         ← Delete phase team
3. mcp__chronos__autopilot_*()      ← Update progress / set output
4. mcp__chronos__autopilot_advance() ← ONLY after cleanup is done
```

**NEVER call `autopilot_advance()` before `TeamDelete()`.**
**NEVER skip `TeamDelete()` — orphaned teams cause resource leaks and OOM.**

## Workflow

### Initialization

```markdown
1. Start autopilot (fast=true):
   mcp__chronos__autopilot_start(name, request, { fast: true, skip_qa: true, skip_validation: true })

2. Start Ralph Loop:
   mcp__chronos__ralph_start(completion_promise, max_iterations=50)
```

### Phase 1: Structuring (Prometheus — Direct, Lightweight)

```markdown
1. Create phase team:
   ts = Date.now()
   TeamCreate(team_name="ap-p1-{ts}")

2. Spawn Prometheus in phase team:
   Task(
     team_name="ap-p1-{ts}",
     name="prometheus",
     subagent_type="prometheus",
     prompt="Lead the planning phase for: {request}.

     Fast mode: TRUE — apply all fast-mode rules:
     1. SKIP research sub-team entirely (no TeamCreate, no explore workers)
     2. Write plan directly from the request
     3. Skip Metis review if plan has fewer than 3 tasks
     4. Keep plan concise — only the necessary tasks

     Write plan to .sisyphus/plans/{name}.md
     (CRITICAL: directory starts with a dot — .sisyphus, NOT sisyphus)

     Leader name: sisyphus
     When complete, report via SendMessage to sisyphus with:
     - Plan path (.sisyphus/plans/{name}.md)
     - Task count"
   )

3. Wait for SendMessage from Prometheus (auto-delivered to sisyphus).

4. After receiving plan results (cleanup → advance):
   TeamDelete("ap-p1-{ts}")                    ← CLEANUP FIRST
   mcp__chronos__autopilot_set_output(1, plan_path)
   mcp__chronos__autopilot_advance()            ← ADVANCE AFTER CLEANUP
```

### Phase 2: Execution (Atlas — Flat Junior Workers)

```markdown
1. Create phase team:
   ts = Date.now()
   TeamCreate(team_name="ap-p2-{ts}")

2. Spawn Atlas in phase team:
   Task(
     team_name="ap-p2-{ts}",
     name="atlas",
     subagent_type="atlas",
     prompt="Execute the plan: {plan_path}

     Use FLAT execution (no hierarchical sub-atlas, no domain classification):
     1. Parse plan → task list
     2. If 1 task: run single Junior directly
     3. If 2+ tasks and --swarm N given: TeamCreate('atlas-{ts}') → spawn N Junior workers
     4. If 2+ tasks without swarm: TeamCreate('atlas-{ts}') → spawn Junior per task (up to 5)
     5. Wait for all tasks, TeamDelete

     Do NOT create sub-atlas workers. Flat Junior only.

     Leader name: sisyphus
     When complete, report via SendMessage to sisyphus with:
     - Number of tasks completed
     - Summary of changed files"
   )

3. Wait for SendMessage from Atlas (auto-delivered to sisyphus).

4. After receiving completion (cleanup → advance):
   TeamDelete("ap-p2-{ts}")                    ← CLEANUP FIRST
   mcp__chronos__autopilot_update_progress(2, {done, total})
   mcp__chronos__autopilot_advance()            ← ADVANCE AFTER CLEANUP
```

### Phase 3: QA (Optional — only if --qa flag)

```markdown
Skip unless --qa was explicitly provided.

If --qa:
1. Create phase team:
   ts = Date.now()
   TeamCreate(team_name="ap-p3-{ts}")

2. Spawn QA Orchestrator in phase team:
   Task(
     team_name="ap-p3-{ts}",
     name="qa-orchestrator",
     subagent_type="qa-orchestrator",
     prompt="Run QA for autopilot-fast.

     Leader name: sisyphus
     UI flag: false
     Plan path: {plan_path}
     Changed files: {list_of_changed_files_from_git}

     Steps:
     1. Create QA team (qa-{ts})
     2. Run build-worker first (sequential)
     3. If build fails: report QA_FAILED immediately
     4. If build passes: spawn lint-worker + test-worker in parallel
     5. Collect results
     6. Report QA_PASSED or QA_FAILED to sisyphus via SendMessage"
   )

3. Wait for SendMessage from QA Orchestrator (auto-delivered to sisyphus).

4. After receiving QA results (cleanup → advance):
   TeamDelete("ap-p3-{ts}")                    ← CLEANUP FIRST
   mcp__chronos__autopilot_update_progress(3, {build, lint, tests})
```

### Completion

```markdown
1. All phases complete
2. Disable workmode: mcp__chronos__workmode_disable()
3. Clear autopilot: mcp__chronos__autopilot_clear()
4. Stop Ralph Loop: mcp__chronos__ralph_stop(reason="completed")
5. Report summary to user
```

## Examples

```
ulw "Fix TypeScript errors in src/api/"
→ Prometheus writes quick plan
→ Atlas spawns Junior workers (flat)
→ Done

ultrawork "Add null check to UserService.getById"
→ Prometheus writes 1-task plan (skips Metis)
→ Atlas runs single Junior
→ Done

/autopilot-fast --swarm 3 "Refactor auth module"
→ Prometheus writes plan
→ Atlas spawns 3 parallel Juniors
→ Done

/autopilot-fast --qa "Fix API endpoint bugs"
→ Plan + Execute + QA (build/lint/tests)
→ Done
```

## When to Use

Use `autopilot-fast` / `ulw` for:
- Bug fixes
- Simple refactors
- Config changes
- Quick feature additions (1-3 tasks)
- Any task where debate planning and code review would be overkill

Use `/autopilot` (full) for:
- New systems or complex features
- Multi-domain changes requiring architecture decisions
- Production-critical code requiring multi-model review
