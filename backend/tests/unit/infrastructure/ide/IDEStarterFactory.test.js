const IDEStarterFactory = require('../../../../infrastructure/external/ide/IDEStarterFactory');
const CursorStarter = require('../../../../infrastructure/external/ide/starters/CursorStarter');
const VSCodeStarter = require('../../../../infrastructure/external/ide/starters/VSCodeStarter');
const WindsurfStarter = require('../../../../infrastructure/external/ide/starters/WindsurfStarter');

describe('IDEStarterFactory', () => {
  let factory;

  beforeEach(() => {
    factory = new IDEStarterFactory();
  });

  describe('constructor', () => {
    it('should initialize with default starters', () => {
      expect(factory.starters).toBeDefined();
      expect(factory.starters.size).toBe(3);
      expect(factory.getAvailableStarters()).toContain('cursor');
      expect(factory.getAvailableStarters()).toContain('vscode');
      expect(factory.getAvailableStarters()).toContain('windsurf');
    });

    it('should initialize running processes map', () => {
      expect(factory.runningProcesses).toBeDefined();
      expect(factory.runningProcesses.size).toBe(0);
    });
  });

  describe('createStarter', () => {
    it('should create cursor starter', () => {
      const starter = factory.createStarter('cursor');
      expect(starter).toBeInstanceOf(CursorStarter);
    });

    it('should create vscode starter', () => {
      const starter = factory.createStarter('vscode');
      expect(starter).toBeInstanceOf(VSCodeStarter);
    });

    it('should create windsurf starter', () => {
      const starter = factory.createStarter('windsurf');
      expect(starter).toBeInstanceOf(WindsurfStarter);
    });

    it('should throw error for unsupported IDE type', () => {
      expect(() => factory.createStarter('unsupported')).toThrow('Unsupported IDE type: unsupported');
    });

    it('should be case insensitive', () => {
      const starter = factory.createStarter('CURSOR');
      expect(starter).toBeInstanceOf(CursorStarter);
    });
  });

  describe('registerStarter', () => {
    it('should register new starter', () => {
      const mockStarter = {
        startIDE: jest.fn()
      };
      
      factory.registerStarter('test', mockStarter);
      expect(factory.getAvailableStarters()).toContain('test');
      expect(factory.createStarter('test')).toBe(mockStarter);
    });

    it('should throw error for invalid starter', () => {
      const invalidStarter = {};
      expect(() => factory.registerStarter('test', invalidStarter)).toThrow('Starter must implement startIDE method');
    });

    it('should throw error for null starter', () => {
      expect(() => factory.registerStarter('test', null)).toThrow('Starter must implement startIDE method');
    });
  });

  describe('getAvailableStarters', () => {
    it('should return array of available starter types', () => {
      const starters = factory.getAvailableStarters();
      expect(Array.isArray(starters)).toBe(true);
      expect(starters).toContain('cursor');
      expect(starters).toContain('vscode');
      expect(starters).toContain('windsurf');
    });
  });

  describe('startIDE', () => {
    it('should start cursor IDE', async () => {
      const mockStarter = {
        startIDE: jest.fn().mockResolvedValue({
          port: 9222,
          pid: 12345,
          status: 'running',
          process: { pid: 12345 }
        })
      };
      
      factory.starters.set('cursor', mockStarter);
      
      const result = await factory.startIDE('cursor', 9222, '/test/path');
      
      expect(mockStarter.startIDE).toHaveBeenCalledWith(9222, '/test/path', {});
      expect(result.port).toBe(9222);
      expect(result.ideType).toBe('cursor');
    });

    it('should throw error if IDE already running on port', async () => {
      factory.runningProcesses.set(9222, { pid: 12345 });
      
      await expect(factory.startIDE('cursor', 9222)).rejects.toThrow('IDE already running on port 9222');
    });

    it('should track process when starter provides it', async () => {
      const mockProcess = { pid: 12345 };
      const mockStarter = {
        startIDE: jest.fn().mockResolvedValue({
          port: 9222,
          pid: 12345,
          status: 'running',
          process: mockProcess
        })
      };
      
      factory.starters.set('cursor', mockStarter);
      
      await factory.startIDE('cursor', 9222);
      
      expect(factory.runningProcesses.has(9222)).toBe(true);
      expect(factory.runningProcesses.get(9222)).toBe(mockProcess);
    });
  });

  describe('stopIDE', () => {
    it('should stop IDE on port', async () => {
      const mockProcess = { pid: 12345 };
      const mockStarter = {
        stopIDE: jest.fn().mockResolvedValue({ status: 'stopped' })
      };
      
      factory.runningProcesses.set(9222, mockProcess);
      factory.starters.set('cursor', mockStarter);
      
      const result = await factory.stopIDE(9222, 'cursor');
      
      expect(mockStarter.stopIDE).toHaveBeenCalledWith(9222);
      expect(result.port).toBe(9222);
      expect(result.status).toBe('stopped');
      expect(factory.runningProcesses.has(9222)).toBe(false);
    });

    it('should throw error if no IDE running on port', async () => {
      await expect(factory.stopIDE(9222)).rejects.toThrow('No IDE process found on port 9222');
    });

    it('should detect IDE type if not provided', async () => {
      const mockProcess = { pid: 12345 };
      const mockStarter = {
        stopIDE: jest.fn().mockResolvedValue({ status: 'stopped' })
      };
      
      factory.runningProcesses.set(9222, mockProcess);
      factory.starters.set('cursor', mockStarter);
      
      await factory.stopIDE(9222);
      
      expect(mockStarter.stopIDE).toHaveBeenCalledWith(9222);
    });
  });

  describe('getRunningIDEs', () => {
    it('should return array of running IDEs', () => {
      const mockProcess1 = { pid: 12345 };
      const mockProcess2 = { pid: 12346 };
      
      factory.runningProcesses.set(9222, mockProcess1);
      factory.runningProcesses.set(9232, mockProcess2);
      
      const runningIDEs = factory.getRunningIDEs();
      
      expect(runningIDEs).toHaveLength(2);
      expect(runningIDEs).toContainEqual({
        port: 9222,
        pid: 12345,
        status: 'running',
        ideType: 'cursor'
      });
      expect(runningIDEs).toContainEqual({
        port: 9232,
        pid: 12346,
        status: 'running',
        ideType: 'vscode'
      });
    });

    it('should return empty array when no IDEs running', () => {
      const runningIDEs = factory.getRunningIDEs();
      expect(runningIDEs).toHaveLength(0);
    });
  });

  describe('isIDERunning', () => {
    it('should return true if IDE running on port', () => {
      factory.runningProcesses.set(9222, { pid: 12345 });
      expect(factory.isIDERunning(9222)).toBe(true);
    });

    it('should return false if no IDE running on port', () => {
      expect(factory.isIDERunning(9222)).toBe(false);
    });

    it('should validate IDE type if provided', () => {
      factory.runningProcesses.set(9222, { pid: 12345 });
      expect(factory.isIDERunning(9222, 'cursor')).toBe(true);
      expect(factory.isIDERunning(9222, 'vscode')).toBe(false);
    });
  });

  describe('detectIDEType', () => {
    it('should detect cursor for ports 9222-9231', () => {
      expect(factory.detectIDEType(9222)).toBe('cursor');
      expect(factory.detectIDEType(9231)).toBe('cursor');
    });

    it('should detect vscode for ports 9232-9241', () => {
      expect(factory.detectIDEType(9232)).toBe('vscode');
      expect(factory.detectIDEType(9241)).toBe('vscode');
    });

    it('should detect windsurf for ports 9242-9251', () => {
      expect(factory.detectIDEType(9242)).toBe('windsurf');
      expect(factory.detectIDEType(9251)).toBe('windsurf');
    });

    it('should return null for unknown port ranges', () => {
      expect(factory.detectIDEType(9000)).toBeNull();
      expect(factory.detectIDEType(9300)).toBeNull();
    });
  });

  describe('validateStarter', () => {
    it('should return true for valid starter', () => {
      expect(factory.validateStarter('cursor')).toBe(true);
      expect(factory.validateStarter('vscode')).toBe(true);
      expect(factory.validateStarter('windsurf')).toBe(true);
    });

    it('should return false for invalid starter', () => {
      expect(factory.validateStarter('invalid')).toBe(false);
    });
  });

  describe('getStarterStats', () => {
    it('should return starter statistics', () => {
      const stats = factory.getStarterStats();
      
      expect(stats).toHaveProperty('totalStarters');
      expect(stats).toHaveProperty('availableTypes');
      expect(stats).toHaveProperty('validStarters');
      
      expect(stats.totalStarters).toBe(3);
      expect(stats.availableTypes).toContain('cursor');
      expect(stats.availableTypes).toContain('vscode');
      expect(stats.availableTypes).toContain('windsurf');
      expect(stats.validStarters).toBe(3);
    });
  });

  describe('stopAllIDEs', () => {
    it('should stop all running IDEs', async () => {
      const mockProcess1 = { pid: 12345 };
      const mockProcess2 = { pid: 12346 };
      
      factory.runningProcesses.set(9222, mockProcess1);
      factory.runningProcesses.set(9232, mockProcess2);
      
      const mockStarter = {
        stopIDE: jest.fn().mockResolvedValue({ status: 'stopped' })
      };
      
      factory.starters.set('cursor', mockStarter);
      factory.starters.set('vscode', mockStarter);
      
      await factory.stopAllIDEs();
      
      expect(factory.runningProcesses.size).toBe(0);
    });
  });
}); 