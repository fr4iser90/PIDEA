/**
 * LogStandardizer - Automatically sanitizes log content
 * Masks secrets, tokens, file paths, and other sensitive data
 */
class LogStandardizer {
    constructor() {
        this.secretPatterns = [
            /password\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /token\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /api_key\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /auth_token\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /secret\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /key\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /private_key\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /access_token\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /refresh_token\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /session_id\s*[:=]\s*['"]?[^'"\s]+['"]?/gi
        ];

        this.pathPatterns = [
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

        this.sensitiveKeys = [
            'password', 'token', 'api_key', 'auth_token', 'secret',
            'key', 'private_key', 'access_token', 'refresh_token',
            'session_id', 'authorization', 'cookie', 'session'
        ];
    }

    /**
     * Sanitize a log message and metadata
     */
    sanitize(message, meta = {}) {
        const sanitizedMessage = this.maskSecrets(message);
        const sanitizedMeta = this.sanitizeObject(meta);

        return {
            message: sanitizedMessage,
            meta: sanitizedMeta
        };
    }

    /**
     * Mask secrets in a string
     */
    maskSecrets(text) {
        if (typeof text !== 'string') {
            return text;
        }

        let sanitized = text;

        // Apply secret patterns
        this.secretPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, (match) => {
                const [key, value] = match.split(/[:=]/).map(s => s.trim());
                return `${key}: [MASKED]`;
            });
        });

        // Apply path patterns
        this.pathPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '[PATH]');
        });

        return sanitized;
    }

    /**
     * Mask file paths in a string
     */
    maskPaths(text) {
        if (typeof text !== 'string') {
            return text;
        }

        let sanitized = text;
        this.pathPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '[PATH]');
        });

        return sanitized;
    }

    /**
     * Sanitize an object recursively
     */
    sanitizeObject(obj, seen = new WeakSet()) {
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Handle circular references
        if (typeof obj === 'object' && seen.has(obj)) {
            return '[CIRCULAR]';
        }

        if (typeof obj === 'object') {
            seen.add(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item, seen));
        }

        if (typeof obj === 'object') {
            const sanitized = {};
            
            for (const [key, value] of Object.entries(obj)) {
                const sanitizedKey = this.maskSecrets(key);
                
                if (this.sensitiveKeys.includes(key.toLowerCase())) {
                    sanitized[sanitizedKey] = '[MASKED]';
                } else if (typeof value === 'string') {
                    sanitized[sanitizedKey] = this.maskSecrets(value);
                } else if (typeof value === 'object') {
                    sanitized[sanitizedKey] = this.sanitizeObject(value, seen);
                } else {
                    sanitized[sanitizedKey] = value;
                }
            }
            
            return sanitized;
        }

        if (typeof obj === 'string') {
            return this.maskSecrets(obj);
        }

        return obj;
    }

    /**
     * Check if a string contains sensitive data
     */
    containsSensitiveData(text) {
        if (typeof text !== 'string') {
            return false;
        }

        return this.secretPatterns.some(pattern => pattern.test(text)) ||
               this.pathPatterns.some(pattern => pattern.test(text));
    }

    /**
     * Get list of sensitive patterns found in text
     */
    getSensitivePatterns(text) {
        if (typeof text !== 'string') {
            return [];
        }

        const patterns = [];

        this.secretPatterns.forEach((pattern, index) => {
            if (pattern.test(text)) {
                patterns.push(`secret_pattern_${index}`);
            }
        });

        this.pathPatterns.forEach((pattern, index) => {
            if (pattern.test(text)) {
                patterns.push(`path_pattern_${index}`);
            }
        });

        return patterns;
    }

    /**
     * Add custom secret pattern
     */
    addSecretPattern(pattern) {
        if (pattern instanceof RegExp) {
            this.secretPatterns.push(pattern);
        } else if (typeof pattern === 'string') {
            this.secretPatterns.push(new RegExp(pattern, 'gi'));
        }
    }

    /**
     * Add custom path pattern
     */
    addPathPattern(pattern) {
        if (pattern instanceof RegExp) {
            this.pathPatterns.push(pattern);
        } else if (typeof pattern === 'string') {
            this.pathPatterns.push(new RegExp(pattern, 'g'));
        }
    }

    /**
     * Add custom sensitive key
     */
    addSensitiveKey(key) {
        if (typeof key === 'string' && !this.sensitiveKeys.includes(key.toLowerCase())) {
            this.sensitiveKeys.push(key.toLowerCase());
        }
    }
}

module.exports = LogStandardizer; 