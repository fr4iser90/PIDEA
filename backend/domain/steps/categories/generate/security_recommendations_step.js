/**
 * Security Recommendations Step - Generate security-focused recommendations
 * Generates security recommendations based on security analysis results
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('security_recommendations_step');

// Step configuration
const config = {
  name: 'SecurityRecommendationsStep',
  type: 'generate',
  description: 'Generates security-focused recommendations based on security analysis',
  category: 'generate',
  version: '1.0.0',
  dependencies: ['security_analysis'],
  settings: {
    timeout: 15000,
    includePriority: true,
    includeEffort: true,
    includeImpact: true,
    maxRecommendations: 10
  },
  validation: {
    requiredInputs: ['security_analysis'],
    supportedTypes: ['vulnerabilities', 'configuration', 'secrets', 'dependencies']
  }
};

class SecurityRecommendationsStep {
  constructor() {
    this.logger = logger;
  }

  /**
   * Execute security recommendations generation
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Security recommendations results
   */
  async execute(context) {
    try {
      this.logger.info('Starting security recommendations generation');
      
      const { security_analysis, projectPath, options = {} } = context;
      
      if (!security_analysis) {
        throw new Error('Security analysis required for security recommendations generation');
      }

      const recommendations = {
        timestamp: new Date(),
        projectPath,
        recommendations: [],
        insights: [],
        summary: '',
        metadata: {
          totalRecommendations: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0
        }
      };

      // Generate security recommendations
      recommendations.recommendations = await this._generateSecurityRecommendations(security_analysis);

      // Generate insights
      recommendations.insights = await this._generateInsights(recommendations.recommendations);

      // Calculate metadata
      recommendations.metadata = this._calculateMetadata(recommendations.recommendations);

      // Generate summary
      recommendations.summary = this._generateSummary(recommendations.metadata);

      this.logger.info(`Generated ${recommendations.recommendations.length} security recommendations`);
      
      return recommendations;
    } catch (error) {
      this.logger.error('Security recommendations generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate security recommendations
   */
  async _generateSecurityRecommendations(securityAnalysis) {
    const recommendations = [];

    // Vulnerabilities
    if (securityAnalysis.vulnerabilities && securityAnalysis.vulnerabilities.length > 0) {
      const criticalVulns = securityAnalysis.vulnerabilities.filter(v => v.severity === 'critical');
      const highVulns = securityAnalysis.vulnerabilities.filter(v => v.severity === 'high');
      const mediumVulns = securityAnalysis.vulnerabilities.filter(v => v.severity === 'medium');

      if (criticalVulns.length > 0) {
        recommendations.push({
          title: 'Fix Critical Security Vulnerabilities',
          description: `${criticalVulns.length} critical vulnerabilities detected`,
          priority: 'critical',
          category: 'security',
          effort: 'high',
          impact: 'critical',
          action: 'Update vulnerable dependencies immediately',
          estimatedTime: `${criticalVulns.length * 2} hours`,
          tags: ['security', 'vulnerabilities', 'critical'],
          details: criticalVulns.map(v => ({
            package: v.package,
            version: v.version,
            severity: v.severity,
            description: v.description
          }))
        });
      }

      if (highVulns.length > 0) {
        recommendations.push({
          title: 'Address High Priority Security Issues',
          description: `${highVulns.length} high priority security issues found`,
          priority: 'high',
          category: 'security',
          effort: 'medium',
          impact: 'high',
          action: 'Review and fix high priority security issues',
          estimatedTime: `${highVulns.length * 1.5} hours`,
          tags: ['security', 'vulnerabilities', 'high'],
          details: highVulns.map(v => ({
            package: v.package,
            version: v.version,
            severity: v.severity,
            description: v.description
          }))
        });
      }

      if (mediumVulns.length > 0) {
        recommendations.push({
          title: 'Review Medium Priority Security Issues',
          description: `${mediumVulns.length} medium priority security issues found`,
          priority: 'medium',
          category: 'security',
          effort: 'low',
          impact: 'medium',
          action: 'Review medium priority security issues',
          estimatedTime: `${mediumVulns.length * 1} hour`,
          tags: ['security', 'vulnerabilities', 'medium']
        });
      }
    }

    // Security configuration
    if (securityAnalysis.configuration) {
      if (securityAnalysis.configuration.missingSecurity && securityAnalysis.configuration.missingSecurity.length > 0) {
        recommendations.push({
          title: 'Implement Security Middleware',
          description: `Missing security configurations: ${securityAnalysis.configuration.missingSecurity.join(', ')}`,
          priority: 'high',
          category: 'security',
          effort: 'medium',
          impact: 'high',
          action: 'Add helmet, cors, and other security middleware',
          estimatedTime: '4-6 hours',
          tags: ['security', 'configuration', 'middleware'],
          details: securityAnalysis.configuration.missingSecurity.map(missing => ({
            component: missing,
            description: `Missing ${missing} security configuration`
          }))
        });
      }

      if (securityAnalysis.configuration.weakConfigurations && securityAnalysis.configuration.weakConfigurations.length > 0) {
        recommendations.push({
          title: 'Strengthen Security Configuration',
          description: `${securityAnalysis.configuration.weakConfigurations.length} weak security configurations detected`,
          priority: 'medium',
          category: 'security',
          effort: 'medium',
          impact: 'medium',
          action: 'Review and strengthen security configurations',
          estimatedTime: '2-4 hours',
          tags: ['security', 'configuration', 'hardening']
        });
      }
    }

    // Secrets detection
    if (securityAnalysis.secrets && securityAnalysis.secrets.found && securityAnalysis.secrets.found.length > 0) {
      recommendations.push({
        title: 'Remove Hardcoded Secrets',
        description: `${securityAnalysis.secrets.found.length} secrets found in code`,
        priority: 'critical',
        category: 'security',
        effort: 'high',
        impact: 'critical',
        action: 'Move secrets to environment variables or secure storage',
        estimatedTime: `${securityAnalysis.secrets.found.length * 0.5} hours`,
        tags: ['security', 'secrets', 'environment'],
        details: securityAnalysis.secrets.found.map(secret => ({
          file: secret.file,
          line: secret.line,
          type: secret.type,
          description: 'Hardcoded secret detected'
        }))
      });
    }

    // Security dependencies
    if (securityAnalysis.dependencies && securityAnalysis.dependencies.securityIssues && securityAnalysis.dependencies.securityIssues.length > 0) {
      recommendations.push({
        title: 'Address Security Dependency Issues',
        description: `${securityAnalysis.dependencies.securityIssues.length} security issues in dependencies`,
        priority: 'high',
        category: 'security',
        effort: 'medium',
        impact: 'high',
        action: 'Review and update security-related dependencies',
        estimatedTime: `${securityAnalysis.dependencies.securityIssues.length * 1} hour`,
        tags: ['security', 'dependencies', 'updates']
      });
    }

    return recommendations;
  }

  /**
   * Generate insights from security recommendations
   */
  async _generateInsights(recommendations) {
    const insights = [];

    // Critical security issues
    const criticalCount = recommendations.filter(r => r.priority === 'critical').length;
    if (criticalCount > 0) {
      insights.push({
        type: 'critical-security-alert',
        message: `${criticalCount} critical security issues require immediate attention`,
        severity: 'critical'
      });
    }

    // High priority security issues
    const highCount = recommendations.filter(r => r.priority === 'high').length;
    if (highCount > 3) {
      insights.push({
        type: 'high-security-volume',
        message: `${highCount} high priority security issues suggest systematic security problems`,
        severity: 'high'
      });
    }

    // Vulnerability patterns
    const vulnerabilityRecs = recommendations.filter(r => r.tags.includes('vulnerabilities'));
    if (vulnerabilityRecs.length > 0) {
      insights.push({
        type: 'vulnerability-pattern',
        message: `${vulnerabilityRecs.length} vulnerability-related recommendations found`,
        severity: 'high'
      });
    }

    // Configuration issues
    const configRecs = recommendations.filter(r => r.tags.includes('configuration'));
    if (configRecs.length > 0) {
      insights.push({
        type: 'configuration-focus',
        message: `${configRecs.length} configuration-related security issues need attention`,
        severity: 'medium'
      });
    }

    return insights;
  }

  /**
   * Calculate metadata from recommendations
   */
  _calculateMetadata(recommendations) {
    const metadata = {
      totalRecommendations: recommendations.length,
      criticalCount: recommendations.filter(r => r.priority === 'critical').length,
      highCount: recommendations.filter(r => r.priority === 'high').length,
      mediumCount: recommendations.filter(r => r.priority === 'medium').length,
      lowCount: recommendations.filter(r => r.priority === 'low').length
    };

    return metadata;
  }

  /**
   * Generate summary from metadata
   */
  _generateSummary(metadata) {
    const { totalRecommendations, criticalCount, highCount } = metadata;
    
    if (criticalCount > 0) {
      return `${criticalCount} critical security issues require immediate attention. ${highCount} high priority security issues need addressing.`;
    } else if (highCount > 0) {
      return `${highCount} high priority security issues should be addressed soon.`;
    } else if (totalRecommendations > 0) {
      return `${totalRecommendations} security recommendations for improvement identified.`;
    } else {
      return 'No specific security recommendations at this time.';
    }
  }
}

// Create instance for execution
const stepInstance = new SecurityRecommendationsStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 