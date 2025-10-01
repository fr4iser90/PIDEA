const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const path = require('path');

// Import new logging components
const TerminalDetector = require('./TerminalDetector');
const ColorManager = require('./ColorManager');
const TimeFormatter = require('./TimeFormatter');
const LogConfig = require('./LogConfig');
const { LOG_LEVEL_ABBREV, TIME_FORMATS } = require('./constants');


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
        
        // Initialize new logging components
        this.logConfig = new LogConfig();
        this.colorManager = new ColorManager();
        this.timeFormatter = new TimeFormatter();
        
        // Log-Level basierend auf Environment
        const defaultLevel = this.isProduction ? 'warn' : 'info';
        const logLevel = process.env.LOG_LEVEL || defaultLevel;
        
        this.logger = createLogger({
            level: logLevel,
            format: combine(
                errors({ stack: true })
            ),
            defaultMeta: { service: serviceName },
            transports: [
                // Console transport with enhanced formatting
                new transports.Console({
                    format: combine(
                        this.createConsoleFormat(),
                        this.colorManager.getColorizeFormat()
                    ),
                    handleExceptions: false,
                    handleRejections: false,
                    silent: false,
                    exitOnError: false
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

    /**
     * Create console format with terminal-aware formatting
     * @returns {object} Winston format object
     */
    createConsoleFormat() {
        return printf(({ level, message, service, ...meta }) => {
            // Service kann aus service oder meta.service kommen
            const actualService = service || meta.service || this.serviceName;
            const serviceTag = actualService ? `[${actualService}]` : '';
            
            // FIXED: Verwende die richtigen Abkürzungen direkt
            const levelAbbrev = this.getLevelAbbreviation(level);
            
            // Generate timestamp directly - SIMPLE!
            const now = new Date();
            const time = now.toTimeString().split(' ')[0]; // HH:mm:ss
            
            // FIXED: Meta-Daten sauber formatieren - erkenne String-Serialisierung
            let metaStr = '';
            if (meta && Object.keys(meta).length) {
                // Entferne den service aus meta da er schon als serviceTag angezeigt wird
                const cleanMeta = { ...meta };
                delete cleanMeta.service;
                
                if (Object.keys(cleanMeta).length > 0) {
                    // FIXED: Erkenne ob es ein String ist der als Objekt serialisiert wurde
                    const keys = Object.keys(cleanMeta);
                    const isStringSerialized = keys.every(key => 
                        /^\d+$/.test(key) && cleanMeta[key].length === 1
                    );
                    
                    if (isStringSerialized) {
                        // Rekonstruiere den ursprünglichen String
                        const reconstructedString = keys
                            .sort((a, b) => parseInt(a) - parseInt(b))
                            .map(key => cleanMeta[key])
                            .join('');
                        metaStr = ` ${reconstructedString}`;
                    } else {
                        try {
                            metaStr = ` ${JSON.stringify(cleanMeta)}`;
                        } catch (e) {
                            metaStr = ' [meta: <circular structure>]';
                        }
                    }
                }
            }
            
            return `${time} ${levelAbbrev} ${serviceTag} ${message}${metaStr}`;
        });
    }

    // FIXED: Eigene Level-Abkürzung Methode
    getLevelAbbreviation(level) {
        const abbrevMap = {
            'error': '[E]',
            'warn': '[W]', 
            'info': '[I]',
            'debug': '[D]',
            'success': '[S]',
            'failure': '[F]'
        };
        return abbrevMap[level.toLowerCase()] || `[${level.toUpperCase()}]`;
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

    /**
     * Test logging configuration
     * @returns {object} Test results
     */
    testConfiguration() {
        return this.logConfig.testConfiguration();
    }

    /**
     * Get current logging configuration
     * @returns {object} Current configuration
     */
    getConfiguration() {
        return this.logConfig.getConfiguration();
    }

    /**
     * Refresh configuration (useful when environment changes)
     */
    refreshConfiguration() {
        this.logConfig.refreshConfiguration();
        this.colorManager = new ColorManager();
        this.timeFormatter = new TimeFormatter();
    }

    /**
     * Get terminal information
     * @returns {object} Terminal capabilities
     */
    getTerminalInfo() {
        return this.logConfig.getComponentConfig('terminal');
    }

    /**
     * Check if compact mode is enabled
     * @returns {boolean} True if compact mode is enabled
     */
    isCompactMode() {
        return this.logConfig.getComponentConfig('formatting').compactMode;
    }

    /**
     * Check if colors are enabled
     * @returns {boolean} True if colors are enabled
     */
    isColorEnabled() {
        return this.logConfig.getComponentConfig('formatting').colorEnabled;
    }
}

// Singleton instance - nur EINE Logger-Instanz für die ganze Anwendung
let singletonLogger = null;

function getLogger(serviceName = 'PIDEA') {
    if (!singletonLogger) {
        singletonLogger = new Logger('PIDEA'); // Immer mit 'PIDEA' als Basis erstellen
    }
    
    // Erstelle einen Wrapper der den Service-Namen in Meta-Daten einbettet
    return {
        info: (message, meta = {}) => singletonLogger.info(message, { ...meta, service: serviceName }),
        warn: (message, meta = {}) => singletonLogger.warn(message, { ...meta, service: serviceName }),
        error: (message, meta = {}) => singletonLogger.error(message, { ...meta, service: serviceName }),
        debug: (message, meta = {}) => singletonLogger.debug(message, { ...meta, service: serviceName }),
        success: (message, meta = {}) => singletonLogger.success(message, { ...meta, service: serviceName }),
        failure: (message, meta = {}) => singletonLogger.failure(message, { ...meta, service: serviceName }),
        // Alle anderen Methoden direkt weiterleiten
        get logger() { return singletonLogger.logger; },
        get serviceName() { return serviceName; },
        get isDevelopment() { return singletonLogger.isDevelopment; },
        get isProduction() { return singletonLogger.isProduction; }
    };
}

// Export both the class and the singleton getter
module.exports = Logger;
module.exports.getLogger = getLogger;
module.exports.default = getLogger; 