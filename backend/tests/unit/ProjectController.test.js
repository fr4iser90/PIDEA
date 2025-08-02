/**
 * ProjectController Unit Tests
 * 
 * Tests the refactored ProjectController with proper layer separation
 */
const ProjectController = require('@presentation/api/controllers/ProjectController');

describe('ProjectController', () => {
  let projectController;
  let mockProjectApplicationService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Mock ProjectApplicationService
    mockProjectApplicationService = {
      getAllProjects: jest.fn(),
      getProject: jest.fn(),
    
      saveProjectPort: jest.fn(),
      updateProjectPort: jest.fn()
    };

    // Create controller instance
    projectController = new ProjectController(mockProjectApplicationService);

    // Mock request and response objects
    mockReq = {
      params: {},
      body: {},
      query: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('Constructor', () => {
    it('should throw error if projectApplicationService is not provided', () => {
      expect(() => new ProjectController()).toThrow('ProjectController requires projectApplicationService dependency');
    });

    it('should create instance with valid projectApplicationService', () => {
      expect(projectController).toBeInstanceOf(ProjectController);
      expect(projectController.projectApplicationService).toBe(mockProjectApplicationService);
    });
  });

  describe('list', () => {
    it('should return all projects successfully', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' }
      ];

      mockProjectApplicationService.getAllProjects.mockResolvedValue(mockProjects);

      await projectController.list(mockReq, mockRes);

      expect(mockProjectApplicationService.getAllProjects).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProjects
      });
    });

    it('should handle errors and return 500 status', async () => {
      const error = new Error('Database error');
      mockProjectApplicationService.getAllProjects.mockRejectedValue(error);

      await projectController.list(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to list projects'
      });
    });
  });

  describe('getById', () => {
    it('should return project by ID successfully', async () => {
      const mockProject = { id: '1', name: 'Project 1' };
      mockReq.params = { id: '1' };

      mockProjectApplicationService.getProject.mockResolvedValue(mockProject);

      await projectController.getById(mockReq, mockRes);

      expect(mockProjectApplicationService.getProject).toHaveBeenCalledWith('1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProject
      });
    });

    it('should return 404 when project not found', async () => {
      const error = new Error('Project not found: 999');
      mockReq.params = { id: '999' };

      mockProjectApplicationService.getProject.mockRejectedValue(error);

      await projectController.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Project not found'
      });
    });

    it('should handle other errors and return 500 status', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: '1' };

      mockProjectApplicationService.getProject.mockRejectedValue(error);

      await projectController.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get project'
      });
    });
  });



  describe('savePort', () => {
    it('should save project port successfully', async () => {
      const mockUpdatedProject = { id: '1', name: 'Project 1', frontendPort: 3000 };
      mockReq.params = { id: '1' };
      mockReq.body = { port: 3000, portType: 'frontend' };

      mockProjectApplicationService.saveProjectPort.mockResolvedValue(mockUpdatedProject);

      await projectController.savePort(mockReq, mockRes);

      expect(mockProjectApplicationService.saveProjectPort).toHaveBeenCalledWith('1', 3000, 'frontend');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedProject
      });
    });

    it('should return 400 for invalid port number', async () => {
      const error = new Error('Valid port number required');
      mockReq.params = { id: '1' };
      mockReq.body = { port: 'invalid', portType: 'frontend' };

      mockProjectApplicationService.saveProjectPort.mockRejectedValue(error);

      await projectController.savePort(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid port number required'
      });
    });

    it('should return 404 when project not found', async () => {
      const error = new Error('Project not found: 999');
      mockReq.params = { id: '999' };
      mockReq.body = { port: 3000, portType: 'frontend' };

      mockProjectApplicationService.saveProjectPort.mockRejectedValue(error);

      await projectController.savePort(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Project not found'
      });
    });

    it('should return 400 for invalid port type', async () => {
      const error = new Error('Invalid port type: invalid');
      mockReq.params = { id: '1' };
      mockReq.body = { port: 3000, portType: 'invalid' };

      mockProjectApplicationService.saveProjectPort.mockRejectedValue(error);

      await projectController.savePort(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid port type'
      });
    });
  });

  describe('updatePort', () => {
    it('should update project port successfully', async () => {
      const mockUpdatedProject = { id: '1', name: 'Project 1', backendPort: 5000 };
      mockReq.params = { id: '1' };
      mockReq.body = { port: 5000, portType: 'backend' };

      mockProjectApplicationService.updateProjectPort.mockResolvedValue(mockUpdatedProject);

      await projectController.updatePort(mockReq, mockRes);

      expect(mockProjectApplicationService.updateProjectPort).toHaveBeenCalledWith('1', 5000, 'backend');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedProject
      });
    });

    it('should handle errors appropriately', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: '1' };
      mockReq.body = { port: 5000, portType: 'backend' };

      mockProjectApplicationService.updateProjectPort.mockRejectedValue(error);

      await projectController.updatePort(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update port'
      });
    });
  });
}); 