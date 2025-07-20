/**
 * Security Analysis Step - Core Analysis Step
 * Analyzes security vulnerabilities and best practices
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('security_analysis_step');

// Step configuration
const config = {
  name: 'SecurityAnalysisStep',
  type: 'analysis',
  description: 'Analyzes security vulnerabilities and best practices',
  category: 'analysis',
  version: '1.0.0',
  dependencies: ['securityAnalyzer'],
  settings: {
    timeout: 45000,
    includeVulnerabilities: true,
    includeBestPractices: true,
    includeDependencies: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class SecurityAnalysisStep {
  constructor() {
    this.name = 'SecurityAnalysisStep';
    this.description = 'Analyzes security vulnerabilities and best practices';
    this.category = 'analysis';
    this.dependencies = ['securityAnalyzer'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = SecurityAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔒 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Get security analyzer from context via dependency injection
      let securityAnalyzer = context.securityAnalyzer;
      if (!securityAnalyzer) {
        securityAnalyzer = context.getService('securityAnalyzer');
      }
      
      if (!securityAnalyzer) {
        throw new Error('Security analyzer not available in context');
      }

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting security analysis for: ${projectPath}`);

      // Execute security analysis
      const security = await securityAnalyzer.analyzeSecurity(projectPath, {
        includeVulnerabilities: context.includeVulnerabilities !== false,
        includeBestPractices: context.includeBestPractices !== false,
        includeDependencies: context.includeDependencies !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(security);

      logger.info(`✅ Security analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'security',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Security analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'security',
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
      throw new Error('Project path is required for security analysis');
    }
  }
}

// Create instance for execution
const stepInstance = new SecurityAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 