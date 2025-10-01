/**
 * ColorManager - Manages color support and Winston colorize integration
 * Provides environment-aware color enabling/disabling for logging system
 */
const { format } = require('winston');
const TerminalDetector = require('./TerminalDetector');

class ColorManager {
    constructor() {
        this.supportsColors = TerminalDetector.supportsColors();
        this.colorSupport = TerminalDetector.getColorSupport();
        this.isTTY = TerminalDetector.isTTY();
    }

    /**
     * Get Winston colorize format based on terminal capabilities
     * @returns {object} Winston format object
     */
    getColorizeFormat() {
        if (this.supportsColors) {
            return format.colorize({ 
                all: true,
                colors: this.getColorMapping()
            });
        }
        return format.uncolorize();
    }

    /**
     * Get color mapping for different log levels
     * @returns {object} Color mapping object
     */
    getColorMapping() {
        return {
            error: 'red',
            warn: 'yellow',
            info: 'blue',
            debug: 'gray',
            success: 'green',
            failure: 'red',
            http: 'magenta',
            verbose: 'cyan',
            silly: 'rainbow'
        };
    }

    /**
     * Check if colors should be enabled for a specific context
     * @param {string} context - Context (console, file, etc.)
     * @returns {boolean} True if colors should be enabled
     */
    shouldUseColors(context = 'console') {
        if (context === 'file') {
            return false; // Never use colors in files
        }
        
        if (context === 'console') {
            return this.supportsColors && this.isTTY;
        }
        
        return this.supportsColors;
    }

    /**
     * Get ANSI color codes for manual color formatting
     * @param {string} color - Color name
     * @returns {string} ANSI color code
     */
    getAnsiColor(color) {
        if (!this.supportsColors) {
            return '';
        }

        const colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            gray: '\x1b[90m'
        };

        return colors[color] || '';
    }

    /**
     * Apply color to text manually
     * @param {string} text - Text to colorize
     * @param {string} color - Color name
     * @returns {string} Colorized text
     */
    colorizeText(text, color) {
        if (!this.supportsColors) {
            return text;
        }

        const colorCode = this.getAnsiColor(color);
        const resetCode = this.getAnsiColor('reset');
        
        return `${colorCode}${text}${resetCode}`;
    }

    /**
     * Get color for log level
     * @param {string} level - Log level
     * @returns {string} Color name
     */
    getLevelColor(level) {
        const colorMapping = this.getColorMapping();
        return colorMapping[level.toLowerCase()] || 'white';
    }

    /**
     * Create a colored log level string
     * @param {string} level - Log level
     * @returns {string} Colored level string
     */
    getColoredLevel(level) {
        const color = this.getLevelColor(level);
        return this.colorizeText(level.toUpperCase(), color);
    }

    /**
     * Get comprehensive color information
     * @returns {object} Color capabilities object
     */
    getColorInfo() {
        return {
            supportsColors: this.supportsColors,
            colorSupport: this.colorSupport,
            isTTY: this.isTTY,
            colorMapping: this.getColorMapping(),
            environment: {
                NO_COLOR: !!process.env.NO_COLOR,
                FORCE_COLOR: !!process.env.FORCE_COLOR,
                TERM: process.env.TERM,
                COLORTERM: process.env.COLORTERM
            }
        };
    }

    /**
     * Create a format function that conditionally applies colors
     * @param {function} formatter - Base formatter function
     * @param {string} context - Context (console, file, etc.)
     * @returns {function} Conditional color formatter
     */
    createConditionalColorFormatter(formatter, context = 'console') {
        return (info) => {
            const formatted = formatter(info);
            
            if (this.shouldUseColors(context)) {
                return formatted;
            }
            
            // Strip ANSI codes if colors are disabled
            return formatted.replace(/\x1b\[[0-9;]*m/g, '');
        };
    }

    /**
     * Test color support by outputting sample colors
     * @returns {string} Sample colored output
     */
    testColorSupport() {
        const colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan'];
        return colors.map(color => 
            this.colorizeText(`Sample ${color} text`, color)
        ).join(' ');
    }
}

module.exports = ColorManager;
