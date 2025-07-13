const { logger } = require('@infrastructure/logging/Logger');

/**
 * Simple logger module for the PIDEA backend
 * Provides structured logging with different levels
 */

class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.currentLevel = this.levels.INFO;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Set the current log level
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
    }
  }

  /**
   * Format log message with timestamp and level
   */
  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase();
    
    let formattedMessage = `[${timestamp}] ${levelStr}: ${message}`;
    
    if (Object.keys(data).length > 0) {
      formattedMessage += ` ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  /**
   * Log error message
   */
  error(message, data = {}) {
    if (this.currentLevel >= this.levels.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', message, data);
      logger.error(formattedMessage);
    }
  }

  /**
   * Log warning message
   */
  warn(message, data = {}) {
    if (this.currentLevel >= this.levels.WARN) {
      const formattedMessage = this.formatMessage('WARN', message, data);
      logger.warn(formattedMessage);
    }
  }

  /**
   * Log info message
   */
  info(message, data = {}) {
    if (this.currentLevel >= this.levels.INFO) {
      const formattedMessage = this.formatMessage('INFO', message, data);
      logger.log(formattedMessage);
    }
  }

  /**
   * Log debug message (only in development)
   */
  debug(message, data = {}) {
    if (this.currentLevel >= this.levels.DEBUG && this.isDevelopment) {
      const formattedMessage = this.formatMessage('DEBUG', message, data);
      logger.log(formattedMessage);
    }
  }

  /**
   * Log success message
   */
  success(message, data = {}) {
    if (this.currentLevel >= this.levels.INFO) {
      const formattedMessage = this.formatMessage('SUCCESS', message, data);
      logger.log(`✅ ${formattedMessage}`);
    }
  }

  /**
   * Log progress message
   */
  progress(message, data = {}) {
    if (this.currentLevel >= this.levels.INFO) {
      const formattedMessage = this.formatMessage('PROGRESS', message, data);
      logger.log(`📊 ${formattedMessage}`);
    }
  }

  /**
   * Log start of a process
   */
  start(message, data = {}) {
    if (this.currentLevel >= this.levels.INFO) {
      const formattedMessage = this.formatMessage('START', message, data);
      logger.log(`🚀 ${formattedMessage}`);
    }
  }

  /**
   * Log completion of a process
   */
  complete(message, data = {}) {
    if (this.currentLevel >= this.levels.INFO) {
      const formattedMessage = this.formatMessage('COMPLETE', message, data);
      logger.log(`✅ ${formattedMessage}`);
    }
  }

  /**
   * Log failure of a process
   */
  fail(message, data = {}) {
    if (this.currentLevel >= this.levels.ERROR) {
      const formattedMessage = this.formatMessage('FAIL', message, data);
      logger.error(`❌ ${formattedMessage}`);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context = {}) {
    const childLogger = new Logger();
    childLogger.currentLevel = this.currentLevel;
    childLogger.isDevelopment = this.isDevelopment;
    
    // Override formatMessage to include context
    const originalFormatMessage = childLogger.formatMessage.bind(childLogger);
    childLogger.formatMessage = (level, message, data = {}) => {
      const contextualData = { ...context, ...data };
      return originalFormatMessage(level, message, contextualData);
    };
    
    return childLogger;
  }
}

// Create and export a singleton instance
const logger = new Logger();

// Set level from environment variable if provided
if (process.env.LOG_LEVEL) {
  logger.setLevel(process.env.LOG_LEVEL.toUpperCase());
}

module.exports = logger; 