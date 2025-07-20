/**
 * Tech Stack Analysis Step - Core Analysis Step
 * Analyzes technology stack and frameworks
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('tech_stack_analysis_step');

// Step configuration
const config = {
  name: 'TechStackAnalysisStep',
  type: 'analysis',
  description: 'Analyzes technology stack and frameworks',
  category: 'analysis',
  version: '1.0.0',
  dependencies: ['techStackAnalyzer'],
  settings: {
    timeout: 30000,
    includeFrameworks: true,
    includeLibraries: true,
    includeTools: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class TechStackAnalysisStep {
  constructor() {
    this.name = 'TechStackAnalysisStep';
    this.description = 'Analyzes technology stack and frameworks';
    this.category = 'analysis';
    this.dependencies = ['techStackAnalyzer'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = TechStackAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🛠️ Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Get tech stack analyzer from context via dependency injection
      let techStackAnalyzer = context.techStackAnalyzer;
      if (!techStackAnalyzer) {
        techStackAnalyzer = context.getService('techStackAnalyzer');
      }
      
      if (!techStackAnalyzer) {
        throw new Error('Tech stack analyzer not available in context');
      }

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting tech stack analysis for: ${projectPath}`);

      // Execute tech stack analysis
      const techStack = await techStackAnalyzer.analyzeTechStack(projectPath, {
        includeFrameworks: context.includeFrameworks !== false,
        includeLibraries: context.includeLibraries !== false,
        includeTools: context.includeTools !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(techStack);

      logger.info(`✅ Tech stack analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'tech-stack',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Tech stack analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'tech-stack',
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
      throw new Error('Project path is required for tech stack analysis');
    }
  }
}

// Create instance for execution
const stepInstance = new TechStackAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 