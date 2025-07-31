/**
 * Package.json Manifest Step
 * Analyzes package.json configuration and best practices
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Individual step for package.json analysis within ManifestAnalysisOrchestrator
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');

const logger = new Logger('package_json_manifest_step');

// Step configuration
const config = {
  name: 'PackageJsonManifestStep',
  type: 'analysis',
  description: 'Analyzes package.json configuration and best practices',
  category: 'analysis',
  subcategory: 'manifest',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    requireName: true,
    requireVersion: true,
    requireDescription: true
  }
};

class PackageJsonManifestStep extends StepBuilder {
  constructor() {
    super(config);
  }

  async execute(context) {
    try {
      logger.info('📦 Starting package.json analysis...');
      
      const { projectPath } = context;
      
      // Analyze package.json issues
      const packageJsonIssues = await this.analyzePackageJsonIssues(projectPath);
      const metrics = await this.calculatePackageJsonMetrics(projectPath);
      
      const result = {
        success: true,
        packageJsonIssues,
        metrics,
        recommendations: this.generateRecommendations(packageJsonIssues, metrics),
        issues: this.generateIssues(packageJsonIssues),
        tasks: this.generateTasks(packageJsonIssues),
        documentation: this.generateDocumentation(packageJsonIssues, metrics)
      };

      logger.info('✅ Package.json analysis completed successfully');
      return result;

    } catch (error) {
      logger.error('❌ Package.json analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        packageJsonIssues: [],
        metrics: {},
        recommendations: [],
        issues: [],
        tasks: [],
        documentation: []
      };
    }
  }

  async analyzePackageJsonIssues(projectPath) {
    // Placeholder implementation - would analyze actual package.json
    return [
      {
        type: 'missing-description',
        severity: 'medium',
        message: 'Package.json missing description field',
        field: 'description',
        recommendation: 'Add a clear description of the project'
      },
      {
        type: 'missing-keywords',
        severity: 'low',
        message: 'Package.json missing keywords field',
        field: 'keywords',
        recommendation: 'Add relevant keywords for better discoverability'
      }
    ];
  }

  async calculatePackageJsonMetrics(projectPath) {
    // Placeholder implementation
    return {
      hasName: true,
      hasVersion: true,
      hasDescription: false,
      hasKeywords: false,
      hasRepository: true,
      hasLicense: true,
      completeness: 75
    };
  }

  generateRecommendations(packageJsonIssues, metrics) {
    const recommendations = [];
    
    if (!metrics.hasDescription) {
      recommendations.push({
        type: 'metadata',
        priority: 'medium',
        message: 'Add package description for better documentation',
        action: 'Add description field to package.json'
      });
    }
    
    if (!metrics.hasKeywords) {
      recommendations.push({
        type: 'discoverability',
        priority: 'low',
        message: 'Add keywords for better package discoverability',
        action: 'Add keywords array to package.json'
      });
    }
    
    return recommendations;
  }

  generateIssues(packageJsonIssues) {
    return packageJsonIssues.map(issue => ({
      type: 'package-json',
      severity: issue.severity,
      message: issue.message,
      field: issue.field,
      recommendation: issue.recommendation
    }));
  }

  generateTasks(packageJsonIssues) {
    return packageJsonIssues.map(issue => ({
      type: 'update',
      priority: issue.severity === 'high' ? 'high' : 'medium',
      description: `Add ${issue.field} to package.json`,
      field: issue.field,
      estimatedTime: '5 minutes'
    }));
  }

  generateDocumentation(packageJsonIssues, metrics) {
    return [
      {
        type: 'guide',
        title: 'Package.json Best Practices',
        content: 'Follow npm package.json best practices for better discoverability',
        url: '/docs/package-json-best-practices'
      },
      {
        type: 'metrics',
        title: 'Package.json Completeness',
        content: `Package.json completeness: ${metrics.completeness}%`,
        url: '/docs/package-json-metrics'
      }
    ];
  }
}

// Create instance for execution
const stepInstance = new PackageJsonManifestStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 