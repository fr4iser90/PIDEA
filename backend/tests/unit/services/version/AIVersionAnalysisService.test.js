/**
 * Unit tests for AIVersionAnalysisService
 * Tests AI-powered version analysis functionality
 */

const AIVersionAnalysisService = require('@domain/services/version/AIVersionAnalysisService');
const AIService = require('@external/AIService');
const CursorIDEService = require('@domain/services/ide/CursorIDEService');

describe('AIVersionAnalysisService', () => {
  let aiAnalysisService;
  let mockAIService;
  let mockCursorIDEService;

  beforeEach(() => {
    // Mock AI service
    mockAIService = {
      sendPrompt: jest.fn()
    };

    // Mock Cursor IDE service
    mockCursorIDEService = {
      // Add any required methods
    };

    // Create service instance with mocks
    aiAnalysisService = new AIVersionAnalysisService({
      aiService: mockAIService,
      cursorIDEService: mockCursorIDEService
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeVersionBump', () => {
    it('should analyze version bump and return recommendation', async () => {
      // Mock AI response
      const mockAIResponse = {
        content: JSON.stringify({
          recommendedType: 'minor',
          confidence: 0.8,
          reasoning: 'Added new feature functionality',
          factors: ['feature-addition', 'backward-compatibility']
        })
      };

      mockAIService.sendPrompt.mockResolvedValue(mockAIResponse);

      const changelog = 'Added user authentication feature';
      const projectPath = '/test/project';
      const context = { test: true };

      const result = await aiAnalysisService.analyzeVersionBump(changelog, projectPath, context);

      expect(result).toMatchObject({
        recommendedType: 'minor',
        confidence: 0.8,
        reasoning: 'Added new feature functionality',
        factors: ['feature-addition', 'backward-compatibility'],
        source: 'ai'
      });

      expect(mockAIService.sendPrompt).toHaveBeenCalledWith(
        'versionAnalysis',
        expect.objectContaining({
          systemPrompt: expect.stringContaining('semantic versioning'),
          userPrompt: expect.stringContaining(changelog)
        }),
        expect.objectContaining({
          model: 'gpt-4',
          maxTokens: 1000,
          temperature: 0.3
        })
      );
    });

    it('should handle AI service failure gracefully', async () => {
      mockAIService.sendPrompt.mockRejectedValue(new Error('AI service unavailable'));

      const changelog = 'Added new feature';
      const projectPath = '/test/project';

      const result = await aiAnalysisService.analyzeVersionBump(changelog, projectPath);

      expect(result).toMatchObject({
        recommendedType: 'patch',
        confidence: 0.3,
        reasoning: 'Fallback analysis due to AI service unavailability',
        source: 'fallback',
        error: 'AI service unavailable'
      });
    });

    it('should handle invalid AI response gracefully', async () => {
      const mockAIResponse = {
        content: 'Invalid JSON response'
      };

      mockAIService.sendPrompt.mockResolvedValue(mockAIResponse);

      const changelog = 'Added new feature';
      const projectPath = '/test/project';

      const result = await aiAnalysisService.analyzeVersionBump(changelog, projectPath);

      expect(result).toMatchObject({
        recommendedType: 'patch',
        confidence: 0.3,
        reasoning: 'Fallback analysis due to AI service unavailability',
        source: 'fallback'
      });
    });

    it('should use cached result for identical requests', async () => {
      const mockAIResponse = {
        content: JSON.stringify({
          recommendedType: 'minor',
          confidence: 0.8,
          reasoning: 'Cached analysis',
          factors: ['cached']
        })
      };

      mockAIService.sendPrompt.mockResolvedValue(mockAIResponse);

      const changelog = 'Added new feature';
      const projectPath = '/test/project';
      const context = { test: true };

      // First call
      const result1 = await aiAnalysisService.analyzeVersionBump(changelog, projectPath, context);
      
      // Second call with same parameters
      const result2 = await aiAnalysisService.analyzeVersionBump(changelog, projectPath, context);

      expect(result1).toEqual(result2);
      expect(mockAIService.sendPrompt).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', () => {
      const healthStatus = aiAnalysisService.getHealthStatus();

      expect(healthStatus).toMatchObject({
        status: 'healthy',
        cacheSize: expect.any(Number),
        config: expect.objectContaining({
          maxRetries: expect.any(Number),
          timeout: expect.any(Number),
          cacheTimeout: expect.any(Number),
          confidenceThreshold: expect.any(Number)
        }),
        timestamp: expect.any(Date)
      });
    });
  });

  describe('prompt generation', () => {
    it('should generate proper analysis prompt', async () => {
      const mockAIResponse = {
        content: JSON.stringify({
          recommendedType: 'patch',
          confidence: 0.6,
          reasoning: 'Test reasoning',
          factors: ['test']
        })
      };

      mockAIService.sendPrompt.mockResolvedValue(mockAIResponse);

      const changelog = 'Fixed bug in authentication';
      const projectPath = '/test/project';
      const context = {
        projectContext: 'Node.js project',
        recentChanges: 'Modified auth.js'
      };

      await aiAnalysisService.analyzeVersionBump(changelog, projectPath, context);

      const callArgs = mockAIService.sendPrompt.mock.calls[0];
      const promptData = callArgs[1];

      expect(promptData.systemPrompt).toContain('semantic versioning');
      expect(promptData.systemPrompt).toContain('MAJOR');
      expect(promptData.systemPrompt).toContain('MINOR');
      expect(promptData.systemPrompt).toContain('PATCH');

      expect(promptData.userPrompt).toContain(changelog);
      expect(promptData.userPrompt).toContain('Node.js project');
      expect(promptData.userPrompt).toContain('Modified auth.js');
    });
  });

  describe('fallback analysis', () => {
    it('should provide appropriate fallback for breaking changes', async () => {
      mockAIService.sendPrompt.mockRejectedValue(new Error('Service down'));

      const changelog = 'Breaking change: Removed deprecated API';
      const projectPath = '/test/project';

      const result = await aiAnalysisService.analyzeVersionBump(changelog, projectPath);

      expect(result).toMatchObject({
        recommendedType: 'major',
        confidence: 0.4,
        reasoning: 'Fallback: Detected potential breaking changes',
        source: 'fallback'
      });
    });

    it('should provide appropriate fallback for new features', async () => {
      mockAIService.sendPrompt.mockRejectedValue(new Error('Service down'));

      const changelog = 'Added new user management feature';
      const projectPath = '/test/project';

      const result = await aiAnalysisService.analyzeVersionBump(changelog, projectPath);

      expect(result).toMatchObject({
        recommendedType: 'minor',
        confidence: 0.4,
        reasoning: 'Fallback: Detected potential new features',
        source: 'fallback'
      });
    });

    it('should provide patch fallback for bug fixes', async () => {
      mockAIService.sendPrompt.mockRejectedValue(new Error('Service down'));

      const changelog = 'Fixed login issue';
      const projectPath = '/test/project';

      const result = await aiAnalysisService.analyzeVersionBump(changelog, projectPath);

      expect(result).toMatchObject({
        recommendedType: 'patch',
        confidence: 0.3,
        reasoning: 'Fallback analysis due to AI service unavailability',
        source: 'fallback'
      });
    });
  });
});
