/**
 * WorkflowContext - Implementation of IWorkflowContext
 * Manages workflow execution context including state, metadata, and data
 */
const { v4: uuidv4 } = require('uuid');
const IWorkflowContext = require('../interfaces/IWorkflowContext');
const WorkflowState = require('./WorkflowState');
const WorkflowMetadata = require('./WorkflowMetadata');

class WorkflowContext extends IWorkflowContext {
  constructor(
    workflowId = uuidv4(),
    workflowType = 'default',
    workflowVersion = '1.0.0',
    state = null,
    metadata = null,
    data = {},
    dependencies = [],
    createdAt = new Date()
  ) {
    super();
    
    this._workflowId = workflowId;
    this._workflowType = workflowType;
    this._workflowVersion = workflowVersion;
    this._state = state || WorkflowState.createPending();
    this._metadata = metadata || WorkflowMetadata.create();
    this._data = { ...data };
    this._dependencies = [...dependencies];
    this._metrics = {};
    this._logs = [];
    this._executionHistory = [];
    this._result = null;
    this._error = null;
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(createdAt);

    this._validate();
  }

  // IWorkflowContext implementation
  getState() {
    return this._state;
  }

  setState(state) {
    if (!(state instanceof WorkflowState)) {
      throw new Error('State must be an instance of WorkflowState');
    }
    this._state = state;
    this._updatedAt = new Date();
  }

  getMetadata() {
    return this._metadata;
  }

  setMetadata(metadata) {
    if (!(metadata instanceof WorkflowMetadata)) {
      throw new Error('Metadata must be an instance of WorkflowMetadata');
    }
    this._metadata = metadata;
    this._updatedAt = new Date();
  }

  getData(key) {
    return this._data[key];
  }

  setData(key, value) {
    this._data[key] = value;
    this._updatedAt = new Date();
  }

  hasData(key) {
    return this._data[key] !== undefined;
  }

  removeData(key) {
    delete this._data[key];
    this._updatedAt = new Date();
  }

  getAllData() {
    return { ...this._data };
  }

  getWorkflowId() {
    return this._workflowId;
  }

  getWorkflowType() {
    return this._workflowType;
  }

  getWorkflowVersion() {
    return this._workflowVersion;
  }

  getDependencies() {
    return [...this._dependencies];
  }

  addDependency(dependencyId) {
    if (!this._dependencies.includes(dependencyId)) {
      this._dependencies.push(dependencyId);
      this._updatedAt = new Date();
    }
  }

  removeDependency(dependencyId) {
    const index = this._dependencies.indexOf(dependencyId);
    if (index > -1) {
      this._dependencies.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  getMetrics() {
    return { ...this._metrics };
  }

  setMetric(key, value) {
    this._metrics[key] = value;
    this._updatedAt = new Date();
  }

  getLogs() {
    return [...this._logs];
  }

  addLog(level, message, data = null) {
    this._logs.push({
      id: uuidv4(),
      level,
      message,
      data,
      timestamp: new Date()
    });
    this._updatedAt = new Date();
  }

  clearLogs() {
    this._logs = [];
    this._updatedAt = new Date();
  }

  getExecutionHistory() {
    return [...this._executionHistory];
  }

  addExecutionHistory(action, data = null) {
    this._executionHistory.push({
      id: uuidv4(),
      action,
      data,
      timestamp: new Date()
    });
    this._updatedAt = new Date();
  }

  isCompleted() {
    return this._state.isCompleted();
  }

  isFailed() {
    return this._state.isFailed();
  }

  isCancelled() {
    return this._state.isCancelled();
  }

  getResult() {
    return this._result;
  }

  setResult(result) {
    this._result = result;
    this._updatedAt = new Date();
  }

  getError() {
    return this._error;
  }

  setError(error) {
    this._error = error;
    this._updatedAt = new Date();
  }

  // Additional convenience methods
  getLogsByLevel(level) {
    return this._logs.filter(log => log.level === level);
  }

  getRecentLogs(limit = 10) {
    return this._logs.slice(-limit);
  }

  getLogsInRange(startTime, endTime) {
    return this._logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  getExecutionHistoryByAction(action) {
    return this._executionHistory.filter(entry => entry.action === action);
  }

  getRecentExecutionHistory(limit = 10) {
    return this._executionHistory.slice(-limit);
  }

  getMetric(key, defaultValue = null) {
    return this._metrics[key] !== undefined ? this._metrics[key] : defaultValue;
  }

  hasMetric(key) {
    return this._metrics[key] !== undefined;
  }

  removeMetric(key) {
    delete this._metrics[key];
    this._updatedAt = new Date();
  }

  incrementMetric(key, amount = 1) {
    const currentValue = this.getMetric(key, 0);
    this.setMetric(key, currentValue + amount);
  }

  decrementMetric(key, amount = 1) {
    const currentValue = this.getMetric(key, 0);
    this.setMetric(key, currentValue - amount);
  }

  // State transition helpers
  transitionTo(newStatus, data = {}, metadata = {}) {
    const newState = this._state.transitionTo(newStatus, data, metadata);
    this.setState(newState);
    this.addExecutionHistory('state_transition', {
      from: this._state.status,
      to: newStatus,
      data,
      metadata
    });
    return newState;
  }

  // Metadata helpers
  setMetadataData(key, value) {
    this._metadata = this._metadata.setData(key, value);
    this._updatedAt = new Date();
  }

  getMetadataData(key, defaultValue = null) {
    return this._metadata.getData(key, defaultValue);
  }

  hasMetadataData(key) {
    return this._metadata.hasData(key);
  }

  addMetadataTag(tag) {
    this._metadata = this._metadata.addTag(tag);
    this._updatedAt = new Date();
  }

  removeMetadataTag(tag) {
    this._metadata = this._metadata.removeTag(tag);
    this._updatedAt = new Date();
  }

  hasMetadataTag(tag) {
    return this._metadata.hasTag(tag);
  }

  setMetadataLabel(key, value) {
    this._metadata = this._metadata.setLabel(key, value);
    this._updatedAt = new Date();
  }

  getMetadataLabel(key, defaultValue = null) {
    return this._metadata.getLabel(key, defaultValue);
  }

  hasMetadataLabel(key) {
    return this._metadata.hasLabel(key);
  }

  // Validation
  async validate() {
    const results = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate state
    if (!this._state) {
      results.isValid = false;
      results.errors.push({
        field: 'state',
        message: 'Workflow state is required',
        code: 'STATE_REQUIRED'
      });
    }

    // Validate metadata
    if (this._metadata) {
      try {
        const metadataValidation = await this._metadata.validate();
        if (!metadataValidation.isValid) {
          results.isValid = false;
          results.errors.push(...metadataValidation.errors);
        }
        if (metadataValidation.warnings) {
          results.warnings.push(...metadataValidation.warnings);
        }
      } catch (error) {
        results.isValid = false;
        results.errors.push({
          field: 'metadata',
          message: `Metadata validation error: ${error.message}`,
          code: 'METADATA_VALIDATION_ERROR'
        });
      }
    }

    // Validate workflow ID
    if (!this._workflowId) {
      results.isValid = false;
      results.errors.push({
        field: 'workflowId',
        message: 'Workflow ID is required',
        code: 'WORKFLOW_ID_REQUIRED'
      });
    }

    // Validate workflow type
    if (!this._workflowType) {
      results.isValid = false;
      results.errors.push({
        field: 'workflowType',
        message: 'Workflow type is required',
        code: 'WORKFLOW_TYPE_REQUIRED'
      });
    }

    return results;
  }

  // Utility methods
  getDuration() {
    return this._state.getDuration();
  }

  getFormattedDuration() {
    return this._state.getFormattedDuration();
  }

  getSummary() {
    return {
      workflowId: this._workflowId,
      workflowType: this._workflowType,
      workflowVersion: this._workflowVersion,
      status: this._state.status,
      dataCount: Object.keys(this._data).length,
      dependencyCount: this._dependencies.length,
      metricCount: Object.keys(this._metrics).length,
      logCount: this._logs.length,
      executionHistoryCount: this._executionHistory.length,
      isCompleted: this.isCompleted(),
      isFailed: this.isFailed(),
      isCancelled: this.isCancelled(),
      hasResult: this._result !== null,
      hasError: this._error !== null,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      duration: this.getDuration()
    };
  }

  // Validation
  _validate() {
    if (!this._workflowId) {
      throw new Error('Workflow ID is required');
    }

    if (!this._workflowType) {
      throw new Error('Workflow type is required');
    }

    if (!this._workflowVersion) {
      throw new Error('Workflow version is required');
    }

    if (!this._state) {
      throw new Error('Workflow state is required');
    }

    if (!this._metadata) {
      throw new Error('Workflow metadata is required');
    }
  }

  // Serialization
  toJSON() {
    return {
      workflowId: this._workflowId,
      workflowType: this._workflowType,
      workflowVersion: this._workflowVersion,
      state: this._state.toJSON(),
      metadata: this._metadata.toJSON(),
      data: this._data,
      dependencies: this._dependencies,
      metrics: this._metrics,
      logs: this._logs,
      executionHistory: this._executionHistory,
      result: this._result,
      error: this._error,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }

  static fromJSON(data) {
    const context = new WorkflowContext(
      data.workflowId,
      data.workflowType,
      data.workflowVersion,
      WorkflowState.fromJSON(data.state),
      WorkflowMetadata.fromJSON(data.metadata),
      data.data,
      data.dependencies,
      new Date(data.createdAt)
    );

    context._metrics = data.metrics || {};
    context._logs = data.logs || [];
    context._executionHistory = data.executionHistory || [];
    context._result = data.result;
    context._error = data.error;
    context._updatedAt = new Date(data.updatedAt);

    return context;
  }

  // Factory methods
  static create(workflowId, workflowType, workflowVersion = '1.0.0') {
    return new WorkflowContext(workflowId, workflowType, workflowVersion);
  }

  static createWithData(workflowId, workflowType, data, workflowVersion = '1.0.0') {
    return new WorkflowContext(workflowId, workflowType, workflowVersion, null, null, data);
  }

  static createWithState(workflowId, workflowType, state, workflowVersion = '1.0.0') {
    return new WorkflowContext(workflowId, workflowType, workflowVersion, state);
  }

  static createWithMetadata(workflowId, workflowType, metadata, workflowVersion = '1.0.0') {
    return new WorkflowContext(workflowId, workflowType, workflowVersion, null, metadata);
  }
}

module.exports = WorkflowContext; 