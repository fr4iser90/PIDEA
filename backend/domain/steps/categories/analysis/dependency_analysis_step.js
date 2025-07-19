/**
 * Dependency Analysis Step - Core Analysis Step
 * Analyzes dependencies and package information
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('dependency_analysis_step');

// Step configuration
const config = {
  name: 'DependencyAnalysisStep',
  type: 'analysis',
  description: 'Analyzes dependencies and package information',
  category: 'analysis',
  version: '1.0.0',
  dependencies: ['dependencyAnalyzer'],
  settings: {
    timeout: 30000,
    includeOutdated: true,
    includeVulnerabilities: true,
    includeRecommendations: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class DependencyAnalysisStep {
  constructor() {
    this.name = 'DependencyAnalysisStep';
    this.description = 'Analyzes dependencies and package information';
    this.category = 'analysis';
    this.dependencies = ['dependencyAnalyzer'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = DependencyAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`📦 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Get dependency analyzer from application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const { dependencyAnalyzer } = application;
      if (!dependencyAnalyzer) {
        throw new Error('Dependency analyzer not available');
      }

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting dependency analysis for: ${projectPath}`);

      // Execute dependency analysis
      const dependencies = await dependencyAnalyzer.analyzeDependencies(projectPath, {
        includeOutdated: context.includeOutdated !== false,
        includeVulnerabilities: context.includeVulnerabilities !== false,
        includeRecommendations: context.includeRecommendations !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(dependencies);

      // Store all found dependencies for merging in the controller
      if (dependencies.packages && Array.isArray(dependencies.packages)) {
        cleanResult.allPackages = dependencies.packages.map(pkg => ({
          context: pkg.path,
          dependencies: pkg.dependencies,
          devDependencies: pkg.devDependencies
        }));
        
        // Also as packagesByContext for easier merging
        cleanResult.packagesByContext = {};
        for (const pkg of dependencies.packages) {
          const ctx = pkg.path.replace(projectPath, '').replace(/^\/+/, '') || 'root';
          cleanResult.packagesByContext[ctx] = {
            dependencies: pkg.dependencies,
            devDependencies: pkg.devDependencies
          };
        }
      }

      logger.info(`✅ Dependency analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'dependency',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Dependency analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'dependency',
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
      throw new Error('Project path is required for dependency analysis');
    }
  }
}

module.exports = DependencyAnalysisStep; 