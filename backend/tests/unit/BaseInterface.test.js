/**
 * BaseInterface Unit Tests
 * 
 * Tests for the BaseInterface abstract class functionality,
 * including abstract method enforcement, property access,
 * error handling, and configuration validation.
 */
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

describe('BaseInterface', () => {
  let testInterface;
  let mockDependencies;

  beforeEach(() => {
    mockDependencies = {
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      }
    };

    testInterface = new TestInterface(
      'test-interface-1',
      'test',
      { testConfig: 'value' },
      mockDependencies
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should create instance with valid parameters', () => {
      expect(testInterface.interfaceId).toBe('test-interface-1');
      expect(testInterface.interfaceType).toBe('test');
      expect(testInterface.interfaceConfig).toEqual({ testConfig: 'value' });
      expect(testInterface.currentStatus).toBe('created');
      expect(testInterface.dependencies).toBe(mockDependencies);
    });

    test('should throw error when instantiated directly', () => {
      expect(() => {
        new BaseInterface('id', 'type');
      }).toThrow('BaseInterface is abstract and cannot be instantiated directly');
    });

    test('should validate interfaceId', () => {
      expect(() => {
        new TestInterface(null, 'type');
      }).toThrow('interfaceId must be a non-empty string');

      expect(() => {
        new TestInterface('', 'type');
      }).toThrow('interfaceId must be a non-empty string');

      expect(() => {
        new TestInterface(123, 'type');
      }).toThrow('interfaceId must be a non-empty string');
    });

    test('should validate interfaceType', () => {
      expect(() => {
        new TestInterface('id', null);
      }).toThrow('interfaceType must be a non-empty string');

      expect(() => {
        new TestInterface('id', '');
      }).toThrow('interfaceType must be a non-empty string');

      expect(() => {
        new TestInterface('id', 123);
      }).toThrow('interfaceType must be a non-empty string');
    });

    test('should validate interfaceConfig', () => {
      expect(() => {
        new TestInterface('id', 'type', null);
      }).toThrow('interfaceConfig must be an object');

      expect(() => {
        new TestInterface('id', 'type', 'invalid');
      }).toThrow('interfaceConfig must be an object');
    });
  });

  describe('Abstract Methods', () => {
    test('should enforce abstract method implementation', () => {
      class IncompleteInterface extends BaseInterface {
        // Missing required methods
      }

      const incompleteInterface = new IncompleteInterface('id', 'type');
      
      expect(async () => {
        await incompleteInterface.initialize();
      }).rejects.toThrow('initialize method must be implemented by subclass');

      expect(async () => {
        await incompleteInterface.start();
      }).rejects.toThrow('start method must be implemented by subclass');

      expect(async () => {
        await incompleteInterface.stop();
      }).rejects.toThrow('stop method must be implemented by subclass');

      expect(async () => {
        await incompleteInterface.destroy();
      }).rejects.toThrow('destroy method must be implemented by subclass');
    });
  });

  describe('Property Access', () => {
    test('should provide correct type property', () => {
      expect(testInterface.type).toBe('test');
    });

    test('should provide correct id property', () => {
      expect(testInterface.id).toBe('test-interface-1');
    });

    test('should provide correct status property', () => {
      expect(testInterface.status).toBe('created');
    });

    test('should provide correct config property', () => {
      expect(testInterface.config).toEqual({ testConfig: 'value' });
    });

    test('should provide createdAt timestamp', () => {
      expect(testInterface.createdAt).toBeInstanceOf(Date);
    });

    test('should provide lastActivity timestamp', () => {
      expect(testInterface.lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('Status Management', () => {
    test('should set valid status', () => {
      testInterface.setStatus('running');
      expect(testInterface.status).toBe('running');
      expect(testInterface.lastActivity).toBeInstanceOf(Date);
    });

    test('should throw error for invalid status', () => {
      expect(() => {
        testInterface.setStatus('invalid-status');
      }).toThrow('Invalid status: invalid-status');
    });

    test('should update activity timestamp', () => {
      const originalActivity = testInterface.lastActivity;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        testInterface.updateActivity();
        expect(testInterface.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
      }, 10);
    });
  });

  describe('Status Checks', () => {
    test('should check if interface is running', () => {
      expect(testInterface.isRunning()).toBe(false);
      testInterface.setStatus('running');
      expect(testInterface.isRunning()).toBe(true);
    });

    test('should check if interface is stopped', () => {
      expect(testInterface.isStopped()).toBe(false);
      testInterface.setStatus('stopped');
      expect(testInterface.isStopped()).toBe(true);
    });

    test('should check if interface is in error state', () => {
      expect(testInterface.isError()).toBe(false);
      testInterface.setStatus('error');
      expect(testInterface.isError()).toBe(true);
    });
  });

  describe('Metadata', () => {
    test('should provide correct metadata', () => {
      const metadata = testInterface.getMetadata();
      
      expect(metadata).toEqual({
        id: 'test-interface-1',
        type: 'test',
        status: 'created',
        createdAt: testInterface.createdAt,
        lastActivity: testInterface.lastActivity,
        config: { testConfig: 'value' }
      });
    });
  });

  describe('Error Handling', () => {
    test('should create error response', () => {
      const errorResponse = testInterface._createErrorResponse('Test error', 'TEST_ERROR', { detail: 'test' });
      
      expect(errorResponse).toEqual({
        success: false,
        error: {
          message: 'Test error',
          code: 'TEST_ERROR',
          interfaceId: 'test-interface-1',
          interfaceType: 'test',
          timestamp: expect.any(String),
          detail: 'test'
        }
      });
    });

    test('should create success response', () => {
      const successResponse = testInterface._createSuccessResponse({ data: 'test' }, { meta: 'value' });
      
      expect(successResponse).toEqual({
        success: true,
        data: { data: 'test' },
        meta: {
          interfaceId: 'test-interface-1',
          interfaceType: 'test',
          timestamp: expect.any(String),
          meta: 'value'
        }
      });
    });

    test('should handle errors and update status', () => {
      const error = new Error('Test error');
      testInterface._handleError(error, 'test-operation');
      
      expect(testInterface.status).toBe('error');
      expect(mockDependencies.logger.error).toHaveBeenCalledWith(
        'Interface test-operation failed',
        expect.objectContaining({
          error: 'Test error',
          operation: 'test-operation'
        })
      );
    });
  });

  describe('Logging', () => {
    test('should log with provided logger', () => {
      testInterface._log('info', 'Test message', { extra: 'data' });
      
      expect(mockDependencies.logger.info).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({
          interfaceId: 'test-interface-1',
          interfaceType: 'test',
          status: 'created',
          extra: 'data'
        })
      );
    });

    test('should fallback to console when logger not available', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const interfaceWithoutLogger = new TestInterface('id', 'type', {}, {});
      interfaceWithoutLogger._log('info', 'Test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[INFO] Test message',
        expect.objectContaining({
          interfaceId: 'id',
          interfaceType: 'type'
        })
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle missing log level gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const interfaceWithLimitedLogger = new TestInterface('id', 'type', {}, {
        logger: { warn: jest.fn() } // Only has warn, not info
      });
      
      interfaceWithLimitedLogger._log('info', 'Test message');
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Lifecycle Methods', () => {
    test('should execute initialize method', async () => {
      await testInterface.initialize({});
      expect(testInterface.status).toBe('initialized');
    });

    test('should execute start method', async () => {
      await testInterface.start();
      expect(testInterface.status).toBe('running');
    });

    test('should execute stop method', async () => {
      await testInterface.stop();
      expect(testInterface.status).toBe('stopped');
    });

    test('should execute destroy method', async () => {
      await testInterface.destroy();
      expect(testInterface.status).toBe('destroyed');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty configuration object', () => {
      const interfaceWithEmptyConfig = new TestInterface('id', 'type', {});
      expect(interfaceWithEmptyConfig.config).toEqual({});
    });

    test('should handle complex configuration object', () => {
      const complexConfig = {
        nested: { value: 'test' },
        array: [1, 2, 3],
        boolean: true,
        number: 42
      };
      
      const interfaceWithComplexConfig = new TestInterface('id', 'type', complexConfig);
      expect(interfaceWithComplexConfig.config).toEqual(complexConfig);
    });

    test('should handle special characters in ID and type', () => {
      const specialInterface = new TestInterface('test-interface_123', 'test-type_456');
      expect(specialInterface.id).toBe('test-interface_123');
      expect(specialInterface.type).toBe('test-type_456');
    });
  });
});
