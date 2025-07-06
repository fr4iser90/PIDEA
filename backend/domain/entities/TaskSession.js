const { v4: uuidv4 } = require('uuid');

/**
 * TaskSession - Entity representing an auto-finish processing session
 * Tracks the state and progress of TODO list processing
 */
class TaskSession {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.userId = data.userId || null;
    this.projectId = data.projectId || null;
    this.todoInput = data.todoInput || '';
    this.options = data.options || {};
    this.status = data.status || 'pending'; // pending, started, running, completed, failed, cancelled
    this.tasks = data.tasks || [];
    this.totalTasks = data.totalTasks || 0;
    this.completedTasks = data.completedTasks || 0;
    this.failedTasks = data.failedTasks || 0;
    this.currentTaskIndex = data.currentTaskIndex || 0;
    this.progress = data.progress || 0;
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || null;
    this.duration = data.duration || 0;
    this.result = data.result || null;
    this.error = data.error || null;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Start the session
   */
  start() {
    this.status = 'started';
    this.startTime = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Mark session as running
   */
  setRunning() {
    this.status = 'running';
    this.updatedAt = new Date();
  }

  /**
   * Update session progress
   * @param {number} completedTasks - Number of completed tasks
   * @param {number} totalTasks - Total number of tasks
   * @param {number} currentTaskIndex - Current task index
   */
  updateProgress(completedTasks, totalTasks, currentTaskIndex) {
    this.completedTasks = completedTasks;
    this.totalTasks = totalTasks;
    this.currentTaskIndex = currentTaskIndex;
    this.progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    this.updatedAt = new Date();
  }

  /**
   * Complete the session
   * @param {Object} result - Session result
   */
  complete(result) {
    this.status = 'completed';
    this.endTime = new Date();
    this.duration = this.endTime.getTime() - this.startTime.getTime();
    this.result = result;
    this.progress = 100;
    this.updatedAt = new Date();
  }

  /**
   * Fail the session
   * @param {string} error - Error message
   */
  fail(error) {
    this.status = 'failed';
    this.endTime = new Date();
    this.duration = this.endTime.getTime() - this.startTime.getTime();
    this.error = error;
    this.updatedAt = new Date();
  }

  /**
   * Cancel the session
   */
  cancel() {
    this.status = 'cancelled';
    this.endTime = new Date();
    this.duration = this.endTime.getTime() - this.startTime.getTime();
    this.updatedAt = new Date();
  }

  /**
   * Add task to session
   * @param {Object} task - Task object
   */
  addTask(task) {
    this.tasks.push(task);
    this.totalTasks = this.tasks.length;
    this.updatedAt = new Date();
  }

  /**
   * Update task status
   * @param {string} taskId - Task ID
   * @param {string} status - New status
   * @param {Object} result - Task result
   */
  updateTaskStatus(taskId, status, result = null) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      if (result) {
        task.result = result;
      }
      
      if (status === 'completed') {
        this.completedTasks++;
      } else if (status === 'failed') {
        this.failedTasks++;
      }
      
      this.updateProgress(this.completedTasks, this.totalTasks, this.currentTaskIndex);
    }
  }

  /**
   * Get current task
   * @returns {Object|null} Current task
   */
  getCurrentTask() {
    if (this.currentTaskIndex >= 0 && this.currentTaskIndex < this.tasks.length) {
      return this.tasks[this.currentTaskIndex];
    }
    return null;
  }

  /**
   * Move to next task
   * @returns {Object|null} Next task
   */
  nextTask() {
    if (this.currentTaskIndex < this.tasks.length - 1) {
      this.currentTaskIndex++;
      this.updatedAt = new Date();
      return this.getCurrentTask();
    }
    return null;
  }

  /**
   * Check if session is active
   * @returns {boolean} Is active
   */
  isActive() {
    return ['pending', 'started', 'running'].includes(this.status);
  }

  /**
   * Check if session is completed
   * @returns {boolean} Is completed
   */
  isCompleted() {
    return this.status === 'completed';
  }

  /**
   * Check if session is failed
   * @returns {boolean} Is failed
   */
  isFailed() {
    return this.status === 'failed';
  }

  /**
   * Check if session is cancelled
   * @returns {boolean} Is cancelled
   */
  isCancelled() {
    return this.status === 'cancelled';
  }

  /**
   * Get session statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const pendingTasks = this.tasks.filter(t => t.status === 'pending').length;
    const runningTasks = this.tasks.filter(t => t.status === 'running').length;
    
    return {
      totalTasks: this.totalTasks,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      pendingTasks,
      runningTasks,
      progress: this.progress,
      duration: this.duration,
      successRate: this.totalTasks > 0 ? (this.completedTasks / this.totalTasks) * 100 : 0
    };
  }

  /**
   * Get session summary
   * @returns {Object} Summary
   */
  getSummary() {
    return {
      id: this.id,
      status: this.status,
      progress: this.progress,
      totalTasks: this.totalTasks,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      duration: this.duration,
      startTime: this.startTime,
      endTime: this.endTime,
      error: this.error
    };
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      projectId: this.projectId,
      todoInput: this.todoInput,
      options: this.options,
      status: this.status,
      tasks: this.tasks,
      totalTasks: this.totalTasks,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      currentTaskIndex: this.currentTaskIndex,
      progress: this.progress,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      result: this.result,
      error: this.error,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create from plain object
   * @param {Object} data - Plain object
   * @returns {TaskSession} TaskSession instance
   */
  static fromJSON(data) {
    return new TaskSession(data);
  }

  /**
   * Validate session data
   * @param {Object} data - Session data
   * @returns {Object} Validation result
   */
  static validate(data) {
    const errors = [];
    
    if (!data.todoInput || typeof data.todoInput !== 'string') {
      errors.push('todoInput must be a non-empty string');
    }
    
    if (data.userId && typeof data.userId !== 'string') {
      errors.push('userId must be a string');
    }
    
    if (data.projectId && typeof data.projectId !== 'string') {
      errors.push('projectId must be a string');
    }
    
    if (data.status && !['pending', 'started', 'running', 'completed', 'failed', 'cancelled'].includes(data.status)) {
      errors.push('Invalid status value');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = TaskSession; 