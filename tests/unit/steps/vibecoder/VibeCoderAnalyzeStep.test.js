/**
 * VibeCoderAnalyzeStep Unit Tests
 * Tests for VibeCoder analysis workflow step
 */
const VibeCoderAnalyzeStep = require('../../../../backend/domain/workflows/steps/vibecoder/VibeCoderAnalyzeStep');
const VibeCoderServiceAdapter = require('../../../../backend/domain/workflows/steps/vibecoder/VibeCoderServiceAdapter');

describe('VibeCoderAnalyzeStep', () => {
  let step;
  let mockContext;
  let mockVibeCoderAdapter;
  let mockAnalysisService;
  let mockSecurityService;
  let mockRecommendationService;
  let mockMetricsService;

  beforeEach(() => {
    // Create mock services
    mockAnalysisService = {
      performComprehensiveAnalysis: jest.fn()
    };

    mockSecurityService = {
      analyzeSecurity: jest.fn()
    };

    mockRecommendationService = {
      generateRecommendations: jest.fn()
    };

    mockMetricsService = {
      calculateMetrics: jest.fn()
    };

    // Create mock VibeCoder adapter
    mockVibeCoderAdapter = {
      getAnalysisService: jest.fn().mockReturnValue(mockAnalysisService),
      getSecurityService: jest.fn().mockReturnValue(mockSecurityService),
      getRecommendationService: jest.fn().mockReturnValue(mockRecommendationService),
      getMetricsService: jest.fn().mockReturnValue(mockMetricsService)
    };

    // Create mock context
    mockContext = {
      get: jest.fn((key) => {
        const contextData = {
          projectPath: '/test/project',
          requestedBy: 'test-user',
          analysisTypes: ['comprehensive'],
          logger: console,
          vibecoderAdapter: mockVibeCoderAdapter
        };
        return contextData[key];
      })
    };

    // Create step instance
    step = new VibeCoderAnalyzeStep({
      enablePerformanceMonitoring: true,
      enableEventHandling: true,
      enableValidation: true,
      enableLogging: true
    });
  });

  describe('Constructor', () => {
    it('should create step with correct configuration', () => {
      expect(step._name).toBe('VibeCoderAnalyzeStep');
      expect(step._description).toBe('Performs VibeCoder comprehensive analysis');
      expect(step._type).toBe('vibecoder-analysis');
      expect(step.options.enablePerformanceMonitoring).toBe(true);
      expect(step.options.enableEventHandling).toBe(true);
      expect(step.options.enableValidation).toBe(true);
      expect(step.options.enableLogging).toBe(true);
      expect(step.options.timeout).toBe(120000);
      expect(step.options.maxConcurrentSubCommands).toBe(5);
    });

    it('should generate unique handler ID', () => {
      expect(step.handlerId).toMatch(/^vibecoder-analyze-\d+-\w+$/);
    });
  });

  describe('executeStep', () => {
    it('should execute analysis step successfully', async () => {
      // Mock service responses
      const mockAnalysisResults = {
        projectStructure: { totalFiles: 100 },
        codeQuality: { score: 85 },
        architecture: { patterns: ['MVC'] },
        dependencies: { directDependencies: 10 },
        performance: { bottlenecks: [] },
        maintainability: { score: 80 },
        techStack: { languages: ['JavaScript'] },
        metrics: { overall: 82 }
      };

      const mockSecurityResults = {
        vulnerabilities: [],
        codeIssues: [],
        configuration: {},
        dependencies: {},
        secrets: {},
        recommendations: [],
        score: 90,
        riskLevel: 'low'
      };

      const mockRecommendations = {
        analyze: ['Perform deeper analysis'],
        refactor: ['Refactor large functions'],
        generate: ['Generate tests'],
        security: ['Update dependencies'],
        performance: ['Optimize queries'],
        maintainability: ['Add documentation']
      };

      const mockMetrics = {
        overall: 82,
        codeQuality: 85,
        architecture: 80,
        security: 90,
        performance: 75,
        maintainability: 80,
        complexity: 70,
        testCoverage: 60
      };

      mockAnalysisService.performComprehensiveAnalysis.mockResolvedValue(mockAnalysisResults);
      mockSecurityService.analyzeSecurity.mockResolvedValue(mockSecurityResults);
      mockRecommendationService.generateRecommendations.mockResolvedValue(mockRecommendations);
      mockMetricsService.calculateMetrics.mockResolvedValue(mockMetrics);

      // Execute step
      const result = await step.executeStep(mockContext);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.stepName).toBe('VibeCoderAnalyzeStep');
      expect(result.result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();

      // Verify service calls
      expect(mockAnalysisService.performComprehensiveAnalysis).toHaveBeenCalledWith('/test/project', mockContext);
      expect(mockSecurityService.analyzeSecurity).toHaveBeenCalledWith('/test/project', null);
      expect(mockRecommendationService.generateRecommendations).toHaveBeenCalledWith({
        analysis: mockAnalysisResults,
        security: mockSecurityResults,
        context: mockContext
      });
      expect(mockMetricsService.calculateMetrics).toHaveBeenCalledWith({
        analysis: mockAnalysisResults,
        security: mockSecurityResults,
        context: mockContext
      });
    });

    it('should handle missing project path', async () => {
      mockContext.get.mockImplementation((key) => {
        if (key === 'projectPath') return null;
        return mockContext.get.mock.results[0].value;
      });

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project path not found in context');
    });

    it('should handle missing VibeCoder adapter', async () => {
      mockContext.get.mockImplementation((key) => {
        if (key === 'vibecoderAdapter') return null;
        return mockContext.get.mock.results[0].value;
      });

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VibeCoder service adapter not found in context');
    });

    it('should handle missing required services', async () => {
      mockVibeCoderAdapter.getAnalysisService.mockReturnValue(null);

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Required VibeCoder services not available');
    });

    it('should handle analysis service failure', async () => {
      mockAnalysisService.performComprehensiveAnalysis.mockRejectedValue(new Error('Analysis failed'));

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Analysis failed');
    });

    it('should handle security service failure', async () => {
      mockAnalysisService.performComprehensiveAnalysis.mockResolvedValue({});
      mockSecurityService.analyzeSecurity.mockRejectedValue(new Error('Security analysis failed'));

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Security analysis failed');
    });
  });

  describe('performComprehensiveAnalysis', () => {
    it('should perform comprehensive analysis successfully', async () => {
      const mockAnalysis = {
        projectStructure: { totalFiles: 100 },
        codeQuality: { score: 85 },
        architecture: { patterns: ['MVC'] },
        dependencies: { directDependencies: 10 },
        performance: { bottlenecks: [] },
        security: { vulnerabilities: [] },
        maintainability: { score: 80 },
        techStack: { languages: ['JavaScript'] },
        metrics: { overall: 82 }
      };

      mockAnalysisService.performComprehensiveAnalysis.mockResolvedValue(mockAnalysis);

      const result = await step.performComprehensiveAnalysis(mockAnalysisService, '/test/project', mockContext);

      expect(result).toEqual(mockAnalysis);
      expect(mockAnalysisService.performComprehensiveAnalysis).toHaveBeenCalledWith('/test/project');
    });

    it('should handle analysis service failure', async () => {
      mockAnalysisService.performComprehensiveAnalysis.mockRejectedValue(new Error('Analysis failed'));

      await expect(step.performComprehensiveAnalysis(mockAnalysisService, '/test/project', mockContext))
        .rejects.toThrow('Analysis failed');
    });
  });

  describe('performSecurityAnalysis', () => {
    it('should perform security analysis successfully', async () => {
      const mockSecurity = {
        vulnerabilities: [],
        codeIssues: [],
        configuration: {},
        dependencies: {},
        secrets: {},
        recommendations: [],
        score: 90,
        riskLevel: 'low'
      };

      mockSecurityService.analyzeSecurity.mockResolvedValue(mockSecurity);

      const result = await step.performSecurityAnalysis(mockSecurityService, '/test/project', mockContext);

      expect(result).toEqual({
        vulnerabilities: [],
        codeIssues: [],
        configuration: {},
        dependencies: {},
        secrets: {},
        recommendations: [],
        score: 90,
        riskLevel: 'low'
      });
      expect(mockSecurityService.analyzeSecurity).toHaveBeenCalledWith('/test/project', null);
    });

    it('should use existing packages if provided', async () => {
      const existingPackages = [{ name: 'package1', path: '/path1' }];
      mockContext.get.mockImplementation((key) => {
        if (key === 'existingPackages') return existingPackages;
        return mockContext.get.mock.results[0].value;
      });

      const mockSecurity = { vulnerabilities: [], score: 90 };
      mockSecurityService.analyzeSecurity.mockResolvedValue(mockSecurity);

      await step.performSecurityAnalysis(mockSecurityService, '/test/project', mockContext);

      expect(mockSecurityService.analyzeSecurity).toHaveBeenCalledWith('/test/project', existingPackages);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations successfully', async () => {
      const analysisResults = { projectStructure: {} };
      const securityResults = { vulnerabilities: [] };
      const mockRecommendations = {
        analyze: ['Perform deeper analysis'],
        refactor: ['Refactor large functions'],
        generate: ['Generate tests'],
        security: ['Update dependencies'],
        performance: ['Optimize queries'],
        maintainability: ['Add documentation']
      };

      mockRecommendationService.generateRecommendations.mockResolvedValue(mockRecommendations);

      const result = await step.generateRecommendations(mockRecommendationService, analysisResults, securityResults, mockContext);

      expect(result).toEqual(mockRecommendations);
      expect(mockRecommendationService.generateRecommendations).toHaveBeenCalledWith({
        analysis: analysisResults,
        security: securityResults,
        context: mockContext
      });
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate metrics successfully', async () => {
      const analysisResults = { projectStructure: {} };
      const securityResults = { vulnerabilities: [] };
      const mockMetrics = {
        overall: 82,
        codeQuality: 85,
        architecture: 80,
        security: 90,
        performance: 75,
        maintainability: 80,
        complexity: 70,
        testCoverage: 60
      };

      mockMetricsService.calculateMetrics.mockResolvedValue(mockMetrics);

      const result = await step.calculateMetrics(mockMetricsService, analysisResults, securityResults, mockContext);

      expect(result).toEqual(mockMetrics);
      expect(mockMetricsService.calculateMetrics).toHaveBeenCalledWith({
        analysis: analysisResults,
        security: securityResults,
        context: mockContext
      });
    });
  });

  describe('consolidateResults', () => {
    it('should consolidate results successfully', async () => {
      const analysisResults = {
        projectStructure: { totalFiles: 100 },
        codeQuality: { score: 85 },
        architecture: { patterns: ['MVC'] },
        dependencies: { directDependencies: 10 },
        performance: { bottlenecks: [] },
        maintainability: { score: 80 },
        techStack: { languages: ['JavaScript'] },
        metrics: { overall: 82 }
      };

      const securityResults = {
        vulnerabilities: [],
        codeIssues: [],
        configuration: {},
        dependencies: {},
        secrets: {},
        recommendations: [],
        score: 90,
        riskLevel: 'low'
      };

      const recommendations = {
        analyze: ['Perform deeper analysis'],
        refactor: ['Refactor large functions'],
        generate: ['Generate tests'],
        security: ['Update dependencies'],
        performance: ['Optimize queries'],
        maintainability: ['Add documentation']
      };

      const metrics = {
        overall: 82,
        codeQuality: 85,
        architecture: 80,
        security: 90,
        performance: 75,
        maintainability: 80,
        complexity: 70,
        testCoverage: 60
      };

      const result = await step.consolidateResults(analysisResults, securityResults, recommendations, metrics, mockContext);

      expect(result).toHaveProperty('projectStructure');
      expect(result).toHaveProperty('codeQuality');
      expect(result).toHaveProperty('architecture');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('maintainability');
      expect(result).toHaveProperty('techStack');
      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('metadata');
    });
  });

  describe('getConfiguration', () => {
    it('should return step configuration', () => {
      const config = step.getConfiguration();

      expect(config.name).toBe('VibeCoderAnalyzeStep');
      expect(config.description).toBe('Performs VibeCoder comprehensive analysis');
      expect(config.type).toBe('vibecoder-analysis');
      expect(config.options).toBeDefined();
      expect(config.handlerId).toBeDefined();
      expect(config.metadata).toBeDefined();
    });
  });

  describe('getMetadata', () => {
    it('should return step metadata', () => {
      const metadata = step.getMetadata();

      expect(metadata.handlerId).toBeDefined();
      expect(metadata.type).toBe('VibeCoderAnalyzeStep');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.supportedOperations).toContain('comprehensive_analysis');
      expect(metadata.supportedOperations).toContain('sub_command_orchestration');
      expect(metadata.supportedOperations).toContain('result_consolidation');
      expect(metadata.capabilities).toContain('analysis');
      expect(metadata.capabilities).toContain('comprehensive-analysis');
      expect(metadata.capabilities).toContain('project-analysis');
      expect(metadata.options).toBeDefined();
    });
  });
}); 