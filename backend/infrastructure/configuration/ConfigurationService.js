/**
 * ConfigurationService - Centralized configuration management
 * Implements configuration management for DDD applications
 * 
 * Created: 2025-01-27
 * Purpose: Centralized configuration with environment support
 */

const Logger = require("@logging/Logger");
const EventBus = require("@infrastructure/messaging/EventBus");
const fs = require('fs').promises;
const path = require('path');

class ConfigurationService {
  constructor(options = {}) {
    this.logger = options.logger || new Logger("ConfigurationService");
    this.eventBus = options.eventBus || new EventBus();
    
    // Configuration storage
    this.config = new Map();
    this.environment = process.env.NODE_ENV || 'development';
    this.configPath = options.configPath || path.join(process.cwd(), 'config');
    
    // Feature flags
    this.featureFlags = new Map();
    
    // Configuration validation
    this.schemas = new Map();
    
    // Dynamic configuration
    this.dynamicConfig = new Map();
    this.watchers = new Map();
  }

  /**
   * Initialize configuration service
   */
  async initialize() {
    try {
      this.logger.info(`Initializing configuration service for environment: ${this.environment}`);
      
      // Load base configuration
      await this.loadBaseConfiguration();
      
      // Load environment-specific configuration
      await this.loadEnvironmentConfiguration();
      
      // Load feature flags
      await this.loadFeatureFlags();
      
      // Load dynamic configuration
      await this.loadDynamicConfiguration();
      
      this.logger.info('Configuration service initialized successfully');
      
      // Emit initialization event
      this.eventBus.emit('configuration.initialized', {
        environment: this.environment,
        configCount: this.config.size,
        featureFlagCount: this.featureFlags.size,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize configuration service:', error);
      throw error;
    }
  }

  /**
   * Load base configuration
   */
  async loadBaseConfiguration() {
    try {
      const baseConfigPath = path.join(this.configPath, 'base.json');
      const baseConfig = await this.loadConfigFile(baseConfigPath);
      
      if (baseConfig) {
        this.mergeConfiguration(baseConfig);
        this.logger.debug('Base configuration loaded');
      }
    } catch (error) {
      this.logger.warn('Base configuration not found or invalid:', error.message);
    }
  }

  /**
   * Load environment-specific configuration
   */
  async loadEnvironmentConfiguration() {
    try {
      const envConfigPath = path.join(this.configPath, `${this.environment}.json`);
      const envConfig = await this.loadConfigFile(envConfigPath);
      
      if (envConfig) {
        this.mergeConfiguration(envConfig);
        this.logger.debug(`Environment configuration loaded: ${this.environment}`);
      }
    } catch (error) {
      this.logger.warn(`Environment configuration not found: ${this.environment}`, error.message);
    }
  }

  /**
   * Load feature flags
   */
  async loadFeatureFlags() {
    try {
      const featureFlagsPath = path.join(this.configPath, 'feature-flags.json');
      const featureFlags = await this.loadConfigFile(featureFlagsPath);
      
      if (featureFlags) {
        for (const [key, value] of Object.entries(featureFlags)) {
          this.featureFlags.set(key, value);
        }
        this.logger.debug(`Feature flags loaded: ${this.featureFlags.size}`);
      }
    } catch (error) {
      this.logger.warn('Feature flags not found or invalid:', error.message);
    }
  }

  /**
   * Load dynamic configuration
   */
  async loadDynamicConfiguration() {
    try {
      const dynamicConfigPath = path.join(this.configPath, 'dynamic.json');
      const dynamicConfig = await this.loadConfigFile(dynamicConfigPath);
      
      if (dynamicConfig) {
        for (const [key, value] of Object.entries(dynamicConfig)) {
          this.dynamicConfig.set(key, value);
        }
        this.logger.debug(`Dynamic configuration loaded: ${this.dynamicConfig.size}`);
      }
    } catch (error) {
      this.logger.warn('Dynamic configuration not found or invalid:', error.message);
    }
  }

  /**
   * Load configuration file
   * @param {string} filePath - File path
   * @returns {Object|null} Configuration object
   */
  async loadConfigFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Merge configuration into current config
   * @param {Object} newConfig - New configuration
   */
  mergeConfiguration(newConfig) {
    for (const [key, value] of Object.entries(newConfig)) {
      this.config.set(key, value);
    }
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key
   * @param {any} defaultValue - Default value
   * @returns {any} Configuration value
   */
  get(key, defaultValue = null) {
    // Check dynamic configuration first
    if (this.dynamicConfig.has(key)) {
      return this.dynamicConfig.get(key);
    }
    
    // Check regular configuration
    if (this.config.has(key)) {
      return this.config.get(key);
    }
    
    // Check environment variables
    const envKey = key.toUpperCase().replace(/\./g, '_');
    if (process.env[envKey]) {
      return this.parseEnvironmentValue(process.env[envKey]);
    }
    
    return defaultValue;
  }

  /**
   * Set configuration value
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   */
  set(key, value) {
    this.config.set(key, value);
    
    // Emit configuration changed event
    this.eventBus.emit('configuration.changed', {
      key,
      value,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Set dynamic configuration value
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   */
  setDynamic(key, value) {
    this.dynamicConfig.set(key, value);
    
    // Emit dynamic configuration changed event
    this.eventBus.emit('configuration.dynamic-changed', {
      key,
      value,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if feature flag is enabled
   * @param {string} flag - Feature flag name
   * @returns {boolean} True if enabled
   */
  isFeatureEnabled(flag) {
    return this.featureFlags.get(flag) === true;
  }

  /**
   * Set feature flag
   * @param {string} flag - Feature flag name
   * @param {boolean} enabled - Enabled state
   */
  setFeatureFlag(flag, enabled) {
    this.featureFlags.set(flag, enabled);
    
    // Emit feature flag changed event
    this.eventBus.emit('configuration.feature-flag-changed', {
      flag,
      enabled,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get all configuration
   * @returns {Object} All configuration
   */
  getAll() {
    const config = {};
    
    // Add regular configuration
    for (const [key, value] of this.config) {
      config[key] = value;
    }
    
    // Add dynamic configuration
    for (const [key, value] of this.dynamicConfig) {
      config[key] = value;
    }
    
    return config;
  }

  /**
   * Get feature flags
   * @returns {Object} Feature flags
   */
  getFeatureFlags() {
    const flags = {};
    for (const [key, value] of this.featureFlags) {
      flags[key] = value;
    }
    return flags;
  }

  /**
   * Parse environment value
   * @param {string} value - Environment value
   * @returns {any} Parsed value
   */
  parseEnvironmentValue(value) {
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      // Return as string
      return value;
    }
  }

  /**
   * Validate configuration against schema
   * @param {string} key - Configuration key
   * @param {Object} schema - Validation schema
   */
  validateConfiguration(key, schema) {
    const value = this.get(key);
    
    // Simple validation (can be extended with JSON Schema)
    if (schema.required && value === null) {
      throw new Error(`Configuration key '${key}' is required`);
    }
    
    if (schema.type && typeof value !== schema.type) {
      throw new Error(`Configuration key '${key}' must be of type ${schema.type}`);
    }
    
    return true;
  }

  /**
   * Get configuration statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      environment: this.environment,
      configCount: this.config.size,
      dynamicConfigCount: this.dynamicConfig.size,
      featureFlagCount: this.featureFlags.size,
      watcherCount: this.watchers.size
    };
  }
}

module.exports = ConfigurationService;
