const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class DatabaseConnection {
  constructor(config) {
    this.config = config;
    this.connection = null;
    this.type = null;
    this.isConnected = false;
  }

  async connect() {
    logger.debug('🗄️ [DatabaseConnection] Attempting to connect to database...');
    
    try {
      if (this.config.type === 'postgresql') {
        await this.connectPostgreSQL();
      } else {
        await this.connectSQLite();
      }
    } catch (error) {
      logger.warn(`⚠️ [DatabaseConnection] Primary connection failed: ${error.message}`);
      
      if (this.config.fallback) {
        logger.log('🔄 [DatabaseConnection] Trying fallback database...');
        await this.connectFallback();
      } else {
        throw error;
      }
    }
  }

  async connectPostgreSQL() {
    logger.log('🐘 [DatabaseConnection] Connecting to PostgreSQL...');
    
    const pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    this.connection = pool;
    this.type = 'postgresql';
    this.isConnected = true;
    
    logger.log('✅ [DatabaseConnection] PostgreSQL connected successfully');
    await this.runMigrations();
  }

  async connectSQLite() {
    logger.log('💾 [DatabaseConnection] Connecting to SQLite...');
    
    const dbPath = this.config.database;
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
          reject(err);
        } else {
          this.connection = db;
          this.type = 'sqlite';
          this.isConnected = true;
          db.run('PRAGMA foreign_keys = ON');
          try {
            await this.runMigrations();
            logger.log('✅ [DatabaseConnection] SQLite connected successfully');
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  async connectFallback() {
    if (this.config.fallback.type === 'sqlite') {
      this.config.database = this.config.fallback.database;
      await this.connectSQLite();
    } else if (this.config.fallback.type === 'memory') {
      return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(':memory:', async (err) => {
          if (err) {
            reject(err);
          } else {
            this.connection = db;
            this.type = 'memory';
            this.isConnected = true;
            db.run('PRAGMA foreign_keys = ON');
            try {
              await this.runMigrations();
              logger.log('✅ [DatabaseConnection] Memory database connected successfully');
              resolve();
            } catch (error) {
              reject(error);
            }
          }
        });
      });
    }
  }

  async runMigrations() {
    logger.log('🔄 [DatabaseConnection] Running migrations...');
    
    const migrationsDir = path.join(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      await this.createTables();
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await this.execute(sql);
        logger.log(`✅ [DatabaseConnection] Migration applied: ${file}`);
      } catch (error) {
        logger.error(`❌ [DatabaseConnection] Migration failed: ${file}`, error.message);
        throw error;
      }
    }
  }

  async createTables() {
    logger.log('🏗️ [DatabaseConnection] Creating PIDEA tables...');
    
    const isPostgreSQL = this.type === 'postgresql';
    const metadataType = isPostgreSQL ? 'JSONB' : 'TEXT DEFAULT \'{}\'';
    const timestampType = isPostgreSQL ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' : 'TEXT DEFAULT (datetime(\'now\'))';
    const uuidFunction = isPostgreSQL ? 'uuid_generate_v4()' : '(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-\' || lower(hex(randomblob(2))) || \'-\' || lower(hex(randomblob(2))) || \'-\' || lower(hex(randomblob(6))))';
    
    const tables = [
      // Enable UUID extension for PostgreSQL
      isPostgreSQL ? 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' : null,
      
      // CORE TABLES (Single User System)
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT 'me' CHECK (id = 'me'),
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        status TEXT NOT NULL DEFAULT 'active',
        metadata ${metadataType},
        created_at ${timestampType},
        updated_at ${timestampType},
        last_login ${timestampType}
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        user_id TEXT NOT NULL DEFAULT 'me',
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at ${timestampType},
        created_at ${timestampType},
        metadata ${metadataType},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        name TEXT NOT NULL,
        description TEXT,
        workspace_path TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        metadata ${metadataType},
        created_by TEXT NOT NULL DEFAULT 'me',
        created_at ${timestampType},
        updated_at ${timestampType},
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        priority TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        project_id TEXT,
        metadata ${metadataType},
        created_at ${timestampType},
        updated_at ${timestampType},
        completed_at ${timestampType},
        due_date ${timestampType},
        estimated_time INTEGER,
        actual_time INTEGER,
        tags TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )`,
      
      // META-EBENEN TABLES (PIDEA Architecture)
      `CREATE TABLE IF NOT EXISTS frameworks (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        type TEXT NOT NULL,
        version TEXT NOT NULL,
        category TEXT NOT NULL,
        capabilities TEXT,
        configuration ${metadataType},
        status TEXT NOT NULL DEFAULT 'active',
        created_at ${timestampType},
        updated_at ${timestampType}
      )`,
      
      `CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        name TEXT NOT NULL,
        description TEXT,
        framework_id TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        steps TEXT NOT NULL,
        configuration ${metadataType},
        status TEXT NOT NULL DEFAULT 'active',
        created_at ${timestampType},
        updated_at ${timestampType},
        FOREIGN KEY (framework_id) REFERENCES frameworks(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS steps (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        handler TEXT NOT NULL,
        configuration ${metadataType},
        status TEXT NOT NULL DEFAULT 'active',
        created_at ${timestampType},
        updated_at ${timestampType}
      )`,
      
      `CREATE TABLE IF NOT EXISTS commands (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        handler TEXT NOT NULL,
        category TEXT NOT NULL,
        parameters ${metadataType},
        status TEXT NOT NULL DEFAULT 'active',
        created_at ${timestampType},
        updated_at ${timestampType}
      )`,
      
      `CREATE TABLE IF NOT EXISTS handlers (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        implementation TEXT NOT NULL,
        configuration ${metadataType},
        status TEXT NOT NULL DEFAULT 'active',
        created_at ${timestampType},
        updated_at ${timestampType}
      )`,
      
      // IDE AGENTS (Ebene 3)
      `CREATE TABLE IF NOT EXISTS ide_agents (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        port INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        configuration ${metadataType},
        created_at ${timestampType},
        updated_at ${timestampType},
        last_activity ${timestampType}
      )`,
      
      // WORKFLOW EXECUTION
      `CREATE TABLE IF NOT EXISTS workflow_executions (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        workflow_id TEXT NOT NULL,
        project_id TEXT,
        user_id TEXT NOT NULL DEFAULT 'me',
        status TEXT NOT NULL DEFAULT 'running',
        current_step TEXT,
        progress INTEGER DEFAULT 0,
        result ${metadataType},
        error_message TEXT,
        started_at ${timestampType},
        completed_at ${timestampType},
        metadata ${metadataType},
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      // CHAT SYSTEM
      `CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        user_id TEXT NOT NULL DEFAULT 'me',
        title TEXT,
        created_at ${timestampType},
        updated_at ${timestampType},
        metadata ${metadataType},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        session_id TEXT NOT NULL,
        content TEXT NOT NULL,
        sender TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        timestamp ${timestampType},
        metadata ${metadataType},
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      )`,
      
      // ANALYSIS & METRICS
      `CREATE TABLE IF NOT EXISTS analysis_results (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        project_id TEXT NOT NULL,
        type TEXT NOT NULL,
        result ${metadataType},
        created_at ${timestampType},
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS workflow_metrics (
        id TEXT PRIMARY KEY DEFAULT ${uuidFunction},
        workflow_id TEXT NOT NULL,
        execution_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        timestamp ${timestampType},
        metadata ${metadataType},
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
        FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE
      )`
    ].filter(Boolean); // Remove null entries
    
    for (const table of tables) {
      try {
        await this.execute(table);
        logger.log(`✅ [DatabaseConnection] Table created/verified`);
      } catch (error) {
        logger.error(`❌ [DatabaseConnection] Table creation failed:`, error.message);
        throw error;
      }
    }
    
    logger.log('✅ [DatabaseConnection] All PIDEA tables created successfully');
  }

  async execute(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    if (this.type === 'postgresql') {
      const client = await this.connection.connect();
      try {
        const result = await client.query(sql, params);
        return result;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.connection.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ rowsAffected: this.changes, lastID: this.lastID });
          }
        });
      });
    }
  }

  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    if (this.type === 'postgresql') {
      const client = await this.connection.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.connection.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    }
  }

  async getOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows[0] || null;
  }

  async disconnect() {
    if (this.connection) {
      if (this.type === 'postgresql') {
        await this.connection.end();
      } else {
        this.connection.close();
      }
      this.isConnected = false;
      logger.log('🔌 [DatabaseConnection] Database disconnected');
    }
  }

  getConnection() {
    return this.connection;
  }

  getType() {
    return this.type;
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

module.exports = DatabaseConnection; 