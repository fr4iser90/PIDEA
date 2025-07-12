/**
 * GenerateMigrationService - Service for migrating generate handlers
 * 
 * This service handles the migration of  generate handlers to the new
 * unified workflow system, providing backward compatibility and gradual migration.
 */
const fs = require('fs').promises;
const path = require('path');
/**
 * Generate migration service
 */
class GenerateMigrationService {
  constructor(options = {}) {
    this.options = {
      enableBackwardCompatibility: options.enableBackwardCompatibility !== false,
      enableGradualMigration: options.enableGradualMigration !== false,
      enableFallback: options.enableFallback !== false,
      migrationLogPath: options.migrationLogPath || 'logs/generate-migration.log',
      ...options
    };
    this.migrationLog = [];
    this.migratedHandlers = new Map();
    this.Handlers = new Map();
    // Load generate step components
    this._loadGenerateStepComponents();
  }
  /**
   * Load generate step components
   */
  _loadGenerateStepComponents() {
    try {
      const generateSteps = require('../workflows/steps/generate');
      this.generateStepFactory = generateSteps.GenerateStepFactory;
      this.generateStepRegistry = generateSteps.GenerateStepRegistry;
      this.generateServiceAdapter = generateSteps.GenerateServiceAdapter;
      this.generateComplexityManager = generateSteps.GenerateComplexityManager;
      this.generateValidationService = generateSteps.GenerateValidationService;
      this.generatePerformanceOptimizer = generateSteps.GeneratePerformanceOptimizer;
      this.generateComponentsLoaded = true;
    } catch (error) {
      console.warn('Generate step components not available:', error.message);
      this.generateComponentsLoaded = false;
    }
  }
  /**
   * Migrate generate handler to unified workflow
   * @param {Object} handlerRequest - Handler request
   * @param {Object} context - Migration context
   * @returns {Promise<Object>} Migration result
   */
  async migrateHandler(handlerRequest, context = {}) {
    try {
      const startTime = Date.now();
      // Log migration attempt
      this.logMigration('start', handlerRequest, context);
      // Determine handler type
      const handlerType = this.determineHandlerType(handlerRequest);
      // Check if already migrated
      if (this.migratedHandlers.has(handlerType)) {
        return {
          success: true,
          alreadyMigrated: true,
          handlerType: handlerType,
          message: 'Handler already migrated'
        };
      }
      // Create migration strategy
      const strategy = this.createMigrationStrategy(handlerType, handlerRequest);
      // Execute migration
      const migrationResult = await this.executeMigration(strategy, handlerRequest, context);
      // Validate migration
      const validationResult = await this.validateMigration(migrationResult, context);
      // Update migration state
      this.updateMigrationState(handlerType, migrationResult, validationResult);
      // Log migration completion
      const endTime = Date.now();
      this.logMigration('complete', handlerRequest, {
        ...context,
        duration: endTime - startTime,
        result: migrationResult,
        validation: validationResult
      });
      return {
        success: true,
        handlerType: handlerType,
        migrationResult: migrationResult,
        validationResult: validationResult,
        duration: endTime - startTime
      };
    } catch (error) {
      // Log migration error
      this.logMigration('error', handlerRequest, { ...context, error: error.message });
      // Return error result
      return {
        success: false,
        error: error.message,
        handlerType: this.determineHandlerType(handlerRequest)
      };
    }
  }
  /**
   * Determine handler type from request
   * @param {Object} handlerRequest - Handler request
   * @returns {string} Handler type
   */
  determineHandlerType(handlerRequest) {
    if (handlerRequest.handlerClass) {
      return handlerRequest.handlerClass;
    }
    if (handlerRequest.handlerPath) {
      return path.basename(handlerRequest.handlerPath, '.js');
    }
    if (handlerRequest.operation) {
      return handlerRequest.operation;
    }
    if (handlerRequest.type) {
      return handlerRequest.type;
    }
    return 'unknown';
  }
  /**
   * Create migration strategy
   * @param {string} handlerType - Handler type
   * @param {Object} handlerRequest - Handler request
   * @returns {Object} Migration strategy
   */
  createMigrationStrategy(handlerType, handlerRequest) {
    const strategies = {
      'GenerateScriptHandler': {
        targetStep: 'GenerateScriptStep',
        adapter: 'GenerateServiceAdapter',
        validation: 'GenerateValidationService',
        optimization: 'GeneratePerformanceOptimizer'
      },
      'GenerateScriptsHandler': {
        targetStep: 'GenerateScriptsStep',
        adapter: 'GenerateServiceAdapter',
        validation: 'GenerateValidationService',
        optimization: 'GeneratePerformanceOptimizer'
      },
      'GenerateDocumentationHandler': {
        targetStep: 'GenerateDocumentationStep',
        adapter: 'GenerateServiceAdapter',
        validation: 'GenerateValidationService',
        optimization: 'GeneratePerformanceOptimizer'
      }
    };
    return strategies[handlerType] || {
      targetStep: 'GenerateScriptStep',
      adapter: 'GenerateServiceAdapter',
      validation: 'GenerateValidationService',
      optimization: 'GeneratePerformanceOptimizer'
    };
  }
  /**
   * Execute migration
   * @param {Object} strategy - Migration strategy
   * @param {Object} handlerRequest - Handler request
   * @param {Object} context - Migration context
   * @returns {Promise<Object>} Migration result
   */
  async executeMigration(strategy, handlerRequest, context) {
    if (!this.generateComponentsLoaded) {
      throw new Error('Generate step components not available for migration');
    }
    // Create target step
    const targetStep = await this.createTargetStep(strategy.targetStep, handlerRequest);
    // Create adapter
    const adapter = await this.createAdapter(strategy.adapter, handlerRequest);
    // Create validation service
    const validationService = await this.createValidationService(strategy.validation, handlerRequest);
    // Create performance optimizer
    const performanceOptimizer = await this.createPerformanceOptimizer(strategy.optimization, handlerRequest);
    // Register step
    await this.registerStep(targetStep, strategy.targetStep);
    return {
      targetStep: targetStep,
      adapter: adapter,
      validationService: validationService,
      performanceOptimizer: performanceOptimizer,
      strategy: strategy
    };
  }
  /**
   * Create target step
   * @param {string} stepType - Step type
   * @param {Object} handlerRequest - Handler request
   * @returns {Promise<BaseWorkflowStep>} Target step
   */
  async createTargetStep(stepType, handlerRequest) {
    const task = handlerRequest.task || handlerRequest.data || {};
    const options = handlerRequest.options || {};
    switch (stepType) {
      case 'GenerateScriptStep':
        return this.generateStepFactory.createGenerateScriptStep(task, options);
      case 'GenerateScriptsStep':
        return this.generateStepFactory.createGenerateScriptsStep(task, options);
      case 'GenerateDocumentationStep':
        return this.generateStepFactory.createGenerateDocumentationStep(task, options);
      default:
        throw new Error(`Unknown step type: ${stepType}`);
    }
  }
  /**
   * Create adapter
   * @param {string} adapterType - Adapter type
   * @param {Object} handlerRequest - Handler request
   * @returns {Promise<Object>} Adapter
   */
  async createAdapter(adapterType, handlerRequest) {
    if (adapterType === 'GenerateServiceAdapter') {
      return new this.generateServiceAdapter(handlerRequest.options || {});
    }
    throw new Error(`Unknown adapter type: ${adapterType}`);
  }
  /**
   * Create validation service
   * @param {string} validationType - Validation type
   * @param {Object} handlerRequest - Handler request
   * @returns {Promise<Object>} Validation service
   */
  async createValidationService(validationType, handlerRequest) {
    if (validationType === 'GenerateValidationService') {
      return new this.generateValidationService(handlerRequest.options || {});
    }
    throw new Error(`Unknown validation type: ${validationType}`);
  }
  /**
   * Create performance optimizer
   * @param {string} optimizerType - Optimizer type
   * @param {Object} handlerRequest - Handler request
   * @returns {Promise<Object>} Performance optimizer
   */
  async createPerformanceOptimizer(optimizerType, handlerRequest) {
    if (optimizerType === 'GeneratePerformanceOptimizer') {
      return new this.generatePerformanceOptimizer(handlerRequest.options || {});
    }
    throw new Error(`Unknown optimizer type: ${optimizerType}`);
  }
  /**
   * Register step
   * @param {BaseWorkflowStep} step - Step to register
   * @param {string} stepType - Step type
   * @returns {Promise<void>}
   */
  async registerStep(step, stepType) {
    await this.generateStepRegistry.registerStep(stepType, step);
  }
  /**
   * Validate migration
   * @param {Object} migrationResult - Migration result
   * @param {Object} context - Migration context
   * @returns {Promise<Object>} Validation result
   */
  async validateMigration(migrationResult, context) {
    const { targetStep, validationService } = migrationResult;
    // Create test context
    const testContext = this.createTestContext(context);
    // Validate step
    const stepValidation = await targetStep.validate(testContext);
    // Validate with validation service
    let serviceValidation = { isValid: true, errors: [] };
    if (validationService) {
      serviceValidation = await validationService.validateStep(targetStep, testContext);
    }
    return {
      stepValidation: stepValidation,
      serviceValidation: serviceValidation,
      overallValid: stepValidation.isValid && serviceValidation.isValid
    };
  }
  /**
   * Create test context
   * @param {Object} context - Original context
   * @returns {Object} Test context
   */
  createTestContext(context) {
    return {
      get: (key) => {
        if (context[key] !== undefined) {
          return context[key];
        }
        // Provide default values for testing
        const defaults = {
          projectPath: process.cwd(),
          task: { description: 'Test task' },
          aiService: { generateScript: () => Promise.resolve({ success: true }) },
          documentationService: { generateDocumentation: () => Promise.resolve({ success: true }) }
        };
        return defaults[key];
      },
      set: (key, value) => {
        context[key] = value;
      },
      has: (key) => {
        return context[key] !== undefined;
      }
    };
  }
  /**
   * Update migration state
   * @param {string} handlerType - Handler type
   * @param {Object} migrationResult - Migration result
   * @param {Object} validationResult - Validation result
   */
  updateMigrationState(handlerType, migrationResult, validationResult) {
    this.migratedHandlers.set(handlerType, {
      migrationResult: migrationResult,
      validationResult: validationResult,
      migratedAt: new Date(),
      status: validationResult.overallValid ? 'success' : 'warning'
    });
  }
  /**
   * Log migration event
   * @param {string} event - Event type
   * @param {Object} handlerRequest - Handler request
   * @param {Object} context - Event context
   */
  logMigration(event, handlerRequest, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: event,
      handlerType: this.determineHandlerType(handlerRequest),
      handlerRequest: handlerRequest,
      context: context
    };
    this.migrationLog.push(logEntry);
    // Write to file if path is configured
    if (this.options.migrationLogPath) {
      this.writeMigrationLog(logEntry);
    }
  }
  /**
   * Write migration log to file
   * @param {Object} logEntry - Log entry
   */
  async writeMigrationLog(logEntry) {
    try {
      const logDir = path.dirname(this.options.migrationLogPath);
      await fs.mkdir(logDir, { recursive: true });
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.options.migrationLogPath, logLine);
    } catch (error) {
      console.warn('Failed to write migration log:', error.message);
    }
  }
  /**
   * Get migration statistics
   * @returns {Object} Migration statistics
   */
  getMigrationStatistics() {
    const total = this.migratedHandlers.size;
    const successful = Array.from(this.migratedHandlers.values())
      .filter(h => h.status === 'success').length;
    const warnings = Array.from(this.migratedHandlers.values())
      .filter(h => h.status === 'warning').length;
    return {
      total: total,
      successful: successful,
      warnings: warnings,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      logEntries: this.migrationLog.length
    };
  }
  /**
   * Get migrated handlers
   * @returns {Array<Object>} Migrated handlers
   */
  getMigratedHandlers() {
    return Array.from(this.migratedHandlers.entries()).map(([type, data]) => ({
      type: type,
      ...data
    }));
  }
  /**
   * Rollback migration
   * @param {string} handlerType - Handler type to rollback
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackMigration(handlerType) {
    try {
      const migratedHandler = this.migratedHandlers.get(handlerType);
      if (!migratedHandler) {
        return {
          success: false,
          error: `Handler ${handlerType} not found in migrated handlers`
        };
      }
      // Remove from registry
      if (this.generateComponentsLoaded && migratedHandler.migrationResult.targetStep) {
        await this.generateStepRegistry.unregisterStep(handlerType);
      }
      // Remove from migrated handlers
      this.migratedHandlers.delete(handlerType);
      // Log rollback
      this.logMigration('rollback', { handlerType }, {});
      return {
        success: true,
        handlerType: handlerType,
        message: 'Migration rolled back successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Get service options
   * @returns {Object} Service options
   */
  getOptions() {
    return { ...this.options };
  }
  /**
   * Set service options
   * @param {Object} options - Service options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }
}
module.exports = GenerateMigrationService; 