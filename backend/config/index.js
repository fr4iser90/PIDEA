/**
 * Configuration Aggregator
 * Main entry point for all configuration modules
 * Provides a unified interface to all domain-specific configurations
 */

const appConfig = require("./app-config");
const databaseConfig = require("./database-config");
const ideConfig = require("./ide-config");
const monitoringConfig = require("./monitoring-config");
const securityConfig = require("./security-config");

class ConfigManager {
  constructor() {
    this.configs = {
      app: appConfig,
      database: databaseConfig,
      ide: ideConfig,
      monitoring: monitoringConfig,
      security: securityConfig,
    };
  }

  // ============================================================================
  // CONFIGURATION ACCESS
  // ============================================================================

  get app() {
    return this.configs.app;
  }

  get database() {
    return this.configs.database;
  }

  get ide() {
    return this.configs.ide;
  }

  get monitoring() {
    return this.configs.monitoring;
  }

  get security() {
    return this.configs.security;
  }


  // ============================================================================
  // VALIDATION
  // ============================================================================

  validate() {
    const results = {};
    let isValid = true;
    const allErrors = [];
    const allWarnings = [];

    for (const [name, config] of Object.entries(this.configs)) {
      if (config.validate) {
        const result = config.validate();
        results[name] = result;
        
        if (!result.isValid) {
          isValid = false;
        }
        
        allErrors.push(...(result.errors || []));
        allWarnings.push(...(result.warnings || []));
      }
    }

    return {
      isValid,
      results,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getFullConfig() {
    return {
      app: {
        server: this.app.serverConfig,
        frontend: this.app.frontendConfig,
        websocket: this.app.websocketConfig,
        paths: this.app.pathConfig,
        environment: this.app.environment,
      },
      database: this.database.databaseConfig,
      ide: this.ide.ideConfig,
      monitoring: this.monitoring.getFullConfig(),
      security: this.security.getSecurityConfig(),
    };
  }

  isProduction() {
    return this.app.isProduction;
  }

  isDevelopment() {
    return this.app.isDevelopment;
  }

  isStaging() {
    return this.app.isStaging;
  }

  // ============================================================================
  // CONFIGURATION SUMMARY
  // ============================================================================

  getSummary() {
    const validation = this.validate();
    
    return {
      environment: this.app.environment,
      isValid: validation.isValid,
      configs: Object.keys(this.configs),
      errors: validation.errors.length,
      warnings: validation.warnings.length,
      database: this.database.isPostgreSQL ? "PostgreSQL" : "SQLite",
      monitoring: this.monitoring.isMonitoringEnabled(),
    };
  }
}

// Export singleton instance
const configManager = new ConfigManager();

// Export individual configs for direct access
module.exports = configManager;
module.exports.app = appConfig;
module.exports.database = databaseConfig;
module.exports.ide = ideConfig;
module.exports.monitoring = monitoringConfig;
module.exports.security = securityConfig;
