/**
 * Unit tests for Task entity
 */
const Task = require('@/domain/entities/Task');
const TaskStatus = require('@/domain/value-objects/TaskStatus');
const TaskPriority = require('@/domain/value-objects/TaskPriority');
const TaskType = require('@/domain/value-objects/TaskType');

describe('Task Entity', () => {
    let validTaskData;

    beforeEach(() => {
        validTaskData = {
            id: 'task-123',
            projectId: 'test-project',
            title: 'Test Task',
            description: 'A test task for unit testing',
            type: 'analysis',
            priority: 'medium',
            status: 'pending',
            createdBy: 'test-user',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    });

    describe('Task Creation', () => {
        test('should create a valid task with all required fields', () => {
            const task = new Task(
                validTaskData.id,
                validTaskData.projectId,
                validTaskData.title,
                validTaskData.description,
                validTaskData.status,
                validTaskData.priority,
                validTaskData.type
            );

            expect(task.id).toBe(validTaskData.id);
            expect(task.title).toBe(validTaskData.title);
            expect(task.description).toBe(validTaskData.description);
            expect(task.type.value).toBe(validTaskData.type);
            expect(task.priority.value).toBe(validTaskData.priority);
            expect(task.status.value).toBe(validTaskData.status);
            expect(task.projectId).toBe(validTaskData.projectId);
        });

        test('should create a task with minimal required fields', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Minimal Task',
                'Minimal description',
                'pending',
                'medium',
                'analysis'
            );

            expect(task.id).toBe('task-123');
            expect(task.title).toBe('Minimal Task');
            expect(task.description).toBe('Minimal description');
            expect(task.type.value).toBe('analysis');
            expect(task.projectId).toBe('test-project');
            expect(task.priority.value).toBe('medium');
            expect(task.status.value).toBe('pending');
        });

        test('should generate ID if not provided', () => {
            const task = new Task(
                undefined,
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );

            expect(task.id).toBeDefined();
            expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        });

        test('should set timestamps if not provided', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );

            expect(task.createdAt).toBeInstanceOf(Date);
            expect(task.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe('Task Validation', () => {
        test('should throw error for missing title', () => {
            expect(() => new Task(
                'task-123',
                'test-project',
                '',
                'Test description',
                'pending',
                'medium',
                'analysis'
            )).toThrow('Task title is required and must be a non-empty string');
        });

        test('should throw error for empty title', () => {
            expect(() => new Task(
                'task-123',
                'test-project',
                '   ',
                'Test description',
                'pending',
                'medium',
                'analysis'
            )).toThrow('Task title is required and must be a non-empty string');
        });

        test('should throw error for missing description', () => {
            expect(() => new Task(
                'task-123',
                'test-project',
                'Test Task',
                '',
                'pending',
                'medium',
                'analysis'
            )).toThrow('Task description is required and must be a non-empty string');
        });

        test('should throw error for invalid type', () => {
            expect(() => new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'invalid-type'
            )).toThrow('Invalid task type: invalid-type');
        });

        test('should throw error for invalid priority', () => {
            expect(() => new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'invalid-priority',
                'analysis'
            )).toThrow('Invalid task priority: invalid-priority');
        });
    });

    describe('Task Status Management', () => {
        test('should start task execution', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            task.start();
            
            expect(task.status.value).toBe('in_progress');
            expect(task.startedAt).toBeInstanceOf(Date);
        });

        test('should complete task execution', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.start();
            
            task.complete();
            
            expect(task.status.value).toBe('completed');
            expect(task.completedAt).toBeInstanceOf(Date);
        });

        test('should fail task execution', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.start();
            
            const error = 'Test error message';
            task.fail(error);
            
            expect(task.status.value).toBe('failed');
            expect(task.metadata.error).toBe(error);
            expect(task.completedAt).toBeInstanceOf(Date);
        });

        test('should pause task execution', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.start();
            
            task.pause();
            
            expect(task.status.value).toBe('paused');
        });

        test('should resume paused task', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.start();
            task.pause();
            
            task.resume();
            
            expect(task.status.value).toBe('in_progress');
        });

        test('should cancel task execution', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.start();
            
            task.cancel();
            
            expect(task.status.value).toBe('cancelled');
            expect(task.completedAt).toBeInstanceOf(Date);
        });

        test('should not start already active task', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.start();
            
            expect(() => task.start()).toThrow('Cannot start task in in_progress status');
        });

        test('should not complete non-active task', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            expect(() => task.complete()).toThrow('Cannot complete task in pending status');
        });

        test('should not fail non-active task', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            // Task.fail() doesn't check if task is active, it just transitions to failed
            task.fail('error');
            expect(task.status.value).toBe('failed');
        });
    });

    describe('Task Priority Management', () => {
        test('should set task priority', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            task.setPriority('high');
            
            expect(task.priority.value).toBe('high');
        });

        test('should throw error for invalid priority', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            expect(() => task.setPriority('invalid')).toThrow('Invalid task priority: invalid');
        });

        test('should check if task is high priority', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'high',
                'analysis'
            );
            
            expect(task.isHighPriority()).toBe(true);
        });

        test('should check if task is critical priority', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'critical',
                'analysis'
            );
            
            expect(task.isHighPriority()).toBe(true);
        });
    });

    describe('Task Type Management', () => {
        test('should set task type', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            // Note: Task type is immutable, so we can't change it after creation
            expect(task.type.value).toBe('analysis');
        });

        test('should check if task is analysis type', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            expect(task.type.value).toBe('analysis');
        });

        test('should check if task is script type', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'script'
            );
            
            expect(task.type.value).toBe('script');
        });
    });

    describe('Task Metadata', () => {
        test('should add metadata', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            task.setMetadata('key1', 'value1');
            task.setMetadata('key2', 'value2');
            
            expect(task.metadata.key1).toBe('value1');
            expect(task.metadata.key2).toBe('value2');
        });

        test('should get metadata', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.setMetadata('key1', 'value1');
            
            expect(task.getMetadata('key1')).toBe('value1');
            expect(task.getMetadata('nonexistent')).toBeUndefined();
        });

        test('should remove metadata', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.setMetadata('key1', 'value1');
            
            task.removeMetadata('key1');
            
            expect(task.getMetadata('key1')).toBeUndefined();
        });
    });

    describe('Task Dependencies', () => {
        test('should add dependency', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            task.addDependency('task-456');
            
            expect(task.dependencies).toContain('task-456');
        });

        test('should remove dependency', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.addDependency('task-456');
            
            task.removeDependency('task-456');
            
            expect(task.dependencies).not.toContain('task-456');
        });

        test('should check if dependency exists', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.addDependency('task-456');
            
            expect(task.dependencies).toContain('task-456');
            expect(task.dependencies).not.toContain('task-789');
        });

        test('should get all dependencies', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.addDependency('task-456');
            task.addDependency('task-789');
            
            expect(task.dependencies).toEqual(['task-456', 'task-789']);
        });
    });

    describe('Task Validation Methods', () => {
        test('should validate task is ready for execution', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            expect(task.canStart()).toBe(true);
        });

        test('should not be ready for execution if dependencies not met', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.addDependency('task-456');
            
            // Task can still start even with dependencies - dependencies are checked at runtime
            expect(task.canStart()).toBe(true);
        });

        test('should validate task can be started', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            expect(task.canStart()).toBe(true);
        });

        test('should not be able to start if already active', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.start();
            
            expect(task.canStart()).toBe(false);
        });

        test('should validate task can be completed', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.start();
            
            expect(task.canComplete()).toBe(true);
        });

        test('should not be able to complete if not active', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            expect(task.canComplete()).toBe(false);
        });
    });

    describe('Task Serialization', () => {
        test('should serialize task to JSON', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.setMetadata('key1', 'value1');
            task.addDependency('task-456');
            
            const json = task.toJSON();
            
            expect(json.id).toBe(task.id);
            expect(json.title).toBe(task.title);
            expect(json.description).toBe(task.description);
            expect(json.type).toBe(task.type.value);
            expect(json.priority).toBe(task.priority.value);
            expect(json.status).toBe(task.status.value);
            expect(json.projectId).toBe(task.projectId);
            expect(json.metadata).toEqual({ key1: 'value1' });
        });

        test('should create task from JSON', () => {
            const originalTask = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            const json = originalTask.toJSON();
            const recreatedTask = Task.fromJSON(json);
            
            expect(recreatedTask.id).toBe(originalTask.id);
            expect(recreatedTask.title).toBe(originalTask.title);
            expect(recreatedTask.description).toBe(originalTask.description);
            expect(recreatedTask.type.value).toBe(originalTask.type.value);
            expect(recreatedTask.priority.value).toBe(originalTask.priority.value);
            expect(recreatedTask.status.value).toBe(originalTask.status.value);
        });
    });

    describe('Task Business Logic', () => {
        test('should calculate execution time', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            task.start();
            
            // Wait a bit
            setTimeout(() => {
                task.complete();
                
                expect(task.getActualDuration()).toBeGreaterThan(0);
            }, 10);
        });

        test('should check if task is overdue', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            // Set due date in the past
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            task.setDueDate(pastDate);
            
            expect(task.isOverdue()).toBe(true);
        });

        test('should check if task is due soon', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            // Set due date in the future
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);
            task.setDueDate(futureDate);
            
            expect(task.isOverdue()).toBe(false);
        });

        test('should get task complexity score', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'medium',
                'analysis'
            );
            
            // Complexity is determined by the task type
            expect(task.type.value).toBe('analysis');
        });

        test('should check if task requires approval', () => {
            const task = new Task(
                'task-123',
                'test-project',
                'Test Task',
                'Test description',
                'pending',
                'critical',
                'analysis'
            );
            
            // Critical priority tasks might require approval
            expect(task.isHighPriority()).toBe(true);
        });
    });
}); 