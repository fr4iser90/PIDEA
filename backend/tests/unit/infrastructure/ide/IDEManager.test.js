const IDEManager = require('@external/ide/IDEManager');
const IDEDetectorFactory = require('@external/ide/IDEDetectorFactory');
const IDEStarterFactory = require('@external/ide/IDEStarterFactory');
const IDEConfigManager = require('@external/ide/IDEConfigManager');
const IDEHealthMonitor = require('@external/ide/IDEHealthMonitor');

// Mock dependencies
jest.mock('../../../../infrastructure/external/ide/IDEDetectorFactory');
jest.mock('../../../../infrastructure/external/ide/IDEStarterFactory');
jest.mock('../../../../infrastructure/external/ide/IDEConfigManager');
jest.mock('../../../../infrastructure/external/ide/IDEHealthMonitor');

describe('IDEManager', () => {
  let manager;
  let mockDetectorFactory;
  let mockStarterFactory;
  let mockConfigManager;
  let mockHealthMonitor;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockDetectorFactory = {
      detectAll: jest.fn(),
      detectByType: jest.fn(),
      findAvailablePort: jest.fn(),
      checkPort: jest.fn(),
      getAvailableDetectors: jest.fn(),
      getDetectorStats: jest.fn(),
      validateDetector: jest.fn()
    };

    mockStarterFactory = {
      startIDE: jest.fn(),
      stopIDE: jest.fn(),
      stopAllIDEs: jest.fn(),
      getRunningIDEs: jest.fn(),
      isIDERunning: jest.fn(),
      getAvailableStarters: jest.fn(),
      getStarterStats: jest.fn(),
      validateStarter: jest.fn()
    };

    mockConfigManager = {
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      getConfig: jest.fn(),
      validateConfig: jest.fn(),
      getDefaultConfig: jest.fn()
    };

    mockHealthMonitor = {
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      getHealthStatus: jest.fn(),
      addHealthCheck: jest.fn(),
      removeHealthCheck: jest.fn()
    };

    // Mock constructor returns
    IDEDetectorFactory.mockImplementation(() => mockDetectorFactory);
    IDEStarterFactory.mockImplementation(() => mockStarterFactory);
    IDEConfigManager.mockImplementation(() => mockConfigManager);
    IDEHealthMonitor.mockImplementation(() => mockHealthMonitor);

    manager = new IDEManager();
  });

  describe('constructor', () => {
    it('should initialize with all required components', () => {
      expect(manager.detectorFactory).toBeDefined();
      expect(manager.starterFactory).toBeDefined();
      expect(manager.configManager).toBeDefined();
      expect(manager.healthMonitor).toBeDefined();
      expect(manager.activePort).toBeNull();
      expect(manager.ideStatus).toBeDefined();
      expect(manager.ideWorkspaces).toBeDefined();
      expect(manager.ideTypes).toBeDefined();
    });

    it('should initialize with browser manager when provided', () => {
      const mockBrowserManager = { someProperty: 'value' };
      const managerWithBrowser = new IDEManager(mockBrowserManager);
      
      expect(managerWithBrowser.browserManager).toBe(mockBrowserManager);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const mockIDEs = [
        { port: 9222, status: 'running', ideType: 'cursor' },
        { port: 9232, status: 'running', ideType: 'vscode' }
      ];

      mockDetectorFactory.detectAll.mockResolvedValue(mockIDEs);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);

      await manager.initialize();

      expect(mockDetectorFactory.detectAll).toHaveBeenCalled();
      expect(mockConfigManager.loadConfig).toHaveBeenCalled();
      expect(mockHealthMonitor.startMonitoring).toHaveBeenCalled();
      expect(manager.activePort).toBe(9222);
    });

    it('should handle no detected IDEs', async () => {
      mockDetectorFactory.detectAll.mockResolvedValue([]);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);

      await manager.initialize();

      expect(manager.activePort).toBeNull();
    });

    it('should handle initialization errors gracefully', async () => {
      mockDetectorFactory.detectAll.mockRejectedValue(new Error('Detection failed'));

      await expect(manager.initialize()).rejects.toThrow('Detection failed');
    });
  });

  describe('getAvailableIDEs', () => {
    it('should return merged list of detected and running IDEs', async () => {
      mockDetectorFactory.detectAll.mockResolvedValue([
        { port: 9222, status: 'running', ideType: 'cursor', workspacePath: '/test/path1' },
        { port: 9333, status: 'stopped', ideType: 'vscode', workspacePath: '/test/path2' }
      ]);
      mockStarterFactory.getRunningIDEs.mockReturnValue([
        { port: 9444, status: 'running', ideType: 'windsurf', workspacePath: '/test/path3' }
      ]);
      // Set up workspace and type maps to match implementation
      manager.ideWorkspaces.set(9222, '/test/path1');
      manager.ideWorkspaces.set(9333, '/test/path2');
      manager.ideWorkspaces.set(9444, '/test/path3');
      manager.ideTypes.set(9222, 'cursor');
      manager.ideTypes.set(9333, 'vscode');
      manager.ideTypes.set(9444, 'windsurf');
      manager.activePort = 9222;

      const result = await manager.getAvailableIDEs();
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        port: 9222,
        status: 'running',
        ideType: 'cursor',
        workspacePath: '/test/path1',
        source: 'detected',
        active: true
      });
      expect(result[1]).toMatchObject({
        port: 9333,
        status: 'stopped',
        ideType: 'vscode',
        workspacePath: '/test/path2',
        source: 'detected',
        active: false
      });
      expect(result[2]).toMatchObject({
        port: 9444,
        status: 'running',
        ideType: 'windsurf',
        workspacePath: '/test/path3',
        source: 'started',
        active: false
      });
      // healthStatus can be any value (null or object)
      expect(result[0]).toHaveProperty('healthStatus');
      expect(result[1]).toHaveProperty('healthStatus');
      expect(result[2]).toHaveProperty('healthStatus');
    });
  });

  describe('startNewIDE', () => {
    beforeEach(() => {
      jest.spyOn(manager, 'waitForIDE').mockResolvedValue(true);
      mockStarterFactory.startIDE.mockResolvedValue({ port: 9222, status: 'running', ideType: 'cursor', workspacePath: '/test/workspace' });
    });

    it('should start new IDE successfully', async () => {
      const workspacePath = '/test/workspace';
      const ideType = 'cursor';
      const port = 9222;
      mockDetectorFactory.findAvailablePort.mockResolvedValue(port);
      mockStarterFactory.startIDE.mockResolvedValue({ port, status: 'running', ideType, workspacePath });
      manager.ideTypes.set(port, ideType);

      const result = await manager.startNewIDE(workspacePath, ideType);

      expect(mockDetectorFactory.findAvailablePort).toHaveBeenCalledWith(ideType);
      expect(mockStarterFactory.startIDE).toHaveBeenCalledWith(ideType, port, workspacePath, expect.any(Object));
      expect(result.port).toBe(port);
      expect(manager.ideWorkspaces.get(port)).toBe(workspacePath);
      expect(manager.ideTypes.get(port)).toBe(ideType);
    });

    it('should use project root when no workspace path provided', async () => {
      const port = 9222;
      mockDetectorFactory.findAvailablePort.mockResolvedValue(port);
      mockStarterFactory.startIDE.mockResolvedValue({ port, status: 'running', ideType: 'cursor', workspacePath: '/test/path' });
      manager.ideTypes.set(port, 'cursor');

      await manager.startNewIDE();

      // Should use parent directory of process.cwd()
      const expectedRoot = require('path').resolve(process.cwd(), '..');
      expect(mockStarterFactory.startIDE).toHaveBeenCalledWith('cursor', port, expectedRoot, expect.any(Object));
    });

    it('should set as active if no active IDE', async () => {
      const port = 9222;
      mockDetectorFactory.findAvailablePort.mockResolvedValue(port);
      mockStarterFactory.startIDE.mockResolvedValue({
        port: port,
        pid: 12345,
        status: 'running'
      });

      manager.activePort = null;

      await manager.startNewIDE();

      expect(manager.activePort).toBe(port);
    });
  });

  describe('switchToIDE', () => {
    it('should switch to existing IDE successfully', async () => {
      const targetPort = 9232;
      const mockIDEs = [
        { port: 9222, status: 'running', ideType: 'cursor' },
        { port: targetPort, status: 'running', ideType: 'vscode' }
      ];

      mockDetectorFactory.detectAll.mockResolvedValue(mockIDEs);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);

      manager.activePort = 9222;
      manager.ideWorkspaces.set(targetPort, '/test/path');
      manager.ideTypes.set(targetPort, 'vscode');

      const result = await manager.switchToIDE(targetPort);

      expect(manager.activePort).toBe(targetPort);
      expect(result.port).toBe(targetPort);
      expect(result.status).toBe('active');
      expect(result.workspacePath).toBe('/test/path');
      expect(result.previousPort).toBe(9222);
    });

    it('should throw error for non-existent IDE', async () => {
      mockDetectorFactory.detectAll.mockResolvedValue([]);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);

      await expect(manager.switchToIDE(9999)).rejects.toThrow('No IDE found on port 9999');
    });

    it('should throw error for non-running IDE', async () => {
      const mockIDEs = [
        { port: 9222, status: 'stopped', ideType: 'cursor' }
      ];

      mockDetectorFactory.detectAll.mockResolvedValue(mockIDEs);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);

      await expect(manager.switchToIDE(9222)).rejects.toThrow('IDE on port 9222 is not running');
    });
  });

  describe('stopIDE', () => {
    it('should stop IDE successfully', async () => {
      const port = 9222;
      const ideType = 'cursor';

      manager.ideTypes.set(port, ideType);
      manager.activePort = port;

      mockStarterFactory.stopIDE.mockResolvedValue({
        port: port,
        status: 'stopped',
        ideType: ideType
      });

      const result = await manager.stopIDE(port);

      expect(mockStarterFactory.stopIDE).toHaveBeenCalledWith(port, ideType);
      expect(result.port).toBe(port);
      expect(result.status).toBe('stopped');
      expect(manager.ideStatus.has(port)).toBe(false);
      expect(manager.ideWorkspaces.has(port)).toBe(false);
      expect(manager.ideTypes.has(port)).toBe(false);
    });

    it('should switch to another IDE if stopping active IDE', async () => {
      const port1 = 9222;
      const port2 = 9232;

      manager.ideTypes.set(port1, 'cursor');
      manager.ideTypes.set(port2, 'vscode');
      manager.activePort = port1;

      const mockIDEs = [
        { port: port2, status: 'running', ideType: 'vscode' }
      ];

      mockDetectorFactory.detectAll.mockResolvedValue(mockIDEs);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);
      mockStarterFactory.stopIDE.mockResolvedValue({
        port: port1,
        status: 'stopped'
      });

      await manager.stopIDE(port1);

      expect(manager.activePort).toBe(port2);
    });
  });

  describe('stopAllIDEs', () => {
    it('should stop all IDEs', async () => {
      mockStarterFactory.stopAllIDEs.mockResolvedValue();

      await manager.stopAllIDEs();

      expect(mockStarterFactory.stopAllIDEs).toHaveBeenCalled();
      expect(manager.ideStatus.size).toBe(0);
      expect(manager.ideWorkspaces.size).toBe(0);
      expect(manager.activePort).toBeNull();
    });
  });

  describe('getActivePort', () => {
    it('should return active port', () => {
      manager.activePort = 9222;
      expect(manager.getActivePort()).toBe(9222);
    });

    it('should return null when no active IDE', () => {
      manager.activePort = null;
      expect(manager.getActivePort()).toBeNull();
    });
  });

  describe('getActiveIDE', () => {
    it('should return active IDE information', async () => {
      const mockIDEs = [
        { port: 9222, status: 'running', ideType: 'cursor' }
      ];

      mockDetectorFactory.detectAll.mockResolvedValue(mockIDEs);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);

      manager.activePort = 9222;
      manager.ideWorkspaces.set(9222, '/test/path');
      manager.ideTypes.set(9222, 'cursor');

      const result = await manager.getActiveIDE();

      expect(result.port).toBe(9222);
      expect(result.workspacePath).toBe('/test/path');
      expect(result.ideType).toBe('cursor');
    });

    it('should return null when no active IDE', async () => {
      manager.activePort = null;
      const result = await manager.getActiveIDE();
      expect(result).toBeNull();
    });
  });

  describe('getWorkspacePath', () => {
    it('should return workspace path for port', () => {
      const port = 9222;
      const workspacePath = '/test/path';
      manager.ideWorkspaces.set(port, workspacePath);

      expect(manager.getWorkspacePath(port)).toBe(workspacePath);
    });

    it('should return null for unknown port', () => {
      expect(manager.getWorkspacePath(9999)).toBeNull();
    });
  });

  describe('getIDEType', () => {
    it('should return IDE type for port', () => {
      const port = 9222;
      const ideType = 'cursor';
      manager.ideTypes.set(port, ideType);

      expect(manager.getIDEType(port)).toBe(ideType);
    });

    it('should return null for unknown port', () => {
      expect(manager.getIDEType(9999)).toBeNull();
    });
  });

  describe('getActiveWorkspacePath', () => {
    it('should return active workspace path', () => {
      const workspacePath = '/test/path';
      manager.activePort = 9222;
      manager.ideWorkspaces.set(9222, workspacePath);

      expect(manager.getActiveWorkspacePath()).toBe(workspacePath);
    });

    it('should return null when no active IDE', () => {
      manager.activePort = null;
      expect(manager.getActiveWorkspacePath()).toBeNull();
    });
  });

  describe('getStatus', () => {
    it('should return manager status', () => {
      manager.activePort = 9222;
      manager.ideStatus.set(9222, 'running');
      manager.ideWorkspaces.set(9222, '/test/path');
      manager.ideTypes.set(9222, 'cursor');

      const status = manager.getStatus();

      expect(status).toHaveProperty('activePort', 9222);
      expect(status).toHaveProperty('totalIDEs', 1);
      expect(status).toHaveProperty('runningIDEs', 1);
      expect(status).toHaveProperty('ideTypes');
      expect(status).toHaveProperty('workspaces');
    });
  });

  describe('cleanup', () => {
    it('should perform cleanup operations', async () => {
      await manager.cleanup();

      expect(mockHealthMonitor.stopMonitoring).toHaveBeenCalled();
      expect(mockConfigManager.saveConfig).toHaveBeenCalled();
    });
  });
}); 