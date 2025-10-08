/**
 * Framework Validator - Infrastructure Layer
 * Validates framework configurations, dependencies, and security requirements
 */

const path = require('path');
const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('FrameworkValidator');

class FrameworkValidator {
  constructor() {
    this.validationRules = new Map();
    this.securityRules = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the framework validator
   */
  async initialize() {
    try {
      // Set up validation rules
      this.setupValidationRules();
      
      // Set up security rules
      this.setupSecurityRules();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize Framework Validator:', error.message);
      throw error;
    }
  }

  /**
   * Set up validation rules
   */
  setupValidationRules() {
    // Basic configuration validation
    this.validationRules.set('config', {
      required: ['name', 'version', 'description', 'category'],
      types: {
        name: 'string',
        version: 'string',
        description: 'string',
        category: 'string',
        author: 'string',
        dependencies: 'array',
        steps: 'object',
        workflows: 'object',
        activation: 'object'
      },
      patterns: {
        name: /^[a-zA-Z0-9_-]+$/,
        version: /^\d+\.\d+\.\d+$/
      }
    });

    // Step validation
    this.validationRules.set('step', {
      required: ['name', 'type', 'category', 'description'],
      types: {
        name: 'string',
        type: 'string',
        category: 'string',
        description: 'string',
        executor: 'function',
        dependencies: 'array'
      }
    });

    // Workflow validation
    this.validationRules.set('workflow', {
      required: ['name', 'steps', 'description'],
      types: {
        name: 'string',
        steps: 'array',
        description: 'string',
        dependencies: 'array'
      }
    });

    // Activation validation
    this.validationRules.set('activation', {
      required: [],
      types: {
        auto_load: 'boolean',
        requires_confirmation: 'boolean',
        fallback_to_core: 'boolean'
      }
    });
  }

  /**
   * Set up security rules
   */
  setupSecurityRules() {
    // File system security
    this.securityRules.set('fileSystem', {
      allowedPaths: [
        'backend/framework/',
        'backend/domain/',
        'backend/infrastructure/'
      ],
      forbiddenPaths: [
        'node_modules/',
        '.git/',
        'package.json',
        'package-lock.json'
      ],
      maxFileSize: 1024 * 1024 // 1MB
    });

    // Code execution security
    this.securityRules.set('codeExecution', {
      allowedModules: [
        'fs',
        'path',
        'util',
        'crypto',
        'http',
        'https'
      ],
      forbiddenModules: [
        'child_process',
        'eval',
        'Function'
      ]
    });

    // Network security
    this.securityRules.set('network', {
      allowedDomains: [
        'localhost',
        '127.0.0.1',
        'api.github.com',
        'registry.npmjs.org'
      ],
      forbiddenDomains: [
        'malicious-site.com',
        'suspicious-domain.org'
      ]
    });
  }

  /**
   * Validate framework configuration
   */
  async validateFramework(framework) {
    try {
      const errors = [];
      const warnings = [];

      // Basic configuration validation
      const configValidation = this.validateConfiguration(framework.config);
      errors.push(...configValidation.errors);
      warnings.push(...configValidation.warnings);

      // Infrastructure-specific validation
      const infrastructureValidation = await this.validateInfrastructureConcerns(framework);
      errors.push(...infrastructureValidation.errors);
      warnings.push(...infrastructureValidation.warnings);

      // File system validation
      const fileSystemValidation = await this.validateFileSystem(framework);
      errors.push(...fileSystemValidation.errors);
      warnings.push(...fileSystemValidation.warnings);

      // Security validation
      const securityValidation = await this.validateSecurity(framework);
      errors.push(...securityValidation.errors);
      warnings.push(...securityValidation.warnings);

      // Dependency validation
      const dependencyValidation = await this.validateDependencies(framework);
      errors.push(...dependencyValidation.errors);
      warnings.push(...dependencyValidation.warnings);

      const isValid = errors.length === 0;

      if (isValid) {
        logger.info(`✅ Framework "${framework.name}" validation passed`);
      } else {
        logger.warn(`⚠️ Framework "${framework.name}" validation failed: ${errors.join(', ')}`);
      }

      return {
        isValid,
        errors,
        warnings,
        framework: framework.name
      };
    } catch (error) {
      logger.error(`❌ Framework validation error for "${framework.name}":`, error.message);
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        framework: framework.name
      };
    }
  }

  /**
   * Validate configuration structure
   */
  validateConfiguration(config) {
    const errors = [];
    const warnings = [];
    const rules = this.validationRules.get('config');

    // Check required fields
    for (const field of rules.required) {
      if (!config[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check field types
    for (const [field, expectedType] of Object.entries(rules.types)) {
      if (config[field] !== undefined) {
        const actualType = this.getType(config[field]);
        if (actualType !== expectedType) {
          errors.push(`Field "${field}" must be of type "${expectedType}", got "${actualType}"`);
        }
      }
    }

    // Check patterns
    for (const [field, pattern] of Object.entries(rules.patterns)) {
      if (config[field] && !pattern.test(config[field])) {
        errors.push(`Field "${field}" does not match required pattern`);
      }
    }

    // Validate nested objects
    if (config.steps) {
      const stepValidation = this.validateSteps(config.steps);
      errors.push(...stepValidation.errors);
      warnings.push(...stepValidation.warnings);
    }

    if (config.workflows) {
      const workflowValidation = this.validateWorkflows(config.workflows);
      errors.push(...workflowValidation.errors);
      warnings.push(...workflowValidation.warnings);
    }

    if (config.activation) {
      const activationValidation = this.validateActivation(config.activation);
      errors.push(...activationValidation.errors);
      warnings.push(...activationValidation.warnings);
    }

    return { errors, warnings };
  }

  /**
   * Validate steps configuration
   */
  validateSteps(steps) {
    const errors = [];
    const warnings = [];
    const rules = this.validationRules.get('step');

    for (const [stepName, stepConfig] of Object.entries(steps)) {
      // Check required fields
      for (const field of rules.required) {
        if (!stepConfig[field]) {
          errors.push(`Step "${stepName}" missing required field: ${field}`);
        }
      }

      // Check field types
      for (const [field, expectedType] of Object.entries(rules.types)) {
        if (stepConfig[field] !== undefined) {
          const actualType = this.getType(stepConfig[field]);
          if (actualType !== expectedType) {
            errors.push(`Step "${stepName}" field "${field}" must be of type "${expectedType}", got "${actualType}"`);
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate workflows configuration
   */
  validateWorkflows(workflows) {
    const errors = [];
    const warnings = [];
    const rules = this.validationRules.get('workflow');

    for (const [workflowName, workflowConfig] of Object.entries(workflows)) {
      // Check required fields
      for (const field of rules.required) {
        if (!workflowConfig[field]) {
          errors.push(`Workflow "${workflowName}" missing required field: ${field}`);
        }
      }

      // Check field types
      for (const [field, expectedType] of Object.entries(rules.types)) {
        if (workflowConfig[field] !== undefined) {
          const actualType = this.getType(workflowConfig[field]);
          if (actualType !== expectedType) {
            errors.push(`Workflow "${workflowName}" field "${field}" must be of type "${expectedType}", got "${actualType}"`);
          }
        }
      }

      // Validate steps array
      if (workflowConfig.steps && Array.isArray(workflowConfig.steps)) {
        for (const step of workflowConfig.steps) {
          if (typeof step !== 'string') {
            errors.push(`Workflow "${workflowName}" step must be a string, got "${typeof step}"`);
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate activation configuration
   */
  validateActivation(activation) {
    const errors = [];
    const warnings = [];
    const rules = this.validationRules.get('activation');

    // Check field types
    for (const [field, expectedType] of Object.entries(rules.types)) {
      if (activation[field] !== undefined) {
        const actualType = this.getType(activation[field]);
        if (actualType !== expectedType) {
          errors.push(`Activation field "${field}" must be of type "${expectedType}", got "${actualType}"`);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate infrastructure-specific concerns
   */
  async validateInfrastructureConcerns(framework) {
    const errors = [];
    const warnings = [];

    try {
      // Validate steps configuration (infrastructure concern)
      if (framework.config.steps) {
        const stepsValidation = this.validateStepsConfiguration(framework.config.steps);
        errors.push(...stepsValidation.errors);
        warnings.push(...stepsValidation.warnings);
      }

      // Validate workflows configuration (infrastructure concern)
      if (framework.config.workflows) {
        const workflowsValidation = this.validateWorkflowsConfiguration(framework.config.workflows);
        errors.push(...workflowsValidation.errors);
        warnings.push(...workflowsValidation.warnings);
      }

      // Validate file paths and step files
      if (framework.path) {
        const pathValidation = await this.validateFrameworkPaths(framework);
        errors.push(...pathValidation.errors);
        warnings.push(...pathValidation.warnings);
      }

    } catch (error) {
      errors.push(`Infrastructure validation error: ${error.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate steps configuration (infrastructure concern)
   */
  validateStepsConfiguration(steps) {
    const errors = [];
    const warnings = [];

    if (typeof steps !== 'object') {
      errors.push('Steps configuration must be an object');
      return { errors, warnings };
    }

    for (const [stepName, stepConfig] of Object.entries(steps)) {
      if (!stepConfig.file) {
        errors.push(`Step "${stepName}" missing required "file" property`);
      }

      if (stepConfig.file && typeof stepConfig.file !== 'string') {
        errors.push(`Step "${stepName}" file property must be a string`);
      }

      if (stepConfig.type && !['action', 'validation', 'utility', 'workflow'].includes(stepConfig.type)) {
        warnings.push(`Step "${stepName}" has unknown type: ${stepConfig.type}`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate workflows configuration (infrastructure concern)
   */
  validateWorkflowsConfiguration(workflows) {
    const errors = [];
    const warnings = [];

    if (typeof workflows !== 'object') {
      errors.push('Workflows configuration must be an object');
      return { errors, warnings };
    }

    for (const [workflowName, workflowConfig] of Object.entries(workflows)) {
      if (!workflowConfig.steps || !Array.isArray(workflowConfig.steps)) {
        errors.push(`Workflow "${workflowName}" missing required "steps" array`);
      }

      if (workflowConfig.steps && Array.isArray(workflowConfig.steps)) {
        for (const step of workflowConfig.steps) {
          if (typeof step !== 'string') {
            errors.push(`Workflow "${workflowName}" step must be a string, got ${typeof step}`);
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate framework paths and step files
   */
  async validateFrameworkPaths(framework) {
    const errors = [];
    const warnings = [];

    try {
      const frameworkPath = framework.path;
      
      // Check if framework directory exists
      try {
        await fs.access(frameworkPath);
      } catch {
        errors.push(`Framework directory not found: ${frameworkPath}`);
        return { errors, warnings };
      }

      // Check steps directory if steps are defined
      if (framework.config.steps) {
        const stepsPath = path.join(frameworkPath, 'steps');
        try {
          await fs.access(stepsPath);
        } catch {
          warnings.push(`Steps directory not found: ${stepsPath}`);
        }

        // Validate individual step files
        for (const [stepName, stepConfig] of Object.entries(framework.config.steps)) {
          if (stepConfig.file) {
            const stepFilePath = path.join(stepsPath, stepConfig.file);
            try {
              await fs.access(stepFilePath);
            } catch {
              errors.push(`Step file not found: ${stepFilePath}`);
            }
          }
        }
      }

    } catch (error) {
      errors.push(`Path validation error: ${error.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate file system access
   */
  async validateFileSystem(framework) {
    const errors = [];
    const warnings = [];
    const rules = this.securityRules.get('fileSystem');

    try {
      const frameworkPath = framework.path;
      
      // Check if framework path is allowed
      const isAllowedPath = rules.allowedPaths.some(allowedPath => 
        frameworkPath.includes(allowedPath)
      );
      
      if (!isAllowedPath) {
        errors.push(`Framework path "${frameworkPath}" is not in allowed paths`);
      }

      // Check for forbidden paths
      for (const forbiddenPath of rules.forbiddenPaths) {
        if (frameworkPath.includes(forbiddenPath)) {
          errors.push(`Framework path contains forbidden path: ${forbiddenPath}`);
        }
      }

      // Check file sizes
      const files = await this.getFrameworkFiles(frameworkPath);
      for (const file of files) {
        const stats = await fs.stat(file);
        if (stats.size > rules.maxFileSize) {
          warnings.push(`File "${file}" exceeds maximum size limit`);
        }
      }
    } catch (error) {
      errors.push(`File system validation error: ${error.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate security requirements
   */
  async validateSecurity(framework) {
    const errors = [];
    const warnings = [];
    const rules = this.securityRules.get('codeExecution');

    try {
      const frameworkPath = framework.path;
      const files = await this.getFrameworkFiles(frameworkPath);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = await fs.readFile(file, 'utf8');
          
          // Check for forbidden modules
          for (const forbiddenModule of rules.forbiddenModules) {
            if (content.includes(`require('${forbiddenModule}')`) || 
                content.includes(`import ${forbiddenModule}`)) {
              errors.push(`File "${file}" uses forbidden module: ${forbiddenModule}`);
            }
          }

          // Check for eval usage
          if (content.includes('eval(') || content.includes('Function(')) {
            errors.push(`File "${file}" uses forbidden code execution methods`);
          }
        }
      }
    } catch (error) {
      errors.push(`Security validation error: ${error.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate dependencies
   */
  async validateDependencies(framework) {
    const errors = [];
    const warnings = [];
    const dependencies = framework.config.dependencies || [];

    for (const dependency of dependencies) {
      if (dependency === 'core') {
        // Core dependency is always valid
        continue;
      }

      // Check if dependency is a valid framework name
      if (!/^[a-zA-Z0-9_-]+$/.test(dependency)) {
        errors.push(`Invalid dependency name: ${dependency}`);
      }

      // Check for circular dependencies (basic check)
      if (dependency === framework.name) {
        errors.push(`Framework cannot depend on itself: ${dependency}`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Get framework files
   */
  async getFrameworkFiles(frameworkPath) {
    const files = [];
    
    try {
      const entries = await fs.readdir(frameworkPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(frameworkPath, entry.name);
        
        if (entry.isFile()) {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          const subFiles = await this.getFrameworkFiles(fullPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      logger.warn(`⚠️ Could not read framework directory: ${error.message}`);
    }
    
    return files;
  }

  /**
   * Get type of value
   */
  getType(value) {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    if (typeof value === 'function') return 'function';
    return typeof value;
  }

  /**
   * Validate framework name
   */
  validateFrameworkName(name) {
    if (!name || typeof name !== 'string') {
      return { isValid: false, error: 'Framework name must be a non-empty string' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return { isValid: false, error: 'Framework name contains invalid characters' };
    }

    if (name.length > 50) {
      return { isValid: false, error: 'Framework name too long (max 50 characters)' };
    }

    return { isValid: true };
  }

  /**
   * Validate framework version
   */
  validateFrameworkVersion(version) {
    if (!version || typeof version !== 'string') {
      return { isValid: false, error: 'Framework version must be a non-empty string' };
    }

    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      return { isValid: false, error: 'Framework version must follow semantic versioning (x.y.z)' };
    }

    return { isValid: true };
  }

  /**
   * Get framework validator health status
   */
  getHealthStatus() {
    const isInitialized = this.isInitialized;
    const hasValidationRules = this.validationRules.size > 0;
    const hasSecurityRules = this.securityRules.size > 0;
    
    return {
      isInitialized,
      hasValidationRules,
      hasSecurityRules,
      validationRulesCount: this.validationRules.size,
      securityRulesCount: this.securityRules.size,
      healthScore: isInitialized && hasValidationRules && hasSecurityRules ? 100 : 0,
      isHealthy: isInitialized && hasValidationRules && hasSecurityRules
    };
  }
}

module.exports = FrameworkValidator; 