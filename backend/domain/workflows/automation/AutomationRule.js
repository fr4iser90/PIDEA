/**
 * AutomationRule - Configurable automation rules
 * Defines rules for determining automation levels based on various conditions
 */
const { v4: uuidv4 } = require('uuid');

class AutomationRule {
  constructor(
    id = uuidv4(),
    name,
    description = '',
    conditions = [],
    actions = [],
    priority = 0,
    enabled = true,
    metadata = {}
  ) {
    this._id = id;
    this._name = name;
    this._description = description;
    this._conditions = [...conditions];
    this._actions = [...actions];
    this._priority = priority;
    this._enabled = enabled;
    this._metadata = { ...metadata };
    this._createdAt = new Date();
    this._updatedAt = new Date();

    this._validate();
  }

  /**
   * Get rule ID
   * @returns {string} Rule ID
   */
  get id() {
    return this._id;
  }

  /**
   * Get rule name
   * @returns {string} Rule name
   */
  get name() {
    return this._name;
  }

  /**
   * Get rule description
   * @returns {string} Rule description
   */
  get description() {
    return this._description;
  }

  /**
   * Get rule conditions
   * @returns {Array} Rule conditions
   */
  get conditions() {
    return [...this._conditions];
  }

  /**
   * Get rule actions
   * @returns {Array} Rule actions
   */
  get actions() {
    return [...this._actions];
  }

  /**
   * Get rule priority
   * @returns {number} Rule priority
   */
  get priority() {
    return this._priority;
  }

  /**
   * Check if rule is enabled
   * @returns {boolean} True if enabled
   */
  get enabled() {
    return this._enabled;
  }

  /**
   * Get rule metadata
   * @returns {Object} Rule metadata
   */
  get metadata() {
    return { ...this._metadata };
  }

  /**
   * Get creation date
   * @returns {Date} Creation date
   */
  get createdAt() {
    return new Date(this._createdAt);
  }

  /**
   * Get update date
   * @returns {Date} Update date
   */
  get updatedAt() {
    return new Date(this._updatedAt);
  }

  /**
   * Enable the rule
   */
  enable() {
    this._enabled = true;
    this._updatedAt = new Date();
  }

  /**
   * Disable the rule
   */
  disable() {
    this._enabled = false;
    this._updatedAt = new Date();
  }

  /**
   * Set rule priority
   * @param {number} priority - New priority
   */
  setPriority(priority) {
    this._priority = priority;
    this._updatedAt = new Date();
  }

  /**
   * Add condition to rule
   * @param {Object} condition - Condition to add
   */
  addCondition(condition) {
    this._conditions.push({
      id: condition.id || uuidv4(),
      type: condition.type,
      field: condition.field,
      operator: condition.operator,
      value: condition.value,
      metadata: condition.metadata || {}
    });
    this._updatedAt = new Date();
  }

  /**
   * Remove condition from rule
   * @param {string} conditionId - Condition ID
   */
  removeCondition(conditionId) {
    this._conditions = this._conditions.filter(condition => condition.id !== conditionId);
    this._updatedAt = new Date();
  }

  /**
   * Add action to rule
   * @param {Object} action - Action to add
   */
  addAction(action) {
    this._actions.push({
      id: action.id || uuidv4(),
      type: action.type,
      automationLevel: action.automationLevel,
      parameters: action.parameters || {},
      metadata: action.metadata || {}
    });
    this._updatedAt = new Date();
  }

  /**
   * Remove action from rule
   * @param {string} actionId - Action ID
   */
  removeAction(actionId) {
    this._actions = this._actions.filter(action => action.id !== actionId);
    this._updatedAt = new Date();
  }

  /**
   * Update rule metadata
   * @param {Object} metadata - New metadata
   */
  updateMetadata(metadata) {
    this._metadata = { ...this._metadata, ...metadata };
    this._updatedAt = new Date();
  }

  /**
   * Evaluate rule conditions against task and context
   * @param {Object} task - Task to evaluate
   * @param {Object} context - Execution context
   * @returns {Promise<boolean>} True if all conditions match
   */
  async evaluateConditions(task, context) {
    if (!this._enabled) {
      return false;
    }

    if (this._conditions.length === 0) {
      return true; // No conditions means always match
    }

    for (const condition of this._conditions) {
      const matches = await this._evaluateCondition(condition, task, context);
      if (!matches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute rule actions
   * @param {Object} task - Task to execute actions on
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Array of action results
   */
  async executeActions(task, context) {
    const results = [];

    for (const action of this._actions) {
      try {
        const result = await this._executeAction(action, task, context);
        results.push({
          actionId: action.id,
          actionType: action.type,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          actionId: action.id,
          actionType: action.type,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Evaluate a single condition
   * @param {Object} condition - Condition to evaluate
   * @param {Object} task - Task to evaluate against
   * @param {Object} context - Execution context
   * @returns {Promise<boolean>} True if condition matches
   */
  async _evaluateCondition(condition, task, context) {
    const { type, field, operator, value } = condition;

    let actualValue;
    switch (type) {
      case 'task_field':
        actualValue = this._getTaskFieldValue(task, field);
        break;
      case 'context_field':
        actualValue = context.get(field);
        break;
      case 'metadata_field':
        actualValue = this._getMetadataFieldValue(task, field);
        break;
      case 'custom_function':
        actualValue = await this._executeCustomFunction(condition, task, context);
        break;
      default:
        return false;
    }

    return this._compareValues(actualValue, operator, value);
  }

  /**
   * Get task field value
   * @param {Object} task - Task object
   * @param {string} field - Field name
   * @returns {*} Field value
   */
  _getTaskFieldValue(task, field) {
    const fieldMap = {
      'id': task.id,
      'title': task.title,
      'description': task.description,
      'type': task.type?.value,
      'priority': task.priority?.value,
      'status': task.status?.value,
      'projectId': task.projectId,
      'createdAt': task.createdAt,
      'updatedAt': task.updatedAt
    };

    return fieldMap[field] || null;
  }

  /**
   * Get metadata field value
   * @param {Object} task - Task object
   * @param {string} field - Field path (e.g., 'fileCount', 'codeLines')
   * @returns {*} Field value
   */
  _getMetadataFieldValue(task, field) {
    const metadata = task.metadata || {};
    return metadata[field] || null;
  }

  /**
   * Execute custom function
   * @param {Object} condition - Condition with custom function
   * @param {Object} task - Task object
   * @param {Object} context - Execution context
   * @returns {Promise<*>} Function result
   */
  async _executeCustomFunction(condition, task, context) {
    const { functionName, parameters } = condition;
    
    // This would be extended with actual function implementations
    // For now, return a default value
    return null;
  }

  /**
   * Compare values using operator
   * @param {*} actualValue - Actual value
   * @param {string} operator - Comparison operator
   * @param {*} expectedValue - Expected value
   * @returns {boolean} True if comparison matches
   */
  _compareValues(actualValue, operator, expectedValue) {
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'contains':
        return String(actualValue).includes(String(expectedValue));
      case 'not_contains':
        return !String(actualValue).includes(String(expectedValue));
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue);
      case 'less_than':
        return Number(actualValue) < Number(expectedValue);
      case 'greater_than_or_equal':
        return Number(actualValue) >= Number(expectedValue);
      case 'less_than_or_equal':
        return Number(actualValue) <= Number(expectedValue);
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
      case 'exists':
        return actualValue !== null && actualValue !== undefined;
      case 'not_exists':
        return actualValue === null || actualValue === undefined;
      default:
        return false;
    }
  }

  /**
   * Execute a single action
   * @param {Object} action - Action to execute
   * @param {Object} task - Task object
   * @param {Object} context - Execution context
   * @returns {Promise<*>} Action result
   */
  async _executeAction(action, task, context) {
    const { type, automationLevel, parameters } = action;

    switch (type) {
      case 'set_automation_level':
        return automationLevel;
      case 'set_confidence_threshold':
        return parameters.threshold || 0.8;
      case 'require_confirmation':
        return parameters.required !== false;
      case 'custom_action':
        return await this._executeCustomAction(action, task, context);
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  /**
   * Execute custom action
   * @param {Object} action - Custom action
   * @param {Object} task - Task object
   * @param {Object} context - Execution context
   * @returns {Promise<*>} Action result
   */
  async _executeCustomAction(action, task, context) {
    const { functionName, parameters } = action;
    
    // This would be extended with actual function implementations
    // For now, return a default value
    return null;
  }

  /**
   * Validate rule
   */
  _validate() {
    if (!this._name || typeof this._name !== 'string') {
      throw new Error('Rule name is required and must be a string');
    }

    if (this._priority < 0) {
      throw new Error('Rule priority must be non-negative');
    }

    if (!Array.isArray(this._conditions)) {
      throw new Error('Rule conditions must be an array');
    }

    if (!Array.isArray(this._actions)) {
      throw new Error('Rule actions must be an array');
    }
  }

  /**
   * Convert rule to JSON
   * @returns {Object} Rule JSON representation
   */
  toJSON() {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      conditions: this._conditions,
      actions: this._actions,
      priority: this._priority,
      enabled: this._enabled,
      metadata: this._metadata,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }

  /**
   * Create rule from JSON
   * @param {Object} data - Rule data
   * @returns {AutomationRule} New rule instance
   */
  static fromJSON(data) {
    return new AutomationRule(
      data.id,
      data.name,
      data.description,
      data.conditions,
      data.actions,
      data.priority,
      data.enabled,
      data.metadata
    );
  }

  /**
   * Create a simple automation level rule
   * @param {string} name - Rule name
   * @param {string} automationLevel - Automation level
   * @param {Object} conditions - Rule conditions
   * @returns {AutomationRule} New rule instance
   */
  static createAutomationLevelRule(name, automationLevel, conditions = []) {
    return new AutomationRule(
      null,
      name,
      `Sets automation level to ${automationLevel}`,
      conditions,
      [{
        type: 'set_automation_level',
        automationLevel,
        parameters: {}
      }],
      0,
      true,
      { ruleType: 'automation_level' }
    );
  }
}

module.exports = AutomationRule; 