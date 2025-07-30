/**
 * SnykService - Infrastructure Layer
 * External integration for Snyk dependency vulnerability API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Dependency vulnerability scanning via Snyk API
 */

const Logger = require('@logging/Logger');
const HttpClient = require('@infrastructure/http/HttpClient');

class SnykService {
  constructor() {
    this.logger = new Logger('SnykService');
    this.httpClient = new HttpClient();
    this.baseUrl = process.env.SNYK_API_URL || 'https://api.snyk.io';
    this.apiKey = process.env.SNYK_API_KEY;
    this.orgId = process.env.SNYK_ORG_ID;
    this.timeout = parseInt(process.env.SNYK_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting Snyk dependency analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const scanConfig = {
        ...config,
        severity: config.severity || 'low,medium,high,critical',
        includeDevDeps: config.includeDevDeps !== false
      };

      const result = await this.scanDependencies(projectPath, scanConfig);
      
      this.logger.info('Snyk analysis completed successfully', { 
        projectId: params.projectId,
        vulnerabilities: result.vulnerabilities?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'snyk',
          timestamp: new Date().toISOString(),
          config: scanConfig
        }
      };
    } catch (error) {
      this.logger.error('Snyk analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async scanDependencies(projectPath, config) {
    const endpoint = `${this.baseUrl}/v1/test`;
    const payload = {
      targetFile: `${projectPath}/package.json`,
      org: this.orgId,
      severity: config.severity,
      includeDevDeps: config.includeDevDeps
    };

    const response = await this.httpClient.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'User-Agent': 'PIDEA-Snyk-Integration/1.0'
      },
      timeout: this.timeout
    });

    return response.data;
  }

  async getConfiguration() {
    return {
      name: 'Snyk Dependency Scanner',
      version: '1.0.0',
      capabilities: ['dependency-scanning', 'license-scanning', 'container-scanning'],
      configuration: {
        baseUrl: this.baseUrl,
        orgId: this.orgId,
        timeout: this.timeout,
        hasApiKey: !!this.apiKey
      }
    };
  }

  async getStatus() {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/v1/user/me`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 5000
      });
      return {
        status: 'healthy',
        user: response.data?.email || 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = SnykService; 