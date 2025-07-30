/**
 * TrivyService - Infrastructure Layer
 * External integration for Trivy vulnerability scanner API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Container and dependency vulnerability scanning via Trivy API
 */

const Logger = require('@logging/Logger');
const HttpClient = require('@infrastructure/http/HttpClient');

class TrivyService {
  constructor() {
    this.logger = new Logger('TrivyService');
    this.httpClient = new HttpClient();
    this.baseUrl = process.env.TRIVY_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.TRIVY_API_KEY;
    this.timeout = parseInt(process.env.TRIVY_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting Trivy vulnerability analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const scanConfig = {
        ...config,
        format: 'json',
        severity: config.severity || 'UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL',
        exitCode: 0
      };

      const result = await this.scanContainer(projectPath, scanConfig);
      
      this.logger.info('Trivy analysis completed successfully', { 
        projectId: params.projectId,
        vulnerabilities: result.vulnerabilities?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'trivy',
          timestamp: new Date().toISOString(),
          config: scanConfig
        }
      };
    } catch (error) {
      this.logger.error('Trivy analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async scanContainer(projectPath, config) {
    const endpoint = `${this.baseUrl}/v1/scan`;
    const payload = {
      target: projectPath,
      config: config
    };

    const response = await this.httpClient.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
      },
      timeout: this.timeout
    });

    return response.data;
  }

  async getConfiguration() {
    return {
      name: 'Trivy Vulnerability Scanner',
      version: '1.0.0',
      capabilities: ['container-scanning', 'dependency-scanning', 'secret-scanning'],
      configuration: {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        hasApiKey: !!this.apiKey
      }
    };
  }

  async getStatus() {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });
      return {
        status: 'healthy',
        version: response.data?.version || 'unknown',
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

module.exports = TrivyService; 