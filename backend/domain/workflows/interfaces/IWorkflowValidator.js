/**
 * IWorkflowValidator - Interface for workflow validation
 * Defines the contract for workflow validation with detailed results
 */
class IWorkflowValidator {
  /**
   * Check if validation is valid
   * @returns {boolean} True if validation passed
   */
  isValid() {
    throw new Error('isValid method must be implemented');
  }

  /**
   * Get validation errors
   * @returns {Array<Object>} List of validation errors
   */
  getErrors() {
    throw new Error('getErrors method must be implemented');
  }

  /**
   * Get validation warnings
   * @returns {Array<Object>} List of validation warnings
   */
  getWarnings() {
    throw new Error('getWarnings method must be implemented');
  }

  /**
   * Get all validation messages
   * @returns {Array<Object>} List of all validation messages
   */
  getMessages() {
    throw new Error('getMessages method must be implemented');
  }

  /**
   * Add validation error
   * @param {string} field - The field name
   * @param {string} message - The error message
   * @param {string} code - The error code
   * @param {Object} data - Additional error data
   */
  addError(field, message, code = null, data = null) {
    throw new Error('addError method must be implemented');
  }

  /**
   * Add validation warning
   * @param {string} field - The field name
   * @param {string} message - The warning message
   * @param {string} code - The warning code
   * @param {Object} data - Additional warning data
   */
  addWarning(field, message, code = null, data = null) {
    throw new Error('addWarning method must be implemented');
  }

  /**
   * Check if validation has errors
   * @returns {boolean} True if validation has errors
   */
  hasErrors() {
    throw new Error('hasErrors method must be implemented');
  }

  /**
   * Check if validation has warnings
   * @returns {boolean} True if validation has warnings
   */
  hasWarnings() {
    throw new Error('hasWarnings method must be implemented');
  }

  /**
   * Get error count
   * @returns {number} Number of errors
   */
  getErrorCount() {
    throw new Error('getErrorCount method must be implemented');
  }

  /**
   * Get warning count
   * @returns {number} Number of warnings
   */
  getWarningCount() {
    throw new Error('getWarningCount method must be implemented');
  }

  /**
   * Get total message count
   * @returns {number} Total number of messages
   */
  getMessageCount() {
    throw new Error('getMessageCount method must be implemented');
  }

  /**
   * Get errors by field
   * @param {string} field - The field name
   * @returns {Array<Object>} List of errors for the field
   */
  getErrorsByField(field) {
    throw new Error('getErrorsByField method must be implemented');
  }

  /**
   * Get warnings by field
   * @param {string} field - The field name
   * @returns {Array<Object>} List of warnings for the field
   */
  getWarningsByField(field) {
    throw new Error('getWarningsByField method must be implemented');
  }

  /**
   * Get messages by field
   * @param {string} field - The field name
   * @returns {Array<Object>} List of messages for the field
   */
  getMessagesByField(field) {
    throw new Error('getMessagesByField method must be implemented');
  }

  /**
   * Get errors by code
   * @param {string} code - The error code
   * @returns {Array<Object>} List of errors with the code
   */
  getErrorsByCode(code) {
    throw new Error('getErrorsByCode method must be implemented');
  }

  /**
   * Get warnings by code
   * @param {string} code - The warning code
   * @returns {Array<Object>} List of warnings with the code
   */
  getWarningsByCode(code) {
    throw new Error('getWarningsByCode method must be implemented');
  }

  /**
   * Clear all validation messages
   */
  clear() {
    throw new Error('clear method must be implemented');
  }

  /**
   * Clear errors only
   */
  clearErrors() {
    throw new Error('clearErrors method must be implemented');
  }

  /**
   * Clear warnings only
   */
  clearWarnings() {
    throw new Error('clearWarnings method must be implemented');
  }

  /**
   * Merge another validation result
   * @param {IWorkflowValidator} validator - The validator to merge
   */
  merge(validator) {
    throw new Error('merge method must be implemented');
  }

  /**
   * Get validation summary
   * @returns {Object} Validation summary
   */
  getSummary() {
    throw new Error('getSummary method must be implemented');
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    throw new Error('toJSON method must be implemented');
  }

  /**
   * Create from JSON
   * @param {Object} data - JSON data
   * @returns {IWorkflowValidator} Validator instance
   */
  static fromJSON(data) {
    throw new Error('fromJSON method must be implemented');
  }
}

module.exports = IWorkflowValidator; 