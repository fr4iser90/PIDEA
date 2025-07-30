/**
 * MemoryAnalysisService - Application Layer
 * Specialized service for memory usage analysis orchestration
 */

const Logger = require('@logging/Logger');
const { MemoryAnalysisStep } = require('@domain/steps/categories/analysis/performance');

class MemoryAnalysisService {
  constructor() {
    this.logger = new Logger('MemoryAnalysisService');
    this.memoryStep = new MemoryAnalysisStep();
  }

  /**
   * Execute memory usage analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Memory analysis configuration
   * @returns {Promise<Object>} Memory analysis results
   */
  async executeMemoryAnalysis(params) {
    try {
      this.logger.info('Starting memory usage analysis', { projectId: params.projectId });

      const result = await this.memoryStep.execute(params);

      this.logger.info('Memory analysis completed', { 
        projectId: params.projectId,
        issuesFound: result.issues?.length || 0,
        memoryUsage: result.metrics?.memoryUsage || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Memory analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get memory analysis configuration
   * @returns {Object} Memory analysis configuration
   */
  getConfiguration() {
    return {
      name: 'Memory Usage Analyzer',
      version: '1.0.0',
      description: 'Memory usage patterns and optimization analysis',
      metrics: ['heap-usage', 'garbage-collection', 'memory-leaks', 'bundle-size'],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = MemoryAnalysisService; 