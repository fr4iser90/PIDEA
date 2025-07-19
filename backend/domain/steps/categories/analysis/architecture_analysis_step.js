/**
 * Architecture Analysis Step - Core Analysis Step
 * Analyzes architecture patterns and structure
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('architecture_analysis_step');

// Step configuration
const config = {
  name: 'ArchitectureAnalysisStep',
  type: 'analysis',
  description: 'Analyzes architecture patterns and structure',
  category: 'analysis',
  version: '1.0.0',
  dependencies: ['architectureAnalyzer'],
  settings: {
    timeout: 45000,
    includePatterns: true,
    includeStructure: true,
    includeRecommendations: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class ArchitectureAnalysisStep {
  constructor() {
    this.name = 'ArchitectureAnalysisStep';
    this.description = 'Analyzes architecture patterns and structure';
    this.category = 'analysis';
    this.dependencies = ['architectureAnalyzer'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ArchitectureAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🏗️ Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Get architecture analyzer from context or application
      let architectureAnalyzer = context.architectureAnalyzer;
      if (!architectureAnalyzer) {
        const application = global.application;
        if (!application) {
          throw new Error('Application not available and architectureAnalyzer not provided in context');
        }
        architectureAnalyzer = application.architectureAnalyzer;
      }
      
      if (!architectureAnalyzer) {
        throw new Error('Architecture analyzer not available');
      }

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting architecture analysis for: ${projectPath}`);

      // Execute architecture analysis
      const architecture = await architectureAnalyzer.analyzeArchitecture(projectPath, {
        includePatterns: context.includePatterns !== false,
        includeStructure: context.includeStructure !== false,
        includeRecommendations: context.includeRecommendations !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(architecture);

      logger.info(`✅ Architecture analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'architecture',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Architecture analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'architecture',
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
      throw new Error('Project path is required for architecture analysis');
    }
  }
}

// Create instance for execution
const stepInstance = new ArchitectureAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 