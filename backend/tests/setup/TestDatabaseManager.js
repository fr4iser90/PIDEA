/**
 * Test Database Manager
 *
 * Manages test database connections, setup, and cleanup for database testing.
 * Provides isolation between tests and supports multiple database types.
 */

const DatabaseConnection = require("../../infrastructure/database/DatabaseConnection");
const Logger = require("../../infrastructure/logging/Logger");

class TestDatabaseManager {
  constructor() {
    this.connections = new Map();
    this.testDatabases = new Set();
    this.logger = new Logger("TestDatabaseManager");
  }

  /**
   * Create a test database connection
   * @param {string} type - Database type ('sqlite', 'postgresql', 'memory')
   * @param {string} name - Test database name (optional)
   * @param {Object} config - Additional configuration
   * @returns {Promise<DatabaseConnection>} Database connection
   */
  async createTestDatabase(type = "sqlite", name = null, config = {}) {
    const testConfig = this.getTestConfig(type, name, config);
    const connectionKey = `${type}-${name || "default"}`;

    // Check if connection already exists
    if (this.connections.has(connectionKey)) {
      return this.connections.get(connectionKey);
    }

    try {
      const connection = new DatabaseConnection(testConfig);
      await connection.connect();

      this.connections.set(connectionKey, connection);
      this.testDatabases.add(connectionKey);

      this.logger.info(`Created test database: ${connectionKey}`);
      return connection;
    } catch (error) {
      this.logger.error(
        `Failed to create test database ${connectionKey}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get test database configuration
   * @param {string} type - Database type
   * @param {string} name - Database name
   * @param {Object} config - Additional configuration
   * @returns {Object} Database configuration
   */
  getTestConfig(type, name, config) {
    const baseConfig = {
      monitoring: false,
      optimization: false,
      ...config,
    };

    switch (type) {
      case "sqlite":
        return {
          type: "sqlite",
          database: name || ":memory:",
          enableWAL: true,
          synchronous: "NORMAL",
          journalMode: "WAL",
          ...baseConfig,
        };

      case "postgresql":
        return {
          type: "postgresql",
          host: process.env.TEST_DB_HOST || "localhost",
          port: process.env.TEST_DB_PORT || 5432,
          database: name || process.env.TEST_DB_NAME || "pidea_test",
          username: process.env.TEST_DB_USER || "test",
          password: process.env.TEST_DB_PASSWORD || "test",
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
          ...baseConfig,
        };

      case "memory":
        return {
          type: "sqlite",
          database: ":memory:",
          enableWAL: true,
          synchronous: "NORMAL",
          journalMode: "WAL",
          ...baseConfig,
        };

      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  /**
   * Get existing test database connection
   * @param {string} connectionKey - Connection key
   * @returns {DatabaseConnection|null} Database connection
   */
  getConnection(connectionKey) {
    return this.connections.get(connectionKey) || null;
  }

  /**
   * List all test database connections
   * @returns {Array<string>} List of connection keys
   */
  listConnections() {
    return Array.from(this.connections.keys());
  }

  /**
   * Cleanup specific test database
   * @param {string} connectionKey - Connection key
   * @returns {Promise<void>}
   */
  async cleanupTestDatabase(connectionKey) {
    const connection = this.connections.get(connectionKey);
    if (!connection) {
      this.logger.warn(`Connection ${connectionKey} not found`);
      return;
    }

    try {
      await connection.disconnect();
      this.connections.delete(connectionKey);
      this.testDatabases.delete(connectionKey);
      this.logger.info(`Cleaned up test database: ${connectionKey}`);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup test database ${connectionKey}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Cleanup all test databases
   * @returns {Promise<void>}
   */
  async cleanupAllTestDatabases() {
    const cleanupPromises = Array.from(this.testDatabases).map(
      (connectionKey) => this.cleanupTestDatabase(connectionKey),
    );

    try {
      await Promise.all(cleanupPromises);
      this.logger.info("Cleaned up all test databases");
    } catch (error) {
      this.logger.error("Failed to cleanup some test databases:", error);
      throw error;
    }
  }

  /**
   * Create test tables for a connection
   * @param {DatabaseConnection} connection - Database connection
   * @param {Array<string>} tables - List of table creation SQL
   * @returns {Promise<void>}
   */
  async createTestTables(connection, tables = []) {
    const defaultTables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER,
        city TEXT,
        country TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        status TEXT DEFAULT 'draft',
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      `CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
    ];

    const tablesToCreate = tables.length > 0 ? tables : defaultTables;

    for (const tableSQL of tablesToCreate) {
      try {
        await connection.execute(tableSQL);
      } catch (error) {
        this.logger.error("Failed to create test table:", error);
        throw error;
      }
    }

    this.logger.info(`Created ${tablesToCreate.length} test tables`);
  }

  /**
   * Cleanup test data from tables
   * @param {DatabaseConnection} connection - Database connection
   * @param {Array<string>} tables - List of table names to clean
   * @returns {Promise<void>}
   */
  async cleanupTestData(connection, tables = []) {
    const defaultTables = ["comments", "posts", "users"];
    const tablesToClean = tables.length > 0 ? tables : defaultTables;

    for (const tableName of tablesToClean) {
      try {
        await connection.execute(`DELETE FROM ${tableName}`);
      } catch (error) {
        // Ignore errors for non-existent tables
        this.logger.debug(`Table ${tableName} does not exist or is empty`);
      }
    }

    this.logger.info(`Cleaned up data from ${tablesToClean.length} tables`);
  }

  /**
   * Verify test database setup
   * @param {DatabaseConnection} connection - Database connection
   * @returns {Promise<Object>} Setup verification result
   */
  async verifyTestDatabaseSetup(connection) {
    try {
      const result = {
        connected: connection.isConnected,
        type: connection.getType(),
        tables: [],
        indexes: [],
        constraints: [],
      };

      // Get tables
      const tables = await connection.query(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );
      result.tables = tables.map((t) => t.name);

      // Get indexes
      const indexes = await connection.query(
        "SELECT name FROM sqlite_master WHERE type='index'",
      );
      result.indexes = indexes.map((i) => i.name);

      // Get constraints (SQLite specific)
      if (connection.getType() === "sqlite") {
        const constraints = await connection.query(
          "SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL",
        );
        result.constraints = constraints.map((c) => c.sql);
      }

      this.logger.info("Test database setup verified");
      return result;
    } catch (error) {
      this.logger.error("Failed to verify test database setup:", error);
      throw error;
    }
  }

  /**
   * Get test database statistics
   * @param {DatabaseConnection} connection - Database connection
   * @returns {Promise<Object>} Database statistics
   */
  async getTestDatabaseStats(connection) {
    try {
      const stats = {
        connectionCount: this.connections.size,
        testDatabaseCount: this.testDatabases.size,
        tables: 0,
        records: 0,
        indexes: 0,
      };

      // Get table count
      const tables = await connection.query(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );
      stats.tables = tables.length;

      // Get total record count
      for (const table of tables) {
        try {
          const count = await connection.query(
            `SELECT COUNT(*) as count FROM ${table.name}`,
          );
          stats.records += count[0].count;
        } catch (error) {
          // Ignore errors for system tables
        }
      }

      // Get index count
      const indexes = await connection.query(
        "SELECT name FROM sqlite_master WHERE type='index'",
      );
      stats.indexes = indexes.length;

      return stats;
    } catch (error) {
      this.logger.error("Failed to get test database stats:", error);
      throw error;
    }
  }

  /**
   * Reset test database to clean state
   * @param {DatabaseConnection} connection - Database connection
   * @returns {Promise<void>}
   */
  async resetTestDatabase(connection) {
    try {
      // Clean up all data
      await this.cleanupTestData(connection);

      // Drop all tables
      const tables = await connection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      );

      for (const table of tables) {
        await connection.execute(`DROP TABLE ${table.name}`);
      }

      this.logger.info("Test database reset to clean state");
    } catch (error) {
      this.logger.error("Failed to reset test database:", error);
      throw error;
    }
  }

  /**
   * Create test database with full setup
   * @param {string} type - Database type
   * @param {string} name - Database name
   * @param {Object} config - Configuration
   * @param {Array<string>} tables - Custom tables
   * @returns {Promise<DatabaseConnection>} Database connection
   */
  async createTestDatabaseWithSetup(type, name, config = {}, tables = []) {
    const connection = await this.createTestDatabase(type, name, config);
    await this.createTestTables(connection, tables);
    return connection;
  }

  /**
   * Destroy the test database manager
   * @returns {Promise<void>}
   */
  async destroy() {
    await this.cleanupAllTestDatabases();
    this.connections.clear();
    this.testDatabases.clear();
    this.logger.info("Test database manager destroyed");
  }
}

module.exports = TestDatabaseManager;
