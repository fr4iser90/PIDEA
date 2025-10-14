/**
 * Project Entity - Domain Model
 *
 * Represents a project in the PIDEA system with all its properties
 * and business rules for project management.
 */

class Project {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || "";
    this.description = data.description || "";
    this.workspacePath = data.workspacePath || "";
    this.type = data.type || "web";
    this.framework = data.framework || "";
    this.language = data.language || "";
    this.packageManager = data.packageManager || "";
    this.frontendPort = data.frontendPort || null;
    this.backendPort = data.backendPort || null;
    this.databasePort = data.databasePort || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  }

  /**
   * Validate project data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push("Project name is required");
    }

    if (!this.workspacePath || this.workspacePath.trim().length === 0) {
      errors.push("Workspace path is required");
    }

    if (
      this.frontendPort &&
      (this.frontendPort < 1000 || this.frontendPort > 65535)
    ) {
      errors.push("Frontend port must be between 1000 and 65535");
    }

    if (
      this.backendPort &&
      (this.backendPort < 1000 || this.backendPort > 65535)
    ) {
      errors.push("Backend port must be between 1000 and 65535");
    }

    if (
      this.databasePort &&
      (this.databasePort < 1000 || this.databasePort > 65535)
    ) {
      errors.push("Database port must be between 1000 and 65535");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update project data
   * @param {Object} data - Data to update
   */
  update(data) {
    const allowedFields = [
      "name",
      "description",
      "workspacePath",
      "type",
      "framework",
      "language",
      "packageManager",
      "frontendPort",
      "backendPort",
      "databasePort",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        this[field] = data[field];
      }
    });

    this.updatedAt = new Date();
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      workspacePath: this.workspacePath,
      type: this.type,
      framework: this.framework,
      language: this.language,
      packageManager: this.packageManager,
      frontendPort: this.frontendPort,
      backendPort: this.backendPort,
      databasePort: this.databasePort,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive,
    };
  }

  /**
   * Create from plain object
   * @param {Object} data - Plain object data
   * @returns {Project} Project instance
   */
  static fromObject(data) {
    return new Project(data);
  }
}

module.exports = Project;
