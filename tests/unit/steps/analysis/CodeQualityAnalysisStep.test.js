/**
 * CodeQualityAnalysisStep Unit Tests
 */
const CodeQualityAnalysisStep = require('../../../../backend/domain/workflows/steps/analysis/CodeQualityAnalysisStep');

describe('CodeQualityAnalysisStep', () => {
  let step;
  let mockContext;

  beforeEach(() => {
    step = new CodeQualityAnalysisStep({
      linting: true,
      complexity: true,
      maintainability: true,
      testCoverage: true,
      codeDuplication: true,
      codeStyle: true,
      documentation: true,
      performance: true
    });

    mockContext = {
      get: jest.fn(),
      set: jest.fn()
    };
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const defaultStep = new CodeQualityAnalysisStep();
      expect(defaultStep.options.linting).toBe(true);
      expect(defaultStep.options.complexity).toBe(true);
      expect(defaultStep.options.maintainability).toBe(true);
      expect(defaultStep.options.testCoverage).toBe(true);
      expect(defaultStep.options.codeDuplication).toBe(true);
      expect(defaultStep.options.codeStyle).toBe(true);
      expect(defaultStep.options.documentation).toBe(true);
      expect(defaultStep.options.performance).toBe(true);
    });

    it('should create an instance with custom options', () => {
      const customStep = new CodeQualityAnalysisStep({
        linting: false,
        complexity: false,
        testCoverage: false
      });
      expect(customStep.options.linting).toBe(false);
      expect(customStep.options.complexity).toBe(false);
      expect(customStep.options.testCoverage).toBe(false);
      expect(customStep.options.maintainability).toBe(true); // default
    });
  });

  describe('executeStep', () => {
    it('should throw error when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Project path not found in context'
      );
    });

    it('should throw error when code quality analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // codeQualityAnalyzer

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Code quality analyzer not found in context'
      );
    });

    it('should execute successfully with valid context for single package', async () => {
      const mockCodeQualityAnalyzer = {
        analyzeCodeQuality: jest.fn().mockResolvedValue({
          lintingIssues: [],
          complexityIssues: [],
          maintainabilityIssues: [],
          testCoverageIssues: [],
          duplicationIssues: [],
          styleIssues: [],
          documentationIssues: [],
          performanceIssues: [],
          realMetrics: {
            qualityScore: 85,
            maintainabilityIndex: 75,
            cyclomaticComplexity: 2.5,
            testCoverage: 80,
            codeDuplication: 5
          }
        })
      };

      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(mockCodeQualityAnalyzer) // codeQualityAnalyzer
        .mockReturnValueOnce(console); // logger

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(mockCodeQualityAnalyzer.analyzeCodeQuality).toHaveBeenCalled();
    });

    it('should execute successfully for monorepo', async () => {
      const mockCodeQualityAnalyzer = {
        analyzeCodeQuality: jest.fn().mockResolvedValue({
          lintingIssues: [],
          complexityIssues: [],
          maintainabilityIssues: [],
          testCoverageIssues: [],
          duplicationIssues: [],
          styleIssues: [],
          documentationIssues: [],
          performanceIssues: [],
          realMetrics: {
            qualityScore: 85,
            maintainabilityIndex: 75,
            cyclomaticComplexity: 2.5,
            testCoverage: 80,
            codeDuplication: 5
          }
        })
      };

      const mockFileSystemService = {
        getProjectInfo: jest.fn().mockResolvedValue({
          path: '/test/path',
          name: 'test-project',
          type: 'monorepo'
        })
      };

      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(mockCodeQualityAnalyzer) // codeQualityAnalyzer
        .mockReturnValueOnce(console) // logger
        .mockReturnValueOnce(mockFileSystemService); // fileSystemService

      // Mock findPackages method
      step.findPackages = jest.fn().mockResolvedValue([
        { name: 'package1', path: '/test/path/packages/package1' },
        { name: 'package2', path: '/test/path/packages/package2' }
      ]);

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.analysis.isMonorepo).toBe(true);
      expect(result.analysis.packages).toBeDefined();
      expect(Object.keys(result.analysis.packages)).toHaveLength(2);
    });
  });

  describe('validate', () => {
    it('should return valid result with proper context', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce({}); // codeQualityAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid result when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project path is required for code quality analysis');
    });

    it('should return invalid result when code quality analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // codeQualityAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Code quality analyzer is required for code quality analysis');
    });
  });

  describe('generateMetrics', () => {
    it('should generate metrics from analysis result', () => {
      const analysis = {
        issues: [
          { type: 'linting', severity: 'error' },
          { type: 'complexity', severity: 'warning' },
          { type: 'maintainability', severity: 'info' }
        ],
        realMetrics: {
          qualityScore: 85,
          maintainabilityIndex: 75,
          cyclomaticComplexity: 2.5,
          testCoverage: 80,
          codeDuplication: 5
        }
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.qualityScore).toBe(85);
      expect(metrics.maintainabilityIndex).toBe(75);
      expect(metrics.cyclomaticComplexity).toBe(2.5);
      expect(metrics.testCoverage).toBe(80);
      expect(metrics.codeDuplication).toBe(5);
      expect(metrics.totalIssues).toBe(3);
    });

    it('should handle monorepo metrics', () => {
      const analysis = {
        isMonorepo: true,
        packages: {
          'package1': {
            analysis: {
              realMetrics: { qualityScore: 80, testCoverage: 75 }
            }
          },
          'package2': {
            analysis: {
              realMetrics: { qualityScore: 90, testCoverage: 85 }
            }
          }
        }
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.packagesCount).toBe(2);
      expect(metrics.averageQualityScore).toBe(85);
      expect(metrics.averageTestCoverage).toBe(80);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations from analysis result', () => {
      const analysis = {
        issues: [
          { type: 'linting', severity: 'error', message: 'Unused variable' },
          { type: 'complexity', severity: 'warning', message: 'High cyclomatic complexity' },
          { type: 'testCoverage', severity: 'warning', message: 'Low test coverage' }
        ],
        realMetrics: {
          qualityScore: 65,
          testCoverage: 45
        }
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('type');
      expect(recommendations[0]).toHaveProperty('severity');
      expect(recommendations[0]).toHaveProperty('message');
    });

    it('should return empty recommendations when no issues found', () => {
      const analysis = {
        issues: [],
        realMetrics: {
          qualityScore: 95,
          testCoverage: 90
        }
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('clone', () => {
    it('should create a clone with same options', () => {
      const clonedStep = step.clone();

      expect(clonedStep).toBeInstanceOf(CodeQualityAnalysisStep);
      expect(clonedStep.options).toEqual(step.options);
      expect(clonedStep).not.toBe(step);
    });
  });

  describe('rollback', () => {
    it('should perform rollback operation', async () => {
      const mockLogger = { info: jest.fn() };
      mockContext.get.mockReturnValue(mockLogger);

      await step.rollback(mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'CodeQualityAnalysisStep: Rolling back code quality analysis'
      );
    });
  });

  describe('getMetadata', () => {
    it('should return step metadata', () => {
      const metadata = step.getMetadata();

      expect(metadata.name).toBe('CodeQualityAnalysisStep');
      expect(metadata.description).toBe('Performs code quality analysis');
      expect(metadata.category).toBe('analysis');
      expect(metadata.options).toEqual(step.options);
    });
  });
}); 