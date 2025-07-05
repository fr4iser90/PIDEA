/**
 * AnalyzeArchitectureCommand - Command to analyze project architecture
 * Implements the Command pattern for architecture analysis
 */
class AnalyzeArchitectureCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 180000; // 3 minutes default
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
        return `analyze_architecture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get command summary
     * @returns {Object} Command summary
     */
    getSummary() {
        return {
            commandId: this.commandId,
            type: 'AnalyzeArchitectureCommand',
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
            detectPatterns: this.options.detectPatterns,
            analyzeDependencies: this.options.analyzeDependencies,
            complexityAnalysis: this.options.complexityAnalysis,
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
        if (this.timeout > 900000) { // 15 minutes
            warnings.push('Architecture analysis timeout is very high (over 15 minutes)');
        }

        // Check scheduled time
        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
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
            detectPatterns: this.options.detectPatterns || true,
            analyzeDependencies: this.options.analyzeDependencies || true,
            complexityAnalysis: this.options.complexityAnalysis || true,
            detectLayers: this.options.detectLayers || true,
            detectModules: this.options.detectModules || true,
            analyzeCoupling: this.options.analyzeCoupling || true,
            analyzeCohesion: this.options.analyzeCohesion || true,
            detectAntiPatterns: this.options.detectAntiPatterns || true,
            analyzeDesignPrinciples: this.options.analyzeDesignPrinciples || true
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
            includeDiagrams: this.options.includeDiagrams || false,
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
            commandType: 'AnalyzeArchitectureCommand',
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
        const options = this.getAnalysisOptions();
        const analysisCount = Object.values(options).filter(Boolean).length;
        
        if (analysisCount > 7) {
            return 'low';
        } else if (analysisCount > 4) {
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
            type: 'AnalyzeArchitectureCommand',
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
     * @returns {AnalyzeArchitectureCommand} Command instance
     */
    static fromJSON(json) {
        const command = new AnalyzeArchitectureCommand({
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
     * Create comprehensive architecture analysis
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {AnalyzeArchitectureCommand} Command instance
     */
    static comprehensive(projectPath, options = {}) {
        return new AnalyzeArchitectureCommand({
            projectPath,
            options: {
                detectPatterns: true,
                analyzeDependencies: true,
                complexityAnalysis: true,
                detectLayers: true,
                detectModules: true,
                analyzeCoupling: true,
                analyzeCohesion: true,
                detectAntiPatterns: true,
                analyzeDesignPrinciples: true,
                ...options
            }
        });
    }

    /**
     * Create quick architecture analysis
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {AnalyzeArchitectureCommand} Command instance
     */
    static quick(projectPath, options = {}) {
        return new AnalyzeArchitectureCommand({
            projectPath,
            options: {
                detectPatterns: true,
                analyzeDependencies: true,
                complexityAnalysis: false,
                detectLayers: true,
                detectModules: false,
                analyzeCoupling: false,
                analyzeCohesion: false,
                detectAntiPatterns: false,
                analyzeDesignPrinciples: false,
                ...options
            }
        });
    }

    /**
     * Create scheduled architecture analysis
     * @param {string} projectPath - Project path
     * @param {Date} scheduledAt - Scheduled time
     * @param {Object} options - Analysis options
     * @returns {AnalyzeArchitectureCommand} Command instance
     */
    static scheduled(projectPath, scheduledAt, options = {}) {
        return new AnalyzeArchitectureCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = AnalyzeArchitectureCommand; 