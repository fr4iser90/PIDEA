/**
 * Unit tests for IDEInterface
 */
const IDEInterface = require('../../../domain/services/ide/IDEInterface');

describe('IDEInterface', () => {
  let ideInterface;

  beforeEach(() => {
    ideInterface = new IDEInterface();
  });

  describe('Interface Methods', () => {
    it('should have detect method', () => {
      expect(typeof ideInterface.detect).toBe('function');
    });

    it('should have start method', () => {
      expect(typeof ideInterface.start).toBe('function');
    });

    it('should have stop method', () => {
      expect(typeof ideInterface.stop).toBe('function');
    });

    it('should have getStatus method', () => {
      expect(typeof ideInterface.getStatus).toBe('function');
    });

    it('should have getVersion method', () => {
      expect(typeof ideInterface.getVersion).toBe('function');
    });

    it('should have getFeatures method', () => {
      expect(typeof ideInterface.getFeatures).toBe('function');
    });

    it('should have executeCommand method', () => {
      expect(typeof ideInterface.executeCommand).toBe('function');
    });

    it('should have getDOM method', () => {
      expect(typeof ideInterface.getDOM).toBe('function');
    });

    it('should have interact method', () => {
      expect(typeof ideInterface.interact).toBe('function');
    });

    it('should have sendMessage method', () => {
      expect(typeof ideInterface.sendMessage).toBe('function');
    });

    it('should have getWorkspacePath method', () => {
      expect(typeof ideInterface.getWorkspacePath).toBe('function');
    });

    it('should have switchToPort method', () => {
      expect(typeof ideInterface.switchToPort).toBe('function');
    });

    it('should have getActivePort method', () => {
      expect(typeof ideInterface.getActivePort).toBe('function');
    });

    it('should have monitorTerminalOutput method', () => {
      expect(typeof ideInterface.monitorTerminalOutput).toBe('function');
    });

    it('should have getUserAppUrlForPort method', () => {
      expect(typeof ideInterface.getUserAppUrlForPort).toBe('function');
    });

    it('should have detectDevServerFromPackageJson method', () => {
      expect(typeof ideInterface.detectDevServerFromPackageJson).toBe('function');
    });

    it('should have applyRefactoring method', () => {
      expect(typeof ideInterface.applyRefactoring).toBe('function');
    });

    it('should have sendTask method', () => {
      expect(typeof ideInterface.sendTask).toBe('function');
    });

    it('should have sendAutoModeTasks method', () => {
      expect(typeof ideInterface.sendAutoModeTasks).toBe('function');
    });
  });

  describe('Method Implementations', () => {
    it('should throw error when detect is called', async () => {
      await expect(ideInterface.detect()).rejects.toThrow('detect() method must be implemented');
    });

    it('should throw error when start is called', async () => {
      await expect(ideInterface.start()).rejects.toThrow('start() method must be implemented');
    });

    it('should throw error when stop is called', async () => {
      await expect(ideInterface.stop()).rejects.toThrow('stop() method must be implemented');
    });

    it('should throw error when getStatus is called', async () => {
      await expect(ideInterface.getStatus()).rejects.toThrow('getStatus() method must be implemented');
    });

    it('should throw error when getVersion is called', async () => {
      await expect(ideInterface.getVersion()).rejects.toThrow('getVersion() method must be implemented');
    });

    it('should throw error when getFeatures is called', async () => {
      await expect(ideInterface.getFeatures()).rejects.toThrow('getFeatures() method must be implemented');
    });

    it('should throw error when executeCommand is called', async () => {
      await expect(ideInterface.executeCommand('test')).rejects.toThrow('executeCommand() method must be implemented');
    });

    it('should throw error when getDOM is called', async () => {
      await expect(ideInterface.getDOM()).rejects.toThrow('getDOM() method must be implemented');
    });

    it('should throw error when interact is called', async () => {
      await expect(ideInterface.interact('selector', 'action')).rejects.toThrow('interact() method must be implemented');
    });

    it('should throw error when sendMessage is called', async () => {
      await expect(ideInterface.sendMessage('test')).rejects.toThrow('sendMessage() method must be implemented');
    });

    it('should throw error when getWorkspacePath is called', async () => {
      await expect(ideInterface.getWorkspacePath()).rejects.toThrow('getWorkspacePath() method must be implemented');
    });

    it('should throw error when switchToPort is called', async () => {
      await expect(ideInterface.switchToPort(3000)).rejects.toThrow('switchToPort() method must be implemented');
    });

    it('should throw error when getActivePort is called', () => {
      expect(() => ideInterface.getActivePort()).toThrow('getActivePort() method must be implemented');
    });

    it('should throw error when monitorTerminalOutput is called', async () => {
      await expect(ideInterface.monitorTerminalOutput()).rejects.toThrow('monitorTerminalOutput() method must be implemented');
    });

    it('should throw error when getUserAppUrlForPort is called', async () => {
      await expect(ideInterface.getUserAppUrlForPort()).rejects.toThrow('getUserAppUrlForPort() method must be implemented');
    });

    it('should throw error when detectDevServerFromPackageJson is called', async () => {
      await expect(ideInterface.detectDevServerFromPackageJson()).rejects.toThrow('detectDevServerFromPackageJson() method must be implemented');
    });

    it('should throw error when applyRefactoring is called', async () => {
      await expect(ideInterface.applyRefactoring('file.js', 'code')).rejects.toThrow('applyRefactoring() method must be implemented');
    });

    it('should throw error when sendTask is called', async () => {
      await expect(ideInterface.sendTask({})).rejects.toThrow('sendTask() method must be implemented');
    });

    it('should throw error when sendAutoModeTasks is called', async () => {
      await expect(ideInterface.sendAutoModeTasks([], {})).rejects.toThrow('sendAutoModeTasks() method must be implemented');
    });
  });

  describe('Interface Contract', () => {
    it('should be a class', () => {
      expect(typeof IDEInterface).toBe('function');
    });

    it('should be instantiable', () => {
      expect(ideInterface).toBeInstanceOf(IDEInterface);
    });

    it('should have all required methods', () => {
      const requiredMethods = [
        'detect', 'start', 'stop', 'getStatus', 'getVersion',
        'getFeatures', 'executeCommand', 'getDOM', 'interact',
        'sendMessage', 'getWorkspacePath', 'switchToPort',
        'getActivePort', 'monitorTerminalOutput', 'getUserAppUrlForPort',
        'detectDevServerFromPackageJson', 'applyRefactoring',
        'sendTask', 'sendAutoModeTasks'
      ];

      requiredMethods.forEach(method => {
        expect(typeof ideInterface[method]).toBe('function');
      });
    });
  });
}); 