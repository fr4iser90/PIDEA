/**
 * GitWorkflowException - Custom exception for git workflow operations
 * Provides detailed error context and recovery suggestions
 */
class GitWorkflowException extends Error {
  constructor(message, context = {}, recoverySuggestions = []) {
    super(message);
    
    this.name = 'GitWorkflowException';
    this.message = message;
    this.context = context;
    this.recoverySuggestions = recoverySuggestions;
    this.timestamp = new Date();
    this.errorCode = context.errorCode || 'GIT_WORKFLOW_ERROR';
    this.severity = context.severity || 'ERROR';
    this.operation = context.operation || 'UNKNOWN';
    this.taskId = context.taskId || null;
    this.branchName = context.branchName || null;
    this.projectPath = context.projectPath || null;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GitWorkflowException);
    }
  }

  /**
   * Create a branch creation exception
   * @param {string} branchName - Branch name
   * @param {string} reason - Failure reason
   * @param {Object} context - Additional context
   * @returns {GitWorkflowException} Exception instance
   */
  static branchCreationFailed(branchName, reason, context = {}) {
    const message = `Failed to create branch '${branchName}': ${reason}`;
    const recoverySuggestions = [
      'Check if the branch name is valid and follows naming conventions',
      'Verify that the base branch exists',
      'Ensure you have write permissions to the repository',
      'Check for any existing branches with the same name',
      'Verify git service connectivity'
    ];

    return new GitWorkflowException(message, {
      ...context,
      operation: 'BRANCH_CREATION',
      branchName,
      errorCode: 'BRANCH_CREATION_FAILED'
    }, recoverySuggestions);
  }

  /**
   * Create a merge operation exception
   * @param {string} sourceBranch - Source branch
   * @param {string} targetBranch - Target branch
   * @param {string} reason - Failure reason
   * @param {Object} context - Additional context
   * @returns {GitWorkflowException} Exception instance
   */
  static mergeFailed(sourceBranch, targetBranch, reason, context = {}) {
    const message = `Failed to merge '${sourceBranch}' into '${targetBranch}': ${reason}`;
    const recoverySuggestions = [
      'Check for merge conflicts and resolve them manually',
      'Verify that both branches exist and are accessible',
      'Ensure you have merge permissions on the target branch',
      'Check if the target branch is protected',
      'Verify that the source branch has changes to merge'
    ];

    return new GitWorkflowException(message, {
      ...context,
      operation: 'MERGE',
      sourceBranch,
      targetBranch,
      errorCode: 'MERGE_FAILED'
    }, recoverySuggestions);
  }

  /**
   * Create a pull request creation exception
   * @param {string} title - PR title
   * @param {string} reason - Failure reason
   * @param {Object} context - Additional context
   * @returns {GitWorkflowException} Exception instance
   */
  static pullRequestCreationFailed(title, reason, context = {}) {
    const message = `Failed to create pull request '${title}': ${reason}`;
    const recoverySuggestions = [
      'Check if the source and target branches exist',
      'Verify that you have permission to create pull requests',
      'Ensure the repository supports pull requests',
      'Check for any required PR templates or validations',
      'Verify git service API connectivity'
    ];

    return new GitWorkflowException(message, {
      ...context,
      operation: 'PULL_REQUEST_CREATION',
      prTitle: title,
      errorCode: 'PULL_REQUEST_CREATION_FAILED'
    }, recoverySuggestions);
  }

  /**
   * Create a workflow validation exception
   * @param {string} reason - Validation failure reason
   * @param {Object} validationResult - Validation result details
   * @param {Object} context - Additional context
   * @returns {GitWorkflowException} Exception instance
   */
  static validationFailed(reason, validationResult = {}, context = {}) {
    const message = `Workflow validation failed: ${reason}`;
    const recoverySuggestions = [
      'Review the validation errors and fix them',
      'Check that all required parameters are provided',
      'Verify that the task and context are valid',
      'Ensure git service is properly configured',
      'Check repository permissions and access'
    ];

    return new GitWorkflowException(message, {
      ...context,
      operation: 'VALIDATION',
      validationResult,
      errorCode: 'VALIDATION_FAILED'
    }, recoverySuggestions);
  }

  /**
   * Create a git service exception
   * @param {string} operation - Git operation
   * @param {string} reason - Failure reason
   * @param {Object} context - Additional context
   * @returns {GitWorkflowException} Exception instance
   */
  static gitServiceError(operation, reason, context = {}) {
    const message = `Git service error during ${operation}: ${reason}`;
    const recoverySuggestions = [
      'Check git service connectivity and configuration',
      'Verify repository access and permissions',
      'Check if the git service is running and accessible',
      'Review git service logs for detailed error information',
      'Ensure git credentials are properly configured'
    ];

    return new GitWorkflowException(message, {
      ...context,
      operation: 'GIT_SERVICE',
      gitOperation: operation,
      errorCode: 'GIT_SERVICE_ERROR'
    }, recoverySuggestions);
  }

  /**
   * Create a workflow execution exception
   * @param {string} phase - Workflow phase
   * @param {string} reason - Failure reason
   * @param {Object} context - Additional context
   * @returns {GitWorkflowException} Exception instance
   */
  static workflowExecutionFailed(phase, reason, context = {}) {
    const message = `Workflow execution failed during ${phase}: ${reason}`;
    const recoverySuggestions = [
      'Review the workflow configuration and parameters',
      'Check that all required services are available',
      'Verify task and context validity',
      'Check for any system resource constraints',
      'Review logs for detailed error information'
    ];

    return new GitWorkflowException(message, {
      ...context,
      operation: 'WORKFLOW_EXECUTION',
      workflowPhase: phase,
      errorCode: 'WORKFLOW_EXECUTION_FAILED'
    }, recoverySuggestions);
  }

  /**
   * Get formatted error details
   * @returns {Object} Formatted error details
   */
  getErrorDetails() {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      severity: this.severity,
      operation: this.operation,
      timestamp: this.timestamp,
      taskId: this.taskId,
      branchName: this.branchName,
      projectPath: this.projectPath,
      context: this.context,
      recoverySuggestions: this.recoverySuggestions,
      stack: this.stack
    };
  }

  /**
   * Get error summary for logging
   * @returns {Object} Error summary
   */
  getErrorSummary() {
    return {
      errorCode: this.errorCode,
      operation: this.operation,
      message: this.message,
      taskId: this.taskId,
      branchName: this.branchName,
      timestamp: this.timestamp
    };
  }

  /**
   * Check if error is recoverable
   * @returns {boolean} True if error is recoverable
   */
  isRecoverable() {
    const nonRecoverableCodes = [
      'VALIDATION_FAILED',
      'PERMISSION_DENIED',
      'REPOSITORY_NOT_FOUND'
    ];
    
    return !nonRecoverableCodes.includes(this.errorCode);
  }

  /**
   * Get recovery action based on error type
   * @returns {string} Recovery action
   */
  getRecoveryAction() {
    const recoveryActions = {
      'BRANCH_CREATION_FAILED': 'RETRY_WITH_DIFFERENT_NAME',
      'MERGE_FAILED': 'RESOLVE_CONFLICTS_MANUALLY',
      'PULL_REQUEST_CREATION_FAILED': 'RETRY_OR_CREATE_MANUALLY',
      'VALIDATION_FAILED': 'FIX_VALIDATION_ISSUES',
      'GIT_SERVICE_ERROR': 'CHECK_SERVICE_CONNECTIVITY',
      'WORKFLOW_EXECUTION_FAILED': 'REVIEW_CONFIGURATION'
    };

    return recoveryActions[this.errorCode] || 'REVIEW_ERROR_DETAILS';
  }
}

module.exports = GitWorkflowException; 