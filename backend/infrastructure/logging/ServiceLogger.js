require('module-alias/register');
const { getLogger } = require('@logging/Logger');

/**
 * ServiceLogger - A wrapper for service-specific logging
 * Provides consistent interface and metadata for service logging
 */
class ServiceLogger {
    constructor(serviceName, options = {}) {
        this.serviceName = serviceName;
        this.options = {
            enableSanitization: true,
            enablePerformanceLogging: false,
            logLevel: 'info',
            ...options
        };
        
        // Use singleton logger - nur EINE Logger-Instanz für alle Services!
        this.logger = getLogger(serviceName);
    }

    /**
     * Log info message with service metadata
     */
    info(message, meta = {}) {
        // Don't add service metadata since Logger constructor already handles it
        this.logger.info(message, meta);
    }

    /**
     * Log warning message with service metadata
     */
    warn(message, meta = {}) {
        // Don't add service metadata since Logger constructor already handles it
        this.logger.warn(message, meta);
    }

    /**
     * Log error message with service metadata
     */
    error(message, meta = {}) {
        // Don't add service metadata since Logger constructor already handles it
        this.logger.error(message, meta);
    }

    /**
     * Log debug message with service metadata
     */
    debug(message, meta = {}) {
        // Don't add service metadata since Logger constructor already handles it
        this.logger.debug(message, meta);
    }

    /**
     * Log success message with service metadata
     */
    success(message, meta = {}) {
        // Don't add service metadata since Logger constructor already handles it
        this.logger.success(message, meta);
    }

    /**
     * Log failure message with service metadata
     */
    failure(message, meta = {}) {
        // Don't add service metadata since Logger constructor already handles it
        this.logger.failure(message, meta);
    }

    /**
     * Log service method execution
     */
    serviceMethod(methodName, message, meta = {}) {
        this.info(`[${methodName}] ${message}`, meta);
    }

    /**
     * Log service error with method context
     */
    serviceError(methodName, error, meta = {}) {
        this.error(`[${methodName}] ${error.message}`, {
            error: error.stack,
            ...meta
        });
    }

    /**
     * Start performance timing (if enabled)
     */
    time(label) {
        if (this.options.enablePerformanceLogging) {
            this.logger.time(label);
        }
    }

    /**
     * End performance timing (if enabled)
     */
    timeEnd(label) {
        if (this.options.enablePerformanceLogging) {
            this.logger.timeEnd(label);
        }
    }

    /**
     * Log API request with service context
     */
    apiRequest(method, path, statusCode, duration, meta = {}) {
        this.info(`API ${method} ${path}`, {
            method,
            path,
            statusCode,
            duration,
            ...meta
        });
    }

    /**
     * Log user action with service context
     */
    userAction(action, userId, meta = {}) {
        this.info(`User action: ${action}`, {
            action,
            userId,
            ...meta
        });
    }

    /**
     * Log system event with service context
     */
    systemEvent(event, meta = {}) {
        this.info(`System event: ${event}`, {
            event,
            ...meta
        });
    }
}

module.exports = ServiceLogger; 