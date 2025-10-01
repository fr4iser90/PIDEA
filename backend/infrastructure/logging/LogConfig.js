/**
 * LogConfig - Centralized logging configuration
 * Manages logging settings and environment-based configuration
 */
const TerminalDetector = require('./TerminalDetector');
const ColorManager = require('./ColorManager');
const TimeFormatter = require('./TimeFormatter');
const { LOG_LEVELS, DEFAULT_LOG_LEVELS, TIME_FORMATS, LOG_LEVEL_ABBREV } = require('./constants');

class LogConfig {
    constructor() {
        this.terminalInfo = TerminalDetector.getTerminalInfo();
        this.colorManager = new ColorManager();
        this.timeFormatter = new TimeFormatter();
        
        this.config = this.buildConfiguration();
    }

    /**
     * Build logging configuration based on environment and terminal capabilities
     * @returns {object} Complete logging configuration
     */
    buildConfiguration() {
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isProduction = process.env.NODE_ENV === 'production';
        const isTest = process.env.NODE_ENV === 'test';

        return {
            // Environment settings
            environment: {
                isDevelopment,
                isProduction,
                isTest,
                nodeEnv: process.env.NODE_ENV || 'development'
            },

            // Terminal capabilities
            terminal: {
                isTTY: this.terminalInfo.isTTY,
                supportsColors: this.terminalInfo.supportsColors,
                colorSupport: this.terminalInfo.colorSupport,
                width: this.terminalInfo.width,
                height: this.terminalInfo.height,
                isCI: this.terminalInfo.isCI,
                recommendedFormat: TerminalDetector.getRecommendedFormat()
            },

            // Log level configuration
            levels: {
                default: this.getDefaultLogLevel(),
                current: process.env.LOG_LEVEL || this.getDefaultLogLevel(),
                available: Object.values(LOG_LEVELS)
            },

            // Formatting configuration
            formatting: {
                timeFormat: this.getRecommendedTimeFormat(),
                levelAbbreviation: this.shouldUseAbbreviations(),
                colorEnabled: this.colorManager.supportsColors,
                compactMode: TerminalDetector.shouldUseCompactOutput()
            },

            // Output configuration
            output: {
                console: {
                    enabled: true,
                    format: this.getConsoleFormat(),
                    colorize: this.colorManager.supportsColors
                },
                file: {
                    enabled: true,
                    format: 'file',
                    colorize: false
                }
            },

            // Performance settings
            performance: {
                enableCaching: true,
                maxCacheSize: 1000,
                flushInterval: 5000
            }
        };
    }

    /**
     * Get default log level based on environment
     * @returns {string} Default log level
     */
    getDefaultLogLevel() {
        const env = process.env.NODE_ENV || 'development';
        return DEFAULT_LOG_LEVELS[env] || LOG_LEVELS.INFO;
    }

    /**
     * Get recommended time format based on terminal capabilities
     * @returns {string} Recommended time format
     */
    getRecommendedTimeFormat() {
        if (this.terminalInfo.isCI || TerminalDetector.shouldUseCompactOutput()) {
            return TIME_FORMATS.COMPACT;
        }

        if (this.terminalInfo.width && this.terminalInfo.width > 120) {
            return TIME_FORMATS.VERBOSE;
        }

        return TIME_FORMATS.CONSOLE;
    }

    /**
     * Determine if abbreviations should be used
     * @returns {boolean} True if abbreviations should be used
     */
    shouldUseAbbreviations() {
        return this.terminalInfo.isCI || 
               TerminalDetector.shouldUseCompactOutput() ||
               (this.terminalInfo.width && this.terminalInfo.width < 100);
    }

    /**
     * Get console format configuration
     * @returns {string} Console format type
     */
    getConsoleFormat() {
        if (this.terminalInfo.isCI) {
            return 'compact';
        }

        if (this.terminalInfo.width && this.terminalInfo.width > 120) {
            return 'verbose';
        }

        return 'standard';
    }

    /**
     * Get level abbreviation for a given level
     * @param {string} level - Log level
     * @returns {string} Abbreviated level
     */
    getLevelAbbreviation(level) {
        if (this.config.formatting.levelAbbreviation) {
            return LOG_LEVEL_ABBREV[level.toLowerCase()] || level.toUpperCase();
        }
        return level.toUpperCase();
    }

    /**
     * Get formatted timestamp for a given context
     * @param {Date|string} timestamp - Timestamp to format
     * @param {string} context - Context (console, file, etc.)
     * @returns {string} Formatted timestamp
     */
    getFormattedTimestamp(timestamp, context = 'console') {
        return this.timeFormatter.formatTimestampAuto(timestamp, {
            context: 'auto',
            terminalInfo: this.terminalInfo,
            outputType: context
        });
    }

    /**
     * Get colorized level string
     * @param {string} level - Log level
     * @returns {string} Colorized level string
     */
    getColoredLevel(level) {
        return this.colorManager.getColoredLevel(level);
    }

    /**
     * Check if colors should be enabled for a specific context
     * @param {string} context - Context (console, file, etc.)
     * @returns {boolean} True if colors should be enabled
     */
    shouldUseColors(context = 'console') {
        return this.colorManager.shouldUseColors(context);
    }

    /**
     * Get Winston colorize format
     * @returns {object} Winston format object
     */
    getWinstonColorizeFormat() {
        return this.colorManager.getColorizeFormat();
    }

    /**
     * Update configuration based on new environment variables
     */
    refreshConfiguration() {
        this.terminalInfo = TerminalDetector.getTerminalInfo();
        this.colorManager = new ColorManager();
        this.config = this.buildConfiguration();
    }

    /**
     * Get complete configuration object
     * @returns {object} Complete configuration
     */
    getConfiguration() {
        return this.config;
    }

    /**
     * Get configuration for a specific component
     * @param {string} component - Component name
     * @returns {object} Component configuration
     */
    getComponentConfig(component) {
        return this.config[component] || {};
    }

    /**
     * Test configuration by outputting sample logs
     * @returns {object} Test results
     */
    testConfiguration() {
        const now = new Date();
        
        return {
            timestamp: this.getFormattedTimestamp(now, 'console'),
            levelAbbreviation: this.getLevelAbbreviation('info'),
            coloredLevel: this.getColoredLevel('info'),
            colorSupport: this.colorManager.testColorSupport(),
            terminalInfo: this.terminalInfo,
            configuration: this.config
        };
    }
}

module.exports = LogConfig;
