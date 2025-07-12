/**
 * GenerateMigrationHandler - Handler for generate handler migration
 * 
 * This handler manages the migration of  generate handlers to the new
 * unified workflow system, providing a clean interface for migration operations.
 */
const GenerateMigrationService = require('../../domain/services/GenerateMigrationService');
/**
 * Generate migration handler
 */
class GenerateMigrationHandler {
  constructor(options = {}) {
    this.migrationService = new GenerateMigrationService(options);
    this.options = {
      enableAutoMigration: options.enableAutoMigration !== false,
      enableBatchMigration: options.enableBatchMigration !== false,
      enableValidation: options.enableValidation !== false,
      ...options
    };
  }
  /**
   * Handle migration request
   * @param {Object} request - Migration request
   * @param {Object} context - Handler context
   * @returns {Promise<Object>} Migration result
   */
  async handle(request, context = {}) {
    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: 'Invalid request',
          details: validationResult.errors
        };
      }
      // Determine operation type
      const operation = request.operation || 'migrate';
      // Execute operation
      switch (operation) {
        case 'migrate':
          return await this.migrateHandler(request, context);
        case 'migrate-batch':
          return await this.migrateBatch(request, context);
        case 'validate':
          return await this.validateMigration(request, context);
        case 'rollback':
          return await this.rollbackMigration(request, context);
        case 'status':
          return await this.getMigrationStatus(request, context);
        case 'statistics':
          return await this.getMigrationStatistics(request, context);
        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }
  /**
   * Validate migration request
   * @param {Object} request - Migration request
   * @returns {Object} Validation result
   */
  validateRequest(request) {
    const errors = [];
    if (!request) {
      errors.push('Request is required');
      return { isValid: false, errors };
    }
    if (request.operation && !['migrate', 'migrate-batch', 'validate', 'rollback', 'status', 'statistics'].includes(request.operation)) {
      errors.push(`Invalid operation: ${request.operation}`);
    }
    if (request.operation === 'migrate' && !request.handlerRequest) {
      errors.push('Handler request is required for migration');
    }
    if (request.operation === 'migrate-batch' && (!request.handlers || !Array.isArray(request.handlers))) {
      errors.push('Handlers array is required for batch migration');
    }
    if (request.operation === 'rollback' && !request.handlerType) {
      errors.push('Handler type is required for rollback');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  /**
   * Migrate single handler
   * @param {Object} request - Migration request
   * @param {Object} context - Handler context
   * @returns {Promise<Object>} Migration result
   */
  async migrateHandler(request, context) {
    const handlerRequest = request.handlerRequest;
    const migrationContext = {
      ...context,
      autoMigration: this.options.enableAutoMigration,
      validation: this.options.enableValidation
    };
    const result = await this.migrationService.migrateHandler(handlerRequest, migrationContext);
    return {
      success: result.success,
      operation: 'migrate',
      result: result,
      timestamp: new Date().toISOString()
    };
  }
  /**
   * Migrate multiple handlers in batch
   * @param {Object} request - Migration request
   * @param {Object} context - Handler context
   * @returns {Promise<Object>} Batch migration result
   */
  async migrateBatch(request, context) {
    if (!this.options.enableBatchMigration) {
      return {
        success: false,
        error: 'Batch migration is disabled'
      };
    }
    const handlers = request.handlers;
    const results = [];
    const errors = [];
    for (const handlerRequest of handlers) {
      try {
        const result = await this.migrateHandler({ handlerRequest }, context);
        results.push(result);
      } catch (error) {
        errors.push({
          handlerRequest,
          error: error.message
        });
      }
    }
    const successful = results.filter(r => r.success).length;
    const failed = errors.length;
    return {
      success: failed === 0,
      operation: 'migrate-batch',
      total: handlers.length,
      successful: successful,
      failed: failed,
      results: results,
      errors: errors,
      timestamp: new Date().toISOString()
    };
  }
  /**
   * Validate migration
   * @param {Object} request - Validation request
   * @param {Object} context - Handler context
   * @returns {Promise<Object>} Validation result
   */
  async validateMigration(request, context) {
    const handlerType = request.handlerType;
    const migratedHandlers = this.migrationService.getMigratedHandlers();
    const migratedHandler = migratedHandlers.find(h => h.type === handlerType);
    if (!migratedHandler) {
      return {
        success: false,
        operation: 'validate',
        error: `Handler ${handlerType} not found in migrated handlers`
      };
    }
    return {
      success: true,
      operation: 'validate',
      handlerType: handlerType,
      validation: migratedHandler.validationResult,
      status: migratedHandler.status,
      timestamp: new Date().toISOString()
    };
  }
  /**
   * Rollback migration
   * @param {Object} request - Rollback request
   * @param {Object} context - Handler context
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackMigration(request, context) {
    const handlerType = request.handlerType;
    const result = await this.migrationService.rollbackMigration(handlerType);
    return {
      success: result.success,
      operation: 'rollback',
      result: result,
      timestamp: new Date().toISOString()
    };
  }
  /**
   * Get migration status
   * @param {Object} request - Status request
   * @param {Object} context - Handler context
   * @returns {Promise<Object>} Status result
   */
  async getMigrationStatus(request, context) {
    const handlerType = request.handlerType;
    if (handlerType) {
      // Get specific handler status
      const migratedHandlers = this.migrationService.getMigratedHandlers();
      const migratedHandler = migratedHandlers.find(h => h.type === handlerType);
      if (!migratedHandler) {
        return {
          success: false,
          operation: 'status',
          error: `Handler ${handlerType} not found in migrated handlers`
        };
      }
      return {
        success: true,
        operation: 'status',
        handlerType: handlerType,
        status: migratedHandler.status,
        migratedAt: migratedHandler.migratedAt,
        validation: migratedHandler.validationResult,
        timestamp: new Date().toISOString()
      };
    } else {
      // Get all handlers status
      const migratedHandlers = this.migrationService.getMigratedHandlers();
      return {
        success: true,
        operation: 'status',
        total: migratedHandlers.length,
        handlers: migratedHandlers.map(h => ({
          type: h.type,
          status: h.status,
          migratedAt: h.migratedAt
        })),
        timestamp: new Date().toISOString()
      };
    }
  }
  /**
   * Get migration statistics
   * @param {Object} request - Statistics request
   * @param {Object} context - Handler context
   * @returns {Promise<Object>} Statistics result
   */
  async getMigrationStatistics(request, context) {
    const statistics = this.migrationService.getMigrationStatistics();
    return {
      success: true,
      operation: 'statistics',
      statistics: statistics,
      timestamp: new Date().toISOString()
    };
  }
  /**
   * Auto-migrate generate handlers
   * @param {Object} context - Handler context
   * @returns {Promise<Object>} Auto-migration result
   */
  async autoMigrate(context = {}) {
    if (!this.options.enableAutoMigration) {
      return {
        success: false,
        error: 'Auto-migration is disabled'
      };
    }
    // Define handlers to auto-migrate
    const handlersToMigrate = [
      {
        handlerClass: 'GenerateScriptHandler',
        task: { description: 'Auto-migrated script generation' },
        options: { autoMigration: true }
      },
      {
        handlerClass: 'GenerateScriptsHandler',
        task: { description: 'Auto-migrated scripts generation' },
        options: { autoMigration: true }
      },
      {
        handlerClass: 'GenerateDocumentationHandler',
        task: { description: 'Auto-migrated documentation generation' },
        options: { autoMigration: true }
      }
    ];
    const results = [];
    const errors = [];
    for (const handlerRequest of handlersToMigrate) {
      try {
        const result = await this.migrationService.migrateHandler(handlerRequest, context);
        results.push(result);
      } catch (error) {
        errors.push({
          handlerRequest,
          error: error.message
        });
      }
    }
    const successful = results.filter(r => r.success).length;
    const failed = errors.length;
    return {
      success: failed === 0,
      operation: 'auto-migrate',
      total: handlersToMigrate.length,
      successful: successful,
      failed: failed,
      results: results,
      errors: errors,
      timestamp: new Date().toISOString()
    };
  }
  /**
   * Get handler metadata
   * @returns {Object} Handler metadata
   */
  getMetadata() {
    return {
      name: 'GenerateMigrationHandler',
      version: '1.0.0',
      description: 'Handler for migrating generate handlers to unified workflow system',
      operations: [
        'migrate',
        'migrate-batch',
        'validate',
        'rollback',
        'status',
        'statistics'
      ],
      options: this.options
    };
  }
  /**
   * Get handler options
   * @returns {Object} Handler options
   */
  getOptions() {
    return { ...this.options };
  }
  /**
   * Set handler options
   * @param {Object} options - Handler options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
    this.migrationService.setOptions(options);
  }
}
module.exports = GenerateMigrationHandler; 