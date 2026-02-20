#!/usr/bin/env python3
"""
Gemini MCP Server
Custom Python FastMCP server for Google Gemini with session support.
Replaces mcp-gemini-cli npm package with native session management.

Uses the gemini CLI (from @google/gemini-cli) via subprocess.
Authentication: gemini auth login (OAuth, credentials in ~/.gemini/)
"""
import json
import subprocess
import time
import uuid
from typing import Optional

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("gemini")

# Session storage: our_session_id -> {gemini_session_id, model, system, history, created_at, last_used}
sessions: dict = {}


def _run_gemini(args: list, input_text: str = None, timeout: int = 120) -> subprocess.CompletedProcess:
    """Run gemini CLI and return CompletedProcess."""
    return subprocess.run(
        ["gemini"] + args,
        input=input_text,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def _parse_json_output(output: str) -> str:
    """Parse gemini --output-format json output, extracting response text."""
    output = output.strip()
    if not output:
        return ""
    try:
        data = json.loads(output)
        if isinstance(data, dict):
            return (
                data.get("response")
                or data.get("text")
                or data.get("content")
                or output
            )
        return output
    except json.JSONDecodeError:
        return output


def _parse_stream_json(output: str) -> tuple[str, Optional[str]]:
    """
    Parse stream-json JSONL output from gemini CLI.
    Returns (response_text, gemini_session_id).
    gemini_session_id is from the 'init' event; None if not found.
    """
    session_id = None
    content_parts = []

    for line in output.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
            event_type = event.get("type", "")
            if event_type == "init":
                session_id = event.get("session_id") or event.get("sessionId")
            elif event_type in ("content", "text", "chunk", "message"):
                val = (
                    event.get("value")
                    or event.get("text")
                    or event.get("content", "")
                )
                content_parts.append(val)
        except json.JSONDecodeError:
            if not line.startswith("{"):
                content_parts.append(line)

    return "".join(content_parts), session_id


# ─── Stateless tools (backward compatible with mcp-gemini-cli) ──────────────


@mcp.tool()
def chat(prompt: str, model: str = None, system: str = None, yolo: bool = True) -> str:
    """
    Chat with Gemini (stateless single call).

    Args:
        prompt: The prompt to send
        model: Optional model name override
        system: Optional system prompt (prepended to prompt)
        yolo: Auto-accept all actions (default: True)
    """
    args = ["--output-format", "json"]
    if model:
        args += ["-m", model]
    if yolo:
        args.append("--yolo")

    full_prompt = f"{system}\n\n{prompt}" if system else prompt
    result = _run_gemini(args, input_text=full_prompt)

    if result.returncode != 0:
        return f"Error: {result.stderr or result.stdout}"
    return _parse_json_output(result.stdout)


@mcp.tool()
def googleSearch(query: str, model: str = None, limit: int = None, raw: bool = False) -> str:
    """
    Search the web via Gemini's Google Search grounding.

    Args:
        query: Search query
        model: Optional model name override
        limit: Maximum number of results (optional)
        raw: Return raw results with URLs and snippets (optional)
    """
    args = ["--output-format", "json", "--yolo"]
    if model:
        args += ["-m", model]
    prompt = f"Search: {query}"
    if limit:
        prompt += f" (limit to {limit} results)"

    result = _run_gemini(args, input_text=prompt)

    if result.returncode != 0:
        return f"Error: {result.stderr or result.stdout}"
    return _parse_json_output(result.stdout)


@mcp.tool()
def analyzeFile(file_path: str, prompt: str = "", model: str = None) -> str:
    """
    Analyze an image, PDF, or text file with Gemini.
    Supported file types: PNG, JPG, GIF, WEBP, SVG, BMP, PDF, text (.txt, .md)

    Args:
        file_path: Absolute path to the file to analyze
        prompt: Analysis instructions (optional)
        model: Optional model name override
    """
    args = ["--output-format", "json", "--yolo"]
    if model:
        args += ["-m", model]
    analysis_prompt = prompt or "Analyze this file and provide a detailed description."

    # Try passing file as CLI argument (gemini supports file paths as positional args)
    result = _run_gemini(args + [file_path], input_text=analysis_prompt)

    if result.returncode != 0:
        # Fallback: pass file via -f flag
        result = _run_gemini(args + ["-f", file_path], input_text=analysis_prompt)

    if result.returncode != 0:
        return f"Error: {result.stderr or result.stdout}"
    return _parse_json_output(result.stdout)


# ─── Session management tools ────────────────────────────────────────────────


@mcp.tool()
def session_create(session_id: str = None, system: str = None, model: str = None) -> str:
    """
    Start a new Gemini session with persistent conversation history.
    Uses gemini CLI's native --resume session management when available;
    falls back to server-side history replay otherwise.

    Args:
        session_id: Optional custom session ID. Auto-generated (8-char UUID) if not provided.
        system: Optional system context/instructions for this session
        model: Optional model name override

    Returns:
        Confirmation string with session ID
    """
    sid = session_id or str(uuid.uuid4())[:8]

    # Initialize with stream-json to capture the native gemini session_id
    init_prompt = system or "Session initialized. Acknowledge briefly."
    args = ["--output-format", "stream-json", "--yolo"]
    if model:
        args += ["-m", model]

    result = _run_gemini(args, input_text=init_prompt)

    gemini_session_id = None
    response_text = ""

    if result.returncode == 0 and result.stdout:
        response_text, gemini_session_id = _parse_stream_json(result.stdout)
    elif result.returncode != 0:
        # stream-json failed — fall back to stateless mode entirely
        response_text = ""

    sessions[sid] = {
        "gemini_session_id": gemini_session_id,  # Native CLI session ID (used with --resume)
        "model": model,
        "system": system,
        "history": [],  # Server-side history fallback
        "created_at": time.time(),
        "last_used": time.time(),
    }

    # Seed history for fallback mode
    if system:
        sessions[sid]["history"].append({"role": "system", "content": system})
    if response_text:
        sessions[sid]["history"].append({"role": "assistant", "content": response_text})

    session_info = f"Session created: {sid}"
    if gemini_session_id:
        session_info += f" (native session: {gemini_session_id})"
    return session_info


@mcp.tool()
def session_chat(session_id: str, message: str) -> str:
    """
    Send a message within a Gemini session, maintaining conversation context.
    Uses --resume for efficient native session continuity; falls back to history replay.

    Args:
        session_id: Session ID returned by session_create
        message: User message to send

    Returns:
        Gemini response
    """
    if session_id not in sessions:
        return f"Error: Session '{session_id}' not found. Use session_create to start one."

    session = sessions[session_id]
    session["last_used"] = time.time()

    response = None

    # Strategy 1: Use native gemini session via --resume (no context re-send)
    if session.get("gemini_session_id"):
        args = [
            "--output-format", "json",
            "--resume", session["gemini_session_id"],
            "--yolo",
        ]
        if session.get("model"):
            args += ["-m", session["model"]]
        result = _run_gemini(args, input_text=message)

        if result.returncode == 0:
            response = _parse_json_output(result.stdout)
        else:
            # --resume failed (e.g., session expired), fall through to history replay
            session["gemini_session_id"] = None

    # Strategy 2: History replay (stateless mode with full context passed each call)
    if response is None:
        context_parts = []
        if session.get("system"):
            context_parts.append(f"[System context: {session['system']}]")

        for entry in session["history"]:
            role = entry["role"]
            content = entry["content"]
            if role == "user":
                context_parts.append(f"Human: {content}")
            elif role == "assistant":
                context_parts.append(f"Assistant: {content}")

        context_parts.append(f"Human: {message}")
        full_prompt = "\n\n".join(context_parts)

        args = ["--output-format", "json", "--yolo"]
        if session.get("model"):
            args += ["-m", session["model"]]
        result = _run_gemini(args, input_text=full_prompt)

        if result.returncode == 0:
            response = _parse_json_output(result.stdout)
        else:
            response = f"Error: {result.stderr or result.stdout}"

    # Update server-side history
    session["history"].append({"role": "user", "content": message})
    session["history"].append({"role": "assistant", "content": response or ""})

    return response or "Error: No response received"


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
        user_turns = len([h for h in session["history"] if h["role"] == "user"])
        result.append({
            "id": sid,
            "model": session["model"],
            "gemini_session_id": session.get("gemini_session_id"),
            "turn_count": user_turns,
            "system": session["system"][:80] if session.get("system") else None,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(session["created_at"])),
            "last_used": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(session["last_used"])),
        })

    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def session_delete(session_id: str) -> str:
    """
    Delete a session and clean up resources.
    Also attempts to delete the underlying native gemini CLI session.

    Args:
        session_id: Session ID to delete

    Returns:
        Confirmation message
    """
    if session_id not in sessions:
        return f"Error: Session '{session_id}' not found."

    session = sessions.pop(session_id)
    gemini_sid = session.get("gemini_session_id")

    # Try to clean up native gemini CLI session
    if gemini_sid:
        try:
            list_result = subprocess.run(
                ["gemini", "--list-sessions"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if list_result.returncode == 0:
                # Parse session list to find matching index for --delete-session
                for i, line in enumerate(list_result.stdout.strip().splitlines()):
                    if gemini_sid in line:
                        subprocess.run(
                            ["gemini", "--delete-session", str(i + 1)],
                            capture_output=True,
                            text=True,
                            timeout=30,
                        )
                        break
        except Exception:
            pass  # Silent failure — cleanup is best-effort

    return f"Session '{session_id}' deleted."


@mcp.tool()
def session_clear(session_id: str) -> str:
    """
    Clear conversation history while keeping the session active.
    Resets to stateless mode (subsequent calls will use history replay from scratch).

    Args:
        session_id: Session ID to clear

    Returns:
        Confirmation message
    """
    if session_id not in sessions:
        return f"Error: Session '{session_id}' not found."

    session = sessions[session_id]
    # Keep only system entry in history
    session["history"] = [h for h in session["history"] if h["role"] == "system"]
    # Reset native session ID — history replay will rebuild context from the preserved system entry
    session["gemini_session_id"] = None
    session["last_used"] = time.time()

    return f"Session '{session_id}' history cleared (system context preserved)."


if __name__ == "__main__":
    mcp.run()
