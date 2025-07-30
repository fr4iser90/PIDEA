/**
 * LayerAnalysisService - Application Layer
 * Specialized service for layer organization analysis orchestration
 */

const Logger = require('@logging/Logger');
const { LayerAnalysisStep } = require('@domain/steps/categories/analysis/architecture');

class LayerAnalysisService {
  constructor() {
    this.logger = new Logger('LayerAnalysisService');
    this.layerStep = new LayerAnalysisStep();
  }

  /**
   * Execute layer organization analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Layer analysis configuration
   * @returns {Promise<Object>} Layer analysis results
   */
  async executeLayerAnalysis(params) {
    try {
      this.logger.info('Starting layer organization analysis', { projectId: params.projectId });

      const result = await this.layerStep.execute(params);

      this.logger.info('Layer analysis completed', { 
        projectId: params.projectId,
        layerViolations: result.layerViolations?.length || 0,
        issuesFound: result.issues?.length || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Layer analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get layer analysis configuration
   * @returns {Object} Layer analysis configuration
   */
  getConfiguration() {
    return {
      name: 'Layer Organization Analyzer',
      version: '1.0.0',
      description: 'Layer organization and separation of concerns analysis',
      metrics: ['layer-violations', 'separation-of-concerns', 'dependency-direction', 'layer-cohesion'],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = LayerAnalysisService; 