const TaskController = require('@presentation/api/TaskController');
const TaskApplicationService = require('@application/services/TaskApplicationService');

// Mock dependencies
jest.mock('@application/services/TaskApplicationService');
jest.mock('@logging/ServiceLogger');

describe('TaskController - Docs Tasks', () => {
    let taskController;
    let mockTaskApplicationService;

    beforeEach(() => {
        mockTaskApplicationService = {
            getProjectTasks: jest.fn(),
            getTask: jest.fn(),
            syncDocsTasks: jest.fn(),
            analyzeProjectForTasks: jest.fn()
        };

        taskController = new TaskController(mockTaskApplicationService);
    });

    describe('getDocsTasks', () => {
        it('should return docs tasks only', async () => {
            // Mock taskApplicationService.getProjectTasks
            const mockTasks = [
                { id: '1', title: 'Docs Task 1', type: 'documentation' },
                { id: '2', title: 'Docs Task 2', type: 'documentation' }
            ];
            
            mockTaskApplicationService.getProjectTasks = jest.fn()
                .mockResolvedValue(mockTasks);
            
            const req = { params: { projectId: 'test' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            
            await taskController.getDocsTasks(req, res);
            
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
            
            await taskController.getDocsTasks(req, res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Failed to get docs tasks',
                    message: 'Database error'
                })
            );
        });
    });

    describe('getDocsTaskDetails', () => {
        it('should return specific docs task', async () => {
            const mockTask = { 
                id: '1', 
                title: 'Docs Task 1', 
                type: 'documentation',
                projectId: 'test'
            };
            
            mockTaskApplicationService.getTask = jest.fn()
                .mockResolvedValue(mockTask);
            
            const req = { params: { projectId: 'test', id: '1' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            
            await taskController.getDocsTaskDetails(req, res);
            
            expect(mockTaskApplicationService.getTask)
                .toHaveBeenCalledWith('1', 'test');
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockTask
                })
            );
        });

        it('should reject non-docs tasks', async () => {
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
            
            await taskController.getDocsTaskDetails(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Task is not a documentation task'
                })
            );
        });

        it('should handle task not found', async () => {
            mockTaskApplicationService.getTask = jest.fn()
                .mockResolvedValue(null);
            
            const req = { params: { projectId: 'test', id: '999' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            
            await taskController.getDocsTaskDetails(req, res);
            
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
            
            await taskController.getDocsTaskDetails(req, res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Failed to get docs task details',
                    message: 'Database error'
                })
            );
        });
    });

    describe('cleanDocsTasks', () => {
        it('should clean docs tasks successfully', async () => {
            const mockResult = {
                success: true,
                deletedCount: 5,
                projectId: 'test-project',
                message: 'Successfully cleaned 5 documentation tasks'
            };
            mockTaskApplicationService.cleanDocsTasks = jest.fn()
                .mockResolvedValue(mockResult);

            const req = { params: { projectId: 'test-project' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            await taskController.cleanDocsTasks(req, res);

            expect(mockTaskApplicationService.cleanDocsTasks)
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
            mockTaskApplicationService.cleanDocsTasks = jest.fn()
                .mockRejectedValue(error);

            const req = { params: { projectId: 'test-project' }, user: { id: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            await taskController.cleanDocsTasks(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Failed to clean docs tasks',
                    message: 'Database error'
                })
            );
        });
    });
}); 