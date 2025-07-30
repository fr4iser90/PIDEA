/**
 * CpuAnalysisService - Application Layer
 * Specialized service for CPU performance analysis orchestration
 */

const Logger = require('@logging/Logger');
const { CpuAnalysisStep } = require('@domain/steps/categories/analysis/performance');

class CpuAnalysisService {
  constructor() {
    this.logger = new Logger('CpuAnalysisService');
    this.cpuStep = new CpuAnalysisStep();
  }

  /**
   * Execute CPU performance analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - CPU analysis configuration
   * @returns {Promise<Object>} CPU analysis results
   */
  async executeCpuAnalysis(params) {
    try {
      this.logger.info('Starting CPU performance analysis', { projectId: params.projectId });

      const result = await this.cpuStep.execute(params);

      this.logger.info('CPU analysis completed', { 
        projectId: params.projectId,
        issuesFound: result.issues?.length || 0,
        cpuUsage: result.metrics?.cpuUsage || 0
      });

      return result;

    } catch (error) {
      this.logger.error('CPU analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get CPU analysis configuration
   * @returns {Object} CPU analysis configuration
   */
  getConfiguration() {
    return {
      name: 'CPU Performance Analyzer',
      version: '1.0.0',
      description: 'CPU performance patterns and code optimization analysis',
      metrics: ['cpu-usage', 'execution-time', 'complexity', 'bottlenecks'],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = CpuAnalysisService; 