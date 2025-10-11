/**
 * InterfaceFactory Unit Tests
 * 
 * Tests for the InterfaceFactory service functionality,
 * including interface creation, type detection, configuration
 * management, and factory pattern implementation.
 */
const InterfaceFactory = require('../../domain/services/interface/InterfaceFactory');
const InterfaceManager = require('../../domain/services/interface/InterfaceManager');
const BaseInterface = require('../../domain/services/interface/BaseInterface');

// Mock implementation for testing
class TestInterface extends BaseInterface {
  async initialize(config) {
    this.setStatus('initialized');
    return Promise.resolve();
  }

  async start() {
    this.setStatus('running');
    return Promise.resolve();
  }

  async stop() {
    this.setStatus('stopped');
    return Promise.resolve();
  }

  async destroy() {
    this.setStatus('destroyed');
    return Promise.resolve();
  }
}

describe('InterfaceFactory', () => {
  let interfaceFactory;
  let interfaceManager;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    interfaceManager = new InterfaceManager({ logger: mockLogger });
    interfaceManager.registerInterface('test', TestInterface, { defaultConfig: 'value' });
    interfaceManager.registerInterface('ide', TestInterface, { ideConfig: 'value' });

    interfaceFactory = new InterfaceFactory({
      logger: mockLogger,
      interfaceManager
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      const factory = new InterfaceFactory();
      
      expect(factory.defaultConfigs).toBeInstanceOf(Map);
      expect(factory.typeDetectors).toBeInstanceOf(Map);
      expect(factory.creationHooks).toBeInstanceOf(Map);
    });

    test('should initialize with provided dependencies', () => {
      expect(interfaceFactory.logger).toBe(mockLogger);
      expect(interfaceFactory.interfaceManager).toBe(interfaceManager);
    });
  });

  describe('Default Configuration Registration', () => {
    test('should register default configuration', () => {
      const config = { testConfig: 'value' };
      interfaceFactory.registerDefaultConfig('test', config);
      
      expect(interfaceFactory.defaultConfigs.has('test')).toBe(true);
      expect(interfaceFactory.defaultConfigs.get('test')).toEqual(config);
    });

    test('should throw error for invalid interface type', () => {
      expect(() => {
        interfaceFactory.registerDefaultConfig(null, {});
      }).toThrow('interfaceType must be a non-empty string');

      expect(() => {
        interfaceFactory.registerDefaultConfig('', {});
      }).toThrow('interfaceType must be a non-empty string');
    });

    test('should throw error for invalid configuration', () => {
      expect(() => {
        interfaceFactory.registerDefaultConfig('test', null);
      }).toThrow('config must be an object');

      expect(() => {
        interfaceFactory.registerDefaultConfig('test', 'invalid');
      }).toThrow('config must be an object');
    });
  });

  describe('Type Detector Registration', () => {
    test('should register type detector', () => {
      const detector = jest.fn().mockResolvedValue(true);
      interfaceFactory.registerTypeDetector('test', detector);
      
      expect(interfaceFactory.typeDetectors.has('test')).toBe(true);
      expect(interfaceFactory.typeDetectors.get('test')).toBe(detector);
    });

    test('should throw error for invalid interface type', () => {
      expect(() => {
        interfaceFactory.registerTypeDetector(null, jest.fn());
      }).toThrow('interfaceType must be a non-empty string');
    });

    test('should throw error for invalid detector', () => {
      expect(() => {
        interfaceFactory.registerTypeDetector('test', null);
      }).toThrow('detector must be a function');

      expect(() => {
        interfaceFactory.registerTypeDetector('test', 'invalid');
      }).toThrow('detector must be a function');
    });
  });

  describe('Creation Hook Registration', () => {
    test('should register creation hook', () => {
      const hook = jest.fn();
      interfaceFactory.registerCreationHook('test', hook);
      
      expect(interfaceFactory.creationHooks.has('test')).toBe(true);
      expect(interfaceFactory.creationHooks.get('test')).toBe(hook);
    });

    test('should throw error for invalid interface type', () => {
      expect(() => {
        interfaceFactory.registerCreationHook(null, jest.fn());
      }).toThrow('interfaceType must be a non-empty string');
    });

    test('should throw error for invalid hook', () => {
      expect(() => {
        interfaceFactory.registerCreationHook('test', null);
      }).toThrow('hook must be a function');

      expect(() => {
        interfaceFactory.registerCreationHook('test', 'invalid');
      }).toThrow('hook must be a function');
    });
  });

  describe('Interface Type Detection', () => {
    test('should detect interface type using detector', async () => {
      const detector = jest.fn().mockResolvedValue(true);
      interfaceFactory.registerTypeDetector('test', detector);
      
      const detectedType = await interfaceFactory.detectInterfaceType({ test: 'value' });
      
      expect(detectedType).toBe('test');
      expect(detector).toHaveBeenCalledWith({ test: 'value' });
    });

    test('should return null when no detector matches', async () => {
      const detector = jest.fn().mockResolvedValue(false);
      interfaceFactory.registerTypeDetector('test', detector);
      
      const detectedType = await interfaceFactory.detectInterfaceType({ test: 'value' });
      
      expect(detectedType).toBeNull();
    });

    test('should handle detector errors gracefully', async () => {
      const detector = jest.fn().mockRejectedValue(new Error('Detector error'));
      interfaceFactory.registerTypeDetector('test', detector);
      
      const detectedType = await interfaceFactory.detectInterfaceType({ test: 'value' });
      
      expect(detectedType).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Type detector failed for test',
        expect.objectContaining({
          interfaceType: 'test',
          error: 'Detector error'
        })
      );
    });

    test('should return null when no detectors registered', async () => {
      const detectedType = await interfaceFactory.detectInterfaceType({ test: 'value' });
      expect(detectedType).toBeNull();
    });
  });

  describe('Interface Creation', () => {
    test('should create interface with automatic type detection', async () => {
      const detector = jest.fn().mockResolvedValue(true);
      interfaceFactory.registerTypeDetector('test', detector);
      
      const interfaceInstance = await interfaceFactory.createInterface(
        { test: 'value' },
        { customConfig: 'custom' }
      );
      
      expect(interfaceInstance).toBeInstanceOf(TestInterface);
      expect(interfaceInstance.type).toBe('test');
      expect(interfaceInstance.config).toEqual({
        defaultConfig: 'value',
        customConfig: 'custom'
      });
    });

    test('should create interface with explicit type', async () => {
      const interfaceInstance = await interfaceFactory.createInterfaceByType(
        'test',
        { customConfig: 'custom' }
      );
      
      expect(interfaceInstance).toBeInstanceOf(TestInterface);
      expect(interfaceInstance.type).toBe('test');
      expect(interfaceInstance.config).toEqual({
        defaultConfig: 'value',
        customConfig: 'custom'
      });
    });

    test('should throw error when interface manager not available', async () => {
      const factoryWithoutManager = new InterfaceFactory({ logger: mockLogger });
      
      await expect(
        factoryWithoutManager.createInterface({})
      ).rejects.toThrow('InterfaceManager is required for interface creation');
    });

    test('should throw error when type detection fails', async () => {
      const detector = jest.fn().mockResolvedValue(false);
      interfaceFactory.registerTypeDetector('test', detector);
      
      await expect(
        interfaceFactory.createInterface({ test: 'value' })
      ).rejects.toThrow('Could not detect appropriate interface type');
    });

    test('should execute creation hook after interface creation', async () => {
      const hook = jest.fn();
      interfaceFactory.registerCreationHook('test', hook);
      
      const interfaceInstance = await interfaceFactory.createInterfaceByType('test');
      
      expect(hook).toHaveBeenCalledWith(interfaceInstance, {});
    });

    test('should handle creation hook errors gracefully', async () => {
      const hook = jest.fn().mockRejectedValue(new Error('Hook error'));
      interfaceFactory.registerCreationHook('test', hook);
      
      // Should not throw error
      const interfaceInstance = await interfaceFactory.createInterfaceByType('test');
      
      expect(interfaceInstance).toBeInstanceOf(TestInterface);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Creation hook failed for test',
        expect.objectContaining({
          interfaceType: 'test',
          error: 'Hook error'
        })
      );
    });
  });

  describe('Multiple Interface Creation', () => {
    test('should create multiple interfaces successfully', async () => {
      const specifications = [
        { type: 'test', config: { config1: 'value1' } },
        { type: 'ide', config: { config2: 'value2' } }
      ];
      
      const result = await interfaceFactory.createMultipleInterfaces(specifications);
      
      expect(result.results).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
      
      result.results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.interface).toBeInstanceOf(TestInterface);
        expect(result.index).toBe(index);
        expect(result.specification).toEqual(specifications[index]);
      });
    });

    test('should handle partial failures in multiple interface creation', async () => {
      // Register a type that will cause creation to fail
      interfaceManager.registerInterface('error', class ErrorInterface {
        constructor() {
          throw new Error('Constructor error');
        }
      });
      
      const specifications = [
        { type: 'test', config: { config1: 'value1' } },
        { type: 'error', config: { config2: 'value2' } }
      ];
      
      const result = await interfaceFactory.createMultipleInterfaces(specifications);
      
      expect(result.results).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
      
      expect(result.results[0].success).toBe(true);
      expect(result.errors[0].success).toBe(false);
      expect(result.errors[0].error).toBe('Constructor error');
    });

    test('should throw error for invalid specifications', async () => {
      await expect(
        interfaceFactory.createMultipleInterfaces('invalid')
      ).rejects.toThrow('specifications must be an array');
    });
  });

  describe('Utility Methods', () => {
    test('should get available types', () => {
      const types = interfaceFactory.getAvailableTypes();
      expect(types).toContain('test');
      expect(types).toContain('ide');
    });

    test('should get default configuration', () => {
      interfaceFactory.registerDefaultConfig('test', { testConfig: 'value' });
      
      const config = interfaceFactory.getDefaultConfig('test');
      expect(config).toEqual({ testConfig: 'value' });
      
      const nonExistentConfig = interfaceFactory.getDefaultConfig('non-existent');
      expect(nonExistentConfig).toBeNull();
    });

    test('should check if type detector is registered', () => {
      expect(interfaceFactory.hasTypeDetector('test')).toBe(false);
      
      interfaceFactory.registerTypeDetector('test', jest.fn());
      expect(interfaceFactory.hasTypeDetector('test')).toBe(true);
    });

    test('should check if creation hook is registered', () => {
      expect(interfaceFactory.hasCreationHook('test')).toBe(false);
      
      interfaceFactory.registerCreationHook('test', jest.fn());
      expect(interfaceFactory.hasCreationHook('test')).toBe(true);
    });

    test('should get factory statistics', () => {
      interfaceFactory.registerDefaultConfig('test', {});
      interfaceFactory.registerTypeDetector('test', jest.fn());
      interfaceFactory.registerCreationHook('test', jest.fn());
      
      const stats = interfaceFactory.getStats();
      
      expect(stats).toEqual({
        defaultConfigs: 1,
        typeDetectors: 1,
        creationHooks: 1,
        availableTypes: 2
      });
    });
  });

  describe('Configuration Merging', () => {
    test('should merge configurations correctly', async () => {
      interfaceFactory.registerDefaultConfig('test', { default: 'value' });
      
      const interfaceInstance = await interfaceFactory.createInterfaceByType(
        'test',
        { custom: 'value' }
      );
      
      expect(interfaceInstance.config).toEqual({
        defaultConfig: 'value',
        default: 'value',
        custom: 'value'
      });
    });

    test('should handle missing interface manager gracefully', () => {
      const factoryWithoutManager = new InterfaceFactory({ logger: mockLogger });
      
      const types = factoryWithoutManager.getAvailableTypes();
      expect(types).toEqual([]);
    });
  });

  describe('Cleanup', () => {
    test('should destroy factory and clear resources', () => {
      interfaceFactory.registerDefaultConfig('test', {});
      interfaceFactory.registerTypeDetector('test', jest.fn());
      interfaceFactory.registerCreationHook('test', jest.fn());
      
      expect(interfaceFactory.defaultConfigs.size).toBe(1);
      expect(interfaceFactory.typeDetectors.size).toBe(1);
      expect(interfaceFactory.creationHooks.size).toBe(1);
      
      interfaceFactory.destroy();
      
      expect(interfaceFactory.defaultConfigs.size).toBe(0);
      expect(interfaceFactory.typeDetectors.size).toBe(0);
      expect(interfaceFactory.creationHooks.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty context in type detection', async () => {
      const detectedType = await interfaceFactory.detectInterfaceType();
      expect(detectedType).toBeNull();
    });

    test('should handle empty specifications array', async () => {
      const result = await interfaceFactory.createMultipleInterfaces([]);
      
      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    test('should handle special characters in interface type', () => {
      interfaceFactory.registerDefaultConfig('test-type_123', {});
      expect(interfaceFactory.getDefaultConfig('test-type_123')).toEqual({});
    });
  });
});
