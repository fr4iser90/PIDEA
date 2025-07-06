const { v4: uuidv4 } = require('uuid');

/**
 * TodoTask - Entity representing an individual task within a TODO list
 * Contains task details, status, and execution information
 */
class TodoTask {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.sessionId = data.sessionId || null;
    this.description = data.description || '';
    this.lineNumber = data.lineNumber || 0;
    this.pattern = data.pattern || '';
    this.priority = data.priority || 1;
    this.type = data.type || 'general';
    this.status = data.status || 'pending'; // pending, running, completed, failed, skipped
    this.dependencies = data.dependencies || [];
    this.dependents = data.dependents || [];
    this.result = data.result || null;
    this.error = data.error || null;
    this.startTime = data.startTime || null;
    this.endTime = data.endTime || null;
    this.duration = data.duration || 0;
    this.attempts = data.attempts || 0;
    this.maxAttempts = data.maxAttempts || 3;
    this.confirmationAttempts = data.confirmationAttempts || 0;
    this.aiResponse = data.aiResponse || null;
    this.confirmationResult = data.confirmationResult || null;
    this.fallbackAction = data.fallbackAction || null;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Start task execution
   */
  start() {
    this.status = 'running';
    this.startTime = new Date();
    this.attempts++;
    this.updatedAt = new Date();
  }

  /**
   * Complete task execution
   * @param {Object} result - Task result
   */
  complete(result) {
    this.status = 'completed';
    this.endTime = new Date();
    this.duration = this.endTime.getTime() - (this.startTime ? this.startTime.getTime() : this.createdAt.getTime());
    this.result = result;
    this.updatedAt = new Date();
  }

  /**
   * Fail task execution
   * @param {string} error - Error message
   */
  fail(error) {
    this.status = 'failed';
    this.endTime = new Date();
    this.duration = this.endTime.getTime() - (this.startTime ? this.startTime.getTime() : this.createdAt.getTime());
    this.error = error;
    this.updatedAt = new Date();
  }

  /**
   * Skip task execution
   * @param {string} reason - Skip reason
   */
  skip(reason = 'Skipped') {
    this.status = 'skipped';
    this.endTime = new Date();
    this.duration = this.endTime.getTime() - (this.startTime ? this.startTime.getTime() : this.createdAt.getTime());
    this.result = { reason };
    this.updatedAt = new Date();
  }

  /**
   * Retry task execution
   */
  retry() {
    if (this.attempts < this.maxAttempts) {
      this.status = 'pending';
      this.startTime = null;
      this.endTime = null;
      this.duration = 0;
      this.error = null;
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Add dependency
   * @param {string} taskId - Dependent task ID
   */
  addDependency(taskId) {
    if (!this.dependencies.includes(taskId)) {
      this.dependencies.push(taskId);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove dependency
   * @param {string} taskId - Dependent task ID
   */
  removeDependency(taskId) {
    const index = this.dependencies.indexOf(taskId);
    if (index > -1) {
      this.dependencies.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  /**
   * Add dependent
   * @param {string} taskId - Dependent task ID
   */
  addDependent(taskId) {
    if (!this.dependents.includes(taskId)) {
      this.dependents.push(taskId);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove dependent
   * @param {string} taskId - Dependent task ID
   */
  removeDependent(taskId) {
    const index = this.dependents.indexOf(taskId);
    if (index > -1) {
      this.dependents.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  /**
   * Set AI response
   * @param {string} response - AI response
   */
  setAIResponse(response) {
    this.aiResponse = response;
    this.updatedAt = new Date();
  }

  /**
   * Set confirmation result
   * @param {Object} result - Confirmation result
   */
  setConfirmationResult(result) {
    this.confirmationResult = result;
    this.confirmationAttempts++;
    this.updatedAt = new Date();
  }

  /**
   * Set fallback action
   * @param {string} action - Fallback action
   */
  setFallbackAction(action) {
    this.fallbackAction = action;
    this.updatedAt = new Date();
  }

  /**
   * Check if task is pending
   * @returns {boolean} Is pending
   */
  isPending() {
    return this.status === 'pending';
  }

  /**
   * Check if task is running
   * @returns {boolean} Is running
   */
  isRunning() {
    return this.status === 'running';
  }

  /**
   * Check if task is completed
   * @returns {boolean} Is completed
   */
  isCompleted() {
    return this.status === 'completed';
  }

  /**
   * Check if task is failed
   * @returns {boolean} Is failed
   */
  isFailed() {
    return this.status === 'failed';
  }

  /**
   * Check if task is skipped
   * @returns {boolean} Is skipped
   */
  isSkipped() {
    return this.status === 'skipped';
  }

  /**
   * Check if task can be retried
   * @returns {boolean} Can retry
   */
  canRetry() {
    return this.status === 'failed' && this.attempts < this.maxAttempts;
  }

  /**
   * Check if task has dependencies
   * @returns {boolean} Has dependencies
   */
  hasDependencies() {
    return this.dependencies.length > 0;
  }

  /**
   * Check if task has dependents
   * @returns {boolean} Has dependents
   */
  hasDependents() {
    return this.dependents.length > 0;
  }

  /**
   * Get task priority level
   * @returns {string} Priority level
   */
  getPriorityLevel() {
    if (this.priority <= 1) return 'high';
    if (this.priority <= 3) return 'medium';
    return 'low';
  }

  /**
   * Get task type category
   * @returns {string} Type category
   */
  getTypeCategory() {
    const categories = {
      'ui': 'User Interface',
      'api': 'API/Backend',
      'database': 'Database',
      'test': 'Testing',
      'deployment': 'Deployment',
      'security': 'Security',
      'performance': 'Performance',
      'refactor': 'Refactoring',
      'general': 'General'
    };
    return categories[this.type] || 'General';
  }

  /**
   * Get task summary
   * @returns {Object} Task summary
   */
  getSummary() {
    return {
      id: this.id,
      description: this.description,
      type: this.type,
      status: this.status,
      priority: this.priority,
      attempts: this.attempts,
      duration: this.duration,
      startTime: this.startTime,
      endTime: this.endTime,
      error: this.error
    };
  }

  /**
   * Get task statistics
   * @returns {Object} Task statistics
   */
  getStats() {
    return {
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      confirmationAttempts: this.confirmationAttempts,
      duration: this.duration,
      dependencies: this.dependencies.length,
      dependents: this.dependents.length,
      hasAIResponse: !!this.aiResponse,
      hasConfirmationResult: !!this.confirmationResult,
      hasFallbackAction: !!this.fallbackAction
    };
  }

  /**
   * Validate task data
   * @param {Object} data - Task data
   * @returns {Object} Validation result
   */
  static validate(data) {
    const errors = [];
    
    if (!data.description || typeof data.description !== 'string') {
      errors.push('description must be a non-empty string');
    }
    
    if (data.priority && (typeof data.priority !== 'number' || data.priority < 1)) {
      errors.push('priority must be a positive number');
    }
    
    if (data.status && !['pending', 'running', 'completed', 'failed', 'skipped'].includes(data.status)) {
      errors.push('Invalid status value');
    }
    
    if (data.maxAttempts && (typeof data.maxAttempts !== 'number' || data.maxAttempts < 1)) {
      errors.push('maxAttempts must be a positive number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create task from TODO item
   * @param {Object} todoItem - TODO item from parser
   * @param {string} sessionId - Session ID
   * @returns {TodoTask} TodoTask instance
   */
  static fromTodoItem(todoItem, sessionId) {
    return new TodoTask({
      sessionId,
      description: todoItem.description,
      lineNumber: todoItem.lineNumber,
      pattern: todoItem.pattern,
      priority: todoItem.priority,
      type: todoItem.type,
      dependencies: todoItem.dependencies || [],
      metadata: todoItem.metadata || {}
    });
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object
   */
  toJSON() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      description: this.description,
      lineNumber: this.lineNumber,
      pattern: this.pattern,
      priority: this.priority,
      type: this.type,
      status: this.status,
      dependencies: this.dependencies,
      dependents: this.dependents,
      result: this.result,
      error: this.error,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      confirmationAttempts: this.confirmationAttempts,
      aiResponse: this.aiResponse,
      confirmationResult: this.confirmationResult,
      fallbackAction: this.fallbackAction,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create from plain object
   * @param {Object} data - Plain object
   * @returns {TodoTask} TodoTask instance
   */
  static fromJSON(data) {
    return new TodoTask(data);
  }
}

module.exports = TodoTask; 