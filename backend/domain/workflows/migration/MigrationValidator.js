/**
 * MigrationValidator - Validates migration results and handler compatibility
 */
class MigrationValidator {
  constructor() {
    this.logger = console;
  }

  /**
   * Validate migration results
   * @param {string} migrationId - Migration ID
   * @param {Array} results - Migration results
   * @returns {Promise<Object>} Validation result
   */
  async validateMigration(migrationId, results) {
    this.logger.info(`[MigrationValidator] Validating migration: ${migrationId}`);
    
    const validationResult = {
      migrationId,
      success: true,
      errors: [],
      warnings: [],
      validatedHandlers: 0,
      totalHandlers: results.length
    };

    for (const result of results) {
      try {
        const handlerValidation = await this.validateHandlerMigration(
          { name: result.handlerName },
          { name: result.unifiedStep }
        );

        if (handlerValidation.success) {
          validationResult.validatedHandlers++;
        } else {
          validationResult.errors.push({
            handler: result.handlerName,
            error: handlerValidation.error
          });
          validationResult.success = false;
        }
      } catch (error) {
        validationResult.errors.push({
          handler: result.handlerName,
          error: error.message
        });
        validationResult.success = false;
      }
    }

    this.logger.info(`[MigrationValidator] Validation completed:`, {
      migrationId,
      success: validationResult.success,
      validated: validationResult.validatedHandlers,
      total: validationResult.totalHandlers,
      errors: validationResult.errors.length
    });

    return validationResult;
  }

  /**
   * Validate individual handler migration
   * @param {Object} legacyHandler - Legacy handler
   * @param {Object} unifiedStep - Unified workflow step
   * @returns {Promise<Object>} Validation result
   */
  async validateHandlerMigration(legacyHandler, unifiedStep) {
    try {
      // Basic validation checks
      if (!legacyHandler || !unifiedStep) {
        return {
          success: false,
          error: 'Missing handler or unified step'
        };
      }

      if (!legacyHandler.name || !unifiedStep.name) {
        return {
          success: false,
          error: 'Handler or unified step missing name'
        };
      }

      // Check if unified step can be imported
      try {
        const { [unifiedStep.name]: StepClass } = require('../steps');
        if (!StepClass) {
          return {
            success: false,
            error: `Unified step class not found: ${unifiedStep.name}`
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to import unified step: ${error.message}`
        };
      }

      // Validate step type mapping
      const stepType = this.determineStepType(legacyHandler);
      if (!stepType) {
        return {
          success: false,
          error: `Could not determine step type for handler: ${legacyHandler.name}`
        };
      }

      this.logger.info(`[MigrationValidator] Handler validation successful: ${legacyHandler.name} -> ${stepType}`);

      return {
        success: true,
        stepType,
        legacyHandler: legacyHandler.name,
        unifiedStep: unifiedStep.name
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determine step type for validation
   * @param {Object} handler - Legacy handler
   * @returns {string|null} Step type
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
    }
    
    return null;
  }

  /**
   * Validate system compatibility
   * @returns {Promise<Object>} Compatibility validation result
   */
  async validateSystemCompatibility() {
    const compatibilityResult = {
      success: true,
      errors: [],
      warnings: [],
      checks: []
    };

    try {
      // Check if unified workflow system is available
      try {
        const { WorkflowBuilder, WorkflowStepBuilder } = require('../index');
        compatibilityResult.checks.push({
          name: 'Unified Workflow System',
          status: 'available',
          details: 'Core workflow components found'
        });
      } catch (error) {
        compatibilityResult.errors.push({
          check: 'Unified Workflow System',
          error: error.message
        });
        compatibilityResult.success = false;
      }

      // Check if handler system is available
      try {
        const { UnifiedWorkflowHandler } = require('../handlers');
        compatibilityResult.checks.push({
          name: 'Unified Handler System',
          status: 'available',
          details: 'Handler system found'
        });
      } catch (error) {
        compatibilityResult.errors.push({
          check: 'Unified Handler System',
          error: error.message
        });
        compatibilityResult.success = false;
      }

      // Check if execution engine is available
      try {
        const { SequentialExecutionEngine } = require('../execution');
        compatibilityResult.checks.push({
          name: 'Execution Engine',
          status: 'available',
          details: 'Execution engine found'
        });
      } catch (error) {
        compatibilityResult.warnings.push({
          check: 'Execution Engine',
          warning: error.message
        });
      }

    } catch (error) {
      compatibilityResult.errors.push({
        check: 'System Compatibility',
        error: error.message
      });
      compatibilityResult.success = false;
    }

    this.logger.info(`[MigrationValidator] System compatibility check:`, {
      success: compatibilityResult.success,
      checks: compatibilityResult.checks.length,
      errors: compatibilityResult.errors.length,
      warnings: compatibilityResult.warnings.length
    });

    return compatibilityResult;
  }
}

module.exports = MigrationValidator; 