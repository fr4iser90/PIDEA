/**
 * Open Terminal Step Unit Tests
 * Tests for terminal opening functionality with validation and event publishing
 */

const { OpenTerminalStep } = require('@domain/steps/categories/terminal/open_terminal_step');

// Mock dependencies
const mockIDEAutomationService = {
  openTerminal: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockContext = {
  getService: jest.fn(),
  userId: 'test-user-123',
  ideType: 'cursor',
  workingDirectory: '/home/test',
  shell: 'bash',
  title: 'Test Terminal'
};

describe('OpenTerminalStep', () => {
  let step;
  let context;

  beforeEach(() => {
    step = new OpenTerminalStep();
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

    mockIDEAutomationService.openTerminal.mockResolvedValue({
      terminalId: 'terminal-123',
      success: true,
      result: { status: 'opened' }
    });

    mockEventBus.publish.mockResolvedValue();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = step.getConfig();
      
      expect(config.name).toBe('OpenTerminalStep');
      expect(config.type).toBe('terminal');
      expect(config.category).toBe('terminal');
      expect(config.description).toContain('Open terminal sessions');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toContain('ideAutomationService');
      expect(config.dependencies).toContain('eventBus');
    });

    test('should have validation rules', () => {
      const config = step.getConfig();
      
      expect(config.validation.required).toContain('userId');
      expect(config.validation.optional).toContain('ideType');
      expect(config.validation.optional).toContain('workingDirectory');
      expect(config.validation.optional).toContain('shell');
      expect(config.validation.optional).toContain('title');
    });
  });

  describe('Validation', () => {
    test('should validate required userId', () => {
      const result = step.validate({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    test('should validate valid IDE types', () => {
      const result = step.validate({
        userId: 'test-user',
        ideType: 'invalid-ide'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid IDE type: invalid-ide. Valid types: cursor, vscode, windsurf');
    });

    test('should accept valid IDE types', () => {
      const validTypes = ['cursor', 'vscode', 'windsurf'];
      
      validTypes.forEach(ideType => {
        const result = step.validate({
          userId: 'test-user',
          ideType
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

    test('should validate working directory string', () => {
      const result = step.validate({
        userId: 'test-user',
        workingDirectory: 123
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Working directory must be a string');
    });

    test('should validate shell types', () => {
      const result = step.validate({
        userId: 'test-user',
        shell: 'invalid-shell'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid shell: invalid-shell. Valid shells: bash, zsh, sh, fish, powershell, cmd');
    });

    test('should accept valid shell types', () => {
      const validShells = ['bash', 'zsh', 'sh', 'fish', 'powershell', 'cmd'];
      
      validShells.forEach(shell => {
        const result = step.validate({
          userId: 'test-user',
          shell
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate title string', () => {
      const result = step.validate({
        userId: 'test-user',
        title: 123
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title must be a string');
    });

    test('should validate title length', () => {
      const longTitle = 'a'.repeat(101);
      const result = step.validate({
        userId: 'test-user',
        title: longTitle
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title too long (max 100 characters)');
    });

    test('should provide warnings for relative paths', () => {
      const result = step.validate({
        userId: 'test-user',
        workingDirectory: './relative/path'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Relative working directory may cause issues');
    });

    test('should provide warnings for PowerShell with Cursor', () => {
      const result = step.validate({
        userId: 'test-user',
        ideType: 'cursor',
        shell: 'powershell'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('PowerShell with Cursor IDE may have compatibility issues');
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

    test('should validate IDE type', () => {
      const invalidContext = { ...context, ideType: 'invalid' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Invalid IDE type: invalid. Valid types: cursor, vscode, windsurf');
    });

    test('should validate options object', () => {
      const invalidContext = { ...context, options: 'not-object' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Options must be an object');
    });

    test('should validate working directory', () => {
      const invalidContext = { ...context, workingDirectory: 123 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Working directory must be a string');
    });

    test('should validate shell', () => {
      const invalidContext = { ...context, shell: 'invalid-shell' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Invalid shell: invalid-shell. Valid shells: bash, zsh, sh, fish, powershell, cmd');
    });

    test('should validate title', () => {
      const invalidContext = { ...context, title: 123 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Title must be a string');
    });

    test('should validate title length', () => {
      const invalidContext = { ...context, title: 'a'.repeat(101) };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Title too long (max 100 characters)');
    });
  });

  describe('Successful Execution', () => {
    test('should open terminal successfully', async () => {
      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-123');
      expect(result.ideType).toBe('cursor');
      expect(result.terminalId).toBe('terminal-123');
      expect(result.duration).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.stepId).toMatch(/^open_terminal_\d+_/);
    });

    test('should use default values when not provided', async () => {
      const minimalContext = {
        ...context,
        ideType: undefined,
        workingDirectory: undefined,
        shell: undefined,
        title: undefined
      };

      const result = await step.execute(minimalContext);
      
      expect(result.success).toBe(true);
      expect(result.data.ideType).toBe('cursor');
      expect(result.data.shell).toBe('bash');
      expect(result.data.title).toBe('Terminal');
    });

    test('should call IDEAutomationService with correct parameters', async () => {
      await step.execute(context);
      
      expect(mockIDEAutomationService.openTerminal).toHaveBeenCalledWith({
        ideType: 'cursor',
        workingDirectory: '/home/test',
        shell: 'bash',
        title: 'Test Terminal',
        ...context.options
      });
    });

    test('should publish opening event', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.opening', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        ideType: 'cursor',
        workingDirectory: '/home/test',
        shell: 'bash',
        title: 'Test Terminal',
        timestamp: expect.any(Date)
      });
    });

    test('should publish opened event on success', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.opened', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        ideType: 'cursor',
        terminalId: 'terminal-123',
        success: true,
        timestamp: expect.any(Date)
      });
    });

    test('should handle missing terminalId in response', async () => {
      mockIDEAutomationService.openTerminal.mockResolvedValue({
        success: true,
        result: { status: 'opened' }
      });

      const result = await step.execute(context);
      
      expect(result.terminalId).toMatch(/^terminal_\d+$/);
    });

    test('should handle missing success in response', async () => {
      mockIDEAutomationService.openTerminal.mockResolvedValue({
        terminalId: 'terminal-123',
        result: { status: 'opened' }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle IDEAutomationService errors', async () => {
      const error = new Error('Failed to open terminal');
      mockIDEAutomationService.openTerminal.mockRejectedValue(error);

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to open terminal');
      expect(result.userId).toBe('test-user-123');
      expect(result.ideType).toBe('cursor');
    });

    test('should publish failure event on error', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.openTerminal.mockRejectedValue(error);

      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.opening.failed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        ideType: 'cursor',
        error: 'Service error',
        timestamp: expect.any(Date)
      });
    });

    test('should handle event publishing errors gracefully', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.openTerminal.mockRejectedValue(error);
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
      mockIDEAutomationService.openTerminal.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(90);
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
      expect(result1.stepId).toMatch(/^open_terminal_\d+_/);
      expect(result2.stepId).toMatch(/^open_terminal_\d+_/);
    });
  });
}); 