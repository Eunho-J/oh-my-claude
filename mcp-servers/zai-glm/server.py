#!/usr/bin/env python3
"""
Z.ai GLM MCP Server
Wraps Z.ai API as MCP tools
"""
import os
from mcp.server.fastmcp import FastMCP
from zai import ZaiClient

# Initialize
mcp = FastMCP("zai-glm")
client = ZaiClient(api_key=os.environ.get("Z_AI_API_KEY"))


@mcp.tool()
def chat(prompt: str, system: str = None, model: str = "glm-4.7") -> str:
    """
    Chat with GLM model (200K context).

    Args:
        prompt: The prompt to send
        system: Optional system prompt
        model: Model name (default: glm-4.7)
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(
        model=model,
        messages=messages
    )
    return response.choices[0].message.content


@mcp.tool()
def analyze_code(code: str, task: str, language: str = None) -> str:
    """
    Analyze code with GLM-4.7's 200K context window.

    Args:
        code: Code to analyze
        task: Analysis type (review, explain, optimize, security, refactor)
        language: Optional programming language hint
    """
    system_prompts = {
        "review": "You are a senior code reviewer. Provide detailed feedback.",
        "explain": "Explain this code clearly and concisely.",
        "optimize": "Suggest performance optimizations for this code.",
        "security": "Analyze this code for security vulnerabilities.",
        "refactor": "Suggest refactoring improvements for this code.",
    }

    system = system_prompts.get(task, system_prompts["review"])
    prompt = f"[{language}]\n{code}" if language else code

    response = client.chat.completions.create(
        model="glm-4.7",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content


if __name__ == "__main__":
    mcp.run()
