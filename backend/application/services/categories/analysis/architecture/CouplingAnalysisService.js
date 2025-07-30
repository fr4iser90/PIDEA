/**
 * CouplingAnalysisService - Application Layer
 * Specialized service for component coupling analysis orchestration
 */

const Logger = require('@logging/Logger');
const { CouplingAnalysisStep } = require('@domain/steps/categories/analysis/architecture');

class CouplingAnalysisService {
  constructor() {
    this.logger = new Logger('CouplingAnalysisService');
    this.couplingStep = new CouplingAnalysisStep();
  }

  /**
   * Execute component coupling analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Coupling analysis configuration
   * @returns {Promise<Object>} Coupling analysis results
   */
  async executeCouplingAnalysis(params) {
    try {
      this.logger.info('Starting component coupling analysis', { projectId: params.projectId });

      const result = await this.couplingStep.execute(params);

      this.logger.info('Coupling analysis completed', { 
        projectId: params.projectId,
        couplingScore: result.couplingScore || 0,
        issuesFound: result.issues?.length || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Coupling analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get coupling analysis configuration
   * @returns {Object} Coupling analysis configuration
   */
  getConfiguration() {
    return {
      name: 'Component Coupling Analyzer',
      version: '1.0.0',
      description: 'Component coupling and dependencies analysis',
      metrics: ['afferent-coupling', 'efferent-coupling', 'instability', 'abstractness'],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = CouplingAnalysisService; 