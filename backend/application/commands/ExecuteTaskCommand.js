/**
 * ExecuteTaskCommand - Command to execute a task
 * Implements the Command pattern for task execution with comprehensive parameters
 */
class ExecuteTaskCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.taskId = params.taskId;
        this.executionMode = params.executionMode || 'standard';
        this.options = params.options || {};
        this.executedBy = params.executedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout;
        this.retryCount = params.retryCount || 0;
        this.retryDelay = params.retryDelay || 5000;
        this.parallel = params.parallel || false;
        this.dryRun = params.dryRun || false;
        this.force = params.force || false;
        this.environment = params.environment || 'default';
        this.resources = params.resources || {};
        this.metadata = params.metadata || {};
        
        this.timestamp = new Date();
        this.commandId = this.generateCommandId();
    }

    /**
     * Validate command parameters
     * @param {Object} params - Command parameters
     * @throws {Error} If parameters are invalid
     */
    validateParams(params) {
        if (!params.taskId || typeof params.taskId !== 'string') {
            throw new Error('Task ID is required and must be a string');
        }

        if (params.executionMode && !['standard', 'ai_assisted', 'parallel', 'sequential', 'dry_run'].includes(params.executionMode)) {
            throw new Error('Invalid execution mode');
        }

        if (params.timeout && (typeof params.timeout !== 'number' || params.timeout < 1000)) {
            throw new Error('Timeout must be a positive number in milliseconds');
        }

        if (params.retryCount && (typeof params.retryCount !== 'number' || params.retryCount < 0)) {
            throw new Error('Retry count must be a non-negative number');
        }

        if (params.retryDelay && (typeof params.retryDelay !== 'number' || params.retryDelay < 0)) {
            throw new Error('Retry delay must be a non-negative number');
        }

        if (params.scheduledAt && !(params.scheduledAt instanceof Date)) {
            throw new Error('Scheduled at must be a valid Date object');
        }

        if (params.resources && typeof params.resources !== 'object') {
            throw new Error('Resources must be an object');
        }

        if (params.metadata && typeof params.metadata !== 'object') {
            throw new Error('Metadata must be an object');
        }
    }

    /**
     * Generate unique command ID
     * @returns {string} Unique command ID
     */
    generateCommandId() {
        return `execute_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get command summary
     * @returns {Object} Command summary
     */
    getSummary() {
        return {
            commandId: this.commandId,
            type: 'ExecuteTaskCommand',
            taskId: this.taskId,
            executionMode: this.executionMode,
            scheduledAt: this.scheduledAt,
            timestamp: this.timestamp,
            executedBy: this.executedBy
        };
    }

    /**
     * Get command parameters for logging
     * @returns {Object} Command parameters
     */
    getLoggableParams() {
        return {
            taskId: this.taskId,
            executionMode: this.executionMode,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            retryCount: this.retryCount,
            parallel: this.parallel,
            dryRun: this.dryRun,
            force: this.force,
            environment: this.environment,
            hasResources: Object.keys(this.resources).length > 0,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    /**
     * Validate business rules
     * @returns {Object} Validation result
     */
    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        // Check timeout limits
        if (this.timeout && this.timeout > 3600000) { // 1 hour
            warnings.push('Timeout is very high (over 1 hour)');
        }

        // Check retry limits
        if (this.retryCount > 10) {
            warnings.push('Retry count is very high (over 10)');
        }

        // Check scheduled time
        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        // Check resource limits
        if (this.resources.memory && this.resources.memory > 8192) {
            warnings.push('Memory allocation is very high (over 8GB)');
        }

        if (this.resources.cpu && this.resources.cpu > 100) {
            errors.push('CPU allocation exceeds 100%');
        }

        // Check execution mode compatibility
        if (this.executionMode === 'parallel' && this.parallel === false) {
            warnings.push('Parallel execution mode conflicts with parallel=false option');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get execution context
     * @returns {Object} Execution context
     */
    getExecutionContext() {
        return {
            taskId: this.taskId,
            executionMode: this.executionMode,
            environment: this.environment,
            resources: this.resources,
            options: this.options,
            metadata: this.metadata
        };
    }

    /**
     * Get scheduling information
     * @returns {Object} Scheduling information
     */
    getSchedulingInfo() {
        return {
            scheduledAt: this.scheduledAt,
            isScheduled: !!this.scheduledAt,
            isImmediate: !this.scheduledAt,
            delay: this.scheduledAt ? this.scheduledAt.getTime() - Date.now() : 0
        };
    }

    /**
     * Get retry configuration
     * @returns {Object} Retry configuration
     */
    getRetryConfig() {
        return {
            retryCount: this.retryCount,
            retryDelay: this.retryDelay,
            maxRetries: this.retryCount,
            exponentialBackoff: this.options.exponentialBackoff || false,
            backoffMultiplier: this.options.backoffMultiplier || 2
        };
    }

    /**
     * Get command metadata
     * @returns {Object} Command metadata
     */
    getMetadata() {
        return {
            commandId: this.commandId,
            timestamp: this.timestamp,
            executedBy: this.executedBy,
            executionMode: this.executionMode,
            environment: this.environment,
            options: this.options,
            metadata: this.metadata
        };
    }

    /**
     * Check if execution should be immediate
     * @returns {boolean} True if immediate execution
     */
    isImmediate() {
        return !this.scheduledAt || this.scheduledAt <= new Date();
    }

    /**
     * Check if execution is scheduled
     * @returns {boolean} True if scheduled execution
     */
    isScheduled() {
        return !!this.scheduledAt && this.scheduledAt > new Date();
    }

    /**
     * Get execution priority
     * @returns {number} Execution priority
     */
    getExecutionPriority() {
        let priority = 0;

        // Higher priority for immediate execution
        if (this.isImmediate()) {
            priority += 100;
        }

        // Higher priority for forced execution
        if (this.force) {
            priority += 50;
        }

        // Higher priority for AI-assisted execution
        if (this.executionMode === 'ai_assisted') {
            priority += 25;
        }

        // Lower priority for dry runs
        if (this.dryRun) {
            priority -= 25;
        }

        return priority;
    }

    /**
     * Convert command to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            commandId: this.commandId,
            taskId: this.taskId,
            executionMode: this.executionMode,
            options: this.options,
            executedBy: this.executedBy,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            retryCount: this.retryCount,
            retryDelay: this.retryDelay,
            parallel: this.parallel,
            dryRun: this.dryRun,
            force: this.force,
            environment: this.environment,
            resources: this.resources,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create command from JSON
     * @param {Object} json - JSON representation
     * @returns {ExecuteTaskCommand} Command instance
     */
    static fromJSON(json) {
        const params = { ...json };
        
        // Convert date strings back to Date objects
        if (params.scheduledAt) {
            params.scheduledAt = new Date(params.scheduledAt);
        }
        if (params.timestamp) {
            params.timestamp = new Date(params.timestamp);
        }

        return new ExecuteTaskCommand(params);
    }

    /**
     * Create immediate execution command
     * @param {string} taskId - Task ID
     * @param {Object} options - Execution options
     * @returns {ExecuteTaskCommand} Command instance
     */
    static immediate(taskId, options = {}) {
        return new ExecuteTaskCommand({
            taskId,
            executionMode: 'standard',
            ...options
        });
    }

    /**
     * Create scheduled execution command
     * @param {string} taskId - Task ID
     * @param {Date} scheduledAt - Scheduled time
     * @param {Object} options - Execution options
     * @returns {ExecuteTaskCommand} Command instance
     */
    static scheduled(taskId, scheduledAt, options = {}) {
        return new ExecuteTaskCommand({
            taskId,
            scheduledAt,
            executionMode: 'standard',
            ...options
        });
    }

    /**
     * Create AI-assisted execution command
     * @param {string} taskId - Task ID
     * @param {Object} options - Execution options
     * @returns {ExecuteTaskCommand} Command instance
     */
    static aiAssisted(taskId, options = {}) {
        return new ExecuteTaskCommand({
            taskId,
            executionMode: 'ai_assisted',
            ...options
        });
    }

    /**
     * Create parallel execution command
     * @param {string} taskId - Task ID
     * @param {Object} options - Execution options
     * @returns {ExecuteTaskCommand} Command instance
     */
    static parallel(taskId, options = {}) {
        return new ExecuteTaskCommand({
            taskId,
            executionMode: 'parallel',
            parallel: true,
            ...options
        });
    }

    /**
     * Create dry run command
     * @param {string} taskId - Task ID
     * @param {Object} options - Execution options
     * @returns {ExecuteTaskCommand} Command instance
     */
    static dryRun(taskId, options = {}) {
        return new ExecuteTaskCommand({
            taskId,
            executionMode: 'dry_run',
            dryRun: true,
            ...options
        });
    }

    /**
     * Create forced execution command
     * @param {string} taskId - Task ID
     * @param {Object} options - Execution options
     * @returns {ExecuteTaskCommand} Command instance
     */
    static forced(taskId, options = {}) {
        return new ExecuteTaskCommand({
            taskId,
            force: true,
            ...options
        });
    }
}

module.exports = ExecuteTaskCommand; 