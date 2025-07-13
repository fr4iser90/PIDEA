const { logger } = require('@infrastructure/logging/Logger');
/**
 * UserPreferenceManager - User preference management
 * Manages user automation preferences with persistence
 */
class UserPreferenceManager {
  constructor(dependencies = {}) {
    this.userRepository = dependencies.userRepository;
    this.automationPreferencesRepository = dependencies.automationPreferencesRepository;
    this.logger = dependencies.logger || console;
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  /**
   * Set user automation preference
   * @param {string} userId - User ID
   * @param {string} automationLevel - Automation level
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated preference
   */
  async setUserPreference(userId, automationLevel, options = {}) {
    try {
      this.logger.info(`[UserPreferenceManager] Setting preference for user ${userId}: ${automationLevel}`);

      const preference = {
        userId,
        automationLevel,
        confidenceThreshold: options.confidenceThreshold || 0.8,
        preferences: options.preferences || {},
        updatedAt: new Date()
      };

      // Update cache
      this.cache.set(userId, {
        data: preference,
        timestamp: Date.now()
      });

      // Persist to database
      if (this.automationPreferencesRepository) {
        await this.automationPreferencesRepository.saveUserPreference(preference);
      }

      // Update user metadata if repository available
      if (this.userRepository) {
        await this.userRepository.updateMetadata(userId, {
          automationPreference: automationLevel,
          automationConfidenceThreshold: preference.confidenceThreshold,
          lastAutomationPreferenceUpdate: new Date()
        });
      }

      return preference;
    } catch (error) {
      this.logger.error(`[UserPreferenceManager] Failed to set preference for user ${userId}:`, error.message);
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
      // Check cache first
      const cached = this.cache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.data;
      }

      // Load from database
      let preference = null;
      if (this.automationPreferencesRepository) {
        preference = await this.automationPreferencesRepository.getUserPreference(userId);
      }

      // Fallback to user metadata
      if (!preference && this.userRepository) {
        const user = await this.userRepository.findById(userId);
        if (user && user.metadata?.automationPreference) {
          preference = {
            userId,
            automationLevel: user.metadata.automationPreference,
            confidenceThreshold: user.metadata.automationConfidenceThreshold || 0.8,
            preferences: user.metadata.automationPreferences || {},
            updatedAt: user.metadata.lastAutomationPreferenceUpdate || user.updatedAt
          };
        }
      }

      // Cache result
      if (preference) {
        this.cache.set(userId, {
          data: preference,
          timestamp: Date.now()
        });
      }

      return preference;
    } catch (error) {
      this.logger.error(`[UserPreferenceManager] Failed to get preference for user ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Get user automation level
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} Automation level
   */
  async getUserAutomationLevel(userId) {
    const preference = await this.getUserPreference(userId);
    return preference?.automationLevel || null;
  }

  /**
   * Get user confidence threshold
   * @param {string} userId - User ID
   * @returns {Promise<number>} Confidence threshold
   */
  async getUserConfidenceThreshold(userId) {
    const preference = await this.getUserPreference(userId);
    return preference?.confidenceThreshold || 0.8;
  }

  /**
   * Update user preference metadata
   * @param {string} userId - User ID
   * @param {Object} metadata - Preference metadata
   * @returns {Promise<Object>} Updated preference
   */
  async updateUserPreferenceMetadata(userId, metadata) {
    try {
      const preference = await this.getUserPreference(userId);
      if (!preference) {
        throw new Error(`No preference found for user ${userId}`);
      }

      const updatedPreference = {
        ...preference,
        preferences: { ...preference.preferences, ...metadata },
        updatedAt: new Date()
      };

      // Update cache
      this.cache.set(userId, {
        data: updatedPreference,
        timestamp: Date.now()
      });

      // Persist to database
      if (this.automationPreferencesRepository) {
        await this.automationPreferencesRepository.saveUserPreference(updatedPreference);
      }

      return updatedPreference;
    } catch (error) {
      this.logger.error(`[UserPreferenceManager] Failed to update metadata for user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete user preference
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteUserPreference(userId) {
    try {
      this.logger.info(`[UserPreferenceManager] Deleting preference for user ${userId}`);

      // Remove from cache
      this.cache.delete(userId);

      // Remove from database
      if (this.automationPreferencesRepository) {
        await this.automationPreferencesRepository.deleteUserPreference(userId);
      }

      // Clear from user metadata
      if (this.userRepository) {
        await this.userRepository.updateMetadata(userId, {
          automationPreference: null,
          automationConfidenceThreshold: null,
          automationPreferences: null,
          lastAutomationPreferenceUpdate: new Date()
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`[UserPreferenceManager] Failed to delete preference for user ${userId}:`, error.message);
      return false;
    }
  }

  /**
   * Get all user preferences
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of user preferences
   */
  async getAllUserPreferences(options = {}) {
    try {
      if (!this.automationPreferencesRepository) {
        return [];
      }

      return await this.automationPreferencesRepository.getAllUserPreferences(options);
    } catch (error) {
      this.logger.error('[UserPreferenceManager] Failed to get all user preferences:', error.message);
      return [];
    }
  }

  /**
   * Get users by automation level
   * @param {string} automationLevel - Automation level
   * @returns {Promise<Array>} Array of user IDs
   */
  async getUsersByAutomationLevel(automationLevel) {
    try {
      if (!this.automationPreferencesRepository) {
        return [];
      }

      return await this.automationPreferencesRepository.getUsersByAutomationLevel(automationLevel);
    } catch (error) {
      this.logger.error(`[UserPreferenceManager] Failed to get users by automation level ${automationLevel}:`, error.message);
      return [];
    }
  }

  /**
   * Clear cache for user
   * @param {string} userId - User ID
   */
  clearUserCache(userId) {
    this.cache.delete(userId);
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
    for (const [userId, value] of this.cache.entries()) {
      if ((now - value.timestamp) >= this.cacheTimeout) {
        this.cache.delete(userId);
      }
    }
  }
}

module.exports = UserPreferenceManager; 