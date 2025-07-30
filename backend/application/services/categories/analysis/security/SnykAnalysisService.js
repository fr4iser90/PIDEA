/**
 * SnykAnalysisService - Application Layer
 * Specialized service for Snyk dependency vulnerability analysis orchestration
 */

const Logger = require('@logging/Logger');
const { SnykSecurityStep } = require('@domain/steps/categories/analysis/security');

class SnykAnalysisService {
  constructor() {
    this.logger = new Logger('SnykAnalysisService');
    this.snykStep = new SnykSecurityStep();
  }

  /**
   * Execute Snyk dependency vulnerability analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Snyk configuration
   * @returns {Promise<Object>} Snyk analysis results
   */
  async executeSnykAnalysis(params) {
    try {
      this.logger.info('Starting Snyk dependency analysis', { projectId: params.projectId });

      const result = await this.snykStep.execute(params);

      this.logger.info('Snyk analysis completed', { 
        projectId: params.projectId,
        dependenciesAnalyzed: result.dependencies?.length || 0,
        vulnerabilitiesFound: result.vulnerabilities?.length || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Snyk analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get Snyk analysis configuration
   * @returns {Object} Snyk configuration
   */
  getConfiguration() {
    return {
      name: 'Snyk Dependency Scanner',
      version: '1.0.0',
      description: 'Dependency vulnerability and license analysis',
      supportedManifests: ['package.json', 'requirements.txt', 'pom.xml', 'build.gradle'],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = SnykAnalysisService; 