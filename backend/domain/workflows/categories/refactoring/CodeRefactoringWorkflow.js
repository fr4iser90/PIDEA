const BaseWorkflowStep = require('@workflows/BaseWorkflowStep');
const StepRegistry = require('@steps/StepRegistry');

class CodeRefactoringWorkflow extends BaseWorkflowStep {
  constructor() {
    super();
    this.name = 'CodeRefactoringWorkflow';
    this.description = 'Comprehensive code refactoring workflow for quality improvement';
    this.category = 'refactoring';
    this.steps = [
      'CheckContainerStatus',
      'RefactorCode',
      'ValidateCodeQuality',
      'CheckPerformance'
    ];
  }

  static getConfig() {
    return {
      name: 'CodeRefactoringWorkflow',
      description: 'Comprehensive code refactoring workflow for quality improvement',
      category: 'refactoring',
      steps: [
        {
          name: 'CheckContainerStatus',
          description: 'Check if refactoring environment is ready',
          step: 'CheckContainerStatus',
          category: 'analysis',
          required: true
        },
        {
          name: 'RefactorCode',
          description: 'Execute code refactoring operations',
          step: 'RefactorCode',
          category: 'refactoring',
          required: true
        },
        {
          name: 'ValidateCodeQuality',
          description: 'Validate code quality after refactoring',
          step: 'ValidateCodeQuality',
          category: 'validation',
          required: true
        },
        {
          name: 'CheckPerformance',
          description: 'Check performance impact of refactoring',
          step: 'CheckPerformance',
          category: 'testing',
          required: false
        }
      ],
      settings: {
        parallelExecution: false,
        failOnFirstError: true,
        timeout: 300000,
        retryAttempts: 1
      },
      validation: {
        requiredSteps: ['CheckContainerStatus', 'RefactorCode'],
        minQualityImprovement: 10,
        maxPerformanceImpact: 5
      }
    };
  }

  async execute(context = {}) {
    const config = CodeRefactoringWorkflow.getConfig();
    
    try {
      console.log(`🚀 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Initialize workflow state
      const workflowState = {
        startTime: new Date(),
        results: {},
        errors: [],
        warnings: [],
        refactoringApplied: false,
        qualityImproved: false
      };
      
      // Execute steps sequentially (refactoring should be sequential)
      await this.executeStepsSequential(config.steps, context, workflowState);
      
      // Validate overall results
      const validation = await this.validateWorkflowResults(workflowState);
      
      workflowState.endTime = new Date();
      workflowState.duration = workflowState.endTime - workflowState.startTime;
      workflowState.validation = validation;
      
      console.log(`✅ ${this.name} completed successfully`);
      return {
        success: validation.overallSuccess,
        workflow: this.name,
        results: workflowState,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ ${this.name} failed:`, error.message);
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
        console.log(`📋 Executing step: ${stepConfig.name}`);
        
        const step = await StepRegistry.get(stepConfig.step, stepConfig.category);
        const stepResult = await step.execute({
          ...context,
          workflowState
        });
        
        workflowState.results[stepConfig.name] = stepResult;
        
        // Track specific refactoring results
        if (stepConfig.name === 'RefactorCode' && stepResult.success) {
          workflowState.refactoringApplied = true;
        }
        if (stepConfig.name === 'ValidateCodeQuality' && stepResult.success) {
          workflowState.qualityImproved = true;
        }
        
        if (!stepResult.success && stepConfig.required) {
          throw new Error(`Required step ${stepConfig.name} failed: ${stepResult.error}`);
        }
        
        console.log(`✅ Step ${stepConfig.name} completed`);
      } catch (error) {
        console.error(`❌ Step ${stepConfig.name} failed:`, error.message);
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

  async validateWorkflowResults(workflowState) {
    const { validation } = CodeRefactoringWorkflow.getConfig();
    const { minQualityImprovement = 10, maxPerformanceImpact = 5 } = validation;
    
    const validationResults = {
      stepsCompleted: Object.keys(workflowState.results).length,
      totalSteps: CodeRefactoringWorkflow.getConfig().steps.length,
      errors: workflowState.errors.length,
      warnings: workflowState.warnings.length,
      refactoringApplied: workflowState.refactoringApplied,
      qualityImproved: workflowState.qualityImproved,
      qualityImprovementMet: false,
      performanceImpactAcceptable: false,
      overallSuccess: false
    };
    
    // Check quality improvement
    const qualityResult = workflowState.results.ValidateCodeQuality;
    if (qualityResult && qualityResult.success) {
      validationResults.qualityImprovementMet = 
        qualityResult.results.qualityImprovement >= minQualityImprovement;
    }
    
    // Check performance impact
    const performanceResult = workflowState.results.CheckPerformance;
    if (performanceResult && performanceResult.success) {
      validationResults.performanceImpactAcceptable = 
        performanceResult.results.performanceImpact <= maxPerformanceImpact;
    }
    
    // Overall success
    validationResults.overallSuccess = 
      validationResults.errors === 0 && 
      validationResults.refactoringApplied && 
      validationResults.qualityImproved &&
      validationResults.qualityImprovementMet;
    
    return validationResults;
  }

  validateContext(context) {
    const required = ['projectPath', 'refactoringConfig'];
    const missing = required.filter(key => !context[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required context: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = CodeRefactoringWorkflow; 