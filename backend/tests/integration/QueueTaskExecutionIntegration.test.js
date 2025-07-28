/**
 * QueueTaskExecutionService Integration Tests
 * Tests the integration between QueueTaskExecutionService and other components
 */

const QueueTaskExecutionService = require('../../domain/services/queue/QueueTaskExecutionService');
const TaskService = require('../../domain/services/task/TaskService');
const TaskApplicationService = require('../../application/services/TaskApplicationService');
const ServiceLogger = require('@logging/ServiceLogger');

// Mock dependencies
jest.mock('@logging/ServiceLogger');

describe('QueueTaskExecutionService Integration', () => {
    let queueTaskExecutionService;
    let taskService;
    let taskApplicationService;
    let mockTaskRepository;
    let mockQueueMonitoringService;
    let mockEventBus;
    let mockLogger;

    beforeEach(async () => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock dependencies
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn()
        };

        mockTaskRepository = {
            findById: jest.fn(),
            clear: jest.fn()
        };

        mockQueueMonitoringService = {
            addToProjectQueue: jest.fn(),
            getProjectQueue: jest.fn(),
            updateQueueItem: jest.fn(),
            clearQueue: jest.fn()
        };

        mockEventBus = {
            emit: jest.fn(),
            on: jest.fn()
        };

        // Create services manually
        queueTaskExecutionService = new QueueTaskExecutionService({
            queueMonitoringService: mockQueueMonitoringService,
            taskRepository: mockTaskRepository,
            eventBus: mockEventBus,
            logger: mockLogger
        });

        taskService = new TaskService(
            mockTaskRepository,
            null, // aiService
            null, // projectAnalyzer
            null, // cursorIDEService
            null, // autoFinishSystem
            null, // workflowGitService
            queueTaskExecutionService
        );

        // Set the logger on taskService
        taskService.logger = mockLogger;

        taskApplicationService = new TaskApplicationService(
            taskService,
            mockTaskRepository,
            mockLogger
        );

        // Set the taskService property directly
        taskApplicationService.taskService = taskService;
    });

    describe('TaskService Integration', () => {
        it('should use QueueTaskExecutionService when executing tasks', async () => {
            // Arrange
            const mockTask = {
                id: 'test-task-1',
                title: 'Test Task',
                description: 'Test task description',
                projectId: 'test-project-1',
                status: 'pending',
                isCompleted: () => false
            };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockQueueMonitoringService.addToProjectQueue
                .mockResolvedValue({ queueId: 'queue-1', status: 'queued' });

            // Act
            const result = await taskService.executeTask('test-task-1', 'user-1', {
                projectId: 'test-project-1'
            });

            // Assert
            expect(mockQueueMonitoringService.addToProjectQueue).toHaveBeenCalledWith(
                'test-project-1',
                'user-1',
                expect.any(Object), // workflow
                expect.any(Object), // context
                expect.objectContaining({
                    priority: 'normal',
                    taskId: 'test-task-1'
                })
            );

            expect(result).toEqual({
                success: true,
                message: 'Task "Test Task" added to queue for execution',
                status: 'queued',
                taskId: 'test-task-1',
                queueItemId: undefined,
                position: undefined,
                estimatedStartTime: undefined
            });
        });

        it('should handle task execution errors gracefully', async () => {
            // Arrange
            mockTaskRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(
                taskService.executeTask('non-existent-task', 'user-1', {
                    projectId: 'test-project-1'
                })
            ).rejects.toThrow('Task not found');
        });
    });

    describe('TaskApplicationService Integration', () => {
        it('should handle queue-based task execution responses', async () => {
            // Arrange
            const mockTask = {
                id: 'test-task-2',
                title: 'Test Task 2',
                description: 'Test task description 2',
                projectId: 'test-project-2',
                status: 'pending',
                isCompleted: () => false,
                belongsToProject: jest.fn().mockReturnValue(true)
            };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockQueueMonitoringService.addToProjectQueue
                .mockResolvedValue({ queueId: 'queue-2', status: 'queued' });

            // Act
            const result = await taskApplicationService.executeTask(
                'test-task-2',
                'test-project-2',
                'user-2',
                { priority: 'high' }
            );

            // Assert
            expect(result).toEqual({
                message: 'Task "Test Task 2" added to queue for execution',
                status: 'queued',
                taskId: 'test-task-2',
                queueItemId: undefined,
                position: undefined,
                estimatedStartTime: undefined,
                queuedAt: expect.any(String)
            });
        });
    });

    describe('Event System Integration', () => {
        it('should emit events when tasks are added to queue', async () => {
            // Arrange
            const mockTask = {
                id: 'test-task-3',
                title: 'Test Task 3',
                description: 'Test task description 3',
                projectId: 'test-project-3',
                status: 'pending',
                isCompleted: () => false
            };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockQueueMonitoringService.addToProjectQueue
                .mockResolvedValue({ queueId: 'queue-3', status: 'queued' });

            // Act
            await queueTaskExecutionService.addTaskToQueue(
                'test-project-3',
                'user-3',
                'test-task-3',
                { priority: 'medium' }
            );

            // Assert
            expect(mockEventBus.emit).toHaveBeenCalledWith(
                'queue:item:added',
                expect.objectContaining({
                    projectId: 'test-project-3',
                    userId: 'user-3',
                    taskId: 'test-task-3',
                    item: { queueId: 'queue-3', status: 'queued' }
                })
            );
        });
    });

    describe('Queue Status Integration', () => {
        it('should provide accurate queue status information', async () => {
            // Arrange
            const mockTask = {
                id: 'test-task-4',
                title: 'Test Task 4',
                description: 'Test task description 4',
                projectId: 'test-project-4',
                status: 'pending',
                isCompleted: () => false
            };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockQueueMonitoringService.addToProjectQueue
                .mockResolvedValue({ queueId: 'queue-4', status: 'queued' });

            // Add task to queue
            await queueTaskExecutionService.addTaskToQueue(
                'test-project-4',
                'user-4',
                'test-task-4'
            );

            // Mock queue status
            mockQueueMonitoringService.getProjectQueue
                .mockReturnValue([
                    {
                        id: 'queue-4',
                        taskId: 'test-task-4',
                        status: 'queued',
                        priority: 'normal',
                        createdAt: new Date()
                    }
                ]);

            // Act
            const status = await queueTaskExecutionService.getTaskExecutionStatus(
                'test-project-4',
                'queue-4'
            );

            // Assert
            expect(status).toEqual({
                queueItemId: 'queue-4',
                projectId: 'test-project-4',
                status: 'queued',
                progress: 0,
                currentStep: 0,
                totalSteps: 0,
                startedAt: undefined,
                completedAt: undefined,
                error: undefined,
                position: undefined,
                estimatedStartTime: undefined,
                lastUpdated: undefined
            });
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle queue service failures gracefully', async () => {
            // Arrange
            const mockTask = {
                id: 'test-task-5',
                title: 'Test Task 5',
                description: 'Test task description 5',
                projectId: 'test-project-5',
                status: 'pending',
                isCompleted: () => false
            };

            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockQueueMonitoringService.addToProjectQueue
                .mockRejectedValue(new Error('Queue service unavailable'));

            // Act & Assert
            await expect(
                queueTaskExecutionService.addTaskToQueue(
                    'test-project-5',
                    'user-5',
                    'test-task-5'
                )
            ).rejects.toThrow('Queue service unavailable');
        });

        it('should handle missing dependencies gracefully', async () => {
            // Arrange
            const serviceWithoutDependencies = new QueueTaskExecutionService({
                taskRepository: mockTaskRepository
                // Missing queueMonitoringService
            });

            // Mock task to exist
            mockTaskRepository.findById.mockResolvedValue({
                id: 'test-task-6',
                title: 'Test Task 6',
                description: 'Test task description 6',
                projectId: 'test-project-6',
                status: 'pending',
                isCompleted: () => false
            });

            // Act & Assert
            await expect(
                serviceWithoutDependencies.addTaskToQueue(
                    'test-project-6',
                    'user-6',
                    'test-task-6'
                )
            ).rejects.toThrow('Cannot read properties of undefined (reading \'addToProjectQueue\')');
        });
    });
}); 