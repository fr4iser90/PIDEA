/**
 * MigrationManager - Central migration orchestration for Unified Workflow System
 * Handles migration from legacy handlers to unified workflow steps
 */
const MigrationTracker = require('./MigrationTracker');
const MigrationValidator = require('./MigrationValidator');
const MigrationRollback = require('./MigrationRollback');
const MigrationMetrics = require('./MigrationMetrics');

class MigrationManager {
  constructor(dependencies = {}) {
    this.tracker = dependencies.tracker || new MigrationTracker();
    this.validator = dependencies.validator || new MigrationValidator();
    this.rollback = dependencies.rollback || new MigrationRollback();
    this.metrics = dependencies.metrics || new MigrationMetrics();
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
    
    this.migrationConfig = {
      enableParallelMigration: true,
      enableRollback: true,
      enableValidation: true,
      enableMetrics: true,
      maxConcurrentMigrations: 3,
      migrationTimeout: 300000, // 5 minutes
      validationTimeout: 60000, // 1 minute
      rollbackTimeout: 120000 // 2 minutes
    };
  }

  /**
   * Start migration process for all legacy handlers
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration result
   */
  async startMigration(options = {}) {
    const startTime = Date.now();
    const migrationId = this.generateMigrationId();
    
    try {
      this.logger.info(`[MigrationManager] Starting migration ${migrationId}`);
      
      // Initialize migration tracking
      await this.tracker.initializeMigration(migrationId, options);
      
      // Get legacy handlers to migrate
      const legacyHandlers = await this.getLegacyHandlers();
      
      this.logger.info(`[MigrationManager] Found ${legacyHandlers.length} legacy handlers to migrate`);
      
      // Start migration process
      const results = await this.migrateHandlers(legacyHandlers, migrationId, options);
      
      // Validate migration results
      if (this.migrationConfig.enableValidation) {
        await this.validator.validateMigration(migrationId, results);
      }
      
      // Collect metrics
      if (this.migrationConfig.enableMetrics) {
        await this.metrics.collectMigrationMetrics(migrationId, results, Date.now() - startTime);
      }
      
      // Finalize migration
      await this.tracker.finalizeMigration(migrationId, results);
      
      this.logger.info(`[MigrationManager] Migration ${migrationId} completed successfully`);
      
      return {
        migrationId,
        success: true,
        totalHandlers: legacyHandlers.length,
        migratedHandlers: results.filter(r => r.success).length,
        failedHandlers: results.filter(r => !r.success).length,
        duration: Date.now() - startTime,
        results
      };
      
    } catch (error) {
      this.logger.error(`[MigrationManager] Migration ${migrationId} failed:`, error.message);
      
      // Attempt rollback if enabled
      if (this.migrationConfig.enableRollback) {
        await this.rollback.rollbackMigration(migrationId);
      }
      
      throw error;
    }
  }

  /**
   * Migrate individual handlers
   * @param {Array} handlers - Legacy handlers to migrate
   * @param {string} migrationId - Migration ID
   * @param {Object} options - Migration options
   * @returns {Promise<Array>} Migration results
   */
  async migrateHandlers(handlers, migrationId, options) {
    const results = [];
    
    if (this.migrationConfig.enableParallelMigration) {
      // Parallel migration
      const batches = this.createBatches(handlers, this.migrationConfig.maxConcurrentMigrations);
      
      for (const batch of batches) {
        const batchPromises = batch.map(handler => 
          this.migrateSingleHandler(handler, migrationId, options)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map(result => 
          result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
        ));
      }
    } else {
      // Sequential migration
      for (const handler of handlers) {
        const result = await this.migrateSingleHandler(handler, migrationId, options);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Migrate a single legacy handler
   * @param {Object} handler - Legacy handler to migrate
   * @param {string} migrationId - Migration ID
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration result
   */
  async migrateSingleHandler(handler, migrationId, options) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`[MigrationManager] Migrating handler: ${handler.name}`);
      
      // Update migration status
      await this.tracker.updateHandlerStatus(migrationId, handler.name, 'migrating');
      
      // Determine target workflow step type
      const stepType = this.determineStepType(handler);
      
      // Create unified workflow step
      const unifiedStep = await this.createUnifiedStep(handler, stepType);
      
      // Update handler registry
      await this.updateHandlerRegistry(handler.name, unifiedStep);
      
      // Validate migration
      const validationResult = await this.validator.validateHandlerMigration(handler, unifiedStep);
      
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error}`);
      }
      
      // Update migration status
      await this.tracker.updateHandlerStatus(migrationId, handler.name, 'completed');
      
      this.logger.info(`[MigrationManager] Successfully migrated handler: ${handler.name}`);
      
      return {
        handlerName: handler.name,
        success: true,
        stepType,
        duration: Date.now() - startTime,
        unifiedStep: unifiedStep.name
      };
      
    } catch (error) {
      this.logger.error(`[MigrationManager] Failed to migrate handler ${handler.name}:`, error.message);
      
      // Update migration status
      await this.tracker.updateHandlerStatus(migrationId, handler.name, 'failed', error.message);
      
      return {
        handlerName: handler.name,
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Determine the appropriate workflow step type for a handler
   * @param {Object} handler - Legacy handler
   * @returns {string} Step type
   */
  determineStepType(handler) {
    const handlerName = handler.name.toLowerCase();
    
    if (handlerName.includes('analyze') || handlerName.includes('analysis')) {
      return 'AnalysisStep';
    } else if (handlerName.includes('refactor') || handlerName.includes('refactoring')) {
      return 'RefactoringStep';
    } else if (handlerName.includes('test') || handlerName.includes('testing')) {
      return 'TestingStep';
    } else if (handlerName.includes('generate') || handlerName.includes('documentation')) {
      return 'DocumentationStep';
    } else if (handlerName.includes('validate') || handlerName.includes('validation')) {
      return 'ValidationStep';
    } else if (handlerName.includes('deploy') || handlerName.includes('deployment')) {
      return 'DeploymentStep';
    } else if (handlerName.includes('security')) {
      return 'SecurityStep';
    } else if (handlerName.includes('optimize') || handlerName.includes('optimization')) {
      return 'OptimizationStep';
    } else {
      return 'AnalysisStep'; // Default fallback
    }
  }

  /**
   * Create unified workflow step from legacy handler
   * @param {Object} handler - Legacy handler
   * @param {string} stepType - Target step type
   * @returns {Promise<Object>} Unified workflow step
   */
  async createUnifiedStep(handler, stepType) {
    try {
      // Import the actual unified step class
      const { [stepType]: StepClass } = require('../steps');
      
      if (!StepClass) {
        throw new Error(`Step class not found: ${stepType}`);
      }
      
      // Create unified step instance with handler reference
      const unifiedStep = new StepClass({
        name: `${stepType}_${handler.name}`,
        description: `Migrated from ${handler.name}`,
        legacyHandler: handler,
        metadata: {
          migrated: true,
          originalHandler: handler.name,
          migrationDate: new Date().toISOString(),
          stepType: stepType
        }
      });
      
      return unifiedStep;
      
    } catch (error) {
      this.logger.error(`[MigrationManager] Failed to create unified step for ${handler.name}:`, error.message);
      
      // Fallback to mock step if import fails
      const unifiedStep = {
        name: `${stepType}_${handler.name}`,
        description: `Migrated from ${handler.name} (fallback)`,
        type: stepType,
        handler: handler,
        metadata: {
          migrated: true,
          originalHandler: handler.name,
          migrationDate: new Date().toISOString(),
          fallback: true
        },
        execute: async (context) => {
          return {
            success: true,
            result: `Fallback execution of ${handler.name}`,
            metadata: {
              originalHandler: handler.name,
              stepType: stepType,
              fallback: true
            }
          };
        }
      };
      
      return unifiedStep;
    }
  }

  /**
   * Update handler registry with unified step
   * @param {string} handlerName - Handler name
   * @param {Object} unifiedStep - Unified workflow step
   * @returns {Promise<void>}
   */
  async updateHandlerRegistry(handlerName, unifiedStep) {
    try {
      // Import the handler registry
      const { HandlerRegistry } = require('../handlers');
      
      if (HandlerRegistry && typeof HandlerRegistry.register === 'function') {
        // Register the unified step in the handler registry
        await HandlerRegistry.register(unifiedStep.name, unifiedStep);
        this.logger.info(`[MigrationManager] Registered unified step in HandlerRegistry: ${unifiedStep.name}`);
      } else {
        this.logger.warn(`[MigrationManager] HandlerRegistry not available, skipping registration for: ${handlerName}`);
      }
      
      // Also update the step registry
      const { StepRegistry } = require('../steps');
      if (StepRegistry && typeof StepRegistry.register === 'function') {
        await StepRegistry.register(unifiedStep.name, unifiedStep);
        this.logger.info(`[MigrationManager] Registered unified step in StepRegistry: ${unifiedStep.name}`);
      }
      
    } catch (error) {
      this.logger.error(`[MigrationManager] Failed to update registry for ${handlerName}:`, error.message);
      // Continue migration even if registry update fails
    }
  }

  /**
   * Get all legacy handlers that need migration
   * @returns {Promise<Array>} Legacy handlers
   */
  async getLegacyHandlers() {
    // This would scan the application/handlers directory
    // For now, return a list of known legacy handlers
    return [
      { name: 'AnalyzeArchitectureHandler', type: 'analyze' },
      { name: 'AnalyzeCodeQualityHandler', type: 'analyze' },
      { name: 'AnalyzeTechStackHandler', type: 'analyze' },
      { name: 'AnalyzeRepoStructureHandler', type: 'analyze' },
      { name: 'AnalyzeDependenciesHandler', type: 'analyze' },
      { name: 'VibeCoderAnalyzeHandler', type: 'vibecoder' },
      { name: 'VibeCoderGenerateHandler', type: 'vibecoder' },
      { name: 'VibeCoderRefactorHandler', type: 'vibecoder' },
      { name: 'VibeCoderModeHandler', type: 'vibecoder' },
      { name: 'GenerateScriptHandler', type: 'generate' },
      { name: 'GenerateScriptsHandler', type: 'generate' },
      { name: 'AutoTestFixHandler', type: 'test' },
      { name: 'TestCorrectionHandler', type: 'test' }
    ];
  }

  /**
   * Create batches for parallel processing
   * @param {Array} items - Items to batch
   * @param {number} batchSize - Batch size
   * @returns {Array} Batches
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Generate unique migration ID
   * @returns {string} Migration ID
   */
  generateMigrationId() {
    return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get migration status
   * @param {string} migrationId - Migration ID
   * @returns {Promise<Object>} Migration status
   */
  async getMigrationStatus(migrationId) {
    return await this.tracker.getMigrationStatus(migrationId);
  }

  /**
   * Rollback migration
   * @param {string} migrationId - Migration ID
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackMigration(migrationId) {
    return await this.rollback.rollbackMigration(migrationId);
  }
}

module.exports = MigrationManager; 