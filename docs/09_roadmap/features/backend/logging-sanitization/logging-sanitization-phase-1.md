# Logging-Sanitization Automated Migration – Phase 1: Core Infrastructure

## Overview
Create the foundational logging infrastructure components needed for the migration. This phase establishes the ServiceLogger wrapper, LogStandardizer sanitizer, LogFormatter, LogMigration utilities, and constants.

## Objectives
- [ ] Create ServiceLogger.js wrapper for service-specific logging
- [ ] Create LogStandardizer.js for automatic log sanitization
- [ ] Create LogFormatter.js for consistent log formatting
- [ ] Create LogMigration.js utilities for migration automation
- [ ] Create constants.js for logging constants
- [ ] Update Logger.js with standardization improvements

## Deliverables

### File: `backend/infrastructure/logging/ServiceLogger.js` - Service wrapper
```javascript
const Logger = require('./Logger');

/**
 * ServiceLogger - Wrapper for service-specific logging
 * Provides consistent logging interface across all services
 */
class ServiceLogger {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.logger = new Logger(serviceName);
    this.options = {
      enableSanitization: true,
      enablePerformanceLogging: false,
      logLevel: 'info',
      ...options
    };
  }

  // Standard logging methods
  info(message, meta = {}) {
    this.logger.info(message, { service: this.serviceName, ...meta });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, { service: this.serviceName, ...meta });
  }

  error(message, meta = {}) {
    this.logger.error(message, { service: this.serviceName, ...meta });
  }

  debug(message, meta = {}) {
    this.logger.debug(message, { service: this.serviceName, ...meta });
  }

  success(message, meta = {}) {
    this.logger.success(message, { service: this.serviceName, ...meta });
  }

  failure(message, meta = {}) {
    this.logger.failure(message, { service: this.serviceName, ...meta });
  }

  // Service-specific methods
  serviceMethod(methodName, message, meta = {}) {
    this.info(`[${methodName}] ${message}`, meta);
  }

  serviceError(methodName, error, meta = {}) {
    this.error(`[${methodName}] ${error.message}`, { 
      error: error.stack, 
      service: this.serviceName, 
      ...meta 
    });
  }

  // Performance logging
  time(label) {
    if (this.options.enablePerformanceLogging) {
      this.logger.time(label);
    }
  }

  timeEnd(label) {
    if (this.options.enablePerformanceLogging) {
      this.logger.timeEnd(label);
    }
  }
}

module.exports = ServiceLogger;
```

### File: `backend/infrastructure/logging/LogStandardizer.js` - Central sanitizer
```javascript
const LOGGING_CONSTANTS = require('./constants');

/**
 * LogStandardizer - Central sanitizer for log content
 * Removes sensitive data and standardizes log formats
 */
class LogStandardizer {
  constructor(options = {}) {
    this.options = {
      maskSecrets: true,
      maskPaths: true,
      maskTokens: true,
      maskEmails: false,
      ...options
    };
    
    this.secretPatterns = [
      /password\s*[:=]\s*['"][^'"]*['"]/gi,
      /token\s*[:=]\s*['"][^'"]*['"]/gi,
      /secret\s*[:=]\s*['"][^'"]*['"]/gi,
      /api[_-]?key\s*[:=]\s*['"][^'"]*['"]/gi,
      /auth[_-]?token\s*[:=]\s*['"][^'"]*['"]/gi
    ];
    
    this.pathPatterns = [
      /\/home\/[^\/\s]+/g,
      /\/Users\/[^\/\s]+/g,
      /\/tmp\/[^\/\s]+/g,
      /\/var\/[^\/\s]+/g
    ];
  }

  /**
   * Sanitize log message
   * @param {string} message - Log message
   * @param {Object} meta - Log metadata
   * @returns {Object} Sanitized message and meta
   */
  sanitize(message, meta = {}) {
    let sanitizedMessage = message;
    let sanitizedMeta = { ...meta };

    // Sanitize message
    if (this.options.maskSecrets) {
      sanitizedMessage = this.maskSecrets(sanitizedMessage);
    }
    
    if (this.options.maskPaths) {
      sanitizedMessage = this.maskPaths(sanitizedMessage);
    }

    // Sanitize metadata
    if (this.options.maskSecrets) {
      sanitizedMeta = this.sanitizeObject(sanitizedMeta);
    }

    return {
      message: sanitizedMessage,
      meta: sanitizedMeta
    };
  }

  /**
   * Mask secrets in text
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text
   */
  maskSecrets(text) {
    let sanitized = text;
    
    this.secretPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, (match) => {
        const parts = match.split(/[:=]/);
        return `${parts[0]}: [MASKED]`;
      });
    });
    
    return sanitized;
  }

  /**
   * Mask file paths
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text
   */
  maskPaths(text) {
    let sanitized = text;
    
    this.pathPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[PATH]');
    });
    
    return sanitized;
  }

  /**
   * Sanitize object recursively
   * @param {Object} obj - Object to sanitize
   * @returns {Object} Sanitized object
   */
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        let sanitizedValue = value;
        if (this.options.maskSecrets) {
          sanitizedValue = this.maskSecrets(sanitizedValue);
        }
        if (this.options.maskPaths) {
          sanitizedValue = this.maskPaths(sanitizedValue);
        }
        sanitized[key] = sanitizedValue;
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

module.exports = LogStandardizer;
```

### File: `backend/infrastructure/logging/LogFormatter.js` - Formatter
```javascript
const LOGGING_CONSTANTS = require('./constants');

/**
 * LogFormatter - Consistent log formatting across the application
 * Provides standardized formatting for different log types
 */
class LogFormatter {
  constructor(options = {}) {
    this.options = {
      includeTimestamp: true,
      includeService: true,
      includeLevel: true,
      includeEmojis: true,
      maxMessageLength: 1000,
      ...options
    };
  }

  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Log metadata
   * @param {string} serviceName - Service name
   * @returns {string} Formatted log message
   */
  format(level, message, meta = {}, serviceName = 'PIDEA') {
    const parts = [];
    
    // Add emoji for level
    if (this.options.includeEmojis) {
      parts.push(this.getLevelEmoji(level));
    }
    
    // Add service name
    if (this.options.includeService && serviceName) {
      parts.push(`[${serviceName}]`);
    }
    
    // Add level
    if (this.options.includeLevel) {
      parts.push(`[${level.toUpperCase()}]`);
    }
    
    // Add message
    const truncatedMessage = this.truncateMessage(message);
    parts.push(truncatedMessage);
    
    // Add metadata if present
    if (meta && Object.keys(meta).length > 0) {
      const metaStr = this.formatMetadata(meta);
      if (metaStr) {
        parts.push(metaStr);
      }
    }
    
    return parts.join(' ');
  }

  /**
   * Get emoji for log level
   * @param {string} level - Log level
   * @returns {string} Emoji
   */
  getLevelEmoji(level) {
    const emojis = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
      success: '✅',
      failure: '💥'
    };
    
    return emojis[level] || '📝';
  }

  /**
   * Truncate message if too long
   * @param {string} message - Message to truncate
   * @returns {string} Truncated message
   */
  truncateMessage(message) {
    if (message.length <= this.options.maxMessageLength) {
      return message;
    }
    
    return message.substring(0, this.options.maxMessageLength) + '...';
  }

  /**
   * Format metadata
   * @param {Object} meta - Metadata object
   * @returns {string} Formatted metadata string
   */
  formatMetadata(meta) {
    try {
      const filteredMeta = { ...meta };
      
      // Remove service from meta if already in main format
      if (this.options.includeService) {
        delete filteredMeta.service;
      }
      
      if (Object.keys(filteredMeta).length === 0) {
        return '';
      }
      
      return JSON.stringify(filteredMeta);
    } catch (error) {
      return '[meta: <circular structure>]';
    }
  }

  /**
   * Format error for logging
   * @param {Error} error - Error object
   * @returns {Object} Formatted error object
   */
  formatError(error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    };
  }
}

module.exports = LogFormatter;
```

### File: `backend/infrastructure/logging/LogMigration.js` - Migration utilities
```javascript
const fs = require('fs');
const path = require('path');
const LogStandardizer = require('./LogStandardizer');

/**
 * LogMigration - Utilities for migrating legacy logging patterns
 * Provides automated tools for converting console.log and logger.log usage
 */
class LogMigration {
  constructor(options = {}) {
    this.options = {
      dryRun: false,
      backupFiles: true,
      ...options
    };
    
    this.standardizer = new LogStandardizer();
    
    // Patterns to migrate
    this.migrationPatterns = {
      consoleLog: /console\.log\s*\(/g,
      consoleInfo: /console\.info\s*\(/g,
      consoleWarn: /console\.warn\s*\(/g,
      consoleError: /console\.error\s*\(/g,
      consoleDebug: /console\.debug\s*\(/g,
      loggerLog: /logger\.log\s*\(/g
    };
    
    // Replacement mappings
    this.replacements = {
      'console.log': 'logger.info',
      'console.info': 'logger.info',
      'console.warn': 'logger.warn',
      'console.error': 'logger.error',
      'console.debug': 'logger.debug',
      'logger.log': 'logger.info'
    };
  }

  /**
   * Migrate a single file
   * @param {string} filePath - Path to file
   * @returns {Object} Migration result
   */
  async migrateFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const result = {
        filePath,
        originalContent: content,
        modifiedContent: content,
        changes: [],
        success: false
      };

      // Check for patterns to migrate
      for (const [patternName, pattern] of Object.entries(this.migrationPatterns)) {
        const matches = content.match(pattern);
        if (matches) {
          const replacement = this.replacements[patternName.replace('Pattern', '')];
          result.modifiedContent = result.modifiedContent.replace(pattern, replacement);
          result.changes.push({
            pattern: patternName,
            replacement,
            count: matches.length
          });
        }
      }

      // Add logger import if needed
      if (result.changes.length > 0 && !this.hasLoggerImport(result.modifiedContent)) {
        result.modifiedContent = this.addLoggerImport(result.modifiedContent);
        result.changes.push({
          pattern: 'import',
          replacement: 'logger_import_added',
          count: 1
        });
      }

      // Write file if not dry run
      if (result.changes.length > 0 && !this.options.dryRun) {
        if (this.options.backupFiles) {
          await this.backupFile(filePath);
        }
        fs.writeFileSync(filePath, result.modifiedContent, 'utf8');
      }

      result.success = true;
      return result;

    } catch (error) {
      return {
        filePath,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if file has logger import
   * @param {string} content - File content
   * @returns {boolean} Has logger import
   */
  hasLoggerImport(content) {
    return content.includes('require(\'@logging/Logger\')') ||
           content.includes('require("@logging/Logger")') ||
           content.includes('import.*Logger');
  }

  /**
   * Add logger import to file
   * @param {string} content - File content
   * @returns {string} Content with logger import
   */
  addLoggerImport(content) {
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find best place to insert import
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('const') && lines[i].includes('require')) {
        insertIndex = i + 1;
      } else if (lines[i].trim().startsWith('const') || 
                 lines[i].trim().startsWith('let') || 
                 lines[i].trim().startsWith('var')) {
        continue;
      } else {
        break;
      }
    }
    
    const loggerImport = "const Logger = require('@logging/Logger');";
    const loggerInstance = "const logger = new Logger('ServiceName');";
    
    lines.splice(insertIndex, 0, loggerImport, loggerInstance);
    
    return lines.join('\n');
  }

  /**
   * Backup file before migration
   * @param {string} filePath - Path to file
   */
  async backupFile(filePath) {
    const backupPath = filePath + '.backup';
    fs.copyFileSync(filePath, backupPath);
  }

  /**
   * Find all JavaScript files in directory
   * @param {string} directory - Directory to scan
   * @returns {Array} Array of file paths
   */
  findJsFiles(directory) {
    const files = [];
    
    function scan(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', '.git', 'logs', 'coverage', 'dist', 'build'].includes(item)) {
            scan(fullPath);
          }
        } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
          files.push(fullPath);
        }
      }
    }
    
    scan(directory);
    return files;
  }

  /**
   * Migrate all files in directory
   * @param {string} directory - Directory to migrate
   * @returns {Object} Migration summary
   */
  async migrateDirectory(directory) {
    const files = this.findJsFiles(directory);
    const results = [];
    
    for (const file of files) {
      const result = await this.migrateFile(file);
      results.push(result);
    }
    
    return {
      totalFiles: files.length,
      migratedFiles: results.filter(r => r.success && r.changes.length > 0).length,
      failedFiles: results.filter(r => !r.success).length,
      results
    };
  }
}

module.exports = LogMigration;
```

### File: `backend/infrastructure/logging/constants.js` - Logging constants
```javascript
/**
 * Logging Constants - Centralized constants for logging system
 */

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  SUCCESS: 'success',
  FAILURE: 'failure'
};

const LOG_EMOJIS = {
  [LOG_LEVELS.ERROR]: '❌',
  [LOG_LEVELS.WARN]: '⚠️',
  [LOG_LEVELS.INFO]: 'ℹ️',
  [LOG_LEVELS.DEBUG]: '🔍',
  [LOG_LEVELS.SUCCESS]: '✅',
  [LOG_LEVELS.FAILURE]: '💥'
};

const LOG_COLORS = {
  [LOG_LEVELS.ERROR]: 'red',
  [LOG_LEVELS.WARN]: 'yellow',
  [LOG_LEVELS.INFO]: 'blue',
  [LOG_LEVELS.DEBUG]: 'cyan',
  [LOG_LEVELS.SUCCESS]: 'green',
  [LOG_LEVELS.FAILURE]: 'magenta'
};

const LOG_FORMATS = {
  CONSOLE: 'console',
  FILE: 'file',
  JSON: 'json'
};

const LOG_PATTERNS = {
  SECRETS: [
    /password\s*[:=]\s*['"][^'"]*['"]/gi,
    /token\s*[:=]\s*['"][^'"]*['"]/gi,
    /secret\s*[:=]\s*['"][^'"]*['"]/gi,
    /api[_-]?key\s*[:=]\s*['"][^'"]*['"]/gi,
    /auth[_-]?token\s*[:=]\s*['"][^'"]*['"]/gi
  ],
  PATHS: [
    /\/home\/[^\/\s]+/g,
    /\/Users\/[^\/\s]+/g,
    /\/tmp\/[^\/\s]+/g,
    /\/var\/[^\/\s]+/g
  ]
};

const LOG_CONFIG = {
  DEFAULT_LEVEL: LOG_LEVELS.INFO,
  PRODUCTION_LEVEL: LOG_LEVELS.WARN,
  DEVELOPMENT_LEVEL: LOG_LEVELS.INFO,
  MAX_MESSAGE_LENGTH: 1000,
  MAX_META_SIZE: 10000,
  PERFORMANCE_THRESHOLD: 0.1 // ms
};

module.exports = {
  LOG_LEVELS,
  LOG_EMOJIS,
  LOG_COLORS,
  LOG_FORMATS,
  LOG_PATTERNS,
  LOG_CONFIG
};
```

## Dependencies
- Requires: None (foundational phase)
- Blocks: Phase 2 start

## Estimated Time
4 hours

## Success Criteria
- [ ] All infrastructure files created
- [ ] ServiceLogger provides consistent service logging
- [ ] LogStandardizer sanitizes sensitive data
- [ ] LogFormatter provides consistent formatting
- [ ] LogMigration utilities ready for automation
- [ ] Constants centralized and documented
- [ ] All files follow project patterns and conventions
- [ ] JSDoc documentation complete
- [ ] Unit tests pass 