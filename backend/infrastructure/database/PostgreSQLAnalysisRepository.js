/**
 * PostgreSQLAnalysisRepository - PostgreSQL implementation for unified analysis table
 * Replaces the old PostgreSQLProjectAnalysisRepository that worked with project_analysis table
 * Handles CRUD operations for unified analysis table with WebSocket event emission
 */
const Analysis = require('@entities/Analysis');
const ServiceLogger = require('@logging/ServiceLogger');

class PostgreSQLAnalysisRepository {
  constructor(databaseConnection, eventBus = null) {
    this.databaseConnection = databaseConnection;
    this.eventBus = eventBus;
    this.logger = new ServiceLogger('PostgreSQLAnalysisRepository');
    this.tableName = 'analysis';
  }

  /**
   * Create a new analysis
   * @param {string} projectId - Project ID
   * @param {string} analysisType - Analysis type
   * @param {Object} config - Analysis configuration
   * @returns {Promise<Analysis>} Created analysis
   */
  async create(projectId, analysisType, config = {}) {
    try {
      const analysis = Analysis.create(projectId, analysisType, config);
      
      // Save to database
      const query = `
        INSERT INTO ${this.tableName} (
          id, project_id, analysis_type, status, progress, config, 
          timeout, max_retries, overall_score, critical_issues_count, 
          warnings_count, recommendations_count, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;
      
      const params = [
        analysis.id,
        analysis.projectId,
        analysis.analysisType,
        analysis.status,
        analysis.progress,
        JSON.stringify(analysis.config),
        analysis.timeout,
        analysis.maxRetries,
        analysis.overallScore,
        analysis.criticalIssuesCount,
        analysis.warningsCount,
        analysis.recommendationsCount,
        analysis.createdAt,
        analysis.updatedAt
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Created analysis: ${analysis.id} for project: ${projectId}, type: ${analysisType}`);
      
      // Emit WebSocket event
      this.emitAnalysisEvent('analysis:created', analysis);
      
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to create analysis:`, error);
      throw error;
    }
  }

  /**
   * Save analysis (create or update, prefer update of pending/running for project/type)
   * @param {Analysis} analysis - Analysis entity
   * @returns {Promise<Analysis>} Saved analysis
   */
  async save(analysis) {
    try {
      // Suche nach bestehendem 'pending' oder 'running' Eintrag für Projekt+Typ
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE project_id = $1 AND analysis_type = $2 AND status IN ('pending', 'running')
        ORDER BY created_at ASC LIMIT 1
      `;
      const rows = await this.databaseConnection.query(query, [analysis.projectId, analysis.analysisType]);
      let existing = null;
      if (rows.length > 0) {
        existing = this.mapRowToAnalysis(rows[0]);
      } else {
        // Fallback: Suche nach ID (z.B. falls explizit gespeichert wird)
        existing = await this.findById(analysis.id);
      }

      if (existing) {
        // Update bestehenden Eintrag mit Ergebnis und Status 'completed'
        existing.status = 'completed';
        existing.progress = 100;
        existing.completedAt = new Date();
        existing.result = analysis.result;
        existing.metadata = { ...existing.metadata, ...analysis.metadata };
        existing.executionTime = analysis.executionTime || null;
        existing.overallScore = analysis.overallScore || null;
        existing.criticalIssuesCount = analysis.criticalIssuesCount || null;
        existing.warningsCount = analysis.warningsCount || null;
        existing.recommendationsCount = analysis.recommendationsCount || null;
        existing.updatedAt = new Date();
        return await this.update(existing);
      } else {
        // Neuer Eintrag mit Ergebnis
        const newAnalysis = await this.create(analysis.projectId, analysis.analysisType, analysis.config);
        
        // Wenn ein Ergebnis vorhanden ist, direkt als completed speichern
        if (analysis.result) {
          newAnalysis.status = 'completed';
          newAnalysis.progress = 100;
          newAnalysis.completedAt = new Date();
          newAnalysis.result = analysis.result;
          newAnalysis.metadata = { ...newAnalysis.metadata, ...analysis.metadata };
          newAnalysis.updatedAt = new Date();
          return await this.update(newAnalysis);
        }
        
        return newAnalysis;
      }
    } catch (error) {
      this.logger.error(`Failed to save analysis:`, error);
      throw error;
    }
  }

  /**
   * Update analysis progress
   * @param {string} analysisId - Analysis ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Analysis>} Updated analysis
   */
  async updateProgress(analysisId, progress, metadata = {}) {
    try {
      const analysis = await this.findById(analysisId);
      if (!analysis) {
        throw new Error(`Analysis not found: ${analysisId}`);
      }
      
      analysis.updateProgress(progress, metadata);
      
      // Update database
      const query = `
        UPDATE ${this.tableName} 
        SET progress = $1, metadata = $2, updated_at = $3
        WHERE id = $4
      `;
      
      const params = [
        analysis.progress,
        JSON.stringify(analysis.metadata),
        analysis.updatedAt,
        analysis.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Updated progress for analysis: ${analysisId} to ${progress}%`);
      
      // Emit WebSocket event
      this.emitAnalysisEvent('analysis:progress', analysis);
      
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to update analysis progress:`, error);
      throw error;
    }
  }

  /**
   * Start analysis
   * @param {string} analysisId - Analysis ID
   * @returns {Promise<Analysis>} Updated analysis
   */
  async start(analysisId) {
    try {
      const analysis = await this.findById(analysisId);
      if (!analysis) {
        throw new Error(`Analysis not found: ${analysisId}`);
      }
      
      analysis.start();
      
      // Update database
      const query = `
        UPDATE ${this.tableName} 
        SET status = $1, progress = $2, started_at = $3, updated_at = $4
        WHERE id = $5
      `;
      
      const params = [
        analysis.status,
        analysis.progress,
        analysis.startedAt,
        analysis.updatedAt,
        analysis.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Started analysis: ${analysisId}`);
      
      // Emit WebSocket event
      this.emitAnalysisEvent('analysis:started', analysis);
      
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to start analysis:`, error);
      throw error;
    }
  }

  /**
   * Complete analysis successfully
   * @param {string} analysisId - Analysis ID
   * @param {Object} result - Analysis result
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Analysis>} Updated analysis
   */
  async complete(analysisId, result, metadata = {}) {
    try {
      const analysis = await this.findById(analysisId);
      if (!analysis) {
        throw new Error(`Analysis not found: ${analysisId}`);
      }
      
      analysis.complete(result, metadata);
      
      // Update database
      const query = `
        UPDATE ${this.tableName} 
        SET status = $1, progress = $2, completed_at = $3, result = $4, 
            metadata = $5, execution_time = $6, overall_score = $7,
            critical_issues_count = $8, warnings_count = $9, 
            recommendations_count = $10, updated_at = $11
        WHERE id = $12
      `;
      
      const params = [
        analysis.status,
        analysis.progress,
        analysis.completedAt,
        JSON.stringify(analysis.result),
        JSON.stringify(analysis.metadata),
        analysis.executionTime,
        analysis.overallScore,
        analysis.criticalIssuesCount,
        analysis.warningsCount,
        analysis.recommendationsCount,
        analysis.updatedAt,
        analysis.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Completed analysis: ${analysisId}`);
      
      // Emit WebSocket event
      this.emitAnalysisEvent('analysis:completed', analysis);
      
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to complete analysis:`, error);
      throw error;
    }
  }

  /**
   * Mark analysis as failed
   * @param {string} analysisId - Analysis ID
   * @param {Object} error - Error information
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Analysis>} Updated analysis
   */
  async fail(analysisId, error, metadata = {}) {
    try {
      const analysis = await this.findById(analysisId);
      if (!analysis) {
        throw new Error(`Analysis not found: ${analysisId}`);
      }
      
      analysis.fail(error, metadata);
      
      // Update database
      const query = `
        UPDATE ${this.tableName} 
        SET status = $1, completed_at = $2, error = $3, metadata = $4, 
            execution_time = $5, updated_at = $6
        WHERE id = $7
      `;
      
      const params = [
        analysis.status,
        analysis.completedAt,
        JSON.stringify(analysis.error),
        JSON.stringify(analysis.metadata),
        analysis.executionTime,
        analysis.updatedAt,
        analysis.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.error(`Failed analysis: ${analysisId}`, error);
      
      // Emit WebSocket event
      this.emitAnalysisEvent('analysis:failed', analysis);
      
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to mark analysis as failed:`, error);
      throw error;
    }
  }

  /**
   * Cancel analysis
   * @param {string} analysisId - Analysis ID
   * @returns {Promise<Analysis>} Updated analysis
   */
  async cancel(analysisId) {
    try {
      const analysis = await this.findById(analysisId);
      if (!analysis) {
        throw new Error(`Analysis not found: ${analysisId}`);
      }
      
      analysis.cancel();
      
      // Update database
      const query = `
        UPDATE ${this.tableName} 
        SET status = $1, completed_at = $2, updated_at = $3
        WHERE id = $4
      `;
      
      const params = [
        analysis.status,
        analysis.completedAt,
        analysis.updatedAt,
        analysis.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Cancelled analysis: ${analysisId}`);
      
      // Emit WebSocket event
      this.emitAnalysisEvent('analysis:cancelled', analysis);
      
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to cancel analysis:`, error);
      throw error;
    }
  }

  /**
   * Retry analysis
   * @param {string} analysisId - Analysis ID
   * @returns {Promise<Analysis>} Updated analysis
   */
  async retry(analysisId) {
    try {
      const analysis = await this.findById(analysisId);
      if (!analysis) {
        throw new Error(`Analysis not found: ${analysisId}`);
      }
      
      if (!analysis.retry()) {
        throw new Error(`Analysis cannot be retried: ${analysisId}`);
      }
      
      // Update database
      const query = `
        UPDATE ${this.tableName} 
        SET status = $1, progress = $2, retry_count = $3, started_at = $4, 
            completed_at = $5, error = $6, updated_at = $7
        WHERE id = $8
      `;
      
      const params = [
        analysis.status,
        analysis.progress,
        analysis.retryCount,
        analysis.startedAt,
        analysis.completedAt,
        analysis.error,
        analysis.updatedAt,
        analysis.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Retried analysis: ${analysisId} (attempt ${analysis.retryCount})`);
      
      // Emit WebSocket event
      this.emitAnalysisEvent('analysis:retried', analysis);
      
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to retry analysis:`, error);
      throw error;
    }
  }

  /**
   * Update analysis
   * @param {Analysis} analysis - Analysis entity
   * @returns {Promise<Analysis>} Updated analysis
   */
  async update(analysis) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET project_id = $1, analysis_type = $2, status = $3, progress = $4,
            started_at = $5, completed_at = $6, error = $7, result = $8,
            metadata = $9, config = $10, timeout = $11, retry_count = $12,
            max_retries = $13, memory_usage = $14, execution_time = $15,
            file_count = $16, line_count = $17, overall_score = $18,
            critical_issues_count = $19, warnings_count = $20,
            recommendations_count = $21, updated_at = $22
        WHERE id = $23
      `;
      
      const params = [
        analysis.projectId,
        analysis.analysisType,
        analysis.status,
        analysis.progress,
        analysis.startedAt,
        analysis.completedAt,
        analysis.error ? JSON.stringify(this._sanitizeForJSON(analysis.error)) : null,
        analysis.result ? JSON.stringify(this._sanitizeForJSON(analysis.result)) : null,
        JSON.stringify(this._sanitizeForJSON(analysis.metadata)),
        JSON.stringify(analysis.config),
        analysis.timeout,
        analysis.retryCount,
        analysis.maxRetries,
        analysis.memoryUsage,
        analysis.executionTime,
        analysis.fileCount,
        analysis.lineCount,
        analysis.overallScore,
        analysis.criticalIssuesCount,
        analysis.warningsCount,
        analysis.recommendationsCount,
        analysis.updatedAt,
        analysis.id
      ];
      
      await this.databaseConnection.execute(query, params);
      
      this.logger.info(`Updated analysis: ${analysis.id}`);
      
      // Emit WebSocket event
      this.emitAnalysisEvent('analysis:updated', analysis);
      
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to update analysis:`, error);
      throw error;
    }
  }

  /**
   * Find analysis by ID
   * @param {string} analysisId - Analysis ID
   * @returns {Promise<Analysis|null>} Analysis or null
   */
  async findById(analysisId) {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE id = $1
      `;
      
      const rows = await this.databaseConnection.query(query, [analysisId]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return this.mapRowToAnalysis(rows[0]);
    } catch (error) {
      this.logger.error(`Failed to find analysis by ID:`, error);
      throw error;
    }
  }

  /**
   * Find all analyses for a project
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Analysis[]>} Array of analyses
   */
  async findByProjectId(projectId, options = {}) {
    try {
      const { limit = 100, offset = 0, status = null, analysisType = null } = options;
      
      let query = `
        SELECT * FROM ${this.tableName} 
        WHERE project_id = $1
      `;
      
      const params = [projectId];
      let paramIndex = 2;
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (analysisType) {
        query += ` AND analysis_type = $${paramIndex}`;
        params.push(analysisType);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const rows = await this.databaseConnection.query(query, params);
      
      return rows.map(row => this.mapRowToAnalysis(row));
    } catch (error) {
      this.logger.error(`Failed to find analyses by project ID:`, error);
      throw error;
    }
  }

  /**
   * Find active analyses for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Analysis[]>} Array of active analyses
   */
  async findActive(projectId) {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE project_id = $1 AND status IN ('pending', 'running')
        ORDER BY created_at ASC
      `;
      
      const rows = await this.databaseConnection.query(query, [projectId]);
      
      return rows.map(row => this.mapRowToAnalysis(row));
    } catch (error) {
      this.logger.error(`Failed to find active analyses:`, error);
      throw error;
    }
  }

  /**
   * Find latest analysis for a project (any type)
   * @param {string} projectId - Project ID
   * @returns {Promise<Analysis|null>} Latest analysis or null
   */
  async findLatestByProjectId(projectId) {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE project_id = $1
        ORDER BY created_at DESC LIMIT 1
      `;
      
      const rows = await this.databaseConnection.query(query, [projectId]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return this.mapRowToAnalysis(rows[0]);
    } catch (error) {
      this.logger.error(`Failed to find latest analysis by project ID:`, error);
      throw error;
    }
  }

  /**
   * Find latest completed analysis for a project and analysis type
   * @param {string} projectId - Project ID
   * @param {string} analysisType - Analysis type
   * @returns {Promise<Analysis|null>} Latest completed analysis or null
   */
  async findLatestCompleted(projectId, analysisType) {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE project_id = $1 AND analysis_type = $2 AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 1
      `;
      
      const rows = await this.databaseConnection.query(query, [projectId, analysisType]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return this.mapRowToAnalysis(rows[0]);
    } catch (error) {
      this.logger.error(`Failed to find latest completed analysis:`, error);
      throw error;
    }
  }

  /**
   * Find latest analysis by type for a project
   * @param {string} projectId - Project ID
   * @param {string} analysisType - Analysis type
   * @returns {Promise<Analysis|null>} Latest analysis of specified type
   */
  async findLatestByType(projectId, analysisType) {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE project_id = $1 AND analysis_type = $2
        ORDER BY created_at DESC LIMIT 1
      `;
      
      const rows = await this.databaseConnection.query(query, [projectId, analysisType]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return this.mapRowToAnalysis(rows[0]);
    } catch (error) {
      this.logger.error(`Failed to find latest analysis by type:`, error);
      throw error;
    }
  }

  /**
   * Find analyses by type
   * @param {string} analysisType - Analysis type
   * @param {Object} options - Query options
   * @returns {Promise<Analysis[]>} Array of analyses
   */
  async findByType(analysisType, options = {}) {
    try {
      const { limit = 100, offset = 0, status = null } = options;
      
      let query = `
        SELECT * FROM ${this.tableName} 
        WHERE analysis_type = $1
      `;
      
      const params = [analysisType];
      let paramIndex = 2;
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const rows = await this.databaseConnection.query(query, params);
      
      return rows.map(row => this.mapRowToAnalysis(row));
    } catch (error) {
      this.logger.error(`Failed to find analyses by type:`, error);
      throw error;
    }
  }

  /**
   * Get analysis statistics for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Analysis statistics
   */
  async getStats(projectId) {
    try {
      const query = `
        SELECT 
          analysis_type,
          status,
          COUNT(*) as count,
          AVG(execution_time) as avg_execution_time,
          AVG(progress) as avg_progress,
          AVG(overall_score) as avg_score
        FROM ${this.tableName} 
        WHERE project_id = $1
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
        stats.total += parseInt(row.count);
        stats.byStatus[row.status] += parseInt(row.count);
        
        if (!stats.byType[row.analysis_type]) {
          stats.byType[row.analysis_type] = {
            total: 0,
            completed: 0,
            failed: 0,
            avg_execution_time: 0,
            avg_score: 0
          };
        }
        
        stats.byType[row.analysis_type].total += parseInt(row.count);
        if (row.status === 'completed') {
          stats.byType[row.analysis_type].completed += parseInt(row.count);
        } else if (row.status === 'failed') {
          stats.byType[row.analysis_type].failed += parseInt(row.count);
        }
        
        if (row.avg_execution_time) {
          stats.byType[row.analysis_type].avg_execution_time = parseFloat(row.avg_execution_time);
        }
        
        if (row.avg_score) {
          stats.byType[row.analysis_type].avg_score = parseFloat(row.avg_score);
        }
      });
      
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get analysis stats:`, error);
      throw error;
    }
  }

  /**
   * Delete analysis by ID
   * @param {string} analysisId - Analysis ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteById(analysisId) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
      const result = await this.databaseConnection.execute(query, [analysisId]);
      
      this.logger.info(`Deleted analysis: ${analysisId}`);
      
      // Emit WebSocket event
      this.emitAnalysisEvent('analysis:deleted', { id: analysisId });
      
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error(`Failed to delete analysis:`, error);
      throw error;
    }
  }

  /**
   * Delete all analyses for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<number>} Number of deleted analyses
   */
  async deleteByProjectId(projectId) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE project_id = $1`;
      const result = await this.databaseConnection.execute(query, [projectId]);
      
      this.logger.info(`Deleted ${result.rowCount} analyses for project: ${projectId}`);
      
      // Emit WebSocket event
      this.emitAnalysisEvent('analysis:deleted', { projectId, count: result.rowCount });
      
      return result.rowCount;
    } catch (error) {
      this.logger.error(`Failed to delete analyses by project ID:`, error);
      throw error;
    }
  }

  /**
   * Get all analyses
   * @param {Object} options - Query options
   * @returns {Promise<Analysis[]>} Array of all analyses
   */
  async findAll(options = {}) {
    try {
      const { limit = 1000, offset = 0, status = null, analysisType = null } = options;
      
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      let paramIndex = 1;
      
      const conditions = [];
      
      if (status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
      
      if (analysisType) {
        conditions.push(`analysis_type = $${paramIndex}`);
        params.push(analysisType);
        paramIndex++;
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const rows = await this.databaseConnection.query(query, params);
      
      return rows.map(row => this.mapRowToAnalysis(row));
    } catch (error) {
      this.logger.error(`Failed to find all analyses:`, error);
      throw error;
    }
  }

  /**
   * Map database row to Analysis object
   * @param {Object} row - Database row
   * @returns {Analysis} Analysis instance
   */
  mapRowToAnalysis(row) {
    return Analysis.fromJSON({
      id: row.id,
      project_id: row.project_id,
      analysis_type: row.analysis_type,
      status: row.status,
      progress: row.progress,
      started_at: row.started_at,
      completed_at: row.completed_at,
      error: row.error ? JSON.parse(row.error) : null,
      result: row.result ? JSON.parse(row.result) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      config: row.config ? JSON.parse(row.config) : {},
      timeout: row.timeout,
      retry_count: row.retry_count,
      max_retries: row.max_retries,
      memory_usage: row.memory_usage,
      execution_time: row.execution_time,
      file_count: row.file_count,
      line_count: row.line_count,
      overall_score: row.overall_score,
      critical_issues_count: row.critical_issues_count,
      warnings_count: row.warnings_count,
      recommendations_count: row.recommendations_count,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  /**
   * Emit WebSocket event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitAnalysisEvent(event, data) {
    if (this.eventBus) {
      this.eventBus.emit(event, data);
    }
  }

  // Additional methods for AnalysisApplicationService compatibility

  /**
   * Get latest analysis for project
   * @param {string} projectId - Project ID
   * @param {Array} types - Analysis types filter
   * @returns {Promise<Analysis|null>} Latest analysis
   */
  async getLatestAnalysis(projectId, types = null) {
    try {
      if (types && types.length > 0) {
        // Get latest analysis of specific types
        const query = `
          SELECT * FROM ${this.tableName} 
          WHERE project_id = $1 AND analysis_type = ANY($2)
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        const params = [projectId, types];
        const rows = await this.databaseConnection.query(query, params);
        return rows.length > 0 ? this.mapRowToAnalysis(rows[0]) : null;
      } else {
        // Get latest analysis of any type
        const query = `
          SELECT * FROM ${this.tableName} 
          WHERE project_id = $1
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        const rows = await this.databaseConnection.query(query, [projectId]);
        return rows.length > 0 ? this.mapRowToAnalysis(rows[0]) : null;
      }
    } catch (error) {
      this.logger.error(`Failed to get latest analysis for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get analysis history for project
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Analysis history
   */
  async getAnalysisHistory(projectId, options = {}) {
    try {
      const { limit = 10, offset = 0, types } = options;
      
      let query = `SELECT * FROM ${this.tableName} WHERE project_id = $1`;
      const params = [projectId];
      let paramIndex = 2;
      
      if (types && types.length > 0) {
        query += ` AND analysis_type = ANY($${paramIndex})`;
        params.push(types);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const rows = await this.databaseConnection.query(query, params);
      
      return rows.map(row => this.mapRowToAnalysis(row));
    } catch (error) {
      this.logger.error(`Failed to get analysis history for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get cached analysis (placeholder - no caching implemented yet)
   * @param {string} projectId - Project ID
   * @param {Array} types - Analysis types
   * @returns {Promise<Analysis|null>} Cached analysis or null
   */
  async getCachedAnalysis(projectId, types) {
    // TODO: Implement caching logic
    this.logger.info(`Cache not implemented yet, getting latest analysis for project ${projectId}`);
    return await this.getLatestAnalysis(projectId, types);
  }

  /**
   * Cache analysis (placeholder - no caching implemented yet)
   * @param {string} projectId - Project ID
   * @param {Array} types - Analysis types
   * @param {Analysis} analysis - Analysis to cache
   * @returns {Promise<void>}
   */
  async cacheAnalysis(projectId, types, analysis) {
    // TODO: Implement caching logic
    this.logger.info(`Cache not implemented yet, skipping cache for project ${projectId}`);
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

module.exports = PostgreSQLAnalysisRepository; 