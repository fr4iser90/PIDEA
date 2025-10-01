const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Logger = require('@logging/Logger');
const logger = new Logger('SQLiteConnection');

class SQLiteConnection {
  constructor(config) {
    this.config = config;
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
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
          this.isConnected = true;
          db.run('PRAGMA foreign_keys = ON');
          try {
            await this.initializeDatabase();
            logger.info('✅ SQLite database initialized');
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  async initializeDatabase() {
    // Use absolute path resolution for better reliability
    const projectRoot = path.resolve(__dirname, '../../../');
    const initSqlPath = path.join(projectRoot, 'database', 'init-sqlite.sql');
    
    // Enhanced error handling and validation
    if (!fs.existsSync(initSqlPath)) {
      logger.error(`❌ SQL file not found: ${initSqlPath}`);
      throw new Error(`SQL initialization file not found: ${initSqlPath}`);
    }
    
    const sql = fs.readFileSync(initSqlPath, 'utf8');
    
    try {
      await this.executeSQLFile(sql);
      // Verify tables were created successfully
      await this.verifyTablesCreated();
    } catch (error) {
      logger.error('❌ Database initialization failed:', error.message);
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
    
    // Execute CREATE TABLE statements first
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
    // Remove SQL comments first
    const sqlWithoutComments = sql
      .split('\n')
      .map(line => {
        const commentIndex = line.indexOf('--');
        return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
      })
      .join('\n');
    
    // Split by semicolons and filter out empty statements
    return sqlWithoutComments
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
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
    const requiredTables = [
      'users',
      'user_sessions', 
      'projects',
      'tasks',
      'analysis',
      'chat_sessions',
      'chat_messages',
      'workflows',
      'workflow_executions',
      'task_templates',
      'task_sessions'
    ];
    
    try {
      const tables = await this.query("SELECT name FROM sqlite_master WHERE type='table'");
      const existingTables = tables.map(t => t.name);
      
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length > 0) {
        logger.error(`❌ Missing tables: ${missingTables.join(', ')}`);
        throw new Error(`Database initialization incomplete. Missing tables: ${missingTables.join(', ')}`);
      }
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
            logger.warn('⚠️ Error closing SQLite connection:', err.message);
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
    return 'sqlite';
  }

  getConnectionStatus() {
    return {
      type: 'sqlite',
      isConnected: this.isConnected,
      database: this.config.database
    };
  }
}

module.exports = SQLiteConnection; 