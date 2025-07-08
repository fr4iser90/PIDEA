/**
 * Unit tests for AdvancedAnalysisCommand
 */
const AdvancedAnalysisCommand = require('@/application/commands/analyze/AdvancedAnalysisCommand');

describe('AdvancedAnalysisCommand', () => {
    let command;
    const baseParams = {
        projectPath: '/test/project',
        requestedBy: 'test-user',
        scheduledAt: new Date('2024-01-01T10:00:00Z'),
        timeout: 300000,
        options: {
            includeLayerValidation: true,
            includeLogicValidation: true,
            includeStandardAnalysis: true,
            generateReport: true,
            exportFormat: 'json',
            detailedOutput: true
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('should create command with default values', () => {
            command = new AdvancedAnalysisCommand({
                projectPath: '/test/project',
                requestedBy: 'test-user'
            });

            expect(command.commandId).toBeDefined();
            expect(command.projectPath).toBe('/test/project');
            expect(command.requestedBy).toBe('test-user');
            expect(command.scheduledAt).toBeInstanceOf(Date);
            expect(command.timeout).toBe(300000);
            expect(command.options.includeLayerValidation).toBe(true);
            expect(command.options.includeLogicValidation).toBe(true);
            expect(command.options.includeStandardAnalysis).toBe(true);
            expect(command.options.generateReport).toBe(true);
            expect(command.options.exportFormat).toBe('json');
            expect(command.options.detailedOutput).toBe(false);
        });

        test('should create command with custom values', () => {
            command = new AdvancedAnalysisCommand(baseParams);

            expect(command.commandId).toBeDefined();
            expect(command.projectPath).toBe('/test/project');
            expect(command.requestedBy).toBe('test-user');
            expect(command.scheduledAt).toEqual(new Date('2024-01-01T10:00:00Z'));
            expect(command.timeout).toBe(300000);
            expect(command.options.includeLayerValidation).toBe(true);
            expect(command.options.includeLogicValidation).toBe(true);
            expect(command.options.includeStandardAnalysis).toBe(true);
            expect(command.options.generateReport).toBe(true);
            expect(command.options.exportFormat).toBe('json');
            expect(command.options.detailedOutput).toBe(true);
        });

        test('should generate unique command IDs', () => {
            const command1 = new AdvancedAnalysisCommand(baseParams);
            const command2 = new AdvancedAnalysisCommand(baseParams);

            expect(command1.commandId).not.toBe(command2.commandId);
        });
    });

    describe('getAnalysisOptions', () => {
        test('should return analysis options', () => {
            command = new AdvancedAnalysisCommand(baseParams);
            const options = command.getAnalysisOptions();

            expect(options).toEqual({
                includeLayerValidation: true,
                includeLogicValidation: true,
                includeStandardAnalysis: true,
                generateReport: true,
                exportFormat: 'json',
                detailedOutput: true
            });
        });
    });

    describe('getOutputConfiguration', () => {
        test('should return output configuration', () => {
            command = new AdvancedAnalysisCommand(baseParams);
            const config = command.getOutputConfiguration();

            expect(config).toEqual({
                includeRawData: true,
                includeMetrics: true,
                includeViolations: true,
                includeRecommendations: true,
                includeInsights: true,
                exportFormat: 'json'
            });
        });

        test('should handle detailedOutput false', () => {
            command = new AdvancedAnalysisCommand({
                ...baseParams,
                options: { ...baseParams.options, detailedOutput: false }
            });
            const config = command.getOutputConfiguration();

            expect(config.includeRawData).toBe(false);
        });
    });

    describe('getMetadata', () => {
        test('should return command metadata', () => {
            command = new AdvancedAnalysisCommand(baseParams);
            const metadata = command.getMetadata();

            expect(metadata).toEqual({
                commandType: 'AdvancedAnalysis',
                commandId: command.commandId,
                projectPath: '/test/project',
                requestedBy: 'test-user',
                scheduledAt: new Date('2024-01-01T10:00:00Z'),
                timeout: 300000,
                options: command.options
            });
        });
    });

    describe('validateBusinessRules', () => {
        test('should validate valid command', () => {
            command = new AdvancedAnalysisCommand({
                projectPath: '/test/project',
                requestedBy: 'test-user',
                scheduledAt: new Date(Date.now() + 60000), // Future date
                timeout: 300000,
                options: {
                    includeLayerValidation: true,
                    includeLogicValidation: true,
                    includeStandardAnalysis: true,
                    generateReport: true,
                    exportFormat: 'json',
                    detailedOutput: true
                }
            });
            const result = command.validateBusinessRules();

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
        });

        test('should fail validation with missing project path', () => {
            command = new AdvancedAnalysisCommand({
                requestedBy: 'test-user'
            });
            const result = command.validateBusinessRules();

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Project path is required');
        });

        test('should fail validation with missing requested by', () => {
            command = new AdvancedAnalysisCommand({
                projectPath: '/test/project'
            });
            const result = command.validateBusinessRules();

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Requested by is required');
        });

        test('should fail validation with timeout too low', () => {
            command = new AdvancedAnalysisCommand({
                ...baseParams,
                timeout: 30000 // 30 seconds
            });
            const result = command.validateBusinessRules();

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Timeout must be at least 60 seconds');
        });

        test('should warn with timeout too high', () => {
            command = new AdvancedAnalysisCommand({
                projectPath: '/test/project',
                requestedBy: 'test-user',
                scheduledAt: new Date(Date.now() + 60000), // Future date
                timeout: 2000000 // ~33 minutes
            });
            const result = command.validateBusinessRules();

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Analysis timeout is very high (over 30 minutes)');
        });

        test('should fail validation with past scheduled time', () => {
            command = new AdvancedAnalysisCommand({
                ...baseParams,
                scheduledAt: new Date('2020-01-01T10:00:00Z')
            });
            const result = command.validateBusinessRules();

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Scheduled time cannot be in the past');
        });

        test('should fail validation with invalid export format', () => {
            command = new AdvancedAnalysisCommand({
                ...baseParams,
                options: { ...baseParams.options, exportFormat: 'invalid' }
            });
            const result = command.validateBusinessRules();

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid export format. Must be one of: json, markdown, html, pdf');
        });

        test('should warn when no analysis types selected', () => {
            command = new AdvancedAnalysisCommand({
                projectPath: '/test/project',
                requestedBy: 'test-user',
                scheduledAt: new Date(Date.now() + 60000), // Future date
                options: {
                    includeLayerValidation: false,
                    includeLogicValidation: false,
                    includeStandardAnalysis: false
                }
            });
            const result = command.validateBusinessRules();

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('No analysis types selected. At least one analysis type should be enabled.');
        });
    });

    describe('getDescription', () => {
        test('should return description with all analysis types', () => {
            command = new AdvancedAnalysisCommand(baseParams);
            const description = command.getDescription();

            expect(description).toBe('Advanced analysis with Standard, Layer, Logic validation for project: /test/project');
        });

        test('should return description with partial analysis types', () => {
            command = new AdvancedAnalysisCommand({
                ...baseParams,
                options: {
                    includeLayerValidation: true,
                    includeLogicValidation: false,
                    includeStandardAnalysis: false
                }
            });
            const description = command.getDescription();

            expect(description).toBe('Advanced analysis with Layer validation for project: /test/project');
        });
    });

    describe('getEstimatedDuration', () => {
        test('should calculate duration for all analysis types', () => {
            command = new AdvancedAnalysisCommand(baseParams);
            const duration = command.getEstimatedDuration();

            // 1 min (standard) + 1.5 min (layer) + 2 min (logic) + 30 sec (report) = 5 minutes
            expect(duration).toBe(300000);
        });

        test('should calculate duration for partial analysis types', () => {
            command = new AdvancedAnalysisCommand({
                ...baseParams,
                options: {
                    includeLayerValidation: true,
                    includeLogicValidation: false,
                    includeStandardAnalysis: false,
                    generateReport: false
                }
            });
            const duration = command.getEstimatedDuration();

            // 1.5 min (layer) = 90 seconds
            expect(duration).toBe(90000);
        });

        test('should respect timeout limit', () => {
            command = new AdvancedAnalysisCommand({
                ...baseParams,
                timeout: 60000 // 1 minute
            });
            const duration = command.getEstimatedDuration();

            expect(duration).toBe(60000); // Should not exceed timeout
        });
    });

    describe('getResourceRequirements', () => {
        test('should return resource requirements', () => {
            command = new AdvancedAnalysisCommand(baseParams);
            const requirements = command.getResourceRequirements();

            expect(requirements).toEqual({
                memory: '512MB',
                cpu: 'medium',
                disk: '100MB',
                network: 'low'
            });
        });
    });

    describe('getDependencies', () => {
        test('should return empty dependencies', () => {
            command = new AdvancedAnalysisCommand(baseParams);
            const dependencies = command.getDependencies();

            expect(dependencies).toEqual([]);
        });
    });

    describe('getPriority', () => {
        test('should return medium priority', () => {
            command = new AdvancedAnalysisCommand(baseParams);
            const priority = command.getPriority();

            expect(priority).toBe('medium');
        });
    });

    describe('getTags', () => {
        test('should return tags for all analysis types', () => {
            command = new AdvancedAnalysisCommand(baseParams);
            const tags = command.getTags();

            expect(tags).toContain('analysis');
            expect(tags).toContain('advanced');
            expect(tags).toContain('layer-validation');
            expect(tags).toContain('logic-validation');
            expect(tags).toContain('standard-analysis');
        });

        test('should return tags for partial analysis types', () => {
            command = new AdvancedAnalysisCommand({
                ...baseParams,
                options: {
                    includeLayerValidation: true,
                    includeLogicValidation: false,
                    includeStandardAnalysis: false
                }
            });
            const tags = command.getTags();

            expect(tags).toContain('analysis');
            expect(tags).toContain('advanced');
            expect(tags).toContain('layer-validation');
            expect(tags).not.toContain('logic-validation');
            expect(tags).not.toContain('standard-analysis');
        });
    });

    describe('clone', () => {
        test('should clone command with new parameters', () => {
            command = new AdvancedAnalysisCommand(baseParams);
            const clonedCommand = command.clone({
                projectPath: '/new/project',
                options: { includeLayerValidation: false }
            });

            expect(clonedCommand.commandId).not.toBe(command.commandId);
            expect(clonedCommand.projectPath).toBe('/new/project');
            expect(clonedCommand.requestedBy).toBe('test-user');
            expect(clonedCommand.options.includeLayerValidation).toBe(false);
            expect(clonedCommand.options.includeLogicValidation).toBe(true);
        });
    });

    describe('serialize/deserialize', () => {
        test('should serialize and deserialize command', () => {
            command = new AdvancedAnalysisCommand(baseParams);
            const serialized = command.serialize();
            const deserialized = AdvancedAnalysisCommand.deserialize(serialized);

            // Note: commandId will be different because deserialize creates a new command
            expect(deserialized.commandId).toBeDefined();
            expect(deserialized.projectPath).toBe(command.projectPath);
            expect(deserialized.requestedBy).toBe(command.requestedBy);
            expect(deserialized.scheduledAt).toEqual(command.scheduledAt);
            expect(deserialized.timeout).toBe(command.timeout);
            expect(deserialized.options).toEqual(command.options);
        });
    });
}); 