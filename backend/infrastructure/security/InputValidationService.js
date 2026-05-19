/**
 * InputValidationService - Comprehensive input validation and sanitization
 * Provides secure input handling to prevent injection attacks
 */

const Logger = require('@logging/Logger');
const logger = new Logger('InputValidationService');

class InputValidationService {
  constructor() {
    this.maxStringLength = 10000; // Maximum string length
    this.maxArrayLength = 1000; // Maximum array length
    this.maxObjectDepth = 10; // Maximum object nesting depth
    this.maxPropertyNameLength = 100; // Maximum property name length
  }

  /**
   * Validate and sanitize a string input
   * @param {string} input - Raw input string
   * @param {Object} options - Validation options
   * @returns {Object} { valid: boolean, sanitized: string|null, errors: string[] }
   */
  validateString(input, options = {}) {
    const errors = [];
    let sanitized = input;

    // Type check
    if (typeof input !== 'string') {
      return { valid: false, sanitized: null, errors: ['Input must be a string'] };
    }

    // Length validation
    if (input.length > this.maxStringLength) {
      errors.push(`Input exceeds maximum length of ${this.maxStringLength} characters`);
      return { valid: false, sanitized: null, errors };
    }

    // Trim whitespace
    sanitized = input.trim();

    // Empty check
    if (options.required && sanitized.length === 0) {
      errors.push('Input is required and cannot be empty');
      return { valid: false, sanitized: null, errors };
    }

    // Block dangerous patterns
    const dangerousPatterns = [
      /<script\b[^>]*>(.*?)<\/script>/gi,           // XSS - script tags
      /javascript\s*:/gi,                            // XSS - javascript: protocol
      /on\w+\s*=\s*["']?[^"'>]+["']?/gi,            // XSS - event handlers
      /<\w+\s+[^>]*>/gi,                            // XSS - HTML tags
      /\\u[0-9a-fA-F]{4}/g,                         // Unicode escapes
      /\\x[0-9a-fA-F]{2}/g,                         // Hex escapes
      /%[0-9a-fA-F]{2}/g,                           // URL encoding
      /`.*`/g,                                       // Template literals
      /\${.*}/g,                                     // Template expressions
      /\$\{.*?\}/g,                                  // Template expressions
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        errors.push('Input contains potentially dangerous patterns');
        return { valid: false, sanitized: null, errors };
      }
    }

    // SQL injection patterns
    const sqlPatterns = [
      /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE)\b)/gi,
      /(;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC|EXECUTE))/gi,
      /(--|\/\*|\*\/)/g,                            // SQL comments
      /('\s*(OR|AND)\s+')/gi,                       // SQL injection
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,          // SQL injection
      /(\b(OR|AND)\b\s+'[^']*'\s*=\s*'[^']*')/gi,  // SQL injection
      /(\bSLEEP\b)/gi,                              // SQL time-based injection
      /(\bBENCHMARK\b)/gi,                          // SQL time-based injection
      /(\bWAITFOR\b)/gi,                            // SQL time-based injection
      /(\bEXEC\b|\bEXECUTE\b)/gi,                   // SQL command execution
      /(\bxp_)/gi,                                  // SQL stored procedures
      /(\bsp_)/gi,                                  // SQL stored procedures
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(sanitized)) {
        errors.push('Input contains potentially dangerous SQL patterns');
        logger.warn('🚨 Potential SQL injection detected:', {
          pattern: pattern.toString(),
          input: sanitized.substring(0, 100)
        });
        return { valid: false, sanitized: null, errors };
      }
    }

    // Command injection patterns
    const commandPatterns = [
      /;\s*/,              // Command separator
      /\|\|/,              // OR operator
      /&&/,                // AND operator
      /\$\(/,              // Command substitution
      /`.*`/,              // Backtick command substitution
      />\s*/,              // Output redirection
      /<\s*/,              // Input redirection
      /&\s*$/,             // Background execution
      /;\s*rm\b/i,         // Delete commands
      /;\s*chmod\b/i,      // Permission changes
      /;\s*chown\b/i,      // Ownership changes
      /;\s*wget\b/i,       // Download commands
      /;\s*curl\b/i,       // Download commands
      /;\s*nc\b/i,         // Netcat
      /;\s*nmap\b/i,       // Network scanner
      /;\s*ssh\b/i,        // SSH
      /;\s*sudo\b/i,       // Sudo
      /;\s*su\b/i,         // Switch user
      /;\s*export\b/i,     // Environment modification
      /\$\{.*\}/,          // Variable substitution
      /\/etc\/passwd/i,    // Sensitive file access
      /\/etc\/shadow/i,    // Sensitive file access
    ];

    for (const pattern of commandPatterns) {
      if (pattern.test(sanitized)) {
        errors.push('Input contains potentially dangerous command patterns');
        logger.warn('🚨 Potential command injection detected:', {
          pattern: pattern.toString(),
          input: sanitized.substring(0, 100)
        });
        return { valid: false, sanitized: null, errors };
      }
    }

    // Path traversal patterns
    const pathTraversalPatterns = [
      /\.\.\//,           // Parent directory
      /\.\.\\/,           // Parent directory (Windows)
      /\/etc\//,          // System configuration
      /\/proc\//,         // Process information
      /\/sys\//,          // System information
      /\/root\//,         // Root home directory
      /\/home\//,         // User home directories
      /\.env$/,           // Environment files
      /\.git/,            // Git directory
    ];

    for (const pattern of pathTraversalPatterns) {
      if (pattern.test(sanitized)) {
        errors.push('Input contains potentially dangerous path patterns');
        logger.warn('🚨 Potential path traversal detected:', {
          pattern: pattern.toString(),
          input: sanitized.substring(0, 100)
        });
        return { valid: false, sanitized: null, errors };
      }
    }

    // SECURITY FIX: Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

    // SECURITY FIX: Normalize unicode characters
    sanitized = sanitized.normalize('NFC');

    // SECURITY FIX: Limit length after sanitization
    if (sanitized.length > this.maxStringLength) {
      sanitized = sanitized.substring(0, this.maxStringLength);
    }

    return { valid: errors.length === 0, sanitized, errors };
  }

  /**
   * Validate and sanitize an array input
   * @param {Array} input - Raw array input
   * @param {Object} options - Validation options
   * @returns {Object} { valid: boolean, sanitized: Array|null, errors: string[] }
   */
  validateArray(input, options = {}) {
    const errors = [];

    // Type check
    if (!Array.isArray(input)) {
      return { valid: false, sanitized: null, errors: ['Input must be an array'] };
    }

    // Length validation
    if (input.length > this.maxArrayLength) {
      errors.push(`Array exceeds maximum length of ${this.maxArrayLength} elements`);
      return { valid: false, sanitized: null, errors };
    }

    // SECURITY FIX: Validate each element
    const sanitizedArray = [];
    for (let i = 0; i < input.length; i++) {
      const element = input[i];
      
      if (typeof element === 'string') {
        const result = this.validateString(element, options);
        if (!result.valid) {
          errors.push(`Element at index ${i} is invalid: ${result.errors.join(', ')}`);
          continue;
        }
        sanitizedArray.push(result.sanitized);
      } else if (typeof element === 'number' || typeof element === 'boolean') {
        sanitizedArray.push(element);
      } else {
        errors.push(`Element at index ${i} has unsupported type: ${typeof element}`);
      }
    }

    return {
      valid: errors.length === 0,
      sanitized: errors.length === 0 ? sanitizedArray : sanitizedArray,
      errors
    };
  }

  /**
   * Validate and sanitize an object input
   * @param {Object} input - Raw object input
   * @param {Object} options - Validation options
   * @returns {Object} { valid: boolean, sanitized: Object|null, errors: string[] }
   */
  validateObject(input, options = {}) {
    const errors = [];
    const sanitized = {};

    // Type check
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return { valid: false, sanitized: null, errors: ['Input must be an object'] };
    }

    // SECURITY FIX: Check object depth
    const depth = this.getObjectDepth(input);
    if (depth > this.maxObjectDepth) {
      errors.push(`Object nesting depth exceeds maximum of ${this.maxObjectDepth}`);
      return { valid: false, sanitized: null, errors };
    }

    // SECURITY FIX: Check property names
    const propertyNames = Object.keys(input);
    if (propertyNames.length > this.maxArrayLength) {
      errors.push(`Object has too many properties (max ${this.maxArrayLength})`);
      return { valid: false, sanitized: null, errors };
    }

    for (const propName of propertyNames) {
      // SECURITY FIX: Validate property name
      if (propName.length > this.maxPropertyNameLength) {
        errors.push(`Property name "${propName}" exceeds maximum length`);
        continue;
      }

      // SECURITY FIX: Block dangerous property names
      if (propName.startsWith('__') || propName.includes('.') || propName.includes('[')) {
        logger.warn('🚨 Suspicious property name detected:', {
          name: propName,
          input: JSON.stringify(input).substring(0, 100)
        });
        continue;
      }

      // Validate and sanitize property value
      const value = input[propName];
      if (typeof value === 'string') {
        const result = this.validateString(value, options);
        if (!result.valid) {
          errors.push(`Property "${propName}" is invalid: ${result.errors.join(', ')}`);
          continue;
        }
        sanitized[propName] = result.sanitized;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[propName] = value;
      } else if (Array.isArray(value)) {
        const arrayResult = this.validateArray(value, options);
        if (!arrayResult.valid) {
          errors.push(`Property "${propName}" contains invalid array: ${arrayResult.errors.join(', ')}`);
          continue;
        }
        sanitized[propName] = arrayResult.sanitized;
      } else if (typeof value === 'object' && value !== null) {
        // Recursively validate nested objects
        const objectResult = this.validateObject(value, options);
        if (!objectResult.valid) {
          errors.push(`Property "${propName}" contains invalid object: ${objectResult.errors.join(', ')}`);
          continue;
        }
        sanitized[propName] = objectResult.sanitized;
      } else {
        errors.push(`Property "${propName}" has unsupported type: ${typeof value}`);
      }
    }

    return {
      valid: errors.length === 0,
      sanitized: errors.length === 0 ? sanitized : sanitized,
      errors
    };
  }

  /**
   * Get the depth of an object
   * @param {Object} obj - Object to check
   * @returns {number} Depth of the object
   */
  getObjectDepth(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return 0;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return 1;
      return 1 + Math.max(...obj.map(item => this.getObjectDepth(item)));
    }

    const keys = Object.keys(obj);
    if (keys.length === 0) return 1;
    return 1 + Math.max(...keys.map(key => this.getObjectDepth(obj[key])));
  }

  /**
   * Validate an email address
   * @param {string} email - Email address to validate
   * @returns {Object} { valid: boolean, email: string|null, errors: string[] }
   */
  validateEmail(email) {
    const errors = [];

    if (typeof email !== 'string') {
      return { valid: false, email: null, errors: ['Email must be a string'] };
    }

    const trimmedEmail = email.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      errors.push('Invalid email format');
      return { valid: false, email: null, errors };
    }

    // Length validation
    if (trimmedEmail.length > 254) {
      errors.push('Email address is too long');
      return { valid: false, email: null, errors };
    }

    // SECURITY FIX: Block common email injection patterns
    if (/[<>\[\]{}()\\,;:"\s]/.test(trimmedEmail)) {
      errors.push('Email contains invalid characters');
      return { valid: false, email: null, errors };
    }

    return { valid: true, email: trimmedEmail.toLowerCase(), errors: [] };
  }

  /**
   * Validate a URL
   * @param {string} url - URL to validate
   * @param {Object} options - Validation options
   * @returns {Object} { valid: boolean, url: string|null, errors: string[] }
   */
  validateUrl(url, options = {}) {
    const errors = [];

    if (typeof url !== 'string') {
      return { valid: false, url: null, errors: ['URL must be a string'] };
    }

    const trimmedUrl = url.trim();

    // SECURITY FIX: Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    for (const protocol of dangerousProtocols) {
      if (trimmedUrl.toLowerCase().startsWith(protocol)) {
        errors.push(`URL uses dangerous protocol: ${protocol}`);
        logger.warn('🚨 Dangerous URL protocol detected:', {
          protocol,
          url: trimmedUrl.substring(0, 100)
        });
        return { valid: false, url: null, errors };
      }
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch (error) {
      errors.push('Invalid URL format');
      return { valid: false, url: null, errors };
    }

    // Length validation
    if (trimmedUrl.length > 2048) {
      errors.push('URL is too long');
      return { valid: false, url: null, errors };
    }

    return { valid: true, url: trimmedUrl, errors: [] };
  }

  /**
   * Validate a file path
   * @param {string} path - File path to validate
   * @returns {Object} { valid: boolean, path: string|null, errors: string[] }
   */
  validateFilePath(path) {
    const errors = [];

    if (typeof path !== 'string') {
      return { valid: false, path: null, errors: ['Path must be a string'] };
    }

    const trimmedPath = path.trim();

    // SECURITY FIX: Block path traversal
    if (/\.\.\//.test(trimmedPath) || /\.\.\\/.test(trimmedPath)) {
      errors.push('Path contains traversal sequences');
      logger.warn('🚨 Path traversal attempt detected:', {
        path: trimmedPath.substring(0, 100)
      });
      return { valid: false, path: null, errors };
    }

    // SECURITY FIX: Block access to sensitive directories
    const blockedPatterns = [
      /\/etc\//,
      /\/proc\//,
      /\/sys\//,
      /\/root\//,
      /\/home\//,
      /\/var\//,
      /\/tmp\//,
      /\.env$/,
      /\.git/,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(trimmedPath)) {
        errors.push('Path contains blocked patterns');
        logger.warn('🚨 Blocked path pattern detected:', {
          pattern: pattern.toString(),
          path: trimmedPath.substring(0, 100)
        });
        return { valid: false, path: null, errors };
      }
    }

    // Length validation
    if (trimmedPath.length > 500) {
      errors.push('Path is too long');
      return { valid: false, path: null, errors };
    }

    return { valid: true, path: trimmedPath, errors: [] };
  }

  /**
   * Validate an integer
   * @param {*} value - Value to validate
   * @param {Object} options - Validation options
   * @returns {Object} { valid: boolean, value: number|null, errors: string[] }
   */
  validateInteger(value, options = {}) {
    const errors = [];

    if (typeof value !== 'number' || !Number.isInteger(value)) {
      // Try to convert to integer
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          errors.push('Value must be an integer');
          return { valid: false, value: null, errors };
        }
        value = parsed;
      } else {
        errors.push('Value must be an integer');
        return { valid: false, value: null, errors };
      }
    }

    // Range validation
    if (options.min !== undefined && value < options.min) {
      errors.push(`Value must be greater than or equal to ${options.min}`);
      return { valid: false, value: null, errors };
    }

    if (options.max !== undefined && value > options.max) {
      errors.push(`Value must be less than or equal to ${options.max}`);
      return { valid: false, value: null, errors };
    }

    return { valid: true, value, errors: [] };
  }

  /**
   * Validate a boolean
   * @param {*} value - Value to validate
   * @returns {Object} { valid: boolean, value: boolean|null, errors: string[] }
   */
  validateBoolean(value) {
    const errors = [];

    if (typeof value === 'boolean') {
      return { valid: true, value, errors: [] };
    }

    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') {
        return { valid: true, value: true, errors: [] };
      }
      if (value.toLowerCase() === 'false') {
        return { valid: true, value: false, errors: [] };
      }
    }

    errors.push('Value must be a boolean');
    return { valid: false, value: null, errors };
  }

  /**
   * Validate a date string
   * @param {string} dateString - Date string to validate
   * @returns {Object} { valid: boolean, date: Date|null, errors: string[] }
   */
  validateDate(dateString) {
    const errors = [];

    if (typeof dateString !== 'string') {
      return { valid: false, date: null, errors: ['Date must be a string'] };
    }

    const trimmedDate = dateString.trim();
    const date = new Date(trimmedDate);

    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
      return { valid: false, date: null, errors };
    }

    return { valid: true, date, errors: [] };
  }

  /**
   * Validate and sanitize JSON input
   * @param {string} jsonString - JSON string to validate and sanitize
   * @returns {Object} { valid: boolean, data: Object|null, errors: string[] }
   */
  validateJSON(jsonString) {
    const errors = [];

    if (typeof jsonString !== 'string') {
      return { valid: false, data: null, errors: ['Input must be a string'] };
    }

    // Length validation
    if (jsonString.length > 100000) {
      errors.push('JSON string is too long');
      return { valid: false, data: null, errors };
    }

    // Try to parse JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (error) {
      errors.push('Invalid JSON format');
      return { valid: false, data: null, errors };
    }

    // SECURITY FIX: Validate the parsed object
    const validation = this.validateObject(parsed, { required: true });
    if (!validation.valid) {
      errors.push(`Invalid JSON structure: ${validation.errors.join(', ')}`);
      return { valid: false, data: null, errors };
    }

    return { valid: true, data: validation.sanitized, errors: [] };
  }
}

module.exports = new InputValidationService();
