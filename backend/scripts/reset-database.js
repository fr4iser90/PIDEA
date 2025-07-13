
require('module-alias/register');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { logger } = require('@infrastructure/logging/Logger');

// Use the same database path as the application
const dbPath = path.join(__dirname, '../database/PIDEA-dev.db');

logger.log('🗄️ [ResetDatabase] Starting database reset...');
logger.log(`📁 Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  logger.log('✅ Database opened successfully');
});

// Drop existing tables (in reverse dependency order)
const dropTables = [
  'DROP TABLE IF EXISTS chat_messages',
  'DROP TABLE IF EXISTS chat_sessions',
  'DROP TABLE IF EXISTS workflow_executions',
  'DROP TABLE IF EXISTS tasks',
  'DROP TABLE IF EXISTS projects',
  'DROP TABLE IF EXISTS user_sessions',
  'DROP TABLE IF EXISTS users',
  'DROP TABLE IF EXISTS ide_agents',
  'DROP TABLE IF EXISTS handlers',
  'DROP TABLE IF EXISTS commands',
  'DROP TABLE IF EXISTS steps',
  'DROP TABLE IF EXISTS workflows',
  'DROP TABLE IF EXISTS frameworks',
  'DROP TABLE IF EXISTS analysis_results'
];

// Create tables with correct PIDEA schema (matching DatabaseConnection.js)
const createTables = [
  // CORE TABLES (Single User System)
  `CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT 'me' CHECK (id = 'me'),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    status TEXT NOT NULL DEFAULT 'active',
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_login TEXT
  )`,
  
  `CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL DEFAULT 'me',
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  
  `CREATE TABLE projects (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL,
    description TEXT,
    workspace_path TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    metadata TEXT DEFAULT '{}',
    created_by TEXT NOT NULL DEFAULT 'me',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )`,
  
  `CREATE TABLE tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    project_id TEXT,
    user_id TEXT NOT NULL DEFAULT 'me',
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    due_date TEXT,
    estimated_time INTEGER,
    actual_time INTEGER,
    tags TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  
  // META-EBENEN TABLES (PIDEA Architecture)
  `CREATE TABLE frameworks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    type TEXT NOT NULL,
    version TEXT NOT NULL,
    category TEXT NOT NULL,
    capabilities TEXT,
    configuration TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  
  `CREATE TABLE workflows (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL,
    description TEXT,
    framework_id TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    steps TEXT NOT NULL,
    configuration TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (framework_id) REFERENCES frameworks(id) ON DELETE CASCADE
  )`,
  
  `CREATE TABLE steps (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    handler TEXT NOT NULL,
    configuration TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  
  `CREATE TABLE commands (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    handler TEXT NOT NULL,
    category TEXT NOT NULL,
    parameters TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  
  `CREATE TABLE handlers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    implementation TEXT NOT NULL,
    configuration TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  
  // IDE AGENTS (Ebene 3)
  `CREATE TABLE ide_agents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    port INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    configuration TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_activity TEXT
  )`,
  
  // WORKFLOW EXECUTION
  `CREATE TABLE workflow_executions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    workflow_id TEXT NOT NULL,
    project_id TEXT,
    user_id TEXT NOT NULL DEFAULT 'me',
    status TEXT NOT NULL DEFAULT 'running',
    current_step TEXT,
    progress INTEGER DEFAULT 0,
    result TEXT DEFAULT '{}',
    error_message TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  
  // CHAT SYSTEM
  `CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL DEFAULT 'me',
    title TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  
  `CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    session_id TEXT NOT NULL,
    content TEXT NOT NULL,
    sender TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    timestamp TEXT DEFAULT (datetime('now')),
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
  )`,
  
  // ANALYSIS & METRICS
  `CREATE TABLE analysis_results (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    result TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`
];

async function resetDatabase() {
  try {
    // Drop tables
    logger.log('🗑️ Dropping existing tables...');
    for (const dropSql of dropTables) {
      await new Promise((resolve, reject) => {
        db.run(dropSql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    logger.log('✅ Tables dropped successfully');

    // Create tables
    logger.log('🏗️ Creating new PIDEA tables...');
    for (const createSql of createTables) {
      await new Promise((resolve, reject) => {
        db.run(createSql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    logger.log('✅ PIDEA tables created successfully');

    logger.log('🎉 Database reset completed successfully!');
    logger.log('📊 Created tables:');
    logger.log('  - users (with username, status)');
    logger.log('  - user_sessions');
    logger.log('  - projects');
    logger.log('  - tasks (with user_id, project_id)');
    logger.log('  - frameworks');
    logger.log('  - workflows');
    logger.log('  - steps');
    logger.log('  - commands');
    logger.log('  - handlers');
    logger.log('  - ide_agents');
    logger.log('  - workflow_executions');
    logger.log('  - chat_sessions');
    logger.log('  - chat_messages');
    logger.log('  - analysis_results');
  } catch (error) {
    logger.error('❌ Error resetting database:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

resetDatabase(); 