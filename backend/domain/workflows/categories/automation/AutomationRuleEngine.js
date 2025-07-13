/**
 * AutomationRuleEngine - Rule engine for automation rules
 * Processes automation rules and determines automation levels
 */
const AutomationRule = require('./AutomationRule');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class AutomationRuleEngine {
  constructor(options = {}) {
    this.rules = new Map();
    this.logger = options.logger || console;
    this.enableRuleCaching = options.enableRuleCaching !== false;
    this.ruleCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  /**
   * Add rule to engine
   * @param {AutomationRule|Object} rule - Rule to add
   */
  addRule(rule) {
    try {
      const automationRule = rule instanceof AutomationRule ? rule : AutomationRule.fromJSON(rule);
      this.rules.set(automationRule.id, automationRule);
      this.logger.info(`[AutomationRuleEngine] Added rule: ${automationRule.name}`);
    } catch (error) {
      this.logger.error(`[AutomationRuleEngine] Failed to add rule:`, error.message);
      throw error;
    }
  }

  /**
   * Remove rule from engine
   * @param {string} ruleId - Rule ID
   */
  removeRule(ruleId) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.delete(ruleId);
      this.logger.info(`[AutomationRuleEngine] Removed rule: ${rule.name}`);
    }
  }

  /**
   * Get rule by ID
   * @param {string} ruleId - Rule ID
   * @returns {AutomationRule|null} Rule instance
   */
  getRule(ruleId) {
    return this.rules.get(ruleId) || null;
  }

  /**
   * Get all rules
   * @returns {Array<AutomationRule>} Array of rules
   */
  getRules() {
    return Array.from(this.rules.values());
  }

  /**
   * Get enabled rules
   * @returns {Array<AutomationRule>} Array of enabled rules
   */
  getEnabledRules() {
    return this.getRules().filter(rule => rule.enabled);
  }

  /**
   * Get rules by priority
   * @param {number} priority - Priority level
   * @returns {Array<AutomationRule>} Array of rules with specified priority
   */
  getRulesByPriority(priority) {
    return this.getRules().filter(rule => rule.priority === priority);
  }

  /**
   * Evaluate rules against task and context
   * @param {Object} task - Task to evaluate
   * @param {Object} context - Execution context
   * @returns {Promise<string|null>} Determined automation level or null
   */
  async evaluateRules(task, context) {
    try {
      this.logger.info(`[AutomationRuleEngine] Evaluating rules for task ${task.id}`);

      // Get enabled rules sorted by priority (highest first)
      const enabledRules = this.getEnabledRules()
        .sort((a, b) => b.priority - a.priority);

      if (enabledRules.length === 0) {
        this.logger.info(`[AutomationRuleEngine] No enabled rules found`);
        return null;
      }

      // Check cache if enabled
      if (this.enableRuleCaching) {
        const cacheKey = this._generateCacheKey(task, context);
        const cached = this.ruleCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
          this.logger.info(`[AutomationRuleEngine] Using cached result: ${cached.automationLevel}`);
          return cached.automationLevel;
        }
      }

      // Evaluate rules in priority order
      for (const rule of enabledRules) {
        try {
          const matches = await rule.evaluateConditions(task, context);
          
          if (matches) {
            this.logger.info(`[AutomationRuleEngine] Rule matched: ${rule.name}`);
            
            // Execute rule actions
            const actionResults = await rule.executeActions(task, context);
            
            // Find automation level action
            const automationLevelAction = actionResults.find(result => 
              result.actionType === 'set_automation_level' && result.success
            );
            
            if (automationLevelAction) {
              const automationLevel = automationLevelAction.result;
              
              // Cache result if enabled
              if (this.enableRuleCaching) {
                const cacheKey = this._generateCacheKey(task, context);
                this.ruleCache.set(cacheKey, {
                  automationLevel,
                  timestamp: Date.now()
                });
              }
              
              this.logger.info(`[AutomationRuleEngine] Rule ${rule.name} set automation level to: ${automationLevel}`);
              return automationLevel;
            }
          }
        } catch (error) {
          this.logger.error(`[AutomationRuleEngine] Error evaluating rule ${rule.name}:`, error.message);
          // Continue with next rule
        }
      }

      this.logger.info(`[AutomationRuleEngine] No rules matched`);
      return null;

    } catch (error) {
      this.logger.error(`[AutomationRuleEngine] Error evaluating rules:`, error.message);
      return null;
    }
  }

  /**
   * Evaluate specific rule
   * @param {string} ruleId - Rule ID
   * @param {Object} task - Task to evaluate
   * @param {Object} context - Execution context
   * @returns {Promise<boolean>} True if rule matches
   */
  async evaluateRule(ruleId, task, context) {
    const rule = this.getRule(ruleId);
    if (!rule) {
      return false;
    }

    try {
      return await rule.evaluateConditions(task, context);
    } catch (error) {
      this.logger.error(`[AutomationRuleEngine] Error evaluating rule ${ruleId}:`, error.message);
      return false;
    }
  }

  /**
   * Execute specific rule
   * @param {string} ruleId - Rule ID
   * @param {Object} task - Task to execute on
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Action results
   */
  async executeRule(ruleId, task, context) {
    const rule = this.getRule(ruleId);
    if (!rule) {
      return [];
    }

    try {
      return await rule.executeActions(task, context);
    } catch (error) {
      this.logger.error(`[AutomationRuleEngine] Error executing rule ${ruleId}:`, error.message);
      return [];
    }
  }

  /**
   * Enable rule
   * @param {string} ruleId - Rule ID
   */
  enableRule(ruleId) {
    const rule = this.getRule(ruleId);
    if (rule) {
      rule.enable();
      this.logger.info(`[AutomationRuleEngine] Enabled rule: ${rule.name}`);
    }
  }

  /**
   * Disable rule
   * @param {string} ruleId - Rule ID
   */
  disableRule(ruleId) {
    const rule = this.getRule(ruleId);
    if (rule) {
      rule.disable();
      this.logger.info(`[AutomationRuleEngine] Disabled rule: ${rule.name}`);
    }
  }

  /**
   * Set rule priority
   * @param {string} ruleId - Rule ID
   * @param {number} priority - New priority
   */
  setRulePriority(ruleId, priority) {
    const rule = this.getRule(ruleId);
    if (rule) {
      rule.setPriority(priority);
      this.logger.info(`[AutomationRuleEngine] Set priority for rule ${rule.name}: ${priority}`);
    }
  }

  /**
   * Clear all rules
   */
  clearRules() {
    this.rules.clear();
    this.logger.info(`[AutomationRuleEngine] Cleared all rules`);
  }

  /**
   * Load rules from array
   * @param {Array} rules - Array of rule data
   */
  loadRules(rules) {
    this.clearRules();
    
    for (const ruleData of rules) {
      try {
        this.addRule(ruleData);
      } catch (error) {
        this.logger.error(`[AutomationRuleEngine] Failed to load rule:`, error.message);
      }
    }
    
    this.logger.info(`[AutomationRuleEngine] Loaded ${this.rules.size} rules`);
  }

  /**
   * Export rules to array
   * @returns {Array} Array of rule data
   */
  exportRules() {
    return this.getRules().map(rule => rule.toJSON());
  }

  /**
   * Get rule statistics
   * @returns {Object} Rule statistics
   */
  getStatistics() {
    const allRules = this.getRules();
    const enabledRules = this.getEnabledRules();
    
    const priorityStats = {};
    for (const rule of allRules) {
      const priority = rule.priority;
      priorityStats[priority] = (priorityStats[priority] || 0) + 1;
    }

    return {
      totalRules: allRules.length,
      enabledRules: enabledRules.length,
      disabledRules: allRules.length - enabledRules.length,
      priorityStats,
      cacheEnabled: this.enableRuleCaching,
      cacheSize: this.ruleCache.size
    };
  }

  /**
   * Clear rule cache
   */
  clearCache() {
    this.ruleCache.clear();
    this.logger.info(`[AutomationRuleEngine] Cleared rule cache`);
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.ruleCache.entries()) {
      if ((now - value.timestamp) >= this.cacheTimeout) {
        this.ruleCache.delete(key);
      }
    }
  }

  /**
   * Generate cache key for task and context
   * @param {Object} task - Task object
   * @param {Object} context - Execution context
   * @returns {string} Cache key
   */
  _generateCacheKey(task, context) {
    const taskKey = `${task.id}_${task.type?.value}_${task.priority?.value}`;
    const contextKey = `${context.get('userId')}_${context.get('projectId')}`;
    return `${taskKey}_${contextKey}`;
  }

  /**
   * Create default rules
   */
  createDefaultRules() {
    // Rule 1: High priority tasks should be manual
    const highPriorityRule = AutomationRule.createAutomationLevelRule(
      'High Priority Manual',
      'manual',
      [{
        type: 'task_field',
        field: 'priority',
        operator: 'equals',
        value: 'high'
      }]
    );
    highPriorityRule.setPriority(100);
    this.addRule(highPriorityRule);

    // Rule 2: Security tasks should be assisted
    const securityRule = AutomationRule.createAutomationLevelRule(
      'Security Assisted',
      'assisted',
      [{
        type: 'task_field',
        field: 'type',
        operator: 'equals',
        value: 'security'
      }]
    );
    securityRule.setPriority(90);
    this.addRule(securityRule);

    // Rule 3: Deployment tasks should be manual
    const deploymentRule = AutomationRule.createAutomationLevelRule(
      'Deployment Manual',
      'manual',
      [{
        type: 'task_field',
        field: 'type',
        operator: 'equals',
        value: 'deployment'
      }]
    );
    deploymentRule.setPriority(80);
    this.addRule(deploymentRule);

    // Rule 4: Documentation tasks can be fully automated
    const documentationRule = AutomationRule.createAutomationLevelRule(
      'Documentation Full Auto',
      'full_auto',
      [{
        type: 'task_field',
        field: 'type',
        operator: 'equals',
        value: 'documentation'
      }]
    );
    documentationRule.setPriority(70);
    this.addRule(documentationRule);

    this.logger.info(`[AutomationRuleEngine] Created ${this.rules.size} default rules`);
  }
}

module.exports = AutomationRuleEngine; 