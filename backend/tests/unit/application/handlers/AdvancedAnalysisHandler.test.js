/**
 * Unit tests for AdvancedAnalysisHandler
 */
const AdvancedAnalysisHandler = require('@/application/handlers/analyze/AdvancedAnalysisHandler');
const AdvancedAnalysisCommand = require('@/application/commands/analyze/AdvancedAnalysisCommand');
const AdvancedAnalysisService = require('@/domain/services/AdvancedAnalysisService');

// Mock dependencies
jest.mock('@/domain/services/AdvancedAnalysisService');
jest.mock('@/domain/services/LayerValidationService');
jest.mock('@/domain/services/LogicValidationService');
jest.mock('@/domain/services/TaskAnalysisService');
jest.mock('@/domain/repositories/TaskRepository');
jest.mock('@/domain/repositories/TaskExecutionRepository');

describe('AdvancedAnalysisHandler', () => {
    let handler;
    let mockLogger;
    let mockEventBus;
    let mockAdvancedAnalysisService;
    let mockTaskRepository;
    let mockExecutionRepository;
    let mockCommand;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock instances
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockEventBus = {
            emit: jest.fn()
        };

        mockAdvancedAnalysisService = {
            performAdvancedAnalysis: jest.fn(),
            generateAnalysisReport: jest.fn()
        };

        mockTaskRepository = {
            save: jest.fn()
        };

        mockExecutionRepository = {
            save: jest.fn()
        };

        // Create handler instance
        handler = new AdvancedAnalysisHandler({
            logger: mockLogger,
            eventBus: mockEventBus,
            advancedAnalysisService: mockAdvancedAnalysisService,
            taskRepository: mockTaskRepository,
            executionRepository: mockExecutionRepository
        });

        // Create test command
        mockCommand = new AdvancedAnalysisCommand({
            projectPath: '/test/project',
            requestedBy: 'test-user',
            options: {
                includeLayerValidation: true,
                includeLogicValidation: true,
                includeStandardAnalysis: true,
                generateReport: true
            }
        });
    });

    describe('constructor', () => {
        test('should initialize with dependencies', () => {
            expect(handler.handlerId).toMatch(/^advanced-analysis-\d+$/);
            expect(handler.logger).toBe(mockLogger);
            expect(handler.eventBus).toBe(mockEventBus);
            expect(handler.advancedAnalysisService).toBe(mockAdvancedAnalysisService);
            expect(handler.taskRepository).toBe(mockTaskRepository);
            expect(handler.executionRepository).toBe(mockExecutionRepository);
        });

        test('should create default instances when dependencies not provided', () => {
            const defaultHandler = new AdvancedAnalysisHandler();

            expect(defaultHandler.logger).toBe(console);
            expect(defaultHandler.eventBus).toBeDefined();
            expect(defaultHandler.advancedAnalysisService).toBeInstanceOf(AdvancedAnalysisService);
            expect(defaultHandler.taskRepository).toBeDefined();
            expect(defaultHandler.executionRepository).toBeDefined();
        });
    });

    describe('handle', () => {
        test('should handle command successfully', async () => {
            const mockTask = {
                id: 'task-123',
                title: 'Advanced Analysis: /test/project',
                status: 'pending'
            };

            const mockExecution = {
                id: 'execution-123',
                taskId: 'task-123',
                status: 'running'
            };

            const mockAnalysisResult = {
                analysis: {
                    metrics: { overallScore: 85 },
                    layerValidation: { violations: [] },
                    logicValidation: { violations: [] }
                },
                report: { summary: 'Test report' },
                duration: 120000
            };

            mockTaskRepository.save.mockResolvedValue(mockTask);
            mockExecutionRepository.save.mockResolvedValue(mockExecution);
            mockAdvancedAnalysisService.performAdvancedAnalysis.mockResolvedValue(mockAnalysisResult.analysis);
            mockAdvancedAnalysisService.generateAnalysisReport.mockReturnValue(mockAnalysisResult.report);

            const result = await handler.handle(mockCommand);

            expect(result.success).toBe(true);
            expect(result.commandId).toBe(mockCommand.commandId);
            expect(result.executionId).toBe(mockExecution.id);
            expect(result.analysis).toEqual(mockAnalysisResult.analysis);
            expect(result.report).toEqual(mockAnalysisResult.report);
            expect(result.duration).toBe(mockAnalysisResult.duration);

            // Verify task creation
            expect(mockTaskRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Advanced Analysis: /test/project',
                    type: 'analysis',
                    status: 'pending'
                })
            );

            // Verify execution creation
            expect(mockExecutionRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskId: mockTask.id,
                    commandId: mockCommand.commandId,
                    status: 'running'
                })
            );

            // Verify events published
            expect(mockEventBus.emit).toHaveBeenCalledWith('advanced-analysis:started', expect.any(Object));
            expect(mockEventBus.emit).toHaveBeenCalledWith('advanced-analysis:completed', expect.any(Object));
        });

        test('should handle command without report generation', async () => {
            const mockTask = { id: 'task-123', status: 'pending' };
            const mockExecution = { id: 'execution-123', taskId: 'task-123', status: 'running' };
            const mockAnalysisResult = {
                analysis: {
                    metrics: { overallScore: 85 },
                    layerValidation: { violations: [] },
                    logicValidation: { violations: [] }
                },
                duration: 120000
            };

            const commandWithoutReport = new AdvancedAnalysisCommand({
                projectPath: '/test/project',
                requestedBy: 'test-user',
                options: {
                    includeLayerValidation: true,
                    includeLogicValidation: true,
                    includeStandardAnalysis: true,
                    generateReport: false
                }
            });

            mockTaskRepository.save.mockResolvedValue(mockTask);
            mockExecutionRepository.save.mockResolvedValue(mockExecution);
            mockAdvancedAnalysisService.performAdvancedAnalysis.mockResolvedValue(mockAnalysisResult.analysis);

            const result = await handler.handle(commandWithoutReport);

            expect(result.success).toBe(true);
            expect(result.report).toBeNull();
            expect(mockAdvancedAnalysisService.generateAnalysisReport).not.toHaveBeenCalled();
        });

        test('should handle validation errors', async () => {
            const invalidCommand = new AdvancedAnalysisCommand({
                // Missing required fields
            });

            await expect(handler.handle(invalidCommand)).rejects.toThrow('Command validation failed');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'AdvancedAnalysisHandler: Advanced analysis failed',
                expect.objectContaining({
                    commandId: invalidCommand.commandId,
                    error: expect.stringContaining('Command validation failed')
                })
            );
        });

        test('should handle project path validation errors', async () => {
            const fs = require('fs').promises;
            jest.spyOn(fs, 'stat').mockRejectedValue(new Error('ENOENT: no such file or directory'));

            await expect(handler.handle(mockCommand)).rejects.toThrow('Invalid project path');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'AdvancedAnalysisHandler: Advanced analysis failed',
                expect.objectContaining({
                    error: expect.stringContaining('Invalid project path')
                })
            );
        });

        test('should handle analysis service errors', async () => {
            const mockTask = { id: 'task-123', status: 'pending' };
            const mockExecution = { id: 'execution-123', taskId: 'task-123', status: 'running' };

            mockTaskRepository.save.mockResolvedValue(mockTask);
            mockExecutionRepository.save.mockResolvedValue(mockExecution);
            mockAdvancedAnalysisService.performAdvancedAnalysis.mockRejectedValue(
                new Error('Analysis service failed')
            );

            await expect(handler.handle(mockCommand)).rejects.toThrow('Analysis service failed');

            // Verify execution was updated with error
            expect(mockExecutionRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'failed',
                    error: expect.objectContaining({
                        message: 'Analysis service failed'
                    })
                })
            );
        });
    });

    describe('validateCommand', () => {
        test('should validate valid command', async () => {
            const result = await handler.validateCommand(mockCommand);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should fail validation with missing project path', async () => {
            const invalidCommand = new AdvancedAnalysisCommand({
                requestedBy: 'test-user'
            });

            const result = await handler.validateCommand(invalidCommand);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Project path is required');
        });

        test('should fail validation with missing requested by', async () => {
            const invalidCommand = new AdvancedAnalysisCommand({
                projectPath: '/test/project'
            });

            const result = await handler.validateCommand(invalidCommand);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Requested by is required');
        });

        test('should fail validation with invalid timeout', async () => {
            const invalidCommand = new AdvancedAnalysisCommand({
                projectPath: '/test/project',
                requestedBy: 'test-user',
                options: { timeout: 30000 } // 30 seconds
            });

            const result = await handler.validateCommand(invalidCommand);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Timeout must be at least 60 seconds');
        });

        test('should fail validation with invalid export format', async () => {
            const invalidCommand = new AdvancedAnalysisCommand({
                projectPath: '/test/project',
                requestedBy: 'test-user',
                options: { exportFormat: 'invalid' }
            });

            const result = await handler.validateCommand(invalidCommand);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid export format');
        });
    });

    describe('validateProjectPath', () => {
        test('should validate existing directory', async () => {
            const fs = require('fs').promises;
            jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => true });

            await expect(handler.validateProjectPath('/test/project')).resolves.not.toThrow();
        });

        test('should reject non-directory path', async () => {
            const fs = require('fs').promises;
            jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => false });

            await expect(handler.validateProjectPath('/test/file.txt'))
                .rejects.toThrow('Project path must be a directory');
        });

        test('should reject non-existent path', async () => {
            const fs = require('fs').promises;
            jest.spyOn(fs, 'stat').mockRejectedValue(new Error('ENOENT: no such file or directory'));

            await expect(handler.validateProjectPath('/nonexistent/path'))
                .rejects.toThrow('Invalid project path');
        });
    });

    describe('createAnalysisTask', () => {
        test('should create analysis task', async () => {
            const mockTask = {
                id: 'task-123',
                title: 'Advanced Analysis: /test/project',
                status: 'pending'
            };

            mockTaskRepository.save.mockResolvedValue(mockTask);

            const result = await handler.createAnalysisTask(mockCommand);

            expect(result).toEqual(mockTask);
            expect(mockTaskRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Advanced Analysis: /test/project',
                    description: expect.stringContaining('Advanced analysis with'),
                    type: 'analysis',
                    priority: 'medium',
                    status: 'pending',
                    assignedTo: 'test-user',
                    metadata: expect.objectContaining({
                        commandId: mockCommand.commandId,
                        projectPath: '/test/project'
                    })
                })
            );
        });
    });

    describe('createExecutionRecord', () => {
        test('should create execution record', async () => {
            const mockTask = { id: 'task-123' };
            const mockExecution = {
                id: 'execution-123',
                taskId: 'task-123',
                status: 'running'
            };

            mockExecutionRepository.save.mockResolvedValue(mockExecution);

            const result = await handler.createExecutionRecord(mockTask, mockCommand);

            expect(result).toEqual(mockExecution);
            expect(mockExecutionRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskId: 'task-123',
                    commandId: mockCommand.commandId,
                    status: 'running',
                    currentStep: 'Initializing advanced analysis',
                    progress: 0,
                    metadata: expect.objectContaining({
                        handlerId: handler.handlerId,
                        projectPath: '/test/project'
                    })
                })
            );
        });
    });

    describe('publishAnalysisStartedEvent', () => {
        test('should publish analysis started event', async () => {
            const mockExecution = { id: 'execution-123' };

            await handler.publishAnalysisStartedEvent(mockExecution, mockCommand);

            expect(mockEventBus.emit).toHaveBeenCalledWith('advanced-analysis:started', {
                executionId: 'execution-123',
                commandId: mockCommand.commandId,
                projectPath: '/test/project',
                requestedBy: 'test-user',
                timestamp: expect.any(Date)
            });
        });
    });

    describe('performAdvancedAnalysis', () => {
        test('should perform advanced analysis successfully', async () => {
            const mockExecution = { id: 'execution-123' };
            const mockAnalysisResult = {
                analysis: {
                    metrics: { overallScore: 85 },
                    layerValidation: { violations: [] },
                    logicValidation: { violations: [] }
                },
                report: { summary: 'Test report' },
                duration: 120000
            };

            mockAdvancedAnalysisService.performAdvancedAnalysis.mockResolvedValue(mockAnalysisResult.analysis);
            mockAdvancedAnalysisService.generateAnalysisReport.mockReturnValue(mockAnalysisResult.report);

            const result = await handler.performAdvancedAnalysis(mockCommand, mockExecution);

            expect(result.analysis).toEqual(mockAnalysisResult.analysis);
            expect(result.report).toEqual(mockAnalysisResult.report);
            expect(result.duration).toBeGreaterThan(0);
            expect(result.metadata).toEqual({
                handlerId: handler.handlerId,
                executionId: 'execution-123',
                projectPath: '/test/project',
                analysisOptions: mockCommand.getAnalysisOptions(),
                outputConfiguration: mockCommand.getOutputConfiguration()
            });

            // Verify progress updates
            expect(mockExecutionRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ progress: 10 })
            );
            expect(mockExecutionRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ progress: 80 })
            );
            expect(mockExecutionRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ progress: 100 })
            );
        });

        test('should handle analysis service errors', async () => {
            const mockExecution = { id: 'execution-123' };

            mockAdvancedAnalysisService.performAdvancedAnalysis.mockRejectedValue(
                new Error('Analysis failed')
            );

            await expect(handler.performAdvancedAnalysis(mockCommand, mockExecution))
                .rejects.toThrow('Analysis failed');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'AdvancedAnalysisHandler: Advanced analysis failed',
                expect.objectContaining({
                    error: 'Analysis failed'
                })
            );
        });
    });

    describe('updateExecutionRecord', () => {
        test('should update execution record with success', async () => {
            const mockExecution = { id: 'execution-123' };
            const mockResult = {
                analysis: { metrics: { overallScore: 85 } },
                report: { summary: 'Test' },
                duration: 120000,
                metadata: { test: 'data' }
            };

            await handler.updateExecutionRecord(mockExecution, mockResult);

            expect(mockExecution.status).toBe('completed');
            expect(mockExecution.completedAt).toBeInstanceOf(Date);
            expect(mockExecution.duration).toBe(120000);
            expect(mockExecution.result).toEqual({
                success: true,
                analysis: mockResult.analysis,
                report: mockResult.report
            });

            expect(mockExecutionRepository.save).toHaveBeenCalledWith(mockExecution);
        });
    });

    describe('updateExecutionRecordWithError', () => {
        test('should update execution record with error', async () => {
            const mockExecution = { id: 'execution-123' };
            const error = new Error('Test error');

            await handler.updateExecutionRecordWithError(mockExecution, error);

            expect(mockExecution.status).toBe('failed');
            expect(mockExecution.completedAt).toBeInstanceOf(Date);
            expect(mockExecution.error).toEqual({
                message: 'Test error',
                stack: error.stack
            });

            expect(mockExecutionRepository.save).toHaveBeenCalledWith(mockExecution);
        });
    });

    describe('updateTaskStatus', () => {
        test('should update task status with success', async () => {
            const mockTask = { id: 'task-123' };
            const mockResult = {
                analysis: {
                    metrics: { overallScore: 85 },
                    layerValidation: { violations: [] },
                    logicValidation: { violations: [] }
                },
                duration: 120000
            };

            await handler.updateTaskStatus(mockTask, mockResult);

            expect(mockTask.status).toBe('completed');
            expect(mockTask.completedAt).toBeInstanceOf(Date);
            expect(mockTask.duration).toBe(120000);
            expect(mockTask.result).toEqual({
                success: true,
                overallScore: 85,
                violations: 0
            });

            expect(mockTaskRepository.save).toHaveBeenCalledWith(mockTask);
        });
    });

    describe('publishAnalysisCompletedEvent', () => {
        test('should publish analysis completed event', async () => {
            const mockExecution = { id: 'execution-123' };
            const mockResult = {
                analysis: {
                    metrics: { overallScore: 85 },
                    layerValidation: { violations: [] },
                    logicValidation: { violations: [] }
                },
                duration: 120000
            };

            await handler.publishAnalysisCompletedEvent(mockExecution, mockResult, mockCommand);

            expect(mockEventBus.emit).toHaveBeenCalledWith('advanced-analysis:completed', {
                executionId: 'execution-123',
                commandId: mockCommand.commandId,
                projectPath: '/test/project',
                requestedBy: 'test-user',
                duration: 120000,
                overallScore: 85,
                violations: 0,
                timestamp: expect.any(Date)
            });
        });
    });

    describe('updateExecutionProgress', () => {
        test('should update execution progress', async () => {
            const mockExecution = { id: 'execution-123' };

            await handler.updateExecutionProgress(mockExecution, 50, 'Processing analysis');

            expect(mockExecution.progress).toBe(50);
            expect(mockExecution.currentStep).toBe('Processing analysis');
            expect(mockExecution.updatedAt).toBeInstanceOf(Date);

            expect(mockExecutionRepository.save).toHaveBeenCalledWith(mockExecution);
            expect(mockEventBus.emit).toHaveBeenCalledWith('advanced-analysis:progress', {
                executionId: 'execution-123',
                progress: 50,
                step: 'Processing analysis',
                timestamp: expect.any(Date)
            });
        });
    });
}); 