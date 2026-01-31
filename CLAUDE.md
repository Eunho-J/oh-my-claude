# oh-my-claude

Multi-agent orchestration system built on Claude Code's native features (MCP, Hooks, Skills, Agents).

## Architecture

```
Planning Phase:
User → Sisyphus → [Metis(GPT-5.2 xhigh)] → Prometheus → [Momus(Codex-5.2 xhigh)] → Plan File

Execution Phase:
Plan File → /autopilot → boulder.json → Atlas → [Oracle, Explore, Multimodal-looker, Librarian, Junior]
```

### External Model Integration
- **Metis**: GPT-5.2 with xhigh reasoning effort (pre-planning analysis)
- **Momus**: Codex-5.2 with xhigh reasoning effort (plan review)
- **Oracle**: Codex (architecture consultation)
- **Multimodal-looker**: Gemini (media analysis)
- **Librarian**: GLM-4.7 (documentation search)
- **Debate**: GPT-5.2 + Gemini (multi-model consensus)

### Core Philosophy
1. **Separation of Planning and Execution** - Prevent context pollution
2. **Human Intervention = Failure Signal** - Agent completes autonomously
3. **Indistinguishable Code** - Code indistinguishable from senior engineer

## Agent System

### Available Agents

| Agent | Role | Model | External Model | Reasoning |
|-------|------|-------|----------------|-----------|
| Sisyphus | Primary AI (User-facing) | Opus | - | - |
| Atlas | Master Orchestrator | Sonnet | - | - |
| Prometheus | Strategic Planner | Opus | - | - |
| Metis | Pre-planning Consultant | Haiku | GPT-5.2 | xhigh |
| Momus | Plan Reviewer | Haiku | Codex-5.2 | xhigh |
| Oracle | Architecture Advisor | Sonnet | GPT-5.2-Codex | - |
| Oracle-Low | Quick Architecture Lookup | Haiku | - | - |
| Debate | Multi-model decision making | Opus | GPT-5.2, Gemini | - |
| Explore | Fast Contextual Grep | Haiku | - | - |
| Explore-High | Deep Codebase Analysis | Sonnet | - | - |
| Multimodal-looker | Media Analyzer | Sonnet | Gemini | - |
| Librarian | Documentation/Code Search | Haiku | GLM-4.7 | - |
| Junior | Task Executor | Sonnet | - | - |
| Junior-Low | Simple Task Executor | **Sonnet** | - | - |
| Junior-High | Complex Task Executor | Opus | - | - |

### Invocation

```
@sisyphus   - Primary AI (user-facing)
@atlas      - Master orchestrator (todo execution)
@prometheus - Strategic planner (or @plan)
@metis      - Pre-planning consultant
@momus      - Plan reviewer
@oracle     - Architecture consultation
@debate     - Multi-model debate for critical decisions
@explore    - Fast codebase exploration
@multimodal-looker - PDF/image analysis
@librarian  - Documentation/code search
@junior     - Single task execution
```

## Skills

### Available Skills

- `/autopilot` - **Unified autonomous workflow** (replaces ultrawork)
  - `--fast` / `ulw` - Fast mode (skip Metis/Momus)
  - `--swarm N` - Parallel execution with N agents
  - `--ui` - UI verification with Playwright + Gemini
  - `--no-qa` - Skip QA phase
  - `--no-validation` - Skip Oracle validation
- `/swarm N:agent` - Parallel agent execution with atomic task claiming
- `/ecomode` - Resource-efficient operation mode
- `/git-master` - Git expert (commit, rebase, history)
- `/frontend-ui-ux` - UI/UX development
- `/playwright` - Browser automation

## Keyword Triggers

These keywords automatically activate corresponding features:

- `ultrawork`, `ulw` → `/autopilot --fast` (Fast mode)
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
| swarm | SQLite atomic task claiming for parallel agents | stdio | custom |
| codex | OpenAI Codex | stdio | `codex mcp-server` |
| gemini | Google Gemini (chat, web search, image analysis) | stdio | `mcp-gemini-cli` (Bun) |
| zai-glm | Z.ai GLM-4.7 (200K context) | stdio | Python MCP (uv) |

### Authentication

**OAuth Authentication (no API key needed):**
```bash
# Codex (OpenAI)
codex auth login

# Gemini (Google) - requires Bun
npm install -g @google/gemini-cli
gemini auth login
```

**API Key Authentication:**
```bash
export CONTEXT7_API_KEY="..."   # Context7 docs search
export Z_AI_API_KEY="..."       # Z.ai GLM-4.7 MCP server
```

### Gemini MCP Tools (choplin/mcp-gemini-cli)

| Tool | Purpose |
|------|---------|
| `mcp__gemini__chat` | Gemini conversation |
| `mcp__gemini__googleSearch` | Web search (replaces Exa) |
| `mcp__gemini__analyzeFile` | Image/PDF/text analysis |

**Supported files:** PNG, JPG, GIF, WEBP, SVG, BMP, PDF, text

### Z.ai GLM MCP Tools (Python MCP Server)

| Tool | Purpose |
|------|---------|
| `mcp__zai-glm__chat` | Chat with GLM-4.7 (200K context) |
| `mcp__zai-glm__analyze_code` | Code analysis (review, explain, optimize, security, refactor) |

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

#### Autopilot (5-Phase Workflow)
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

#### Integrated
| Tool | Purpose |
|------|---------|
| `mcp__chronos__chronos_status` | Get full status |
| `mcp__chronos__chronos_should_continue` | Check if should continue |

**CLI Usage:** `node mcp-servers/chronos/cli.js <command>`

### Swarm MCP Tools (Parallel Agent Execution)

| Tool | Purpose |
|------|---------|
| `mcp__swarm__swarm_init` | Initialize task pool |
| `mcp__swarm__swarm_claim` | Atomically claim next task |
| `mcp__swarm__swarm_complete` | Mark task as completed |
| `mcp__swarm__swarm_fail` | Mark task as failed |
| `mcp__swarm__swarm_heartbeat` | Update agent heartbeat |
| `mcp__swarm__swarm_recover` | Recover stale tasks |
| `mcp__swarm__swarm_stats` | Get task statistics |
| `mcp__swarm__swarm_list` | List all tasks |
| `mcp__swarm__swarm_add` | Add a single task |

**CLI Usage:** `node mcp-servers/swarm/cli.js <command>`

## Hook System

### Active Hooks

1. **Ralph Loop** (Stop)
   - Auto-continue until completion promise detected
   - State: `.sisyphus/ralph-state.json`

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

## Directory Structure

```
.sisyphus/
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
├── workmode.json       # Workmode state (NEW)
└── swarm.db            # SQLite database for swarm
```

## Workflow Examples

### 1. Basic Task

```
User: Add authentication feature
Claude: [Junior agent implements directly]
```

### 2. Autopilot (Full 5-Phase)

```
User: /autopilot "Add complete authentication system with JWT"
Claude:
Phase 0 (Expansion): Metis creates spec
Phase 1 (Planning): Prometheus + Momus create plan
Phase 2 (Execution): Atlas distributes to Junior
Phase 3 (QA): Build, lint, tests pass
Phase 4 (Validation): Oracle reviews code
→ Workmode active throughout (Sisyphus cannot modify code directly)
```

### 3. Fast Mode (ulw alias)

```
User: ulw "Fix login button styling"
Claude:
Phase 1: Prometheus creates quick plan
Phase 2: Junior executes
→ Skip Metis/Momus phases
→ Workmode active
```

### 4. Parallel Swarm

```
User: /autopilot --swarm 5 "Implement all API endpoints"
Claude:
Phase 2: 5 junior agents work in parallel
→ Each claims tasks atomically from swarm pool
→ Monitor: mcp__swarm__swarm_stats()
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
Claude: [Oracle consults GPT-5.2-Codex and responds]
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
1. Phase 1: Independent analysis (Opus, GPT-5.2, Gemini)
2. Phase 2: Share analyses across models
3. Phase 3: Structured debate rounds (max 20)
4. Phase 4: Consensus or majority vote conclusion
```

### 9. Ecomode (Resource Efficiency)

```
User: /ecomode on
Claude:
- junior-low used where possible
- oracle → oracle-low (Haiku)
- Skip Metis/Momus phases
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
| Prometheus | whitelist | boulder, ralph, status | ❌ | ❌ | ❌ | ❌ | ❌ |
| Metis | whitelist | ralph, status | ✅ (xhigh) | ❌ | ❌ | ❌ | ❌ |
| Momus | whitelist | ralph, status | ✅ (xhigh) | ❌ | ❌ | ❌ | ❌ |
| Oracle | whitelist | ralph, status | ✅ | ❌ | ❌ | ❌ | ❌ |
| Explore | whitelist | - | ❌ | ❌ | ❌ | ❌ | ❌ |
| Multimodal-looker | whitelist | - | ❌ | ✅ | ❌ | ❌ | ❌ |
| Librarian | whitelist | ralph, status | ❌ | ❌ | ✅ | ✅ | ✅ |
| Junior | blacklist | ✅ all | ✅ | ✅ | ✅ | ✅ | ✅ |
| Debate | whitelist | debate, ralph, status | ✅ | ✅ | ❌ | ❌ | ❌ |

### Skill MCP Tool Access

| Skill | Config | chronos | swarm | Other MCP |
|-------|--------|---------|-------|-----------|
| autopilot | whitelist | autopilot, ralph, boulder, ecomode, workmode, ui_verification, model_router | ✅ | ❌ |
| swarm | whitelist | ralph, status | ✅ | ❌ |
| ecomode | whitelist | ecomode, status | ❌ | ❌ |
| git-master | none (all) | ✅ all | ✅ | ✅ all |
| frontend-ui-ux | none (all) | ✅ all | ✅ | ✅ all |
| playwright | none (all) | ✅ all | ✅ | ✅ all |

## Important Notes

### Agent Hierarchy
- **Sisyphus**: Primary AI - user-facing, routes requests
- **Atlas**: Orchestrator - executes plans via todo list (cannot write code)
- **Prometheus/Metis/Momus**: Planning phase agents (Metis/Momus use external models)
- **Junior/Oracle/etc.**: Execution phase agents

### Agent Delegation Rules

**Strict delegation paths (no bypassing):**

| Agent | Can Delegate To | Cannot Delegate To |
|-------|-----------------|-------------------|
| Sisyphus | metis, prometheus, atlas, debate, explore | junior, oracle, librarian, multimodal-looker, momus |
| Prometheus | momus, explore, librarian | junior, atlas, oracle, metis, debate |
| Atlas | junior, oracle, explore, librarian, multimodal-looker | sisyphus, metis, prometheus, momus, debate |
| Junior | (none - Task disabled) | all |
| Others | (none - Task disabled) | all |

**Key rules:**
- Sisyphus CANNOT call Junior directly → must go through Atlas
- Planning agents (Metis/Prometheus/Momus) do NOT call execution agents
- Execution agents (Junior/Oracle/etc.) do NOT delegate further

### Workmode (NEW)
- Enabled automatically when autopilot starts
- Blocks Sisyphus from direct code modification
- Ensures all changes go through Atlas → Junior
- Disabled when autopilot completes or `/autopilot off`

### External Model Routing Strategy

**Goal**: Reduce Claude API costs by leveraging external models

| Agent | Primary Model | Fallback | Purpose |
|-------|---------------|----------|---------|
| Metis | GPT-5.2 (xhigh) | Claude Sonnet | Pre-planning analysis |
| Momus | Codex-5.2 (xhigh) | Claude Sonnet | Plan review |
| Oracle | Codex | Claude Sonnet | Architecture advice |
| Multimodal-looker | Gemini | Claude Sonnet | Image/PDF analysis |
| Librarian | GLM-4.7 | Claude Haiku | Documentation search |

### Junior Tier Routing

Based on task complexity:

| Tier | Criteria | Agent | Model |
|------|----------|-------|-------|
| Low | 1 file, <20 lines | junior-low | Sonnet |
| Medium | 2-5 files, 20-100 lines | junior | Sonnet |
| High | 6+ files, 100+ lines | junior-high | Opus |

### UI Verification (NEW)
- Available with `--ui` flag in autopilot
- Uses Playwright for screenshots
- Uses Gemini for visual analysis
- Added to QA phase gate criteria

### Reasoning Effort Configuration
- **Metis**: GPT-5.2 with `xhigh` reasoning (pre-planning analysis)
- **Momus**: Codex-5.2 with `xhigh` reasoning (plan review)
- xhigh reasoning provides deeper analysis for critical planning decisions
- Config: `{"reasoning": {"effort": "xhigh"}}`

### Delegation Guard
- Atlas cannot modify code directly (Edit/Write blocked)
- **NEW**: Sisyphus blocked when workmode is active
- Must delegate via Task tool to Junior or other agents
- Can only modify `.sisyphus/` folder directly

### Ecomode
- Enable: `mcp__chronos__ecomode_enable()`
- Disable: `mcp__chronos__ecomode_disable()`
- Status: `mcp__chronos__ecomode_status()`
- Effects:
  - Skips Metis/Momus phases
  - Requests shorter responses

### Autopilot (5-Phase Workflow)
- Start: `mcp__chronos__autopilot_start(name, request, options)`
- Options: `fast`, `ui`, `swarm`, `skip_qa`, `skip_validation`
- Status: `mcp__chronos__autopilot_status()`
- Phases:
  1. **Expansion** - Metis creates spec (skip if --fast)
  2. **Planning** - Prometheus + Momus create plan (Momus skip if --fast)
  3. **Execution** - Atlas/Swarm execute tasks
  4. **QA** - Build, lint, tests (+ UI if --ui) must pass
  5. **Validation** - Oracle security review
- Gate criteria must pass to advance phases

### Swarm (Parallel Agents)
- Database: `.sisyphus/swarm.db` (SQLite)
- Atomic claiming prevents duplicate work
- Heartbeat timeout: 5 minutes
- Recovery: `mcp__swarm__swarm_recover()`

### Ralph Loop
- Max iterations: 50 (default)
- Manual stop: `mcp__chronos__ralph_stop(reason="manual_stop")`

### External Models
- **Codex/GPT-5.2**: Session management via `threadId`, OAuth auth, supports reasoning effort (xhigh/high/medium/low)
- **Gemini**: 60 req/min limit (free tier), OAuth auth, **requires Bun runtime**
- **GLM-4.7**: 200K context support, API key auth (`Z_AI_API_KEY`), Python MCP server (`mcp-servers/zai-glm/`)

### uv Installation (for Z.ai GLM MCP)
```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Bun Installation (for Gemini MCP)
```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"
```

## Development Guide

### Adding New Agent

1. Create `.claude/agents/<name>/AGENT.md`
2. Define settings in YAML frontmatter
3. Document role and workflow

### Adding New Skill

1. Create `.claude/skills/<name>/SKILL.md`
2. Define settings in YAML frontmatter
3. Document trigger keywords and usage

### Adding New Hook

1. Create `hooks/<name>.sh`
2. Register in `.claude/settings.json`
3. Configure appropriate event and matcher
