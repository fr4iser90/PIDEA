/**
 * DatabaseAnalysisService - Application Layer
 * Specialized service for database performance analysis orchestration
 */

const Logger = require('@logging/Logger');
const { DatabaseAnalysisStep } = require('@domain/steps/categories/analysis/performance');

class DatabaseAnalysisService {
  constructor() {
    this.logger = new Logger('DatabaseAnalysisService');
    this.databaseStep = new DatabaseAnalysisStep();
  }

  /**
   * Execute database performance analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Database analysis configuration
   * @returns {Promise<Object>} Database analysis results
   */
  async executeDatabaseAnalysis(params) {
    try {
      this.logger.info('Starting database performance analysis', { projectId: params.projectId });

      const result = await this.databaseStep.execute(params);

      this.logger.info('Database analysis completed', { 
        projectId: params.projectId,
        issuesFound: result.issues?.length || 0,
        databaseQueries: result.metrics?.databaseQueries || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Database analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get database analysis configuration
   * @returns {Object} Database analysis configuration
   */
  getConfiguration() {
    return {
      name: 'Database Performance Analyzer',
      version: '1.0.0',
      description: 'Database performance and query optimization analysis',
      metrics: ['query-time', 'connection-pool', 'indexes', 'slow-queries'],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = DatabaseAnalysisService; 