/**
 * GenerateScriptsCommand - Command to generate automation scripts
 * Implements the Command pattern for script generation
 */
class GenerateScriptsCommand {
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
        return `generate_scripts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSummary() {
        return {
            commandId: this.commandId,
            type: 'GenerateScriptsCommand',
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
            scriptTypes: this.options.scriptTypes,
            includeCI: this.options.includeCI,
            includeDeployment: this.options.includeDeployment,
            outputFormat: this.outputFormat,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        if (this.timeout > 900000) { // 15 minutes
            warnings.push('Script generation timeout is very high (over 15 minutes)');
        }

        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        const validScriptTypes = ['build', 'test', 'deploy', 'dev', 'lint', 'format', 'clean', 'setup', 'migrate', 'backup'];
        if (this.options.scriptTypes && !Array.isArray(this.options.scriptTypes)) {
            errors.push('Script types must be an array');
        } else if (this.options.scriptTypes) {
            const invalidTypes = this.options.scriptTypes.filter(type => !validScriptTypes.includes(type));
            if (invalidTypes.length > 0) {
                errors.push(`Invalid script types: ${invalidTypes.join(', ')}. Valid types: ${validScriptTypes.join(', ')}`);
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
            scriptTypes: this.options.scriptTypes || ['build', 'test', 'dev', 'lint'],
            includeCI: this.options.includeCI || false,
            includeDeployment: this.options.includeDeployment || false,
            includeDocker: this.options.includeDocker || false,
            includeMonitoring: this.options.includeMonitoring || false,
            customScripts: this.options.customScripts || {},
            environmentSpecific: this.options.environmentSpecific || false,
            backupExisting: this.options.backupExisting || true,
            validateScripts: this.options.validateScripts || true,
            addToPackageJson: this.options.addToPackageJson || true
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
            commandType: 'GenerateScriptsCommand',
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
        
        if (options.includeCI || options.includeDeployment) {
            return 'high';
        } else if (options.scriptTypes.length > 5) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    toJSON() {
        return {
            commandId: this.commandId,
            type: 'GenerateScriptsCommand',
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
        const command = new GenerateScriptsCommand({
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
        return new GenerateScriptsCommand({
            projectPath,
            options: {
                scriptTypes: ['build', 'test', 'deploy', 'dev', 'lint', 'format', 'clean', 'setup', 'migrate', 'backup'],
                includeCI: true,
                includeDeployment: true,
                includeDocker: true,
                includeMonitoring: true,
                customScripts: {},
                environmentSpecific: true,
                backupExisting: true,
                validateScripts: true,
                addToPackageJson: true,
                ...options
            }
        });
    }

    static basic(projectPath, options = {}) {
        return new GenerateScriptsCommand({
            projectPath,
            options: {
                scriptTypes: ['build', 'test', 'dev', 'lint'],
                includeCI: false,
                includeDeployment: false,
                includeDocker: false,
                includeMonitoring: false,
                customScripts: {},
                environmentSpecific: false,
                backupExisting: true,
                validateScripts: true,
                addToPackageJson: true,
                ...options
            }
        });
    }

    static scheduled(projectPath, scheduledAt, options = {}) {
        return new GenerateScriptsCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = GenerateScriptsCommand; 