/**
 * SimpleSequentialStrategy - Simple sequential execution strategy
 * Provides basic workflow execution with minimal overhead
 */
const ExecutionResult = require('../ExecutionResult');
const { StepExecutionException } = require('../exceptions/ExecutionException');

/**
 * Simple sequential execution strategy
 */
class SimpleSequentialStrategy {
  constructor() {
    this.name = 'simple_sequential';
  }

  /**
   * Execute workflow with simple sequential strategy
   * @param {IWorkflow} workflow - Workflow to execute
   * @param {WorkflowContext} context - Workflow context
   * @param {ExecutionContext} executionContext - Execution context
   * @returns {Promise<ExecutionResult>} Execution result
   */
  async execute(workflow, context, executionContext) {
    const startTime = Date.now();
    
    try {
      // Update execution context
      executionContext.setStatus('running');
      
      // Get workflow steps
      const steps = this.getWorkflowSteps(workflow);
      executionContext.setTotalSteps(steps.length);
      
      // Execute steps sequentially
      const results = [];
      const stepResults = [];
      const successfulSteps = [];
      const failedSteps = [];
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        executionContext.setCurrentStep(i);
        
        try {
          // Execute step
          const result = await this.executeStep(step, context, executionContext);
          
          const stepResult = {
            success: true,
            stepName: step.getMetadata().name,
            stepIndex: i,
            result,
            timestamp: new Date()
          };
          
          results.push(result);
          stepResults.push(stepResult);
          successfulSteps.push(stepResult);
          
          // Add to execution context
          executionContext.addResult(stepResult);
          
          // Update context with step result
          context.setData(`step_${i}_result`, result);
          
        } catch (error) {
          const stepResult = {
            success: false,
            stepName: step.getMetadata().name,
            stepIndex: i,
            error: error.message,
            timestamp: new Date()
          };
          
          stepResults.push(stepResult);
          failedSteps.push(stepResult);
          
          // Add to execution context
          executionContext.addResult(stepResult);
          executionContext.addError(error);
          
          // Early termination if step failed
          if (executionContext.getOption('stopOnFailure', true)) {
            break;
          }
        }
      }
      
      const duration = Date.now() - startTime;
      executionContext.setStatus('completed');
      
      // Create execution result
      const executionResult = new ExecutionResult({
        success: failedSteps.length === 0,
        strategy: this.name,
        duration,
        results,
        stepCount: steps.length,
        stepResults,
        successfulSteps,
        failedSteps,
        executionId: executionContext.getId(),
        workflowId: workflow.getMetadata().id,
        workflowName: workflow.getMetadata().name
      });
      
      return executionResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      executionContext.setStatus('failed');
      executionContext.addError(error);
      
      return ExecutionResult.createFailure(error.message, {
        strategy: this.name,
        duration,
        executionId: executionContext.getId(),
        workflowId: workflow.getMetadata().id,
        workflowName: workflow.getMetadata().name
      });
    }
  }

  /**
   * Get workflow steps
   * @param {IWorkflow} workflow - Workflow to analyze
   * @returns {Array<IWorkflowStep>} Workflow steps
   */
  getWorkflowSteps(workflow) {
    // For composed workflows, get the steps
    if (workflow._steps) {
      return workflow._steps;
    }
    
    // For other workflows, return single step
    return [workflow];
  }

  /**
   * Execute single step
   * @param {IWorkflowStep} step - Step to execute
   * @param {WorkflowContext} context - Workflow context
   * @param {ExecutionContext} executionContext - Execution context
   * @returns {Promise<Object>} Step result
   */
  async executeStep(step, context, executionContext) {
    try {
      // Validate step before execution
      if (typeof step.execute !== 'function') {
        throw new StepExecutionException(`Step ${step.getMetadata().name} does not have an execute method`);
      }
      
      // Execute step
      const result = await step.execute(context);
      
      return result;
      
    } catch (error) {
      throw new StepExecutionException(
        `Step ${step.getMetadata().name} failed: ${error.message}`,
        error,
        {
          stepName: step.getMetadata().name
        }
      );
    }
  }

  /**
   * Get strategy name
   * @returns {string} Strategy name
   */
  getName() {
    return this.name;
  }

  /**
   * Get strategy description
   * @returns {string} Strategy description
   */
  getDescription() {
    return 'Simple sequential execution strategy with minimal overhead and basic functionality';
  }

  /**
   * Get strategy capabilities
   * @returns {Object} Strategy capabilities
   */
  getCapabilities() {
    return {
      supportsParallelExecution: false,
      supportsConditionalExecution: false,
      supportsRetry: false,
      supportsRollback: false,
      supportsTimeout: false,
      supportsResourceManagement: false,
      supportsMetrics: false,
      supportsLogging: false
    };
  }

  /**
   * Validate strategy configuration
   * @param {Object} config - Strategy configuration
   * @returns {Object} Validation result
   */
  validateConfiguration(config) {
    const errors = [];
    
    // Validate stopOnFailure option
    if (config.stopOnFailure !== undefined && typeof config.stopOnFailure !== 'boolean') {
      errors.push('stopOnFailure must be a boolean value');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration
   */
  getDefaultConfiguration() {
    return {
      stopOnFailure: true
    };
  }
}

module.exports = SimpleSequentialStrategy; 