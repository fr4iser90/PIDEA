/**
 * ComplianceAnalysisService - Application Layer
 * Specialized service for security compliance and configuration analysis orchestration
 */

const Logger = require('@logging/Logger');
const { ComplianceSecurityStep } = require('@domain/steps/categories/analysis/security');

class ComplianceAnalysisService {
  constructor() {
    this.logger = new Logger('ComplianceAnalysisService');
    this.complianceStep = new ComplianceSecurityStep();
  }

  /**
   * Execute compliance analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Compliance configuration
   * @returns {Promise<Object>} Compliance analysis results
   */
  async executeComplianceAnalysis(params) {
    try {
      this.logger.info('Starting compliance analysis', { projectId: params.projectId });

      const result = await this.complianceStep.execute(params);

      this.logger.info('Compliance analysis completed', { 
        projectId: params.projectId,
        violationsFound: result.violations?.length || 0,
        standardsChecked: result.standardsChecked || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Compliance analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get compliance analysis configuration
   * @returns {Object} Compliance configuration
   */
  getConfiguration() {
    return {
      name: 'Compliance Analyzer',
      version: '1.0.0',
      description: 'Security compliance and configuration analysis',
      supportedStandards: ['OWASP', 'NIST', 'ISO27001', 'SOC2', 'GDPR'],
      checkTypes: ['configuration', 'policy', 'standard', 'regulation'],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = ComplianceAnalysisService; 