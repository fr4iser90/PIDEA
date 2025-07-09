const TerminalLogCaptureService = require('@/domain/services/TerminalLogCaptureService');
const fs = require('fs').promises;
const path = require('path');

// Mock dependencies
jest.mock('@/infrastructure/external/IDEManager');
jest.mock('@/infrastructure/external/BrowserManager');
jest.mock('@/domain/services/IDEMirrorService');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    chmod: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn()
  }
}));

describe('TerminalLogCaptureService', () => {
  let service;
  let mockIDEManager;
  let mockBrowserManager;
  let mockIDEMirrorService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Get mocked dependencies
    mockIDEManager = require('@/infrastructure/external/IDEManager');
    mockBrowserManager = require('@/infrastructure/external/BrowserManager');
    mockIDEMirrorService = require('@/domain/services/IDEMirrorService');
    
    // Setup default mock implementations
    mockIDEManager.prototype.initialize = jest.fn().mockResolvedValue();
    mockIDEManager.prototype.switchToIDE = jest.fn().mockResolvedValue();
    mockIDEManager.prototype.getActiveIDE = jest.fn().mockResolvedValue({ port: 9222 });
    mockBrowserManager.prototype.connect = jest.fn().mockResolvedValue();
    mockIDEMirrorService.prototype.typeInIDE = jest.fn().mockResolvedValue();
    mockIDEMirrorService.prototype.clickElementInIDE = jest.fn().mockResolvedValue();
    
    // Create service instance after setting up mocks
    service = new TerminalLogCaptureService();
    
    // Replace service dependencies with mocked instances
    service.ideManager = new mockIDEManager();
    service.browserManager = new mockBrowserManager();
    service.ideMirrorService = new mockIDEMirrorService();
    
    fs.mkdir.mockResolvedValue();
    fs.chmod.mockResolvedValue();
    fs.readFile.mockResolvedValue('test log content');
    fs.writeFile.mockResolvedValue();
    fs.appendFile.mockResolvedValue();
    fs.stat.mockResolvedValue({ size: 100 });
    fs.unlink.mockResolvedValue();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(service.ideManager).toBeDefined();
      expect(service.browserManager).toBeDefined();
      expect(service.ideMirrorService).toBeDefined();
      expect(service.isInitialized).toBe(false);
      expect(service.captureIntervals).toBeInstanceOf(Map);
      expect(service.logDirectories).toBeInstanceOf(Map);
      expect(service.encryptionKey).toBeDefined();
      expect(service.algorithm).toBe('aes-256-cbc');
    });
  });

  describe('initialize', () => {
    test('should initialize IDE manager and set initialized flag', async () => {
      await service.initialize();
      
      expect(mockIDEManager.prototype.initialize).toHaveBeenCalled();
      expect(service.isInitialized).toBe(true);
    });

    test('should not initialize twice', async () => {
      await service.initialize();
      await service.initialize();
      
      expect(mockIDEManager.prototype.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('initializeCapture', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should initialize capture for a port', async () => {
      const port = 9222;
      
      await service.initializeCapture(port);
      
      expect(fs.mkdir).toHaveBeenCalledWith(
        `/tmp/IDEWEB/${port}/logs`,
        { recursive: true }
      );
      expect(mockIDEManager.prototype.switchToIDE).toHaveBeenCalledWith(port);
      expect(mockBrowserManager.prototype.connect).toHaveBeenCalledWith(port);
      expect(mockIDEMirrorService.prototype.typeInIDE).toHaveBeenCalledWith('Control+Shift+`');
      expect(service.logDirectories.get(port)).toBe(`/tmp/IDEWEB/${port}/logs`);
      expect(service.captureIntervals.has(port)).toBe(true);
    });

    test('should handle initialization errors', async () => {
      const port = 9222;
      const error = new Error('Initialization failed');
      
      mockIDEManager.prototype.switchToIDE.mockRejectedValue(error);
      
      await expect(service.initializeCapture(port)).rejects.toThrow('Initialization failed');
    });
  });

  describe('createSecureLogDirectory', () => {
    test('should create directory with secure permissions', async () => {
      const logDir = '/tmp/IDEWEB/9222/logs';
      
      await service.createSecureLogDirectory(logDir);
      
      expect(fs.mkdir).toHaveBeenCalledWith(logDir, { recursive: true });
      expect(fs.chmod).toHaveBeenCalledWith(logDir, 0o700);
    });

    test('should handle directory creation errors', async () => {
      const logDir = '/tmp/IDEWEB/9222/logs';
      const error = new Error('Permission denied');
      
      fs.mkdir.mockRejectedValue(error);
      
      await expect(service.createSecureLogDirectory(logDir)).rejects.toThrow('Permission denied');
    });
  });

  describe('openTerminal', () => {
    test('should open terminal using IDEMirrorService', async () => {
      await service.openTerminal();
      
      expect(mockIDEMirrorService.prototype.typeInIDE).toHaveBeenCalledWith('Control+Shift+`');
    });

    test('should handle terminal opening errors', async () => {
      const error = new Error('Terminal not available');
      
      mockIDEMirrorService.prototype.typeInIDE.mockRejectedValue(error);
      
      await expect(service.openTerminal()).rejects.toThrow('Terminal not available');
    });
  });

  describe('setupLogCapture', () => {
    test('should execute setup commands', async () => {
      const port = 9222;
      
      await service.setupLogCapture(port);
      
      expect(mockIDEMirrorService.prototype.clickElementInIDE).toHaveBeenCalledWith('.xterm-helper-textarea');
      expect(mockIDEMirrorService.prototype.typeInIDE).toHaveBeenCalledWith(`mkdir -p /tmp/IDEWEB/${port}/logs`);
      expect(mockIDEMirrorService.prototype.typeInIDE).toHaveBeenCalledWith(`echo "Log capture initialized at $(date)" > /tmp/IDEWEB/${port}/logs/terminal.log`);
      expect(mockIDEMirrorService.prototype.typeInIDE).toHaveBeenCalledWith(`echo "$$" > /tmp/IDEWEB/${port}/logs/process.pid`);
    });
  });

  describe('executeTerminalCommand', () => {
    test('should execute command in terminal', async () => {
      const command = 'ls -la';
      
      await service.executeTerminalCommand(command);
      
      expect(mockIDEMirrorService.prototype.clickElementInIDE).toHaveBeenCalledWith('.xterm-helper-textarea');
      expect(mockIDEMirrorService.prototype.typeInIDE).toHaveBeenCalledWith(command);
      expect(mockIDEMirrorService.prototype.typeInIDE).toHaveBeenCalledWith('Enter');
    });
  });

  describe('startLogMonitoring', () => {
    test('should start monitoring interval', async () => {
      const port = 9222;
      
      // Mock processLogFile
      service.processLogFile = jest.fn().mockResolvedValue();
      
      await service.startLogMonitoring(port);
      
      expect(service.captureIntervals.has(port)).toBe(true);
      
      // Clean up
      clearInterval(service.captureIntervals.get(port));
    });

    test('should stop existing monitoring before starting new one', async () => {
      const port = 9222;
      
      // Mock processLogFile
      service.processLogFile = jest.fn().mockResolvedValue();
      
      // Start first monitoring
      await service.startLogMonitoring(port);
      const firstInterval = service.captureIntervals.get(port);
      
      // Start second monitoring
      await service.startLogMonitoring(port);
      const secondInterval = service.captureIntervals.get(port);
      
      expect(firstInterval).not.toBe(secondInterval);
      
      // Clean up
      clearInterval(secondInterval);
    });
  });

  describe('processLogFile', () => {
    test('should process log file and encrypt entries', async () => {
      const port = 9222;
      const logContent = 'test log line 1\ntest log line 2\n';
      
      fs.stat.mockResolvedValue({ size: logContent.length });
      fs.readFile.mockResolvedValue(logContent);
      
      // Mock writeEncryptedLogEntry
      service.writeEncryptedLogEntry = jest.fn().mockResolvedValue();
      
      await service.processLogFile(port);
      
      expect(fs.readFile).toHaveBeenCalledWith(`/tmp/IDEWEB/${port}/logs/terminal.log`, 'utf8');
      expect(service.writeEncryptedLogEntry).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).toHaveBeenCalledWith(`/tmp/IDEWEB/${port}/logs/terminal.log`, '');
    });

    test('should handle empty log file', async () => {
      const port = 9222;
      
      fs.stat.mockResolvedValue({ size: 0 });
      
      await service.processLogFile(port);
      
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    test('should handle missing log file', async () => {
      const port = 9222;
      
      fs.stat.mockRejectedValue(new Error('File not found'));
      
      await service.processLogFile(port);
      
      expect(fs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('writeEncryptedLogEntry', () => {
    test('should encrypt and write log entry', async () => {
      const filePath = '/tmp/IDEWEB/9222/logs/terminal.encrypted.log';
      const logEntry = {
        timestamp: '2023-01-01T00:00:00.000Z',
        type: 'terminal',
        text: 'test log entry',
        level: 'info'
      };
      
      await service.writeEncryptedLogEntry(filePath, logEntry);
      
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.appendFile).toHaveBeenCalledWith(filePath, expect.any(String));
      expect(fs.chmod).toHaveBeenCalledWith(filePath, 0o600);
    });
  });

  describe('executeCommandWithCapture', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should execute command with output capture', async () => {
      const port = 9222;
      const command = 'npm run dev';
      
      service.initializeCapture = jest.fn().mockResolvedValue();
      service.executeTerminalCommand = jest.fn().mockResolvedValue();
      service.logDirectories.set(port, '/tmp/IDEWEB/9222/logs'); // Simuliere, dass Capture schon initialisiert ist
      
      await service.executeCommandWithCapture(port, command);
      
      expect(service.initializeCapture).not.toHaveBeenCalled(); // Sollte nicht aufgerufen werden, da logDirectories gesetzt ist
      expect(service.executeTerminalCommand).toHaveBeenCalledWith(`${command} >> /tmp/IDEWEB/${port}/logs/terminal.log 2>&1`);
    });

    test('should switch IDE if not on target port', async () => {
      const port = 9222;
      const command = 'npm run dev';
      
      service.initializeCapture = jest.fn().mockResolvedValue();
      service.executeTerminalCommand = jest.fn().mockResolvedValue();
      service.logDirectories.set(port, '/tmp/IDEWEB/9222/logs');
      service.ideManager.getActiveIDE = jest.fn().mockResolvedValue({ port: 9223 });
      service.ideManager.switchToIDE = jest.fn().mockResolvedValue();
      service.browserManager.connect = jest.fn().mockResolvedValue();
      
      await service.executeCommandWithCapture(port, command);
      
      expect(service.ideManager.switchToIDE).toHaveBeenCalledWith(port);
      expect(service.browserManager.connect).toHaveBeenCalledWith(port);
      expect(service.executeTerminalCommand).toHaveBeenCalledWith(`${command} >> /tmp/IDEWEB/${port}/logs/terminal.log 2>&1`);
    });
  });

  describe('stopCapture', () => {
    test('should stop capture and cleanup', async () => {
      const port = 9222;
      
      // Setup monitoring
      service.captureIntervals.set(port, setInterval(() => {}, 1000));
      
      // Mock PID file
      fs.readFile.mockResolvedValue('12345');
      
      await service.stopCapture(port);
      
      expect(service.captureIntervals.has(port)).toBe(false);
    });

    test('should handle missing PID file', async () => {
      const port = 9222;
      
      fs.readFile.mockRejectedValue(new Error('File not found'));
      
      await service.stopCapture(port);
      
      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('getCaptureStatus', () => {
    test('should return capture status', async () => {
      const port = 9222;
      
      // Setup some state
      service.captureIntervals.set(port, setInterval(() => {}, 1000));
      service.logDirectories.set(port, `/tmp/IDEWEB/${port}/logs`);
      
      fs.stat.mockResolvedValue({ size: 100 });
      
      const status = await service.getCaptureStatus(port);
      
      expect(status.port).toBe(port);
      expect(status.isMonitoring).toBe(true);
      expect(status.logDirectory).toBe(`/tmp/IDEWEB/${port}/logs`);
      expect(status.logFileExists).toBe(true);
      expect(status.encryptedLogExists).toBe(true);
      expect(status.active).toBe(true);
      
      // Clean up
      clearInterval(service.captureIntervals.get(port));
    });

    test('should handle missing files', async () => {
      const port = 9222;
      
      fs.stat.mockRejectedValue(new Error('File not found'));
      
      const status = await service.getCaptureStatus(port);
      
      expect(status.logFileExists).toBe(false);
      expect(status.encryptedLogExists).toBe(false);
      expect(status.active).toBe(false);
    });
  });

  describe('cleanup', () => {
    test('should cleanup all resources', async () => {
      const port = 9222;
      
      // Setup some state
      service.captureIntervals.set(port, setInterval(() => {}, 1000));
      service.logDirectories.set(port, `/tmp/IDEWEB/${port}/logs`);
      
      // Mock stopCapture
      service.stopCapture = jest.fn().mockResolvedValue();
      
      await service.cleanup();
      
      expect(service.stopCapture).toHaveBeenCalledWith(port);
      expect(service.captureIntervals.size).toBe(0);
      expect(service.logDirectories.size).toBe(0);
    });
  });
}); 