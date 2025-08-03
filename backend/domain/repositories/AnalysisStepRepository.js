const AnalysisStep = require('../entities/AnalysisStep');
const ServiceLogger = require('@logging/ServiceLogger');

/**
 * AnalysisStepRepository - Database operations for analysis steps
 * Handles CRUD operations for individual analysis steps with WebSocket event emission
 */
class AnalysisStepRepository {
  constructor(databaseConnection, eventBus = null) {
    this.databaseConnection = databaseConnection;
    this.eventBus = eventBus;
    this.logger = new ServiceLogger('AnalysisStepRepository');
  }

  /**
   * Create a new analysis step
   * @param {string} projectId - Project ID
   * @param {string} analysisType - Analysis type
   * @param {Object} config - Step configuration
   * @returns {Promise<AnalysisStep>} Created analysis step
   */
  async createStep(projectId, analysisType, config = {}) {
    try {
      const step = AnalysisStep.create(projectId, analysisType, config);
      
      // Save to database
      const query = `
        INSERT INTO analysis_steps (
          id, project_id, analysis_type, status, progress, config, 
          timeout, max_retries, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        step.id,
        step.projectId,
        step.analysisType,
        step.status,
        step.progress,
        JSON.stringify(step.config),
        step.timeout,
        step.maxRetries,
        step.createdAt,
        step.updatedAt
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Created analysis step: ${step.id} for project: ${projectId}, type: ${analysisType}`);
      
      // Emit WebSocket event
      this.emitStepEvent('step:created', step);
      
      return step;
    } catch (error) {
      this.logger.error(`Failed to create analysis step:`, error);
      throw error;
    }
  }

  /**
   * Update step progress
   * @param {string} stepId - Step ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<AnalysisStep>} Updated analysis step
   */
  async updateProgress(stepId, progress, metadata = {}) {
    try {
      const step = await this.findById(stepId);
      if (!step) {
        throw new Error(`Analysis step not found: ${stepId}`);
      }
      
      step.updateProgress(progress, metadata);
      
      // Update database
      const query = `
        UPDATE analysis_steps 
        SET progress = ?, metadata = ?, updated_at = ?
        WHERE id = ?
      `;
      
      const params = [
        step.progress,
        JSON.stringify(step.metadata),
        step.updatedAt,
        step.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Updated progress for step: ${stepId} to ${progress}%`);
      
      // Emit WebSocket event
      this.emitStepEvent('step:progress', step);
      
      return step;
    } catch (error) {
      this.logger.error(`Failed to update step progress:`, error);
      throw error;
    }
  }

  /**
   * Mark step as started
   * @param {string} stepId - Step ID
   * @returns {Promise<AnalysisStep>} Updated analysis step
   */
  async startStep(stepId) {
    try {
      const step = await this.findById(stepId);
      if (!step) {
        throw new Error(`Analysis step not found: ${stepId}`);
      }
      
      step.start();
      
      // Update database
      const query = `
        UPDATE analysis_steps 
        SET status = ?, progress = ?, started_at = ?, updated_at = ?
        WHERE id = ?
      `;
      
      const params = [
        step.status,
        step.progress,
        step.startedAt,
        step.updatedAt,
        step.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Started analysis step: ${stepId}`);
      
      // Emit WebSocket event
      this.emitStepEvent('step:started', step);
      
      return step;
    } catch (error) {
      this.logger.error(`Failed to start step:`, error);
      throw error;
    }
  }

  /**
   * Complete step successfully
   * @param {string} stepId - Step ID
   * @param {Object} result - Analysis result
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<AnalysisStep>} Updated analysis step
   */
  async completeStep(stepId, result, metadata = {}) {
    try {
      const step = await this.findById(stepId);
      if (!step) {
        throw new Error(`Analysis step not found: ${stepId}`);
      }
      
      step.complete(result, metadata);
      
      // Update database
      const query = `
        UPDATE analysis_steps 
        SET status = ?, progress = ?, completed_at = ?, result = ?, 
            metadata = ?, execution_time = ?, updated_at = ?
        WHERE id = ?
      `;
      
      const params = [
        step.status,
        step.progress,
        step.completedAt,
        JSON.stringify(this._sanitizeForJSON(step.result)),
        JSON.stringify(this._sanitizeForJSON(step.metadata)),
        step.executionTime,
        step.updatedAt,
        step.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Completed analysis step: ${stepId}`);
      
      // Emit WebSocket event
      this.emitStepEvent('step:completed', step);
      
      return step;
    } catch (error) {
      this.logger.error(`Failed to complete step:`, error);
      throw error;
    }
  }

  /**
   * Mark step as failed
   * @param {string} stepId - Step ID
   * @param {Object} error - Error information
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<AnalysisStep>} Updated analysis step
   */
  async failStep(stepId, error, metadata = {}) {
    try {
      const step = await this.findById(stepId);
      if (!step) {
        throw new Error(`Analysis step not found: ${stepId}`);
      }
      
      step.fail(error, metadata);
      
      // Update database
      const query = `
        UPDATE analysis_steps 
        SET status = ?, completed_at = ?, error = ?, metadata = ?, 
            execution_time = ?, updated_at = ?
        WHERE id = ?
      `;
      
      const params = [
        step.status,
        step.completedAt,
        JSON.stringify(step.error),
        JSON.stringify(step.metadata),
        step.executionTime,
        step.updatedAt,
        step.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.error(`Failed analysis step: ${stepId}`, error);
      
      // Emit WebSocket event
      this.emitStepEvent('step:failed', step);
      
      return step;
    } catch (error) {
      this.logger.error(`Failed to mark step as failed:`, error);
      throw error;
    }
  }

  /**
   * Cancel step
   * @param {string} stepId - Step ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<AnalysisStep>} Updated analysis step
   */
  async cancelStep(stepId, reason = 'User cancelled') {
    try {
      const step = await this.findById(stepId);
      if (!step) {
        throw new Error(`Analysis step not found: ${stepId}`);
      }
      
      step.cancel(reason);
      
      // Update database
      const query = `
        UPDATE analysis_steps 
        SET status = ?, completed_at = ?, error = ?, updated_at = ?
        WHERE id = ?
      `;
      
      const params = [
        step.status,
        step.completedAt,
        JSON.stringify(step.error),
        step.updatedAt,
        step.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Cancelled analysis step: ${stepId}`);
      
      // Emit WebSocket event
      this.emitStepEvent('step:cancelled', step);
      
      return step;
    } catch (error) {
      this.logger.error(`Failed to cancel step:`, error);
      throw error;
    }
  }

  /**
   * Find step by ID
   * @param {string} stepId - Step ID
   * @returns {Promise<AnalysisStep|null>} Analysis step or null
   */
  async findById(stepId) {
    try {
      const query = `
        SELECT * FROM analysis_steps 
        WHERE id = ?
      `;
      
      const rows = await this.databaseConnection.query(query, [stepId]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return this.mapRowToStep(rows[0]);
    } catch (error) {
      this.logger.error(`Failed to find step by ID:`, error);
      throw error;
    }
  }

  /**
   * Find all steps for a project
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<AnalysisStep[]>} Array of analysis steps
   */
  async findByProjectId(projectId, options = {}) {
    try {
      const { limit = 100, offset = 0, status = null, analysisType = null } = options;
      
      let query = `
        SELECT * FROM analysis_steps 
        WHERE project_id = ?
      `;
      
      const params = [projectId];
      
      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }
      
      if (analysisType) {
        query += ` AND analysis_type = ?`;
        params.push(analysisType);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      const rows = await this.databaseConnection.query(query, params);
      
      return rows.map(row => this.mapRowToStep(row));
    } catch (error) {
      this.logger.error(`Failed to find steps by project ID:`, error);
      throw error;
    }
  }

  /**
   * Find active steps for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<AnalysisStep[]>} Array of active analysis steps
   */
  async findActiveSteps(projectId) {
    try {
      const query = `
        SELECT * FROM analysis_steps 
        WHERE project_id = ? AND status IN ('pending', 'running')
        ORDER BY created_at ASC
      `;
      
      const rows = await this.databaseConnection.query(query, [projectId]);
      
      return rows.map(row => this.mapRowToStep(row));
    } catch (error) {
      this.logger.error(`Failed to find active steps:`, error);
      throw error;
    }
  }

  /**
   * Find latest completed step for a project and analysis type
   * @param {string} projectId - Project ID
   * @param {string} analysisType - Analysis type
   * @returns {Promise<AnalysisStep|null>} Latest completed step or null
   */
  async findLatestCompleted(projectId, analysisType) {
    try {
      const query = `
        SELECT * FROM analysis_steps 
        WHERE project_id = ? AND analysis_type = ? AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 1
      `;
      
      const rows = await this.databaseConnection.query(query, [projectId, analysisType]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return this.mapRowToStep(rows[0]);
    } catch (error) {
      this.logger.error(`Failed to find latest completed step:`, error);
      throw error;
    }
  }

  /**
   * Get step statistics for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Step statistics
   */
  async getStepStats(projectId) {
    try {
      const query = `
        SELECT 
          analysis_type,
          status,
          COUNT(*) as count,
          AVG(execution_time) as avg_execution_time,
          AVG(progress) as avg_progress
        FROM analysis_steps 
        WHERE project_id = ?
        GROUP BY analysis_type, status
      `;
      
      const rows = await this.databaseConnection.query(query, [projectId]);
      
      const stats = {
        total: 0,
        byType: {},
        byStatus: {
          pending: 0,
          running: 0,
          completed: 0,
          failed: 0,
          cancelled: 0
        }
      };
      
      rows.forEach(row => {
        stats.total += row.count;
        stats.byStatus[row.status] += row.count;
        
        if (!stats.byType[row.analysis_type]) {
          stats.byType[row.analysis_type] = {
            total: 0,
            completed: 0,
            failed: 0,
            avg_execution_time: 0
          };
        }
        
        stats.byType[row.analysis_type].total += row.count;
        if (row.status === 'completed') {
          stats.byType[row.analysis_type].completed += row.count;
        } else if (row.status === 'failed') {
          stats.byType[row.analysis_type].failed += row.count;
        }
        
        if (row.avg_execution_time) {
          stats.byType[row.analysis_type].avg_execution_time = row.avg_execution_time;
        }
      });
      
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get step stats:`, error);
      throw error;
    }
  }

  /**
   * Clean up old completed steps
   * @param {number} daysToKeep - Number of days to keep completed steps
   * @returns {Promise<number>} Number of deleted steps
   */
  async cleanupOldSteps(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const query = `
        DELETE FROM analysis_steps 
        WHERE status = 'completed' AND completed_at < ?
      `;
      
      const result = await this.databaseConnection.execute(query, [cutoffDate]);
      
      this.logger.info(`Cleaned up ${result.affectedRows} old completed steps`);
      
      return result.affectedRows;
    } catch (error) {
      this.logger.error(`Failed to cleanup old steps:`, error);
      throw error;
    }
  }

  /**
   * Map database row to AnalysisStep object
   * @param {Object} row - Database row
   * @returns {AnalysisStep} AnalysisStep instance
   */
  mapRowToStep(row) {
    return new AnalysisStep({
      id: row.id,
      projectId: row.project_id,
      analysisType: row.analysis_type,
      status: row.status,
      progress: row.progress,
      startedAt: row.started_at ? new Date(row.started_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      error: row.error ? JSON.parse(row.error) : null,
      result: row.result ? JSON.parse(row.result) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      config: row.config ? JSON.parse(row.config) : {},
      timeout: row.timeout,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      memoryUsage: row.memory_usage,
      executionTime: row.execution_time,
      fileCount: row.file_count,
      lineCount: row.line_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }

  /**
   * Emit WebSocket event for step changes
   * @param {string} eventType - Event type
   * @param {AnalysisStep} step - Analysis step
   */
  emitStepEvent(eventType, step) {
    if (this.eventBus) {
      this.eventBus.emit(eventType, {
        stepId: step.id,
        projectId: step.projectId,
        analysisType: step.analysisType,
        status: step.status,
        progress: step.progress,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Sanitize object for JSON serialization by removing circular references
   * @param {any} obj - Object to sanitize
   * @returns {any} Sanitized object
   */
  _sanitizeForJSON(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj !== 'object') {
      return obj;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this._sanitizeForJSON(item));
    }
    
    // Handle objects
    const sanitized = {};
    const seen = new WeakSet();
    
    const sanitize = (obj) => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      
      // Check for circular references
      if (seen.has(obj)) {
        return '[Circular Reference]';
      }
      
      // Skip Node.js internal objects that cause circular references
      if (obj.constructor && (
        obj.constructor.name === 'Timeout' ||
        obj.constructor.name === 'TimersList' ||
        obj.constructor.name === 'EventEmitter' ||
        obj.constructor.name === 'Stream' ||
        obj.constructor.name === 'Buffer'
      )) {
        return `[${obj.constructor.name}]`;
      }
      
      seen.add(obj);
      
      if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item));
      }
      
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        try {
          result[key] = sanitize(value);
        } catch (error) {
          result[key] = '[Error serializing]';
        }
      }
      
      return result;
    };
    
    return sanitize(obj);
  }
}

module.exports = AnalysisStepRepository; 