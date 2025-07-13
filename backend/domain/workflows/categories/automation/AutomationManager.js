/**
 * AutomationManager - Automation level management
 * Manages automation levels with confidence-based decision making
 */
const AutomationLevel = require('./AutomationLevel');
const ConfidenceCalculator = require('./ConfidenceCalculator');
const UserPreferenceManager = require('./UserPreferenceManager');
const ProjectAutomationSettings = require('./ProjectAutomationSettings');
const AutomationRuleEngine = require('./AutomationRuleEngine');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class AutomationManager {
  constructor(options = {}) {
    this.defaultLevel = options.defaultLevel || AutomationLevel.SEMI_AUTO;
    this.confidenceThreshold = options.confidenceThreshold || 0.8;
    this.userPreferences = new UserPreferenceManager(options);
    this.projectSettings = new ProjectAutomationSettings(options);
    this.confidenceCalculator = new ConfidenceCalculator();
    this.ruleEngine = new AutomationRuleEngine(options);
    this.logger = options.logger || console;
  }

  /**
   * Determine automation level for task
   * @param {Object} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<string>} Determined automation level
   */
  async determineAutomationLevel(task, context) {
    try {
      this.logger.info(`[AutomationManager] Determining automation level for task ${task.id}`);

      // Check user preferences first
      const userId = context.get('userId');
      if (userId) {
        const userLevel = await this.userPreferences.getUserAutomationLevel(userId);
        if (userLevel) {
          this.logger.info(`[AutomationManager] Using user preference: ${userLevel}`);
          return userLevel;
        }
      }

      // Check project settings
      const projectId = task.projectId || context.get('projectId');
      if (projectId) {
        const projectLevel = await this.projectSettings.getProjectAutomationLevel(projectId);
        if (projectLevel) {
          this.logger.info(`[AutomationManager] Using project setting: ${projectLevel}`);
          return projectLevel;
        }
      }

      // Check task type requirements
      const taskLevel = this.getTaskTypeLevel(task.type?.value);
      if (taskLevel) {
        this.logger.info(`[AutomationManager] Using task type level: ${taskLevel}`);
        return taskLevel;
      }

      // Check AI confidence for adaptive automation
      const confidence = await this.calculateConfidence(task, context);
      if (confidence >= this.confidenceThreshold) {
        this.logger.info(`[AutomationManager] Using full auto based on confidence: ${confidence}`);
        return AutomationLevel.FULL_AUTO;
      }

      // Apply automation rules
      const ruleLevel = await this.ruleEngine.evaluateRules(task, context);
      if (ruleLevel) {
        this.logger.info(`[AutomationManager] Using rule-based level: ${ruleLevel}`);
        return ruleLevel;
      }

      this.logger.info(`[AutomationManager] Using default level: ${this.defaultLevel}`);
      return this.defaultLevel;

    } catch (error) {
      this.logger.error(`[AutomationManager] Error determining automation level:`, error.message);
      return this.defaultLevel;
    }
  }

  /**
   * Calculate AI confidence for task
   * @param {Object} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} Confidence score (0-1)
   */
  async calculateConfidence(task, context) {
    try {
      return await this.confidenceCalculator.calculate(task, context);
    } catch (error) {
      this.logger.error(`[AutomationManager] Error calculating confidence:`, error.message);
      return 0.5; // Default confidence
    }
  }

  /**
   * Set user automation preference
   * @param {string} userId - User ID
   * @param {string} level - Preferred automation level
   * @param {Object} options - Additional options
   */
  async setUserPreference(userId, level, options = {}) {
    try {
      await this.userPreferences.setUserPreference(userId, level, options);
      this.logger.info(`[AutomationManager] Set user preference for ${userId}: ${level}`);
    } catch (error) {
      this.logger.error(`[AutomationManager] Failed to set user preference:`, error.message);
      throw error;
    }
  }

  /**
   * Get user automation preference
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User preference
   */
  async getUserPreference(userId) {
    try {
      return await this.userPreferences.getUserPreference(userId);
    } catch (error) {
      this.logger.error(`[AutomationManager] Failed to get user preference:`, error.message);
      return null;
    }
  }

  /**
   * Set project automation setting
   * @param {string} projectId - Project ID
   * @param {string} level - Project automation level
   * @param {Object} options - Additional options
   */
  async setProjectSetting(projectId, level, options = {}) {
    try {
      await this.projectSettings.setProjectSetting(projectId, level, options);
      this.logger.info(`[AutomationManager] Set project setting for ${projectId}: ${level}`);
    } catch (error) {
      this.logger.error(`[AutomationManager] Failed to set project setting:`, error.message);
      throw error;
    }
  }

  /**
   * Get project automation setting
   * @param {string} projectId - Project ID
   * @returns {Promise<Object|null>} Project setting
   */
  async getProjectSetting(projectId) {
    try {
      return await this.projectSettings.getProjectSetting(projectId);
    } catch (error) {
      this.logger.error(`[AutomationManager] Failed to get project setting:`, error.message);
      return null;
    }
  }

  /**
   * Get automation level for task type
   * @param {string} taskType - Task type
   * @returns {string|null} Task type level
   */
  getTaskTypeLevel(taskType) {
    const typeLevels = {
      'refactor': AutomationLevel.SEMI_AUTO,
      'analysis': AutomationLevel.FULL_AUTO,
      'testing': AutomationLevel.SEMI_AUTO,
      'documentation': AutomationLevel.FULL_AUTO,
      'deployment': AutomationLevel.MANUAL,
      'security': AutomationLevel.ASSISTED,
      'feature': AutomationLevel.SEMI_AUTO,
      'bug': AutomationLevel.ASSISTED,
      'optimization': AutomationLevel.SEMI_AUTO
    };
    
    return typeLevels[taskType] || null;
  }

  /**
   * Check if task requires confirmation
   * @param {Object} task - Task to check
   * @param {Object} context - Execution context
   * @returns {Promise<boolean>} True if confirmation required
   */
  async requiresConfirmation(task, context) {
    try {
      const level = await this.determineAutomationLevel(task, context);
      return AutomationLevel.requiresConfirmation(level);
    } catch (error) {
      this.logger.error(`[AutomationManager] Error checking confirmation requirement:`, error.message);
      return true; // Default to requiring confirmation
    }
  }

  /**
   * Check if task requires human review
   * @param {Object} task - Task to check
   * @param {Object} context - Execution context
   * @returns {Promise<boolean>} True if human review required
   */
  async requiresHumanReview(task, context) {
    try {
      const level = await this.determineAutomationLevel(task, context);
      return AutomationLevel.requiresHumanReview(level);
    } catch (error) {
      this.logger.error(`[AutomationManager] Error checking human review requirement:`, error.message);
      return true; // Default to requiring human review
    }
  }

  /**
   * Check if task is fully automated
   * @param {Object} task - Task to check
   * @param {Object} context - Execution context
   * @returns {Promise<boolean>} True if fully automated
   */
  async isFullyAutomated(task, context) {
    try {
      const level = await this.determineAutomationLevel(task, context);
      return AutomationLevel.isFullyAutomated(level);
    } catch (error) {
      this.logger.error(`[AutomationManager] Error checking full automation:`, error.message);
      return false; // Default to not fully automated
    }
  }

  /**
   * Get confidence threshold for task
   * @param {Object} task - Task to check
   * @param {Object} context - Execution context
   * @returns {Promise<number>} Confidence threshold
   */
  async getConfidenceThreshold(task, context) {
    try {
      const level = await this.determineAutomationLevel(task, context);
      return AutomationLevel.getConfidenceThreshold(level);
    } catch (error) {
      this.logger.error(`[AutomationManager] Error getting confidence threshold:`, error.message);
      return this.confidenceThreshold;
    }
  }

  /**
   * Update confidence calculator factors
   * @param {Object} factors - New factor weights
   */
  updateConfidenceFactors(factors) {
    this.confidenceCalculator.updateFactors(factors);
  }

  /**
   * Get confidence calculator factors
   * @returns {Object} Current factor weights
   */
  getConfidenceFactors() {
    return this.confidenceCalculator.getFactors();
  }

  /**
   * Add automation rule
   * @param {Object} rule - Automation rule
   */
  addRule(rule) {
    this.ruleEngine.addRule(rule);
  }

  /**
   * Remove automation rule
   * @param {string} ruleId - Rule ID
   */
  removeRule(ruleId) {
    this.ruleEngine.removeRule(ruleId);
  }

  /**
   * Get all automation rules
   * @returns {Array} Array of automation rules
   */
  getRules() {
    return this.ruleEngine.getRules();
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.userPreferences.clearAllCache();
    this.projectSettings.clearAllCache();
  }

  /**
   * Get system statistics
   * @returns {Object} System statistics
   */
  getStatistics() {
    return {
      userPreferences: this.userPreferences.getCacheStats(),
      projectSettings: this.projectSettings.getCacheStats(),
      confidenceFactors: this.confidenceCalculator.getFactors(),
      rules: this.ruleEngine.getRules().length,
      defaultLevel: this.defaultLevel,
      confidenceThreshold: this.confidenceThreshold
    };
  }
}

module.exports = AutomationManager; 