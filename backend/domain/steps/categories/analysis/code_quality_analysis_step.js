/**
 * Code Quality Analysis Step - Core Analysis Step
 * Analyzes code quality metrics and issues
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('code_quality_analysis_step');

// Step configuration
const config = {
  name: 'CodeQualityAnalysisStep',
  type: 'analysis',
  description: 'Analyzes code quality metrics and issues',
  category: 'analysis',
  version: '1.0.0',
  dependencies: ['codeQualityAnalyzer'],
  settings: {
    timeout: 60000,
    includeMetrics: true,
    includeIssues: true,
    includeSuggestions: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class CodeQualityAnalysisStep {
  constructor() {
    this.name = 'CodeQualityAnalysisStep';
    this.description = 'Analyzes code quality metrics and issues';
    this.category = 'analysis';
    this.dependencies = ['codeQualityAnalyzer'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = CodeQualityAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`📊 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Get code quality analyzer from application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const { codeQualityAnalyzer } = application;
      if (!codeQualityAnalyzer) {
        throw new Error('Code quality analyzer not available');
      }

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting code quality analysis for: ${projectPath}`);

      // Execute code quality analysis
      const codeQuality = await codeQualityAnalyzer.analyzeCodeQuality(projectPath, {
        includeMetrics: context.includeMetrics !== false,
        includeIssues: context.includeIssues !== false,
        includeSuggestions: context.includeSuggestions !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(codeQuality);

      logger.info(`✅ Code quality analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'code-quality',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Code quality analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'code-quality',
          timestamp: new Date()
        }
      };
    }
  }

  cleanResult(result) {
    if (!result) return null;
    
    // Remove sensitive information and large objects
    const clean = { ...result };
    
    // Remove internal properties
    delete clean._internal;
    delete clean.debug;
    
    return clean;
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for code quality analysis');
    }
  }
}

module.exports = CodeQualityAnalysisStep; 