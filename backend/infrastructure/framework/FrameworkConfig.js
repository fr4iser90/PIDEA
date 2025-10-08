/**
 * Framework Config - Infrastructure Layer
 * Manages framework configuration settings and environment variables
 */

const path = require('path');
const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('FrameworkConfig');

class FrameworkConfig {
  constructor() {
    // Use __dirname to get the correct path relative to this file
    const basePath = path.dirname(path.dirname(__dirname)); // Go up from infrastructure/framework to backend root
    this.configPath = path.join(basePath, 'config', 'framework-config.json');
    this.config = this.getDefaultConfig();
    this.isInitialized = false;
  }

  /**
   * Initialize the framework configuration
   */
  async initialize() {
    try {
      // Load configuration from file
      await this.loadConfig();
      
      // Validate configuration
      this.validateConfig();
      
      // Set up environment variables
      this.setupEnvironmentVariables();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize Framework Config:', error.message);
      throw error;
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      framework: {
        autoLoad: false,
        defaultCategory: 'general',
        maxFrameworks: 50,
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        cacheEnabled: true,
        cacheTimeout: 300000, // 5 minutes
        validationEnabled: true,
        securityEnabled: true
      },
      directories: {
        frameworkRoot: 'framework',
        configRoot: 'config/frameworks',
        tempRoot: 'temp/frameworks',
        logRoot: 'logs/frameworks'
      },
      security: {
        allowedPaths: [
          'framework/',
          'domain/',
          'infrastructure/'
        ],
        forbiddenPaths: [
          'node_modules/',
          '.git/',
          'package.json',
          'package-lock.json'
        ],
        maxFileSize: 1024 * 1024, // 1MB
        allowedModules: [
          'fs',
          'path',
          'util',
          'crypto',
          'http',
          'https'
        ],
        forbiddenModules: [
          'child_process',
          'eval',
          'Function'
        ]
      },
      performance: {
        lazyLoading: true,
        parallelLoading: true,
        maxParallelLoads: 5,
        memoryLimit: 100 * 1024 * 1024, // 100MB
        cpuLimit: 50 // 50% CPU usage
      },
      logging: {
        enabled: true,
        level: 'info',
        format: 'json',
        maxFiles: 10,
        maxSize: 10 * 1024 * 1024 // 10MB
      }
    };
  }

  /**
   * Load configuration from file
   */
  async loadConfig() {
    try {
      // Check if config file exists
      try {
        await fs.access(this.configPath);
      } catch {
        logger.info('📁 Creating default framework configuration file...');
        await this.createConfigFile();
        return;
      }

      const configContent = await fs.readFile(this.configPath, 'utf8');
      const fileConfig = JSON.parse(configContent);
      
      // Merge with default config
      this.config = this.mergeConfig(this.config, fileConfig);
      
      logger.info('📋 Framework configuration loaded successfully');
    } catch (error) {
      logger.error('❌ Failed to load framework configuration:', error.message);
      throw error;
    }
  }

  /**
   * Create configuration file
   */
  async createConfigFile() {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      // Write default configuration
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      
      logger.info('📁 Created default framework configuration file');
    } catch (error) {
      logger.error('❌ Failed to create configuration file:', error.message);
      throw error;
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig() {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      logger.info('💾 Framework configuration saved successfully');
    } catch (error) {
      logger.error('❌ Failed to save framework configuration:', error.message);
      throw error;
    }
  }

  /**
   * Merge configurations
   */
  mergeConfig(defaultConfig, userConfig) {
    const merged = { ...defaultConfig };
    
    for (const [section, sectionConfig] of Object.entries(userConfig)) {
      if (merged[section] && typeof merged[section] === 'object' && !Array.isArray(merged[section])) {
        merged[section] = { ...merged[section], ...sectionConfig };
      } else {
        merged[section] = sectionConfig;
      }
    }
    
    return merged;
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const errors = [];

    // Validate framework settings
    if (typeof this.config.framework.autoLoad !== 'boolean') {
      errors.push('framework.autoLoad must be a boolean');
    }

    if (typeof this.config.framework.maxFrameworks !== 'number' || this.config.framework.maxFrameworks <= 0) {
      errors.push('framework.maxFrameworks must be a positive number');
    }

    if (typeof this.config.framework.timeout !== 'number' || this.config.framework.timeout <= 0) {
      errors.push('framework.timeout must be a positive number');
    }

    if (typeof this.config.framework.retryAttempts !== 'number' || this.config.framework.retryAttempts < 0) {
      errors.push('framework.retryAttempts must be a non-negative number');
    }

    // Validate directories
    for (const [key, value] of Object.entries(this.config.directories)) {
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`directories.${key} must be a non-empty string`);
      }
    }

    // Validate security settings
    if (!Array.isArray(this.config.security.allowedPaths)) {
      errors.push('security.allowedPaths must be an array');
    }

    if (!Array.isArray(this.config.security.forbiddenPaths)) {
      errors.push('security.forbiddenPaths must be an array');
    }

    if (typeof this.config.security.maxFileSize !== 'number' || this.config.security.maxFileSize <= 0) {
      errors.push('security.maxFileSize must be a positive number');
    }

    // Validate performance settings
    if (typeof this.config.performance.lazyLoading !== 'boolean') {
      errors.push('performance.lazyLoading must be a boolean');
    }

    if (typeof this.config.performance.parallelLoading !== 'boolean') {
      errors.push('performance.parallelLoading must be a boolean');
    }

    if (typeof this.config.performance.maxParallelLoads !== 'number' || this.config.performance.maxParallelLoads <= 0) {
      errors.push('performance.maxParallelLoads must be a positive number');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    logger.info('✅ Framework configuration validation passed');
  }

  /**
   * Set up environment variables
   */
  setupEnvironmentVariables() {
    // Set framework-related environment variables
    process.env.FRAMEWORK_AUTO_LOAD = this.config.framework.autoLoad.toString();
    process.env.FRAMEWORK_MAX_FRAMEWORKS = this.config.framework.maxFrameworks.toString();
    process.env.FRAMEWORK_TIMEOUT = this.config.framework.timeout.toString();
    process.env.FRAMEWORK_RETRY_ATTEMPTS = this.config.framework.retryAttempts.toString();
    process.env.FRAMEWORK_CACHE_ENABLED = this.config.framework.cacheEnabled.toString();
    process.env.FRAMEWORK_CACHE_TIMEOUT = this.config.framework.cacheTimeout.toString();
    process.env.FRAMEWORK_VALIDATION_ENABLED = this.config.framework.validationEnabled.toString();
    process.env.FRAMEWORK_SECURITY_ENABLED = this.config.framework.securityEnabled.toString();
    
    // Set directory paths
    process.env.FRAMEWORK_ROOT = this.config.directories.frameworkRoot;
    process.env.FRAMEWORK_CONFIG_ROOT = this.config.directories.configRoot;
    process.env.FRAMEWORK_TEMP_ROOT = this.config.directories.tempRoot;
    process.env.FRAMEWORK_LOG_ROOT = this.config.directories.logRoot;
    
    // Set performance settings
    process.env.FRAMEWORK_LAZY_LOADING = this.config.performance.lazyLoading.toString();
    process.env.FRAMEWORK_PARALLEL_LOADING = this.config.performance.parallelLoading.toString();
    process.env.FRAMEWORK_MAX_PARALLEL_LOADS = this.config.performance.maxParallelLoads.toString();
    process.env.FRAMEWORK_MEMORY_LIMIT = this.config.performance.memoryLimit.toString();
    process.env.FRAMEWORK_CPU_LIMIT = this.config.performance.cpuLimit.toString();
    
    // Set logging settings
    process.env.FRAMEWORK_LOGGING_ENABLED = this.config.logging.enabled.toString();
    process.env.FRAMEWORK_LOG_LEVEL = this.config.logging.level;
    process.env.FRAMEWORK_LOG_FORMAT = this.config.logging.format;
    process.env.FRAMEWORK_LOG_MAX_FILES = this.config.logging.maxFiles.toString();
    process.env.FRAMEWORK_LOG_MAX_SIZE = this.config.logging.maxSize.toString();

    logger.info('🔧 Framework environment variables configured');
  }

  /**
   * Get configuration value
   */
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Set configuration value
   */
  set(key, value) {
    const keys = key.split('.');
    let config = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in config) || typeof config[k] !== 'object') {
        config[k] = {};
      }
      config = config[k];
    }
    
    config[keys[keys.length - 1]] = value;
  }

  /**
   * Get framework configuration
   */
  getFrameworkConfig() {
    return this.config.framework;
  }

  /**
   * Get directory configuration
   */
  getDirectoryConfig() {
    return this.config.directories;
  }

  /**
   * Get security configuration
   */
  getSecurityConfig() {
    return this.config.security;
  }

  /**
   * Get performance configuration
   */
  getPerformanceConfig() {
    return this.config.performance;
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig() {
    return this.config.logging;
  }

  /**
   * Update configuration
   */
  async updateConfig(updates) {
    try {
      for (const [key, value] of Object.entries(updates)) {
        this.set(key, value);
      }
      
      // Validate updated configuration
      this.validateConfig();
      
      // Save to file
      await this.saveConfig();
      
      // Update environment variables
      this.setupEnvironmentVariables();
      
      logger.info('✅ Framework configuration updated successfully');
    } catch (error) {
      logger.error('❌ Failed to update framework configuration:', error.message);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig() {
    try {
      this.config = this.getDefaultConfig();
      
      // Validate configuration
      this.validateConfig();
      
      // Save to file
      await this.saveConfig();
      
      // Update environment variables
      this.setupEnvironmentVariables();
      
      logger.info('🔄 Framework configuration reset to defaults');
    } catch (error) {
      logger.error('❌ Failed to reset framework configuration:', error.message);
      throw error;
    }
  }

  /**
   * Get configuration statistics
   */
  getConfigStats() {
    return {
      autoLoad: this.config.framework.autoLoad,
      maxFrameworks: this.config.framework.maxFrameworks,
      timeout: this.config.framework.timeout,
      retryAttempts: this.config.framework.retryAttempts,
      cacheEnabled: this.config.framework.cacheEnabled,
      validationEnabled: this.config.framework.validationEnabled,
      securityEnabled: this.config.framework.securityEnabled,
      lazyLoading: this.config.performance.lazyLoading,
      parallelLoading: this.config.performance.parallelLoading,
      maxParallelLoads: this.config.performance.maxParallelLoads,
      loggingEnabled: this.config.logging.enabled,
      logLevel: this.config.logging.level
    };
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature) {
    const featureMap = {
      'autoLoad': this.config.framework.autoLoad,
      'cache': this.config.framework.cacheEnabled,
      'validation': this.config.framework.validationEnabled,
      'security': this.config.framework.securityEnabled,
      'lazyLoading': this.config.performance.lazyLoading,
      'parallelLoading': this.config.performance.parallelLoading,
      'logging': this.config.logging.enabled
    };
    
    return featureMap[feature] || false;
  }

  /**
   * Get configuration as environment variables
   */
  getEnvironmentVariables() {
    const envVars = {};
    
    // Framework settings
    envVars.FRAMEWORK_AUTO_LOAD = this.config.framework.autoLoad.toString();
    envVars.FRAMEWORK_MAX_FRAMEWORKS = this.config.framework.maxFrameworks.toString();
    envVars.FRAMEWORK_TIMEOUT = this.config.framework.timeout.toString();
    envVars.FRAMEWORK_RETRY_ATTEMPTS = this.config.framework.retryAttempts.toString();
    envVars.FRAMEWORK_CACHE_ENABLED = this.config.framework.cacheEnabled.toString();
    envVars.FRAMEWORK_CACHE_TIMEOUT = this.config.framework.cacheTimeout.toString();
    envVars.FRAMEWORK_VALIDATION_ENABLED = this.config.framework.validationEnabled.toString();
    envVars.FRAMEWORK_SECURITY_ENABLED = this.config.framework.securityEnabled.toString();
    
    // Directory paths
    envVars.FRAMEWORK_ROOT = this.config.directories.frameworkRoot;
    envVars.FRAMEWORK_CONFIG_ROOT = this.config.directories.configRoot;
    envVars.FRAMEWORK_TEMP_ROOT = this.config.directories.tempRoot;
    envVars.FRAMEWORK_LOG_ROOT = this.config.directories.logRoot;
    
    // Performance settings
    envVars.FRAMEWORK_LAZY_LOADING = this.config.performance.lazyLoading.toString();
    envVars.FRAMEWORK_PARALLEL_LOADING = this.config.performance.parallelLoading.toString();
    envVars.FRAMEWORK_MAX_PARALLEL_LOADS = this.config.performance.maxParallelLoads.toString();
    envVars.FRAMEWORK_MEMORY_LIMIT = this.config.performance.memoryLimit.toString();
    envVars.FRAMEWORK_CPU_LIMIT = this.config.performance.cpuLimit.toString();
    
    // Logging settings
    envVars.FRAMEWORK_LOGGING_ENABLED = this.config.logging.enabled.toString();
    envVars.FRAMEWORK_LOG_LEVEL = this.config.logging.level;
    envVars.FRAMEWORK_LOG_FORMAT = this.config.logging.format;
    envVars.FRAMEWORK_LOG_MAX_FILES = this.config.logging.maxFiles.toString();
    envVars.FRAMEWORK_LOG_MAX_SIZE = this.config.logging.maxSize.toString();
    
    return envVars;
  }

  /**
   * Get framework config health status
   */
  getHealthStatus() {
    const isInitialized = this.isInitialized;
    const hasValidConfig = this.config && typeof this.config === 'object';
    const hasRequiredSections = hasValidConfig && 
      this.config.framework && 
      this.config.directories && 
      this.config.security && 
      this.config.performance && 
      this.config.logging;
    
    let validationErrors = [];
    if (hasValidConfig) {
      try {
        this.validateConfig();
      } catch (error) {
        validationErrors.push(error.message);
      }
    }
    
    return {
      isInitialized,
      hasValidConfig,
      hasRequiredSections,
      validationErrors,
      healthScore: isInitialized && hasValidConfig && hasRequiredSections && validationErrors.length === 0 ? 100 : 0,
      isHealthy: isInitialized && hasValidConfig && hasRequiredSections && validationErrors.length === 0
    };
  }
}

module.exports = FrameworkConfig; 