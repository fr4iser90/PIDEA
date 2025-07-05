/**
 * VibeCoderGenerateCommand - Wrapper command to orchestrate all generate commands
 * Implements the Command pattern for comprehensive generation
 */
const GenerateTestsCommand = require('../generate/GenerateTestsCommand');
const GenerateDocumentationCommand = require('../generate/GenerateDocumentationCommand');
const GenerateConfigsCommand = require('../generate/GenerateConfigsCommand');
const GenerateScriptsCommand = require('../generate/GenerateScriptsCommand');

class VibeCoderGenerateCommand {
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
        
        // Initialize sub-commands
        this.subCommands = this.initializeSubCommands();
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
        return `vibecoder_generate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    initializeSubCommands() {
        const subCommands = [];
        
        // Generate Tests Command
        if (this.options.generateTests !== false) {
            subCommands.push(
                GenerateTestsCommand.comprehensive(this.projectPath, {
                    ...this.options.testOptions,
                    requestedBy: this.requestedBy,
                    scheduledAt: this.scheduledAt,
                    timeout: this.getSubCommandTimeout('tests'),
                    outputFormat: this.outputFormat,
                    metadata: {
                        ...this.metadata,
                        parentCommandId: this.commandId,
                        subCommandType: 'tests'
                    }
                })
            );
        }

        // Generate Documentation Command
        if (this.options.generateDocumentation !== false) {
            subCommands.push(
                GenerateDocumentationCommand.comprehensive(this.projectPath, {
                    ...this.options.documentationOptions,
                    requestedBy: this.requestedBy,
                    scheduledAt: this.scheduledAt,
                    timeout: this.getSubCommandTimeout('documentation'),
                    outputFormat: this.outputFormat,
                    metadata: {
                        ...this.metadata,
                        parentCommandId: this.commandId,
                        subCommandType: 'documentation'
                    }
                })
            );
        }

        // Generate Configs Command
        if (this.options.generateConfigs !== false) {
            subCommands.push(
                GenerateConfigsCommand.comprehensive(this.projectPath, {
                    ...this.options.configOptions,
                    requestedBy: this.requestedBy,
                    scheduledAt: this.scheduledAt,
                    timeout: this.getSubCommandTimeout('configs'),
                    outputFormat: this.outputFormat,
                    metadata: {
                        ...this.metadata,
                        parentCommandId: this.commandId,
                        subCommandType: 'configs'
                    }
                })
            );
        }

        // Generate Scripts Command
        if (this.options.generateScripts !== false) {
            subCommands.push(
                GenerateScriptsCommand.comprehensive(this.projectPath, {
                    ...this.options.scriptOptions,
                    requestedBy: this.requestedBy,
                    scheduledAt: this.scheduledAt,
                    timeout: this.getSubCommandTimeout('scripts'),
                    outputFormat: this.outputFormat,
                    metadata: {
                        ...this.metadata,
                        parentCommandId: this.commandId,
                        subCommandType: 'scripts'
                    }
                })
            );
        }

        return subCommands;
    }

    getSubCommandTimeout(subCommandType) {
        const timeouts = {
            tests: 300000, // 5 minutes
            documentation: 240000, // 4 minutes
            configs: 120000, // 2 minutes
            scripts: 180000 // 3 minutes
        };
        
        return timeouts[subCommandType] || 120000;
    }

    getSummary() {
        return {
            commandId: this.commandId,
            type: 'VibeCoderGenerateCommand',
            projectPath: this.projectPath,
            scheduledAt: this.scheduledAt,
            timestamp: this.timestamp,
            requestedBy: this.requestedBy,
            subCommandsCount: this.subCommands.length
        };
    }

    getLoggableParams() {
        return {
            projectPath: this.projectPath,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            generateTests: this.options.generateTests,
            generateDocumentation: this.options.generateDocumentation,
            generateConfigs: this.options.generateConfigs,
            generateScripts: this.options.generateScripts,
            outputFormat: this.outputFormat,
            hasMetadata: Object.keys(this.metadata).length > 0,
            subCommandsCount: this.subCommands.length
        };
    }

    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        if (this.timeout > 3600000) { // 60 minutes
            warnings.push('VibeCoder generate timeout is very high (over 60 minutes)');
        }

        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        if (this.subCommands.length === 0) {
            errors.push('At least one generate sub-command must be enabled');
        }

        // Validate sub-commands
        for (const subCommand of this.subCommands) {
            const validation = subCommand.validateBusinessRules();
            if (!validation.isValid) {
                errors.push(`Sub-command ${subCommand.constructor.name} validation failed: ${validation.errors.join(', ')}`);
            }
            warnings.push(...validation.warnings);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getGenerateOptions() {
        return {
            generateTests: this.options.generateTests !== false,
            generateDocumentation: this.options.generateDocumentation !== false,
            generateConfigs: this.options.generateConfigs !== false,
            generateScripts: this.options.generateScripts !== false,
            parallelExecution: this.options.parallelExecution || true,
            stopOnError: this.options.stopOnError || false,
            includeProgress: this.options.includeProgress || true,
            consolidateResults: this.options.consolidateResults || true
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
            commandType: 'VibeCoderGenerateCommand',
            version: '1.0.0',
            createdAt: this.timestamp,
            commandId: this.commandId,
            subCommands: this.subCommands.map(cmd => ({
                type: cmd.constructor.name,
                commandId: cmd.commandId
            }))
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
        const enabledCount = [
            options.generateTests,
            options.generateDocumentation,
            options.generateConfigs,
            options.generateScripts
        ].filter(Boolean).length;

        if (enabledCount === 4) {
            return 'high';
        } else if (enabledCount >= 2) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    getSubCommands() {
        return this.subCommands;
    }

    getSubCommandByType(type) {
        return this.subCommands.find(cmd => {
            const cmdType = cmd.constructor.name.toLowerCase();
            return cmdType.includes(type.toLowerCase());
        });
    }

    toJSON() {
        return {
            commandId: this.commandId,
            type: 'VibeCoderGenerateCommand',
            projectPath: this.projectPath,
            options: this.options,
            requestedBy: this.requestedBy,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            outputFormat: this.outputFormat,
            metadata: this.metadata,
            timestamp: this.timestamp,
            subCommands: this.subCommands.map(cmd => cmd.toJSON())
        };
    }

    static fromJSON(json) {
        const command = new VibeCoderGenerateCommand({
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
        
        // Reconstruct sub-commands from JSON
        if (json.subCommands) {
            command.subCommands = json.subCommands.map(subCmdJson => {
                switch (subCmdJson.type) {
                    case 'GenerateTestsCommand':
                        return GenerateTestsCommand.fromJSON(subCmdJson);
                    case 'GenerateDocumentationCommand':
                        return GenerateDocumentationCommand.fromJSON(subCmdJson);
                    case 'GenerateConfigsCommand':
                        return GenerateConfigsCommand.fromJSON(subCmdJson);
                    case 'GenerateScriptsCommand':
                        return GenerateScriptsCommand.fromJSON(subCmdJson);
                    default:
                        throw new Error(`Unknown sub-command type: ${subCmdJson.type}`);
                }
            });
        }
        
        return command;
    }

    static comprehensive(projectPath, options = {}) {
        return new VibeCoderGenerateCommand({
            projectPath,
            options: {
                generateTests: true,
                generateDocumentation: true,
                generateConfigs: true,
                generateScripts: true,
                parallelExecution: true,
                stopOnError: false,
                includeProgress: true,
                consolidateResults: true,
                testOptions: {
                    testFramework: 'jest',
                    coverageTarget: 90,
                    generateUnitTests: true,
                    generateIntegrationTests: true,
                    generateE2ETests: true
                },
                documentationOptions: {
                    docType: 'comprehensive',
                    includeAPI: true,
                    includeArchitecture: true,
                    includeExamples: true
                },
                configOptions: {
                    configTypes: ['eslint', 'prettier', 'jest', 'webpack', 'babel', 'typescript', 'docker', 'ci'],
                    overwriteExisting: false,
                    includeTemplates: true
                },
                scriptOptions: {
                    scriptTypes: ['build', 'test', 'deploy', 'dev', 'lint', 'format', 'clean', 'setup'],
                    includeCI: true,
                    includeDeployment: true
                },
                ...options
            }
        });
    }

    static testsOnly(projectPath, options = {}) {
        return new VibeCoderGenerateCommand({
            projectPath,
            options: {
                generateTests: true,
                generateDocumentation: false,
                generateConfigs: false,
                generateScripts: false,
                parallelExecution: false,
                stopOnError: true,
                includeProgress: true,
                consolidateResults: true,
                testOptions: {
                    testFramework: 'jest',
                    coverageTarget: 80,
                    generateUnitTests: true,
                    generateIntegrationTests: false,
                    generateE2ETests: false
                },
                ...options
            }
        });
    }

    static scheduled(projectPath, scheduledAt, options = {}) {
        return new VibeCoderGenerateCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = VibeCoderGenerateCommand; 