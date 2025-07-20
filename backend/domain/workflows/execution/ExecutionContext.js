/**
 * ExecutionContext - Context for workflow execution
 * Provides execution state and metadata
 */

class ExecutionContext {
    constructor(options = {}) {
        this.id = options.id || this.generateId();
        this.workflow = options.workflow;
        this.data = options.data || {};
        this.metadata = options.metadata || {};
        this.startTime = Date.now();
        this.status = 'pending';
        this.results = [];
        this.errors = [];
    }

    /**
     * Generate unique context ID
     * @returns {string} Context ID
     */
    generateId() {
        return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Set execution status
     * @param {string} status - Execution status
     */
    setStatus(status) {
        this.status = status;
    }

    /**
     * Add execution result
     * @param {Object} result - Execution result
     */
    addResult(result) {
        this.results.push({
            ...result,
            timestamp: Date.now()
        });
    }

    /**
     * Add execution error
     * @param {Error} error - Execution error
     */
    addError(error) {
        this.errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: Date.now()
        });
    }

    /**
     * Get execution duration
     * @returns {number} Duration in milliseconds
     */
    getDuration() {
        return Date.now() - this.startTime;
    }

    /**
     * Check if execution is complete
     * @returns {boolean} True if complete
     */
    isComplete() {
        return ['completed', 'failed', 'cancelled'].includes(this.status);
    }

    /**
     * Get context summary
     * @returns {Object} Context summary
     */
    getSummary() {
        return {
            id: this.id,
            status: this.status,
            duration: this.getDuration(),
            resultsCount: this.results.length,
            errorsCount: this.errors.length,
            workflowType: this.workflow?.getType?.(),
            workflowId: this.workflow?.getMetadata?.()?.id
        };
    }
}

module.exports = ExecutionContext; 