/**
 * GenerateTaskSuggestionsCommand - Command to generate AI-powered task suggestions
 * Implements the Command pattern for AI task suggestion generation
 */
class GenerateTaskSuggestionsCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.context = params.context || '';
        this.suggestionType = params.suggestionType || 'comprehensive';
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 120000; // 2 minutes default
        this.aiModel = params.aiModel || 'gpt-4';
        this.maxSuggestions = params.maxSuggestions || 10;
        this.includePriority = params.includePriority || true;
        this.includeTimeEstimate = params.includeTimeEstimate || true;
        this.includeDependencies = params.includeDependencies || true;
        this.includeReasoning = params.includeReasoning || true;
        this.confidenceThreshold = params.confidenceThreshold || 0.7;
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
        if (!params.projectPath || typeof params.projectPath !== 'string') {
            throw new Error('Project path is required and must be a string');
        }

        if (params.context && typeof params.context !== 'string') {
            throw new Error('Context must be a string');
        }

        if (params.suggestionType && !['comprehensive', 'bug_fixes', 'improvements', 'features', 'refactoring', 'testing', 'documentation', 'custom'].includes(params.suggestionType)) {
            throw new Error('Invalid suggestion type');
        }

        if (params.timeout && (typeof params.timeout !== 'number' || params.timeout < 30000)) {
            throw new Error('Timeout must be at least 30 seconds');
        }

        if (params.aiModel && typeof params.aiModel !== 'string') {
            throw new Error('AI model must be a string');
        }

        if (params.maxSuggestions && (typeof params.maxSuggestions !== 'number' || params.maxSuggestions < 1 || params.maxSuggestions > 50)) {
            throw new Error('Max suggestions must be between 1 and 50');
        }

        if (params.confidenceThreshold && (typeof params.confidenceThreshold !== 'number' || params.confidenceThreshold < 0 || params.confidenceThreshold > 1)) {
            throw new Error('Confidence threshold must be between 0 and 1');
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
        return `generate_suggestions_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get command summary
     * @returns {Object} Command summary
     */
    getSummary() {
        return {
            commandId: this.commandId,
            type: 'GenerateTaskSuggestionsCommand',
            projectPath: this.projectPath,
            suggestionType: this.suggestionType,
            maxSuggestions: this.maxSuggestions,
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
            suggestionType: this.suggestionType,
            contextLength: this.context.length,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            aiModel: this.aiModel,
            maxSuggestions: this.maxSuggestions,
            includePriority: this.includePriority,
            includeTimeEstimate: this.includeTimeEstimate,
            includeDependencies: this.includeDependencies,
            includeReasoning: this.includeReasoning,
            confidenceThreshold: this.confidenceThreshold,
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
            warnings.push('Suggestion generation timeout is very high (over 10 minutes)');
        }

        // Check scheduled time
        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        // Check context length
        if (this.context.length > 2000) {
            warnings.push('Context is very long, may affect AI performance');
        }

        // Check max suggestions
        if (this.maxSuggestions > 20) {
            warnings.push('Requesting many suggestions may take longer');
        }

        // Check AI model compatibility
        if (this.aiModel === 'gpt-4' && this.timeout < 180000) {
            warnings.push('GPT-4 suggestion generation may need more time than current timeout');
        }

        // Check confidence threshold
        if (this.confidenceThreshold > 0.9) {
            warnings.push('Very high confidence threshold may result in fewer suggestions');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get suggestion scope
     * @returns {Object} Suggestion scope
     */
    getSuggestionScope() {
        return {
            bugFixes: this.suggestionType === 'comprehensive' || this.suggestionType === 'bug_fixes',
            improvements: this.suggestionType === 'comprehensive' || this.suggestionType === 'improvements',
            features: this.suggestionType === 'comprehensive' || this.suggestionType === 'features',
            refactoring: this.suggestionType === 'comprehensive' || this.suggestionType === 'refactoring',
            testing: this.suggestionType === 'comprehensive' || this.suggestionType === 'testing',
            documentation: this.suggestionType === 'comprehensive' || this.suggestionType === 'documentation'
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
            temperature: this.options.temperature || 0.3,
            includeContext: this.options.includeContext || true,
            suggestionDepth: this.options.suggestionDepth || 'detailed',
            maxSuggestions: this.maxSuggestions,
            confidenceThreshold: this.confidenceThreshold
        };
    }

    /**
     * Get output configuration
     * @returns {Object} Output configuration
     */
    getOutputConfiguration() {
        return {
            includePriority: this.includePriority,
            includeTimeEstimate: this.includeTimeEstimate,
            includeDependencies: this.includeDependencies,
            includeReasoning: this.includeReasoning,
            includeConfidence: this.options.includeConfidence || true,
            includeTags: this.options.includeTags || true,
            includeMetadata: this.options.includeMetadata || true,
            outputFormat: this.options.outputFormat || 'json'
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
            suggestionType: this.suggestionType,
            aiModel: this.aiModel,
            options: this.options,
            metadata: this.metadata
        };
    }

    /**
     * Check if suggestion generation should be immediate
     * @returns {boolean} True if immediate generation
     */
    isImmediate() {
        return !this.scheduledAt || this.scheduledAt <= new Date();
    }

    /**
     * Check if suggestion generation is scheduled
     * @returns {boolean} True if scheduled generation
     */
    isScheduled() {
        return !!this.scheduledAt && this.scheduledAt > new Date();
    }

    /**
     * Get suggestion generation priority
     * @returns {number} Generation priority
     */
    getGenerationPriority() {
        let priority = 0;

        // Higher priority for immediate generation
        if (this.isImmediate()) {
            priority += 100;
        }

        // Higher priority for comprehensive suggestions
        if (this.suggestionType === 'comprehensive') {
            priority += 50;
        }

        // Higher priority for bug fixes
        if (this.suggestionType === 'bug_fixes') {
            priority += 75;
        }

        // Lower priority for scheduled generation
        if (this.isScheduled()) {
            priority -= 25;
        }

        // Lower priority for documentation suggestions
        if (this.suggestionType === 'documentation') {
            priority -= 10;
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
            projectPath: this.projectPath,
            context: this.context,
            suggestionType: this.suggestionType,
            options: this.options,
            requestedBy: this.requestedBy,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            aiModel: this.aiModel,
            maxSuggestions: this.maxSuggestions,
            includePriority: this.includePriority,
            includeTimeEstimate: this.includeTimeEstimate,
            includeDependencies: this.includeDependencies,
            includeReasoning: this.includeReasoning,
            confidenceThreshold: this.confidenceThreshold,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create command from JSON
     * @param {Object} json - JSON representation
     * @returns {GenerateTaskSuggestionsCommand} Command instance
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

        return new GenerateTaskSuggestionsCommand(params);
    }

    /**
     * Create comprehensive suggestions command
     * @param {string} projectPath - Project path
     * @param {string} context - Context for suggestions
     * @param {Object} options - Generation options
     * @returns {GenerateTaskSuggestionsCommand} Command instance
     */
    static comprehensive(projectPath, context = '', options = {}) {
        return new GenerateTaskSuggestionsCommand({
            projectPath,
            context,
            suggestionType: 'comprehensive',
            maxSuggestions: 15,
            ...options
        });
    }

    /**
     * Create bug fix suggestions command
     * @param {string} projectPath - Project path
     * @param {string} context - Context for suggestions
     * @param {Object} options - Generation options
     * @returns {GenerateTaskSuggestionsCommand} Command instance
     */
    static bugFixes(projectPath, context = '', options = {}) {
        return new GenerateTaskSuggestionsCommand({
            projectPath,
            context,
            suggestionType: 'bug_fixes',
            maxSuggestions: 8,
            confidenceThreshold: 0.8,
            ...options
        });
    }

    /**
     * Create improvement suggestions command
     * @param {string} projectPath - Project path
     * @param {string} context - Context for suggestions
     * @param {Object} options - Generation options
     * @returns {GenerateTaskSuggestionsCommand} Command instance
     */
    static improvements(projectPath, context = '', options = {}) {
        return new GenerateTaskSuggestionsCommand({
            projectPath,
            context,
            suggestionType: 'improvements',
            maxSuggestions: 10,
            ...options
        });
    }

    /**
     * Create feature suggestions command
     * @param {string} projectPath - Project path
     * @param {string} context - Context for suggestions
     * @param {Object} options - Generation options
     * @returns {GenerateTaskSuggestionsCommand} Command instance
     */
    static features(projectPath, context = '', options = {}) {
        return new GenerateTaskSuggestionsCommand({
            projectPath,
            context,
            suggestionType: 'features',
            maxSuggestions: 12,
            includeTimeEstimate: true,
            includeDependencies: true,
            ...options
        });
    }

    /**
     * Create refactoring suggestions command
     * @param {string} projectPath - Project path
     * @param {string} context - Context for suggestions
     * @param {Object} options - Generation options
     * @returns {GenerateTaskSuggestionsCommand} Command instance
     */
    static refactoring(projectPath, context = '', options = {}) {
        return new GenerateTaskSuggestionsCommand({
            projectPath,
            context,
            suggestionType: 'refactoring',
            maxSuggestions: 8,
            includePriority: true,
            includeTimeEstimate: true,
            ...options
        });
    }

    /**
     * Create testing suggestions command
     * @param {string} projectPath - Project path
     * @param {string} context - Context for suggestions
     * @param {Object} options - Generation options
     * @returns {GenerateTaskSuggestionsCommand} Command instance
     */
    static testing(projectPath, context = '', options = {}) {
        return new GenerateTaskSuggestionsCommand({
            projectPath,
            context,
            suggestionType: 'testing',
            maxSuggestions: 10,
            includeTimeEstimate: true,
            ...options
        });
    }

    /**
     * Create documentation suggestions command
     * @param {string} projectPath - Project path
     * @param {string} context - Context for suggestions
     * @param {Object} options - Generation options
     * @returns {GenerateTaskSuggestionsCommand} Command instance
     */
    static documentation(projectPath, context = '', options = {}) {
        return new GenerateTaskSuggestionsCommand({
            projectPath,
            context,
            suggestionType: 'documentation',
            maxSuggestions: 6,
            includeTimeEstimate: true,
            ...options
        });
    }

    /**
     * Create scheduled suggestions command
     * @param {string} projectPath - Project path
     * @param {Date} scheduledAt - Scheduled time
     * @param {Object} options - Generation options
     * @returns {GenerateTaskSuggestionsCommand} Command instance
     */
    static scheduled(projectPath, scheduledAt, options = {}) {
        return new GenerateTaskSuggestionsCommand({
            projectPath,
            scheduledAt,
            ...options
        });
    }

    /**
     * Create quick suggestions command
     * @param {string} projectPath - Project path
     * @param {string} context - Context for suggestions
     * @param {Object} options - Generation options
     * @returns {GenerateTaskSuggestionsCommand} Command instance
     */
    static quick(projectPath, context = '', options = {}) {
        return new GenerateTaskSuggestionsCommand({
            projectPath,
            context,
            suggestionType: 'improvements',
            timeout: 60000, // 1 minute
            aiModel: 'gpt-3.5-turbo',
            maxSuggestions: 5,
            ...options
        });
    }
}

module.exports = GenerateTaskSuggestionsCommand; 