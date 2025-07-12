/**
 * VibeCoderModeCommand - Ultimate orchestrator command for all VibeCoder operations
 * Implements the Command pattern for coordinating analyze, refactor, and generate operations
 */
class VibeCoderModeCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 900000; // 15 minutes default
        this.outputFormat = params.outputFormat || 'json';
        this.metadata = params.metadata || {};
        
        this.timestamp = new Date();
        this.commandId = this.generateCommandId();
    }

    validateParams(params) {
        if (!params.projectPath || typeof params.projectPath !== 'string') {
            throw new Error('Project path is required and must be a string');
        }

        if (params.timeout && (typeof params.timeout !== 'number' || params.timeout < 300000)) {
            throw new Error('Timeout must be at least 5 minutes');
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
        return `vibecoder_mode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSummary() {
        return {
            commandId: this.commandId,
            type: 'VibeCoderModeCommand',
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
            includeAnalyze: this.options.includeAnalyze,
            includeRefactor: this.options.includeRefactor,
            includeGenerate: this.options.includeGenerate,
            executionMode: this.options.executionMode,
            outputFormat: this.outputFormat,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        if (this.timeout > 3600000) { // 1 hour
            warnings.push('VibeCoder mode timeout is very high (over 1 hour)');
        }

        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        if (!this.options.includeAnalyze && !this.options.includeRefactor && !this.options.includeGenerate) {
            errors.push('At least one operation type must be enabled');
        }

        if (this.options.executionMode && !['sequential', 'parallel', 'smart'].includes(this.options.executionMode)) {
            errors.push('Invalid execution mode');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getModeOptions() {
        return {
            includeAnalyze: this.options.includeAnalyze !== false, // Default true
            includeRefactor: this.options.includeRefactor || false,
            includeGenerate: this.options.includeGenerate || false,
            executionMode: this.options.executionMode || 'smart', // 'sequential', 'parallel', 'smart'
            analyzeOptions: this.options.analyzeOptions || {},
            refactorOptions: this.options.refactorOptions || {},
            generateOptions: this.options.generateOptions || {},
            validateResults: this.options.validateResults !== false, // Default true
            generateReport: this.options.generateReport !== false, // Default true
            saveResults: this.options.saveResults !== false, // Default true
            backupProject: this.options.backupProject || false,
            rollbackOnFailure: this.options.rollbackOnFailure || false
        };
    }

    getOutputConfiguration() {
        return {
            format: this.outputFormat,
            includeRawData: this.options.includeRawData || false,
            includeRecommendations: this.options.includeRecommendations || true,
            includeMetrics: this.options.includeMetrics || true,
            includeCharts: this.options.includeCharts || false,
            includeTimeline: this.options.includeTimeline || true,
            outputPath: this.options.outputPath
        };
    }

    getMetadata() {
        return {
            ...this.metadata,
            commandType: 'VibeCoderModeCommand',
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

    getModePriority() {
        if (this.options.priority) {
            return this.options.priority;
        }

        const options = this.getModeOptions();
        let priority = 'medium';

        if (options.includeAnalyze && options.includeRefactor && options.includeGenerate) {
            priority = 'high';
        } else if (options.includeRefactor) {
            priority = 'high';
        } else if (options.includeAnalyze && options.includeGenerate) {
            priority = 'medium';
        } else {
            priority = 'low';
        }

        return priority;
    }

    getEstimatedDuration() {
        const options = this.getModeOptions();
        let duration = 0;

        if (options.includeAnalyze) duration += 300000; // 5 minutes
        if (options.includeRefactor) duration += 600000; // 10 minutes
        if (options.includeGenerate) duration += 300000; // 5 minutes

        return Math.min(duration, this.timeout);
    }

    toJSON() {
        return {
            commandId: this.commandId,
            type: 'VibeCoderModeCommand',
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
        const command = new VibeCoderModeCommand({
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
        return new VibeCoderModeCommand({
            projectPath,
            options: {
                includeAnalyze: true,
                includeRefactor: true,
                includeGenerate: true,
                executionMode: 'smart',
                validateResults: true,
                generateReport: true,
                saveResults: true,
                backupProject: true,
                rollbackOnFailure: true,
                ...options
            }
        });
    }

    static analyzeOnly(projectPath, options = {}) {
        return new VibeCoderModeCommand({
            projectPath,
            options: {
                includeAnalyze: true,
                includeRefactor: false,
                includeGenerate: false,
                executionMode: 'sequential',
                validateResults: true,
                generateReport: true,
                saveResults: true,
                ...options
            }
        });
    }

    static refactorOnly(projectPath, options = {}) {
        return new VibeCoderModeCommand({
            projectPath,
            options: {
                includeAnalyze: false,
                includeRefactor: true,
                includeGenerate: false,
                executionMode: 'sequential',
                validateResults: true,
                generateReport: true,
                saveResults: true,
                backupProject: true,
                rollbackOnFailure: true,
                ...options
            }
        });
    }

    static generateOnly(projectPath, options = {}) {
        return new VibeCoderModeCommand({
            projectPath,
            options: {
                includeAnalyze: false,
                includeRefactor: false,
                includeGenerate: true,
                executionMode: 'sequential',
                validateResults: true,
                generateReport: true,
                saveResults: true,
                ...options
            }
        });
    }

    static scheduled(projectPath, scheduledAt, options = {}) {
        return new VibeCoderModeCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = VibeCoderModeCommand; 