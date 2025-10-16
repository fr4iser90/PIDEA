/**
 * ExecuteTaskCommand
 * Command for executing a task
 */
export class ExecuteTaskCommand {
  constructor(taskId, options = {}) {
    this._taskId = taskId;
    this._priority = options.priority || 'medium';
    this._metadata = options.metadata || {};
    this._parameters = options.parameters || {};
    this._timeout = options.timeout || null;
  }

  get taskId() {
    return this._taskId;
  }

  get priority() {
    return this._priority;
  }

  get metadata() {
    return this._metadata;
  }

  get parameters() {
    return this._parameters;
  }

  get timeout() {
    return this._timeout;
  }

  toJSON() {
    return {
      taskId: this._taskId,
      priority: this._priority,
      metadata: this._metadata,
      parameters: this._parameters,
      timeout: this._timeout
    };
  }

  static fromJSON(data) {
    return new ExecuteTaskCommand(
      data.taskId,
      {
        priority: data.priority,
        metadata: data.metadata,
        parameters: data.parameters,
        timeout: data.timeout
      }
    );
  }
}
