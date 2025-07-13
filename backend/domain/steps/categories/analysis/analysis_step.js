
/**
 * Analysis Step - Analysis Workflow
 * Integrates all existing analysis services and components
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

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

      logger.log(`📊 Starting comprehensive analysis for: ${projectPath}`);

      // 1. Project Analysis
      if (projectAnalyzer) {
        logger.log('🔍 Running project analysis...');
        results.projectAnalysis = await projectAnalyzer.analyzeProject(projectPath, {
          includeRepoStructure: context.includeRepoStructure !== false,
          includeDependencies: context.includeDependencies !== false
        });
      }

      // 2. Code Quality Analysis
      if (codeQualityAnalyzer && context.includeCodeQuality !== false) {
        logger.log('🎯 Running code quality analysis...');
        results.codeQuality = await codeQualityAnalyzer.analyzeCodeQuality(projectPath, {
          includeMetrics: true,
          includeIssues: true,
          includeSuggestions: true
        });
      }

      // 3. Security Analysis
      if (securityAnalyzer && context.includeSecurity !== false) {
        logger.log('🔒 Running security analysis...');
        results.security = await securityAnalyzer.analyzeSecurity(projectPath, {
          includeVulnerabilities: true,
          includeBestPractices: true,
          includeDependencies: true
        });
      }

      // 4. Performance Analysis
      if (performanceAnalyzer && context.includePerformance !== false) {
        logger.log('⚡ Running performance analysis...');
        results.performance = await performanceAnalyzer.analyzePerformance(projectPath, {
          includeMetrics: true,
          includeOptimizations: true,
          includeBottlenecks: true
        });
      }

      // 5. Architecture Analysis
      if (architectureAnalyzer && context.includeArchitecture !== false) {
        logger.log('🏗️ Running architecture analysis...');
        results.architecture = await architectureAnalyzer.analyzeArchitecture(projectPath, {
          includePatterns: true,
          includeStructure: true,
          includeRecommendations: true
        });
      }

      // 6. Tech Stack Analysis
      if (techStackAnalyzer && context.includeTechStack !== false) {
        logger.log('🛠️ Running tech stack analysis...');
        results.techStack = await techStackAnalyzer.analyzeTechStack(projectPath, {
          includeFrameworks: true,
          includeLibraries: true,
          includeTools: true
        });
      }

      // 7. Dependency Analysis
      if (dependencyAnalyzer && context.includeDependencies !== false) {
        logger.log('📦 Running dependency analysis...');
        results.dependencies = await dependencyAnalyzer.analyzeDependencies(projectPath, {
          includeOutdated: true,
          includeVulnerabilities: true,
          includeRecommendations: true
        });
      }

      // Generate comprehensive summary
      results.summary = this.generateSummary(results);

      // Save results to repository if available
      if (analysisRepository) {
        const analysisId = await analysisRepository.save({
          projectPath,
          results,
          timestamp: new Date(),
          userId: context.userId || 'system'
        });
        results.analysisId = analysisId;
      }

      // Generate output using analysis output service
      if (analysisOutputService) {
        const output = await analysisOutputService.generateOutput(results, {
          format: 'comprehensive',
          includeRecommendations: true,
          includeActionItems: true
        });
        results.output = output;
      }

      logger.log(`✅ ${this.name} completed successfully`);
      return {
        success: true,
        step: this.name,
        results: results,
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