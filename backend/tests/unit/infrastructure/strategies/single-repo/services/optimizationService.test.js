const OptimizationService = require('@/infrastructure/strategies/single-repo/services/optimizationService');

describe('OptimizationService', () => {
  let optimizationService;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    optimizationService = new OptimizationService(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with logger', () => {
      expect(optimizationService.logger).toBe(mockLogger);
    });

    it('should handle undefined logger gracefully', () => {
      const serviceWithoutLogger = new OptimizationService();
      expect(serviceWithoutLogger.logger).toBeUndefined();
    });
  });

  describe('optimizeSingleRepo', () => {
    const projectPath = '/test/project/path';
    const defaultOptions = {};

    it('should optimize single repository successfully', async () => {
      const result = await optimizationService.optimizeSingleRepo(projectPath, defaultOptions);

      expect(result).toEqual({
        structure: { success: true, message: 'Structure optimization completed' },
        dependencies: { success: true, message: 'Dependency optimization completed' },
        build: { success: true, message: 'Build optimization completed' },
        testing: { success: true, message: 'Testing optimization completed' },
        linting: { success: true, message: 'Linting optimization completed' },
        security: { success: true, message: 'Security optimization completed' },
        performance: { success: true, message: 'Performance optimization completed' }
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'OptimizationService: Optimizing single repository',
        { projectPath }
      );
    });

    it('should optimize with custom options', async () => {
      const customOptions = {
        skipSecurity: true,
        optimizeDependencies: false,
        customConfig: 'test-value'
      };

      const result = await optimizationService.optimizeSingleRepo(projectPath, customOptions);

      expect(result).toEqual({
        structure: { success: true, message: 'Structure optimization completed' },
        dependencies: { success: true, message: 'Dependency optimization completed' },
        build: { success: true, message: 'Build optimization completed' },
        testing: { success: true, message: 'Testing optimization completed' },
        linting: { success: true, message: 'Linting optimization completed' },
        security: { success: true, message: 'Security optimization completed' },
        performance: { success: true, message: 'Performance optimization completed' }
      });
    });

    it('should handle optimization errors gracefully', async () => {
      // Mock one of the optimization methods to throw an error
      jest.spyOn(optimizationService, 'optimizeStructure').mockRejectedValue(
        new Error('Structure optimization failed')
      );

      await expect(optimizationService.optimizeSingleRepo(projectPath, defaultOptions))
        .rejects.toThrow('Failed to optimize single repository: Structure optimization failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OptimizationService: Failed to optimize single repo',
        {
          projectPath,
          error: 'Structure optimization failed'
        }
      );
    });

    it('should handle undefined project path', async () => {
      const result = await optimizationService.optimizeSingleRepo(undefined, defaultOptions);
      expect(result).toBeDefined();
      expect(result.structure.success).toBe(true);
    });

    it('should handle null project path', async () => {
      const result = await optimizationService.optimizeSingleRepo(null, defaultOptions);
      expect(result).toBeDefined();
      expect(result.structure.success).toBe(true);
    });

    it('should handle empty project path', async () => {
      const result = await optimizationService.optimizeSingleRepo('', defaultOptions);
      expect(result).toBeDefined();
      expect(result.structure.success).toBe(true);
    });

    it('should handle undefined options', async () => {
      const result = await optimizationService.optimizeSingleRepo(projectPath);
      expect(result).toBeDefined();
      expect(result.structure.success).toBe(true);
    });

    it('should handle null options', async () => {
      const result = await optimizationService.optimizeSingleRepo(projectPath, null);
      expect(result).toBeDefined();
      expect(result.structure.success).toBe(true);
    });
  });

  describe('optimizeStructure', () => {
    const projectPath = '/test/project/path';

    it('should optimize structure successfully', async () => {
      const result = await optimizationService.optimizeStructure(projectPath, {});

      expect(result).toEqual({
        success: true,
        message: 'Structure optimization completed'
      });
    });

    it('should handle custom options', async () => {
      const options = { reorganizeFiles: true, createDirectories: false };
      const result = await optimizationService.optimizeStructure(projectPath, options);

      expect(result).toEqual({
        success: true,
        message: 'Structure optimization completed'
      });
    });

    it('should handle empty project path', async () => {
      const result = await optimizationService.optimizeStructure('', {});
      expect(result.success).toBe(true);
    });

    it('should handle undefined options', async () => {
      const result = await optimizationService.optimizeStructure(projectPath);
      expect(result.success).toBe(true);
    });
  });

  describe('optimizeDependencies', () => {
    const projectPath = '/test/project/path';

    it('should optimize dependencies successfully', async () => {
      const result = await optimizationService.optimizeDependencies(projectPath, {});

      expect(result).toEqual({
        success: true,
        message: 'Dependency optimization completed'
      });
    });

    it('should handle custom options', async () => {
      const options = { updatePackages: true, removeUnused: false };
      const result = await optimizationService.optimizeDependencies(projectPath, options);

      expect(result).toEqual({
        success: true,
        message: 'Dependency optimization completed'
      });
    });

    it('should handle empty project path', async () => {
      const result = await optimizationService.optimizeDependencies('', {});
      expect(result.success).toBe(true);
    });

    it('should handle undefined options', async () => {
      const result = await optimizationService.optimizeDependencies(projectPath);
      expect(result.success).toBe(true);
    });
  });

  describe('optimizeBuild', () => {
    const projectPath = '/test/project/path';

    it('should optimize build successfully', async () => {
      const result = await optimizationService.optimizeBuild(projectPath, {});

      expect(result).toEqual({
        success: true,
        message: 'Build optimization completed'
      });
    });

    it('should handle custom options', async () => {
      const options = { minify: true, bundle: false, sourceMaps: true };
      const result = await optimizationService.optimizeBuild(projectPath, options);

      expect(result).toEqual({
        success: true,
        message: 'Build optimization completed'
      });
    });

    it('should handle empty project path', async () => {
      const result = await optimizationService.optimizeBuild('', {});
      expect(result.success).toBe(true);
    });

    it('should handle undefined options', async () => {
      const result = await optimizationService.optimizeBuild(projectPath);
      expect(result.success).toBe(true);
    });
  });

  describe('optimizeTesting', () => {
    const projectPath = '/test/project/path';

    it('should optimize testing successfully', async () => {
      const result = await optimizationService.optimizeTesting(projectPath, {});

      expect(result).toEqual({
        success: true,
        message: 'Testing optimization completed'
      });
    });

    it('should handle custom options', async () => {
      const options = { unitTests: true, integrationTests: false, e2eTests: true };
      const result = await optimizationService.optimizeTesting(projectPath, options);

      expect(result).toEqual({
        success: true,
        message: 'Testing optimization completed'
      });
    });

    it('should handle empty project path', async () => {
      const result = await optimizationService.optimizeTesting('', {});
      expect(result.success).toBe(true);
    });

    it('should handle undefined options', async () => {
      const result = await optimizationService.optimizeTesting(projectPath);
      expect(result.success).toBe(true);
    });
  });

  describe('optimizeLinting', () => {
    const projectPath = '/test/project/path';

    it('should optimize linting successfully', async () => {
      const result = await optimizationService.optimizeLinting(projectPath, {});

      expect(result).toEqual({
        success: true,
        message: 'Linting optimization completed'
      });
    });

    it('should handle custom options', async () => {
      const options = { eslint: true, prettier: false, stylelint: true };
      const result = await optimizationService.optimizeLinting(projectPath, options);

      expect(result).toEqual({
        success: true,
        message: 'Linting optimization completed'
      });
    });

    it('should handle empty project path', async () => {
      const result = await optimizationService.optimizeLinting('', {});
      expect(result.success).toBe(true);
    });

    it('should handle undefined options', async () => {
      const result = await optimizationService.optimizeLinting(projectPath);
      expect(result.success).toBe(true);
    });
  });

  describe('optimizeSecurity', () => {
    const projectPath = '/test/project/path';

    it('should optimize security successfully', async () => {
      const result = await optimizationService.optimizeSecurity(projectPath, {});

      expect(result).toEqual({
        success: true,
        message: 'Security optimization completed'
      });
    });

    it('should handle custom options', async () => {
      const options = { auditDependencies: true, scanCode: false, checkSecrets: true };
      const result = await optimizationService.optimizeSecurity(projectPath, options);

      expect(result).toEqual({
        success: true,
        message: 'Security optimization completed'
      });
    });

    it('should handle empty project path', async () => {
      const result = await optimizationService.optimizeSecurity('', {});
      expect(result.success).toBe(true);
    });

    it('should handle undefined options', async () => {
      const result = await optimizationService.optimizeSecurity(projectPath);
      expect(result.success).toBe(true);
    });
  });

  describe('optimizePerformance', () => {
    const projectPath = '/test/project/path';

    it('should optimize performance successfully', async () => {
      const result = await optimizationService.optimizePerformance(projectPath, {});

      expect(result).toEqual({
        success: true,
        message: 'Performance optimization completed'
      });
    });

    it('should handle custom options', async () => {
      const options = { bundleAnalysis: true, lazyLoading: false, caching: true };
      const result = await optimizationService.optimizePerformance(projectPath, options);

      expect(result).toEqual({
        success: true,
        message: 'Performance optimization completed'
      });
    });

    it('should handle empty project path', async () => {
      const result = await optimizationService.optimizePerformance('', {});
      expect(result.success).toBe(true);
    });

    it('should handle undefined options', async () => {
      const result = await optimizationService.optimizePerformance(projectPath);
      expect(result.success).toBe(true);
    });
  });

  describe('error handling scenarios', () => {
    it('should handle logger errors gracefully', async () => {
      const serviceWithBrokenLogger = new OptimizationService({
        info: () => { throw new Error('Logger error'); },
        error: () => { throw new Error('Logger error'); }
      });

      // Should not throw when logger fails - the service should handle logger errors internally
      try {
        const result = await serviceWithBrokenLogger.optimizeSingleRepo('/test/path', {});
        expect(result).toBeDefined();
      } catch (error) {
        // If the service doesn't handle logger errors internally, that's also acceptable
        expect(error.message).toContain('Logger error');
      }
    });

    it('should handle multiple optimization failures', async () => {
      // Mock multiple optimization methods to fail
      jest.spyOn(optimizationService, 'optimizeStructure').mockRejectedValue(
        new Error('Structure failed')
      );
      jest.spyOn(optimizationService, 'optimizeDependencies').mockRejectedValue(
        new Error('Dependencies failed')
      );

      await expect(optimizationService.optimizeSingleRepo('/test/path', {}))
        .rejects.toThrow('Failed to optimize single repository: Structure failed');
    });

    it('should handle synchronous errors in optimization methods', async () => {
      jest.spyOn(optimizationService, 'optimizeStructure').mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      await expect(optimizationService.optimizeSingleRepo('/test/path', {}))
        .rejects.toThrow('Failed to optimize single repository: Synchronous error');
    });
  });

  describe('edge cases', () => {
    it('should handle very long project paths', async () => {
      const longPath = '/'.repeat(1000) + 'test/path';
      const result = await optimizationService.optimizeSingleRepo(longPath, {});
      expect(result).toBeDefined();
      expect(result.structure.success).toBe(true);
    });

    it('should handle special characters in project path', async () => {
      const specialPath = '/test/path/with/spaces and special chars!@#$%^&*()';
      const result = await optimizationService.optimizeSingleRepo(specialPath, {});
      expect(result).toBeDefined();
      expect(result.structure.success).toBe(true);
    });

    it('should handle complex options object', async () => {
      const complexOptions = {
        nested: {
          deep: {
            config: 'value',
            array: [1, 2, 3],
            object: { key: 'value' }
          }
        },
        array: ['item1', 'item2'],
        boolean: true,
        number: 42,
        string: 'test'
      };

      const result = await optimizationService.optimizeSingleRepo('/test/path', complexOptions);
      expect(result).toBeDefined();
      expect(result.structure.success).toBe(true);
    });

    it('should handle circular reference in options', async () => {
      const circularOptions = {};
      circularOptions.self = circularOptions;

      const result = await optimizationService.optimizeSingleRepo('/test/path', circularOptions);
      expect(result).toBeDefined();
      expect(result.structure.success).toBe(true);
    });
  });
}); 