/**
 * TimestampUtility - Utility for consistent timestamp generation
 * Provides standardized timestamp formatting for task execution tracking
 */

class TimestampUtility {
    /**
     * Generate current UTC timestamp in ISO format
     * @returns {string} Current timestamp in format: YYYY-MM-DDTHH:MM:SS.000Z
     */
    static getCurrentTimestamp() {
        return new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z');
    }

    /**
     * Generate timestamp for specific date
     * @param {Date} date - Date object
     * @returns {string} Timestamp in format: YYYY-MM-DDTHH:MM:SS.000Z
     */
    static formatTimestamp(date) {
        return date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
    }

    /**
     * Generate timestamp string for task execution
     * @param {string} action - Action type (started, completed, failed, etc.)
     * @returns {string} Formatted timestamp string
     */
    static generateTaskTimestamp(action) {
        const timestamp = this.getCurrentTimestamp();
        return `${action}: ${timestamp}`;
    }

    /**
     * Generate phase timestamp
     * @param {number} phaseNumber - Phase number
     * @param {string} status - Phase status (completed, failed, started)
     * @returns {string} Formatted phase timestamp
     */
    static generatePhaseTimestamp(phaseNumber, status) {
        const timestamp = this.getCurrentTimestamp();
        return `Phase ${phaseNumber} ${status}: ${timestamp}`;
    }

    /**
     * Generate file operation timestamp
     * @param {string} operation - Operation type (created, modified, deleted)
     * @returns {string} Formatted file operation timestamp
     */
    static generateFileTimestamp(operation) {
        const timestamp = this.getCurrentTimestamp();
        return `${operation}: ${timestamp}`;
    }

    /**
     * Generate status update timestamp
     * @param {string} status - New status
     * @returns {string} Formatted status update timestamp
     */
    static generateStatusTimestamp(status) {
        const timestamp = this.getCurrentTimestamp();
        return `Status Updated to ${status}: ${timestamp}`;
    }

    /**
     * Generate error timestamp
     * @param {string} errorType - Type of error
     * @returns {string} Formatted error timestamp
     */
    static generateErrorTimestamp(errorType) {
        const timestamp = this.getCurrentTimestamp();
        return `Error (${errorType}): ${timestamp}`;
    }

    /**
     * Parse timestamp from string
     * @param {string} timestampString - Timestamp string
     * @returns {Date} Date object
     */
    static parseTimestamp(timestampString) {
        const timestamp = timestampString.split(': ').slice(1).join(': ');
        return new Date(timestamp);
    }

    /**
     * Calculate duration between timestamps
     * @param {string} startTimestamp - Start timestamp string
     * @param {string} endTimestamp - End timestamp string
     * @returns {number} Duration in milliseconds
     */
    static calculateDuration(startTimestamp, endTimestamp) {
        const start = this.parseTimestamp(startTimestamp);
        const end = this.parseTimestamp(endTimestamp);
        return end.getTime() - start.getTime();
    }

    /**
     * Format duration in human readable format
     * @param {number} durationMs - Duration in milliseconds
     * @returns {string} Formatted duration string
     */
    static formatDuration(durationMs) {
        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

module.exports = TimestampUtility;
