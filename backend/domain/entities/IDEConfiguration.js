/**
 * IDE Configuration Entity
 * Represents a user's IDE configuration with executable path and settings
 * Created: 2025-09-29T19:51:09.000Z
 */

class IDEConfiguration {
  constructor({
    id = null,
    userId = 'me',
    ideType,
    executablePath,
    version = null,
    buildNumber = null,
    installationPath = null,
    isDefault = false,
    isActive = true,
    lastUsed = null,
    usageCount = 0,
    portRangeStart = null,
    portRangeEnd = null,
    startupOptions = {},
    metadata = {},
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.userId = userId;
    this.ideType = ideType;
    this.executablePath = executablePath;
    this.version = version;
    this.buildNumber = buildNumber;
    this.installationPath = installationPath;
    this.isDefault = isDefault;
    this.isActive = isActive;
    this.lastUsed = lastUsed;
    this.usageCount = usageCount;
    this.portRangeStart = portRangeStart;
    this.portRangeEnd = portRangeEnd;
    this.startupOptions = startupOptions;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Validate the IDE configuration
   * @returns {Object} Validation result with valid boolean and errors array
   */
  validate() {
    const errors = [];

    if (!this.ideType) {
      errors.push('IDE type is required');
    }

    if (!this.executablePath) {
      errors.push('Executable path is required');
    }

    if (!['cursor', 'vscode', 'windsurf'].includes(this.ideType)) {
      errors.push('Invalid IDE type');
    }

    if (this.portRangeStart && this.portRangeEnd && this.portRangeStart > this.portRangeEnd) {
      errors.push('Port range start must be less than or equal to port range end');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to database format
   * @returns {Object} Database representation
   */
  toDatabase() {
    return {
      id: this.id,
      user_id: this.userId,
      ide_type: this.ideType,
      executable_path: this.executablePath,
      version: this.version,
      build_number: this.buildNumber,
      installation_path: this.installationPath,
      is_default: this.isDefault,
      is_active: this.isActive,
      last_used: this.lastUsed,
      usage_count: this.usageCount,
      port_range_start: this.portRangeStart,
      port_range_end: this.portRangeEnd,
      startup_options: JSON.stringify(this.startupOptions),
      metadata: JSON.stringify(this.metadata),
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  /**
   * Create from database format
   * @param {Object} dbData Database data
   * @returns {IDEConfiguration} IDE configuration instance
   */
  static fromDatabase(dbData) {
    return new IDEConfiguration({
      id: dbData.id,
      userId: dbData.user_id,
      ideType: dbData.ide_type,
      executablePath: dbData.executable_path,
      version: dbData.version,
      buildNumber: dbData.build_number,
      installationPath: dbData.installation_path,
      isDefault: dbData.is_default,
      isActive: dbData.is_active,
      lastUsed: dbData.last_used,
      usageCount: dbData.usage_count,
      portRangeStart: dbData.port_range_start,
      portRangeEnd: dbData.port_range_end,
      startupOptions: dbData.startup_options ? JSON.parse(dbData.startup_options) : {},
      metadata: dbData.metadata ? JSON.parse(dbData.metadata) : {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    });
  }

  /**
   * Update usage statistics
   */
  updateUsage() {
    this.lastUsed = new Date().toISOString();
    this.usageCount += 1;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get port range for this IDE type
   * @returns {Object} Port range with start and end
   */
  getPortRange() {
    const portRanges = {
      cursor: { start: 9222, end: 9231 },
      vscode: { start: 9232, end: 9241 },
      windsurf: { start: 9242, end: 9251 }
    };

    return portRanges[this.ideType] || { start: null, end: null };
  }

  /**
   * Check if this configuration is valid for starting an IDE
   * @returns {boolean} True if configuration is valid
   */
  isValidForStart() {
    const validation = this.validate();
    return validation.valid && this.isActive;
  }
}

module.exports = IDEConfiguration;
