#!/usr/bin/env node

/**
 * LSP Tools MCP Server
 *
 * Provides LSP (Language Server Protocol) and AST-Grep functionality
 * as MCP tools for Claude Code.
 *
 * Tools:
 * - lsp_goto_definition: Go to symbol definition
 * - lsp_find_references: Find all references to a symbol
 * - lsp_symbols: List symbols in a file or workspace
 * - lsp_diagnostics: Get type check and lint errors
 * - lsp_rename: Safely rename a symbol across files
 * - ast_grep_search: Search code using AST patterns
 * - ast_grep_replace: Replace code using AST patterns
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { spawn } from "child_process";
import { readFile } from "fs/promises";
import { extname } from "path";
import { z } from "zod";

// Language server configurations
const LANGUAGE_SERVERS = {
  typescript: {
    command: "npx",
    args: ["typescript-language-server", "--stdio"],
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  python: {
    command: "pylsp",
    args: [],
    extensions: [".py"],
  },
  rust: {
    command: "rust-analyzer",
    args: [],
    extensions: [".rs"],
  },
  go: {
    command: "gopls",
    args: ["serve"],
    extensions: [".go"],
  },
};

// Active language server processes
const activeServers = new Map();

/**
 * Get or start a language server for the given file type
 */
async function getLanguageServer(filePath) {
  const ext = extname(filePath);

  for (const [name, config] of Object.entries(LANGUAGE_SERVERS)) {
    if (config.extensions.includes(ext)) {
      if (!activeServers.has(name)) {
        try {
          const proc = spawn(config.command, config.args, {
            stdio: ["pipe", "pipe", "pipe"],
          });

          const entry = {
            process: proc,
            name,
            initialized: false,
          };

          activeServers.set(name, entry);

          proc.on("error", (err) => {
            console.error(`Language server ${name} error:`, err);
            activeServers.delete(name);
          });

          proc.on("exit", () => {
            activeServers.delete(name);
          });

          // Initialize LSP handshake
          const initResult = await sendLspRequest(entry, "initialize", {
            processId: null,
            capabilities: {},
            rootUri: null,
          });
          // Send initialized notification (no response expected)
          const notif = JSON.stringify({ jsonrpc: "2.0", method: "initialized", params: {} });
          proc.stdin.write(`Content-Length: ${Buffer.byteLength(notif)}\r\n\r\n${notif}`);
          entry.initialized = true;
        } catch (err) {
          console.error(`Failed to start ${name} language server:`, err);
          activeServers.delete(name);
          return null;
        }
      }

      return activeServers.get(name);
    }
  }

  return null;
}

/**
 * Send LSP request and wait for response
 */
async function sendLspRequest(server, method, params) {
  return new Promise((resolve, reject) => {
    const id = Date.now();
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const content = JSON.stringify(request);
    const message = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;

    let responseBuffer = "";

    const onData = (data) => {
      responseBuffer += data.toString();

      const headerEnd = responseBuffer.indexOf("\r\n\r\n");
      if (headerEnd !== -1) {
        const header = responseBuffer.slice(0, headerEnd);
        const contentLengthMatch = header.match(/Content-Length: (\d+)/);

        if (contentLengthMatch) {
          const contentLength = parseInt(contentLengthMatch[1]);
          const bodyStart = headerEnd + 4;
          const body = responseBuffer.slice(bodyStart, bodyStart + contentLength);

          if (body.length >= contentLength) {
            server.process.stdout.off("data", onData);
            try {
              const response = JSON.parse(body);
              if (response.id === id) {
                if (response.error) {
                  reject(new Error(response.error.message));
                } else {
                  resolve(response.result);
                }
              }
            } catch (err) {
              reject(err);
            }
          }
        }
      }
    };

    server.process.stdout.on("data", onData);
    server.process.stdin.write(message);

    setTimeout(() => {
      server.process.stdout.off("data", onData);
      reject(new Error("LSP request timeout"));
    }, 30000);
  });
}

/**
 * Get language ID from file extension
 */
function getLanguageId(filePath) {
  const ext = extname(filePath);
  const mapping = {
    ".ts": "typescript",
    ".tsx": "typescriptreact",
    ".js": "javascript",
    ".jsx": "javascriptreact",
    ".py": "python",
    ".rs": "rust",
    ".go": "go",
  };
  return mapping[ext] || "plaintext";
}

/**
 * Run ast-grep CLI command
 */
async function runAstGrep(args) {
  return new Promise((resolve, reject) => {
    const process = spawn("ast-grep", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(stdout || "No matches found");
      } else {
        reject(new Error(stderr || `ast-grep exited with code ${code}`));
      }
    });

    process.on("error", (err) => {
      reject(new Error(`Failed to run ast-grep: ${err.message}. Make sure ast-grep is installed.`));
    });
  });
}

// Initialize the MCP server
const server = new McpServer({
  name: "lsp-tools",
  version: "1.0.0",
});

// Register tools
server.tool(
  "lsp_goto_definition",
  "Go to the definition of a symbol at the given position",
  {
    file_path: z.string().describe("Absolute path to the file"),
    line: z.number().describe("Line number (0-indexed)"),
    character: z.number().describe("Character position (0-indexed)"),
  },
  async ({ file_path, line, character }) => {
    const ls = await getLanguageServer(file_path);
    if (!ls) {
      return { content: [{ type: "text", text: `No language server available for ${file_path}` }] };
    }

    const result = await sendLspRequest(ls, "textDocument/definition", {
      textDocument: { uri: `file://${file_path}` },
      position: { line, character },
    });

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "lsp_find_references",
  "Find all references to a symbol at the given position",
  {
    file_path: z.string().describe("Absolute path to the file"),
    line: z.number().describe("Line number (0-indexed)"),
    character: z.number().describe("Character position (0-indexed)"),
    include_declaration: z.boolean().optional().default(true).describe("Include the declaration in results"),
  },
  async ({ file_path, line, character, include_declaration }) => {
    const ls = await getLanguageServer(file_path);
    if (!ls) {
      return { content: [{ type: "text", text: `No language server available for ${file_path}` }] };
    }

    const result = await sendLspRequest(ls, "textDocument/references", {
      textDocument: { uri: `file://${file_path}` },
      position: { line, character },
      context: { includeDeclaration: include_declaration },
    });

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "lsp_symbols",
  "List symbols in a file or search workspace symbols",
  {
    file_path: z.string().describe("Path to file (for document symbols) or workspace root"),
    query: z.string().optional().describe("Search query for workspace symbols"),
  },
  async ({ file_path, query }) => {
    const ls = await getLanguageServer(file_path);
    if (!ls) {
      return { content: [{ type: "text", text: `No language server available for ${file_path}` }] };
    }

    let result;
    if (query) {
      result = await sendLspRequest(ls, "workspace/symbol", { query });
    } else {
      result = await sendLspRequest(ls, "textDocument/documentSymbol", {
        textDocument: { uri: `file://${file_path}` },
      });
    }

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "lsp_diagnostics",
  "Get diagnostics (errors, warnings) for a file",
  {
    file_path: z.string().describe("Absolute path to the file"),
  },
  async ({ file_path }) => {
    const ls = await getLanguageServer(file_path);
    if (!ls) {
      return { content: [{ type: "text", text: `No language server available for ${file_path}` }] };
    }

    const fileContent = await readFile(file_path, "utf-8");

    // didOpen is a notification (no id, no response expected)
    const notif = JSON.stringify({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri: `file://${file_path}`,
          languageId: getLanguageId(file_path),
          version: 1,
          text: fileContent,
        },
      },
    });
    ls.process.stdin.write(`Content-Length: ${Buffer.byteLength(notif)}\r\n\r\n${notif}`);

    // Wait for diagnostics to be computed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Request diagnostics via pull model (3.17+), fall back to message
    try {
      const result = await sendLspRequest(ls, "textDocument/diagnostic", {
        textDocument: { uri: `file://${file_path}` },
      });
      const items = result?.items || [];
      if (items.length === 0) {
        return { content: [{ type: "text", text: "No diagnostics found." }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
    } catch {
      return { content: [{ type: "text", text: "Diagnostics published via push notifications. Server does not support pull diagnostics." }] };
    }
  }
);

server.tool(
  "lsp_rename",
  "Rename a symbol at the given position across all files",
  {
    file_path: z.string().describe("Absolute path to the file"),
    line: z.number().describe("Line number (0-indexed)"),
    character: z.number().describe("Character position (0-indexed)"),
    new_name: z.string().describe("New name for the symbol"),
  },
  async ({ file_path, line, character, new_name }) => {
    const ls = await getLanguageServer(file_path);
    if (!ls) {
      return { content: [{ type: "text", text: `No language server available for ${file_path}` }] };
    }

    const result = await sendLspRequest(ls, "textDocument/rename", {
      textDocument: { uri: `file://${file_path}` },
      position: { line, character },
      newName: new_name,
    });

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "ast_grep_search",
  "Search code using AST patterns",
  {
    pattern: z.string().describe("AST-grep pattern to search for"),
    path: z.string().describe("Directory or file path to search in"),
    language: z.string().optional().describe("Language (typescript, javascript, python, rust, go)"),
  },
  async ({ pattern, path }) => {
    try {
      const result = await runAstGrep(["--pattern", pattern, path, "--json"]);
      return { content: [{ type: "text", text: result }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  }
);

server.tool(
  "ast_grep_replace",
  "Replace code using AST patterns",
  {
    pattern: z.string().describe("AST-grep pattern to match"),
    replacement: z.string().describe("Replacement pattern"),
    path: z.string().describe("Directory or file path to apply replacement"),
    language: z.string().optional().describe("Language (typescript, javascript, python, rust, go)"),
    dry_run: z.boolean().optional().default(true).describe("Preview changes without applying"),
  },
  async ({ pattern, replacement, path, dry_run }) => {
    try {
      const cliArgs = ["--pattern", pattern, "--rewrite", replacement, path];
      if (dry_run !== false) {
        cliArgs.push("--dry-run");
      }
      const result = await runAstGrep(cliArgs);
      return { content: [{ type: "text", text: result }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LSP Tools MCP Server running on stdio");
}

main().catch(console.error);
