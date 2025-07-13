const FrameworkBuilder = require('@frameworks/FrameworkBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class UnitTestFramework {
  constructor() {
    this.name = 'UnitTestFramework';
    this.version = '1.0.0';
    this.description = 'Comprehensive unit testing framework for code quality assurance';
    this.category = 'testing';
  }

  static getConfig() {
    return {
      name: 'UnitTestFramework',
      version: '1.0.0',
      description: 'Comprehensive unit testing framework for code quality assurance',
      category: 'testing',
      steps: [
        {
          name: 'analyze_test_structure',
          description: 'Analyze existing test structure and coverage',
          handler: 'UnitTestAnalysisHandler',
          dependencies: ['testRunner', 'coverageTool']
        },
        {
          name: 'generate_test_cases',
          description: 'Generate comprehensive test cases for uncovered code',
          handler: 'UnitTestGenerationHandler',
          dependencies: ['codeAnalyzer', 'testGenerator']
        },
        {
          name: 'execute_unit_tests',
          description: 'Execute all unit tests and collect results',
          handler: 'UnitTestExecutionHandler',
          dependencies: ['testRunner', 'resultCollector']
        },
        {
          name: 'validate_coverage',
          description: 'Validate test coverage meets minimum thresholds',
          handler: 'CoverageValidationHandler',
          dependencies: ['coverageAnalyzer', 'thresholdValidator']
        }
      ],
      settings: {
        minCoverage: 80,
        testTimeout: 5000,
        parallelExecution: true,
        failOnLowCoverage: true
      },
      validation: {
        requiredDependencies: ['jest', 'nyc'],
        supportedLanguages: ['javascript', 'typescript'],
        minNodeVersion: '14.0.0'
      }
    };
  }

  async execute(context = {}) {
    const config = UnitTestFramework.getConfig();
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
    const required = ['projectPath', 'testConfig'];
    const missing = required.filter(key => !context[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required context: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = UnitTestFramework; 