/**
 * UI Verification Module
 *
 * Provides UI verification capabilities using Playwright + Gemini.
 * Used in QA phase when --ui option is enabled.
 *
 * Flow:
 * 1. Playwright captures screenshot of specified URL/page
 * 2. Gemini analyzes the screenshot
 * 3. Results compared against expectations
 * 4. Issues reported
 */

import fs from "fs";
import path from "path";

const UI_VERIFICATION_DIR = ".sisyphus/ui-verification";

/**
 * Create UI verification config
 *
 * @param {object} options - Verification options
 * @param {string} options.url - URL to verify
 * @param {string} options.expectations - Expected UI description
 * @param {string} options.screenshotPath - Path to save screenshot
 * @param {string} options.sessionId - Autopilot session ID
 */
export function createVerificationConfig(directory, options) {
  const verificationDir = path.join(directory, UI_VERIFICATION_DIR);

  if (!fs.existsSync(verificationDir)) {
    fs.mkdirSync(verificationDir, { recursive: true });
  }

  const configPath = path.join(verificationDir, `${options.sessionId || "latest"}-config.json`);
  const config = {
    url: options.url,
    expectations: options.expectations || [],
    screenshot_path: options.screenshotPath || path.join(verificationDir, "screenshot.png"),
    created_at: new Date().toISOString(),
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return config;
}

/**
 * Record verification result
 *
 * @param {string} directory - Working directory
 * @param {string} sessionId - Session ID
 * @param {object} result - Verification result
 */
export function recordVerificationResult(directory, sessionId, result) {
  const verificationDir = path.join(directory, UI_VERIFICATION_DIR);
  const resultPath = path.join(verificationDir, `${sessionId || "latest"}-result.json`);

  const fullResult = {
    ...result,
    recorded_at: new Date().toISOString(),
  };

  fs.writeFileSync(resultPath, JSON.stringify(fullResult, null, 2));
  return fullResult;
}

/**
 * Generate Playwright capture command
 *
 * @param {string} url - URL to capture
 * @param {string} outputPath - Screenshot output path
 * @returns {string} Bash command to run
 */
export function generatePlaywrightCommand(url, outputPath) {
  return `npx playwright screenshot "${url}" "${outputPath}" --full-page`;
}

/**
 * Generate Gemini analysis prompt
 *
 * @param {string[]} expectations - List of expected UI elements/behaviors
 * @returns {string} Prompt for Gemini analyzeFile
 */
export function generateAnalysisPrompt(expectations) {
  const expectationsList = expectations
    .map((exp, i) => `${i + 1}. ${exp}`)
    .join("\n");

  return `UI Verification Analysis

Please analyze this screenshot and verify the following expectations:

${expectationsList || "1. Layout is correct and well-structured\n2. Required elements are present\n3. No visual issues or broken elements"}

For each expectation, report:
- PASS: If the expectation is met
- FAIL: If the expectation is not met (explain why)
- WARN: If partially met or unclear

Also check for:
- Layout issues (misalignment, overflow, etc.)
- Missing elements
- Visual bugs (wrong colors, broken images, etc.)
- Accessibility concerns (contrast, text size, etc.)

Respond in the following JSON format:
{
  "overall_status": "pass|fail|warn",
  "checks": [
    {
      "expectation": "...",
      "status": "pass|fail|warn",
      "details": "..."
    }
  ],
  "issues": [
    {
      "type": "layout|visual|accessibility|missing",
      "severity": "error|warning",
      "description": "..."
    }
  ],
  "summary": "Brief summary of the verification"
}`;
}

/**
 * Parse Gemini analysis response
 *
 * @param {string} response - Gemini response text
 * @returns {object} Parsed result
 */
export function parseAnalysisResponse(response) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: basic parsing
    const passed = response.toLowerCase().includes("pass") &&
                   !response.toLowerCase().includes("fail");

    return {
      overall_status: passed ? "pass" : "fail",
      checks: [],
      issues: [],
      summary: response.substring(0, 500),
      raw: response,
    };
  } catch (err) {
    return {
      overall_status: "error",
      checks: [],
      issues: [{ type: "parse_error", severity: "error", description: err.message }],
      summary: "Failed to parse Gemini response",
      raw: response,
    };
  }
}

/**
 * Get UI verification status
 *
 * @param {string} directory - Working directory
 * @param {string} sessionId - Session ID
 */
export function getVerificationStatus(directory, sessionId) {
  const verificationDir = path.join(directory, UI_VERIFICATION_DIR);
  const resultPath = path.join(verificationDir, `${sessionId || "latest"}-result.json`);

  if (!fs.existsSync(resultPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(resultPath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Check if UI verification passed
 *
 * @param {object} result - Verification result
 * @returns {boolean}
 */
export function verificationPassed(result) {
  if (!result) return false;
  return result.overall_status === "pass";
}
