/**
 * NetworkAnalysisService - Application Layer
 * Specialized service for network performance analysis orchestration
 */

const Logger = require('@logging/Logger');
const { NetworkAnalysisStep } = require('@domain/steps/categories/analysis/performance');

class NetworkAnalysisService {
  constructor() {
    this.logger = new Logger('NetworkAnalysisService');
    this.networkStep = new NetworkAnalysisStep();
  }

  /**
   * Execute network performance analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Network analysis configuration
   * @returns {Promise<Object>} Network analysis results
   */
  async executeNetworkAnalysis(params) {
    try {
      this.logger.info('Starting network performance analysis', { projectId: params.projectId });

      const result = await this.networkStep.execute(params);

      this.logger.info('Network analysis completed', { 
        projectId: params.projectId,
        issuesFound: result.issues?.length || 0,
        networkLatency: result.metrics?.networkLatency || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Network analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get network analysis configuration
   * @returns {Object} Network analysis configuration
   */
  getConfiguration() {
    return {
      name: 'Network Performance Analyzer',
      version: '1.0.0',
      description: 'Network performance and build configuration analysis',
      metrics: ['latency', 'bandwidth', 'requests', 'response-time'],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = NetworkAnalysisService; 