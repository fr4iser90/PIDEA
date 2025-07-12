/**
 * GenerateConfigsCommand - Command to generate project configuration files
 * Implements the Command pattern for configuration generation
 */
class GenerateConfigsCommand {
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
        return `generate_configs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSummary() {
        return {
            commandId: this.commandId,
            type: 'GenerateConfigsCommand',
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
            configTypes: this.options.configTypes,
            overwriteExisting: this.options.overwriteExisting,
            includeTemplates: this.options.includeTemplates,
            outputFormat: this.outputFormat,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        if (this.timeout > 600000) { // 10 minutes
            warnings.push('Config generation timeout is very high (over 10 minutes)');
        }

        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        const validConfigTypes = ['eslint', 'prettier', 'jest', 'webpack', 'babel', 'typescript', 'docker', 'ci'];
        if (this.options.configTypes && !Array.isArray(this.options.configTypes)) {
            errors.push('Config types must be an array');
        } else if (this.options.configTypes) {
            const invalidTypes = this.options.configTypes.filter(type => !validConfigTypes.includes(type));
            if (invalidTypes.length > 0) {
                errors.push(`Invalid config types: ${invalidTypes.join(', ')}. Valid types: ${validConfigTypes.join(', ')}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getGenerateOptions() {
        return {
            configTypes: this.options.configTypes || ['eslint', 'prettier', 'jest'],
            overwriteExisting: this.options.overwriteExisting || false,
            includeTemplates: this.options.includeTemplates || true,
            includeScripts: this.options.includeScripts || true,
            includeDependencies: this.options.includeDependencies || true,
            customSettings: this.options.customSettings || {},
            environmentSpecific: this.options.environmentSpecific || false,
            backupExisting: this.options.backupExisting || true,
            validateConfigs: this.options.validateConfigs || true
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
            commandType: 'GenerateConfigsCommand',
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

    getGeneratePriority() {
        if (this.options.priority) {
            return this.options.priority;
        }

        const options = this.getGenerateOptions();
        
        if (options.configTypes.includes('docker') || options.configTypes.includes('ci')) {
            return 'high';
        } else if (options.configTypes.length > 3) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    toJSON() {
        return {
            commandId: this.commandId,
            type: 'GenerateConfigsCommand',
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
        const command = new GenerateConfigsCommand({
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
        return new GenerateConfigsCommand({
            projectPath,
            options: {
                configTypes: ['eslint', 'prettier', 'jest', 'webpack', 'babel', 'typescript', 'docker', 'ci'],
                overwriteExisting: false,
                includeTemplates: true,
                includeScripts: true,
                includeDependencies: true,
                customSettings: {},
                environmentSpecific: true,
                backupExisting: true,
                validateConfigs: true,
                ...options
            }
        });
    }

    static basic(projectPath, options = {}) {
        return new GenerateConfigsCommand({
            projectPath,
            options: {
                configTypes: ['eslint', 'prettier', 'jest'],
                overwriteExisting: false,
                includeTemplates: true,
                includeScripts: true,
                includeDependencies: true,
                customSettings: {},
                environmentSpecific: false,
                backupExisting: true,
                validateConfigs: true,
                ...options
            }
        });
    }

    static scheduled(projectPath, scheduledAt, options = {}) {
        return new GenerateConfigsCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = GenerateConfigsCommand; 