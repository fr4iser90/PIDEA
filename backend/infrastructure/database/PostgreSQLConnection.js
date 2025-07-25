const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const Logger = require('@logging/Logger');
const logger = new Logger('PostgreSQLConnection');

class PostgreSQLConnection {
  constructor(config) {
    this.config = config;
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
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
    this.isConnected = true;
    
    logger.info('✅ PostgreSQL connected successfully');
    await this.initializeDatabase();
  }

  async initializeDatabase() {
    logger.info('🔄 Initializing PostgreSQL database...');
    
    // Use absolute path resolution for better reliability
    const projectRoot = path.resolve(__dirname, '../../../');
    const initSqlPath = path.join(projectRoot, 'database', 'init-postgres.sql');
    
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
      await this.execute(sql);
      logger.info(`✅ Database initialized from ${path.basename(initSqlPath)}`);
      
      // Verify tables were created successfully
      await this.verifyTablesCreated();
    } catch (error) {
      logger.error('❌ Database initialization failed:', error.message);
      logger.error('❌ Error details:', error);
      throw error;
    }
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
      const tables = await this.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
      const existingTables = tables.map(t => t.tablename);
      
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

    const client = await this.connection.connect();
    try {
      const result = await client.query(sql, params);
      return result;
    } finally {
      client.release();
    }
  }

  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const client = await this.connection.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      this.isConnected = false;
    }
  }

  getConnection() {
    return this.connection;
  }

  getType() {
    return 'postgresql';
  }

  getConnectionStatus() {
    return {
      type: 'postgresql',
      isConnected: this.isConnected,
      host: this.config.host,
      port: this.config.port,
      database: this.config.database
    };
  }
}

module.exports = PostgreSQLConnection; 