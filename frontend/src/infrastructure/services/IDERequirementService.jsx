/**
 * IDE Requirement Service
 * Frontend service for managing IDE requirements and configurations
 * Created: 2025-09-29T19:51:09.000Z
 */

import { cacheService } from '@/infrastructure/services/CacheService';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import TimeoutConfig from '@/config/timeout-config.js';

class IDERequirementService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = TimeoutConfig.getTimeout('CACHE', 'MEMORY_CACHE'); // Use configurable timeout
  }

  /**
   * Check if user has any running IDE instances
   * @param {number} maxRetries Maximum number of retries (default: from config)
   * @param {number} retryDelay Delay between retries in ms (default: from config)
   * @returns {Promise<boolean>} True if IDE is running
   */
  async hasRunningIDE(maxRetries = TimeoutConfig.getRetryConfig('IDE').maxAttempts, retryDelay = TimeoutConfig.getRetryConfig('IDE').initialDelay) {
    try {
      // ✅ FIX: Check authentication before making API call
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) {
        logger.warn('User not authenticated, cannot check IDE status');
        return false;
      }

      // Poll for IDE detection to complete
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Use centralized cache function
          const result = await cacheService.getIDEData();
          
          if (result.success && result.data) {
            const ides = Array.isArray(result.data) ? result.data : (result.data.ides || []);
            
            // If we have IDEs, return true
            if (ides.length > 0) {
              logger.info(`Found ${ides.length} IDE(s) on attempt ${attempt}`);
              return true;
            }
            
            // If this is the last attempt and no IDEs found, return false
            if (attempt === maxRetries) {
              logger.info(`No IDEs found after ${maxRetries} attempts`);
              return false;
            }
            
            // Wait before next attempt
            logger.info(`No IDEs found on attempt ${attempt}, retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            logger.warn(`API call failed on attempt ${attempt}:`, result);
            if (attempt === maxRetries) {
              return false;
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        } catch (error) {
          logger.warn(`Error on attempt ${attempt}:`, error);
          if (attempt === maxRetries) {
            return false;
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      return false;
    } catch (error) {
      logger.warn('Error checking IDE status:', error);
      return false;
    }
  }

  /**
   * Get user's IDE configurations
   * @returns {Promise<Array>} Array of IDE configurations
   */
  async getIDEConfigurations() {
    try {
      // ✅ FIX: Check authentication before making API call
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) {
        logger.warn('User not authenticated, cannot get IDE configurations');
        return [];
      }

      const cacheKey = 'ide_configurations';
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await apiCall('/api/ide/configurations');
      if (result.success) {
        this.setCached(cacheKey, result.data);
        return result.data;
      }
      
      return [];
    } catch (error) {
      logger.error('Error getting IDE configurations:', error);
      return [];
    }
  }

  /**
   * Get active IDE configurations
   * @returns {Promise<Array>} Array of active IDE configurations
   */
  async getActiveIDEConfigurations() {
    try {
      const cacheKey = 'active_ide_configurations';
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await apiCall('/api/ide/configurations/active');
      if (result.success) {
        this.setCached(cacheKey, result.data);
        return result.data;
      }
      
      return [];
    } catch (error) {
      logger.error('Error getting active IDE configurations:', error);
      return [];
    }
  }

  /**
   * Create new IDE configuration
   * @param {Object} configData Configuration data
   * @returns {Promise<Object>} Created configuration
   */
  async createIDEConfiguration(configData) {
    try {
      const result = await apiCall('/api/ide/configurations', {
        method: 'POST',
        body: JSON.stringify(configData)
      });

      if (result.success) {
        this.clearCache();
        return result.data;
      }
      
      throw new Error(result.error || 'Failed to create IDE configuration');
    } catch (error) {
      logger.error('Error creating IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Update IDE configuration
   * @param {string} id Configuration ID
   * @param {Object} updates Updates to apply
   * @returns {Promise<Object>} Updated configuration
   */
  async updateIDEConfiguration(id, updates) {
    try {
      const result = await apiCall(`/api/ide/configurations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (result.success) {
        this.clearCache();
        return result.data;
      }
      
      throw new Error(result.error || 'Failed to update IDE configuration');
    } catch (error) {
      logger.error('Error updating IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Delete IDE configuration
   * @param {string} id Configuration ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteIDEConfiguration(id) {
    try {
      const result = await apiCall(`/api/ide/configurations/${id}`, {
        method: 'DELETE'
      });

      if (result.success) {
        this.clearCache();
        return true;
      }
      
      throw new Error(result.error || 'Failed to delete IDE configuration');
    } catch (error) {
      logger.error('Error deleting IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Validate IDE executable path
   * @param {string} executablePath Path to IDE executable
   * @returns {Promise<Object>} Validation result
   */
  async validateExecutablePath(executablePath) {
    try {
      const result = await apiCall('/api/ide/configurations/validate', {
        method: 'POST',
        body: JSON.stringify({ executablePath })
      });

      if (result.success) {
        return result.data;
      }
      
      throw new Error(result.error || 'Failed to validate executable path');
    } catch (error) {
      logger.error('Error validating executable path:', error);
      throw error;
    }
  }

  /**
   * Detect IDE version from executable
   * @param {string} executablePath Path to IDE executable
   * @returns {Promise<string|null>} Version string or null
   */
  async detectIDEVersion(executablePath) {
    try {
      const result = await apiCall('/api/ide/configurations/version', {
        method: 'POST',
        body: JSON.stringify({ executablePath })
      });

      if (result.success) {
        return result.data.version;
      }
      
      return null;
    } catch (error) {
      logger.warn('Error detecting IDE version:', error);
      return null;
    }
  }

  /**
   * Get download links for IDE types
   * @returns {Promise<Object>} Download links by IDE type
   */
  async getDownloadLinks() {
    try {
      const cacheKey = 'download_links';
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await apiCall('/api/ide/configurations/download-links');
      if (result.success) {
        this.setCached(cacheKey, result.data);
        return result.data;
      }
      
      return {};
    } catch (error) {
      logger.error('Error getting download links:', error);
      return {};
    }
  }

  /**
   * Get executable paths for IDE types
   * @returns {Promise<Object>} Executable paths by IDE type
   */
  async getExecutablePaths() {
    try {
      const cacheKey = 'executable_paths';
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await apiCall('/api/ide/configurations/executable-paths');
      if (result.success) {
        this.setCached(cacheKey, result.data);
        return result.data;
      }
      
      return {};
    } catch (error) {
      logger.error('Error getting executable paths:', error);
      return {};
    }
  }

  /**
   * Save executable path for IDE type
   * @param {string} ideType IDE type
   * @param {string} executablePath Executable path
   * @returns {Promise<boolean>} Success status
   */
  async saveExecutablePath(ideType, executablePath) {
    try {
      const result = await apiCall('/api/ide/configurations/executable-paths', {
        method: 'POST',
        body: JSON.stringify({
          ideType,
          executablePath
        })
      });
      
      if (result.success) {
        // Clear cache to force reload
        this.clearCached('executable_paths');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error saving executable path:', error);
      return false;
    }
  }


  /**
   * Set default configuration for IDE type
   * @param {string} ideType IDE type
   * @param {string} configId Configuration ID
   * @returns {Promise<boolean>} True if set successfully
   */
  async setDefaultConfiguration(ideType, configId) {
    try {
      const result = await apiCall('/api/ide/configurations/set-default', {
        method: 'POST',
        body: JSON.stringify({ ideType, configId })
      });

      if (result.success) {
        this.clearCache();
        return true;
      }
      
      throw new Error(result.error || 'Failed to set default configuration');
    } catch (error) {
      logger.error('Error setting default IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Update usage statistics for configuration
   * @param {string} id Configuration ID
   * @returns {Promise<boolean>} True if updated
   */
  async updateUsage(id) {
    try {
      const result = await apiCall(`/api/ide/configurations/${id}/usage`, {
        method: 'POST'
      });

      return result.success;
    } catch (error) {
      logger.warn('Error updating IDE configuration usage:', error);
      return false;
    }
  }

  /**
   * Check if IDE requirement modal should be shown
   * @returns {Promise<boolean>} True if modal should be shown
   */
  async shouldShowRequirementModal() {
    try {
      logger.info('Checking if IDE requirement modal should be shown...');
      
      // Wait for IDE detection to complete with polling
      const hasRunningIDE = await this.hasRunningIDE(TimeoutConfig.getRetryConfig('IDE').maxAttempts, TimeoutConfig.getRetryConfig('IDE').initialDelay);
      
      // Get configurations (this doesn't need polling as it's fast)
      const hasConfigurations = await this.getActiveIDEConfigurations();
      
      const shouldShow = !hasRunningIDE && hasConfigurations.length === 0;
      
      logger.info(`IDE requirement modal check: hasRunningIDE=${hasRunningIDE}, hasConfigurations=${hasConfigurations.length}, shouldShow=${shouldShow}`);
      
      return shouldShow;
    } catch (error) {
      logger.error('Error checking IDE requirement modal condition:', error);
      return false;
    }
  }

  /**
   * Get cached data
   * @param {string} key Cache key
   * @returns {*} Cached data or null
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached data
   * @param {string} key Cache key
   * @param {*} data Data to cache
   */
  setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export default new IDERequirementService();
