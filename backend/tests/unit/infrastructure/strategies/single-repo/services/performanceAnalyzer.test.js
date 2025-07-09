const PerformanceAnalyzer = require('@/infrastructure/strategies/single-repo/services/performanceAnalyzer');
const { PERFORMANCE_FILES, PERFORMANCE_DEPENDENCIES } = require('@/infrastructure/strategies/single-repo/constants');

describe('PerformanceAnalyzer', () => {
  let performanceAnalyzer;
  let mockLogger;
  let mockFileUtils;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    mockFileUtils = {
      readJsonFile: jest.fn(),
      hasAnyFile: jest.fn()
    };

    performanceAnalyzer = new PerformanceAnalyzer(mockLogger, mockFileUtils);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with logger and fileUtils', () => {
      expect(performanceAnalyzer.logger).toBe(mockLogger);
      expect(performanceAnalyzer.fileUtils).toBe(mockFileUtils);
    });

    it('should handle undefined logger gracefully', () => {
      const analyzerWithoutLogger = new PerformanceAnalyzer(undefined, mockFileUtils);
      expect(analyzerWithoutLogger.logger).toBeUndefined();
      expect(analyzerWithoutLogger.fileUtils).toBe(mockFileUtils);
    });

    it('should handle undefined fileUtils gracefully', () => {
      const analyzerWithoutFileUtils = new PerformanceAnalyzer(mockLogger, undefined);
      expect(analyzerWithoutFileUtils.logger).toBe(mockLogger);
      expect(analyzerWithoutFileUtils.fileUtils).toBeUndefined();
    });
  });

  describe('analyzePerformance', () => {
    const projectPath = '/test/project/path';

    it('should analyze performance successfully with all features detected', async () => {
      const mockPackageJson = {
        dependencies: {
          'winston': '^3.0.0',
          'redis': '^4.0.0',
          'compression': '^1.7.0'
        },
        devDependencies: {
          'express-status-monitor': '^1.3.0'
        }
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile.mockResolvedValue(true);

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result).toEqual({
        hasPerformanceConfig: true,
        hasMonitoring: true,
        hasCaching: true,
        hasOptimization: true
      });

      expect(mockFileUtils.readJsonFile).toHaveBeenCalledWith(
        expect.stringContaining('package.json')
      );
      expect(mockFileUtils.hasAnyFile).toHaveBeenCalledWith(projectPath, PERFORMANCE_FILES);
    });

    it('should analyze performance with no features detected', async () => {
      const mockPackageJson = {
        dependencies: {
          'express': '^4.0.0'
        },
        devDependencies: {}
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile.mockResolvedValue(false);

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: false,
        hasCaching: false,
        hasOptimization: false
      });
    });

    it('should handle package.json read errors gracefully', async () => {
      mockFileUtils.readJsonFile.mockRejectedValue(new Error('File not found'));
      mockFileUtils.hasAnyFile.mockResolvedValue(false);

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: false,
        hasCaching: false,
        hasOptimization: false
      });

      expect(mockFileUtils.readJsonFile).toHaveBeenCalled();
      expect(mockFileUtils.hasAnyFile).toHaveBeenCalled();
    });

    it('should handle null package.json gracefully', async () => {
      mockFileUtils.readJsonFile.mockResolvedValue(null);
      mockFileUtils.hasAnyFile.mockResolvedValue(false);

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: false,
        hasCaching: false,
        hasOptimization: false
      });
    });

    it('should handle package.json without dependencies', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0'
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile.mockResolvedValue(false);

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: false,
        hasCaching: false,
        hasOptimization: false
      });
    });

    it('should handle package.json with only dependencies', async () => {
      const mockPackageJson = {
        dependencies: {
          'winston': '^3.0.0'
        }
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile.mockResolvedValue(false);

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: true,
        hasCaching: false,
        hasOptimization: false
      });
    });

    it('should handle package.json with only devDependencies', async () => {
      const mockPackageJson = {
        devDependencies: {
          'redis': '^4.0.0'
        }
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile.mockResolvedValue(false);

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: false,
        hasCaching: true,
        hasOptimization: false
      });
    });

    it('should handle monitoring dependencies detection', async () => {
      const mockPackageJson = {
        dependencies: {
          'winston': '^3.0.0',
          'morgan': '^1.10.0'
        }
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile.mockResolvedValue(false);

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result.hasMonitoring).toBe(true);
    });

    it('should handle caching dependencies detection', async () => {
      const mockPackageJson = {
        dependencies: {
          'redis': '^4.0.0',
          'memcached': '^2.2.2'
        }
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile.mockResolvedValue(false);

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result.hasCaching).toBe(true);
    });

    it('should handle optimization dependencies detection', async () => {
      const mockPackageJson = {
        dependencies: {
          'compression': '^1.7.0',
          'express-static-gzip': '^2.1.0'
        }
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile.mockResolvedValue(false);

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result.hasOptimization).toBe(true);
    });

    it('should handle performance config files detection', async () => {
      const mockPackageJson = {
        dependencies: {}
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile.mockResolvedValue(true);

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result.hasPerformanceConfig).toBe(true);
    });

    it('should handle undefined projectPath gracefully', async () => {
      const result = await performanceAnalyzer.analyzePerformance(undefined);

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: false,
        hasCaching: false,
        hasOptimization: false
      });
    });

    it('should handle null projectPath gracefully', async () => {
      const result = await performanceAnalyzer.analyzePerformance(null);

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: false,
        hasCaching: false,
        hasOptimization: false
      });
    });

    it('should handle empty projectPath gracefully', async () => {
      const result = await performanceAnalyzer.analyzePerformance('');

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: false,
        hasCaching: false,
        hasOptimization: false
      });
    });

    it('should handle general errors and return empty object', async () => {
      // Mock both methods to throw errors to trigger the main catch block
      mockFileUtils.readJsonFile.mockRejectedValue(new Error('Unexpected error'));
      mockFileUtils.hasAnyFile.mockRejectedValue(new Error('File system error'));

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: false,
        hasCaching: false,
        hasOptimization: false
      });
    });

    it('should handle fileUtils.hasAnyFile errors gracefully', async () => {
      const mockPackageJson = {
        dependencies: {}
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile.mockRejectedValue(new Error('File system error'));

      const result = await performanceAnalyzer.analyzePerformance(projectPath);

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: false,
        hasCaching: false,
        hasOptimization: false
      });
    });

    it('should handle undefined fileUtils gracefully', async () => {
      const analyzerWithoutFileUtils = new PerformanceAnalyzer(mockLogger, undefined);

      const result = await analyzerWithoutFileUtils.analyzePerformance(projectPath);

      expect(result).toEqual({
        hasPerformanceConfig: false,
        hasMonitoring: false,
        hasCaching: false,
        hasOptimization: false
      });
    });

    it('should handle undefined logger gracefully', async () => {
      const analyzerWithoutLogger = new PerformanceAnalyzer(undefined, mockFileUtils);
      mockFileUtils.readJsonFile.mockRejectedValue(new Error('Test error'));

      const result = await analyzerWithoutLogger.analyzePerformance(projectPath);

      expect(result).toEqual({
        hasPerformanceConfig: undefined,
        hasMonitoring: false,
        hasCaching: false,
        hasOptimization: false
      });
      // Should not throw error when logger is undefined
    });
  });

  describe('hasAnyDependency', () => {
    it('should return true when dependency exists', () => {
      const dependencies = {
        'winston': '^3.0.0',
        'express': '^4.0.0'
      };
      const targetDeps = ['winston', 'morgan'];

      const result = performanceAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(true);
    });

    it('should return false when no dependency exists', () => {
      const dependencies = {
        'express': '^4.0.0',
        'cors': '^2.8.5'
      };
      const targetDeps = ['winston', 'morgan'];

      const result = performanceAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should return false for empty dependencies', () => {
      const dependencies = {};
      const targetDeps = ['winston', 'morgan'];

      const result = performanceAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should return false for empty target dependencies', () => {
      const dependencies = {
        'winston': '^3.0.0'
      };
      const targetDeps = [];

      const result = performanceAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should return false for undefined dependencies', () => {
      const targetDeps = ['winston', 'morgan'];

      const result = performanceAnalyzer.hasAnyDependency(undefined, targetDeps);

      expect(result).toBe(false);
    });

    it('should return false for null dependencies', () => {
      const targetDeps = ['winston', 'morgan'];

      const result = performanceAnalyzer.hasAnyDependency(null, targetDeps);

      expect(result).toBe(false);
    });

    it('should return false for undefined target dependencies', () => {
      const dependencies = {
        'winston': '^3.0.0'
      };

      const result = performanceAnalyzer.hasAnyDependency(dependencies, undefined);

      expect(result).toBe(false);
    });

    it('should return false for null target dependencies', () => {
      const dependencies = {
        'winston': '^3.0.0'
      };

      const result = performanceAnalyzer.hasAnyDependency(dependencies, null);

      expect(result).toBe(false);
    });

    it('should handle dependencies with falsy values', () => {
      const dependencies = {
        'winston': false,
        'morgan': null,
        'express': undefined,
        'redis': 0
      };
      const targetDeps = ['winston', 'morgan', 'express', 'redis'];

      const result = performanceAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should handle dependencies with truthy values', () => {
      const dependencies = {
        'winston': '^3.0.0',
        'morgan': '^1.10.0',
        'express': '^4.0.0'
      };
      const targetDeps = ['winston', 'morgan', 'express'];

      const result = performanceAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(true);
    });

    it('should handle case-sensitive dependency matching', () => {
      const dependencies = {
        'Winston': '^3.0.0',
        'MORGAN': '^1.10.0'
      };
      const targetDeps = ['winston', 'morgan'];

      const result = performanceAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should handle partial dependency name matching', () => {
      const dependencies = {
        'winston-transport': '^3.0.0',
        'morgan-json': '^1.10.0'
      };
      const targetDeps = ['winston', 'morgan'];

      const result = performanceAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });
  });

  describe('integration with constants', () => {
    it('should use PERFORMANCE_DEPENDENCIES from constants', () => {
      expect(PERFORMANCE_DEPENDENCIES).toBeDefined();
      expect(PERFORMANCE_DEPENDENCIES.monitoring).toBeDefined();
      expect(PERFORMANCE_DEPENDENCIES.caching).toBeDefined();
      expect(PERFORMANCE_DEPENDENCIES.optimization).toBeDefined();
      expect(Array.isArray(PERFORMANCE_DEPENDENCIES.monitoring)).toBe(true);
      expect(Array.isArray(PERFORMANCE_DEPENDENCIES.caching)).toBe(true);
      expect(Array.isArray(PERFORMANCE_DEPENDENCIES.optimization)).toBe(true);
    });

    it('should use PERFORMANCE_FILES from constants', () => {
      expect(PERFORMANCE_FILES).toBeDefined();
      expect(Array.isArray(PERFORMANCE_FILES)).toBe(true);
    });
  });
}); 