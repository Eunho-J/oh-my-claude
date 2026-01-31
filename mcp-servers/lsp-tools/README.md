# LSP Tools MCP Server

LSP (Language Server Protocol) and AST-Grep tools MCP server for Claude Code.

## Installation

```bash
cd mcp-servers/lsp-tools
npm install
```

### Optional Dependencies

To use AST-Grep features:
```bash
# Install from npm (Node.js bindings)
npm install @ast-grep/napi

# Or install CLI
cargo install ast-grep
# Or
brew install ast-grep
```

### Language Server Installation

You need a language server for each language:

**TypeScript/JavaScript:**
```bash
npm install -g typescript-language-server typescript
```

**Python:**
```bash
pip install python-lsp-server
```

**Rust:**
```bash
rustup component add rust-analyzer
```

**Go:**
```bash
go install golang.org/x/tools/gopls@latest
```

## Usage

Run as MCP server:
```bash
node index.js
```

## Tools

### lsp_goto_definition

Go to the definition of a symbol.

```json
{
  "file_path": "/path/to/file.ts",
  "line": 10,
  "character": 5
}
```

### lsp_find_references

Find all references to a symbol.

```json
{
  "file_path": "/path/to/file.ts",
  "line": 10,
  "character": 5,
  "include_declaration": true
}
```

### lsp_symbols

Return a list of symbols in a file or workspace.

```json
{
  "file_path": "/path/to/file.ts",
  "query": "function"
}
```

### lsp_diagnostics

Return diagnostics (errors, warnings) for a file.

```json
{
  "file_path": "/path/to/file.ts"
}
```

### lsp_rename

Safely rename a symbol.

```json
{
  "file_path": "/path/to/file.ts",
  "line": 10,
  "character": 5,
  "new_name": "newFunctionName"
}
```

### ast_grep_search

Search code using AST patterns.

```json
{
  "pattern": "console.log($$$)",
  "path": "/path/to/search",
  "language": "typescript"
}
```

### ast_grep_replace

Replace code using AST patterns.

```json
{
  "pattern": "console.log($MSG)",
  "replacement": "logger.info($MSG)",
  "path": "/path/to/apply",
  "language": "typescript",
  "dry_run": true
}
```

## AST-Grep Pattern Examples

### Basic Patterns

```
// Match function call
console.log($ARG)

// Match multiple arguments
console.log($$$)

// Method chain
$OBJ.then($CALLBACK).catch($HANDLER)
```

### Advanced Patterns

```
// Match specific type
function $NAME($$$PARAMS): $RETURN_TYPE { $$$ }

// Match conditional
if ($CONDITION) { $$$BODY }

// Match class method
class $NAME {
  $METHOD($$$PARAMS) { $$$BODY }
}
```

## Troubleshooting

### Language server won't start

1. Verify the language server is installed
2. Verify the language server executable is in PATH
3. Check logs: `stderr` output

### AST-Grep errors

1. Verify `ast-grep` CLI is installed
2. Verify the language is supported

## License

MIT
