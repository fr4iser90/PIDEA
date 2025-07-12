/**
 * GenerateValidationService - Validation service for generate operations
 * 
 * This service provides comprehensive validation for generate operations including
 * input validation, business rule validation, result validation, and security validation.
 * It ensures data integrity and security throughout the generate workflow.
 */
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate validation service
 */
class GenerateValidationService {
  /**
   * Create a new generate validation service
   * @param {Object} options - Service options
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.options = {
      enableSecurityValidation: options.enableSecurityValidation !== false,
      enableBusinessRuleValidation: options.enableBusinessRuleValidation !== false,
      enableResultValidation: options.enableResultValidation !== false,
      maxFileSize: options.maxFileSize || 100 * 1024 * 1024, // 100MB
      allowedScriptTypes: options.allowedScriptTypes || ['build', 'deploy', 'test', 'lint', 'format', 'clean', 'dev', 'prod', 'custom'],
      allowedDocTypes: options.allowedDocTypes || ['comprehensive', 'api', 'architecture', 'examples', 'tutorials'],
      maxScriptTypes: options.maxScriptTypes || 10,
      maxProjectPathLength: options.maxProjectPathLength || 500,
      ...options
    };
  }

  /**
   * Validate generate script request
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @returns {Object} Validation result
   */
  async validateScriptRequest(context, options = {}) {
    const errors = [];
    const warnings = [];

    try {
      // Validate context
      const contextValidation = this.validateContext(context);
      errors.push(...contextValidation.errors);
      warnings.push(...contextValidation.warnings);

      // Validate project path
      const projectPath = context.get('projectPath');
      if (projectPath) {
        const pathValidation = await this.validateProjectPath(projectPath);
        errors.push(...pathValidation.errors);
        warnings.push(...pathValidation.warnings);
      }

      // Validate script type
      const scriptType = options.scriptType;
      if (scriptType) {
        const scriptTypeValidation = this.validateScriptType(scriptType);
        errors.push(...scriptTypeValidation.errors);
        warnings.push(...scriptTypeValidation.warnings);
      }

      // Validate generation options
      const optionsValidation = this.validateGenerationOptions(options);
      errors.push(...optionsValidation.errors);
      warnings.push(...optionsValidation.warnings);

      // Security validation
      if (this.options.enableSecurityValidation) {
        const securityValidation = await this.validateSecurity(context, options);
        errors.push(...securityValidation.errors);
        warnings.push(...securityValidation.warnings);
      }

      // Business rule validation
      if (this.options.enableBusinessRuleValidation) {
        const businessValidation = this.validateBusinessRules(context, options);
        errors.push(...businessValidation.errors);
        warnings.push(...businessValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      this.logger.error('GenerateValidationService: Script request validation failed:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate generate scripts request
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @returns {Object} Validation result
   */
  async validateScriptsRequest(context, options = {}) {
    const errors = [];
    const warnings = [];

    try {
      // Validate context
      const contextValidation = this.validateContext(context);
      errors.push(...contextValidation.errors);
      warnings.push(...contextValidation.warnings);

      // Validate project path
      const projectPath = context.get('projectPath');
      if (projectPath) {
        const pathValidation = await this.validateProjectPath(projectPath);
        errors.push(...pathValidation.errors);
        warnings.push(...pathValidation.warnings);
      }

      // Validate script types
      const scriptTypes = options.scriptTypes;
      if (scriptTypes) {
        const scriptTypesValidation = this.validateScriptTypes(scriptTypes);
        errors.push(...scriptTypesValidation.errors);
        warnings.push(...scriptTypesValidation.warnings);
      }

      // Validate generation options
      const optionsValidation = this.validateGenerationOptions(options);
      errors.push(...optionsValidation.errors);
      warnings.push(...optionsValidation.warnings);

      // Security validation
      if (this.options.enableSecurityValidation) {
        const securityValidation = await this.validateSecurity(context, options);
        errors.push(...securityValidation.errors);
        warnings.push(...securityValidation.warnings);
      }

      // Business rule validation
      if (this.options.enableBusinessRuleValidation) {
        const businessValidation = this.validateBusinessRules(context, options);
        errors.push(...businessValidation.errors);
        warnings.push(...businessValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      this.logger.error('GenerateValidationService: Scripts request validation failed:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate generate documentation request
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @returns {Object} Validation result
   */
  async validateDocumentationRequest(context, options = {}) {
    const errors = [];
    const warnings = [];

    try {
      // Validate context
      const contextValidation = this.validateContext(context);
      errors.push(...contextValidation.errors);
      warnings.push(...contextValidation.warnings);

      // Validate project path
      const projectPath = context.get('projectPath');
      if (projectPath) {
        const pathValidation = await this.validateProjectPath(projectPath);
        errors.push(...pathValidation.errors);
        warnings.push(...pathValidation.warnings);
      }

      // Validate documentation type
      const docType = options.docType;
      if (docType) {
        const docTypeValidation = this.validateDocType(docType);
        errors.push(...docTypeValidation.errors);
        warnings.push(...docTypeValidation.warnings);
      }

      // Validate generation options
      const optionsValidation = this.validateGenerationOptions(options);
      errors.push(...optionsValidation.errors);
      warnings.push(...optionsValidation.warnings);

      // Security validation
      if (this.options.enableSecurityValidation) {
        const securityValidation = await this.validateSecurity(context, options);
        errors.push(...securityValidation.errors);
        warnings.push(...securityValidation.warnings);
      }

      // Business rule validation
      if (this.options.enableBusinessRuleValidation) {
        const businessValidation = this.validateBusinessRules(context, options);
        errors.push(...businessValidation.errors);
        warnings.push(...businessValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      this.logger.error('GenerateValidationService: Documentation request validation failed:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate workflow context
   * @param {Object} context - Workflow context
   * @returns {Object} Validation result
   */
  validateContext(context) {
    const errors = [];
    const warnings = [];

    if (!context) {
      errors.push('Workflow context is required');
      return { errors, warnings };
    }

    if (typeof context.get !== 'function') {
      errors.push('Workflow context must have a get method');
    }

    const projectPath = context.get('projectPath');
    if (!projectPath) {
      errors.push('Project path is required in context');
    }

    return { errors, warnings };
  }

  /**
   * Validate project path
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Validation result
   */
  async validateProjectPath(projectPath) {
    const errors = [];
    const warnings = [];

    if (!projectPath || typeof projectPath !== 'string') {
      errors.push('Project path must be a non-empty string');
      return { errors, warnings };
    }

    if (projectPath.length > this.options.maxProjectPathLength) {
      errors.push(`Project path is too long (max: ${this.options.maxProjectPathLength} characters)`);
    }

    // Check if path exists
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        errors.push('Project path must be a directory');
      }
    } catch (error) {
      errors.push(`Project path does not exist or is not accessible: ${projectPath}`);
    }

    // Check for path traversal attempts
    if (projectPath.includes('..') || projectPath.includes('~')) {
      errors.push('Project path contains invalid characters');
    }

    return { errors, warnings };
  }

  /**
   * Validate script type
   * @param {string} scriptType - Script type
   * @returns {Object} Validation result
   */
  validateScriptType(scriptType) {
    const errors = [];
    const warnings = [];

    if (!scriptType || typeof scriptType !== 'string') {
      errors.push('Script type must be a non-empty string');
      return { errors, warnings };
    }

    if (!this.options.allowedScriptTypes.includes(scriptType)) {
      errors.push(`Invalid script type: ${scriptType}. Allowed types: ${this.options.allowedScriptTypes.join(', ')}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate script types array
   * @param {Array<string>} scriptTypes - Script types
   * @returns {Object} Validation result
   */
  validateScriptTypes(scriptTypes) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(scriptTypes)) {
      errors.push('Script types must be an array');
      return { errors, warnings };
    }

    if (scriptTypes.length === 0) {
      errors.push('At least one script type must be specified');
    }

    if (scriptTypes.length > this.options.maxScriptTypes) {
      errors.push(`Too many script types (max: ${this.options.maxScriptTypes})`);
    }

    for (const scriptType of scriptTypes) {
      const validation = this.validateScriptType(scriptType);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }

    // Check for duplicates
    const uniqueTypes = new Set(scriptTypes);
    if (uniqueTypes.size !== scriptTypes.length) {
      warnings.push('Duplicate script types detected');
    }

    return { errors, warnings };
  }

  /**
   * Validate documentation type
   * @param {string} docType - Documentation type
   * @returns {Object} Validation result
   */
  validateDocType(docType) {
    const errors = [];
    const warnings = [];

    if (!docType || typeof docType !== 'string') {
      errors.push('Documentation type must be a non-empty string');
      return { errors, warnings };
    }

    if (!this.options.allowedDocTypes.includes(docType)) {
      errors.push(`Invalid documentation type: ${docType}. Allowed types: ${this.options.allowedDocTypes.join(', ')}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate generation options
   * @param {Object} options - Generation options
   * @returns {Object} Validation result
   */
  validateGenerationOptions(options) {
    const errors = [];
    const warnings = [];

    if (!options || typeof options !== 'object') {
      errors.push('Generation options must be an object');
      return { errors, warnings };
    }

    // Validate timeout
    if (options.timeout !== undefined) {
      if (typeof options.timeout !== 'number' || options.timeout <= 0) {
        errors.push('Timeout must be a positive number');
      } else if (options.timeout > 300000) { // 5 minutes
        warnings.push('Timeout is very long (max recommended: 5 minutes)');
      }
    }

    // Validate max retries
    if (options.maxRetries !== undefined) {
      if (typeof options.maxRetries !== 'number' || options.maxRetries < 0) {
        errors.push('Max retries must be a non-negative number');
      } else if (options.maxRetries > 10) {
        warnings.push('Max retries is very high (max recommended: 10)');
      }
    }

    // Validate include options
    if (options.includeRawData !== undefined && typeof options.includeRawData !== 'boolean') {
      errors.push('Include raw data must be a boolean');
    }

    if (options.includeMetadata !== undefined && typeof options.includeMetadata !== 'boolean') {
      errors.push('Include metadata must be a boolean');
    }

    return { errors, warnings };
  }

  /**
   * Validate security aspects
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Validation result
   */
  async validateSecurity(context, options) {
    const errors = [];
    const warnings = [];

    const projectPath = context.get('projectPath');
    if (projectPath) {
      // Check for sensitive files
      const sensitiveFiles = await this.checkForSensitiveFiles(projectPath);
      if (sensitiveFiles.length > 0) {
        warnings.push(`Sensitive files detected: ${sensitiveFiles.join(', ')}`);
      }

      // Check file permissions
      const permissionCheck = await this.checkFilePermissions(projectPath);
      if (!permissionCheck.isSecure) {
        errors.push(`Insecure file permissions detected: ${permissionCheck.issues.join(', ')}`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate business rules
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @returns {Object} Validation result
   */
  validateBusinessRules(context, options) {
    const errors = [];
    const warnings = [];

    // Check for required dependencies
    const projectPath = context.get('projectPath');
    if (projectPath) {
      const dependencyCheck = this.checkRequiredDependencies(projectPath, options);
      if (!dependencyCheck.hasRequired) {
        errors.push(`Missing required dependencies: ${dependencyCheck.missing.join(', ')}`);
      }
    }

    // Check for conflicting options
    const conflictCheck = this.checkConflictingOptions(options);
    if (conflictCheck.hasConflicts) {
      errors.push(`Conflicting options detected: ${conflictCheck.conflicts.join(', ')}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate generation result
   * @param {Object} result - Generation result
   * @param {string} type - Generation type
   * @returns {Object} Validation result
   */
  validateResult(result, type) {
    const errors = [];
    const warnings = [];

    if (!result || typeof result !== 'object') {
      errors.push('Generation result must be an object');
      return { errors, warnings };
    }

    // Validate success field
    if (typeof result.success !== 'boolean') {
      errors.push('Result must have a boolean success field');
    }

    // Validate timestamp
    if (!result.timestamp || !(result.timestamp instanceof Date)) {
      errors.push('Result must have a valid timestamp');
    }

    // Type-specific validation
    switch (type) {
      case 'script':
        if (result.success && !result.scriptGenerated) {
          warnings.push('Script generation succeeded but no script was generated');
        }
        break;
      case 'scripts':
        if (result.success && (!result.scriptsGenerated || result.scriptsGenerated === 0)) {
          warnings.push('Scripts generation succeeded but no scripts were generated');
        }
        break;
      case 'documentation':
        if (result.success && (!result.docsGenerated || result.docsGenerated === 0)) {
          warnings.push('Documentation generation succeeded but no documentation was generated');
        }
        break;
    }

    return { errors, warnings };
  }

  /**
   * Check for sensitive files
   * @param {string} projectPath - Project path
   * @returns {Promise<Array<string>>} Sensitive files found
   */
  async checkForSensitiveFiles(projectPath) {
    const sensitiveFiles = [];
    const sensitivePatterns = [
      '.env',
      '.env.local',
      '.env.production',
      'secrets.json',
      'config.json',
      'credentials.json',
      'private.key',
      'id_rsa',
      'id_dsa'
    ];

    try {
      for (const pattern of sensitivePatterns) {
        const filePath = path.join(projectPath, pattern);
        try {
          await fs.access(filePath);
          sensitiveFiles.push(pattern);
        } catch (error) {
          // File doesn't exist, which is good
        }
      }
    } catch (error) {
      this.logger.warn('Failed to check for sensitive files:', error.message);
    }

    return sensitiveFiles;
  }

  /**
   * Check file permissions
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Permission check result
   */
  async checkFilePermissions(projectPath) {
    const issues = [];

    try {
      const stats = await fs.stat(projectPath);
      const mode = stats.mode;

      // Check if directory is world-writable
      if ((mode & 0o002) !== 0) {
        issues.push('Directory is world-writable');
      }

      // Check if directory is world-readable (less critical but worth noting)
      if ((mode & 0o004) !== 0) {
        issues.push('Directory is world-readable');
      }

    } catch (error) {
      issues.push(`Cannot check permissions: ${error.message}`);
    }

    return {
      isSecure: issues.length === 0,
      issues
    };
  }

  /**
   * Check required dependencies
   * @param {string} projectPath - Project path
   * @param {Object} options - Generation options
   * @returns {Object} Dependency check result
   */
  checkRequiredDependencies(projectPath, options) {
    const missing = [];
    const required = [];

    // Determine required dependencies based on options
    if (options.scriptType === 'build' || (options.scriptTypes && options.scriptTypes.includes('build'))) {
      required.push('package.json');
    }

    if (options.scriptType === 'deploy' || (options.scriptTypes && options.scriptTypes.includes('deploy'))) {
      required.push('package.json');
    }

    if (options.docType === 'api' || options.docType === 'comprehensive') {
      required.push('package.json');
    }

    // Check if required files exist
    for (const dependency of required) {
      const filePath = path.join(projectPath, dependency);
      try {
        require('fs').accessSync(filePath);
      } catch (error) {
        missing.push(dependency);
      }
    }

    return {
      hasRequired: missing.length === 0,
      missing
    };
  }

  /**
   * Check for conflicting options
   * @param {Object} options - Generation options
   * @returns {Object} Conflict check result
   */
  checkConflictingOptions(options) {
    const conflicts = [];

    // Check for conflicting timeout and max retries
    if (options.timeout && options.maxRetries && options.timeout < options.maxRetries * 1000) {
      conflicts.push('Timeout is less than max retries * 1000ms');
    }

    // Check for conflicting include options
    if (options.includeRawData === false && options.includeMetadata === false) {
      conflicts.push('Both includeRawData and includeMetadata are false');
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  /**
   * Get validation service metadata
   * @returns {Object} Service metadata
   */
  getMetadata() {
    return {
      name: 'GenerateValidationService',
      description: 'Validation service for generate operations',
      version: '1.0.0',
      options: this.options
    };
  }

  /**
   * Set validation service options
   * @param {Object} options - New options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Clone validation service
   * @returns {GenerateValidationService} Cloned service
   */
  clone() {
    return new GenerateValidationService({
      logger: this.logger,
      ...this.options
    });
  }
}

module.exports = GenerateValidationService; 