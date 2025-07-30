/**
 * ComplianceService - Infrastructure Layer
 * External integration for security compliance API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Security compliance checking via various compliance APIs
 */

const Logger = require('@logging/Logger');
const HttpClient = require('@infrastructure/http/HttpClient');

class ComplianceService {
  constructor() {
    this.logger = new Logger('ComplianceService');
    this.httpClient = new HttpClient();
    this.baseUrl = process.env.COMPLIANCE_API_URL || 'https://api.compliance.com';
    this.apiKey = process.env.COMPLIANCE_API_KEY;
    this.timeout = parseInt(process.env.COMPLIANCE_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting compliance analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const complianceConfig = {
        ...config,
        frameworks: config.frameworks || ['OWASP', 'NIST', 'ISO27001'],
        severity: config.severity || 'medium,high,critical',
        includeDevDeps: config.includeDevDeps !== false
      };

      const result = await this.checkCompliance(projectPath, complianceConfig);
      
      this.logger.info('Compliance analysis completed successfully', { 
        projectId: params.projectId,
        violations: result.violations?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'compliance',
          timestamp: new Date().toISOString(),
          config: complianceConfig
        }
      };
    } catch (error) {
      this.logger.error('Compliance analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async checkCompliance(projectPath, config) {
    const results = {
      frameworks: {},
      violations: [],
      summary: {
        totalViolations: 0,
        byFramework: {},
        bySeverity: {},
        complianceScore: 0
      }
    };

    // Check each framework
    for (const framework of config.frameworks) {
      try {
        const frameworkResult = await this.checkFrameworkCompliance(projectPath, framework, config);
        results.frameworks[framework] = frameworkResult;
        results.violations.push(...frameworkResult.violations);
      } catch (error) {
        this.logger.error(`Failed to check ${framework} compliance`, { error: error.message });
        results.frameworks[framework] = {
          status: 'error',
          error: error.message,
          violations: []
        };
      }
    }

    // Calculate summary
    results.summary = this.calculateComplianceSummary(results);
    
    return results;
  }

  async checkFrameworkCompliance(projectPath, framework, config) {
    const endpoint = `${this.baseUrl}/v1/compliance/${framework.toLowerCase()}`;
    const payload = {
      projectPath: projectPath,
      config: {
        severity: config.severity,
        includeDevDeps: config.includeDevDeps,
        customRules: config.customRules || []
      }
    };

    const response = await this.httpClient.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined,
        'User-Agent': 'PIDEA-Compliance-Integration/1.0'
      },
      timeout: this.timeout
    });

    return {
      status: 'success',
      framework: framework,
      violations: response.data.violations || [],
      score: response.data.score || 0,
      recommendations: response.data.recommendations || []
    };
  }

  calculateComplianceSummary(results) {
    const summary = {
      totalViolations: 0,
      byFramework: {},
      bySeverity: {},
      complianceScore: 0
    };

    // Count violations by framework
    for (const [framework, result] of Object.entries(results.frameworks)) {
      if (result.status === 'success') {
        summary.byFramework[framework] = result.violations.length;
        summary.totalViolations += result.violations.length;
      }
    }

    // Count violations by severity
    for (const violation of results.violations) {
      const severity = violation.severity || 'unknown';
      summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;
    }

    // Calculate compliance score
    const totalChecks = Object.keys(results.frameworks).length;
    const successfulChecks = Object.values(results.frameworks)
      .filter(result => result.status === 'success').length;
    
    summary.complianceScore = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

    return summary;
  }

  async getConfiguration() {
    return {
      name: 'Security Compliance Service',
      version: '1.0.0',
      capabilities: ['compliance-checking', 'framework-support', 'custom-rules'],
      supportedFrameworks: ['OWASP', 'NIST', 'ISO27001', 'SOC2', 'GDPR'],
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
        headers: {
          'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
        },
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

  async getSupportedFrameworks() {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/v1/frameworks`, {
        headers: {
          'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
        },
        timeout: 10000
      });
      
      return response.data.frameworks || [];
    } catch (error) {
      this.logger.error('Failed to get supported frameworks', { error: error.message });
      return ['OWASP', 'NIST', 'ISO27001'];
    }
  }
}

module.exports = ComplianceService; 