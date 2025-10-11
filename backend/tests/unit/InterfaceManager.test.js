/**
 * InterfaceManager Unit Tests
 * 
 * Tests for the InterfaceManager service functionality,
 * including interface registration, creation, management,
 * lifecycle operations, and error handling.
 */
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

// Mock event bus
class MockEventBus {
  constructor() {
    this.events = [];
  }

  publish(eventName, data) {
    this.events.push({ eventName, data });
  }

  getEvents() {
    return this.events;
  }

  clear() {
    this.events = [];
  }
}

describe('InterfaceManager', () => {
  let interfaceManager;
  let mockEventBus;
  let mockLogger;

  beforeEach(() => {
    mockEventBus = new MockEventBus();
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    interfaceManager = new InterfaceManager({
      logger: mockLogger,
      eventBus: mockEventBus
    });
  });

  afterEach(async () => {
    // Clean up any created interfaces
    await interfaceManager.destroy();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      const manager = new InterfaceManager();
      
      expect(manager.interfaceRegistry).toBeInstanceOf(Map);
      expect(manager.activeInterfaces).toBeInstanceOf(Map);
      expect(manager.configCache).toBeInstanceOf(Map);
      expect(manager.stats.totalCreated).toBe(0);
      expect(manager.stats.totalDestroyed).toBe(0);
      expect(manager.stats.activeCount).toBe(0);
      expect(manager.stats.errorCount).toBe(0);
    });

    test('should initialize with provided dependencies', () => {
      expect(interfaceManager.logger).toBe(mockLogger);
      expect(interfaceManager.eventBus).toBe(mockEventBus);
    });
  });

  describe('Interface Registration', () => {
    test('should register interface type successfully', () => {
      interfaceManager.registerInterface('test', TestInterface, { defaultConfig: 'value' });
      
      expect(interfaceManager.interfaceRegistry.has('test')).toBe(true);
      expect(interfaceManager.getAvailableTypes()).toContain('test');
      
      const registryInfo = interfaceManager.getRegistryInfo();
      expect(registryInfo.test).toEqual({
        className: 'TestInterface',
        registeredAt: expect.any(Date),
        config: { defaultConfig: 'value' }
      });
    });

    test('should throw error for invalid interface type', () => {
      expect(() => {
        interfaceManager.registerInterface(null, TestInterface);
      }).toThrow('interfaceType must be a non-empty string');

      expect(() => {
        interfaceManager.registerInterface('', TestInterface);
      }).toThrow('interfaceType must be a non-empty string');

      expect(() => {
        interfaceManager.registerInterface(123, TestInterface);
      }).toThrow('interfaceType must be a non-empty string');
    });

    test('should throw error for invalid interface class', () => {
      expect(() => {
        interfaceManager.registerInterface('test', null);
      }).toThrow('interfaceClass must be a constructor function');

      expect(() => {
        interfaceManager.registerInterface('test', 'not-a-class');
      }).toThrow('interfaceClass must be a constructor function');
    });

    test('should throw error for class not extending BaseInterface', () => {
      class NotBaseInterface {
        // Not extending BaseInterface
      }

      expect(() => {
        interfaceManager.registerInterface('test', NotBaseInterface);
      }).toThrow('interfaceClass must extend BaseInterface');
    });

    test('should publish registration event', () => {
      interfaceManager.registerInterface('test', TestInterface);
      
      const events = mockEventBus.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('interface.registered');
      expect(events[0].data.interfaceType).toBe('test');
      expect(events[0].data.className).toBe('TestInterface');
    });
  });

  describe('Interface Unregistration', () => {
    test('should unregister interface type successfully', () => {
      interfaceManager.registerInterface('test', TestInterface);
      expect(interfaceManager.getAvailableTypes()).toContain('test');
      
      const result = interfaceManager.unregisterInterface('test');
      expect(result).toBe(true);
      expect(interfaceManager.getAvailableTypes()).not.toContain('test');
    });

    test('should return false for non-existent interface type', () => {
      const result = interfaceManager.unregisterInterface('non-existent');
      expect(result).toBe(false);
    });

    test('should not unregister interface type with active instances', async () => {
      interfaceManager.registerInterface('test', TestInterface);
      await interfaceManager.createInterface('test');
      
      const result = interfaceManager.unregisterInterface('test');
      expect(result).toBe(false);
      expect(interfaceManager.getAvailableTypes()).toContain('test');
    });

    test('should publish unregistration event', () => {
      interfaceManager.registerInterface('test', TestInterface);
      mockEventBus.clear();
      
      interfaceManager.unregisterInterface('test');
      
      const events = mockEventBus.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('interface.unregistered');
      expect(events[0].data.interfaceType).toBe('test');
    });
  });

  describe('Interface Creation', () => {
    beforeEach(() => {
      interfaceManager.registerInterface('test', TestInterface, { defaultConfig: 'value' });
    });

    test('should create interface instance successfully', async () => {
      const interfaceInstance = await interfaceManager.createInterface('test', { customConfig: 'custom' });
      
      expect(interfaceInstance).toBeInstanceOf(TestInterface);
      expect(interfaceInstance.type).toBe('test');
      expect(interfaceInstance.config).toEqual({
        defaultConfig: 'value',
        customConfig: 'custom'
      });
      
      expect(interfaceManager.activeInterfaces.has(interfaceInstance.id)).toBe(true);
      expect(interfaceManager.stats.totalCreated).toBe(1);
      expect(interfaceManager.stats.activeCount).toBe(1);
    });

    test('should generate unique ID when not provided', async () => {
      const instance1 = await interfaceManager.createInterface('test');
      const instance2 = await interfaceManager.createInterface('test');
      
      expect(instance1.id).not.toBe(instance2.id);
      expect(instance1.id).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(instance2.id).toMatch(/^test_\d+_[a-z0-9]+$/);
    });

    test('should use provided custom ID', async () => {
      const customId = 'custom-interface-id';
      const interfaceInstance = await interfaceManager.createInterface('test', {}, customId);
      
      expect(interfaceInstance.id).toBe(customId);
    });

    test('should throw error for duplicate ID', async () => {
      const customId = 'duplicate-id';
      await interfaceManager.createInterface('test', {}, customId);
      
      await expect(
        interfaceManager.createInterface('test', {}, customId)
      ).rejects.toThrow(`Interface with ID '${customId}' already exists`);
    });

    test('should throw error for unregistered interface type', async () => {
      await expect(
        interfaceManager.createInterface('unregistered')
      ).rejects.toThrow("Interface type 'unregistered' is not registered");
    });

    test('should publish creation event', async () => {
      mockEventBus.clear();
      
      await interfaceManager.createInterface('test');
      
      const events = mockEventBus.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('interface.created');
      expect(events[0].data.interfaceType).toBe('test');
    });

    test('should handle creation errors', async () => {
      // Mock TestInterface to throw error in constructor
      class ErrorInterface extends BaseInterface {
        constructor(id, type, config, dependencies) {
          super(id, type, config, dependencies);
          throw new Error('Constructor error');
        }
        
        async initialize() {}
        async start() {}
        async stop() {}
        async destroy() {}
      }

      interfaceManager.registerInterface('error', ErrorInterface);
      
      await expect(
        interfaceManager.createInterface('error')
      ).rejects.toThrow('Constructor error');
      
      expect(interfaceManager.stats.errorCount).toBe(1);
    });
  });

  describe('Interface Retrieval', () => {
    beforeEach(async () => {
      interfaceManager.registerInterface('test', TestInterface);
      await interfaceManager.createInterface('test', {}, 'test-1');
      await interfaceManager.createInterface('test', {}, 'test-2');
    });

    test('should get interface by ID', () => {
      const interfaceInstance = interfaceManager.getInterface('test-1');
      
      expect(interfaceInstance).toBeInstanceOf(TestInterface);
      expect(interfaceInstance.id).toBe('test-1');
    });

    test('should return null for non-existent interface', () => {
      const interfaceInstance = interfaceManager.getInterface('non-existent');
      expect(interfaceInstance).toBeNull();
    });

    test('should get all interfaces', () => {
      const interfaces = interfaceManager.getAllInterfaces();
      
      expect(interfaces).toHaveLength(2);
      expect(interfaces.map(i => i.id)).toContain('test-1');
      expect(interfaces.map(i => i.id)).toContain('test-2');
    });

    test('should get interfaces by type', () => {
      const interfaces = interfaceManager.getInterfacesByType('test');
      
      expect(interfaces).toHaveLength(2);
      interfaces.forEach(interfaceInstance => {
        expect(interfaceInstance.type).toBe('test');
      });
    });

    test('should return empty array for non-existent type', () => {
      const interfaces = interfaceManager.getInterfacesByType('non-existent');
      expect(interfaces).toHaveLength(0);
    });
  });

  describe('Interface Lifecycle Management', () => {
    let interfaceInstance;

    beforeEach(async () => {
      interfaceManager.registerInterface('test', TestInterface);
      interfaceInstance = await interfaceManager.createInterface('test', {}, 'test-1');
    });

    test('should start interface successfully', async () => {
      const result = await interfaceManager.startInterface('test-1');
      
      expect(result).toBe(true);
      expect(interfaceInstance.status).toBe('running');
    });

    test('should stop interface successfully', async () => {
      await interfaceManager.startInterface('test-1');
      const result = await interfaceManager.stopInterface('test-1');
      
      expect(result).toBe(true);
      expect(interfaceInstance.status).toBe('stopped');
    });

    test('should restart interface successfully', async () => {
      await interfaceManager.startInterface('test-1');
      const result = await interfaceManager.restartInterface('test-1');
      
      expect(result).toBe(true);
      expect(interfaceInstance.status).toBe('running');
    });

    test('should throw error for non-existent interface', async () => {
      await expect(
        interfaceManager.startInterface('non-existent')
      ).rejects.toThrow('Interface not found: non-existent');

      await expect(
        interfaceManager.stopInterface('non-existent')
      ).rejects.toThrow('Interface not found: non-existent');

      await expect(
        interfaceManager.restartInterface('non-existent')
      ).rejects.toThrow('Interface not found: non-existent');
    });

    test('should handle lifecycle errors', async () => {
      // Mock interface to throw error in start method
      class ErrorInterface extends BaseInterface {
        async initialize() {}
        async start() { throw new Error('Start error'); }
        async stop() {}
        async destroy() {}
      }

      interfaceManager.registerInterface('error', ErrorInterface);
      const errorInstance = await interfaceManager.createInterface('error', {}, 'error-1');
      
      await expect(
        interfaceManager.startInterface('error-1')
      ).rejects.toThrow('Start error');
      
      expect(interfaceManager.stats.errorCount).toBe(1);
    });

    test('should publish lifecycle events', async () => {
      mockEventBus.clear();
      
      await interfaceManager.startInterface('test-1');
      
      const events = mockEventBus.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('interface.started');
      expect(events[0].data.interfaceId).toBe('test-1');
    });
  });

  describe('Interface Removal', () => {
    beforeEach(async () => {
      interfaceManager.registerInterface('test', TestInterface);
      await interfaceManager.createInterface('test', {}, 'test-1');
    });

    test('should remove interface successfully', async () => {
      const result = await interfaceManager.removeInterface('test-1');
      
      expect(result).toBe(true);
      expect(interfaceManager.activeInterfaces.has('test-1')).toBe(false);
      expect(interfaceManager.stats.totalDestroyed).toBe(1);
      expect(interfaceManager.stats.activeCount).toBe(0);
    });

    test('should return false for non-existent interface', async () => {
      const result = await interfaceManager.removeInterface('non-existent');
      expect(result).toBe(false);
    });

    test('should publish removal event', async () => {
      mockEventBus.clear();
      
      await interfaceManager.removeInterface('test-1');
      
      const events = mockEventBus.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('interface.removed');
      expect(events[0].data.interfaceId).toBe('test-1');
    });

    test('should handle removal errors', async () => {
      // Mock interface to throw error in destroy method
      class ErrorInterface extends BaseInterface {
        async initialize() {}
        async start() {}
        async stop() {}
        async destroy() { throw new Error('Destroy error'); }
      }

      interfaceManager.registerInterface('error', ErrorInterface);
      await interfaceManager.createInterface('error', {}, 'error-1');
      
      await expect(
        interfaceManager.removeInterface('error-1')
      ).rejects.toThrow('Destroy error');
      
      expect(interfaceManager.stats.errorCount).toBe(1);
    });
  });

  describe('Statistics and Status', () => {
    beforeEach(async () => {
      interfaceManager.registerInterface('test', TestInterface);
      await interfaceManager.createInterface('test', {}, 'test-1');
      await interfaceManager.createInterface('test', {}, 'test-2');
    });

    test('should provide correct statistics', () => {
      const stats = interfaceManager.getStats();
      
      expect(stats).toEqual({
        totalCreated: 2,
        totalDestroyed: 0,
        activeCount: 2,
        errorCount: 0,
        lastActivity: expect.any(Date),
        registeredTypes: 1,
        activeInterfaces: 2,
        interfaceTypes: ['test']
      });
    });

    test('should provide status summary', () => {
      const statusSummary = interfaceManager.getStatusSummary();
      
      expect(statusSummary).toEqual({
        total: 2,
        statusCounts: { created: 2 },
        types: ['test'],
        lastActivity: expect.any(Date)
      });
    });

    test('should update statistics on operations', async () => {
      await interfaceManager.startInterface('test-1');
      await interfaceManager.removeInterface('test-1');
      
      const stats = interfaceManager.getStats();
      expect(stats.totalCreated).toBe(2);
      expect(stats.totalDestroyed).toBe(1);
      expect(stats.activeCount).toBe(1);
    });
  });

  describe('Registry Information', () => {
    test('should provide registry info', () => {
      interfaceManager.registerInterface('test1', TestInterface, { config1: 'value1' });
      interfaceManager.registerInterface('test2', TestInterface, { config2: 'value2' });
      
      const registryInfo = interfaceManager.getRegistryInfo();
      
      expect(registryInfo).toHaveProperty('test1');
      expect(registryInfo).toHaveProperty('test2');
      expect(registryInfo.test1.className).toBe('TestInterface');
      expect(registryInfo.test1.config).toEqual({ config1: 'value1' });
      expect(registryInfo.test2.config).toEqual({ config2: 'value2' });
    });

    test('should provide available types', () => {
      interfaceManager.registerInterface('type1', TestInterface);
      interfaceManager.registerInterface('type2', TestInterface);
      
      const types = interfaceManager.getAvailableTypes();
      expect(types).toContain('type1');
      expect(types).toContain('type2');
    });
  });

  describe('Event Bus Integration', () => {
    test('should handle missing event bus gracefully', () => {
      const managerWithoutEventBus = new InterfaceManager({ logger: mockLogger });
      
      expect(() => {
        managerWithoutEventBus.registerInterface('test', TestInterface);
      }).not.toThrow();
    });

    test('should handle event bus errors gracefully', () => {
      const errorEventBus = {
        publish: jest.fn().mockImplementation(() => {
          throw new Error('Event bus error');
        })
      };

      const managerWithErrorEventBus = new InterfaceManager({
        logger: mockLogger,
        eventBus: errorEventBus
      });

      expect(() => {
        managerWithErrorEventBus.registerInterface('test', TestInterface);
      }).not.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to publish event: interface.registered',
        expect.objectContaining({
          eventName: 'interface.registered',
          error: 'Event bus error'
        })
      );
    });
  });

  describe('Cleanup and Destruction', () => {
    beforeEach(async () => {
      interfaceManager.registerInterface('test', TestInterface);
      await interfaceManager.createInterface('test', {}, 'test-1');
      await interfaceManager.createInterface('test', {}, 'test-2');
    });

    test('should destroy all interfaces on manager destruction', async () => {
      await interfaceManager.destroy();
      
      expect(interfaceManager.activeInterfaces.size).toBe(0);
      expect(interfaceManager.interfaceRegistry.size).toBe(0);
      expect(interfaceManager.configCache.size).toBe(0);
    });

    test('should handle destruction errors gracefully', async () => {
      // Mock interface to throw error in destroy method
      class ErrorInterface extends BaseInterface {
        async initialize() {}
        async start() {}
        async stop() {}
        async destroy() { throw new Error('Destroy error'); }
      }

      interfaceManager.registerInterface('error', ErrorInterface);
      await interfaceManager.createInterface('error', {}, 'error-1');
      
      await expect(interfaceManager.destroy()).resolves.not.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to destroy interface during cleanup: error-1',
        expect.objectContaining({
          interfaceId: 'error-1',
          error: 'Destroy error'
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty interface registry', () => {
      expect(interfaceManager.getAvailableTypes()).toHaveLength(0);
      expect(interfaceManager.getRegistryInfo()).toEqual({});
      expect(interfaceManager.getAllInterfaces()).toHaveLength(0);
    });

    test('should handle concurrent operations', async () => {
      interfaceManager.registerInterface('test', TestInterface);
      
      // Create multiple interfaces concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        interfaceManager.createInterface('test', {}, `concurrent-${i}`)
      );
      
      const interfaces = await Promise.all(promises);
      expect(interfaces).toHaveLength(5);
      expect(interfaceManager.stats.activeCount).toBe(5);
    });

    test('should handle special characters in interface type', () => {
      interfaceManager.registerInterface('test-type_123', TestInterface);
      expect(interfaceManager.getAvailableTypes()).toContain('test-type_123');
    });
  });
});
