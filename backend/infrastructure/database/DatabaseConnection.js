const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseConnection {
  constructor(config) {
    this.config = config;
    this.connection = null;
    this.type = null;
    this.isConnected = false;
  }

  async connect() {
    console.log('🗄️ [DatabaseConnection] Attempting to connect to database...');
    
    try {
      if (this.config.type === 'postgresql') {
        await this.connectPostgreSQL();
      } else {
        await this.connectSQLite();
      }
    } catch (error) {
      console.warn(`⚠️ [DatabaseConnection] Primary connection failed: ${error.message}`);
      
      if (this.config.fallback) {
        console.log('🔄 [DatabaseConnection] Trying fallback database...');
        await this.connectFallback();
      } else {
        throw error;
      }
    }
  }

  async connectPostgreSQL() {
    console.log('🐘 [DatabaseConnection] Connecting to PostgreSQL...');
    
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
    
    console.log('✅ [DatabaseConnection] PostgreSQL connected successfully');
    await this.runMigrations();
  }

  async connectSQLite() {
    console.log('💾 [DatabaseConnection] Connecting to SQLite...');
    
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
            console.log('✅ [DatabaseConnection] SQLite connected successfully');
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
              console.log('✅ [DatabaseConnection] Memory database connected successfully');
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
    console.log('🔄 [DatabaseConnection] Running migrations...');
    
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
        console.log(`✅ [DatabaseConnection] Migration applied: ${file}`);
      } catch (error) {
        console.error(`❌ [DatabaseConnection] Migration failed: ${file}`, error.message);
        throw error;
      }
    }
  }

  async createTables() {
    const isPostgreSQL = this.type === 'postgresql';
    const metadataType = isPostgreSQL ? 'JSONB' : 'TEXT DEFAULT \'{}\'';
    
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata ${metadataType}
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata ${metadataType},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS chat_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata ${metadataType},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        sender VARCHAR(50) NOT NULL,
        type VARCHAR(50) DEFAULT 'text',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata ${metadataType},
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS task_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        type TEXT NOT NULL,
        defaultPriority TEXT NOT NULL,
        estimatedTime INTEGER,
        tags TEXT,
        content TEXT NOT NULL,
        variables TEXT,
        metadata TEXT,
        isActive BOOLEAN DEFAULT 1,
        version TEXT DEFAULT '1.0.0',
        createdBy TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS task_suggestions (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        priority TEXT NOT NULL,
        estimatedTime INTEGER,
        tags TEXT,
        reasoning TEXT,
        confidence REAL DEFAULT 0.0,
        status TEXT DEFAULT 'pending',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS project_analyses (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL,
        project_path VARCHAR(500) NOT NULL,
        analysis_type VARCHAR(100) NOT NULL,
        analysis_data ${metadataType} NOT NULL,
        version VARCHAR(20) DEFAULT '1.0.0',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata ${metadataType} DEFAULT '{}'
      )`
    ];

    for (const table of tables) {
      await this.execute(table);
    }
    
    console.log('✅ [DatabaseConnection] Tables created successfully');
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
      console.log('🔌 [DatabaseConnection] Database disconnected');
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