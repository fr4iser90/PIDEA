/**
 * TestingStep - Testing workflow step
 * Performs testing tasks including running tests, generating tests, and validating coverage
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

/**
 * Testing workflow step
 */
class TestingStep extends BaseWorkflowStep {
  constructor(testingType = 'run-tests', options = {}) {
    super('TestingStep', `Performs ${testingType} testing`, 'testing');
    this._testingType = testingType;
    this._options = { ...options };
  }

  /**
   * Execute testing step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Testing result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const testingService = context.get('testingService');
    const scriptExecutor = context.get('scriptExecutor');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!testingService && !scriptExecutor) {
      throw new Error('Testing service or script executor not found in context');
    }

    // Perform testing based on type
    switch (this._testingType) {
      case 'run-tests':
        return await this._runTests(context, projectPath);
      case 'generate-tests':
        return await this._generateTests(context, projectPath);
      case 'validate-coverage':
        return await this._validateCoverage(context, projectPath);
      case 'fix-tests':
        return await this._fixTests(context, projectPath);
      case 'test-analysis':
        return await this._analyzeTests(context, projectPath);
      case 'test-optimization':
        return await this._optimizeTests(context, projectPath);
      case 'validate-deployment':
        return await this._validateDeployment(context, projectPath);
      case 'validate-performance':
        return await this._validatePerformance(context, projectPath);
      default:
        throw new Error(`Unknown testing type: ${this._testingType}`);
    }
  }

  /**
   * Run tests
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Test results
   */
  async _runTests(context, projectPath) {
    const testingService = context.get('testingService');
    const scriptExecutor = context.get('scriptExecutor');
    
    if (testingService) {
      return await testingService.runTests(projectPath, this._options);
    } else {
      // Fallback to script executor
      const testCommand = this._options.testCommand || 'npm test';
      return await scriptExecutor.executeCommand(testCommand, { cwd: projectPath });
    }
  }

  /**
   * Generate tests
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Test generation result
   */
  async _generateTests(context, projectPath) {
    const testingService = context.get('testingService');
    const aiService = context.get('aiService');
    
    if (testingService) {
      return await testingService.generateTests(projectPath, this._options);
    } else if (aiService) {
      return await aiService.generateTests(projectPath, this._options);
    } else {
      throw new Error('Testing service or AI service required for test generation');
    }
  }

  /**
   * Validate coverage
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Coverage validation result
   */
  async _validateCoverage(context, projectPath) {
    const testingService = context.get('testingService');
    const coverageService = context.get('coverageService');
    
    if (testingService) {
      return await testingService.validateCoverage(projectPath, this._options);
    } else if (coverageService) {
      return await coverageService.validateCoverage(projectPath, this._options);
    } else {
      throw new Error('Testing service or coverage service required for coverage validation');
    }
  }

  /**
   * Fix tests
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Test fix result
   */
  async _fixTests(context, projectPath) {
    const testingService = context.get('testingService');
    const aiService = context.get('aiService');
    
    if (testingService) {
      return await testingService.fixTests(projectPath, this._options);
    } else if (aiService) {
      return await aiService.fixTests(projectPath, this._options);
    } else {
      throw new Error('Testing service or AI service required for test fixing');
    }
  }

  /**
   * Analyze tests
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Test analysis result
   */
  async _analyzeTests(context, projectPath) {
    const testingService = context.get('testingService');
    const analysisService = context.get('analysisService');
    
    if (testingService) {
      return await testingService.analyzeTests(projectPath, this._options);
    } else if (analysisService) {
      return await analysisService.performTestAnalysis(projectPath, this._options);
    } else {
      throw new Error('Testing service or analysis service required for test analysis');
    }
  }

  /**
   * Optimize tests
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Test optimization result
   */
  async _optimizeTests(context, projectPath) {
    const testingService = context.get('testingService');
    const optimizationService = context.get('optimizationService');
    
    if (testingService) {
      return await testingService.optimizeTests(projectPath, this._options);
    } else if (optimizationService) {
      return await optimizationService.optimizeTests(projectPath, this._options);
    } else {
      throw new Error('Testing service or optimization service required for test optimization');
    }
  }

  /**
   * Validate deployment
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Deployment validation result
   */
  async _validateDeployment(context, projectPath) {
    const testingService = context.get('testingService');
    const deploymentService = context.get('deploymentService');
    
    if (testingService) {
      return await testingService.validateDeployment(projectPath, this._options);
    } else if (deploymentService) {
      return await deploymentService.validateDeployment(projectPath, this._options);
    } else {
      throw new Error('Testing service or deployment service required for deployment validation');
    }
  }

  /**
   * Validate performance
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Performance validation result
   */
  async _validatePerformance(context, projectPath) {
    const testingService = context.get('testingService');
    const performanceService = context.get('performanceService');
    
    if (testingService) {
      return await testingService.validatePerformance(projectPath, this._options);
    } else if (performanceService) {
      return await performanceService.validatePerformance(projectPath, this._options);
    } else {
      throw new Error('Testing service or performance service required for performance validation');
    }
  }

  /**
   * Get testing type
   * @returns {string} Testing type
   */
  getTestingType() {
    return this._testingType;
  }

  /**
   * Set testing type
   * @param {string} testingType - Testing type
   */
  setTestingType(testingType) {
    this._testingType = testingType;
  }

  /**
   * Get testing options
   * @returns {Object} Testing options
   */
  getOptions() {
    return { ...this._options };
  }

  /**
   * Set testing options
   * @param {Object} options - Testing options
   */
  setOptions(options) {
    this._options = { ...this._options, ...options };
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      testingType: this._testingType,
      options: this._options
    };
  }

  /**
   * Validate testing step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    const baseValidation = await super.validate(context);
    
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Check if project path exists
    const projectPath = context.get('projectPath');
    if (!projectPath) {
      return new ValidationResult(undefined, false, ['Project path is required for testing'], [], {});
    }

    // Check if required service is available
    const testingService = context.get('testingService');
    const scriptExecutor = context.get('scriptExecutor');
    const aiService = context.get('aiService');
    
    if (!testingService && !scriptExecutor && !aiService) {
      return new ValidationResult(undefined, false, ['Testing service, script executor, or AI service is required for testing'], [], {});
    }

    // Validate testing type
    const validTypes = [
      'run-tests', 'generate-tests', 'validate-coverage', 'fix-tests',
      'test-analysis', 'test-optimization', 'validate-deployment', 'validate-performance'
    ];

    if (!validTypes.includes(this._testingType)) {
      return new ValidationResult(undefined, false, [`Invalid testing type: ${this._testingType}`], [], {});
    }

    return new ValidationResult(undefined, true, [], [], {});
  }

  /**
   * Rollback testing step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    // Testing steps typically don't need rollback as they don't modify production code
    return {
      success: true,
      stepName: this._name,
      message: 'Testing step rollback completed (no changes to revert)'
    };
  }

  /**
   * Clone testing step
   * @returns {TestingStep} Cloned step
   */
  clone() {
    const clonedStep = new TestingStep(this._testingType, this._options);
    clonedStep._metadata = { ...this._metadata };
    clonedStep._validationRules = [...this._validationRules];
    clonedStep._dependencies = [...this._dependencies];
    return clonedStep;
  }

  /**
   * Convert step to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      ...super.toJSON(),
      testingType: this._testingType,
      options: this._options
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {TestingStep} Step instance
   */
  static fromJSON(json) {
    const step = new TestingStep(json.testingType, json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = TestingStep; 