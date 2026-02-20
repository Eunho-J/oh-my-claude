# oh-my-claude

Multi-agent orchestration system built on Claude Code's native features (MCP, Hooks, Skills, Agents).

## Architecture

```
Autopilot (Debate-First, 3-Level Hierarchy):
Phase 0: Debate Planning → 4 models (Opus-4.6, gpt-5.3-codex, Gemini-3-Pro, GLM-4.7) analyze & plan
Phase 1: Planning Team → Prometheus leads [Explore×2 research sub-team] → Metis reviews in loop
Phase 2: Execution Team → Atlas → [sub-atlas-feature/test/infra × domains → Junior × N]
Phase 3: QA Team → qa-orchestrator → [build → lint + test + ui (parallel)]
Phase 4: Debate Code Review → 4 models approve or loop back to Phase 2

3-Level Hierarchy:
Level 0: Sisyphus (autopilot driver, outside teams)
Level 1: Phase Teams (plan-{ts}, exec-{ts}, qa-{ts})
Level 2: Domain Sub-Teams (feat-{ts}, test-{ts} inside exec team; research sub-team inside plan team)

Manual Workflow:
User → Sisyphus (Sonnet-4.6) → [Atlas → Junior] | [Prometheus → Atlas] | [Debate]
```

### External Model Integration
- **Debate Phase 0/4**: Opus-4.6 + gpt-5.3-codex + Gemini-3-Pro + GLM-4.7 (planning & code review, via Agent Teams)
- **Metis**: GPT-5.3-Codex with xhigh reasoning effort (plan review in Prometheus+Metis loop)
- **Junior**: gpt-5.3-codex-spark via Codex MCP (code generation coordinator)
- **Oracle**: GPT-5.3-Codex (architecture consultation, @oracle direct calls)
- **Multimodal-looker**: Gemini (media analysis)
- **Librarian**: GLM-4.7 (documentation search)

### Core Philosophy
1. **Separation of Planning and Execution** - Prevent context pollution
2. **Human Intervention = Failure Signal** - Agent completes autonomously
3. **Indistinguishable Code** - Code indistinguishable from senior engineer

## Agent System

### Available Agents

| Agent | Role | Model | External Model | Reasoning |
|-------|------|-------|----------------|-----------|
| Sisyphus | Primary AI (User-facing) | **Sonnet** | - | - |
| Atlas | Master Orchestrator | Sonnet | - | - |
| Sub-Atlas | Domain Sub-Orchestrator (Phase 2) | **Sonnet** | - | - |
| QA-Orchestrator | QA Team Leader (Phase 3) | **Sonnet** | - | - |
| Prometheus | Strategic Planner | **Opus-4.6** | - | - |
| Metis | Pre-planning + Plan Reviewer | Haiku | GPT-5.3-Codex | xhigh |
| Oracle | Architecture Advisor | **Haiku** | GPT-5.3-Codex (complex) / direct (simple) | - |
| Debate | Multi-model debate moderator (team leader) | **Sonnet** | - | - |
| Debate-Participant | Opus reasoning for debate | **Opus-4.6** | - | - |
| Debate-Relay | MCP relay (GPT/Gemini/GLM) | **Haiku** | gpt-5.3-codex / Gemini-3-Pro / GLM-4.7 | - |
| Explore | Fast Contextual Grep | Haiku | - | - |
| Explore-High | Deep Codebase Analysis | **Sonnet-4.6** | - | - |
| Multimodal-looker | Media Analyzer | **Haiku** (relay) | Gemini | - |
| Librarian | Documentation/Code Search | **Sonnet** (relay, sub-team leader) | GLM-4.7 | - |
| Junior | Task Executor | Haiku (shell) | **gpt-5.3-codex-spark** | - |

### Invocation

```
@sisyphus   - Primary AI (user-facing)
@atlas      - Master orchestrator (todo execution)
@prometheus - Strategic planner (or @plan)
@metis      - Pre-planning consultant
@oracle     - Architecture consultation
@debate     - Multi-model debate for critical decisions
@explore    - Fast codebase exploration
@multimodal-looker - PDF/image analysis
@librarian  - Documentation/code search
@junior     - Single task execution
```

## Skills

### Available Skills

- `/autopilot` - **Full autonomous workflow** (Debate-First, all 5 phases)
  - `--swarm N` - Parallel execution with N agents
  - `--ui` - UI verification with Playwright + Gemini
  - `--no-qa` - Skip QA phase
  - `--no-validation` - Skip Debate code review
- `/autopilot-fast` - **Fast workflow** (Plan + Execute only, no Debate/Code Review)
  - Aliases: `ulw`, `ultrawork`
  - `--swarm N` - Parallel execution with N agents
  - `--qa` - Enable QA phase (skipped by default)
- `/swarm N` - Parallel execution via Agent Teams
- `/ecomode` - Resource-efficient operation mode
- `/git-master` - Git expert (commit, rebase, history)
- `/frontend-ui-ux` - UI/UX development
- `/playwright` - Browser automation

## Keyword Triggers

These keywords automatically activate corresponding features:

- `ultrawork`, `ulw` → `/autopilot-fast` (Fast mode — Plan + Execute only)
- `@plan` → Prometheus planner
- `@oracle` → Oracle architecture advisor
- `@debate` → Multi-model debate agent

## Workmode System

When autopilot or similar workflows are active, **workmode** is enabled:
- Sisyphus cannot directly modify code
- All code changes must go through Atlas → Junior
- Ensures consistent orchestration

### Workmode Controls
- Enable: `mcp__chronos__workmode_enable(mode, options)`
- Disable: `mcp__chronos__workmode_disable()`
- Status: `mcp__chronos__workmode_status()`
- Check: `mcp__chronos__workmode_check(agent, file_path)`

## MCP Servers

### Configured Servers

| Server | Purpose | Type | Package |
|--------|---------|------|---------|
| context7 | Official docs search | HTTP | - |
| grep-app | GitHub code search | HTTP | - |
| lsp-tools | LSP/AST-Grep tools | stdio | custom |
| chronos | Ralph Loop, Boulder, Debate, Ecomode, Autopilot, Workmode, UI Verification, Model Router | stdio | custom |
| codex | OpenAI Codex | stdio | `codex mcp-server` |
| gemini | Google Gemini (chat, web search, image analysis, sessions) | stdio | Python MCP (uv) |
| zai-glm | Z.ai GLM-4.7 (200K context) | stdio | Python MCP (uv) |

### Authentication

**OAuth Authentication (no API key needed):**
```bash
# Codex (OpenAI)
codex auth login

# Gemini (Google)
npm install -g @google/gemini-cli
gemini auth login
```

**API Key Authentication:**
```bash
export CONTEXT7_API_KEY="..."   # Context7 docs search
export Z_AI_API_KEY="..."       # Z.ai GLM-4.7 MCP server
```

### Gemini MCP Tools (Custom Python Server)

| Tool | Purpose |
|------|---------|
| `mcp__gemini__chat` | Gemini conversation (stateless) |
| `mcp__gemini__googleSearch` | Web search (replaces Exa) |
| `mcp__gemini__analyzeFile` | Image/PDF/text analysis |
| `mcp__gemini__session_create` | Create persistent Gemini session (returns session_id) |
| `mcp__gemini__session_chat` | Multi-turn chat within a session (maintains history) |
| `mcp__gemini__session_list` | List active sessions with metadata |
| `mcp__gemini__session_delete` | Delete session and its history |
| `mcp__gemini__session_clear` | Clear session history (preserve system context) |

**Supported files:** PNG, JPG, GIF, WEBP, SVG, BMP, PDF, text

### Z.ai GLM MCP Tools (Python MCP Server)

| Tool | Purpose |
|------|---------|
| `mcp__zai-glm__chat` | Stateless chat with GLM-4.7 (200K context) |
| `mcp__zai-glm__analyze_code` | Stateless code analysis (review, explain, optimize, security, refactor) |
| `mcp__zai-glm__session_create` | Create persistent chat session (returns session_id) |
| `mcp__zai-glm__session_chat` | Multi-turn chat within a session (maintains history) |
| `mcp__zai-glm__session_list` | List active sessions with metadata |
| `mcp__zai-glm__session_delete` | Delete session and its history |
| `mcp__zai-glm__session_clear` | Clear session history (preserve system prompt) |

**Requirements:** `Z_AI_API_KEY` environment variable, `uv` package manager

### Chronos MCP Tools (All Features)

#### Ralph Loop
| Tool | Purpose |
|------|---------|
| `mcp__chronos__ralph_get_state` | Get Ralph Loop state |
| `mcp__chronos__ralph_start` | Start Ralph Loop |
| `mcp__chronos__ralph_increment` | Increment iteration count |
| `mcp__chronos__ralph_stop` | Stop Ralph Loop |
| `mcp__chronos__ralph_check_promise` | Check completion promise |

#### Boulder (Plan Tracking)
| Tool | Purpose |
|------|---------|
| `mcp__chronos__boulder_get_state` | Get Boulder (active plan) state |
| `mcp__chronos__boulder_start` | Start new plan work |
| `mcp__chronos__boulder_add_session` | Add session ID |
| `mcp__chronos__boulder_clear` | Clear Boulder state |
| `mcp__chronos__boulder_get_progress` | Get plan progress |
| `mcp__chronos__boulder_list_plans` | List Prometheus plans |

#### Debate
| Tool | Purpose |
|------|---------|
| `mcp__chronos__debate_start` | Start a new multi-model debate |
| `mcp__chronos__debate_get_state` | Get current debate state |
| `mcp__chronos__debate_add_analysis` | Add model analysis to debate |
| `mcp__chronos__debate_add_round` | Add debate round |
| `mcp__chronos__debate_vote` | Record a vote on an item |
| `mcp__chronos__debate_conclude` | Conclude the debate |
| `mcp__chronos__debate_list_history` | List past debates |
| `mcp__chronos__debate_clear` | Clear active debate |

#### Ecomode
| Tool | Purpose |
|------|---------|
| `mcp__chronos__ecomode_enable` | Enable ecomode |
| `mcp__chronos__ecomode_disable` | Disable ecomode |
| `mcp__chronos__ecomode_status` | Get ecomode status |
| `mcp__chronos__ecomode_get_tier` | Get recommended tier for task type |
| `mcp__chronos__ecomode_should_skip` | Check if phase should be skipped |

#### Autopilot (5-Phase Debate-First Workflow)
| Tool | Purpose |
|------|---------|
| `mcp__chronos__autopilot_start` | Start 5-phase autopilot workflow |
| `mcp__chronos__autopilot_get_phase` | Get current autopilot phase |
| `mcp__chronos__autopilot_check_gate` | Check phase gate criteria |
| `mcp__chronos__autopilot_advance` | Advance to next phase |
| `mcp__chronos__autopilot_update_progress` | Update phase progress |
| `mcp__chronos__autopilot_set_output` | Set phase output file |
| `mcp__chronos__autopilot_fail` | Mark autopilot as failed |
| `mcp__chronos__autopilot_status` | Get full autopilot status |
| `mcp__chronos__autopilot_clear` | Clear autopilot state |
| `mcp__chronos__autopilot_loop_back` | Loop back to earlier phase (code review failure) |

#### Workmode (NEW)
| Tool | Purpose |
|------|---------|
| `mcp__chronos__workmode_enable` | Enable workmode (blocks main agent code modification) |
| `mcp__chronos__workmode_disable` | Disable workmode |
| `mcp__chronos__workmode_status` | Get workmode status |
| `mcp__chronos__workmode_check` | Check if modification should be blocked |

#### UI Verification (NEW)
| Tool | Purpose |
|------|---------|
| `mcp__chronos__ui_verification_config` | Create UI verification configuration |
| `mcp__chronos__ui_verification_record` | Record UI verification result |
| `mcp__chronos__ui_verification_status` | Get UI verification status |
| `mcp__chronos__ui_verification_command` | Generate Playwright screenshot command |
| `mcp__chronos__ui_verification_prompt` | Generate Gemini analysis prompt |

#### Model Router (NEW)
| Tool | Purpose |
|------|---------|
| `mcp__chronos__model_router_recommend` | Get recommended model for task type |
| `mcp__chronos__model_router_junior_tier` | Get Junior tier based on complexity |
| `mcp__chronos__model_router_agent` | Get model configuration for agent |

#### Agent Limiter (OOM Prevention)
| Tool | Purpose |
|------|---------|
| `mcp__chronos__agent_limiter_status` | Get active agent count and limits |
| `mcp__chronos__agent_limiter_can_spawn` | Check if new agent can spawn |
| `mcp__chronos__agent_limiter_register` | Register agent when spawning |
| `mcp__chronos__agent_limiter_heartbeat` | Update agent heartbeat |
| `mcp__chronos__agent_limiter_unregister` | Unregister agent on completion |
| `mcp__chronos__agent_limiter_set_limit` | Set max concurrent agents (1-20) |
| `mcp__chronos__agent_limiter_cleanup` | Remove stale agents |
| `mcp__chronos__agent_limiter_clear` | Clear all agents (recovery) |

#### Integrated
| Tool | Purpose |
|------|---------|
| `mcp__chronos__chronos_status` | Get full status |
| `mcp__chronos__chronos_should_continue` | Check if should continue |

**CLI Usage:** `node mcp-servers/chronos/cli.js <command>`

### Agent Teams (Native Parallel Execution)

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is enabled in `claude/settings.json`.

Use Claude Code's native Agent Teams for parallel execution:

```
# Request naturally:
"Create an agent team with 3 teammates to implement X, Y, Z in parallel"

# Or use the /swarm skill:
/swarm 3:junior "Implement all API endpoints"
```

**Concept mapping from old Swarm MCP:**

| Old Concept | Agent Teams Equivalent |
|------------|----------------------|
| `mcp__swarm__swarm_init` + task pool | `TaskCreate` for each subtask |
| `mcp__swarm__swarm_claim` (atomic) | Native task list claiming |
| Agent heartbeat/recovery | Automatic (built-in) |
| workmode (Sisyphus blocked) | Delegation mode (leader blocked) |
| Atlas role (orchestrator) | Team leader role |
| Junior workers | Teammates |

## Hook System

### Active Hooks

1. **Ralph Loop** (Stop)
   - Auto-continue until completion promise detected
   - State: `sisyphus/ralph-state.json`

2. **Todo Enforcer** (Stop)
   - Continue execution while tasks remain incomplete

3. **Comment Checker** (PostToolUse - Edit|Write)
   - Detect and warn about unnecessary comments

4. **Debate Lock** (PreToolUse - Edit|Write)
   - Block code modifications while debate is in progress
   - Ensures decisions are made before implementation

5. **Delegation Guard** (PreToolUse - Edit|Write)
   - Block Atlas from direct code modifications
   - **NEW**: Block Sisyphus when workmode is active

6. **Post-Compact** (SessionStart - compact)
   - Restore context after compact
   - Output active workflow state (Ralph, Boulder, Autopilot, Debate, Workmode)
   - Remind agent delegation rules

7. **Autopilot Gate** (PreToolUse - Edit|Write)
   - Display current autopilot phase status
   - Informational only (does not block)

8. **Agent Limiter** (PreToolUse - Task)
   - Prevents OOM by limiting concurrent background agents
   - Default limit: 5 agents
   - Blocks Task tool when limit reached
   - State: `sisyphus/active-agents.json`

## Directory Structure

```
sisyphus/
├── plans/              # Prometheus plan files
├── specs/              # Autopilot spec files
├── notepads/           # Sisyphus learning records
├── debates/            # Debate state and history
│   ├── active-debate.json
│   └── history/
├── autopilot-history/  # Archived autopilot sessions
├── ui-verification/    # UI verification screenshots and results
├── boulder.json        # Current work state
├── ralph-state.json    # Ralph Loop state
├── ecomode.json        # Ecomode settings
├── autopilot.json      # Active autopilot state
├── workmode.json       # Workmode state
└── active-agents.json  # Agent limiter state (OOM prevention)
```

## Workflow Examples

### 1. Basic Task

```
User: Add authentication feature
Claude: [Junior agent implements directly]
```

### 2. Autopilot (Full 5-Phase, Debate-First)

```
User: /autopilot "Add complete authentication system with JWT"
Claude:
Phase 0 (Debate Planning): 4 models debate & agree on implementation approach
Phase 1 (Structuring): Prometheus structures plan, Metis reviews in loop until approved
Phase 2 (Execution): Atlas → Junior/codex-spark implements
Phase 3 (QA): Build, lint, tests pass
Phase 4 (Code Review): 4 models review code → APPROVED or loop back to Phase 2
→ Workmode active throughout
```

### 3. Fast Mode (ulw alias)

```
User: ulw "Fix login button styling"
Claude:
Phase 1: Prometheus creates quick plan (Metis review optional)
Phase 2: Junior/codex-spark executes
→ Skip Debate planning phase
→ Workmode active
```

### 4. Parallel Agent Teams

```
User: /autopilot --swarm 5 "Implement all API endpoints"
Claude:
Phase 2: Agent Team with 5 members works in parallel
→ Each teammate claims tasks from native task list
→ Leader in delegation mode (no direct code changes)
→ Monitor via TaskList
```

### 5. UI Verification

```
User: /autopilot --ui "Build dashboard page"
Claude:
Phase 3 (QA):
1. Build, lint, tests pass
2. Playwright captures screenshot
3. Gemini analyzes UI
4. Compares against expectations
```

### 6. Architecture Consultation

```
User: @oracle Should we use JWT or session-based auth?
Claude: [Oracle consults GPT-5.3-Codex and responds]
```

### 7. Media Analysis

```
User: @multimodal-looker Analyze this design mockup
Claude:
1. Multimodal-looker receives image path
2. Analyze with Gemini analyzeFile
3. Return structured analysis
```

### 8. Multi-Model Debate

```
User: @debate JWT vs Session-based authentication for our microservices
Claude:
1. Phase 1: Independent analysis (Opus-4.6 direct + gpt-5.3-codex/Gemini-3-Pro/GLM-4.7 via relays)
2. Phase 2: Share analyses across all 4 models
3. Phase 3: Structured debate rounds (max 20)
4. Phase 4: 3/4 consensus or majority vote conclusion
```

### 9. Ecomode (Resource Efficiency)

```
User: /ecomode on
Claude:
- Skip Debate planning phase
- Shorter responses

User: /ecomode off
Claude:
- Returns to normal operation
```

## Agent & Skill MCP Access

### Agent MCP Tool Access

Agents using `tools` (whitelist) can only access specified MCP tools.
Agents using `disallowedTools` (blacklist) can access all MCP tools except those listed.

| Agent | Config | chronos | codex | gemini | zai-glm | context7 | grep-app |
|-------|--------|---------|-------|--------|---------|----------|----------|
| Sisyphus | blacklist | ✅ all | ✅ | ✅ | ✅ | ✅ | ✅ |
| Atlas | blacklist | ✅ all | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sub-Atlas | blacklist | agent_limiter | ❌ | ❌ | ❌ | ❌ | ❌ |
| QA-Orchestrator | whitelist | agent_limiter, ui_verification | ❌ | ❌ | ❌ | ❌ | ❌ |
| Prometheus | whitelist | boulder, ralph, status, agent_limiter | ❌ | ❌ | ❌ | ❌ | ❌ |
| Metis | whitelist | ralph, status | ✅ (xhigh) | ❌ | ❌ | ❌ | ❌ |
| Oracle | whitelist | ralph, status | ✅ | ❌ | ❌ | ❌ | ❌ |
| Explore | whitelist | - | ❌ | ❌ | ❌ | ❌ | ❌ |
| Multimodal-looker | whitelist | - | ❌ | ✅ | ❌ | ❌ | ❌ |
| Librarian | whitelist | ralph, status | ❌ | ❌ | ✅ | ✅ | ✅ |
| Junior | blacklist | ✅ all | ✅ | ✅ | ✅ | ✅ | ✅ |
| Debate | whitelist | ❌ (parent handles chronos) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Debate-Participant | whitelist | agent_limiter | ❌ | ❌ | ❌ | ❌ | ❌ |
| Debate-Relay | whitelist | agent_limiter | ✅ (gpt-5.3-codex) | ✅ (Gemini-3-Pro) | **✅ (GLM-4.7)** | ❌ | ❌ |

### Skill MCP Tool Access

| Skill | Config | chronos | Other MCP |
|-------|--------|---------|-----------|
| autopilot | whitelist | autopilot, ralph, boulder, ecomode, workmode, ui_verification, model_router, debate | ❌ |
| swarm | whitelist | ralph, status | ❌ |
| ecomode | whitelist | ecomode, status | ❌ |
| git-master | none (all) | ✅ all | ✅ all |
| frontend-ui-ux | none (all) | ✅ all | ✅ all |
| playwright | none (all) | ✅ all | ✅ all |

## Important Notes

### Agent Hierarchy
- **Sisyphus**: Primary AI - user-facing, routes requests
- **Atlas**: Orchestrator - executes plans via todo list (cannot write code)
- **Prometheus/Metis**: Planning phase agents (Metis uses GPT-5.3-Codex xhigh for plan review)
- **Junior/Oracle/etc.**: Execution phase agents

### Agent Delegation Rules

**Strict delegation paths (no bypassing):**

| Agent | Can Delegate To | Cannot Delegate To |
|-------|-----------------|-------------------|
| Sisyphus | metis, prometheus, atlas, debate, explore | junior, oracle, librarian, multimodal-looker |
| Prometheus | metis (plan review), explore, librarian | junior, atlas, oracle, debate |
| Atlas | junior, oracle, explore, librarian, multimodal-looker | sisyphus, metis, prometheus, debate |
| Junior | (none - Task disabled) | all |
| Others | (none - Task disabled) | all |

**Key rules:**
- Sisyphus CANNOT call Junior directly → must go through Atlas
- Prometheus calls Metis for plan review (Prometheus+Metis loop)
- Execution agents (Junior/Oracle/etc.) do NOT delegate further

### Workmode
- Enabled automatically when autopilot starts
- **Advisory mode**: Sisyphus decides whether to execute directly or delegate
- System trusts Sisyphus judgment for efficiency
- Disabled when autopilot completes or `/autopilot off`

**Judgment-Based Execution:**
- Simple tasks (typos, config changes) → Sisyphus executes directly
- Complex tasks (multi-file, new features) → Delegate to Atlas → Junior
- This prevents OOM from unnecessary agent spawning for trivial changes
- Sisyphus uses its judgment based on task complexity

### External Model Routing Strategy

**Goal**: Reduce Claude API costs by leveraging external models

| Agent | Primary Model | Fallback | Purpose |
|-------|---------------|----------|---------|
| Debate (Phase 0/4) | Opus-4.6 + gpt-5.3-codex + Gemini-3-Pro + GLM-4.7 | - | Planning & code review (Agent Teams) |
| Metis | GPT-5.3-Codex (xhigh) | Claude Sonnet | Plan review in Prometheus+Metis loop |
| Junior | gpt-5.3-codex-spark (primary) | direct Edit (trivial only) | Code generation & execution |
| Oracle | GPT-5.3-Codex | - (Haiku relay only) | Architecture advice |
| Multimodal-looker | Gemini | - (Haiku relay only) | Image/PDF analysis |
| Librarian | GLM-4.7 (+ sub-team) | Claude Sonnet (large context) | Documentation search |

### UI Verification (NEW)
- Available with `--ui` flag in autopilot
- Uses Playwright for screenshots
- Uses Gemini for visual analysis
- Added to QA phase gate criteria

### Agent Limiter (OOM Prevention)
- Prevents OOM by limiting concurrent background agents
- Default limit: 5 agents (configurable 1-20)
- **Multi-team autopilot raises limit to 10** automatically during Phase 2 hierarchical execution
- Automatically cleans up stale agents (no heartbeat for 5+ min)
- Hook blocks Task tool when limit reached
- Peak concurrent agents by phase:
  - Phase 1 (Planning): Prometheus + 2 Explore = **3**
  - Phase 2 (2 domains × 2 Junior): 2 sub-atlas + 4 junior = **6** (limit raised to 10)
  - Phase 2 (3 domains × 2 Junior): 3 sub-atlas + 6 junior = **9** (limit raised to 10)
  - Phase 3 (QA with UI): qa-orchestrator + 4 workers = **5**
- Commands:
  - `mcp__chronos__agent_limiter_status()` - Check current state
  - `mcp__chronos__agent_limiter_set_limit(N)` - Change limit
  - `mcp__chronos__agent_limiter_cleanup()` - Remove stale agents
  - `mcp__chronos__agent_limiter_clear()` - Clear all (recovery)

### Reasoning Effort Configuration
- **Metis**: GPT-5.3-Codex with `xhigh` reasoning (plan review in Prometheus+Metis loop)
- xhigh reasoning provides deeper analysis for plan validation against debate conclusions
- Config: `{"reasoning": {"effort": "xhigh"}}`

### Delegation Guard
- Atlas cannot modify code directly (Edit/Write blocked)
- **NEW**: Sisyphus blocked when workmode is active
- Must delegate via Task tool to Junior or other agents
- Can only modify `sisyphus/` folder directly

### Ecomode
- Enable: `mcp__chronos__ecomode_enable()`
- Disable: `mcp__chronos__ecomode_disable()`
- Status: `mcp__chronos__ecomode_status()`
- Effects:
  - Skips Debate planning phase
  - Requests shorter responses

### Autopilot (5-Phase Debate-First Workflow)
- Start: `mcp__chronos__autopilot_start(name, request, options)`
- Options: `fast`, `ui`, `use_agent_teams`, `team_size`, `skip_qa`, `skip_validation`, `skip_debate`
- Status: `mcp__chronos__autopilot_status()`
- Loop Back: `mcp__chronos__autopilot_loop_back(target_phase, reason)` - for code review failures
- Phases:
  0. **Debate Planning** - 4 models debate & plan (skip if --fast)
  1. **Structuring** - Prometheus creates plan, Metis reviews in loop
  2. **Execution** - Atlas/Junior/codex-spark execute tasks
  3. **QA** - Build, lint, tests (+ UI if --ui) must pass
  4. **Code Review** - Debate reviews code, APPROVED = pass (REJECTED = loop back to Phase 2)
- Gate criteria must pass to advance phases

### Agent Teams (Parallel Execution)
- Enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `claude/settings.json`
- Native Claude Code feature: no external MCP server needed
- Teammates communicate directly via mailbox
- Native task list handles atomic claiming automatically
- Delegation mode: leader cannot modify code (equivalent to workmode)
- Use `/swarm N:agent "task"` skill or natural language: "Create a team with N teammates to..."

### Ralph Loop
- Max iterations: 50 (default)
- Manual stop: `mcp__chronos__ralph_stop(reason="manual_stop")`

### External Models
- **GPT-5.3-Codex**: Session management via `threadId`, OAuth auth, supports reasoning effort (xhigh/high/medium/low)
- **gpt-5.3-codex**: Used in Debate (via debate-relay teammate → mcp__codex__codex with threadId session)
- **gpt-5.3-codex-spark**: Used in Junior agents for code generation (via Codex MCP)
- **Gemini-3-Pro**: Used in Debate (via Gemini MCP `model: "gemini-3-pro"`)
- **Gemini**: 60 req/min limit (free tier), OAuth auth, custom Python MCP server (`mcp-servers/gemini-mcp/`), session support via `--resume`
- **GLM-4.7**: 200K context support, API key auth (`Z_AI_API_KEY`), Python MCP server (`mcp-servers/zai-glm/`), also used in Debate

### uv Installation (for Z.ai GLM MCP)
```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Gemini MCP Installation
```bash
# Install Gemini CLI (OAuth auth)
npm install -g @google/gemini-cli
gemini auth login

# Install custom gemini-mcp Python server (global)
cd ~/.claude/mcp-servers/gemini-mcp && uv sync && cd -

# Register with Claude Code (global)
claude mcp add gemini -s user -- ~/.claude/mcp-servers/gemini-mcp/.venv/bin/python ~/.claude/mcp-servers/gemini-mcp/server.py
```

## Development Guide

### Adding New Agent

1. Create `claude/agents/<name>/AGENT.md`
2. Define settings in YAML frontmatter
3. Document role and workflow

### Adding New Skill

1. Create `claude/skills/<name>/SKILL.md`
2. Define settings in YAML frontmatter
3. Document trigger keywords and usage

### Adding New Hook

1. Create `hooks/<name>.sh`
2. Register in `claude/settings.json`
3. Configure appropriate event and matcher
