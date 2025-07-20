/**
 * ExecutionResult - Result of workflow execution
 * Provides execution metrics and status information
 */

class ExecutionResult {
    constructor(options = {}) {
        this.success = options.success || false;
        this.error = options.error || null;
        this.data = options.data || {};
        this.metadata = options.metadata || {};
        this.executionTime = options.executionTime || Date.now();
        this.duration = options.duration || 0;
        this.stepResults = options.stepResults || [];
        this.executionId = options.executionId || this.generateId();
    }

    /**
     * Generate unique result ID
     * @returns {string} Result ID
     */
    generateId() {
        return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if execution was successful
     * @returns {boolean} True if successful
     */
    isSuccess() {
        return this.success === true;
    }

    /**
     * Get execution duration in milliseconds
     * @returns {number} Duration in milliseconds
     */
    getDuration() {
        return this.duration;
    }

    /**
     * Get formatted duration string
     * @returns {string} Formatted duration
     */
    getFormattedDuration() {
        const seconds = Math.floor(this.duration / 1000);
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

    /**
     * Get execution strategy
     * @returns {string} Execution strategy
     */
    getStrategy() {
        return this.metadata.strategy || 'unknown';
    }

    /**
     * Get number of steps executed
     * @returns {number} Step count
     */
    getStepCount() {
        return this.stepResults.length;
    }

    /**
     * Get success rate
     * @returns {number} Success rate (0-1)
     */
    getSuccessRate() {
        if (this.stepResults.length === 0) return 0;
        
        const successfulSteps = this.stepResults.filter(step => step.success).length;
        return successfulSteps / this.stepResults.length;
    }

    /**
     * Add step result
     * @param {Object} stepResult - Step execution result
     */
    addStepResult(stepResult) {
        this.stepResults.push({
            ...stepResult,
            timestamp: Date.now()
        });
    }

    /**
     * Get result as JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            success: this.success,
            error: this.error,
            data: this.data,
            metadata: this.metadata,
            executionTime: this.executionTime,
            duration: this.duration,
            stepResults: this.stepResults,
            executionId: this.executionId,
            strategy: this.getStrategy(),
            stepCount: this.getStepCount(),
            successRate: this.getSuccessRate(),
            formattedDuration: this.getFormattedDuration()
        };
    }

    /**
     * Create success result
     * @param {Object} data - Result data
     * @param {Object} options - Additional options
     * @returns {ExecutionResult} Success result
     */
    static success(data = {}, options = {}) {
        return new ExecutionResult({
            success: true,
            data,
            ...options
        });
    }

    /**
     * Create failure result
     * @param {string} error - Error message
     * @param {Object} options - Additional options
     * @returns {ExecutionResult} Failure result
     */
    static failure(error, options = {}) {
        return new ExecutionResult({
            success: false,
            error,
            ...options
        });
    }
}

module.exports = ExecutionResult; 