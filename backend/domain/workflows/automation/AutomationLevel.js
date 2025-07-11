/**
 * AutomationLevel - Automation level enumeration
 * Defines different levels of automation for workflow execution
 */
class AutomationLevel {
  static MANUAL = 'manual';
  static ASSISTED = 'assisted';
  static SEMI_AUTO = 'semi_auto';
  static FULL_AUTO = 'full_auto';
  static ADAPTIVE = 'adaptive';

  /**
   * Get all automation levels
   * @returns {Array<string>} Array of all automation levels
   */
  static getAll() {
    return [
      AutomationLevel.MANUAL,
      AutomationLevel.ASSISTED,
      AutomationLevel.SEMI_AUTO,
      AutomationLevel.FULL_AUTO,
      AutomationLevel.ADAPTIVE
    ];
  }

  /**
   * Get description for automation level
   * @param {string} level - Automation level
   * @returns {string} Description of the automation level
   */
  static getDescription(level) {
    const descriptions = {
      [AutomationLevel.MANUAL]: 'Full human control with no automation',
      [AutomationLevel.ASSISTED]: 'AI assistance with human confirmation',
      [AutomationLevel.SEMI_AUTO]: 'AI execution with human oversight',
      [AutomationLevel.FULL_AUTO]: 'Complete automation with minimal human intervention',
      [AutomationLevel.ADAPTIVE]: 'Dynamic automation level based on context'
    };
    return descriptions[level] || 'Unknown automation level';
  }

  /**
   * Check if automation level requires confirmation
   * @param {string} level - Automation level
   * @returns {boolean} True if confirmation is required
   */
  static requiresConfirmation(level) {
    return [AutomationLevel.ASSISTED, AutomationLevel.SEMI_AUTO].includes(level);
  }

  /**
   * Check if automation level requires human review
   * @param {string} level - Automation level
   * @returns {boolean} True if human review is required
   */
  static requiresHumanReview(level) {
    return [AutomationLevel.MANUAL, AutomationLevel.ASSISTED].includes(level);
  }

  /**
   * Check if automation level is fully automated
   * @param {string} level - Automation level
   * @returns {boolean} True if fully automated
   */
  static isFullyAutomated(level) {
    return [AutomationLevel.FULL_AUTO, AutomationLevel.ADAPTIVE].includes(level);
  }

  /**
   * Get confidence threshold for automation level
   * @param {string} level - Automation level
   * @returns {number} Confidence threshold (0-1)
   */
  static getConfidenceThreshold(level) {
    const thresholds = {
      [AutomationLevel.MANUAL]: 0.0,
      [AutomationLevel.ASSISTED]: 0.6,
      [AutomationLevel.SEMI_AUTO]: 0.7,
      [AutomationLevel.FULL_AUTO]: 0.8,
      [AutomationLevel.ADAPTIVE]: 0.75
    };
    return thresholds[level] || 0.5;
  }

  /**
   * Validate automation level
   * @param {string} level - Automation level to validate
   * @returns {boolean} True if valid
   */
  static isValid(level) {
    return AutomationLevel.getAll().includes(level);
  }

  /**
   * Get automation level from string with validation
   * @param {string} level - Automation level string
   * @returns {string} Validated automation level
   * @throws {Error} If level is invalid
   */
  static fromString(level) {
    if (!AutomationLevel.isValid(level)) {
      throw new Error(`Invalid automation level: ${level}`);
    }
    return level;
  }

  /**
   * Compare automation levels
   * @param {string} level1 - First automation level
   * @param {string} level2 - Second automation level
   * @returns {number} -1 if level1 < level2, 0 if equal, 1 if level1 > level2
   */
  static compare(level1, level2) {
    const levels = AutomationLevel.getAll();
    const index1 = levels.indexOf(level1);
    const index2 = levels.indexOf(level2);
    
    if (index1 === -1 || index2 === -1) {
      throw new Error('Invalid automation level for comparison');
    }
    
    if (index1 < index2) return -1;
    if (index1 > index2) return 1;
    return 0;
  }

  /**
   * Get next automation level
   * @param {string} level - Current automation level
   * @returns {string|null} Next automation level or null if at max
   */
  static getNext(level) {
    const levels = AutomationLevel.getAll();
    const currentIndex = levels.indexOf(level);
    
    if (currentIndex === -1 || currentIndex === levels.length - 1) {
      return null;
    }
    
    return levels[currentIndex + 1];
  }

  /**
   * Get previous automation level
   * @param {string} level - Current automation level
   * @returns {string|null} Previous automation level or null if at min
   */
  static getPrevious(level) {
    const levels = AutomationLevel.getAll();
    const currentIndex = levels.indexOf(level);
    
    if (currentIndex <= 0) {
      return null;
    }
    
    return levels[currentIndex - 1];
  }
}

module.exports = AutomationLevel; 