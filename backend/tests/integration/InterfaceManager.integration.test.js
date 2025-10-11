/**
 * InterfaceManager Integration Tests
 * 
 * Tests for the InterfaceManager service integration with other components,
 * including interface lifecycle, project integration, and API endpoints.
 */
const InterfaceManager = require('../../domain/services/interface/InterfaceManager');
const InterfaceFactory = require('../../domain/services/interface/InterfaceFactory');
const InterfaceRegistry = require('../../domain/services/interface/InterfaceRegistry');
const IDEInterface = require('../../domain/services/interface/IDEInterface');
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

describe('InterfaceManager Integration', () => {
  let interfaceManager;
  let interfaceFactory;
  let interfaceRegistry;
  let mockLogger;
  let mockEventBus;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockEventBus = {
      publish: jest.fn()
    };

    interfaceManager = new InterfaceManager({
      logger: mockLogger,
      eventBus: mockEventBus
    });

    interfaceRegistry = new InterfaceRegistry({
      logger: mockLogger
    });

    interfaceFactory = new InterfaceFactory({
      logger: mockLogger,
      interfaceManager,
      interfaceRegistry
    });

    // Register interface types
    interfaceManager.registerInterface('test', TestInterface, { defaultConfig: 'value' });
    interfaceManager.registerInterface('ide', IDEInterface, { ideConfig: 'value' });

    // Register in registry
    interfaceRegistry.registerInterfaceType('test', {
      name: 'Test Interface',
      description: 'A test interface for integration testing',
      version: '1.0.0'
    });

    interfaceRegistry.registerInterfaceType('ide', {
      name: 'IDE Interface',
      description: 'An IDE interface for development environments',
      version: '1.0.0'
    });

    // Register default configs in factory
    interfaceFactory.registerDefaultConfig('test', { factoryConfig: 'value' });
    interfaceFactory.registerDefaultConfig('ide', { ideFactoryConfig: 'value' });
  });

  afterEach(async () => {
    await interfaceManager.destroy();
    interfaceRegistry.destroy();
    interfaceFactory.destroy();
    jest.clearAllMocks();
  });

  describe('Interface Lifecycle Integration', () => {
    test('should complete full interface lifecycle', async () => {
      // Create interface
      const interfaceInstance = await interfaceManager.createInterface('test', {
        projectId: 'test-project',
        customConfig: 'custom'
      });

      expect(interfaceInstance).toBeInstanceOf(TestInterface);
      expect(interfaceInstance.status).toBe('created');

      // Initialize interface
      await interfaceInstance.initialize();
      expect(interfaceInstance.status).toBe('initialized');

      // Start interface
      await interfaceManager.startInterface(interfaceInstance.id);
      expect(interfaceInstance.status).toBe('running');

      // Stop interface
      await interfaceManager.stopInterface(interfaceInstance.id);
      expect(interfaceInstance.status).toBe('stopped');

      // Remove interface
      const removed = await interfaceManager.removeInterface(interfaceInstance.id);
      expect(removed).toBe(true);
      expect(interfaceManager.getInterface(interfaceInstance.id)).toBeNull();
    });

    test('should handle interface restart', async () => {
      const interfaceInstance = await interfaceManager.createInterface('test');
      await interfaceInstance.initialize();
      await interfaceManager.startInterface(interfaceInstance.id);

      expect(interfaceInstance.status).toBe('running');

      await interfaceManager.restartInterface(interfaceInstance.id);
      expect(interfaceInstance.status).toBe('running');
    });

    test('should handle multiple interfaces concurrently', async () => {
      const interfaces = [];
      
      // Create multiple interfaces
      for (let i = 0; i < 5; i++) {
        const interfaceInstance = await interfaceManager.createInterface('test', {
          projectId: `project-${i}`,
          index: i
        });
        interfaces.push(interfaceInstance);
      }

      expect(interfaceManager.getAllInterfaces()).toHaveLength(5);

      // Start all interfaces
      for (const interfaceInstance of interfaces) {
        await interfaceInstance.initialize();
        await interfaceManager.startInterface(interfaceInstance.id);
      }

      // Verify all are running
      const runningInterfaces = interfaceManager.getAllInterfaces().filter(i => i.isRunning());
      expect(runningInterfaces).toHaveLength(5);

      // Stop all interfaces
      for (const interfaceInstance of interfaces) {
        await interfaceManager.stopInterface(interfaceInstance.id);
      }

      // Verify all are stopped
      const stoppedInterfaces = interfaceManager.getAllInterfaces().filter(i => i.isStopped());
      expect(stoppedInterfaces).toHaveLength(5);
    });
  });

  describe('Factory Integration', () => {
    test('should create interface through factory', async () => {
      const interfaceInstance = await interfaceFactory.createInterfaceByType('test', {
        projectId: 'test-project',
        customConfig: 'custom'
      });

      expect(interfaceInstance).toBeInstanceOf(TestInterface);
      expect(interfaceInstance.config).toEqual({
        defaultConfig: 'value',
        factoryConfig: 'value',
        projectId: 'test-project',
        customConfig: 'custom'
      });
    });

    test('should create multiple interfaces through factory', async () => {
      const specifications = [
        { type: 'test', config: { projectId: 'project-1' } },
        { type: 'test', config: { projectId: 'project-2' } },
        { type: 'ide', config: { projectId: 'project-3', workspacePath: '/test' } }
      ];

      const result = await interfaceFactory.createMultipleInterfaces(specifications);

      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.successful).toBe(3);

      // Verify interfaces were created in manager
      expect(interfaceManager.getAllInterfaces()).toHaveLength(3);
    });

    test('should handle factory creation errors', async () => {
      // Register a type that will cause creation to fail
      interfaceManager.registerInterface('error', class ErrorInterface {
        constructor() {
          throw new Error('Constructor error');
        }
      });

      const specifications = [
        { type: 'test', config: { projectId: 'project-1' } },
        { type: 'error', config: { projectId: 'project-2' } }
      ];

      const result = await interfaceFactory.createMultipleInterfaces(specifications);

      expect(result.results).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
    });
  });

  describe('Registry Integration', () => {
    test('should integrate registry with factory', () => {
      const availableTypes = interfaceFactory.getAvailableTypes();
      expect(availableTypes).toContain('test');
      expect(availableTypes).toContain('ide');

      const registryTypes = interfaceRegistry.getAllInterfaceTypes();
      expect(registryTypes).toContain('test');
      expect(registryTypes).toContain('ide');
    });

    test('should use registry constraints for type filtering', () => {
      // Set constraints for test interface
      interfaceRegistry.setTypeConstraints('test', {
        supportedFrameworks: ['react', 'vue'],
        supportedTypes: ['web']
      });

      const testTypeInfo = interfaceRegistry.getInterfaceType('test');
      expect(testTypeInfo.constraints.supportedFrameworks).toContain('react');
      expect(testTypeInfo.constraints.supportedTypes).toContain('web');
    });

    test('should categorize interfaces in registry', () => {
      interfaceRegistry.addToCategory('test', 'development');
      interfaceRegistry.addToCategory('ide', 'development');
      interfaceRegistry.addToCategory('ide', 'production');

      expect(interfaceRegistry.isInCategory('test', 'development')).toBe(true);
      expect(interfaceRegistry.isInCategory('ide', 'development')).toBe(true);
      expect(interfaceRegistry.isInCategory('ide', 'production')).toBe(true);

      const developmentTypes = interfaceRegistry.getInterfaceTypesByCategory('development');
      expect(developmentTypes).toContain('test');
      expect(developmentTypes).toContain('ide');
    });
  });

  describe('Event Bus Integration', () => {
    test('should publish events for interface operations', async () => {
      const interfaceInstance = await interfaceManager.createInterface('test');
      
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'interface.created',
        expect.objectContaining({
          source: 'InterfaceManager',
          interfaceId: interfaceInstance.id,
          interfaceType: 'test'
        })
      );

      await interfaceManager.startInterface(interfaceInstance.id);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'interface.started',
        expect.objectContaining({
          source: 'InterfaceManager',
          interfaceId: interfaceInstance.id,
          interfaceType: 'test'
        })
      );
    });

    test('should handle event publishing errors gracefully', async () => {
      mockEventBus.publish.mockImplementation(() => {
        throw new Error('Event publishing failed');
      });

      // Should not throw error
      const interfaceInstance = await interfaceManager.createInterface('test');
      expect(interfaceInstance).toBeInstanceOf(TestInterface);
    });
  });

  describe('Project Integration', () => {
    test('should manage interfaces for specific projects', async () => {
      const project1Interfaces = [];
      const project2Interfaces = [];

      // Create interfaces for project 1
      for (let i = 0; i < 3; i++) {
        const interfaceInstance = await interfaceManager.createInterface('test', {
          projectId: 'project-1',
          index: i
        });
        project1Interfaces.push(interfaceInstance);
      }

      // Create interfaces for project 2
      for (let i = 0; i < 2; i++) {
        const interfaceInstance = await interfaceManager.createInterface('ide', {
          projectId: 'project-2',
          workspacePath: `/project-2/workspace-${i}`
        });
        project2Interfaces.push(interfaceInstance);
      }

      // Get interfaces by project
      const allInterfaces = interfaceManager.getAllInterfaces();
      const project1Filtered = allInterfaces.filter(i => i.config.projectId === 'project-1');
      const project2Filtered = allInterfaces.filter(i => i.config.projectId === 'project-2');

      expect(project1Filtered).toHaveLength(3);
      expect(project2Filtered).toHaveLength(2);

      // Verify project-specific configurations
      project1Filtered.forEach(interfaceInstance => {
        expect(interfaceInstance.config.projectId).toBe('project-1');
        expect(interfaceInstance.type).toBe('test');
      });

      project2Filtered.forEach(interfaceInstance => {
        expect(interfaceInstance.config.projectId).toBe('project-2');
        expect(interfaceInstance.type).toBe('ide');
        expect(interfaceInstance.config.workspacePath).toMatch(/\/project-2\/workspace-\d+/);
      });
    });

    test('should handle project-specific interface removal', async () => {
      const interfaceInstance = await interfaceManager.createInterface('test', {
        projectId: 'project-1'
      });

      expect(interfaceManager.getInterface(interfaceInstance.id)).toBeDefined();

      const removed = await interfaceManager.removeInterface(interfaceInstance.id);
      expect(removed).toBe(true);
      expect(interfaceManager.getInterface(interfaceInstance.id)).toBeNull();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle interface creation errors', async () => {
      // Register a type that will cause creation to fail
      interfaceManager.registerInterface('error', class ErrorInterface {
        constructor() {
          throw new Error('Constructor error');
        }
      });

      await expect(
        interfaceManager.createInterface('error')
      ).rejects.toThrow('Constructor error');

      expect(interfaceManager.stats.errorCount).toBe(1);
    });

    test('should handle interface lifecycle errors', async () => {
      // Create a mock interface that throws errors
      class ErrorInterface extends BaseInterface {
        async start() {
          throw new Error('Start error');
        }
        async stop() {
          throw new Error('Stop error');
        }
        async destroy() {
          throw new Error('Destroy error');
        }
        async initialize() {}
      }

      interfaceManager.registerInterface('error', ErrorInterface);
      const interfaceInstance = await interfaceManager.createInterface('error');

      await expect(
        interfaceManager.startInterface(interfaceInstance.id)
      ).rejects.toThrow('Start error');

      expect(interfaceManager.stats.errorCount).toBe(1);
    });

    test('should handle registry errors gracefully', () => {
      // Should not throw error when registry operations fail
      expect(() => {
        interfaceRegistry.registerInterfaceType('test', {}); // Missing required fields
      }).toThrow();

      // Registry should still function for other operations
      expect(interfaceRegistry.getAllInterfaceTypes()).toContain('test');
      expect(interfaceRegistry.getAllInterfaceTypes()).toContain('ide');
    });
  });

  describe('Statistics and Monitoring Integration', () => {
    test('should track statistics across all operations', async () => {
      const initialStats = interfaceManager.getStats();
      expect(initialStats.totalCreated).toBe(0);
      expect(initialStats.activeCount).toBe(0);

      // Create interfaces
      const interface1 = await interfaceManager.createInterface('test');
      const interface2 = await interfaceManager.createInterface('ide');

      const afterCreationStats = interfaceManager.getStats();
      expect(afterCreationStats.totalCreated).toBe(2);
      expect(afterCreationStats.activeCount).toBe(2);

      // Remove one interface
      await interfaceManager.removeInterface(interface1.id);

      const afterRemovalStats = interfaceManager.getStats();
      expect(afterRemovalStats.totalCreated).toBe(2);
      expect(afterRemovalStats.totalDestroyed).toBe(1);
      expect(afterRemovalStats.activeCount).toBe(1);
    });

    test('should provide status summary', async () => {
      const interface1 = await interfaceManager.createInterface('test');
      const interface2 = await interfaceManager.createInterface('ide');

      await interface1.initialize();
      await interface2.initialize();
      await interfaceManager.startInterface(interface1.id);

      const statusSummary = interfaceManager.getStatusSummary();
      expect(statusSummary.total).toBe(2);
      expect(statusSummary.statusCounts.created).toBe(1);
      expect(statusSummary.statusCounts.running).toBe(1);
    });
  });

  describe('Configuration Management Integration', () => {
    test('should merge configurations from multiple sources', async () => {
      // Set global config in registry
      interfaceRegistry.setTypeMetadata('test', {
        globalConfig: 'global-value'
      });

      // Set default config in factory
      interfaceFactory.registerDefaultConfig('test', {
        factoryConfig: 'factory-value'
      });

      const interfaceInstance = await interfaceFactory.createInterfaceByType('test', {
        customConfig: 'custom-value'
      });

      expect(interfaceInstance.config).toEqual({
        defaultConfig: 'value',
        factoryConfig: 'factory-value',
        customConfig: 'custom-value'
      });
    });

    test('should handle configuration validation', () => {
      const { validateInterfaceConfig } = require('../../domain/services/interface');

      const validConfig = { name: 'Test', type: 'test' };
      const validationResult = validateInterfaceConfig(validConfig);
      expect(validationResult.valid).toBe(true);

      const invalidConfig = { name: 'Test' }; // Missing type
      const invalidResult = validateInterfaceConfig(invalidConfig);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain("Required field 'type' is missing");
    });
  });

  describe('Edge Cases and Stress Testing', () => {
    test('should handle rapid interface creation and destruction', async () => {
      const promises = [];
      
      // Create many interfaces rapidly
      for (let i = 0; i < 20; i++) {
        promises.push(interfaceManager.createInterface('test', { index: i }));
      }

      const interfaces = await Promise.all(promises);
      expect(interfaces).toHaveLength(20);
      expect(interfaceManager.getAllInterfaces()).toHaveLength(20);

      // Destroy all interfaces rapidly
      const destroyPromises = interfaces.map(interfaceInstance =>
        interfaceManager.removeInterface(interfaceInstance.id)
      );

      const results = await Promise.all(destroyPromises);
      expect(results.every(result => result === true)).toBe(true);
      expect(interfaceManager.getAllInterfaces()).toHaveLength(0);
    });

    test('should handle concurrent operations on same interface', async () => {
      const interfaceInstance = await interfaceManager.createInterface('test');
      await interfaceInstance.initialize();

      // Attempt concurrent start operations
      const startPromises = [
        interfaceManager.startInterface(interfaceInstance.id),
        interfaceManager.startInterface(interfaceInstance.id),
        interfaceManager.startInterface(interfaceInstance.id)
      ];

      const results = await Promise.allSettled(startPromises);
      // At least one should succeed
      const successfulResults = results.filter(result => result.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });

    test('should handle memory cleanup after mass operations', async () => {
      // Create and destroy many interfaces
      for (let batch = 0; batch < 5; batch++) {
        const interfaces = [];
        for (let i = 0; i < 10; i++) {
          const interfaceInstance = await interfaceManager.createInterface('test', {
            batch,
            index: i
          });
          interfaces.push(interfaceInstance);
        }

        // Destroy all interfaces in this batch
        for (const interfaceInstance of interfaces) {
          await interfaceManager.removeInterface(interfaceInstance.id);
        }
      }

      // Verify cleanup
      expect(interfaceManager.getAllInterfaces()).toHaveLength(0);
      expect(interfaceManager.stats.activeCount).toBe(0);
    });
  });
});
