/**
 * GenerateTestsCommand - Command to generate comprehensive test suites
 * Implements the Command pattern for test generation
 */
class GenerateTestsCommand {
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
        return `generate_tests_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSummary() {
        return {
            commandId: this.commandId,
            type: 'GenerateTestsCommand',
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
            testFramework: this.options.testFramework,
            coverageTarget: this.options.coverageTarget,
            generateUnitTests: this.options.generateUnitTests,
            generateIntegrationTests: this.options.generateIntegrationTests,
            outputFormat: this.outputFormat,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        if (this.timeout > 1800000) { // 30 minutes
            warnings.push('Test generation timeout is very high (over 30 minutes)');
        }

        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        const validFrameworks = ['jest', 'mocha', 'vitest', 'cypress', 'playwright'];
        if (this.options.testFramework && !validFrameworks.includes(this.options.testFramework)) {
            errors.push(`Invalid test framework. Must be one of: ${validFrameworks.join(', ')}`);
        }

        if (this.options.coverageTarget && (this.options.coverageTarget < 0 || this.options.coverageTarget > 100)) {
            errors.push('Coverage target must be between 0 and 100');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getGenerateOptions() {
        return {
            testFramework: this.options.testFramework || 'jest',
            coverageTarget: this.options.coverageTarget || 80,
            generateUnitTests: this.options.generateUnitTests || true,
            generateIntegrationTests: this.options.generateIntegrationTests || false,
            generateE2ETests: this.options.generateE2ETests || false,
            includeMocks: this.options.includeMocks || true,
            includeFixtures: this.options.includeFixtures || true,
            parallelExecution: this.options.parallelExecution || true,
            watchMode: this.options.watchMode || false,
            customTemplates: this.options.customTemplates || false
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
            commandType: 'GenerateTestsCommand',
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
        
        if (options.generateE2ETests) {
            return 'high';
        } else if (options.generateIntegrationTests) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    toJSON() {
        return {
            commandId: this.commandId,
            type: 'GenerateTestsCommand',
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
        const command = new GenerateTestsCommand({
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
        return new GenerateTestsCommand({
            projectPath,
            options: {
                testFramework: 'jest',
                coverageTarget: 90,
                generateUnitTests: true,
                generateIntegrationTests: true,
                generateE2ETests: true,
                includeMocks: true,
                includeFixtures: true,
                parallelExecution: true,
                watchMode: false,
                customTemplates: false,
                ...options
            }
        });
    }

    static unitOnly(projectPath, options = {}) {
        return new GenerateTestsCommand({
            projectPath,
            options: {
                testFramework: 'jest',
                coverageTarget: 80,
                generateUnitTests: true,
                generateIntegrationTests: false,
                generateE2ETests: false,
                includeMocks: true,
                includeFixtures: true,
                parallelExecution: true,
                watchMode: false,
                customTemplates: false,
                ...options
            }
        });
    }

    static scheduled(projectPath, scheduledAt, options = {}) {
        return new GenerateTestsCommand({
            projectPath,
            scheduledAt,
            options
        });
    }
}

module.exports = GenerateTestsCommand; 