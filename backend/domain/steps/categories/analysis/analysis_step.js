
/**
 * Analysis Step - Analysis Workflow
 * Integrates all existing analysis services and components
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
const path = require('path'); // Added missing import for path

// Step configuration
const config = {
  name: 'AnalysisStep',
  type: 'analysis',
  description: 'Comprehensive project analysis using all available services',
  category: 'analysis',
  version: '1.0.0',
  dependencies: ['projectAnalyzer', 'codeQualityAnalyzer', 'securityAnalyzer', 'performanceAnalyzer', 'architectureAnalyzer', 'techStackAnalyzer'],
  settings: {
    timeout: 120000,
    parallel: true,
    includeCodeQuality: true,
    includeArchitecture: true,
    includeTechStack: true,
    includeDependencies: true,
    includeRepoStructure: true,
    includeSecurity: true,
    includePerformance: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class AnalysisStep {
  constructor() {
    this.name = 'AnalysisStep';
    this.description = 'Comprehensive project analysis using all available services';
    this.category = 'analysis';
    this.dependencies = ['projectAnalyzer', 'codeQualityAnalyzer', 'securityAnalyzer', 'performanceAnalyzer', 'architectureAnalyzer', 'techStackAnalyzer'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = AnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.log(`🔍 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Get all analysis services from the application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const {
        projectAnalyzer,
        codeQualityAnalyzer,
        securityAnalyzer,
        performanceAnalyzer,
        architectureAnalyzer,
        techStackAnalyzer,
        dependencyAnalyzer,
        analysisOutputService,
        analysisRepository
      } = application;

      const projectPath = context.projectPath;
      const results = {
        projectAnalysis: null,
        codeQuality: null,
        security: null,
        performance: null,
        architecture: null,
        techStack: null,
        dependencies: null,
        summary: null
      };

      logger.log(`📊 Starting analysis for: ${projectPath}`);

      // 1. Project Analysis
      if (projectAnalyzer) {
        const projectAnalysis = await projectAnalyzer.analyzeProject(projectPath, {
          includeRepoStructure: context.includeRepoStructure !== false,
          includeDependencies: context.includeDependencies !== false
        });
        results.projectAnalysis = this.cleanResult(projectAnalysis);
      }

      // 2. Code Quality Analysis
      if (codeQualityAnalyzer && context.includeCodeQuality !== false) {
        const codeQuality = await codeQualityAnalyzer.analyzeCodeQuality(projectPath, {
          includeMetrics: true,
          includeIssues: true,
          includeSuggestions: true
        });
        results.codeQuality = this.cleanResult(codeQuality);
      }

      // 3. Security Analysis
      if (securityAnalyzer && context.includeSecurity !== false) {
        const security = await securityAnalyzer.analyzeSecurity(projectPath, {
          includeVulnerabilities: true,
          includeBestPractices: true,
          includeDependencies: true
        });
        results.security = this.cleanResult(security);
      }

      // 4. Performance Analysis
      if (performanceAnalyzer && context.includePerformance !== false) {
        const performance = await performanceAnalyzer.analyzePerformance(projectPath, {
          includeMetrics: true,
          includeOptimizations: true,
          includeBottlenecks: true
        });
        results.performance = this.cleanResult(performance);
      }

      // 5. Architecture Analysis
      if (architectureAnalyzer && context.includeArchitecture !== false) {
        const architecture = await architectureAnalyzer.analyzeArchitecture(projectPath, {
          includePatterns: true,
          includeStructure: true,
          includeRecommendations: true
        });
        results.architecture = this.cleanResult(architecture);
      }

      // 6. Tech Stack Analysis
      if (techStackAnalyzer && context.includeTechStack !== false) {
        const techStack = await techStackAnalyzer.analyzeTechStack(projectPath, {
          includeFrameworks: true,
          includeLibraries: true,
          includeTools: true
        });
        results.techStack = this.cleanResult(techStack);
      }

      // 7. Dependency Analysis
      if (dependencyAnalyzer && context.includeDependencies !== false) {
        const dependencies = await dependencyAnalyzer.analyzeDependencies(projectPath, {
          includeOutdated: true,
          includeVulnerabilities: true,
          includeRecommendations: true
        });
        results.dependencies = this.cleanResult(dependencies);
        // Store all found dependencies for merging in the controller
        if (dependencies.packages && Array.isArray(dependencies.packages)) {
          results.dependencies.allPackages = dependencies.packages.map(pkg => ({
            context: pkg.path,
            dependencies: pkg.dependencies,
            devDependencies: pkg.devDependencies
          }));
          // Also as packagesByContext for easier merging
          results.dependencies.packagesByContext = {};
          for (const pkg of dependencies.packages) {
            const ctx = pkg.path.replace(projectPath, '').replace(/^\/+/, '') || 'root';
            results.dependencies.packagesByContext[ctx] = {
              dependencies: pkg.dependencies,
              devDependencies: pkg.devDependencies
            };
          }
        }
      }

      // Generate comprehensive summary
      results.summary = this.generateSummary(results);

      // Save results to repository if available
      if (analysisRepository) {
        const AnalysisResult = require('@entities/AnalysisResult');
        
        const startTime = Date.now();
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        
        const analysisResult = AnalysisResult.create(
          context.projectId,
          'comprehensive-analysis',
          results,
          results.summary,
          {
            status: 'completed',
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date(endTime).toISOString(),
            durationMs: durationMs,
            overallScore: results.summary?.overallScore || 0,
            criticalIssuesCount: results.summary?.criticalIssues || 0,
            warningsCount: results.summary?.warnings || 0,
            recommendationsCount: results.summary?.recommendations || 0
          }
        );

        await analysisRepository.save(analysisResult);
        logger.log(`✅ Analysis results saved to repository with ID: ${analysisResult.id}`);
      }

      // Generate output using analysis output service
      if (analysisOutputService && typeof analysisOutputService.generateOutput === 'function') {
        try {
          const output = await analysisOutputService.generateOutput(results, {
            format: 'comprehensive',
            includeRecommendations: true,
            includeActionItems: true
          });
          results.output = output;
        } catch (outputError) {
          logger.warn(`⚠️ Analysis output generation failed: ${outputError.message}`);
          // Continue without output generation
        }
      }

      logger.log(`✅ ${this.name} completed successfully`);
      return {
        success: true,
        step: this.name,
        results: {
          summary: results.summary,
          totalAnalyses: results.summary?.totalAnalyses || 0,
          overallScore: results.summary?.overallScore || 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error.message);
      return {
        success: false,
        step: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clean result object to remove circular references and ensure serializability
   * @param {Object} result - The result object to clean
   * @returns {Object} Cleaned result object
   */
  cleanResult(result) {
    if (!result || typeof result !== 'object') {
      return result;
    }

    // Handle arrays
    if (Array.isArray(result)) {
      return result.map(item => this.cleanResult(item));
    }

    // Handle objects
    const cleaned = {};
    for (const [key, value] of Object.entries(result)) {
      // Skip known circular reference properties
      if (['parent', 'root', '__proto__', 'constructor', 'prototype'].includes(key)) {
        continue;
      }

      // Skip functions
      if (typeof value === 'function') {
        continue;
      }

      // Recursively clean nested objects
      if (value && typeof value === 'object') {
        cleaned[key] = this.cleanResult(value);
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  generateSummary(results) {
    const summary = {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      criticalIssues: 0,
      warnings: 0,
      recommendations: 0,
      overallScore: 0,
      categories: {}
    };

    // Count analyses and issues
    Object.keys(results).forEach(key => {
      if (key !== 'summary' && key !== 'output' && key !== 'analysisId' && results[key]) {
        summary.totalAnalyses++;
        summary.successfulAnalyses++;
        
        const result = results[key];
        if (result.issues) {
          summary.criticalIssues += result.issues.filter(i => i.severity === 'critical').length;
          summary.warnings += result.issues.filter(i => i.severity === 'warning').length;
        }
        
        if (result.recommendations) {
          summary.recommendations += result.recommendations.length;
        }
        
        if (result.score) {
          summary.overallScore += result.score;
        }
        
        summary.categories[key] = {
          hasData: true,
          score: result.score || 0,
          issues: result.issues?.length || 0,
          recommendations: result.recommendations?.length || 0
        };
      }
    });

    // Calculate overall score
    if (summary.successfulAnalyses > 0) {
      summary.overallScore = Math.round(summary.overallScore / summary.successfulAnalyses);
    }

    return summary;
  }

  validateContext(context) {
    const required = ['projectPath'];
    const missing = required.filter(key => !context[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required context: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

// Export for StepRegistry
module.exports = {
  config: AnalysisStep.getConfig(),
  execute: async (context = {}) => {
    const step = new AnalysisStep();
    return await step.execute(context);
  }
}; 