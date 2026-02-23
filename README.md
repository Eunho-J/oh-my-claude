# oh-my-claude

Multi-agent orchestration system for Claude Code, porting [oh-my-opencode](https://github.com/sisyphus-labs/oh-my-opencode) features to Claude Code's native capabilities (MCP, Hooks, Skills, Agents).

> **⚠️ WARNING**
>
> This repository has **NOT been fully tested or verified**. Use at your own risk. The authors are not responsible for any damages, data loss, or issues that may arise from using this software.

## Features

- **Debate-First Autopilot**: 4-model consensus planning before execution (Opus-4.6 + gpt-5.3-codex + Gemini + GLM-4.7)
- **3-Level Nested Team Hierarchy**: Each autopilot phase uses purpose-built nested teams
  - Phase 1: Planning Team (Prometheus leads Explore × 2 research sub-team → Metis review loop)
  - Phase 2: Execution Team (Atlas → sub-atlas × domains → Junior × N per domain)
  - Phase 3: QA Team (qa-orchestrator → parallel build/lint/test/ui workers)
- **Multi-Agent Orchestration**: 15 specialized agents with clear role separation
  - Planning: Debate (Sonnet leader + Opus participant + 3 Haiku relays), Prometheus (Opus-4.6), Metis (GPT-5.3-Codex xhigh)
  - Execution: Atlas (Sonnet), Sub-Atlas (Sonnet, domain sub-orchestrator), Junior (codex-spark relay), Oracle (Haiku relay), Explore, Multimodal-looker (Haiku relay), Librarian (Sonnet relay + sub-team)
  - QA: QA-Orchestrator (Sonnet, parallel QA team leader)
  - Variants: Explore-high
  - User-facing: Sisyphus (Sonnet)
- **codex-spark Code Generation**: Junior agents relay all work to `gpt-5.3-codex-spark` via Codex MCP (pure relay, no direct file access)
- **External Model Integration**: gpt-5.3-codex + GPT-5.3-Codex (xhigh reasoning), Gemini, GLM-4.7 via MCP
- **Prometheus+Metis Loop**: Prometheus leads research sub-team (Explore × 2), creates plan, Metis (GPT-5.3-Codex xhigh) reviews until approved
- **Domain-Based Execution**: Phase 2 classifies tasks into feature/test/infra domains, each handled by a dedicated sub-atlas + Junior team
- **Parallel QA**: Phase 3 qa-orchestrator runs build → lint + test + ui in parallel (autonomous UI decision based on project type)
- **Debate Code Review**: Phase 4 uses 4-model debate to APPROVE or loop back to execution
- **Ralph Loop**: Auto-continuation until task completion
- **Unified Autopilot**: 5-phase debate-first workflow (`--fast`, `--swarm`, `--ui`, `--no-qa`, `--no-validation`)
- **Workmode**: Blocks direct code modification when autopilot is active
- **UI Verification**: Playwright + Gemini for visual QA (with `--ui` flag or autonomous decision)
- **Smart Model Routing**: Automatic external model selection to reduce Claude API costs
- **Agent Teams**: Native Claude Code parallel execution with optional **split pane mode** (tmux / iTerm2)
- **Agent Limiter**: OOM prevention — auto-raises to 10 during nested team phases, default 5 otherwise
- **Ecomode**: Resource-efficient mode (skip debate planning phase, skip research sub-team)
- **Todo Enforcer**: Prevents stopping with incomplete tasks
- **Planning/Execution Separation**: Clean context management
- **Skill System**: autopilot, autopilot-fast (ulw), swarm, ecomode, git-master, frontend-ui-ux, playwright

# Setup Guide

> **Important:** This project is optimized for **Claude Code**. While other CLI agents (Codex, Gemini) can assist with setup, the agents, skills, and hooks are designed specifically for Claude Code's native features.
>
> **Follow the steps in order.** Each section depends on the previous one being completed.

## Installation Modes

Choose one before starting:

| Mode | Description | Installed to |
|------|-------------|--------------|
| **Global** | Available in ALL Claude Code sessions | `~/.claude/` |
| **Local** | Scoped to this project only | `.claude/` in project root |

After installation, the directory structure is identical in both cases:

```
{.claude or ~/.claude}/
├── agents/           # 15 specialized agents
├── skills/           # autopilot, swarm, ecomode, git-master, ...
├── hooks/            # ralph-loop, todo-enforcer, delegation-guard, ...
├── mcp-servers/      # chronos, lsp-tools, zai-glm, gemini-mcp
└── settings.json     # permissions, hooks, team mode
```

Hook scripts automatically resolve: **local `.claude/hooks/`** takes priority over **global `~/.claude/hooks/`**.

---

This guide separates setup into two categories:
1. **Automated Setup** - Can be performed by Claude Code (or other CLI agents)
2. **Manual Setup** - Requires user interaction (OAuth login, API key configuration)

---

## Part 1: Automated Setup

These steps can be executed automatically by Claude Code.

> **Note:** Execute each step sequentially (1.0 → 1.1 → 1.2 → ...). Do not skip steps.

### 1.0 User Acknowledgment (Required)

> **⚠️ IMPORTANT FOR AGENTS**
>
> Before proceeding with any setup steps, agents **MUST** inform the user of the following warning and obtain explicit confirmation:
>
> ---
>
> **Warning:** This repository (oh-my-claude) has NOT been fully tested or verified. By proceeding with the setup, you acknowledge that:
>
> 1. You understand the risks of using unverified software
> 2. You accept full responsibility for any issues that may arise
> 3. The authors are not liable for any damages or data loss
>
> ---
>
> **Agent Instructions:**
> ```
> Use AskUserQuestion tool with the following:
> - Question: "Do you acknowledge the warning and wish to proceed with the setup?"
> - Options: ["Yes, I understand and accept the risks", "No, cancel setup"]
>
> Only proceed if the user selects "Yes". If "No", stop the setup process.
> ```
>
> Then ask:
> ```
> AskUserQuestion:
>   "Where would you like to install oh-my-claude?"
>   Options:
>     - "Global — available in all Claude Code sessions (~/.claude/)"
>     - "Local — this project only (.claude/ in project root)"
> ```
>
> Remember this choice — it affects steps 1.1, 1.3, 1.4, and 1.5.

### 1.1 Clone Repository and Copy Files

```bash
git clone https://github.com/Eunho-J/oh-my-claude.git /tmp/oh-my-claude
```

**If Global:**

```bash
# ⚠️ Back up existing settings.json if you have custom settings
[ -f ~/.claude/settings.json ] && cp ~/.claude/settings.json ~/.claude/settings.json.backup

# Copy everything to ~/.claude (exclude .venv/node_modules — step 1.4 rebuilds them)
rsync -a --exclude '.venv' --exclude 'node_modules' /tmp/oh-my-claude/claude/ ~/.claude/

# Copy CLAUDE.md (required — tells Claude Code about the agent system in all projects)
cp /tmp/oh-my-claude/CLAUDE.md ~/.claude/CLAUDE.md

# Copy state directory template (plans, debates, notepads directory structure)
cp -r /tmp/oh-my-claude/sisyphus ~/.claude/sisyphus

# Clean up
rm -rf /tmp/oh-my-claude
```

> **Note:** `settings.json` will be overwritten. If you had a backup, merge your custom settings after installation (e.g., custom hooks or permissions).

**If Local:**

```bash
# Copy everything to .claude/ (exclude .venv/node_modules — step 1.4 rebuilds them)
rsync -a --exclude '.venv' --exclude 'node_modules' /tmp/oh-my-claude/claude/ .claude/

# Copy state directory and project files
cp -r /tmp/oh-my-claude/sisyphus .sisyphus
cp /tmp/oh-my-claude/CLAUDE.md .
cp /tmp/oh-my-claude/.gitignore.sample .

# Clean up
rm -rf /tmp/oh-my-claude
```

**What gets installed (both modes):**
- `{dest}/agents/` - 15 specialized agent definitions
- `{dest}/skills/` - autopilot, swarm, ecomode, git-master, frontend-ui-ux, playwright
- `{dest}/hooks/` - ralph-loop, todo-enforcer, debate-lock, delegation-guard, comment-checker, autopilot-gate, agent-limiter, post-compact
- `{dest}/mcp-servers/` - chronos, lsp-tools, zai-glm, gemini-mcp
- `{dest}/settings.json` - MCP permissions, hooks, teammate mode
- `{dest}/settings.local.json` - Project-level MCP auto-enable, bash permissions
- `{dest}/CLAUDE.md` - Agent system instructions (tells Claude about agents, skills, workflows)

**Global only:**
- `~/.claude/sisyphus/` - State directory template (plans, debates, notepads)

**Local only:**
- `.sisyphus/` - Per-project state (plans, debates, autopilot state)
- `CLAUDE.md` - Project instructions (also at `.claude/CLAUDE.md`)
- `.gitignore.sample` - Template for .gitignore

### 1.2 Prerequisites Installation

**Check existing installations first:**
```bash
# Check Node.js (v18+ required)
node --version 2>/dev/null || echo "Node.js: NOT INSTALLED"

# Check Python (3.11+ required for Python MCP servers: zai-glm, gemini-mcp)
python3 --version 2>/dev/null || echo "Python: NOT INSTALLED"

# Check uv (Python package manager — creates .venv and installs deps via uv sync)
uv --version 2>/dev/null || echo "uv: NOT INSTALLED"

# Check jq (required for hook scripts)
jq --version 2>/dev/null || echo "jq: NOT INSTALLED"

# Check Codex CLI
codex --version 2>/dev/null || echo "Codex CLI: NOT INSTALLED"

# Check Gemini CLI
gemini --version 2>/dev/null || echo "Gemini CLI: NOT INSTALLED"

# Check tmux (required for Agent Teams split pane mode)
tmux -V 2>/dev/null || echo "tmux: NOT INSTALLED"

# Check ast-grep (required for lsp-tools AST search/replace)
ast-grep --version 2>/dev/null || echo "ast-grep: NOT INSTALLED"
```

**Install only if not present:**
```bash
# Install uv (required for Python MCP servers: Z.ai GLM + Gemini)
command -v uv >/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh

# Install jq (required for hook scripts JSON processing)
# macOS
command -v jq >/dev/null || brew install jq
# Linux (Debian/Ubuntu)
# command -v jq >/dev/null || sudo apt install jq
# Linux (Fedora/RHEL)
# command -v jq >/dev/null || sudo dnf install jq

# Install Codex CLI (for OpenAI OAuth auth and code generation)
# macOS — prefer brew if available
if command -v brew >/dev/null; then
  command -v codex >/dev/null || brew install codex
else
  command -v codex >/dev/null || npm i -g @openai/codex
fi
# Linux
# command -v codex >/dev/null || npm i -g @openai/codex

# Install Gemini CLI (for Google OAuth auth)
command -v gemini >/dev/null || npm install -g @google/gemini-cli

# Install tmux (required — settings.json sets teammateMode to "tmux")
# macOS
command -v tmux >/dev/null || brew install tmux
# Linux (Debian/Ubuntu)
# command -v tmux >/dev/null || sudo apt install tmux
# Linux (Fedora/RHEL)
# command -v tmux >/dev/null || sudo dnf install tmux

# Install ast-grep (required for lsp-tools AST search/replace)
# macOS
command -v ast-grep >/dev/null || brew install ast-grep
# Or via cargo: cargo install ast-grep
# Or via npm: npm i -g @ast-grep/cli
```

> **⚠️ After installation, OAuth login is required for both Codex and Gemini CLI.**
> See Part 2 (Manual Setup) — sections 2.2 and 2.3.

### 1.3 Register MCP Servers

**If Global:**

```bash
# Local MCP servers (absolute paths to ~/.claude/mcp-servers/)
claude mcp add chronos    -s user -- node ~/.claude/mcp-servers/chronos/index.js
claude mcp add lsp-tools  -s user -- node ~/.claude/mcp-servers/lsp-tools/index.js
claude mcp add zai-glm    -s user -- ~/.claude/mcp-servers/zai-glm/.venv/bin/python ~/.claude/mcp-servers/zai-glm/server.py
claude mcp add gemini     -s user -- ~/.claude/mcp-servers/gemini-mcp/.venv/bin/python ~/.claude/mcp-servers/gemini-mcp/server.py

# External services (global)
claude mcp add codex      -s user -- codex mcp-server
claude mcp add playwright -s user -- npx @playwright/mcp@latest
claude mcp add context7   -s user --transport http https://mcp.context7.com/mcp --header "Authorization: Bearer ${CONTEXT7_API_KEY}"
claude mcp add grep-app   -s user --transport http https://grep.app/api/mcp
```

**If Local:**

```bash
# Local MCP servers (project-relative paths to .claude/mcp-servers/)
claude mcp add chronos    -s project -- node .claude/mcp-servers/chronos/index.js
claude mcp add lsp-tools  -s project -- node .claude/mcp-servers/lsp-tools/index.js
claude mcp add zai-glm    -s project -- .claude/mcp-servers/zai-glm/.venv/bin/python .claude/mcp-servers/zai-glm/server.py
claude mcp add gemini     -s project -- .claude/mcp-servers/gemini-mcp/.venv/bin/python .claude/mcp-servers/gemini-mcp/server.py

# External services (local)
claude mcp add codex      -s project -- codex mcp-server
claude mcp add playwright -s project -- npx @playwright/mcp@latest
claude mcp add context7   -s project --transport http https://mcp.context7.com/mcp --header "Authorization: Bearer ${CONTEXT7_API_KEY}"
claude mcp add grep-app   -s project --transport http https://grep.app/api/mcp
```

> **Note:** This creates `.mcp.json` at the project root with all MCP server configurations. The `settings.local.json` (copied in step 1.1) auto-enables these servers via `enableAllProjectMcpServers: true`.

### 1.4 Install MCP Server Dependencies

> **Note:** `uv sync` automatically creates a `.venv/` virtual environment, resolves dependencies from `pyproject.toml`, and installs them. No manual `python -m venv` or `pip install` is needed.

**If Global:**

```bash
cd ~/.claude/mcp-servers/chronos   && npm install && cd -
cd ~/.claude/mcp-servers/lsp-tools  && npm install && cd -
cd ~/.claude/mcp-servers/zai-glm    && uv sync && cd -
cd ~/.claude/mcp-servers/gemini-mcp && uv sync && cd -
```

**If Local:**

```bash
cd .claude/mcp-servers/chronos   && npm install && cd -
cd .claude/mcp-servers/lsp-tools  && npm install && cd -
cd .claude/mcp-servers/zai-glm    && uv sync && cd -
cd .claude/mcp-servers/gemini-mcp && uv sync && cd -
```

**What each server provides:**
- `chronos` — Ralph Loop, Boulder, Debate, Ecomode, Autopilot, Workmode, Agent Limiter, UI Verification
- `lsp-tools` — Language Server Protocol tools, AST-Grep search/replace
- `zai-glm` — Z.ai GLM-4.7 (200K context) chat and code analysis
- `gemini-mcp` — Google Gemini (chat, search, file analysis, session management)

### 1.5 Make Hook Scripts Executable

**If Global:**

```bash
chmod +x ~/.claude/hooks/*.sh
```

**If Local:**

```bash
chmod +x .claude/hooks/*.sh
```

### 1.5b Launch Claude Inside tmux

The project `settings.json` sets `"teammateMode": "tmux"` — Agent Teams will create split panes for each teammate. **You must launch Claude from within a tmux session** for panes to appear:

```bash
tmux new -s work
claude
```

> tmux is already installed in step 1.2. If you skip tmux, teammates will still run but without visible split panes.

**Alternative: iTerm2**

If you prefer iTerm2 native panes instead of tmux:

1. `npm install -g it2`
2. Enable Python API: **iTerm2 → Settings → General → Magic → Enable Python API**
3. Launch with `tmux -CC` inside iTerm2

### 1.6 Configure .gitignore

**If Global:**

When using global install, oh-my-claude creates `.sisyphus/` state directories in each project where you run Claude Code. Add this to your project's `.gitignore` to prevent committing runtime state:

```bash
# Add to your project's .gitignore
echo '.sisyphus/' >> .gitignore
```

**If Local:**

Copy the sample `.gitignore` to prevent committing environment-specific files:

```bash
cp .gitignore.sample .gitignore
```

**What gets ignored (local):**
- `.env` - API keys and secrets
- `node_modules/` - Dependencies (reinstall with `npm install`)
- `.claude/mcp-servers/zai-glm/.venv/` - Python virtual environment (Z.ai GLM)
- `.claude/mcp-servers/gemini-mcp/.venv/` - Python virtual environment (Gemini)
- `.sisyphus/boulder.json`, `.sisyphus/ralph-state.json` - Runtime state files
- `.sisyphus/ecomode.json`, `.sisyphus/autopilot.json` - Runtime state files
- `.sisyphus/active-agents.json` - Agent limiter state
- `.sisyphus/debates/` - Debate state and history
- `.sisyphus/autopilot-history/` - Archived autopilot sessions

**What is preserved (local):**
- `.sisyphus/plans/` - Prometheus plan files (user content)
- `.sisyphus/specs/` - Autopilot spec files (user content)
- `.sisyphus/notepads/` - Sisyphus learning records (user content)

### 1.7 MCP Permissions (Pre-configured)

The `settings.json` file (`~/.claude/settings.json` for global, `.claude/settings.json` for local) already includes all MCP tool permissions. These are pre-allowed so you don't need to approve each tool manually:

**Chronos (State Management):**
- `mcp__chronos__ralph_*` - Ralph Loop control
- `mcp__chronos__boulder_*` - Boulder state management
- `mcp__chronos__debate_*` - Debate session management (planning + code review)
- `mcp__chronos__ecomode_*` - Ecomode settings
- `mcp__chronos__autopilot_*` - Autopilot 5-phase debate-first workflow
- `mcp__chronos__autopilot_loop_back` - Loop back after code review failure
- `mcp__chronos__chronos_status`, `mcp__chronos__chronos_should_continue`

**External Models:**
- `mcp__codex__codex`, `mcp__codex__codex-reply` - OpenAI GPT-5.3-Codex
- `mcp__gemini__chat`, `mcp__gemini__googleSearch`, `mcp__gemini__analyzeFile` - Google Gemini (stateless)
- `mcp__gemini__session_create`, `mcp__gemini__session_chat`, `mcp__gemini__session_list`, `mcp__gemini__session_delete`, `mcp__gemini__session_clear` - Google Gemini (multi-turn sessions)
- `mcp__zai-glm__chat`, `mcp__zai-glm__analyze_code` - Z.ai GLM-4.7 (single-turn)
- `mcp__zai-glm__session_create`, `mcp__zai-glm__session_chat`, `mcp__zai-glm__session_list`, `mcp__zai-glm__session_delete`, `mcp__zai-glm__session_clear` - Z.ai GLM-4.7 (multi-turn sessions)

**Documentation & Code Search:**
- `mcp__context7__resolve-library-id`, `mcp__context7__query-docs` - Context7
- `mcp__grep-app__searchGitHub` - GitHub code search

**LSP Tools:**
- `mcp__lsp-tools__lsp_*` - Language Server Protocol tools
- `mcp__lsp-tools__ast_grep_*` - AST-Grep search/replace

### 1.8 Verify Installation

**If Global:**

```bash
# Check prerequisites
echo "=== Prerequisites ==="
echo "Node.js: $(node --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Python: $(python3 --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Gemini: $(gemini --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "jq: $(jq --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "uv: $(uv --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "tmux: $(tmux -V 2>/dev/null || echo 'NOT INSTALLED')"
echo "ast-grep: $(ast-grep --version 2>/dev/null || echo 'NOT INSTALLED')"

# Check directory structure
echo "=== Directory Structure ==="
[ -d "$HOME/.claude/agents" ] && echo "Agents: OK" || echo "Agents: MISSING"
[ -d "$HOME/.claude/skills" ] && echo "Skills: OK" || echo "Skills: MISSING"
[ -d "$HOME/.claude/hooks" ] && echo "Hooks: OK" || echo "Hooks: MISSING"
[ -d "$HOME/.claude/mcp-servers" ] && echo "MCP Servers: OK" || echo "MCP Servers: MISSING"
[ -d "$HOME/.claude/sisyphus" ] && echo "Sisyphus template: OK" || echo "Sisyphus template: MISSING"

# Check configuration files
echo "=== Configuration Files ==="
[ -f "$HOME/.claude/settings.json" ] && echo "settings.json: OK" || echo "settings.json: MISSING"
[ -f "$HOME/.claude/CLAUDE.md" ] && echo "CLAUDE.md: OK" || echo "CLAUDE.md: MISSING"

# Check MCP server dependencies
echo "=== MCP Dependencies ==="
[ -d "$HOME/.claude/mcp-servers/chronos/node_modules" ] && echo "chronos deps: OK" || echo "chronos deps: MISSING"
[ -d "$HOME/.claude/mcp-servers/lsp-tools/node_modules" ] && echo "lsp-tools deps: OK" || echo "lsp-tools deps: MISSING"
[ -d "$HOME/.claude/mcp-servers/zai-glm/.venv" ] && echo "zai-glm deps: OK" || echo "zai-glm deps: MISSING"
[ -d "$HOME/.claude/mcp-servers/gemini-mcp/.venv" ] && echo "gemini-mcp deps: OK" || echo "gemini-mcp deps: MISSING"

# Check MCP registrations
echo "=== MCP Servers ==="
claude mcp list
```

**If Local:**

```bash
# Check prerequisites
echo "=== Prerequisites ==="
echo "Node.js: $(node --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Python: $(python3 --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Gemini: $(gemini --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "jq: $(jq --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "uv: $(uv --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "tmux: $(tmux -V 2>/dev/null || echo 'NOT INSTALLED')"
echo "ast-grep: $(ast-grep --version 2>/dev/null || echo 'NOT INSTALLED')"

# Check directory structure
echo "=== Directory Structure ==="
[ -d ".claude/agents" ] && echo "Agents: OK" || echo "Agents: MISSING"
[ -d ".claude/skills" ] && echo "Skills: OK" || echo "Skills: MISSING"
[ -d ".claude/hooks" ] && echo "Hooks: OK" || echo "Hooks: MISSING"
[ -d ".claude/mcp-servers" ] && echo "MCP Servers: OK" || echo "MCP Servers: MISSING"
[ -d ".sisyphus" ] && echo "Sisyphus state: OK" || echo "Sisyphus state: MISSING"

# Check configuration files
echo "=== Configuration Files ==="
[ -f ".claude/settings.json" ] && echo "settings.json: OK" || echo "settings.json: MISSING"
[ -f ".claude/settings.local.json" ] && echo "settings.local.json: OK" || echo "settings.local.json: MISSING"
[ -f "CLAUDE.md" ] && echo "CLAUDE.md: OK" || echo "CLAUDE.md: MISSING"
[ -f ".mcp.json" ] && echo ".mcp.json: OK" || echo ".mcp.json: MISSING (run Step 1.3)"

# Check MCP server dependencies
echo "=== MCP Dependencies ==="
[ -d ".claude/mcp-servers/chronos/node_modules" ] && echo "chronos deps: OK" || echo "chronos deps: MISSING"
[ -d ".claude/mcp-servers/lsp-tools/node_modules" ] && echo "lsp-tools deps: OK" || echo "lsp-tools deps: MISSING"
[ -d ".claude/mcp-servers/zai-glm/.venv" ] && echo "zai-glm deps: OK" || echo "zai-glm deps: MISSING"
[ -d ".claude/mcp-servers/gemini-mcp/.venv" ] && echo "gemini-mcp deps: OK" || echo "gemini-mcp deps: MISSING"

# Check MCP registrations
echo "=== MCP Servers ==="
claude mcp list
```

---

## Part 2: Manual Setup (User Required)

> **Prerequisite:** Complete Part 1 (Automated Setup) before proceeding.

These steps require user interaction and cannot be automated.

### 2.1 API Keys Configuration

Create a `.env` file or export environment variables:

```bash
# Required for documentation search (Context7)
export CONTEXT7_API_KEY="your-context7-api-key"

# Required for GLM-4.7 (Z.ai) - Librarian agent
export Z_AI_API_KEY="your-zai-api-key"
```

**Where to get API keys:**
- **CONTEXT7_API_KEY**: https://context7.com/ (Sign up for API access)
- **Z_AI_API_KEY**: https://z.ai/ (Subscribe to Coding Plan - $3/month)

### 2.2 Codex CLI Authentication (OAuth)

Codex uses OAuth authentication. Run the following command and complete the browser-based login:

```bash
# This will open a browser for Google/GitHub OAuth
codex auth login
```

**Steps:**
1. Run `codex auth login`
2. Browser opens automatically
3. Sign in with your OpenAI account
4. Grant permissions
5. Return to terminal - authentication is saved automatically

**Verify authentication:**
```bash
codex auth status
```

### 2.3 Gemini CLI Authentication (OAuth)

Gemini CLI uses Google OAuth. Run the following command:

```bash
# This will open a browser for Google OAuth
gemini auth login
```

**Steps:**
1. Run `gemini auth login`
2. Browser opens automatically
3. Sign in with your Google account
4. Grant permissions to Gemini CLI
5. Return to terminal - authentication is saved to `~/.gemini/`

**Verify authentication:**
```bash
gemini auth status
```

**Rate Limits (Free Tier):**
- 60 requests per minute
- 1000 requests per day

### 2.4 Claude Code Configuration

If you haven't already, authenticate Claude Code:

```bash
# Login to Claude Code
claude login
```

### 2.5 Verify MCP Connections

After completing authentication, verify all MCP servers are connected:

```bash
# List all configured MCP servers
claude mcp list

# Test individual MCP tools (optional)
# These commands will only work after proper authentication
```

---

## Troubleshooting

### Gemini Authentication Issues

```bash
# Clear Gemini credentials
rm -rf ~/.gemini/
gemini auth login
```

### MCP Server Connection Failed

```bash
# Check if MCP server is accessible
curl -I https://mcp.context7.com/mcp

# Verify API keys are set
echo $CONTEXT7_API_KEY
echo $Z_AI_API_KEY
```

### Hook Scripts Not Executing

```bash
# Ensure scripts are executable (global)
chmod +x ~/.claude/hooks/*.sh

# Ensure scripts are executable (local)
chmod +x .claude/hooks/*.sh

# Test hook script directly (global)
~/.claude/hooks/ralph-loop.sh < /dev/null

# Test hook script directly (local)
.claude/hooks/ralph-loop.sh < /dev/null
```

### Agent Teams Teammates Not Appearing in Split Panes

```bash
# Verify tmux is installed and on PATH
which tmux
tmux -V

# Verify settings.json has teammateMode set to "tmux" (global)
jq '.teammateMode' ~/.claude/settings.json

# Verify settings.json has teammateMode set to "tmux" (local)
jq '.teammateMode' .claude/settings.json

# Set it if missing (global)
tmp=$(mktemp)
jq '.teammateMode = "tmux"' ~/.claude/settings.json > "$tmp" && mv "$tmp" ~/.claude/settings.json

# Set it if missing (local)
tmp=$(mktemp)
jq '.teammateMode = "tmux"' .claude/settings.json > "$tmp" && mv "$tmp" .claude/settings.json
```

For iTerm2: confirm `it2` is installed (`which it2`) and Python API is enabled
(**iTerm2 → Settings → General → Magic → Enable Python API**).

If teammates appear but split panes don't open, start Claude from inside a tmux session:
```bash
tmux new -s work
claude
```

### Orphaned tmux Sessions After Agent Teams

```bash
# List all tmux sessions
tmux ls

# Kill sessions left by Agent Teams
tmux kill-session -t <session-name>
```

### Stale Agent Teams After Failed Runs

If you see `Error: Already leading team "..."`, a previous Agent Team wasn't cleaned up:

```bash
# List stale team directories
ls ~/.claude/teams/

# Remove stale teams
rm -rf ~/.claude/teams/*
rm -rf ~/.claude/tasks/*
```

### MCP Tools "No such tool available" in Agents

If agents report `Error: No such tool available: mcp__chronos__*`:

1. **Verify MCP server is running:**
```bash
claude mcp list
# All servers should show "✓ Connected"
```

2. **Check MCP server dependencies are installed:**
```bash
# Node.js servers
ls ~/.claude/mcp-servers/chronos/node_modules/ >/dev/null 2>&1 && echo "chronos: OK" || echo "chronos: MISSING — run: cd ~/.claude/mcp-servers/chronos && npm install"
ls ~/.claude/mcp-servers/lsp-tools/node_modules/ >/dev/null 2>&1 && echo "lsp-tools: OK" || echo "lsp-tools: MISSING — run: cd ~/.claude/mcp-servers/lsp-tools && npm install"

# Python servers
ls ~/.claude/mcp-servers/zai-glm/.venv/ >/dev/null 2>&1 && echo "zai-glm: OK" || echo "zai-glm: MISSING — run: cd ~/.claude/mcp-servers/zai-glm && uv sync"
ls ~/.claude/mcp-servers/gemini-mcp/.venv/ >/dev/null 2>&1 && echo "gemini-mcp: OK" || echo "gemini-mcp: MISSING — run: cd ~/.claude/mcp-servers/gemini-mcp && uv sync"
```

3. **Restart Claude Code** — MCP servers connect on session start. If a server was broken during startup, restart.

### Uninstall oh-my-claude

Reverse of Install steps 1.5 → 1.1:

**If Global:**

```bash
# Reverse step 1.3: Remove MCP server registrations
claude mcp remove chronos    -s user
claude mcp remove lsp-tools  -s user
claude mcp remove zai-glm    -s user
claude mcp remove gemini     -s user
claude mcp remove codex      -s user
claude mcp remove playwright -s user
claude mcp remove context7   -s user
claude mcp remove grep-app   -s user

# Reverse step 1.1: Remove copied files and directories
rm -rf ~/.claude/agents
rm -rf ~/.claude/skills
rm -rf ~/.claude/hooks
rm -rf ~/.claude/mcp-servers      # includes node_modules/, .venv/ from step 1.4
rm -rf ~/.claude/sisyphus
rm -f  ~/.claude/settings.json
rm -f  ~/.claude/settings.local.json
rm -f  ~/.claude/CLAUDE.md
```

**If Local:**

```bash
# Reverse step 1.3: Remove MCP server registrations and .mcp.json
claude mcp remove chronos    -s project
claude mcp remove lsp-tools  -s project
claude mcp remove zai-glm    -s project
claude mcp remove gemini     -s project
claude mcp remove codex      -s project
claude mcp remove playwright -s project
claude mcp remove context7   -s project
claude mcp remove grep-app   -s project
rm -f .mcp.json

# Reverse step 1.1: Remove copied files and directories
rm -rf .claude                    # includes node_modules/, .venv/ from step 1.4
rm -rf .sisyphus
rm -f  CLAUDE.md
rm -f  .gitignore.sample
```

---

## File Reference

### Agents

| File | Description | Model | External Model |
|------|-------------|-------|----------------|
| `.claude/agents/sisyphus/AGENT.md` | Primary AI (user-facing) | **Sonnet** | - |
| `.claude/agents/atlas/AGENT.md` | Master orchestrator | Sonnet | - |
| `.claude/agents/sub-atlas/AGENT.md` | Domain sub-orchestrator (Phase 2) | **Sonnet** | - |
| `.claude/agents/qa-orchestrator/AGENT.md` | QA team leader (Phase 3, parallel build/lint/test/ui) | **Sonnet** | - |
| `.claude/agents/prometheus/AGENT.md` | Strategic planner + research sub-team leader | **Opus-4.6** | - |
| `.claude/agents/metis/AGENT.md` | Pre-planning + plan reviewer | Haiku | GPT-5.3-Codex (xhigh) |
| `.claude/agents/oracle/AGENT.md` | Architecture advisor | Haiku (relay) | GPT-5.3-Codex |
| `.claude/agents/explore/AGENT.md` | Fast codebase exploration | Haiku | - |
| `.claude/agents/explore-high/AGENT.md` | Deep codebase analysis | **Sonnet-4.6** | - |
| `.claude/agents/multimodal-looker/AGENT.md` | Media analyzer | Haiku (relay) | Gemini |
| `.claude/agents/librarian/AGENT.md` | Documentation search | **Sonnet** | GLM-4.7 |
| `.claude/agents/junior/AGENT.md` | Codex relay | Haiku (relay) | **gpt-5.3-codex-spark** |
| `.claude/agents/debate/AGENT.md` | Multi-model debate moderator (team leader) | Sonnet | - |
| `.claude/agents/debate-participant/AGENT.md` | Opus direct reasoning for debate | **Opus-4.6** | - |
| `.claude/agents/debate-relay/AGENT.md` | MCP relay (GPT/Gemini/GLM) | Haiku | gpt-5.3-codex / Gemini / GLM-4.7 |

### Skills

| File | Description |
|------|-------------|
| `.claude/skills/autopilot/SKILL.md` | **Full 5-phase debate-first workflow** - `--fast`, `--swarm`, `--ui`, `--no-qa`, `--no-validation` options |
| `.claude/skills/autopilot-fast/SKILL.md` | **Fast workflow** (Plan + Execute only, no Debate/Code Review) - aliases: `ulw`, `ultrawork` |
| `.claude/skills/swarm/SKILL.md` | Parallel execution via Claude Code's native Agent Teams |
| `.claude/skills/ecomode/SKILL.md` | Resource-efficient operation mode |
| `.claude/skills/git-master/SKILL.md` | Git expert |
| `.claude/skills/frontend-ui-ux/SKILL.md` | UI/UX design patterns |
| `.claude/skills/playwright/SKILL.md` | Browser automation |

### Hooks

Installed to `.claude/hooks/` (local) or `~/.claude/hooks/` (global).

| File | Event | Description |
|------|-------|-------------|
| `{dest}/hooks/ralph-loop.sh` | Stop | Auto-continuation loop |
| `{dest}/hooks/todo-enforcer.sh` | Stop | Prevents stopping with incomplete tasks |
| `{dest}/hooks/comment-checker.sh` | PostToolUse | Warns about unnecessary comments |
| `{dest}/hooks/debate-lock.sh` | PreToolUse | Blocks code changes during debate |
| `{dest}/hooks/delegation-guard.sh` | PreToolUse | Prevents Atlas from direct code edits |
| `{dest}/hooks/autopilot-gate.sh` | PreToolUse (info only) | Displays autopilot phase status |
| `{dest}/hooks/post-compact.sh` | SessionStart | Restores context after compact |
| `{dest}/hooks/agent-limiter.sh` | PreToolUse (Task) | Limits concurrent agents (OOM prevention) |

### State Files

| File | Description |
|------|-------------|
| `.sisyphus/boulder.json` | Current work status |
| `.sisyphus/ralph-state.json` | Ralph loop state |
| `.sisyphus/ecomode.json` | Ecomode settings |
| `.sisyphus/autopilot.json` | Autopilot workflow state |
| `.sisyphus/workmode.json` | Workmode state (blocks direct modification) |
| `.sisyphus/active-agents.json` | Agent limiter state (OOM prevention) |
| `.sisyphus/plans/` | Prometheus plan files |
| `.sisyphus/specs/` | Autopilot spec files |
| `.sisyphus/notepads/` | Sisyphus learning records |
| `.sisyphus/autopilot-history/` | Archived autopilot sessions |
| `.sisyphus/ui-verification/` | UI verification screenshots and results |

---

## Usage

### Basic Commands

```bash
# Start Claude Code
claude

# Invoke specific agent
@sisyphus   - Primary AI (user-facing, Sonnet-4.6)
@atlas      - Master orchestrator
@prometheus - Strategic planner (Opus-4.6)
@metis      - Pre-planning + plan reviewer (GPT-5.3-Codex xhigh)
@oracle     - Architecture advisor (GPT-5.3-Codex)
@explore    - Codebase exploration
@multimodal-looker - Media analysis (Gemini)
@librarian  - Documentation search (GLM-4.7)
@junior     - Codex relay (Haiku → codex-spark)
@debate     - Multi-model debate (4 models)

# Invoke skills
/autopilot - Unified 5-phase debate-first workflow
/autopilot --fast - Fast mode (skip Debate planning) - alias: ulw
/autopilot --swarm 5 - Parallel execution with 5 agents
/autopilot --ui - UI verification with Playwright + Gemini
/swarm 3:junior - Parallel execution with 3 agents
/ecomode on|off - Resource-efficient mode
/git-master - Git operations
/frontend-ui-ux - UI/UX guidance
/playwright - Browser automation
```

### Autopilot Mode (Debate-First Workflow)

```bash
# Full 5-phase workflow
/autopilot "Add complete authentication system with JWT"

# Fast mode (skip Debate planning) - alias: ulw
ulw "Fix login button styling"

# Parallel execution with 5 agents
/autopilot --swarm 5 "Implement all API endpoints"

# UI verification with Playwright + Gemini
/autopilot --ui "Build dashboard page"

# Combined options
/autopilot --fast --swarm 3 "Quick parallel fix"

# This will:
# 1. Enable workmode (blocks Sisyphus from direct code modification)
# 2. Phase 0: 4 models debate and agree on implementation approach (skip if --fast)
# 3. Phase 1: Planning Team — Prometheus leads Explore×2 research sub-team (skip if --fast)
#             then writes plan, Metis (GPT xhigh) reviews until approved
# 4. Phase 2: Execution Team — Atlas → sub-atlas × domains → Junior × N per domain
#             (domain classification: feature/test/infra; fallback to flat if <4 tasks)
# 5. Phase 3: QA Team — qa-orchestrator: build → lint + test + ui (parallel)
#             (ui-worker spawned autonomously if UI framework + UI file changes detected)
# 6. Phase 4: 4 models code review → APPROVED or loop back to Phase 2
# 7. Disable workmode on completion
```

### Media Analysis

```bash
# Multimodal-looker agent analyzes media files
@multimodal-looker Analyze this design mockup at /path/to/mockup.png

# Workflow:
# 1. Receive file path
# 2. Analyze with Gemini (mcp__gemini__analyzeFile)
# 3. Return structured analysis
```

### UI Verification

```bash
# Enable UI verification in autopilot
/autopilot --ui "Build dashboard page"

# What happens in QA phase:
# 1. Build, lint, tests pass
# 2. Playwright captures screenshot
# 3. Gemini analyzes UI against expectations
# 4. Reports visual issues or passes

# Manual UI verification tools
mcp__chronos__ui_verification_config(url, expectations, session_id)
mcp__chronos__ui_verification_command(url, output_path)
mcp__chronos__ui_verification_prompt(expectations)
```

### Agent Teams (Parallel Execution)

```bash
# Launch an Agent Team for parallel execution
/swarm 5:junior "Implement all API endpoints"

# Or use natural language:
# "Create an agent team with 5 teammates to implement all API endpoints in parallel"

# Workflow:
# 1. Tasks created in native task list (TaskCreate)
# 2. Agent Team formed with N teammates
# 3. Teammates claim tasks atomically from shared task list
# 4. Teammates communicate directly via mailbox
# 5. Leader in delegation mode (no direct code changes)
```

#### Display Modes

| Mode | Setting | Requirement | Description |
|------|---------|-------------|-------------|
| `auto` (default) | `"auto"` | None | Split pane if inside tmux; otherwise in-process |
| Split pane | `"tmux"` | tmux or iTerm2 | Each teammate in its own pane |
| In-process | `"in-process"` | None | All teammates in the main terminal |

```bash
# Force split pane mode (tmux / iTerm2 must be installed — see step 1.5b)
# Edit .claude/settings.json:
#   "teammateMode": "tmux"

# Force in-process mode
# Edit .claude/settings.json:
#   "teammateMode": "in-process"

# Override for a single session (without editing settings.json)
claude --teammate-mode in-process
```

> When running `/autopilot --swarm N`, split pane mode lets you watch all N teammates execute in
> parallel in real time. Navigate between panes with Shift+Up/Down (in-process) or click the pane
> (split mode).

### Ecomode (Resource Efficiency)

```bash
# Enable ecomode for cost-effective execution
/ecomode on

# Effects:
# - Skip Debate planning phase (Phase 0)
# - Shorter responses

# Disable ecomode
/ecomode off
```

---

## Architecture

```
Autopilot (Debate-First, 5 Phases, 3-Level Team Hierarchy):

Phase 0 ──► DEBATE PLANNING (Debate Agent Team)
            Opus-4.6 + gpt-5.3-codex + Gemini + GLM-4.7
            → 4 models analyze request & reach 3/4 consensus plan

Phase 1 ──► STRUCTURING (Planning Team: plan-{ts})
            Prometheus (Opus-4.6) leads:
              └── Research Sub-Team: explore-impl + explore-test (parallel)
                  → Gather codebase context before planning
            Prometheus writes plan from research + debate conclusions
            Metis (GPT-5.3-Codex xhigh) reviews → repeat until APPROVED
            [--fast: skip research sub-team]

Phase 2 ──► EXECUTION (Execution Team: exec-{ts})
            Atlas (Sonnet) leads outer team:
              ├── sub-atlas-feature → Inner Team (feat-{ts}): Junior × N
              ├── sub-atlas-test    → Inner Team (test-{ts}): Junior × N (blocked by feature)
              └── sub-atlas-infra   → Inner Team (infra-{ts}): Junior × N (independent)
            [Fallback to flat Atlas → Junior × N if <4 tasks or single domain]
            [--swarm N: N flat Junior workers in single exec team]

Phase 3 ──► QA (QA Team: qa-{ts})
            qa-orchestrator leads:
              build-worker  (sequential first)
              lint-worker   (parallel after build)
              test-worker   (parallel after build)
              ui-worker     (parallel, only if UI framework + UI file changes detected)

Phase 4 ──► DEBATE CODE REVIEW (Debate Agent Team)
            4 models review git diff + key files
            APPROVED → Complete
            REJECTED → Prometheus creates fix plan → Loop back to Phase 2
```

```
User Request
     │
     ▼
┌─────────────────┐
│    Sisyphus     │ (Primary AI)
│  (Sonnet-4.6)   │
└────────┬────────┘
         │
    ┌────┴────────────────────────┐
    │                             │
    ▼                             ▼
┌─────────────────────┐    ┌─────────────┐
│   /autopilot        │    │  Direct /   │
│   (Debate-First)    │    │  Delegation │
└──────────┬──────────┘    └──────┬──────┘
           │                      │
    Phase 0▼                      ▼
┌─────────────────────┐    ┌─────────────┐
│  Debate (Planning)  │    │   Atlas     │
│ Sonnet leader +     │    │  (Sonnet)   │
│ Opus + 3 relays     │    └──────┬──────┘
└──────────┬──────────┘           │
    Phase 1▼               ┌──────┼──────────┐
┌─────────────────────┐    ▼      ▼          ▼
│ Planning Team        │ ┌──────────────┐ ┌──────────┐
│ Prometheus (Opus)   │ │Junior (Haiku)│ │ Oracle   │
│ ├─explore-impl      │ │+ codex-spark │ │ (Haiku + │
│ └─explore-test      │ └──────────────┘ │ GPT-5.3) │
│ + Metis review loop │                  └──────────┘
└──────────┬──────────┘
    Phase 2▼
┌──────────────────────────────────┐
│  Execution Team (exec-{ts})      │
│  Atlas (Sonnet)                  │
│  ├── sub-atlas-feature           │
│  │   └── feat-{ts}: Junior × N  │
│  ├── sub-atlas-test              │
│  │   └── test-{ts}: Junior × N  │
│  └── sub-atlas-infra (opt.)      │
│      └── infra-{ts}: Junior × N │
└──────────┬───────────────────────┘
    Phase 3▼
┌──────────────────────────────────┐
│  QA Team (qa-{ts})               │
│  qa-orchestrator                 │
│  ├── build-worker (sequential)   │
│  ├── lint-worker  (parallel)     │
│  ├── test-worker  (parallel)     │
│  └── ui-worker    (conditional)  │
└──────────┬───────────────────────┘
    Phase 4▼
┌─────────────────────┐
│  Debate Code Review │
│  4 models → APPROVE │
│  or loop to Phase 2 │
└─────────────────────┘
```

### Agent Model Summary

| Agent | Base | External | Reasoning | Phase Role |
|-------|------|----------|-----------|------------|
| **Sisyphus** | **Sonnet-4.6** | - | - | Primary AI |
| Atlas | Sonnet | - | - | Phase 2 outer team leader |
| **Sub-Atlas** | **Sonnet** | - | - | Phase 2 domain sub-orchestrator |
| **QA-Orchestrator** | **Sonnet** | - | - | Phase 3 QA team leader |
| **Prometheus** | **Opus-4.6** | - | - | Phase 1 planning + research team leader |
| **Metis** | Haiku | GPT-5.3-Codex | **xhigh** | Phase 1 plan reviewer |
| Oracle | Haiku (relay) | GPT-5.3-Codex | default | Architecture advice |
| **Debate** (leader) | Sonnet | - | - | Phase 0/4 debate moderator |
| Debate-Participant | **Opus-4.6** | - | - | Phase 0/4 Opus analysis |
| Debate-Relay | Haiku | gpt-5.3-codex / Gemini / GLM-4.7 | - | Phase 0/4 external model relay |
| Explore | Haiku | - | - | Phase 1 research + general exploration |
| Multimodal-looker | Haiku (relay) | Gemini | - | Media analysis |
| **Librarian** | **Sonnet** (relay + sub-team) | GLM-4.7 | - | Documentation search |
| Junior | Haiku (relay) | **gpt-5.3-codex-spark** | - | Phase 2 code execution (pure relay) |

---

## Credits

- **[oh-my-opencode](https://github.com/sisyphus-labs/oh-my-opencode)** by Sisyphus Labs - Base architecture
- **[oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)** by Yeachan Heo (MIT License) - Tier-based Model Routing, Swarm, Ecomode, Autopilot features

## License

[Sustainable Use License](./LICENSE)
