const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use the same database path as the application
const dbPath = path.join(__dirname, '../database/PIDEA-dev.db');

console.log('🗄️ [ResetDatabase] Starting database reset...');
console.log(`📁 Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Database opened successfully');
});

// Drop existing tables
const dropTables = [
  'DROP TABLE IF EXISTS chat_messages',
  'DROP TABLE IF EXISTS chat_sessions', 
  'DROP TABLE IF EXISTS user_sessions',
  'DROP TABLE IF EXISTS users'
];

// Create tables with correct SQLite syntax
const createTables = [
  `CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '{}'
  )`,
  
  `CREATE TABLE user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  
  `CREATE TABLE chat_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  
  `CREATE TABLE chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL,
    type VARCHAR(50) DEFAULT 'text',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
  )`
];

async function resetDatabase() {
  try {
    // Drop tables
    console.log('🗑️ Dropping existing tables...');
    for (const dropSql of dropTables) {
      await new Promise((resolve, reject) => {
        db.run(dropSql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    console.log('✅ Tables dropped successfully');

    // Create tables
    console.log('🏗️ Creating new tables...');
    for (const createSql of createTables) {
      await new Promise((resolve, reject) => {
        db.run(createSql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    console.log('✅ Tables created successfully');

    console.log('🎉 Database reset completed successfully!');
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

resetDatabase(); 