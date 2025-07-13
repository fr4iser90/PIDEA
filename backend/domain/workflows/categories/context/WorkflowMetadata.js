/**
 * WorkflowMetadata - Flexible metadata management for workflows
 * Provides tags, labels, schema validation, and custom validators
 */
const { v4: uuidv4 } = require('uuid');

class WorkflowMetadata {
  constructor(
    id = uuidv4(),
    data = {},
    tags = [],
    labels = {},
    schema = null,
    validators = [],
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    this._id = id;
    this._data = { ...data };
    this._tags = [...tags];
    this._labels = { ...labels };
    this._schema = schema;
    this._validators = [...validators];
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(updatedAt);
    this._version = 1;

    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get data() { return { ...this._data }; }
  get tags() { return [...this._tags]; }
  get labels() { return { ...this._labels }; }
  get schema() { return this._schema; }
  get validators() { return [...this._validators]; }
  get createdAt() { return new Date(this._createdAt); }
  get updatedAt() { return new Date(this._updatedAt); }
  get version() { return this._version; }

  // Data operations
  setData(key, value) {
    const newData = { ...this._data, [key]: value };
    return new WorkflowMetadata(
      this._id,
      newData,
      this._tags,
      this._labels,
      this._schema,
      this._validators,
      this._createdAt,
      new Date()
    );
  }

  updateData(data) {
    const newData = { ...this._data, ...data };
    return new WorkflowMetadata(
      this._id,
      newData,
      this._tags,
      this._labels,
      this._schema,
      this._validators,
      this._createdAt,
      new Date()
    );
  }

  removeData(key) {
    const newData = { ...this._data };
    delete newData[key];
    return new WorkflowMetadata(
      this._id,
      newData,
      this._tags,
      this._labels,
      this._schema,
      this._validators,
      this._createdAt,
      new Date()
    );
  }

  getData(key, defaultValue = null) {
    return this._data[key] !== undefined ? this._data[key] : defaultValue;
  }

  hasData(key) {
    return this._data[key] !== undefined;
  }

  getAllData() {
    return { ...this._data };
  }

  // Tag operations
  addTag(tag) {
    if (!this._tags.includes(tag)) {
      const newTags = [...this._tags, tag];
      return new WorkflowMetadata(
        this._id,
        this._data,
        newTags,
        this._labels,
        this._schema,
        this._validators,
        this._createdAt,
        new Date()
      );
    }
    return this;
  }

  removeTag(tag) {
    const newTags = this._tags.filter(t => t !== tag);
    return new WorkflowMetadata(
      this._id,
      this._data,
      newTags,
      this._labels,
      this._schema,
      this._validators,
      this._createdAt,
      new Date()
    );
  }

  hasTag(tag) {
    return this._tags.includes(tag);
  }

  getTagsByPrefix(prefix) {
    return this._tags.filter(tag => tag.startsWith(prefix));
  }

  // Label operations
  setLabel(key, value) {
    const newLabels = { ...this._labels, [key]: value };
    return new WorkflowMetadata(
      this._id,
      this._data,
      this._tags,
      newLabels,
      this._schema,
      this._validators,
      this._createdAt,
      new Date()
    );
  }

  updateLabels(labels) {
    const newLabels = { ...this._labels, ...labels };
    return new WorkflowMetadata(
      this._id,
      this._data,
      this._tags,
      newLabels,
      this._schema,
      this._validators,
      this._createdAt,
      new Date()
    );
  }

  removeLabel(key) {
    const newLabels = { ...this._labels };
    delete newLabels[key];
    return new WorkflowMetadata(
      this._id,
      this._data,
      this._tags,
      newLabels,
      this._schema,
      this._validators,
      this._createdAt,
      new Date()
    );
  }

  getLabel(key, defaultValue = null) {
    return this._labels[key] !== undefined ? this._labels[key] : defaultValue;
  }

  hasLabel(key) {
    return this._labels[key] !== undefined;
  }

  getLabelsByPrefix(prefix) {
    const result = {};
    for (const [key, value] of Object.entries(this._labels)) {
      if (key.startsWith(prefix)) {
        result[key] = value;
      }
    }
    return result;
  }

  // Schema operations
  setSchema(schema) {
    return new WorkflowMetadata(
      this._id,
      this._data,
      this._tags,
      this._labels,
      schema,
      this._validators,
      this._createdAt,
      new Date()
    );
  }

  validateSchema() {
    if (!this._schema) {
      return { isValid: true, errors: [] };
    }

    const errors = [];
    try {
      // Basic schema validation - can be extended with JSON Schema or similar
      if (typeof this._schema === 'object') {
        for (const [key, rules] of Object.entries(this._schema)) {
          if (rules.required && !this.hasData(key)) {
            errors.push({
              field: key,
              message: `Required field '${key}' is missing`,
              code: 'REQUIRED_FIELD_MISSING'
            });
          }

          if (this.hasData(key)) {
            const value = this.getData(key);
            
            if (rules.type && typeof value !== rules.type) {
              errors.push({
                field: key,
                message: `Field '${key}' must be of type '${rules.type}'`,
                code: 'INVALID_TYPE'
              });
            }

            if (rules.minLength && value.length < rules.minLength) {
              errors.push({
                field: key,
                message: `Field '${key}' must be at least ${rules.minLength} characters`,
                code: 'MIN_LENGTH_VIOLATION'
              });
            }

            if (rules.maxLength && value.length > rules.maxLength) {
              errors.push({
                field: key,
                message: `Field '${key}' must be at most ${rules.maxLength} characters`,
                code: 'MAX_LENGTH_VIOLATION'
              });
            }

            if (rules.pattern && !rules.pattern.test(value)) {
              errors.push({
                field: key,
                message: `Field '${key}' does not match required pattern`,
                code: 'PATTERN_MISMATCH'
              });
            }
          }
        }
      }
    } catch (error) {
      errors.push({
        field: 'schema',
        message: `Schema validation error: ${error.message}`,
        code: 'SCHEMA_VALIDATION_ERROR'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validator operations
  addValidator(validator) {
    const newValidators = [...this._validators, validator];
    return new WorkflowMetadata(
      this._id,
      this._data,
      this._tags,
      this._labels,
      this._schema,
      newValidators,
      this._createdAt,
      new Date()
    );
  }

  removeValidator(validatorId) {
    const newValidators = this._validators.filter(v => v.id !== validatorId);
    return new WorkflowMetadata(
      this._id,
      this._data,
      this._tags,
      this._labels,
      this._schema,
      newValidators,
      this._createdAt,
      new Date()
    );
  }

  async validate() {
    const results = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Schema validation
    const schemaValidation = this.validateSchema();
    if (!schemaValidation.isValid) {
      results.isValid = false;
      results.errors.push(...schemaValidation.errors);
    }

    // Custom validators
    for (const validator of this._validators) {
      try {
        if (typeof validator.validate === 'function') {
          const validationResult = await validator.validate(this);
          if (!validationResult.isValid) {
            results.isValid = false;
            results.errors.push(...validationResult.errors);
          }
          if (validationResult.warnings) {
            results.warnings.push(...validationResult.warnings);
          }
        }
      } catch (error) {
        results.isValid = false;
        results.errors.push({
          field: 'validator',
          message: `Validator error: ${error.message}`,
          code: 'VALIDATOR_ERROR',
          validatorId: validator.id
        });
      }
    }

    return results;
  }

  // Search and filtering
  search(query) {
    const results = [];
    const searchTerm = query.toLowerCase();

    // Search in data
    for (const [key, value] of Object.entries(this._data)) {
      if (key.toLowerCase().includes(searchTerm) || 
          String(value).toLowerCase().includes(searchTerm)) {
        results.push({
          type: 'data',
          key,
          value,
          match: key.toLowerCase().includes(searchTerm) ? 'key' : 'value'
        });
      }
    }

    // Search in tags
    for (const tag of this._tags) {
      if (tag.toLowerCase().includes(searchTerm)) {
        results.push({
          type: 'tag',
          value: tag,
          match: 'tag'
        });
      }
    }

    // Search in labels
    for (const [key, value] of Object.entries(this._labels)) {
      if (key.toLowerCase().includes(searchTerm) || 
          String(value).toLowerCase().includes(searchTerm)) {
        results.push({
          type: 'label',
          key,
          value,
          match: key.toLowerCase().includes(searchTerm) ? 'key' : 'value'
        });
      }
    }

    return results;
  }

  filterByTags(tags) {
    return tags.every(tag => this.hasTag(tag));
  }

  filterByLabels(labels) {
    return Object.entries(labels).every(([key, value]) => 
      this.getLabel(key) === value
    );
  }

  // Utility methods
  getSummary() {
    return {
      id: this._id,
      dataCount: Object.keys(this._data).length,
      tagCount: this._tags.length,
      labelCount: Object.keys(this._labels).length,
      hasSchema: !!this._schema,
      validatorCount: this._validators.length,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      version: this._version
    };
  }

  isEmpty() {
    return Object.keys(this._data).length === 0 && this._tags.length === 0 && Object.keys(this._labels).length === 0;
  }
  size() {
    return {
      data: Object.keys(this._data).length,
      tags: this._tags.length,
      labels: Object.keys(this._labels).length
    };
  }

  // Validation
  _validate() {
    if (this._schema && typeof this._schema !== 'object') {
      throw new Error('Schema must be an object');
    }

    if (!Array.isArray(this._validators)) {
      throw new Error('Validators must be an array');
    }

    for (const validator of this._validators) {
      if (typeof validator.validate !== 'function') {
        throw new Error('Each validator must have a validate function');
      }
    }
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      data: this._data,
      tags: this._tags,
      labels: this._labels,
      schema: this._schema,
      validators: this._validators,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      version: this._version
    };
  }

  static fromJSON(data) {
    return new WorkflowMetadata(
      data.id,
      data.data,
      data.tags,
      data.labels,
      data.schema,
      data.validators,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }

  // Factory methods
  static create(data = {}, tags = [], labels = {}) {
    return new WorkflowMetadata(uuidv4(), data, tags, labels);
  }

  static createWithSchema(data = {}, schema = {}, tags = [], labels = {}) {
    return new WorkflowMetadata(uuidv4(), data, tags, labels, schema);
  }

  static createWithValidators(data = {}, validators = [], tags = [], labels = {}) {
    return new WorkflowMetadata(uuidv4(), data, tags, labels, null, validators);
  }
}

module.exports = WorkflowMetadata; 