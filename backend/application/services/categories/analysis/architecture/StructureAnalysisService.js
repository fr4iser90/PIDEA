/**
 * StructureAnalysisService - Application Layer
 * Specialized service for project structure analysis orchestration
 */

const Logger = require('@logging/Logger');
const { StructureAnalysisStep } = require('@domain/steps/categories/analysis/architecture');

class StructureAnalysisService {
  constructor() {
    this.logger = new Logger('StructureAnalysisService');
    this.structureStep = new StructureAnalysisStep();
  }

  /**
   * Execute project structure analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Structure analysis configuration
   * @returns {Promise<Object>} Structure analysis results
   */
  async executeStructureAnalysis(params) {
    try {
      this.logger.info('Starting project structure analysis', { projectId: params.projectId });

      const result = await this.structureStep.execute(params);

      this.logger.info('Structure analysis completed', { 
        projectId: params.projectId,
        issuesFound: result.issues?.length || 0,
        directoriesAnalyzed: result.directoriesAnalyzed || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Structure analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get structure analysis configuration
   * @returns {Object} Structure analysis configuration
   */
  getConfiguration() {
    return {
      name: 'Project Structure Analyzer',
      version: '1.0.0',
      description: 'Project structure and architectural patterns analysis',
      metrics: ['directory-structure', 'file-organization', 'naming-conventions', 'separation-of-concerns'],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = StructureAnalysisService; 