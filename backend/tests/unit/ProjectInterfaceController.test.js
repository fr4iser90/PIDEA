/**
 * ProjectInterfaceController Unit Tests
 * 
 * Tests for ProjectInterfaceController functionality including CRUD operations,
 * interface control operations, validation, and error handling.
 */
const ProjectInterfaceController = require('@/presentation/api/projects/ProjectInterfaceController');

describe('ProjectInterfaceController', () => {
  let controller;
  let mockInterfaceManager;
  let mockProjectApplicationService;
  let mockLogger;

  beforeEach(() => {
    mockInterfaceManager = {
      createInterface: jest.fn(),
      getInterface: jest.fn(),
      updateInterface: jest.fn(),
      deleteInterface: jest.fn(),
      listInterfaces: jest.fn(),
      startInterface: jest.fn(),
      stopInterface: jest.fn(),
      restartInterface: jest.fn(),
      getInterfaceStatus: jest.fn(),
      getInterfaceLogs: jest.fn()
    };
    
    mockProjectApplicationService = {
      getProject: jest.fn()
    };
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };
    
    controller = new ProjectInterfaceController(mockInterfaceManager, mockProjectApplicationService);
  });

  describe('createInterface', () => {
    it('should create an interface successfully', async () => {
      const interfaceData = {
        name: 'Test Interface',
        type: 'vscode',
        configuration: { port: 3000 }
      };
      
      const createdInterface = { id: '1', ...interfaceData, projectId: 'project1' };
      mockProjectApplicationService.getProject.mockResolvedValue({ id: 'project1' });
      mockInterfaceManager.createInterface.mockResolvedValue(createdInterface);
      
      const req = { 
        params: { projectId: 'project1' },
        body: interfaceData 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.createInterface(req, res);
      
      expect(mockProjectApplicationService.getProject).toHaveBeenCalledWith('project1');
      expect(mockInterfaceManager.createInterface).toHaveBeenCalledWith('project1', expect.objectContaining(interfaceData));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ interface: createdInterface });
    });

    it('should return validation errors for invalid data', async () => {
      const req = { 
        params: { projectId: 'project1' },
        body: { name: '', type: 'invalid' } 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.createInterface(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.any(Array) });
      expect(mockInterfaceManager.createInterface).not.toHaveBeenCalled();
    });

    it('should return 404 if project not found', async () => {
      mockProjectApplicationService.getProject.mockResolvedValue(null);
      
      const req = { 
        params: { projectId: 'project1' },
        body: { name: 'Test', type: 'vscode' } 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.createInterface(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
    });
  });

  describe('getInterface', () => {
    it('should return interface if found', async () => {
      const interface = { id: '1', name: 'Test Interface', projectId: 'project1' };
      mockInterfaceManager.getInterface.mockResolvedValue(interface);
      
      const req = { params: { projectId: 'project1', interfaceId: '1' } };
      const res = { json: jest.fn() };
      
      await controller.getInterface(req, res);
      
      expect(mockInterfaceManager.getInterface).toHaveBeenCalledWith('project1', '1');
      expect(res.json).toHaveBeenCalledWith({ interface });
    });

    it('should return 404 if interface not found', async () => {
      mockInterfaceManager.getInterface.mockResolvedValue(null);
      
      const req = { params: { projectId: 'project1', interfaceId: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.getInterface(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Interface not found' });
    });
  });

  describe('startInterface', () => {
    it('should start interface successfully', async () => {
      const result = { success: true, interface: { id: '1', status: 'running' } };
      mockInterfaceManager.startInterface.mockResolvedValue(result);
      
      const req = { params: { projectId: 'project1', interfaceId: '1' } };
      const res = { json: jest.fn() };
      
      await controller.startInterface(req, res);
      
      expect(mockInterfaceManager.startInterface).toHaveBeenCalledWith('project1', '1');
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Interface started successfully', 
        interface: result.interface 
      });
    });

    it('should return error if start fails', async () => {
      const result = { success: false, error: 'Interface already running' };
      mockInterfaceManager.startInterface.mockResolvedValue(result);
      
      const req = { params: { projectId: 'project1', interfaceId: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.startInterface(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Interface already running' });
    });
  });

  describe('stopInterface', () => {
    it('should stop interface successfully', async () => {
      const result = { success: true, interface: { id: '1', status: 'stopped' } };
      mockInterfaceManager.stopInterface.mockResolvedValue(result);
      
      const req = { params: { projectId: 'project1', interfaceId: '1' } };
      const res = { json: jest.fn() };
      
      await controller.stopInterface(req, res);
      
      expect(mockInterfaceManager.stopInterface).toHaveBeenCalledWith('project1', '1');
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Interface stopped successfully', 
        interface: result.interface 
      });
    });

    it('should return error if stop fails', async () => {
      const result = { success: false, error: 'Interface not running' };
      mockInterfaceManager.stopInterface.mockResolvedValue(result);
      
      const req = { params: { projectId: 'project1', interfaceId: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.stopInterface(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Interface not running' });
    });
  });

  describe('restartInterface', () => {
    it('should restart interface successfully', async () => {
      const result = { success: true, interface: { id: '1', status: 'running' } };
      mockInterfaceManager.restartInterface.mockResolvedValue(result);
      
      const req = { params: { projectId: 'project1', interfaceId: '1' } };
      const res = { json: jest.fn() };
      
      await controller.restartInterface(req, res);
      
      expect(mockInterfaceManager.restartInterface).toHaveBeenCalledWith('project1', '1');
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Interface restarted successfully', 
        interface: result.interface 
      });
    });
  });

  describe('listInterfaces', () => {
    it('should list interfaces with pagination', async () => {
      const interfaces = [
        { id: '1', name: 'Interface 1', projectId: 'project1' },
        { id: '2', name: 'Interface 2', projectId: 'project1' }
      ];
      const result = { interfaces, total: 2 };
      mockInterfaceManager.listInterfaces.mockResolvedValue(result);
      
      const req = { 
        params: { projectId: 'project1' },
        query: { page: '1', limit: '10', type: 'vscode', status: 'running' }
      };
      const res = { json: jest.fn() };
      
      await controller.listInterfaces(req, res);
      
      expect(mockInterfaceManager.listInterfaces).toHaveBeenCalledWith('project1', {
        page: 1,
        limit: 10,
        type: 'vscode',
        status: 'running'
      });
      expect(res.json).toHaveBeenCalledWith({
        interfaces,
        pagination: { page: 1, limit: 10, total: 2, projectId: 'project1' }
      });
    });
  });

  describe('getInterfaceStatus', () => {
    it('should return interface status', async () => {
      const status = { running: true, port: 3000, pid: 12345 };
      mockInterfaceManager.getInterfaceStatus.mockResolvedValue(status);
      
      const req = { params: { projectId: 'project1', interfaceId: '1' } };
      const res = { json: jest.fn() };
      
      await controller.getInterfaceStatus(req, res);
      
      expect(mockInterfaceManager.getInterfaceStatus).toHaveBeenCalledWith('project1', '1');
      expect(res.json).toHaveBeenCalledWith({ status });
    });

    it('should return 404 if interface not found', async () => {
      mockInterfaceManager.getInterfaceStatus.mockResolvedValue(null);
      
      const req = { params: { projectId: 'project1', interfaceId: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.getInterfaceStatus(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Interface not found' });
    });
  });

  describe('getInterfaceLogs', () => {
    it('should return interface logs', async () => {
      const logs = ['Log line 1', 'Log line 2', 'Log line 3'];
      mockInterfaceManager.getInterfaceLogs.mockResolvedValue(logs);
      
      const req = { 
        params: { projectId: 'project1', interfaceId: '1' },
        query: { lines: '50' }
      };
      const res = { json: jest.fn() };
      
      await controller.getInterfaceLogs(req, res);
      
      expect(mockInterfaceManager.getInterfaceLogs).toHaveBeenCalledWith('project1', '1', {
        lines: 50
      });
      expect(res.json).toHaveBeenCalledWith({ logs });
    });

    it('should use default lines parameter', async () => {
      const logs = ['Log line 1'];
      mockInterfaceManager.getInterfaceLogs.mockResolvedValue(logs);
      
      const req = { 
        params: { projectId: 'project1', interfaceId: '1' },
        query: {}
      };
      const res = { json: jest.fn() };
      
      await controller.getInterfaceLogs(req, res);
      
      expect(mockInterfaceManager.getInterfaceLogs).toHaveBeenCalledWith('project1', '1', {
        lines: 100
      });
    });
  });

  describe('validateInterfaceData', () => {
    it('should validate required fields for creation', () => {
      const data = { name: 'Test Interface', type: 'vscode' };
      const result = controller.validateInterfaceData(data, false);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate interface types', () => {
      const validTypes = ['cursor', 'vscode', 'windsurf', 'jetbrains', 'sublime'];
      
      validTypes.forEach(type => {
        const data = { name: 'Test', type };
        const result = controller.validateInterfaceData(data, false);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid interface types', () => {
      const data = { name: 'Test', type: 'invalid-type' };
      const result = controller.validateInterfaceData(data, false);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Interface type must be one of: cursor, vscode, windsurf, jetbrains, sublime');
    });

    it('should validate configuration object', () => {
      const data = { name: 'Test', type: 'vscode', configuration: { port: 3000 } };
      const result = controller.validateInterfaceData(data, false);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject non-object configuration', () => {
      const data = { name: 'Test', type: 'vscode', configuration: 'invalid' };
      const result = controller.validateInterfaceData(data, false);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });
  });
});
