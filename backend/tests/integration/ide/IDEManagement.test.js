const IDEManager = require('@external/ide/IDEManager');
const IDEDetectorFactory = require('@external/ide/IDEDetectorFactory');
const IDEStarterFactory = require('@external/ide/IDEStarterFactory');
const IDEConfigManager = require('@external/ide/IDEConfigManager');
const IDEHealthMonitor = require('@external/ide/IDEHealthMonitor');

// Mock dependencies
jest.mock('../../../infrastructure/external/ide/IDEDetectorFactory');
jest.mock('../../../infrastructure/external/ide/IDEStarterFactory');
jest.mock('../../../infrastructure/external/ide/IDEConfigManager');
jest.mock('../../../infrastructure/external/ide/IDEHealthMonitor');

describe('IDE Management Integration', () => {
  let manager;
  let mockDetectorFactory;
  let mockStarterFactory;
  let mockConfigManager;
  let mockHealthMonitor;

  beforeEach(() => {
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
      getDefaultConfig: jest.fn(),
      getPortRange: jest.fn(),
      getDefaultArgs: jest.fn(),
      getTimeout: jest.fn(),
      getGlobalConfig: jest.fn(),
      isAutoStartEnabled: jest.fn(),
      getMaxInstances: jest.fn(),
      getHealthCheckInterval: jest.fn()
    };

    mockHealthMonitor = {
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      getHealthStatus: jest.fn(),
      addHealthCheck: jest.fn(),
      removeHealthCheck: jest.fn(),
      runHealthChecks: jest.fn(),
      isIDEHealthy: jest.fn(),
      getUnhealthyIDEs: jest.fn()
    };

    // Mock constructor returns
    IDEDetectorFactory.mockImplementation(() => mockDetectorFactory);
    IDEStarterFactory.mockImplementation(() => mockStarterFactory);
    IDEConfigManager.mockImplementation(() => mockConfigManager);
    IDEHealthMonitor.mockImplementation(() => mockHealthMonitor);

    manager = new IDEManager();
  });

  describe('Initialization', () => {
    it('should initialize all components successfully', async () => {
      const mockIDEs = [
        { port: 9222, status: 'running', ideType: 'cursor' },
        { port: 9232, status: 'running', ideType: 'vscode' }
      ];

      mockDetectorFactory.detectAll.mockResolvedValue(mockIDEs);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);
      mockConfigManager.loadConfig.mockReturnValue({});
      mockHealthMonitor.startMonitoring.mockImplementation(() => {});

      await manager.initialize();

      expect(mockDetectorFactory.detectAll).toHaveBeenCalled();
      expect(mockConfigManager.loadConfig).toHaveBeenCalled();
      expect(mockHealthMonitor.startMonitoring).toHaveBeenCalled();
      expect(manager.activePort).toBe(9222);
    });

    it('should handle initialization with no detected IDEs', async () => {
      mockDetectorFactory.detectAll.mockResolvedValue([]);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);
      mockConfigManager.loadConfig.mockReturnValue({});

      await manager.initialize();

      expect(manager.activePort).toBeNull();
    });

    it('should handle initialization errors gracefully', async () => {
      mockDetectorFactory.detectAll.mockRejectedValue(new Error('Detection failed'));

      await expect(manager.initialize()).rejects.toThrow('Detection failed');
    });
  });

  describe('IDE Detection and Management', () => {
    it('should get available IDEs from both detection and running', async () => {
      const detectedIDEs = [
        { port: 9222, status: 'running', ideType: 'cursor' }
      ];
      const runningIDEs = [
        { port: 9232, status: 'running', ideType: 'vscode' }
      ];

      mockDetectorFactory.detectAll.mockResolvedValue(detectedIDEs);
      mockStarterFactory.getRunningIDEs.mockReturnValue(runningIDEs);

      manager.activePort = 9222;
      manager.ideWorkspaces.set(9222, '/test/path1');
      manager.ideWorkspaces.set(9232, '/test/path2');
      manager.ideTypes.set(9222, 'cursor');
      manager.ideTypes.set(9232, 'vscode');

      const result = await manager.getAvailableIDEs();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        port: 9222,
        status: 'running',
        ideType: 'cursor',
        source: 'detected',
        workspacePath: '/test/path1',
        active: true
      });
      expect(result[1]).toEqual({
        port: 9232,
        status: 'running',
        ideType: 'vscode',
        source: 'started',
        workspacePath: '/test/path2',
        active: false
      });
    });

    it('should start new IDE successfully', async () => {
      const workspacePath = '/test/workspace';
      const ideType = 'cursor';
      const port = 9222;

      mockDetectorFactory.findAvailablePort.mockResolvedValue(port);
      mockStarterFactory.startIDE.mockResolvedValue({
        port: port,
        pid: 12345,
        status: 'running',
        ideType: ideType
      });

      const result = await manager.startNewIDE(workspacePath, ideType);

      expect(mockDetectorFactory.findAvailablePort).toHaveBeenCalledWith(ideType);
      expect(mockStarterFactory.startIDE).toHaveBeenCalledWith(ideType, port, workspacePath);
      expect(result.port).toBe(port);
      expect(manager.ideWorkspaces.get(port)).toBe(workspacePath);
      expect(manager.ideTypes.get(port)).toBe(ideType);
    });

    it('should switch between IDEs successfully', async () => {
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
  });

  describe('Configuration Integration', () => {
    it('should load configuration during initialization', async () => {
      const mockConfig = {
        cursor: { portRange: { start: 9222, end: 9231 } },
        vscode: { portRange: { start: 9232, end: 9241 } },
        global: { autoStart: true }
      };

      mockDetectorFactory.detectAll.mockResolvedValue([]);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);
      mockConfigManager.loadConfig.mockReturnValue(mockConfig);

      await manager.initialize();

      expect(mockConfigManager.loadConfig).toHaveBeenCalled();
    });

    it('should use configuration for port ranges', () => {
      const mockPortRange = { start: 9222, end: 9231 };
      mockConfigManager.getPortRange.mockReturnValue(mockPortRange);

      const result = manager.configManager.getPortRange('cursor');

      expect(result).toEqual(mockPortRange);
      expect(mockConfigManager.getPortRange).toHaveBeenCalledWith('cursor');
    });

    it('should use configuration for timeouts', () => {
      const mockTimeout = 5000;
      mockConfigManager.getTimeout.mockReturnValue(mockTimeout);

      const result = manager.configManager.getTimeout('cursor');

      expect(result).toBe(mockTimeout);
      expect(mockConfigManager.getTimeout).toHaveBeenCalledWith('cursor');
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should start health monitoring during initialization', async () => {
      mockDetectorFactory.detectAll.mockResolvedValue([]);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);
      mockConfigManager.loadConfig.mockReturnValue({});

      await manager.initialize();

      expect(mockHealthMonitor.startMonitoring).toHaveBeenCalled();
    });

    it('should add health checks for detected IDEs', async () => {
      const mockIDEs = [
        { port: 9222, status: 'running', ideType: 'cursor' }
      ];

      mockDetectorFactory.detectAll.mockResolvedValue(mockIDEs);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);
      mockConfigManager.loadConfig.mockReturnValue({});

      await manager.initialize();

      expect(mockHealthMonitor.addHealthCheck).toHaveBeenCalledWith('cursor', 9222, expect.any(Function));
    });

    it('should get health status', () => {
      const mockHealthStatus = {
        isMonitoring: true,
        lastCheckTime: new Date(),
        totalChecks: 1,
        healthyChecks: 1,
        overallStatus: 'healthy'
      };

      mockHealthMonitor.getHealthStatus.mockReturnValue(mockHealthStatus);

      const result = manager.healthMonitor.getHealthStatus();

      expect(result).toEqual(mockHealthStatus);
      expect(mockHealthMonitor.getHealthStatus).toHaveBeenCalled();
    });

    it('should check IDE health', async () => {
      mockHealthMonitor.isIDEHealthy.mockResolvedValue(true);

      const result = await manager.healthMonitor.isIDEHealthy('cursor', 9222);

      expect(result).toBe(true);
      expect(mockHealthMonitor.isIDEHealthy).toHaveBeenCalledWith('cursor', 9222);
    });
  });

  describe('Workspace Management', () => {
    it('should detect workspace paths for IDEs', async () => {
      const mockIDEs = [
        { port: 9222, status: 'running', ideType: 'cursor' }
      ];

      mockDetectorFactory.detectAll.mockResolvedValue(mockIDEs);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);
      mockConfigManager.loadConfig.mockReturnValue({});

      await manager.initialize();

      // Mock workspace detection
      manager.detectWorkspacePath = jest.fn().mockResolvedValue('/test/workspace');

      await manager.detectWorkspacePathsForAllIDEs();

      expect(manager.detectWorkspacePath).toHaveBeenCalledWith(9222);
    });

    it('should get workspace information', async () => {
      const port = 9222;
      const workspacePath = '/test/workspace';
      manager.ideWorkspaces.set(port, workspacePath);

      const result = manager.getWorkspacePath(port);

      expect(result).toBe(workspacePath);
    });

    it('should get active workspace path', () => {
      const workspacePath = '/test/workspace';
      manager.activePort = 9222;
      manager.ideWorkspaces.set(9222, workspacePath);

      const result = manager.getActiveWorkspacePath();

      expect(result).toBe(workspacePath);
    });
  });

  describe('Status and Information', () => {
    it('should get manager status', () => {
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

    it('should get active IDE information', async () => {
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

    it('should return null for active IDE when none available', async () => {
      manager.activePort = null;

      const result = await manager.getActiveIDE();

      expect(result).toBeNull();
    });
  });

  describe('Cleanup and Shutdown', () => {
    it('should perform cleanup operations', async () => {
      await manager.cleanup();

      expect(mockHealthMonitor.stopMonitoring).toHaveBeenCalled();
      expect(mockConfigManager.saveConfig).toHaveBeenCalled();
    });

    it('should stop all IDEs during cleanup', async () => {
      mockStarterFactory.stopAllIDEs.mockResolvedValue();

      await manager.stopAllIDEs();

      expect(mockStarterFactory.stopAllIDEs).toHaveBeenCalled();
      expect(manager.ideStatus.size).toBe(0);
      expect(manager.ideWorkspaces.size).toBe(0);
      expect(manager.activePort).toBeNull();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle IDE startup failures', async () => {
      mockDetectorFactory.findAvailablePort.mockResolvedValue(9222);
      mockStarterFactory.startIDE.mockRejectedValue(new Error('Startup failed'));

      await expect(manager.startNewIDE('/test/path', 'cursor'))
        .rejects.toThrow('Startup failed');
    });

    it('should handle IDE switching failures', async () => {
      mockDetectorFactory.detectAll.mockResolvedValue([]);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);

      await expect(manager.switchToIDE(9999))
        .rejects.toThrow('No IDE found on port 9999');
    });

    it('should handle IDE stopping failures', async () => {
      manager.ideTypes.set(9222, 'cursor');
      mockStarterFactory.stopIDE.mockRejectedValue(new Error('Stop failed'));

      await expect(manager.stopIDE(9222))
        .rejects.toThrow('Stop failed');
    });

    it('should handle configuration loading failures', async () => {
      mockDetectorFactory.detectAll.mockResolvedValue([]);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);
      mockConfigManager.loadConfig.mockImplementation(() => {
        throw new Error('Config load failed');
      });

      await expect(manager.initialize()).rejects.toThrow('Config load failed');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple IDE instances efficiently', async () => {
      const mockIDEs = Array.from({ length: 10 }, (_, i) => ({
        port: 9222 + i,
        status: 'running',
        ideType: i < 5 ? 'cursor' : 'vscode'
      }));

      mockDetectorFactory.detectAll.mockResolvedValue(mockIDEs);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);
      mockConfigManager.loadConfig.mockReturnValue({});

      const startTime = Date.now();
      
      await manager.initialize();
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(manager.activePort).toBe(9222);
    });

    it('should handle concurrent operations', async () => {
      mockDetectorFactory.detectAll.mockResolvedValue([]);
      mockStarterFactory.getRunningIDEs.mockReturnValue([]);
      mockConfigManager.loadConfig.mockReturnValue({});

      await manager.initialize();

      const promises = [
        manager.getAvailableIDEs(),
        manager.getStatus(),
        manager.getActivePort()
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(Array.isArray(results[0])).toBe(true);
      expect(typeof results[1]).toBe('object');
      expect(results[2]).toBeNull();
    });
  });
}); 