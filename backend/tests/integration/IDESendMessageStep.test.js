/**
 * IDESendMessageStep Integration Tests
 * Tests for step execution without IDE service dependencies
 */

const IDESendMessageStep = require('@domain/steps/categories/chat/ide_send_message_step');

describe('IDESendMessageStep Integration', () => {
  let step;
  let mockBrowserManager;
  let mockContext;

  beforeEach(() => {
    step = new IDESendMessageStep();
    
    // Mock BrowserManager
    mockBrowserManager = {
      typeMessage: jest.fn().mockResolvedValue(true),
      switchToPort: jest.fn().mockResolvedValue(true),
      getCurrentPort: jest.fn().mockReturnValue(9222)
    };

    // Mock context with services
    mockContext = {
      getService: jest.fn((serviceName) => {
        switch (serviceName) {
          case 'browserManager':
            return mockBrowserManager;
          case 'chatSessionService':
            return { /* mock chat session service */ };
          case 'idePortManager':
            return {
              getActivePort: jest.fn().mockReturnValue(9222)
            };
          default:
            return null;
        }
      }),
      projectId: 'test-project',
      message: 'Test message',
      ideType: 'cursor'
    };
  });

  describe('Step Configuration', () => {
    test('should have correct dependencies', () => {
      const config = IDESendMessageStep.getConfig();
      expect(config.dependencies).toEqual(['browserManager']);
      expect(config.dependencies).not.toContain('cursorIDEService');
      expect(config.dependencies).not.toContain('vscodeIDEService');
      expect(config.dependencies).not.toContain('windsurfIDEService');
    });

    test('should have correct validation rules', () => {
      const config = IDESendMessageStep.getConfig();
      expect(config.validation.required).toContain('projectId');
      expect(config.validation.required).toContain('message');
      expect(config.validation.optional).toContain('workspacePath');
      expect(config.validation.optional).toContain('ideType');
    });
  });

  describe('Step Execution', () => {
    test('should execute step without IDE service dependencies', async () => {
      const result = await step.execute(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Message sent to IDE');
      expect(result.ideType).toBe('cursor');
      expect(mockBrowserManager.typeMessage).toHaveBeenCalledWith('Test message', true);
    });

    test('should handle BrowserManager unavailability', async () => {
      mockContext.getService = jest.fn().mockReturnValue(null);
      
      const result = await step.execute(mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('BrowserManager not available');
    });

    test('should handle message sending failures', async () => {
      mockBrowserManager.typeMessage = jest.fn().mockResolvedValue(false);
      
      const result = await step.execute(mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('BrowserManager returned false');
    });

    test('should switch to active port before sending message', async () => {
      const mockIdePortManager = {
        getActivePort: jest.fn().mockReturnValue(9232)
      };
      
      mockContext.getService = jest.fn((serviceName) => {
        switch (serviceName) {
          case 'browserManager':
            return mockBrowserManager;
          case 'chatSessionService':
            return { /* mock chat session service */ };
          case 'idePortManager':
            return mockIdePortManager;
          default:
            return null;
        }
      });

      await step.execute(mockContext);
      
      expect(mockBrowserManager.switchToPort).toHaveBeenCalledWith(9232);
    });

    test('should handle missing chatSessionService gracefully', async () => {
      mockContext.getService = jest.fn((serviceName) => {
        switch (serviceName) {
          case 'browserManager':
            return mockBrowserManager;
          case 'chatSessionService':
            return null;
          case 'idePortManager':
            return {
              getActivePort: jest.fn().mockReturnValue(9222)
            };
          default:
            return null;
        }
      });

      const result = await step.execute(mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('ChatSessionService not available');
    });

    test('should validate required context parameters', async () => {
      const invalidContext = {
        getService: jest.fn().mockReturnValue(mockBrowserManager),
        // Missing projectId and message
      };

      expect(() => step.validateContext(invalidContext)).toThrow('Project ID is required');
    });

    test('should handle IDE type auto-detection', async () => {
      delete mockContext.ideType;
      
      const result = await step.execute(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.ideType).toBe('auto-detected');
    });
  });

  describe('Error Handling', () => {
    test('should handle BrowserManager errors gracefully', async () => {
      mockBrowserManager.typeMessage = jest.fn().mockRejectedValue(new Error('Connection failed'));
      
      const result = await step.execute(mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
      expect(result.timestamp).toBeDefined();
    });

    test('should handle port switching errors gracefully', async () => {
      mockBrowserManager.switchToPort = jest.fn().mockRejectedValue(new Error('Port switch failed'));
      
      const result = await step.execute(mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Port switch failed');
    });
  });

  describe('Performance', () => {
    test('should execute within reasonable time', async () => {
      const startTime = Date.now();
      
      await step.execute(mockContext);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 