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
            title: 'Test Task',
            description: 'A test task for unit testing',
            type: 'analysis',
            priority: 'normal',
            status: 'pending',
            createdBy: 'test-user',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    });

    describe('Task Creation', () => {
        test('should create a valid task with all required fields', () => {
            const task = new Task(validTaskData);

            expect(task.id).toBe(validTaskData.id);
            expect(task.title).toBe(validTaskData.title);
            expect(task.description).toBe(validTaskData.description);
            expect(task.type.value).toBe(validTaskData.type);
            expect(task.priority.value).toBe(validTaskData.priority);
            expect(task.status.value).toBe(validTaskData.status);
            expect(task.createdBy).toBe(validTaskData.createdBy);
        });

        test('should create a task with minimal required fields', () => {
            const minimalData = {
                id: 'task-123',
                title: 'Minimal Task',
                type: 'analysis',
                createdBy: 'test-user'
            };

            const task = new Task(minimalData);

            expect(task.id).toBe(minimalData.id);
            expect(task.title).toBe(minimalData.title);
            expect(task.type.value).toBe(minimalData.type);
            expect(task.createdBy).toBe(minimalData.createdBy);
            expect(task.description).toBe('');
            expect(task.priority.value).toBe('normal');
            expect(task.status.value).toBe('pending');
        });

        test('should generate ID if not provided', () => {
            const dataWithoutId = { ...validTaskData };
            delete dataWithoutId.id;

            const task = new Task(dataWithoutId);

            expect(task.id).toBeDefined();
            expect(task.id).toMatch(/^task-/);
        });

        test('should set timestamps if not provided', () => {
            const dataWithoutTimestamps = { ...validTaskData };
            delete dataWithoutTimestamps.createdAt;
            delete dataWithoutTimestamps.updatedAt;

            const task = new Task(dataWithoutTimestamps);

            expect(task.createdAt).toBeInstanceOf(Date);
            expect(task.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe('Task Validation', () => {
        test('should throw error for missing title', () => {
            const invalidData = { ...validTaskData };
            delete invalidData.title;

            expect(() => new Task(invalidData)).toThrow('Task title is required');
        });

        test('should throw error for empty title', () => {
            const invalidData = { ...validTaskData, title: '' };

            expect(() => new Task(invalidData)).toThrow('Task title cannot be empty');
        });

        test('should throw error for missing type', () => {
            const invalidData = { ...validTaskData };
            delete invalidData.type;

            expect(() => new Task(invalidData)).toThrow('Task type is required');
        });

        test('should throw error for invalid type', () => {
            const invalidData = { ...validTaskData, type: 'invalid-type' };

            expect(() => new Task(invalidData)).toThrow('Invalid task type: invalid-type');
        });

        test('should throw error for missing createdBy', () => {
            const invalidData = { ...validTaskData };
            delete invalidData.createdBy;

            expect(() => new Task(invalidData)).toThrow('Task creator is required');
        });

        test('should throw error for invalid priority', () => {
            const invalidData = { ...validTaskData, priority: 'invalid-priority' };

            expect(() => new Task(invalidData)).toThrow('Invalid task priority: invalid-priority');
        });
    });

    describe('Task Status Management', () => {
        test('should start task execution', () => {
            const task = new Task(validTaskData);
            
            task.start();
            
            expect(task.status.value).toBe('active');
            expect(task.startedAt).toBeInstanceOf(Date);
        });

        test('should complete task execution', () => {
            const task = new Task(validTaskData);
            task.start();
            
            task.complete();
            
            expect(task.status.value).toBe('completed');
            expect(task.completedAt).toBeInstanceOf(Date);
        });

        test('should fail task execution', () => {
            const task = new Task(validTaskData);
            task.start();
            
            const error = 'Test error message';
            task.fail(error);
            
            expect(task.status.value).toBe('error');
            expect(task.error).toBe(error);
            expect(task.completedAt).toBeInstanceOf(Date);
        });

        test('should pause task execution', () => {
            const task = new Task(validTaskData);
            task.start();
            
            task.pause();
            
            expect(task.status.value).toBe('paused');
        });

        test('should resume paused task', () => {
            const task = new Task(validTaskData);
            task.start();
            task.pause();
            
            task.resume();
            
            expect(task.status.value).toBe('active');
        });

        test('should cancel task execution', () => {
            const task = new Task(validTaskData);
            task.start();
            
            task.cancel();
            
            expect(task.status.value).toBe('cancelled');
            expect(task.completedAt).toBeInstanceOf(Date);
        });

        test('should not start already active task', () => {
            const task = new Task(validTaskData);
            task.start();
            
            expect(() => task.start()).toThrow('Cannot start task that is already active');
        });

        test('should not complete non-active task', () => {
            const task = new Task(validTaskData);
            
            expect(() => task.complete()).toThrow('Cannot complete task that is not active');
        });

        test('should not fail non-active task', () => {
            const task = new Task(validTaskData);
            
            expect(() => task.fail('error')).toThrow('Cannot fail task that is not active');
        });
    });

    describe('Task Priority Management', () => {
        test('should set task priority', () => {
            const task = new Task(validTaskData);
            
            task.setPriority('high');
            
            expect(task.priority.value).toBe('high');
        });

        test('should throw error for invalid priority', () => {
            const task = new Task(validTaskData);
            
            expect(() => task.setPriority('invalid')).toThrow('Invalid task priority: invalid');
        });

        test('should check if task is high priority', () => {
            const task = new Task(validTaskData);
            task.setPriority('high');
            
            expect(task.isHighPriority()).toBe(true);
        });

        test('should check if task is critical priority', () => {
            const task = new Task(validTaskData);
            task.setPriority('critical');
            
            expect(task.isCriticalPriority()).toBe(true);
        });
    });

    describe('Task Type Management', () => {
        test('should set task type', () => {
            const task = new Task(validTaskData);
            
            task.setType('script');
            
            expect(task.type.value).toBe('script');
        });

        test('should throw error for invalid type', () => {
            const task = new Task(validTaskData);
            
            expect(() => task.setType('invalid')).toThrow('Invalid task type: invalid');
        });

        test('should check if task is analysis type', () => {
            const task = new Task(validTaskData);
            
            expect(task.isAnalysisType()).toBe(true);
        });

        test('should check if task is script type', () => {
            const task = new Task(validTaskData);
            task.setType('script');
            
            expect(task.isScriptType()).toBe(true);
        });
    });

    describe('Task Metadata', () => {
        test('should add metadata', () => {
            const task = new Task(validTaskData);
            
            task.addMetadata('key1', 'value1');
            task.addMetadata('key2', 'value2');
            
            expect(task.metadata.key1).toBe('value1');
            expect(task.metadata.key2).toBe('value2');
        });

        test('should get metadata', () => {
            const task = new Task(validTaskData);
            task.addMetadata('key1', 'value1');
            
            expect(task.getMetadata('key1')).toBe('value1');
            expect(task.getMetadata('nonexistent')).toBeUndefined();
        });

        test('should remove metadata', () => {
            const task = new Task(validTaskData);
            task.addMetadata('key1', 'value1');
            
            task.removeMetadata('key1');
            
            expect(task.getMetadata('key1')).toBeUndefined();
        });

        test('should check if metadata exists', () => {
            const task = new Task(validTaskData);
            task.addMetadata('key1', 'value1');
            
            expect(task.hasMetadata('key1')).toBe(true);
            expect(task.hasMetadata('nonexistent')).toBe(false);
        });
    });

    describe('Task Dependencies', () => {
        test('should add dependency', () => {
            const task = new Task(validTaskData);
            
            task.addDependency('task-456');
            
            expect(task.dependencies).toContain('task-456');
        });

        test('should remove dependency', () => {
            const task = new Task(validTaskData);
            task.addDependency('task-456');
            
            task.removeDependency('task-456');
            
            expect(task.dependencies).not.toContain('task-456');
        });

        test('should check if dependency exists', () => {
            const task = new Task(validTaskData);
            task.addDependency('task-456');
            
            expect(task.hasDependency('task-456')).toBe(true);
            expect(task.hasDependency('task-789')).toBe(false);
        });

        test('should get all dependencies', () => {
            const task = new Task(validTaskData);
            task.addDependency('task-456');
            task.addDependency('task-789');
            
            expect(task.getDependencies()).toEqual(['task-456', 'task-789']);
        });
    });

    describe('Task Validation Methods', () => {
        test('should validate task is ready for execution', () => {
            const task = new Task(validTaskData);
            
            expect(task.isReadyForExecution()).toBe(true);
        });

        test('should not be ready for execution if dependencies not met', () => {
            const task = new Task(validTaskData);
            task.addDependency('task-456');
            
            expect(task.isReadyForExecution()).toBe(false);
        });

        test('should validate task can be started', () => {
            const task = new Task(validTaskData);
            
            expect(task.canBeStarted()).toBe(true);
        });

        test('should not be able to start if already active', () => {
            const task = new Task(validTaskData);
            task.start();
            
            expect(task.canBeStarted()).toBe(false);
        });

        test('should validate task can be completed', () => {
            const task = new Task(validTaskData);
            task.start();
            
            expect(task.canBeCompleted()).toBe(true);
        });

        test('should not be able to complete if not active', () => {
            const task = new Task(validTaskData);
            
            expect(task.canBeCompleted()).toBe(false);
        });
    });

    describe('Task Serialization', () => {
        test('should serialize task to JSON', () => {
            const task = new Task(validTaskData);
            task.addMetadata('key1', 'value1');
            task.addDependency('task-456');
            
            const json = task.toJSON();
            
            expect(json.id).toBe(task.id);
            expect(json.title).toBe(task.title);
            expect(json.description).toBe(task.description);
            expect(json.type).toBe(task.type.value);
            expect(json.priority).toBe(task.priority.value);
            expect(json.status).toBe(task.status.value);
            expect(json.createdBy).toBe(task.createdBy);
            expect(json.metadata).toEqual({ key1: 'value1' });
            expect(json.dependencies).toEqual(['task-456']);
            expect(json.createdAt).toBe(task.createdAt.toISOString());
            expect(json.updatedAt).toBe(task.updatedAt.toISOString());
        });

        test('should create task from JSON', () => {
            const task = new Task(validTaskData);
            task.addMetadata('key1', 'value1');
            task.addDependency('task-456');
            
            const json = task.toJSON();
            const newTask = Task.fromJSON(json);
            
            expect(newTask.id).toBe(task.id);
            expect(newTask.title).toBe(task.title);
            expect(newTask.description).toBe(task.description);
            expect(newTask.type.value).toBe(task.type.value);
            expect(newTask.priority.value).toBe(task.priority.value);
            expect(newTask.status.value).toBe(task.status.value);
            expect(newTask.createdBy).toBe(task.createdBy);
            expect(newTask.metadata).toEqual(task.metadata);
            expect(newTask.dependencies).toEqual(task.dependencies);
        });
    });

    describe('Task Business Logic', () => {
        test('should calculate execution time', () => {
            const task = new Task(validTaskData);
            task.start();
            
            // Simulate some time passing
            setTimeout(() => {
                task.complete();
                
                const executionTime = task.getExecutionTime();
                expect(executionTime).toBeGreaterThan(0);
            }, 100);
        });

        test('should check if task is overdue', () => {
            const task = new Task(validTaskData);
            task.start();
            
            // Set deadline to past
            task.deadline = new Date(Date.now() - 1000);
            
            expect(task.isOverdue()).toBe(true);
        });

        test('should check if task is due soon', () => {
            const task = new Task(validTaskData);
            
            // Set deadline to near future
            task.deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
            
            expect(task.isDueSoon()).toBe(true);
        });

        test('should get task complexity score', () => {
            const task = new Task(validTaskData);
            task.addMetadata('complexity', 'high');
            task.addMetadata('estimatedHours', '8');
            
            const complexity = task.getComplexityScore();
            expect(complexity).toBeGreaterThan(0);
        });

        test('should check if task requires approval', () => {
            const task = new Task(validTaskData);
            task.setPriority('critical');
            
            expect(task.requiresApproval()).toBe(true);
        });
    });
}); 