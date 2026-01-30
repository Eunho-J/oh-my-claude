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

import { Server } from "@anthropic-ai/mcp";
import { spawn } from "child_process";
import { readFile, readdir, stat } from "fs/promises";
import { join, dirname, extname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
          const process = spawn(config.command, config.args, {
            stdio: ["pipe", "pipe", "pipe"],
          });

          activeServers.set(name, {
            process,
            name,
            initialized: false,
          });

          // Handle process errors
          process.on("error", (err) => {
            console.error(`Language server ${name} error:`, err);
            activeServers.delete(name);
          });

          process.on("exit", () => {
            activeServers.delete(name);
          });
        } catch (err) {
          console.error(`Failed to start ${name} language server:`, err);
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

      // Parse LSP response
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

    // Timeout after 30 seconds
    setTimeout(() => {
      server.process.stdout.off("data", onData);
      reject(new Error("LSP request timeout"));
    }, 30000);
  });
}

/**
 * Initialize the MCP server
 */
const server = new Server({
  name: "lsp-tools",
  version: "1.0.0",
});

// Tool definitions
const tools = [
  {
    name: "lsp_goto_definition",
    description: "Go to the definition of a symbol at the given position",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to the file",
        },
        line: {
          type: "number",
          description: "Line number (0-indexed)",
        },
        character: {
          type: "number",
          description: "Character position (0-indexed)",
        },
      },
      required: ["file_path", "line", "character"],
    },
  },
  {
    name: "lsp_find_references",
    description: "Find all references to a symbol at the given position",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to the file",
        },
        line: {
          type: "number",
          description: "Line number (0-indexed)",
        },
        character: {
          type: "number",
          description: "Character position (0-indexed)",
        },
        include_declaration: {
          type: "boolean",
          description: "Include the declaration in results",
          default: true,
        },
      },
      required: ["file_path", "line", "character"],
    },
  },
  {
    name: "lsp_symbols",
    description: "List symbols in a file or search workspace symbols",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to file (for document symbols) or workspace root (for workspace symbols)",
        },
        query: {
          type: "string",
          description: "Search query for workspace symbols (optional)",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "lsp_diagnostics",
    description: "Get diagnostics (errors, warnings) for a file",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to the file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "lsp_rename",
    description: "Rename a symbol at the given position across all files",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to the file",
        },
        line: {
          type: "number",
          description: "Line number (0-indexed)",
        },
        character: {
          type: "number",
          description: "Character position (0-indexed)",
        },
        new_name: {
          type: "string",
          description: "New name for the symbol",
        },
      },
      required: ["file_path", "line", "character", "new_name"],
    },
  },
  {
    name: "ast_grep_search",
    description: "Search code using AST patterns",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "AST-grep pattern to search for",
        },
        path: {
          type: "string",
          description: "Directory or file path to search in",
        },
        language: {
          type: "string",
          description: "Language (typescript, javascript, python, rust, go, etc.)",
        },
      },
      required: ["pattern", "path"],
    },
  },
  {
    name: "ast_grep_replace",
    description: "Replace code using AST patterns",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "AST-grep pattern to match",
        },
        replacement: {
          type: "string",
          description: "Replacement pattern",
        },
        path: {
          type: "string",
          description: "Directory or file path to apply replacement",
        },
        language: {
          type: "string",
          description: "Language (typescript, javascript, python, rust, go, etc.)",
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying",
          default: true,
        },
      },
      required: ["pattern", "replacement", "path"],
    },
  },
];

// Register tools
server.setRequestHandler("tools/list", async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "lsp_goto_definition": {
        const ls = await getLanguageServer(args.file_path);
        if (!ls) {
          return {
            content: [
              {
                type: "text",
                text: `No language server available for ${args.file_path}`,
              },
            ],
          };
        }

        const result = await sendLspRequest(ls, "textDocument/definition", {
          textDocument: { uri: `file://${args.file_path}` },
          position: { line: args.line, character: args.character },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "lsp_find_references": {
        const ls = await getLanguageServer(args.file_path);
        if (!ls) {
          return {
            content: [
              {
                type: "text",
                text: `No language server available for ${args.file_path}`,
              },
            ],
          };
        }

        const result = await sendLspRequest(ls, "textDocument/references", {
          textDocument: { uri: `file://${args.file_path}` },
          position: { line: args.line, character: args.character },
          context: { includeDeclaration: args.include_declaration !== false },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "lsp_symbols": {
        const ls = await getLanguageServer(args.file_path);
        if (!ls) {
          return {
            content: [
              {
                type: "text",
                text: `No language server available for ${args.file_path}`,
              },
            ],
          };
        }

        let result;
        if (args.query) {
          result = await sendLspRequest(ls, "workspace/symbol", {
            query: args.query,
          });
        } else {
          result = await sendLspRequest(ls, "textDocument/documentSymbol", {
            textDocument: { uri: `file://${args.file_path}` },
          });
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "lsp_diagnostics": {
        // For diagnostics, we need to trigger a check and wait for publishDiagnostics
        // This is a simplified implementation
        const ls = await getLanguageServer(args.file_path);
        if (!ls) {
          return {
            content: [
              {
                type: "text",
                text: `No language server available for ${args.file_path}`,
              },
            ],
          };
        }

        // Read file and send didOpen to trigger diagnostics
        const content = await readFile(args.file_path, "utf-8");
        await sendLspRequest(ls, "textDocument/didOpen", {
          textDocument: {
            uri: `file://${args.file_path}`,
            languageId: getLanguageId(args.file_path),
            version: 1,
            text: content,
          },
        });

        // Wait a bit for diagnostics
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return {
          content: [
            {
              type: "text",
              text: "Diagnostics published. Check the language server output.",
            },
          ],
        };
      }

      case "lsp_rename": {
        const ls = await getLanguageServer(args.file_path);
        if (!ls) {
          return {
            content: [
              {
                type: "text",
                text: `No language server available for ${args.file_path}`,
              },
            ],
          };
        }

        const result = await sendLspRequest(ls, "textDocument/rename", {
          textDocument: { uri: `file://${args.file_path}` },
          position: { line: args.line, character: args.character },
          newName: args.new_name,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "ast_grep_search": {
        // Use ast-grep CLI for searching
        const result = await runAstGrep(["--pattern", args.pattern, args.path, "--json"]);
        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      }

      case "ast_grep_replace": {
        const cliArgs = [
          "--pattern",
          args.pattern,
          "--rewrite",
          args.replacement,
          args.path,
        ];

        if (args.dry_run !== false) {
          cliArgs.push("--dry-run");
        }

        const result = await runAstGrep(cliArgs);
        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

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

// Start the server
async function main() {
  const transport = new (await import("@anthropic-ai/mcp")).StdioServerTransport();
  await server.connect(transport);
  console.error("LSP Tools MCP Server running on stdio");
}

main().catch(console.error);
