/**
 * Sisyphus Utilities
 *
 * Common utility functions for file operations and path handling.
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { SISYPHUS_DIR } from "./constants.js";

/**
 * Ensure the .sisyphus directory exists.
 * @param {string} directory - Base directory (usually cwd)
 * @returns {string} Path to .sisyphus directory
 */
export function ensureSisyphusDir(directory) {
  const sisyphusPath = join(directory, SISYPHUS_DIR);
  if (!existsSync(sisyphusPath)) {
    mkdirSync(sisyphusPath, { recursive: true });
  }
  return sisyphusPath;
}

/**
 * Ensure a file's parent directory exists.
 * @param {string} filePath - Path to file
 */
export function ensureParentDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get ISO timestamp string.
 * @returns {string} Current timestamp in ISO format
 */
export function nowISO() {
  return new Date().toISOString();
}

/**
 * Safely parse JSON with fallback.
 * @param {string} content - JSON string to parse
 * @param {*} fallback - Fallback value on parse error
 * @returns {*} Parsed object or fallback
 */
export function safeJsonParse(content, fallback = null) {
  try {
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}
