# oh-my-claude

Multi-agent orchestration system for Claude Code, porting [oh-my-opencode](https://github.com/anthropics/claude-code) features to Claude Code's native capabilities (MCP, Hooks, Skills, Agents).

> **⚠️ WARNING**
>
> This repository has **NOT been fully tested or verified**. Use at your own risk. The authors are not responsible for any damages, data loss, or issues that may arise from using this software.

## Features

- **Multi-Agent Orchestration**: 15 specialized agents with clear role separation
  - Planning: Metis (GPT-5.2 xhigh), Prometheus, Momus (Codex-5.2 xhigh)
  - Execution: Atlas, Junior, Oracle, Explore, Multimodal-looker, Librarian
  - Tier Variants: Junior-low/high, Oracle-low, Explore-high
  - User-facing: Sisyphus (Primary AI), Debate
- **Tier-based Model Routing**: Automatic agent selection based on task complexity (Haiku/Sonnet/Opus)
- **External Model Integration**: GPT-5.2/Codex-5.2 (xhigh reasoning), Google Gemini, GLM-4.7 via MCP
- **Ralph Loop**: Auto-continuation until task completion
- **Autopilot**: 5-phase workflow (Expansion → Planning → Execution → QA → Validation)
- **Swarm**: SQLite-based atomic task claiming for parallel agent execution
- **Ecomode**: Resource-efficient mode (prefer Haiku, skip analysis phases)
- **Todo Enforcer**: Prevents stopping with incomplete tasks
- **Planning/Execution Separation**: Clean context management
- **Skill System**: ultrawork, autopilot, swarm, ecomode, git-master, frontend-ui-ux, playwright

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
cp -r /tmp/oh-my-claude/.claude .
cp -r /tmp/oh-my-claude/.sisyphus .
cp -r /tmp/oh-my-claude/hooks .
cp -r /tmp/oh-my-claude/mcp-servers .
cp /tmp/oh-my-claude/.mcp.json .
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
- `.mcp.json` - MCP server configuration
- `CLAUDE.md` - Project instructions for Claude
- `.gitignore.sample` - Template for .gitignore (copy to .gitignore in step 1.6)

### 1.2 Prerequisites Installation

**Check existing installations first:**
```bash
# Check Node.js (v18+ required)
node --version 2>/dev/null || echo "Node.js: NOT INSTALLED"

# Check build tools (required for native modules like better-sqlite3)
g++ --version 2>/dev/null | head -1 || echo "g++: NOT INSTALLED"

# Check Bun
bun --version 2>/dev/null || echo "Bun: NOT INSTALLED"

# Check uv
uv --version 2>/dev/null || echo "uv: NOT INSTALLED"
```

**Install only if not present or outdated:**
```bash
# Install build-essential (Linux only - required for better-sqlite3 in Swarm MCP)
# This is needed if your Node.js version doesn't have prebuilt binaries
sudo apt install build-essential  # Debian/Ubuntu
# or: sudo dnf groupinstall "Development Tools"  # Fedora/RHEL

# Install Bun runtime (required for Gemini MCP) - skip if already installed
command -v bun >/dev/null || curl -fsSL https://bun.sh/install | bash

# Install uv (required for Z.ai GLM MCP) - skip if already installed
command -v uv >/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 1.3 Install Global CLI Tools

**Check existing installations first:**
```bash
# Check Codex CLI
codex --version 2>/dev/null || echo "Codex: NOT INSTALLED"

# Check Gemini CLI
gemini --version 2>/dev/null || echo "Gemini CLI: NOT INSTALLED"

# Check Playwright
npx playwright --version 2>/dev/null || echo "Playwright: NOT INSTALLED"
```

**Install only if not present:**
```bash
# Install Codex CLI (for Oracle agent) - skip if already installed
command -v codex >/dev/null || npm install -g codex

# Install Gemini CLI (for Multimodal-looker agent) - skip if already installed
command -v gemini >/dev/null || npm install -g @google/gemini-cli

# Install Playwright (for browser automation skill)
npx playwright install
```

### 1.4 Install Local Dependencies

```bash
# Install Chronos MCP server (Ralph Loop, Boulder, Debate, Ecomode, Autopilot)
cd mcp-servers/chronos
npm install
cd ../..

# Install Swarm MCP server (SQLite atomic task claiming)
# Note: Requires build-essential for better-sqlite3 compilation
cd mcp-servers/swarm
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
- Swarm MCP uses `better-sqlite3` for atomic task claiming - requires build tools on Linux
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
- `.sisyphus/swarm.db`, `.sisyphus/swarm.db-*` - Swarm SQLite database
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
- `mcp__chronos__debate_*` - Debate session management
- `mcp__chronos__ecomode_*` - Ecomode settings
- `mcp__chronos__autopilot_*` - Autopilot 5-phase workflow
- `mcp__chronos__chronos_status`, `mcp__chronos__chronos_should_continue`

**Swarm (Parallel Execution):**
- `mcp__swarm__swarm_init` - Initialize task pool
- `mcp__swarm__swarm_claim` - Atomic task claiming
- `mcp__swarm__swarm_complete`, `mcp__swarm__swarm_fail` - Task completion
- `mcp__swarm__swarm_heartbeat`, `mcp__swarm__swarm_recover` - Agent liveness
- `mcp__swarm__swarm_stats`, `mcp__swarm__swarm_list`, `mcp__swarm__swarm_add`

**External Models:**
- `mcp__codex__codex`, `mcp__codex__codex-reply` - OpenAI Codex/GPT-5.2
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
echo "Bun: $(bun --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Codex: $(npx codex --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Gemini: $(gemini --version 2>/dev/null || echo 'NOT INSTALLED')"

# Check directory structure
echo "=== Checking Directory Structure ==="
[ -d ".claude/agents" ] && echo "Agents: OK" || echo "Agents: MISSING"
[ -d ".claude/skills" ] && echo "Skills: OK" || echo "Skills: MISSING"
[ -d ".sisyphus" ] && echo "Sisyphus: OK" || echo "Sisyphus: MISSING"
[ -d "hooks" ] && echo "Hooks: OK" || echo "Hooks: MISSING"

# Check configuration files
echo "=== Checking Configuration Files ==="
[ -f ".mcp.json" ] && echo ".mcp.json: OK" || echo ".mcp.json: MISSING"
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

### Codex Authentication Issues

```bash
# Clear cached credentials and re-login
codex auth logout
codex auth login
```

### Gemini Authentication Issues

```bash
# Clear Gemini credentials
rm -rf ~/.gemini/
gemini auth login
```

### Bun Not Found

```bash
# Add Bun to PATH (add to ~/.bashrc or ~/.zshrc)
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
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
| `.claude/agents/sisyphus/AGENT.md` | Primary AI (user-facing) | Opus | - |
| `.claude/agents/atlas/AGENT.md` | Master orchestrator | Sonnet | - |
| `.claude/agents/prometheus/AGENT.md` | Strategic planner | Opus | - |
| `.claude/agents/metis/AGENT.md` | Pre-planning consultant | Haiku | GPT-5.2 (xhigh) |
| `.claude/agents/momus/AGENT.md` | Plan reviewer | Haiku | Codex-5.2 (xhigh) |
| `.claude/agents/oracle/AGENT.md` | Architecture advisor | Sonnet | Codex |
| `.claude/agents/oracle-low/AGENT.md` | Quick architecture lookup | Haiku | - |
| `.claude/agents/explore/AGENT.md` | Fast codebase exploration | Haiku | - |
| `.claude/agents/explore-high/AGENT.md` | Deep codebase analysis | Sonnet | - |
| `.claude/agents/multimodal-looker/AGENT.md` | Media analyzer | Sonnet | Gemini |
| `.claude/agents/librarian/AGENT.md` | Documentation search | Haiku | GLM-4.7 |
| `.claude/agents/junior/AGENT.md` | Task executor (medium) | Sonnet | - |
| `.claude/agents/junior-low/AGENT.md` | Simple task executor | Haiku | - |
| `.claude/agents/junior-high/AGENT.md` | Complex task executor | Opus | - |
| `.claude/agents/debate/AGENT.md` | Multi-model debate | Opus | GPT-5.2, Gemini |

### Skills

| File | Description |
|------|-------------|
| `.claude/skills/ultrawork/SKILL.md` | Auto-parallel execution |
| `.claude/skills/autopilot/SKILL.md` | 5-phase workflow (Expansion → Planning → Execution → QA → Validation) |
| `.claude/skills/swarm/SKILL.md` | Parallel agent execution with atomic task claiming |
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
| `hooks/autopilot-gate.sh` | (info only) | Displays autopilot phase status |
| `hooks/post-compact.sh` | SessionStart | Restores context after compact |

### State Files

| File | Description |
|------|-------------|
| `.sisyphus/boulder.json` | Current work status |
| `.sisyphus/ralph-state.json` | Ralph loop state |
| `.sisyphus/ecomode.json` | Ecomode settings |
| `.sisyphus/autopilot.json` | Autopilot workflow state |
| `.sisyphus/swarm.db` | Swarm SQLite database |
| `.sisyphus/plans/` | Prometheus plan files |
| `.sisyphus/specs/` | Autopilot spec files |
| `.sisyphus/notepads/` | Sisyphus learning records |
| `.sisyphus/autopilot-history/` | Archived autopilot sessions |

---

## Usage

### Basic Commands

```bash
# Start Claude Code
claude

# Invoke specific agent
@sisyphus   - Primary AI (user-facing)
@atlas      - Master orchestrator
@prometheus - Strategic planner
@metis      - Pre-planning consultant
@momus      - Plan reviewer
@oracle     - Architecture advisor
@explore    - Codebase exploration
@multimodal-looker - Media analysis
@librarian  - Documentation search
@junior     - Task executor
@debate     - Multi-model debate

# Invoke skills
/ultrawork - Auto-parallel execution
/autopilot - 5-phase workflow (Expansion → Validation)
/swarm 3:junior - Parallel execution with 3 agents
/ecomode on|off - Resource-efficient mode
/git-master - Git operations
/frontend-ui-ux - UI/UX guidance
/playwright - Browser automation
```

### Ultrawork Mode

```bash
# Trigger ultrawork for complex tasks
ulw Add complete authentication system with JWT

# This will:
# 1. [Optional] Metis analyzes request
# 2. Prometheus creates a plan
# 3. [Optional] Momus reviews plan
# 4. Atlas distributes tasks
# 5. Junior executes in parallel
# 6. Ralph Loop continues until completion
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

### Autopilot (5-Phase Workflow)

```bash
# Run complete workflow from request to validated code
/autopilot Add user authentication with JWT

# Phases:
# 0. Expansion - Metis creates spec (.sisyphus/specs/)
# 1. Planning - Prometheus + Momus create plan
# 2. Execution - Atlas/Swarm execute tasks
# 3. QA - Build, lint, tests must pass
# 4. Validation - Oracle security review
```

### Swarm (Parallel Agents)

```bash
# Launch multiple agents with atomic task claiming
/swarm 5:junior "Implement all API endpoints"

# Workflow:
# 1. Tasks are stored in SQLite database
# 2. Agents atomically claim tasks (no duplicates)
# 3. Heartbeat mechanism detects stale agents
# 4. Stale tasks are recovered and re-assigned
```

### Ecomode (Resource Efficiency)

```bash
# Enable ecomode for cost-effective execution
/ecomode on

# Effects:
# - junior → junior-low (Haiku instead of Sonnet)
# - oracle → oracle-low (Haiku instead of Sonnet)
# - Skip Metis/Momus analysis phases
# - Shorter responses

# Disable ecomode
/ecomode off
```

---

## Architecture

```
Planning Phase:
User → Sisyphus → [Metis(GPT-5.2)] → Prometheus → [Momus(Codex-5.2)] → Plan File

Execution Phase:
Plan File → /ultrawork → Atlas → [Oracle, Explore, Multimodal-looker, Librarian, Junior]
```

```
User Request
     │
     ▼
┌─────────────────┐
│    Sisyphus     │ (Primary AI)
│  (Claude Opus)  │
└────────┬────────┘
         │
    ┌────┴────────────────────────┐
    │                             │
    ▼                             ▼
┌─────────────┐           ┌─────────────┐
│   Planning  │           │  Execution  │
│    Phase    │           │    Phase    │
└─────┬───────┘           └──────┬──────┘
      │                          │
      ▼                          ▼
┌─────────────────┐       ┌─────────────┐
│   Prometheus    │       │   Atlas     │ (Orchestrator)
│   (Opus)        │       │  (Sonnet)   │
├─────────────────┤       └──────┬──────┘
│ Metis → GPT-5.2 │              │
│      (xhigh)    │   ┌──────────┼──────────┐
├─────────────────┤   ▼          ▼          ▼
│ Momus → Codex   │ ┌──────┐ ┌───────┐ ┌──────────┐
│   5.2 (xhigh)   │ │Junior│ │Oracle │ │Librarian │
└─────────────────┘ │Sonnet│ │Sonnet │ │ Haiku    │
                    └──────┘ └───┬───┘ └────┬─────┘
                                 │          │
                                 ▼          ▼
                            ┌────────┐ ┌────────┐
                            │ Codex  │ │GLM-4.7 │
                            │ (GPT)  │ │ (Z.ai) │
                            └────────┘ └────────┘
```

### Agent Model Summary

| Agent | Base | External | Reasoning |
|-------|------|----------|-----------|
| Sisyphus | Opus | - | - |
| Atlas | Sonnet | - | - |
| Prometheus | Opus | - | - |
| **Metis** | Haiku | GPT-5.2 | **xhigh** |
| **Momus** | Haiku | Codex-5.2 | **xhigh** |
| Oracle | Sonnet | Codex | default |
| Debate | Opus | GPT-5.2, Gemini | - |
| Explore | Haiku | - | - |
| Multimodal-looker | Sonnet | Gemini | - |
| Librarian | Haiku | GLM-4.7 | - |
| Junior | Sonnet | - | - |

---

## Credits

- **[oh-my-opencode](https://github.com/sisyphus-labs/oh-my-opencode)** by Sisyphus Labs - Base architecture
- **[oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)** by Yeachan Heo (MIT License) - Tier-based Model Routing, Swarm, Ecomode, Autopilot features

## License

[Sustainable Use License](./LICENSE)
