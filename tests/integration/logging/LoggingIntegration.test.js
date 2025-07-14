const ServiceLogger = require('@logging/ServiceLogger');
const LogStandardizer = require('@logging/LogStandardizer');
const LogFormatter = require('@logging/LogFormatter');

describe('Logging Integration', () => {
  let serviceLogger;
  let standardizer;
  let formatter;

  beforeEach(() => {
    serviceLogger = new ServiceLogger('IntegrationTest');
    standardizer = new LogStandardizer();
    formatter = new LogFormatter();
  });

  describe('end-to-end logging flow', () => {
    it('should handle complete logging workflow', () => {
      // Simulate a service method that needs logging
      const userData = {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com',
        filePath: '/home/user/documents/file.txt'
      };

      // Sanitize the data
      const sanitizedData = standardizer.sanitizeObject(userData);
      
      // Log the sanitized data
      serviceLogger.info('User login attempt', sanitizedData);
      
      // Verify sensitive data is masked
      expect(sanitizedData.password).toBe('[MASKED]');
      expect(sanitizedData.filePath).toBe('[PATH]');
      expect(sanitizedData.username).toBe('testuser');
      expect(sanitizedData.email).toBe('test@example.com');
    });

    it('should format logs consistently', () => {
      const level = 'info';
      const message = 'Test message';
      const meta = { key: 'value' };
      const serviceName = 'TestService';

      const formatted = formatter.format(level, message, meta, serviceName);
      
      expect(formatted).toContain('ℹ️');
      expect(formatted).toContain('[TestService]');
      expect(formatted).toContain('[INFO]');
      expect(formatted).toContain('Test message');
      expect(formatted).toContain('{"key":"value"}');
    });

    it('should handle API request logging workflow', () => {
      const requestData = {
        method: 'POST',
        path: '/api/users',
        body: {
          username: 'newuser',
          password: 'secret123',
          email: 'new@example.com'
        },
        headers: {
          authorization: 'Bearer abc123',
          'content-type': 'application/json'
        }
      };

      // Sanitize request data
      const sanitizedData = standardizer.sanitizeObject(requestData);
      
      // Log API request
      serviceLogger.apiRequest(
        sanitizedData.method,
        sanitizedData.path,
        201,
        150,
        { body: sanitizedData.body }
      );

      // Verify sensitive data is masked
      expect(sanitizedData.body.password).toBe('[MASKED]');
      expect(sanitizedData.headers.authorization).toBe('[MASKED]');
      expect(sanitizedData.body.username).toBe('newuser');
      expect(sanitizedData.body.email).toBe('new@example.com');
    });
  });

  describe('service integration', () => {
    it('should work with multiple services', () => {
      const authLogger = new ServiceLogger('AuthService');
      const dbLogger = new ServiceLogger('DatabaseService');
      const apiLogger = new ServiceLogger('APIService');

      // Simulate service interactions
      authLogger.info('User authenticated', { userId: '123' });
      dbLogger.info('Database query executed', { query: 'SELECT * FROM users' });
      apiLogger.info('API request processed', { endpoint: '/api/users' });

      // Verify each logger has correct service name
      expect(authLogger.serviceName).toBe('AuthService');
      expect(dbLogger.serviceName).toBe('DatabaseService');
      expect(apiLogger.serviceName).toBe('APIService');
    });

    it('should handle service method logging with sanitization', () => {
      const userService = new ServiceLogger('UserService');
      
      const userData = {
        id: '123',
        username: 'testuser',
        password: 'secret123',
        profile: {
          name: 'Test User',
          email: 'test@example.com',
          settings: {
            theme: 'dark',
            token: 'abc123'
          }
        }
      };

      // Sanitize and log
      const sanitizedData = standardizer.sanitizeObject(userData);
      userService.serviceMethod('createUser', 'User created successfully', sanitizedData);

      // Verify nested sensitive data is masked
      expect(sanitizedData.password).toBe('[MASKED]');
      expect(sanitizedData.profile.settings.token).toBe('[MASKED]');
      expect(sanitizedData.username).toBe('testuser');
      expect(sanitizedData.profile.name).toBe('Test User');
    });
  });

  describe('error handling', () => {
    it('should handle logging errors gracefully', () => {
      const error = new Error('Database connection failed');
      
      serviceLogger.serviceError('connectDatabase', error, {
        host: 'localhost',
        port: 5432
      });

      // Verify error is logged with stack trace
      expect(servicelogger.infoger.error).toHaveBeenCalledWith(
        '[connectDatabase] Database connection failed',
        expect.objectContaining({
          error: error.stack,
          service: 'IntegrationTest',
          host: 'localhost',
          port: 5432
        })
      );
    });

    it('should handle circular references in error context', () => {
      const error = new Error('Circular reference error');
      const context = { name: 'test' };
      context.self = context;

      serviceLogger.serviceError('testMethod', error, context);

      // Should not throw error due to circular reference
      expect(servicelogger.infoger.error).toHaveBeenCalled();
    });

    it('should handle sensitive data in error context', () => {
      const error = new Error('Authentication failed');
      
      serviceLogger.serviceError('authenticate', error, {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123',
        ip: '192.168.1.1'
      });

      // Verify sensitive data is masked in error context
      expect(servicelogger.infoger.error).toHaveBeenCalledWith(
        '[authenticate] Authentication failed',
        expect.objectContaining({
          error: error.stack,
          service: 'IntegrationTest',
          username: 'testuser',
          password: '[MASKED]',
          token: '[MASKED]',
          ip: '192.168.1.1'
        })
      );
    });
  });

  describe('performance logging integration', () => {
    it('should handle performance logging with service context', () => {
      const perfLogger = new ServiceLogger('PerformanceService', {
        enablePerformanceLogging: true
      });

      perfLogger.time('database-query');
      perfLogger.timeEnd('database-query');

      expect(perflogger.infoger.time).toHaveBeenCalledWith('database-query');
      expect(perflogger.infoger.timeEnd).toHaveBeenCalledWith('database-query');
    });

    it('should handle performance logging with metadata', () => {
      const perfLogger = new ServiceLogger('PerformanceService', {
        enablePerformanceLogging: true
      });

      perfLogger.time('api-request');
      // Simulate some work
      perfLogger.timeEnd('api-request');

      expect(perflogger.infoger.time).toHaveBeenCalledWith('api-request');
      expect(perflogger.infoger.timeEnd).toHaveBeenCalledWith('api-request');
    });
  });

  describe('formatter integration', () => {
    it('should format different log levels correctly', () => {
      const levels = ['error', 'warn', 'info', 'debug', 'success', 'failure'];
      
      levels.forEach(level => {
        const formatted = formatter.format(level, 'Test message', {}, 'TestService');
        expect(formatted).toContain(`[${level.toUpperCase()}]`);
        expect(formatted).toContain('[TestService]');
        expect(formatted).toContain('Test message');
      });
    });

    it('should format API requests with status codes', () => {
      const statusCodes = [200, 201, 400, 401, 404, 500];
      
      statusCodes.forEach(statusCode => {
        const formatted = formatter.formatApiRequest('GET', '/api/test', statusCode, 100);
        expect(formatted).toContain('[API]');
        expect(formatted).toContain('GET');
        expect(formatted).toContain('/api/test');
        expect(formatted).toContain(statusCode.toString());
        expect(formatted).toContain('100ms');
      });
    });

    it('should format user actions correctly', () => {
      const actions = ['login', 'logout', 'profile_update', 'password_change'];
      
      actions.forEach(action => {
        const formatted = formatter.formatUserAction(action, 'user123');
        expect(formatted).toContain('[USER]');
        expect(formatted).toContain(action);
        expect(formatted).toContain('user123');
      });
    });

    it('should format system events correctly', () => {
      const events = ['service_started', 'database_connected', 'cache_cleared'];
      
      events.forEach(event => {
        const formatted = formatter.formatSystemEvent(event);
        expect(formatted).toContain('[SYSTEM]');
        expect(formatted).toContain(event);
      });
    });
  });

  describe('standardizer integration', () => {
    it('should handle complex nested objects with sensitive data', () => {
      const complexData = {
        request: {
          method: 'POST',
          path: '/api/users',
          headers: {
            authorization: 'Bearer secret123',
            'content-type': 'application/json'
          },
          body: {
            user: {
              username: 'newuser',
              password: 'secret123',
              profile: {
                name: 'New User',
                email: 'new@example.com',
                settings: {
                  theme: 'dark',
                  api_key: 'xyz789'
                }
              }
            }
          }
        },
        response: {
          status: 201,
          data: {
            id: '456',
            token: 'abc123'
          }
        }
      };

      const sanitized = standardizer.sanitizeObject(complexData);

      // Verify sensitive data is masked at all levels
      expect(sanitized.request.headers.authorization).toBe('[MASKED]');
      expect(sanitized.request.body.user.password).toBe('[MASKED]');
      expect(sanitized.request.body.user.profile.settings.api_key).toBe('[MASKED]');
      expect(sanitized.response.data.token).toBe('[MASKED]');

      // Verify safe data is preserved
      expect(sanitized.request.method).toBe('POST');
      expect(sanitized.request.path).toBe('/api/users');
      expect(sanitized.request.body.user.username).toBe('newuser');
      expect(sanitized.request.body.user.profile.name).toBe('New User');
      expect(sanitized.response.status).toBe(201);
      expect(sanitized.response.data.id).toBe('456');
    });

    it('should handle arrays with sensitive data', () => {
      const arrayData = [
        { id: '1', username: 'user1', password: 'pass1' },
        { id: '2', username: 'user2', token: 'token2' },
        { id: '3', username: 'user3', api_key: 'key3' }
      ];

      const sanitized = standardizer.sanitizeObject(arrayData);

      expect(sanitized[0].password).toBe('[MASKED]');
      expect(sanitized[1].token).toBe('[MASKED]');
      expect(sanitized[2].api_key).toBe('[MASKED]');

      expect(sanitized[0].username).toBe('user1');
      expect(sanitized[1].username).toBe('user2');
      expect(sanitized[2].username).toBe('user3');
    });

    it('should handle file paths in various contexts', () => {
      const pathData = {
        config: {
          logFile: '/var/log/app.log',
          tempDir: '/tmp/app',
          userHome: '/home/user',
          relativePath: './config.json'
        },
        files: [
          '/home/user/documents/file1.txt',
          '/Users/username/documents/file2.txt',
          './relative/file3.txt'
        ]
      };

      const sanitized = standardizer.sanitizeObject(pathData);

      expect(sanitized.config.logFile).toBe('[PATH]');
      expect(sanitized.config.tempDir).toBe('[PATH]');
      expect(sanitized.config.userHome).toBe('[PATH]');
      expect(sanitized.config.relativePath).toBe('./config.json');

      expect(sanitized.files[0]).toBe('[PATH]');
      expect(sanitized.files[1]).toBe('[PATH]');
      expect(sanitized.files[2]).toBe('./relative/file3.txt');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle user authentication flow', () => {
      const authLogger = new ServiceLogger('AuthService');
      
      // Login attempt
      const loginData = {
        username: 'testuser',
        password: 'secret123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      };

      const sanitizedLogin = standardizer.sanitizeObject(loginData);
      authLogger.info('Login attempt', sanitizedLogin);

      // Successful authentication
      const authResult = {
        userId: '123',
        token: 'jwt_token_here',
        expiresAt: new Date().toISOString()
      };

      const sanitizedResult = standardizer.sanitizeObject(authResult);
      authLogger.success('User authenticated successfully', sanitizedResult);

      // Verify sensitive data is masked
      expect(sanitizedLogin.password).toBe('[MASKED]');
      expect(sanitizedResult.token).toBe('[MASKED]');
      expect(sanitizedLogin.username).toBe('testuser');
      expect(sanitizedResult.userId).toBe('123');
    });

    it('should handle database operation flow', () => {
      const dbLogger = new ServiceLogger('DatabaseService');
      
      // Database connection
      const connectionData = {
        host: 'localhost',
        port: 5432,
        database: 'mydb',
        username: 'dbuser',
        password: 'dbpass'
      };

      const sanitizedConnection = standardizer.sanitizeObject(connectionData);
      dbLogger.info('Database connection established', sanitizedConnection);

      // Query execution
      const queryData = {
        query: 'SELECT * FROM users WHERE id = $1',
        params: ['123'],
        duration: 15
      };

      dbLogger.serviceMethod('executeQuery', 'Query executed successfully', queryData);

      // Verify sensitive data is masked
      expect(sanitizedConnection.password).toBe('[MASKED]');
      expect(sanitizedConnection.username).toBe('dbuser');
      expect(sanitizedConnection.host).toBe('localhost');
    });

    it('should handle API request/response flow', () => {
      const apiLogger = new ServiceLogger('APIService');
      
      // Incoming request
      const requestData = {
        method: 'POST',
        path: '/api/users',
        headers: {
          authorization: 'Bearer secret_token',
          'content-type': 'application/json'
        },
        body: {
          username: 'newuser',
          email: 'new@example.com',
          password: 'secret123'
        }
      };

      const sanitizedRequest = standardizer.sanitizeObject(requestData);
      apiLogger.apiRequest(
        sanitizedRequest.method,
        sanitizedRequest.path,
        201,
        150,
        { body: sanitizedRequest.body }
      );

      // Response
      const responseData = {
        status: 201,
        data: {
          id: '456',
          username: 'newuser',
          token: 'new_jwt_token'
        }
      };

      const sanitizedResponse = standardizer.sanitizeObject(responseData);
      apiLogger.info('API response sent', sanitizedResponse);

      // Verify sensitive data is masked
      expect(sanitizedRequest.headers.authorization).toBe('[MASKED]');
      expect(sanitizedRequest.body.password).toBe('[MASKED]');
      expect(sanitizedResponse.data.token).toBe('[MASKED]');
      expect(sanitizedRequest.body.username).toBe('newuser');
      expect(sanitizedResponse.data.username).toBe('newuser');
    });
  });
}); 