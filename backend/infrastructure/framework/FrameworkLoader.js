/**
 * Framework Loader - Infrastructure Layer
 * Loads and manages framework instances using the domain FrameworkRegistry
 */

const path = require('path');
const fs = require('fs').promises;
const { initializeFrameworks } = require('@domain/frameworks');
const Logger = require('@logging/Logger');
const logger = new Logger('FrameworkLoader');

class FrameworkLoader {
  constructor() {
    this.loadedFrameworks = new Map();
    this.frameworkPaths = new Map();
    this.loadingQueue = [];
    this.isLoading = false;
    this.frameworkConfigs = []; // Store configurations for domain layer
    this.domainFrameworkSystem = null; // Domain layer system
  }

  /**
   * Initialize the framework loader
   */
  async initialize() {
    try {
      logger.info('🚀 Initializing Framework Loader...');
      
      // Discover framework directories
      await this.discoverFrameworks();
      
      // Load framework configurations
      await this.loadFrameworkConfigs();
      
      // Initialize domain layer with collected configurations
      try {
        this.domainFrameworkSystem = await initializeFrameworks(this.frameworkConfigs);
        logger.info(`✅ Domain framework system initialized with ${this.frameworkConfigs.length} configurations`);
      } catch (domainError) {
        logger.warn(`⚠️ Domain framework system initialization failed:`, domainError.message);
      }

      logger.info(`✅ Framework Loader initialized with ${this.loadedFrameworks.size} frameworks`);
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize Framework Loader:', error.message);
      throw error;
    }
  }

  /**
   * Discover framework directories
   */
  async discoverFrameworks() {
    try {
      // Use __dirname to get the correct path relative to this file
      const basePath = path.dirname(path.dirname(__dirname)); // Go up from infrastructure/framework to backend root
      const frameworkRoot = path.join(basePath, 'framework');
      
      // Check if framework directory exists
      try {
        await fs.access(frameworkRoot);
      } catch {
        logger.info('📁 Creating framework root directory...');
        await fs.mkdir(frameworkRoot, { recursive: true });
        return;
      }

      const entries = await fs.readdir(frameworkRoot, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const frameworkPath = path.join(frameworkRoot, entry.name);
          this.frameworkPaths.set(entry.name, frameworkPath);
          logger.debug(`📁 Discovered framework: ${entry.name}`);
        }
      }

      logger.info(`🔍 Discovered ${this.frameworkPaths.size} framework directories`);
    } catch (error) {
      logger.error('❌ Failed to discover frameworks:', error.message);
      throw error;
    }
  }

  /**
   * Load framework configurations
   */
  async loadFrameworkConfigs() {
    try {
      for (const [frameworkName, frameworkPath] of this.frameworkPaths) {
        try {
          await this.loadFrameworkConfig(frameworkName, frameworkPath);
        } catch (error) {
          logger.error(`❌ Failed to load framework "${frameworkName}":`, error.message);
        }
      }
    } catch (error) {
      logger.error('❌ Failed to load framework configs:', error.message);
      throw error;
    }
  }

  /**
   * Load individual framework configuration
   */
  async loadFrameworkConfig(frameworkName, frameworkPath) {
    try {
      const configPath = path.join(frameworkPath, 'framework.json');
      
      // Check if config file exists
      try {
        await fs.access(configPath);
      } catch {
        logger.warn(`⚠️ No config file found for framework "${frameworkName}", creating default config`);
        await this.createDefaultConfig(frameworkName, frameworkPath);
        return;
      }

      const configContent = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      // Validate configuration
      this.validateFrameworkConfig(config);
      
      // Store configuration for domain layer initialization
      this.frameworkConfigs.push(config);
      
      // Store loaded framework
      this.loadedFrameworks.set(frameworkName, {
        name: frameworkName,
        path: frameworkPath,
        config: config,
        status: 'loaded',
        loadedAt: new Date(),
        domainRegistered: true
      });

      logger.debug(`✅ Loaded framework "${frameworkName}" successfully`);
    } catch (error) {
      logger.error(`❌ Failed to load framework config "${frameworkName}":`, error.message);
      // Store failed framework for debugging
      this.loadedFrameworks.set(frameworkName, {
        name: frameworkName,
        path: frameworkPath,
        config: null,
        status: 'failed',
        loadedAt: new Date(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create default framework configuration
   */
  async createDefaultConfig(frameworkName, frameworkPath) {
    const defaultConfig = {
      name: frameworkName,
      version: '1.0.0',
      description: `Framework for ${frameworkName}`,
      category: 'general',
      author: 'PIDEA Team',
      dependencies: ['core'],
      steps: {},
      workflows: {},
      activation: {
        auto_load: false,
        requires_confirmation: true,
        fallback_to_core: true
      }
    };

    const configPath = path.join(frameworkPath, 'framework.json');
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    
    // Store configuration for domain layer initialization
    this.frameworkConfigs.push(defaultConfig);
    
    // Store loaded framework
    this.loadedFrameworks.set(frameworkName, {
      name: frameworkName,
      path: frameworkPath,
      config: defaultConfig,
      status: 'loaded',
      loadedAt: new Date(),
      domainRegistered: true,
      isDefault: true
    });

    logger.info(`✅ Created default config for framework "${frameworkName}"`);
  }

  /**
   * Load a specific framework
   */
  async loadFramework(frameworkName) {
    try {
      if (this.loadedFrameworks.has(frameworkName)) {
        logger.info(`📦 Framework "${frameworkName}" already loaded`);
        return this.loadedFrameworks.get(frameworkName);
      }

      const frameworkPath = this.frameworkPaths.get(frameworkName);
      if (!frameworkPath) {
        throw new Error(`Framework "${frameworkName}" not found`);
      }

      await this.loadFrameworkConfig(frameworkName, frameworkPath);
      return this.loadedFrameworks.get(frameworkName);
    } catch (error) {
      logger.error(`❌ Failed to load framework "${frameworkName}":`, error.message);
      throw error;
    }
  }

  /**
   * Unload a framework
   */
  async unloadFramework(frameworkName) {
    try {
      if (!this.loadedFrameworks.has(frameworkName)) {
        logger.warn(`⚠️ Framework "${frameworkName}" not loaded`);
        return false;
      }

      const frameworkInfo = this.loadedFrameworks.get(frameworkName);
      
      // Remove from domain FrameworkRegistry if it was registered
      if (frameworkInfo.domainRegistered) {
        try {
          frameworkRegistry.unregisterFramework(frameworkName);
          logger.info(`✅ Unregistered framework "${frameworkName}" from domain registry`);
        } catch (registryError) {
          logger.warn(`⚠️ Failed to unregister framework "${frameworkName}" from domain registry:`, registryError.message);
        }
      }
      
      // Remove from loaded frameworks
      this.loadedFrameworks.delete(frameworkName);
      
      logger.info(`🗑️ Unloaded framework "${frameworkName}"`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to unload framework "${frameworkName}":`, error.message);
      throw error;
    }
  }

  /**
   * Get loaded framework
   */
  getFramework(frameworkName) {
    return this.loadedFrameworks.get(frameworkName);
  }

  /**
   * Get all loaded frameworks
   */
  getAllFrameworks() {
    return Array.from(this.loadedFrameworks.values());
  }

  /**
   * Get frameworks by category
   */
  getFrameworksByCategory(category) {
    return Array.from(this.loadedFrameworks.values())
      .filter(framework => framework.config.category === category);
  }

  /**
   * Validate framework configuration
   */
  validateFrameworkConfig(config) {
    const requiredFields = ['name', 'version', 'description', 'category'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (typeof config.name !== 'string' || config.name.trim() === '') {
      throw new Error('Framework name must be a non-empty string');
    }

    if (typeof config.version !== 'string' || config.version.trim() === '') {
      throw new Error('Framework version must be a non-empty string');
    }

    if (typeof config.description !== 'string') {
      throw new Error('Framework description must be a string');
    }

    if (typeof config.category !== 'string' || config.category.trim() === '') {
      throw new Error('Framework category must be a non-empty string');
    }

    // Validate activation settings
    if (config.activation) {
      if (typeof config.activation.auto_load !== 'boolean') {
        throw new Error('activation.auto_load must be a boolean');
      }
      
      if (typeof config.activation.requires_confirmation !== 'boolean') {
        throw new Error('activation.requires_confirmation must be a boolean');
      }
      
      if (typeof config.activation.fallback_to_core !== 'boolean') {
        throw new Error('activation.fallback_to_core must be a boolean');
      }
    }
  }

  /**
   * Reload all frameworks
   */
  async reloadAllFrameworks() {
    try {
      logger.info('🔄 Reloading all frameworks...');
      
      // Unload all frameworks
      for (const frameworkName of this.loadedFrameworks.keys()) {
        await this.unloadFramework(frameworkName);
      }
      
      // Reload all frameworks
      await this.loadFrameworkConfigs();
      
      logger.info(`✅ Reloaded ${this.loadedFrameworks.size} frameworks`);
    } catch (error) {
      logger.error('❌ Failed to reload frameworks:', error.message);
      throw error;
    }
  }

  /**
   * Get framework statistics
   */
  getStats() {
    return {
      totalFrameworks: this.frameworkPaths.size,
      loadedFrameworks: this.loadedFrameworks.size,
      categories: this.getCategoryStats(),
      lastReload: new Date()
    };
  }

  /**
   * Get category statistics
   */
  getCategoryStats() {
    const stats = {};
    
    for (const framework of this.loadedFrameworks.values()) {
      if (framework.config && framework.config.category) {
        const category = framework.config.category;
        stats[category] = (stats[category] || 0) + 1;
      }
    }
    
    return stats;
  }

  /**
   * Get domain framework system
   */
  getDomainFrameworkSystem() {
    return this.domainFrameworkSystem;
  }

  /**
   * Get framework configurations
   */
  getFrameworkConfigs() {
    return this.frameworkConfigs;
  }

  /**
   * Get framework loading health status
   */
  getHealthStatus() {
    const totalFrameworks = this.frameworkPaths.size;
    const loadedFrameworks = Array.from(this.loadedFrameworks.values()).filter(f => f.status === 'loaded').length;
    const failedFrameworks = Array.from(this.loadedFrameworks.values()).filter(f => f.status === 'failed').length;
    const domainInitialized = this.domainFrameworkSystem !== null;
    
    return {
      totalFrameworks,
      loadedFrameworks,
      failedFrameworks,
      domainInitialized,
      healthScore: totalFrameworks > 0 ? (loadedFrameworks / totalFrameworks) * 100 : 100,
      isHealthy: failedFrameworks === 0 && loadedFrameworks > 0 && domainInitialized
    };
  }
}

module.exports = FrameworkLoader; 