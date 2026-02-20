#!/usr/bin/env python3
"""
Z.ai GLM MCP Server
Wraps Z.ai API as MCP tools with session management
"""
import os
import uuid
import time
import json
from mcp.server.fastmcp import FastMCP
from zai import ZaiClient

# Initialize
mcp = FastMCP("zai-glm")
client = ZaiClient(api_key=os.environ.get("Z_AI_API_KEY"))

# Session storage: session_id -> {messages, model, created_at, last_used}
sessions: dict = {}


@mcp.tool()
def chat(prompt: str, system: str = None, model: str = "glm-4.7") -> str:
    """
    Chat with GLM model (200K context). Stateless — no session history.

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


@mcp.tool()
def session_create(session_id: str = None, system: str = None, model: str = "glm-4.7") -> str:
    """
    Create a new GLM chat session with persistent conversation history.

    Args:
        session_id: Optional custom session ID. Auto-generated (8-char UUID) if not provided.
        system: Optional system prompt for the session
        model: Model name (default: glm-4.7)

    Returns:
        Confirmation string with session ID
    """
    sid = session_id or str(uuid.uuid4())[:8]
    messages = []
    if system:
        messages.append({"role": "system", "content": system})

    sessions[sid] = {
        "messages": messages,
        "model": model,
        "created_at": time.time(),
        "last_used": time.time(),
    }
    return f"Session created: {sid}"


@mcp.tool()
def session_chat(session_id: str, message: str) -> str:
    """
    Send a message within a session, maintaining full conversation history.

    Args:
        session_id: Session ID returned by session_create
        message: User message to send

    Returns:
        GLM response
    """
    if session_id not in sessions:
        return f"Error: Session '{session_id}' not found. Use session_create to start one."

    session = sessions[session_id]
    session["messages"].append({"role": "user", "content": message})
    session["last_used"] = time.time()

    response = client.chat.completions.create(
        model=session["model"],
        messages=session["messages"]
    )

    reply = response.choices[0].message.content
    session["messages"].append({"role": "assistant", "content": reply})
    return reply


@mcp.tool()
def session_list() -> str:
    """
    List all active sessions with metadata.

    Returns:
        JSON array of session summaries
    """
    if not sessions:
        return "No active sessions."

    result = []
    for sid, session in sessions.items():
        msg_count = len(session["messages"])
        system_preview = next(
            (m["content"][:80] for m in session["messages"] if m["role"] == "system"),
            None
        )
        result.append({
            "id": sid,
            "model": session["model"],
            "turn_count": (msg_count - (1 if system_preview else 0)) // 2,
            "system": system_preview,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(session["created_at"])),
            "last_used": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(session["last_used"])),
        })

    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def session_delete(session_id: str) -> str:
    """
    Delete a session and its entire conversation history.

    Args:
        session_id: Session ID to delete
    """
    if session_id not in sessions:
        return f"Error: Session '{session_id}' not found."
    del sessions[session_id]
    return f"Session '{session_id}' deleted."


@mcp.tool()
def session_clear(session_id: str) -> str:
    """
    Clear conversation history of a session while preserving the session and system prompt.

    Args:
        session_id: Session ID to clear
    """
    if session_id not in sessions:
        return f"Error: Session '{session_id}' not found."

    session = sessions[session_id]
    session["messages"] = [m for m in session["messages"] if m["role"] == "system"]
    session["last_used"] = time.time()
    return f"Session '{session_id}' history cleared (system prompt preserved)."


if __name__ == "__main__":
    mcp.run()
