/**
 * SecurityAnalysisService - Application Layer
 * Orchestrates all security analysis steps and coordinates results
 */

const Logger = require('@logging/Logger');
const { 
  TrivySecurityStep, 
  SnykSecurityStep, 
  SemgrepSecurityStep, 
  ZapSecurityStep, 
  SecretScanningStep, 
  ComplianceSecurityStep 
} = require('@domain/steps/categories/analysis/security');

class SecurityAnalysisService {
  constructor() {
    this.logger = new Logger('SecurityAnalysisService');
    this.trivyStep = new TrivySecurityStep();
    this.snykStep = new SnykSecurityStep();
    this.semgrepStep = new SemgrepSecurityStep();
    this.zapStep = new ZapSecurityStep();
    this.secretStep = new SecretScanningStep();
    this.complianceStep = new ComplianceSecurityStep();
  }

  /**
   * Execute comprehensive security analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Analysis configuration
   * @returns {Promise<Object>} Combined security analysis results
   */
  async executeSecurityAnalysis(params) {
    try {
      this.logger.info('Starting comprehensive security analysis', { projectId: params.projectId });

      // Execute all security analysis steps in parallel
      const [
        trivyResults,
        snykResults,
        semgrepResults,
        zapResults,
        secretResults,
        complianceResults
      ] = await Promise.allSettled([
        this.trivyStep.execute(params),
        this.snykStep.execute(params),
        this.semgrepStep.execute(params),
        this.zapStep.execute(params),
        this.secretStep.execute(params),
        this.complianceStep.execute(params)
      ]);

      // Process results and handle failures
      const results = {
        trivy: this.processResult(trivyResults, 'Trivy'),
        snyk: this.processResult(snykResults, 'Snyk'),
        semgrep: this.processResult(semgrepResults, 'Semgrep'),
        zap: this.processResult(zapResults, 'ZAP'),
        secrets: this.processResult(secretResults, 'Secret Scanning'),
        compliance: this.processResult(complianceResults, 'Compliance')
      };

      // Calculate overall security score
      const securityScore = this.calculateSecurityScore(results);

      // Generate security recommendations
      const recommendations = this.generateSecurityRecommendations(results);

      const analysisResult = {
        projectId: params.projectId,
        timestamp: new Date().toISOString(),
        securityScore,
        results,
        recommendations,
        summary: this.generateSecuritySummary(results)
      };

      this.logger.info('Security analysis completed', { 
        projectId: params.projectId, 
        securityScore 
      });

      return analysisResult;

    } catch (error) {
      this.logger.error('Security analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Process individual step results
   * @param {PromiseSettledResult} result - Promise result
   * @param {string} stepName - Name of the step
   * @returns {Object} Processed result
   */
  processResult(result, stepName) {
    if (result.status === 'fulfilled') {
      return {
        success: true,
        data: result.value,
        error: null
      };
    } else {
      this.logger.warn(`${stepName} analysis failed`, { error: result.reason.message });
      return {
        success: false,
        data: null,
        error: result.reason.message
      };
    }
  }

  /**
   * Calculate overall security score
   * @param {Object} results - All security analysis results
   * @returns {number} Security score (0-100)
   */
  calculateSecurityScore(results) {
    const weights = {
      trivy: 0.25,
      snyk: 0.20,
      semgrep: 0.20,
      zap: 0.15,
      secrets: 0.15,
      compliance: 0.05
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(results).forEach(([key, result]) => {
      if (result.success && result.data && result.data.score !== undefined) {
        totalScore += result.data.score * weights[key];
        totalWeight += weights[key];
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Generate security recommendations
   * @param {Object} results - All security analysis results
   * @returns {Array} List of security recommendations
   */
  generateSecurityRecommendations(results) {
    const recommendations = [];

    // Trivy recommendations
    if (results.trivy.success && results.trivy.data.vulnerabilities) {
      const criticalVulns = results.trivy.data.vulnerabilities.filter(v => v.severity === 'CRITICAL');
      if (criticalVulns.length > 0) {
        recommendations.push({
          priority: 'CRITICAL',
          category: 'Vulnerabilities',
          message: `Found ${criticalVulns.length} critical vulnerabilities. Update affected dependencies immediately.`,
          details: criticalVulns.map(v => v.packageName)
        });
      }
    }

    // Snyk recommendations
    if (results.snyk.success && results.snyk.data.dependencies) {
      const outdatedDeps = results.snyk.data.dependencies.filter(d => d.outdated);
      if (outdatedDeps.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Dependencies',
          message: `Found ${outdatedDeps.length} outdated dependencies with security vulnerabilities.`,
          details: outdatedDeps.map(d => d.name)
        });
      }
    }

    // Semgrep recommendations
    if (results.semgrep.success && results.semgrep.data.issues) {
      const highIssues = results.semgrep.data.issues.filter(i => i.severity === 'HIGH');
      if (highIssues.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Code Security',
          message: `Found ${highIssues.length} high-severity code security issues.`,
          details: highIssues.map(i => i.rule)
        });
      }
    }

    // Secret scanning recommendations
    if (results.secrets.success && results.secrets.data.secrets) {
      if (results.secrets.data.secrets.length > 0) {
        recommendations.push({
          priority: 'CRITICAL',
          category: 'Secrets',
          message: `Found ${results.secrets.data.secrets.length} hardcoded secrets. Remove immediately and rotate affected credentials.`,
          details: results.secrets.data.secrets.map(s => s.type)
        });
      }
    }

    // Compliance recommendations
    if (results.compliance.success && results.compliance.data.violations) {
      const criticalViolations = results.compliance.data.violations.filter(v => v.severity === 'CRITICAL');
      if (criticalViolations.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Compliance',
          message: `Found ${criticalViolations.length} critical compliance violations.`,
          details: criticalViolations.map(v => v.rule)
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate security summary
   * @param {Object} results - All security analysis results
   * @returns {Object} Security summary
   */
  generateSecuritySummary(results) {
    const summary = {
      totalVulnerabilities: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      secretsFound: 0,
      complianceViolations: 0
    };

    // Aggregate vulnerability counts
    Object.values(results).forEach(result => {
      if (result.success && result.data) {
        if (result.data.vulnerabilities) {
          summary.totalVulnerabilities += result.data.vulnerabilities.length;
          result.data.vulnerabilities.forEach(v => {
            summary[`${v.severity.toLowerCase()}Issues`]++;
          });
        }
        if (result.data.secrets) {
          summary.secretsFound += result.data.secrets.length;
        }
        if (result.data.violations) {
          summary.complianceViolations += result.data.violations.length;
        }
      }
    });

    return summary;
  }

  /**
   * Execute specific security analysis step
   * @param {string} stepType - Type of security analysis
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} Step-specific results
   */
  async executeSpecificStep(stepType, params) {
    const stepMap = {
      trivy: this.trivyStep,
      snyk: this.snykStep,
      semgrep: this.semgrepStep,
      zap: this.zapStep,
      secrets: this.secretStep,
      compliance: this.complianceStep
    };

    const step = stepMap[stepType];
    if (!step) {
      throw new Error(`Unknown security step type: ${stepType}`);
    }

    return await step.execute(params);
  }
}

module.exports = SecurityAnalysisService; 