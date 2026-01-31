/**
 * Swarm Database Module
 *
 * SQLite database setup and management for atomic task claiming.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_FILENAME = "swarm.db";

/**
 * Get the database path for a given directory
 */
export function getDbPath(directory) {
  const sisyphusDir = path.join(directory, ".sisyphus");
  if (!fs.existsSync(sisyphusDir)) {
    fs.mkdirSync(sisyphusDir, { recursive: true });
  }
  return path.join(sisyphusDir, DB_FILENAME);
}

/**
 * Initialize the database with schema
 */
export function initializeDatabase(directory) {
  const dbPath = getDbPath(directory);
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma("journal_mode = WAL");

  // Create tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'claimed', 'done', 'failed')),
      owner_agent TEXT,
      claimed_at DATETIME,
      lease_expires_at DATETIME,
      completed_at DATETIME,
      result TEXT,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create heartbeats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS heartbeats (
      agent_id TEXT PRIMARY KEY,
      agent_type TEXT,
      last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
      current_task TEXT,
      FOREIGN KEY (current_task) REFERENCES tasks(id)
    )
  `);

  // Create index for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_agent);
    CREATE INDEX IF NOT EXISTS idx_heartbeats_task ON heartbeats(current_task);
  `);

  db.close();
  return dbPath;
}

/**
 * Get a database connection
 */
export function getDatabase(directory) {
  const dbPath = getDbPath(directory);
  if (!fs.existsSync(dbPath)) {
    initializeDatabase(directory);
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(db) {
  if (db) {
    db.close();
  }
}
