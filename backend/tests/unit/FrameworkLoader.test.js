/**
 * Framework Loader Unit Tests
 * Tests the FrameworkLoader class functionality
 */

const path = require('path');
const fs = require('fs').promises;
const FrameworkLoader = require('../../infrastructure/framework/FrameworkLoader');

// Mock the domain framework registry
jest.mock('../../domain/frameworks', () => ({
  frameworkRegistry: {
    registerFramework: jest.fn().mockResolvedValue(true),
    unregisterFramework: jest.fn().mockResolvedValue(true)
  }
}));

// Mock the logger
jest.mock('@logging/Logger', () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }));
});

describe('FrameworkLoader Unit Tests', () => {
  let frameworkLoader;
  let mockFrameworkPath;

  beforeEach(() => {
    frameworkLoader = new FrameworkLoader();
    mockFrameworkPath = path.join(__dirname, '../../framework');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with empty state', () => {
      expect(frameworkLoader.loadedFrameworks).toBeDefined();
      expect(frameworkLoader.frameworkPaths).toBeDefined();
      expect(frameworkLoader.loadingQueue).toBeDefined();
      expect(frameworkLoader.isLoading).toBe(false);
    });
  });

  describe('Framework Discovery', () => {
    test('should discover framework directories', async () => {
      // Mock fs.readdir to return test framework directories
      jest.spyOn(fs, 'readdir').mockResolvedValue([
        { name: 'test_framework', isDirectory: () => true },
        { name: 'another_framework', isDirectory: () => true },
        { name: 'framework.json', isDirectory: () => false }
      ]);

      jest.spyOn(fs, 'access').mockResolvedValue();

      await frameworkLoader.discoverFrameworks();

      expect(frameworkLoader.frameworkPaths.size).toBe(2);
      expect(frameworkLoader.frameworkPaths.has('test_framework')).toBe(true);
      expect(frameworkLoader.frameworkPaths.has('another_framework')).toBe(true);
    });

    test('should handle missing framework directory', async () => {
      jest.spyOn(fs, 'access').mockRejectedValue(new Error('Directory not found'));
      jest.spyOn(fs, 'mkdir').mockResolvedValue();

      await frameworkLoader.discoverFrameworks();

      expect(frameworkLoader.frameworkPaths.size).toBe(0);
    });
  });

  describe('Framework Configuration Loading', () => {
    test('should load valid framework configuration', async () => {
      const mockConfig = {
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'testing',
        author: 'Test Author',
        dependencies: ['core'],
        steps: {},
        workflows: {},
        activation: {
          auto_load: false,
          requires_confirmation: true,
          fallback_to_core: true
        }
      };

      jest.spyOn(fs, 'access').mockResolvedValue();
      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

      await frameworkLoader.loadFrameworkConfig('test_framework', mockFrameworkPath);

      expect(frameworkLoader.loadedFrameworks.has('test_framework')).toBe(true);
      const loadedFramework = frameworkLoader.loadedFrameworks.get('test_framework');
      expect(loadedFramework.name).toBe('test_framework');
      expect(loadedFramework.config).toEqual(mockConfig);
      expect(loadedFramework.status).toBe('loaded');
      expect(loadedFramework.domainRegistered).toBe(true);
    });

    test('should create default configuration for missing config file', async () => {
      jest.spyOn(fs, 'access').mockRejectedValue(new Error('File not found'));
      jest.spyOn(fs, 'writeFile').mockResolvedValue();

      await frameworkLoader.loadFrameworkConfig('missing_framework', mockFrameworkPath);

      expect(frameworkLoader.loadedFrameworks.has('missing_framework')).toBe(true);
      const loadedFramework = frameworkLoader.loadedFrameworks.get('missing_framework');
      expect(loadedFramework.config.name).toBe('missing_framework');
      expect(loadedFramework.isDefault).toBe(true);
    });

    test('should handle invalid JSON configuration', async () => {
      jest.spyOn(fs, 'access').mockResolvedValue();
      jest.spyOn(fs, 'readFile').mockResolvedValue('invalid json');

      await expect(frameworkLoader.loadFrameworkConfig('invalid_framework', mockFrameworkPath))
        .rejects.toThrow();

      const loadedFramework = frameworkLoader.loadedFrameworks.get('invalid_framework');
      expect(loadedFramework.status).toBe('failed');
      expect(loadedFramework.error).toBeDefined();
    });
  });

  describe('Framework Validation', () => {
    test('should validate framework configuration', () => {
      const validConfig = {
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'testing'
      };

      expect(() => frameworkLoader.validateFrameworkConfig(validConfig)).not.toThrow();
    });

    test('should reject invalid framework configuration', () => {
      const invalidConfig = {
        name: '', // Empty name
        version: '1.0.0',
        description: 'Test framework',
        category: 'testing'
      };

      expect(() => frameworkLoader.validateFrameworkConfig(invalidConfig)).toThrow();
    });

    test('should validate activation settings', () => {
      const configWithActivation = {
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'testing',
        activation: {
          auto_load: 'invalid', // Should be boolean
          requires_confirmation: true,
          fallback_to_core: true
        }
      };

      expect(() => frameworkLoader.validateFrameworkConfig(configWithActivation)).toThrow();
    });
  });

  describe('Framework Management', () => {
    beforeEach(async () => {
      // Setup a loaded framework for testing
      const mockConfig = {
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'testing'
      };

      frameworkLoader.loadedFrameworks.set('test_framework', {
        name: 'test_framework',
        path: mockFrameworkPath,
        config: mockConfig,
        status: 'loaded',
        loadedAt: new Date(),
        domainRegistered: true
      });
    });

    test('should get loaded framework', () => {
      const framework = frameworkLoader.getFramework('test_framework');
      
      expect(framework).toBeDefined();
      expect(framework.name).toBe('test_framework');
      expect(framework.status).toBe('loaded');
    });

    test('should return undefined for non-existent framework', () => {
      const framework = frameworkLoader.getFramework('non_existent');
      
      expect(framework).toBeUndefined();
    });

    test('should get all loaded frameworks', () => {
      const frameworks = frameworkLoader.getAllFrameworks();
      
      expect(Array.isArray(frameworks)).toBe(true);
      expect(frameworks.length).toBe(1);
      expect(frameworks[0].name).toBe('test_framework');
    });

    test('should get frameworks by category', () => {
      const frameworks = frameworkLoader.getFrameworksByCategory('testing');
      
      expect(Array.isArray(frameworks)).toBe(true);
      expect(frameworks.length).toBe(1);
      expect(frameworks[0].name).toBe('test_framework');
    });

    test('should unload framework', async () => {
      const result = await frameworkLoader.unloadFramework('test_framework');
      
      expect(result).toBe(true);
      expect(frameworkLoader.loadedFrameworks.has('test_framework')).toBe(false);
    });

    test('should handle unloading non-existent framework', async () => {
      const result = await frameworkLoader.unloadFramework('non_existent');
      
      expect(result).toBe(false);
    });
  });

  describe('Statistics and Health', () => {
    beforeEach(async () => {
      // Setup test frameworks
      const frameworks = [
        { name: 'framework1', config: { category: 'testing' } },
        { name: 'framework2', config: { category: 'testing' } },
        { name: 'framework3', config: { category: 'development' } }
      ];

      frameworks.forEach(fw => {
        frameworkLoader.loadedFrameworks.set(fw.name, {
          name: fw.name,
          config: fw.config,
          status: 'loaded',
          domainRegistered: true
        });
      });

      frameworkLoader.frameworkPaths.set('framework1', '/path1');
      frameworkLoader.frameworkPaths.set('framework2', '/path2');
      frameworkLoader.frameworkPaths.set('framework3', '/path3');
    });

    test('should get correct statistics', () => {
      const stats = frameworkLoader.getStats();
      
      expect(stats.totalFrameworks).toBe(3);
      expect(stats.loadedFrameworks).toBe(3);
      expect(stats.categories).toBeDefined();
      expect(stats.categories.testing).toBe(2);
      expect(stats.categories.development).toBe(1);
    });

    test('should get correct health status', () => {
      const healthStatus = frameworkLoader.getHealthStatus();
      
      expect(healthStatus.totalFrameworks).toBe(3);
      expect(healthStatus.loadedFrameworks).toBe(3);
      expect(healthStatus.failedFrameworks).toBe(0);
      expect(healthStatus.domainRegistered).toBe(3);
      expect(healthStatus.healthScore).toBe(100);
      expect(healthStatus.isHealthy).toBe(true);
    });

    test('should calculate health score correctly with failures', () => {
      // Add a failed framework
      frameworkLoader.loadedFrameworks.set('failed_framework', {
        name: 'failed_framework',
        status: 'failed',
        error: 'Test error'
      });

      const healthStatus = frameworkLoader.getHealthStatus();
      
      expect(healthStatus.totalFrameworks).toBe(3);
      expect(healthStatus.loadedFrameworks).toBe(3);
      expect(healthStatus.failedFrameworks).toBe(1);
      expect(healthStatus.healthScore).toBeLessThan(100);
      expect(healthStatus.isHealthy).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      jest.spyOn(fs, 'readdir').mockRejectedValue(new Error('Permission denied'));

      await expect(frameworkLoader.discoverFrameworks()).rejects.toThrow('Permission denied');
    });

    test('should handle domain registry errors gracefully', async () => {
      const { frameworkRegistry } = require('../../domain/frameworks');
      frameworkRegistry.registerFramework.mockRejectedValue(new Error('Registry error'));

      const mockConfig = {
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'testing'
      };

      jest.spyOn(fs, 'access').mockResolvedValue();
      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

      // Should not throw even if domain registration fails
      await frameworkLoader.loadFrameworkConfig('test_framework', mockFrameworkPath);

      const loadedFramework = frameworkLoader.loadedFrameworks.get('test_framework');
      expect(loadedFramework.status).toBe('loaded');
      expect(loadedFramework.domainRegistered).toBe(true);
    });
  });
});
