# oh-my-claude

Multi-agent orchestration system for Claude Code, porting [oh-my-opencode](https://github.com/anthropics/claude-code) features to Claude Code's native capabilities (MCP, Hooks, Skills, Agents).

> **⚠️ WARNING**
>
> This repository has **NOT been fully tested or verified**. Use at your own risk. The authors are not responsible for any damages, data loss, or issues that may arise from using this software.

## Features

- **Debate-First Autopilot**: 4-model consensus planning before execution (Opus-4.6 + GPT-5.2 + Gemini-3-Pro-Preview + GLM-4.7)
- **Multi-Agent Orchestration**: 13 specialized agents with clear role separation
  - Planning: Debate (4 models), Prometheus (Opus-4.6), Metis (GPT-5.3-Codex xhigh)
  - Execution: Atlas (Sonnet), Junior (codex-spark primary), Oracle (Haiku relay), Explore, Multimodal-looker (Haiku relay), Librarian (Sonnet relay + sub-team)
  - Variants: Oracle-low, Explore-high
  - User-facing: Sisyphus (Sonnet), Debate
- **codex-spark Code Generation**: Junior agents use `gpt-5.3-codex-spark` via Codex MCP for all code generation
- **External Model Integration**: GPT-5.2 + GPT-5.3-Codex (xhigh reasoning), Gemini-3-Pro-Preview, GLM-4.7 via MCP
- **Prometheus+Metis Loop**: Prometheus creates plan, Metis (GPT-5.3-Codex xhigh) reviews until approved
- **Debate Code Review**: Phase 4 uses 4-model debate to APPROVE or loop back to execution
- **Ralph Loop**: Auto-continuation until task completion
- **Unified Autopilot**: 5-phase debate-first workflow (`--fast`, `--swarm`, `--ui`, `--no-qa`, `--no-validation`)
- **Workmode**: Blocks direct code modification when autopilot is active
- **UI Verification**: Playwright + Gemini for visual QA (with `--ui` flag)
- **Smart Model Routing**: Automatic external model selection to reduce Claude API costs
- **Agent Teams**: Native Claude Code parallel execution (experimental, replaces SQLite-based Swarm)
- **Agent Limiter**: OOM prevention by limiting concurrent background agents (default: 5)
- **Ecomode**: Resource-efficient mode (skip debate planning phase)
- **Todo Enforcer**: Prevents stopping with incomplete tasks
- **Planning/Execution Separation**: Clean context management
- **Skill System**: autopilot, swarm, ecomode, git-master, frontend-ui-ux, playwright

# Setup Guide

> **Important:** This project is optimized for **Claude Code**. While other CLI agents (Codex, Gemini) can assist with setup, the agents, skills, and hooks are designed specifically for Claude Code's native features.
>
> **Follow the steps in order.** Each section depends on the previous one being completed.

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

### 1.1 Clone Repository and Copy Files

```bash
# Clone oh-my-claude to /tmp
git clone https://github.com/Eunho-J/oh-my-claude.git /tmp/oh-my-claude

# Copy all configuration files to current project
cp -r /tmp/oh-my-claude/claude .claude
cp -r /tmp/oh-my-claude/sisyphus .sisyphus
cp -r /tmp/oh-my-claude/hooks .
cp -r /tmp/oh-my-claude/mcp-servers .
cp /tmp/oh-my-claude/CLAUDE.md .
cp /tmp/oh-my-claude/.gitignore.sample .

# Clean up
rm -rf /tmp/oh-my-claude
```

**Note:** This copies the following to your project:
- `.claude/` - Agent and skill definitions, settings
- `.sisyphus/` - State management directory
- `hooks/` - Hook scripts
- `mcp-servers/` - Custom MCP server implementations
- `CLAUDE.md` - Project instructions for Claude
- `.gitignore.sample` - Template for .gitignore (copy to .gitignore in step 1.6)

### 1.2 Prerequisites Installation

**Check existing installations first:**
```bash
# Check Node.js (v18+ required)
node --version 2>/dev/null || echo "Node.js: NOT INSTALLED"

# Check build tools (required for native modules like better-sqlite3)
g++ --version 2>/dev/null | head -1 || echo "g++: NOT INSTALLED"

# Check uv
uv --version 2>/dev/null || echo "uv: NOT INSTALLED"

# Check jq (required for hook scripts)
jq --version 2>/dev/null || echo "jq: NOT INSTALLED"
```

**Install only if not present or outdated:**
```bash
# Install uv (required for Z.ai GLM MCP) - skip if already installed
command -v uv >/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh

# Install jq (required for hook scripts JSON processing)
# macOS
command -v jq >/dev/null || brew install jq
# Linux (Debian/Ubuntu)
# command -v jq >/dev/null || sudo apt install jq
# Linux (Fedora/RHEL)
# command -v jq >/dev/null || sudo dnf install jq
```

### 1.3 Install Global CLI Tools

**Check existing installations first:**
```bash
# Check Gemini CLI
gemini --version 2>/dev/null || echo "Gemini CLI: NOT INSTALLED"

# Check Playwright
npx playwright --version 2>/dev/null || echo "Playwright: NOT INSTALLED"
```

**Install only if not present:**
```bash
# Install Gemini CLI (for OAuth auth) - skip if already installed
command -v gemini >/dev/null || npm install -g @google/gemini-cli

# Install Playwright (for browser automation skill)
npx playwright install
```

### 1.3.1 Register MCP Servers

Register all MCP servers for this project using `claude mcp add`:

**Project-level installation (recommended):**
```bash
# stdio servers
claude mcp add codex -s project -- npx -y codex mcp-server
claude mcp add gemini -s project -- npx mcp-gemini-cli --allow-npx
claude mcp add chronos -s project -- node ./mcp-servers/chronos/index.js
claude mcp add lsp-tools -s project -- node ./mcp-servers/lsp-tools/index.js
claude mcp add zai-glm -s project -- ./mcp-servers/zai-glm/.venv/bin/python ./mcp-servers/zai-glm/server.py

# HTTP servers (API key required)
claude mcp add context7 -s project --transport http https://mcp.context7.com/mcp --header "Authorization: Bearer ${CONTEXT7_API_KEY}"
claude mcp add grep-app -s project --transport http https://grep.app/api/mcp
```

**Global installation (for cross-project availability):**
```bash
claude mcp add codex -s user -- npx -y codex mcp-server
claude mcp add gemini -s user -- npx mcp-gemini-cli --allow-npx
```

### 1.4 Install Local Dependencies

```bash
# Install Chronos MCP server (Ralph Loop, Boulder, Debate, Ecomode, Autopilot)
cd mcp-servers/chronos
npm install
cd ../..

# Install LSP Tools MCP server
cd mcp-servers/lsp-tools
npm install
cd ../..

# Install Z.ai GLM MCP server dependencies (Python)
cd mcp-servers/zai-glm
uv sync
cd ../..
```

**Note:**
- Chronos MCP provides state management (Ralph Loop, Boulder, Debate, Ecomode, Autopilot)
- LSP Tools MCP provides Language Server Protocol and AST-Grep integration
- Z.ai GLM MCP uses Python with `mcp` and `zai-sdk` packages

### 1.5 Make Hook Scripts Executable

```bash
chmod +x hooks/*.sh
```

### 1.6 Configure .gitignore

Copy the sample `.gitignore` to prevent committing environment-specific files:

```bash
# Copy .gitignore template
cp .gitignore.sample .gitignore
```

**What gets ignored:**
- `.env` - API keys and secrets
- `node_modules/` - Dependencies (reinstall with `npm install`)
- `mcp-servers/zai-glm/.venv/` - Python virtual environment
- `.sisyphus/boulder.json`, `.sisyphus/ralph-state.json` - Runtime state files
- `.sisyphus/ecomode.json`, `.sisyphus/autopilot.json` - Runtime state files
- `.sisyphus/active-agents.json` - Agent limiter state
- `.sisyphus/debates/` - Debate state and history
- `.sisyphus/autopilot-history/` - Archived autopilot sessions

**What is preserved:**
- `.sisyphus/plans/` - Prometheus plan files (user content)
- `.sisyphus/specs/` - Autopilot spec files (user content)
- `.sisyphus/notepads/` - Sisyphus learning records (user content)

### 1.7 MCP Permissions (Pre-configured)

The `.claude/settings.json` file already includes all MCP tool permissions. These are pre-allowed so you don't need to approve each tool manually:

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
- `mcp__gemini__chat`, `mcp__gemini__googleSearch`, `mcp__gemini__analyzeFile` - Google Gemini
- `mcp__zai-glm__chat`, `mcp__zai-glm__analyze_code` - Z.ai GLM-4.7

**Documentation & Code Search:**
- `mcp__context7__resolve-library-id`, `mcp__context7__query-docs` - Context7
- `mcp__grep-app__searchGitHub` - GitHub code search

**LSP Tools:**
- `mcp__lsp-tools__lsp_*` - Language Server Protocol tools
- `mcp__lsp-tools__ast_grep_*` - AST-Grep search/replace

### 1.8 Verify Installation

```bash
# Check all required tools
echo "=== Checking Prerequisites ==="
echo "Node.js: $(node --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Codex: $(npx codex --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Gemini: $(gemini --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "jq: $(jq --version 2>/dev/null || echo 'NOT INSTALLED')"

# Check directory structure
echo "=== Checking Directory Structure ==="
[ -d ".claude/agents" ] && echo "Agents: OK" || echo "Agents: MISSING"
[ -d ".claude/skills" ] && echo "Skills: OK" || echo "Skills: MISSING"
[ -d ".sisyphus" ] && echo "Sisyphus: OK" || echo "Sisyphus: MISSING"
[ -d "hooks" ] && echo "Hooks: OK" || echo "Hooks: MISSING"

# Check configuration files
echo "=== Checking Configuration Files ==="
[ -f ".claude/settings.json" ] && echo "settings.json: OK" || echo "settings.json: MISSING"
[ -f "CLAUDE.md" ] && echo "CLAUDE.md: OK" || echo "CLAUDE.md: MISSING"
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
# Ensure scripts are executable
chmod +x hooks/*.sh

# Test hook script directly
./hooks/ralph-loop.sh < /dev/null
```

---

## File Reference

### Agents

| File | Description | Model | External Model |
|------|-------------|-------|----------------|
| `.claude/agents/sisyphus/AGENT.md` | Primary AI (user-facing) | **Sonnet** | - |
| `.claude/agents/atlas/AGENT.md` | Master orchestrator | Sonnet | - |
| `.claude/agents/prometheus/AGENT.md` | Strategic planner | **Opus-4.6** | - |
| `.claude/agents/metis/AGENT.md` | Pre-planning + plan reviewer | Haiku | GPT-5.3-Codex (xhigh) |
| `.claude/agents/oracle/AGENT.md` | Architecture advisor | **Opus-4.6** | GPT-5.3-Codex |
| `.claude/agents/oracle-low/AGENT.md` | Quick architecture lookup | Haiku | - |
| `.claude/agents/explore/AGENT.md` | Fast codebase exploration | Haiku | - |
| `.claude/agents/explore-high/AGENT.md` | Deep codebase analysis | **Sonnet-4.6** | - |
| `.claude/agents/multimodal-looker/AGENT.md` | Media analyzer | **Sonnet-4.6** | Gemini |
| `.claude/agents/librarian/AGENT.md` | Documentation search | **Sonnet** | GLM-4.7 |
| `.claude/agents/junior/AGENT.md` | Task executor | Haiku (shell) | **gpt-5.3-codex-spark** |
| `.claude/agents/debate/AGENT.md` | Multi-model debate (4 models) | **Opus-4.6** | **GPT-5.2, Gemini-3-Pro-Preview, GLM-4.7** |

### Skills

| File | Description |
|------|-------------|
| `.claude/skills/autopilot/SKILL.md` | **Unified 5-phase workflow** (replaces ultrawork) - `--fast`, `--swarm`, `--ui` options |
| `.claude/skills/swarm/SKILL.md` | Parallel execution via Claude Code's native Agent Teams |
| `.claude/skills/ecomode/SKILL.md` | Resource-efficient operation mode |
| `.claude/skills/git-master/SKILL.md` | Git expert |
| `.claude/skills/frontend-ui-ux/SKILL.md` | UI/UX design patterns |
| `.claude/skills/playwright/SKILL.md` | Browser automation |

### Hooks

| File | Event | Description |
|------|-------|-------------|
| `hooks/ralph-loop.sh` | Stop | Auto-continuation loop |
| `hooks/todo-enforcer.sh` | Stop | Prevents stopping with incomplete tasks |
| `hooks/comment-checker.sh` | PostToolUse | Warns about unnecessary comments |
| `hooks/debate-lock.sh` | PreToolUse | Blocks code changes during debate |
| `hooks/delegation-guard.sh` | PreToolUse | Prevents Atlas from direct code edits |
| `hooks/autopilot-gate.sh` | PreToolUse (info only) | Displays autopilot phase status |
| `hooks/post-compact.sh` | SessionStart | Restores context after compact |
| `hooks/agent-limiter.sh` | PreToolUse (Task) | Limits concurrent agents (OOM prevention) |

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
@junior     - Task executor (Haiku + codex-spark)
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
# 3. Phase 1: Prometheus creates plan, Metis reviews in loop until approved
# 4. Phase 2: Atlas → Junior/codex-spark execute tasks (or Swarm for parallel)
# 5. Phase 3: QA - build, lint, tests (+ UI if --ui)
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

### Ecomode (Resource Efficiency)

```bash
# Enable ecomode for cost-effective execution
/ecomode on

# Effects:
# - oracle → oracle-low (Haiku instead of Opus)
# - Skip Debate planning phase (Phase 0)
# - Shorter responses

# Disable ecomode
/ecomode off
```

---

## Architecture

```
Autopilot (Debate-First, 5 Phases):

Phase 0 ──► DEBATE PLANNING
            Opus-4.6 + GPT-5.2 + Gemini-3-Pro-Preview + GLM-4.7
            → 4 models analyze request & reach 3/4 consensus plan

Phase 1 ──► STRUCTURING (Prometheus + Metis Loop)
            Prometheus (Opus-4.6) creates structured execution plan
            Metis (GPT-5.3-Codex xhigh) reviews against debate conclusions
            → Repeat until APPROVED

Phase 2 ──► EXECUTION
            Atlas (Sonnet) orchestrates
            → Junior agents (Haiku coordinator + gpt-5.3-codex-spark)
            → Or Agent Teams (native parallel execution)

Phase 3 ──► QA
            Build / Lint / Tests
            + UI verification (Playwright + Gemini) if --ui

Phase 4 ──► DEBATE CODE REVIEW
            4 models review git diff + key files
            APPROVED → Complete
            REJECTED → Loop back to Phase 2 (with fix plan)
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
│ Opus-4.6 + GPT-5.2  │    │  (Sonnet)   │
│ + Gemini + GLM-4.7    │    └──────┬──────┘
└──────────┬──────────┘           │
    Phase 1▼               ┌──────┼──────────┐
┌─────────────────────┐    ▼      ▼          ▼
│  Prometheus (Opus)  │ ┌──────────────┐ ┌──────────┐
│  + Metis (GPT xhigh)│ │Junior (Haiku)│ │ Oracle   │
│  review loop        │ │+ codex-spark │ │ (Sonnet  │
└──────────┬──────────┘ └──────────────┘ │ +GPT-5.3)│
    Phase 2▼                              └──────────┘
┌─────────────────────┐
│  Atlas → Junior     │
│  (codex-spark)      │
└──────────┬──────────┘
    Phase 3▼
┌─────────────────────┐
│  QA (Build/Lint/    │
│  Tests + UI opt.)   │
└──────────┬──────────┘
    Phase 4▼
┌─────────────────────┐
│  Debate Code Review │
│  4 models → APPROVE │
│  or loop to Phase 2 │
└─────────────────────┘
```

### Agent Model Summary

| Agent | Base | External | Reasoning |
|-------|------|----------|-----------|
| **Sisyphus** | **Sonnet-4.6** | - | - |
| Atlas | Sonnet | - | - |
| **Prometheus** | **Opus-4.6** | - | - |
| **Metis** | Haiku | GPT-5.3-Codex | **xhigh** |
| Oracle | Haiku (relay) | GPT-5.3-Codex | default |
| **Debate** | **Opus-4.6** | **GPT-5.2, Gemini-3-Pro-Preview, GLM-4.7** | - |
| Explore | Haiku | - | - |
| Multimodal-looker | Haiku (relay) | Gemini | - |
| **Librarian** | **Sonnet** (relay + sub-team) | GLM-4.7 | - |
| Junior | Haiku (shell) | **gpt-5.3-codex-spark** | - |

---

## Credits

- **[oh-my-opencode](https://github.com/sisyphus-labs/oh-my-opencode)** by Sisyphus Labs - Base architecture
- **[oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)** by Yeachan Heo (MIT License) - Tier-based Model Routing, Swarm, Ecomode, Autopilot features

## License

[Sustainable Use License](./LICENSE)
