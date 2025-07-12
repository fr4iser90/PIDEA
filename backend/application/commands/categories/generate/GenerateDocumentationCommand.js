/**
 * GenerateDocumentationCommand - Command to generate comprehensive documentation
 * Implements the Command pattern for documentation generation
 */
class GenerateDocumentationCommand {
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
        return `generate_documentation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSummary() {
        return {
            commandId: this.commandId,
            type: 'GenerateDocumentationCommand',
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
            docType: this.options.docType,
            includeAPI: this.options.includeAPI,
            includeArchitecture: this.options.includeArchitecture,
            includeExamples: this.options.includeExamples,
            outputFormat: this.outputFormat,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        if (this.timeout > 1200000) { // 20 minutes
            warnings.push('Documentation generation timeout is very high (over 20 minutes)');
        }

        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        const validDocTypes = ['api', 'architecture', 'user', 'developer', 'comprehensive'];
        if (this.options.docType && !validDocTypes.includes(this.options.docType)) {
            errors.push(`Invalid documentation type. Must be one of: ${validDocTypes.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getGenerateOptions() {
        return {
            docType: this.options.docType || 'comprehensive',
            includeAPI: this.options.includeAPI || true,
            includeArchitecture: this.options.includeArchitecture || true,
            includeExamples: this.options.includeExamples || true,
            includeDiagrams: this.options.includeDiagrams || true,
            includeChangelog: this.options.includeChangelog || false,
            includeTutorials: this.options.includeTutorials || false,
            autoGenerate: this.options.autoGenerate || true,
            customTemplates: this.options.customTemplates || false,
            multiFormat: this.options.multiFormat || false
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
            commandType: 'GenerateDocumentationCommand',
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
        
        if (options.docType === 'comprehensive') {
            return 'high';
        } else if (options.includeAPI && options.includeArchitecture) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    toJSON() {
        return {
            commandId: this.commandId,
            type: 'GenerateDocumentationCommand',
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
        const command = new GenerateDocumentationCommand({
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
        return new GenerateDocumentationCommand({
            projectPath,
            options: {
                docType: 'comprehensive',
                includeAPI: true,
                includeArchitecture: true,
                includeExamples: true,
                includeDiagrams: true,
                includeChangelog: true,
                includeTutorials: true,
                autoGenerate: true,
                customTemplates: false,
                multiFormat: true,
                ...options
            }
        });
    }

    static apiOnly(projectPath, options = {}) {
        return new GenerateDocumentationCommand({
            projectPath,
            options: {
                docType: 'api',
                includeAPI: true,
                includeArchitecture: false,
                includeExamples: true,
                includeDiagrams: false,
                includeChangelog: false,
                includeTutorials: false,
                autoGenerate: true,
                customTemplates: false,
                multiFormat: false,
                ...options
            }
        });
    }

    static scheduled(projectPath, scheduledAt, options = {}) {
        return new GenerateDocumentationCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = GenerateDocumentationCommand; 