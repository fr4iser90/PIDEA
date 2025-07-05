/**
 * TaskTemplate Entity
 * Manages reusable task templates with validation and business logic
 */
const { v4: uuidv4 } = require('uuid');
const TaskType = require('@domain/value-objects/TaskType');
const TaskPriority = require('@domain/value-objects/TaskPriority');

class TaskTemplate {
  constructor(
    id = uuidv4(),
    name,
    description,
    type,
    priority = TaskPriority.getDefault(),
    template = {},
    variables = [],
    metadata = {},
    isActive = true,
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    this._id = id;
    this._name = name;
    this._description = description;
    this._type = new TaskType(type);
    this._priority = new TaskPriority(priority);
    this._template = { ...template };
    this._variables = [...variables];
    this._metadata = { ...metadata };
    this._isActive = isActive;
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(updatedAt);
    this._usageCount = 0;
    this._lastUsedAt = null;
    this._tags = [];
    this._category = null;
    this._version = '1.0.0';

    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get name() { return this._name; }
  get description() { return this._description; }
  get type() { return this._type; }
  get priority() { return this._priority; }
  get template() { return { ...this._template }; }
  get variables() { return [...this._variables]; }
  get metadata() { return { ...this._metadata }; }
  get isActive() { return this._isActive; }
  get createdAt() { return new Date(this._createdAt); }
  get updatedAt() { return new Date(this._updatedAt); }
  get usageCount() { return this._usageCount; }
  get lastUsedAt() { return this._lastUsedAt ? new Date(this._lastUsedAt) : null; }
  get tags() { return [...this._tags]; }
  get category() { return this._category; }
  get version() { return this._version; }

  // Domain methods
  isActive() {
    return this._isActive;
  }

  isInactive() {
    return !this._isActive;
  }

  requiresAI() {
    return this._type.requiresAI();
  }

  requiresExecution() {
    return this._type.requiresExecution();
  }

  requiresHumanReview() {
    return this._type.requiresHumanReview();
  }

  hasVariables() {
    return this._variables.length > 0;
  }

  hasRequiredVariables() {
    return this._variables.some(variable => variable.required);
  }

  getRequiredVariables() {
    return this._variables.filter(variable => variable.required);
  }

  getOptionalVariables() {
    return this._variables.filter(variable => !variable.required);
  }

  getVariableByName(name) {
    return this._variables.find(variable => variable.name === name);
  }

  // Template instantiation
  instantiate(variableValues = {}) {
    this._validateVariableValues(variableValues);
    
    const instantiatedTemplate = JSON.parse(JSON.stringify(this._template));
    
    // Replace variables in template
    this._variables.forEach(variable => {
      const value = variableValues[variable.name] || variable.defaultValue;
      this._replaceVariableInObject(instantiatedTemplate, variable.name, value);
    });

    return {
      title: instantiatedTemplate.title,
      description: instantiatedTemplate.description,
      type: this._type.value,
      priority: this._priority.value,
      estimatedDuration: instantiatedTemplate.estimatedDuration || this._type.getEstimatedDuration(),
      metadata: {
        ...instantiatedTemplate.metadata,
        templateId: this._id,
        templateName: this._name,
        templateVersion: this._version,
        variableValues
      }
    };
  }

  _replaceVariableInObject(obj, variableName, value) {
    const placeholder = `{{${variableName}}}`;
    
    if (typeof obj === 'string') {
      return obj.replace(new RegExp(placeholder, 'g'), value);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].replace(new RegExp(placeholder, 'g'), value);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          this._replaceVariableInObject(obj[key], variableName, value);
        }
      }
    }
  }

  // Usage tracking
  incrementUsage() {
    this._usageCount++;
    this._lastUsedAt = new Date();
    this._updatedAt = new Date();
  }

  resetUsage() {
    this._usageCount = 0;
    this._lastUsedAt = null;
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

  // Template content management
  updateTemplate(template) {
    this._template = { ...template };
    this._updatedAt = new Date();
  }

  // Variables management
  addVariable(variable) {
    this._validateVariable(variable);
    
    const existingIndex = this._variables.findIndex(v => v.name === variable.name);
    if (existingIndex >= 0) {
      this._variables[existingIndex] = variable;
    } else {
      this._variables.push(variable);
    }
    
    this._updatedAt = new Date();
  }

  removeVariable(variableName) {
    const index = this._variables.findIndex(v => v.name === variableName);
    if (index > -1) {
      this._variables.splice(index, 1);
      this._updatedAt = new Date();
    }
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

  // Validation
  _validate() {
    if (!this._name || typeof this._name !== 'string' || this._name.trim().length === 0) {
      throw new Error('Template name is required and must be a non-empty string');
    }

    if (!this._description || typeof this._description !== 'string' || this._description.trim().length === 0) {
      throw new Error('Template description is required and must be a non-empty string');
    }

    if (!this._template || typeof this._template !== 'object') {
      throw new Error('Template content is required and must be an object');
    }

    if (!this._template.title || !this._template.description) {
      throw new Error('Template must contain title and description');
    }

    this._variables.forEach(variable => this._validateVariable(variable));
  }

  _validateVariable(variable) {
    if (!variable.name || typeof variable.name !== 'string') {
      throw new Error('Variable name is required and must be a string');
    }

    if (variable.type && !['string', 'number', 'boolean', 'array', 'object'].includes(variable.type)) {
      throw new Error('Invalid variable type');
    }

    if (variable.required && variable.defaultValue !== undefined) {
      throw new Error('Required variables cannot have default values');
    }
  }

  _validateVariableValues(variableValues) {
    const requiredVariables = this.getRequiredVariables();
    
    for (const variable of requiredVariables) {
      if (!(variable.name in variableValues)) {
        throw new Error(`Required variable '${variable.name}' is missing`);
      }
    }

    for (const [name, value] of Object.entries(variableValues)) {
      const variable = this.getVariableByName(name);
      if (!variable) {
        throw new Error(`Unknown variable '${name}'`);
      }
    }
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      type: this._type.value,
      priority: this._priority.value,
      template: this._template,
      variables: this._variables,
      metadata: this._metadata,
      isActive: this._isActive,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      usageCount: this._usageCount,
      lastUsedAt: this._lastUsedAt ? this._lastUsedAt.toISOString() : null,
      tags: this._tags,
      category: this._category,
      version: this._version,
      requiresAI: this.requiresAI(),
      requiresExecution: this.requiresExecution(),
      requiresHumanReview: this.requiresHumanReview()
    };
  }

  static fromJSON(data) {
    return new TaskTemplate(
      data.id,
      data.name,
      data.description,
      data.type,
      data.priority,
      data.template,
      data.variables,
      data.metadata,
      data.isActive,
      data.createdAt,
      data.updatedAt
    );
  }

  static create(
    name,
    description,
    type,
    template,
    variables = [],
    priority = TaskPriority.getDefault(),
    metadata = {}
  ) {
    return new TaskTemplate(
      null,
      name,
      description,
      type,
      priority,
      template,
      variables,
      metadata
    );
  }

  static createVariable(name, type = 'string', required = false, defaultValue = undefined, description = '') {
    return {
      name,
      type,
      required,
      defaultValue,
      description
    };
  }
}

module.exports = TaskTemplate; 