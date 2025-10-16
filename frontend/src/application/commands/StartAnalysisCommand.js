/**
 * StartAnalysisCommand
 * Command for starting an analysis
 */
export class StartAnalysisCommand {
  constructor(projectId, category, options = {}) {
    this._projectId = projectId;
    this._category = category;
    this._priority = options.priority || 'medium';
    this._metadata = options.metadata || {};
    this._parameters = options.parameters || {};
    this._timeout = options.timeout || null;
    this._autoRun = options.autoRun || false;
  }

  get projectId() {
    return this._projectId;
  }

  get category() {
    return this._category;
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

  get autoRun() {
    return this._autoRun;
  }

  toJSON() {
    return {
      projectId: this._projectId,
      category: this._category,
      priority: this._priority,
      metadata: this._metadata,
      parameters: this._parameters,
      timeout: this._timeout,
      autoRun: this._autoRun
    };
  }

  static fromJSON(data) {
    return new StartAnalysisCommand(
      data.projectId,
      data.category,
      {
        priority: data.priority,
        metadata: data.metadata,
        parameters: data.parameters,
        timeout: data.timeout,
        autoRun: data.autoRun
      }
    );
  }
}
