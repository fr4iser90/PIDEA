/**
 * Migration Infrastructure - Core Module
 * 
 * This module provides the unified migration infrastructure including
 * orchestration, tracking, rollback, validation, and metrics components.
 */

// Core Migration Components
const MigrationManager = require('./MigrationManager');
const MigrationTracker = require('./MigrationTracker');
const MigrationRollback = require('./MigrationRollback');
const MigrationValidator = require('./MigrationValidator');
const MigrationMetrics = require('./MigrationMetrics');

/**
 * Migration Infrastructure Factory
 * 
 * Creates and configures all migration components with proper integration
 */
class MigrationInfrastructureFactory {
  /**
   * Create a new migration infrastructure instance
   * @param {Object} options - Infrastructure options
   * @returns {Object} Configured migration infrastructure
   */
  static async create(options = {}) {
    try {
      // Create migration components
      const manager = new MigrationManager(options.manager || {});
      const tracker = new MigrationTracker(options.tracker || {});
      const rollback = new MigrationRollback(options.rollback || {});
      const validator = new MigrationValidator(options.validator || {});
      const metrics = new MigrationMetrics(options.metrics || {});

      // Initialize components that have initialize method
      await Promise.all([
        metrics.initialize()
      ]);

      // Create infrastructure instance
      const infrastructure = {
        manager,
        tracker,
        rollback,
        validator,
        metrics,
        
        // Convenience methods
        async executeMigration(config) {
          return await manager.executeMigration(config);
        },
        
        async getMigrationStatus(migrationId) {
          return await tracker.getMigrationStatus(migrationId);
        },
        
        async rollbackMigration(migrationId, options) {
          return await rollback.manualRollback(migrationId, options);
        },
        
        async validateMigration(migrationId) {
          const status = await tracker.getMigrationStatus(migrationId);
          return await validator.validateMigrationResult(status);
        },
        
        async getMigrationMetrics(migrationId) {
          return await metrics.getMetrics(migrationId);
        },
        
        async getStatistics() {
          return {
            manager: manager.getStatus(),
            tracker: tracker.getStatistics(),
            rollback: rollback.getStatistics(),
            validator: validator.getStatistics(),
            metrics: metrics.getStatistics()
          };
        },
        
        async cleanup() {
          await Promise.all([
            manager.cleanup(),
            tracker.cleanup(),
            rollback.cleanup(),
            validator.cleanup(),
            metrics.cleanup()
          ]);
        }
      };

      console.log('Migration infrastructure created successfully');
      return infrastructure;

    } catch (error) {
      console.error('Failed to create migration infrastructure:', error);
      throw new Error(`Migration infrastructure creation failed: ${error.message}`);
    }
  }

  /**
   * Create a minimal migration infrastructure (for testing)
   * @param {Object} options - Infrastructure options
   * @returns {Object} Minimal migration infrastructure
   */
  static async createMinimal(options = {}) {
    try {
      const manager = new MigrationManager({
        enableRollback: false,
        enableValidation: false,
        enableMetrics: false,
        ...options.manager
      });

      // Manager doesn't have initialize method

      return {
        manager,
        
        async executeMigration(config) {
          return await manager.executeMigration(config);
        },
        
        async cleanup() {
          await manager.cleanup();
        }
      };

    } catch (error) {
      console.error('Failed to create minimal migration infrastructure:', error);
      throw new Error(`Minimal migration infrastructure creation failed: ${error.message}`);
    }
  }
}

/**
 * Migration Configuration Builder
 * 
 * Helps build migration configurations with proper validation
 */
class MigrationConfigBuilder {
  constructor() {
    this.config = {
      name: '',
      description: '',
      phases: [],
      dependencies: [],
      riskLevel: 'medium',
      options: {}
    };
  }

  /**
   * Set migration name
   * @param {string} name - Migration name
   * @returns {MigrationConfigBuilder} Builder instance
   */
  setName(name) {
    this.config.name = name;
    return this;
  }

  /**
   * Set migration description
   * @param {string} description - Migration description
   * @returns {MigrationConfigBuilder} Builder instance
   */
  setDescription(description) {
    this.config.description = description;
    return this;
  }

  /**
   * Add migration phase
   * @param {Object} phase - Phase configuration
   * @returns {MigrationConfigBuilder} Builder instance
   */
  addPhase(phase) {
    this.config.phases.push({
      id: phase.id || require('uuid').v4(),
      name: phase.name,
      description: phase.description || '',
      steps: phase.steps || [],
      dependencies: phase.dependencies || [],
      estimatedDuration: phase.estimatedDuration || 0,
      riskLevel: phase.riskLevel || 'medium',
      rollbackSteps: phase.rollbackSteps || []
    });
    return this;
  }

  /**
   * Add migration dependency
   * @param {string} dependency - Dependency identifier
   * @returns {MigrationConfigBuilder} Builder instance
   */
  addDependency(dependency) {
    this.config.dependencies.push(dependency);
    return this;
  }

  /**
   * Set risk level
   * @param {string} riskLevel - Risk level (low, medium, high)
   * @returns {MigrationConfigBuilder} Builder instance
   */
  setRiskLevel(riskLevel) {
    this.config.riskLevel = riskLevel;
    return this;
  }

  /**
   * Set migration options
   * @param {Object} options - Migration options
   * @returns {MigrationConfigBuilder} Builder instance
   */
  setOptions(options) {
    this.config.options = { ...this.config.options, ...options };
    return this;
  }

  /**
   * Build migration configuration
   * @returns {Object} Migration configuration
   */
  build() {
    // Validate configuration
    if (!this.config.name) {
      throw new Error('Migration name is required');
    }

    if (this.config.phases.length === 0) {
      throw new Error('At least one phase is required');
    }

    return { ...this.config };
  }
}

/**
 * Migration Utilities
 */
class MigrationUtils {
  /**
   * Validate migration configuration
   * @param {Object} config - Migration configuration
   * @returns {Object} Validation result
   */
  static validateConfig(config) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!config.name) {
      errors.push('Migration name is required');
    }

    if (!config.phases || config.phases.length === 0) {
      errors.push('At least one phase is required');
    }

    // Validate phases
    if (config.phases) {
      for (let i = 0; i < config.phases.length; i++) {
        const phase = config.phases[i];
        
        if (!phase.name) {
          errors.push(`Phase ${i + 1} name is required`);
        }

        if (!phase.steps || phase.steps.length === 0) {
          warnings.push(`Phase ${phase.name} has no steps`);
        }

        // Validate steps
        if (phase.steps) {
          for (let j = 0; j < phase.steps.length; j++) {
            const step = phase.steps[j];
            
            if (!step.name) {
              errors.push(`Step ${j + 1} in phase ${phase.name} name is required`);
            }

            if (!step.type) {
              errors.push(`Step ${step.name} in phase ${phase.name} type is required`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create default migration configuration
   * @param {string} name - Migration name
   * @returns {Object} Default configuration
   */
  static createDefaultConfig(name) {
    return new MigrationConfigBuilder()
      .setName(name)
      .setDescription(`Default migration for ${name}`)
      .setRiskLevel('medium')
      .build();
  }

  /**
   * Generate migration report
   * @param {Object} result - Migration result
   * @returns {Object} Migration report
   */
  static generateReport(result) {
    return {
      id: result.id,
      name: result.name,
      status: result.success ? 'completed' : 'failed',
      startTime: result.startTime,
      endTime: result.endTime,
      duration: result.endTime ? result.endTime - result.startTime : 0,
      phases: result.phases?.map(phase => ({
        name: phase.name,
        status: phase.status,
        duration: phase.duration,
        errors: phase.errors?.length || 0
      })) || [],
      errors: result.errors || [],
      warnings: result.warnings || [],
      summary: {
        totalPhases: result.phases?.length || 0,
        completedPhases: result.phases?.filter(p => p.status === 'completed').length || 0,
        failedPhases: result.phases?.filter(p => p.status === 'failed').length || 0,
        totalErrors: result.errors?.length || 0,
        totalWarnings: result.warnings?.length || 0
      }
    };
  }
}

// Module exports
module.exports = {
  // Core Components
  MigrationManager,
  MigrationTracker,
  MigrationRollback,
  MigrationValidator,
  MigrationMetrics,

  // Factory
  MigrationInfrastructureFactory,

  // Utilities
  MigrationConfigBuilder,
  MigrationUtils,

  // Convenience exports
  components: {
    MigrationManager,
    MigrationTracker,
    MigrationRollback,
    MigrationValidator,
    MigrationMetrics
  },

  factory: {
    MigrationInfrastructureFactory
  },

  utils: {
    MigrationConfigBuilder,
    MigrationUtils
  }
}; 