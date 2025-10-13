/**
 * Database Initialization - Professional Database Management
 * 
 * This module provides a clean, modular approach to database initialization
 * including connection setup, migrations, and dependency injection.
 */

class DatabaseInitialization {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Initialize database connection and migrations
   * @param {Object} securityConfig - Security configuration
   * @returns {Object} Database connection and migration service
   */
  async initializeDatabase(securityConfig) {
    this.logger.info('💾 Initializing database...');
    
    // Get database from DI Container
    const { getServiceContainer } = require('../dependency-injection/ServiceContainer');
    const container = getServiceContainer();
    
    let databaseConnection;
    if (!container.singletons.has('databaseConnection')) {
      const DatabaseConnection = require('./DatabaseConnection');
      databaseConnection = new DatabaseConnection(securityConfig.database);
      await databaseConnection.connect();
      container.registerSingleton('databaseConnection', databaseConnection);
    } else {
      databaseConnection = container.resolve('databaseConnection');
    }
    
    this.logger.info(`✅ Database connected: ${databaseConnection.getType()}`);
    
    // Initialize database migrations
    const DatabaseMigrationService = require('./DatabaseMigrationService');
    const migrationService = new DatabaseMigrationService(databaseConnection);
    
    // Ensure database connection is still connected before running migrations
    if (!databaseConnection.isConnected) {
      this.logger.info('🔄 Reconnecting database for migrations...');
      await databaseConnection.connect();
    }
    
    await migrationService.initialize();
    
    return {
      databaseConnection,
      migrationService
    };
  }
}

module.exports = DatabaseInitialization;
