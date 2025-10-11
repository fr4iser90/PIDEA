/**
 * IDEInterface Unit Tests
 * 
 * Tests for the IDEInterface implementation functionality,
 * including IDE-specific operations, workspace management,
 * port handling, and lifecycle management.
 */
const IDEInterface = require('../../domain/services/interface/IDEInterface');
const BaseInterface = require('../../domain/services/interface/BaseInterface');

describe('IDEInterface', () => {
  let ideInterface;
  let mockDependencies;

  beforeEach(() => {
    mockDependencies = {
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      },
      browserManager: {
        initialize: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        executeCommand: jest.fn(),
        sendMessage: jest.fn(),
        heartbeat: jest.fn(),
        cleanup: jest.fn()
      },
      portManager: {
        initializePort: jest.fn(),
        releasePort: jest.fn()
      },
      workspaceService: {
        validateWorkspacePath: jest.fn().mockResolvedValue(true),
        getWorkspaceInfo: jest.fn().mockResolvedValue({
          path: '/test/workspace',
          exists: true,
          type: 'project',
          lastModified: new Date()
        })
      },
      eventBus: {
        publish: jest.fn()
      }
    };

    ideInterface = new IDEInterface(
      'test-ide-1',
      'ide',
      {
        workspacePath: '/test/workspace',
        port: 3000,
        ideType: 'cursor',
        autoReconnect: true,
        heartbeatInterval: 30000
      },
      mockDependencies
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should create IDE interface instance', () => {
      expect(ideInterface).toBeInstanceOf(BaseInterface);
      expect(ideInterface.interfaceId).toBe('test-ide-1');
      expect(ideInterface.interfaceType).toBe('ide');
      expect(ideInterface.workspacePath).toBe('/test/workspace');
      expect(ideInterface.port).toBe(3000);
      expect(ideInterface.ideType).toBe('cursor');
      expect(ideInterface.isConnected).toBe(false);
    });

    test('should initialize IDE-specific properties', () => {
      expect(ideInterface.processId).toBeNull();
      expect(ideInterface.lastHeartbeat).toBeNull();
      expect(ideInterface.ideConfig).toEqual({
        autoReconnect: true,
        heartbeatInterval: 30000,
        connectionTimeout: 10000,
        maxRetries: 3
      });
    });

    test('should handle missing dependencies gracefully', () => {
      const minimalInterface = new IDEInterface('test-ide-2', 'ide', {}, {});
      
      expect(minimalInterface.browserManager).toBeNull();
      expect(minimalInterface.portManager).toBeNull();
      expect(minimalInterface.workspaceService).toBeNull();
      expect(minimalInterface.eventBus).toBeNull();
    });
  });

  describe('Initialization', () => {
    test('should initialize IDE interface successfully', async () => {
      await ideInterface.initialize({ additionalConfig: 'value' });
      
      expect(ideInterface.status).toBe('initialized');
      expect(ideInterface.interfaceConfig.additionalConfig).toBe('value');
      expect(mockDependencies.workspaceService.validateWorkspacePath).toHaveBeenCalledWith('/test/workspace');
      expect(mockDependencies.portManager.initializePort).toHaveBeenCalledWith(3000, {
        interfaceId: 'test-ide-1',
        ideType: 'cursor'
      });
      expect(mockDependencies.browserManager.initialize).toHaveBeenCalledWith({
        port: 3000,
        workspacePath: '/test/workspace',
        ideType: 'cursor'
      });
    });

    test('should handle workspace validation failure', async () => {
      mockDependencies.workspaceService.validateWorkspacePath.mockResolvedValue(false);
      
      await expect(ideInterface.initialize()).rejects.toThrow('Invalid workspace path: /test/workspace');
      expect(ideInterface.status).toBe('error');
    });

    test('should handle port initialization failure', async () => {
      mockDependencies.portManager.initializePort.mockRejectedValue(new Error('Port initialization failed'));
      
      await expect(ideInterface.initialize()).rejects.toThrow('Port initialization failed');
      expect(ideInterface.status).toBe('error');
    });

    test('should handle missing workspace path gracefully', async () => {
      const interfaceWithoutWorkspace = new IDEInterface('test-ide-3', 'ide', {}, mockDependencies);
      
      await interfaceWithoutWorkspace.initialize();
      expect(interfaceWithoutWorkspace.status).toBe('initialized');
    });

    test('should handle missing port gracefully', async () => {
      const interfaceWithoutPort = new IDEInterface('test-ide-4', 'ide', { workspacePath: '/test' }, mockDependencies);
      
      await interfaceWithoutPort.initialize();
      expect(interfaceWithoutPort.status).toBe('initialized');
    });
  });

  describe('Lifecycle Management', () => {
    beforeEach(async () => {
      await ideInterface.initialize();
    });

    test('should start IDE interface successfully', async () => {
      await ideInterface.start();
      
      expect(ideInterface.status).toBe('running');
      expect(ideInterface.isConnected).toBe(true);
      expect(mockDependencies.browserManager.start).toHaveBeenCalled();
      expect(mockDependencies.browserManager.connect).toHaveBeenCalledWith({
        port: 3000,
        workspacePath: '/test/workspace',
        ideType: 'cursor'
      });
    });

    test('should stop IDE interface successfully', async () => {
      await ideInterface.start();
      await ideInterface.stop();
      
      expect(ideInterface.status).toBe('stopped');
      expect(ideInterface.isConnected).toBe(false);
      expect(mockDependencies.browserManager.stop).toHaveBeenCalled();
      expect(mockDependencies.browserManager.disconnect).toHaveBeenCalled();
    });

    test('should destroy IDE interface successfully', async () => {
      await ideInterface.start();
      await ideInterface.destroy();
      
      expect(ideInterface.status).toBe('destroyed');
      expect(mockDependencies.browserManager.cleanup).toHaveBeenCalled();
      expect(mockDependencies.portManager.releasePort).toHaveBeenCalledWith(3000);
    });

    test('should handle connection failure during start', async () => {
      mockDependencies.browserManager.connect.mockRejectedValue(new Error('Connection failed'));
      
      await expect(ideInterface.start()).rejects.toThrow('Connection failed');
      expect(ideInterface.status).toBe('error');
    });

    test('should handle disconnect failure gracefully', async () => {
      await ideInterface.start();
      mockDependencies.browserManager.disconnect.mockRejectedValue(new Error('Disconnect failed'));
      
      // Should not throw error during disconnect
      await ideInterface.stop();
      expect(ideInterface.status).toBe('stopped');
    });
  });

  describe('IDE-Specific Operations', () => {
    beforeEach(async () => {
      await ideInterface.initialize();
      await ideInterface.start();
    });

    test('should get IDE metadata', () => {
      const metadata = ideInterface.getIDEMetadata();
      
      expect(metadata).toEqual({
        id: 'test-ide-1',
        type: 'ide',
        status: 'running',
        createdAt: expect.any(Date),
        lastActivity: expect.any(Date),
        config: expect.any(Object),
        workspacePath: '/test/workspace',
        port: 3000,
        ideType: 'cursor',
        processId: null,
        isConnected: true,
        lastHeartbeat: expect.any(Date),
        ideConfig: expect.any(Object)
      });
    });

    test('should get workspace information', async () => {
      const workspaceInfo = await ideInterface.getWorkspaceInfo();
      
      expect(workspaceInfo).toEqual({
        path: '/test/workspace',
        exists: true,
        type: 'project',
        lastModified: expect.any(Date)
      });
      expect(mockDependencies.workspaceService.getWorkspaceInfo).toHaveBeenCalledWith('/test/workspace');
    });

    test('should throw error when getting workspace info without workspace path', async () => {
      const interfaceWithoutWorkspace = new IDEInterface('test-ide-5', 'ide', {}, mockDependencies);
      
      await expect(interfaceWithoutWorkspace.getWorkspaceInfo()).rejects.toThrow('No workspace path configured');
    });

    test('should execute command successfully', async () => {
      const commandResult = { success: true, output: 'Command executed' };
      mockDependencies.browserManager.executeCommand.mockResolvedValue(commandResult);
      
      const result = await ideInterface.executeCommand('test-command', { option: 'value' });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(commandResult);
      expect(mockDependencies.browserManager.executeCommand).toHaveBeenCalledWith('test-command', {
        port: 3000,
        workspacePath: '/test/workspace',
        option: 'value'
      });
    });

    test('should handle command execution failure', async () => {
      mockDependencies.browserManager.executeCommand.mockRejectedValue(new Error('Command failed'));
      
      const result = await ideInterface.executeCommand('test-command');
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Failed to execute command');
      expect(result.error.code).toBe('COMMAND_EXECUTION_FAILED');
    });

    test('should throw error when executing command without connection', async () => {
      const disconnectedInterface = new IDEInterface('test-ide-6', 'ide', {}, mockDependencies);
      await disconnectedInterface.initialize();
      
      await expect(disconnectedInterface.executeCommand('test-command')).rejects.toThrow('IDE interface is not connected');
    });

    test('should send message successfully', async () => {
      const messageResult = { success: true, response: 'Message sent' };
      mockDependencies.browserManager.sendMessage.mockResolvedValue(messageResult);
      
      const result = await ideInterface.sendMessage('test-message', { option: 'value' });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(messageResult);
      expect(mockDependencies.browserManager.sendMessage).toHaveBeenCalledWith('test-message', {
        port: 3000,
        workspacePath: '/test/workspace',
        option: 'value'
      });
    });

    test('should handle message send failure', async () => {
      mockDependencies.browserManager.sendMessage.mockRejectedValue(new Error('Message send failed'));
      
      const result = await ideInterface.sendMessage('test-message');
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Failed to send message');
      expect(result.error.code).toBe('MESSAGE_SEND_FAILED');
    });

    test('should throw error when sending message without connection', async () => {
      const disconnectedInterface = new IDEInterface('test-ide-7', 'ide', {}, mockDependencies);
      await disconnectedInterface.initialize();
      
      await expect(disconnectedInterface.sendMessage('test-message')).rejects.toThrow('IDE interface is not connected');
    });
  });

  describe('Heartbeat Monitoring', () => {
    beforeEach(async () => {
      await ideInterface.initialize();
      await ideInterface.start();
    });

    test('should start heartbeat monitoring', () => {
      ideInterface._startHeartbeat();
      
      expect(ideInterface.heartbeatTimer).toBeDefined();
      expect(mockDependencies.logger.info).toHaveBeenCalledWith(
        'Heartbeat monitoring started',
        expect.objectContaining({
          interval: 30000
        })
      );
    });

    test('should stop heartbeat monitoring', () => {
      ideInterface._startHeartbeat();
      ideInterface._stopHeartbeat();
      
      expect(ideInterface.heartbeatTimer).toBeNull();
      expect(mockDependencies.logger.info).toHaveBeenCalledWith('Heartbeat monitoring stopped');
    });

    test('should perform heartbeat check successfully', () => {
      ideInterface._performHeartbeat();
      
      expect(ideInterface.lastHeartbeat).toBeInstanceOf(Date);
      expect(mockDependencies.browserManager.heartbeat).toHaveBeenCalledWith({
        port: 3000,
        workspacePath: '/test/workspace'
      });
    });

    test('should handle heartbeat check failure', () => {
      mockDependencies.browserManager.heartbeat.mockImplementation(() => {
        throw new Error('Heartbeat failed');
      });
      
      ideInterface._performHeartbeat();
      
      expect(mockDependencies.logger.warn).toHaveBeenCalledWith(
        'Heartbeat check failed',
        expect.objectContaining({
          error: 'Heartbeat failed'
        })
      );
    });

    test('should attempt reconnection on heartbeat failure when autoReconnect is enabled', () => {
      mockDependencies.browserManager.heartbeat.mockImplementation(() => {
        throw new Error('Heartbeat failed');
      });
      
      const reconnectSpy = jest.spyOn(ideInterface, '_attemptReconnection');
      ideInterface._performHeartbeat();
      
      expect(reconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Event Publishing', () => {
    test('should publish events to event bus', async () => {
      await ideInterface.initialize();
      
      expect(mockDependencies.eventBus.publish).toHaveBeenCalledWith(
        'ide.initialized',
        expect.objectContaining({
          source: 'IDEInterface',
          interfaceId: 'test-ide-1',
          workspacePath: '/test/workspace',
          port: 3000,
          ideType: 'cursor'
        })
      );
    });

    test('should handle event publishing failure gracefully', async () => {
      mockDependencies.eventBus.publish.mockImplementation(() => {
        throw new Error('Event publishing failed');
      });
      
      await ideInterface.initialize();
      
      expect(mockDependencies.logger.warn).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.objectContaining({
          eventName: 'ide.initialized',
          error: 'Event publishing failed'
        })
      );
    });

    test('should handle missing event bus gracefully', async () => {
      const interfaceWithoutEventBus = new IDEInterface('test-ide-8', 'ide', {}, {
        logger: mockDependencies.logger
      });
      
      await interfaceWithoutEventBus.initialize();
      // Should not throw error
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors', async () => {
      mockDependencies.workspaceService.validateWorkspacePath.mockRejectedValue(new Error('Validation error'));
      
      await expect(ideInterface.initialize()).rejects.toThrow('Validation error');
      expect(ideInterface.status).toBe('error');
    });

    test('should handle start errors', async () => {
      await ideInterface.initialize();
      mockDependencies.browserManager.start.mockRejectedValue(new Error('Start error'));
      
      await expect(ideInterface.start()).rejects.toThrow('Start error');
      expect(ideInterface.status).toBe('error');
    });

    test('should handle stop errors', async () => {
      await ideInterface.initialize();
      await ideInterface.start();
      mockDependencies.browserManager.stop.mockRejectedValue(new Error('Stop error'));
      
      await expect(ideInterface.stop()).rejects.toThrow('Stop error');
      expect(ideInterface.status).toBe('error');
    });

    test('should handle destroy errors', async () => {
      await ideInterface.initialize();
      await ideInterface.start();
      mockDependencies.browserManager.cleanup.mockRejectedValue(new Error('Cleanup error'));
      
      await expect(ideInterface.destroy()).rejects.toThrow('Cleanup error');
      expect(ideInterface.status).toBe('error');
    });
  });

  describe('Configuration Management', () => {
    test('should handle custom IDE configuration', () => {
      const customConfig = {
        autoReconnect: false,
        heartbeatInterval: 60000,
        connectionTimeout: 20000,
        maxRetries: 5,
        customSetting: 'value'
      };
      
      const customInterface = new IDEInterface('test-ide-9', 'ide', { ideConfig: customConfig }, mockDependencies);
      
      expect(customInterface.ideConfig).toEqual({
        autoReconnect: false,
        heartbeatInterval: 60000,
        connectionTimeout: 20000,
        maxRetries: 5,
        customSetting: 'value'
      });
    });

    test('should use default IDE configuration when not provided', () => {
      const defaultInterface = new IDEInterface('test-ide-10', 'ide', {}, mockDependencies);
      
      expect(defaultInterface.ideConfig).toEqual({
        autoReconnect: true,
        heartbeatInterval: 30000,
        connectionTimeout: 10000,
        maxRetries: 3
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing browser manager gracefully', async () => {
      const interfaceWithoutBrowserManager = new IDEInterface('test-ide-11', 'ide', {}, {
        logger: mockDependencies.logger
      });
      
      await interfaceWithoutBrowserManager.initialize();
      await interfaceWithoutBrowserManager.start();
      
      const result = await interfaceWithoutBrowserManager.executeCommand('test-command');
      expect(result.success).toBe(true);
      expect(result.data.command).toBe('test-command');
    });

    test('should handle missing port manager gracefully', async () => {
      const interfaceWithoutPortManager = new IDEInterface('test-ide-12', 'ide', {
        workspacePath: '/test',
        port: 3000
      }, {
        logger: mockDependencies.logger,
        browserManager: mockDependencies.browserManager
      });
      
      await interfaceWithoutPortManager.initialize();
      expect(interfaceWithoutPortManager.status).toBe('initialized');
    });

    test('should handle missing workspace service gracefully', async () => {
      const interfaceWithoutWorkspaceService = new IDEInterface('test-ide-13', 'ide', {
        workspacePath: '/test'
      }, {
        logger: mockDependencies.logger,
        browserManager: mockDependencies.browserManager
      });
      
      await interfaceWithoutWorkspaceService.initialize();
      expect(interfaceWithoutWorkspaceService.status).toBe('initialized');
    });

    test('should handle special characters in configuration', () => {
      const specialConfig = {
        workspacePath: '/test/workspace_123',
        port: 3000,
        ideType: 'cursor-special'
      };
      
      const specialInterface = new IDEInterface('test-ide-14', 'ide', specialConfig, mockDependencies);
      
      expect(specialInterface.workspacePath).toBe('/test/workspace_123');
      expect(specialInterface.ideType).toBe('cursor-special');
    });
  });
});
