/**
 * TerminalDetector - Detects terminal capabilities and color support
 * Provides environment-aware terminal detection for logging system
 */
class TerminalDetector {
    /**
     * Check if stdout and stderr are TTY (terminal) streams
     * @returns {boolean} True if both streams are TTY
     */
    static isTTY() {
        return process.stdout.isTTY && process.stderr.isTTY;
    }

    /**
     * Check if the terminal supports colors
     * Considers environment variables: NO_COLOR, FORCE_COLOR, TERM
     * @returns {boolean} True if colors are supported
     */
    static supportsColors() {
        // NO_COLOR environment variable disables colors
        if (process.env.NO_COLOR) {
            return false;
        }

        // FORCE_COLOR environment variable forces colors
        if (process.env.FORCE_COLOR) {
            return true;
        }

        // Check if we're in a TTY and TERM is not 'dumb'
        return this.isTTY() && process.env.TERM !== 'dumb';
    }

    /**
     * Get the level of color support available
     * @returns {string} Color support level: 'none', '16bit', '24bit'
     */
    static getColorSupport() {
        if (!this.supportsColors()) {
            return 'none';
        }

        // Check for truecolor support
        if (process.env.COLORTERM === 'truecolor' || 
            process.env.COLORTERM === '24bit' ||
            process.env.TERM && process.env.TERM.includes('256color')) {
            return '24bit';
        }

        // Default to 16-bit color support
        return '16bit';
    }

    /**
     * Get terminal width if available
     * @returns {number|null} Terminal width in columns, null if not available
     */
    static getTerminalWidth() {
        if (process.stdout.isTTY && process.stdout.columns) {
            return process.stdout.columns;
        }
        return null;
    }

    /**
     * Get terminal height if available
     * @returns {number|null} Terminal height in rows, null if not available
     */
    static getTerminalHeight() {
        if (process.stdout.isTTY && process.stdout.rows) {
            return process.stdout.rows;
        }
        return null;
    }

    /**
     * Check if running in CI environment
     * @returns {boolean} True if running in CI
     */
    static isCI() {
        return !!(process.env.CI || 
                 process.env.CONTINUOUS_INTEGRATION || 
                 process.env.BUILD_NUMBER ||
                 process.env.RUN_ID);
    }

    /**
     * Get comprehensive terminal information
     * @returns {object} Terminal capabilities object
     */
    static getTerminalInfo() {
        return {
            isTTY: this.isTTY(),
            supportsColors: this.supportsColors(),
            colorSupport: this.getColorSupport(),
            width: this.getTerminalWidth(),
            height: this.getTerminalHeight(),
            isCI: this.isCI(),
            term: process.env.TERM || 'unknown',
            colorterm: process.env.COLORTERM || 'unknown',
            noColor: !!process.env.NO_COLOR,
            forceColor: !!process.env.FORCE_COLOR
        };
    }

    /**
     * Check if compact output should be used
     * Compact output is used in CI or when terminal width is limited
     * @returns {boolean} True if compact output should be used
     */
    static shouldUseCompactOutput() {
        return this.isCI() || (this.getTerminalWidth() && this.getTerminalWidth() < 80);
    }

    /**
     * Get recommended log format based on terminal capabilities
     * @returns {string} Recommended format: 'compact', 'standard', 'verbose'
     */
    static getRecommendedFormat() {
        if (this.shouldUseCompactOutput()) {
            return 'compact';
        }
        
        if (this.supportsColors() && this.getTerminalWidth() > 120) {
            return 'verbose';
        }
        
        return 'standard';
    }
}

module.exports = TerminalDetector;
