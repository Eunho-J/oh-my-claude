# oh-my-claude

Multi-agent orchestration system built on Claude Code's native features (MCP, Hooks, Skills, Agents).

## Agent System

### Available Agents

| Agent | Role | Model | External Model |
|-------|------|-------|----------------|
| Atlas | Master Orchestrator | Opus | - |
| Prometheus | Strategic Planner | Opus | - |
| Oracle | Architecture Advisor | Sonnet | GPT-5.2-Codex |
| Frontend | UI/UX Expert + Visual Verification | Sonnet | Gemini |
| Librarian | Documentation/Code Search | Haiku | GLM-4.7 |
| Junior | Task Executor | Sonnet | - |

### Invocation

```
@atlas      - Activate master orchestrator
@prometheus - Activate planner (or @plan)
@oracle     - Architecture consultation
@frontend   - UI/UX work with visual verification loop
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

## MCP Servers

### Configured Servers

| Server | Purpose | Type | Package |
|--------|---------|------|---------|
| context7 | Official docs search | HTTP | - |
| grep-app | GitHub code search | HTTP | - |
| lsp-tools | LSP/AST-Grep tools | stdio | custom |
| codex | OpenAI Codex | stdio | `codex mcp-server` |
| gemini | Google Gemini (chat, web search, image analysis) | stdio | `mcp-gemini-cli` (Bun) |
| zai-glm | Z.ai GLM-4.7 | HTTP | - |

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
export ZAI_API_KEY="..."        # Z.ai GLM-4.7
```

### Gemini MCP Tools (choplin/mcp-gemini-cli)

| Tool | Purpose |
|------|---------|
| `mcp__gemini__chat` | Gemini conversation |
| `mcp__gemini__googleSearch` | Web search (replaces Exa) |
| `mcp__gemini__analyzeFile` | Image/PDF/text analysis |

**Supported files:** PNG, JPG, GIF, WEBP, SVG, BMP, PDF, text

## Hook System

### Active Hooks

1. **Ralph Loop** (Stop)
   - Auto-continue until completion promise detected
   - State: `.sisyphus/ralph-state.json`

2. **Todo Enforcer** (Stop)
   - Continue execution while tasks remain incomplete

3. **Comment Checker** (PostToolUse - Edit|Write)
   - Detect and warn about unnecessary comments

4. **Delegation Guard** (PreToolUse - Edit|Write)
   - Block Atlas from direct code modifications

## Directory Structure

```
.sisyphus/
├── plans/           # Prometheus plan files
├── notepads/        # Atlas learning records
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
1. Prometheus creates plan
2. Atlas distributes tasks
3. Junior/Frontend execute in parallel
4. Ralph Loop continues until completion
```

### 3. Architecture Consultation

```
User: @oracle Should we use JWT or session-based auth?
Claude: [Oracle consults GPT-5.2-Codex and responds]
```

### 4. Frontend Visual Verification Loop

```
User: @frontend Implement login form
Claude:
1. Implement component
2. Capture screenshot with Playwright
3. Analyze UI with Gemini analyzeFile
4. Issue found → Fix → Recapture → Reanalyze
5. Repeat until verification passes
```

**Visual Verification Workflow:**
```
Implement → Screenshot → Gemini Analysis → Fix → Repeat
                ↓
   Multiple viewports (Desktop/Tablet/Mobile)
   Dark mode / Light mode
```

## Important Notes

### Atlas Rules
- Atlas cannot modify code directly
- Must delegate via Task tool to other agents
- Can only modify `.sisyphus/` folder directly

### Ralph Loop
- Max iterations: 50 (default)
- Manual stop: Set `active` to `false` in `.sisyphus/ralph-state.json`

### External Models
- **Codex**: Session management via `threadId`, OAuth auth
- **Gemini**: 60 req/min limit (free tier), OAuth auth, **requires Bun runtime**
- **GLM-4.7**: 200K context support, API key auth

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
