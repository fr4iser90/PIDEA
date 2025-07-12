/**
 * ArchitectureAnalysisStep Unit Tests
 */
const ArchitectureAnalysisStep = require('../../../../backend/domain/workflows/steps/analysis/ArchitectureAnalysisStep');

describe('ArchitectureAnalysisStep', () => {
  let step;
  let mockContext;

  beforeEach(() => {
    step = new ArchitectureAnalysisStep({
      detectPatterns: true,
      analyzeDependencies: true,
      complexityAnalysis: true
    });

    mockContext = {
      get: jest.fn(),
      set: jest.fn()
    };
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const defaultStep = new ArchitectureAnalysisStep();
      expect(defaultStep.options.detectPatterns).toBe(true);
      expect(defaultStep.options.analyzeDependencies).toBe(true);
      expect(defaultStep.options.complexityAnalysis).toBe(true);
    });

    it('should create an instance with custom options', () => {
      const customStep = new ArchitectureAnalysisStep({
        detectPatterns: false,
        analyzeDependencies: false
      });
      expect(customStep.options.detectPatterns).toBe(false);
      expect(customStep.options.analyzeDependencies).toBe(false);
    });
  });

  describe('executeStep', () => {
    it('should throw error when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Project path not found in context'
      );
    });

    it('should throw error when architecture analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // architectureAnalyzer

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Architecture analyzer not found in context'
      );
    });

    it('should execute successfully with valid context', async () => {
      const mockArchitectureAnalyzer = {
        analyze: jest.fn().mockResolvedValue({
          detectedPatterns: ['MVC', 'Repository'],
          structure: { layers: ['presentation', 'business', 'data'] },
          coupling: { instability: { 'module1': 0.5 } },
          cohesion: { 'module1': 0.8 },
          violations: [],
          recommendations: ['Use dependency injection']
        })
      };

      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(mockArchitectureAnalyzer) // architectureAnalyzer
        .mockReturnValueOnce(console); // logger

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(mockArchitectureAnalyzer.analyze).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should return valid result with proper context', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce({}); // architectureAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid result when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project path is required for architecture analysis');
    });

    it('should return invalid result when architecture analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // architectureAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Architecture analyzer is required for architecture analysis');
    });
  });

  describe('generateMetrics', () => {
    it('should generate metrics from analysis result', () => {
      const analysis = {
        patterns: ['MVC', 'Repository'],
        layers: ['presentation', 'business', 'data'],
        modules: ['module1', 'module2'],
        antiPatterns: [],
        designPrinciples: ['SOLID', 'DRY']
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.patternsCount).toBe(2);
      expect(metrics.layersCount).toBe(3);
      expect(metrics.modulesCount).toBe(2);
      expect(metrics.antiPatternsCount).toBe(0);
      expect(metrics.designPrinciplesCount).toBe(2);
    });

    it('should handle monorepo metrics', () => {
      const analysis = {
        isMonorepo: true,
        packages: {
          'package1': {},
          'package2': {}
        },
        patterns: ['MVC'],
        layers: ['presentation'],
        modules: ['module1'],
        antiPatterns: [],
        designPrinciples: []
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.packagesCount).toBe(2);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations from analysis result', () => {
      const analysis = {
        antiPatterns: [
          { severity: 'high', message: 'God Object detected' }
        ],
        designPrinciples: [
          { message: 'Apply Single Responsibility Principle' }
        ]
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].type).toBe('anti-pattern');
      expect(recommendations[0].severity).toBe('high');
      expect(recommendations[1].type).toBe('design-principle');
      expect(recommendations[1].severity).toBe('medium');
    });

    it('should return empty recommendations when no issues found', () => {
      const analysis = {
        antiPatterns: [],
        designPrinciples: []
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('clone', () => {
    it('should create a clone with same options', () => {
      const clonedStep = step.clone();

      expect(clonedStep).toBeInstanceOf(ArchitectureAnalysisStep);
      expect(clonedStep.options).toEqual(step.options);
      expect(clonedStep).not.toBe(step);
    });
  });

  describe('getMetadata', () => {
    it('should return step metadata', () => {
      const metadata = step.getMetadata();

      expect(metadata.name).toBe('ArchitectureAnalysisStep');
      expect(metadata.type).toBe('architecture-analysis');
      expect(metadata.options).toBeDefined();
    });
  });
}); 