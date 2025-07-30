/**
 * SemgrepService - Infrastructure Layer
 * External integration for Semgrep static analysis API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Static code analysis via Semgrep API
 */

const Logger = require('@logging/Logger');
const HttpClient = require('@infrastructure/http/HttpClient');

class SemgrepService {
  constructor() {
    this.logger = new Logger('SemgrepService');
    this.httpClient = new HttpClient();
    this.baseUrl = process.env.SEMGREP_API_URL || 'https://semgrep.dev';
    this.apiKey = process.env.SEMGREP_API_KEY;
    this.timeout = parseInt(process.env.SEMGREP_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting Semgrep static analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const scanConfig = {
        ...config,
        severity: config.severity || 'ERROR,WARNING,INFO',
        languages: config.languages || ['javascript', 'typescript', 'python', 'java'],
        rules: config.rules || 'auto'
      };

      const result = await this.scanCode(projectPath, scanConfig);
      
      this.logger.info('Semgrep analysis completed successfully', { 
        projectId: params.projectId,
        findings: result.results?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'semgrep',
          timestamp: new Date().toISOString(),
          config: scanConfig
        }
      };
    } catch (error) {
      this.logger.error('Semgrep analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async scanCode(projectPath, config) {
    const endpoint = `${this.baseUrl}/api/v1/ci/scan`;
    const payload = {
      repo_name: projectPath,
      repo_url: `file://${projectPath}`,
      scan_settings: {
        semgrep_version: 'latest',
        config: config.rules,
        severity: config.severity,
        languages: config.languages
      }
    };

    const response = await this.httpClient.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined,
        'User-Agent': 'PIDEA-Semgrep-Integration/1.0'
      },
      timeout: this.timeout
    });

    return response.data;
  }

  async getConfiguration() {
    return {
      name: 'Semgrep Static Analyzer',
      version: '1.0.0',
      capabilities: ['static-analysis', 'security-rules', 'custom-rules'],
      configuration: {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        hasApiKey: !!this.apiKey
      }
    };
  }

  async getStatus() {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/api/v1/health`, {
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

module.exports = SemgrepService; 