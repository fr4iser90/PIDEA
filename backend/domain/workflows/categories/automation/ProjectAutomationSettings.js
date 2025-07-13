const { logger } = require('@infrastructure/logging/Logger');
/**
 * ProjectAutomationSettings - Project-level automation settings
 * Manages project-specific automation configuration and preferences
 */
class ProjectAutomationSettings {
  constructor(dependencies = {}) {
    this.projectRepository = dependencies.projectRepository;
    this.automationPreferencesRepository = dependencies.automationPreferencesRepository;
    this.logger = dependencies.logger || console;
    this.cache = new Map();
    this.cacheTimeout = 600000; // 10 minutes
  }

  /**
   * Set project automation setting
   * @param {string} projectId - Project ID
   * @param {string} automationLevel - Automation level
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated setting
   */
  async setProjectSetting(projectId, automationLevel, options = {}) {
    try {
      this.logger.info(`[ProjectAutomationSettings] Setting automation for project ${projectId}: ${automationLevel}`);

      const setting = {
        projectId,
        automationLevel,
        confidenceThreshold: options.confidenceThreshold || 0.8,
        preferences: options.preferences || {},
        rules: options.rules || [],
        exceptions: options.exceptions || [],
        updatedAt: new Date()
      };

      // Update cache
      this.cache.set(projectId, {
        data: setting,
        timestamp: Date.now()
      });

      // Persist to database
      if (this.automationPreferencesRepository) {
        await this.automationPreferencesRepository.saveProjectSetting(setting);
      }

      // Update project metadata if repository available
      if (this.projectRepository) {
        await this.projectRepository.updateMetadata(projectId, {
          automationLevel,
          automationConfidenceThreshold: setting.confidenceThreshold,
          automationPreferences: setting.preferences,
          automationRules: setting.rules,
          automationExceptions: setting.exceptions,
          lastAutomationUpdate: new Date()
        });
      }

      return setting;
    } catch (error) {
      this.logger.error(`[ProjectAutomationSettings] Failed to set setting for project ${projectId}:`, error.message);
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
      // Check cache first
      const cached = this.cache.get(projectId);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.data;
      }

      // Load from database
      let setting = null;
      if (this.automationPreferencesRepository) {
        setting = await this.automationPreferencesRepository.getProjectSetting(projectId);
      }

      // Fallback to project metadata
      if (!setting && this.projectRepository) {
        const project = await this.projectRepository.findById(projectId);
        if (project && project.metadata?.automationLevel) {
          setting = {
            projectId,
            automationLevel: project.metadata.automationLevel,
            confidenceThreshold: project.metadata.automationConfidenceThreshold || 0.8,
            preferences: project.metadata.automationPreferences || {},
            rules: project.metadata.automationRules || [],
            exceptions: project.metadata.automationExceptions || [],
            updatedAt: project.metadata.lastAutomationUpdate || project.updatedAt
          };
        }
      }

      // Cache result
      if (setting) {
        this.cache.set(projectId, {
          data: setting,
          timestamp: Date.now()
        });
      }

      return setting;
    } catch (error) {
      this.logger.error(`[ProjectAutomationSettings] Failed to get setting for project ${projectId}:`, error.message);
      return null;
    }
  }

  /**
   * Get project automation level
   * @param {string} projectId - Project ID
   * @returns {Promise<string|null>} Automation level
   */
  async getProjectAutomationLevel(projectId) {
    const setting = await this.getProjectSetting(projectId);
    return setting?.automationLevel || null;
  }

  /**
   * Get project confidence threshold
   * @param {string} projectId - Project ID
   * @returns {Promise<number>} Confidence threshold
   */
  async getProjectConfidenceThreshold(projectId) {
    const setting = await this.getProjectSetting(projectId);
    return setting?.confidenceThreshold || 0.8;
  }

  /**
   * Add automation rule to project
   * @param {string} projectId - Project ID
   * @param {Object} rule - Automation rule
   * @returns {Promise<Object>} Updated setting
   */
  async addAutomationRule(projectId, rule) {
    try {
      const setting = await this.getProjectSetting(projectId);
      if (!setting) {
        throw new Error(`No setting found for project ${projectId}`);
      }

      const updatedSetting = {
        ...setting,
        rules: [...setting.rules, { ...rule, id: rule.id || Date.now().toString(), createdAt: new Date() }],
        updatedAt: new Date()
      };

      // Update cache
      this.cache.set(projectId, {
        data: updatedSetting,
        timestamp: Date.now()
      });

      // Persist to database
      if (this.automationPreferencesRepository) {
        await this.automationPreferencesRepository.saveProjectSetting(updatedSetting);
      }

      return updatedSetting;
    } catch (error) {
      this.logger.error(`[ProjectAutomationSettings] Failed to add rule for project ${projectId}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove automation rule from project
   * @param {string} projectId - Project ID
   * @param {string} ruleId - Rule ID
   * @returns {Promise<Object>} Updated setting
   */
  async removeAutomationRule(projectId, ruleId) {
    try {
      const setting = await this.getProjectSetting(projectId);
      if (!setting) {
        throw new Error(`No setting found for project ${projectId}`);
      }

      const updatedSetting = {
        ...setting,
        rules: setting.rules.filter(rule => rule.id !== ruleId),
        updatedAt: new Date()
      };

      // Update cache
      this.cache.set(projectId, {
        data: updatedSetting,
        timestamp: Date.now()
      });

      // Persist to database
      if (this.automationPreferencesRepository) {
        await this.automationPreferencesRepository.saveProjectSetting(updatedSetting);
      }

      return updatedSetting;
    } catch (error) {
      this.logger.error(`[ProjectAutomationSettings] Failed to remove rule for project ${projectId}:`, error.message);
      throw error;
    }
  }

  /**
   * Add automation exception to project
   * @param {string} projectId - Project ID
   * @param {Object} exception - Automation exception
   * @returns {Promise<Object>} Updated setting
   */
  async addAutomationException(projectId, exception) {
    try {
      const setting = await this.getProjectSetting(projectId);
      if (!setting) {
        throw new Error(`No setting found for project ${projectId}`);
      }

      const updatedSetting = {
        ...setting,
        exceptions: [...setting.exceptions, { ...exception, id: exception.id || Date.now().toString(), createdAt: new Date() }],
        updatedAt: new Date()
      };

      // Update cache
      this.cache.set(projectId, {
        data: updatedSetting,
        timestamp: Date.now()
      });

      // Persist to database
      if (this.automationPreferencesRepository) {
        await this.automationPreferencesRepository.saveProjectSetting(updatedSetting);
      }

      return updatedSetting;
    } catch (error) {
      this.logger.error(`[ProjectAutomationSettings] Failed to add exception for project ${projectId}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove automation exception from project
   * @param {string} projectId - Project ID
   * @param {string} exceptionId - Exception ID
   * @returns {Promise<Object>} Updated setting
   */
  async removeAutomationException(projectId, exceptionId) {
    try {
      const setting = await this.getProjectSetting(projectId);
      if (!setting) {
        throw new Error(`No setting found for project ${projectId}`);
      }

      const updatedSetting = {
        ...setting,
        exceptions: setting.exceptions.filter(exception => exception.id !== exceptionId),
        updatedAt: new Date()
      };

      // Update cache
      this.cache.set(projectId, {
        data: updatedSetting,
        timestamp: Date.now()
      });

      // Persist to database
      if (this.automationPreferencesRepository) {
        await this.automationPreferencesRepository.saveProjectSetting(updatedSetting);
      }

      return updatedSetting;
    } catch (error) {
      this.logger.error(`[ProjectAutomationSettings] Failed to remove exception for project ${projectId}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete project setting
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProjectSetting(projectId) {
    try {
      this.logger.info(`[ProjectAutomationSettings] Deleting setting for project ${projectId}`);

      // Remove from cache
      this.cache.delete(projectId);

      // Remove from database
      if (this.automationPreferencesRepository) {
        await this.automationPreferencesRepository.deleteProjectSetting(projectId);
      }

      // Clear from project metadata
      if (this.projectRepository) {
        await this.projectRepository.updateMetadata(projectId, {
          automationLevel: null,
          automationConfidenceThreshold: null,
          automationPreferences: null,
          automationRules: null,
          automationExceptions: null,
          lastAutomationUpdate: new Date()
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`[ProjectAutomationSettings] Failed to delete setting for project ${projectId}:`, error.message);
      return false;
    }
  }

  /**
   * Get all project settings
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of project settings
   */
  async getAllProjectSettings(options = {}) {
    try {
      if (!this.automationPreferencesRepository) {
        return [];
      }

      return await this.automationPreferencesRepository.getAllProjectSettings(options);
    } catch (error) {
      this.logger.error('[ProjectAutomationSettings] Failed to get all project settings:', error.message);
      return [];
    }
  }

  /**
   * Get projects by automation level
   * @param {string} automationLevel - Automation level
   * @returns {Promise<Array>} Array of project IDs
   */
  async getProjectsByAutomationLevel(automationLevel) {
    try {
      if (!this.automationPreferencesRepository) {
        return [];
      }

      return await this.automationPreferencesRepository.getProjectsByAutomationLevel(automationLevel);
    } catch (error) {
      this.logger.error(`[ProjectAutomationSettings] Failed to get projects by automation level ${automationLevel}:`, error.message);
      return [];
    }
  }

  /**
   * Clear cache for project
   * @param {string} projectId - Project ID
   */
  clearProjectCache(projectId) {
    this.cache.delete(projectId);
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    const validEntries = entries.filter(([_, value]) => (now - value.timestamp) < this.cacheTimeout);
    const expiredEntries = entries.length - validEntries.length;

    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries,
      cacheTimeout: this.cacheTimeout
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [projectId, value] of this.cache.entries()) {
      if ((now - value.timestamp) >= this.cacheTimeout) {
        this.cache.delete(projectId);
      }
    }
  }
}

module.exports = ProjectAutomationSettings; 