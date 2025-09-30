/**
 * VersionManagementCommand - Command objects for version management operations
 * Defines command structure for CQRS pattern
 */

class VersionManagementCommand {
  constructor(type, data = {}) {
    this.type = type;
    this.commandType = type;
    this.timestamp = new Date();
    this.id = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    Object.assign(this, data);
  }

  /**
   * Create bump version command
   * @param {Object} params - Command parameters
   * @returns {VersionManagementCommand} Command instance
   */
  static bumpVersion(params) {
    return new VersionManagementCommand('bumpVersion', {
      task: params.task,
      projectPath: params.projectPath,
      bumpType: params.bumpType,
      context: params.context || {}
    });
  }

  /**
   * Create get current version command
   * @param {Object} params - Command parameters
   * @returns {VersionManagementCommand} Command instance
   */
  static getCurrentVersion(params) {
    return new VersionManagementCommand('getCurrentVersion', {
      projectPath: params.projectPath
    });
  }

  /**
   * Create get version history command
   * @param {Object} params - Command parameters
   * @returns {VersionManagementCommand} Command instance
   */
  static getVersionHistory(params) {
    return new VersionManagementCommand('getVersionHistory', {
      filters: params.filters || {}
    });
  }

  /**
   * Create validate version command
   * @param {Object} params - Command parameters
   * @returns {VersionManagementCommand} Command instance
   */
  static validateVersion(params) {
    return new VersionManagementCommand('validateVersion', {
      version: params.version
    });
  }

  /**
   * Create compare versions command
   * @param {Object} params - Command parameters
   * @returns {VersionManagementCommand} Command instance
   */
  static compareVersions(params) {
    return new VersionManagementCommand('compareVersions', {
      version1: params.version1,
      version2: params.version2
    });
  }

  /**
   * Create determine bump type command
   * @param {Object} params - Command parameters
   * @returns {VersionManagementCommand} Command instance
   */
  static determineBumpType(params) {
    return new VersionManagementCommand('determineBumpType', {
      task: params.task,
      projectPath: params.projectPath,
      context: params.context || {}
    });
  }

  /**
   * Create get latest version command
   * @param {Object} params - Command parameters
   * @returns {VersionManagementCommand} Command instance
   */
  static getLatestVersion(params = {}) {
    return new VersionManagementCommand('getLatestVersion', params);
  }

  /**
   * Create update configuration command
   * @param {Object} params - Command parameters
   * @returns {VersionManagementCommand} Command instance
   */
  static updateConfiguration(params) {
    return new VersionManagementCommand('updateConfiguration', {
      config: params.config
    });
  }

  /**
   * Create get configuration command
   * @param {Object} params - Command parameters
   * @returns {VersionManagementCommand} Command instance
   */
  static getConfiguration(params = {}) {
    return new VersionManagementCommand('getConfiguration', params);
  }

  /**
   * Validate command data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Common validations
    if (!this.type) {
      errors.push('Command type is required');
    }

    if (!this.id) {
      errors.push('Command ID is required');
    }

    // Type-specific validations
    switch (this.type) {
      case 'bumpVersion':
        if (!this.task) {
          errors.push('Task is required for bump version command');
        }
        if (!this.projectPath) {
          errors.push('Project path is required for bump version command');
        }
        if (this.bumpType && !['major', 'minor', 'patch'].includes(this.bumpType)) {
          errors.push('Bump type must be major, minor, or patch');
        }
        break;

      case 'getCurrentVersion':
        if (!this.projectPath) {
          errors.push('Project path is required for get current version command');
        }
        break;

      case 'validateVersion':
        if (!this.version) {
          errors.push('Version is required for validate version command');
        }
        if (this.version && typeof this.version !== 'string') {
          errors.push('Version must be a string');
        }
        break;

      case 'compareVersions':
        if (!this.version1) {
          errors.push('Version1 is required for compare versions command');
        }
        if (!this.version2) {
          errors.push('Version2 is required for compare versions command');
        }
        if (this.version1 && typeof this.version1 !== 'string') {
          errors.push('Version1 must be a string');
        }
        if (this.version2 && typeof this.version2 !== 'string') {
          errors.push('Version2 must be a string');
        }
        break;

      case 'determineBumpType':
        if (!this.task) {
          errors.push('Task is required for determine bump type command');
        }
        if (!this.projectPath) {
          errors.push('Project path is required for determine bump type command');
        }
        break;

      case 'updateConfiguration':
        if (!this.config) {
          errors.push('Config is required for update configuration command');
        }
        if (this.config && typeof this.config !== 'object') {
          errors.push('Config must be an object');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get command summary
   * @returns {Object} Command summary
   */
  getSummary() {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      data: this.getData()
    };
  }

  /**
   * Get command data (excluding metadata)
   * @returns {Object} Command data
   */
  getData() {
    const data = { ...this };
    delete data.id;
    delete data.type;
    delete data.commandType;
    delete data.timestamp;
    return data;
  }

  /**
   * Convert command to JSON
   * @returns {string} JSON string
   */
  toJSON() {
    return JSON.stringify({
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      data: this.getData()
    });
  }

  /**
   * Create command from JSON
   * @param {string} json - JSON string
   * @returns {VersionManagementCommand} Command instance
   */
  static fromJSON(json) {
    try {
      const parsed = JSON.parse(json);
      const command = new VersionManagementCommand(parsed.type, parsed.data);
      command.id = parsed.id;
      command.timestamp = new Date(parsed.timestamp);
      return command;
    } catch (error) {
      throw new Error(`Invalid command JSON: ${error.message}`);
    }
  }

  /**
   * Clone command with new data
   * @param {Object} newData - New data to merge
   * @returns {VersionManagementCommand} New command instance
   */
  clone(newData = {}) {
    return new VersionManagementCommand(this.type, {
      ...this.getData(),
      ...newData
    });
  }

  /**
   * Check if command is expired
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {boolean} True if expired
   */
  isExpired(maxAge = 300000) { // 5 minutes default
    return Date.now() - this.timestamp.getTime() > maxAge;
  }

  /**
   * Get command age in milliseconds
   * @returns {number} Age in milliseconds
   */
  getAge() {
    return Date.now() - this.timestamp.getTime();
  }
}

module.exports = VersionManagementCommand;
