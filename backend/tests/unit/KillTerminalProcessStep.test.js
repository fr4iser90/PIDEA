/**
 * Kill Terminal Process Step Unit Tests
 * Tests for terminal process termination functionality with safety checks
 */

const { KillTerminalProcessStep } = require('@domain/steps/categories/terminal/kill_terminal_process_step');

// Mock dependencies
const mockIDEAutomationService = {
  killTerminalProcess: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockContext = {
  getService: jest.fn(),
  userId: 'test-user-123',
  processId: 1234,
  signal: 'SIGTERM',
  force: false,
  timeout: 5000
};

describe('KillTerminalProcessStep', () => {
  let step;
  let context;

  beforeEach(() => {
    step = new KillTerminalProcessStep();
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

    mockIDEAutomationService.killTerminalProcess.mockResolvedValue({
      success: true,
      processId: 1234,
      signal: 'SIGTERM',
      result: { status: 'terminated' }
    });

    mockEventBus.publish.mockResolvedValue();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = step.getConfig();
      
      expect(config.name).toBe('KillTerminalProcessStep');
      expect(config.type).toBe('terminal');
      expect(config.category).toBe('terminal');
      expect(config.description).toContain('Kill terminal processes');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toContain('ideAutomationService');
      expect(config.dependencies).toContain('eventBus');
    });

    test('should have validation rules', () => {
      const config = step.getConfig();
      
      expect(config.validation.required).toContain('userId');
      expect(config.validation.required).toContain('processId');
      expect(config.validation.optional).toContain('signal');
      expect(config.validation.optional).toContain('force');
      expect(config.validation.optional).toContain('timeout');
    });
  });

  describe('Validation', () => {
    test('should validate required userId', () => {
      const result = step.validate({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    test('should validate required processId', () => {
      const result = step.validate({
        userId: 'test-user'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Process ID is required');
    });

    test('should validate processId as number', () => {
      const result = step.validate({
        userId: 'test-user',
        processId: 'not-a-number'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Process ID must be a positive number');
    });

    test('should validate processId as positive number', () => {
      const result = step.validate({
        userId: 'test-user',
        processId: -1
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Process ID must be a positive number');
    });

    test('should accept valid processId', () => {
      const validPids = [1, 100, 1000, 9999];
      
      validPids.forEach(pid => {
        const result = step.validate({
          userId: 'test-user',
          processId: pid
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate signal types', () => {
      const result = step.validate({
        userId: 'test-user',
        processId: 1234,
        signal: 'INVALID_SIGNAL'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid signal: INVALID_SIGNAL. Valid signals: SIGTERM, SIGKILL, SIGINT, SIGQUIT, SIGHUP, SIGUSR1, SIGUSR2, SIGSTOP, SIGCONT, SIGTSTP');
    });

    test('should accept valid signals', () => {
      const validSignals = ['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGQUIT', 'SIGHUP', 'SIGUSR1', 'SIGUSR2', 'SIGSTOP', 'SIGCONT', 'SIGTSTP'];
      
      validSignals.forEach(signal => {
        const result = step.validate({
          userId: 'test-user',
          processId: 1234,
          signal
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate force boolean', () => {
      const result = step.validate({
        userId: 'test-user',
        processId: 1234,
        force: 'not-boolean'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Force must be a boolean');
    });

    test('should accept boolean force', () => {
      const result1 = step.validate({
        userId: 'test-user',
        processId: 1234,
        force: true
      });
      
      const result2 = step.validate({
        userId: 'test-user',
        processId: 1234,
        force: false
      });
      
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    test('should validate timeout range', () => {
      const result = step.validate({
        userId: 'test-user',
        processId: 1234,
        timeout: 0
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timeout must be a number between 1000 and 30000');
    });

    test('should validate timeout upper bound', () => {
      const result = step.validate({
        userId: 'test-user',
        processId: 1234,
        timeout: 31000
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timeout must be a number between 1000 and 30000');
    });

    test('should accept valid timeouts', () => {
      const validTimeouts = [1000, 5000, 10000, 30000];
      
      validTimeouts.forEach(timeout => {
        const result = step.validate({
          userId: 'test-user',
          processId: 1234,
          timeout
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate options object', () => {
      const result = step.validate({
        userId: 'test-user',
        processId: 1234,
        options: 'not-an-object'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Options must be an object');
    });

    test('should provide warnings for dangerous signals', () => {
      const dangerousSignals = ['SIGKILL', 'SIGQUIT'];
      
      dangerousSignals.forEach(signal => {
        const result = step.validate({
          userId: 'test-user',
          processId: 1234,
          signal
        });
        
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain(`Signal ${signal} may cause data loss or system instability`);
      });
    });

    test('should provide warnings for force kill', () => {
      const result = step.validate({
        userId: 'test-user',
        processId: 1234,
        force: true
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Force kill may cause data loss or system instability');
    });

    test('should provide warnings for system processes', () => {
      const systemPids = [1, 2, 3, 4, 5];
      
      systemPids.forEach(pid => {
        const result = step.validate({
          userId: 'test-user',
          processId: pid
        });
        
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain(`Process ID ${pid} may be a system process`);
      });
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

    test('should validate required processId', () => {
      const invalidContext = { ...context, processId: undefined };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Process ID is required');
    });

    test('should validate processId as number', () => {
      const invalidContext = { ...context, processId: 'not-number' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Process ID must be a positive number');
    });

    test('should validate signal', () => {
      const invalidContext = { ...context, signal: 'INVALID' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Invalid signal: INVALID. Valid signals: SIGTERM, SIGKILL, SIGINT, SIGQUIT, SIGHUP, SIGUSR1, SIGUSR2, SIGSTOP, SIGCONT, SIGTSTP');
    });

    test('should validate force boolean', () => {
      const invalidContext = { ...context, force: 'not-boolean' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Force must be a boolean');
    });

    test('should validate timeout range', () => {
      const invalidContext = { ...context, timeout: 0 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Timeout must be a number between 1000 and 30000');
    });

    test('should validate options object', () => {
      const invalidContext = { ...context, options: 'not-object' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Options must be an object');
    });
  });

  describe('Successful Execution', () => {
    test('should kill process successfully', async () => {
      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-123');
      expect(result.processId).toBe(1234);
      expect(result.signal).toBe('SIGTERM');
      expect(result.duration).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.stepId).toMatch(/^kill_process_\d+_/);
    });

    test('should use default values when not provided', async () => {
      const minimalContext = {
        ...context,
        signal: undefined,
        force: undefined,
        timeout: undefined
      };

      const result = await step.execute(minimalContext);
      
      expect(result.success).toBe(true);
      expect(result.data.signal).toBe('SIGTERM');
      expect(result.data.force).toBe(false);
      expect(result.data.timeout).toBe(5000);
    });

    test('should call IDEAutomationService with correct parameters', async () => {
      await step.execute(context);
      
      expect(mockIDEAutomationService.killTerminalProcess).toHaveBeenCalledWith({
        processId: 1234,
        signal: 'SIGTERM',
        force: false,
        timeout: 5000,
        ...context.options
      });
    });

    test('should publish killing event', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.process.killing', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        processId: 1234,
        signal: 'SIGTERM',
        force: false,
        timestamp: expect.any(Date)
      });
    });

    test('should publish killed event on success', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.process.killed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        processId: 1234,
        signal: 'SIGTERM',
        success: true,
        timestamp: expect.any(Date)
      });
    });

    test('should handle missing success in response', async () => {
      mockIDEAutomationService.killTerminalProcess.mockResolvedValue({
        processId: 1234,
        signal: 'SIGTERM',
        result: { status: 'terminated' }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
    });

    test('should handle missing processId in response', async () => {
      mockIDEAutomationService.killTerminalProcess.mockResolvedValue({
        success: true,
        signal: 'SIGTERM',
        result: { status: 'terminated' }
      });

      const result = await step.execute(context);
      
      expect(result.processId).toBe(1234); // Should use input processId
    });
  });

  describe('Error Handling', () => {
    test('should handle IDEAutomationService errors', async () => {
      const error = new Error('Failed to kill process');
      mockIDEAutomationService.killTerminalProcess.mockRejectedValue(error);

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to kill process');
      expect(result.userId).toBe('test-user-123');
      expect(result.processId).toBe(1234);
    });

    test('should publish failure event on error', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.killTerminalProcess.mockRejectedValue(error);

      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.process.killing.failed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        processId: 1234,
        error: 'Service error',
        timestamp: expect.any(Date)
      });
    });

    test('should handle event publishing errors gracefully', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.killTerminalProcess.mockRejectedValue(error);
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
      mockIDEAutomationService.killTerminalProcess.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(90);
    });
  });

  describe('Safety Features', () => {
    test('should handle dangerous signals with warnings', async () => {
      const dangerousContext = { ...context, signal: 'SIGKILL' };
      
      const result = await step.execute(dangerousContext);
      
      expect(result.success).toBe(true);
      expect(result.data.signal).toBe('SIGKILL');
    });

    test('should handle force kill with warnings', async () => {
      const forceContext = { ...context, force: true };
      
      const result = await step.execute(forceContext);
      
      expect(result.success).toBe(true);
      expect(result.data.force).toBe(true);
    });

    test('should handle system process IDs with warnings', async () => {
      const systemContext = { ...context, processId: 1 };
      
      const result = await step.execute(systemContext);
      
      expect(result.success).toBe(true);
      expect(result.processId).toBe(1);
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
      expect(result1.stepId).toMatch(/^kill_process_\d+_/);
      expect(result2.stepId).toMatch(/^kill_process_\d+_/);
    });

    test('should handle very large process IDs', async () => {
      const largePidContext = { ...context, processId: 999999999 };
      
      const result = await step.execute(largePidContext);
      
      expect(result.success).toBe(true);
      expect(result.processId).toBe(999999999);
    });
  });
}); 