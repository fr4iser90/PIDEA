/**
 * Terminal Log Capture Step Unit Tests
 * Tests for terminal log capture functionality with filtering and formatting
 */

const { TerminalLogCaptureStep } = require('@domain/steps/categories/terminal/terminal_log_capture_step');

// Mock dependencies
const mockIDEAutomationService = {
  captureTerminalLogs: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockContext = {
  getService: jest.fn(),
  userId: 'test-user-123',
  maxLines: 100,
  includeTimestamps: true,
  filterLevel: 'all',
  sessionId: 'session-123',
  format: 'text'
};

describe('TerminalLogCaptureStep', () => {
  let step;
  let context;

  beforeEach(() => {
    step = new TerminalLogCaptureStep();
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

    mockIDEAutomationService.captureTerminalLogs.mockResolvedValue({
      logs: [
        { timestamp: '2024-01-01T10:00:00Z', level: 'info', message: 'Test log 1' },
        { timestamp: '2024-01-01T10:01:00Z', level: 'error', message: 'Test log 2' }
      ],
      summary: { total: 2, errors: 1, warnings: 0, info: 1 }
    });

    mockEventBus.publish.mockResolvedValue();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = step.getConfig();
      
      expect(config.name).toBe('TerminalLogCaptureStep');
      expect(config.type).toBe('terminal');
      expect(config.category).toBe('terminal');
      expect(config.description).toContain('Capture terminal logs');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toContain('ideAutomationService');
      expect(config.dependencies).toContain('eventBus');
    });

    test('should have validation rules', () => {
      const config = step.getConfig();
      
      expect(config.validation.required).toContain('userId');
      expect(config.validation.optional).toContain('maxLines');
      expect(config.validation.optional).toContain('includeTimestamps');
      expect(config.validation.optional).toContain('filterLevel');
      expect(config.validation.optional).toContain('sessionId');
      expect(config.validation.optional).toContain('format');
    });
  });

  describe('Validation', () => {
    test('should validate required userId', () => {
      const result = step.validate({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    test('should validate maxLines range', () => {
      const result = step.validate({
        userId: 'test-user',
        maxLines: 0
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Max lines must be a number between 1 and 10000');
    });

    test('should validate maxLines upper limit', () => {
      const result = step.validate({
        userId: 'test-user',
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
          maxLines
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate includeTimestamps boolean', () => {
      const result = step.validate({
        userId: 'test-user',
        includeTimestamps: 'not-boolean'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Include timestamps must be a boolean');
    });

    test('should accept boolean includeTimestamps', () => {
      const result1 = step.validate({
        userId: 'test-user',
        includeTimestamps: true
      });
      
      const result2 = step.validate({
        userId: 'test-user',
        includeTimestamps: false
      });
      
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    test('should validate filter levels', () => {
      const result = step.validate({
        userId: 'test-user',
        filterLevel: 'invalid-level'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid filter level: invalid-level. Valid levels: all, error, warning, info, debug');
    });

    test('should accept valid filter levels', () => {
      const validLevels = ['all', 'error', 'warning', 'info', 'debug'];
      
      validLevels.forEach(level => {
        const result = step.validate({
          userId: 'test-user',
          filterLevel: level
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate options object', () => {
      const result = step.validate({
        userId: 'test-user',
        options: 'not-an-object'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Options must be an object');
    });

    test('should validate sessionId string', () => {
      const result = step.validate({
        userId: 'test-user',
        sessionId: 123
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Session ID must be a string');
    });

    test('should validate format types', () => {
      const result = step.validate({
        userId: 'test-user',
        format: 'invalid-format'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid format: invalid-format. Valid formats: text, json, csv, xml');
    });

    test('should accept valid formats', () => {
      const validFormats = ['text', 'json', 'csv', 'xml'];
      
      validFormats.forEach(format => {
        const result = step.validate({
          userId: 'test-user',
          format
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should provide warnings for large maxLines', () => {
      const result = step.validate({
        userId: 'test-user',
        maxLines: 2000
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large max lines value may impact performance');
    });

    test('should provide warnings for all filter level', () => {
      const result = step.validate({
        userId: 'test-user',
        filterLevel: 'all'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Capturing all log levels may result in large output');
    });

    test('should provide warnings for structured formats', () => {
      const result = step.validate({
        userId: 'test-user',
        format: 'json'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Structured formats may increase processing time');
    });

    test('should provide warnings for XML format', () => {
      const result = step.validate({
        userId: 'test-user',
        format: 'xml'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Structured formats may increase processing time');
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

    test('should validate maxLines range', () => {
      const invalidContext = { ...context, maxLines: 0 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Max lines must be a number between 1 and 10000');
    });

    test('should validate includeTimestamps boolean', () => {
      const invalidContext = { ...context, includeTimestamps: 'not-boolean' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Include timestamps must be a boolean');
    });

    test('should validate filter level', () => {
      const invalidContext = { ...context, filterLevel: 'invalid' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Invalid filter level: invalid. Valid levels: all, error, warning, info, debug');
    });

    test('should validate options object', () => {
      const invalidContext = { ...context, options: 'not-object' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Options must be an object');
    });

    test('should validate sessionId string', () => {
      const invalidContext = { ...context, sessionId: 123 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Session ID must be a string');
    });

    test('should validate format', () => {
      const invalidContext = { ...context, format: 'invalid' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Invalid format: invalid. Valid formats: text, json, csv, xml');
    });
  });

  describe('Successful Execution', () => {
    test('should capture logs successfully', async () => {
      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-123');
      expect(result.logCount).toBe(2);
      expect(result.duration).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.stepId).toMatch(/^capture_logs_\d+_/);
    });

    test('should use default values when not provided', async () => {
      const minimalContext = {
        ...context,
        maxLines: undefined,
        includeTimestamps: undefined,
        filterLevel: undefined,
        sessionId: undefined,
        format: undefined
      };

      const result = await step.execute(minimalContext);
      
      expect(result.success).toBe(true);
      expect(result.data.maxLines).toBe(100);
      expect(result.data.includeTimestamps).toBe(true);
      expect(result.data.filterLevel).toBe('all');
      expect(result.data.sessionId).toBeNull();
      expect(result.data.format).toBe('text');
    });

    test('should call IDEAutomationService with correct parameters', async () => {
      await step.execute(context);
      
      expect(mockIDEAutomationService.captureTerminalLogs).toHaveBeenCalledWith({
        maxLines: 100,
        includeTimestamps: true,
        filterLevel: 'all',
        sessionId: 'session-123',
        format: 'text',
        ...context.options
      });
    });

    test('should publish capturing event', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.logs.capturing', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        maxLines: 100,
        filterLevel: 'all',
        sessionId: 'session-123',
        timestamp: expect.any(Date)
      });
    });

    test('should publish captured event on success', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.logs.captured', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        logCount: 2,
        filterLevel: 'all',
        sessionId: 'session-123',
        timestamp: expect.any(Date)
      });
    });

    test('should handle empty logs array', async () => {
      mockIDEAutomationService.captureTerminalLogs.mockResolvedValue({
        logs: [],
        summary: { total: 0, errors: 0, warnings: 0, info: 0 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.logCount).toBe(0);
      expect(result.data.logs).toEqual([]);
    });

    test('should handle missing logs in response', async () => {
      mockIDEAutomationService.captureTerminalLogs.mockResolvedValue({
        summary: { total: 0 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.logCount).toBe(0);
      expect(result.data.logs).toEqual([]);
    });

    test('should handle missing summary in response', async () => {
      mockIDEAutomationService.captureTerminalLogs.mockResolvedValue({
        logs: [{ message: 'test' }]
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.data.summary).toEqual({});
    });
  });

  describe('Error Handling', () => {
    test('should handle IDEAutomationService errors', async () => {
      const error = new Error('Failed to capture logs');
      mockIDEAutomationService.captureTerminalLogs.mockRejectedValue(error);

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to capture logs');
      expect(result.userId).toBe('test-user-123');
    });

    test('should publish failure event on error', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.captureTerminalLogs.mockRejectedValue(error);

      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.logs.capture.failed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        error: 'Service error',
        timestamp: expect.any(Date)
      });
    });

    test('should handle event publishing errors gracefully', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.captureTerminalLogs.mockRejectedValue(error);
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
      mockIDEAutomationService.captureTerminalLogs.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(90);
    });
  });

  describe('Log Data Handling', () => {
    test('should handle complex log structures', async () => {
      const complexLogs = [
        { timestamp: '2024-01-01T10:00:00Z', level: 'info', message: 'Info log', metadata: { source: 'app' } },
        { timestamp: '2024-01-01T10:01:00Z', level: 'error', message: 'Error log', stack: 'stack trace' },
        { timestamp: '2024-01-01T10:02:00Z', level: 'warning', message: 'Warning log', code: 'WARN001' }
      ];

      mockIDEAutomationService.captureTerminalLogs.mockResolvedValue({
        logs: complexLogs,
        summary: { total: 3, errors: 1, warnings: 1, info: 1 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.logCount).toBe(3);
      expect(result.data.logs).toEqual(complexLogs);
      expect(result.data.summary).toEqual({ total: 3, errors: 1, warnings: 1, info: 1 });
    });

    test('should handle different log formats', async () => {
      const textLogs = ['2024-01-01 10:00:00 INFO: Test log 1', '2024-01-01 10:01:00 ERROR: Test log 2'];
      
      mockIDEAutomationService.captureTerminalLogs.mockResolvedValue({
        logs: textLogs,
        summary: { total: 2 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.logCount).toBe(2);
      expect(result.data.logs).toEqual(textLogs);
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
      expect(result1.stepId).toMatch(/^capture_logs_\d+_/);
      expect(result2.stepId).toMatch(/^capture_logs_\d+_/);
    });

    test('should handle null sessionId', async () => {
      const contextWithNullSession = { ...context, sessionId: null };
      
      const result = await step.execute(contextWithNullSession);
      
      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBeNull();
    });

    test('should handle undefined sessionId', async () => {
      const contextWithUndefinedSession = { ...context, sessionId: undefined };
      
      const result = await step.execute(contextWithUndefinedSession);
      
      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBeNull();
    });
  });
}); 