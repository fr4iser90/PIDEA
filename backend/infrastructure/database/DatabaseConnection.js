const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Logger = require('@logging/Logger');
const logger = new Logger('DatabaseConnection');


class DatabaseConnection {
  constructor(config) {
    // Singleton pattern - prevent multiple connections to same database
    const connectionKey = `${config.type}-${config.database}`;
    if (DatabaseConnection.instances && DatabaseConnection.instances[connectionKey]) {
      return DatabaseConnection.instances[connectionKey];
    }
    
    this.config = config;
    this.connection = null;
    this.type = null;
    this.isConnected = false;
    
    // Store instance
    if (!DatabaseConnection.instances) {
      DatabaseConnection.instances = {};
    }
    DatabaseConnection.instances[connectionKey] = this;
  }

  async connect() {
    logger.debug('🗄️ Attempting to connect to database...');
    
    try {
      if (this.config.type === 'postgresql') {
        await this.connectPostgreSQL();
      } else {
        await this.connectSQLite();
      }
    } catch (error) {
      logger.warn(`⚠️ Primary connection failed: ${error.message}`);
      
      if (this.config.fallback) {
        logger.info('🔄 Trying fallback database...');
        await this.connectFallback();
      } else {
        throw error;
      }
    }
  }

  async connectPostgreSQL() {
    logger.info('🐘 Connecting to PostgreSQL...');
    
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
    
    logger.info('✅ PostgreSQL connected successfully');
    await this.runMigrations();
  }

  async connectSQLite() {
    logger.info('💾 Connecting to SQLite...');
    
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
            logger.info('✅ SQLite connected successfully');
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
              logger.info('✅ Memory database connected successfully');
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
    logger.info('🔄 Running migrations...');
    
    const migrationsDir = path.join(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      await this.createTables();
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // If no migration files exist, create tables
    if (migrationFiles.length === 0) {
      logger.info('🔄 No migration files found, creating tables...');
      await this.createTables();
      return;
    }

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await this.execute(sql);
        logger.info(`✅ Migration applied: ${file}`);
      } catch (error) {
        logger.error(`❌ Migration failed: ${file}`, error.message);
        throw error;
      }
    }
  }

  async createTables() {
    logger.info('🏗️ Creating PIDEA tables...');
    
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
        type TEXT NOT NULL DEFAULT 'development',
        ide_type TEXT NOT NULL DEFAULT 'cursor',
        ide_port INTEGER,
        ide_status TEXT DEFAULT 'inactive',
        backend_port INTEGER,
        frontend_port INTEGER,
        database_port INTEGER,
        start_command TEXT,
        build_command TEXT,
        dev_command TEXT,
        test_command TEXT,
        framework TEXT,
        language TEXT,
        package_manager TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        priority INTEGER DEFAULT 0,
        last_accessed ${timestampType},
        access_count INTEGER DEFAULT 0,
        metadata ${metadataType},
        config ${metadataType},
        created_at ${timestampType},
        updated_at ${timestampType},
        created_by TEXT NOT NULL DEFAULT 'me',
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
        created_by TEXT NOT NULL DEFAULT 'me',
        metadata ${metadataType},
        created_at ${timestampType},
        updated_at ${timestampType},
        completed_at ${timestampType},
        due_date ${timestampType},
        estimated_time INTEGER,
        actual_time INTEGER,
        tags TEXT,
        assignee TEXT,
        started_at ${timestampType},
        execution_history ${metadataType},
        parent_task_id TEXT,
        child_task_ids ${metadataType},
        phase TEXT,
        stage TEXT,
        phase_order INTEGER,
        task_level INTEGER DEFAULT 0,
        root_task_id TEXT,
        is_phase_task INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0,
        phase_progress ${metadataType},
        blocked_by ${metadataType},
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (root_task_id) REFERENCES tasks(id) ON DELETE CASCADE
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
        
        -- ANALYSIS DATA
        analysis_type TEXT NOT NULL,
        result_data ${metadataType},
        summary ${metadataType},
        
        -- BASIC STATUS
        status TEXT NOT NULL DEFAULT 'completed',
        started_at ${timestampType},
        completed_at ${timestampType},
        duration_ms INTEGER,
        
        -- BASIC METRICS
        overall_score INTEGER DEFAULT 0,
        critical_issues_count INTEGER DEFAULT 0,
        warnings_count INTEGER DEFAULT 0,
        recommendations_count INTEGER DEFAULT 0,
        
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
      } catch (error) {
        logger.error(`❌ Table creation failed:`, error.message);
        throw error;
      }
    }
    
    logger.info('✅ All PIDEA tables created/verified');
  }

  async execute(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    // Convert SQLite-style placeholders to PostgreSQL-style if needed
    const { convertedSql, convertedParams } = this.convertParameters(sql, params);

    if (this.type === 'postgresql') {
      const client = await this.connection.connect();
      try {
        const result = await client.query(convertedSql, convertedParams);
        return result;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.connection.run(convertedSql, convertedParams, function(err) {
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

    // Convert SQLite-style placeholders to PostgreSQL-style if needed
    const { convertedSql, convertedParams } = this.convertParameters(sql, params);

    if (this.type === 'postgresql') {
      const client = await this.connection.connect();
      try {
        const result = await client.query(convertedSql, convertedParams);
        return result.rows;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.connection.all(convertedSql, convertedParams, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    }
  }

  convertParameters(sql, params) {
    if (this.type === 'postgresql' && sql.includes('?')) {
      // Convert SQLite-style placeholders (?) to PostgreSQL-style ($1, $2, etc.)
      let convertedSql = sql;
      const convertedParams = [...params];
      
      for (let i = 0; i < params.length; i++) {
        convertedSql = convertedSql.replace('?', `$${i + 1}`);
      }
      
      return { convertedSql, convertedParams };
    }
    
    return { convertedSql: sql, convertedParams: params };
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
      logger.info('🔌 Database disconnected');
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

  /**
   * Get repository factory - centralizes repository creation based on database type
   * @param {string} repositoryName - Name of the repository (e.g., 'Task', 'User', 'Project')
   * @returns {Object} Repository instance
   */
  getRepository(repositoryName) {
    const dbType = this.getType();
    const isPostgreSQL = dbType === 'postgresql';
    
    const repositoryMap = {
      // Core repositories with proper SQLite/PostgreSQL mapping
      'Task': isPostgreSQL ? 
        require('./PostgreSQLTaskRepository') : 
        require('./SQLiteTaskRepository'),
      'Project': require('./SQLiteProjectRepository'),
      
      // User repositories - use proper PostgreSQL/SQLite mapping
      'User': isPostgreSQL ? 
        require('./PostgreSQLUserRepository') : 
        require('./SQLiteUserRepository'),
      'UserSession': isPostgreSQL ? 
        require('./PostgreSQLUserSessionRepository') : 
        require('./SQLiteUserSessionRepository'),
      
      // Analysis repositories - use proper PostgreSQL/SQLite mapping
      'Analysis': isPostgreSQL ? 
        require('./PostgreSQLProjectAnalysisRepository') : 
        require('./SQLiteAnalysisRepository'),
      'ProjectAnalysis': isPostgreSQL ? 
        require('./PostgreSQLProjectAnalysisRepository') : 
        require('./SQLiteAnalysisRepository'),
      
      // Chat repositories - use proper PostgreSQL/SQLite mapping
      'Chat': isPostgreSQL ? 
        require('./PostgreSQLChatRepository') : 
        require('./SQLiteChatRepository'),
      
      // Task execution repositories - use proper mapping
      'TaskExecution': isPostgreSQL ? 
        require('./PostgreSQLTaskExecutionRepository') : 
        require('./SQLiteTaskExecutionRepository'),
      
      // Task suggestion repositories - use SQLite for both (only SQLite version exists)
      'TaskSuggestion': require('./SQLiteTaskSuggestionRepository'),
      
      // Task template repositories - use SQLite for both (only SQLite version exists)
      'TaskTemplate': require('./SQLiteTaskTemplateRepository'),
      
      // Session repositories - use proper mapping
      'StreamingSession': isPostgreSQL ? 
        require('./PostgreSQLStreamingSessionRepository') : 
        require('./SQLiteStreamingSessionRepository'),

      'TaskSession': isPostgreSQL ? 
        require('./PostgreSQLTaskSessionRepository') : 
        require('./SQLiteTaskSessionRepository')
    };

    const RepositoryClass = repositoryMap[repositoryName];
    if (!RepositoryClass) {
      throw new Error(`Repository '${repositoryName}' not found for database type '${dbType}'`);
    }

    return new RepositoryClass(this);
  }
}

module.exports = DatabaseConnection; 