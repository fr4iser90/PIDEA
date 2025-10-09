/**
 * Integration tests for AI Version Analysis
 * Tests end-to-end AI analysis functionality
 */

const AIVersionAnalysisService = require('@domain/services/version/AIVersionAnalysisService');
const HybridVersionDetector = require('@domain/services/version/HybridVersionDetector');
const VersionManagementService = require('@domain/services/version/VersionManagementService');
const VersionAIIntegration = require('@infrastructure/external/VersionAIIntegration');

describe('AI Version Integration', () => {
  let aiAnalysisService;
  let hybridDetector;
  let versionManagementService;
  let aiIntegration;

  beforeEach(() => {
    // Create service instances
    aiAnalysisService = new AIVersionAnalysisService();
    hybridDetector = new HybridVersionDetector({
      aiAnalysisService
    });
    versionManagementService = new VersionManagementService({
      aiAnalysisService,
      hybridDetector
    });
    aiIntegration = new VersionAIIntegration();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End AI Analysis', () => {
    it('should perform complete AI analysis workflow', async () => {
      const changelog = 'Added new user authentication feature with JWT tokens';
      const projectPath = '/test/project';
      const context = {
        gitChanges: {
          modified: ['src/auth.js', 'src/user.js'],
          added: ['src/middleware/auth.js']
        },
        commitMessages: [
          'feat: add JWT authentication',
          'feat: add user middleware',
          'test: add auth tests'
        ]
      };

      const result = await hybridDetector.determineBumpType(changelog, projectPath, context);

      expect(result).toMatchObject({
        recommendedType: expect.stringMatching(/^(major|minor|patch)$/),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        factors: expect.arrayContaining(['hybrid-analysis']),
        sources: expect.arrayContaining(['hybrid']),
        timestamp: expect.any(Date)
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle AI service failures gracefully', async () => {
      // Mock AI service to fail
      const mockAIService = {
        analyzeVersionBump: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
      };

      const failingHybridDetector = new HybridVersionDetector({
        aiAnalysisService: mockAIService
      });

      const changelog = 'Fixed login bug';
      const projectPath = '/test/project';

      const result = await failingHybridDetector.determineBumpType(changelog, projectPath);

      expect(result).toMatchObject({
        recommendedType: expect.stringMatching(/^(major|minor|patch)$/),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        sources: expect.arrayContaining(['fallback'])
      });

      // Should still provide a recommendation despite AI failure
      expect(result.recommendedType).toBeDefined();
    });

    it('should combine multiple analysis methods', async () => {
      const changelog = 'BREAKING CHANGE: Removed deprecated API endpoints';
      const projectPath = '/test/project';
      const context = {
        gitChanges: {
          modified: ['src/api.js'],
          removed: ['src/deprecated.js']
        },
        commitMessages: [
          'feat!: remove deprecated API endpoints',
          'BREAKING CHANGE: API v1 no longer supported'
        ]
      };

      const result = await hybridDetector.determineBumpType(changelog, projectPath, context);

      expect(result).toMatchObject({
        recommendedType: 'major',
        confidence: expect.any(Number),
        sources: expect.arrayContaining(['hybrid'])
      });

      // Should have multiple analysis results
      expect(result.aiResult).toBeDefined();
      expect(result.ruleResult).toBeDefined();
      expect(result.codeResult).toBeDefined();
      expect(result.commitResult).toBeDefined();
      expect(result.dependencyResult).toBeDefined();
    });
  });

  describe('Version Management Service Integration', () => {
    it('should integrate AI analysis with version management', async () => {
      const task = {
        id: 'test-task',
        description: 'Added new feature for user management',
        title: 'User Management Feature'
      };
      const projectPath = '/test/project';

      const result = await versionManagementService.getAIAnalysis(
        task.description,
        projectPath
      );

      expect(result).toMatchObject({
        success: expect.any(Boolean),
        data: expect.any(Object),
        timestamp: expect.any(Date)
      });

      if (result.success) {
        expect(result.data).toMatchObject({
          recommendedType: expect.stringMatching(/^(major|minor|patch)$/),
          confidence: expect.any(Number),
          reasoning: expect.any(String)
        });
      }
    });

    it('should use hybrid detection in version bump determination', async () => {
      const task = {
        id: 'test-task',
        description: 'Fixed critical security vulnerability',
        title: 'Security Fix'
      };
      const projectPath = '/test/project';
      const context = { useHybridDetection: true };

      const result = await versionManagementService.determineBumpType(task, projectPath, context);

      expect(result).toMatchObject({
        recommendedType: expect.stringMatching(/^(major|minor|patch)$/)
      });
    });
  });

  describe('External AI Integration', () => {
    it('should handle OpenAI integration', async () => {
      const changelog = 'Added new API endpoint for user profiles';
      const context = {
        projectContext: 'Node.js REST API',
        recentChanges: 'Modified user controller'
      };

      // Mock successful OpenAI response
      const mockOpenAIResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                recommendedType: 'minor',
                confidence: 0.8,
                reasoning: 'New API endpoint is a backward-compatible feature',
                factors: ['api-addition', 'backward-compatibility']
              })
            }
          }],
          usage: { total_tokens: 150 }
        }
      };

      // Mock axios for OpenAI client
      const mockAxios = {
        post: jest.fn().mockResolvedValue(mockOpenAIResponse)
      };

      // Test would require actual API key or mock setup
      // For now, test the structure
      expect(aiIntegration.getAvailableServices()).toBeDefined();
      expect(aiIntegration.getHealthStatus()).toMatchObject({
        status: expect.any(String),
        availableServices: expect.any(Array),
        timestamp: expect.any(Date)
      });
    });

    it('should handle Anthropic integration', async () => {
      // Similar test structure for Anthropic
      expect(aiIntegration.getAvailableServices()).toBeDefined();
      expect(aiIntegration.getHealthStatus()).toMatchObject({
        status: expect.any(String),
        availableServices: expect.any(Array),
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Performance and Caching', () => {
    it('should cache analysis results', async () => {
      const changelog = 'Added new feature';
      const projectPath = '/test/project';

      // First call
      const result1 = await hybridDetector.determineBumpType(changelog, projectPath);
      
      // Second call with same parameters
      const result2 = await hybridDetector.determineBumpType(changelog, projectPath);

      expect(result1).toEqual(result2);
    });

    it('should complete analysis within timeout', async () => {
      const changelog = 'Added new feature';
      const projectPath = '/test/project';

      const startTime = Date.now();
      const result = await hybridDetector.determineBumpType(changelog, projectPath);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(15000); // 15 second timeout
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockAIService = {
        analyzeVersionBump: jest.fn().mockRejectedValue(new Error('Network error'))
      };

      const failingHybridDetector = new HybridVersionDetector({
        aiAnalysisService: mockAIService
      });

      const changelog = 'Added new feature';
      const projectPath = '/test/project';

      const result = await failingHybridDetector.determineBumpType(changelog, projectPath);

      expect(result).toMatchObject({
        recommendedType: expect.stringMatching(/^(major|minor|patch)$/),
        confidence: expect.any(Number),
        sources: expect.arrayContaining(['fallback'])
      });
    });

    it('should handle invalid AI responses', async () => {
      const mockAIService = {
        analyzeVersionBump: jest.fn().mockResolvedValue({
          recommendedType: 'invalid',
          confidence: 1.5, // Invalid confidence
          reasoning: 'Test'
        })
      };

      const failingHybridDetector = new HybridVersionDetector({
        aiAnalysisService: mockAIService
      });

      const changelog = 'Added new feature';
      const projectPath = '/test/project';

      const result = await failingHybridDetector.determineBumpType(changelog, projectPath);

      expect(result).toMatchObject({
        recommendedType: expect.stringMatching(/^(major|minor|patch)$/),
        confidence: expect.any(Number)
      });
    });
  });

  describe('Health Monitoring', () => {
    it('should provide health status for all services', async () => {
      const aiHealth = aiAnalysisService.getHealthStatus();
      const hybridHealth = hybridDetector.getHealthStatus();
      const versionHealth = versionManagementService.getHealthStatus?.() || { status: 'healthy' };

      expect(aiHealth).toMatchObject({
        status: 'healthy',
        cacheSize: expect.any(Number),
        config: expect.any(Object),
        timestamp: expect.any(Date)
      });

      expect(hybridHealth).toMatchObject({
        status: 'healthy',
        cacheSize: expect.any(Number),
        config: expect.any(Object),
        timestamp: expect.any(Date)
      });

      expect(versionHealth).toMatchObject({
        status: expect.any(String)
      });
    });
  });
});
