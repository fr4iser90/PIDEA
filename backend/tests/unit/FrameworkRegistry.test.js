/**
 * FrameworkRegistry Unit Tests - Domain Layer
 * Tests the clean domain layer implementation without infrastructure concerns
 */

const FrameworkRegistry = require('@domain/frameworks/FrameworkRegistry');

describe('FrameworkRegistry - Domain Layer', () => {
  let frameworkRegistry;

  beforeEach(() => {
    frameworkRegistry = new FrameworkRegistry();
  });

  afterEach(() => {
    // Clean up after each test
    frameworkRegistry.frameworks.clear();
    frameworkRegistry.configs.clear();
    frameworkRegistry.categories.clear();
  });

  describe('Framework Registration', () => {
    it('should register a framework with valid metadata', async () => {
      const frameworkName = 'test-framework';
      const config = {
        name: 'test-framework',
        version: '1.0.0',
        description: 'Test framework for unit testing',
        category: 'testing'
      };

      await frameworkRegistry.registerFramework(frameworkName, config, 'testing');

      expect(frameworkRegistry.hasFramework(frameworkName)).toBe(true);
      expect(frameworkRegistry.getFramework(frameworkName)).toBeDefined();
      expect(frameworkRegistry.getFramework(frameworkName).name).toBe(frameworkName);
    });

    it('should validate framework configuration metadata', async () => {
      const frameworkName = 'valid-framework';
      const config = {
        name: 'valid-framework',
        version: '2.1.0',
        description: 'A valid framework configuration',
        category: 'development'
      };

      await frameworkRegistry.registerFramework(frameworkName, config, 'development');

      const framework = frameworkRegistry.getFramework(frameworkName);
      expect(framework.name).toBe('valid-framework');
      expect(framework.version).toBe('2.1.0');
      expect(framework.description).toBe('A valid framework configuration');
      expect(framework.category).toBe('development');
    });

    it('should throw error for invalid framework configuration', async () => {
      const frameworkName = 'invalid-framework';
      const invalidConfig = {
        // Missing required fields
        version: '1.0.0'
      };

      await expect(
        frameworkRegistry.registerFramework(frameworkName, invalidConfig, 'testing')
      ).rejects.toThrow('Framework configuration must have a "name" property');
    });

    it('should throw error for missing version', async () => {
      const frameworkName = 'no-version-framework';
      const config = {
        name: 'no-version-framework',
        description: 'Framework without version',
        category: 'testing'
      };

      await expect(
        frameworkRegistry.registerFramework(frameworkName, config, 'testing')
      ).rejects.toThrow('Framework configuration must have a "version" property');
    });

    it('should throw error for missing description', async () => {
      const frameworkName = 'no-description-framework';
      const config = {
        name: 'no-description-framework',
        version: '1.0.0',
        category: 'testing'
      };

      await expect(
        frameworkRegistry.registerFramework(frameworkName, config, 'testing')
      ).rejects.toThrow('Framework configuration must have a "description" property');
    });
  });

  describe('Framework Loading', () => {
    it('should load framework configurations from array', async () => {
      const configs = [
        {
          name: 'framework-1',
          version: '1.0.0',
          description: 'First test framework',
          category: 'testing'
        },
        {
          name: 'framework-2',
          version: '2.0.0',
          description: 'Second test framework',
          category: 'development'
        }
      ];

      await frameworkRegistry.loadFrameworkConfigs(configs);

      expect(frameworkRegistry.hasFramework('framework-1')).toBe(true);
      expect(frameworkRegistry.hasFramework('framework-2')).toBe(true);
      expect(frameworkRegistry.getAllFrameworks()).toHaveLength(2);
    });

    it('should handle empty configs array', async () => {
      await frameworkRegistry.loadFrameworkConfigs([]);

      expect(frameworkRegistry.getAllFrameworks()).toHaveLength(0);
    });

    it('should continue loading even if one config fails', async () => {
      const configs = [
        {
          name: 'valid-framework',
          version: '1.0.0',
          description: 'Valid framework',
          category: 'testing'
        },
        {
          // Invalid config - missing name
          version: '1.0.0',
          description: 'Invalid framework',
          category: 'testing'
        }
      ];

      await frameworkRegistry.loadFrameworkConfigs(configs);

      // Should have loaded the valid framework
      expect(frameworkRegistry.hasFramework('valid-framework')).toBe(true);
      expect(frameworkRegistry.getAllFrameworks()).toHaveLength(1);
    });
  });

  describe('Framework Retrieval', () => {
    beforeEach(async () => {
      const configs = [
        {
          name: 'framework-a',
          version: '1.0.0',
          description: 'Framework A',
          category: 'testing'
        },
        {
          name: 'framework-b',
          version: '2.0.0',
          description: 'Framework B',
          category: 'development'
        },
        {
          name: 'framework-c',
          version: '3.0.0',
          description: 'Framework C',
          category: 'testing'
        }
      ];

      await frameworkRegistry.loadFrameworkConfigs(configs);
    });

    it('should get framework by name', () => {
      const framework = frameworkRegistry.getFramework('framework-a');
      expect(framework).toBeDefined();
      expect(framework.name).toBe('framework-a');
    });

    it('should return undefined for non-existent framework', () => {
      const framework = frameworkRegistry.getFramework('non-existent');
      expect(framework).toBeUndefined();
    });

    it('should get all frameworks', () => {
      const frameworks = frameworkRegistry.getAllFrameworks();
      expect(frameworks).toHaveLength(3);
      expect(frameworks.map(f => f.name)).toContain('framework-a');
      expect(frameworks.map(f => f.name)).toContain('framework-b');
      expect(frameworks.map(f => f.name)).toContain('framework-c');
    });

    it('should get frameworks by category', () => {
      const testingFrameworks = frameworkRegistry.getFrameworksByCategory('testing');
      expect(testingFrameworks).toHaveLength(2);
      expect(testingFrameworks.map(f => f.name)).toContain('framework-a');
      expect(testingFrameworks.map(f => f.name)).toContain('framework-c');

      const developmentFrameworks = frameworkRegistry.getFrameworksByCategory('development');
      expect(developmentFrameworks).toHaveLength(1);
      expect(developmentFrameworks[0].name).toBe('framework-b');
    });

    it('should check if framework exists', () => {
      expect(frameworkRegistry.hasFramework('framework-a')).toBe(true);
      expect(frameworkRegistry.hasFramework('non-existent')).toBe(false);
    });
  });

  describe('Framework Management', () => {
    beforeEach(async () => {
      const config = {
        name: 'test-framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'testing'
      };

      await frameworkRegistry.registerFramework('test-framework', config, 'testing');
    });

    it('should remove framework', () => {
      expect(frameworkRegistry.hasFramework('test-framework')).toBe(true);

      const result = frameworkRegistry.removeFramework('test-framework');
      expect(result).toBe(true);
      expect(frameworkRegistry.hasFramework('test-framework')).toBe(false);
    });

    it('should return false when removing non-existent framework', () => {
      const result = frameworkRegistry.removeFramework('non-existent');
      expect(result).toBe(false);
    });

    it('should get framework count', () => {
      expect(frameworkRegistry.getFrameworkCount()).toBe(1);
    });

    it('should get category count', () => {
      expect(frameworkRegistry.getCategoryCount()).toBe(1);
    });
  });

  describe('Domain Layer Separation', () => {
    it('should not handle file system operations', () => {
      // Domain layer should not have file system methods
      expect(typeof frameworkRegistry.loadFrameworkConfigs).toBe('function');
      
      // The method should accept configs array, not perform file operations
      const configs = [
        {
          name: 'test-framework',
          version: '1.0.0',
          description: 'Test framework',
          category: 'testing'
        }
      ];

      // Should work with provided configs
      expect(async () => {
        await frameworkRegistry.loadFrameworkConfigs(configs);
      }).not.toThrow();
    });

    it('should only validate metadata, not steps', () => {
      const configWithSteps = {
        name: 'framework-with-steps',
        version: '1.0.0',
        description: 'Framework with steps',
        category: 'testing',
        steps: {
          'step1': { file: 'step1.js', type: 'action' },
          'step2': { file: 'step2.js', type: 'validation' }
        }
      };

      // Should not throw error for steps - domain layer doesn't validate steps
      expect(async () => {
        await frameworkRegistry.registerFramework('framework-with-steps', configWithSteps, 'testing');
      }).not.toThrow();
    });

    it('should not import file system modules', () => {
      // Check that the module doesn't have file system imports
      const fs = require('fs');
      const path = require('path');
      
      // Domain layer should not use these modules directly
      expect(frameworkRegistry.constructor.toString()).not.toContain('fs');
      expect(frameworkRegistry.constructor.toString()).not.toContain('path');
    });
  });

  describe('IStandardRegistry Interface', () => {
    it('should implement export method', () => {
      expect(typeof FrameworkRegistry.export).toBe('function');
    });

    it('should implement import method', () => {
      expect(typeof FrameworkRegistry.import).toBe('function');
    });

    it('should export registry data', () => {
      const exportedData = FrameworkRegistry.export();
      expect(exportedData).toHaveProperty('frameworks');
      expect(exportedData).toHaveProperty('categories');
      expect(exportedData).toHaveProperty('configs');
    });

    it('should import registry data', () => {
      const testData = {
        frameworks: [['test-framework', { name: 'test-framework', version: '1.0.0' }]],
        categories: [['testing', ['test-framework']]],
        configs: [['test-framework', { name: 'test-framework' }]]
      };

      const result = FrameworkRegistry.import(testData);
      expect(result).toBe(true);
      
      // Create a new instance to test the imported data
      const newRegistry = new FrameworkRegistry();
      newRegistry.import(testData);
      expect(newRegistry.hasFramework('test-framework')).toBe(true);
    });
  });
});
