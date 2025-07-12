/**
 * GeneratedScript Entity
 * Manages automatically generated scripts with comprehensive business logic
 */
const { v4: uuidv4 } = require('uuid');
const TaskType = require('@value-objects/TaskType');

class GeneratedScript {
  constructor(
    id = uuidv4(),
    name,
    content,
    type,
    language = 'bash',
    metadata = {},
    isActive = true,
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    this._id = id;
    this._name = name;
    this._content = content;
    this._type = new TaskType(type);
    this._language = language;
    this._metadata = { ...metadata };
    this._isActive = isActive;
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(updatedAt);
    this._executionCount = 0;
    this._lastExecutedAt = null;
    this._successCount = 0;
    this._failureCount = 0;
    this._averageExecutionTime = 0;
    this._tags = [];
    this._category = null;
    this._version = '1.0.0';
    this._dependencies = [];
    this._environment = {};
    this._parameters = [];
    this._validationRules = [];

    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get name() { return this._name; }
  get content() { return this._content; }
  get type() { return this._type; }
  get language() { return this._language; }
  get metadata() { return { ...this._metadata }; }
  get isActive() { return this._isActive; }
  get createdAt() { return new Date(this._createdAt); }
  get updatedAt() { return new Date(this._updatedAt); }
  get executionCount() { return this._executionCount; }
  get lastExecutedAt() { return this._lastExecutedAt ? new Date(this._lastExecutedAt) : null; }
  get successCount() { return this._successCount; }
  get failureCount() { return this._failureCount; }
  get averageExecutionTime() { return this._averageExecutionTime; }
  get tags() { return [...this._tags]; }
  get category() { return this._category; }
  get version() { return this._version; }
  get dependencies() { return [...this._dependencies]; }
  get environment() { return { ...this._environment }; }
  get parameters() { return [...this._parameters]; }
  get validationRules() { return [...this._validationRules]; }

  // Domain methods
  isActive() {
    return this._isActive;
  }

  isInactive() {
    return !this._isActive;
  }

  hasBeenExecuted() {
    return this._executionCount > 0;
  }

  getSuccessRate() {
    if (this._executionCount === 0) {
      return 0;
    }
    return (this._successCount / this._executionCount) * 100;
  }

  getFailureRate() {
    if (this._executionCount === 0) {
      return 0;
    }
    return (this._failureCount / this._executionCount) * 100;
  }

  isReliable() {
    return this.getSuccessRate() >= 80;
  }

  isUnreliable() {
    return this.getFailureRate() >= 50;
  }

  requiresParameters() {
    return this._parameters.length > 0;
  }

  hasRequiredParameters() {
    return this._parameters.some(param => param.required);
  }

  getRequiredParameters() {
    return this._parameters.filter(param => param.required);
  }

  getOptionalParameters() {
    return this._parameters.filter(param => !param.required);
  }

  getParameterByName(name) {
    return this._parameters.find(param => param.name === name);
  }

  hasDependencies() {
    return this._dependencies.length > 0;
  }

  hasValidationRules() {
    return this._validationRules.length > 0;
  }

  // Execution tracking
  recordExecution(success = true, executionTime = 0) {
    this._executionCount++;
    this._lastExecutedAt = new Date();
    this._updatedAt = new Date();

    if (success) {
      this._successCount++;
    } else {
      this._failureCount++;
    }

    // Update average execution time
    if (executionTime > 0) {
      const totalTime = this._averageExecutionTime * (this._executionCount - 1) + executionTime;
      this._averageExecutionTime = totalTime / this._executionCount;
    }
  }

  resetExecutionStats() {
    this._executionCount = 0;
    this._lastExecutedAt = null;
    this._successCount = 0;
    this._failureCount = 0;
    this._averageExecutionTime = 0;
    this._updatedAt = new Date();
  }

  // State management
  activate() {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  deactivate() {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  // Version management
  updateVersion(version) {
    this._version = version;
    this._updatedAt = new Date();
  }

  incrementVersion() {
    const [major, minor, patch] = this._version.split('.').map(Number);
    this._version = `${major}.${minor}.${patch + 1}`;
    this._updatedAt = new Date();
  }

  // Content management
  updateContent(content, language = null) {
    this._content = content;
    if (language) {
      this._language = language;
    }
    this._updatedAt = new Date();
  }

  // Parameters management
  addParameter(parameter) {
    this._validateParameter(parameter);
    
    const existingIndex = this._parameters.findIndex(p => p.name === parameter.name);
    if (existingIndex >= 0) {
      this._parameters[existingIndex] = parameter;
    } else {
      this._parameters.push(parameter);
    }
    
    this._updatedAt = new Date();
  }

  removeParameter(parameterName) {
    const index = this._parameters.findIndex(p => p.name === parameterName);
    if (index > -1) {
      this._parameters.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  // Dependencies management
  addDependency(dependency) {
    if (!this._dependencies.includes(dependency)) {
      this._dependencies.push(dependency);
      this._updatedAt = new Date();
    }
  }

  removeDependency(dependency) {
    const index = this._dependencies.indexOf(dependency);
    if (index > -1) {
      this._dependencies.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  // Environment management
  setEnvironmentVariable(key, value) {
    this._environment[key] = value;
    this._updatedAt = new Date();
  }

  getEnvironmentVariable(key) {
    return this._environment[key];
  }

  removeEnvironmentVariable(key) {
    delete this._environment[key];
    this._updatedAt = new Date();
  }

  // Validation rules management
  addValidationRule(rule) {
    this._validateRule(rule);
    this._validationRules.push(rule);
    this._updatedAt = new Date();
  }

  removeValidationRule(ruleName) {
    const index = this._validationRules.findIndex(r => r.name === ruleName);
    if (index > -1) {
      this._validationRules.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  // Tags management
  addTag(tag) {
    if (!this._tags.includes(tag)) {
      this._tags.push(tag);
      this._updatedAt = new Date();
    }
  }

  removeTag(tag) {
    const index = this._tags.indexOf(tag);
    if (index > -1) {
      this._tags.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  hasTag(tag) {
    return this._tags.includes(tag);
  }

  // Category management
  setCategory(category) {
    this._category = category;
    this._updatedAt = new Date();
  }

  removeCategory() {
    this._category = null;
    this._updatedAt = new Date();
  }

  // Metadata management
  setMetadata(key, value) {
    this._metadata[key] = value;
    this._updatedAt = new Date();
  }

  getMetadata(key) {
    return this._metadata[key];
  }

  removeMetadata(key) {
    delete this._metadata[key];
    this._updatedAt = new Date();
  }

  // Script execution preparation
  prepareForExecution(parameterValues = {}) {
    this._validateParameterValues(parameterValues);
    
    let preparedContent = this._content;
    
    // Replace parameters in script content
    this._parameters.forEach(parameter => {
      const value = parameterValues[parameter.name] || parameter.defaultValue;
      const placeholder = `{{${parameter.name}}}`;
      preparedContent = preparedContent.replace(new RegExp(placeholder, 'g'), value);
    });

    return {
      content: preparedContent,
      language: this._language,
      environment: { ...this._environment },
      dependencies: [...this._dependencies],
      validationRules: [...this._validationRules],
      metadata: {
        ...this._metadata,
        scriptId: this._id,
        scriptName: this._name,
        scriptVersion: this._version,
        parameterValues
      }
    };
  }

  // Validation
  _validate() {
    if (!this._name || typeof this._name !== 'string' || this._name.trim().length === 0) {
      throw new Error('Script name is required and must be a non-empty string');
    }

    if (!this._content || typeof this._content !== 'string' || this._content.trim().length === 0) {
      throw new Error('Script content is required and must be a non-empty string');
    }

    if (!this._language || typeof this._language !== 'string') {
      throw new Error('Script language is required and must be a string');
    }

    if (this._executionCount < 0) {
      throw new Error('Execution count cannot be negative');
    }

    if (this._successCount < 0 || this._failureCount < 0) {
      throw new Error('Success and failure counts cannot be negative');
    }

    this._parameters.forEach(parameter => this._validateParameter(parameter));
    this._validationRules.forEach(rule => this._validateRule(rule));
  }

  _validateParameter(parameter) {
    if (!parameter.name || typeof parameter.name !== 'string') {
      throw new Error('Parameter name is required and must be a string');
    }

    if (parameter.type && !['string', 'number', 'boolean', 'array', 'object'].includes(parameter.type)) {
      throw new Error('Invalid parameter type');
    }

    if (parameter.required && parameter.defaultValue !== undefined) {
      throw new Error('Required parameters cannot have default values');
    }
  }

  _validateRule(rule) {
    if (!rule.name || typeof rule.name !== 'string') {
      throw new Error('Validation rule name is required and must be a string');
    }

    if (!rule.condition || typeof rule.condition !== 'function') {
      throw new Error('Validation rule condition is required and must be a function');
    }
  }

  _validateParameterValues(parameterValues) {
    const requiredParameters = this.getRequiredParameters();
    
    for (const parameter of requiredParameters) {
      if (!(parameter.name in parameterValues)) {
        throw new Error(`Required parameter '${parameter.name}' is missing`);
      }
    }

    for (const [name, value] of Object.entries(parameterValues)) {
      const parameter = this.getParameterByName(name);
      if (!parameter) {
        throw new Error(`Unknown parameter '${name}'`);
      }
    }
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      name: this._name,
      content: this._content,
      type: this._type.value,
      language: this._language,
      metadata: this._metadata,
      isActive: this._isActive,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      executionCount: this._executionCount,
      lastExecutedAt: this._lastExecutedAt ? this._lastExecutedAt.toISOString() : null,
      successCount: this._successCount,
      failureCount: this._failureCount,
      averageExecutionTime: this._averageExecutionTime,
      tags: this._tags,
      category: this._category,
      version: this._version,
      dependencies: this._dependencies,
      environment: this._environment,
      parameters: this._parameters,
      validationRules: this._validationRules,
      successRate: this.getSuccessRate(),
      failureRate: this.getFailureRate(),
      isReliable: this.isReliable(),
      isUnreliable: this.isUnreliable(),
      hasBeenExecuted: this.hasBeenExecuted(),
      requiresParameters: this.requiresParameters()
    };
  }

  static fromJSON(data) {
    return new GeneratedScript(
      data.id,
      data.name,
      data.content,
      data.type,
      data.language,
      data.metadata,
      data.isActive,
      data.createdAt,
      data.updatedAt
    );
  }

  static create(
    name,
    content,
    type,
    language = 'bash',
    metadata = {}
  ) {
    return new GeneratedScript(
      null,
      name,
      content,
      type,
      language,
      metadata
    );
  }

  static createParameter(name, type = 'string', required = false, defaultValue = undefined, description = '') {
    return {
      name,
      type,
      required,
      defaultValue,
      description
    };
  }

  static createValidationRule(name, condition, message = '') {
    return {
      name,
      condition,
      message
    };
  }
}

module.exports = GeneratedScript; 