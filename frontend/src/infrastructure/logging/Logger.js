// Frontend Logger - Kompatibel mit Backend Logger
class Logger {
    constructor(serviceName = 'PIDEA-Frontend') {
        this.serviceName = serviceName;
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }

    // Console methods mit Farben
    _log(level, message, meta = {}) {
        const timestamp = new Date().toLocaleTimeString();
        const serviceTag = `[${this.serviceName}]`;
        const metaStr = (meta && Object.keys(meta).length) ? ` ${JSON.stringify(meta)}` : '';
        
        const colors = {
            info: '\x1b[36m',    // Cyan
            warn: '\x1b[33m',    // Yellow
            error: '\x1b[31m',   // Red
            debug: '\x1b[35m',   // Magenta
            success: '\x1b[32m', // Green
            reset: '\x1b[0m'
        };

        const color = colors[level] || colors.info;
        const output = `${color}${timestamp} ${level.toUpperCase()} ${serviceTag} ${message}${metaStr}${colors.reset}`;
        
        // In Development: Immer loggen
        // In Production: Nur error und warn
        if (this.isDevelopment || level === 'error' || level === 'warn') {
            console.log(output);
        }
    }

    info(message, meta = {}) {
        this._log('info', message, meta);
    }

    warn(message, meta = {}) {
        this._log('warn', message, meta);
    }

    error(message, meta = {}) {
        this._log('error', message, meta);
    }

    debug(message, meta = {}) {
        if (this.isDevelopment) {
            this._log('debug', message, meta);
        }
    }

    // Für direkte Verwendung (console.log Ersatz)
    log(message, meta = {}) {
        this.info(message, meta);
    }

    // Für spezielle Anwendungsfälle
    success(message, meta = {}) {
        this._log('success', `✅ ${message}`, meta);
    }

    failure(message, meta = {}) {
        this._log('error', `❌ ${message}`, meta);
    }

    // Performance logging
    time(label) {
        if (this.isDevelopment) {
            console.time(label);
        }
    }

    timeEnd(label) {
        if (this.isDevelopment) {
            console.timeEnd(label);
        }
    }
}

// Singleton instance
const logger = new Logger();

export { Logger, logger }; 