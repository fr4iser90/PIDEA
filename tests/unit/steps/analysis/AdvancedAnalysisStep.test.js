/**
 * AdvancedAnalysisStep Unit Tests
 */
const AdvancedAnalysisStep = require('../../../../backend/domain/workflows/steps/analysis/AdvancedAnalysisStep');

describe('AdvancedAnalysisStep', () => {
  let step;
  let mockContext;

  beforeEach(() => {
    step = new AdvancedAnalysisStep({
      performCodeAnalysis: true,
      performArchitectureAnalysis: true,
      performSecurityAnalysis: true,
      performPerformanceAnalysis: true,
      performQualityAnalysis: true,
      performDependencyAnalysis: true,
      performDocumentationAnalysis: true,
      performTestingAnalysis: true,
      performComplianceAnalysis: true,
      performMaintainabilityAnalysis: true
    });

    mockContext = {
      get: jest.fn(),
      set: jest.fn()
    };
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const defaultStep = new AdvancedAnalysisStep();
      expect(defaultStep.options.performCodeAnalysis).toBe(true);
      expect(defaultStep.options.performArchitectureAnalysis).toBe(true);
      expect(defaultStep.options.performSecurityAnalysis).toBe(true);
      expect(defaultStep.options.performPerformanceAnalysis).toBe(true);
      expect(defaultStep.options.performQualityAnalysis).toBe(true);
      expect(defaultStep.options.performDependencyAnalysis).toBe(true);
      expect(defaultStep.options.performDocumentationAnalysis).toBe(true);
      expect(defaultStep.options.performTestingAnalysis).toBe(true);
      expect(defaultStep.options.performComplianceAnalysis).toBe(true);
      expect(defaultStep.options.performMaintainabilityAnalysis).toBe(true);
    });

    it('should create an instance with custom options', () => {
      const customStep = new AdvancedAnalysisStep({
        performCodeAnalysis: false,
        performArchitectureAnalysis: false,
        performSecurityAnalysis: false
      });
      expect(customStep.options.performCodeAnalysis).toBe(false);
      expect(customStep.options.performArchitectureAnalysis).toBe(false);
      expect(customStep.options.performSecurityAnalysis).toBe(false);
      expect(customStep.options.performPerformanceAnalysis).toBe(true); // default
    });
  });

  describe('executeStep', () => {
    it('should throw error when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Project path not found in context'
      );
    });

    it('should throw error when advanced analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // advancedAnalyzer

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Advanced analyzer not found in context'
      );
    });

    it('should execute successfully with valid context', async () => {
      const mockAdvancedAnalyzer = {
        performAdvancedAnalysis: jest.fn().mockResolvedValue({
          codeAnalysis: {
            complexity: { average: 2.5, max: 8 },
            maintainability: { score: 85, issues: [] },
            quality: { score: 90, violations: [] }
          },
          architectureAnalysis: {
            patterns: ['MVC', 'Repository'],
            layers: ['presentation', 'business', 'data'],
            coupling: { low: 0.3, medium: 0.5, high: 0.2 },
            cohesion: { average: 0.8 }
          },
          securityAnalysis: {
            vulnerabilities: [],
            riskScore: 15,
            recommendations: ['Use HTTPS', 'Implement rate limiting']
          },
          performanceAnalysis: {
            bottlenecks: [],
            optimizationOpportunities: ['Database indexing', 'Caching'],
            metrics: { responseTime: 120, throughput: 1000 }
          },
          dependencyAnalysis: {
            directDependencies: 15,
            transitiveDependencies: 45,
            vulnerabilities: 0,
            outdated: 2
          },
          documentationAnalysis: {
            coverage: 75,
            quality: 'good',
            missing: ['API documentation', 'Deployment guide']
          },
          testingAnalysis: {
            coverage: 85,
            testTypes: ['unit', 'integration'],
            quality: 'excellent'
          },
          complianceAnalysis: {
            standards: ['ESLint', 'Prettier'],
            violations: [],
            score: 95
          },
          maintainabilityAnalysis: {
            maintainabilityIndex: 78,
            technicalDebt: 'low',
            refactoringNeeded: false
          },
          overallScore: 88,
          recommendations: [
            { type: 'performance', message: 'Implement caching', priority: 'medium' },
            { type: 'documentation', message: 'Add API docs', priority: 'low' }
          ]
        })
      };

      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(mockAdvancedAnalyzer) // advancedAnalyzer
        .mockReturnValueOnce(console); // logger

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(mockAdvancedAnalyzer.performAdvancedAnalysis).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should return valid result with proper context', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce({}); // advancedAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid result when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project path is required for advanced analysis');
    });

    it('should return invalid result when advanced analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // advancedAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Advanced analyzer is required for advanced analysis');
    });
  });

  describe('generateMetrics', () => {
    it('should generate metrics from analysis result', () => {
      const analysis = {
        codeAnalysis: {
          complexity: { average: 2.5, max: 8 },
          maintainability: { score: 85, issues: [] },
          quality: { score: 90, violations: [] }
        },
        architectureAnalysis: {
          patterns: ['MVC', 'Repository'],
          layers: ['presentation', 'business', 'data'],
          coupling: { low: 0.3, medium: 0.5, high: 0.2 },
          cohesion: { average: 0.8 }
        },
        securityAnalysis: {
          vulnerabilities: [],
          riskScore: 15,
          recommendations: ['Use HTTPS']
        },
        performanceAnalysis: {
          bottlenecks: [],
          optimizationOpportunities: ['Database indexing'],
          metrics: { responseTime: 120, throughput: 1000 }
        },
        dependencyAnalysis: {
          directDependencies: 15,
          transitiveDependencies: 45,
          vulnerabilities: 0,
          outdated: 2
        },
        documentationAnalysis: {
          coverage: 75,
          quality: 'good',
          missing: ['API documentation']
        },
        testingAnalysis: {
          coverage: 85,
          testTypes: ['unit', 'integration'],
          quality: 'excellent'
        },
        complianceAnalysis: {
          standards: ['ESLint', 'Prettier'],
          violations: [],
          score: 95
        },
        maintainabilityAnalysis: {
          maintainabilityIndex: 78,
          technicalDebt: 'low',
          refactoringNeeded: false
        },
        overallScore: 88,
        recommendations: [
          { type: 'performance', message: 'Implement caching', priority: 'medium' }
        ]
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.overallScore).toBe(88);
      expect(metrics.codeQualityScore).toBe(90);
      expect(metrics.maintainabilityScore).toBe(85);
      expect(metrics.architectureScore).toBe(80);
      expect(metrics.securityScore).toBe(85);
      expect(metrics.performanceScore).toBe(80);
      expect(metrics.dependencyScore).toBe(90);
      expect(metrics.documentationScore).toBe(75);
      expect(metrics.testingScore).toBe(85);
      expect(metrics.complianceScore).toBe(95);
      expect(metrics.maintainabilityIndex).toBe(78);
      expect(metrics.totalRecommendations).toBe(1);
    });

    it('should handle partial analysis result', () => {
      const analysis = {
        codeAnalysis: {
          complexity: { average: 3.0, max: 10 },
          maintainability: { score: 70, issues: ['High complexity'] },
          quality: { score: 75, violations: ['Unused variables'] }
        },
        overallScore: 72,
        recommendations: [
          { type: 'code', message: 'Reduce complexity', priority: 'high' },
          { type: 'quality', message: 'Remove unused variables', priority: 'medium' }
        ]
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.overallScore).toBe(72);
      expect(metrics.codeQualityScore).toBe(75);
      expect(metrics.maintainabilityScore).toBe(70);
      expect(metrics.totalRecommendations).toBe(2);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations from analysis result', () => {
      const analysis = {
        codeAnalysis: {
          complexity: { average: 3.0, max: 10 },
          maintainability: { score: 70, issues: ['High complexity'] },
          quality: { score: 75, violations: ['Unused variables'] }
        },
        securityAnalysis: {
          vulnerabilities: [
            { severity: 'high', description: 'SQL injection vulnerability' }
          ],
          riskScore: 45
        },
        performanceAnalysis: {
          bottlenecks: ['Slow database queries'],
          optimizationOpportunities: ['Implement caching']
        },
        overallScore: 65,
        recommendations: [
          { type: 'security', message: 'Fix SQL injection', priority: 'high' },
          { type: 'performance', message: 'Implement caching', priority: 'medium' }
        ]
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('type');
      expect(recommendations[0]).toHaveProperty('severity');
      expect(recommendations[0]).toHaveProperty('message');
    });

    it('should prioritize high severity recommendations', () => {
      const analysis = {
        securityAnalysis: {
          vulnerabilities: [
            { severity: 'high', description: 'SQL injection vulnerability' }
          ],
          riskScore: 45
        },
        overallScore: 65,
        recommendations: [
          { type: 'security', message: 'Fix SQL injection', priority: 'high' },
          { type: 'performance', message: 'Implement caching', priority: 'medium' }
        ]
      };

      const recommendations = step.generateRecommendations(analysis);

      const highPriorityRecommendations = recommendations.filter(r => r.severity === 'high');
      expect(highPriorityRecommendations.length).toBeGreaterThan(0);
    });

    it('should recommend code improvements when quality is low', () => {
      const analysis = {
        codeAnalysis: {
          complexity: { average: 4.0, max: 15 },
          maintainability: { score: 60, issues: ['Very high complexity'] },
          quality: { score: 65, violations: ['Multiple issues'] }
        },
        overallScore: 62,
        recommendations: [
          { type: 'code', message: 'Reduce complexity', priority: 'high' }
        ]
      };

      const recommendations = step.generateRecommendations(analysis);

      const codeRecommendation = recommendations.find(r => 
        r.type === 'code' && r.message.includes('complexity')
      );
      expect(codeRecommendation).toBeDefined();
    });

    it('should return empty recommendations when analysis is optimal', () => {
      const analysis = {
        codeAnalysis: {
          complexity: { average: 2.0, max: 5 },
          maintainability: { score: 95, issues: [] },
          quality: { score: 95, violations: [] }
        },
        securityAnalysis: {
          vulnerabilities: [],
          riskScore: 10
        },
        performanceAnalysis: {
          bottlenecks: [],
          optimizationOpportunities: []
        },
        overallScore: 95,
        recommendations: []
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('clone', () => {
    it('should create a clone with same options', () => {
      const clonedStep = step.clone();

      expect(clonedStep).toBeInstanceOf(AdvancedAnalysisStep);
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
        'AdvancedAnalysisStep: Rolling back advanced analysis'
      );
    });
  });

  describe('getMetadata', () => {
    it('should return step metadata', () => {
      const metadata = step.getMetadata();

      expect(metadata.name).toBe('AdvancedAnalysisStep');
      expect(metadata.description).toBe('Performs comprehensive advanced analysis');
      expect(metadata.category).toBe('analysis');
      expect(metadata.options).toEqual(step.options);
    });
  });
}); 