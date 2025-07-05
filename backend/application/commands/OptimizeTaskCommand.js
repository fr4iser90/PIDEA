/**
 * OptimizeTaskCommand - Command to optimize tasks with AI assistance
 * Implements the Command pattern for task optimization
 */
class OptimizeTaskCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.taskId = params.taskId;
        this.optimizationType = params.optimizationType || 'comprehensive';
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 120000; // 2 minutes default
        this.aiModel = params.aiModel || 'gpt-4';
        this.includePerformance = params.includePerformance || true;
        this.includeSecurity = params.includeSecurity || true;
        this.includeQuality = params.includeQuality || true;
        this.includeEfficiency = params.includeEfficiency || true;
        this.autoApply = params.autoApply || false;
        this.dryRun = params.dryRun || false;
        this.optimizationLevel = params.optimizationLevel || 'balanced';
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

        if (params.optimizationType && !['comprehensive', 'performance', 'security', 'quality', 'efficiency', 'custom'].includes(params.optimizationType)) {
            throw new Error('Invalid optimization type');
        }

        if (params.timeout && (typeof params.timeout !== 'number' || params.timeout < 30000)) {
            throw new Error('Timeout must be at least 30 seconds');
        }

        if (params.aiModel && typeof params.aiModel !== 'string') {
            throw new Error('AI model must be a string');
        }

        if (params.optimizationLevel && !['conservative', 'balanced', 'aggressive'].includes(params.optimizationLevel)) {
            throw new Error('Invalid optimization level');
        }

        if (params.scheduledAt && !(params.scheduledAt instanceof Date)) {
            throw new Error('Scheduled at must be a valid Date object');
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
        return `optimize_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get command summary
     * @returns {Object} Command summary
     */
    getSummary() {
        return {
            commandId: this.commandId,
            type: 'OptimizeTaskCommand',
            taskId: this.taskId,
            optimizationType: this.optimizationType,
            optimizationLevel: this.optimizationLevel,
            scheduledAt: this.scheduledAt,
            timestamp: this.timestamp,
            requestedBy: this.requestedBy
        };
    }

    /**
     * Get command parameters for logging
     * @returns {Object} Command parameters
     */
    getLoggableParams() {
        return {
            taskId: this.taskId,
            optimizationType: this.optimizationType,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            aiModel: this.aiModel,
            includePerformance: this.includePerformance,
            includeSecurity: this.includeSecurity,
            includeQuality: this.includeQuality,
            includeEfficiency: this.includeEfficiency,
            autoApply: this.autoApply,
            dryRun: this.dryRun,
            optimizationLevel: this.optimizationLevel,
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
        if (this.timeout > 600000) { // 10 minutes
            warnings.push('Optimization timeout is very high (over 10 minutes)');
        }

        // Check scheduled time
        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        // Check auto-apply with dry run
        if (this.autoApply && this.dryRun) {
            warnings.push('Auto-apply conflicts with dry run mode');
        }

        // Check optimization level compatibility
        if (this.optimizationLevel === 'aggressive' && this.autoApply) {
            warnings.push('Aggressive optimization with auto-apply may be risky');
        }

        // Check AI model compatibility
        if (this.aiModel === 'gpt-4' && this.timeout < 180000) {
            warnings.push('GPT-4 optimization may need more time than current timeout');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get optimization scope
     * @returns {Object} Optimization scope
     */
    getOptimizationScope() {
        return {
            performance: this.optimizationType === 'comprehensive' || this.optimizationType === 'performance' || this.includePerformance,
            security: this.optimizationType === 'comprehensive' || this.optimizationType === 'security' || this.includeSecurity,
            quality: this.optimizationType === 'comprehensive' || this.optimizationType === 'quality' || this.includeQuality,
            efficiency: this.optimizationType === 'comprehensive' || this.optimizationType === 'efficiency' || this.includeEfficiency
        };
    }

    /**
     * Get AI configuration
     * @returns {Object} AI configuration
     */
    getAIConfiguration() {
        return {
            model: this.aiModel,
            timeout: this.timeout,
            maxTokens: this.options.maxTokens || 3000,
            temperature: this.options.temperature || 0.2,
            includeContext: this.options.includeContext || true,
            optimizationDepth: this.options.optimizationDepth || 'detailed',
            optimizationLevel: this.optimizationLevel
        };
    }

    /**
     * Get optimization configuration
     * @returns {Object} Optimization configuration
     */
    getOptimizationConfiguration() {
        return {
            type: this.optimizationType,
            level: this.optimizationLevel,
            autoApply: this.autoApply,
            dryRun: this.dryRun,
            includeBackup: this.options.includeBackup || true,
            includeValidation: this.options.includeValidation || true,
            includeMetrics: this.options.includeMetrics || true,
            rollbackOnError: this.options.rollbackOnError || true
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
            requestedBy: this.requestedBy,
            optimizationType: this.optimizationType,
            optimizationLevel: this.optimizationLevel,
            aiModel: this.aiModel,
            options: this.options,
            metadata: this.metadata
        };
    }

    /**
     * Check if optimization should be immediate
     * @returns {boolean} True if immediate optimization
     */
    isImmediate() {
        return !this.scheduledAt || this.scheduledAt <= new Date();
    }

    /**
     * Check if optimization is scheduled
     * @returns {boolean} True if scheduled optimization
     */
    isScheduled() {
        return !!this.scheduledAt && this.scheduledAt > new Date();
    }

    /**
     * Get optimization priority
     * @returns {number} Optimization priority
     */
    getOptimizationPriority() {
        let priority = 0;

        // Higher priority for immediate optimization
        if (this.isImmediate()) {
            priority += 100;
        }

        // Higher priority for auto-apply optimization
        if (this.autoApply) {
            priority += 50;
        }

        // Higher priority for security optimization
        if (this.optimizationType === 'security' || this.includeSecurity) {
            priority += 75;
        }

        // Higher priority for performance optimization
        if (this.optimizationType === 'performance' || this.includePerformance) {
            priority += 60;
        }

        // Lower priority for scheduled optimization
        if (this.isScheduled()) {
            priority -= 25;
        }

        // Lower priority for dry runs
        if (this.dryRun) {
            priority -= 10;
        }

        // Lower priority for conservative optimization
        if (this.optimizationLevel === 'conservative') {
            priority -= 15;
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
            optimizationType: this.optimizationType,
            options: this.options,
            requestedBy: this.requestedBy,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            aiModel: this.aiModel,
            includePerformance: this.includePerformance,
            includeSecurity: this.includeSecurity,
            includeQuality: this.includeQuality,
            includeEfficiency: this.includeEfficiency,
            autoApply: this.autoApply,
            dryRun: this.dryRun,
            optimizationLevel: this.optimizationLevel,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create command from JSON
     * @param {Object} json - JSON representation
     * @returns {OptimizeTaskCommand} Command instance
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

        return new OptimizeTaskCommand(params);
    }

    /**
     * Create comprehensive optimization command
     * @param {string} taskId - Task ID
     * @param {Object} options - Optimization options
     * @returns {OptimizeTaskCommand} Command instance
     */
    static comprehensive(taskId, options = {}) {
        return new OptimizeTaskCommand({
            taskId,
            optimizationType: 'comprehensive',
            includePerformance: true,
            includeSecurity: true,
            includeQuality: true,
            includeEfficiency: true,
            ...options
        });
    }

    /**
     * Create performance optimization command
     * @param {string} taskId - Task ID
     * @param {Object} options - Optimization options
     * @returns {OptimizeTaskCommand} Command instance
     */
    static performance(taskId, options = {}) {
        return new OptimizeTaskCommand({
            taskId,
            optimizationType: 'performance',
            includePerformance: true,
            optimizationLevel: 'balanced',
            ...options
        });
    }

    /**
     * Create security optimization command
     * @param {string} taskId - Task ID
     * @param {Object} options - Optimization options
     * @returns {OptimizeTaskCommand} Command instance
     */
    static security(taskId, options = {}) {
        return new OptimizeTaskCommand({
            taskId,
            optimizationType: 'security',
            includeSecurity: true,
            optimizationLevel: 'aggressive',
            ...options
        });
    }

    /**
     * Create quality optimization command
     * @param {string} taskId - Task ID
     * @param {Object} options - Optimization options
     * @returns {OptimizeTaskCommand} Command instance
     */
    static quality(taskId, options = {}) {
        return new OptimizeTaskCommand({
            taskId,
            optimizationType: 'quality',
            includeQuality: true,
            optimizationLevel: 'balanced',
            ...options
        });
    }

    /**
     * Create efficiency optimization command
     * @param {string} taskId - Task ID
     * @param {Object} options - Optimization options
     * @returns {OptimizeTaskCommand} Command instance
     */
    static efficiency(taskId, options = {}) {
        return new OptimizeTaskCommand({
            taskId,
            optimizationType: 'efficiency',
            includeEfficiency: true,
            optimizationLevel: 'balanced',
            ...options
        });
    }

    /**
     * Create conservative optimization command
     * @param {string} taskId - Task ID
     * @param {Object} options - Optimization options
     * @returns {OptimizeTaskCommand} Command instance
     */
    static conservative(taskId, options = {}) {
        return new OptimizeTaskCommand({
            taskId,
            optimizationType: 'comprehensive',
            optimizationLevel: 'conservative',
            dryRun: true,
            ...options
        });
    }

    /**
     * Create aggressive optimization command
     * @param {string} taskId - Task ID
     * @param {Object} options - Optimization options
     * @returns {OptimizeTaskCommand} Command instance
     */
    static aggressive(taskId, options = {}) {
        return new OptimizeTaskCommand({
            taskId,
            optimizationType: 'comprehensive',
            optimizationLevel: 'aggressive',
            includePerformance: true,
            includeSecurity: true,
            includeQuality: true,
            includeEfficiency: true,
            ...options
        });
    }

    /**
     * Create scheduled optimization command
     * @param {string} taskId - Task ID
     * @param {Date} scheduledAt - Scheduled time
     * @param {Object} options - Optimization options
     * @returns {OptimizeTaskCommand} Command instance
     */
    static scheduled(taskId, scheduledAt, options = {}) {
        return new OptimizeTaskCommand({
            taskId,
            scheduledAt,
            ...options
        });
    }

    /**
     * Create auto-apply optimization command
     * @param {string} taskId - Task ID
     * @param {Object} options - Optimization options
     * @returns {OptimizeTaskCommand} Command instance
     */
    static autoApply(taskId, options = {}) {
        return new OptimizeTaskCommand({
            taskId,
            autoApply: true,
            includeValidation: true,
            includeBackup: true,
            rollbackOnError: true,
            ...options
        });
    }

    /**
     * Create dry run optimization command
     * @param {string} taskId - Task ID
     * @param {Object} options - Optimization options
     * @returns {OptimizeTaskCommand} Command instance
     */
    static dryRun(taskId, options = {}) {
        return new OptimizeTaskCommand({
            taskId,
            dryRun: true,
            optimizationLevel: 'conservative',
            ...options
        });
    }
}

module.exports = OptimizeTaskCommand; 