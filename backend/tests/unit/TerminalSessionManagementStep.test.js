/**
 * Terminal Session Management Step Unit Tests
 * Tests for terminal session management functionality with CRUD operations
 */

const { TerminalSessionManagementStep } = require('@domain/steps/categories/terminal/terminal_session_management_step');

// Mock dependencies
const mockIDEAutomationService = {
  manageTerminalSession: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockContext = {
  getService: jest.fn(),
  userId: 'test-user-123',
  action: 'create',
  sessionId: 'session-123',
  configuration: {
    shell: 'bash',
    workingDirectory: '/home/test',
    environment: { NODE_ENV: 'test' }
  },
  timeout: 30000
};

describe('TerminalSessionManagementStep', () => {
  let step;
  let context;

  beforeEach(() => {
    step = new TerminalSessionManagementStep();
    context = {
      ...mockContext,
      getService: jest.fn()
    };

    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default service mocks
    context.getService.mockImplementation((serviceName) => {
      if (serviceName === 'IDEAutomationService') return mockIDEAutomationService;
      if (serviceName === 'EventBus') return mockEventBus;
      return null;
    });

    mockIDEAutomationService.manageTerminalSession.mockResolvedValue({
      success: true,
      sessionId: 'session-123',
      action: 'create',
      result: { status: 'created' }
    });

    mockEventBus.publish.mockResolvedValue();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = step.getConfig();
      
      expect(config.name).toBe('TerminalSessionManagementStep');
      expect(config.type).toBe('terminal');
      expect(config.category).toBe('terminal');
      expect(config.description).toContain('Manage terminal sessions');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toContain('ideAutomationService');
      expect(config.dependencies).toContain('eventBus');
    });

    test('should have validation rules', () => {
      const config = step.getConfig();
      
      expect(config.validation.required).toContain('userId');
      expect(config.validation.required).toContain('action');
      expect(config.validation.optional).toContain('sessionId');
      expect(config.validation.optional).toContain('configuration');
      expect(config.validation.optional).toContain('timeout');
    });
  });

  describe('Validation', () => {
    test('should validate required userId', () => {
      const result = step.validate({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    test('should validate required action', () => {
      const result = step.validate({
        userId: 'test-user'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action is required');
    });

    test('should validate action types', () => {
      const result = step.validate({
        userId: 'test-user',
        action: 'invalid-action'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid action: invalid-action. Valid actions: create, read, update, delete, restart, cleanup');
    });

    test('should accept valid actions', () => {
      const validActions = ['create', 'read', 'update', 'delete', 'restart', 'cleanup'];
      
      validActions.forEach(action => {
        const result = step.validate({
          userId: 'test-user',
          action
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate sessionId as string for non-create actions', () => {
      const result = step.validate({
        userId: 'test-user',
        action: 'read',
        sessionId: 123
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Session ID must be a string');
    });

    test('should accept sessionId for create action', () => {
      const result = step.validate({
        userId: 'test-user',
        action: 'create',
        sessionId: 123
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate configuration as object', () => {
      const result = step.validate({
        userId: 'test-user',
        action: 'create',
        configuration: 'not-an-object'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    test('should validate timeout range', () => {
      const result = step.validate({
        userId: 'test-user',
        action: 'create',
        timeout: 0
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timeout must be a number between 1000 and 300000');
    });

    test('should validate timeout upper bound', () => {
      const result = step.validate({
        userId: 'test-user',
        action: 'create',
        timeout: 301000
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timeout must be a number between 1000 and 300000');
    });

    test('should accept valid timeouts', () => {
      const validTimeouts = [1000, 30000, 60000, 300000];
      
      validTimeouts.forEach(timeout => {
        const result = step.validate({
          userId: 'test-user',
          action: 'create',
          timeout
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate options object', () => {
      const result = step.validate({
        userId: 'test-user',
        action: 'create',
        options: 'not-an-object'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Options must be an object');
    });

    test('should provide warnings for destructive actions', () => {
      const destructiveActions = ['delete', 'cleanup'];
      
      destructiveActions.forEach(action => {
        const result = step.validate({
          userId: 'test-user',
          action
        });
        
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain(`Action ${action} may cause data loss`);
      });
    });

    test('should provide warnings for long timeouts', () => {
      const result = step.validate({
        userId: 'test-user',
        action: 'create',
        timeout: 180000
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Long timeout may consume resources');
    });

    test('should provide warnings for restart action', () => {
      const result = step.validate({
        userId: 'test-user',
        action: 'restart'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Restart action may interrupt ongoing operations');
    });
  });

  describe('Service Validation', () => {
    test('should require IDEAutomationService', () => {
      context.getService.mockReturnValue(null);
      
      expect(() => step.validateServices(context)).toThrow('IDEAutomationService not available in context');
    });

    test('should accept optional EventBus', () => {
      context.getService.mockImplementation((serviceName) => {
        if (serviceName === 'IDEAutomationService') return mockIDEAutomationService;
        return null;
      });
      
      const services = step.validateServices(context);
      
      expect(services.ideAutomationService).toBe(mockIDEAutomationService);
      expect(services.eventBus).toBeUndefined();
    });
  });

  describe('Context Validation', () => {
    test('should validate required userId', () => {
      const invalidContext = { ...context, userId: undefined };
      
      expect(() => step.validateContext(invalidContext)).toThrow('User ID is required');
    });

    test('should validate required action', () => {
      const invalidContext = { ...context, action: undefined };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Action is required');
    });

    test('should validate action', () => {
      const invalidContext = { ...context, action: 'invalid' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Invalid action: invalid. Valid actions: create, read, update, delete, restart, cleanup');
    });

    test('should validate sessionId for non-create actions', () => {
      const invalidContext = { ...context, action: 'read', sessionId: 123 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Session ID must be a string');
    });

    test('should validate configuration as object', () => {
      const invalidContext = { ...context, configuration: 'not-object' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Configuration must be an object');
    });

    test('should validate timeout range', () => {
      const invalidContext = { ...context, timeout: 0 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Timeout must be a number between 1000 and 300000');
    });

    test('should validate options object', () => {
      const invalidContext = { ...context, options: 'not-object' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Options must be an object');
    });
  });

  describe('Successful Execution', () => {
    test('should manage session successfully', async () => {
      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-123');
      expect(result.action).toBe('create');
      expect(result.sessionId).toBe('session-123');
      expect(result.duration).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.stepId).toMatch(/^manage_session_\d+_/);
    });

    test('should use default values when not provided', async () => {
      const minimalContext = {
        ...context,
        sessionId: undefined,
        configuration: undefined,
        timeout: undefined
      };

      const result = await step.execute(minimalContext);
      
      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBeUndefined();
      expect(result.data.configuration).toEqual({});
      expect(result.data.timeout).toBe(30000);
    });

    test('should call IDEAutomationService with correct parameters', async () => {
      await step.execute(context);
      
      expect(mockIDEAutomationService.manageTerminalSession).toHaveBeenCalledWith({
        action: 'create',
        sessionId: 'session-123',
        configuration: {
          shell: 'bash',
          workingDirectory: '/home/test',
          environment: { NODE_ENV: 'test' }
        },
        timeout: 30000,
        ...context.options
      });
    });

    test('should publish managing event', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.session.managing', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        action: 'create',
        sessionId: 'session-123',
        timeout: 30000,
        timestamp: expect.any(Date)
      });
    });

    test('should publish managed event on success', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.session.managed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        action: 'create',
        sessionId: 'session-123',
        success: true,
        timestamp: expect.any(Date)
      });
    });

    test('should handle missing sessionId in response', async () => {
      mockIDEAutomationService.manageTerminalSession.mockResolvedValue({
        success: true,
        action: 'create',
        result: { status: 'created' }
      });

      const result = await step.execute(context);
      
      expect(result.sessionId).toBe('session-123'); // Should use input sessionId
    });

    test('should handle missing success in response', async () => {
      mockIDEAutomationService.manageTerminalSession.mockResolvedValue({
        sessionId: 'session-123',
        action: 'create',
        result: { status: 'created' }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle IDEAutomationService errors', async () => {
      const error = new Error('Failed to manage session');
      mockIDEAutomationService.manageTerminalSession.mockRejectedValue(error);

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to manage session');
      expect(result.userId).toBe('test-user-123');
      expect(result.action).toBe('create');
    });

    test('should publish failure event on error', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.manageTerminalSession.mockRejectedValue(error);

      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.session.managing.failed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        action: 'create',
        sessionId: 'session-123',
        error: 'Service error',
        timestamp: expect.any(Date)
      });
    });

    test('should handle event publishing errors gracefully', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.manageTerminalSession.mockRejectedValue(error);
      mockEventBus.publish.mockRejectedValue(new Error('Event error'));

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error');
    });

    test('should handle validation errors', async () => {
      const invalidContext = { ...context, userId: undefined };

      const result = await step.execute(invalidContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    test('should handle service validation errors', async () => {
      context.getService.mockReturnValue(null);

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('IDEAutomationService not available in context');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track execution duration', async () => {
      const startTime = Date.now();
      const result = await step.execute(context);
      const endTime = Date.now();
      
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeLessThanOrEqual(endTime - startTime + 10); // Allow small timing variance
    });

    test('should handle service timeout gracefully', async () => {
      // Simulate slow service
      mockIDEAutomationService.manageTerminalSession.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(90);
    });
  });

  describe('Session Management Actions', () => {
    test('should handle create action', async () => {
      const createContext = { ...context, action: 'create' };
      
      const result = await step.execute(createContext);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('create');
    });

    test('should handle read action', async () => {
      const readContext = { ...context, action: 'read', sessionId: 'session-123' };
      
      const result = await step.execute(readContext);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('read');
    });

    test('should handle update action', async () => {
      const updateContext = { 
        ...context, 
        action: 'update', 
        sessionId: 'session-123',
        configuration: { shell: 'zsh' }
      };
      
      const result = await step.execute(updateContext);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('update');
    });

    test('should handle delete action', async () => {
      const deleteContext = { ...context, action: 'delete', sessionId: 'session-123' };
      
      const result = await step.execute(deleteContext);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('delete');
    });

    test('should handle restart action', async () => {
      const restartContext = { ...context, action: 'restart', sessionId: 'session-123' };
      
      const result = await step.execute(restartContext);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('restart');
    });

    test('should handle cleanup action', async () => {
      const cleanupContext = { ...context, action: 'cleanup' };
      
      const result = await step.execute(cleanupContext);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('cleanup');
    });
  });

  describe('Configuration Handling', () => {
    test('should handle complex configuration', async () => {
      const complexConfig = {
        shell: 'bash',
        workingDirectory: '/home/test',
        environment: { 
          NODE_ENV: 'test',
          PATH: '/usr/local/bin:/usr/bin:/bin',
          HOME: '/home/test'
        },
        options: {
          history: true,
          color: true,
          prompt: '$ '
        }
      };

      const complexContext = { ...context, configuration: complexConfig };
      
      const result = await step.execute(complexContext);
      
      expect(result.success).toBe(true);
      expect(result.data.configuration).toEqual(complexConfig);
    });

    test('should handle empty configuration', async () => {
      const emptyContext = { ...context, configuration: {} };
      
      const result = await step.execute(emptyContext);
      
      expect(result.success).toBe(true);
      expect(result.data.configuration).toEqual({});
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty options object', async () => {
      const contextWithEmptyOptions = { ...context, options: {} };
      
      const result = await step.execute(contextWithEmptyOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.options).toEqual({});
    });

    test('should handle null context gracefully', async () => {
      const result = await step.execute(null);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    test('should handle undefined context gracefully', async () => {
      const result = await step.execute(undefined);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    test('should generate unique step IDs', async () => {
      const result1 = await step.execute(context);
      const result2 = await step.execute(context);
      
      expect(result1.stepId).not.toBe(result2.stepId);
      expect(result1.stepId).toMatch(/^manage_session_\d+_/);
      expect(result2.stepId).toMatch(/^manage_session_\d+_/);
    });

    test('should handle very long session IDs', async () => {
      const longSessionId = 'session-' + 'a'.repeat(1000);
      const longContext = { ...context, sessionId: longSessionId };
      
      const result = await step.execute(longContext);
      
      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(longSessionId);
    });

    test('should handle null sessionId for create action', async () => {
      const nullContext = { ...context, sessionId: null };
      
      const result = await step.execute(nullContext);
      
      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBeUndefined();
    });
  });
}); 