/**
 * GitWorkflowResult - Represents comprehensive git workflow execution results
 * Provides detailed information about workflow phases, outcomes, and metadata
 */
class GitWorkflowResult {
  constructor(data = {}) {
    this.success = data.success || false;
    this.taskId = data.taskId || null;
    this.sessionId = data.sessionId || null;
    this.duration = data.duration || 0;
    this.timestamp = data.timestamp || new Date();
    this.error = data.error || null;
    this.errorCode = data.errorCode || null;
    
    // Phase results
    this.branchResult = data.branchResult || null;
    this.workflowResult = data.workflowResult || null;
    this.pullRequestResult = data.pullRequestResult || null;
    this.reviewResult = data.reviewResult || null;
    this.mergeResult = data.mergeResult || null;
    
    // Metadata
    this.metadata = data.metadata || {};
    this.context = data.context || {};
    this.metrics = data.metrics || {};
    
    // Status tracking
    this.phases = data.phases || [];
    this.currentPhase = data.currentPhase || null;
    this.completedPhases = data.completedPhases || [];
    this.failedPhases = data.failedPhases || [];
    
    // Validation
    this.validationResult = data.validationResult || null;
    this.warnings = data.warnings || [];
    this.errors = data.errors || [];
  }

  /**
   * Create a successful workflow result
   * @param {Object} data - Result data
   * @returns {GitWorkflowResult} Success result
   */
  static success(data = {}) {
    return new GitWorkflowResult({
      success: true,
      timestamp: new Date(),
      ...data
    });
  }

  /**
   * Create a failed workflow result
   * @param {string} error - Error message
   * @param {Object} data - Additional data
   * @returns {GitWorkflowResult} Failure result
   */
  static failure(error, data = {}) {
    return new GitWorkflowResult({
      success: false,
      error,
      timestamp: new Date(),
      ...data
    });
  }

  /**
   * Set branch creation result
   * @param {Object} result - Branch creation result
   */
  setBranchResult(result) {
    this.branchResult = {
      success: result.success || false,
      branchName: result.branchName,
      baseBranch: result.baseBranch,
      strategy: result.strategy,
      duration: result.duration || 0,
      timestamp: result.timestamp || new Date(),
      error: result.error || null,
      metadata: result.metadata || {}
    };
    
    this.addCompletedPhase('branch_creation');
  }

  /**
   * Set workflow execution result
   * @param {Object} result - Workflow execution result
   */
  setWorkflowResult(result) {
    this.workflowResult = {
      success: result.success || false,
      type: result.type,
      steps: result.steps || [],
      duration: result.duration || 0,
      timestamp: result.timestamp || new Date(),
      error: result.error || null,
      metadata: result.metadata || {}
    };
    
    this.addCompletedPhase('workflow_execution');
  }

  /**
   * Set pull request result
   * @param {Object} result - Pull request result
   */
  setPullRequestResult(result) {
    this.pullRequestResult = {
      success: result.success || false,
      pullRequestId: result.pullRequestId,
      pullRequestUrl: result.pullRequestUrl,
      title: result.title,
      description: result.description,
      sourceBranch: result.sourceBranch,
      targetBranch: result.targetBranch,
      duration: result.duration || 0,
      timestamp: result.timestamp || new Date(),
      error: result.error || null,
      metadata: result.metadata || {}
    };
    
    this.addCompletedPhase('pull_request_creation');
  }

  /**
   * Set review result
   * @param {Object} result - Review result
   */
  setReviewResult(result) {
    this.reviewResult = {
      success: result.success || false,
      reviewId: result.reviewId,
      status: result.status,
      comments: result.comments || [],
      score: result.score || 0,
      duration: result.duration || 0,
      timestamp: result.timestamp || new Date(),
      error: result.error || null,
      metadata: result.metadata || {}
    };
    
    this.addCompletedPhase('code_review');
  }

  /**
   * Set merge result
   * @param {Object} result - Merge result
   */
  setMergeResult(result) {
    this.mergeResult = {
      success: result.success || false,
      sourceBranch: result.sourceBranch,
      targetBranch: result.targetBranch,
      mergeStrategy: result.mergeStrategy,
      mergeCommit: result.mergeCommit,
      duration: result.duration || 0,
      timestamp: result.timestamp || new Date(),
      error: result.error || null,
      metadata: result.metadata || {}
    };
    
    this.addCompletedPhase('merge');
  }

  /**
   * Add a completed phase
   * @param {string} phase - Phase name
   */
  addCompletedPhase(phase) {
    if (!this.completedPhases.includes(phase)) {
      this.completedPhases.push(phase);
    }
    
    if (this.failedPhases.includes(phase)) {
      this.failedPhases = this.failedPhases.filter(p => p !== phase);
    }
  }

  /**
   * Add a failed phase
   * @param {string} phase - Phase name
   * @param {string} error - Error message
   */
  addFailedPhase(phase, error) {
    if (!this.failedPhases.includes(phase)) {
      this.failedPhases.push(phase);
    }
    
    this.addError(error, phase);
  }

  /**
   * Set current phase
   * @param {string} phase - Current phase
   */
  setCurrentPhase(phase) {
    this.currentPhase = phase;
  }

  /**
   * Add an error
   * @param {string} error - Error message
   * @param {string} phase - Phase where error occurred
   */
  addError(error, phase = 'unknown') {
    this.errors.push({
      message: error,
      phase,
      timestamp: new Date()
    });
  }

  /**
   * Add a warning
   * @param {string} warning - Warning message
   * @param {string} phase - Phase where warning occurred
   */
  addWarning(warning, phase = 'unknown') {
    this.warnings.push({
      message: warning,
      phase,
      timestamp: new Date()
    });
  }

  /**
   * Set validation result
   * @param {Object} result - Validation result
   */
  setValidationResult(result) {
    this.validationResult = {
      isValid: result.isValid || false,
      errors: result.errors || [],
      warnings: result.warnings || [],
      duration: result.duration || 0,
      timestamp: result.timestamp || new Date()
    };
  }

  /**
   * Set metrics
   * @param {Object} metrics - Metrics data
   */
  setMetrics(metrics) {
    this.metrics = {
      ...this.metrics,
      ...metrics,
      timestamp: new Date()
    };
  }

  /**
   * Check if a specific phase was completed
   * @param {string} phase - Phase name
   * @returns {boolean} True if phase was completed
   */
  isPhaseCompleted(phase) {
    return this.completedPhases.includes(phase);
  }

  /**
   * Check if a specific phase failed
   * @param {string} phase - Phase name
   * @returns {boolean} True if phase failed
   */
  isPhaseFailed(phase) {
    return this.failedPhases.includes(phase);
  }

  /**
   * Get phase result
   * @param {string} phase - Phase name
   * @returns {Object|null} Phase result or null
   */
  getPhaseResult(phase) {
    const phaseResults = {
      'branch_creation': this.branchResult,
      'workflow_execution': this.workflowResult,
      'pull_request_creation': this.pullRequestResult,
      'code_review': this.reviewResult,
      'merge': this.mergeResult
    };
    
    return phaseResults[phase] || null;
  }

  /**
   * Get overall success status
   * @returns {boolean} True if workflow was successful
   */
  isSuccessful() {
    return this.success && this.failedPhases.length === 0;
  }

  /**
   * Get workflow status
   * @returns {string} Workflow status
   */
  getStatus() {
    if (this.success && this.failedPhases.length === 0) {
      return 'completed';
    } else if (this.failedPhases.length > 0) {
      return 'failed';
    } else if (this.currentPhase) {
      return 'in_progress';
    } else {
      return 'unknown';
    }
  }

  /**
   * Get completion percentage
   * @returns {number} Completion percentage (0-100)
   */
  getCompletionPercentage() {
    const totalPhases = 5; // branch, workflow, pr, review, merge
    const completedCount = this.completedPhases.length;
    return Math.round((completedCount / totalPhases) * 100);
  }

  /**
   * Get total duration
   * @returns {number} Total duration in milliseconds
   */
  getTotalDuration() {
    if (this.duration > 0) {
      return this.duration;
    }
    
    // Calculate from individual phase durations
    const phases = [
      this.branchResult,
      this.workflowResult,
      this.pullRequestResult,
      this.reviewResult,
      this.mergeResult
    ];
    
    return phases.reduce((total, phase) => {
      return total + (phase?.duration || 0);
    }, 0);
  }

  /**
   * Get summary for logging
   * @returns {Object} Summary object
   */
  getSummary() {
    return {
      success: this.success,
      taskId: this.taskId,
      sessionId: this.sessionId,
      status: this.getStatus(),
      completionPercentage: this.getCompletionPercentage(),
      duration: this.getTotalDuration(),
      completedPhases: this.completedPhases,
      failedPhases: this.failedPhases,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      timestamp: this.timestamp
    };
  }

  /**
   * Get detailed result for API response
   * @returns {Object} Detailed result object
   */
  getDetailedResult() {
    return {
      success: this.success,
      taskId: this.taskId,
      sessionId: this.sessionId,
      status: this.getStatus(),
      completionPercentage: this.getCompletionPercentage(),
      duration: this.getTotalDuration(),
      timestamp: this.timestamp,
      error: this.error,
      errorCode: this.errorCode,
      
      // Phase results
      phases: {
        branch: this.branchResult,
        workflow: this.workflowResult,
        pullRequest: this.pullRequestResult,
        review: this.reviewResult,
        merge: this.mergeResult
      },
      
      // Status tracking
      completedPhases: this.completedPhases,
      failedPhases: this.failedPhases,
      currentPhase: this.currentPhase,
      
      // Validation and issues
      validation: this.validationResult,
      errors: this.errors,
      warnings: this.warnings,
      
      // Metadata
      metadata: this.metadata,
      context: this.context,
      metrics: this.metrics
    };
  }

  /**
   * Convert to JSON string
   * @returns {string} JSON string
   */
  toJSON() {
    return JSON.stringify(this.getDetailedResult());
  }

  /**
   * Create from JSON string
   * @param {string} json - JSON string
   * @returns {GitWorkflowResult} Result instance
   */
  static fromJSON(json) {
    try {
      const data = JSON.parse(json);
      return new GitWorkflowResult(data);
    } catch (error) {
      throw new Error(`Failed to parse GitWorkflowResult from JSON: ${error.message}`);
    }
  }

  /**
   * Clone the result
   * @returns {GitWorkflowResult} Cloned result
   */
  clone() {
    return new GitWorkflowResult({
      success: this.success,
      taskId: this.taskId,
      sessionId: this.sessionId,
      duration: this.duration,
      timestamp: this.timestamp,
      error: this.error,
      errorCode: this.errorCode,
      branchResult: this.branchResult ? { ...this.branchResult } : null,
      workflowResult: this.workflowResult ? { ...this.workflowResult } : null,
      pullRequestResult: this.pullRequestResult ? { ...this.pullRequestResult } : null,
      reviewResult: this.reviewResult ? { ...this.reviewResult } : null,
      mergeResult: this.mergeResult ? { ...this.mergeResult } : null,
      metadata: { ...this.metadata },
      context: { ...this.context },
      metrics: { ...this.metrics },
      phases: [...this.phases],
      currentPhase: this.currentPhase,
      completedPhases: [...this.completedPhases],
      failedPhases: [...this.failedPhases],
      validationResult: this.validationResult ? { ...this.validationResult } : null,
      warnings: [...this.warnings],
      errors: [...this.errors]
    });
  }
}

module.exports = GitWorkflowResult; 