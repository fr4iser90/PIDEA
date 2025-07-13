const BaseWorkflowStep = require('@workflows/BaseWorkflowStep');
const StepRegistry = require('@steps/StepRegistry');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class UnitTestWorkflow extends BaseWorkflowStep {
  constructor() {
    super();
    this.name = 'UnitTestWorkflow';
    this.description = 'Comprehensive unit testing workflow';
    this.category = 'testing';
    this.steps = [
      'check_container_status',
      'run_unit_tests',
      'validate_coverage',
      'check_performance'
    ];
  }

  static getConfig() {
    return {
      name: 'UnitTestWorkflow',
      description: 'Comprehensive unit testing workflow',
      category: 'testing',
      steps: [
        {
          name: 'check_container_status',
          description: 'Check if test environment is ready',
          step: 'check_container_status',
          category: 'analysis',
          required: true
        },
        {
          name: 'run_unit_tests',
          description: 'Execute unit tests and collect results',
          step: 'run_unit_tests',
          category: 'testing',
          required: true
        },
        {
          name: 'validate_coverage',
          description: 'Validate test coverage meets thresholds',
          step: 'validate_coverage',
          category: 'validation',
          required: true
        },
        {
          name: 'check_performance',
          description: 'Check test performance and execution time',
          step: 'check_performance',
          category: 'testing',
          required: false
        }
      ],
      settings: {
        parallelExecution: true,
        failOnFirstError: false,
        timeout: 300000,
        retryAttempts: 2
      },
      validation: {
        requiredSteps: ['check_container_status', 'run_unit_tests'],
        minCoverage: 80,
        maxTestDuration: 300
      }
    };
  }

  async execute(context = {}) {
    const config = UnitTestWorkflow.getConfig();
    
    try {
      logger.log(`🚀 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Initialize workflow state
      const workflowState = {
        startTime: new Date(),
        results: {},
        errors: [],
        warnings: []
      };
      
      // Execute steps sequentially or in parallel based on config
      const { parallelExecution = false } = config.settings;
      
      if (parallelExecution) {
        await this.executeStepsParallel(config.steps, context, workflowState);
      } else {
        await this.executeStepsSequential(config.steps, context, workflowState);
      }
      
      // Validate overall results
      const validation = await this.validateWorkflowResults(workflowState);
      
      workflowState.endTime = new Date();
      workflowState.duration = workflowState.endTime - workflowState.startTime;
      workflowState.validation = validation;
      
      logger.log(`✅ ${this.name} completed successfully`);
      return {
        success: validation.overallSuccess,
        workflow: this.name,
        results: workflowState,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error.message);
      return {
        success: false,
        workflow: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async executeStepsSequential(steps, context, workflowState) {
    for (const stepConfig of steps) {
      try {
        logger.log(`📋 Executing step: ${stepConfig.name}`);
        
        const step = await StepRegistry.get(stepConfig.step, stepConfig.category);
        const stepResult = await step.execute({
          ...context,
          workflowState
        });
        
        workflowState.results[stepConfig.name] = stepResult;
        
        if (!stepResult.success && stepConfig.required) {
          throw new Error(`Required step ${stepConfig.name} failed: ${stepResult.error}`);
        }
        
        logger.log(`✅ Step ${stepConfig.name} completed`);
      } catch (error) {
        logger.error(`❌ Step ${stepConfig.name} failed:`, error.message);
        workflowState.errors.push({
          step: stepConfig.name,
          error: error.message
        });
        
        if (stepConfig.required) {
          throw error;
        }
      }
    }
  }

  async executeStepsParallel(steps, context, workflowState) {
    const stepPromises = steps.map(async (stepConfig) => {
      try {
        logger.log(`📋 Executing step: ${stepConfig.name}`);
        
        const step = await StepRegistry.get(stepConfig.step, stepConfig.category);
        const stepResult = await step.execute({
          ...context,
          workflowState
        });
        
        return {
          step: stepConfig.name,
          result: stepResult,
          success: stepResult.success
        };
      } catch (error) {
        logger.error(`❌ Step ${stepConfig.name} failed:`, error.message);
        return {
          step: stepConfig.name,
          result: { success: false, error: error.message },
          success: false
        };
      }
    });
    
    const stepResults = await Promise.all(stepPromises);
    
    // Process results
    stepResults.forEach(({ step, result }) => {
      workflowState.results[step] = result;
      
      if (!result.success) {
        workflowState.errors.push({
          step,
          error: result.error
        });
      }
    });
  }

  async validateWorkflowResults(workflowState) {
    const { validation } = UnitTestWorkflow.getConfig();
    const { minCoverage = 80, maxTestDuration = 300 } = validation;
    
    const validationResults = {
      stepsCompleted: Object.keys(workflowState.results).length,
      totalSteps: UnitTestWorkflow.getConfig().steps.length,
      errors: workflowState.errors.length,
      warnings: workflowState.warnings.length,
      coverageMet: false,
      performanceMet: false,
      overallSuccess: false
    };
    
    // Check coverage
    const coverageResult = workflowState.results.validate_coverage;
    if (coverageResult && coverageResult.success) {
      validationResults.coverageMet = coverageResult.results.coverage >= minCoverage;
    }
    
    // Check performance
    validationResults.performanceMet = workflowState.duration <= maxTestDuration * 1000;
    
    // Overall success
    validationResults.overallSuccess = 
      validationResults.errors === 0 && 
      validationResults.coverageMet && 
      validationResults.performanceMet;
    
    return validationResults;
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

module.exports = UnitTestWorkflow; 