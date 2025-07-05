/**
 * Integration tests for CreateTaskCommand
 */
const CreateTaskCommand = require('@/application/commands/CreateTaskCommand');
const CreateTaskHandler = require('@/application/handlers/CreateTaskHandler');
const SQLiteTaskRepository = require('@/infrastructure/database/SQLiteTaskRepository');
const TaskDatabase = require('@/infrastructure/database/TaskDatabase');
const EventBus = require('@/infrastructure/messaging/EventBus');

describe('CreateTaskCommand Integration', () => {
    let taskRepository;
    let eventBus;
    let createTaskHandler;
    let taskDatabase;

    beforeAll(async () => {
        // Initialize database
        taskDatabase = new TaskDatabase(':memory:');
        await taskDatabase.initialize();
        
        // Initialize repository
        taskRepository = new SQLiteTaskRepository(taskDatabase);
        
        // Initialize event bus
        eventBus = new EventBus();
        
        // Initialize handler
        createTaskHandler = new CreateTaskHandler({
            taskRepository,
            eventBus,
            logger: { info: () => {}, error: () => {}, warn: () => {} }
        });
    });

    afterAll(async () => {
        await taskDatabase.close();
    });

    beforeEach(async () => {
        // Clear database before each test
        await taskDatabase.clear();
        
        // Clear event bus
        eventBus.clear();
    });

    describe('Task Creation Flow', () => {
        test('should create task successfully with all required fields', async () => {
            const command = new CreateTaskCommand({
                title: 'Test Task',
                description: 'A test task for integration testing',
                type: 'analysis',
                priority: 'normal',
                createdBy: 'test-user'
            });

            const result = await createTaskHandler.handle(command);

            expect(result.success).toBe(true);
            expect(result.task).toBeDefined();
            expect(result.task.id).toBeDefined();
            expect(result.task.title).toBe('Test Task');
            expect(result.task.description).toBe('A test task for integration testing');
            expect(result.task.type).toBe('analysis');
            expect(result.task.priority).toBe('normal');
            expect(result.task.status).toBe('pending');
            expect(result.task.createdBy).toBe('test-user');
            expect(result.task.createdAt).toBeInstanceOf(Date);
            expect(result.task.updatedAt).toBeInstanceOf(Date);
        });

        test('should create task with minimal required fields', async () => {
            const command = new CreateTaskCommand({
                title: 'Minimal Task',
                type: 'script',
                createdBy: 'test-user'
            });

            const result = await createTaskHandler.handle(command);

            expect(result.success).toBe(true);
            expect(result.task).toBeDefined();
            expect(result.task.title).toBe('Minimal Task');
            expect(result.task.type).toBe('script');
            expect(result.task.description).toBe('');
            expect(result.task.priority).toBe('normal');
            expect(result.task.status).toBe('pending');
        });

        test('should persist task to database', async () => {
            const command = new CreateTaskCommand({
                title: 'Persistent Task',
                type: 'analysis',
                createdBy: 'test-user'
            });

            const result = await createTaskHandler.handle(command);

            // Verify task is persisted
            const savedTask = await taskRepository.findById(result.task.id);
            expect(savedTask).toBeDefined();
            expect(savedTask.title).toBe('Persistent Task');
        });

        test('should emit task created event', async () => {
            const command = new CreateTaskCommand({
                title: 'Event Task',
                type: 'analysis',
                createdBy: 'test-user'
            });

            const eventPromise = new Promise(resolve => {
                eventBus.on('task:created', resolve);
            });

            const result = await createTaskHandler.handle(command);
            const event = await eventPromise;

            expect(event).toBeDefined();
            expect(event.taskId).toBe(result.task.id);
            expect(event.title).toBe('Event Task');
            expect(event.createdBy).toBe('test-user');
        });
    });

    describe('Task Validation', () => {
        test('should reject task with missing title', async () => {
            const command = new CreateTaskCommand({
                type: 'analysis',
                createdBy: 'test-user'
            });

            await expect(createTaskHandler.handle(command))
                .rejects.toThrow('Task title is required');
        });

        test('should reject task with missing type', async () => {
            const command = new CreateTaskCommand({
                title: 'Test Task',
                createdBy: 'test-user'
            });

            await expect(createTaskHandler.handle(command))
                .rejects.toThrow('Task type is required');
        });

        test('should reject task with missing creator', async () => {
            const command = new CreateTaskCommand({
                title: 'Test Task',
                type: 'analysis'
            });

            await expect(createTaskHandler.handle(command))
                .rejects.toThrow('Task creator is required');
        });

        test('should reject task with invalid type', async () => {
            const command = new CreateTaskCommand({
                title: 'Test Task',
                type: 'invalid-type',
                createdBy: 'test-user'
            });

            await expect(createTaskHandler.handle(command))
                .rejects.toThrow('Invalid task type: invalid-type');
        });

        test('should reject task with invalid priority', async () => {
            const command = new CreateTaskCommand({
                title: 'Test Task',
                type: 'analysis',
                priority: 'invalid-priority',
                createdBy: 'test-user'
            });

            await expect(createTaskHandler.handle(command))
                .rejects.toThrow('Invalid task priority: invalid-priority');
        });
    });

    describe('Task Metadata and Dependencies', () => {
        test('should create task with metadata', async () => {
            const command = new CreateTaskCommand({
                title: 'Task with Metadata',
                type: 'analysis',
                createdBy: 'test-user',
                metadata: {
                    complexity: 'high',
                    estimatedHours: '8',
                    tags: ['backend', 'performance']
                }
            });

            const result = await createTaskHandler.handle(command);

            expect(result.task.metadata).toEqual({
                complexity: 'high',
                estimatedHours: '8',
                tags: ['backend', 'performance']
            });
        });

        test('should create task with dependencies', async () => {
            const command = new CreateTaskCommand({
                title: 'Task with Dependencies',
                type: 'analysis',
                createdBy: 'test-user',
                dependencies: ['task-123', 'task-456']
            });

            const result = await createTaskHandler.handle(command);

            expect(result.task.dependencies).toEqual(['task-123', 'task-456']);
        });

        test('should create task with deadline', async () => {
            const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
            
            const command = new CreateTaskCommand({
                title: 'Task with Deadline',
                type: 'analysis',
                createdBy: 'test-user',
                deadline
            });

            const result = await createTaskHandler.handle(command);

            expect(result.task.deadline).toEqual(deadline);
        });
    });

    describe('Task ID Generation', () => {
        test('should generate unique task IDs', async () => {
            const command1 = new CreateTaskCommand({
                title: 'Task 1',
                type: 'analysis',
                createdBy: 'test-user'
            });

            const command2 = new CreateTaskCommand({
                title: 'Task 2',
                type: 'analysis',
                createdBy: 'test-user'
            });

            const result1 = await createTaskHandler.handle(command1);
            const result2 = await createTaskHandler.handle(command2);

            expect(result1.task.id).not.toBe(result2.task.id);
            expect(result1.task.id).toMatch(/^task-/);
            expect(result2.task.id).toMatch(/^task-/);
        });

        test('should use provided task ID if available', async () => {
            const customId = 'custom-task-123';
            
            const command = new CreateTaskCommand({
                id: customId,
                title: 'Custom ID Task',
                type: 'analysis',
                createdBy: 'test-user'
            });

            const result = await createTaskHandler.handle(command);

            expect(result.task.id).toBe(customId);
        });
    });

    describe('Task Status Management', () => {
        test('should set initial status to pending', async () => {
            const command = new CreateTaskCommand({
                title: 'Status Test Task',
                type: 'analysis',
                createdBy: 'test-user'
            });

            const result = await createTaskHandler.handle(command);

            expect(result.task.status).toBe('pending');
        });

        test('should allow custom initial status', async () => {
            const command = new CreateTaskCommand({
                title: 'Custom Status Task',
                type: 'analysis',
                status: 'active',
                createdBy: 'test-user'
            });

            const result = await createTaskHandler.handle(command);

            expect(result.task.status).toBe('active');
        });
    });

    describe('Task Priority Management', () => {
        test('should set default priority to normal', async () => {
            const command = new CreateTaskCommand({
                title: 'Default Priority Task',
                type: 'analysis',
                createdBy: 'test-user'
            });

            const result = await createTaskHandler.handle(command);

            expect(result.task.priority).toBe('normal');
        });

        test('should set custom priority', async () => {
            const command = new CreateTaskCommand({
                title: 'High Priority Task',
                type: 'analysis',
                priority: 'high',
                createdBy: 'test-user'
            });

            const result = await createTaskHandler.handle(command);

            expect(result.task.priority).toBe('high');
        });
    });

    describe('Database Integration', () => {
        test('should handle database connection errors gracefully', async () => {
            // Close database to simulate connection error
            await taskDatabase.close();

            const command = new CreateTaskCommand({
                title: 'Database Error Task',
                type: 'analysis',
                createdBy: 'test-user'
            });

            await expect(createTaskHandler.handle(command))
                .rejects.toThrow();

            // Reinitialize database for other tests
            await taskDatabase.initialize();
        });

        test('should handle concurrent task creation', async () => {
            const commands = Array.from({ length: 10 }, (_, i) => new CreateTaskCommand({
                title: `Concurrent Task ${i}`,
                type: 'analysis',
                createdBy: 'test-user'
            }));

            const results = await Promise.all(
                commands.map(command => createTaskHandler.handle(command))
            );

            expect(results).toHaveLength(10);
            expect(results.every(result => result.success)).toBe(true);

            // Verify all tasks have unique IDs
            const ids = results.map(result => result.task.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(10);
        });
    });

    describe('Event System Integration', () => {
        test('should emit multiple events for complex task creation', async () => {
            const events = [];
            
            eventBus.on('task:created', (event) => events.push({ type: 'created', ...event }));
            eventBus.on('task:status:changed', (event) => events.push({ type: 'status', ...event }));

            const command = new CreateTaskCommand({
                title: 'Complex Task',
                type: 'analysis',
                priority: 'high',
                status: 'active',
                createdBy: 'test-user',
                metadata: { complexity: 'high' },
                dependencies: ['task-123']
            });

            const result = await createTaskHandler.handle(command);

            expect(events).toHaveLength(2);
            expect(events[0].type).toBe('created');
            expect(events[0].taskId).toBe(result.task.id);
            expect(events[1].type).toBe('status');
            expect(events[1].taskId).toBe(result.task.id);
        });

        test('should handle event emission errors gracefully', async () => {
            // Mock event bus to throw error
            const originalEmit = eventBus.emit;
            eventBus.emit = jest.fn().mockImplementation(() => {
                throw new Error('Event emission failed');
            });

            const command = new CreateTaskCommand({
                title: 'Event Error Task',
                type: 'analysis',
                createdBy: 'test-user'
            });

            // Task should still be created even if event emission fails
            const result = await createTaskHandler.handle(command);

            expect(result.success).toBe(true);
            expect(result.task).toBeDefined();

            // Restore original emit function
            eventBus.emit = originalEmit;
        });
    });

    describe('Task Retrieval After Creation', () => {
        test('should be able to retrieve created task', async () => {
            const command = new CreateTaskCommand({
                title: 'Retrievable Task',
                type: 'analysis',
                createdBy: 'test-user'
            });

            const result = await createTaskHandler.handle(command);

            // Retrieve task from repository
            const retrievedTask = await taskRepository.findById(result.task.id);

            expect(retrievedTask).toBeDefined();
            expect(retrievedTask.title).toBe('Retrievable Task');
            expect(retrievedTask.type).toBe('analysis');
        });

        test('should retrieve task with all fields', async () => {
            const metadata = { complexity: 'high', estimatedHours: '8' };
            const dependencies = ['task-123', 'task-456'];
            const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

            const command = new CreateTaskCommand({
                title: 'Full Task',
                description: 'Complete task with all fields',
                type: 'script',
                priority: 'high',
                status: 'active',
                createdBy: 'test-user',
                metadata,
                dependencies,
                deadline
            });

            const result = await createTaskHandler.handle(command);

            // Retrieve and verify all fields
            const retrievedTask = await taskRepository.findById(result.task.id);

            expect(retrievedTask.title).toBe('Full Task');
            expect(retrievedTask.description).toBe('Complete task with all fields');
            expect(retrievedTask.type).toBe('script');
            expect(retrievedTask.priority).toBe('high');
            expect(retrievedTask.status).toBe('active');
            expect(retrievedTask.createdBy).toBe('test-user');
            expect(retrievedTask.metadata).toEqual(metadata);
            expect(retrievedTask.dependencies).toEqual(dependencies);
            expect(retrievedTask.deadline).toEqual(deadline);
        });
    });

    describe('Error Recovery', () => {
        test('should handle partial creation failures', async () => {
            // Mock repository to fail on save but succeed on validation
            const originalSave = taskRepository.save;
            taskRepository.save = jest.fn().mockRejectedValue(new Error('Save failed'));

            const command = new CreateTaskCommand({
                title: 'Failed Task',
                type: 'analysis',
                createdBy: 'test-user'
            });

            await expect(createTaskHandler.handle(command))
                .rejects.toThrow('Save failed');

            // Restore original save function
            taskRepository.save = originalSave;
        });

        test('should handle validation errors before database operations', async () => {
            const command = new CreateTaskCommand({
                title: '', // Invalid empty title
                type: 'analysis',
                createdBy: 'test-user'
            });

            await expect(createTaskHandler.handle(command))
                .rejects.toThrow('Task title cannot be empty');

            // Verify no database operations were performed
            const allTasks = await taskRepository.findAll();
            expect(allTasks).toHaveLength(0);
        });
    });
}); 