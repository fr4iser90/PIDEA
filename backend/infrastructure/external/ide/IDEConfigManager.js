
/**
 * IDE Configuration Manager
 * Manages IDE configurations, settings, and preferences
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class IDEConfigManager {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'ide-config.json');
    this.defaultConfig = {
      ideTypes: {
        cursor: {
          enabled: true,
          portRange: { start: 9222, end: 9231 },
          defaultOptions: {
            userDataDir: null,
            extensionsDir: null,
            disableExtensions: false,
            verbose: false
          },
          startupTimeout: 3000,
          autoStart: false
        },
        vscode: {
          enabled: true,
          portRange: { start: 9232, end: 9241 },
          defaultOptions: {
            userDataDir: null,
            extensionsDir: null,
            disableExtensions: false,
            verbose: false,
            newWindow: false
          },
          startupTimeout: 5000,
          autoStart: false
        },
        windsurf: {
          enabled: true,
          portRange: { start: 9242, end: 9251 },
          defaultOptions: {
            userDataDir: null,
            extensionsDir: null,
            disableExtensions: false,
            verbose: false,
            newWindow: false
          },
          startupTimeout: 4000,
          autoStart: false
        }
      },
      global: {
        defaultIDE: 'cursor',
        autoDetect: true,
        healthCheckInterval: 30000,
        maxConcurrentIDEs: 5,
        logLevel: 'info'
      },
      workspace: {
        rememberLastUsed: true,
        autoSwitch: false,
        defaultWorkspace: null
      }
    };
    this.config = null;
  }

  /**
   * Load IDE configuration
   * @returns {Promise<Object>} Configuration object
   */
  async loadConfig() {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Try to load existing config
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      // Merge with default config to ensure all required fields exist
      this.config = this.mergeWithDefaults(this.config);
      
      logger.info('Configuration loaded successfully');
      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Config file doesn't exist, create with defaults
        logger.info('No configuration file found, creating with defaults');
        this.config = this.defaultConfig;
        await this.saveConfig();
        return this.config;
      } else {
        logger.error('Error loading configuration:', error);
        // Fallback to default config
        this.config = this.defaultConfig;
        return this.config;
      }
    }
  }

  /**
   * Save IDE configuration
   * @param {Object} config - Configuration to save (optional, uses current config if not provided)
   * @returns {Promise<void>}
   */
  async saveConfig(config = null) {
    try {
      const configToSave = config || this.config || this.defaultConfig;
      
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Save configuration with pretty formatting
      await fs.writeFile(this.configPath, JSON.stringify(configToSave, null, 2), 'utf8');
      
      this.config = configToSave;
      logger.info('Configuration saved successfully');
    } catch (error) {
      logger.error('Error saving configuration:', error);
      throw error;
    }
  }

  /**
   * Get configuration for specific IDE type
   * @param {string} ideType - IDE type (cursor, vscode, windsurf)
   * @returns {Object} IDE configuration
   */
  getIDEConfig(ideType) {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    const ideConfig = this.config.ideTypes[ideType.toLowerCase()];
    if (!ideConfig) {
      throw new Error(`Unknown IDE type: ${ideType}`);
    }

    return ideConfig;
  }

  /**
   * Update configuration for specific IDE type
   * @param {string} ideType - IDE type
   * @param {Object} newConfig - New configuration
   * @returns {Promise<void>}
   */
  async updateIDEConfig(ideType, newConfig) {
    if (!this.config) {
      await this.loadConfig();
    }

    const ideTypeLower = ideType.toLowerCase();
    if (!this.config.ideTypes[ideTypeLower]) {
      throw new Error(`Unknown IDE type: ${ideType}`);
    }

    // Merge with existing config
    this.config.ideTypes[ideTypeLower] = {
      ...this.config.ideTypes[ideTypeLower],
      ...newConfig
    };

    await this.saveConfig();
  }

  /**
   * Get global configuration
   * @returns {Object} Global configuration
   */
  getGlobalConfig() {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    return this.config.global;
  }

  /**
   * Update global configuration
   * @param {Object} newConfig - New global configuration
   * @returns {Promise<void>}
   */
  async updateGlobalConfig(newConfig) {
    if (!this.config) {
      await this.loadConfig();
    }

    this.config.global = {
      ...this.config.global,
      ...newConfig
    };

    await this.saveConfig();
  }

  /**
   * Get workspace configuration
   * @returns {Object} Workspace configuration
   */
  getWorkspaceConfig() {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    return this.config.workspace;
  }

  /**
   * Update workspace configuration
   * @param {Object} newConfig - New workspace configuration
   * @returns {Promise<void>}
   */
  async updateWorkspaceConfig(newConfig) {
    if (!this.config) {
      await this.loadConfig();
    }

    this.config.workspace = {
      ...this.config.workspace,
      ...newConfig
    };

    await this.saveConfig();
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig(config = null) {
    const configToValidate = config || this.config;
    const errors = [];
    const warnings = [];

    if (!configToValidate) {
      errors.push('Configuration is null or undefined');
      return { isValid: false, errors, warnings };
    }

    // Validate IDE types
    if (!configToValidate.ideTypes) {
      errors.push('Missing ideTypes configuration');
    } else {
      for (const [ideType, ideConfig] of Object.entries(configToValidate.ideTypes)) {
        if (!ideConfig.portRange) {
          errors.push(`Missing portRange for ${ideType}`);
        } else {
          if (ideConfig.portRange.start >= ideConfig.portRange.end) {
            errors.push(`Invalid port range for ${ideType}: start must be less than end`);
          }
        }

        if (ideConfig.startupTimeout && ideConfig.startupTimeout < 1000) {
          warnings.push(`Startup timeout for ${ideType} is very low (${ideConfig.startupTimeout}ms)`);
        }
      }
    }

    // Validate global config
    if (!configToValidate.global) {
      errors.push('Missing global configuration');
    } else {
      if (configToValidate.global.maxConcurrentIDEs && configToValidate.global.maxConcurrentIDEs < 1) {
        errors.push('maxConcurrentIDEs must be at least 1');
      }

      if (configToValidate.global.healthCheckInterval && configToValidate.global.healthCheckInterval < 5000) {
        warnings.push('Health check interval is very low (less than 5 seconds)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Reset configuration to defaults
   * @returns {Promise<void>}
   */
  async resetToDefaults() {
    this.config = this.defaultConfig;
    await this.saveConfig();
    logger.info('Configuration reset to defaults');
  }

  /**
   * Get enabled IDE types
   * @returns {Array} Array of enabled IDE types
   */
  getEnabledIDETypes() {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    return Object.entries(this.config.ideTypes)
      .filter(([_, config]) => config.enabled)
      .map(([type, _]) => type);
  }

  /**
   * Check if IDE type is enabled
   * @param {string} ideType - IDE type to check
   * @returns {boolean} True if enabled
   */
  isIDEEnabled(ideType) {
    try {
      const ideConfig = this.getIDEConfig(ideType);
      return ideConfig.enabled;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get default IDE type
   * @returns {string} Default IDE type
   */
  getDefaultIDE() {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    return this.config.global.defaultIDE;
  }

  /**
   * Merge configuration with defaults
   * @param {Object} config - Configuration to merge
   * @returns {Object} Merged configuration
   */
  mergeWithDefaults(config) {
    const merged = JSON.parse(JSON.stringify(this.defaultConfig));

    if (config.ideTypes) {
      for (const [ideType, ideConfig] of Object.entries(config.ideTypes)) {
        if (merged.ideTypes[ideType]) {
          merged.ideTypes[ideType] = {
            ...merged.ideTypes[ideType],
            ...ideConfig
          };
        }
      }
    }

    if (config.global) {
      merged.global = {
        ...merged.global,
        ...config.global
      };
    }

    if (config.workspace) {
      merged.workspace = {
        ...merged.workspace,
        ...config.workspace
      };
    }

    return merged;
  }

  /**
   * Get configuration statistics
   * @returns {Object} Configuration statistics
   */
  getConfigStats() {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    const enabledIDEs = this.getEnabledIDETypes();
    const validation = this.validateConfig();

    return {
      totalIDETypes: Object.keys(this.config.ideTypes).length,
      enabledIDETypes: enabledIDEs.length,
      defaultIDE: this.config.global.defaultIDE,
      isValid: validation.isValid,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
      configPath: this.configPath
    };
  }
}

module.exports = IDEConfigManager; 