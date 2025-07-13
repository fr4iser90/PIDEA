const FrameworkBuilder = require('@frameworks/FrameworkBuilder');
const { logger } = require('@infrastructure/logging/Logger');


class IntegrationTestFramework {
  constructor() {
    this.name = 'IntegrationTestFramework';
    this.version = '1.0.0';
    this.description = 'Integration testing framework for system component interactions';
    this.category = 'testing';
  }

  static getConfig() {
    return {
      name: 'IntegrationTestFramework',
      version: '1.0.0',
      description: 'Integration testing framework for system component interactions',
      category: 'testing',
      steps: [
        {
          name: 'setup_test_environment',
          description: 'Set up integration test environment with dependencies',
          handler: 'IntegrationTestSetupHandler',
          dependencies: ['docker', 'database', 'apiServer']
        },
        {
          name: 'analyze_integration_points',
          description: 'Analyze system integration points and dependencies',
          handler: 'IntegrationAnalysisHandler',
          dependencies: ['architectureAnalyzer', 'dependencyMapper']
        },
        {
          name: 'generate_integration_tests',
          description: 'Generate integration tests for identified points',
          handler: 'IntegrationTestGenerationHandler',
          dependencies: ['testGenerator', 'apiClient']
        },
        {
          name: 'execute_integration_tests',
          description: 'Execute integration tests and collect results',
          handler: 'IntegrationTestExecutionHandler',
          dependencies: ['testRunner', 'resultCollector']
        },
        {
          name: 'validate_integration_results',
          description: 'Validate integration test results and system stability',
          handler: 'IntegrationValidationHandler',
          dependencies: ['resultAnalyzer', 'stabilityChecker']
        }
      ],
      settings: {
        testTimeout: 30000,
        parallelExecution: false,
        cleanupAfterTests: true,
        databaseReset: true
      },
      validation: {
        requiredDependencies: ['jest', 'supertest', 'docker'],
        supportedDatabases: ['postgresql', 'mysql', 'mongodb'],
        minNodeVersion: '14.0.0'
      }
    };
  }

  async execute(context = {}) {
    const config = IntegrationTestFramework.getConfig();
    const framework = FrameworkBuilder.build(config, context);
    
    try {
      logger.log(`🚀 Executing ${this.name}...`);
      
      const results = await framework.execute();
      
      logger.log(`✅ ${this.name} completed successfully`);
      return {
        success: true,
        framework: this.name,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error.message);
      return {
        success: false,
        framework: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  validateContext(context) {
    const required = ['projectPath', 'integrationConfig', 'databaseConfig'];
    const missing = required.filter(key => !context[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required context: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = IntegrationTestFramework; 