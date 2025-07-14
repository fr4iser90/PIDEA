/**
 * LogFormatter - Provides consistent formatting for log messages
 * Handles emojis, structured output, and formatting options
 */
class LogFormatter {
    constructor() {
        this.emojiMap = {
            error: '❌',
            warn: '⚠️',
            info: 'ℹ️',
            debug: '🔍',
            success: '✅',
            failure: '💥',
            time: '⏱️',
            api: '🌐',
            user: '👤',
            system: '⚙️',
            service: '🔧',
            database: '🗄️',
            file: '📁',
            network: '🌍',
            security: '🔒',
            performance: '⚡'
        };

        this.levelColors = {
            error: 'red',
            warn: 'yellow',
            info: 'blue',
            debug: 'gray',
            success: 'green',
            failure: 'red'
        };
    }

    /**
     * Format a log message with emojis and structure
     */
    format(level, message, meta = {}, serviceName = null) {
        const emoji = this.getEmoji(level);
        const serviceTag = serviceName ? `[${serviceName}]` : '';
        const levelTag = `[${level.toUpperCase()}]`;
        
        let formattedMessage = `${emoji} ${levelTag} ${serviceTag} ${message}`;
        
        if (meta && Object.keys(meta).length > 0) {
            const metaStr = this.formatMeta(meta);
            formattedMessage += ` ${metaStr}`;
        }
        
        return formattedMessage;
    }

    /**
     * Get emoji for log level or context
     */
    getEmoji(level) {
        return this.emojiMap[level] || this.emojiMap.info;
    }

    /**
     * Format metadata as string
     */
    formatMeta(meta) {
        if (!meta || typeof meta !== 'object') {
            return '';
        }

        try {
            // Filter out sensitive or circular data
            const safeMeta = this.sanitizeMeta(meta);
            return JSON.stringify(safeMeta);
        } catch (error) {
            return '[meta: <circular structure>]';
        }
    }

    /**
     * Sanitize metadata for safe logging
     */
    sanitizeMeta(meta, seen = new WeakSet()) {
        if (meta === null || meta === undefined) {
            return meta;
        }

        // Handle circular references
        if (typeof meta === 'object' && seen.has(meta)) {
            return '[CIRCULAR]';
        }

        if (typeof meta === 'object') {
            seen.add(meta);
        }

        if (Array.isArray(meta)) {
            return meta.map(item => this.sanitizeMeta(item, seen));
        }

        if (typeof meta === 'object') {
            const sanitized = {};
            
            for (const [key, value] of Object.entries(meta)) {
                // Skip sensitive keys
                if (this.isSensitiveKey(key)) {
                    sanitized[key] = '[MASKED]';
                } else if (typeof value === 'object') {
                    sanitized[key] = this.sanitizeMeta(value, seen);
                } else {
                    sanitized[key] = value;
                }
            }
            
            return sanitized;
        }

        return meta;
    }

    /**
     * Check if a key is sensitive
     */
    isSensitiveKey(key) {
        const sensitiveKeys = [
            'password', 'token', 'api_key', 'auth_token', 'secret',
            'key', 'private_key', 'access_token', 'refresh_token',
            'session_id', 'authorization', 'cookie', 'session'
        ];
        
        return sensitiveKeys.includes(key.toLowerCase());
    }

    /**
     * Format API request log
     */
    formatApiRequest(method, path, statusCode, duration, meta = {}) {
        const statusEmoji = this.getStatusEmoji(statusCode);
        const methodUpper = method.toUpperCase();
        
        return `${this.emojiMap.api} [API] ${methodUpper} ${path} ${statusEmoji} ${statusCode} (${duration}ms)`;
    }

    /**
     * Get emoji for HTTP status code
     */
    getStatusEmoji(statusCode) {
        if (statusCode >= 200 && statusCode < 300) return '✅';
        if (statusCode >= 300 && statusCode < 400) return '🔄';
        if (statusCode >= 400 && statusCode < 500) return '⚠️';
        if (statusCode >= 500) return '💥';
        return '❓';
    }

    /**
     * Format user action log
     */
    formatUserAction(action, userId, meta = {}) {
        return `${this.emojiMap.user} [USER] ${action} (ID: ${userId})`;
    }

    /**
     * Format system event log
     */
    formatSystemEvent(event, meta = {}) {
        return `${this.emojiMap.system} [SYSTEM] ${event}`;
    }

    /**
     * Format service method log
     */
    formatServiceMethod(serviceName, methodName, message, meta = {}) {
        return `${this.emojiMap.service} [${serviceName}] [${methodName}] ${message}`;
    }

    /**
     * Format database operation log
     */
    formatDatabaseOperation(operation, table, duration, meta = {}) {
        return `${this.emojiMap.database} [DB] ${operation} ${table} (${duration}ms)`;
    }

    /**
     * Format file operation log
     */
    formatFileOperation(operation, filePath, meta = {}) {
        const maskedPath = this.maskPath(filePath);
        return `${this.emojiMap.file} [FILE] ${operation} ${maskedPath}`;
    }

    /**
     * Format network operation log
     */
    formatNetworkOperation(operation, url, status, meta = {}) {
        const statusEmoji = this.getStatusEmoji(status);
        return `${this.emojiMap.network} [NET] ${operation} ${url} ${statusEmoji} ${status}`;
    }

    /**
     * Format security event log
     */
    formatSecurityEvent(event, severity, meta = {}) {
        const severityEmoji = this.getSeverityEmoji(severity);
        return `${this.emojiMap.security} [SEC] ${severityEmoji} ${event}`;
    }

    /**
     * Get emoji for security severity
     */
    getSeverityEmoji(severity) {
        switch (severity.toLowerCase()) {
            case 'low': return '🟢';
            case 'medium': return '🟡';
            case 'high': return '🟠';
            case 'critical': return '🔴';
            default: return '⚪';
        }
    }

    /**
     * Format performance log
     */
    formatPerformance(operation, duration, threshold, meta = {}) {
        const performanceEmoji = duration > threshold ? '🐌' : '⚡';
        return `${this.emojiMap.performance} [PERF] ${operation} ${performanceEmoji} ${duration}ms`;
    }

    /**
     * Mask file path for security
     */
    maskPath(path) {
        if (typeof path !== 'string') {
            return path;
        }

        const pathPatterns = [
            /\/home\/[^\/\s]+/g,
            /\/Users\/[^\/\s]+/g,
            /\/tmp\/[^\/\s]+/g,
            /\/var\/[^\/\s]+/g,
            /\/etc\/[^\/\s]+/g,
            /\/usr\/[^\/\s]+/g,
            /\/opt\/[^\/\s]+/g,
            /\/data\/[^\/\s]+/g,
            /\/app\/[^\/\s]+/g,
            /\/workspace\/[^\/\s]+/g
        ];

        let masked = path;
        pathPatterns.forEach(pattern => {
            masked = masked.replace(pattern, '[PATH]');
        });

        return masked;
    }

    /**
     * Add custom emoji mapping
     */
    addEmoji(key, emoji) {
        this.emojiMap[key] = emoji;
    }

    /**
     * Get all available emojis
     */
    getEmojis() {
        return { ...this.emojiMap };
    }
}

module.exports = LogFormatter; 