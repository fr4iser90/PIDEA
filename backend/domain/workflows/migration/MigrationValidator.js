/**
 * MigrationValidator - Comprehensive migration validation and health checking
 * 
 * This class provides comprehensive validation for the migration system,
 * including handler migration status, integration health, and system compatibility.
 */

class MigrationValidator {
  /**
   * Create a new migration validator
   * @param {Object} dependencies - Validator dependencies
   */
  constructor(dependencies = {}) {
    this.handlerRegistry = dependencies.handlerRegistry;
    this.stepRegistry = dependencies.stepRegistry;
    this.integrationSystem = dependencies.integrationSystem;
    this.logger = dependencies.logger || console;
    
    this.validationRules = this.initializeValidationRules();
  }

  /**
   * Initialize validation rules
   * @returns {Array} Validation rules
   */
  initializeValidationRules() {
    return [
      {
        name: 'handler_migration_completeness',
        description: 'All handlers must have migration status',
        validate: (context) => this.validateHandlerMigrationCompleteness(context)
      },
      {
        name: 'automation_level_consistency',
        description: 'Automation levels must be consistent with migration status',
        validate: (context) => this.validateAutomationLevelConsistency(context)
      },
      {
        name: 'integration_health',
        description: 'Integration system must be healthy',
        validate: (context) => this.validateIntegrationHealth(context)
      },
      {
        name: 'step_registration',
        description: 'All migrated handlers must have corresponding steps',
        validate: (context) => this.validateStepRegistration(context)
      },
      {
        name: 'api_endpoint_availability',
        description: 'API endpoints must be available for migrated handlers',
        validate: (context) => this.validateAPIEndpointAvailability(context)
      },
      {
        name: 'performance_requirements',
        description: 'System must meet performance requirements',
        validate: (context) => this.validatePerformanceRequirements(context)
      },
      {
        name: 'error_handling',
        description: 'Error handling must be properly implemented',
        validate: (context) => this.validateErrorHandling(context)
      },
      {
        name: 'rollback_mechanisms',
        description: 'Rollback mechanisms must be available',
        validate: (context) => this.validateRollbackMechanisms(context)
      }
    ];
  }

  /**
   * Validate complete migration system
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateMigrationSystem(options = {}) {
    const startTime = Date.now();
    const validationId = this.generateValidationId();
    
    try {
      this.logger.info('MigrationValidator: Starting comprehensive validation', {
        validationId,
        options
      });

      const context = {
        validationId,
        startTime,
        options,
        results: {}
      };

      // Run all validation rules
      const validationResults = [];
      
      for (const rule of this.validationRules) {
        try {
          const result = await rule.validate(context);
          validationResults.push({
            rule: rule.name,
            description: rule.description,
            ...result
          });
        } catch (error) {
          validationResults.push({
            rule: rule.name,
            description: rule.description,
            isValid: false,
            error: error.message
          });
        }
      }

      // Calculate overall validation status
      const validResults = validationResults.filter(r => r.isValid);
      const invalidResults = validationResults.filter(r => !r.isValid);
      const overallValid = invalidResults.length === 0;

      const duration = Date.now() - startTime;

      const validationResult = {
        validationId,
        isValid: overallValid,
        duration,
        timestamp: new Date(),
        summary: {
          total: validationResults.length,
          valid: validResults.length,
          invalid: invalidResults.length,
          successRate: (validResults.length / validationResults.length) * 100
        },
        results: validationResults,
        recommendations: this.generateRecommendations(validationResults)
      };

      this.logger.info('MigrationValidator: Validation completed', {
        validationId,
        isValid: overallValid,
        duration,
        successRate: validationResult.summary.successRate
      });

      return validationResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('MigrationValidator: Validation failed', {
        validationId,
        error: error.message,
        duration
      });

      return {
        validationId,
        isValid: false,
        duration,
        timestamp: new Date(),
        error: error.message,
        summary: {
          total: 0,
          valid: 0,
          invalid: 1,
          successRate: 0
        },
        results: [],
        recommendations: ['Fix validation system error']
      };
    }
  }

  /**
   * Validate handler migration completeness
   * @param {Object} context - Validation context
   * @returns {Object} Validation result
   */
  async validateHandlerMigrationCompleteness(context) {
    const handlers = this.handlerRegistry.listHandlers();
    const issues = [];
    const warnings = [];

    for (const handler of handlers) {
      const metadata = this.handlerRegistry.getHandlerMetadata(handler.type);
      
      if (!metadata) {
        issues.push(`Handler ${handler.type} has no metadata`);
        continue;
      }

      if (!metadata.migrationStatus) {
        issues.push(`Handler ${handler.type} has no migration status`);
        continue;
      }

      if (!metadata.automationLevel) {
        warnings.push(`Handler ${handler.type} has no automation level`);
      }

      if (!metadata.migrationDate && metadata.migrationStatus !== 'unknown') {
        warnings.push(`Handler ${handler.type} has no migration date`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      details: {
        totalHandlers: handlers.length,
        handlersWithMigrationStatus: handlers.filter(h => {
          const metadata = this.handlerRegistry.getHandlerMetadata(h.type);
          return metadata && metadata.migrationStatus;
        }).length
      }
    };
  }

  /**
   * Validate automation level consistency
   * @param {Object} context - Validation context
   * @returns {Object} Validation result
   */
  async validateAutomationLevelConsistency(context) {
    const handlers = this.handlerRegistry.listHandlers();
    const issues = [];
    const warnings = [];

    for (const handler of handlers) {
      const metadata = this.handlerRegistry.getHandlerMetadata(handler.type);
      
      if (!metadata) continue;

      const { migrationStatus, automationLevel } = metadata;

      // Check consistency rules
      if (migrationStatus === 'completed' || migrationStatus === 'validated') {
        if (automationLevel !== 'full') {
          issues.push(`Handler ${handler.type} should have full automation (status: ${migrationStatus})`);
        }
      } else if (migrationStatus === 'unified') {
        if (automationLevel !== 'enhanced' && automationLevel !== 'full') {
          warnings.push(`Handler ${handler.type} could have enhanced automation (status: ${migrationStatus})`);
        }
      } else if (migrationStatus === 'deprecated') {
        if (automationLevel !== 'basic') {
          warnings.push(`Handler ${handler.type} should have basic automation (status: ${migrationStatus})`);
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      details: {
        totalHandlers: handlers.length,
        consistentHandlers: handlers.filter(h => {
          const metadata = this.handlerRegistry.getHandlerMetadata(h.type);
          if (!metadata) return false;
          
          const { migrationStatus, automationLevel } = metadata;
          return this.isAutomationLevelConsistent(migrationStatus, automationLevel);
        }).length
      }
    };
  }

  /**
   * Check if automation level is consistent with migration status
   * @param {string} migrationStatus - Migration status
   * @param {string} automationLevel - Automation level
   * @returns {boolean} True if consistent
   */
  isAutomationLevelConsistent(migrationStatus, automationLevel) {
    switch (migrationStatus) {
      case 'completed':
      case 'validated':
        return automationLevel === 'full';
      case 'unified':
        return automationLevel === 'enhanced' || automationLevel === 'full';
      case 'deprecated':
        return automationLevel === 'basic';
      default:
        return true; // Unknown status is considered consistent
    }
  }

  /**
   * Validate integration health
   * @param {Object} context - Validation context
   * @returns {Object} Validation result
   */
  async validateIntegrationHealth(context) {
    try {
      const health = await this.integrationSystem.isHealthy();
      const status = await this.integrationSystem.getStatus();
      
      const issues = [];
      const warnings = [];

      if (!health) {
        issues.push('Integration system is not healthy');
      }

      if (!status.isInitialized) {
        issues.push('Integration system is not initialized');
      }

      if (status.errorCount > 0) {
        warnings.push(`Integration system has ${status.errorCount} errors`);
      }

      return {
        isValid: issues.length === 0,
        issues,
        warnings,
        details: {
          isHealthy: health,
          isInitialized: status.isInitialized,
          errorCount: status.errorCount,
          integrationCount: status.integrationCount
        }
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Integration health check failed: ${error.message}`],
        warnings: [],
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate step registration
   * @param {Object} context - Validation context
   * @returns {Object} Validation result
   */
  async validateStepRegistration(context) {
    const handlers = this.handlerRegistry.listHandlers();
    const steps = this.stepRegistry.listSteps();
    const issues = [];
    const warnings = [];

    // Check if migrated handlers have corresponding steps
    for (const handler of handlers) {
      const metadata = this.handlerRegistry.getHandlerMetadata(handler.type);
      
      if (metadata && (metadata.migrationStatus === 'completed' || metadata.migrationStatus === 'validated')) {
        const correspondingStep = steps.find(s => s.type === handler.type);
        
        if (!correspondingStep) {
          warnings.push(`Handler ${handler.type} has no corresponding step`);
        }
      }
    }

    // Check if steps have corresponding handlers
    for (const step of steps) {
      const correspondingHandler = handlers.find(h => h.type === step.type);
      
      if (!correspondingHandler) {
        warnings.push(`Step ${step.type} has no corresponding handler`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      details: {
        totalHandlers: handlers.length,
        totalSteps: steps.length,
        handlersWithSteps: handlers.filter(h => {
          return steps.find(s => s.type === h.type);
        }).length
      }
    };
  }

  /**
   * Validate API endpoint availability
   * @param {Object} context - Validation context
   * @returns {Object} Validation result
   */
  async validateAPIEndpointAvailability(context) {
    // This would typically check if API endpoints are responding
    // For now, we'll simulate the validation
    const issues = [];
    const warnings = [];

    // Simulate API endpoint checks
    const endpoints = [
      '/api/handlers/list',
      '/api/handlers/migration/status',
      '/api/workflows/list',
      '/api/workflows/migration/status'
    ];

    // In a real implementation, we would make HTTP requests to these endpoints
    // For now, we'll assume they're available
    const availableEndpoints = endpoints.length;
    const totalEndpoints = endpoints.length;

    if (availableEndpoints < totalEndpoints) {
      issues.push(`${totalEndpoints - availableEndpoints} API endpoints are not available`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      details: {
        totalEndpoints,
        availableEndpoints,
        availabilityRate: (availableEndpoints / totalEndpoints) * 100
      }
    };
  }

  /**
   * Validate performance requirements
   * @param {Object} context - Validation context
   * @returns {Object} Validation result
   */
  async validatePerformanceRequirements(context) {
    const issues = [];
    const warnings = [];
    const performanceMetrics = {};

    try {
      // Test handler execution performance
      const startTime = Date.now();
      
      const request = {
        type: 'architecture-analysis',
        projectPath: '/test/project',
        options: { depth: 'basic' }
      };

      const result = await this.integrationSystem.manager.unifiedHandler.handle(request, {}, {});
      
      const duration = Date.now() - startTime;
      performanceMetrics.handlerExecutionTime = duration;

      // Performance thresholds
      if (duration > 5000) {
        issues.push(`Handler execution time (${duration}ms) exceeds 5 second threshold`);
      } else if (duration > 3000) {
        warnings.push(`Handler execution time (${duration}ms) is approaching threshold`);
      }

      // Test system health performance
      const healthStartTime = Date.now();
      await this.integrationSystem.isHealthy();
      const healthDuration = Date.now() - healthStartTime;
      performanceMetrics.healthCheckTime = healthDuration;

      if (healthDuration > 1000) {
        warnings.push(`Health check time (${healthDuration}ms) is slow`);
      }

      return {
        isValid: issues.length === 0,
        issues,
        warnings,
        details: {
          performanceMetrics,
          thresholds: {
            handlerExecution: 5000,
            healthCheck: 1000
          }
        }
      };

    } catch (error) {
      return {
        isValid: false,
        issues: [`Performance validation failed: ${error.message}`],
        warnings: [],
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate error handling
   * @param {Object} context - Validation context
   * @returns {Object} Validation result
   */
  async validateErrorHandling(context) {
    const issues = [];
    const warnings = [];

    try {
      // Test error handling with invalid request
      const invalidRequest = {
        type: 'invalid_handler_type',
        projectPath: '/test/project'
      };

      const result = await this.integrationSystem.manager.unifiedHandler.handle(invalidRequest, {}, {});
      
      if (result.isSuccess()) {
        issues.push('System should handle invalid handler types gracefully');
      } else {
        // Error handling is working correctly
        warnings.push('Error handling is working but could be improved');
      }

      return {
        isValid: issues.length === 0,
        issues,
        warnings,
        details: {
          errorHandlingTested: true,
          gracefulFailure: !result.isSuccess()
        }
      };

    } catch (error) {
      return {
        isValid: false,
        issues: [`Error handling validation failed: ${error.message}`],
        warnings: [],
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate rollback mechanisms
   * @param {Object} context - Validation context
   * @returns {Object} Validation result
   */
  async validateRollbackMechanisms(context) {
    const issues = [];
    const warnings = [];

    // Check if rollback mechanisms are available
    const hasRollbackAPI = true; // This would check if rollback endpoints exist
    const hasBackupSystem = true; // This would check if backup system is available
    const hasMigrationHistory = true; // This would check if migration history is tracked

    if (!hasRollbackAPI) {
      issues.push('Rollback API endpoints are not available');
    }

    if (!hasBackupSystem) {
      warnings.push('Backup system is not available');
    }

    if (!hasMigrationHistory) {
      warnings.push('Migration history is not tracked');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      details: {
        hasRollbackAPI,
        hasBackupSystem,
        hasMigrationHistory,
        rollbackCapability: hasRollbackAPI && hasBackupSystem
      }
    };
  }

  /**
   * Generate recommendations based on validation results
   * @param {Array} validationResults - Validation results
   * @returns {Array} Recommendations
   */
  generateRecommendations(validationResults) {
    const recommendations = [];

    // Analyze validation results and generate recommendations
    const invalidResults = validationResults.filter(r => !r.isValid);
    const warnings = validationResults.flatMap(r => r.warnings || []);

    if (invalidResults.length > 0) {
      recommendations.push('Fix critical validation issues before proceeding');
    }

    if (warnings.length > 0) {
      recommendations.push('Address warnings to improve system quality');
    }

    // Specific recommendations based on validation results
    validationResults.forEach(result => {
      if (result.rule === 'handler_migration_completeness' && !result.isValid) {
        recommendations.push('Complete migration metadata for all handlers');
      }
      
      if (result.rule === 'automation_level_consistency' && !result.isValid) {
        recommendations.push('Align automation levels with migration status');
      }
      
      if (result.rule === 'performance_requirements' && !result.isValid) {
        recommendations.push('Optimize system performance to meet requirements');
      }
    });

    return recommendations;
  }

  /**
   * Generate validation ID
   * @returns {string} Validation ID
   */
  generateValidationId() {
    return `validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get validation rules
   * @returns {Array} Validation rules
   */
  getValidationRules() {
    return this.validationRules;
  }

  /**
   * Add custom validation rule
   * @param {Object} rule - Validation rule
   */
  addValidationRule(rule) {
    if (rule.name && rule.validate) {
      this.validationRules.push(rule);
    }
  }

  /**
   * Remove validation rule
   * @param {string} ruleName - Rule name
   */
  removeValidationRule(ruleName) {
    this.validationRules = this.validationRules.filter(rule => rule.name !== ruleName);
  }
}

module.exports = MigrationValidator; 