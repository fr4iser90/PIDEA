/**
 * Execute Terminal Script Step Unit Tests
 * Tests for terminal script execution functionality with multi-interpreter support
 */

const { ExecuteTerminalScriptStep } = require('@domain/steps/categories/terminal/execute_terminal_script_step');

// Mock dependencies
const mockIDEAutomationService = {
  executeTerminalScript: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockContext = {
  getService: jest.fn(),
  userId: 'test-user-123',
  script: 'echo "Hello World"',
  interpreter: 'bash',
  arguments: ['-c'],
  workingDirectory: '/home/test',
  timeout: 30000,
  environment: { NODE_ENV: 'test' }
};

describe('ExecuteTerminalScriptStep', () => {
  let step;
  let context;

  beforeEach(() => {
    step = new ExecuteTerminalScriptStep();
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

    mockIDEAutomationService.executeTerminalScript.mockResolvedValue({
      success: true,
      exitCode: 0,
      output: 'Hello World',
      error: '',
      duration: 100
    });

    mockEventBus.publish.mockResolvedValue();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = step.getConfig();
      
      expect(config.name).toBe('ExecuteTerminalScriptStep');
      expect(config.type).toBe('terminal');
      expect(config.category).toBe('terminal');
      expect(config.description).toContain('Execute terminal scripts');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toContain('ideAutomationService');
      expect(config.dependencies).toContain('eventBus');
    });

    test('should have validation rules', () => {
      const config = step.getConfig();
      
      expect(config.validation.required).toContain('userId');
      expect(config.validation.required).toContain('script');
      expect(config.validation.optional).toContain('interpreter');
      expect(config.validation.optional).toContain('arguments');
      expect(config.validation.optional).toContain('workingDirectory');
      expect(config.validation.optional).toContain('timeout');
      expect(config.validation.optional).toContain('environment');
    });
  });

  describe('Validation', () => {
    test('should validate required userId', () => {
      const result = step.validate({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    test('should validate required script', () => {
      const result = step.validate({
        userId: 'test-user'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Script is required');
    });

    test('should validate script as string', () => {
      const result = step.validate({
        userId: 'test-user',
        script: 123
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Script must be a string');
    });

    test('should validate script length', () => {
      const longScript = 'echo "test"'.repeat(1000); // Very long script
      const result = step.validate({
        userId: 'test-user',
        script: longScript
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Script too long (max 10000 characters)');
    });

    test('should validate interpreter types', () => {
      const result = step.validate({
        userId: 'test-user',
        script: 'echo "test"',
        interpreter: 'invalid-interpreter'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid interpreter: invalid-interpreter. Valid interpreters: bash, sh, zsh, python, python3, node, npm, npx, ruby, php, perl, java, go, rust');
    });

    test('should accept valid interpreters', () => {
      const validInterpreters = ['bash', 'sh', 'zsh', 'python', 'python3', 'node', 'npm', 'npx', 'ruby', 'php', 'perl', 'java', 'go', 'rust'];
      
      validInterpreters.forEach(interpreter => {
        const result = step.validate({
          userId: 'test-user',
          script: 'echo "test"',
          interpreter
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate arguments as array', () => {
      const result = step.validate({
        userId: 'test-user',
        script: 'echo "test"',
        arguments: 'not-an-array'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Arguments must be an array');
    });

    test('should validate working directory as string', () => {
      const result = step.validate({
        userId: 'test-user',
        script: 'echo "test"',
        workingDirectory: 123
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Working directory must be a string');
    });

    test('should validate timeout range', () => {
      const result = step.validate({
        userId: 'test-user',
        script: 'echo "test"',
        timeout: 0
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timeout must be a number between 1000 and 300000');
    });

    test('should validate timeout upper bound', () => {
      const result = step.validate({
        userId: 'test-user',
        script: 'echo "test"',
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
          script: 'echo "test"',
          timeout
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate environment as object', () => {
      const result = step.validate({
        userId: 'test-user',
        script: 'echo "test"',
        environment: 'not-an-object'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Environment must be an object');
    });

    test('should validate options object', () => {
      const result = step.validate({
        userId: 'test-user',
        script: 'echo "test"',
        options: 'not-an-object'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Options must be an object');
    });

    test('should provide warnings for dangerous commands', () => {
      const dangerousScripts = [
        'rm -rf /',
        'sudo rm -rf /',
        'dd if=/dev/zero of=/dev/sda',
        'mkfs.ext4 /dev/sda1'
      ];
      
      dangerousScripts.forEach(script => {
        const result = step.validate({
          userId: 'test-user',
          script
        });
        
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Script contains potentially dangerous commands');
      });
    });

    test('should provide warnings for long timeouts', () => {
      const result = step.validate({
        userId: 'test-user',
        script: 'echo "test"',
        timeout: 180000
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Long timeout may consume resources');
    });

    test('should provide warnings for relative paths', () => {
      const result = step.validate({
        userId: 'test-user',
        script: 'echo "test"',
        workingDirectory: './relative/path'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Relative working directory may cause issues');
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

    test('should validate required script', () => {
      const invalidContext = { ...context, script: undefined };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Script is required');
    });

    test('should validate script as string', () => {
      const invalidContext = { ...context, script: 123 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Script must be a string');
    });

    test('should validate interpreter', () => {
      const invalidContext = { ...context, interpreter: 'invalid' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Invalid interpreter: invalid. Valid interpreters: bash, sh, zsh, python, python3, node, npm, npx, ruby, php, perl, java, go, rust');
    });

    test('should validate arguments as array', () => {
      const invalidContext = { ...context, arguments: 'not-array' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Arguments must be an array');
    });

    test('should validate working directory as string', () => {
      const invalidContext = { ...context, workingDirectory: 123 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Working directory must be a string');
    });

    test('should validate timeout range', () => {
      const invalidContext = { ...context, timeout: 0 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Timeout must be a number between 1000 and 300000');
    });

    test('should validate environment as object', () => {
      const invalidContext = { ...context, environment: 'not-object' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Environment must be an object');
    });

    test('should validate options object', () => {
      const invalidContext = { ...context, options: 'not-object' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Options must be an object');
    });
  });

  describe('Successful Execution', () => {
    test('should execute script successfully', async () => {
      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-123');
      expect(result.script).toBe('echo "Hello World"');
      expect(result.interpreter).toBe('bash');
      expect(result.exitCode).toBe(0);
      expect(result.duration).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.stepId).toMatch(/^execute_script_\d+_/);
    });

    test('should use default values when not provided', async () => {
      const minimalContext = {
        ...context,
        interpreter: undefined,
        arguments: undefined,
        workingDirectory: undefined,
        timeout: undefined,
        environment: undefined
      };

      const result = await step.execute(minimalContext);
      
      expect(result.success).toBe(true);
      expect(result.data.interpreter).toBe('bash');
      expect(result.data.arguments).toEqual([]);
      expect(result.data.workingDirectory).toBeUndefined();
      expect(result.data.timeout).toBe(30000);
      expect(result.data.environment).toEqual({});
    });

    test('should call IDEAutomationService with correct parameters', async () => {
      await step.execute(context);
      
      expect(mockIDEAutomationService.executeTerminalScript).toHaveBeenCalledWith({
        script: 'echo "Hello World"',
        interpreter: 'bash',
        arguments: ['-c'],
        workingDirectory: '/home/test',
        timeout: 30000,
        environment: { NODE_ENV: 'test' },
        ...context.options
      });
    });

    test('should publish executing event', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.script.executing', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        script: 'echo "Hello World"',
        interpreter: 'bash',
        workingDirectory: '/home/test',
        timestamp: expect.any(Date)
      });
    });

    test('should publish executed event on success', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.script.executed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        script: 'echo "Hello World"',
        interpreter: 'bash',
        exitCode: 0,
        success: true,
        timestamp: expect.any(Date)
      });
    });

    test('should handle missing exitCode in response', async () => {
      mockIDEAutomationService.executeTerminalScript.mockResolvedValue({
        success: true,
        output: 'Hello World',
        error: '',
        duration: 100
      });

      const result = await step.execute(context);
      
      expect(result.exitCode).toBe(0); // Default value
    });

    test('should handle missing success in response', async () => {
      mockIDEAutomationService.executeTerminalScript.mockResolvedValue({
        exitCode: 0,
        output: 'Hello World',
        error: '',
        duration: 100
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle IDEAutomationService errors', async () => {
      const error = new Error('Failed to execute script');
      mockIDEAutomationService.executeTerminalScript.mockRejectedValue(error);

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to execute script');
      expect(result.userId).toBe('test-user-123');
      expect(result.script).toBe('echo "Hello World"');
    });

    test('should publish failure event on error', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.executeTerminalScript.mockRejectedValue(error);

      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.script.executing.failed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        script: 'echo "Hello World"',
        interpreter: 'bash',
        error: 'Service error',
        timestamp: expect.any(Date)
      });
    });

    test('should handle event publishing errors gracefully', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.executeTerminalScript.mockRejectedValue(error);
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
      mockIDEAutomationService.executeTerminalScript.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(90);
    });
  });

  describe('Script Execution Results', () => {
    test('should handle successful execution with output', async () => {
      mockIDEAutomationService.executeTerminalScript.mockResolvedValue({
        success: true,
        exitCode: 0,
        output: 'Hello World\nScript completed successfully',
        error: '',
        duration: 150
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.data.output).toBe('Hello World\nScript completed successfully');
      expect(result.data.error).toBe('');
      expect(result.data.duration).toBe(150);
    });

    test('should handle failed execution with error', async () => {
      mockIDEAutomationService.executeTerminalScript.mockResolvedValue({
        success: false,
        exitCode: 1,
        output: '',
        error: 'Command not found: invalid-command',
        duration: 50
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.data.output).toBe('');
      expect(result.data.error).toBe('Command not found: invalid-command');
      expect(result.data.duration).toBe(50);
    });

    test('should handle partial success with both output and error', async () => {
      mockIDEAutomationService.executeTerminalScript.mockResolvedValue({
        success: true,
        exitCode: 0,
        output: 'Some output generated',
        error: 'Warning: deprecated feature used',
        duration: 200
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.data.output).toBe('Some output generated');
      expect(result.data.error).toBe('Warning: deprecated feature used');
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
      expect(result1.stepId).toMatch(/^execute_script_\d+_/);
      expect(result2.stepId).toMatch(/^execute_script_\d+_/);
    });

    test('should handle very long scripts', async () => {
      const longScript = 'echo "line 1"\n'.repeat(1000); // 1000 lines
      const longContext = { ...context, script: longScript };
      
      const result = await step.execute(longContext);
      
      expect(result.success).toBe(true);
      expect(result.script).toBe(longScript);
    });

    test('should handle empty script', async () => {
      const emptyContext = { ...context, script: '' };
      
      const result = await step.execute(emptyContext);
      
      expect(result.success).toBe(true);
      expect(result.script).toBe('');
    });
  });
}); 