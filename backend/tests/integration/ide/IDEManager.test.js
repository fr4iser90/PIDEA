/**
 * Integration tests for IDEManager with factory integration
 */

const IDEManager = require('@external/ide/IDEManager');
const IDEDetectorFactory = require('@external/ide/IDEDetectorFactory');
const IDEStarterFactory = require('@external/ide/IDEStarterFactory');
const IDEConfigManager = require('@external/ide/IDEConfigManager');

// Mock the workspace detector
jest.mock('../../../domain/services/workspace/FileBasedWorkspaceDetector');

describe('IDEManager Integration', () => {
  let ideManager;
  let mockBrowserManager;

  beforeEach(() => {
    // Create mock browser manager
    mockBrowserManager = {
      switchToPort: jest.fn()
    };

    ideManager = new IDEManager(mockBrowserManager);
  });

  afterEach(async () => {
    if (ideManager && ideManager.initialized) {
      await ideManager.shutdown();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(ideManager.initialize()).resolves.not.toThrow();
      expect(ideManager.initialized).toBe(true);
    });

    it('should not initialize twice', async () => {
      await ideManager.initialize();
      await ideManager.initialize(); // Should not throw
      expect(ideManager.initialized).toBe(true);
    });
  });

  describe('factory integration', () => {
    beforeEach(async () => {
      await ideManager.initialize();
    });

    it('should have detector factory', () => {
      expect(ideManager.detectorFactory).toBeInstanceOf(IDEDetectorFactory);
    });

    it('should have starter factory', () => {
      expect(ideManager.starterFactory).toBeInstanceOf(IDEStarterFactory);
    });

    it('should have config manager', () => {
      expect(ideManager.configManager).toBeInstanceOf(IDEConfigManager);
    });

    it('should have health monitor', () => {
      expect(ideManager.healthMonitor).toBeDefined();
    });
  });

  describe('configuration management', () => {
    beforeEach(async () => {
      await ideManager.initialize();
    });

    it('should load configuration on initialization', () => {
      expect(ideManager.configManager.config).toBeDefined();
    });

    it('should have default IDE types configured', () => {
      const config = ideManager.configManager.config;
      expect(config.ideTypes).toHaveProperty('cursor');
      expect(config.ideTypes).toHaveProperty('vscode');
      expect(config.ideTypes).toHaveProperty('windsurf');
    });

    it('should have global configuration', () => {
      const config = ideManager.configManager.config;
      expect(config.global).toBeDefined();
      expect(config.global).toHaveProperty('defaultIDE');
      expect(config.global).toHaveProperty('healthCheckInterval');
    });
  });

  describe('detector factory integration', () => {
    beforeEach(async () => {
      await ideManager.initialize();
    });

    it('should have available detectors', () => {
      const detectors = ideManager.detectorFactory.getAvailableDetectors();
      expect(detectors).toContain('cursor');
      expect(detectors).toContain('vscode');
      expect(detectors).toContain('windsurf');
    });

    it('should validate detectors', () => {
      expect(ideManager.detectorFactory.validateDetector('cursor')).toBe(true);
      expect(ideManager.detectorFactory.validateDetector('vscode')).toBe(true);
      expect(ideManager.detectorFactory.validateDetector('windsurf')).toBe(true);
    });

    it('should get detector statistics', () => {
      const stats = ideManager.detectorFactory.getDetectorStats();
      expect(stats.totalDetectors).toBe(3);
      expect(stats.validDetectors).toBe(3);
    });
  });

  describe('starter factory integration', () => {
    beforeEach(async () => {
      await ideManager.initialize();
    });

    it('should have available starters', () => {
      const starters = ideManager.starterFactory.getAvailableStarters();
      expect(starters).toContain('cursor');
      expect(starters).toContain('vscode');
      expect(starters).toContain('windsurf');
    });

    it('should validate starters', () => {
      expect(ideManager.starterFactory.validateStarter('cursor')).toBe(true);
      expect(ideManager.starterFactory.validateStarter('vscode')).toBe(true);
      expect(ideManager.starterFactory.validateStarter('windsurf')).toBe(true);
    });

    it('should get starter statistics', () => {
      const stats = ideManager.starterFactory.getStarterStats();
      expect(stats.totalStarters).toBe(3);
      expect(stats.validStarters).toBe(3);
      expect(stats.runningIDEs).toBe(0); // No IDEs running initially
    });
  });

  describe('health monitoring integration', () => {
    beforeEach(async () => {
      await ideManager.initialize();
    });

    it('should start health monitoring on initialization', () => {
      expect(ideManager.healthMonitor.isMonitoring()).toBe(true);
    });

    it('should have health monitoring configuration', () => {
      const config = ideManager.healthMonitor.getMonitoringConfig();
      expect(config.monitoring).toBe(true);
      expect(config.interval).toBeDefined();
    });

    it('should get health statistics', () => {
      const stats = ideManager.healthMonitor.getHealthStats();
      expect(stats).toHaveProperty('totalIDEs');
      expect(stats).toHaveProperty('healthyIDEs');
      expect(stats).toHaveProperty('unhealthyIDEs');
      expect(stats).toHaveProperty('errorIDEs');
      expect(stats).toHaveProperty('monitoring');
    });
  });

  describe('IDE management operations', () => {
    beforeEach(async () => {
      await ideManager.initialize();
    });

    it('should get available IDEs', async () => {
      const ides = await ideManager.getAvailableIDEs();
      expect(Array.isArray(ides)).toBe(true);
    });

    it('should get manager statistics', () => {
      const stats = ideManager.getStats();
      expect(stats).toHaveProperty('initialized');
      expect(stats).toHaveProperty('activePort');
      expect(stats).toHaveProperty('totalIDEs');
      expect(stats).toHaveProperty('runningIDEs');
      expect(stats).toHaveProperty('detectorStats');
      expect(stats).toHaveProperty('starterStats');
      expect(stats).toHaveProperty('configStats');
      expect(stats).toHaveProperty('healthStats');
    });

    it('should refresh IDE list', async () => {
      const ides = await ideManager.refreshIDEList();
      expect(Array.isArray(ides)).toBe(true);
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await ideManager.initialize();
    });

    it('should shutdown gracefully', async () => {
      await expect(ideManager.shutdown()).resolves.not.toThrow();
      expect(ideManager.initialized).toBe(false);
    });

    it('should stop health monitoring on shutdown', async () => {
      await ideManager.shutdown();
      expect(ideManager.healthMonitor.isMonitoring()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock a failure in config loading
      jest.spyOn(ideManager.configManager, 'loadConfig').mockRejectedValue(new Error('Config error'));
      
      await expect(ideManager.initialize()).rejects.toThrow('Config error');
    });

    it('should handle detector factory errors', async () => {
      await ideManager.initialize();
      
      // Mock a detector failure
      jest.spyOn(ideManager.detectorFactory, 'detectAll').mockRejectedValue(new Error('Detection error'));
      
      await expect(ideManager.getAvailableIDEs()).rejects.toThrow('Detection error');
    });
  });
}); 