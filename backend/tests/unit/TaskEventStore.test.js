const TaskEventStore = require('@domain/services/task/TaskEventStore');

describe('TaskEventStore', () => {
    let eventStore;
    let mockDatabaseConnection;
    let mockEventBus;

    beforeEach(() => {
        mockDatabaseConnection = {
            query: jest.fn()
        };

        mockEventBus = {
            emit: jest.fn()
        };

        eventStore = new TaskEventStore(mockDatabaseConnection, mockEventBus);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('recordStatusChangeEvent', () => {
        it('should record status change event successfully', async () => {
            const taskId = 'task-123';
            const fromStatus = 'pending';
            const toStatus = 'in_progress';
            const metadata = { reason: 'Task started' };
            const userId = 'user-456';

            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            const event = await eventStore.recordStatusChangeEvent(
                taskId, fromStatus, toStatus, metadata, userId
            );

            expect(event).toMatchObject({
                taskId,
                eventType: 'status_change',
                fromStatus,
                toStatus,
                userId
            });

            expect(event.id).toMatch(/^evt_\d+_[a-z0-9]+$/);
            expect(event.timestamp).toBeDefined();
            expect(event.createdAt).toBeDefined();

            expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO task_file_events'),
                expect.arrayContaining([
                    event.id,
                    taskId,
                    'status_change',
                    fromStatus,
                    toStatus,
                    null, // fromPath
                    null, // toPath
                    null, // contentHash
                    null, // isValid
                    JSON.stringify(metadata),
                    userId,
                    event.timestamp,
                    event.createdAt
                ])
            );

            expect(mockEventBus.emit).toHaveBeenCalledWith('task:status:change', event);
        });

        it('should handle errors gracefully', async () => {
            const taskId = 'task-123';
            const fromStatus = 'pending';
            const toStatus = 'in_progress';

            mockDatabaseConnection.query.mockRejectedValue(new Error('Database error'));

            await expect(
                eventStore.recordStatusChangeEvent(taskId, fromStatus, toStatus)
            ).rejects.toThrow('Database error');
        });
    });

    describe('recordFileMovementEvent', () => {
        it('should record file movement event successfully', async () => {
            const taskId = 'task-123';
            const fromPath = '/old/path/task.md';
            const toPath = '/new/path/task.md';
            const metadata = { reason: 'Status transition' };
            const userId = 'user-456';

            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            const event = await eventStore.recordFileMovementEvent(
                taskId, fromPath, toPath, metadata, userId
            );

            expect(event).toMatchObject({
                taskId,
                eventType: 'file_movement',
                fromPath,
                toPath,
                userId
            });

            expect(mockEventBus.emit).toHaveBeenCalledWith('task:file:movement', event);
        });
    });

    describe('recordContentHashValidationEvent', () => {
        it('should record content hash validation event successfully', async () => {
            const taskId = 'task-123';
            const contentHash = 'abc123def456';
            const isValid = true;
            const metadata = { validationMethod: 'automatic' };
            const userId = 'user-456';

            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            const event = await eventStore.recordContentHashValidationEvent(
                taskId, contentHash, isValid, metadata, userId
            );

            expect(event).toMatchObject({
                taskId,
                eventType: 'content_hash_validation',
                contentHash,
                isValid,
                userId
            });

            expect(mockEventBus.emit).toHaveBeenCalledWith('task:content:hash:validation', event);
        });
    });

    describe('getTaskEvents', () => {
        it('should retrieve task events with default options', async () => {
            const taskId = 'task-123';
            const mockEvents = [
                {
                    id: 'evt-1',
                    task_id: taskId,
                    event_type: 'status_change',
                    from_status: 'pending',
                    to_status: 'in_progress',
                    metadata: '{"reason": "Task started"}',
                    timestamp: '2025-01-01T10:00:00Z'
                }
            ];

            mockDatabaseConnection.query.mockResolvedValue({ rows: mockEvents });

            const events = await eventStore.getTaskEvents(taskId);

            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({
                id: 'evt-1',
                task_id: taskId,
                event_type: 'status_change',
                from_status: 'pending',
                to_status: 'in_progress',
                metadata: { reason: 'Task started' }
            });

            expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM task_file_events'),
                expect.arrayContaining([taskId, 100, 0])
            );
        });

        it('should retrieve task events with custom options', async () => {
            const taskId = 'task-123';
            const options = {
                limit: 50,
                offset: 10,
                eventType: 'status_change'
            };

            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            await eventStore.getTaskEvents(taskId, options);

            expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('AND event_type = $2'),
                expect.arrayContaining([taskId, 'status_change', 50, 10])
            );
        });
    });

    describe('getEventsByType', () => {
        it('should retrieve events by type', async () => {
            const eventType = 'status_change';
            const options = { limit: 25, offset: 5 };

            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            await eventStore.getEventsByType(eventType, options);

            expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE event_type = $1'),
                expect.arrayContaining([eventType, 25, 5])
            );
        });

        it('should retrieve events by type with since filter', async () => {
            const eventType = 'status_change';
            const since = '2025-01-01T00:00:00Z';
            const options = { since };

            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            await eventStore.getEventsByType(eventType, options);

            expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('AND timestamp >= $2'),
                expect.arrayContaining([eventType, since])
            );
        });
    });

    describe('replayTaskEvents', () => {
        it('should replay events and reconstruct task state', async () => {
            const taskId = 'task-123';
            const mockEvents = [
                {
                    event_type: 'status_change',
                    from_status: 'pending',
                    to_status: 'in_progress',
                    timestamp: '2025-01-01T10:00:00Z',
                    metadata: '{}'
                },
                {
                    event_type: 'file_movement',
                    from_path: '/old/path',
                    to_path: '/new/path',
                    timestamp: '2025-01-01T11:00:00Z',
                    metadata: '{}'
                },
                {
                    event_type: 'content_hash_validation',
                    content_hash: 'abc123',
                    is_valid: true,
                    timestamp: '2025-01-01T12:00:00Z',
                    metadata: '{}'
                }
            ];

            mockDatabaseConnection.query.mockResolvedValue({ rows: mockEvents });

            const state = await eventStore.replayTaskEvents(taskId);

            expect(state).toMatchObject({
                taskId,
                status: 'in_progress',
                filePath: '/new/path',
                contentHash: 'abc123',
                lastUpdated: '2025-01-01T12:00:00Z'
            });
        });

        it('should replay events until specified timestamp', async () => {
            const taskId = 'task-123';
            const until = new Date('2025-01-01T11:30:00Z');

            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            await eventStore.replayTaskEvents(taskId, until);

            expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('AND timestamp <= $2'),
                expect.arrayContaining([taskId, until.toISOString()])
            );
        });

        it('should return default state for task with no events', async () => {
            const taskId = 'task-123';

            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            const state = await eventStore.replayTaskEvents(taskId);

            expect(state).toMatchObject({
                taskId,
                status: 'pending',
                filePath: null,
                contentHash: null,
                lastUpdated: null
            });
        });
    });

    describe('getEventStatistics', () => {
        it('should return event statistics', async () => {
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

        it('should return event statistics with filters', async () => {
            const options = {
                since: '2025-01-01T12:00:00Z',
                taskId: 'task-123'
            };

            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            await eventStore.getEventStatistics(options);

            expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE timestamp >= $1'),
                expect.arrayContaining([options.since, options.taskId])
            );
        });
    });

    describe('generateEventId', () => {
        it('should generate unique event IDs', () => {
            const id1 = eventStore.generateEventId();
            const id2 = eventStore.generateEventId();

            expect(id1).toMatch(/^evt_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^evt_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });

    describe('error handling', () => {
        it('should handle database errors in getTaskEvents', async () => {
            mockDatabaseConnection.query.mockRejectedValue(new Error('Database connection failed'));

            await expect(eventStore.getTaskEvents('task-123')).rejects.toThrow('Database connection failed');
        });

        it('should handle database errors in replayTaskEvents', async () => {
            mockDatabaseConnection.query.mockRejectedValue(new Error('Database connection failed'));

            await expect(eventStore.replayTaskEvents('task-123')).rejects.toThrow('Database connection failed');
        });

        it('should handle missing task in replayTaskEvents', async () => {
            mockDatabaseConnection.query.mockResolvedValue({ rows: [] });

            const state = await eventStore.replayTaskEvents('nonexistent-task');

            expect(state).toMatchObject({
                taskId: 'nonexistent-task',
                status: 'pending',
                filePath: null,
                contentHash: null,
                lastUpdated: null
            });
        });
    });
});
