/**
 * TimeFormatter - Provides context-aware timestamp formatting
 * Handles time format abbreviation for different contexts
 */
const moment = require('moment');

class TimeFormatter {
    constructor() {
        this.timeFormats = {
            console: 'HH:mm:ss',           // 14:30:25 (8 chars)
            file: 'YYYY-MM-DD HH:mm:ss',   // Full timestamp for files
            compact: 'HH:mm',              // 14:30 (5 chars)
            verbose: 'YYYY-MM-DD HH:mm:ss.SSS', // With milliseconds
            relative: 'relative'            // Relative time format
        };
    }

    /**
     * Format timestamp based on context
     * @param {Date|string} timestamp - Timestamp to format
     * @param {string} context - Context (console, file, compact, etc.)
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp, context = 'console') {
        // Handle different timestamp formats
        let momentTime;
        if (timestamp instanceof Date) {
            momentTime = moment(timestamp);
        } else if (typeof timestamp === 'string') {
            // If it's already a formatted time string, use current time
            if (timestamp.match(/^\d{2}:\d{2}:\d{2}$/)) {
                momentTime = moment(); // Use current time for already formatted strings
            } else {
                momentTime = moment(timestamp);
            }
        } else {
            momentTime = moment(timestamp);
        }
        
        switch (context) {
            case 'compact':
                return momentTime.format(this.timeFormats.compact);
            case 'file':
                return momentTime.format(this.timeFormats.file);
            case 'verbose':
                return momentTime.format(this.timeFormats.verbose);
            case 'relative':
                return momentTime.fromNow();
            case 'console':
            default:
                return momentTime.format(this.timeFormats.console);
        }
    }

    /**
     * Get recommended time format based on terminal capabilities
     * @param {object} terminalInfo - Terminal information from TerminalDetector
     * @param {string} outputType - Output type (console, file, etc.)
     * @returns {string} Recommended time format
     */
    getRecommendedFormat(terminalInfo, outputType = 'console') {
        if (outputType === 'file') {
            return 'file';
        }

        if (terminalInfo.isCI || terminalInfo.shouldUseCompactOutput) {
            return 'compact';
        }

        if (terminalInfo.width && terminalInfo.width > 120) {
            return 'verbose';
        }

        return 'console';
    }

    /**
     * Format timestamp with automatic context detection
     * @param {Date|string} timestamp - Timestamp to format
     * @param {object} options - Formatting options
     * @returns {string} Formatted timestamp
     */
    formatTimestampAuto(timestamp, options = {}) {
        const {
            context = 'console',
            terminalInfo = null,
            outputType = 'console'
        } = options;

        let formatContext = context;

        // Auto-detect format if terminal info is provided
        if (terminalInfo && context === 'auto') {
            formatContext = this.getRecommendedFormat(terminalInfo, outputType);
        }

        return this.formatTimestamp(timestamp, formatContext);
    }

    /**
     * Get time format string for a given context
     * @param {string} context - Context name
     * @returns {string} Format string
     */
    getFormatString(context) {
        return this.timeFormats[context] || this.timeFormats.console;
    }

    /**
     * Calculate timestamp width for alignment
     * @param {string} context - Context name
     * @returns {number} Expected width in characters
     */
    getTimestampWidth(context) {
        const formatString = this.getFormatString(context);
        
        // Calculate approximate width based on format
        const widthMap = {
            'HH:mm:ss': 8,
            'HH:mm': 5,
            'YYYY-MM-DD HH:mm:ss': 19,
            'YYYY-MM-DD HH:mm:ss.SSS': 23
        };

        return widthMap[formatString] || 8;
    }

    /**
     * Create a padded timestamp for alignment
     * @param {Date|string} timestamp - Timestamp to format
     * @param {string} context - Context name
     * @param {number} width - Desired width
     * @returns {string} Padded timestamp
     */
    formatTimestampPadded(timestamp, context = 'console', width = null) {
        const formatted = this.formatTimestamp(timestamp, context);
        
        if (width === null) {
            width = this.getTimestampWidth(context);
        }

        return formatted.padEnd(width);
    }

    /**
     * Get all available time formats
     * @returns {object} Available time formats
     */
    getAvailableFormats() {
        return { ...this.timeFormats };
    }

    /**
     * Add custom time format
     * @param {string} name - Format name
     * @param {string} format - Moment.js format string
     */
    addCustomFormat(name, format) {
        this.timeFormats[name] = format;
    }

    /**
     * Test time formatting with current time
     * @param {string} context - Context to test
     * @returns {string} Sample formatted timestamp
     */
    testFormat(context = 'console') {
        return this.formatTimestamp(new Date(), context);
    }

    /**
     * Get comprehensive time formatting information
     * @returns {object} Time formatting capabilities
     */
    getTimeFormatInfo() {
        const now = new Date();
        
        return {
            currentTime: now.toISOString(),
            availableFormats: this.getAvailableFormats(),
            sampleFormats: Object.keys(this.timeFormats).reduce((acc, key) => {
                acc[key] = this.formatTimestamp(now, key);
                return acc;
            }, {}),
            widths: Object.keys(this.timeFormats).reduce((acc, key) => {
                acc[key] = this.getTimestampWidth(key);
                return acc;
            }, {})
        };
    }
}

module.exports = TimeFormatter;
