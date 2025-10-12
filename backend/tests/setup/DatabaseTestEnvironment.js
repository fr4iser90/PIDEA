/**
 * Database Test Environment
 * 
 * Provides a complete test environment for database testing including
 * setup, teardown, isolation, and configuration management.
 */

const TestDatabaseManager = require('./TestDatabaseManager');
const TestDataManager = require('../fixtures/TestDataManager');
const Logger = require('../../infrastructure/logging/Logger');

class DatabaseTestEnvironment {
  constructor(config = {}) {
    this.config = {
      databaseType: 'sqlite',
      databaseName: null,
      isolation: true,
      cleanup: true,
      monitoring: false,
      optimization: false,
      ...config
    };

    this.databaseManager = new TestDatabaseManager();
    this.testDataManager = null;
    this.connections = new Map();
    this.logger = new Logger('DatabaseTestEnvironment');
  }

  /**
   * Initialize the test environment
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing database test environment');

      // Create main test database
      const mainConnection = await this.databaseManager.createTestDatabase(
        this.config.databaseType,
        this.config.databaseName,
        {
          monitoring: this.config.monitoring,
          optimization: this.config.optimization
        }
      );

      this.connections.set('main', mainConnection);

      // Initialize test data manager
      this.testDataManager = new TestDataManager(mainConnection);

      // Create test tables
      await this.databaseManager.createTestTables(mainConnection);

      this.logger.info('Database test environment initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database test environment:', error);
      throw error;
    }
  }

  /**
   * Get the main database connection
   * @returns {DatabaseConnection} Main database connection
   */
  getMainConnection() {
    return this.connections.get('main');
  }

  /**
   * Create an isolated test database
   * @param {string} name - Test database name
   * @param {Object} config - Additional configuration
   * @returns {Promise<DatabaseConnection>} Isolated database connection
   */
  async createIsolatedDatabase(name, config = {}) {
    try {
      const connection = await this.databaseManager.createTestDatabase(
        this.config.databaseType,
        name,
        {
          monitoring: this.config.monitoring,
          optimization: this.config.optimization,
          ...config
        }
      );

      this.connections.set(name, connection);
      await this.databaseManager.createTestTables(connection);

      this.logger.info(`Created isolated test database: ${name}`);
      return connection;
    } catch (error) {
      this.logger.error(`Failed to create isolated test database ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get isolated test database connection
   * @param {string} name - Test database name
   * @returns {DatabaseConnection|null} Isolated database connection
   */
  getIsolatedConnection(name) {
    return this.connections.get(name) || null;
  }

  /**
   * Cleanup isolated test database
   * @param {string} name - Test database name
   * @returns {Promise<void>}
   */
  async cleanupIsolatedDatabase(name) {
    try {
      const connection = this.connections.get(name);
      if (connection) {
        await this.databaseManager.cleanupTestDatabase(`${this.config.databaseType}-${name}`);
        this.connections.delete(name);
        this.logger.info(`Cleaned up isolated test database: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup isolated test database ${name}:`, error);
      throw error;
    }
  }

  /**
   * Setup test data for a specific test
   * @param {string} fixtureName - Name of the test fixture
   * @param {Object} options - Test data options
   * @returns {Promise<void>}
   */
  async setupTestData(fixtureName, options = {}) {
    try {
      if (!this.testDataManager) {
        throw new Error('Test data manager not initialized');
      }

      await this.testDataManager.loadFixture(fixtureName, options);
      this.logger.info(`Setup test data for fixture: ${fixtureName}`);
    } catch (error) {
      this.logger.error(`Failed to setup test data for fixture ${fixtureName}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup test data
   * @param {Array<string>} tables - Tables to clean (optional)
   * @returns {Promise<void>}
   */
  async cleanupTestData(tables = []) {
    try {
      const mainConnection = this.getMainConnection();
      if (mainConnection) {
        await this.databaseManager.cleanupTestData(mainConnection, tables);
      }

      // Cleanup isolated databases
      for (const [name, connection] of this.connections) {
        if (name !== 'main') {
          await this.databaseManager.cleanupTestData(connection, tables);
        }
      }

      this.logger.info('Cleaned up test data');
    } catch (error) {
      this.logger.error('Failed to cleanup test data:', error);
      throw error;
    }
  }

  /**
   * Reset the test environment to clean state
   * @returns {Promise<void>}
   */
  async reset() {
    try {
      this.logger.info('Resetting database test environment');

      // Reset main database
      const mainConnection = this.getMainConnection();
      if (mainConnection) {
        await this.databaseManager.resetTestDatabase(mainConnection);
        await this.databaseManager.createTestTables(mainConnection);
      }

      // Reset isolated databases
      for (const [name, connection] of this.connections) {
        if (name !== 'main') {
          await this.databaseManager.resetTestDatabase(connection);
          await this.databaseManager.createTestTables(connection);
        }
      }

      this.logger.info('Database test environment reset successfully');
    } catch (error) {
      this.logger.error('Failed to reset database test environment:', error);
      throw error;
    }
  }

  /**
   * Verify test environment integrity
   * @returns {Promise<Object>} Verification result
   */
  async verifyIntegrity() {
    try {
      const result = {
        main: null,
        isolated: {},
        overall: {
          connectionCount: this.connections.size,
          databaseCount: 0,
          tableCount: 0,
          recordCount: 0
        }
      };

      // Verify main database
      const mainConnection = this.getMainConnection();
      if (mainConnection) {
        result.main = await this.databaseManager.verifyTestDatabaseSetup(mainConnection);
        result.overall.databaseCount++;
        result.overall.tableCount += result.main.tables.length;
      }

      // Verify isolated databases
      for (const [name, connection] of this.connections) {
        if (name !== 'main') {
          result.isolated[name] = await this.databaseManager.verifyTestDatabaseSetup(connection);
          result.overall.databaseCount++;
          result.overall.tableCount += result.isolated[name].tables.length;
        }
      }

      this.logger.info('Test environment integrity verified');
      return result;
    } catch (error) {
      this.logger.error('Failed to verify test environment integrity:', error);
      throw error;
    }
  }

  /**
   * Get test environment statistics
   * @returns {Promise<Object>} Environment statistics
   */
  async getStatistics() {
    try {
      const stats = {
        connections: this.connections.size,
        databases: {},
        overall: {
          totalConnections: 0,
          totalTables: 0,
          totalRecords: 0,
          totalIndexes: 0
        }
      };

      // Get statistics for each connection
      for (const [name, connection] of this.connections) {
        const connectionStats = await this.databaseManager.getTestDatabaseStats(connection);
        stats.databases[name] = connectionStats;
        
        stats.overall.totalConnections += connectionStats.connectionCount;
        stats.overall.totalTables += connectionStats.tables;
        stats.overall.totalRecords += connectionStats.records;
        stats.overall.totalIndexes += connectionStats.indexes;
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get test environment statistics:', error);
      throw error;
    }
  }

  /**
   * Run a test with automatic setup and cleanup
   * @param {Function} testFunction - Test function to run
   * @param {Object} options - Test options
   * @returns {Promise<any>} Test result
   */
  async runTest(testFunction, options = {}) {
    const {
      fixtureName = null,
      isolatedDatabase = null,
      cleanup = true,
      reset = false
    } = options;

    try {
      this.logger.info('Running test with automatic setup and cleanup');

      // Setup test data if specified
      if (fixtureName) {
        await this.setupTestData(fixtureName);
      }

      // Create isolated database if specified
      let isolatedConnection = null;
      if (isolatedDatabase) {
        isolatedConnection = await this.createIsolatedDatabase(isolatedDatabase);
      }

      // Run the test
      const result = await testFunction({
        mainConnection: this.getMainConnection(),
        isolatedConnection,
        testDataManager: this.testDataManager,
        databaseManager: this.databaseManager
      });

      // Cleanup
      if (cleanup) {
        if (isolatedDatabase) {
          await this.cleanupIsolatedDatabase(isolatedDatabase);
        }
        await this.cleanupTestData();
      }

      // Reset if requested
      if (reset) {
        await this.reset();
      }

      this.logger.info('Test completed successfully');
      return result;
    } catch (error) {
      this.logger.error('Test failed:', error);
      
      // Cleanup on failure
      try {
        if (isolatedDatabase) {
          await this.cleanupIsolatedDatabase(isolatedDatabase);
        }
        await this.cleanupTestData();
      } catch (cleanupError) {
        this.logger.error('Cleanup failed:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * Run multiple tests in parallel
   * @param {Array<Object>} tests - Array of test configurations
   * @returns {Promise<Array>} Test results
   */
  async runParallelTests(tests) {
    try {
      this.logger.info(`Running ${tests.length} tests in parallel`);

      const testPromises = tests.map(async (testConfig, index) => {
        const { testFunction, options = {} } = testConfig;
        const testName = options.name || `test-${index}`;
        
        // Create isolated database for each test
        const isolatedConnection = await this.createIsolatedDatabase(testName);
        
        try {
          const result = await testFunction({
            mainConnection: this.getMainConnection(),
            isolatedConnection,
            testDataManager: this.testDataManager,
            databaseManager: this.databaseManager
          });

          await this.cleanupIsolatedDatabase(testName);
          return { name: testName, result, success: true };
        } catch (error) {
          await this.cleanupIsolatedDatabase(testName);
          return { name: testName, error, success: false };
        }
      });

      const results = await Promise.all(testPromises);
      this.logger.info('Parallel tests completed');
      return results;
    } catch (error) {
      this.logger.error('Parallel tests failed:', error);
      throw error;
    }
  }

  /**
   * Destroy the test environment
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      this.logger.info('Destroying database test environment');

      // Cleanup all connections
      await this.databaseManager.cleanupAllTestDatabases();
      this.connections.clear();

      // Destroy database manager
      await this.databaseManager.destroy();

      this.logger.info('Database test environment destroyed successfully');
    } catch (error) {
      this.logger.error('Failed to destroy database test environment:', error);
      throw error;
    }
  }
}

module.exports = DatabaseTestEnvironment;
