/**
 * Project Analysis Step - Core Analysis Step
 * Analyzes project structure and basic information
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('project_analysis_step');

// Step configuration
const config = {
  name: 'ProjectAnalysisStep',
  type: 'analysis',
  description: 'Analyzes project structure and basic information',
  category: 'analysis',
  version: '1.0.0',
  dependencies: ['projectAnalyzer'],
  settings: {
    timeout: 30000,
    includeRepoStructure: true,
    includeDependencies: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class ProjectAnalysisStep {
  constructor() {
    this.name = 'ProjectAnalysisStep';
    this.description = 'Analyzes project structure and basic information';
    this.category = 'analysis';
    this.dependencies = ['projectAnalyzer'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ProjectAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`📁 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Get project analyzer from context via dependency injection
      let projectAnalyzer = context.projectAnalyzer;
      if (!projectAnalyzer) {
        projectAnalyzer = context.getService('projectAnalyzer');
      }
      
      if (!projectAnalyzer) {
        throw new Error('Project analyzer not available in context');
      }

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting project analysis for: ${projectPath}`);

      // Execute project analysis
      const project = await projectAnalyzer.analyzeProject(projectPath, {
        includeRepoStructure: context.includeRepoStructure !== false,
        includeDependencies: context.includeDependencies !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(project);

      logger.info(`✅ Project analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'project',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Project analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'project',
          timestamp: new Date()
        }
      };
    }
  }

  cleanResult(result) {
    if (!result) return null;
    
    // Remove sensitive information and large objects
    const clean = { ...result };
    
    // Remove large arrays that might cause memory issues
    if (clean.files && Array.isArray(clean.files) && clean.files.length > 1000) {
      clean.files = clean.files.slice(0, 1000);
      clean.filesTruncated = true;
    }
    
    // Remove internal properties
    delete clean._internal;
    delete clean.debug;
    
    return clean;
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for project analysis');
    }
  }
}

// Create instance for execution
const stepInstance = new ProjectAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 