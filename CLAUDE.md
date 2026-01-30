# oh-my-claude

Multi-agent orchestration system built on Claude Code's native features (MCP, Hooks, Skills, Agents).

## Architecture

```
Planning Phase:
User → Sisyphus → [Metis(GPT-5.2 xhigh)] → Prometheus → [Momus(Codex-5.2 xhigh)] → Plan File

Execution Phase:
Plan File → /ultrawork → boulder.json → Atlas → [Oracle, Explore, Multimodal-looker, Librarian, Junior]
```

### External Model Integration
- **Metis**: GPT-5.2 with xhigh reasoning effort (pre-planning analysis)
- **Momus**: Codex-5.2 with xhigh reasoning effort (plan review)
- **Oracle**: Codex (architecture consultation)
- **Multimodal-looker**: Gemini (media analysis)
- **Librarian**: GLM-4.7 (documentation search)
- **Debate**: GPT-5.2 + Gemini (multi-model consensus)

### Core Philosophy
1. **Planning과 Execution의 분리** - 컨텍스트 오염 방지
2. **Human Intervention = Failure Signal** - 에이전트가 스스로 완료
3. **Indistinguishable Code** - 시니어 엔지니어와 구분 불가능한 코드

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
| Debate | Multi-model decision making | Opus | GPT-5.2, Gemini | - |
| Explore | Fast Contextual Grep | Haiku | - | - |
| Multimodal-looker | Media Analyzer | Sonnet | Gemini | - |
| Librarian | Documentation/Code Search | Haiku | GLM-4.7 | - |
| Junior | Task Executor | Sonnet | - | - |

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

- `/ultrawork` (or `ulw`) - Auto-parallel execution until completion
- `/git-master` - Git expert (commit, rebase, history)
- `/frontend-ui-ux` - UI/UX development
- `/playwright` - Browser automation

## Keyword Triggers

These keywords automatically activate corresponding features:

- `ultrawork`, `ulw` → Ultrawork skill + Ralph Loop
- `@plan` → Prometheus planner
- `@oracle` → Oracle architecture advisor
- `@debate` → Multi-model debate agent

## MCP Servers

### Configured Servers

| Server | Purpose | Type | Package |
|--------|---------|------|---------|
| context7 | Official docs search | HTTP | - |
| grep-app | GitHub code search | HTTP | - |
| lsp-tools | LSP/AST-Grep tools | stdio | custom |
| chronos | Ralph Loop, Boulder & Debate management | stdio | custom |
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

### Chronos MCP Tools (Ralph Loop, Boulder & Debate)

| Tool | Purpose |
|------|---------|
| `mcp__chronos__ralph_get_state` | Get Ralph Loop state |
| `mcp__chronos__ralph_start` | Start Ralph Loop |
| `mcp__chronos__ralph_increment` | Increment iteration count |
| `mcp__chronos__ralph_stop` | Stop Ralph Loop |
| `mcp__chronos__ralph_check_promise` | Check completion promise |
| `mcp__chronos__boulder_get_state` | Get Boulder (active plan) state |
| `mcp__chronos__boulder_start` | Start new plan work |
| `mcp__chronos__boulder_add_session` | Add session ID |
| `mcp__chronos__boulder_clear` | Clear Boulder state |
| `mcp__chronos__boulder_get_progress` | Get plan progress |
| `mcp__chronos__boulder_list_plans` | List Prometheus plans |
| `mcp__chronos__debate_start` | Start a new multi-model debate |
| `mcp__chronos__debate_get_state` | Get current debate state |
| `mcp__chronos__debate_add_analysis` | Add model analysis to debate |
| `mcp__chronos__debate_add_round` | Add debate round |
| `mcp__chronos__debate_vote` | Record a vote on an item |
| `mcp__chronos__debate_conclude` | Conclude the debate |
| `mcp__chronos__debate_list_history` | List past debates |
| `mcp__chronos__debate_clear` | Clear active debate |
| `mcp__chronos__chronos_status` | Get full status |
| `mcp__chronos__chronos_should_continue` | Check if should continue |

**CLI Usage:** `node mcp-servers/chronos/cli.js <command>`

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

## Directory Structure

```
.sisyphus/
├── plans/           # Prometheus plan files
├── notepads/        # Sisyphus learning records
├── debates/         # Debate state and history
│   ├── active-debate.json
│   └── history/
├── boulder.json     # Current work state
└── ralph-state.json # Ralph Loop state
```

## Workflow Examples

### 1. Basic Task

```
User: Add authentication feature
Claude: [Junior agent implements directly]
```

### 2. Ultrawork Mode

```
User: ulw Add complete authentication system with JWT
Claude:
1. [Optional] Metis analyzes request
2. Prometheus creates plan
3. [Optional] Momus reviews plan
4. Atlas distributes tasks
5. Junior executes in parallel
6. Ralph Loop continues until completion
```

### 3. Architecture Consultation

```
User: @oracle Should we use JWT or session-based auth?
Claude: [Oracle consults GPT-5.2-Codex and responds]
```

### 4. Media Analysis

```
User: @multimodal-looker Analyze this design mockup
Claude:
1. Multimodal-looker receives image path
2. Analyze with Gemini analyzeFile
3. Return structured analysis
```

### 5. Multi-Model Debate

```
User: @debate JWT vs Session-based authentication for our microservices
Claude:
1. Phase 1: Independent analysis (Opus, GPT-5.2, Gemini)
2. Phase 2: Share analyses across models
3. Phase 3: Structured debate rounds (max 20)
4. Phase 4: Consensus or majority vote conclusion
```

**Debate Workflow:**
```
Independent Analysis → Share Results → Debate Rounds → Conclusion
         ↓                                    ↓
   All 3 models analyze              Consensus reached → Done
   without seeing others             No consensus → Majority vote
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

| Skill | Config | chronos | Other MCP |
|-------|--------|---------|-----------|
| ultrawork | whitelist | boulder, ralph, status | ❌ |
| git-master | none (all) | ✅ all | ✅ all |
| frontend-ui-ux | none (all) | ✅ all | ✅ all |
| playwright | none (all) | ✅ all | ✅ all |

## Important Notes

### Agent Hierarchy
- **Sisyphus**: Primary AI - user-facing, routes requests
- **Atlas**: Orchestrator - executes plans via todo list (cannot write code)
- **Prometheus/Metis/Momus**: Planning phase agents (Metis/Momus use external models)
- **Junior/Oracle/etc.**: Execution phase agents

### Reasoning Effort Configuration
- **Metis**: GPT-5.2 with `xhigh` reasoning (pre-planning analysis)
- **Momus**: Codex-5.2 with `xhigh` reasoning (plan review)
- xhigh reasoning provides deeper analysis for critical planning decisions
- Config: `{"reasoning": {"effort": "xhigh"}}`

### Delegation Guard
- Atlas cannot modify code directly (Edit/Write blocked)
- Must delegate via Task tool to Junior or other agents
- Can only modify `.sisyphus/` folder directly

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
