/**
 * AnalyzeRepoStructureCommand - Command to analyze repository structure
 * Implements the Command pattern for repository structure analysis
 */
class AnalyzeRepoStructureCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 120000; // 2 minutes default
        this.outputFormat = params.outputFormat || 'json';
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

        if (params.timeout && (typeof params.timeout !== 'number' || params.timeout < 30000)) {
            throw new Error('Timeout must be at least 30 seconds');
        }

        if (params.scheduledAt && !(params.scheduledAt instanceof Date)) {
            throw new Error('Scheduled at must be a valid Date object');
        }

        if (params.outputFormat && !['json', 'html', 'markdown', 'pdf'].includes(params.outputFormat)) {
            throw new Error('Invalid output format');
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
        return `analyze_repo_structure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get command summary
     * @returns {Object} Command summary
     */
    getSummary() {
        return {
            commandId: this.commandId,
            type: 'AnalyzeRepoStructureCommand',
            projectPath: this.projectPath,
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
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            includeHidden: this.options.includeHidden,
            maxDepth: this.options.maxDepth,
            fileTypes: this.options.fileTypes,
            outputFormat: this.outputFormat,
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
            warnings.push('Repository structure analysis timeout is very high (over 10 minutes)');
        }

        // Check scheduled time
        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        // Check max depth
        if (this.options.maxDepth && (this.options.maxDepth < 1 || this.options.maxDepth > 20)) {
            warnings.push('Max depth should be between 1 and 20');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get analysis options
     * @returns {Object} Analysis options
     */
    getAnalysisOptions() {
        return {
            includeHidden: this.options.includeHidden || false,
            maxDepth: this.options.maxDepth || 10,
            fileTypes: this.options.fileTypes || ['js', 'ts', 'jsx', 'tsx', 'json', 'md', 'yml', 'yaml'],
            excludePatterns: this.options.excludePatterns || (() => {
                const { getExcludePatterns } = require('@config/analysis-excludes');
                return getExcludePatterns('extended');
            })(),
            includeStats: this.options.includeStats || true,
            includeDependencies: this.options.includeDependencies || false
        };
    }

    /**
     * Get output configuration
     * @returns {Object} Output configuration
     */
    getOutputConfiguration() {
        return {
            format: this.outputFormat,
            includeRawData: this.options.includeRawData || false,
            includeRecommendations: this.options.includeRecommendations || true,
            includeMetrics: this.options.includeMetrics || true,
            includeCharts: this.options.includeCharts || false,
            outputPath: this.options.outputPath
        };
    }

    /**
     * Get command metadata
     * @returns {Object} Command metadata
     */
    getMetadata() {
        return {
            ...this.metadata,
            commandType: 'AnalyzeRepoStructureCommand',
            version: '1.0.0',
            createdAt: this.timestamp,
            commandId: this.commandId
        };
    }

    /**
     * Check if command should be executed immediately
     * @returns {boolean} True if immediate execution
     */
    isImmediate() {
        return !this.scheduledAt || this.scheduledAt <= new Date();
    }

    /**
     * Check if command is scheduled
     * @returns {boolean} True if scheduled
     */
    isScheduled() {
        return !!this.scheduledAt && this.scheduledAt > new Date();
    }

    /**
     * Get analysis priority
     * @returns {string} Priority level
     */
    getAnalysisPriority() {
        if (this.options.priority) {
            return this.options.priority;
        }

        // Default priority based on options
        if (this.options.maxDepth > 15) {
            return 'low';
        } else if (this.options.maxDepth > 8) {
            return 'medium';
        } else {
            return 'high';
        }
    }

    /**
     * Convert command to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            commandId: this.commandId,
            type: 'AnalyzeRepoStructureCommand',
            projectPath: this.projectPath,
            options: this.options,
            requestedBy: this.requestedBy,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            outputFormat: this.outputFormat,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create command from JSON
     * @param {Object} json - JSON representation
     * @returns {AnalyzeRepoStructureCommand} Command instance
     */
    static fromJSON(json) {
        const command = new AnalyzeRepoStructureCommand({
            projectPath: json.projectPath,
            options: json.options,
            requestedBy: json.requestedBy,
            scheduledAt: json.scheduledAt ? new Date(json.scheduledAt) : null,
            timeout: json.timeout,
            outputFormat: json.outputFormat,
            metadata: json.metadata
        });
        
        command.commandId = json.commandId;
        command.timestamp = new Date(json.timestamp);
        
        return command;
    }

    /**
     * Create comprehensive repository structure analysis
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {AnalyzeRepoStructureCommand} Command instance
     */
    static comprehensive(projectPath, options = {}) {
        return new AnalyzeRepoStructureCommand({
            projectPath,
            options: {
                includeHidden: true,
                maxDepth: 15,
                fileTypes: ['js', 'ts', 'jsx', 'tsx', 'json', 'md', 'yml', 'yaml', 'xml', 'html', 'css', 'scss'],
                includeStats: true,
                includeDependencies: true,
                ...options
            }
        });
    }

    /**
     * Create quick repository structure analysis
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {AnalyzeRepoStructureCommand} Command instance
     */
    static quick(projectPath, options = {}) {
        return new AnalyzeRepoStructureCommand({
            projectPath,
            options: {
                includeHidden: false,
                maxDepth: 5,
                fileTypes: ['js', 'ts', 'jsx', 'tsx', 'json'],
                includeStats: true,
                includeDependencies: false,
                ...options
            }
        });
    }

    /**
     * Create scheduled repository structure analysis
     * @param {string} projectPath - Project path
     * @param {Date} scheduledAt - Scheduled time
     * @param {Object} options - Analysis options
     * @returns {AnalyzeRepoStructureCommand} Command instance
     */
    static scheduled(projectPath, scheduledAt, options = {}) {
        return new AnalyzeRepoStructureCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = AnalyzeRepoStructureCommand; 