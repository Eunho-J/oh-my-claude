# oh-my-claude

Multi-agent orchestration system for Claude Code, porting [oh-my-opencode](https://github.com/anthropics/claude-code) features to Claude Code's native capabilities (MCP, Hooks, Skills, Agents).

## Features

- **Multi-Agent Orchestration**: Atlas (orchestrator), Prometheus (planner), Oracle (architecture advisor), Frontend (UI/UX), Librarian (documentation search), Junior (task executor)
- **External Model Integration**: GPT-5.2-Codex, Google Gemini, GLM-4.7 via MCP
- **Ralph Loop**: Auto-continuation until task completion
- **Todo Enforcer**: Prevents stopping with incomplete tasks
- **Visual Verification Loop**: Frontend agent uses Gemini for UI screenshot analysis
- **Skill System**: ultrawork, git-master, frontend-ui-ux, playwright

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourname/oh-my-claude.git
cd oh-my-claude

# Run automated setup (see below)
# Then complete manual authentication steps
```

---

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

> **Note:** Execute each step sequentially (1.1 → 1.2 → 1.3 → ...). Do not skip steps.

### 1.1 Prerequisites Installation

```bash
# Install Node.js (v18+) - check if already installed
node --version || echo "Node.js not installed"

# Install Bun runtime (required for Gemini MCP)
curl -fsSL https://bun.sh/install | bash

# Verify Bun installation
bun --version
```

### 1.2 Project Directory Structure

```bash
# Create required directories
mkdir -p .claude/agents/{atlas,prometheus,oracle,frontend,librarian,junior}
mkdir -p .claude/skills/{ultrawork,git-master,frontend-ui-ux,playwright}
mkdir -p .sisyphus/{plans,notepads}
mkdir -p hooks
mkdir -p mcp-servers/lsp-tools
```

### 1.3 Install Global CLI Tools

```bash
# Install Codex CLI (for Oracle agent)
npm install -g codex

# Install Gemini CLI (for Frontend agent)
npm install -g @google/gemini-cli

# Install Playwright (for browser automation skill)
npx playwright install
```

### 1.4 Install Local Dependencies

```bash
# Install MCP server dependencies (uses package.json)
cd mcp-servers/lsp-tools
npm install
cd ../..
```

**Note:** The LSP MCP server uses `@modelcontextprotocol/sdk` for MCP protocol support.

### 1.5 Copy Configuration Files

The following files should be created/copied to the project root:

#### `.mcp.json`
```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "Authorization": "Bearer ${CONTEXT7_API_KEY}"
      }
    },
    "grep-app": {
      "type": "http",
      "url": "https://grep.app/api/mcp"
    },
    "lsp-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-servers/lsp-tools/index.js"]
    },
    "codex": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codex", "mcp-server"]
    },
    "gemini": {
      "type": "stdio",
      "command": "bunx",
      "args": ["mcp-gemini-cli"]
    },
    "zai-glm": {
      "type": "http",
      "url": "https://api.z.ai/mcp",
      "headers": {
        "Authorization": "Bearer ${ZAI_API_KEY}"
      }
    }
  }
}
```

#### `.claude/settings.json`
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "./hooks/ralph-loop.sh", "timeout": 10 },
          { "type": "command", "command": "./hooks/todo-enforcer.sh", "timeout": 10 }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "./hooks/comment-checker.sh", "timeout": 30 }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "./hooks/delegation-guard.sh", "timeout": 5 }
        ]
      }
    ]
  }
}
```

### 1.6 Make Hook Scripts Executable

```bash
chmod +x hooks/*.sh
```

### 1.7 Initialize State Files

```bash
# Create initial boulder.json
cat > .sisyphus/boulder.json << 'EOF'
{
  "status": "idle",
  "task": null,
  "pending_tasks": 0,
  "completed_tasks": 0
}
EOF

# Create initial ralph-state.json
cat > .sisyphus/ralph-state.json << 'EOF'
{
  "active": false,
  "iteration": 0,
  "max_iterations": 50,
  "completion_promise": null,
  "started_at": null
}
EOF
```

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
export ZAI_API_KEY="your-zai-api-key"
```

**Where to get API keys:**
- **CONTEXT7_API_KEY**: https://context7.com/ (Sign up for API access)
- **ZAI_API_KEY**: https://z.ai/ (Subscribe to Coding Plan - $3/month)

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
echo $ZAI_API_KEY
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

| File | Description |
|------|-------------|
| `.claude/agents/atlas/AGENT.md` | Master orchestrator |
| `.claude/agents/prometheus/AGENT.md` | Strategic planner |
| `.claude/agents/oracle/AGENT.md` | Architecture advisor (uses Codex) |
| `.claude/agents/frontend/AGENT.md` | UI/UX expert (uses Gemini) |
| `.claude/agents/librarian/AGENT.md` | Documentation search (uses GLM-4.7) |
| `.claude/agents/junior/AGENT.md` | Task executor |

### Skills

| File | Description |
|------|-------------|
| `.claude/skills/ultrawork/SKILL.md` | Auto-parallel execution |
| `.claude/skills/git-master/SKILL.md` | Git expert |
| `.claude/skills/frontend-ui-ux/SKILL.md` | UI/UX design patterns |
| `.claude/skills/playwright/SKILL.md` | Browser automation |

### Hooks

| File | Event | Description |
|------|-------|-------------|
| `hooks/ralph-loop.sh` | Stop | Auto-continuation loop |
| `hooks/todo-enforcer.sh` | Stop | Prevents stopping with incomplete tasks |
| `hooks/comment-checker.sh` | PostToolUse | Warns about unnecessary comments |
| `hooks/delegation-guard.sh` | PreToolUse | Prevents Atlas from direct code edits |

### State Files

| File | Description |
|------|-------------|
| `.sisyphus/boulder.json` | Current work status |
| `.sisyphus/ralph-state.json` | Ralph loop state |
| `.sisyphus/plans/` | Prometheus plan files |
| `.sisyphus/notepads/` | Atlas learning records |

---

## Usage

### Basic Commands

```bash
# Start Claude Code
claude

# Invoke specific agent
@atlas - Master orchestrator
@prometheus - Strategic planner
@oracle - Architecture advisor
@frontend - UI/UX expert
@librarian - Documentation search
@junior - Task executor

# Invoke skills
/ultrawork - Auto-parallel execution
/git-master - Git operations
/frontend-ui-ux - UI/UX guidance
/playwright - Browser automation
```

### Ultrawork Mode

```bash
# Trigger ultrawork for complex tasks
ulw Add complete authentication system with JWT

# This will:
# 1. Prometheus creates a plan
# 2. Atlas distributes tasks
# 3. Junior/Frontend execute in parallel
# 4. Ralph Loop continues until completion
```

### Visual Verification (Frontend)

```bash
# Frontend agent can verify UI implementation
@frontend Implement this design mockup and verify it matches

# Workflow:
# 1. Implement UI code
# 2. Screenshot with Playwright
# 3. Analyze with Gemini (mcp__gemini__analyzeFile)
# 4. Fix issues and repeat
```

---

## Architecture

```
User Request
     │
     ▼
┌─────────────────┐
│     Atlas       │ (Orchestrator)
│  (Claude Opus)  │
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────────┐
│Junior │ │Oracle │ │Frontend│ │Librarian │
│(Sonnet)│ │(Sonnet)│ │(Sonnet)│ │(Haiku)   │
└───────┘ └───┬───┘ └───┬───┘ └─────┬─────┘
              │         │           │
              ▼         ▼           ▼
         ┌────────┐ ┌────────┐ ┌────────┐
         │ Codex  │ │ Gemini │ │GLM-4.7 │
         │(GPT)   │ │(Google)│ │ (Z.ai) │
         └────────┘ └────────┘ └────────┘
```

---

## License

MIT
