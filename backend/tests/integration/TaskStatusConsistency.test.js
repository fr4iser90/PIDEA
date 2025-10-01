const TaskContentHashService = require('@domain/services/task/TaskContentHashService');
const TaskEventStore = require('@domain/services/task/TaskEventStore');
const TaskStatusValidator = require('@domain/services/task/TaskStatusValidator');
const TaskFileLocationService = require('@domain/services/task/TaskFileLocationService');

describe('Task Status Management System Integration Tests', () => {
    let contentHashService;
    let eventStore;
    let statusValidator;
    let fileLocationService;
    let mockDatabaseConnection;
    let mockTaskRepository;
    let mockFileSystemService;
    let mockEventBus;

    beforeEach(() => {
        // Mock database connection
        mockDatabaseConnection = {
            query: jest.fn()
        };

        // Mock task repository
        mockTaskRepository = {
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            findByProject: jest.fn()
        };

        // Mock file system service
        mockFileSystemService = {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            exists: jest.fn(),
            mkdir: jest.fn(),
            readdir: jest.fn(),
            rename: jest.fn(),
            rmdir: jest.fn(),
            access: jest.fn()
        };

        // Mock event bus
        mockEventBus = {
            emit: jest.fn()
        };

        // Initialize services
        contentHashService = new TaskContentHashService(mockFileSystemService);
        eventStore = new TaskEventStore(mockDatabaseConnection, mockEventBus);
        fileLocationService = new TaskFileLocationService(mockFileSystemService);
        statusValidator = new TaskStatusValidator(
            mockTaskRepository,
            contentHashService,
            mockFileSystemService,
            eventStore
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('End-to-End Status Synchronization', () => {
        it('should synchronize task status from markdown to database', async () => {
            const taskId = 'task-123';
            const markdownContent = `# Test Task
- **Status**: in_progress
- Progress: 50%

## Description
This is a test task for integration testing.`;

            const mockTask = {
                id: taskId,
                title: 'Test Task',
                status: { value: 'pending' },
                filePath: '/test/path/task.md',
                contentHash: null,
                lastSyncedAt: null
            };

            // Mock repository responses
            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockFileSystemService.readFile.mockResolvedValue(markdownContent);
            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            // Generate content hash
            const contentHash = await contentHashService.generateContentHash(markdownContent);
            
            // Extract status from content
            const extractedStatus = await contentHashService.extractStatusFromContent(markdownContent);
            
            expect(extractedStatus).toBe('in_progress');

            // Validate consistency
            const validationResult = await statusValidator.validateTaskStatusConsistency(taskId);
            
            expect(validationResult.isValid).toBe(false);
            expect(validationResult.issues).toContain('Status mismatch: file shows \'in_progress\', database shows \'pending\'');

            // Auto-fix consistency issues
            const fixResult = await statusValidator.autoFixConsistencyIssues(taskId);
            
            expect(fixResult.success).toBe(true);
            expect(fixResult.fixesApplied).toContain('Updated status from \'pending\' to \'in_progress\'');

            // Verify event recording
            expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO task_file_events'),
                expect.arrayContaining([
                    expect.stringMatching(/^evt_\d+_[a-z0-9]+$/),
                    taskId,
                    'content_hash_validation',
                    null, // fromStatus
                    null, // toStatus
                    null, // fromPath
                    null, // toPath
                    contentHash,
                    false, // isValid
                    expect.stringContaining('"validationMethod":"automatic"'),
                    'system'
                ])
            );
        });

        it('should handle file movement during status transition', async () => {
            const taskId = 'task-123';
            const mockTask = {
                id: taskId,
                title: 'Test Task',
                status: { value: 'pending' },
                priority: { value: 'high' },
                category: 'backend',
                filePath: '/old/path/task.md'
            };

            const oldPath = '/docs/09_roadmap/pending/high/backend/test-task';
            const newPath = '/docs/09_roadmap/in-progress/backend/test-task';

            // Mock repository responses
            mockTaskRepository.findById.mockResolvedValue(mockTask);
            mockFileSystemService.access.mockResolvedValue(); // Path exists
            mockFileSystemService.readdir.mockResolvedValue(['task.md', 'index.md']);
            mockFileSystemService.mkdir.mockResolvedValue();
            mockFileSystemService.rename.mockResolvedValue();
            mockFileSystemService.rmdir.mockResolvedValue();
            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            // Mock file location service methods
            jest.spyOn(fileLocationService, 'findExistingTaskFile').mockResolvedValue(oldPath);
            jest.spyOn(fileLocationService, 'getTaskFilePathForStatus').mockReturnValue(newPath);

            // Move files
            const moveResult = await fileLocationService.moveTaskFiles(oldPath, newPath);

            expect(moveResult.success).toBe(true);
            expect(moveResult.filesMoved).toContain('task.md');
            expect(moveResult.filesMoved).toContain('index.md');

            // Record file movement event
            await eventStore.recordFileMovementEvent(
                taskId,
                oldPath,
                newPath,
                { reason: 'Status transition to in_progress' },
                'system'
            );

            expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO task_file_events'),
                expect.arrayContaining([
                    expect.stringMatching(/^evt_\d+_[a-z0-9]+$/),
                    taskId,
                    'file_movement',
                    null, // fromStatus
                    null, // toStatus
                    oldPath,
                    newPath,
                    null, // contentHash
                    null, // isValid
                    expect.stringContaining('"reason":"Status transition to in_progress"'),
                    'system'
                ])
            );
        });
    });

    describe('Content Hash Validation', () => {
        it('should detect content changes through hash validation', async () => {
            const originalContent = `# Test Task
- **Status**: pending
- Progress: 0%`;

            const modifiedContent = `# Test Task
- **Status**: in_progress
- Progress: 50%`;

            const originalHash = await contentHashService.generateContentHash(originalContent);
            const modifiedHash = await contentHashService.generateContentHash(modifiedContent);

            expect(originalHash).not.toBe(modifiedHash);

            // Validate original content against original hash
            const isValidOriginal = await contentHashService.validateContentHash(originalContent, originalHash);
            expect(isValidOriginal).toBe(true);

            // Validate modified content against original hash
            const isValidModified = await contentHashService.validateContentHash(modifiedContent, originalHash);
            expect(isValidModified).toBe(false);

            // Validate modified content against modified hash
            const isValidModifiedNew = await contentHashService.validateContentHash(modifiedContent, modifiedHash);
            expect(isValidModifiedNew).toBe(true);
        });

        it('should handle content normalization consistently', async () => {
            const content1 = `# Test Task\n- **Status**: pending\n\n\n`;
            const content2 = `# Test Task\n- **Status**: pending\n`;

            const hash1 = await contentHashService.generateContentHash(content1);
            const hash2 = await contentHashService.generateContentHash(content2);

            expect(hash1).toBe(hash2);
        });
    });

    describe('Event Sourcing Integration', () => {
        it('should replay events to reconstruct task state', async () => {
            const taskId = 'task-123';
            const mockEvents = [
                {
                    event_type: 'status_change',
                    from_status: 'pending',
                    to_status: 'in_progress',
                    timestamp: '2025-01-01T10:00:00Z',
                    metadata: '{"reason": "Task started"}'
                },
                {
                    event_type: 'file_movement',
                    from_path: '/old/path',
                    to_path: '/new/path',
                    timestamp: '2025-01-01T11:00:00Z',
                    metadata: '{"reason": "Status transition"}'
                },
                {
                    event_type: 'content_hash_validation',
                    content_hash: 'abc123def456',
                    is_valid: true,
                    timestamp: '2025-01-01T12:00:00Z',
                    metadata: '{"validationMethod": "automatic"}'
                }
            ];

            mockDatabaseConnection.query.mockResolvedValue({ rows: mockEvents });

            const state = await eventStore.replayTaskEvents(taskId);

            expect(state).toMatchObject({
                taskId,
                status: 'in_progress',
                filePath: '/new/path',
                contentHash: 'abc123def456',
                lastUpdated: '2025-01-01T12:00:00Z'
            });
        });

        it('should get event statistics', async () => {
            const mockStats = [
                {
                    event_type: 'status_change',
                    count: '10',
                    first_event: '2025-01-01T00:00:00Z',
                    last_event: '2025-01-01T23:59:59Z'
                },
                {
                    event_type: 'file_movement',
                    count: '5',
                    first_event: '2025-01-01T00:00:00Z',
                    last_event: '2025-01-01T12:00:00Z'
                }
            ];

            mockDatabaseConnection.query.mockResolvedValue({ rows: mockStats });

            const stats = await eventStore.getEventStatistics();

            expect(stats).toMatchObject({
                eventTypes: mockStats,
                totalEvents: 15
            });
        });
    });

    describe('File Location Service Integration', () => {
        it('should resolve task file paths consistently', () => {
            const task = {
                id: 'task-123',
                title: 'Test Task',
                status: 'completed',
                priority: 'high',
                category: 'backend',
                completedAt: '2025-01-01T12:00:00Z'
            };

            const filePath = fileLocationService.getTaskFilePath(task);
            
            expect(filePath).toMatch(/docs\/09_roadmap\/completed\/2025-q1\/backend\/test-task$/);
        });

        it('should normalize task names for file system compatibility', () => {
            const normalizedName = fileLocationService.normalizeTaskName('Test Task with Special Characters!');
            
            expect(normalizedName).toBe('test-task-with-special-characters');
        });

        it('should validate file paths for security', () => {
            const validPath = '/docs/09_roadmap/pending/high/backend/test-task';
            const invalidPath = '../../../etc/passwd';
            
            expect(fileLocationService.validateFilePath(validPath)).toBe(true);
            expect(fileLocationService.validateFilePath(invalidPath)).toBe(false);
        });
    });

    describe('Batch Operations', () => {
        it('should validate multiple tasks for consistency', async () => {
            const taskIds = ['task-1', 'task-2', 'task-3'];
            const mockTasks = [
                {
                    id: 'task-1',
                    title: 'Task 1',
                    status: { value: 'pending' },
                    filePath: '/path1/task.md',
                    contentHash: 'hash1',
                    lastSyncedAt: new Date().toISOString()
                },
                {
                    id: 'task-2',
                    title: 'Task 2',
                    status: { value: 'in_progress' },
                    filePath: '/path2/task.md',
                    contentHash: 'hash2',
                    lastSyncedAt: new Date().toISOString()
                },
                {
                    id: 'task-3',
                    title: 'Task 3',
                    status: { value: 'completed' },
                    filePath: null, // Missing file path
                    contentHash: null, // Missing content hash
                    lastSyncedAt: null // Never synced
                }
            ];

            // Mock repository responses
            mockTaskRepository.findById
                .mockResolvedValueOnce(mockTasks[0])
                .mockResolvedValueOnce(mockTasks[1])
                .mockResolvedValueOnce(mockTasks[2]);

            mockFileSystemService.readFile
                .mockResolvedValueOnce('# Task 1\n- **Status**: pending')
                .mockResolvedValueOnce('# Task 2\n- **Status**: in_progress')
                .mockResolvedValueOnce('# Task 3\n- **Status**: completed');

            const batchResult = await statusValidator.validateBatchTaskStatusConsistency(taskIds);

            expect(batchResult.totalTasks).toBe(3);
            expect(batchResult.validTasks).toBe(2);
            expect(batchResult.invalidTasks).toBe(1);
            expect(batchResult.validationRate).toBeCloseTo(66.67, 1);

            // Check individual results
            const task1Result = batchResult.results.find(r => r.taskId === 'task-1');
            const task2Result = batchResult.results.find(r => r.taskId === 'task-2');
            const task3Result = batchResult.results.find(r => r.taskId === 'task-3');

            expect(task1Result.isValid).toBe(true);
            expect(task2Result.isValid).toBe(true);
            expect(task3Result.isValid).toBe(false);
            expect(task3Result.issues).toContain('Task file not found or unreadable');
        });
    });

    describe('Error Handling', () => {
        it('should handle database connection failures gracefully', async () => {
            mockDatabaseConnection.query.mockRejectedValue(new Error('Database connection failed'));

            await expect(eventStore.recordStatusChangeEvent('task-123', 'pending', 'in_progress'))
                .rejects.toThrow('Database connection failed');
        });

        it('should handle file system errors gracefully', async () => {
            mockFileSystemService.readFile.mockRejectedValue(new Error('File not found'));

            await expect(contentHashService.generateFileHash('/nonexistent/file.md'))
                .rejects.toThrow('File not found');
        });

        it('should handle missing task gracefully', async () => {
            mockTaskRepository.findById.mockResolvedValue(null);

            const result = await statusValidator.validateTaskStatusConsistency('nonexistent-task');

            expect(result.isValid).toBe(false);
            expect(result.issues).toContain('Task not found in database');
        });
    });
});
