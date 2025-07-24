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
    
    // Determine which SQL file to use based on ACTUAL database type (not config)
    let initSqlPath;
    if (this.type === 'postgresql') {
      initSqlPath = path.join(__dirname, '../../../database/init-postgres.sql');
      logger.info('📄 Using PostgreSQL-specific schema...');
    } else {
      initSqlPath = path.join(__dirname, '../../../database/init-sqlite.sql');
      logger.info('📄 Using SQLite-specific schema...');
    }
    
    if (fs.existsSync(initSqlPath)) {
      logger.info(`📄 Using ${path.basename(initSqlPath)} for database initialization...`);
      const sql = fs.readFileSync(initSqlPath, 'utf8');
      
      try {
        await this.execute(sql);
        logger.info(`✅ Database initialized from ${path.basename(initSqlPath)}`);
      } catch (error) {
        logger.error('❌ Database initialization failed:', error.message);
        throw error;
      }
    } else {
      logger.warn(`⚠️ ${path.basename(initSqlPath)} not found, falling back to legacy init.sql...`);
      const legacyPath = path.join(__dirname, '../../../database/init.sql');
      if (fs.existsSync(legacyPath)) {
        const sql = fs.readFileSync(legacyPath, 'utf8');
        await this.execute(sql);
        logger.info('✅ Database initialized from legacy init.sql');
      } else {
        logger.info('🔄 No SQL files found, creating tables from code...');
        await this.createTables();
      }
    }
  }

  async createTables() {
    logger.info('🏗️ Creating PIDEA tables...');
    logger.warn('⚠️ createTables() is deprecated - using init.sql instead');
    
    // This method is kept for backward compatibility but should not be used
    // All table creation is now handled by init.sql
    throw new Error('Table creation is now handled by init.sql - this method is deprecated');
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