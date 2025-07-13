/**
 * SplitLargeFilesCommand - Command to split large files into smaller modules
 * Implements the Command pattern for file refactoring
 */
class SplitLargeFilesCommand {
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
        return `split_large_files_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSummary() {
        return {
            commandId: this.commandId,
            type: 'SplitLargeFilesCommand',
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
            maxFileSize: this.options.maxFileSize,
            splitStrategy: this.options.splitStrategy,
            outputDirectory: this.options.outputDirectory,
            outputFormat: this.outputFormat,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        if (this.timeout > 1800000) { // 30 minutes
            warnings.push('File splitting timeout is very high (over 30 minutes)');
        }

        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        if (this.options.maxFileSize && (this.options.maxFileSize < 1000 || this.options.maxFileSize > 1000000)) {
            warnings.push('Max file size should be between 1KB and 1MB');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getRefactorOptions() {
        return {
            maxFileSize: this.options.maxFileSize || 50000, // 50KB default
            splitStrategy: this.options.splitStrategy || 'function', // 'function', 'class', 'module'
            outputDirectory: this.options.outputDirectory || 'refactored',
            preserveOriginal: this.options.preserveOriginal || true,
            createIndexFiles: this.options.createIndexFiles || true,
            analyzeDependencies: this.options.analyzeDependencies || true,
            validateSplit: this.options.validateSplit || true,
            backupOriginal: this.options.backupOriginal || true
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
            commandType: 'SplitLargeFilesCommand',
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
        
        if (options.maxFileSize < 10000) {
            return 'high';
        } else if (options.maxFileSize < 50000) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    toJSON() {
        return {
            commandId: this.commandId,
            type: 'SplitLargeFilesCommand',
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
        const command = new SplitLargeFilesCommand({
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

    static aggressive(projectPath, options = {}) {
        return new SplitLargeFilesCommand({
            projectPath,
            options: {
                maxFileSize: 10000, // 10KB
                splitStrategy: 'function',
                preserveOriginal: true,
                createIndexFiles: true,
                analyzeDependencies: true,
                validateSplit: true,
                backupOriginal: true,
                ...options
            }
        });
    }

    static conservative(projectPath, options = {}) {
        return new SplitLargeFilesCommand({
            projectPath,
            options: {
                maxFileSize: 100000, // 100KB
                splitStrategy: 'class',
                preserveOriginal: true,
                createIndexFiles: true,
                analyzeDependencies: false,
                validateSplit: true,
                backupOriginal: true,
                ...options
            }
        });
    }

    static scheduled(projectPath, scheduledAt, options = {}) {
        return new SplitLargeFilesCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = SplitLargeFilesCommand; 