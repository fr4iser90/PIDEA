const Logger = require('@logging/Logger');
const SQLiteConnection = require('./SQLiteConnection');
const PostgreSQLConnection = require('./PostgreSQLConnection');
const MemoryConnection = require('./MemoryConnection');
const SQLTranslator = require('./SQLTranslator');
const logger = new Logger('DatabaseConnection');

class DatabaseConnection {
  constructor(config) {
    // Singleton pattern - prevent multiple connections to same database
    const connectionKey = `${config.type}-${config.database}`;
    if (DatabaseConnection.instances && DatabaseConnection.instances[connectionKey]) {
      return DatabaseConnection.instances[connectionKey];
    }
    
    this.config = config;
    this.dbConnection = null; // The actual database connection instance
    this.type = null;
    this.isConnected = false;
    this.sqlTranslator = new SQLTranslator(); // SQL translator for PostgreSQL → SQLite conversion
    
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
    
    this.dbConnection = new PostgreSQLConnection(this.config);
    await this.dbConnection.connect();
    
    this.connection = this.dbConnection.getConnection();
    this.type = 'postgresql';
    this.isConnected = true;
    
    logger.info('✅ PostgreSQL connected successfully');
  }

  async connectSQLite() {
    logger.info('💾 Connecting to SQLite...');
    
    this.dbConnection = new SQLiteConnection(this.config);
    await this.dbConnection.connect();
    
    this.connection = this.dbConnection.getConnection();
    this.type = 'sqlite';
    this.isConnected = true;
    
    logger.info('✅ SQLite connected successfully');
  }

  async connectFallback() {
    if (this.config.fallback.type === 'sqlite') {
      this.config.database = this.config.fallback.database;
      await this.connectSQLite();
    } else if (this.config.fallback.type === 'memory') {
      this.dbConnection = new MemoryConnection(this.config);
      await this.dbConnection.connect();
      
      this.connection = this.dbConnection.getConnection();
      this.type = 'memory';
      this.isConnected = true;
      
      logger.info('✅ Memory database connected successfully');
    }
  }

  // Database initialization is now handled by the specific connection classes
  // This method is kept for backward compatibility but delegates to the actual connection
  async runMigrations() {
    logger.info('🔄 Running migrations...');
    if (this.dbConnection) {
      // The specific connection class already handles initialization
      logger.info('✅ Database already initialized by connection class');
    } else {
      throw new Error('Database connection not established');
    }
  }

  // Table verification is now handled by the specific connection classes
  async verifyTablesCreated() {
    logger.info('🔍 Verifying tables were created successfully...');
    if (this.dbConnection) {
      // Delegate to the specific connection class
      await this.dbConnection.verifyTablesCreated();
    } else {
      throw new Error('Database connection not established');
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
    if (!this.isConnected || !this.dbConnection) {
      throw new Error('Database not connected');
    }

    // If using SQLite, translate PostgreSQL syntax to SQLite
    if (this.type === 'sqlite' && this.sqlTranslator.canTranslate(sql)) {
      const translation = this.sqlTranslator.translate(sql, params);
      logger.debug(`Executing translated SQL: ${translation.sql.substring(0, 100)}...`);
      return await this.dbConnection.execute(translation.sql, translation.params);
    }

    // Delegate to the specific connection class
    return await this.dbConnection.execute(sql, params);
  }

  async query(sql, params = []) {
    if (!this.isConnected || !this.dbConnection) {
      throw new Error('Database not connected');
    }

    // If using SQLite, translate PostgreSQL syntax to SQLite
    if (this.type === 'sqlite' && this.sqlTranslator.canTranslate(sql)) {
      const translation = this.sqlTranslator.translate(sql, params);
      logger.debug(`Querying translated SQL: ${translation.sql.substring(0, 100)}...`);
      return await this.dbConnection.query(translation.sql, translation.params);
    }

    // Delegate to the specific connection class
    return await this.dbConnection.query(sql, params);
  }

  async getOne(sql, params = []) {
    if (!this.isConnected || !this.dbConnection) {
      throw new Error('Database not connected');
    }

    // If using SQLite, translate PostgreSQL syntax to SQLite
    if (this.type === 'sqlite' && this.sqlTranslator.canTranslate(sql)) {
      const translation = this.sqlTranslator.translate(sql, params);
      logger.debug(`Getting one with translated SQL: ${translation.sql.substring(0, 100)}...`);
      return await this.dbConnection.getOne(translation.sql, translation.params);
    }

    // Delegate to the specific connection class
    return await this.dbConnection.getOne(sql, params);
  }

  async disconnect() {
    if (this.dbConnection) {
      await this.dbConnection.disconnect();
      this.dbConnection = null;
      this.connection = null;
      this.isConnected = false;
    }
  }

  getConnection() {
    return this.connection;
  }

  getType() {
    return this.type;
  }

  getConnectionStatus() {
    if (this.dbConnection) {
      const status = this.dbConnection.getConnectionStatus();
      if (this.type === 'sqlite') {
        status.sqlTranslator = this.sqlTranslator.getStats();
      }
      return status;
    }
    
    return {
      type: this.type,
      isConnected: this.isConnected,
      database: this.config.database
    };
  }

  getRepository(repositoryName, eventBus = null, statusTransitionService = null) {
    // Always use PostgreSQL repositories with SQL translator for SQLite fallback
    const dbType = this.getType();
    
    if (dbType === 'sqlite') {
      // Use PostgreSQL repository with SQL translator for SQLite
      try {
        const RepositoryClass = require(`./PostgreSQL${repositoryName}Repository`);
        logger.debug(`Using PostgreSQL${repositoryName}Repository with SQL translator for SQLite`);
        return new RepositoryClass(this, eventBus, statusTransitionService);
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          throw new Error(`Repository ${repositoryName} not implemented for PostgreSQL`);
        }
        throw error;
      }
    } else {
      // Use PostgreSQL repository directly for PostgreSQL
      try {
        const RepositoryClass = require(`./PostgreSQL${repositoryName}Repository`);
        return new RepositoryClass(this, eventBus, statusTransitionService);
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          throw new Error(`Repository ${repositoryName} not implemented for PostgreSQL`);
        }
        throw error;
      }
    }
  }
}

module.exports = DatabaseConnection; 