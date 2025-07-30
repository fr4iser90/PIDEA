/**
 * ZapAnalysisService - Application Layer
 * Specialized service for OWASP ZAP web application security testing orchestration
 */

const Logger = require('@logging/Logger');
const { ZapSecurityStep } = require('@domain/steps/categories/analysis/security');

class ZapAnalysisService {
  constructor() {
    this.logger = new Logger('ZapAnalysisService');
    this.zapStep = new ZapSecurityStep();
  }

  /**
   * Execute OWASP ZAP web application security testing
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - ZAP configuration
   * @returns {Promise<Object>} ZAP analysis results
   */
  async executeZapAnalysis(params) {
    try {
      this.logger.info('Starting ZAP web security testing', { projectId: params.projectId });

      const result = await this.zapStep.execute(params);

      this.logger.info('ZAP analysis completed', { 
        projectId: params.projectId,
        vulnerabilitiesFound: result.vulnerabilities?.length || 0,
        alertsFound: result.alerts?.length || 0
      });

      return result;

    } catch (error) {
      this.logger.error('ZAP analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get ZAP analysis configuration
   * @returns {Object} ZAP configuration
   */
  getConfiguration() {
    return {
      name: 'OWASP ZAP Web Security Scanner',
      version: '1.0.0',
      description: 'Web application security testing and vulnerability scanning',
      supportedProtocols: ['http', 'https'],
      scanTypes: ['passive', 'active', 'spider', 'ajax-spider'],
      alertLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = ZapAnalysisService; 