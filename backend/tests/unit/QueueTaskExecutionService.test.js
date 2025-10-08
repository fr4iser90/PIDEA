/**
 * QueueTaskExecutionService Unit Tests
 */

const QueueTaskExecutionService = require('../../domain/services/queue/QueueTaskExecutionService');
const ServiceLogger = require('@logging/ServiceLogger');

// Mock dependencies
jest.mock('@logging/ServiceLogger');

describe('QueueTaskExecutionService', () => {
    let queueTaskExecutionService;
    let mockTaskQueueStore;
    let mockTaskRepository;
    let mockEventBus;
    let mockWorkflowLoaderService;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock dependencies
        mockTaskQueueStore = {
            addToProjectQueue: jest.fn(),
            getProjectQueue: jest.fn(),
            updateQueueItem: jest.fn()
        };

        mockTaskRepository = {
            findById: jest.fn()
        };

        mockEventBus = {
            emit: jest.fn()
        };

        mockWorkflowLoaderService = {
            loadWorkflows: jest.fn(),
            getWorkflow: jest.fn()
        };

        // Mock WorkflowLoaderService require
        jest.doMock('../../domain/services/workflow/WorkflowLoaderService', () => {
            return jest.fn().mockImplementation(() => mockWorkflowLoaderService);
        });

        // Create service instance
        queueTaskExecutionService = new QueueTaskExecutionService({
            taskQueueStore: mockTaskQueueStore,
            taskRepository: mockTaskRepository,
            eventBus: mockEventBus,
            workflowLoaderService: mockWorkflowLoaderService
        });
    });

    describe('addTaskToQueue', () => {
        const mockTask = {
            id: 'task-123',
            title: 'Test Task',
            description: 'Test Description',
            type: { value: 'feature' },
            metadata: {}
        };

        const mockWorkflow = {
            name: 'standard-task-workflow',
            steps: [
                { id: 'step1', name: 'Step 1' },
                { id: 'step2', name: 'Step 2' }
            ]
        };

        const mockQueueItem = {
            id: 'queue-item-123',
            projectId: 'project-456',
            userId: 'user-789',
            status: 'queued',
            position: 1,
            estimatedStartTime: new Date().toISOString()
        };

        it('should add task to queue successfully', async () => {
            // Arrange
            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockWorkflowLoaderService.loadWorkflows.mockResolvedValue();
            mockWorkflowLoaderService.getWorkflow.mockReturnValue(mockWorkflow);
            mockTaskQueueStore.addToProjectQueue.mockResolvedValue(mockQueueItem);

            // Act
            const result = await queueTaskExecutionService.addTaskToQueue(
                'project-456',
                'user-789',
                'task-123',
                { priority: 'high' }
            );

            // Assert
            expect(mockTaskRepository.findById).toHaveBeenCalledWith('task-123');
            expect(mockWorkflowLoaderService.loadWorkflows).toHaveBeenCalled();
            expect(mockWorkflowLoaderService.getWorkflow).toHaveBeenCalledWith('standard-task-workflow');
            expect(mockTaskQueueStore.addToProjectQueue).toHaveBeenCalledWith(
                'project-456',
                'user-789',
                mockWorkflow,
                expect.objectContaining({
                    task: mockTask,
                    taskId: 'task-123',
                    projectId: 'project-456',
                    userId: 'user-789'
                }),
                expect.objectContaining({
                    priority: 'high',
                    taskId: 'task-123',
                    taskType: 'feature'
                })
            );
            expect(mockEventBus.emit).toHaveBeenCalledWith('queue:item:added', {
                projectId: 'project-456',
                userId: 'user-789',
                item: mockQueueItem,
                taskId: 'task-123',
                taskType: 'feature'
            });
            expect(result).toEqual({
                success: true,
                taskId: 'task-123',
                queueItemId: 'queue-item-123',
                status: 'queued',
                position: 1,
                estimatedStartTime: mockQueueItem.estimatedStartTime,
                message: 'Task "Test Task" added to queue for execution'
            });
        });

        it('should throw error when task not found', async () => {
            // Arrange
            mockTaskRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(
                queueTaskExecutionService.addTaskToQueue('project-456', 'user-789', 'task-123')
            ).rejects.toThrow('Task not found: task-123');
        });

        it('should throw error when workflow not found', async () => {
            // Arrange
            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockWorkflowLoaderService.loadWorkflows.mockResolvedValue();
            mockWorkflowLoaderService.getWorkflow.mockReturnValue(null);

            // Act & Assert
            await expect(
                queueTaskExecutionService.addTaskToQueue('project-456', 'user-789', 'task-123')
            ).rejects.toThrow('Standard task workflow not found');
        });

        it('should throw error when queueTaskExecutionService not available', async () => {
            // Arrange
            const serviceWithoutQueue = new QueueTaskExecutionService({
                taskRepository: mockTaskRepository,
                eventBus: mockEventBus
            });

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockWorkflowLoaderService.loadWorkflows.mockResolvedValue();
            mockWorkflowLoaderService.getWorkflow.mockReturnValue(null);

            // Act & Assert
            await expect(
                serviceWithoutQueue.addTaskToQueue('project-456', 'user-789', 'task-123')
            ).rejects.toThrow('Standard task workflow not found');
        });
    });

    describe('getTaskExecutionStatus', () => {
        const mockQueueItem = {
            id: 'queue-item-123',
            status: 'running',
            workflow: {
                progress: 50,
                currentStep: 1,
                steps: [
                    { id: 'step1', name: 'Step 1', status: 'completed', progress: 100 },
                    { id: 'step2', name: 'Step 2', status: 'running', progress: 50 }
                ]
            },
            startedAt: new Date().toISOString(),
            position: 1,
            estimatedStartTime: new Date().toISOString()
        };

        it('should get task execution status successfully', async () => {
            // Arrange
            mockTaskQueueStore.getProjectQueue.mockReturnValue([mockQueueItem]);

            // Act
            const result = await queueTaskExecutionService.getTaskExecutionStatus(
                'project-456',
                'queue-item-123'
            );

            // Assert
            expect(mockTaskQueueStore.getProjectQueue).toHaveBeenCalledWith('project-456');
            expect(result).toEqual({
                queueItemId: 'queue-item-123',
                projectId: 'project-456',
                status: 'running',
                progress: 50,
                currentStep: 1,
                totalSteps: 2,
                startedAt: mockQueueItem.startedAt,
                position: 1,
                estimatedStartTime: mockQueueItem.estimatedStartTime,
                lastUpdated: mockQueueItem.addedAt,
                steps: [
                    {
                        id: 'step1',
                        name: 'Step 1',
                        status: 'completed',
                        progress: 100,
                        startedAt: undefined,
                        completedAt: undefined,
                        error: undefined
                    },
                    {
                        id: 'step2',
                        name: 'Step 2',
                        status: 'running',
                        progress: 50,
                        startedAt: undefined,
                        completedAt: undefined,
                        error: undefined
                    }
                ]
            });
        });

        it('should throw error when queue item not found', async () => {
            // Arrange
            mockTaskQueueStore.getProjectQueue.mockReturnValue([]);

            // Act & Assert
            await expect(
                queueTaskExecutionService.getTaskExecutionStatus('project-456', 'queue-item-123')
            ).rejects.toThrow('Queue item queue-item-123 not found');
        });
    });

    describe('cancelTaskExecution', () => {
        const mockUpdatedItem = {
            id: 'queue-item-123',
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'user-789'
        };

        it('should cancel task execution successfully', async () => {
            // Arrange
            mockTaskQueueStore.updateQueueItem.mockResolvedValue(mockUpdatedItem);

            // Act
            const result = await queueTaskExecutionService.cancelTaskExecution(
                'project-456',
                'queue-item-123',
                'user-789'
            );

            // Assert
            expect(mockTaskQueueStore.updateQueueItem).toHaveBeenCalledWith(
                'project-456',
                'queue-item-123',
                {
                    status: 'cancelled',
                    cancelledAt: expect.any(String),
                    cancelledBy: 'user-789'
                }
            );
            expect(mockEventBus.emit).toHaveBeenCalledWith('queue:item:cancelled', {
                projectId: 'project-456',
                userId: 'user-789',
                item: mockUpdatedItem,
                cancelledBy: 'user-789'
            });
            expect(result).toEqual({
                success: true,
                queueItemId: 'queue-item-123',
                status: 'cancelled',
                message: 'Task execution cancelled successfully'
            });
        });
    });

    describe('getProjectTaskExecutions', () => {
        const mockQueueItems = [
            {
                id: 'queue-item-1',
                context: { taskId: 'task-1' },
                status: 'running',
                workflow: { progress: 50, currentStep: 1, steps: [] },
                addedAt: new Date().toISOString(),
                startedAt: new Date().toISOString()
            },
            {
                id: 'queue-item-2',
                options: { taskId: 'task-2' },
                status: 'completed',
                workflow: { progress: 100, currentStep: 2, steps: [] },
                addedAt: new Date().toISOString(),
                completedAt: new Date().toISOString()
            }
        ];

        it('should get project task executions successfully', async () => {
            // Arrange
            mockTaskQueueStore.getProjectQueue.mockReturnValue(mockQueueItems);

            // Act
            const result = await queueTaskExecutionService.getProjectTaskExecutions(
                'project-456',
                'user-789'
            );

            // Assert
            expect(mockTaskQueueStore.getProjectQueue).toHaveBeenCalledWith('project-456');
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                queueItemId: 'queue-item-1',
                taskId: 'task-1',
                status: 'running',
                progress: 50,
                currentStep: 1,
                totalSteps: 0,
                addedAt: mockQueueItems[0].addedAt,
                startedAt: mockQueueItems[0].startedAt,
                completedAt: undefined,
                cancelledAt: undefined,
                error: undefined,
                position: undefined
            });
            expect(result[1]).toEqual({
                queueItemId: 'queue-item-2',
                taskId: 'task-2',
                status: 'completed',
                progress: 100,
                currentStep: 2,
                totalSteps: 0,
                addedAt: mockQueueItems[1].addedAt,
                startedAt: undefined,
                completedAt: mockQueueItems[1].completedAt,
                cancelledAt: undefined,
                error: undefined,
                position: undefined
            });
        });
    });
}); 