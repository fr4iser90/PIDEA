/**
 * List Terminal Processes Step Unit Tests
 * Tests for terminal process listing functionality with filtering and sorting
 */

const { ListTerminalProcessesStep } = require('@domain/steps/categories/terminal/list_terminal_processes_step');

// Mock dependencies
const mockIDEAutomationService = {
  listTerminalProcesses: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockContext = {
  getService: jest.fn(),
  userId: 'test-user-123',
  filter: 'all',
  sortBy: 'pid',
  sortOrder: 'asc',
  limit: 50,
  includeDetails: true
};

describe('ListTerminalProcessesStep', () => {
  let step;
  let context;

  beforeEach(() => {
    step = new ListTerminalProcessesStep();
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

    mockIDEAutomationService.listTerminalProcesses.mockResolvedValue({
      processes: [
        { pid: 1234, name: 'node', status: 'running', cpu: 2.5, memory: 50 },
        { pid: 5678, name: 'python', status: 'sleeping', cpu: 1.2, memory: 30 }
      ],
      summary: { total: 2, running: 1, sleeping: 1, stopped: 0 }
    });

    mockEventBus.publish.mockResolvedValue();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = step.getConfig();
      
      expect(config.name).toBe('ListTerminalProcessesStep');
      expect(config.type).toBe('terminal');
      expect(config.category).toBe('terminal');
      expect(config.description).toContain('List terminal processes');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toContain('ideAutomationService');
      expect(config.dependencies).toContain('eventBus');
    });

    test('should have validation rules', () => {
      const config = step.getConfig();
      
      expect(config.validation.required).toContain('userId');
      expect(config.validation.optional).toContain('filter');
      expect(config.validation.optional).toContain('sortBy');
      expect(config.validation.optional).toContain('sortOrder');
      expect(config.validation.optional).toContain('limit');
      expect(config.validation.optional).toContain('includeDetails');
    });
  });

  describe('Validation', () => {
    test('should validate required userId', () => {
      const result = step.validate({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    test('should validate filter types', () => {
      const result = step.validate({
        userId: 'test-user',
        filter: 'invalid-filter'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid filter: invalid-filter. Valid filters: all, running, sleeping, stopped, zombie');
    });

    test('should accept valid filters', () => {
      const validFilters = ['all', 'running', 'sleeping', 'stopped', 'zombie'];
      
      validFilters.forEach(filter => {
        const result = step.validate({
          userId: 'test-user',
          filter
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate sortBy fields', () => {
      const result = step.validate({
        userId: 'test-user',
        sortBy: 'invalid-field'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid sort field: invalid-field. Valid fields: pid, name, status, cpu, memory');
    });

    test('should accept valid sort fields', () => {
      const validFields = ['pid', 'name', 'status', 'cpu', 'memory'];
      
      validFields.forEach(field => {
        const result = step.validate({
          userId: 'test-user',
          sortBy: field
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate sort order', () => {
      const result = step.validate({
        userId: 'test-user',
        sortOrder: 'invalid-order'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid sort order: invalid-order. Valid orders: asc, desc');
    });

    test('should accept valid sort orders', () => {
      const validOrders = ['asc', 'desc'];
      
      validOrders.forEach(order => {
        const result = step.validate({
          userId: 'test-user',
          sortOrder: order
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate limit range', () => {
      const result = step.validate({
        userId: 'test-user',
        limit: 0
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Limit must be a number between 1 and 1000');
    });

    test('should validate limit upper bound', () => {
      const result = step.validate({
        userId: 'test-user',
        limit: 1001
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Limit must be a number between 1 and 1000');
    });

    test('should accept valid limits', () => {
      const validLimits = [1, 10, 100, 1000];
      
      validLimits.forEach(limit => {
        const result = step.validate({
          userId: 'test-user',
          limit
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate includeDetails boolean', () => {
      const result = step.validate({
        userId: 'test-user',
        includeDetails: 'not-boolean'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Include details must be a boolean');
    });

    test('should accept boolean includeDetails', () => {
      const result1 = step.validate({
        userId: 'test-user',
        includeDetails: true
      });
      
      const result2 = step.validate({
        userId: 'test-user',
        includeDetails: false
      });
      
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    test('should validate options object', () => {
      const result = step.validate({
        userId: 'test-user',
        options: 'not-an-object'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Options must be an object');
    });

    test('should provide warnings for large limits', () => {
      const result = step.validate({
        userId: 'test-user',
        limit: 500
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large limit may impact performance');
    });

    test('should provide warnings for all filter', () => {
      const result = step.validate({
        userId: 'test-user',
        filter: 'all'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Listing all processes may return large results');
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

    test('should validate filter', () => {
      const invalidContext = { ...context, filter: 'invalid' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Invalid filter: invalid. Valid filters: all, running, sleeping, stopped, zombie');
    });

    test('should validate sortBy', () => {
      const invalidContext = { ...context, sortBy: 'invalid' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Invalid sort field: invalid. Valid fields: pid, name, status, cpu, memory');
    });

    test('should validate sortOrder', () => {
      const invalidContext = { ...context, sortOrder: 'invalid' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Invalid sort order: invalid. Valid orders: asc, desc');
    });

    test('should validate limit range', () => {
      const invalidContext = { ...context, limit: 0 };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Limit must be a number between 1 and 1000');
    });

    test('should validate includeDetails boolean', () => {
      const invalidContext = { ...context, includeDetails: 'not-boolean' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Include details must be a boolean');
    });

    test('should validate options object', () => {
      const invalidContext = { ...context, options: 'not-object' };
      
      expect(() => step.validateContext(invalidContext)).toThrow('Options must be an object');
    });
  });

  describe('Successful Execution', () => {
    test('should list processes successfully', async () => {
      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-123');
      expect(result.processCount).toBe(2);
      expect(result.duration).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.stepId).toMatch(/^list_processes_\d+_/);
    });

    test('should use default values when not provided', async () => {
      const minimalContext = {
        ...context,
        filter: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        limit: undefined,
        includeDetails: undefined
      };

      const result = await step.execute(minimalContext);
      
      expect(result.success).toBe(true);
      expect(result.data.filter).toBe('all');
      expect(result.data.sortBy).toBe('pid');
      expect(result.data.sortOrder).toBe('asc');
      expect(result.data.limit).toBe(50);
      expect(result.data.includeDetails).toBe(true);
    });

    test('should call IDEAutomationService with correct parameters', async () => {
      await step.execute(context);
      
      expect(mockIDEAutomationService.listTerminalProcesses).toHaveBeenCalledWith({
        filter: 'all',
        sortBy: 'pid',
        sortOrder: 'asc',
        limit: 50,
        includeDetails: true,
        ...context.options
      });
    });

    test('should publish listing event', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.processes.listing', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        filter: 'all',
        sortBy: 'pid',
        sortOrder: 'asc',
        limit: 50,
        timestamp: expect.any(Date)
      });
    });

    test('should publish listed event on success', async () => {
      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.processes.listed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        processCount: 2,
        filter: 'all',
        timestamp: expect.any(Date)
      });
    });

    test('should handle empty processes array', async () => {
      mockIDEAutomationService.listTerminalProcesses.mockResolvedValue({
        processes: [],
        summary: { total: 0, running: 0, sleeping: 0, stopped: 0 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.processCount).toBe(0);
      expect(result.data.processes).toEqual([]);
    });

    test('should handle missing processes in response', async () => {
      mockIDEAutomationService.listTerminalProcesses.mockResolvedValue({
        summary: { total: 0 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.processCount).toBe(0);
      expect(result.data.processes).toEqual([]);
    });

    test('should handle missing summary in response', async () => {
      mockIDEAutomationService.listTerminalProcesses.mockResolvedValue({
        processes: [{ pid: 1234, name: 'test' }]
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.data.summary).toEqual({});
    });
  });

  describe('Error Handling', () => {
    test('should handle IDEAutomationService errors', async () => {
      const error = new Error('Failed to list processes');
      mockIDEAutomationService.listTerminalProcesses.mockRejectedValue(error);

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to list processes');
      expect(result.userId).toBe('test-user-123');
    });

    test('should publish failure event on error', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.listTerminalProcesses.mockRejectedValue(error);

      await step.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('terminal.processes.listing.failed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        error: 'Service error',
        timestamp: expect.any(Date)
      });
    });

    test('should handle event publishing errors gracefully', async () => {
      const error = new Error('Service error');
      mockIDEAutomationService.listTerminalProcesses.mockRejectedValue(error);
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
      mockIDEAutomationService.listTerminalProcesses.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(90);
    });
  });

  describe('Process Data Handling', () => {
    test('should handle complex process structures', async () => {
      const complexProcesses = [
        { 
          pid: 1234, 
          name: 'node', 
          status: 'running', 
          cpu: 2.5, 
          memory: 50,
          command: '/usr/bin/node',
          startTime: '2024-01-01T10:00:00Z'
        },
        { 
          pid: 5678, 
          name: 'python', 
          status: 'sleeping', 
          cpu: 1.2, 
          memory: 30,
          command: '/usr/bin/python3',
          startTime: '2024-01-01T09:30:00Z'
        }
      ];

      mockIDEAutomationService.listTerminalProcesses.mockResolvedValue({
        processes: complexProcesses,
        summary: { total: 2, running: 1, sleeping: 1, stopped: 0 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.processCount).toBe(2);
      expect(result.data.processes).toEqual(complexProcesses);
      expect(result.data.summary).toEqual({ total: 2, running: 1, sleeping: 1, stopped: 0 });
    });

    test('should handle different process statuses', async () => {
      const processesWithDifferentStatuses = [
        { pid: 1234, name: 'node', status: 'running' },
        { pid: 5678, name: 'python', status: 'sleeping' },
        { pid: 9012, name: 'bash', status: 'stopped' },
        { pid: 3456, name: 'zombie', status: 'zombie' }
      ];

      mockIDEAutomationService.listTerminalProcesses.mockResolvedValue({
        processes: processesWithDifferentStatuses,
        summary: { total: 4, running: 1, sleeping: 1, stopped: 1, zombie: 1 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.processCount).toBe(4);
      expect(result.data.processes).toEqual(processesWithDifferentStatuses);
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
      expect(result1.stepId).toMatch(/^list_processes_\d+_/);
      expect(result2.stepId).toMatch(/^list_processes_\d+_/);
    });

    test('should handle large process lists', async () => {
      const largeProcessList = Array.from({ length: 100 }, (_, i) => ({
        pid: 1000 + i,
        name: `process-${i}`,
        status: 'running',
        cpu: Math.random() * 10,
        memory: Math.random() * 100
      }));

      mockIDEAutomationService.listTerminalProcesses.mockResolvedValue({
        processes: largeProcessList,
        summary: { total: 100, running: 100, sleeping: 0, stopped: 0 }
      });

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.processCount).toBe(100);
      expect(result.data.processes).toHaveLength(100);
    });
  });
}); 