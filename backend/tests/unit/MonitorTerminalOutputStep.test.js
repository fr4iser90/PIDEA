/**
 * Monitor Terminal Output Step Unit Tests
 * Tests for terminal output monitoring functionality with real-time streaming
 */

const { MonitorTerminalOutputStep } = require('@domain/steps/categories/terminal/monitor_terminal_output_step');

// Mock dependencies
const mockIDEAutomationService = {
  monitorTerminalOutput: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockContext = {
  getService: jest.fn(),
  userId: 'test-user-123',
  sessionId: 'session-123',
  filter: 'all',
  maxLines: 100,
  timeout: 30000,
  includeTimestamps: true
};

describe('MonitorTerminalOutputStep', () => {
  let step;
  let context;

  beforeEach(() => {
    step = new MonitorTerminalOutputStep();
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

    mockIDEAutomationService.monitorTerminalOutput.mockResolvedValue({
      output: [
        { timestamp: '2024-01-01T10:00:00Z', line: 'Test output 1', type: 'stdout' },
        { timestamp: '2024-01-01T10:01:00Z', line: 'Test output 2', type: 'stderr' }
      ],
      summary: { total: 2, stdout: 1, stderr: 1 }
    });

    mockEventBus.publish.mockResolvedValue();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = step.getConfig();
      
      expect(config.name).toBe('MonitorTerminalOutputStep');
      expect(config.type).toBe('terminal');
      expect(config.category).toBe('terminal');
      expect(config.description).toContain('Monitor terminal output');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toContain('ideAutomationService');
      expect(config.dependencies).toContain('eventBus');
    });

    test('should have validation rules', () => {
      const config = step.getConfig();
      
      expect(config.validation.required).toContain('userId');
      expect(config.validation.required).toContain('sessionId');
      expect(config.validation.optional).toContain('filter');
      expect(config.validation.optional).toContain('maxLines');
      expect(config.validation.optional).toContain('timeout');
      expect(config.validation.optional).toContain('includeTimestamps');
    });
  });

  describe('Validation', () => {
    test('should validate required userId', () => {
      const result = step.validate({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    test('should validate required sessionId', () => {
      const result = step.validate({
        userId: 'test-user'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Session ID is required');
    });

    test('should validate sessionId as string', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 123
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Session ID must be a string');
    });

    test('should validate filter types', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
        filter: 'invalid-filter'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid filter: invalid-filter. Valid filters: all, stdout, stderr, error, warning, info');
    });

    test('should accept valid filters', () => {
      const validFilters = ['all', 'stdout', 'stderr', 'error', 'warning', 'info'];
      
      validFilters.forEach(filter => {
        const result = step.validate({
          userId: 'test-user',
          sessionId: 'session-123',
          filter
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate maxLines range', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
        maxLines: 0
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Max lines must be a number between 1 and 10000');
    });

    test('should validate maxLines upper bound', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
        maxLines: 10001
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Max lines must be a number between 1 and 10000');
    });

    test('should accept valid maxLines', () => {
      const validLines = [1, 100, 1000, 10000];
      
      validLines.forEach(maxLines => {
        const result = step.validate({
          userId: 'test-user',
          sessionId: 'session-123',
          maxLines
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate timeout range', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
        timeout: 0
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timeout must be a number between 1000 and 300000');
    });

    test('should validate timeout upper bound', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
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
          sessionId: 'session-123',
          timeout
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate includeTimestamps boolean', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
        includeTimestamps: 'not-boolean'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Include timestamps must be a boolean');
    });

    test('should accept boolean includeTimestamps', () => {
      const result1 = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
        includeTimestamps: true
      });
      
      const result2 = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
        includeTimestamps: false
      });
      
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    test('should validate options object', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
        options: 'not-an-object'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Options must be an object');
    });

    test('should provide warnings for large maxLines', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
        maxLines: 5000
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large max lines may impact performance');
    });

    test('should provide warnings for long timeouts', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
        timeout: 180000
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Long timeout may consume resources');
    });

    test('should provide warnings for all filter', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 'session-123',
        filter: 'all'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Monitoring all output may generate large results');
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

    test('should validate required sessionId', () => {
      const invalidContext = { ...context, sessionId: undefined };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Session ID is required');
    });

    test('should validate sessionId as string', () => {
      const invalidContext = { ...context, sessionId: 123 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Session ID must be a string');
    });

    test('should validate filter', () => {
      const invalidContext = { ...context, filter: 'invalid' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Invalid filter: invalid. Valid filters: all, stdout, stderr, error, warning, info');
    });

    test('should validate maxLines range', () => {
      const invalidContext = { ...context, maxLines: 0 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Max lines must be a number between 1 and 10000');
    });

    test('should validate timeout range', () => {
      const invalidContext = { ...context, timeout: 0 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Timeout must be a number between 1000 and 300000');
    });

    test('should validate includeTimestamps boolean', () => {
      const invalidContext = { ...context, includeTimestamps: 'not-boolean' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Include timestamps must be a boolean');
    });

    test('should validate options object', () => {
      const invalidContext = { ...context, options: 'not-object' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Options must be an object');
    });
  });

  describe('Successful Execution', () => {
    test('should monitor output successfully', async () => {
      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-123');
      expect(result.sessionId).toBe('session-123');
      expect(result.outputCount).toBe(2);
      expect(result.duration).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.stepId).toMatch(/^monitor_output_\d+_/);
    });

    test('should use default values when not provided', async () => {
      const minimalContext = {
        ...context,
        filter: undefined,
        maxLines: undefined,
        timeout: undefined,
        includeTimestamps: undefined
      };

      const result = await step.execute(minimalContext);
      
      expect(result.success).toBe(true);
      expect(result.data.filter).toBe('all');
      expect(result.data.maxLines).toBe(100);
      expect(result.data.timeout).toBe(30000);
      expect(result.data.includeTimestamps).toBe(true);
    });

    test('should call IDEAutomationService with correct parameters', async () => {
      await step.execute(context);
      
      expect(mockIDEAutomationService.monitorTerminalOutput).toHaveBeenCalledWith({
        sessionId: 'session-123',
        filter: 'all',
        maxLines: 100,
        timeout: 30000,
        includeTimestamps: true,
        ...context.options
      });
    });

    test('should publish monitoring event', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.output.monitoring', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'session-123',
        filter: 'all',
        maxLines: 100,
        timeout: 30000,
        timestamp: expect.any(Date)
      });
    });

    test('should publish monitored event on success', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.output.monitored', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'session-123',
        outputCount: 2,
        filter: 'all',
        timestamp: expect.any(Date)
      });
    });

    test('should handle empty output array', async () => {
      mockIDEAutomationService.monitorTerminalOutput.mockResolvedValue({
        output: [],
        summary: { total: 0, stdout: 0, stderr: 0 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.outputCount).toBe(0);
      expect(result.data.output).toEqual([]);
    });

    test('should handle missing output in response', async () => {
      mockIDEAutomationService.monitorTerminalOutput.mockResolvedValue({
        summary: { total: 0 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.outputCount).toBe(0);
      expect(result.data.output).toEqual([]);
    });

    test('should handle missing summary in response', async () => {
      mockIDEAutomationService.monitorTerminalOutput.mockResolvedValue({
        output: [{ line: 'test', type: 'stdout' }]
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.data.summary).toEqual({});
    });
  });

  describe('Error Handling', () => {
    test('should handle IDEAutomationService errors', async () => {
      const error = new Error('Failed to monitor output');
      mockIDEAutomationService.monitorTerminalOutput.mockRejectedValue(error);

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to monitor output');
      expect(result.userId).toBe('test-user-123');
      expect(result.sessionId).toBe('session-123');
    });

    test('should publish failure event on error', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.monitorTerminalOutput.mockRejectedValue(error);

      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.output.monitoring.failed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'session-123',
        error: 'Service error',
        timestamp: expect.any(Date)
      });
    });

    test('should handle event publishing errors gracefully', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.monitorTerminalOutput.mockRejectedValue(error);
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
      mockIDEAutomationService.monitorTerminalOutput.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(90);
    });
  });

  describe('Output Data Handling', () => {
    test('should handle complex output structures', async () => {
      const complexOutput = [
        { 
          timestamp: '2024-01-01T10:00:00Z', 
          line: 'Info message', 
          type: 'stdout',
          level: 'info',
          metadata: { source: 'app' }
        },
        { 
          timestamp: '2024-01-01T10:01:00Z', 
          line: 'Error message', 
          type: 'stderr',
          level: 'error',
          stack: 'stack trace'
        }
      ];

      mockIDEAutomationService.monitorTerminalOutput.mockResolvedValue({
        output: complexOutput,
        summary: { total: 2, stdout: 1, stderr: 1 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.outputCount).toBe(2);
      expect(result.data.output).toEqual(complexOutput);
      expect(result.data.summary).toEqual({ total: 2, stdout: 1, stderr: 1 });
    });

    test('should handle different output types', async () => {
      const mixedOutput = [
        { timestamp: '2024-01-01T10:00:00Z', line: 'stdout message', type: 'stdout' },
        { timestamp: '2024-01-01T10:01:00Z', line: 'stderr message', type: 'stderr' },
        { timestamp: '2024-01-01T10:02:00Z', line: 'error message', type: 'error' },
        { timestamp: '2024-01-01T10:03:00Z', line: 'warning message', type: 'warning' }
      ];

      mockIDEAutomationService.monitorTerminalOutput.mockResolvedValue({
        output: mixedOutput,
        summary: { total: 4, stdout: 1, stderr: 1, error: 1, warning: 1 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.outputCount).toBe(4);
      expect(result.data.output).toEqual(mixedOutput);
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
      expect(result1.stepId).toMatch(/^monitor_output_\d+_/);
      expect(result2.stepId).toMatch(/^monitor_output_\d+_/);
    });

    test('should handle large output arrays', async () => {
      const largeOutput = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: `2024-01-01T10:${String(i).padStart(2, '0')}:00Z`,
        line: `Output line ${i}`,
        type: i % 2 === 0 ? 'stdout' : 'stderr'
      }));

      mockIDEAutomationService.monitorTerminalOutput.mockResolvedValue({
        output: largeOutput,
        summary: { total: 1000, stdout: 500, stderr: 500 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.outputCount).toBe(1000);
      expect(result.data.output).toHaveLength(1000);
    });
  });
}); 