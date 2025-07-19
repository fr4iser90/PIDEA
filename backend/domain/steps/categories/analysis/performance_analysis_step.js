/**
 * Performance Analysis Step - Core Analysis Step
 * Analyzes performance metrics and optimizations
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('performance_analysis_step');

// Step configuration
const config = {
  name: 'PerformanceAnalysisStep',
  type: 'analysis',
  description: 'Analyzes performance metrics and optimizations',
  category: 'analysis',
  version: '1.0.0',
  dependencies: ['performanceAnalyzer'],
  settings: {
    timeout: 60000,
    includeMetrics: true,
    includeOptimizations: true,
    includeBottlenecks: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class PerformanceAnalysisStep {
  constructor() {
    this.name = 'PerformanceAnalysisStep';
    this.description = 'Analyzes performance metrics and optimizations';
    this.category = 'analysis';
    this.dependencies = ['performanceAnalyzer'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = PerformanceAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Get performance analyzer from context or application
      let performanceAnalyzer = context.performanceAnalyzer;
      if (!performanceAnalyzer) {
        const application = global.application;
        if (!application) {
          throw new Error('Application not available and performanceAnalyzer not provided in context');
        }
        performanceAnalyzer = application.performanceAnalyzer;
      }
      
      if (!performanceAnalyzer) {
        throw new Error('Performance analyzer not available');
      }

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting performance analysis for: ${projectPath}`);

      // Execute performance analysis
      const performance = await performanceAnalyzer.analyzePerformance(projectPath, {
        includeMetrics: context.includeMetrics !== false,
        includeOptimizations: context.includeOptimizations !== false,
        includeBottlenecks: context.includeBottlenecks !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(performance);

      logger.info(`✅ Performance analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'performance',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Performance analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'performance',
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
      throw new Error('Project path is required for performance analysis');
    }
  }
}

// Create instance for execution
const stepInstance = new PerformanceAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 