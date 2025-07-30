/**
 * TrivyAnalysisService - Application Layer
 * Specialized service for Trivy vulnerability analysis orchestration
 */

const Logger = require('@logging/Logger');
const { TrivySecurityStep } = require('@domain/steps/categories/analysis/security');

class TrivyAnalysisService {
  constructor() {
    this.logger = new Logger('TrivyAnalysisService');
    this.trivyStep = new TrivySecurityStep();
  }

  /**
   * Execute Trivy vulnerability analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Trivy configuration
   * @returns {Promise<Object>} Trivy analysis results
   */
  async executeTrivyAnalysis(params) {
    try {
      this.logger.info('Starting Trivy vulnerability analysis', { projectId: params.projectId });

      const result = await this.trivyStep.execute(params);

      this.logger.info('Trivy analysis completed', { 
        projectId: params.projectId,
        vulnerabilitiesFound: result.vulnerabilities?.length || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Trivy analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get Trivy analysis configuration
   * @returns {Object} Trivy configuration
   */
  getConfiguration() {
    return {
      name: 'Trivy Vulnerability Scanner',
      version: '1.0.0',
      description: 'Container and dependency vulnerability scanning',
      supportedFormats: ['docker', 'filesystem', 'git', 'rootfs', 'image'],
      severityLevels: ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = TrivyAnalysisService; 