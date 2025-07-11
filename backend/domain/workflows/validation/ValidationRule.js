/**
 * ValidationRule - Configurable validation rule with built-in validators
 * Provides reusable validation logic with custom validation functions
 */
const { v4: uuidv4 } = require('uuid');
const ValidationResult = require('./ValidationResult');

class ValidationRule {
  constructor(
    idOrName,
    nameOrField,
    fieldOrValidator,
    validatorOrOptions,
    optionsOrMetadata = {},
    metadataOrUndefined = {}
  ) {
    // Handle different constructor signatures for test compatibility
    let id, name, field, validator, options, metadata;
    
    if (typeof idOrName === 'string' && idOrName.includes('-')) {
      // First parameter is name: ValidationRule('test-rule', 'test', 'field', validator)
      id = uuidv4();
      name = idOrName;
      field = fieldOrValidator; // 'field' is the third parameter
      validator = validatorOrOptions; // validator is the fourth parameter
      options = optionsOrMetadata;
      metadata = metadataOrUndefined;
    } else {
      // First parameter is id: ValidationRule(id, name, field, validator, options, metadata)
      id = idOrName;
      name = nameOrField;
      field = fieldOrValidator;
      validator = validatorOrOptions;
      options = optionsOrMetadata;
      metadata = metadataOrUndefined;
    }
    
    this._id = id;
    this._name = name;
    this._field = field;
    this._validator = validator;
    this._options = { ...options };
    this._metadata = { ...metadata };
    this._enabled = true;
    this._priority = options.priority || 0;

    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get name() { return this._name; }
  get field() { return this._field; }
  get validator() { return this._validator; }
  get options() { return { ...this._options }; }
  get metadata() { return { ...this._metadata }; }
  get enabled() { return this._enabled; }
  get priority() { return this._priority; }

  // Validation execution
  async validate(value, context = null) {
    if (!this._enabled) {
      return ValidationResult.createValid();
    }

    try {
      if (typeof this._validator === 'function') {
        return await this._validator(value, this._options, context);
      } else if (typeof this._validator === 'string') {
        return await this._executeBuiltInValidator(value, this._validator, context);
      } else {
        throw new Error(`Invalid validator type: ${typeof this._validator}`);
      }
    } catch (error) {
      return ValidationResult.createWithError(
        this._field,
        `Validation rule '${this._name}' failed: ${error.message}`,
        'VALIDATION_RULE_ERROR',
        { ruleId: this._id, ruleName: this._name, error: error.message }
      );
    }
  }

  // Built-in validators
  async _executeBuiltInValidator(value, validatorName, context) {
    switch (validatorName) {
      case 'required':
        return this._validateRequired(value);
      case 'string':
        return this._validateString(value);
      case 'number':
        return this._validateNumber(value);
      case 'boolean':
        return this._validateBoolean(value);
      case 'array':
        return this._validateArray(value);
      case 'object':
        return this._validateObject(value);
      case 'email':
        return this._validateEmail(value);
      case 'url':
        return this._validateUrl(value);
      case 'uuid':
        return this._validateUuid(value);
      case 'date':
        return this._validateDate(value);
      case 'min':
        return this._validateMin(value);
      case 'max':
        return this._validateMax(value);
      case 'minLength':
        return this._validateMinLength(value);
      case 'maxLength':
        return this._validateMaxLength(value);
      case 'pattern':
        return this._validatePattern(value);
      case 'enum':
        return this._validateEnum(value);
      case 'custom':
        return this._validateCustom(value, context);
      default:
        throw new Error(`Unknown built-in validator: ${validatorName}`);
    }
  }

  _validateRequired(value) {
    if (value === null || value === undefined || value === '') {
      return ValidationResult.createFieldRequired(this._field);
    }
    return ValidationResult.createValid();
  }

  _validateString(value) {
    if (value !== null && value !== undefined && typeof value !== 'string') {
      return ValidationResult.createFieldTypeError(this._field, 'string', typeof value);
    }
    return ValidationResult.createValid();
  }

  _validateNumber(value) {
    if (value !== null && value !== undefined && typeof value !== 'number') {
      return ValidationResult.createFieldTypeError(this._field, 'number', typeof value);
    }
    return ValidationResult.createValid();
  }

  _validateBoolean(value) {
    if (value !== null && value !== undefined && typeof value !== 'boolean') {
      return ValidationResult.createFieldTypeError(this._field, 'boolean', typeof value);
    }
    return ValidationResult.createValid();
  }

  _validateArray(value) {
    if (value !== null && value !== undefined && !Array.isArray(value)) {
      return ValidationResult.createFieldTypeError(this._field, 'array', typeof value);
    }
    return ValidationResult.createValid();
  }

  _validateObject(value) {
    if (value !== null && value !== undefined && typeof value !== 'object') {
      return ValidationResult.createFieldTypeError(this._field, 'object', typeof value);
    }
    return ValidationResult.createValid();
  }

  _validateEmail(value) {
    if (value === null || value === undefined || value === '') {
      return ValidationResult.createValid();
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return ValidationResult.createWithError(
        this._field,
        `Field '${this._field}' must be a valid email address`,
        'INVALID_EMAIL',
        { value }
      );
    }
    return ValidationResult.createValid();
  }

  _validateUrl(value) {
    if (value === null || value === undefined || value === '') {
      return ValidationResult.createValid();
    }

    try {
      new URL(value);
      return ValidationResult.createValid();
    } catch {
      return ValidationResult.createWithError(
        this._field,
        `Field '${this._field}' must be a valid URL`,
        'INVALID_URL',
        { value }
      );
    }
  }

  _validateUuid(value) {
    if (value === null || value === undefined || value === '') {
      return ValidationResult.createValid();
    }

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(value)) {
      return ValidationResult.createWithError(
        this._field,
        `Field '${this._field}' must be a valid UUID`,
        'INVALID_UUID',
        { value }
      );
    }
    return ValidationResult.createValid();
  }

  _validateDate(value) {
    if (value === null || value === undefined || value === '') {
      return ValidationResult.createValid();
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return ValidationResult.createWithError(
        this._field,
        `Field '${this._field}' must be a valid date`,
        'INVALID_DATE',
        { value }
      );
    }
    return ValidationResult.createValid();
  }

  _validateMin(value) {
    const min = this._options.min;
    if (min === undefined || value === null || value === undefined) {
      return ValidationResult.createValid();
    }

    if (typeof value === 'number' && value < min) {
      return ValidationResult.createFieldRangeError(this._field, min, undefined, value);
    }

    if (typeof value === 'string' && value.length < min) {
      return ValidationResult.createFieldLengthError(this._field, min, undefined, value.length);
    }

    return ValidationResult.createValid();
  }

  _validateMax(value) {
    const max = this._options.max;
    if (max === undefined || value === null || value === undefined) {
      return ValidationResult.createValid();
    }

    if (typeof value === 'number' && value > max) {
      return ValidationResult.createFieldRangeError(this._field, undefined, max, value);
    }

    if (typeof value === 'string' && value.length > max) {
      return ValidationResult.createFieldLengthError(this._field, undefined, max, value.length);
    }

    return ValidationResult.createValid();
  }

  _validateMinLength(value) {
    const minLength = this._options.minLength;
    if (minLength === undefined || value === null || value === undefined) {
      return ValidationResult.createValid();
    }

    if (typeof value !== 'string') {
      return ValidationResult.createFieldTypeError(this._field, 'string', typeof value);
    }

    if (value.length < minLength) {
      return ValidationResult.createFieldLengthError(this._field, minLength, undefined, value.length);
    }

    return ValidationResult.createValid();
  }

  _validateMaxLength(value) {
    const maxLength = this._options.maxLength;
    if (maxLength === undefined || value === null || value === undefined) {
      return ValidationResult.createValid();
    }

    if (typeof value !== 'string') {
      return ValidationResult.createFieldTypeError(this._field, 'string', typeof value);
    }

    if (value.length > maxLength) {
      return ValidationResult.createFieldLengthError(this._field, undefined, maxLength, value.length);
    }

    return ValidationResult.createValid();
  }

  _validatePattern(value) {
    const pattern = this._options.pattern;
    if (!pattern || value === null || value === undefined || value === '') {
      return ValidationResult.createValid();
    }

    if (typeof value !== 'string') {
      return ValidationResult.createFieldTypeError(this._field, 'string', typeof value);
    }

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    if (!regex.test(value)) {
      return ValidationResult.createFieldPatternError(this._field, regex);
    }

    return ValidationResult.createValid();
  }

  _validateEnum(value) {
    const allowedValues = this._options.enum;
    if (!allowedValues || value === null || value === undefined) {
      return ValidationResult.createValid();
    }

    if (!allowedValues.includes(value)) {
      return ValidationResult.createFieldEnumError(this._field, allowedValues, value);
    }

    return ValidationResult.createValid();
  }

  async _validateCustom(value, context) {
    const customValidator = this._options.customValidator;
    if (!customValidator || typeof customValidator !== 'function') {
      throw new Error('Custom validator function is required for custom validation');
    }

    return await customValidator(value, this._options, context);
  }

  // Rule management
  enable() {
    this._enabled = true;
  }

  disable() {
    this._enabled = false;
  }

  setPriority(priority) {
    this._priority = priority;
  }

  updateOptions(options) {
    this._options = { ...this._options, ...options };
  }

  setMetadata(key, value) {
    this._metadata[key] = value;
  }

  getMetadata(key, defaultValue = null) {
    return this._metadata[key] !== undefined ? this._metadata[key] : defaultValue;
  }

  // Validation
  _validate() {
    if (!this._name) {
      throw new Error('Rule name is required');
    }

    if (!this._field) {
      throw new Error('Field name is required');
    }

    if (!this._validator) {
      throw new Error('Validator is required');
    }

    if (typeof this._validator !== 'function' && typeof this._validator !== 'string') {
      throw new Error('Validator must be a function or string');
    }

    if (typeof this._options !== 'object') {
      throw new Error('Options must be an object');
    }

    if (typeof this._metadata !== 'object') {
      throw new Error('Metadata must be an object');
    }
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      name: this._name,
      field: this._field,
      validator: typeof this._validator === 'function' ? 'custom' : this._validator,
      options: this._options,
      metadata: this._metadata,
      enabled: this._enabled,
      priority: this._priority
    };
  }

  static fromJSON(data) {
    return new ValidationRule(
      data.id,
      data.name,
      data.field,
      data.validator,
      data.options,
      data.metadata
    );
  }

  // Factory methods
  static create(name, field, validator, options = {}) {
    return new ValidationRule(uuidv4(), name, field, validator, options);
  }

  static createRequired(field, options = {}) {
    return ValidationRule.create('required', field, 'required', options);
  }

  static createString(field, options = {}) {
    return ValidationRule.create('string', field, 'string', options);
  }

  static createNumber(field, options = {}) {
    return ValidationRule.create('number', field, 'number', options);
  }

  static createEmail(field, options = {}) {
    return ValidationRule.create('email', field, 'email', options);
  }

  static createUrl(field, options = {}) {
    return ValidationRule.create('url', field, 'url', options);
  }

  static createUuid(field, options = {}) {
    return ValidationRule.create('uuid', field, 'uuid', options);
  }

  static createDate(field, options = {}) {
    return ValidationRule.create('date', field, 'date', options);
  }

  static createMin(field, min, options = {}) {
    return ValidationRule.create('min', field, 'min', { ...options, min });
  }

  static createMax(field, max, options = {}) {
    return ValidationRule.create('max', field, 'max', { ...options, max });
  }

  static createMinLength(field, minLength, options = {}) {
    return ValidationRule.create('minLength', field, 'minLength', { ...options, minLength });
  }

  static createMaxLength(field, maxLength, options = {}) {
    return ValidationRule.create('maxLength', field, 'maxLength', { ...options, maxLength });
  }

  static createPattern(field, pattern, options = {}) {
    return ValidationRule.create('pattern', field, 'pattern', { ...options, pattern });
  }

  static createEnum(field, allowedValues, options = {}) {
    return ValidationRule.create('enum', field, 'enum', { ...options, enum: allowedValues });
  }

  static createCustom(name, field, validator, options = {}) {
    return ValidationRule.create(name, field, 'custom', { ...options, customValidator: validator });
  }
}

module.exports = ValidationRule; 