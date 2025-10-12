/**
 * Test Data Manager
 * 
 * Manages test data fixtures, generators, and data setup for database tests.
 * Provides utilities for loading, generating, and cleaning up test data.
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('../../infrastructure/logging/Logger');

class TestDataManager {
  constructor(databaseConnection) {
    this.databaseConnection = databaseConnection;
    this.logger = new Logger('TestDataManager');
    this.fixtures = new Map();
    this.generators = new Map();
    this.loadedFixtures = new Set();
  }

  /**
   * Load test fixture from file
   * @param {string} fixtureName - Name of the fixture
   * @param {Object} options - Loading options
   * @returns {Promise<Object>} Loaded fixture data
   */
  async loadFixture(fixtureName, options = {}) {
    try {
      const {
        format = 'json',
        encoding = 'utf8',
        path: fixturePath = null
      } = options;

      const fixtureFile = fixturePath || path.join(__dirname, `${fixtureName}.${format}`);
      const fixtureData = await fs.readFile(fixtureFile, encoding);

      let parsedData;
      if (format === 'json') {
        parsedData = JSON.parse(fixtureData);
      } else if (format === 'js') {
        // For JavaScript fixtures, we need to evaluate them
        const module = require(fixtureFile);
        parsedData = typeof module === 'function' ? module() : module;
      } else {
        throw new Error(`Unsupported fixture format: ${format}`);
      }

      this.fixtures.set(fixtureName, parsedData);
      this.loadedFixtures.add(fixtureName);

      this.logger.info(`Loaded fixture: ${fixtureName}`);
      return parsedData;
    } catch (error) {
      this.logger.error(`Failed to load fixture ${fixtureName}:`, error);
      throw error;
    }
  }

  /**
   * Generate test data using a generator
   * @param {string} generatorName - Name of the generator
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated test data
   */
  async generateTestData(generatorName, options = {}) {
    try {
      const {
        count = 1,
        format = 'json',
        path: generatorPath = null
      } = options;

      const generatorFile = generatorPath || path.join(__dirname, `../generators/${generatorName}.${format}`);
      const generatorModule = require(generatorFile);

      if (typeof generatorModule !== 'function') {
        throw new Error(`Generator ${generatorName} must export a function`);
      }

      const generatedData = generatorModule(count, options);
      this.generators.set(generatorName, generatedData);

      this.logger.info(`Generated test data using generator: ${generatorName}`);
      return generatedData;
    } catch (error) {
      this.logger.error(`Failed to generate test data with generator ${generatorName}:`, error);
      throw error;
    }
  }

  /**
   * Setup test data in database
   * @param {string} fixtureName - Name of the fixture
   * @param {Object} options - Setup options
   * @returns {Promise<void>}
   */
  async setupTestData(fixtureName, options = {}) {
    try {
      const {
        tables = [],
        clearExisting = true,
        validate = true
      } = options;

      // Load fixture if not already loaded
      if (!this.fixtures.has(fixtureName)) {
        await this.loadFixture(fixtureName);
      }

      const fixtureData = this.fixtures.get(fixtureName);

      // Clear existing data if requested
      if (clearExisting) {
        await this.clearTestData(tables);
      }

      // Insert test data
      for (const [tableName, tableData] of Object.entries(fixtureData)) {
        if (tables.length === 0 || tables.includes(tableName)) {
          await this.insertTestData(tableName, tableData);
        }
      }

      // Validate data if requested
      if (validate) {
        await this.validateTestData(fixtureData);
      }

      this.logger.info(`Setup test data for fixture: ${fixtureName}`);
    } catch (error) {
      this.logger.error(`Failed to setup test data for fixture ${fixtureName}:`, error);
      throw error;
    }
  }

  /**
   * Insert test data into database table
   * @param {string} tableName - Name of the table
   * @param {Array|Object} data - Data to insert
   * @returns {Promise<void>}
   */
  async insertTestData(tableName, data) {
    try {
      if (!this.databaseConnection) {
        throw new Error('Database connection not available');
      }

      const dataArray = Array.isArray(data) ? data : [data];

      for (const record of dataArray) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = columns.map(() => '?').join(', ');

        const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        await this.databaseConnection.query(query, values);
      }

      this.logger.info(`Inserted ${dataArray.length} records into table: ${tableName}`);
    } catch (error) {
      this.logger.error(`Failed to insert test data into table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Clear test data from database
   * @param {Array<string>} tables - Tables to clear
   * @returns {Promise<void>}
   */
  async clearTestData(tables = []) {
    try {
      if (!this.databaseConnection) {
        throw new Error('Database connection not available');
      }

      if (tables.length === 0) {
        // Clear all tables
        const tableQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
        const tableResult = await this.databaseConnection.query(tableQuery);
        tables = tableResult.map(row => row.name);
      }

      for (const tableName of tables) {
        await this.databaseConnection.query(`DELETE FROM ${tableName}`);
        this.logger.info(`Cleared table: ${tableName}`);
      }
    } catch (error) {
      this.logger.error('Failed to clear test data:', error);
      throw error;
    }
  }

  /**
   * Validate test data integrity
   * @param {Object} fixtureData - Fixture data to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateTestData(fixtureData) {
    try {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
        tables: {}
      };

      for (const [tableName, tableData] of Object.entries(fixtureData)) {
        const tableValidation = await this.validateTableData(tableName, tableData);
        result.tables[tableName] = tableValidation;

        if (!tableValidation.valid) {
          result.valid = false;
          result.errors.push(...tableValidation.errors);
        }
        result.warnings.push(...tableValidation.warnings);
      }

      this.logger.info('Test data validation completed');
      return result;
    } catch (error) {
      this.logger.error('Failed to validate test data:', error);
      throw error;
    }
  }

  /**
   * Validate table data
   * @param {string} tableName - Name of the table
   * @param {Array|Object} tableData - Table data to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateTableData(tableName, tableData) {
    try {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
        recordCount: 0,
        expectedCount: 0
      };

      const dataArray = Array.isArray(tableData) ? tableData : [tableData];
      result.expectedCount = dataArray.length;

      // Check if table exists
      const tableExistsQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name = ?";
      const tableExists = await this.databaseConnection.query(tableExistsQuery, [tableName]);

      if (tableExists.length === 0) {
        result.valid = false;
        result.errors.push(`Table ${tableName} does not exist`);
        return result;
      }

      // Get table schema
      const schemaQuery = `PRAGMA table_info(${tableName})`;
      const schema = await this.databaseConnection.query(schemaQuery);

      // Validate data structure
      for (const record of dataArray) {
        const recordValidation = this.validateRecord(record, schema);
        if (!recordValidation.valid) {
          result.valid = false;
          result.errors.push(...recordValidation.errors);
        }
        result.warnings.push(...recordValidation.warnings);
      }

      // Check record count
      const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
      const countResult = await this.databaseConnection.query(countQuery);
      result.recordCount = countResult[0].count;

      if (result.recordCount !== result.expectedCount) {
        result.warnings.push(`Record count mismatch: expected ${result.expectedCount}, got ${result.recordCount}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to validate table data for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Validate individual record
   * @param {Object} record - Record to validate
   * @param {Array} schema - Table schema
   * @returns {Object} Validation result
   */
  validateRecord(record, schema) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    const recordKeys = Object.keys(record);
    const schemaColumns = schema.map(col => col.name);

    // Check for missing required columns
    for (const column of schema) {
      if (column.notnull && !recordKeys.includes(column.name)) {
        result.valid = false;
        result.errors.push(`Missing required column: ${column.name}`);
      }
    }

    // Check for extra columns
    for (const key of recordKeys) {
      if (!schemaColumns.includes(key)) {
        result.warnings.push(`Extra column: ${key}`);
      }
    }

    // Validate data types
    for (const column of schema) {
      if (record[column.name] !== undefined) {
        const typeValidation = this.validateDataType(record[column.name], column.type);
        if (!typeValidation.valid) {
          result.valid = false;
          result.errors.push(`Invalid data type for column ${column.name}: ${typeValidation.error}`);
        }
      }
    }

    return result;
  }

  /**
   * Validate data type
   * @param {any} value - Value to validate
   * @param {string} expectedType - Expected data type
   * @returns {Object} Validation result
   */
  validateDataType(value, expectedType) {
    const result = {
      valid: true,
      error: null
    };

    const type = expectedType.toLowerCase();

    if (type.includes('int') && typeof value !== 'number') {
      result.valid = false;
      result.error = `Expected integer, got ${typeof value}`;
    } else if (type.includes('text') && typeof value !== 'string') {
      result.valid = false;
      result.error = `Expected string, got ${typeof value}`;
    } else if (type.includes('real') && typeof value !== 'number') {
      result.valid = false;
      result.error = `Expected number, got ${typeof value}`;
    } else if (type.includes('blob') && !Buffer.isBuffer(value)) {
      result.valid = false;
      result.error = `Expected buffer, got ${typeof value}`;
    }

    return result;
  }

  /**
   * Get test data statistics
   * @returns {Promise<Object>} Test data statistics
   */
  async getTestDataStats() {
    try {
      const stats = {
        fixtures: this.fixtures.size,
        generators: this.generators.size,
        loadedFixtures: this.loadedFixtures.size,
        tables: {}
      };

      // Get table statistics
      const tableQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
      const tables = await this.databaseConnection.query(tableQuery);

      for (const table of tables) {
        const countQuery = `SELECT COUNT(*) as count FROM ${table.name}`;
        const countResult = await this.databaseConnection.query(countQuery);
        stats.tables[table.name] = countResult[0].count;
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get test data statistics:', error);
      throw error;
    }
  }

  /**
   * Export test data to file
   * @param {string} filePath - Export file path
   * @param {Object} options - Export options
   * @returns {Promise<void>}
   */
  async exportTestData(filePath, options = {}) {
    try {
      const {
        format = 'json',
        tables = [],
        includeSchema = false
      } = options;

      const exportData = {
        tables: {},
        schema: {},
        metadata: {
          exportedAt: new Date().toISOString(),
          format,
          includeSchema
        }
      };

      // Get table list
      const tableQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
      const tableList = await this.databaseConnection.query(tableQuery);
      const tablesToExport = tables.length > 0 ? tables : tableList.map(t => t.name);

      // Export table data
      for (const tableName of tablesToExport) {
        const dataQuery = `SELECT * FROM ${tableName}`;
        const tableData = await this.databaseConnection.query(dataQuery);
        exportData.tables[tableName] = tableData;

        // Export schema if requested
        if (includeSchema) {
          const schemaQuery = `PRAGMA table_info(${tableName})`;
          const schema = await this.databaseConnection.query(schemaQuery);
          exportData.schema[tableName] = schema;
        }
      }

      // Write to file
      const dataString = format === 'json' ? JSON.stringify(exportData, null, 2) : exportData;
      await fs.writeFile(filePath, dataString, 'utf8');

      this.logger.info(`Exported test data to: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to export test data to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Import test data from file
   * @param {string} filePath - Import file path
   * @param {Object} options - Import options
   * @returns {Promise<void>}
   */
  async importTestData(filePath, options = {}) {
    try {
      const {
        clearExisting = true,
        validate = true
      } = options;

      const fileData = await fs.readFile(filePath, 'utf8');
      const importData = JSON.parse(fileData);

      if (clearExisting) {
        await this.clearTestData();
      }

      // Import table data
      for (const [tableName, tableData] of Object.entries(importData.tables)) {
        await this.insertTestData(tableName, tableData);
      }

      if (validate) {
        await this.validateTestData(importData.tables);
      }

      this.logger.info(`Imported test data from: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to import test data from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Reset test data manager
   * @returns {Promise<void>}
   */
  async reset() {
    try {
      this.fixtures.clear();
      this.generators.clear();
      this.loadedFixtures.clear();

      // Clear all test data
      await this.clearTestData();

      this.logger.info('Test data manager reset');
    } catch (error) {
      this.logger.error('Failed to reset test data manager:', error);
      throw error;
    }
  }
}

module.exports = TestDataManager;
