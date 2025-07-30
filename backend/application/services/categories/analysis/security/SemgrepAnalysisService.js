/**
 * SemgrepAnalysisService - Application Layer
 * Specialized service for Semgrep static code analysis orchestration
 */

const Logger = require('@logging/Logger');
const { SemgrepSecurityStep } = require('@domain/steps/categories/analysis/security');

class SemgrepAnalysisService {
  constructor() {
    this.logger = new Logger('SemgrepAnalysisService');
    this.semgrepStep = new SemgrepSecurityStep();
  }

  /**
   * Execute Semgrep static code analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Semgrep configuration
   * @returns {Promise<Object>} Semgrep analysis results
   */
  async executeSemgrepAnalysis(params) {
    try {
      this.logger.info('Starting Semgrep static analysis', { projectId: params.projectId });

      const result = await this.semgrepStep.execute(params);

      this.logger.info('Semgrep analysis completed', { 
        projectId: params.projectId,
        issuesFound: result.issues?.length || 0,
        filesAnalyzed: result.filesAnalyzed || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Semgrep analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get Semgrep analysis configuration
   * @returns {Object} Semgrep configuration
   */
  getConfiguration() {
    return {
      name: 'Semgrep Static Analyzer',
      version: '1.0.0',
      description: 'Static code analysis for security vulnerabilities',
      supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'go', 'php', 'ruby'],
      severityLevels: ['INFO', 'WARNING', 'ERROR']
    };
  }
}

module.exports = SemgrepAnalysisService; 