/**
 * Database Configuration
 * Database connection settings and environment-specific configurations
 */

const fs = require("fs");
const path = require("path");
const appConfig = require("./app-config");

class DatabaseConfig {
  constructor() {
    this.databaseType = process.env.DATABASE_TYPE || "sqlite";
  }

  // ============================================================================
  // DATABASE TYPE DETECTION
  // ============================================================================

  get isPostgreSQL() {
    return this.databaseType === "postgres" || this.databaseType === "postgresql";
  }

  get isSQLite() {
    return this.databaseType === "sqlite";
  }

  /** No required DB_HOST in .env: localhost on host, pidea-db (or DB_DOCKER_SERVICE_HOST) in a real container. */
  isRunningInDockerContainer() {
    try {
      return fs.existsSync("/.dockerenv");
    } catch {
      return false;
    }
  }

  resolvePostgresHost() {
    const inContainer = this.isRunningInDockerContainer();
    const defaultHost = inContainer
      ? process.env.DB_DOCKER_SERVICE_HOST || "pidea-db"
      : "localhost";
    let host = process.env.DB_HOST || defaultHost;
    if (inContainer) {
      const loopback =
        host === "localhost" || host === "127.0.0.1" || host === "::1";
      if (loopback) {
        host = process.env.DB_DOCKER_SERVICE_HOST || "pidea-db";
      }
    }
    return host;
  }

  resolvePostgresPort() {
    return process.env.DB_PORT || "5432";
  }

  // ============================================================================
  // CONNECTION SETTINGS
  // ============================================================================

  get host() {
    if (!this.isPostgreSQL) {
      return process.env.DB_HOST;
    }
    return this.resolvePostgresHost();
  }

  get port() {
    if (!this.isPostgreSQL) {
      return process.env.DB_PORT;
    }
    return this.resolvePostgresPort();
  }

  get database() {
    return process.env.DB_NAME;
  }

  get username() {
    return process.env.DB_USER;
  }

  get password() {
    return process.env.DB_PASSWORD;
  }

  get ssl() {
    return process.env.DB_SSL === "true";
  }

  // ============================================================================
  // CONFIGURATION OBJECTS
  // ============================================================================

  get databaseConfig() {
    if (this.isPostgreSQL) {
      return {
        type: "postgresql",
        host: this.host,
        port: this.port,
        database: this.database,
        username: this.username,
        password: this.password,
        logging: appConfig.isDevelopment,
        ssl: this.ssl ? { rejectUnauthorized: false } : false,
      };
    } else {
      return {
        type: "sqlite",
        database: path.join(
          process.cwd(),
          "backend",
          "database",
          "pidea-dev.db",
        ),
        logging: true,
      };
    }
  }

  get connectionPoolConfig() {
    return {
      maxConnections: this.isPostgreSQL ? 10 : 1,
      cleanupInterval: 120000,
      healthCheckInterval: 60000,
    };
  }

  get migrationConfig() {
    return {
      directory: "database/migrations",
      tableName: "migrations",
      logging: appConfig.isDevelopment,
    };
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  validate() {
    const errors = [];
    const warnings = [];

    if (this.isPostgreSQL) {
      const required = ["DB_NAME", "DB_USER", "DB_PASSWORD"];
      for (const envVar of required) {
        if (!process.env[envVar]) {
          errors.push(`Missing required PostgreSQL environment variable: ${envVar}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getConnectionString() {
    if (this.isPostgreSQL) {
      return `postgresql://${this.username}:${this.password}@${this.host}:${this.port}/${this.database}`;
    }
    return this.databaseConfig.database;
  }

  getHealthCheckConfig() {
    return {
      enabled: true,
      interval: appConfig.isProduction ? 30000 : 10000,
      timeout: appConfig.isProduction ? 5000 : 2000,
    };
  }
}

module.exports = new DatabaseConfig();
