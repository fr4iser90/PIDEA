const ServiceLogger = require('@logging/ServiceLogger');

// Mock the Logger class
jest.mock('@logging/Logger', () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
    failure: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn()
  }));
});

describe('ServiceLogger', () => {
  let serviceLogger;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    serviceLogger = new ServiceLogger('TestService');
    mockLogger = servicelogger.infoger;
  });

  describe('constructor', () => {
    it('should create logger with service name', () => {
      expect(serviceLogger.serviceName).toBe('TestService');
      expect(mockLogger).toBeDefined();
    });

    it('should set default options', () => {
      expect(serviceLogger.options.enableSanitization).toBe(true);
      expect(serviceLogger.options.enablePerformanceLogging).toBe(false);
      expect(serviceLogger.options.logLevel).toBe('info');
    });

    it('should allow custom options', () => {
      const customLogger = new ServiceLogger('CustomService', {
        enableSanitization: false,
        enablePerformanceLogging: true,
        logLevel: 'debug'
      });

      expect(customLogger.serviceName).toBe('CustomService');
      expect(customLogger.options.enableSanitization).toBe(false);
      expect(customLogger.options.enablePerformanceLogging).toBe(true);
      expect(customLogger.options.logLevel).toBe('debug');
    });
  });

  describe('logging methods', () => {
    it('should call logger.info with service metadata', () => {
      serviceLogger.info('Test message', { key: 'value' });
      
      expect(mockLogger.info).toHaveBeenCalledWith('Test message', {
        service: 'TestService',
        key: 'value'
      });
    });

    it('should call logger.warn with service metadata', () => {
      serviceLogger.warn('Warning message', { key: 'value' });
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Warning message', {
        service: 'TestService',
        key: 'value'
      });
    });

    it('should call logger.error with service metadata', () => {
      serviceLogger.error('Error message', { key: 'value' });
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error message', {
        service: 'TestService',
        key: 'value'
      });
    });

    it('should call logger.debug with service metadata', () => {
      serviceLogger.debug('Debug message', { key: 'value' });
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Debug message', {
        service: 'TestService',
        key: 'value'
      });
    });

    it('should call logger.success with service metadata', () => {
      serviceLogger.success('Success message', { key: 'value' });
      
      expect(mockLogger.success).toHaveBeenCalledWith('Success message', {
        service: 'TestService',
        key: 'value'
      });
    });

    it('should call logger.failure with service metadata', () => {
      serviceLogger.failure('Failure message', { key: 'value' });
      
      expect(mockLogger.failure).toHaveBeenCalledWith('Failure message', {
        service: 'TestService',
        key: 'value'
      });
    });

    it('should handle empty metadata', () => {
      serviceLogger.info('Test message');
      
      expect(mockLogger.info).toHaveBeenCalledWith('Test message', {
        service: 'TestService'
      });
    });
  });

  describe('service-specific methods', () => {
    it('should format service method logs', () => {
      serviceLogger.serviceMethod('testMethod', 'Test message', { key: 'value' });
      
      expect(mockLogger.info).toHaveBeenCalledWith('[testMethod] Test message', {
        service: 'TestService',
        key: 'value'
      });
    });

    it('should format service error logs', () => {
      const error = new Error('Test error');
      serviceLogger.serviceError('testMethod', error, { key: 'value' });
      
      expect(mockLogger.error).toHaveBeenCalledWith('[testMethod] Test error', {
        error: error.stack,
        service: 'TestService',
        key: 'value'
      });
    });

    it('should handle service method without metadata', () => {
      serviceLogger.serviceMethod('testMethod', 'Test message');
      
      expect(mockLogger.info).toHaveBeenCalledWith('[testMethod] Test message', {
        service: 'TestService'
      });
    });

    it('should handle service error without metadata', () => {
      const error = new Error('Test error');
      serviceLogger.serviceError('testMethod', error);
      
      expect(mockLogger.error).toHaveBeenCalledWith('[testMethod] Test error', {
        error: error.stack,
        service: 'TestService'
      });
    });
  });

  describe('performance logging', () => {
    it('should call time methods when enabled', () => {
      serviceLogger.options.enablePerformanceLogging = true;
      
      serviceLogger.time('test-label');
      serviceLogger.timeEnd('test-label');
      
      expect(mockLogger.time).toHaveBeenCalledWith('test-label');
      expect(mockLogger.timeEnd).toHaveBeenCalledWith('test-label');
    });

    it('should not call time methods when disabled', () => {
      serviceLogger.options.enablePerformanceLogging = false;
      
      serviceLogger.time('test-label');
      serviceLogger.timeEnd('test-label');
      
      expect(mockLogger.time).not.toHaveBeenCalled();
      expect(mockLogger.timeEnd).not.toHaveBeenCalled();
    });

    it('should default to disabled performance logging', () => {
      serviceLogger.time('test-label');
      serviceLogger.timeEnd('test-label');
      
      expect(mockLogger.time).not.toHaveBeenCalled();
      expect(mockLogger.timeEnd).not.toHaveBeenCalled();
    });
  });

  describe('API logging', () => {
    it('should log API requests with service context', () => {
      serviceLogger.apiRequest('GET', '/api/users', 200, 150, { userId: '123' });
      
      expect(mockLogger.info).toHaveBeenCalledWith('API GET /api/users', {
        method: 'GET',
        path: '/api/users',
        statusCode: 200,
        duration: 150,
        service: 'TestService',
        userId: '123'
      });
    });

    it('should handle API requests without additional metadata', () => {
      serviceLogger.apiRequest('POST', '/api/users', 201, 200);
      
      expect(mockLogger.info).toHaveBeenCalledWith('API POST /api/users', {
        method: 'POST',
        path: '/api/users',
        statusCode: 201,
        duration: 200,
        service: 'TestService'
      });
    });
  });

  describe('user action logging', () => {
    it('should log user actions with service context', () => {
      serviceLogger.userAction('login', 'user123', { ip: '192.168.1.1' });
      
      expect(mockLogger.info).toHaveBeenCalledWith('User action: login', {
        action: 'login',
        userId: 'user123',
        service: 'TestService',
        ip: '192.168.1.1'
      });
    });

    it('should handle user actions without additional metadata', () => {
      serviceLogger.userAction('logout', 'user123');
      
      expect(mockLogger.info).toHaveBeenCalledWith('User action: logout', {
        action: 'logout',
        userId: 'user123',
        service: 'TestService'
      });
    });
  });

  describe('system event logging', () => {
    it('should log system events with service context', () => {
      serviceLogger.systemEvent('database_connected', { host: 'localhost' });
      
      expect(mockLogger.info).toHaveBeenCalledWith('System event: database_connected', {
        event: 'database_connected',
        service: 'TestService',
        host: 'localhost'
      });
    });

    it('should handle system events without additional metadata', () => {
      serviceLogger.systemEvent('service_started');
      
      expect(mockLogger.info).toHaveBeenCalledWith('System event: service_started', {
        event: 'service_started',
        service: 'TestService'
      });
    });
  });

  describe('multiple service instances', () => {
    it('should maintain separate service names', () => {
      const authLogger = new ServiceLogger('AuthService');
      const dbLogger = new ServiceLogger('DatabaseService');
      const apiLogger = new ServiceLogger('APIService');

      authLogger.info('Auth message');
      dbLogger.info('DB message');
      apiLogger.info('API message');

      expect(authLogger.serviceName).toBe('AuthService');
      expect(dbLogger.serviceName).toBe('DatabaseService');
      expect(apiLogger.serviceName).toBe('APIService');
    });

    it('should have separate logger instances', () => {
      const logger1 = new ServiceLogger('Service1');
      const logger2 = new ServiceLogger('Service2');

      expect(logger1.logger).not.toBe(logger2.logger);
    });
  });

  describe('error handling', () => {
    it('should handle errors in logging methods gracefully', () => {
      // Mock logger to throw error
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logger error');
      });

      // Should not throw error
      expect(() => {
        serviceLogger.info('Test message');
      }).not.toThrow();
    });

    it('should handle null or undefined messages', () => {
      serviceLogger.info(null);
      serviceLogger.warn(undefined);
      
      expect(mockLogger.info).toHaveBeenCalledWith(null, {
        service: 'TestService'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(undefined, {
        service: 'TestService'
      });
    });
  });

  describe('metadata handling', () => {
    it('should handle complex metadata objects', () => {
      const complexMeta = {
        user: { id: '123', name: 'John' },
        request: { method: 'POST', path: '/api/users' },
        timestamp: new Date().toISOString()
      };

      serviceLogger.info('Complex message', complexMeta);
      
      expect(mockLogger.info).toHaveBeenCalledWith('Complex message', {
        service: 'TestService',
        ...complexMeta
      });
    });

    it('should handle circular references in metadata', () => {
      const obj = { name: 'test' };
      obj.self = obj;

      serviceLogger.info('Circular message', obj);
      
      expect(mockLogger.info).toHaveBeenCalledWith('Circular message', {
        service: 'TestService',
        name: 'test',
        self: obj
      });
    });
  });
}); 