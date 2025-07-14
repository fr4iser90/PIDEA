const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const path = require('path');

// Custom format für schöne Konsolen-Ausgabe
const consoleFormat = printf(({ level, message, timestamp, service, ...meta }) => {
    const serviceTag = service ? `[${service}]` : '';
    let metaStr = '';
    if (meta && Object.keys(meta).length) {
        try {
            metaStr = ` ${JSON.stringify(meta)}`;
        } catch (e) {
            metaStr = ' [meta: <circular structure>]';
        }
    }
    return `${timestamp} ${level.toUpperCase()} ${serviceTag} ${message}${metaStr}`;
});

// File format für strukturierte Logs
const fileFormat = printf(({ level, message, timestamp, service, ...meta }) => {
    let metaObj = {};
    if (meta && Object.keys(meta).length) {
        try {
            // Test ob serialisierbar
            JSON.stringify(meta);
            metaObj = meta;
        } catch (e) {
            metaObj = { meta: '<circular structure>' };
        }
    }
    return JSON.stringify({
        timestamp,
        level,
        service,
        message,
        ...metaObj
    });
});

// Logger-Klasse
class Logger {
    constructor(serviceName = 'PIDEA') {
        this.serviceName = serviceName;
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.isProduction = process.env.NODE_ENV === 'production';
        
        // Log-Level basierend auf Environment
        const defaultLevel = this.isProduction ? 'warn' : 'info';
        const logLevel = process.env.LOG_LEVEL || defaultLevel;
        
        this.logger = createLogger({
            level: logLevel,
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                errors({ stack: true }),
                consoleFormat
            ),
            defaultMeta: { service: serviceName },
            transports: [
                // Console transport mit Farben
                new transports.Console({
                    format: combine(
                        colorize(),
                        timestamp({ format: 'HH:mm:ss' }),
                        consoleFormat
                    )
                }),
                
                // File transport für strukturierte Logs
                new transports.File({
                    filename: path.join(process.cwd(), 'logs', 'error.log'),
                    level: 'error',
                    format: combine(
                        timestamp(),
                        fileFormat
                    )
                }),
                
                new transports.File({
                    filename: path.join(process.cwd(), 'logs', 'combined.log'),
                    format: combine(
                        timestamp(),
                        fileFormat
                    )
                })
            ]
        });
    }

    // Wichtige Logs - Immer sichtbar
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    warn(message, meta = {}) {
        this.logger.warn(`⚠️  ${message}`, meta);
    }

    error(message, meta = {}) {
        this.logger.error(`❌ ${message}`, meta);
    }

    // Debug Logs - Nur in Development
    debug(message, meta = {}) {
        if (this.isDevelopment) {
            this.logger.debug(`🔍 ${message}`, meta);
        }
    }

    // Success Logs - Wichtige Erfolge
    success(message, meta = {}) {
        this.logger.info(`✅ ${message}`, meta);
    }

    // Failure Logs - Fehler mit Kontext
    failure(message, meta = {}) {
        this.logger.error(`💥 ${message}`, meta);
    }

    // Für direkte Verwendung (console.log Ersatz)
    log(message, meta = {}) {
        this.info(message, meta);
    }

    // Performance Logging
    time(label) {
        if (this.isDevelopment) {
            console.time(`⏱️  ${label}`);
        }
    }

    timeEnd(label) {
        if (this.isDevelopment) {
            console.timeEnd(`⏱️  ${label}`);
        }
    }

    // Service-spezifische Logs
    service(serviceName, message, meta = {}) {
        this.logger.info(`${message}`, meta);
    }

    // User Action Logs
    userAction(action, userId, meta = {}) {
        this.logger.info(`👤 User Action: ${action}`, { userId, ...meta });
    }

    // System Event Logs
    systemEvent(event, meta = {}) {
        this.logger.info(`🔧 System Event: ${event}`, meta);
    }

    // API Request Logs
    apiRequest(method, path, statusCode, duration, meta = {}) {
        const level = statusCode >= 400 ? 'warn' : 'info';
        const emoji = statusCode >= 400 ? '⚠️' : '🌐';
        this.logger[level](`${emoji} API ${method} ${path} - ${statusCode} (${duration}ms)`, meta);
    }
}

module.exports = Logger; 