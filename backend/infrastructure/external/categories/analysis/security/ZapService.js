/**
 * ZapService - Infrastructure Layer
 * External integration for OWASP ZAP web security testing API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Web application security testing via OWASP ZAP API
 */

const Logger = require('@logging/Logger');
const HttpClient = require('@infrastructure/http/HttpClient');

class ZapService {
  constructor() {
    this.logger = new Logger('ZapService');
    this.httpClient = new HttpClient();
    this.baseUrl = process.env.ZAP_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.ZAP_API_KEY;
    this.timeout = parseInt(process.env.ZAP_TIMEOUT) || 60000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting ZAP web security analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const scanConfig = {
        ...config,
        target: config.target || 'http://localhost:3000',
        scanType: config.scanType || 'spider',
        alertThreshold: config.alertThreshold || 'Medium',
        riskThreshold: config.riskThreshold || 'Medium'
      };

      const result = await this.scanWebApplication(scanConfig);
      
      this.logger.info('ZAP analysis completed successfully', { 
        projectId: params.projectId,
        alerts: result.alerts?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'zap',
          timestamp: new Date().toISOString(),
          config: scanConfig
        }
      };
    } catch (error) {
      this.logger.error('ZAP analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async scanWebApplication(config) {
    // Start spider scan
    const spiderUrl = `${this.baseUrl}/JSON/spider/action/scan/`;
    const spiderParams = {
      url: config.target,
      maxChildren: config.maxChildren || 10,
      recurse: config.recurse !== false,
      contextName: '',
      subtreeOnly: false
    };

    const spiderResponse = await this.httpClient.post(spiderUrl, spiderParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-ZAP-API-Key': this.apiKey
      },
      timeout: this.timeout
    });

    const scanId = spiderResponse.data.scan;
    
    // Wait for spider to complete
    await this.waitForScanCompletion('spider', scanId);
    
    // Start active scan
    const activeScanUrl = `${this.baseUrl}/JSON/ascan/action/scan/`;
    const activeScanParams = {
      url: config.target,
      recurse: config.recurse !== false,
      inScopeOnly: false,
      scanPolicyName: '',
      method: '',
      postData: ''
    };

    const activeScanResponse = await this.httpClient.post(activeScanUrl, activeScanParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-ZAP-API-Key': this.apiKey
      },
      timeout: this.timeout
    });

    const activeScanId = activeScanResponse.data.scan;
    
    // Wait for active scan to complete
    await this.waitForScanCompletion('ascan', activeScanId);
    
    // Get results
    const alertsUrl = `${this.baseUrl}/JSON/core/view/alerts/`;
    const alertsResponse = await this.httpClient.get(alertsUrl, {
      headers: {
        'X-ZAP-API-Key': this.apiKey
      },
      timeout: 10000
    });

    return {
      alerts: alertsResponse.data.alerts,
      scanId: activeScanId,
      target: config.target
    };
  }

  async waitForScanCompletion(scanType, scanId) {
    const maxWaitTime = 300000; // 5 minutes
    const checkInterval = 5000; // 5 seconds
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      const statusUrl = `${this.baseUrl}/JSON/${scanType}/view/status/?scanId=${scanId}`;
      const response = await this.httpClient.get(statusUrl, {
        headers: {
          'X-ZAP-API-Key': this.apiKey
        },
        timeout: 5000
      });

      if (response.data.status === '100') {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    throw new Error(`Scan timeout after ${maxWaitTime}ms`);
  }

  async getConfiguration() {
    return {
      name: 'OWASP ZAP Web Security Scanner',
      version: '1.0.0',
      capabilities: ['web-security-testing', 'spider-scanning', 'active-scanning'],
      configuration: {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        hasApiKey: !!this.apiKey
      }
    };
  }

  async getStatus() {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/JSON/core/view/version/`, {
        headers: {
          'X-ZAP-API-Key': this.apiKey
        },
        timeout: 5000
      });
      return {
        status: 'healthy',
        version: response.data.version || 'unknown',
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

module.exports = ZapService; 