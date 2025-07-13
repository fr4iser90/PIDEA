/**
 * GitWorkflowContext - Manages git-specific workflow context and state
 * Provides a centralized way to store and retrieve git workflow information
 */
class GitWorkflowContext {
  constructor(task, baseContext = {}) {
    this.task = task;
    this.baseContext = baseContext;
    this.gitData = new Map();
    this.metadata = new Map();
    this.timestamps = new Map();
    this.errors = [];
    this.warnings = [];
    
    // Initialize with task data
    this.initializeFromTask();
    
    // Set creation timestamp
    this.timestamps.set('created', new Date());
  }

  /**
   * Initialize context with task data
   */
  initializeFromTask() {
    if (this.task) {
      this.set('taskId', this.task.id);
      this.set('taskType', this.task.type?.value || 'unknown');
      this.set('taskTitle', this.task.title || '');
      this.set('taskDescription', this.task.description || '');
      this.set('projectPath', this.task.metadata?.projectPath || this.baseContext.projectPath);
      this.set('userId', this.task.metadata?.userId || this.baseContext.userId);
      this.set('projectId', this.task.metadata?.projectId || this.baseContext.projectId);
    }
  }

  /**
   * Set a value in the git context
   * @param {string} key - Key to set
   * @param {*} value - Value to store
   * @param {string} category - Category (gitData, metadata, timestamps)
   */
  set(key, value, category = 'gitData') {
    switch (category) {
      case 'gitData':
        this.gitData.set(key, value);
        break;
      case 'metadata':
        this.metadata.set(key, value);
        break;
      case 'timestamps':
        this.timestamps.set(key, new Date());
        break;
      default:
        this.gitData.set(key, value);
    }
  }

  /**
   * Get a value from the git context
   * @param {string} key - Key to retrieve
   * @param {string} category - Category to search
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Stored value or default
   */
  get(key, category = 'gitData', defaultValue = null) {
    let value = null;
    
    switch (category) {
      case 'gitData':
        value = this.gitData.get(key);
        break;
      case 'metadata':
        value = this.metadata.get(key);
        break;
      case 'timestamps':
        value = this.timestamps.get(key);
        break;
      default:
        // Search in all categories
        value = this.gitData.get(key) || this.metadata.get(key) || this.timestamps.get(key);
    }
    
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Check if a key exists in the context
   * @param {string} key - Key to check
   * @param {string} category - Category to search
   * @returns {boolean} True if key exists
   */
  has(key, category = 'gitData') {
    switch (category) {
      case 'gitData':
        return this.gitData.has(key);
      case 'metadata':
        return this.metadata.has(key);
      case 'timestamps':
        return this.timestamps.has(key);
      default:
        return this.gitData.has(key) || this.metadata.has(key) || this.timestamps.has(key);
    }
  }

  /**
   * Remove a key from the context
   * @param {string} key - Key to remove
   * @param {string} category - Category to remove from
   */
  delete(key, category = 'gitData') {
    switch (category) {
      case 'gitData':
        this.gitData.delete(key);
        break;
      case 'metadata':
        this.metadata.delete(key);
        break;
      case 'timestamps':
        this.timestamps.delete(key);
        break;
      default:
        this.gitData.delete(key);
        this.metadata.delete(key);
        this.timestamps.delete(key);
    }
  }

  /**
   * Set branch information
   * @param {string} branchName - Branch name
   * @param {string} baseBranch - Base branch
   * @param {Object} branchInfo - Additional branch information
   */
  setBranchInfo(branchName, baseBranch = 'main', branchInfo = {}) {
    this.set('branchName', branchName);
    this.set('baseBranch', baseBranch);
    this.set('branchCreated', true, 'timestamps');
    this.set('branchInfo', {
      name: branchName,
      base: baseBranch,
      ...branchInfo
    });
  }

  /**
   * Set merge information
   * @param {string} sourceBranch - Source branch
   * @param {string} targetBranch - Target branch
   * @param {string} mergeStrategy - Merge strategy used
   * @param {Object} mergeInfo - Additional merge information
   */
  setMergeInfo(sourceBranch, targetBranch, mergeStrategy = 'squash', mergeInfo = {}) {
    this.set('mergeSource', sourceBranch);
    this.set('mergeTarget', targetBranch);
    this.set('mergeStrategy', mergeStrategy);
    this.set('mergeCompleted', true, 'timestamps');
    this.set('mergeInfo', {
      source: sourceBranch,
      target: targetBranch,
      strategy: mergeStrategy,
      ...mergeInfo
    });
  }

  /**
   * Set pull request information
   * @param {string} prId - Pull request ID
   * @param {string} prTitle - Pull request title
   * @param {string} prUrl - Pull request URL
   * @param {Object} prInfo - Additional PR information
   */
  setPullRequestInfo(prId, prTitle, prUrl, prInfo = {}) {
    this.set('pullRequestId', prId);
    this.set('pullRequestTitle', prTitle);
    this.set('pullRequestUrl', prUrl);
    this.set('pullRequestCreated', true, 'timestamps');
    this.set('pullRequestInfo', {
      id: prId,
      title: prTitle,
      url: prUrl,
      ...prInfo
    });
  }

  /**
   * Set review information
   * @param {string} reviewId - Review ID
   * @param {string} reviewStatus - Review status
   * @param {Object} reviewInfo - Additional review information
   */
  setReviewInfo(reviewId, reviewStatus, reviewInfo = {}) {
    this.set('reviewId', reviewId);
    this.set('reviewStatus', reviewStatus);
    this.set('reviewCompleted', true, 'timestamps');
    this.set('reviewInfo', {
      id: reviewId,
      status: reviewStatus,
      ...reviewInfo
    });
  }

  /**
   * Add an error to the context
   * @param {Error} error - Error object
   * @param {string} phase - Workflow phase where error occurred
   */
  addError(error, phase = 'unknown') {
    this.errors.push({
      error: error.message || error,
      phase,
      timestamp: new Date(),
      stack: error.stack
    });
  }

  /**
   * Add a warning to the context
   * @param {string} warning - Warning message
   * @param {string} phase - Workflow phase where warning occurred
   */
  addWarning(warning, phase = 'unknown') {
    this.warnings.push({
      message: warning,
      phase,
      timestamp: new Date()
    });
  }

  /**
   * Get all errors from the context
   * @returns {Array} Array of errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Get all warnings from the context
   * @returns {Array} Array of warnings
   */
  getWarnings() {
    return this.warnings;
  }

  /**
   * Check if context has errors
   * @returns {boolean} True if context has errors
   */
  hasErrors() {
    return this.errors.length > 0;
  }

  /**
   * Check if context has warnings
   * @returns {boolean} True if context has warnings
   */
  hasWarnings() {
    return this.warnings.length > 0;
  }

  /**
   * Get workflow duration
   * @returns {number} Duration in milliseconds
   */
  getDuration() {
    const created = this.timestamps.get('created');
    const completed = this.timestamps.get('completed') || new Date();
    return completed.getTime() - created.getTime();
  }

  /**
   * Mark workflow as completed
   */
  markCompleted() {
    this.timestamps.set('completed', new Date());
    this.set('workflowCompleted', true);
  }

  /**
   * Get all git data as an object
   * @returns {Object} Git data object
   */
  getGitData() {
    const data = {};
    for (const [key, value] of this.gitData) {
      data[key] = value;
    }
    return data;
  }

  /**
   * Get all metadata as an object
   * @returns {Object} Metadata object
   */
  getMetadata() {
    const data = {};
    for (const [key, value] of this.metadata) {
      data[key] = value;
    }
    return data;
  }

  /**
   * Get all timestamps as an object
   * @returns {Object} Timestamps object
   */
  getTimestamps() {
    const data = {};
    for (const [key, value] of this.timestamps) {
      data[key] = value;
    }
    return data;
  }

  /**
   * Get complete context summary
   * @returns {Object} Complete context summary
   */
  getSummary() {
    return {
      task: {
        id: this.get('taskId'),
        type: this.get('taskType'),
        title: this.get('taskTitle')
      },
      git: this.getGitData(),
      metadata: this.getMetadata(),
      timestamps: this.getTimestamps(),
      errors: this.getErrors(),
      warnings: this.getWarnings(),
      duration: this.getDuration(),
      completed: this.get('workflowCompleted', 'gitData', false)
    };
  }

  /**
   * Clone the context
   * @returns {GitWorkflowContext} Cloned context
   */
  clone() {
    const cloned = new GitWorkflowContext(this.task, this.baseContext);
    
    // Copy git data
    for (const [key, value] of this.gitData) {
      cloned.gitData.set(key, value);
    }
    
    // Copy metadata
    for (const [key, value] of this.metadata) {
      cloned.metadata.set(key, value);
    }
    
    // Copy timestamps
    for (const [key, value] of this.timestamps) {
      cloned.timestamps.set(key, value);
    }
    
    // Copy errors and warnings
    cloned.errors = [...this.errors];
    cloned.warnings = [...this.warnings];
    
    return cloned;
  }

  /**
   * Clear all data from the context
   */
  clear() {
    this.gitData.clear();
    this.metadata.clear();
    this.timestamps.clear();
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate context completeness
   * @returns {Object} Validation result
   */
  validate() {
    const requiredFields = ['taskId', 'projectPath'];
    const missingFields = requiredFields.filter(field => !this.has(field));
    
    return {
      isValid: missingFields.length === 0,
      missingFields,
      hasErrors: this.hasErrors(),
      hasWarnings: this.hasWarnings()
    };
  }
}

module.exports = GitWorkflowContext; 