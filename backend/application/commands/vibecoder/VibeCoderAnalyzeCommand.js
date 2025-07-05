/**
 * VibeCoderAnalyzeCommand - Command to orchestrate all analyze commands
 * Implements the Command pattern for comprehensive analysis orchestration
 */
class VibeCoderAnalyzeCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 600000; // 10 minutes default
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

        if (params.timeout && (typeof params.timeout !== 'number' || params.timeout < 60000)) {
            throw new Error('Timeout must be at least 60 seconds');
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
        return `vibecoder_analyze_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get command summary
     * @returns {Object} Command summary
     */
    getSummary() {
        return {
            commandId: this.commandId,
            type: 'VibeCoderAnalyzeCommand',
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
            analysisTypes: this.getAnalysisTypes(),
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
            warnings.push('VibeCoder analysis timeout is very high (over 30 minutes)');
        }

        // Check scheduled time
        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        // Check analysis scope
        const analysisTypes = this.getAnalysisTypes();
        if (analysisTypes.length === 0) {
            errors.push('At least one analysis type must be specified');
        }

        if (analysisTypes.length > 5) {
            warnings.push('Many analysis types specified, may take longer');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get analysis types to perform
     * @returns {Array} Analysis types
     */
    getAnalysisTypes() {
        const types = [];
        
        if (this.options.includeRepoStructure !== false) {
            types.push('repo_structure');
        }
        
        if (this.options.includeArchitecture !== false) {
            types.push('architecture');
        }
        
        if (this.options.includeTechStack !== false) {
            types.push('tech_stack');
        }
        
        if (this.options.includeCodeQuality !== false) {
            types.push('code_quality');
        }
        
        if (this.options.includeDependencies !== false) {
            types.push('dependencies');
        }

        return types;
    }

    /**
     * Get analysis configuration
     * @returns {Object} Analysis configuration
     */
    getAnalysisConfiguration() {
        return {
            repoStructure: {
                includeHidden: this.options.repoStructure?.includeHidden || false,
                maxDepth: this.options.repoStructure?.maxDepth || 10,
                fileTypes: this.options.repoStructure?.fileTypes || ['js', 'ts', 'jsx', 'tsx', 'json', 'md', 'yml', 'yaml'],
                excludePatterns: this.options.repoStructure?.excludePatterns || ['node_modules', '.git', 'dist', 'build']
            },
            architecture: {
                detectPatterns: this.options.architecture?.detectPatterns || true,
                analyzeDependencies: this.options.architecture?.analyzeDependencies || true,
                complexityAnalysis: this.options.architecture?.complexityAnalysis || true
            },
            techStack: {
                detectFrameworks: this.options.techStack?.detectFrameworks || true,
                detectLibraries: this.options.techStack?.detectLibraries || true,
                detectTools: this.options.techStack?.detectTools || true
            },
            codeQuality: {
                linting: this.options.codeQuality?.linting || true,
                complexity: this.options.codeQuality?.complexity || true,
                maintainability: this.options.codeQuality?.maintainability || true,
                testCoverage: this.options.codeQuality?.testCoverage || false
            },
            dependencies: {
                analyzeVersions: this.options.dependencies?.analyzeVersions || true,
                checkVulnerabilities: this.options.dependencies?.checkVulnerabilities || true,
                analyzeUpdates: this.options.dependencies?.analyzeUpdates || false
            }
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
            outputPath: this.options.outputPath,
            consolidateResults: this.options.consolidateResults || true
        };
    }

    /**
     * Get command metadata
     * @returns {Object} Command metadata
     */
    getMetadata() {
        return {
            ...this.metadata,
            commandType: 'VibeCoderAnalyzeCommand',
            version: '1.0.0',
            createdAt: this.timestamp,
            commandId: this.commandId,
            analysisTypes: this.getAnalysisTypes()
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

        // Default priority based on analysis scope
        const analysisTypes = this.getAnalysisTypes();
        if (analysisTypes.length > 4) {
            return 'low';
        } else if (analysisTypes.length > 2) {
            return 'medium';
        } else {
            return 'high';
        }
    }

    /**
     * Get sub-commands to execute
     * @returns {Array} Array of sub-command configurations
     */
    getSubCommands() {
        const subCommands = [];
        const analysisTypes = this.getAnalysisTypes();
        const config = this.getAnalysisConfiguration();

        if (analysisTypes.includes('repo_structure')) {
            subCommands.push({
                type: 'AnalyzeRepoStructureCommand',
                params: {
                    projectPath: this.projectPath,
                    options: config.repoStructure,
                    requestedBy: this.requestedBy,
                    timeout: Math.floor(this.timeout * 0.2), // 20% of total time
                    outputFormat: this.outputFormat,
                    metadata: {
                        parentCommandId: this.commandId,
                        analysisType: 'repo_structure'
                    }
                }
            });
        }

        if (analysisTypes.includes('architecture')) {
            subCommands.push({
                type: 'AnalyzeArchitectureCommand',
                params: {
                    projectPath: this.projectPath,
                    options: config.architecture,
                    requestedBy: this.requestedBy,
                    timeout: Math.floor(this.timeout * 0.25), // 25% of total time
                    outputFormat: this.outputFormat,
                    metadata: {
                        parentCommandId: this.commandId,
                        analysisType: 'architecture'
                    }
                }
            });
        }

        if (analysisTypes.includes('tech_stack')) {
            subCommands.push({
                type: 'AnalyzeTechStackCommand',
                params: {
                    projectPath: this.projectPath,
                    options: config.techStack,
                    requestedBy: this.requestedBy,
                    timeout: Math.floor(this.timeout * 0.15), // 15% of total time
                    outputFormat: this.outputFormat,
                    metadata: {
                        parentCommandId: this.commandId,
                        analysisType: 'tech_stack'
                    }
                }
            });
        }

        if (analysisTypes.includes('code_quality')) {
            subCommands.push({
                type: 'AnalyzeCodeQualityCommand',
                params: {
                    projectPath: this.projectPath,
                    options: config.codeQuality,
                    requestedBy: this.requestedBy,
                    timeout: Math.floor(this.timeout * 0.25), // 25% of total time
                    outputFormat: this.outputFormat,
                    metadata: {
                        parentCommandId: this.commandId,
                        analysisType: 'code_quality'
                    }
                }
            });
        }

        if (analysisTypes.includes('dependencies')) {
            subCommands.push({
                type: 'AnalyzeDependenciesCommand',
                params: {
                    projectPath: this.projectPath,
                    options: config.dependencies,
                    requestedBy: this.requestedBy,
                    timeout: Math.floor(this.timeout * 0.15), // 15% of total time
                    outputFormat: this.outputFormat,
                    metadata: {
                        parentCommandId: this.commandId,
                        analysisType: 'dependencies'
                    }
                }
            });
        }

        return subCommands;
    }

    /**
     * Convert command to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            commandId: this.commandId,
            type: 'VibeCoderAnalyzeCommand',
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
     * @returns {VibeCoderAnalyzeCommand} Command instance
     */
    static fromJSON(json) {
        const command = new VibeCoderAnalyzeCommand({
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
     * Create comprehensive analysis command
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {VibeCoderAnalyzeCommand} Command instance
     */
    static comprehensive(projectPath, options = {}) {
        return new VibeCoderAnalyzeCommand({
            projectPath,
            options: {
                includeRepoStructure: true,
                includeArchitecture: true,
                includeTechStack: true,
                includeCodeQuality: true,
                includeDependencies: true,
                ...options
            }
        });
    }

    /**
     * Create quick analysis command
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {VibeCoderAnalyzeCommand} Command instance
     */
    static quick(projectPath, options = {}) {
        return new VibeCoderAnalyzeCommand({
            projectPath,
            options: {
                includeRepoStructure: true,
                includeTechStack: true,
                includeArchitecture: false,
                includeCodeQuality: false,
                includeDependencies: false,
                ...options
            }
        });
    }

    /**
     * Create scheduled analysis command
     * @param {string} projectPath - Project path
     * @param {Date} scheduledAt - Scheduled time
     * @param {Object} options - Analysis options
     * @returns {VibeCoderAnalyzeCommand} Command instance
     */
    static scheduled(projectPath, scheduledAt, options = {}) {
        return new VibeCoderAnalyzeCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = VibeCoderAnalyzeCommand; 