/**
 * OrganizeModulesCommand - Command to organize project modules
 * Implements the Command pattern for module organization
 */
class OrganizeModulesCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 240000; // 4 minutes default
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
        return `organize_modules_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSummary() {
        return {
            commandId: this.commandId,
            type: 'OrganizeModulesCommand',
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
            organizationStrategy: this.options.organizationStrategy,
            createIndexFiles: this.options.createIndexFiles,
            moveFiles: this.options.moveFiles,
            outputFormat: this.outputFormat,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        if (this.timeout > 1200000) { // 20 minutes
            warnings.push('Module organization timeout is very high (over 20 minutes)');
        }

        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        const validStrategies = ['feature', 'layer', 'type', 'domain'];
        if (this.options.organizationStrategy && !validStrategies.includes(this.options.organizationStrategy)) {
            errors.push(`Invalid organization strategy. Must be one of: ${validStrategies.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getRefactorOptions() {
        return {
            organizationStrategy: this.options.organizationStrategy || 'feature', // 'feature', 'layer', 'type', 'domain'
            createIndexFiles: this.options.createIndexFiles || true,
            moveFiles: this.options.moveFiles || true,
            updateImports: this.options.updateImports || true,
            analyzeDependencies: this.options.analyzeDependencies || true,
            validateOrganization: this.options.validateOrganization || true,
            backupOriginal: this.options.backupOriginal || true,
            createDocumentation: this.options.createDocumentation || false
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
            commandType: 'OrganizeModulesCommand',
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
        
        if (options.moveFiles && options.updateImports) {
            return 'high';
        } else if (options.createIndexFiles) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    toJSON() {
        return {
            commandId: this.commandId,
            type: 'OrganizeModulesCommand',
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
        const command = new OrganizeModulesCommand({
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

    static featureBased(projectPath, options = {}) {
        return new OrganizeModulesCommand({
            projectPath,
            options: {
                organizationStrategy: 'feature',
                createIndexFiles: true,
                moveFiles: true,
                updateImports: true,
                analyzeDependencies: true,
                validateOrganization: true,
                backupOriginal: true,
                createDocumentation: false,
                ...options
            }
        });
    }

    static layerBased(projectPath, options = {}) {
        return new OrganizeModulesCommand({
            projectPath,
            options: {
                organizationStrategy: 'layer',
                createIndexFiles: true,
                moveFiles: true,
                updateImports: true,
                analyzeDependencies: true,
                validateOrganization: true,
                backupOriginal: true,
                createDocumentation: false,
                ...options
            }
        });
    }

    static scheduled(projectPath, scheduledAt, options = {}) {
        return new OrganizeModulesCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = OrganizeModulesCommand; 