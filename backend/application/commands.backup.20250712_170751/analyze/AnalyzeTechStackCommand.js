/**
 * AnalyzeTechStackCommand - Command to analyze project tech stack
 * Implements the Command pattern for tech stack analysis
 */
class AnalyzeTechStackCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 90000; // 1.5 minutes default
        this.outputFormat = params.outputFormat || 'json';
        this.metadata = params.metadata || {};
        
        this.timestamp = new Date();
        this.commandId = this.generateCommandId();
    }

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

    generateCommandId() {
        return `analyze_tech_stack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSummary() {
        return {
            commandId: this.commandId,
            type: 'AnalyzeTechStackCommand',
            projectPath: this.projectPath,
            scheduledAt: this.scheduledAt,
            timestamp: this.timestamp,
            requestedBy: this.requestedBy
        };
    }

    getLoggableParams() {
        return {
            projectPath: this.projectPath,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            detectFrameworks: this.options.detectFrameworks,
            detectLibraries: this.options.detectLibraries,
            detectTools: this.options.detectTools,
            outputFormat: this.outputFormat,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        if (this.timeout > 300000) { // 5 minutes
            warnings.push('Tech stack analysis timeout is very high (over 5 minutes)');
        }

        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getAnalysisOptions() {
        return {
            detectFrameworks: this.options.detectFrameworks || true,
            detectLibraries: this.options.detectLibraries || true,
            detectTools: this.options.detectTools || true,
            analyzeVersions: this.options.analyzeVersions || true,
            checkCompatibility: this.options.checkCompatibility || false,
            detectBuildTools: this.options.detectBuildTools || true,
            detectTestingFrameworks: this.options.detectTestingFrameworks || true,
            detectLintingTools: this.options.detectLintingTools || true
        };
    }

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

    getMetadata() {
        return {
            ...this.metadata,
            commandType: 'AnalyzeTechStackCommand',
            version: '1.0.0',
            createdAt: this.timestamp,
            commandId: this.commandId
        };
    }

    isImmediate() {
        return !this.scheduledAt || this.scheduledAt <= new Date();
    }

    isScheduled() {
        return !!this.scheduledAt && this.scheduledAt > new Date();
    }

    getAnalysisPriority() {
        if (this.options.priority) {
            return this.options.priority;
        }

        const options = this.getAnalysisOptions();
        const analysisCount = Object.values(options).filter(Boolean).length;
        
        if (analysisCount > 6) {
            return 'low';
        } else if (analysisCount > 3) {
            return 'medium';
        } else {
            return 'high';
        }
    }

    toJSON() {
        return {
            commandId: this.commandId,
            type: 'AnalyzeTechStackCommand',
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

    static fromJSON(json) {
        const command = new AnalyzeTechStackCommand({
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

    static comprehensive(projectPath, options = {}) {
        return new AnalyzeTechStackCommand({
            projectPath,
            options: {
                detectFrameworks: true,
                detectLibraries: true,
                detectTools: true,
                analyzeVersions: true,
                checkCompatibility: true,
                detectBuildTools: true,
                detectTestingFrameworks: true,
                detectLintingTools: true,
                ...options
            }
        });
    }

    static quick(projectPath, options = {}) {
        return new AnalyzeTechStackCommand({
            projectPath,
            options: {
                detectFrameworks: true,
                detectLibraries: true,
                detectTools: true,
                analyzeVersions: false,
                checkCompatibility: false,
                detectBuildTools: false,
                detectTestingFrameworks: false,
                detectLintingTools: false,
                ...options
            }
        });
    }

    static scheduled(projectPath, scheduledAt, options = {}) {
        return new AnalyzeTechStackCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = AnalyzeTechStackCommand; 