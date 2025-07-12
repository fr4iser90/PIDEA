/**
 * ProcessTodoListCommand - Command for processing TODO lists with auto-finish system
 * Handles TODO list parsing, task sequencing, and execution
 */
class ProcessTodoListCommand {
  constructor(data = {}) {
    this.commandId = data.commandId || `todo-process-${Date.now()}`;
    this.todoInput = data.todoInput || '';
    this.userId = data.userId || null;
    this.projectId = data.projectId || null;
    this.options = data.options || {};
    this.metadata = data.metadata || {};
    this.timestamp = data.timestamp || new Date();
    
    // Validate required fields
    this.validate();
  }

  /**
   * Validate command data
   */
  validate() {
    const errors = [];
    
    if (!this.todoInput || typeof this.todoInput !== 'string') {
      errors.push('todoInput must be a non-empty string');
    }
    
    if (this.todoInput.length > 10000) {
      errors.push('todoInput must be less than 10,000 characters');
    }
    
    if (this.userId && typeof this.userId !== 'string') {
      errors.push('userId must be a string');
    }
    
    if (this.projectId && typeof this.projectId !== 'string') {
      errors.push('projectId must be a string');
    }
    
    if (this.options && typeof this.options !== 'object') {
      errors.push('options must be an object');
    }
    
    if (errors.length > 0) {
      throw new Error(`ProcessTodoListCommand validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get command summary
   * @returns {Object} Command summary
   */
  getSummary() {
    return {
      commandId: this.commandId,
      todoInputLength: this.todoInput.length,
      userId: this.userId,
      projectId: this.projectId,
      options: this.options,
      timestamp: this.timestamp
    };
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object
   */
  toJSON() {
    return {
      commandId: this.commandId,
      todoInput: this.todoInput,
      userId: this.userId,
      projectId: this.projectId,
      options: this.options,
      metadata: this.metadata,
      timestamp: this.timestamp
    };
  }

  /**
   * Create from plain object
   * @param {Object} data - Plain object
   * @returns {ProcessTodoListCommand} ProcessTodoListCommand instance
   */
  static fromJSON(data) {
    return new ProcessTodoListCommand(data);
  }
}

module.exports = ProcessTodoListCommand; 