/**
 * MigrationManager - Core migration orchestration
 * 
 * This class provides the main entry point for migration operations,
 * orchestrating the entire migration lifecycle including planning,
 * execution, monitoring, and rollback capabilities.
 */
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class MigrationManager extends EventEmitter {
  /**
   * Create a new migration manager
   * @param {Object} dependencies - Migration dependencies
   */
  constructor(dependencies = {}) {
    super();
    
    this.migrationTracker = dependencies.migrationTracker;
    this.migrationRollback = dependencies.migrationRollback;
    this.migrationValidator = dependencies.migrationValidator;
    this.migrationMetrics = dependencies.migrationMetrics;
    this.migrationRepository = dependencies.migrationRepository;
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
    
    // Migration state
    this.activeMigrations = new Map();
    this.migrationQueue = [];
    this.isProcessing = false;
    
    // Configuration
    this.config = {
      maxConcurrentMigrations: dependencies.maxConcurrentMigrations || 3,
      defaultTimeout: dependencies.defaultTimeout || 300000, // 5 minutes
      enableAutoRollback: dependencies.enableAutoRollback !== false,
      enableMetrics: dependencies.enableMetrics !== false,
      enableValidation: dependencies.enableValidation !== false,
      retryAttempts: dependencies.retryAttempts || 3,
      retryDelay: dependencies.retryDelay || 5000, // 5 seconds
      ...dependencies.config
    };
    
    this.initializeEventHandlers();
  }

  /**
   * Initialize event handlers
   */
  initializeEventHandlers() {
    // Migration lifecycle events
    this.on('migration.started', this.handleMigrationStarted.bind(this));
    this.on('migration.completed', this.handleMigrationCompleted.bind(this));
    this.on('migration.failed', this.handleMigrationFailed.bind(this));
    this.on('migration.rolledback', this.handleMigrationRolledBack.bind(this));
    
    // Phase events
    this.on('phase.started', this.handlePhaseStarted.bind(this));
    this.on('phase.completed', this.handlePhaseCompleted.bind(this));
    this.on('phase.failed', this.handlePhaseFailed.bind(this));
    
    // Step events
    this.on('step.started', this.handleStepStarted.bind(this));
    this.on('step.completed', this.handleStepCompleted.bind(this));
    this.on('step.failed', this.handleStepFailed.bind(this));
    
    // Performance events
    this.on('metrics.collected', this.handleMetricsCollected.bind(this));
    this.on('performance.alert', this.handlePerformanceAlert.bind(this));
    
    // System events
    this.on('rollback.required', this.handleRollbackRequired.bind(this));
    this.on('validation.failed', this.handleValidationFailed.bind(this));
  }

  /**
   * Create and plan a new migration
   * @param {Object} migrationConfig - Migration configuration
   * @returns {Promise<Object>} Migration plan
   */
  async createMigration(migrationConfig) {
    const migrationId = migrationConfig.id || uuidv4();
    const startTime = Date.now();
    
    try {
      this.logger.info('MigrationManager: Creating migration', {
        migrationId,
        name: migrationConfig.name,
        type: migrationConfig.type
      });

      // Validate migration configuration
      if (this.config.enableValidation) {
        const validationResult = await this.migrationValidator.validateMigrationConfig(migrationConfig);
        if (!validationResult.isValid) {
          throw new Error(`Migration configuration validation failed: ${validationResult.errors.join(', ')}`);
        }
      }

      // Create migration tracking record
      const migrationRecord = {
        id: migrationId,
        migration_id: migrationId,
        migration_name: migrationConfig.name,
        migration_description: migrationConfig.description,
        status: 'pending',
        risk_level: migrationConfig.riskLevel || 'medium',
        dependencies: migrationConfig.dependencies || [],
        configuration: migrationConfig.configuration || {},
        metadata: migrationConfig.metadata || {},
        total_phases: migrationConfig.phases?.length || 0,
        total_steps: this.calculateTotalSteps(migrationConfig.phases || []),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Save to database
      await this.migrationRepository.createMigration(migrationRecord);

      // Create migration plan
      const plan = {
        migrationId,
        name: migrationConfig.name,
        description: migrationConfig.description,
        phases: migrationConfig.phases || [],
        estimatedDuration: migrationConfig.estimatedDuration,
        riskLevel: migrationConfig.riskLevel || 'medium',
        dependencies: migrationConfig.dependencies || [],
        rollbackPlan: migrationConfig.rollbackPlan || {},
        validationRules: migrationConfig.validationRules || [],
        metricsConfig: migrationConfig.metricsConfig || {},
        createdAt: new Date()
      };

      // Emit migration created event
      this.emit('migration.created', {
        migrationId,
        plan,
        duration: Date.now() - startTime
      });

      this.logger.info('MigrationManager: Migration created successfully', {
        migrationId,
        duration: Date.now() - startTime
      });

      return plan;

    } catch (error) {
      this.logger.error('MigrationManager: Failed to create migration', {
        migrationId,
        error: error.message,
        duration: Date.now() - startTime
      });

      throw new Error(`Migration creation failed: ${error.message}`);
    }
  }

  /**
   * Execute a migration
   * @param {string} migrationId - Migration ID
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Migration result
   */
  async executeMigration(migrationId, options = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info('MigrationManager: Starting migration execution', {
        migrationId,
        options
      });

      // Check if migration is already running
      if (this.activeMigrations.has(migrationId)) {
        throw new Error(`Migration ${migrationId} is already running`);
      }

      // Get migration details
      const migration = await this.migrationRepository.getMigrationById(migrationId);
      if (!migration) {
        throw new Error(`Migration ${migrationId} not found`);
      }

      if (migration.status === 'completed') {
        throw new Error(`Migration ${migrationId} has already been completed`);
      }

      if (migration.status === 'running') {
        throw new Error(`Migration ${migrationId} is already running`);
      }

      // Check concurrent migration limit
      if (this.activeMigrations.size >= this.config.maxConcurrentMigrations) {
        throw new Error(`Maximum concurrent migrations limit reached (${this.config.maxConcurrentMigrations})`);
      }

      // Update migration status to running
      await this.migrationRepository.updateMigrationStatus(migrationId, 'running', {
        start_time: new Date(),
        current_phase: null,
        current_step: null,
        progress_percentage: 0
      });

      // Add to active migrations
      this.activeMigrations.set(migrationId, {
        migration,
        startTime: Date.now(),
        options,
        phases: [],
        currentPhase: null,
        currentStep: null
      });

      // Emit migration started event
      this.emit('migration.started', {
        migrationId,
        migration,
        options,
        timestamp: new Date()
      });

      // Execute migration phases
      const result = await this.executeMigrationPhases(migrationId, migration, options);

      // Update migration status to completed
      await this.migrationRepository.updateMigrationStatus(migrationId, 'completed', {
        end_time: new Date(),
        duration: Date.now() - startTime,
        progress_percentage: 100,
        completed_phases: result.completedPhases,
        completed_steps: result.completedSteps
      });

      // Remove from active migrations
      this.activeMigrations.delete(migrationId);

      // Emit migration completed event
      this.emit('migration.completed', {
        migrationId,
        result,
        duration: Date.now() - startTime,
        timestamp: new Date()
      });

      this.logger.info('MigrationManager: Migration completed successfully', {
        migrationId,
        duration: Date.now() - startTime,
        completedPhases: result.completedPhases,
        completedSteps: result.completedSteps
      });

      return result;

    } catch (error) {
      // Update migration status to failed
      await this.migrationRepository.updateMigrationStatus(migrationId, 'failed', {
        end_time: new Date(),
        duration: Date.now() - startTime,
        error_count: 1
      });

      // Remove from active migrations
      this.activeMigrations.delete(migrationId);

      // Emit migration failed event
      this.emit('migration.failed', {
        migrationId,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date()
      });

      this.logger.error('MigrationManager: Migration execution failed', {
        migrationId,
        error: error.message,
        duration: Date.now() - startTime
      });

      throw new Error(`Migration execution failed: ${error.message}`);
    }
  }

  /**
   * Execute migration phases
   * @param {string} migrationId - Migration ID
   * @param {Object} migration - Migration record
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeMigrationPhases(migrationId, migration, options) {
    const phases = migration.configuration?.phases || [];
    let completedPhases = 0;
    let completedSteps = 0;
    let totalSteps = this.calculateTotalSteps(phases);

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const phaseId = phase.id || `phase_${i + 1}`;

      try {
        // Update current phase
        await this.migrationRepository.updateMigrationPhase(migrationId, phaseId, 'running', {
          start_time: new Date()
        });

        this.activeMigrations.get(migrationId).currentPhase = phaseId;

        // Emit phase started event
        this.emit('phase.started', {
          migrationId,
          phaseId,
          phase,
          timestamp: new Date()
        });

        // Execute phase steps
        const phaseResult = await this.executePhaseSteps(migrationId, phaseId, phase, options);
        completedSteps += phaseResult.completedSteps;

        // Update phase status to completed
        await this.migrationRepository.updateMigrationPhase(migrationId, phaseId, 'completed', {
          end_time: new Date(),
          duration: phaseResult.duration,
          completed_steps: phaseResult.completedSteps,
          result: phaseResult.result
        });

        completedPhases++;

        // Update overall progress
        const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
        await this.migrationRepository.updateMigrationProgress(migrationId, {
          current_phase: phaseId,
          progress_percentage: progressPercentage,
          completed_phases: completedPhases,
          completed_steps: completedSteps
        });

        // Emit phase completed event
        this.emit('phase.completed', {
          migrationId,
          phaseId,
          phaseResult,
          timestamp: new Date()
        });

      } catch (error) {
        // Update phase status to failed
        await this.migrationRepository.updateMigrationPhase(migrationId, phaseId, 'failed', {
          end_time: new Date(),
          error_message: error.message
        });

        // Emit phase failed event
        this.emit('phase.failed', {
          migrationId,
          phaseId,
          error: error.message,
          timestamp: new Date()
        });

        throw error;
      }
    }

    return {
      completedPhases,
      completedSteps,
      totalSteps,
      duration: Date.now() - this.activeMigrations.get(migrationId).startTime
    };
  }

  /**
   * Execute phase steps
   * @param {string} migrationId - Migration ID
   * @param {string} phaseId - Phase ID
   * @param {Object} phase - Phase configuration
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Phase result
   */
  async executePhaseSteps(migrationId, phaseId, phase, options) {
    const steps = phase.steps || [];
    let completedSteps = 0;
    const startTime = Date.now();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepId = step.id || `step_${i + 1}`;

      try {
        // Update current step
        await this.migrationRepository.updateMigrationStep(migrationId, phaseId, stepId, 'running', {
          start_time: new Date()
        });

        this.activeMigrations.get(migrationId).currentStep = stepId;

        // Emit step started event
        this.emit('step.started', {
          migrationId,
          phaseId,
          stepId,
          step,
          timestamp: new Date()
        });

        // Execute step
        const stepResult = await this.executeStep(migrationId, phaseId, stepId, step, options);

        // Update step status to completed
        await this.migrationRepository.updateMigrationStep(migrationId, phaseId, stepId, 'completed', {
          end_time: new Date(),
          duration: stepResult.duration,
          result: stepResult.result
        });

        completedSteps++;

        // Emit step completed event
        this.emit('step.completed', {
          migrationId,
          phaseId,
          stepId,
          stepResult,
          timestamp: new Date()
        });

      } catch (error) {
        // Update step status to failed
        await this.migrationRepository.updateMigrationStep(migrationId, phaseId, stepId, 'failed', {
          end_time: new Date(),
          error_message: error.message
        });

        // Emit step failed event
        this.emit('step.failed', {
          migrationId,
          phaseId,
          stepId,
          error: error.message,
          timestamp: new Date()
        });

        throw error;
      }
    }

    return {
      completedSteps,
      duration: Date.now() - startTime
    };
  }

  /**
   * Execute a single step
   * @param {string} migrationId - Migration ID
   * @param {string} phaseId - Phase ID
   * @param {string} stepId - Step ID
   * @param {Object} step - Step configuration
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Step result
   */
  async executeStep(migrationId, phaseId, stepId, step, options) {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = step.maxRetries || this.config.retryAttempts;

    while (retryCount <= maxRetries) {
      try {
        this.logger.debug('MigrationManager: Executing step', {
          migrationId,
          phaseId,
          stepId,
          stepType: step.type,
          retryCount
        });

        // Execute step based on type
        let result;
        switch (step.type) {
          case 'database':
            result = await this.executeDatabaseStep(step);
            break;
          case 'file':
            result = await this.executeFileStep(step);
            break;
          case 'api':
            result = await this.executeApiStep(step);
            break;
          case 'script':
            result = await this.executeScriptStep(step);
            break;
          default:
            throw new Error(`Unsupported step type: ${step.type}`);
        }

        // Validate step result if validation is enabled
        if (this.config.enableValidation && step.validation) {
          const validationResult = await this.migrationValidator.validateStepResult(step, result);
          if (!validationResult.isValid) {
            throw new Error(`Step validation failed: ${validationResult.errors.join(', ')}`);
          }
        }

        // Collect metrics if enabled
        if (this.config.enableMetrics) {
          await this.migrationMetrics.recordStepMetrics(migrationId, phaseId, stepId, {
            duration: Date.now() - startTime,
            stepType: step.type,
            result
          });
        }

        return {
          result,
          duration: Date.now() - startTime,
          retryCount
        };

      } catch (error) {
        retryCount++;
        
        if (retryCount > maxRetries) {
          throw error;
        }

        this.logger.warn('MigrationManager: Step failed, retrying', {
          migrationId,
          phaseId,
          stepId,
          error: error.message,
          retryCount,
          maxRetries
        });

        // Wait before retry
        await this.delay(this.config.retryDelay * retryCount);
      }
    }
  }

  /**
   * Execute database step
   * @param {Object} step - Step configuration
   * @returns {Promise<Object>} Step result
   */
  async executeDatabaseStep(step) {
    // Implementation for database operations
    // This would integrate with your existing database infrastructure
    return { success: true, operation: step.operation };
  }

  /**
   * Execute file step
   * @param {Object} step - Step configuration
   * @returns {Promise<Object>} Step result
   */
  async executeFileStep(step) {
    // Implementation for file operations
    return { success: true, operation: step.operation };
  }

  /**
   * Execute API step
   * @param {Object} step - Step configuration
   * @returns {Promise<Object>} Step result
   */
  async executeApiStep(step) {
    // Implementation for API operations
    return { success: true, operation: step.operation };
  }

  /**
   * Execute script step
   * @param {Object} step - Step configuration
   * @returns {Promise<Object>} Step result
   */
  async executeScriptStep(step) {
    // Implementation for script execution
    return { success: true, operation: step.operation };
  }

  /**
   * Rollback a migration
   * @param {string} migrationId - Migration ID
   * @param {Object} options - Rollback options
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackMigration(migrationId, options = {}) {
    return this.migrationRollback.rollbackMigration(migrationId, options);
  }

  /**
   * Get migration status
   * @param {string} migrationId - Migration ID
   * @returns {Promise<Object>} Migration status
   */
  async getMigrationStatus(migrationId) {
    return this.migrationTracker.getMigrationStatus(migrationId);
  }

  /**
   * Get all migrations
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Migration list
   */
  async getMigrations(filters = {}) {
    return this.migrationRepository.getMigrations(filters);
  }

  /**
   * Get migration metrics
   * @param {string} migrationId - Migration ID
   * @returns {Promise<Object>} Migration metrics
   */
  async getMigrationMetrics(migrationId) {
    return this.migrationMetrics.getMigrationMetrics(migrationId);
  }

  /**
   * Calculate total steps in phases
   * @param {Array} phases - Migration phases
   * @returns {number} Total steps
   */
  calculateTotalSteps(phases) {
    return phases.reduce((total, phase) => {
      return total + (phase.steps?.length || 0);
    }, 0);
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Event handlers
  handleMigrationStarted(data) {
    this.logger.info('MigrationManager: Migration started', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.started', data);
    }
  }

  handleMigrationCompleted(data) {
    this.logger.info('MigrationManager: Migration completed', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.completed', data);
    }
  }

  handleMigrationFailed(data) {
    this.logger.error('MigrationManager: Migration failed', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.failed', data);
    }
  }

  handleMigrationRolledBack(data) {
    this.logger.info('MigrationManager: Migration rolled back', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.rolledback', data);
    }
  }

  handlePhaseStarted(data) {
    this.logger.debug('MigrationManager: Phase started', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.phase.started', data);
    }
  }

  handlePhaseCompleted(data) {
    this.logger.debug('MigrationManager: Phase completed', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.phase.completed', data);
    }
  }

  handlePhaseFailed(data) {
    this.logger.error('MigrationManager: Phase failed', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.phase.failed', data);
    }
  }

  handleStepStarted(data) {
    this.logger.debug('MigrationManager: Step started', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.step.started', data);
    }
  }

  handleStepCompleted(data) {
    this.logger.debug('MigrationManager: Step completed', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.step.completed', data);
    }
  }

  handleStepFailed(data) {
    this.logger.error('MigrationManager: Step failed', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.step.failed', data);
    }
  }

  handleMetricsCollected(data) {
    this.logger.debug('MigrationManager: Metrics collected', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.metrics.collected', data);
    }
  }

  handlePerformanceAlert(data) {
    this.logger.warn('MigrationManager: Performance alert', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.performance.alert', data);
    }
  }

  handleRollbackRequired(data) {
    this.logger.warn('MigrationManager: Rollback required', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.rollback.required', data);
    }
  }

  handleValidationFailed(data) {
    this.logger.error('MigrationManager: Validation failed', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.validation.failed', data);
    }
  }
}

module.exports = MigrationManager; 