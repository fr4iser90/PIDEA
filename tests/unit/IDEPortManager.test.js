/**
 * Unit tests for IDEPortManager
 */

const IDEPortManager = require('@services/IDEPortManager');
const { jest } = require('@jest/globals');

describe('IDEPortManager', () => {
  let portManager;
  let mockIDEManager;
  let mockEventBus;

  beforeEach(() => {
    // Mock IDE Manager
    mockIDEManager = {
      getAvailableIDEs: jest.fn(),
      switchToIDE: jest.fn()
    };

    // Mock Event Bus
    mockEventBus = {
      subscribe: jest.fn(),
      publish: jest.fn()
    };

    portManager = new IDEPortManager(mockIDEManager, mockEventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct properties', () => {
      expect(portManager.ideManager).toBe(mockIDEManager);
      expect(portManager.eventBus).toBe(mockEventBus);
      expect(portManager.activePort).toBeNull();
      expect(portManager.portPreferences).toBeInstanceOf(Map);
      expect(portManager.portHealth).toBeInstanceOf(Map);
      expect(portManager.fallbackStrategies).toEqual([
        'previously_active',
        'first_available',
        'healthiest_ide',
        'default_port_range'
      ]);
    });

    test('should setup event handlers', () => {
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('idePortFailure', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('ideHealthChanged', expect.any(Function));
    });
  });

  describe('isValidPortRange', () => {
    test('should return true for valid Cursor ports', () => {
      expect(portManager.isValidPortRange(9222)).toBe(true);
      expect(portManager.isValidPortRange(9225)).toBe(true);
      expect(portManager.isValidPortRange(9231)).toBe(true);
    });

    test('should return true for valid VSCode ports', () => {
      expect(portManager.isValidPortRange(9232)).toBe(true);
      expect(portManager.isValidPortRange(9235)).toBe(true);
      expect(portManager.isValidPortRange(9241)).toBe(true);
    });

    test('should return true for valid Windsurf ports', () => {
      expect(portManager.isValidPortRange(9242)).toBe(true);
      expect(portManager.isValidPortRange(9245)).toBe(true);
      expect(portManager.isValidPortRange(9251)).toBe(true);
    });

    test('should return false for invalid ports', () => {
      expect(portManager.isValidPortRange(9221)).toBe(false);
      expect(portManager.isValidPortRange(9232)).toBe(true);
      expect(portManager.isValidPortRange(9252)).toBe(false);
      expect(portManager.isValidPortRange(0)).toBe(false);
      expect(portManager.isValidPortRange(9999)).toBe(false);
    });
  });

  describe('calculateHealthScore', () => {
    test('should calculate base score correctly', () => {
      const ide = { status: 'stopped' };
      expect(portManager.calculateHealthScore(ide)).toBe(50);
    });

    test('should add points for running status', () => {
      const ide = { status: 'running' };
      expect(portManager.calculateHealthScore(ide)).toBe(70);
    });

    test('should add points for active status', () => {
      const ide = { status: 'active' };
      expect(portManager.calculateHealthScore(ide)).toBe(60);
    });

    test('should add points for healthy status', () => {
      const ide = { status: 'running', healthStatus: 'healthy' };
      expect(portManager.calculateHealthScore(ide)).toBe(90);
    });

    test('should add points for warning status', () => {
      const ide = { status: 'running', healthStatus: 'warning' };
      expect(portManager.calculateHealthScore(ide)).toBe(80);
    });

    test('should add points for workspace path', () => {
      const ide = { status: 'running', workspacePath: '/path/to/workspace' };
      expect(portManager.calculateHealthScore(ide)).toBe(80);
    });

    test('should add points for preferences', () => {
      const ide = { status: 'running', port: 9222 };
      portManager.portPreferences.set(9222, { weight: 20 });
      expect(portManager.calculateHealthScore(ide)).toBe(90);
    });

    test('should cap score at 100', () => {
      const ide = { status: 'running', healthStatus: 'healthy', workspacePath: '/path' };
      portManager.portPreferences.set(ide.port, { weight: 50 });
      expect(portManager.calculateHealthScore(ide)).toBe(100);
    });
  });

  describe('validatePort', () => {
    beforeEach(() => {
      mockIDEManager.getAvailableIDEs.mockResolvedValue([
        { port: 9222, status: 'running', workspacePath: '/path' }
      ]);
    });

    test('should return false for invalid port range', async () => {
      const result = await portManager.validatePort(9999);
      expect(result).toBe(false);
    });

    test('should return false when IDE not found', async () => {
      const result = await portManager.validatePort(9223);
      expect(result).toBe(false);
    });

    test('should return false when IDE not running', async () => {
      mockIDEManager.getAvailableIDEs.mockResolvedValue([
        { port: 9222, status: 'stopped', workspacePath: '/path' }
      ]);
      const result = await portManager.validatePort(9222);
      expect(result).toBe(false);
    });

    test('should return true for valid port', async () => {
      const result = await portManager.validatePort(9222);
      expect(result).toBe(true);
    });

    test('should handle errors gracefully', async () => {
      mockIDEManager.getAvailableIDEs.mockRejectedValue(new Error('Test error'));
      const result = await portManager.validatePort(9222);
      expect(result).toBe(false);
    });
  });

  describe('selectActivePort', () => {
    beforeEach(() => {
      mockIDEManager.getAvailableIDEs.mockResolvedValue([
        { port: 9222, status: 'running', workspacePath: '/path' },
        { port: 9223, status: 'running', workspacePath: '/path2' }
      ]);
    });

    test('should use previously active port if valid', async () => {
      portManager.activePort = 9222;
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
      
      const result = await portManager.selectActivePort();
      expect(result).toBe(9222);
    });

    test('should fallback to first available port', async () => {
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
      
      const result = await portManager.selectActivePort();
      expect(result).toBe(9222);
    });

    test('should return null when no ports available', async () => {
      mockIDEManager.getAvailableIDEs.mockResolvedValue([]);
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(false);
      
      const result = await portManager.selectActivePort();
      expect(result).toBeNull();
    });

    test('should handle errors gracefully', async () => {
      mockIDEManager.getAvailableIDEs.mockRejectedValue(new Error('Test error'));
      
      const result = await portManager.selectActivePort();
      expect(result).toBeNull();
    });
  });

  describe('setActivePort', () => {
    beforeEach(() => {
      mockIDEManager.getAvailableIDEs.mockResolvedValue([
        { port: 9222, status: 'running', workspacePath: '/path' }
      ]);
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
    });

    test('should set active port successfully', async () => {
      const result = await portManager.setActivePort(9222);
      expect(result).toBe(true);
      expect(portManager.activePort).toBe(9222);
      expect(mockIDEManager.switchToIDE).toHaveBeenCalledWith(9222);
      expect(mockEventBus.publish).toHaveBeenCalledWith('activePortChanged', {
        port: 9222,
        timestamp: expect.any(String)
      });
    });

    test('should return false when validation fails', async () => {
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(false);
      
      const result = await portManager.setActivePort(9222);
      expect(result).toBe(false);
      expect(portManager.activePort).toBeNull();
    });

    test('should handle errors gracefully', async () => {
      mockIDEManager.switchToIDE.mockRejectedValue(new Error('Test error'));
      
      const result = await portManager.setActivePort(9222);
      expect(result).toBe(false);
    });
  });

  describe('handlePortFailure', () => {
    test('should remove failed port from preferences', async () => {
      portManager.portPreferences.set(9222, { weight: 100 });
      portManager.portHealth.set(9222, 'healthy');
      portManager.activePort = 9222;
      
      jest.spyOn(portManager, 'selectActivePort').mockResolvedValue(9223);
      jest.spyOn(portManager, 'setActivePort').mockResolvedValue(true);
      
      await portManager.handlePortFailure(9222, 'test failure');
      
      expect(portManager.portPreferences.has(9222)).toBe(false);
      expect(portManager.portHealth.has(9222)).toBe(false);
    });

    test('should select new port when active port fails', async () => {
      portManager.activePort = 9222;
      
      jest.spyOn(portManager, 'selectActivePort').mockResolvedValue(9223);
      jest.spyOn(portManager, 'setActivePort').mockResolvedValue(true);
      
      const result = await portManager.handlePortFailure(9222, 'test failure');
      expect(result).toBe(9223);
    });

    test('should return null when no new port available', async () => {
      portManager.activePort = 9222;
      
      jest.spyOn(portManager, 'selectActivePort').mockResolvedValue(null);
      
      const result = await portManager.handlePortFailure(9222, 'test failure');
      expect(result).toBeNull();
    });
  });

  describe('initialize', () => {
    test('should initialize port manager successfully', async () => {
      jest.spyOn(portManager, 'selectActivePort').mockResolvedValue(9222);
      jest.spyOn(portManager, 'setActivePort').mockResolvedValue(true);
      
      await portManager.initialize();
      
      expect(portManager.selectActivePort).toHaveBeenCalled();
      expect(portManager.setActivePort).toHaveBeenCalledWith(9222);
    });

    test('should handle initialization errors gracefully', async () => {
      jest.spyOn(portManager, 'selectActivePort').mockRejectedValue(new Error('Test error'));
      
      await expect(portManager.initialize()).resolves.not.toThrow();
    });
  });

  describe('refresh', () => {
    test('should refresh port manager state', async () => {
      portManager.activePort = 9222;
      
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
      
      await portManager.refresh();
      
      expect(portManager.validatePort).toHaveBeenCalledWith(9222);
    });

    test('should select new port when current port invalid', async () => {
      portManager.activePort = 9222;
      
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(false);
      jest.spyOn(portManager, 'selectActivePort').mockResolvedValue(9223);
      jest.spyOn(portManager, 'setActivePort').mockResolvedValue(true);
      
      await portManager.refresh();
      
      expect(portManager.selectActivePort).toHaveBeenCalled();
      expect(portManager.setActivePort).toHaveBeenCalledWith(9223);
    });
  });
}); 