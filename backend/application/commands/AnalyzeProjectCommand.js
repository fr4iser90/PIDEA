/**
 * AnalyzeProjectCommand - Command to analyze a project
 * Implements the Command pattern for AI-powered project analysis
 */
class AnalyzeProjectCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.analysisType = params.analysisType || 'comprehensive';
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 300000; // 5 minutes default
        this.aiModel = params.aiModel || 'gpt-4';
        this.includeCodeReview = params.includeCodeReview || false;
        this.includeSecurityScan = params.includeSecurityScan || false;
        this.includePerformanceAnalysis = params.includePerformanceAnalysis || false;
        this.includeArchitectureReview = params.includeArchitectureReview || false;
        this.includeDependencyAnalysis = params.includeDependencyAnalysis || false;
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

        if (params.analysisType && !['comprehensive', 'code_quality', 'security', 'performance', 'architecture', 'dependencies', 'custom'].includes(params.analysisType)) {
            throw new Error('Invalid analysis type');
        }

        if (params.timeout && (typeof params.timeout !== 'number' || params.timeout < 30000)) {
            throw new Error('Timeout must be at least 30 seconds');
        }

        if (params.aiModel && typeof params.aiModel !== 'string') {
            throw new Error('AI model must be a string');
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
        return `analyze_project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get command summary
     * @returns {Object} Command summary
     */
    getSummary() {
        return {
            commandId: this.commandId,
            type: 'AnalyzeProjectCommand',
            projectPath: this.projectPath,
            analysisType: this.analysisType,
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
            analysisType: this.analysisType,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            aiModel: this.aiModel,
            includeCodeReview: this.includeCodeReview,
            includeSecurityScan: this.includeSecurityScan,
            includePerformanceAnalysis: this.includePerformanceAnalysis,
            includeArchitectureReview: this.includeArchitectureReview,
            includeDependencyAnalysis: this.includeDependencyAnalysis,
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
        if (this.timeout > 1800000) { // 30 minutes
            warnings.push('Analysis timeout is very high (over 30 minutes)');
        }

        // Check scheduled time
        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        // Check analysis scope
        const analysisComponents = [
            this.includeCodeReview,
            this.includeSecurityScan,
            this.includePerformanceAnalysis,
            this.includeArchitectureReview,
            this.includeDependencyAnalysis
        ];

        if (analysisComponents.filter(Boolean).length > 3) {
            warnings.push('Analysis includes many components, may take longer');
        }

        // Check AI model compatibility
        if (this.aiModel === 'gpt-4' && this.timeout < 600000) {
            warnings.push('GPT-4 analysis may need more time than current timeout');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get analysis scope
     * @returns {Object} Analysis scope
     */
    getAnalysisScope() {
        return {
            codeQuality: this.analysisType === 'comprehensive' || this.analysisType === 'code_quality' || this.includeCodeReview,
            security: this.analysisType === 'comprehensive' || this.analysisType === 'security' || this.includeSecurityScan,
            performance: this.analysisType === 'comprehensive' || this.analysisType === 'performance' || this.includePerformanceAnalysis,
            architecture: this.analysisType === 'comprehensive' || this.analysisType === 'architecture' || this.includeArchitectureReview,
            dependencies: this.analysisType === 'comprehensive' || this.analysisType === 'dependencies' || this.includeDependencyAnalysis
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
            temperature: this.options.temperature || 0.1,
            includeContext: this.options.includeContext || true,
            analysisDepth: this.options.analysisDepth || 'detailed'
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
            commandId: this.commandId,
            timestamp: this.timestamp,
            requestedBy: this.requestedBy,
            analysisType: this.analysisType,
            aiModel: this.aiModel,
            options: this.options,
            metadata: this.metadata
        };
    }

    /**
     * Check if analysis should be immediate
     * @returns {boolean} True if immediate analysis
     */
    isImmediate() {
        return !this.scheduledAt || this.scheduledAt <= new Date();
    }

    /**
     * Check if analysis is scheduled
     * @returns {boolean} True if scheduled analysis
     */
    isScheduled() {
        return !!this.scheduledAt && this.scheduledAt > new Date();
    }

    /**
     * Get analysis priority
     * @returns {number} Analysis priority
     */
    getAnalysisPriority() {
        let priority = 0;

        // Higher priority for immediate analysis
        if (this.isImmediate()) {
            priority += 100;
        }

        // Higher priority for comprehensive analysis
        if (this.analysisType === 'comprehensive') {
            priority += 50;
        }

        // Higher priority for security analysis
        if (this.analysisType === 'security' || this.includeSecurityScan) {
            priority += 75;
        }

        // Lower priority for scheduled analysis
        if (this.isScheduled()) {
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
            projectPath: this.projectPath,
            analysisType: this.analysisType,
            options: this.options,
            requestedBy: this.requestedBy,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            aiModel: this.aiModel,
            includeCodeReview: this.includeCodeReview,
            includeSecurityScan: this.includeSecurityScan,
            includePerformanceAnalysis: this.includePerformanceAnalysis,
            includeArchitectureReview: this.includeArchitectureReview,
            includeDependencyAnalysis: this.includeDependencyAnalysis,
            outputFormat: this.outputFormat,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create command from JSON
     * @param {Object} json - JSON representation
     * @returns {AnalyzeProjectCommand} Command instance
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

        return new AnalyzeProjectCommand(params);
    }

    /**
     * Create comprehensive analysis command
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {AnalyzeProjectCommand} Command instance
     */
    static comprehensive(projectPath, options = {}) {
        return new AnalyzeProjectCommand({
            projectPath,
            analysisType: 'comprehensive',
            includeCodeReview: true,
            includeSecurityScan: true,
            includePerformanceAnalysis: true,
            includeArchitectureReview: true,
            includeDependencyAnalysis: true,
            ...options
        });
    }

    /**
     * Create code quality analysis command
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {AnalyzeProjectCommand} Command instance
     */
    static codeQuality(projectPath, options = {}) {
        return new AnalyzeProjectCommand({
            projectPath,
            analysisType: 'code_quality',
            includeCodeReview: true,
            ...options
        });
    }

    /**
     * Create security analysis command
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {AnalyzeProjectCommand} Command instance
     */
    static security(projectPath, options = {}) {
        return new AnalyzeProjectCommand({
            projectPath,
            analysisType: 'security',
            includeSecurityScan: true,
            ...options
        });
    }

    /**
     * Create performance analysis command
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {AnalyzeProjectCommand} Command instance
     */
    static performance(projectPath, options = {}) {
        return new AnalyzeProjectCommand({
            projectPath,
            analysisType: 'performance',
            includePerformanceAnalysis: true,
            ...options
        });
    }

    /**
     * Create architecture analysis command
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {AnalyzeProjectCommand} Command instance
     */
    static architecture(projectPath, options = {}) {
        return new AnalyzeProjectCommand({
            projectPath,
            analysisType: 'architecture',
            includeArchitectureReview: true,
            ...options
        });
    }

    /**
     * Create dependency analysis command
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {AnalyzeProjectCommand} Command instance
     */
    static dependencies(projectPath, options = {}) {
        return new AnalyzeProjectCommand({
            projectPath,
            analysisType: 'dependencies',
            includeDependencyAnalysis: true,
            ...options
        });
    }

    /**
     * Create scheduled analysis command
     * @param {string} projectPath - Project path
     * @param {Date} scheduledAt - Scheduled time
     * @param {Object} options - Analysis options
     * @returns {AnalyzeProjectCommand} Command instance
     */
    static scheduled(projectPath, scheduledAt, options = {}) {
        return new AnalyzeProjectCommand({
            projectPath,
            scheduledAt,
            ...options
        });
    }

    /**
     * Create quick analysis command
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {AnalyzeProjectCommand} Command instance
     */
    static quick(projectPath, options = {}) {
        return new AnalyzeProjectCommand({
            projectPath,
            analysisType: 'code_quality',
            timeout: 60000, // 1 minute
            aiModel: 'gpt-3.5-turbo',
            includeCodeReview: true,
            ...options
        });
    }
}

module.exports = AnalyzeProjectCommand; 