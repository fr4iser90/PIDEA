/**
 * Tests for Analyze Context Step
 */

const { config, execute } = require('../../../../domain/steps/categories/ai/analyze_context_step');

describe('Analyze Context Step', () => {
  let mockContext;
  let mockOptions;

  beforeEach(() => {
    mockContext = {
      projectPath: '/test/project',
      startTime: Date.now()
    };
    mockOptions = {
      contextWindow: 8000,
      includeCodebase: true,
      analysisDepth: 'medium'
    };
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      expect(config.name).toBe('analyze_context');
      expect(config.version).toBe('1.0.0');
      expect(config.category).toBe('ai');
      expect(config.framework).toBe('AI Framework');
      expect(config.settings.contextWindow).toBe(8000);
      expect(config.settings.includeCodebase).toBe(true);
    });
  });

  describe('Execution', () => {
    test('should execute successfully with valid context', async () => {
      const result = await execute(mockContext, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.projectPath).toBe('/test/project');
      expect(result.data.analysis).toBeDefined();
      expect(result.data.analysis.project).toBeDefined();
      expect(result.data.analysis.codebase).toBeDefined();
      expect(result.data.analysis.environment).toBeDefined();
      expect(result.data.analysis.requirements).toBeDefined();
      expect(result.data.analysis.insights).toBeDefined();
    });

    test('should handle missing project path', async () => {
      const contextWithoutPath = { startTime: Date.now() };
      const result = await execute(contextWithoutPath, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.projectPath).toBe(process.cwd());
    });

    test('should respect includeCodebase setting', async () => {
      const optionsWithoutCodebase = { includeCodebase: false };
      const result = await execute(mockContext, optionsWithoutCodebase);
      
      expect(result.success).toBe(true);
      expect(result.data.includeCodebase).toBe(false);
    });

    test('should return metadata', async () => {
      const result = await execute(mockContext, mockOptions);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.contextWindow).toBe(8000);
      expect(result.metadata.analysisDepth).toBe('medium');
      expect(result.metadata.insightsGenerated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Analysis Results', () => {
    test('should analyze project context', async () => {
      const result = await execute(mockContext, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.analysis.project).toBeDefined();
      expect(result.data.analysis.project.name).toBeDefined();
      expect(result.data.analysis.project.path).toBeDefined();
      expect(result.data.analysis.project.type).toBeDefined();
    });

    test('should analyze environment context', async () => {
      const result = await execute(mockContext, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.analysis.environment).toBeDefined();
      expect(result.data.analysis.environment.nodeVersion).toBeDefined();
      expect(result.data.analysis.environment.platform).toBeDefined();
      expect(result.data.analysis.environment.architecture).toBeDefined();
    });

    test('should analyze requirements context', async () => {
      const result = await execute(mockContext, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.analysis.requirements).toBeDefined();
      expect(Array.isArray(result.data.analysis.requirements.dependencies)).toBe(true);
      expect(Array.isArray(result.data.analysis.requirements.devDependencies)).toBe(true);
    });

    test('should generate insights', async () => {
      const result = await execute(mockContext, mockOptions);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.analysis.insights)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle execution errors gracefully', async () => {
      // Mock process.cwd to throw an error
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = await execute(mockContext, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
      
      // Restore original function
      process.cwd = originalCwd;
    });
  });

  describe('Settings', () => {
    test('should respect context window setting', async () => {
      const customOptions = { contextWindow: 4000 };
      const result = await execute(mockContext, customOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.contextWindow).toBe(4000);
    });

    test('should respect analysis depth setting', async () => {
      const deepOptions = { analysisDepth: 'deep' };
      const result = await execute(mockContext, deepOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.analysisDepth).toBe('deep');
    });
  });
});
