const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * FrameworkStepRegistry - Integrates framework steps with the main StepRegistry
 * Loads and registers steps from framework directories
 */
class FrameworkStepRegistry {
  constructor() {
    this.logger = logger;
    this.frameworkSteps = new Map();
    this.frameworkDirectories = new Map();
    this.loadedFrameworks = new Set();
  }

  /**
   * Initialize the framework step registry
   * @param {string} frameworkBasePath - Base path for framework directories
   * @param {Object} stepRegistry - Main step registry instance
   */
  async initialize(frameworkBasePath, stepRegistry) {
    this.frameworkBasePath = frameworkBasePath;
    this.stepRegistry = stepRegistry;
    
    this.logger.info('🔧 [FrameworkStepRegistry] Initializing framework step registry...');
    
    try {
      await this.discoverFrameworks();
      await this.loadFrameworkSteps();
      await this.registerFrameworkSteps();
      
      this.logger.info(`✅ [FrameworkStepRegistry] Initialized with ${this.frameworkSteps.size} framework steps`);
    } catch (error) {
      this.logger.error('❌ [FrameworkStepRegistry] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Discover available frameworks
   */
  async discoverFrameworks() {
    try {
      const frameworkDirs = await fs.readdir(this.frameworkBasePath);
      
      for (const dir of frameworkDirs) {
        const frameworkPath = path.join(this.frameworkBasePath, dir);
        const stats = await fs.stat(frameworkPath);
        
        if (stats.isDirectory()) {
          const configPath = path.join(frameworkPath, 'framework.json');
          
          try {
            const configContent = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configContent);
            
            this.frameworkDirectories.set(dir, {
              path: frameworkPath,
              config: config,
              stepsPath: path.join(frameworkPath, 'steps')
            });
            
            this.logger.info(`📁 [FrameworkStepRegistry] Discovered framework: ${dir}`);
          } catch (error) {
            this.logger.warn(`⚠️ [FrameworkStepRegistry] Invalid framework config in ${dir}:`, error.message);
          }
        }
      }
    } catch (error) {
      this.logger.error('❌ [FrameworkStepRegistry] Framework discovery failed:', error.message);
      throw error;
    }
  }

  /**
   * Load steps from framework directories
   */
  async loadFrameworkSteps() {
    for (const [frameworkName, frameworkInfo] of this.frameworkDirectories) {
      try {
        await this.loadFrameworkStepsFromDirectory(frameworkName, frameworkInfo);
      } catch (error) {
        this.logger.error(`❌ [FrameworkStepRegistry] Failed to load steps from ${frameworkName}:`, error.message);
      }
    }
  }

  /**
   * Load steps from a specific framework directory
   */
  async loadFrameworkStepsFromDirectory(frameworkName, frameworkInfo) {
    const { path: frameworkPath, config, stepsPath } = frameworkInfo;
    
    try {
      // Check if steps directory exists
      const stepsExists = await fs.access(stepsPath).then(() => true).catch(() => false);
      
      if (!stepsExists) {
        this.logger.warn(`⚠️ [FrameworkStepRegistry] Steps directory not found for ${frameworkName}`);
        return;
      }

      // Load steps defined in framework.json
      for (const [stepName, stepConfig] of Object.entries(config.steps || {})) {
        if (stepConfig.file) {
          await this.loadFrameworkStep(frameworkName, stepName, stepConfig, stepsPath);
        }
      }
      
      this.loadedFrameworks.add(frameworkName);
      this.logger.info(`✅ [FrameworkStepRegistry] Loaded steps from ${frameworkName}`);
    } catch (error) {
      this.logger.error(`❌ [FrameworkStepRegistry] Failed to load steps from ${frameworkName}:`, error.message);
    }
  }

  /**
   * Load a specific framework step
   */
  async loadFrameworkStep(frameworkName, stepName, stepConfig, stepsPath) {
    try {
      const stepFilePath = path.join(stepsPath, stepConfig.file);
      
      // Check if step file exists
      const fileExists = await fs.access(stepFilePath).then(() => true).catch(() => false);
      
      if (!fileExists) {
        this.logger.warn(`⚠️ [FrameworkStepRegistry] Step file not found: ${stepFilePath}`);
        return;
      }

      // Load the step module
      const stepModule = require(stepFilePath);
      
      if (!stepModule || !stepModule.config || !stepModule.execute) {
        this.logger.warn(`⚠️ [FrameworkStepRegistry] Invalid step module: ${stepFilePath}`);
        return;
      }

      // Create step key
      const stepKey = `${frameworkName}.${stepName}`;
      
      // Store step information
      this.frameworkSteps.set(stepKey, {
        framework: frameworkName,
        name: stepName,
        config: stepConfig,
        module: stepModule,
        filePath: stepFilePath
      });

      this.logger.debug(`📦 [FrameworkStepRegistry] Loaded step: ${stepKey}`);
    } catch (error) {
      this.logger.error(`❌ [FrameworkStepRegistry] Failed to load step ${stepName} from ${frameworkName}:`, error.message);
    }
  }

  /**
   * Register framework steps with the main step registry
   */
  async registerFrameworkSteps() {
    for (const [stepKey, stepInfo] of this.frameworkSteps) {
      try {
        await this.registerFrameworkStep(stepKey, stepInfo);
      } catch (error) {
        this.logger.error(`❌ [FrameworkStepRegistry] Failed to register step ${stepKey}:`, error.message);
      }
    }
  }

  /**
   * Register a specific framework step
   */
  async registerFrameworkStep(stepKey, stepInfo) {
    const { framework, name, config, module } = stepInfo;
    
    try {
      // Create step wrapper that provides framework context
      const stepWrapper = {
        name: name,
        type: config.type || 'framework',
        category: config.category || 'framework',
        description: config.description || `Framework step: ${name}`,
        framework: framework,
        dependencies: config.dependencies || [],
        
        async execute(context, options = {}) {
          // Add framework context
          const frameworkContext = {
            ...context,
            framework: framework,
            frameworkStep: name,
            stepRegistry: this.stepRegistry
          };
          
          // Execute the step
          return await module.execute(frameworkContext, options);
        }
      };

      // Register with main step registry
      if (this.stepRegistry && typeof this.stepRegistry.register === 'function') {
        await this.stepRegistry.register(stepKey, stepWrapper);
        this.logger.info(`✅ [FrameworkStepRegistry] Registered step: ${stepKey}`);
      } else {
        this.logger.warn(`⚠️ [FrameworkStepRegistry] Step registry not available for ${stepKey}`);
      }
    } catch (error) {
      this.logger.error(`❌ [FrameworkStepRegistry] Failed to register step ${stepKey}:`, error.message);
    }
  }

  /**
   * Get all framework steps
   */
  getFrameworkSteps() {
    return Array.from(this.frameworkSteps.keys());
  }

  /**
   * Get steps for a specific framework
   */
  getFrameworkStepsByName(frameworkName) {
    return Array.from(this.frameworkSteps.keys())
      .filter(key => key.startsWith(`${frameworkName}.`));
  }

  /**
   * Check if a step is a framework step
   */
  isFrameworkStep(stepKey) {
    return this.frameworkSteps.has(stepKey);
  }

  /**
   * Get framework step info
   */
  getFrameworkStepInfo(stepKey) {
    return this.frameworkSteps.get(stepKey);
  }

  /**
   * Reload a specific framework
   */
  async reloadFramework(frameworkName) {
    try {
      this.logger.info(`🔄 [FrameworkStepRegistry] Reloading framework: ${frameworkName}`);
      
      const frameworkInfo = this.frameworkDirectories.get(frameworkName);
      if (!frameworkInfo) {
        throw new Error(`Framework ${frameworkName} not found`);
      }

      // Remove existing steps for this framework
      const existingSteps = this.getFrameworkStepsByName(frameworkName);
      for (const stepKey of existingSteps) {
        this.frameworkSteps.delete(stepKey);
      }

      // Reload framework steps
      await this.loadFrameworkStepsFromDirectory(frameworkName, frameworkInfo);
      await this.registerFrameworkSteps();

      this.logger.info(`✅ [FrameworkStepRegistry] Reloaded framework: ${frameworkName}`);
    } catch (error) {
      this.logger.error(`❌ [FrameworkStepRegistry] Failed to reload framework ${frameworkName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get framework information
   */
  getFrameworkInfo(frameworkName) {
    return this.frameworkDirectories.get(frameworkName);
  }

  /**
   * Get all loaded frameworks
   */
  getLoadedFrameworks() {
    return Array.from(this.loadedFrameworks);
  }
}

module.exports = FrameworkStepRegistry; 