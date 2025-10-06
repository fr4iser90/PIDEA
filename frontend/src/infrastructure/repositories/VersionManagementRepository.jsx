/**
 * VersionManagementRepository - Frontend repository for version management operations
 * Handles all version management API calls with proper error handling and data transformation
 */

import { apiCall } from './APIChatRepository.jsx';
import { logger } from '@/infrastructure/logging/Logger';

class VersionManagementRepository {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  /**
   * Get current version for a project
   * @param {string} projectPath - Project workspace path
   * @returns {Promise<Object>} Current version information
   */
  async getCurrentVersion(projectPath) {
    try {
      logger.info('🔍 [VersionManagementRepository] Getting current version for:', projectPath);
      
      const endpoint = `${this.baseURL}/versions/current`;
      const params = new URLSearchParams({ projectPath });
      
      const data = await apiCall(`${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info('✅ [VersionManagementRepository] Current version retrieved:', data);
      return data;
    } catch (error) {
      logger.error('❌ [VersionManagementRepository] Error getting current version:', error);
      throw new Error(`Failed to get current version: ${error.message}`);
    }
  }

  /**
   * Get version history for a project
   * @param {Object} filters - Optional filters for history
   * @returns {Promise<Array>} Version history
   */
  async getVersionHistory(filters = {}) {
    try {
      logger.info('🔍 [VersionManagementRepository] Getting version history with filters:', filters);
      
      const endpoint = `${this.baseURL}/versions/history`;
      const params = new URLSearchParams(filters);
      
      const data = await apiCall(`${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info('✅ [VersionManagementRepository] Version history retrieved:', data);
      return data;
    } catch (error) {
      logger.error('❌ [VersionManagementRepository] Error getting version history:', error);
      throw new Error(`Failed to get version history: ${error.message}`);
    }
  }

  /**
   * Bump version for a project
   * @param {string} task - Task description
   * @param {string} projectPath - Project workspace path
   * @param {string} bumpType - Type of bump (major, minor, patch)
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Bump result
   */
  async bumpVersion(task, projectPath, bumpType = null, context = {}) {
    try {
      logger.info('🔍 [VersionManagementRepository] Bumping version:', {
        task,
        projectPath,
        bumpType,
        context
      });
      
      const endpoint = `${this.baseURL}/versions/bump`;
      
      const data = await apiCall(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task,
          projectPath,
          bumpType,
          context
        })
      });

      logger.info('✅ [VersionManagementRepository] Version bumped successfully:', data);
      return data;
    } catch (error) {
      logger.error('❌ [VersionManagementRepository] Error bumping version:', error);
      throw new Error(`Failed to bump version: ${error.message}`);
    }
  }

  /**
   * Determine the appropriate bump type based on task and project
   * @param {string} task - Task description
   * @param {string} projectPath - Project workspace path
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Bump type recommendation
   */
  async determineBumpType(task, projectPath, context = {}) {
    try {
      logger.info('🔍 [VersionManagementRepository] Determining bump type:', {
        task,
        projectPath,
        context
      });
      
      const endpoint = `${this.baseURL}/versions/determine-bump-type`;
      
      const data = await apiCall(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task,
          projectPath,
          context
        })
      });

      logger.info('✅ [VersionManagementRepository] Bump type determined:', data);
      return data;
    } catch (error) {
      logger.error('❌ [VersionManagementRepository] Error determining bump type:', error);
      throw new Error(`Failed to determine bump type: ${error.message}`);
    }
  }

  /**
   * Validate a version string
   * @param {string} version - Version string to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateVersion(version) {
    try {
      logger.info('🔍 [VersionManagementRepository] Validating version:', version);
      
      const endpoint = `${this.baseURL}/versions/validate`;
      
      const data = await apiCall(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ version })
      });

      logger.info('✅ [VersionManagementRepository] Version validated:', data);
      return data;
    } catch (error) {
      logger.error('❌ [VersionManagementRepository] Error validating version:', error);
      throw new Error(`Failed to validate version: ${error.message}`);
    }
  }

  /**
   * Compare two versions
   * @param {string} version1 - First version
   * @param {string} version2 - Second version
   * @returns {Promise<Object>} Comparison result
   */
  async compareVersions(version1, version2) {
    try {
      logger.info('🔍 [VersionManagementRepository] Comparing versions:', { version1, version2 });
      
      const endpoint = `${this.baseURL}/versions/compare`;
      
      const data = await apiCall(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ version1, version2 })
      });

      logger.info('✅ [VersionManagementRepository] Versions compared:', data);
      return data;
    } catch (error) {
      logger.error('❌ [VersionManagementRepository] Error comparing versions:', error);
      throw new Error(`Failed to compare versions: ${error.message}`);
    }
  }

  /**
   * Get latest version information
   * @returns {Promise<Object>} Latest version info
   */
  async getLatestVersion() {
    try {
      logger.info('🔍 [VersionManagementRepository] Getting latest version');
      
      const endpoint = `${this.baseURL}/versions/latest`;
      
      const data = await apiCall(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info('✅ [VersionManagementRepository] Latest version retrieved:', data);
      return data;
    } catch (error) {
      logger.error('❌ [VersionManagementRepository] Error getting latest version:', error);
      throw new Error(`Failed to get latest version: ${error.message}`);
    }
  }

  /**
   * Get version management configuration
   * @returns {Promise<Object>} Configuration
   */
  async getConfiguration() {
    try {
      logger.info('🔍 [VersionManagementRepository] Getting configuration');
      
      const endpoint = `${this.baseURL}/versions/config`;
      
      const data = await apiCall(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info('✅ [VersionManagementRepository] Configuration retrieved:', data);
      return data;
    } catch (error) {
      logger.error('❌ [VersionManagementRepository] Error getting configuration:', error);
      throw new Error(`Failed to get configuration: ${error.message}`);
    }
  }

  /**
   * Update version management configuration
   * @param {Object} config - New configuration
   * @returns {Promise<Object>} Update result
   */
  async updateConfiguration(config) {
    try {
      logger.info('🔍 [VersionManagementRepository] Updating configuration:', config);
      
      const endpoint = `${this.baseURL}/versions/config`;
      
      const data = await apiCall(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config })
      });

      logger.info('✅ [VersionManagementRepository] Configuration updated:', data);
      return data;
    } catch (error) {
      logger.error('❌ [VersionManagementRepository] Error updating configuration:', error);
      throw new Error(`Failed to update configuration: ${error.message}`);
    }
  }

  /**
   * Health check for version management service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      logger.info('🔍 [VersionManagementRepository] Checking health');
      
      const endpoint = `${this.baseURL}/versions/health`;
      
      const data = await apiCall(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info('✅ [VersionManagementRepository] Health check completed:', data);
      return data;
    } catch (error) {
      logger.error('❌ [VersionManagementRepository] Error checking health:', error);
      throw new Error(`Failed to check health: ${error.message}`);
    }
  }
}

export default VersionManagementRepository;
