const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Logger = require('@logging/Logger');
const logger = new Logger('MemoryConnection');

class MemoryConnection {
  constructor(config) {
    this.config = config;
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    logger.info('🧠 Connecting to Memory Database...');

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(':memory:', async (err) => {
        if (err) {
          reject(err);
        } else {
          this.connection = db;
          this.isConnected = true;
          db.run('PRAGMA foreign_keys = ON');
          try {
            await this.initializeDatabase();
            logger.info('✅ Memory database connected and initialized successfully');
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  async initializeDatabase() {
    logger.info('🔄 Initializing Memory database...');
    
    // Use absolute path resolution for better reliability
    const projectRoot = path.resolve(__dirname, '../../../');
    const initSqlPath = path.join(projectRoot, 'database', 'init-sqlite.sql');
    
    // Enhanced error handling and validation
    if (!fs.existsSync(initSqlPath)) {
      logger.error(`❌ SQL file not found: ${initSqlPath}`);
      logger.error(`❌ Current directory: ${__dirname}`);
      logger.error(`❌ Project root: ${projectRoot}`);
      throw new Error(`SQL initialization file not found: ${initSqlPath}`);
    }
    
    logger.info(`📄 Using ${path.basename(initSqlPath)} for database initialization...`);
    const sql = fs.readFileSync(initSqlPath, 'utf8');
    
    try {
      await this.executeSQLFile(sql);
      logger.info(`✅ Database initialized from ${path.basename(initSqlPath)}`);
      
      // Verify tables were created successfully
      await this.verifyTablesCreated();
    } catch (error) {
      logger.error('❌ Database initialization failed:', error.message);
      logger.error('❌ Error details:', error);
      throw error;
    }
  }

  async executeSQLFile(sql) {
    // Split SQL into individual statements and execute them in the correct order
    const statements = this.parseSQLStatements(sql);
    
    // Separate CREATE TABLE and CREATE INDEX statements
    const createTableStatements = statements.filter(stmt => 
      stmt.toUpperCase().includes('CREATE TABLE')
    );
    const createIndexStatements = statements.filter(stmt => 
      stmt.toUpperCase().includes('CREATE INDEX')
    );
    const otherStatements = statements.filter(stmt => 
      !stmt.toUpperCase().includes('CREATE TABLE') && !stmt.toUpperCase().includes('CREATE INDEX')
    );
    
    logger.info(`📊 Found ${statements.length} total statements`);
    logger.info(`📊 CREATE TABLE statements: ${createTableStatements.length}`);
    logger.info(`📊 CREATE INDEX statements: ${createIndexStatements.length}`);
    logger.info(`📊 Other statements: ${otherStatements.length}`);
    
    // Execute CREATE TABLE statements first
    logger.info(`📝 Executing ${createTableStatements.length} CREATE TABLE statements first...`);
    for (let i = 0; i < createTableStatements.length; i++) {
      const statement = createTableStatements[i];
      if (statement.trim()) {
        try {
          await this.executeStatement(statement, `CREATE TABLE statement ${i + 1}`);
        } catch (error) {
          logger.warn(`⚠️ Skipping CREATE TABLE statement ${i + 1} due to error: ${error.message}`);
        }
      }
    }
    
    // Execute other statements (like INSERT, etc.)
    for (let i = 0; i < otherStatements.length; i++) {
      const statement = otherStatements[i];
      if (statement.trim()) {
        try {
          await this.executeStatement(statement, `Other statement ${i + 1}`);
        } catch (error) {
          logger.warn(`⚠️ Skipping other statement ${i + 1} due to error: ${error.message}`);
        }
      }
    }
    
    // Execute CREATE INDEX statements last
    logger.info(`📝 Executing ${createIndexStatements.length} CREATE INDEX statements...`);
    for (let i = 0; i < createIndexStatements.length; i++) {
      const statement = createIndexStatements[i];
      if (statement.trim()) {
        try {
          await this.executeStatement(statement, `CREATE INDEX statement ${i + 1}`);
        } catch (error) {
          logger.warn(`⚠️ Skipping CREATE INDEX statement ${i + 1} due to error: ${error.message}`);
        }
      }
    }
  }

  parseSQLStatements(sql) {
    // Split by semicolons and filter out comments and empty statements
    return sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  }

  async executeStatement(statement, description) {
    return new Promise((resolve, reject) => {
      this.connection.run(statement, [], function(err) {
        if (err) {
          logger.warn(`⚠️ ${description} failed: ${err.message}`);
          logger.warn(`⚠️ Failed statement: ${statement.substring(0, 100)}...`);
          // Don't reject for CREATE TABLE IF NOT EXISTS or CREATE INDEX IF NOT EXISTS failures
          if (!err.message.includes('already exists')) {
            reject(err);
          } else {
            resolve();
          }
        } else {
          resolve();
        }
      });
    });
  }

  async verifyTablesCreated() {
    logger.info('🔍 Verifying tables were created successfully...');
    
    const requiredTables = [
      'users',
      'user_sessions', 
      'projects',
      'tasks',
      'analysis_results',
      'analysis_steps',
      'chat_sessions',
      'chat_messages',
      'workflows',
      'workflow_executions',
      'task_templates',
      'task_suggestions',
      'task_sessions',
      'project_analysis'
    ];
    
    try {
      const tables = await this.query("SELECT name FROM sqlite_master WHERE type='table'");
      const existingTables = tables.map(t => t.name);
      
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length > 0) {
        logger.error(`❌ Missing tables: ${missingTables.join(', ')}`);
        logger.error(`❌ Existing tables: ${existingTables.join(', ')}`);
        throw new Error(`Database initialization incomplete. Missing tables: ${missingTables.join(', ')}`);
      }
      
      logger.info(`✅ All ${requiredTables.length} required tables verified successfully`);
      logger.info(`📊 Database contains ${existingTables.length} tables total`);
    } catch (error) {
      logger.error('❌ Table verification failed:', error.message);
      throw error;
    }
  }

  async execute(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

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

  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

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

  async getOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async disconnect() {
    if (this.connection) {
      return new Promise((resolve) => {
        this.connection.close((err) => {
          if (err) {
            logger.warn('⚠️ Error closing memory connection:', err.message);
          }
          this.connection = null;
          this.isConnected = false;
          resolve();
        });
      });
    }
  }

  getConnection() {
    return this.connection;
  }

  getType() {
    return 'memory';
  }

  getConnectionStatus() {
    return {
      type: 'memory',
      isConnected: this.isConnected,
      database: ':memory:'
    };
  }
}

module.exports = MemoryConnection; 