/**
 * Architecture Recommendations Step - Generate architecture-focused recommendations
 * Generates architecture recommendations based on architecture analysis results
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('architecture_recommendations_step');

// Step configuration
const config = {
  name: 'ArchitectureRecommendationsStep',
  type: 'generate',
  description: 'Generates architecture-focused recommendations based on architecture analysis',
  category: 'generate',
  version: '1.0.0',
  dependencies: ['architecture_analysis'],
  settings: {
    timeout: 15000,
    includePriority: true,
    includeEffort: true,
    includeImpact: true,
    maxRecommendations: 10
  },
  validation: {
    requiredInputs: ['architecture_analysis'],
    supportedTypes: ['patterns', 'dependencies', 'violations', 'structure', 'coupling']
  }
};

class ArchitectureRecommendationsStep {
  constructor() {
    this.logger = logger;
  }

  /**
   * Execute architecture recommendations generation
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Architecture recommendations results
   */
  async execute(context) {
    try {
      this.logger.info('Starting architecture recommendations generation');
      
      const { architecture_analysis, projectPath, options = {} } = context;
      
      if (!architecture_analysis) {
        throw new Error('Architecture analysis required for architecture recommendations generation');
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

      // Generate architecture recommendations
      recommendations.recommendations = await this._generateArchitectureRecommendations(architecture_analysis);

      // Generate insights
      recommendations.insights = await this._generateInsights(recommendations.recommendations);

      // Calculate metadata
      recommendations.metadata = this._calculateMetadata(recommendations.recommendations);

      // Generate summary
      recommendations.summary = this._generateSummary(recommendations.metadata);

      this.logger.info(`Generated ${recommendations.recommendations.length} architecture recommendations`);
      
      return recommendations;
    } catch (error) {
      this.logger.error('Architecture recommendations generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate architecture recommendations
   */
  async _generateArchitectureRecommendations(architectureAnalysis) {
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
        tags: ['architecture', 'pattern', 'design'],
        details: {
          missing: 'Architectural pattern',
          suggestions: ['MVC', 'DDD', 'CQRS', 'Clean Architecture'],
          benefit: 'Improved code organization and maintainability'
        }
      });
    } else if (architectureAnalysis.detectedPatterns && architectureAnalysis.detectedPatterns.length > 1) {
      recommendations.push({
        title: 'Consolidate Architectural Patterns',
        description: `${architectureAnalysis.detectedPatterns.length} different patterns detected`,
        priority: 'medium',
        category: 'architecture',
        effort: 'high',
        impact: 'medium',
        action: 'Standardize on a single architectural pattern',
        estimatedTime: '8-16 hours',
        tags: ['architecture', 'pattern', 'consolidation'],
        details: {
          patterns: architectureAnalysis.detectedPatterns,
          benefit: 'Consistent architecture across the codebase'
        }
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
        tags: ['dependencies', 'circular', 'refactoring'],
        details: {
          circularDependencies: architectureAnalysis.dependencies.circularDependencies,
          benefit: 'Improved modularity and testability'
        }
      });
    }

    // Violations
    if (architectureAnalysis.violations && architectureAnalysis.violations.length > 0) {
      const criticalViolations = architectureAnalysis.violations.filter(v => v.severity === 'critical');
      const highViolations = architectureAnalysis.violations.filter(v => v.severity === 'high');
      
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
          tags: ['architecture', 'violations', 'critical'],
          details: {
            violations: criticalViolations,
            benefit: 'Maintain architectural integrity'
          }
        });
      }

      if (highViolations.length > 0) {
        recommendations.push({
          title: 'Address High Priority Architecture Violations',
          description: `${highViolations.length} high priority architecture violations detected`,
          priority: 'high',
          category: 'architecture',
          effort: 'medium',
          impact: 'high',
          action: 'Address high priority architecture violations',
          estimatedTime: `${highViolations.length * 2} hours`,
          tags: ['architecture', 'violations', 'high'],
          details: {
            violations: highViolations,
            benefit: 'Improved architectural consistency'
          }
        });
      }
    }

    // Coupling analysis
    if (architectureAnalysis.coupling) {
      const highInstability = Object.entries(architectureAnalysis.coupling.instability || {})
        .filter(([module, instability]) => instability > 0.7);
      
      if (highInstability.length > 0) {
        recommendations.push({
          title: 'Reduce Module Instability',
          description: `${highInstability.length} modules have high instability`,
          priority: 'medium',
          category: 'architecture',
          effort: 'high',
          impact: 'medium',
          action: 'Refactor modules to reduce coupling',
          estimatedTime: `${highInstability.length * 3} hours`,
          tags: ['coupling', 'instability', 'refactoring'],
          details: {
            unstableModules: highInstability.map(([module, instability]) => ({
              module,
              instability,
              threshold: 0.7
            })),
            benefit: 'Improved module stability and maintainability'
          }
        });
      }

      const highCoupling = Object.entries(architectureAnalysis.coupling.afferentCoupling || {})
        .filter(([module, coupling]) => coupling > 10);
      
      if (highCoupling.length > 0) {
        recommendations.push({
          title: 'Reduce High Coupling',
          description: `${highCoupling.length} modules have high coupling`,
          priority: 'medium',
          category: 'architecture',
          effort: 'medium',
          impact: 'medium',
          action: 'Refactor to reduce module coupling',
          estimatedTime: `${highCoupling.length * 2} hours`,
          tags: ['coupling', 'refactoring', 'modularity'],
          details: {
            highCouplingModules: highCoupling.map(([module, coupling]) => ({
              module,
              coupling,
              threshold: 10
            })),
            benefit: 'Improved modularity and testability'
          }
        });
      }
    }

    // Layer violations
    if (architectureAnalysis.layerViolations && architectureAnalysis.layerViolations.length > 0) {
      recommendations.push({
        title: 'Fix Layer Violations',
        description: `${architectureAnalysis.layerViolations.length} layer violations detected`,
        priority: 'high',
        category: 'architecture',
        effort: 'medium',
        impact: 'high',
        action: 'Fix layer boundary violations',
        estimatedTime: `${architectureAnalysis.layerViolations.length * 2} hours`,
        tags: ['layers', 'violations', 'boundaries'],
        details: {
          violations: architectureAnalysis.layerViolations,
          benefit: 'Maintain proper layer separation'
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate insights from architecture recommendations
   */
  async _generateInsights(recommendations) {
    const insights = [];

    // Critical architecture issues
    const criticalCount = recommendations.filter(r => r.priority === 'critical').length;
    if (criticalCount > 0) {
      insights.push({
        type: 'critical-architecture-alert',
        message: `${criticalCount} critical architecture issues require immediate attention`,
        severity: 'critical'
      });
    }

    // High priority architecture issues
    const highCount = recommendations.filter(r => r.priority === 'high').length;
    if (highCount > 0) {
      insights.push({
        type: 'high-architecture-issues',
        message: `${highCount} high priority architecture issues need attention`,
        severity: 'high'
      });
    }

    // Pattern focus
    const patternRecs = recommendations.filter(r => r.tags.includes('pattern'));
    if (patternRecs.length > 0) {
      insights.push({
        type: 'pattern-focus',
        message: `${patternRecs.length} architectural pattern recommendations found`,
        severity: 'medium'
      });
    }

    // Dependency focus
    const dependencyRecs = recommendations.filter(r => r.tags.includes('dependencies'));
    if (dependencyRecs.length > 0) {
      insights.push({
        type: 'dependency-focus',
        message: `${dependencyRecs.length} dependency-related recommendations found`,
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
      return `${criticalCount} critical architecture issues require immediate attention. ${highCount} high priority issues need addressing.`;
    } else if (highCount > 0) {
      return `${highCount} high priority architecture issues should be addressed soon.`;
    } else if (totalRecommendations > 0) {
      return `${totalRecommendations} architecture recommendations for improvement identified.`;
    } else {
      return 'No specific architecture recommendations at this time.';
    }
  }
}

// Create instance for execution
const stepInstance = new ArchitectureRecommendationsStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 