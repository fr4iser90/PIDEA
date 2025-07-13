/**
 * ComposedWorkflow - Implementation of IWorkflow for composed workflows
 * Manages execution of multiple workflow steps with validation, rollback, and error handling
 */
const IWorkflow = require('../../application/handlers/workflow/interfaces/IWorkflow');
const WorkflowException = require('./exceptions/WorkflowException');
const ValidationException = require('./exceptions/ValidationException');
const ValidationResult = require('./validation/ValidationResult');

/**
 * Composed workflow implementation
 */
class ComposedWorkflow extends IWorkflow {
  constructor(steps = [], metadata = {}, validationRules = [], rollbackStrategy = null) {
    super();
    this._steps = [...steps];
    this._metadata = { ...metadata };
    this._validationRules = [...validationRules];
    this._rollbackStrategy = rollbackStrategy;
    this._executionHistory = [];
  }

  /**
   * Execute the composed workflow
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Execution result
   */
  async execute(context) {
    const startTime = Date.now();
    
    try {
      // Validate workflow before execution
      const validationResult = await this.validate(context);
      if (!validationResult.isValid) {
        throw new ValidationException('Workflow validation failed', validationResult);
      }

      // Execute steps sequentially
      const results = [];
      for (let i = 0; i < this._steps.length; i++) {
        const step = this._steps[i];
        
        try {
          // Update context with current step
          context.setState(new (require('../context/WorkflowState'))('executing', { currentStep: i, totalSteps: this._steps.length }));
          
          // Execute step
          const stepResult = await step.execute(context);
          results.push(stepResult);
          
          // Record execution
          this._executionHistory.push({
            stepIndex: i,
            stepName: step.getMetadata().name,
            result: stepResult,
            timestamp: new Date()
          });
          
          // Check if step failed
          if (!stepResult.success) {
            throw new WorkflowException(`Step ${step.getMetadata().name} failed`, stepResult);
          }
          
        } catch (error) {
          // Attempt rollback if strategy is available
          if (this._rollbackStrategy) {
            await this._rollbackStrategy.rollback(context, i, results);
          }
          throw error;
        }
      }

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        results,
        duration,
        executionHistory: this._executionHistory,
        metadata: this._metadata
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        duration,
        executionHistory: this._executionHistory,
        metadata: this._metadata
      };
    }
  }

  /**
   * Validate workflow
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    const results = [];
    let isValid = true;

    // Validate each step
    for (const step of this._steps) {
      try {
        const stepValidation = await step.validate(context);
        results.push(stepValidation);
        
        if (!stepValidation.isValid) {
          isValid = false;
        }
      } catch (error) {
        results.push(new ValidationResult(undefined, false, [error.message], [], {}));
        isValid = false;
      }
    }

    // Apply custom validation rules
    for (const rule of this._validationRules) {
      try {
        const ruleValidation = await rule.validate(context);
        results.push(ruleValidation);
        
        if (!ruleValidation.isValid) {
          isValid = false;
        }
      } catch (error) {
        results.push(new ValidationResult(undefined, false, [error.message], [], {}));
        isValid = false;
      }
    }

    return new ValidationResult(undefined, isValid, results, [], {});
  }

  /**
   * Rollback workflow execution
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} stepId - Step to rollback to
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context, stepId) {
    if (!this._rollbackStrategy) {
      throw new WorkflowException('No rollback strategy configured');
    }

    return await this._rollbackStrategy.rollback(context, stepId, []);
  }

  /**
   * Get workflow metadata
   * @returns {Object} Workflow metadata
   */
  getMetadata() {
    return {
      name: this._metadata.name || 'ComposedWorkflow',
      description: this._metadata.description || 'Composed workflow',
      type: 'composed',
      version: this._metadata.version || '1.0.0',
      steps: this._steps.map(step => step.getMetadata()),
      validationRules: this._validationRules.length,
      hasRollbackStrategy: !!this._rollbackStrategy
    };
  }

  /**
   * Get workflow dependencies
   * @returns {Array<string>} List of dependency IDs
   */
  getDependencies() {
    const dependencies = new Set();
    
    // Collect dependencies from all steps
    for (const step of this._steps) {
      const stepDeps = step.getDependencies ? step.getDependencies() : [];
      stepDeps.forEach(dep => dependencies.add(dep));
    }
    
    // Add workflow-level dependencies
    if (this._metadata.dependencies) {
      this._metadata.dependencies.forEach(dep => dependencies.add(dep));
    }
    
    return Array.from(dependencies);
  }

  /**
   * Get workflow steps
   * @returns {Array<IWorkflowStep>} List of workflow steps
   */
  getSteps() {
    return [...this._steps];
  }

  /**
   * Check if workflow can be executed
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<boolean>} True if workflow can be executed
   */
  async canExecute(context) {
    try {
      const validationResult = await this.validate(context);
      return validationResult.isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get workflow type
   * @returns {string} The workflow type
   */
  getType() {
    return 'composed';
  }

  /**
   * Get workflow version
   * @returns {string} The workflow version
   */
  getVersion() {
    return this._metadata.version || '1.0.0';
  }

  /**
   * Get execution history
   * @returns {Array<Object>} Execution history
   */
  getExecutionHistory() {
    return [...this._executionHistory];
  }

  /**
   * Add step to workflow
   * @param {IWorkflowStep} step - Workflow step
   */
  addStep(step) {
    this._steps.push(step);
  }

  /**
   * Remove step by index
   * @param {number} index - Step index to remove
   */
  removeStep(index) {
    if (index >= 0 && index < this._steps.length) {
      this._steps.splice(index, 1);
    }
  }

  /**
   * Get step by index
   * @param {number} index - Step index
   * @returns {IWorkflowStep|null} Workflow step or null
   */
  getStep(index) {
    return this._steps[index] || null;
  }

  /**
   * Get steps count
   * @returns {number} Number of steps
   */
  getStepsCount() {
    return this._steps.length;
  }

  /**
   * Check if workflow has steps
   * @returns {boolean} True if workflow has steps
   */
  hasSteps() {
    return this._steps.length > 0;
  }

  /**
   * Check if workflow has validation rules
   * @returns {boolean} True if workflow has validation rules
   */
  hasValidationRules() {
    return this._validationRules.length > 0;
  }

  /**
   * Check if workflow has rollback strategy
   * @returns {boolean} True if workflow has rollback strategy
   */
  hasRollbackStrategy() {
    return this._rollbackStrategy !== null;
  }

  /**
   * Set rollback strategy
   * @param {RollbackStrategy} strategy - Rollback strategy
   */
  setRollbackStrategy(strategy) {
    this._rollbackStrategy = strategy;
  }

  /**
   * Add validation rule
   * @param {ValidationRule} rule - Validation rule
   */
  addValidationRule(rule) {
    this._validationRules.push(rule);
  }

  /**
   * Update metadata
   * @param {Object} metadata - Metadata to update
   */
  updateMetadata(metadata) {
    this._metadata = { ...this._metadata, ...metadata };
  }
}

module.exports = ComposedWorkflow; 