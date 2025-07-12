/**
 * VibeCoderRefactorCommand - Command to orchestrate all refactor commands
 * Implements the Command pattern for comprehensive refactoring orchestration
 */
class VibeCoderRefactorCommand {
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

        if (params.timeout && (typeof params.timeout !== 'number' || params.timeout < 120000)) {
            throw new Error('Timeout must be at least 120 seconds');
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
        return `vibecoder_refactor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSummary() {
        return {
            commandId: this.commandId,
            type: 'VibeCoderRefactorCommand',
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
            refactorTypes: this.getRefactorTypes(),
            outputFormat: this.outputFormat,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        if (this.timeout > 3600000) { // 1 hour
            warnings.push('VibeCoder refactor timeout is very high (over 1 hour)');
        }

        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        const refactorTypes = this.getRefactorTypes();
        if (refactorTypes.length === 0) {
            errors.push('At least one refactor type must be specified');
        }

        if (refactorTypes.length > 4) {
            warnings.push('Many refactor types specified, may take longer');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getRefactorTypes() {
        const types = [];
        
        if (this.options.includeSplitLargeFiles !== false) {
            types.push('split_large_files');
        }
        
        if (this.options.includeOrganizeModules !== false) {
            types.push('organize_modules');
        }
        
        if (this.options.includeCleanDependencies !== false) {
            types.push('clean_dependencies');
        }
        
        if (this.options.includeRestructureArchitecture !== false) {
            types.push('restructure_architecture');
        }

        return types;
    }

    getRefactorConfiguration() {
        return {
            splitLargeFiles: {
                maxFileSize: this.options.splitLargeFiles?.maxFileSize || 50000,
                splitStrategy: this.options.splitLargeFiles?.splitStrategy || 'function',
                outputDirectory: this.options.splitLargeFiles?.outputDirectory || 'refactored',
                preserveOriginal: this.options.splitLargeFiles?.preserveOriginal || true
            },
            organizeModules: {
                organizationStrategy: this.options.organizeModules?.organizationStrategy || 'feature',
                createIndexFiles: this.options.organizeModules?.createIndexFiles || true,
                moveFiles: this.options.organizeModules?.moveFiles || true,
                updateImports: this.options.organizeModules?.updateImports || true
            },
            cleanDependencies: {
                removeUnused: this.options.cleanDependencies?.removeUnused || true,
                updateVersions: this.options.cleanDependencies?.updateVersions || false,
                consolidateDuplicates: this.options.cleanDependencies?.consolidateDuplicates || true,
                checkSecurity: this.options.cleanDependencies?.checkSecurity || true
            },
            restructureArchitecture: {
                detectPatterns: this.options.restructureArchitecture?.detectPatterns || true,
                applyPatterns: this.options.restructureArchitecture?.applyPatterns || false,
                improveCoupling: this.options.restructureArchitecture?.improveCoupling || true,
                enhanceCohesion: this.options.restructureArchitecture?.enhanceCohesion || true
            }
        };
    }

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

    getMetadata() {
        return {
            ...this.metadata,
            commandType: 'VibeCoderRefactorCommand',
            version: '1.0.0',
            createdAt: this.timestamp,
            commandId: this.commandId,
            refactorTypes: this.getRefactorTypes()
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

        const refactorTypes = this.getRefactorTypes();
        if (refactorTypes.length > 3) {
            return 'low';
        } else if (refactorTypes.length > 1) {
            return 'medium';
        } else {
            return 'high';
        }
    }

    getSubCommands() {
        const subCommands = [];
        const refactorTypes = this.getRefactorTypes();
        const config = this.getRefactorConfiguration();

        if (refactorTypes.includes('split_large_files')) {
            subCommands.push({
                type: 'SplitLargeFilesCommand',
                params: {
                    projectPath: this.projectPath,
                    options: config.splitLargeFiles,
                    requestedBy: this.requestedBy,
                    timeout: Math.floor(this.timeout * 0.3), // 30% of total time
                    outputFormat: this.outputFormat,
                    metadata: {
                        parentCommandId: this.commandId,
                        refactorType: 'split_large_files'
                    }
                }
            });
        }

        if (refactorTypes.includes('organize_modules')) {
            subCommands.push({
                type: 'OrganizeModulesCommand',
                params: {
                    projectPath: this.projectPath,
                    options: config.organizeModules,
                    requestedBy: this.requestedBy,
                    timeout: Math.floor(this.timeout * 0.25), // 25% of total time
                    outputFormat: this.outputFormat,
                    metadata: {
                        parentCommandId: this.commandId,
                        refactorType: 'organize_modules'
                    }
                }
            });
        }

        if (refactorTypes.includes('clean_dependencies')) {
            subCommands.push({
                type: 'CleanDependenciesCommand',
                params: {
                    projectPath: this.projectPath,
                    options: config.cleanDependencies,
                    requestedBy: this.requestedBy,
                    timeout: Math.floor(this.timeout * 0.25), // 25% of total time
                    outputFormat: this.outputFormat,
                    metadata: {
                        parentCommandId: this.commandId,
                        refactorType: 'clean_dependencies'
                    }
                }
            });
        }

        if (refactorTypes.includes('restructure_architecture')) {
            subCommands.push({
                type: 'RestructureArchitectureCommand',
                params: {
                    projectPath: this.projectPath,
                    options: config.restructureArchitecture,
                    requestedBy: this.requestedBy,
                    timeout: Math.floor(this.timeout * 0.2), // 20% of total time
                    outputFormat: this.outputFormat,
                    metadata: {
                        parentCommandId: this.commandId,
                        refactorType: 'restructure_architecture'
                    }
                }
            });
        }

        return subCommands;
    }

    toJSON() {
        return {
            commandId: this.commandId,
            type: 'VibeCoderRefactorCommand',
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
        const command = new VibeCoderRefactorCommand({
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
        return new VibeCoderRefactorCommand({
            projectPath,
            options: {
                includeSplitLargeFiles: true,
                includeOrganizeModules: true,
                includeCleanDependencies: true,
                includeRestructureArchitecture: true,
                ...options
            }
        });
    }

    static conservative(projectPath, options = {}) {
        return new VibeCoderRefactorCommand({
            projectPath,
            options: {
                includeSplitLargeFiles: true,
                includeOrganizeModules: true,
                includeCleanDependencies: false,
                includeRestructureArchitecture: false,
                ...options
            }
        });
    }

    static scheduled(projectPath, scheduledAt, options = {}) {
        return new VibeCoderRefactorCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = VibeCoderRefactorCommand; 