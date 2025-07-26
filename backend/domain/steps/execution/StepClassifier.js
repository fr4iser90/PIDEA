/**
 * StepClassifier - Domain Layer
 * Classifies steps as critical (sequential) or non-critical (parallel)
 * Implements step classification logic for parallel execution optimization
 */

const ServiceLogger = require('@logging/ServiceLogger');

class StepClassifier {
  constructor(options = {}) {
    this.logger = options.logger || new ServiceLogger('StepClassifier');
    
    // Critical steps that must be executed sequentially
    this.criticalStepPatterns = [
      /IDE.*Step$/i,
      /Workflow.*Step$/i,
      /Task.*Step$/i,
      /Analysis.*Step$/i,
      /Refactoring.*Step$/i,
      /Testing.*Step$/i,
      /Deployment.*Step$/i,
      /Create.*Step$/i,
      /Execute.*Step$/i
    ];
    
    // Non-critical steps that can be executed in parallel
    this.nonCriticalStepPatterns = [
      /Get.*Step$/i,
      /Fetch.*Step$/i,
      /Retrieve.*Step$/i,
      /Load.*Step$/i,
      /Read.*Step$/i,
      /Query.*Step$/i
    ];
    
    // Explicit critical step names
    this.explicitCriticalSteps = [
      'IDESendMessageStep',
      'CreateChatStep',
      'TaskExecutionStep',
      'WorkflowExecutionStep',
      'AnalysisExecutionStep',
      'RefactoringStep',
      'TestingStep',
      'DeploymentStep',
      'CreateProjectStep',
      'CreateUserStep',
      'ExecuteCommandStep',
      'ExecuteWorkflowStep'
    ];
    
    // Explicit non-critical step names
    this.explicitNonCriticalSteps = [
      'GetChatHistoryStep',
      'GitGetStatusStep',
      'GitGetCurrentBranchStep',
      'GetProjectInfoStep',
      'GetUserPreferencesStep',
      'GetSystemStatusStep',
      'FetchUserDataStep',
      'RetrieveProjectDataStep',
      'LoadConfigurationStep',
      'ReadFileStep',
      'QueryDatabaseStep'
    ];
  }

  /**
   * Classify steps into critical and non-critical categories
   * @param {Array<string>} stepNames - Array of step names to classify
   * @param {Object} context - Execution context
   * @returns {Object} Classification result with critical and nonCritical arrays
   */
  classifySteps(stepNames, context = {}) {
    try {
      this.logger.info('Classifying steps for parallel execution', {
        totalSteps: stepNames.length,
        context: this.getContextSummary(context)
      });

      const criticalSteps = [];
      const nonCriticalSteps = [];

      for (const stepName of stepNames) {
        if (this.isCriticalStep(stepName, context)) {
          criticalSteps.push(stepName);
        } else {
          nonCriticalSteps.push(stepName);
        }
      }

      const result = {
        critical: criticalSteps,
        nonCritical: nonCriticalSteps,
        total: stepNames.length,
        classification: {
          criticalCount: criticalSteps.length,
          nonCriticalCount: nonCriticalSteps.length,
          parallelizationRatio: nonCriticalSteps.length / stepNames.length
        }
      };

      this.logger.info('Step classification completed', {
        critical: criticalSteps.length,
        nonCritical: nonCriticalSteps.length,
        parallelizationRatio: `${(result.classification.parallelizationRatio * 100).toFixed(1)}%`
      });

      return result;
    } catch (error) {
      this.logger.error('Step classification failed:', error.message);
      // Fallback to all critical (sequential execution)
      return {
        critical: stepNames,
        nonCritical: [],
        total: stepNames.length,
        classification: {
          criticalCount: stepNames.length,
          nonCriticalCount: 0,
          parallelizationRatio: 0
        },
        error: error.message
      };
    }
  }

  /**
   * Check if a step is critical and must be executed sequentially
   * @param {string} stepName - Step name to check
   * @param {Object} context - Execution context
   * @returns {boolean} True if step is critical
   */
  isCriticalStep(stepName, context = {}) {
    try {
      // 1. Check explicit critical steps
      if (this.explicitCriticalSteps.includes(stepName)) {
        this.logger.debug(`Step "${stepName}" classified as critical (explicit list)`);
        return true;
      }

      // 2. Check explicit non-critical steps
      if (this.explicitNonCriticalSteps.includes(stepName)) {
        this.logger.debug(`Step "${stepName}" classified as non-critical (explicit list)`);
        return false;
      }

      // 3. Check critical patterns
      const matchesCriticalPattern = this.criticalStepPatterns.some(pattern => 
        pattern.test(stepName)
      );
      
      if (matchesCriticalPattern) {
        this.logger.debug(`Step "${stepName}" classified as critical (pattern match)`);
        return true;
      }

      // 4. Check non-critical patterns
      const matchesNonCriticalPattern = this.nonCriticalStepPatterns.some(pattern => 
        pattern.test(stepName)
      );
      
      if (matchesNonCriticalPattern) {
        this.logger.debug(`Step "${stepName}" classified as non-critical (pattern match)`);
        return false;
      }

      // 5. Check context-based classification
      if (this.isWorkflowContext(context)) {
        this.logger.debug(`Step "${stepName}" classified as critical (workflow context)`);
        return true;
      }

      // 6. Default to non-critical for unknown steps
      this.logger.debug(`Step "${stepName}" classified as non-critical (default)`);
      return false;

    } catch (error) {
      this.logger.error(`Error classifying step "${stepName}":`, error.message);
      // Default to critical for safety
      return true;
    }
  }

  /**
   * Check if context indicates workflow execution
   * @param {Object} context - Execution context
   * @returns {boolean} True if workflow context
   */
  isWorkflowContext(context) {
    return !!(context.workflowId || 
             context.taskId || 
             context.analysisId ||
             context.executionMode === 'workflow' ||
             context.isWorkflowExecution ||
             context.sequentialRequired);
  }

  /**
   * Get context summary for logging
   * @param {Object} context - Execution context
   * @returns {Object} Context summary
   */
  getContextSummary(context) {
    return {
      hasWorkflowId: !!context.workflowId,
      hasTaskId: !!context.taskId,
      hasAnalysisId: !!context.analysisId,
      executionMode: context.executionMode,
      isWorkflowExecution: context.isWorkflowExecution,
      sequentialRequired: context.sequentialRequired
    };
  }

  /**
   * Add custom critical step pattern
   * @param {RegExp} pattern - Pattern to add
   */
  addCriticalPattern(pattern) {
    if (pattern instanceof RegExp) {
      this.criticalStepPatterns.push(pattern);
      this.logger.info(`Added critical pattern: ${pattern}`);
    } else {
      throw new Error('Pattern must be a RegExp');
    }
  }

  /**
   * Add custom non-critical step pattern
   * @param {RegExp} pattern - Pattern to add
   */
  addNonCriticalPattern(pattern) {
    if (pattern instanceof RegExp) {
      this.nonCriticalStepPatterns.push(pattern);
      this.logger.info(`Added non-critical pattern: ${pattern}`);
    } else {
      throw new Error('Pattern must be a RegExp');
    }
  }

  /**
   * Add explicit critical step name
   * @param {string} stepName - Step name to add
   */
  addCriticalStep(stepName) {
    if (typeof stepName === 'string' && !this.explicitCriticalSteps.includes(stepName)) {
      this.explicitCriticalSteps.push(stepName);
      this.logger.info(`Added critical step: ${stepName}`);
    }
  }

  /**
   * Add explicit non-critical step name
   * @param {string} stepName - Step name to add
   */
  addNonCriticalStep(stepName) {
    if (typeof stepName === 'string' && !this.explicitNonCriticalSteps.includes(stepName)) {
      this.explicitNonCriticalSteps.push(stepName);
      this.logger.info(`Added non-critical step: ${stepName}`);
    }
  }

  /**
   * Get classification statistics
   * @returns {Object} Classification statistics
   */
  getStatistics() {
    return {
      criticalPatterns: this.criticalStepPatterns.length,
      nonCriticalPatterns: this.nonCriticalStepPatterns.length,
      explicitCriticalSteps: this.explicitCriticalSteps.length,
      explicitNonCriticalSteps: this.explicitNonCriticalSteps.length,
      totalPatterns: this.criticalStepPatterns.length + this.nonCriticalStepPatterns.length,
      totalExplicitSteps: this.explicitCriticalSteps.length + this.explicitNonCriticalSteps.length
    };
  }

  /**
   * Reset classifier to default configuration
   */
  reset() {
    this.criticalStepPatterns = [
      /IDE.*Step$/i,
      /Workflow.*Step$/i,
      /Task.*Step$/i,
      /Analysis.*Step$/i,
      /Refactoring.*Step$/i,
      /Testing.*Step$/i,
      /Deployment.*Step$/i,
      /Create.*Step$/i,
      /Execute.*Step$/i
    ];
    
    this.nonCriticalStepPatterns = [
      /Get.*Step$/i,
      /Fetch.*Step$/i,
      /Retrieve.*Step$/i,
      /Load.*Step$/i,
      /Read.*Step$/i,
      /Query.*Step$/i
    ];
    
    this.explicitCriticalSteps = [
      'IDESendMessageStep',
      'CreateChatStep',
      'TaskExecutionStep',
      'WorkflowExecutionStep',
      'AnalysisExecutionStep',
      'RefactoringStep',
      'TestingStep',
      'DeploymentStep',
      'CreateProjectStep',
      'CreateUserStep',
      'ExecuteCommandStep',
      'ExecuteWorkflowStep'
    ];
    
    this.explicitNonCriticalSteps = [
      'GetChatHistoryStep',
      'GitGetStatusStep',
      'GitGetCurrentBranchStep',
      'GetProjectInfoStep',
      'GetUserPreferencesStep',
      'GetSystemStatusStep',
      'FetchUserDataStep',
      'RetrieveProjectDataStep',
      'LoadConfigurationStep',
      'ReadFileStep',
      'QueryDatabaseStep'
    ];

    this.logger.info('StepClassifier reset to default configuration');
  }
}

module.exports = StepClassifier; 