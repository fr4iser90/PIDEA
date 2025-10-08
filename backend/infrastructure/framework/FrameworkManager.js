/**
 * Framework Manager - Infrastructure Layer
 * Manages framework lifecycle, activation, and coordination with domain components
 */

const FrameworkLoader = require('./FrameworkLoader');
const FrameworkValidator = require('./FrameworkValidator');
const FrameworkConfig = require('./FrameworkConfig');
const { frameworkRegistry, frameworkBuilder } = require('@domain/frameworks');
const { stepRegistry } = require('@domain/steps');
const Logger = require('@logging/Logger');
const logger = new Logger('FrameworkManager');

class FrameworkManager {
  constructor() {
    this.loader = new FrameworkLoader();
    this.validator = new FrameworkValidator();
    this.config = new FrameworkConfig();
    this.activeFrameworks = new Map();
    this.frameworkInstances = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the framework manager
   */
  async initialize() {
    try {
      // Components are already initialized by initializeFrameworkInfrastructure
      // Only load auto-load frameworks
      await this.loadAutoLoadFrameworks();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize Framework Manager:', error.message);
      throw error;
    }
  }

  /**
   * Load frameworks configured for auto-load
   */
  async loadAutoLoadFrameworks() {
    try {
      const frameworks = this.loader.getAllFrameworks();
      
      for (const framework of frameworks) {
        if (framework.config.activation?.auto_load) {
          try {
            await this.activateFramework(framework.name);
            logger.info(`🔄 Auto-loaded framework: ${framework.name}`);
          } catch (error) {
            logger.error(`❌ Failed to auto-load framework "${framework.name}":`, error.message);
          }
        }
      }
    } catch (error) {
      logger.error('❌ Failed to load auto-load frameworks:', error.message);
      throw error;
    }
  }

  /**
   * Activate a framework
   */
  async activateFramework(frameworkName) {
    try {
      if (this.activeFrameworks.has(frameworkName)) {
        logger.info(`📦 Framework "${frameworkName}" already active`);
        return this.activeFrameworks.get(frameworkName);
      }

      // Load framework if not loaded
      const framework = await this.loader.loadFramework(frameworkName);
      if (!framework) {
        throw new Error(`Framework "${frameworkName}" not found`);
      }

      // Validate framework
      const validationResult = await this.validator.validateFramework(framework);
      if (!validationResult.isValid) {
        throw new Error(`Framework validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Check dependencies
      await this.checkDependencies(framework);

      // Build framework instance
      const instance = await frameworkBuilder.buildFramework(frameworkName, {
        settings: framework.config.settings || {}
      });

      // Register framework steps with StepRegistry
      await this.registerFrameworkSteps(framework, instance);

      // Store active framework
      this.activeFrameworks.set(frameworkName, {
        name: frameworkName,
        framework: framework,
        instance: instance,
        activatedAt: new Date(),
        status: 'active'
      });

      this.frameworkInstances.set(frameworkName, instance);

      logger.info(`✅ Framework "${frameworkName}" activated successfully`);
      return this.activeFrameworks.get(frameworkName);
    } catch (error) {
      logger.error(`❌ Failed to activate framework "${frameworkName}":`, error.message);
      throw error;
    }
  }

  /**
   * Deactivate a framework
   */
  async deactivateFramework(frameworkName) {
    try {
      if (!this.activeFrameworks.has(frameworkName)) {
        logger.warn(`⚠️ Framework "${frameworkName}" not active`);
        return false;
      }

      const activeFramework = this.activeFrameworks.get(frameworkName);

      // Unregister framework steps from StepRegistry
      await this.unregisterFrameworkSteps(frameworkName);

      // Remove from active frameworks
      this.activeFrameworks.delete(frameworkName);
      this.frameworkInstances.delete(frameworkName);

      logger.info(`🔄 Framework "${frameworkName}" deactivated successfully`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to deactivate framework "${frameworkName}":`, error.message);
      throw error;
    }
  }

  /**
   * Register framework steps with StepRegistry
   */
  async registerFrameworkSteps(framework, instance) {
    try {
      if (!instance.steps || instance.steps.length === 0) {
        logger.info(`📝 No steps to register for framework "${framework.name}"`);
        return;
      }

      const steps = new Map();
      
      for (const step of instance.steps) {
        steps.set(step.name, {
          name: step.name,
          type: step.type,
          category: step.category,
          description: step.description,
          executor: step.executor,
          framework: framework.name
        });
      }

      // Register with StepRegistry (using existing framework support)
      stepRegistry.registerFrameworkSteps(framework.name, steps);
      
      logger.info(`📝 Registered ${steps.size} steps for framework "${framework.name}"`);
    } catch (error) {
      logger.error(`❌ Failed to register steps for framework "${framework.name}":`, error.message);
      throw error;
    }
  }

  /**
   * Unregister framework steps from StepRegistry
   */
  async unregisterFrameworkSteps(frameworkName) {
    try {
      // Unregister from StepRegistry (using existing framework support)
      stepRegistry.unregisterFrameworkSteps(frameworkName);
      
      logger.info(`🗑️ Unregistered steps for framework "${frameworkName}"`);
    } catch (error) {
      logger.error(`❌ Failed to unregister steps for framework "${frameworkName}":`, error.message);
      throw error;
    }
  }

  /**
   * Check framework dependencies
   */
  async checkDependencies(framework) {
    try {
      const dependencies = framework.config.dependencies || [];
      
      for (const dependency of dependencies) {
        if (dependency === 'core') {
          // Core dependency is always available
          continue;
        }
        
        // Check if dependency framework is available
        const dependencyFramework = this.loader.getFramework(dependency);
        if (!dependencyFramework) {
          throw new Error(`Required dependency "${dependency}" not found`);
        }
        
        // Check if dependency is active
        if (!this.activeFrameworks.has(dependency)) {
          logger.warn(`⚠️ Dependency "${dependency}" not active, activating...`);
          await this.activateFramework(dependency);
        }
      }
    } catch (error) {
      logger.error(`❌ Dependency check failed for framework "${framework.name}":`, error.message);
      throw error;
    }
  }

  /**
   * Get active framework
   */
  getActiveFramework(frameworkName) {
    return this.activeFrameworks.get(frameworkName);
  }

  /**
   * Get all active frameworks
   */
  getAllActiveFrameworks() {
    return Array.from(this.activeFrameworks.values());
  }

  /**
   * Get active frameworks by category
   */
  getActiveFrameworksByCategory(category) {
    return Array.from(this.activeFrameworks.values())
      .filter(activeFramework => activeFramework.framework.config.category === category);
  }

  /**
   * Execute framework step
   */
  async executeFrameworkStep(frameworkName, stepName, context) {
    try {
      const activeFramework = this.activeFrameworks.get(frameworkName);
      if (!activeFramework) {
        throw new Error(`Framework "${frameworkName}" not active`);
      }

      // Use StepRegistry to execute step (with framework support)
      const result = await stepRegistry.executeStep(`${frameworkName}.${stepName}`, context);
      
      logger.info(`✅ Executed step "${stepName}" from framework "${frameworkName}"`);
      return result;
    } catch (error) {
      logger.error(`❌ Failed to execute step "${stepName}" from framework "${frameworkName}":`, error.message);
      throw error;
    }
  }

  /**
   * Get framework instance
   */
  getFrameworkInstance(frameworkName) {
    return this.frameworkInstances.get(frameworkName);
  }

  /**
   * Reload framework
   */
  async reloadFramework(frameworkName) {
    try {
      logger.info(`🔄 Reloading framework "${frameworkName}"...`);
      
      // Deactivate if active
      if (this.activeFrameworks.has(frameworkName)) {
        await this.deactivateFramework(frameworkName);
      }
      
      // Unload from loader
      await this.loader.unloadFramework(frameworkName);
      
      // Reload and activate
      await this.activateFramework(frameworkName);
      
      logger.info(`✅ Framework "${frameworkName}" reloaded successfully`);
    } catch (error) {
      logger.error(`❌ Failed to reload framework "${frameworkName}":`, error.message);
      throw error;
    }
  }

  /**
   * Reload all frameworks
   */
  async reloadAllFrameworks() {
    try {
      logger.info('🔄 Reloading all frameworks...');
      
      // Deactivate all active frameworks
      for (const frameworkName of this.activeFrameworks.keys()) {
        await this.deactivateFramework(frameworkName);
      }
      
      // Reload all frameworks in loader
      await this.loader.reloadAllFrameworks();
      
      // Reactivate auto-load frameworks
      await this.loadAutoLoadFrameworks();
      
      logger.info('✅ All frameworks reloaded successfully');
    } catch (error) {
      logger.error('❌ Failed to reload all frameworks:', error.message);
      throw error;
    }
  }

  /**
   * Get framework manager statistics
   */
  getStats() {
    return {
      totalFrameworks: this.loader.getStats().totalFrameworks,
      loadedFrameworks: this.loader.getStats().loadedFrameworks,
      activeFrameworks: this.activeFrameworks.size,
      categories: this.getCategoryStats(),
      lastReload: new Date()
    };
  }

  /**
   * Get category statistics
   */
  getCategoryStats() {
    const stats = {};
    
    for (const activeFramework of this.activeFrameworks.values()) {
      const category = activeFramework.framework.config.category;
      stats[category] = (stats[category] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Get framework status
   */
  getFrameworkStatus(frameworkName) {
    const loaded = this.loader.getFramework(frameworkName);
    const active = this.activeFrameworks.get(frameworkName);
    
    return {
      name: frameworkName,
      loaded: !!loaded,
      active: !!active,
      status: active ? 'active' : (loaded ? 'loaded' : 'not_loaded'),
      loadedAt: loaded?.loadedAt,
      activatedAt: active?.activatedAt
    };
  }

  /**
   * Get all framework statuses
   */
  getAllFrameworkStatuses() {
    const statuses = [];
    
    for (const [frameworkName] of this.loader.frameworkPaths) {
      statuses.push(this.getFrameworkStatus(frameworkName));
    }
    
    return statuses;
  }
}

module.exports = FrameworkManager; 