/**
 * AutoModeCommand - Command for VibeCoder auto mode
 * Implements the Command pattern for full automation with zero configuration
 */
class AutoModeCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath || process.cwd();
        this.mode = params.mode || 'full';
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 600000; // 10 minutes default
        this.aiModel = params.aiModel || 'gpt-4';
        this.includeAnalysis = params.includeAnalysis !== false; // Default true
        this.includeSuggestions = params.includeSuggestions !== false; // Default true
        this.includeGeneration = params.includeGeneration !== false; // Default true
        this.includeExecution = params.includeExecution !== false; // Default true
        this.includeOptimization = params.includeOptimization !== false; // Default true
        this.autoConfirm = params.autoConfirm || false;
        this.dryRun = params.dryRun || false;
        this.parallel = params.parallel || true;
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
        if (params.projectPath && typeof params.projectPath !== 'string') {
            throw new Error('Project path must be a string');
        }

        if (params.mode && !['full', 'analysis', 'suggestions', 'generation', 'execution', 'optimization', 'custom'].includes(params.mode)) {
            throw new Error('Invalid auto mode');
        }

        if (params.timeout && (typeof params.timeout !== 'number' || params.timeout < 120000)) {
            throw new Error('Timeout must be at least 2 minutes');
        }

        if (params.aiModel && typeof params.aiModel !== 'string') {
            throw new Error('AI model must be a string');
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
        return `auto_mode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get command summary
     * @returns {Object} Command summary
     */
    getSummary() {
        return {
            commandId: this.commandId,
            type: 'AutoModeCommand',
            projectPath: this.projectPath,
            mode: this.mode,
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
            projectPath: this.projectPath,
            mode: this.mode,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            aiModel: this.aiModel,
            includeAnalysis: this.includeAnalysis,
            includeSuggestions: this.includeSuggestions,
            includeGeneration: this.includeGeneration,
            includeExecution: this.includeExecution,
            includeOptimization: this.includeOptimization,
            autoConfirm: this.autoConfirm,
            dryRun: this.dryRun,
            parallel: this.parallel,
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
        if (this.timeout > 3600000) { // 1 hour
            warnings.push('Auto mode timeout is very high (over 1 hour)');
        }

        // Check scheduled time
        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        // Check auto-confirm with dry run
        if (this.autoConfirm && this.dryRun) {
            warnings.push('Auto-confirm conflicts with dry run mode');
        }

        // Check mode compatibility
        if (this.mode === 'full' && !this.includeAnalysis) {
            warnings.push('Full mode typically includes analysis');
        }

        // Check AI model compatibility
        if (this.aiModel === 'gpt-4' && this.timeout < 300000) {
            warnings.push('GPT-4 auto mode may need more time than current timeout');
        }

        // Check parallel execution
        if (this.parallel && this.mode === 'full') {
            warnings.push('Parallel execution in full mode may be resource intensive');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get auto mode scope
     * @returns {Object} Auto mode scope
     */
    getAutoModeScope() {
        return {
            analysis: this.mode === 'full' || this.mode === 'analysis' || this.includeAnalysis,
            suggestions: this.mode === 'full' || this.mode === 'suggestions' || this.includeSuggestions,
            generation: this.mode === 'full' || this.mode === 'generation' || this.includeGeneration,
            execution: this.mode === 'full' || this.mode === 'execution' || this.includeExecution,
            optimization: this.mode === 'full' || this.mode === 'optimization' || this.includeOptimization
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
            maxTokens: this.options.maxTokens || 4000,
            temperature: this.options.temperature || 0.2,
            includeContext: this.options.includeContext || true,
            autoModeDepth: this.options.autoModeDepth || 'comprehensive',
            includeReasoning: this.options.includeReasoning || true
        };
    }

    /**
     * Get execution configuration
     * @returns {Object} Execution configuration
     */
    getExecutionConfiguration() {
        return {
            mode: this.mode,
            autoConfirm: this.autoConfirm,
            dryRun: this.dryRun,
            parallel: this.parallel,
            includeValidation: this.options.includeValidation || true,
            includeBackup: this.options.includeBackup || true,
            includeRollback: this.options.includeRollback || true,
            maxConcurrentTasks: this.options.maxConcurrentTasks || 3,
            executionTimeout: this.options.executionTimeout || 300000 // 5 minutes
        };
    }

    /**
     * Get workflow configuration
     * @returns {Object} Workflow configuration
     */
    getWorkflowConfiguration() {
        return {
            analysisTimeout: this.options.analysisTimeout || 120000, // 2 minutes
            suggestionsTimeout: this.options.suggestionsTimeout || 90000, // 1.5 minutes
            generationTimeout: this.options.generationTimeout || 180000, // 3 minutes
            executionTimeout: this.options.executionTimeout || 300000, // 5 minutes
            optimizationTimeout: this.options.optimizationTimeout || 120000, // 2 minutes
            retryAttempts: this.options.retryAttempts || 2,
            retryDelay: this.options.retryDelay || 5000
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
            mode: this.mode,
            aiModel: this.aiModel,
            options: this.options,
            metadata: this.metadata
        };
    }

    /**
     * Check if auto mode should be immediate
     * @returns {boolean} True if immediate execution
     */
    isImmediate() {
        return !this.scheduledAt || this.scheduledAt <= new Date();
    }

    /**
     * Check if auto mode is scheduled
     * @returns {boolean} True if scheduled execution
     */
    isScheduled() {
        return !!this.scheduledAt && this.scheduledAt > new Date();
    }

    /**
     * Get auto mode priority
     * @returns {number} Auto mode priority
     */
    getAutoModePriority() {
        let priority = 0;

        // Higher priority for immediate execution
        if (this.isImmediate()) {
            priority += 100;
        }

        // Higher priority for full mode
        if (this.mode === 'full') {
            priority += 75;
        }

        // Higher priority for auto-confirm
        if (this.autoConfirm) {
            priority += 50;
        }

        // Higher priority for parallel execution
        if (this.parallel) {
            priority += 25;
        }

        // Lower priority for scheduled execution
        if (this.isScheduled()) {
            priority -= 25;
        }

        // Lower priority for dry runs
        if (this.dryRun) {
            priority -= 10;
        }

        return priority;
    }

    /**
     * Get estimated execution time
     * @returns {number} Estimated execution time in milliseconds
     */
    getEstimatedExecutionTime() {
        let estimatedTime = 0;
        const scope = this.getAutoModeScope();

        if (scope.analysis) {
            estimatedTime += this.options.analysisTimeout || 120000;
        }
        if (scope.suggestions) {
            estimatedTime += this.options.suggestionsTimeout || 90000;
        }
        if (scope.generation) {
            estimatedTime += this.options.generationTimeout || 180000;
        }
        if (scope.execution) {
            estimatedTime += this.options.executionTimeout || 300000;
        }
        if (scope.optimization) {
            estimatedTime += this.options.optimizationTimeout || 120000;
        }

        // Add overhead for coordination
        estimatedTime += 30000; // 30 seconds overhead

        return estimatedTime;
    }

    /**
     * Convert command to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            commandId: this.commandId,
            projectPath: this.projectPath,
            mode: this.mode,
            options: this.options,
            requestedBy: this.requestedBy,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            aiModel: this.aiModel,
            includeAnalysis: this.includeAnalysis,
            includeSuggestions: this.includeSuggestions,
            includeGeneration: this.includeGeneration,
            includeExecution: this.includeExecution,
            includeOptimization: this.includeOptimization,
            autoConfirm: this.autoConfirm,
            dryRun: this.dryRun,
            parallel: this.parallel,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create command from JSON
     * @param {Object} json - JSON representation
     * @returns {AutoModeCommand} Command instance
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

        return new AutoModeCommand(params);
    }

    /**
     * Create full auto mode command
     * @param {string} projectPath - Project path
     * @param {Object} options - Auto mode options
     * @returns {AutoModeCommand} Command instance
     */
    static full(projectPath = process.cwd(), options = {}) {
        return new AutoModeCommand({
            projectPath,
            mode: 'full',
            includeAnalysis: true,
            includeSuggestions: true,
            includeGeneration: true,
            includeExecution: true,
            includeOptimization: true,
            parallel: true,
            ...options
        });
    }

    /**
     * Create analysis-only auto mode command
     * @param {string} projectPath - Project path
     * @param {Object} options - Auto mode options
     * @returns {AutoModeCommand} Command instance
     */
    static analysis(projectPath = process.cwd(), options = {}) {
        return new AutoModeCommand({
            projectPath,
            mode: 'analysis',
            includeAnalysis: true,
            includeSuggestions: false,
            includeGeneration: false,
            includeExecution: false,
            includeOptimization: false,
            ...options
        });
    }

    /**
     * Create suggestions-only auto mode command
     * @param {string} projectPath - Project path
     * @param {Object} options - Auto mode options
     * @returns {AutoModeCommand} Command instance
     */
    static suggestions(projectPath = process.cwd(), options = {}) {
        return new AutoModeCommand({
            projectPath,
            mode: 'suggestions',
            includeAnalysis: true,
            includeSuggestions: true,
            includeGeneration: false,
            includeExecution: false,
            includeOptimization: false,
            ...options
        });
    }

    /**
     * Create generation-only auto mode command
     * @param {string} projectPath - Project path
     * @param {Object} options - Auto mode options
     * @returns {AutoModeCommand} Command instance
     */
    static generation(projectPath = process.cwd(), options = {}) {
        return new AutoModeCommand({
            projectPath,
            mode: 'generation',
            includeAnalysis: true,
            includeSuggestions: true,
            includeGeneration: true,
            includeExecution: false,
            includeOptimization: false,
            ...options
        });
    }

    /**
     * Create execution-only auto mode command
     * @param {string} projectPath - Project path
     * @param {Object} options - Auto mode options
     * @returns {AutoModeCommand} Command instance
     */
    static execution(projectPath = process.cwd(), options = {}) {
        return new AutoModeCommand({
            projectPath,
            mode: 'execution',
            includeAnalysis: false,
            includeSuggestions: false,
            includeGeneration: false,
            includeExecution: true,
            includeOptimization: false,
            ...options
        });
    }

    /**
     * Create optimization-only auto mode command
     * @param {string} projectPath - Project path
     * @param {Object} options - Auto mode options
     * @returns {AutoModeCommand} Command instance
     */
    static optimization(projectPath = process.cwd(), options = {}) {
        return new AutoModeCommand({
            projectPath,
            mode: 'optimization',
            includeAnalysis: true,
            includeSuggestions: false,
            includeGeneration: false,
            includeExecution: false,
            includeOptimization: true,
            ...options
        });
    }

    /**
     * Create scheduled auto mode command
     * @param {string} projectPath - Project path
     * @param {Date} scheduledAt - Scheduled time
     * @param {Object} options - Auto mode options
     * @returns {AutoModeCommand} Command instance
     */
    static scheduled(projectPath = process.cwd(), scheduledAt, options = {}) {
        return new AutoModeCommand({
            projectPath,
            scheduledAt,
            ...options
        });
    }

    /**
     * Create auto-confirm auto mode command
     * @param {string} projectPath - Project path
     * @param {Object} options - Auto mode options
     * @returns {AutoModeCommand} Command instance
     */
    static autoConfirm(projectPath = process.cwd(), options = {}) {
        return new AutoModeCommand({
            projectPath,
            mode: 'full',
            autoConfirm: true,
            includeAnalysis: true,
            includeSuggestions: true,
            includeGeneration: true,
            includeExecution: true,
            includeOptimization: true,
            parallel: true,
            ...options
        });
    }

    /**
     * Create dry run auto mode command
     * @param {string} projectPath - Project path
     * @param {Object} options - Auto mode options
     * @returns {AutoModeCommand} Command instance
     */
    static dryRun(projectPath = process.cwd(), options = {}) {
        return new AutoModeCommand({
            projectPath,
            mode: 'full',
            dryRun: true,
            includeAnalysis: true,
            includeSuggestions: true,
            includeGeneration: true,
            includeExecution: false, // No execution in dry run
            includeOptimization: false, // No optimization in dry run
            parallel: false, // Sequential in dry run
            ...options
        });
    }

    /**
     * Create quick auto mode command
     * @param {string} projectPath - Project path
     * @param {Object} options - Auto mode options
     * @returns {AutoModeCommand} Command instance
     */
    static quick(projectPath = process.cwd(), options = {}) {
        return new AutoModeCommand({
            projectPath,
            mode: 'analysis',
            timeout: 180000, // 3 minutes
            aiModel: 'gpt-3.5-turbo',
            includeAnalysis: true,
            includeSuggestions: true,
            includeGeneration: false,
            includeExecution: false,
            includeOptimization: false,
            parallel: false,
            ...options
        });
    }
}

module.exports = AutoModeCommand; 