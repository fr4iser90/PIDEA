/**
 * Code Quality Recommendations Step - Generate code quality-focused recommendations
 * Generates code quality recommendations based on code quality analysis results
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('code_quality_recommendations_step');

// Step configuration
const config = {
  name: 'CodeQualityRecommendationsStep',
  type: 'generate',
  description: 'Generates code quality-focused recommendations based on code quality analysis',
  category: 'generate',
  version: '1.0.0',
  dependencies: ['code_quality_analysis'],
  settings: {
    timeout: 15000,
    includePriority: true,
    includeEffort: true,
    includeImpact: true,
    maxRecommendations: 10
  },
  validation: {
    requiredInputs: ['code_quality_analysis'],
    supportedTypes: ['linting', 'complexity', 'testing', 'maintainability', 'formatting']
  }
};

class CodeQualityRecommendationsStep {
  constructor() {
    this.logger = logger;
  }

  /**
   * Execute code quality recommendations generation
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Code quality recommendations results
   */
  async execute(context) {
    try {
      this.logger.info('Starting code quality recommendations generation');
      
      const { code_quality_analysis, projectPath, options = {} } = context;
      
      if (!code_quality_analysis) {
        throw new Error('Code quality analysis required for code quality recommendations generation');
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

      // Generate code quality recommendations
      recommendations.recommendations = await this._generateCodeQualityRecommendations(code_quality_analysis);

      // Generate insights
      recommendations.insights = await this._generateInsights(recommendations.recommendations);

      // Calculate metadata
      recommendations.metadata = this._calculateMetadata(recommendations.recommendations);

      // Generate summary
      recommendations.summary = this._generateSummary(recommendations.metadata);

      this.logger.info(`Generated ${recommendations.recommendations.length} code quality recommendations`);
      
      return recommendations;
    } catch (error) {
      this.logger.error('Code quality recommendations generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate code quality recommendations
   */
  async _generateCodeQualityRecommendations(codeQualityAnalysis) {
    const recommendations = [];

    // Linting configuration
    if (codeQualityAnalysis.configuration) {
      if (!codeQualityAnalysis.configuration.linting?.hasESLint) {
        recommendations.push({
          title: 'Add ESLint Configuration',
          description: 'No ESLint configuration found',
          priority: 'high',
          category: 'code-quality',
          effort: 'low',
          impact: 'medium',
          action: 'Install and configure ESLint for code quality',
          estimatedTime: '1-2 hours',
          tags: ['linting', 'eslint', 'code-quality'],
          details: {
            missing: 'ESLint configuration',
            benefit: 'Automated code quality checks',
            setup: 'npm install eslint --save-dev && npx eslint --init'
          }
        });
      }

      if (!codeQualityAnalysis.configuration.formatting?.hasPrettier) {
        recommendations.push({
          title: 'Add Prettier Configuration',
          description: 'No Prettier configuration found',
          priority: 'medium',
          category: 'code-quality',
          effort: 'low',
          impact: 'medium',
          action: 'Install and configure Prettier for consistent formatting',
          estimatedTime: '30 minutes',
          tags: ['formatting', 'prettier', 'code-quality'],
          details: {
            missing: 'Prettier configuration',
            benefit: 'Consistent code formatting',
            setup: 'npm install prettier --save-dev'
          }
        });
      }
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
          tags: ['complexity', 'refactoring', 'maintainability'],
          details: {
            files: highComplexity.map(([file, complexity]) => ({
              file,
              complexity,
              threshold: 10
            })),
            benefit: 'Improved code maintainability and testability'
          }
        });
      }

      const veryHighComplexity = Object.entries(codeQualityAnalysis.metrics.complexity.cyclomaticComplexity)
        .filter(([file, complexity]) => complexity > 20);

      if (veryHighComplexity.length > 0) {
        recommendations.push({
          title: 'Address Very High Code Complexity',
          description: `${veryHighComplexity.length} files have very high cyclomatic complexity (>20)`,
          priority: 'high',
          category: 'code-quality',
          effort: 'high',
          impact: 'high',
          action: 'Urgently refactor very complex functions',
          estimatedTime: `${veryHighComplexity.length * 4} hours`,
          tags: ['complexity', 'refactoring', 'critical'],
          details: {
            files: veryHighComplexity.map(([file, complexity]) => ({
              file,
              complexity,
              threshold: 20
            })),
            benefit: 'Critical for maintainability and bug prevention'
          }
        });
      }
    }

    // Testing
    if (codeQualityAnalysis.metrics?.testability) {
      if (!codeQualityAnalysis.metrics.testability.hasTests) {
        recommendations.push({
          title: 'Add Unit Tests',
          description: 'No test files found in the project',
          priority: 'high',
          category: 'code-quality',
          effort: 'high',
          impact: 'high',
          action: 'Implement comprehensive unit tests',
          estimatedTime: '8-16 hours',
          tags: ['testing', 'unit-tests', 'quality'],
          details: {
            missing: 'Test files',
            benefit: 'Improved code reliability and maintainability',
            setup: 'npm install jest --save-dev'
          }
        });
      } else if (codeQualityAnalysis.metrics.testability.coverage < 80) {
        recommendations.push({
          title: 'Improve Test Coverage',
          description: `Test coverage is ${codeQualityAnalysis.metrics.testability.coverage}% (target: 80%)`,
          priority: 'medium',
          category: 'code-quality',
          effort: 'medium',
          impact: 'medium',
          action: 'Add more tests to improve coverage',
          estimatedTime: '4-8 hours',
          tags: ['testing', 'coverage', 'quality'],
          details: {
            currentCoverage: codeQualityAnalysis.metrics.testability.coverage,
            targetCoverage: 80,
            benefit: 'Better code reliability and confidence'
          }
        });
      }
    }

    // Maintainability
    if (codeQualityAnalysis.metrics?.maintainability) {
      if (codeQualityAnalysis.metrics.maintainability.largeFiles && codeQualityAnalysis.metrics.maintainability.largeFiles.length > 0) {
        recommendations.push({
          title: 'Split Large Files',
          description: `${codeQualityAnalysis.metrics.maintainability.largeFiles.length} files are too large`,
          priority: 'medium',
          category: 'code-quality',
          effort: 'medium',
          impact: 'medium',
          action: 'Split large files into smaller, focused modules',
          estimatedTime: `${codeQualityAnalysis.metrics.maintainability.largeFiles.length * 2} hours`,
          tags: ['maintainability', 'refactoring', 'structure'],
          details: {
            files: codeQualityAnalysis.metrics.maintainability.largeFiles,
            benefit: 'Improved maintainability and readability'
          }
        });
      }
    }

    // Code smells
    if (codeQualityAnalysis.issues && codeQualityAnalysis.issues.length > 0) {
      const consoleLogIssues = codeQualityAnalysis.issues.filter(i => i.type === 'console-log');
      if (consoleLogIssues.length > 0) {
        recommendations.push({
          title: 'Remove Console Logs',
          description: `${consoleLogIssues.length} console.log statements found in code`,
          priority: 'low',
          category: 'code-quality',
          effort: 'low',
          impact: 'low',
          action: 'Replace console.log with proper logging',
          estimatedTime: `${consoleLogIssues.length * 0.1} hours`,
          tags: ['smell', 'logging', 'cleanup'],
          details: {
            count: consoleLogIssues.length,
            benefit: 'Cleaner production code',
            action: 'Use proper logging library'
          }
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate insights from code quality recommendations
   */
  async _generateInsights(recommendations) {
    const insights = [];

    // High priority quality issues
    const highCount = recommendations.filter(r => r.priority === 'high').length;
    if (highCount > 0) {
      insights.push({
        type: 'high-quality-issues',
        message: `${highCount} high priority code quality issues need attention`,
        severity: 'high'
      });
    }

    // Testing focus
    const testingRecs = recommendations.filter(r => r.tags.includes('testing'));
    if (testingRecs.length > 0) {
      insights.push({
        type: 'testing-focus',
        message: `${testingRecs.length} testing-related recommendations found`,
        severity: 'medium'
      });
    }

    // Complexity focus
    const complexityRecs = recommendations.filter(r => r.tags.includes('complexity'));
    if (complexityRecs.length > 0) {
      insights.push({
        type: 'complexity-focus',
        message: `${complexityRecs.length} complexity-related recommendations found`,
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
    const { totalRecommendations, highCount, mediumCount } = metadata;
    
    if (highCount > 0) {
      return `${highCount} high priority code quality issues need attention. ${mediumCount} medium priority issues should be addressed.`;
    } else if (mediumCount > 0) {
      return `${mediumCount} medium priority code quality issues should be addressed.`;
    } else if (totalRecommendations > 0) {
      return `${totalRecommendations} code quality recommendations for improvement identified.`;
    } else {
      return 'No specific code quality recommendations at this time.';
    }
  }
}

// Create instance for execution
const stepInstance = new CodeQualityRecommendationsStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 