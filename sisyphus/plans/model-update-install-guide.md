# Model Update & Installation Guide Enhancement

## Context
Update all external model references across the codebase and enhance the installation guide with:
1. jq prerequisite
2. mcp-gemini-cli (choplin/mcp-gemini-cli) install info
3. `claude mcp add` for global installation
4. Local vs global install choice
5. Model name updates: GPT/Codex → gpt-5.3-codex, Gemini → gemini-3-pro-preview, GLM → glm-5

## Model Name Mapping

| Old Name | New Name | Context |
|----------|----------|---------|
| GPT-5.2 | GPT-5.3-Codex | Metis, Debate descriptions |
| Codex-5.2 | GPT-5.3-Codex | Momus descriptions |
| GPT-5.2-Codex | GPT-5.3-Codex | Oracle descriptions |
| gpt-5.2 | gpt-5.3-codex | model parameter in mcp calls |
| gpt-5.2-codex | gpt-5.3-codex | model parameter in mcp calls |
| gpt-5.1-codex-max | gpt-5.3-codex | Oracle fallback (remove old variants) |
| gpt-5.1-codex-mini | gpt-5.3-codex | Oracle fallback (remove old variants) |
| gemini-2.5-pro | gemini-3-pro-preview | Gemini model parameter |
| gemini-2.5-flash | gemini-3-pro-preview | Gemini model fallback |
| GLM-4.7 / glm-4.7 | GLM-5 / glm-5 | GLM model name |
| glm-4.6v | glm-5 | GLM fallback variant |

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Core model router (other files reference it) |
| Task 2 | None | Python server (independent) |
| Task 3 | None | Agent files (independent) |
| Task 4 | None | Documentation (independent) |
| Task 5 | None | Installation guide updates (independent) |

## Parallel Execution Graph

Wave 1 (All parallel):
├── Task 1: Update model-router.js
├── Task 2: Update zai-glm server.py
├── Task 3: Update all agent AGENT.md files
├── Task 4: Update CLAUDE.md documentation
└── Task 5: Update README.md (install guide + model refs)

## Tasks

### Task 1: Update model-router.js
**Description**: Update the central model routing logic
**Agent**: junior
**File**: `mcp-servers/chronos/lib/model-router.js`
**Changes**:
- Line 8: `Code analysis/review → Codex (GPT)` → keep as-is (generic)
- Line 9: `Architecture decisions → Codex (xhigh reasoning)` → keep as-is
- Line 11: `Documentation search → GLM-4.7` → `Documentation search → GLM-5`
- Line 41: `GLM: "glm-4.7"` → `GLM: "glm-5"`
- Line 213: `"GPT-5.2 with xhigh reasoning for pre-planning analysis"` → `"GPT-5.3-Codex with xhigh reasoning for pre-planning analysis"`
- Line 219: `"Codex-5.2 with xhigh reasoning for plan review"` → `"GPT-5.3-Codex with xhigh reasoning for plan review"`
- Line 227: `"Codex for architecture advice (Haiku in ecomode)"` → `"GPT-5.3-Codex for architecture advice (Haiku in ecomode)"`
- Line 241: `"GLM-4.7 for documentation and code search"` → `"GLM-5 for documentation and code search"`
- Line 311: `"Multi-model debate (Opus + GPT + Gemini)"` → keep (generic)
- Line 356: `model === MODELS.CODEX_XHIGH ? "gpt-5.2-codex" : undefined` → `model === MODELS.CODEX_XHIGH ? "gpt-5.3-codex" : undefined`
- Line 384: `model: "glm-4.7"` → `model: "glm-5"`
**Acceptance Criteria**:
- All model name references updated
- No syntax errors

### Task 2: Update zai-glm server.py
**Description**: Update GLM model defaults in Python MCP server
**Agent**: junior-low
**File**: `mcp-servers/zai-glm/server.py`
**Changes**:
- Line 16: `model: str = "glm-4.7"` → `model: str = "glm-5"`
- Line 23: `model: Model name (glm-4.7 or glm-4.6v)` → `model: Model name (default: glm-5)`
- Line 59: `model="glm-4.7"` → `model="glm-5"`
**Acceptance Criteria**:
- Default model is glm-5
- No Python syntax errors

### Task 3: Update all agent AGENT.md files
**Description**: Update model references in all agent definition files
**Agent**: junior
**Files and changes**:

**metis/AGENT.md**:
- Line 3 (frontmatter): `GPT-5.2 (xhigh reasoning)` → `GPT-5.3-Codex (xhigh reasoning)`
- Line 22: `GPT-5.2 with xhigh reasoning effort` → `GPT-5.3-Codex with xhigh reasoning effort`
- Line 26: `delegates ALL analysis to GPT-5.2` → `delegates ALL analysis to GPT-5.3-Codex`
- Line 27: `leveraging GPT-5.2's superior reasoning` → `leveraging GPT-5.3-Codex's superior reasoning`
- Line 31: `Use GPT-5.2 for ALL` → `Use GPT-5.3-Codex for ALL`
- Line 33: `How to Call GPT-5.2` → `How to Call GPT-5.3-Codex`
- Line 38: `model: "gpt-5.2"` → `model: "gpt-5.3-codex"`
- Line 46: `When to Use GPT-5.2` → `When to Use GPT-5.3-Codex`
- Line 58: `GPT-5.2 First` → `GPT-5.3-Codex First`

**momus/AGENT.md**:
- Line 3 (frontmatter): `Codex-5.2 (xhigh reasoning)` → `GPT-5.3-Codex (xhigh reasoning)`
- Line 20: `Codex-5.2 with xhigh reasoning effort` → `GPT-5.3-Codex with xhigh reasoning effort`
- Line 24: `delegates ALL reviews to Codex-5.2` → `delegates ALL reviews to GPT-5.3-Codex`
- Line 25: `leveraging Codex-5.2's code understanding` → `leveraging GPT-5.3-Codex's code understanding`
- Line 29: `Use Codex-5.2 for ALL` → `Use GPT-5.3-Codex for ALL`
- Line 31: `How to Call Codex-5.2` → `How to Call GPT-5.3-Codex`
- Line 36: `model: "gpt-5.2-codex"` → `model: "gpt-5.3-codex"`
- Line 69: `CODEX-5.2 FIRST` → `GPT-5.3-CODEX FIRST`
- Line 154: `Using Codex-5.2` → `Using GPT-5.3-Codex`
- Line 156: `ALWAYS use Codex-5.2` → `ALWAYS use GPT-5.3-Codex`
- Line 170: `model: "gpt-5.2-codex"` → `model: "gpt-5.3-codex"`
- Line 178: `Use Codex-5.2 for:` → `Use GPT-5.3-Codex for:`

**oracle/AGENT.md**:
- Line 3 (frontmatter): `GPT-5.2-Codex` → `GPT-5.3-Codex`
- Line 26: `GPT-5.2-Codex` → `GPT-5.3-Codex` (all occurrences)
- Line 36: `GPT-5.2-Codex` → `GPT-5.3-Codex`
- Line 57: `model: "gpt-5.2-codex"` → `model: "gpt-5.3-codex"`
- Lines 76-80: Model selection table - replace all variants:
  - `gpt-5.2-codex` → `gpt-5.3-codex` (default)
  - Remove `gpt-5.1-codex-max` and `gpt-5.1-codex-mini` rows (unified into gpt-5.3-codex)
- Line 185: `model: "gpt-5.2-codex"` → `model: "gpt-5.3-codex"`
- Line 204: `model: "gpt-5.2-codex"` → `model: "gpt-5.3-codex"`

**multimodal-looker/AGENT.md**:
- Line 59: `model: "gemini-2.5-pro"` → `model: "gemini-3-pro-preview"`
- Line 67: `model: "gemini-2.5-pro"` → `model: "gemini-3-pro-preview"`

**librarian/AGENT.md**:
- Line 3 (frontmatter): `GLM-4.7` → `GLM-5`
- Line 28: `GLM-4.7` → `GLM-5` (all occurrences)
- Line 39: `GLM-4.7's massive 200K context` → `GLM-5's massive 200K context`
- Line 41: `GLM-4.7 (via mcp__zai-glm__*)` → `GLM-5 (via mcp__zai-glm__*)`
- Line 52: `GLM-4.7 First` → `GLM-5 First`
- Line 91: `Z.ai GLM-4.7 - Large Context Analysis` → `Z.ai GLM-5 - Large Context Analysis`
- Line 100: `model: "glm-4.7"` → `model: "glm-5"`
- All other `GLM-4.7` → `GLM-5`

**debate/AGENT.md**:
- Line 3 (frontmatter): `GPT-5.2` → `GPT-5.3-Codex`
- Line 25: `GPT-5.2` → `GPT-5.3-Codex`
- Line 39: `GPT-5.2` → `GPT-5.3-Codex` and `model: "gpt-5.2"` → `model: "gpt-5.3-codex"`
- Line 59: `GPT-5.2 Analysis` → `GPT-5.3-Codex Analysis`
- Line 78: `model: "gpt-5.2"` → `model: "gpt-5.3-codex"`
- All occurrences of `GPT-5.2` in debate templates → `GPT-5.3-Codex`

**sisyphus/AGENT.md**:
- Line 27: `GPT-5.2 xhigh` → `GPT-5.3-Codex xhigh`

**prometheus/AGENT.md**:
- Line 32: `Codex-5.2 xhigh` → `GPT-5.3-Codex xhigh`

**atlas/AGENT.md**:
- Line 25: `Codex` → `GPT-5.3-Codex`
- Line 27: `GLM-4.7` → `GLM-5`

**Acceptance Criteria**:
- All model references updated consistently
- No markdown formatting broken

### Task 4: Update CLAUDE.md documentation
**Description**: Update model references in CLAUDE.md
**Agent**: junior
**File**: `CLAUDE.md`
**Changes**: Update ALL model name references following the mapping table above. Key areas:
- Architecture diagram (line 9): `GPT-5.2 xhigh` → `GPT-5.3-Codex xhigh`, `Codex-5.2 xhigh` → `GPT-5.3-Codex xhigh`
- External Model Integration section (lines 16-21)
- Agent table (lines 37-41)
- MCP Servers table (line 117): `GLM-4.7` → `GLM-5`
- Gemini MCP note about model: mention `gemini-3-pro-preview` as default
- External Model Routing table
- Junior Tier Routing table (no changes needed)
- Reasoning Effort Configuration section
- Autopilot model routing section
**Acceptance Criteria**:
- All model references consistent with new names
- Tables properly formatted

### Task 5: Update README.md (installation guide + model refs)
**Description**: Update README.md with jq prerequisite, mcp-gemini-cli info, claude mcp add for global, local vs global install guidance, and all model name references
**Agent**: junior
**File**: `README.md`
**Changes**:

**1. Add jq to Prerequisites (Section 1.2)**:
After uv check, add:
```bash
# Check jq
jq --version 2>/dev/null || echo "jq: NOT INSTALLED"
```
In install section, add:
```bash
# Install jq (required for hook scripts JSON processing)
# macOS
command -v jq >/dev/null || brew install jq
# Linux (Debian/Ubuntu)
# command -v jq >/dev/null || sudo apt install jq
# Linux (Fedora/RHEL)
# command -v jq >/dev/null || sudo dnf install jq
```

**2. Update Gemini CLI install info (Section 1.3)**:
Replace the Gemini CLI installation line with:
```bash
# Install mcp-gemini-cli (for Multimodal-looker agent)
# Source: https://github.com/choplin/mcp-gemini-cli
command -v gemini >/dev/null || npm install -g @google/gemini-cli
```

**3. Add Local vs Global install section (new section between 1.3 and 1.4)**:
Add a section explaining:
- **Local install**: Uses `.mcp.json` in project root (already configured)
- **Global install**: Uses `claude mcp add` command to register MCP servers globally
  ```bash
  # Example: Add Codex MCP globally
  claude mcp add codex -- npx -y codex mcp-server

  # Example: Add Gemini MCP globally (requires Bun)
  claude mcp add gemini -- bunx mcp-gemini-cli
  ```
- Mention that local `.mcp.json` is included in the repo and works out of the box
- Global install is useful when you want MCP servers available across all projects

**4. Update all model references**:
- `GPT-5.2` → `GPT-5.3-Codex` everywhere
- `Codex-5.2` → `GPT-5.3-Codex` everywhere
- `GLM-4.7` → `GLM-5` everywhere
- `gemini-2.5-pro` → `gemini-3-pro-preview` where model names appear
- Update Agent Model Summary table

**5. Update verification section (1.8)**:
Add jq check:
```bash
echo "jq: $(jq --version 2>/dev/null || echo 'NOT INSTALLED')"
```

**Acceptance Criteria**:
- jq in prerequisites
- mcp-gemini-cli info with choplin/mcp-gemini-cli link
- Local vs global install guidance with claude mcp add examples
- All model names updated
- Verification includes jq check

## Commit Strategy
Single commit: "feat: update external model defaults and enhance installation guide"

## Success Criteria
1. All model references updated consistently across all files
2. README.md has jq prerequisite, mcp-gemini-cli info, local/global install guide
3. No broken markdown formatting
4. model-router.js has no syntax errors
5. server.py has no syntax errors
