/**
 * SecretScanningService - Application Layer
 * Specialized service for secret detection and sensitive data analysis orchestration
 */

const Logger = require('@logging/Logger');
const { SecretScanningStep } = require('@domain/steps/categories/analysis/security');

class SecretScanningService {
  constructor() {
    this.logger = new Logger('SecretScanningService');
    this.secretStep = new SecretScanningStep();
  }

  /**
   * Execute secret scanning analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Secret scanning configuration
   * @returns {Promise<Object>} Secret scanning results
   */
  async executeSecretScanning(params) {
    try {
      this.logger.info('Starting secret scanning analysis', { projectId: params.projectId });

      const result = await this.secretStep.execute(params);

      this.logger.info('Secret scanning completed', { 
        projectId: params.projectId,
        secretsFound: result.secrets?.length || 0,
        filesScanned: result.filesScanned || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Secret scanning failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get secret scanning configuration
   * @returns {Object} Secret scanning configuration
   */
  getConfiguration() {
    return {
      name: 'Secret Scanner',
      version: '1.0.0',
      description: 'Detection of hardcoded secrets and sensitive data',
      supportedSecretTypes: ['api-keys', 'passwords', 'tokens', 'private-keys', 'certificates'],
      fileExtensions: ['.env', '.config', '.json', '.yaml', '.yml', '.properties'],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = SecretScanningService; 