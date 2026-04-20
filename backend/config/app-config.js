/**
 * Application Configuration
 * Core application settings: ports, URLs, environment
 */

const { isDockerRuntime } = require("./docker-runtime");

class AppConfig {
  constructor() {
    this.currentEnv = process.env.NODE_ENV || "development";
  }

  // ============================================================================
  // ENVIRONMENT DETECTION
  // ============================================================================

  get environment() {
    return this.currentEnv;
  }

  get isDevelopment() {
    return this.currentEnv === "development";
  }

  get isProduction() {
    return this.currentEnv === "production";
  }

  get isStaging() {
    return this.currentEnv === "staging";
  }

  // ============================================================================
  // PORTS AND URLS
  // ============================================================================

  get backendPort() {
    if (isDockerRuntime()) {
      return 3000;
    }
    return this.extractPortFromUrl(process.env.VITE_BACKEND_URL) || 3000;
  }

  get frontendPort() {
    return (
      process.env.FRONTEND_PORT ||
      this.extractPortFromUrl(process.env.VITE_FRONTEND_URL)
    );
  }

  get websocketPort() {
    return (
      process.env.WEBSOCKET_PORT ||
      this.extractPortFromUrl(process.env.WEBSOCKET_URL)
    );
  }

  get domain() {
    if (this.isDevelopment) {
      return "localhost";
    }
    return process.env.DOMAIN || "localhost";
  }

  get frontendUrl() {
    const protocol = this.isDevelopment ? "http" : "https";
    return `${protocol}://${this.domain}`;
  }

  get backendUrl() {
    if (isDockerRuntime()) {
      return this.frontendUrl;
    }
    return `${this.frontendUrl}:3000`;
  }

  get websocketUrl() {
    return process.env.WEBSOCKET_URL || this.generateWebSocketUrl();
  }

  // ============================================================================
  // SERVER CONFIGURATION
  // ============================================================================

  get serverConfig() {
    return {
      port: this.backendPort,
      env: this.currentEnv,
    };
  }

  get frontendConfig() {
    return {
      port: this.frontendPort,
      url: this.frontendUrl,
    };
  }

  get websocketConfig() {
    return {
      port: this.websocketPort,
      url: this.websocketUrl,
      cors: {
        origin: this.frontendUrl,
        credentials: true,
      },
    };
  }

  // ============================================================================
  // PATH CONFIGURATIONS
  // ============================================================================

  get pathConfig() {
    return {
      tests: {
        backend: "tests",
        frontend: "../frontend/tests",
        playwright: "tests/playwright/tests",
        unit: "tests/unit",
        integration: "tests/integration",
        e2e: "tests/e2e",
      },
      output: {
        screenshots: "tests/playwright/screenshots",
        videos: "tests/playwright/videos",
        reports: "tests/playwright/reports",
        testResultsJson: "tests/playwright/reports/test-results.json",
        coverage: "coverage",
        logs: "logs",
      },
      config: {
        root: "config",
        frameworks: "config/frameworks",
        playwright: "tests/playwright/playwright.config.js",
      },
      project: {
        root: process.cwd(),
        backend: ".",
        frontend: "../frontend",
        docs: "../docs",
      },
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  extractPortFromUrl(url) {
    if (!url) return null;
    const match = url.match(/:(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  generateWebSocketUrl() {
    if (!this.backendUrl) return null;
    return this.backendUrl
      .replace("http://", "ws://")
      .replace("https://", "wss://");
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  validate() {
    const errors = [];
    const warnings = [];

    if (this.isProduction) {
      const required = ["DOMAIN"];
      for (const envVar of required) {
        if (!process.env[envVar]) {
          errors.push(`Missing required production environment variable: ${envVar}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

module.exports = new AppConfig();
