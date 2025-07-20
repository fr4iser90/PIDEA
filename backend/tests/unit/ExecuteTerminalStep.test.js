/**
 * ExecuteTerminalStep Unit Tests
 * Tests for the terminal command execution step
 */

const executeTerminalStepModule = require('@domain/steps/categories/terminal/execute_terminal_step');

// Mock dependencies
const mockIDEAutomationService = {
  executeTerminalCommand: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

// Mock context with services
const createMockContext = (overrides = {}) => ({
  userId: 'test-user-123',
  command: 'ls -la',
  waitTime: 2000,
  workingDirectory: '/path/to/workspace',
  environment: { NODE_ENV: 'test' },
  options: { timeout: 5000 },
  getService: jest.fn((serviceName) => {
    switch (serviceName) {
      case 'IDEAutomationService':
        return mockIDEAutomationService;
      case 'EventBus':
        return mockEventBus;
      default:
        return null;
    }
  }),
  ...overrides
});

// Mock data
const mockTerminalResult = {
  output: 'total 8\ndrwxr-xr-x 2 user user 4096 Jan 1 12:00 .\ndrwxr-xr-x 3 user user 4096 Jan 1 12:00 ..',
  exitCode: 0,
  success: true
};

describe('ExecuteTerminalStep', () => {
  let stepInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create step instance using the exported class
    const ExecuteTerminalStep = executeTerminalStepModule.ExecuteTerminalStep;
    stepInstance = new ExecuteTerminalStep();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = executeTerminalStepModule.config;
      
      expect(config.name).toBe('ExecuteTerminalStep');
      expect(config.type).toBe('terminal');
      expect(config.category).toBe('terminal');
      expect(config.description).toBe('Execute terminal commands with validation and monitoring');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toEqual(['ideAutomationService', 'eventBus']);
      expect(config.validation.required).toEqual(['userId', 'command']);
      expect(config.validation.optional).toEqual(['waitTime', 'options', 'workingDirectory', 'environment']);
      expect(config.settings.timeout).toBe(30000);
      expect(config.settings.maxRetries).toBe(3);
    });
  });

  describe('Service Dependencies', () => {
    test('should throw error for missing IDEAutomationService', () => {
      const context = createMockContext();
      context.getService.mockReturnValue(null);
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'IDEAutomationService not available in context'
        })
      );
    });
  });

  describe('Parameter Validation', () => {
    test('should throw error for missing userId', () => {
      const context = createMockContext({ userId: null });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'User ID is required'
        })
      );
    });

    test('should throw error for missing command', () => {
      const context = createMockContext({ command: null });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Terminal command is required'
        })
      );
    });

    test('should throw error for empty command', () => {
      const context = createMockContext({ command: '   ' });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Terminal command is required'
        })
      );
    });

    test('should throw error for command too long', () => {
      const longCommand = 'a'.repeat(1001);
      const context = createMockContext({ command: longCommand });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Terminal command too long (max 1000 characters)'
        })
      );
    });

    test('should throw error for invalid waitTime', () => {
      const context = createMockContext({ waitTime: 35000 });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Wait time must be a number between 0 and 30000 milliseconds'
        })
      );
    });

    test('should throw error for invalid options', () => {
      const context = createMockContext({ options: 'invalid' });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Options must be an object'
        })
      );
    });

    test('should throw error for invalid workingDirectory', () => {
      const context = createMockContext({ workingDirectory: 123 });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Working directory must be a string'
        })
      );
    });

    test('should throw error for invalid environment', () => {
      const context = createMockContext({ environment: 'invalid' });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Environment must be an object'
        })
      );
    });
  });

  describe('Successful Execution', () => {
    test('should execute terminal command successfully', async () => {
      const context = createMockContext();
      
      // Mock service response
      mockIDEAutomationService.executeTerminalCommand.mockResolvedValue(mockTerminalResult);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-123');
      expect(result.command).toBe('ls -la');
      expect(result.data.result.success).toBe(true);
      expect(result.data.result.exitCode).toBe(0);
      expect(result.data.result.output).toContain('total 8');
      expect(result.data.workingDirectory).toBe('/path/to/workspace');
      expect(result.data.environment).toEqual(['NODE_ENV']);
      expect(result.stepId).toMatch(/execute_terminal_\d+_/);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should publish events correctly', async () => {
      const context = createMockContext();
      mockIDEAutomationService.executeTerminalCommand.mockResolvedValue(mockTerminalResult);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.command.executing', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        command: 'ls -la',
        workingDirectory: '/path/to/workspace',
        waitTime: 2000,
        timestamp: expect.any(Date)
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.command.executed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        command: 'ls -la',
        result: {
          success: true,
          output: expect.any(String),
          exitCode: 0,
          duration: expect.any(Number)
        },
        timestamp: expect.any(Date)
      });
    });

    test('should handle command with default values', async () => {
      const context = createMockContext({
        waitTime: undefined,
        options: undefined,
        workingDirectory: undefined,
        environment: undefined
      });
      
      mockIDEAutomationService.executeTerminalCommand.mockResolvedValue(mockTerminalResult);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(mockIDEAutomationService.executeTerminalCommand).toHaveBeenCalledWith('ls -la', {
        waitTime: 2000,
        workingDirectory: undefined,
        environment: undefined
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle terminal command failure', async () => {
      const context = createMockContext();
      const errorMessage = 'Command not found: invalid-command';
      
      mockIDEAutomationService.executeTerminalCommand.mockRejectedValue(new Error(errorMessage));
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(result.command).toBe('ls -la');
      expect(result.userId).toBe('test-user-123');
    });

    test('should handle event bus failure gracefully', async () => {
      const context = createMockContext();
      mockIDEAutomationService.executeTerminalCommand.mockResolvedValue(mockTerminalResult);
      mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Event bus error');
    });

    test('should handle service execution error', async () => {
      const context = createMockContext();
      mockIDEAutomationService.executeTerminalCommand.mockImplementation(() => {
        throw new Error('Service execution failed');
      });
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service execution failed');
    });
  });

  describe('Validation Method', () => {
    test('should validate correct parameters', () => {
      const context = createMockContext();
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(validation.warnings).toEqual([]);
    });

    test('should detect missing userId', () => {
      const context = createMockContext({ userId: null });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('User ID is required');
    });

    test('should detect missing command', () => {
      const context = createMockContext({ command: null });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Terminal command is required');
    });

    test('should detect command too long', () => {
      const context = createMockContext({ command: 'a'.repeat(1001) });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Terminal command too long (max 1000 characters)');
    });

    test('should detect invalid waitTime', () => {
      const context = createMockContext({ waitTime: 35000 });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Wait time must be a number between 0 and 30000 milliseconds');
    });

    test('should warn about dangerous commands', () => {
      const context = createMockContext({ command: 'rm -rf /tmp/test' });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Potentially dangerous command detected: rm -rf');
    });

    test('should warn about multiple dangerous commands', () => {
      const context = createMockContext({ command: 'sudo mkfs.ext4 /dev/sda1' });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Potentially dangerous command detected: mkfs');
    });
  });

  describe('Step Registry Integration', () => {
    test('should export execute function', () => {
      expect(typeof executeTerminalStepModule.execute).toBe('function');
    });

    test('should export config', () => {
      expect(executeTerminalStepModule.config).toBeDefined();
      expect(executeTerminalStepModule.config.name).toBe('ExecuteTerminalStep');
    });

    test('should export ExecuteTerminalStep class', () => {
      expect(executeTerminalStepModule.ExecuteTerminalStep).toBeDefined();
      expect(typeof executeTerminalStepModule.ExecuteTerminalStep).toBe('function');
    });
  });

  describe('Performance and Monitoring', () => {
    test('should measure execution duration', async () => {
      const context = createMockContext();
      
      // Mock delayed response
      mockIDEAutomationService.executeTerminalCommand.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockTerminalResult;
      });
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.data.result.duration).toBeGreaterThan(90);
      expect(result.data.result.duration).toBeLessThan(200);
    });

    test('should handle long-running commands', async () => {
      const context = createMockContext({ waitTime: 10000 });
      
      mockIDEAutomationService.executeTerminalCommand.mockResolvedValue(mockTerminalResult);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(mockIDEAutomationService.executeTerminalCommand).toHaveBeenCalledWith('ls -la', {
        waitTime: 10000,
        workingDirectory: '/path/to/workspace',
        environment: { NODE_ENV: 'test' },
        timeout: 5000
      });
    });
  });
}); 