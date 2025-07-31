/**
 * License Dependency Step
 * Analyzes dependency licenses and compliance issues
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Individual step for license analysis within DependencyAnalysisOrchestrator
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');

const logger = new Logger('license_dependency_step');

// Step configuration
const config = {
  name: 'LicenseDependencyStep',
  type: 'analysis',
  description: 'Analyzes dependency licenses and compliance issues',
  category: 'analysis',
  subcategory: 'dependencies',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    checkDevDependencies: true,
    checkPeerDependencies: true
  }
};

class LicenseDependencyStep extends StepBuilder {
  constructor() {
    super(config);
  }

  async execute(context) {
    try {
      logger.info('📄 Starting license analysis...');
      
      const { projectPath } = context;
      
      // Analyze license issues
      const licenseIssues = await this.analyzeLicenseIssues(projectPath);
      const metrics = await this.calculateLicenseMetrics(projectPath);
      
      const result = {
        success: true,
        licenseIssues,
        metrics,
        recommendations: this.generateRecommendations(licenseIssues, metrics),
        issues: this.generateIssues(licenseIssues),
        tasks: this.generateTasks(licenseIssues),
        documentation: this.generateDocumentation(licenseIssues, metrics)
      };

      logger.info('✅ License analysis completed successfully');
      return result;

    } catch (error) {
      logger.error('❌ License analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        licenseIssues: [],
        metrics: {},
        recommendations: [],
        issues: [],
        tasks: [],
        documentation: []
      };
    }
  }

  async analyzeLicenseIssues(projectPath) {
    // Placeholder implementation - would integrate with license-checker
    return [
      {
        name: 'some-package',
        version: '1.0.0',
        license: 'GPL-3.0',
        severity: 'high',
        issue: 'GPL license may require source code disclosure',
        recommendation: 'Consider alternative with MIT/Apache license'
      },
      {
        name: 'another-package',
        version: '2.1.0',
        license: 'UNKNOWN',
        severity: 'medium',
        issue: 'Unknown license type',
        recommendation: 'Contact package maintainer for license clarification'
      }
    ];
  }

  async calculateLicenseMetrics(projectPath) {
    // Placeholder implementation
    return {
      totalDependencies: 45,
      licenseIssues: 3,
      licenseIssuePercentage: 6.7,
      gplLicenses: 1,
      unknownLicenses: 2,
      compliantLicenses: 42
    };
  }

  generateRecommendations(licenseIssues, metrics) {
    const recommendations = [];
    
    if (metrics.licenseIssues > 0) {
      recommendations.push({
        type: 'compliance',
        priority: 'high',
        message: 'Review license compliance issues',
        action: 'Address license conflicts and unknown licenses'
      });
    }
    
    if (metrics.gplLicenses > 0) {
      recommendations.push({
        type: 'gpl',
        priority: 'high',
        message: 'GPL licenses may have compliance implications',
        action: 'Review GPL license requirements and alternatives'
      });
    }
    
    return recommendations;
  }

  generateIssues(licenseIssues) {
    return licenseIssues.map(issue => ({
      type: 'license',
      severity: issue.severity,
      message: `${issue.name} has license issue: ${issue.issue}`,
      package: issue.name,
      version: issue.version,
      license: issue.license,
      issue: issue.issue,
      recommendation: issue.recommendation
    }));
  }

  generateTasks(licenseIssues) {
    return licenseIssues.map(issue => ({
      type: 'license-review',
      priority: issue.severity === 'high' ? 'high' : 'medium',
      description: `Review license for ${issue.name}`,
      package: issue.name,
      license: issue.license,
      issue: issue.issue,
      estimatedTime: '15 minutes'
    }));
  }

  generateDocumentation(licenseIssues, metrics) {
    return [
      {
        type: 'guide',
        title: 'License Compliance',
        content: 'Ensure all dependencies have compatible licenses',
        url: '/docs/license-compliance'
      },
      {
        type: 'metrics',
        title: 'License Issues',
        content: `${metrics.licenseIssues} license compliance issues found`,
        url: '/docs/license-metrics'
      }
    ];
  }
}

// Create instance for execution
const stepInstance = new LicenseDependencyStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 