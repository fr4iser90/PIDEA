/**
 * Recommendations Generation Step - Generate actionable recommendations
 * Generates recommendations based on analysis results from other steps
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('recommendations_step');

// Step configuration
const config = {
  name: 'RecommendationsStep',
  type: 'generate',
  description: 'Generates actionable recommendations based on analysis results',
  category: 'generate',
  version: '1.0.0',
  dependencies: ['analysis_results'],
  settings: {
    timeout: 30000,
    includePriority: true,
    includeEffort: true,
    includeImpact: true,
    maxRecommendations: 20
  },
  validation: {
    requiredInputs: ['analysis_results'],
    supportedTypes: ['security', 'code-quality', 'architecture', 'performance', 'tech-stack', 'manifest', 'dependencies']
  }
};

class RecommendationsStep {
  constructor() {
    this.logger = logger;
  }

  /**
   * Execute recommendations generation
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Recommendations results
   */
  async execute(context) {
    try {
      this.logger.info('Starting recommendations generation');
      
      const { analysis_results, projectPath, options = {} } = context;
      
      if (!analysis_results) {
        throw new Error('Analysis results required for recommendations generation');
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

      // Generate recommendations from each analysis type
      const securityRecs = await this._generateSecurityRecommendations(analysis_results.security);
      const qualityRecs = await this._generateCodeQualityRecommendations(analysis_results.codeQuality);
      const architectureRecs = await this._generateArchitectureRecommendations(analysis_results.architecture);
      const performanceRecs = await this._generatePerformanceRecommendations(analysis_results.performance);
      const techStackRecs = await this._generateTechStackRecommendations(analysis_results.techStack);
      const manifestRecs = await this._generateManifestRecommendations(analysis_results.manifest);
      const dependencyRecs = await this._generateDependencyRecommendations(analysis_results.dependencies);

      // Combine all recommendations
      recommendations.recommendations = [
        ...securityRecs,
        ...qualityRecs,
        ...architectureRecs,
        ...performanceRecs,
        ...techStackRecs,
        ...manifestRecs,
        ...dependencyRecs
      ];

      // Generate insights
      recommendations.insights = await this._generateInsights(recommendations.recommendations);

      // Calculate metadata
      recommendations.metadata = this._calculateMetadata(recommendations.recommendations);

      // Generate summary
      recommendations.summary = this._generateSummary(recommendations.metadata);

      this.logger.info(`Generated ${recommendations.recommendations.length} recommendations`);
      
      return recommendations;
    } catch (error) {
      this.logger.error('Recommendations generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate security recommendations
   */
  async _generateSecurityRecommendations(securityAnalysis) {
    if (!securityAnalysis) return [];

    const recommendations = [];

    // Vulnerabilities
    if (securityAnalysis.vulnerabilities && securityAnalysis.vulnerabilities.length > 0) {
      const criticalVulns = securityAnalysis.vulnerabilities.filter(v => v.severity === 'critical');
      const highVulns = securityAnalysis.vulnerabilities.filter(v => v.severity === 'high');

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
          tags: ['security', 'vulnerabilities', 'critical']
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
          tags: ['security', 'vulnerabilities', 'high']
        });
      }
    }

    // Security configuration
    if (securityAnalysis.configuration && securityAnalysis.configuration.missingSecurity) {
      recommendations.push({
        title: 'Implement Security Middleware',
        description: `Missing security configurations: ${securityAnalysis.configuration.missingSecurity.join(', ')}`,
        priority: 'high',
        category: 'security',
        effort: 'medium',
        impact: 'high',
        action: 'Add helmet, cors, and other security middleware',
        estimatedTime: '4-6 hours',
        tags: ['security', 'configuration', 'middleware']
      });
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
        tags: ['security', 'secrets', 'environment']
      });
    }

    return recommendations;
  }

  /**
   * Generate code quality recommendations
   */
  async _generateCodeQualityRecommendations(codeQualityAnalysis) {
    if (!codeQualityAnalysis) return [];

    const recommendations = [];

    // Linting configuration
    if (codeQualityAnalysis.configuration && !codeQualityAnalysis.configuration.linting?.hasESLint) {
      recommendations.push({
        title: 'Add ESLint Configuration',
        description: 'No ESLint configuration found',
        priority: 'high',
        category: 'code-quality',
        effort: 'low',
        impact: 'medium',
        action: 'Install and configure ESLint for code quality',
        estimatedTime: '1-2 hours',
        tags: ['linting', 'eslint', 'code-quality']
      });
    }

    // Code complexity
    if (codeQualityAnalysis.metrics?.complexity) {
      const highComplexity = Object.entries(codeQualityAnalysis.metrics.complexity.cyclomaticComplexity)
        .filter(([file, complexity]) => complexity > 10);

      if (highComplexity.length > 0) {
        recommendations.push({
          title: 'Reduce Code Complexity',
          description: `${highComplexity.length} files have high cyclomatic complexity`,
          priority: 'medium',
          category: 'code-quality',
          effort: 'high',
          impact: 'medium',
          action: 'Refactor complex functions to improve maintainability',
          estimatedTime: `${highComplexity.length * 2} hours`,
          tags: ['complexity', 'refactoring', 'maintainability']
        });
      }
    }

    // Testing
    if (codeQualityAnalysis.metrics?.testability && !codeQualityAnalysis.metrics.testability.hasTests) {
      recommendations.push({
        title: 'Add Unit Tests',
        description: 'No test files found in the project',
        priority: 'high',
        category: 'code-quality',
        effort: 'high',
        impact: 'high',
        action: 'Implement comprehensive unit tests',
        estimatedTime: '8-16 hours',
        tags: ['testing', 'unit-tests', 'quality']
      });
    }

    return recommendations;
  }

  /**
   * Generate architecture recommendations
   */
  async _generateArchitectureRecommendations(architectureAnalysis) {
    if (!architectureAnalysis) return [];

    const recommendations = [];

    // Pattern detection
    if (architectureAnalysis.detectedPatterns && architectureAnalysis.detectedPatterns.length === 0) {
      recommendations.push({
        title: 'Implement Architectural Pattern',
        description: 'No clear architectural pattern detected',
        priority: 'high',
        category: 'architecture',
        effort: 'high',
        impact: 'high',
        action: 'Consider implementing MVC, DDD, or CQRS pattern',
        estimatedTime: '16-24 hours',
        tags: ['architecture', 'pattern', 'design']
      });
    }

    // Circular dependencies
    if (architectureAnalysis.dependencies?.circularDependencies && architectureAnalysis.dependencies.circularDependencies.length > 0) {
      recommendations.push({
        title: 'Remove Circular Dependencies',
        description: `${architectureAnalysis.dependencies.circularDependencies.length} circular dependencies found`,
        priority: 'high',
        category: 'architecture',
        effort: 'medium',
        impact: 'high',
        action: 'Refactor to eliminate circular dependencies',
        estimatedTime: `${architectureAnalysis.dependencies.circularDependencies.length * 3} hours`,
        tags: ['dependencies', 'circular', 'refactoring']
      });
    }

    // Violations
    if (architectureAnalysis.violations && architectureAnalysis.violations.length > 0) {
      const criticalViolations = architectureAnalysis.violations.filter(v => v.severity === 'critical');
      
      if (criticalViolations.length > 0) {
        recommendations.push({
          title: 'Fix Critical Architecture Violations',
          description: `${criticalViolations.length} critical architecture violations detected`,
          priority: 'critical',
          category: 'architecture',
          effort: 'high',
          impact: 'critical',
          action: 'Address critical architecture violations immediately',
          estimatedTime: `${criticalViolations.length * 4} hours`,
          tags: ['architecture', 'violations', 'critical']
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate performance recommendations
   */
  async _generatePerformanceRecommendations(performanceAnalysis) {
    if (!performanceAnalysis) return [];

    const recommendations = [];

    // Performance issues
    if (performanceAnalysis.issues && performanceAnalysis.issues.length > 0) {
      const criticalIssues = performanceAnalysis.issues.filter(i => i.severity === 'critical');
      const highIssues = performanceAnalysis.issues.filter(i => i.severity === 'high');

      if (criticalIssues.length > 0) {
        recommendations.push({
          title: 'Fix Critical Performance Issues',
          description: `${criticalIssues.length} critical performance issues detected`,
          priority: 'critical',
          category: 'performance',
          effort: 'high',
          impact: 'critical',
          action: 'Address critical performance bottlenecks',
          estimatedTime: `${criticalIssues.length * 3} hours`,
          tags: ['performance', 'bottlenecks', 'critical']
        });
      }

      if (highIssues.length > 0) {
        recommendations.push({
          title: 'Optimize Performance',
          description: `${highIssues.length} high priority performance issues found`,
          priority: 'high',
          category: 'performance',
          effort: 'medium',
          impact: 'high',
          action: 'Optimize identified performance issues',
          estimatedTime: `${highIssues.length * 2} hours`,
          tags: ['performance', 'optimization', 'high']
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate tech stack recommendations
   */
  async _generateTechStackRecommendations(techStackAnalysis) {
    if (!techStackAnalysis) return [];

    const recommendations = [];

    // TypeScript recommendation
    if (techStackAnalysis.languages && techStackAnalysis.languages.includes('JavaScript') && !techStackAnalysis.languages.includes('TypeScript')) {
      recommendations.push({
        title: 'Migrate to TypeScript',
        description: 'Consider adding TypeScript for better type safety',
        priority: 'medium',
        category: 'tech-stack',
        effort: 'high',
        impact: 'medium',
        action: 'Gradually migrate JavaScript files to TypeScript',
        estimatedTime: '24-48 hours',
        tags: ['typescript', 'migration', 'type-safety']
      });
    }

    // Testing framework
    if (techStackAnalysis.tools && !techStackAnalysis.tools.some(t => ['jest', 'mocha', 'vitest'].includes(t.name.toLowerCase()))) {
      recommendations.push({
        title: 'Add Testing Framework',
        description: 'No testing framework detected',
        priority: 'high',
        category: 'tech-stack',
        effort: 'medium',
        impact: 'high',
        action: 'Implement Jest or Vitest for testing',
        estimatedTime: '4-8 hours',
        tags: ['testing', 'framework', 'quality']
      });
    }

    return recommendations;
  }

  /**
   * Generate manifest recommendations
   */
  async _generateManifestRecommendations(manifestAnalysis) {
    if (!manifestAnalysis) return [];

    const recommendations = [];

    // Missing configuration files
    if (manifestAnalysis.missingConfigs && manifestAnalysis.missingConfigs.length > 0) {
      recommendations.push({
        title: 'Add Missing Configuration Files',
        description: `Missing: ${manifestAnalysis.missingConfigs.join(', ')}`,
        priority: 'medium',
        category: 'manifest',
        effort: 'low',
        impact: 'medium',
        action: 'Create missing configuration files',
        estimatedTime: `${manifestAnalysis.missingConfigs.length * 0.5} hours`,
        tags: ['configuration', 'manifest', 'setup']
      });
    }

    return recommendations;
  }

  /**
   * Generate dependency recommendations
   */
  async _generateDependencyRecommendations(dependencyAnalysis) {
    if (!dependencyAnalysis) return [];

    const recommendations = [];

    // Outdated dependencies
    if (dependencyAnalysis.outdated && dependencyAnalysis.outdated.length > 0) {
      recommendations.push({
        title: 'Update Outdated Dependencies',
        description: `${dependencyAnalysis.outdated.length} outdated packages found`,
        priority: 'medium',
        category: 'dependencies',
        effort: 'medium',
        impact: 'medium',
        action: 'Update dependencies to latest stable versions',
        estimatedTime: `${dependencyAnalysis.outdated.length * 0.5} hours`,
        tags: ['dependencies', 'updates', 'maintenance']
      });
    }

    // Unused dependencies
    if (dependencyAnalysis.unused && dependencyAnalysis.unused.length > 0) {
      recommendations.push({
        title: 'Remove Unused Dependencies',
        description: `${dependencyAnalysis.unused.length} unused packages detected`,
        priority: 'low',
        category: 'dependencies',
        effort: 'low',
        impact: 'low',
        action: 'Remove unused dependencies to reduce bundle size',
        estimatedTime: `${dependencyAnalysis.unused.length * 0.25} hours`,
        tags: ['dependencies', 'cleanup', 'optimization']
      });
    }

    return recommendations;
  }

  /**
   * Generate insights from recommendations
   */
  async _generateInsights(recommendations) {
    const insights = [];

    // Priority distribution
    const priorityCounts = recommendations.reduce((acc, rec) => {
      acc[rec.priority] = (acc[rec.priority] || 0) + 1;
      return acc;
    }, {});

    if (priorityCounts.critical > 0) {
      insights.push({
        type: 'critical-alert',
        message: `${priorityCounts.critical} critical issues require immediate attention`,
        severity: 'critical'
      });
    }

    if (priorityCounts.high > 5) {
      insights.push({
        type: 'high-volume',
        message: `${priorityCounts.high} high priority issues suggest systematic problems`,
        severity: 'high'
      });
    }

    // Category distribution
    const categoryCounts = recommendations.reduce((acc, rec) => {
      acc[rec.category] = (acc[rec.category] || 0) + 1;
      return acc;
    }, {});

    const topCategory = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (topCategory) {
      insights.push({
        type: 'category-focus',
        message: `${topCategory[0]} has the most issues (${topCategory[1]})`,
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
      return `${criticalCount} critical issues require immediate attention. ${highCount} high priority issues need addressing.`;
    } else if (highCount > 0) {
      return `${highCount} high priority issues should be addressed soon.`;
    } else if (totalRecommendations > 0) {
      return `${totalRecommendations} recommendations for improvement identified.`;
    } else {
      return 'No specific recommendations at this time.';
    }
  }
}

// Create instance for execution
const stepInstance = new RecommendationsStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 