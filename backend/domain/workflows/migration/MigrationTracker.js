/**
 * MigrationTracker - Migration progress and status tracking
 * 
 * This class provides comprehensive tracking of migration progress,
 * status updates, and detailed state management throughout the
 * migration lifecycle.
 */
const EventEmitter = require('events');

class MigrationTracker extends EventEmitter {
  /**
   * Create a new migration tracker
   * @param {Object} dependencies - Tracker dependencies
   */
  constructor(dependencies = {}) {
    super();
    
    this.migrationRepository = dependencies.migrationRepository;
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
    
    // Tracking state
    this.activeMigrations = new Map();
    this.migrationHistory = new Map();
    this.progressCallbacks = new Map();
    
    // Configuration
    this.config = {
      enableDetailedTracking: dependencies.enableDetailedTracking !== false,
      enableProgressCallbacks: dependencies.enableProgressCallbacks !== false,
      progressUpdateInterval: dependencies.progressUpdateInterval || 1000, // 1 second
      maxHistorySize: dependencies.maxHistorySize || 1000,
      enablePerformanceTracking: dependencies.enablePerformanceTracking !== false,
      ...dependencies.config
    };
    
    this.initializeEventHandlers();
  }

  /**
   * Initialize event handlers
   */
  initializeEventHandlers() {
    this.on('progress.updated', this.handleProgressUpdated.bind(this));
    this.on('status.changed', this.handleStatusChanged.bind(this));
    this.on('phase.completed', this.handlePhaseCompleted.bind(this));
    this.on('step.completed', this.handleStepCompleted.bind(this));
  }

  /**
   * Start tracking a migration
   * @param {string} migrationId - Migration ID
   * @param {Object} migrationData - Migration data
   * @returns {Promise<boolean>} True if tracking started successfully
   */
  async startTracking(migrationId, migrationData) {
    try {
      this.logger.info('MigrationTracker: Starting migration tracking', {
        migrationId,
        name: migrationData.migration_name
      });

      // Create tracking record
      const trackingRecord = {
        migrationId,
        startTime: new Date(),
        status: 'tracking',
        phases: migrationData.configuration?.phases || [],
        totalPhases: migrationData.total_phases || 0,
        totalSteps: migrationData.total_steps || 0,
        completedPhases: 0,
        completedSteps: 0,
        currentPhase: null,
        currentStep: null,
        progressPercentage: 0,
        errors: [],
        warnings: [],
        performanceMetrics: {},
        metadata: migrationData.metadata || {}
      };

      // Store in active migrations
      this.activeMigrations.set(migrationId, trackingRecord);

      // Update database
      await this.migrationRepository.updateMigrationStatus(migrationId, 'tracking', {
        start_time: trackingRecord.startTime,
        current_phase: null,
        current_step: null,
        progress_percentage: 0
      });

      // Start progress monitoring if enabled
      if (this.config.enableProgressCallbacks) {
        this.startProgressMonitoring(migrationId);
      }

      // Emit tracking started event
      this.emit('tracking.started', {
        migrationId,
        trackingRecord,
        timestamp: new Date()
      });

      this.logger.info('MigrationTracker: Migration tracking started successfully', {
        migrationId
      });

      return true;

    } catch (error) {
      this.logger.error('MigrationTracker: Failed to start tracking', {
        migrationId,
        error: error.message
      });

      throw new Error(`Failed to start migration tracking: ${error.message}`);
    }
  }

  /**
   * Update migration progress
   * @param {string} migrationId - Migration ID
   * @param {Object} progressData - Progress data
   * @returns {Promise<boolean>} True if progress updated successfully
   */
  async updateProgress(migrationId, progressData) {
    try {
      const trackingRecord = this.activeMigrations.get(migrationId);
      if (!trackingRecord) {
        throw new Error(`Migration ${migrationId} is not being tracked`);
      }

      // Update tracking record
      Object.assign(trackingRecord, {
        ...progressData,
        lastUpdated: new Date()
      });

      // Calculate progress percentage
      if (trackingRecord.totalSteps > 0) {
        trackingRecord.progressPercentage = Math.round(
          (trackingRecord.completedSteps / trackingRecord.totalSteps) * 100
        );
      }

      // Update database
      await this.migrationRepository.updateMigrationProgress(migrationId, {
        current_phase: trackingRecord.currentPhase,
        current_step: trackingRecord.currentStep,
        progress_percentage: trackingRecord.progressPercentage,
        completed_phases: trackingRecord.completedPhases,
        completed_steps: trackingRecord.completedSteps
      });

      // Emit progress updated event
      this.emit('progress.updated', {
        migrationId,
        progress: trackingRecord,
        timestamp: new Date()
      });

      // Execute progress callbacks
      if (this.config.enableProgressCallbacks) {
        await this.executeProgressCallbacks(migrationId, trackingRecord);
      }

      return true;

    } catch (error) {
      this.logger.error('MigrationTracker: Failed to update progress', {
        migrationId,
        error: error.message
      });

      throw new Error(`Failed to update migration progress: ${error.message}`);
    }
  }

  /**
   * Update migration status
   * @param {string} migrationId - Migration ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional status data
   * @returns {Promise<boolean>} True if status updated successfully
   */
  async updateStatus(migrationId, status, additionalData = {}) {
    try {
      const trackingRecord = this.activeMigrations.get(migrationId);
      if (!trackingRecord) {
        throw new Error(`Migration ${migrationId} is not being tracked`);
      }

      const previousStatus = trackingRecord.status;
      trackingRecord.status = status;
      trackingRecord.lastStatusUpdate = new Date();

      // Update database
      await this.migrationRepository.updateMigrationStatus(migrationId, status, additionalData);

      // Emit status changed event
      this.emit('status.changed', {
        migrationId,
        previousStatus,
        newStatus: status,
        additionalData,
        timestamp: new Date()
      });

      // Handle status-specific actions
      await this.handleStatusChange(migrationId, status, additionalData);

      return true;

    } catch (error) {
      this.logger.error('MigrationTracker: Failed to update status', {
        migrationId,
        status,
        error: error.message
      });

      throw new Error(`Failed to update migration status: ${error.message}`);
    }
  }

  /**
   * Update phase progress
   * @param {string} migrationId - Migration ID
   * @param {string} phaseId - Phase ID
   * @param {string} status - Phase status
   * @param {Object} additionalData - Additional phase data
   * @returns {Promise<boolean>} True if phase updated successfully
   */
  async updatePhase(migrationId, phaseId, status, additionalData = {}) {
    try {
      const trackingRecord = this.activeMigrations.get(migrationId);
      if (!trackingRecord) {
        throw new Error(`Migration ${migrationId} is not being tracked`);
      }

      // Update tracking record
      if (status === 'running') {
        trackingRecord.currentPhase = phaseId;
      } else if (status === 'completed') {
        trackingRecord.completedPhases++;
        trackingRecord.currentPhase = null;
      }

      // Update database
      await this.migrationRepository.updateMigrationPhase(migrationId, phaseId, status, additionalData);

      // Update overall progress
      await this.updateProgress(migrationId, {
        completedPhases: trackingRecord.completedPhases,
        currentPhase: trackingRecord.currentPhase
      });

      // Emit phase updated event
      this.emit('phase.updated', {
        migrationId,
        phaseId,
        status,
        additionalData,
        timestamp: new Date()
      });

      return true;

    } catch (error) {
      this.logger.error('MigrationTracker: Failed to update phase', {
        migrationId,
        phaseId,
        status,
        error: error.message
      });

      throw new Error(`Failed to update phase: ${error.message}`);
    }
  }

  /**
   * Update step progress
   * @param {string} migrationId - Migration ID
   * @param {string} phaseId - Phase ID
   * @param {string} stepId - Step ID
   * @param {string} status - Step status
   * @param {Object} additionalData - Additional step data
   * @returns {Promise<boolean>} True if step updated successfully
   */
  async updateStep(migrationId, phaseId, stepId, status, additionalData = {}) {
    try {
      const trackingRecord = this.activeMigrations.get(migrationId);
      if (!trackingRecord) {
        throw new Error(`Migration ${migrationId} is not being tracked`);
      }

      // Update tracking record
      if (status === 'running') {
        trackingRecord.currentStep = stepId;
      } else if (status === 'completed') {
        trackingRecord.completedSteps++;
        trackingRecord.currentStep = null;
      }

      // Update database
      await this.migrationRepository.updateMigrationStep(migrationId, phaseId, stepId, status, additionalData);

      // Update overall progress
      await this.updateProgress(migrationId, {
        completedSteps: trackingRecord.completedSteps,
        currentStep: trackingRecord.currentStep
      });

      // Emit step updated event
      this.emit('step.updated', {
        migrationId,
        phaseId,
        stepId,
        status,
        additionalData,
        timestamp: new Date()
      });

      return true;

    } catch (error) {
      this.logger.error('MigrationTracker: Failed to update step', {
        migrationId,
        phaseId,
        stepId,
        status,
        error: error.message
      });

      throw new Error(`Failed to update step: ${error.message}`);
    }
  }

  /**
   * Record error
   * @param {string} migrationId - Migration ID
   * @param {Object} errorData - Error data
   * @returns {Promise<boolean>} True if error recorded successfully
   */
  async recordError(migrationId, errorData) {
    try {
      const trackingRecord = this.activeMigrations.get(migrationId);
      if (!trackingRecord) {
        throw new Error(`Migration ${migrationId} is not being tracked`);
      }

      // Add error to tracking record
      trackingRecord.errors.push({
        ...errorData,
        timestamp: new Date()
      });

      // Update database
      await this.migrationRepository.updateMigrationErrors(migrationId, trackingRecord.errors.length);

      // Emit error recorded event
      this.emit('error.recorded', {
        migrationId,
        error: errorData,
        timestamp: new Date()
      });

      return true;

    } catch (error) {
      this.logger.error('MigrationTracker: Failed to record error', {
        migrationId,
        error: error.message
      });

      throw new Error(`Failed to record error: ${error.message}`);
    }
  }

  /**
   * Record warning
   * @param {string} migrationId - Migration ID
   * @param {Object} warningData - Warning data
   * @returns {Promise<boolean>} True if warning recorded successfully
   */
  async recordWarning(migrationId, warningData) {
    try {
      const trackingRecord = this.activeMigrations.get(migrationId);
      if (!trackingRecord) {
        throw new Error(`Migration ${migrationId} is not being tracked`);
      }

      // Add warning to tracking record
      trackingRecord.warnings.push({
        ...warningData,
        timestamp: new Date()
      });

      // Update database
      await this.migrationRepository.updateMigrationWarnings(migrationId, trackingRecord.warnings.length);

      // Emit warning recorded event
      this.emit('warning.recorded', {
        migrationId,
        warning: warningData,
        timestamp: new Date()
      });

      return true;

    } catch (error) {
      this.logger.error('MigrationTracker: Failed to record warning', {
        migrationId,
        error: error.message
      });

      throw new Error(`Failed to record warning: ${error.message}`);
    }
  }

  /**
   * Get migration status
   * @param {string} migrationId - Migration ID
   * @returns {Promise<Object>} Migration status
   */
  async getMigrationStatus(migrationId) {
    try {
      // Check active migrations first
      const trackingRecord = this.activeMigrations.get(migrationId);
      if (trackingRecord) {
        return {
          migrationId,
          status: trackingRecord.status,
          progress: trackingRecord.progressPercentage,
          currentPhase: trackingRecord.currentPhase,
          currentStep: trackingRecord.currentStep,
          completedPhases: trackingRecord.completedPhases,
          completedSteps: trackingRecord.completedSteps,
          totalPhases: trackingRecord.totalPhases,
          totalSteps: trackingRecord.totalSteps,
          startTime: trackingRecord.startTime,
          lastUpdated: trackingRecord.lastUpdated,
          errors: trackingRecord.errors.length,
          warnings: trackingRecord.warnings.length,
          isActive: true
        };
      }

      // Get from database
      const migration = await this.migrationRepository.getMigrationById(migrationId);
      if (!migration) {
        throw new Error(`Migration ${migrationId} not found`);
      }

      return {
        migrationId,
        status: migration.status,
        progress: migration.progress_percentage,
        currentPhase: migration.current_phase,
        currentStep: migration.current_step,
        completedPhases: migration.completed_phases,
        completedSteps: migration.completed_steps,
        totalPhases: migration.total_phases,
        totalSteps: migration.total_steps,
        startTime: migration.start_time,
        endTime: migration.end_time,
        duration: migration.duration,
        errors: migration.error_count,
        warnings: migration.warning_count,
        isActive: false
      };

    } catch (error) {
      this.logger.error('MigrationTracker: Failed to get migration status', {
        migrationId,
        error: error.message
      });

      throw new Error(`Failed to get migration status: ${error.message}`);
    }
  }

  /**
   * Get all active migrations
   * @returns {Array} Active migrations
   */
  getActiveMigrations() {
    return Array.from(this.activeMigrations.values()).map(record => ({
      migrationId: record.migrationId,
      status: record.status,
      progress: record.progressPercentage,
      currentPhase: record.currentPhase,
      currentStep: record.currentStep,
      startTime: record.startTime,
      lastUpdated: record.lastUpdated
    }));
  }

  /**
   * Stop tracking a migration
   * @param {string} migrationId - Migration ID
   * @returns {Promise<boolean>} True if tracking stopped successfully
   */
  async stopTracking(migrationId) {
    try {
      const trackingRecord = this.activeMigrations.get(migrationId);
      if (!trackingRecord) {
        throw new Error(`Migration ${migrationId} is not being tracked`);
      }

      // Stop progress monitoring
      if (this.config.enableProgressCallbacks) {
        this.stopProgressMonitoring(migrationId);
      }

      // Move to history
      this.migrationHistory.set(migrationId, {
        ...trackingRecord,
        endTime: new Date()
      });

      // Remove from active migrations
      this.activeMigrations.delete(migrationId);

      // Clean up history if needed
      if (this.migrationHistory.size > this.config.maxHistorySize) {
        this.cleanupHistory();
      }

      // Emit tracking stopped event
      this.emit('tracking.stopped', {
        migrationId,
        trackingRecord,
        timestamp: new Date()
      });

      this.logger.info('MigrationTracker: Migration tracking stopped', {
        migrationId
      });

      return true;

    } catch (error) {
      this.logger.error('MigrationTracker: Failed to stop tracking', {
        migrationId,
        error: error.message
      });

      throw new Error(`Failed to stop migration tracking: ${error.message}`);
    }
  }

  /**
   * Register progress callback
   * @param {string} migrationId - Migration ID
   * @param {Function} callback - Progress callback function
   * @returns {boolean} True if callback registered successfully
   */
  registerProgressCallback(migrationId, callback) {
    if (!this.config.enableProgressCallbacks) {
      return false;
    }

    if (!this.progressCallbacks.has(migrationId)) {
      this.progressCallbacks.set(migrationId, []);
    }

    this.progressCallbacks.get(migrationId).push(callback);
    return true;
  }

  /**
   * Start progress monitoring
   * @param {string} migrationId - Migration ID
   */
  startProgressMonitoring(migrationId) {
    if (!this.config.enableProgressCallbacks) {
      return;
    }

    const interval = setInterval(async () => {
      const trackingRecord = this.activeMigrations.get(migrationId);
      if (!trackingRecord) {
        clearInterval(interval);
        return;
      }

      await this.executeProgressCallbacks(migrationId, trackingRecord);
    }, this.config.progressUpdateInterval);

    // Store interval reference for cleanup
    if (!this.progressIntervals) {
      this.progressIntervals = new Map();
    }
    this.progressIntervals.set(migrationId, interval);
  }

  /**
   * Stop progress monitoring
   * @param {string} migrationId - Migration ID
   */
  stopProgressMonitoring(migrationId) {
    if (this.progressIntervals && this.progressIntervals.has(migrationId)) {
      clearInterval(this.progressIntervals.get(migrationId));
      this.progressIntervals.delete(migrationId);
    }
  }

  /**
   * Execute progress callbacks
   * @param {string} migrationId - Migration ID
   * @param {Object} progressData - Progress data
   */
  async executeProgressCallbacks(migrationId, progressData) {
    const callbacks = this.progressCallbacks.get(migrationId) || [];
    
    for (const callback of callbacks) {
      try {
        await callback(progressData);
      } catch (error) {
        this.logger.error('MigrationTracker: Progress callback failed', {
          migrationId,
          error: error.message
        });
      }
    }
  }

  /**
   * Handle status change
   * @param {string} migrationId - Migration ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data
   */
  async handleStatusChange(migrationId, status, additionalData) {
    switch (status) {
      case 'completed':
      case 'failed':
      case 'rolled_back':
        await this.stopTracking(migrationId);
        break;
      case 'paused':
        this.stopProgressMonitoring(migrationId);
        break;
      case 'resumed':
        this.startProgressMonitoring(migrationId);
        break;
    }
  }

  /**
   * Cleanup history
   */
  cleanupHistory() {
    const entries = Array.from(this.migrationHistory.entries());
    const sortedEntries = entries.sort((a, b) => a[1].endTime - b[1].endTime);
    
    const toRemove = sortedEntries.slice(0, this.migrationHistory.size - this.config.maxHistorySize);
    
    for (const [migrationId] of toRemove) {
      this.migrationHistory.delete(migrationId);
    }
  }

  // Event handlers
  handleProgressUpdated(data) {
    this.logger.debug('MigrationTracker: Progress updated', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.progress.updated', data);
    }
  }

  handleStatusChanged(data) {
    this.logger.info('MigrationTracker: Status changed', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.status.changed', data);
    }
  }

  handlePhaseCompleted(data) {
    this.logger.debug('MigrationTracker: Phase completed', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.phase.completed', data);
    }
  }

  handleStepCompleted(data) {
    this.logger.debug('MigrationTracker: Step completed', data);
    if (this.eventBus) {
      this.eventBus.emit('migration.step.completed', data);
    }
  }
}

module.exports = MigrationTracker; 