/**
 * IDE Configuration Service
 * Business logic for IDE configuration management
 * Created: 2025-09-29T19:51:09.000Z
 */

const Logger = require('@logging/Logger');
const IDEConfiguration = require('@domain/entities/IDEConfiguration');
const IDEConfigurationRepository = require('@domain/repositories/IDEConfigurationRepository');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);
const logger = new Logger('IDEConfigurationService');

class IDEConfigurationService {
  constructor(database) {
    this.repository = new IDEConfigurationRepository(database);
  }

  /**
   * Create a new IDE configuration
   * @param {Object} configData Configuration data
   * @returns {Promise<IDEConfiguration>} Created configuration
   */
  async createConfiguration(configData) {
    try {
      logger.info('Creating IDE configuration:', configData);

      // Validate executable path
      const validation = await this.validateExecutablePath(configData.executablePath);
      if (!validation.valid) {
        throw new Error(`Invalid executable path: ${validation.error}`);
      }

      // Detect version if not provided
      let version = configData.version;
      if (!version && validation.version) {
        version = validation.version;
      }

      // Get port range for IDE type
      const portRange = this.getPortRangeForIDEType(configData.ideType);

      const config = new IDEConfiguration({
        userId: configData.userId || 'me',
        ideType: configData.ideType,
        executablePath: configData.executablePath,
        version: version,
        buildNumber: configData.buildNumber,
        installationPath: configData.installationPath || path.dirname(configData.executablePath),
        isDefault: configData.isDefault || false,
        isActive: true,
        portRangeStart: portRange.start,
        portRangeEnd: portRange.end,
        startupOptions: configData.startupOptions || {},
        metadata: configData.metadata || {}
      });

      const createdConfig = await this.repository.create(config);
      logger.info('Created IDE configuration:', createdConfig.id);

      return createdConfig;
    } catch (error) {
      logger.error('Error creating IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Get all configurations for a user
   * @param {string} userId User ID
   * @returns {Promise<IDEConfiguration[]>} Array of configurations
   */
  async getConfigurations(userId = 'me') {
    try {
      return await this.repository.findByUserId(userId);
    } catch (error) {
      logger.error('Error getting IDE configurations:', error);
      throw error;
    }
  }

  /**
   * Get active configurations for a user
   * @param {string} userId User ID
   * @returns {Promise<IDEConfiguration[]>} Array of active configurations
   */
  async getActiveConfigurations(userId = 'me') {
    try {
      return await this.repository.findActiveByUserId(userId);
    } catch (error) {
      logger.error('Error getting active IDE configurations:', error);
      throw error;
    }
  }

  /**
   * Get default configuration for an IDE type
   * @param {string} ideType IDE type
   * @param {string} userId User ID
   * @returns {Promise<IDEConfiguration|null>} Default configuration
   */
  async getDefaultConfiguration(ideType, userId = 'me') {
    try {
      return await this.repository.findDefaultByType(ideType, userId);
    } catch (error) {
      logger.error('Error getting default IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Update IDE configuration
   * @param {string} id Configuration ID
   * @param {Object} updates Updates to apply
   * @returns {Promise<IDEConfiguration|null>} Updated configuration
   */
  async updateConfiguration(id, updates) {
    try {
      logger.info('Updating IDE configuration:', id, updates);

      // Validate executable path if it's being updated
      if (updates.executablePath) {
        const validation = await this.validateExecutablePath(updates.executablePath);
        if (!validation.valid) {
          throw new Error(`Invalid executable path: ${validation.error}`);
        }

        // Update version if not provided
        if (!updates.version && validation.version) {
          updates.version = validation.version;
        }
      }

      return await this.repository.update(id, updates);
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
  async deleteConfiguration(id) {
    try {
      logger.info('Deleting IDE configuration:', id);
      return await this.repository.delete(id);
    } catch (error) {
      logger.error('Error deleting IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Validate IDE executable path
   * @param {string} executablePath Path to IDE executable
   * @returns {Promise<Object>} Validation result with version info
   */
  async validateExecutablePath(executablePath) {
    try {
      // Check if file exists
      try {
        await fs.access(executablePath);
      } catch (error) {
        return {
          valid: false,
          error: 'Executable file does not exist'
        };
      }

      // Try to get version
      try {
        const version = await this.detectIDEVersion(executablePath);
        return {
          valid: true,
          version: version
        };
      } catch (error) {
        logger.warn('Could not detect IDE version:', error.message);
        return {
          valid: true,
          version: null
        };
      }
    } catch (error) {
      logger.error('Error validating executable path:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Detect IDE version from executable
   * @param {string} executablePath Path to IDE executable
   * @returns {Promise<string|null>} Version string or null
   */
  async detectIDEVersion(executablePath) {
    try {
      const command = `"${executablePath}" --version`;
      const { stdout } = await execAsync(command, { timeout: 10000 });
      
      // Parse version from output
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : null;
    } catch (error) {
      logger.warn('Failed to detect IDE version:', error.message);
      return null;
    }
  }

  /**
   * Get port range for IDE type
   * @param {string} ideType IDE type
   * @returns {Object} Port range with start and end
   */
  getPortRangeForIDEType(ideType) {
    const portRanges = {
      cursor: { start: 9222, end: 9231 },
      vscode: { start: 9232, end: 9241 },
      windsurf: { start: 9242, end: 9251 }
    };

    return portRanges[ideType] || { start: null, end: null };
  }

  /**
   * Update usage statistics
   * @param {string} id Configuration ID
   * @returns {Promise<boolean>} True if updated
   */
  async updateUsage(id) {
    try {
      return await this.repository.updateUsage(id);
    } catch (error) {
      logger.error('Error updating IDE configuration usage:', error);
      throw error;
    }
  }

  /**
   * Set default configuration for IDE type
   * @param {string} ideType IDE type
   * @param {string} configId Configuration ID
   * @param {string} userId User ID
   * @returns {Promise<boolean>} True if updated
   */
  async setDefaultConfiguration(ideType, configId, userId = 'me') {
    try {
      logger.info('Setting default IDE configuration:', { ideType, configId, userId });
      return await this.repository.setDefault(ideType, configId, userId);
    } catch (error) {
      logger.error('Error setting default IDE configuration:', error);
      throw error;
    }
  }

  /**
   * Get download links for IDE types
   * @returns {Object} Download links by IDE type and platform
   */
  getDownloadLinks() {
    return {
      cursor: {
        windows: 'https://cursor.sh/download/windows',
        macos: 'https://cursor.sh/download/macos',
        linux: 'https://cursor.sh/download/linux'
      },
      vscode: {
        windows: 'https://code.visualstudio.com/download',
        macos: 'https://code.visualstudio.com/download',
        linux: 'https://code.visualstudio.com/download'
      },
      windsurf: {
        windows: 'https://windsurf.dev/download/windows',
        macos: 'https://windsurf.dev/download/macos',
        linux: 'https://windsurf.dev/download/linux'
      }
    };
  }

  /**
   * Get default executable paths for IDE types
   * @returns {Object} Default paths by IDE type and platform
   */
  getDefaultExecutablePaths() {
    const platform = process.platform;
    
    const paths = {
      cursor: {
        win32: 'cursor.exe',
        darwin: '/Applications/Cursor.app/Contents/MacOS/Cursor',
        linux: 'cursor'
      },
      vscode: {
        win32: 'code.exe',
        darwin: '/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
        linux: 'code'
      },
      windsurf: {
        win32: 'windsurf.exe',
        darwin: '/Applications/Windsurf.app/Contents/MacOS/Windsurf',
        linux: 'windsurf'
      }
    };

    const result = {};
    Object.keys(paths).forEach(ideType => {
      result[ideType] = paths[ideType][platform] || paths[ideType].linux;
    });

    return result;
  }
}

module.exports = IDEConfigurationService;
