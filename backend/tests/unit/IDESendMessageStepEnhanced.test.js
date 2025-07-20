/**
 * IDESendMessageStepEnhanced Unit Tests
 * Tests for the enhanced IDE Send Message Step with feature control
 */

const ideSendMessageEnhancedModule = require('@domain/steps/categories/ide/ide_send_message_enhanced');

// Mock dependencies
const mockIDEService = {
  sendMessage: jest.fn()
};

const mockChatService = {
  detectIntent: jest.fn(),
  calculateConfidence: jest.fn(),
  improveResponse: jest.fn(),
  generateSuggestions: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockAnalysisService = {
  analyzeContext: jest.fn(),
  optimizePerformance: jest.fn()
};

const mockValidationService = {
  validateCode: jest.fn()
};

const mockChatSessionService = {
  getSession: jest.fn()
};

// Mock context with services
const createMockContext = (overrides = {}) => ({
  projectId: 'test-project-123',
  message: 'Help me with this code',
  workspacePath: '/path/to/workspace',
  ideType: 'cursor',
  features: {
    confidenceCheck: true,
    improvedResponse: true,
    contextAnalysis: true,
    codeValidation: true,
    intentDetection: true,
    suggestionGeneration: true,
    performanceOptimization: true
  },
  confidenceThreshold: 0.6,
  getService: jest.fn((serviceName) => {
    switch (serviceName) {
      case 'IDEService':
        return mockIDEService;
      case 'ChatService':
        return mockChatService;
      case 'EventBus':
        return mockEventBus;
      case 'AnalysisService':
        return mockAnalysisService;
      case 'ValidationService':
        return mockValidationService;
      case 'ChatSessionService':
        return mockChatSessionService;
      default:
        return null;
    }
  }),
  ...overrides
});

// Mock data
const mockContextData = {
  projectType: 'javascript',
  fileCount: 15,
  dependencies: ['react', 'express'],
  recentFiles: ['src/App.js', 'src/components/Header.js']
};

const mockIntentData = {
  intent: 'code_help',
  confidence: 0.85,
  entities: ['javascript', 'react']
};

const mockValidationResult = {
  isValid: true,
  issues: [],
  suggestions: ['Consider using TypeScript']
};

const mockSuggestions = [
  'Try using React hooks',
  'Consider adding error boundaries',
  'Use PropTypes for type checking'
];

describe('IDESendMessageStepEnhanced', () => {
  let stepInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create step instance using the exported class
    const IDESendMessageStepEnhanced = ideSendMessageEnhancedModule.IDESendMessageStepEnhanced;
    stepInstance = new IDESendMessageStepEnhanced();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = ideSendMessageEnhancedModule.config;
      
      expect(config.name).toBe('IDESendMessageStepEnhanced');
      expect(config.type).toBe('ide');
      expect(config.category).toBe('ide');
      expect(config.description).toBe('Send message to any IDE with intelligent features and confidence checks');
      expect(config.version).toBe('2.0.0');
      expect(config.dependencies).toEqual(['cursorIDEService', 'vscodeIDEService', 'windsurfIDEService', 'chatSessionService', 'eventBus']);
      expect(config.validation.required).toEqual(['projectId', 'message']);
      expect(config.validation.optional).toEqual(['workspacePath', 'ideType', 'features', 'confidenceThreshold']);
      expect(config.features).toBeDefined();
      expect(config.confidenceThresholds).toBeDefined();
    });

    test('should have all feature flags defined', () => {
      const config = ideSendMessageEnhancedModule.config;
      
      expect(config.features.confidenceCheck).toBeDefined();
      expect(config.features.improvedResponse).toBeDefined();
      expect(config.features.contextAnalysis).toBeDefined();
      expect(config.features.codeValidation).toBeDefined();
      expect(config.features.intentDetection).toBeDefined();
      expect(config.features.suggestionGeneration).toBeDefined();
      expect(config.features.performanceOptimization).toBeDefined();
    });
  });

  describe('Service Dependencies', () => {
    test('should throw error for missing IDEService', () => {
      const context = createMockContext();
      context.getService.mockReturnValue(null);
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'IDEService not available in context'
        })
      );
    });

    test('should throw error for missing ChatService', () => {
      const context = createMockContext();
      context.getService.mockImplementation((serviceName) => {
        if (serviceName === 'ChatService') return null;
        if (serviceName === 'IDEService') return mockIDEService;
        if (serviceName === 'EventBus') return mockEventBus;
        return null;
      });
      mockEventBus.publish.mockResolvedValue();
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'ChatService not available in context'
        })
      );
    });
  });

  describe('Parameter Validation', () => {
    test('should throw error for missing projectId', () => {
      const context = createMockContext({ projectId: null });
      mockEventBus.publish.mockResolvedValue();
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Project ID is required'
        })
      );
    });

    test('should throw error for missing message', () => {
      const context = createMockContext({ message: null });
      mockEventBus.publish.mockResolvedValue();
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Message is required'
        })
      );
    });

    test('should throw error for invalid confidence threshold', () => {
      const context = createMockContext({ confidenceThreshold: 1.5 });
      
      const validation = stepInstance.validate(context);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Confidence threshold must be a number between 0 and 1');
    });
  });

  describe('Feature Configuration', () => {
    test('should merge default features with context features', () => {
      const context = createMockContext({
        features: {
          confidenceCheck: false,
          improvedResponse: true
        }
      });

      const features = stepInstance.getFeatureConfiguration(context);
      
      expect(features.confidenceCheck).toBe(false); // Overridden
      expect(features.improvedResponse).toBe(true); // Overridden
      expect(features.contextAnalysis).toBe(true); // Default
      expect(features.codeValidation).toBe(true); // Default
    });

    test('should use default features when none provided', () => {
      const context = createMockContext({ features: undefined });

      const features = stepInstance.getFeatureConfiguration(context);
      
      expect(features.confidenceCheck).toBe(true);
      expect(features.improvedResponse).toBe(true);
      expect(features.contextAnalysis).toBe(true);
      expect(features.codeValidation).toBe(true);
    });
  });

  describe('Successful Execution with All Features', () => {
    test('should execute all features when enabled', async () => {
      const context = createMockContext();
      
      // Mock service responses
      mockAnalysisService.analyzeContext.mockResolvedValue(mockContextData);
      mockChatService.detectIntent.mockResolvedValue(mockIntentData);
      mockValidationService.validateCode.mockResolvedValue(mockValidationResult);
      mockChatService.calculateConfidence.mockResolvedValue(0.85);
      mockChatService.improveResponse.mockResolvedValue('Enhanced: Help me with this code');
      mockIDEService.sendMessage.mockResolvedValue({ success: true, response: 'Code help provided' });
      mockChatService.generateSuggestions.mockResolvedValue(mockSuggestions);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.contextAnalysis).toEqual(mockContextData);
      expect(result.data.intentDetection).toEqual(mockIntentData);
      expect(result.data.codeValidation).toEqual(mockValidationResult);
      expect(result.data.confidenceScore).toBe(0.85);
      expect(result.data.suggestions).toEqual(mockSuggestions);
      expect(result.confidence).toBe(0.85);
      expect(result.stepId).toMatch(/ide_send_message_enhanced_\d+_/);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should publish events correctly', async () => {
      const context = createMockContext();
      mockIDEService.sendMessage.mockResolvedValue({ success: true });
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('ide.message.sending', {
        stepId: expect.any(String),
        projectId: 'test-project-123',
        message: expect.any(String),
        ideType: 'cursor',
        features: expect.any(Object),
        timestamp: expect.any(Date)
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith('ide.message.sent', {
        stepId: expect.any(String),
        projectId: 'test-project-123',
        ideType: 'cursor',
        confidence: undefined,
        features: expect.any(Array),
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Feature-Specific Execution', () => {
    test('should skip context analysis when disabled', async () => {
      const context = createMockContext({
        features: {
          contextAnalysis: false,
          confidenceCheck: true,
          improvedResponse: true,
          codeValidation: true,
          intentDetection: true,
          suggestionGeneration: true,
          performanceOptimization: true
        }
      });

      mockIDEService.sendMessage.mockResolvedValue({ success: true });
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockAnalysisService.analyzeContext).not.toHaveBeenCalled();
    });

    test('should skip confidence check when disabled', async () => {
      const context = createMockContext({
        features: {
          confidenceCheck: false,
          contextAnalysis: true,
          improvedResponse: true,
          codeValidation: true,
          intentDetection: true,
          suggestionGeneration: true,
          performanceOptimization: true
        }
      });

      mockIDEService.sendMessage.mockResolvedValue({ success: true });
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(mockChatService.calculateConfidence).not.toHaveBeenCalled();
      expect(result.data.confidenceScore).toBeNull();
    });

    test('should skip improved response when disabled', async () => {
      const context = createMockContext({
        features: {
          improvedResponse: false,
          contextAnalysis: true,
          confidenceCheck: true,
          codeValidation: true,
          intentDetection: true,
          suggestionGeneration: true,
          performanceOptimization: true
        }
      });

      mockIDEService.sendMessage.mockResolvedValue({ success: true });
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockChatService.improveResponse).not.toHaveBeenCalled();
    });

    test('should handle low confidence warning', async () => {
      const context = createMockContext({
        confidenceThreshold: 0.9
      });

      mockChatService.calculateConfidence.mockResolvedValue(0.3); // Low confidence
      mockIDEService.sendMessage.mockResolvedValue({ success: true });
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.data.confidenceScore).toBe(0.3);
      expect(result.confidence).toBe(0.3);
    });
  });

  describe('Error Handling', () => {
    test('should handle service failures gracefully', async () => {
      const context = createMockContext();
      
      // Mock service failures
      mockAnalysisService.analyzeContext.mockRejectedValue(new Error('Analysis failed'));
      mockChatService.detectIntent.mockRejectedValue(new Error('Intent detection failed'));
      mockIDEService.sendMessage.mockResolvedValue({ success: true });
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true); // Should continue despite service failures
      expect(result.data.contextAnalysis).toBeNull();
      expect(result.data.intentDetection).toBeNull();
    });

    test('should handle IDE service failure', async () => {
      const context = createMockContext();
      mockIDEService.sendMessage.mockRejectedValue(new Error('IDE connection failed'));
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('IDE connection failed');
    });

    test('should handle event bus failure gracefully', async () => {
      const context = createMockContext();
      mockIDEService.sendMessage.mockResolvedValue({ success: true });
      mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      expect(result.stepId).toMatch(/ide_send_message_enhanced_\d+_/);
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

    test('should detect missing projectId', () => {
      const context = createMockContext({ projectId: null });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Project ID is required');
    });

    test('should detect missing message', () => {
      const context = createMockContext({ message: null });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message is required');
    });

    test('should warn about unknown features', () => {
      const context = createMockContext({
        features: {
          unknownFeature: true,
          confidenceCheck: true
        }
      });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Unknown feature: unknownFeature');
    });
  });

  describe('Step Registry Integration', () => {
    test('should export execute function', () => {
      expect(typeof ideSendMessageEnhancedModule.execute).toBe('function');
    });

    test('should export config', () => {
      expect(ideSendMessageEnhancedModule.config).toBeDefined();
      expect(ideSendMessageEnhancedModule.config.name).toBe('IDESendMessageStepEnhanced');
    });

    test('should export IDESendMessageStepEnhanced class', () => {
      expect(ideSendMessageEnhancedModule.IDESendMessageStepEnhanced).toBeDefined();
      expect(typeof ideSendMessageEnhancedModule.IDESendMessageStepEnhanced).toBe('function');
    });
  });
}); 