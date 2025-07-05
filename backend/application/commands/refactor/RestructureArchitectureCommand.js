/**
 * RestructureArchitectureCommand - Command to restructure project architecture
 * Implements the Command pattern for architecture restructuring
 */
class RestructureArchitectureCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 300000; // 5 minutes default
        this.outputFormat = params.outputFormat || 'json';
        this.metadata = params.metadata || {};
        
        this.timestamp = new Date();
        this.commandId = this.generateCommandId();
    }

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

    generateCommandId() {
        return `restructure_architecture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSummary() {
        return {
            commandId: this.commandId,
            type: 'RestructureArchitectureCommand',
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
            architecturePattern: this.options.architecturePattern,
            restructureStrategy: this.options.restructureStrategy,
            backupOriginal: this.options.backupOriginal,
            outputFormat: this.outputFormat,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        if (this.timeout > 1800000) { // 30 minutes
            warnings.push('Architecture restructuring timeout is very high (over 30 minutes)');
        }

        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        const validPatterns = ['mvc', 'mvvm', 'clean', 'hexagonal', 'ddd', 'microservices', 'monolithic'];
        if (this.options.architecturePattern && !validPatterns.includes(this.options.architecturePattern)) {
            errors.push(`Invalid architecture pattern. Must be one of: ${validPatterns.join(', ')}`);
        }

        const validStrategies = ['gradual', 'complete', 'hybrid'];
        if (this.options.restructureStrategy && !validStrategies.includes(this.options.restructureStrategy)) {
            errors.push(`Invalid restructure strategy. Must be one of: ${validStrategies.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getRefactorOptions() {
        return {
            architecturePattern: this.options.architecturePattern || 'clean',
            restructureStrategy: this.options.restructureStrategy || 'gradual',
            backupOriginal: this.options.backupOriginal || true,
            createNewStructure: this.options.createNewStructure || true,
            migrateExisting: this.options.migrateExisting || true,
            updateImports: this.options.updateImports || true,
            createDocumentation: this.options.createDocumentation || true,
            validateArchitecture: this.options.validateArchitecture || true,
            includeExamples: this.options.includeExamples || false
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
            commandType: 'RestructureArchitectureCommand',
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

    getRefactorPriority() {
        if (this.options.priority) {
            return this.options.priority;
        }

        const options = this.getRefactorOptions();
        
        if (options.restructureStrategy === 'complete') {
            return 'high';
        } else if (options.createNewStructure && options.migrateExisting) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    toJSON() {
        return {
            commandId: this.commandId,
            type: 'RestructureArchitectureCommand',
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
        const command = new RestructureArchitectureCommand({
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

    static cleanArchitecture(projectPath, options = {}) {
        return new RestructureArchitectureCommand({
            projectPath,
            options: {
                architecturePattern: 'clean',
                restructureStrategy: 'gradual',
                backupOriginal: true,
                createNewStructure: true,
                migrateExisting: true,
                updateImports: true,
                createDocumentation: true,
                validateArchitecture: true,
                includeExamples: true,
                ...options
            }
        });
    }

    static dddArchitecture(projectPath, options = {}) {
        return new RestructureArchitectureCommand({
            projectPath,
            options: {
                architecturePattern: 'ddd',
                restructureStrategy: 'complete',
                backupOriginal: true,
                createNewStructure: true,
                migrateExisting: true,
                updateImports: true,
                createDocumentation: true,
                validateArchitecture: true,
                includeExamples: true,
                ...options
            }
        });
    }

    static scheduled(projectPath, scheduledAt, options = {}) {
        return new RestructureArchitectureCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = RestructureArchitectureCommand; 