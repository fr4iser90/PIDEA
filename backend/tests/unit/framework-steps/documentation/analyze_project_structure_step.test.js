/**
 * Tests for Analyze Project Structure Step
 */

const { config, execute } = require('../../../../domain/steps/categories/documentation/analyze_project_structure_step');
const path = require('path');
const fs = require('fs').promises;

describe('Analyze Project Structure Step', () => {
  let mockContext;
  let mockOptions;

  beforeEach(() => {
    mockContext = {
      projectPath: '/test/project',
      startTime: Date.now()
    };
    mockOptions = {
      scanDepth: 3,
      includeHidden: false
    };
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      expect(config.name).toBe('analyze_project_structure');
      expect(config.version).toBe('1.0.0');
      expect(config.category).toBe('documentation');
      expect(config.framework).toBe('Documentation Framework');
      expect(config.settings.scanDepth).toBe(3);
      expect(config.settings.includeHidden).toBe(false);
    });
  });

  describe('Execution', () => {
    test('should execute successfully with valid context', async () => {
      const result = await execute(mockContext, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.projectPath).toBe('/test/project');
      expect(result.data.analysis).toBeDefined();
      expect(result.data.analysis.structure).toBeDefined();
      expect(result.data.analysis.documentationNeeds).toBeDefined();
      expect(result.data.analysis.recommendations).toBeDefined();
    });

    test('should handle missing project path', async () => {
      const contextWithoutPath = { startTime: Date.now() };
      const result = await execute(contextWithoutPath, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.projectPath).toBe(process.cwd());
    });

    test('should handle invalid options', async () => {
      const invalidOptions = {
        scanDepth: -1,
        includeHidden: 'invalid'
      };
      
      const result = await execute(mockContext, invalidOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.scanDepth).toBe(-1);
      expect(result.data.includeHidden).toBe('invalid');
    });

    test('should return metadata', async () => {
      const result = await execute(mockContext, mockOptions);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.filesAnalyzed).toBeGreaterThanOrEqual(0);
      expect(result.metadata.documentationNeeds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle execution errors gracefully', async () => {
      // Mock fs.readdir to throw an error
      const originalReaddir = fs.readdir;
      fs.readdir = jest.fn().mockRejectedValue(new Error('Permission denied'));
      
      const result = await execute(mockContext, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
      
      // Restore original function
      fs.readdir = originalReaddir;
    });
  });

  describe('Analysis Results', () => {
    test('should identify documentation needs', async () => {
      const result = await execute(mockContext, mockOptions);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.analysis.documentationNeeds)).toBe(true);
    });

    test('should generate recommendations', async () => {
      const result = await execute(mockContext, mockOptions);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.analysis.recommendations)).toBe(true);
    });

    test('should analyze project structure', async () => {
      const result = await execute(mockContext, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.analysis.structure).toBeDefined();
      expect(result.data.analysis.structure.type).toBe('directory');
      expect(result.data.analysis.structure.name).toBeDefined();
    });
  });

  describe('Settings', () => {
    test('should respect scan depth setting', async () => {
      const shallowOptions = { scanDepth: 1 };
      const result = await execute(mockContext, shallowOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.scanDepth).toBe(1);
    });

    test('should respect include hidden setting', async () => {
      const includeHiddenOptions = { includeHidden: true };
      const result = await execute(mockContext, includeHiddenOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.includeHidden).toBe(true);
    });
  });
});
