/**
 * Test Database Configuration
 *
 * Centralized configuration management for test databases including
 * connection settings, test data setup, and environment-specific options.
 */

const path = require("path");
const fs = require("fs").promises;

class TestDatabaseConfig {
  constructor() {
    this.config = {
      databases: {
        sqlite: {
          type: "sqlite",
          database: ":memory:",
          options: {
            enableForeignKeys: true,
            enableWAL: true,
            synchronous: "NORMAL",
            journalMode: "WAL",
            cacheSize: 1000,
            tempStore: "MEMORY",
          },
        },
        postgresql: {
          type: "postgresql",
          host: "localhost",
          port: 5432,
          database: "pidea_test",
          username: "test_user",
          password: "test_password",
          options: {
            ssl: false,
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
            max: 10,
            min: 2,
          },
        },
      },
      testData: {
        fixtures: {
          path: path.join(__dirname, "../fixtures"),
          format: "json",
          encoding: "utf8",
        },
        generators: {
          path: path.join(__dirname, "../generators"),
          format: "js",
          encoding: "utf8",
        },
      },
      environment: {
        isolation: true,
        cleanup: true,
        monitoring: false,
        optimization: false,
        parallel: false,
        timeout: 30000,
      },
      performance: {
        monitoring: {
          enabled: false,
          threshold: 1000,
          metrics: ["execution_time", "memory_usage", "query_count"],
        },
        optimization: {
          enabled: false,
          indexes: true,
          constraints: true,
          triggers: true,
        },
      },
      security: {
        encryption: false,
        authentication: false,
        authorization: false,
        audit: false,
      },
    };

    this.loadedConfigs = new Map();
    this.environmentOverrides = new Map();
  }

  /**
   * Load configuration from file
   * @param {string} configPath - Path to configuration file
   * @returns {Promise<Object>} Loaded configuration
   */
  async loadConfig(configPath) {
    try {
      const fullPath = path.resolve(configPath);
      const configData = await fs.readFile(fullPath, "utf8");
      const config = JSON.parse(configData);

      this.loadedConfigs.set(configPath, config);
      return config;
    } catch (error) {
      throw new Error(
        `Failed to load configuration from ${configPath}: ${error.message}`,
      );
    }
  }

  /**
   * Save configuration to file
   * @param {string} configPath - Path to configuration file
   * @param {Object} config - Configuration to save
   * @returns {Promise<void>}
   */
  async saveConfig(configPath, config) {
    try {
      const fullPath = path.resolve(configPath);
      const configData = JSON.stringify(config, null, 2);
      await fs.writeFile(fullPath, configData, "utf8");

      this.loadedConfigs.set(configPath, config);
    } catch (error) {
      throw new Error(
        `Failed to save configuration to ${configPath}: ${error.message}`,
      );
    }
  }

  /**
   * Get database configuration
   * @param {string} type - Database type (sqlite, postgresql)
   * @param {Object} overrides - Configuration overrides
   * @returns {Object} Database configuration
   */
  getDatabaseConfig(type, overrides = {}) {
    const baseConfig = this.config.databases[type];
    if (!baseConfig) {
      throw new Error(`Unknown database type: ${type}`);
    }

    return this.mergeConfig(baseConfig, overrides);
  }

  /**
   * Get test data configuration
   * @param {Object} overrides - Configuration overrides
   * @returns {Object} Test data configuration
   */
  getTestDataConfig(overrides = {}) {
    return this.mergeConfig(this.config.testData, overrides);
  }

  /**
   * Get environment configuration
   * @param {Object} overrides - Configuration overrides
   * @returns {Object} Environment configuration
   */
  getEnvironmentConfig(overrides = {}) {
    return this.mergeConfig(this.config.environment, overrides);
  }

  /**
   * Get performance configuration
   * @param {Object} overrides - Configuration overrides
   * @returns {Object} Performance configuration
   */
  getPerformanceConfig(overrides = {}) {
    return this.mergeConfig(this.config.performance, overrides);
  }

  /**
   * Get security configuration
   * @param {Object} overrides - Configuration overrides
   * @returns {Object} Security configuration
   */
  getSecurityConfig(overrides = {}) {
    return this.mergeConfig(this.config.security, overrides);
  }

  /**
   * Set environment override
   * @param {string} key - Configuration key
   * @param {any} value - Override value
   */
  setEnvironmentOverride(key, value) {
    this.environmentOverrides.set(key, value);
  }

  /**
   * Get environment override
   * @param {string} key - Configuration key
   * @returns {any} Override value
   */
  getEnvironmentOverride(key) {
    return this.environmentOverrides.get(key);
  }

  /**
   * Clear environment overrides
   */
  clearEnvironmentOverrides() {
    this.environmentOverrides.clear();
  }

  /**
   * Get complete configuration with overrides
   * @param {Object} overrides - Configuration overrides
   * @returns {Object} Complete configuration
   */
  getCompleteConfig(overrides = {}) {
    const config = { ...this.config };

    // Apply environment overrides
    for (const [key, value] of this.environmentOverrides) {
      this.setNestedValue(config, key, value);
    }

    // Apply provided overrides
    return this.mergeConfig(config, overrides);
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig(config) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Validate database configurations
    if (config.databases) {
      for (const [type, dbConfig] of Object.entries(config.databases)) {
        const dbValidation = this.validateDatabaseConfig(type, dbConfig);
        if (!dbValidation.valid) {
          result.valid = false;
          result.errors.push(...dbValidation.errors);
        }
        result.warnings.push(...dbValidation.warnings);
      }
    }

    // Validate test data configuration
    if (config.testData) {
      const testDataValidation = this.validateTestDataConfig(config.testData);
      if (!testDataValidation.valid) {
        result.valid = false;
        result.errors.push(...testDataValidation.errors);
      }
      result.warnings.push(...testDataValidation.warnings);
    }

    // Validate environment configuration
    if (config.environment) {
      const envValidation = this.validateEnvironmentConfig(config.environment);
      if (!envValidation.valid) {
        result.valid = false;
        result.errors.push(...envValidation.errors);
      }
      result.warnings.push(...envValidation.warnings);
    }

    return result;
  }

  /**
   * Validate database configuration
   * @param {string} type - Database type
   * @param {Object} config - Database configuration
   * @returns {Object} Validation result
   */
  validateDatabaseConfig(type, config) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Required fields validation
    const requiredFields = ["type"];
    for (const field of requiredFields) {
      if (!config[field]) {
        result.valid = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Type-specific validation
    if (type === "sqlite") {
      if (!config.database) {
        result.warnings.push(
          "SQLite database path not specified, using in-memory database",
        );
      }
    } else if (type === "postgresql") {
      const requiredPostgresFields = ["host", "port", "database", "username"];
      for (const field of requiredPostgresFields) {
        if (!config[field]) {
          result.valid = false;
          result.errors.push(`Missing required PostgreSQL field: ${field}`);
        }
      }
    }

    return result;
  }

  /**
   * Validate test data configuration
   * @param {Object} config - Test data configuration
   * @returns {Object} Validation result
   */
  validateTestDataConfig(config) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (config.fixtures) {
      if (!config.fixtures.path) {
        result.valid = false;
        result.errors.push("Test data fixtures path not specified");
      }
    }

    if (config.generators) {
      if (!config.generators.path) {
        result.valid = false;
        result.errors.push("Test data generators path not specified");
      }
    }

    return result;
  }

  /**
   * Validate environment configuration
   * @param {Object} config - Environment configuration
   * @returns {Object} Validation result
   */
  validateEnvironmentConfig(config) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (config.timeout && typeof config.timeout !== "number") {
      result.valid = false;
      result.errors.push("Environment timeout must be a number");
    }

    if (config.timeout && config.timeout < 1000) {
      result.warnings.push("Environment timeout is very low, tests may fail");
    }

    return result;
  }

  /**
   * Merge configuration objects
   * @param {Object} base - Base configuration
   * @param {Object} override - Override configuration
   * @returns {Object} Merged configuration
   */
  mergeConfig(base, override) {
    const result = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        result[key] = this.mergeConfig(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Set nested value in configuration
   * @param {Object} config - Configuration object
   * @param {string} key - Nested key (e.g., 'database.host')
   * @param {any} value - Value to set
   */
  setNestedValue(config, key, value) {
    const keys = key.split(".");
    let current = config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k] || typeof current[k] !== "object") {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Get nested value from configuration
   * @param {Object} config - Configuration object
   * @param {string} key - Nested key (e.g., 'database.host')
   * @returns {any} Value
   */
  getNestedValue(config, key) {
    const keys = key.split(".");
    let current = config;

    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Export configuration to file
   * @param {string} filePath - Export file path
   * @param {Object} config - Configuration to export
   * @returns {Promise<void>}
   */
  async exportConfig(filePath, config = null) {
    try {
      const exportConfig = config || this.getCompleteConfig();
      const configData = JSON.stringify(exportConfig, null, 2);
      await fs.writeFile(filePath, configData, "utf8");
    } catch (error) {
      throw new Error(`Failed to export configuration: ${error.message}`);
    }
  }

  /**
   * Import configuration from file
   * @param {string} filePath - Import file path
   * @returns {Promise<Object>} Imported configuration
   */
  async importConfig(filePath) {
    try {
      const configData = await fs.readFile(filePath, "utf8");
      const config = JSON.parse(configData);

      // Validate imported configuration
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(
          `Invalid configuration: ${validation.errors.join(", ")}`,
        );
      }

      // Merge with current configuration
      this.config = this.mergeConfig(this.config, config);

      return config;
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error.message}`);
    }
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = {
      databases: {
        sqlite: {
          type: "sqlite",
          database: ":memory:",
          options: {
            enableForeignKeys: true,
            enableWAL: true,
            synchronous: "NORMAL",
            journalMode: "WAL",
            cacheSize: 1000,
            tempStore: "MEMORY",
          },
        },
        postgresql: {
          type: "postgresql",
          host: "localhost",
          port: 5432,
          database: "pidea_test",
          username: "test_user",
          password: "test_password",
          options: {
            ssl: false,
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
            max: 10,
            min: 2,
          },
        },
      },
      testData: {
        fixtures: {
          path: path.join(__dirname, "../fixtures"),
          format: "json",
          encoding: "utf8",
        },
        generators: {
          path: path.join(__dirname, "../generators"),
          format: "js",
          encoding: "utf8",
        },
      },
      environment: {
        isolation: true,
        cleanup: true,
        monitoring: false,
        optimization: false,
        parallel: false,
        timeout: 30000,
      },
      performance: {
        monitoring: {
          enabled: false,
          threshold: 1000,
          metrics: ["execution_time", "memory_usage", "query_count"],
        },
        optimization: {
          enabled: false,
          indexes: true,
          constraints: true,
          triggers: true,
        },
      },
      security: {
        encryption: false,
        authentication: false,
        authorization: false,
        audit: false,
      },
    };

    this.loadedConfigs.clear();
    this.environmentOverrides.clear();
  }
}

module.exports = TestDatabaseConfig;
