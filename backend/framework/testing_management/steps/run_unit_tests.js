const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * RunUnitTestsStep - Execute unit tests and collect results
 * Migrated from core domain to testing_management framework
 */

class RunUnitTestsStep {
  constructor() {
    this.name = 'run_unit_tests';
    this.description = 'Execute unit tests and collect results';
    this.category = 'testing';
    this.framework = 'testing_management';
    this.dependencies = ['jest', 'testRunner'];
  }

  static getConfig() {
    return {
      name: 'RunUnitTests',
      type: 'testing',
      description: 'Execute unit tests and collect results',
      category: 'testing',
      framework: 'testing_management',
      dependencies: ['jest', 'testRunner'],
      settings: {
        timeout: 30000,
        parallel: true,
        coverage: true,
        verbose: false
      },
      validation: {
        requiredFiles: ['package.json', 'jest.config.js'],
        supportedCommands: ['npm test', 'yarn test', 'jest']
      }
    };
  }

  async execute(context = {}) {
    const config = RunUnitTestsStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🧪 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Execute unit tests
      const results = await this.runTests(context);
      
      // Collect coverage
      const coverage = await this.collectCoverage(context);
      
      // Validate results
      const validation = await this.validateResults(results, coverage);
      
      logger.info(`✅ ${this.name} completed successfully`);
      return {
        success: true,
        step: this.name,
        results: {
          tests: results,
          coverage,
          validation
        },
        metadata: {
          framework: 'testing_management',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error.message);
      return {
        success: false,
        step: this.name,
        error: error.message,
        metadata: {
          framework: 'testing_management',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async runTests(context) {
    const { projectPath, testConfig = {} } = context;
    
    // Execute test command
    const testCommand = testConfig.command || 'npm test';
    const testArgs = testConfig.args || [];
    
    // This would integrate with actual test runner
    const testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: []
    };
    
    return testResults;
  }

  async collectCoverage(context) {
    const { projectPath, coverageConfig = {} } = context;
    
    // Collect coverage information
    const coverage = {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
      threshold: coverageConfig.threshold || 80
    };
    
    return coverage;
  }

  async validateResults(results, coverage) {
    const validation = {
      testsPassed: results.failed === 0,
      coverageMet: coverage.lines >= coverage.threshold,
      overallSuccess: false
    };
    
    validation.overallSuccess = validation.testsPassed && validation.coverageMet;
    
    return validation;
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
  config: RunUnitTestsStep.getConfig(),
  execute: async (context = {}) => {
    const step = new RunUnitTestsStep();
    return await step.execute(context);
  }
}; 