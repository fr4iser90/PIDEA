/**
 * TechStackAnalysisStep Unit Tests
 */
const TechStackAnalysisStep = require('../../../../backend/domain/workflows/steps/analysis/TechStackAnalysisStep');

describe('TechStackAnalysisStep', () => {
  let step;
  let mockContext;

  beforeEach(() => {
    step = new TechStackAnalysisStep({
      detectFrameworks: true,
      detectLibraries: true,
      detectTools: true,
      detectLanguages: true,
      detectDatabases: true,
      detectInfrastructure: true,
      detectDevOps: true,
      detectSecurity: true
    });

    mockContext = {
      get: jest.fn(),
      set: jest.fn()
    };
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const defaultStep = new TechStackAnalysisStep();
      expect(defaultStep.options.detectFrameworks).toBe(true);
      expect(defaultStep.options.detectLibraries).toBe(true);
      expect(defaultStep.options.detectTools).toBe(true);
      expect(defaultStep.options.detectLanguages).toBe(true);
      expect(defaultStep.options.detectDatabases).toBe(true);
      expect(defaultStep.options.detectInfrastructure).toBe(true);
      expect(defaultStep.options.detectDevOps).toBe(true);
      expect(defaultStep.options.detectSecurity).toBe(true);
    });

    it('should create an instance with custom options', () => {
      const customStep = new TechStackAnalysisStep({
        detectFrameworks: false,
        detectLibraries: false,
        detectDatabases: false
      });
      expect(customStep.options.detectFrameworks).toBe(false);
      expect(customStep.options.detectLibraries).toBe(false);
      expect(customStep.options.detectDatabases).toBe(false);
      expect(customStep.options.detectTools).toBe(true); // default
    });
  });

  describe('executeStep', () => {
    it('should throw error when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Project path not found in context'
      );
    });

    it('should throw error when tech stack analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // techStackAnalyzer

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Tech stack analyzer not found in context'
      );
    });

    it('should execute successfully with valid context', async () => {
      const mockTechStackAnalyzer = {
        analyzeTechStack: jest.fn().mockResolvedValue({
          frameworks: ['React', 'Express'],
          libraries: ['lodash', 'axios'],
          tools: ['webpack', 'babel'],
          languages: ['JavaScript', 'TypeScript'],
          databases: ['PostgreSQL', 'Redis'],
          infrastructure: ['AWS', 'Docker'],
          devOps: ['GitHub Actions', 'Jenkins'],
          security: ['helmet', 'bcrypt'],
          packageManagers: ['npm', 'yarn'],
          buildTools: ['webpack', 'vite'],
          testingFrameworks: ['Jest', 'Cypress']
        })
      };

      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(mockTechStackAnalyzer) // techStackAnalyzer
        .mockReturnValueOnce(console); // logger

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(mockTechStackAnalyzer.analyzeTechStack).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should return valid result with proper context', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce({}); // techStackAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid result when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project path is required for tech stack analysis');
    });

    it('should return invalid result when tech stack analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // techStackAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tech stack analyzer is required for tech stack analysis');
    });
  });

  describe('generateMetrics', () => {
    it('should generate metrics from analysis result', () => {
      const analysis = {
        frameworks: ['React', 'Express'],
        libraries: ['lodash', 'axios', 'moment'],
        tools: ['webpack', 'babel'],
        languages: ['JavaScript', 'TypeScript'],
        databases: ['PostgreSQL'],
        infrastructure: ['AWS', 'Docker'],
        devOps: ['GitHub Actions'],
        security: ['helmet', 'bcrypt'],
        packageManagers: ['npm'],
        buildTools: ['webpack'],
        testingFrameworks: ['Jest', 'Cypress']
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.frameworksCount).toBe(2);
      expect(metrics.librariesCount).toBe(3);
      expect(metrics.toolsCount).toBe(2);
      expect(metrics.languagesCount).toBe(2);
      expect(metrics.databasesCount).toBe(1);
      expect(metrics.infrastructureCount).toBe(2);
      expect(metrics.devOpsCount).toBe(1);
      expect(metrics.securityCount).toBe(2);
      expect(metrics.packageManagersCount).toBe(1);
      expect(metrics.buildToolsCount).toBe(1);
      expect(metrics.testingFrameworksCount).toBe(2);
      expect(metrics.totalTechnologies).toBe(19);
    });

    it('should handle empty analysis result', () => {
      const analysis = {
        frameworks: [],
        libraries: [],
        tools: [],
        languages: [],
        databases: [],
        infrastructure: [],
        devOps: [],
        security: [],
        packageManagers: [],
        buildTools: [],
        testingFrameworks: []
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.frameworksCount).toBe(0);
      expect(metrics.totalTechnologies).toBe(0);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations from analysis result', () => {
      const analysis = {
        frameworks: ['React'],
        libraries: ['lodash'],
        tools: ['webpack'],
        languages: ['JavaScript'],
        databases: [],
        infrastructure: [],
        devOps: [],
        security: [],
        packageManagers: ['npm'],
        buildTools: ['webpack'],
        testingFrameworks: []
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('type');
      expect(recommendations[0]).toHaveProperty('severity');
      expect(recommendations[0]).toHaveProperty('message');
    });

    it('should recommend testing framework when missing', () => {
      const analysis = {
        frameworks: ['React'],
        libraries: ['lodash'],
        tools: ['webpack'],
        languages: ['JavaScript'],
        databases: [],
        infrastructure: [],
        devOps: [],
        security: [],
        packageManagers: ['npm'],
        buildTools: ['webpack'],
        testingFrameworks: []
      };

      const recommendations = step.generateRecommendations(analysis);

      const testingRecommendation = recommendations.find(r => 
        r.type === 'testing' && r.message.includes('testing framework')
      );
      expect(testingRecommendation).toBeDefined();
    });

    it('should recommend security tools when missing', () => {
      const analysis = {
        frameworks: ['React'],
        libraries: ['lodash'],
        tools: ['webpack'],
        languages: ['JavaScript'],
        databases: [],
        infrastructure: [],
        devOps: [],
        security: [],
        packageManagers: ['npm'],
        buildTools: ['webpack'],
        testingFrameworks: ['Jest']
      };

      const recommendations = step.generateRecommendations(analysis);

      const securityRecommendation = recommendations.find(r => 
        r.type === 'security' && r.message.includes('security')
      );
      expect(securityRecommendation).toBeDefined();
    });

    it('should return empty recommendations when all categories are covered', () => {
      const analysis = {
        frameworks: ['React'],
        libraries: ['lodash'],
        tools: ['webpack'],
        languages: ['JavaScript'],
        databases: ['PostgreSQL'],
        infrastructure: ['AWS'],
        devOps: ['GitHub Actions'],
        security: ['helmet'],
        packageManagers: ['npm'],
        buildTools: ['webpack'],
        testingFrameworks: ['Jest']
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('clone', () => {
    it('should create a clone with same options', () => {
      const clonedStep = step.clone();

      expect(clonedStep).toBeInstanceOf(TechStackAnalysisStep);
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
        'TechStackAnalysisStep: Rolling back tech stack analysis'
      );
    });
  });

  describe('getMetadata', () => {
    it('should return step metadata', () => {
      const metadata = step.getMetadata();

      expect(metadata.name).toBe('TechStackAnalysisStep');
      expect(metadata.description).toBe('Performs tech stack analysis');
      expect(metadata.category).toBe('analysis');
      expect(metadata.options).toEqual(step.options);
    });
  });
}); 