const TaskController = require('@presentation/api/TaskController');
const TaskApplicationService = require('@application/services/TaskApplicationService');

// Mock dependencies
jest.mock('@application/services/TaskApplicationService');
jest.mock('@logging/ServiceLogger');

describe('TaskController - Manual Tasks', () => {
    let taskController;
    let mockTaskApplicationService;

    beforeEach(() => {
        mockTaskApplicationService = {
            getProjectTasks: jest.fn(),
            getTask: jest.fn(),
            syncManualTasks: jest.fn(),
            cleanManualTasks: jest.fn(),
            analyzeProjectForTasks: jest.fn()
        };

        taskController = new TaskController(mockTaskApplicationService);
    });

    describe('getManualTasks', () => {
        it('should return manual tasks only', async () => {
            // Mock taskApplicationService.getProjectTasks
            const mockTasks = [
                { id: '1', title: 'Manual Task 1', type: 'documentation' },
                { id: '2', title: 'Manual Task 2', type: 'documentation' }
            ];
            
            mockTaskApplicationService.getProjectTasks = jest.fn()
                .mockResolvedValue(mockTasks);
            
            const req = { params: { projectId: 'test' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            
            await taskController.getManualTasks(req, res);
            
            expect(mockTaskApplicationService.getProjectTasks)
                .toHaveBeenCalledWith('test', { type: 'documentation' });
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockTasks,
                    count: 2
                })
            );
        });

        it('should handle errors correctly', async () => {
            const error = new Error('Database error');
            mockTaskApplicationService.getProjectTasks = jest.fn()
                .mockRejectedValue(error);
            
            const req = { params: { projectId: 'test' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            
            await taskController.getManualTasks(req, res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Failed to get manual tasks',
                    message: 'Database error'
                })
            );
        });
    });

    describe('getManualTaskDetails', () => {
        it('should return specific manual task', async () => {
            const mockTask = { 
                id: '1', 
                title: 'Manual Task 1', 
                type: 'documentation',
                projectId: 'test'
            };
            
            mockTaskApplicationService.getTask = jest.fn()
                .mockResolvedValue(mockTask);
            
            const req = { params: { projectId: 'test', id: '1' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            
            await taskController.getManualTaskDetails(req, res);
            
            expect(mockTaskApplicationService.getTask)
                .toHaveBeenCalledWith('1', 'test');
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockTask
                })
            );
        });

        it('should reject non-manual tasks', async () => {
            const mockTask = { 
                id: '1', 
                title: 'Regular Task', 
                type: 'feature',
                projectId: 'test'
            };
            
            mockTaskApplicationService.getTask = jest.fn()
                .mockResolvedValue(mockTask);
            
            const req = { params: { projectId: 'test', id: '1' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            
            await taskController.getManualTaskDetails(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Task is not a manual task'
                })
            );
        });

        it('should handle task not found', async () => {
            mockTaskApplicationService.getTask = jest.fn()
                .mockResolvedValue(null);
            
            const req = { params: { projectId: 'test', id: '999' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            
            await taskController.getManualTaskDetails(req, res);
            
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Task not found'
                })
            );
        });

        it('should handle errors correctly', async () => {
            const error = new Error('Database error');
            mockTaskApplicationService.getTask = jest.fn()
                .mockRejectedValue(error);
            
            const req = { params: { projectId: 'test', id: '1' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            
            await taskController.getManualTaskDetails(req, res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Failed to get manual task details',
                    message: 'Database error'
                })
            );
        });
    });

    describe('syncManualTasks', () => {
        it('should sync manual tasks successfully', async () => {
            const mockResult = {
                success: true,
                importedCount: 3,
                projectId: 'test-project',
                message: 'Successfully synced 3 manual tasks'
            };
            mockTaskApplicationService.syncManualTasks = jest.fn()
                .mockResolvedValue(mockResult);

            const req = { params: { projectId: 'test-project' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            await taskController.syncManualTasks(req, res);

            expect(mockTaskApplicationService.syncManualTasks)
                .toHaveBeenCalledWith('test-project', 'user1');
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockResult
                })
            );
        });

        it('should handle errors correctly', async () => {
            const error = new Error('Database error');
            mockTaskApplicationService.syncManualTasks = jest.fn()
                .mockRejectedValue(error);

            const req = { params: { projectId: 'test-project' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            await taskController.syncManualTasks(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Failed to sync manual tasks',
                    message: 'Database error'
                })
            );
        });
    });

    describe('cleanManualTasks', () => {
        it('should clean manual tasks successfully', async () => {
            const mockResult = {
                success: true,
                deletedCount: 5,
                projectId: 'test-project',
                message: 'Successfully cleaned 5 manual tasks'
            };
            mockTaskApplicationService.cleanManualTasks = jest.fn()
                .mockResolvedValue(mockResult);

            const req = { params: { projectId: 'test-project' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            await taskController.cleanManualTasks(req, res);

            expect(mockTaskApplicationService.cleanManualTasks)
                .toHaveBeenCalledWith('test-project', 'user1');
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockResult
                })
            );
        });

        it('should handle errors correctly', async () => {
            const error = new Error('Database error');
            mockTaskApplicationService.cleanManualTasks = jest.fn()
                .mockRejectedValue(error);

            const req = { params: { projectId: 'test-project' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            await taskController.cleanManualTasks(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Failed to clean manual tasks',
                    message: 'Database error'
                })
            );
        });
    });
}); 