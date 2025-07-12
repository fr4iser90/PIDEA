/**
 * VibeCoder Steps Integration Tests
 * Tests for VibeCoder workflow steps integration with unified workflow system
 */
const {
  VibeCoderStepFactory,
  VibeCoderStepRegistry,
  VibeCoderServiceAdapter,
  VibeCoderAnalyzeStep,
  VibeCoderGenerateStep,
  VibeCoderRefactorStep,
  VibeCoderModeStep
} = require('../../../../backend/domain/workflows/steps/vibecoder');

describe('VibeCoder Steps Integration', () => {
  let factory;
  let registry;
  let adapter;
  let mockDependencies;

  beforeEach(() => {
    // Create mock dependencies
    mockDependencies = {
      logger: console,
      eventBus: {
        publish: jest.fn()
      },
      commandBus: {
        execute: jest.fn()
      },
      projectAnalyzer: {
        analyzeProject: jest.fn()
      },
      codeQualityAnalyzer: {
        analyzeCodeQuality: jest.fn()
      },
      architectureAnalyzer: {
        analyzeArchitecture: jest.fn()
      },
      dependencyAnalyzer: {
        analyzeDependencies: jest.fn()
      },
      securityAnalyzer: {
        analyzeSecurity: jest.fn()
      },
      performanceAnalyzer: {
        analyzePerformance: jest.fn()
      },
      subprojectDetector: {
        detectSubprojects: jest.fn()
      }
    };

    // Create instances
    factory = new VibeCoderStepFactory();
    registry = new VibeCoderStepRegistry();
    adapter = new VibeCoderServiceAdapter(mockDependencies);
  });

  describe('VibeCoderStepFactory Integration', () => {
    it('should initialize factory with dependencies', () => {
      expect(() => {
        factory.initialize(mockDependencies);
      }).not.toThrow();

      expect(factory.getServiceAdapter()).toBeDefined();
      expect(factory.getMetadata().isInitialized).toBe(true);
    });

    it('should create VibeCoder analyze step', () => {
      factory.initialize(mockDependencies);
      
      const step = factory.createVibeCoderAnalyzeStep({
        enablePerformanceMonitoring: true
      });

      expect(step).toBeInstanceOf(VibeCoderAnalyzeStep);
      expect(step.getConfiguration().name).toBe('VibeCoderAnalyzeStep');
      expect(step.getConfiguration().options.enablePerformanceMonitoring).toBe(true);
    });

    it('should create VibeCoder generate step', () => {
      factory.initialize(mockDependencies);
      
      const step = factory.createVibeCoderGenerateStep({
        enableInitialAnalysis: true
      });

      expect(step).toBeInstanceOf(VibeCoderGenerateStep);
      expect(step.getConfiguration().name).toBe('VibeCoderGenerateStep');
      expect(step.getConfiguration().options.enableInitialAnalysis).toBe(true);
    });

    it('should create VibeCoder refactor step', () => {
      factory.initialize(mockDependencies);
      
      const step = factory.createVibeCoderRefactorStep({
        enableRefactorStrategy: true
      });

      expect(step).toBeInstanceOf(VibeCoderRefactorStep);
      expect(step.getConfiguration().name).toBe('VibeCoderRefactorStep');
      expect(step.getConfiguration().options.enableRefactorStrategy).toBe(true);
    });

    it('should create VibeCoder mode step', () => {
      factory.initialize(mockDependencies);
      
      const step = factory.createVibeCoderModeStep({
        enableSubprojectDetection: true
      });

      expect(step).toBeInstanceOf(VibeCoderModeStep);
      expect(step.getConfiguration().name).toBe('VibeCoderModeStep');
      expect(step.getConfiguration().options.enableSubprojectDetection).toBe(true);
    });

    it('should create comprehensive VibeCoder workflow', () => {
      factory.initialize(mockDependencies);
      
      const steps = factory.createComprehensiveVibeCoderWorkflow({
        analyze: { enablePerformanceMonitoring: true },
        refactor: { enableRefactorStrategy: true },
        generate: { enableInitialAnalysis: true }
      });

      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBe(3);
      expect(steps[0]).toBeInstanceOf(VibeCoderAnalyzeStep);
      expect(steps[1]).toBeInstanceOf(VibeCoderRefactorStep);
      expect(steps[2]).toBeInstanceOf(VibeCoderGenerateStep);
    });

    it('should create workflow by type', () => {
      factory.initialize(mockDependencies);
      
      const analyzeStep = factory.createVibeCoderWorkflow('analyze', { enablePerformanceMonitoring: true });
      const generateStep = factory.createVibeCoderWorkflow('generate', { enableInitialAnalysis: true });
      const refactorStep = factory.createVibeCoderWorkflow('refactor', { enableRefactorStrategy: true });
      const modeStep = factory.createVibeCoderWorkflow('mode', { enableSubprojectDetection: true });
      const comprehensiveSteps = factory.createVibeCoderWorkflow('comprehensive', {});

      expect(analyzeStep).toBeInstanceOf(VibeCoderAnalyzeStep);
      expect(generateStep).toBeInstanceOf(VibeCoderGenerateStep);
      expect(refactorStep).toBeInstanceOf(VibeCoderRefactorStep);
      expect(modeStep).toBeInstanceOf(VibeCoderModeStep);
      expect(Array.isArray(comprehensiveSteps)).toBe(true);
    });

    it('should handle unknown workflow type', () => {
      factory.initialize(mockDependencies);
      
      expect(() => {
        factory.createVibeCoderWorkflow('unknown', {});
      }).toThrow('Unknown VibeCoder workflow type: unknown');
    });
  });

  describe('VibeCoderStepRegistry Integration', () => {
    it('should initialize registry with dependencies', () => {
      expect(() => {
        registry.initialize(mockDependencies);
      }).not.toThrow();

      expect(registry.getMetadata().statistics.isInitialized).toBe(true);
    });

    it('should register default steps', () => {
      registry.initialize(mockDependencies);
      
      const steps = registry.getAllSteps();
      expect(steps.size).toBeGreaterThan(0);

      const analyzeStep = registry.getStep('vibecoder-analyze');
      const generateStep = registry.getStep('vibecoder-generate');
      const refactorStep = registry.getStep('vibecoder-refactor');
      const modeStep = registry.getStep('vibecoder-mode');

      expect(analyzeStep).toBeDefined();
      expect(generateStep).toBeDefined();
      expect(refactorStep).toBeDefined();
      expect(modeStep).toBeDefined();
    });

    it('should register step templates', () => {
      registry.initialize(mockDependencies);
      
      const templates = registry.getAllTemplates();
      expect(templates.size).toBeGreaterThan(0);

      const comprehensiveTemplate = registry.getTemplate('vibecoder-comprehensive');
      const analyzeTemplate = registry.getTemplate('vibecoder-analyze-only');
      const generateTemplate = registry.getTemplate('vibecoder-generate-only');
      const refactorTemplate = registry.getTemplate('vibecoder-refactor-only');

      expect(comprehensiveTemplate).toBeDefined();
      expect(analyzeTemplate).toBeDefined();
      expect(generateTemplate).toBeDefined();
      expect(refactorTemplate).toBeDefined();
    });

    it('should create step from template', () => {
      registry.initialize(mockDependencies);
      
      const step = registry.createStepFromTemplate('vibecoder-analyze-only', {
        enablePerformanceMonitoring: true
      });

      expect(step).toBeInstanceOf(VibeCoderAnalyzeStep);
      expect(step.getConfiguration().options.enablePerformanceMonitoring).toBe(true);
    });

    it('should search steps by criteria', () => {
      registry.initialize(mockDependencies);
      
      const analysisSteps = registry.searchSteps({ capability: 'analysis' });
      const generationSteps = registry.searchSteps({ capability: 'generation' });
      const refactoringSteps = registry.searchSteps({ capability: 'refactoring' });

      expect(analysisSteps.length).toBeGreaterThan(0);
      expect(generationSteps.length).toBeGreaterThan(0);
      expect(refactoringSteps.length).toBeGreaterThan(0);
    });

    it('should validate step registration', () => {
      registry.initialize(mockDependencies);
      
      const validation = registry.validateStepRegistration('vibecoder-analyze');
      expect(validation.isValid).toBe(true);
      expect(validation.step).toBeDefined();

      const invalidValidation = registry.validateStepRegistration('nonexistent-step');
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.errors).toContain('Step nonexistent-step not found');
    });
  });

  describe('VibeCoderServiceAdapter Integration', () => {
    it('should initialize adapter with dependencies', () => {
      expect(() => {
        adapter.initializeServices(mockDependencies);
      }).not.toThrow();

      expect(adapter.getMetadata().isValid).toBe(true);
    });

    it('should provide all required services', () => {
      adapter.initializeServices(mockDependencies);

      expect(adapter.getAnalysisService()).toBeDefined();
      expect(adapter.getSecurityService()).toBeDefined();
      expect(adapter.getRecommendationService()).toBeDefined();
      expect(adapter.getMetricsService()).toBeDefined();
      expect(adapter.getExecutionService()).toBeDefined();
      expect(adapter.getValidationService()).toBeDefined();
      expect(adapter.getReportService()).toBeDefined();
      expect(adapter.getOutputService()).toBeDefined();
    });

    it('should validate service availability', () => {
      adapter.initializeServices(mockDependencies);
      
      const validation = adapter.validateServices();
      expect(validation.isValid).toBe(true);
      expect(validation.availableServices.length).toBe(8);
      expect(validation.missingServices.length).toBe(0);
      expect(validation.totalServices).toBe(8);
    });

    it('should create workflow context with services', () => {
      adapter.initializeServices(mockDependencies);
      
      const baseContext = {
        projectPath: '/test/project',
        requestedBy: 'test-user'
      };

      const enhancedContext = adapter.createWorkflowContext(baseContext);

      expect(enhancedContext.projectPath).toBe('/test/project');
      expect(enhancedContext.requestedBy).toBe('test-user');
      expect(enhancedContext.analysisService).toBeDefined();
      expect(enhancedContext.securityService).toBeDefined();
      expect(enhancedContext.recommendationService).toBeDefined();
      expect(enhancedContext.metricsService).toBeDefined();
      expect(enhancedContext.executionService).toBeDefined();
      expect(enhancedContext.validationService).toBeDefined();
      expect(enhancedContext.reportService).toBeDefined();
      expect(enhancedContext.outputService).toBeDefined();
      expect(enhancedContext.vibecoderAdapter).toBe(adapter);
      expect(enhancedContext.logger).toBe(mockDependencies.logger);
      expect(enhancedContext.eventBus).toBe(mockDependencies.eventBus);
      expect(enhancedContext.commandBus).toBe(mockDependencies.commandBus);
    });

    it('should provide adapter metadata', () => {
      adapter.initializeServices(mockDependencies);
      
      const metadata = adapter.getMetadata();
      expect(metadata.type).toBe('VibeCoderServiceAdapter');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.isValid).toBe(true);
      expect(metadata.totalServices).toBe(8);
    });
  });

  describe('Step Execution Integration', () => {
    let mockContext;

    beforeEach(() => {
      factory.initialize(mockDependencies);
      adapter.initializeServices(mockDependencies);

      mockContext = {
        get: jest.fn((key) => {
          const contextData = {
            projectPath: '/test/project',
            requestedBy: 'test-user',
            analysisTypes: ['comprehensive'],
            generateOptions: { enableInitialAnalysis: true },
            refactorOptions: { enableRefactorStrategy: true },
            modeOptions: { enableSubprojectDetection: true },
            logger: console,
            vibecoderAdapter: adapter,
            subprojectDetector: mockDependencies.subprojectDetector
          };
          return contextData[key];
        })
      };
    });

    it('should execute analyze step with adapter', async () => {
      const step = factory.createVibeCoderAnalyzeStep();
      
      // Mock service responses
      const mockAnalysisService = adapter.getAnalysisService();
      const mockSecurityService = adapter.getSecurityService();
      const mockRecommendationService = adapter.getRecommendationService();
      const mockMetricsService = adapter.getMetricsService();

      mockAnalysisService.performComprehensiveAnalysis = jest.fn().mockResolvedValue({
        projectStructure: { totalFiles: 100 },
        codeQuality: { score: 85 }
      });

      mockSecurityService.analyzeSecurity = jest.fn().mockResolvedValue({
        vulnerabilities: [],
        score: 90
      });

      mockRecommendationService.generateRecommendations = jest.fn().mockResolvedValue({
        analyze: ['Perform deeper analysis'],
        refactor: ['Refactor large functions']
      });

      mockMetricsService.calculateMetrics = jest.fn().mockResolvedValue({
        overall: 82,
        codeQuality: 85
      });

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.stepName).toBe('VibeCoderAnalyzeStep');
      expect(result.result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should execute generate step with adapter', async () => {
      const step = factory.createVibeCoderGenerateStep();
      
      // Mock service responses
      const mockAnalysisService = adapter.getAnalysisService();
      const mockExecutionService = adapter.getExecutionService();
      const mockValidationService = adapter.getValidationService();
      const mockReportService = adapter.getReportService();
      const mockOutputService = adapter.getOutputService();

      mockAnalysisService.performComprehensiveAnalysis = jest.fn().mockResolvedValue({
        projectStructure: { totalFiles: 100 }
      });

      mockExecutionService.determineGenerationStrategy = jest.fn().mockResolvedValue({
        type: 'comprehensive',
        phases: []
      });

      mockExecutionService.executeGenerationOperations = jest.fn().mockResolvedValue([
        { operation: 'generate', success: true }
      ]);

      mockValidationService.validateGenerationResults = jest.fn().mockResolvedValue({
        isValid: true,
        score: 85
      });

      mockReportService.generateGenerationReport = jest.fn().mockResolvedValue({
        summary: {},
        details: {}
      });

      mockOutputService.generateGenerationOutput = jest.fn().mockResolvedValue({
        files: [],
        reports: []
      });

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.stepName).toBe('VibeCoderGenerateStep');
      expect(result.result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should execute refactor step with adapter', async () => {
      const step = factory.createVibeCoderRefactorStep();
      
      // Mock service responses
      const mockAnalysisService = adapter.getAnalysisService();
      const mockExecutionService = adapter.getExecutionService();
      const mockValidationService = adapter.getValidationService();
      const mockReportService = adapter.getReportService();
      const mockOutputService = adapter.getOutputService();

      mockAnalysisService.performComprehensiveAnalysis = jest.fn().mockResolvedValue({
        projectStructure: { totalFiles: 100 }
      });

      mockExecutionService.determineRefactorStrategy = jest.fn().mockResolvedValue({
        type: 'comprehensive',
        phases: []
      });

      mockExecutionService.executeRefactorOperations = jest.fn().mockResolvedValue([
        { operation: 'refactor', success: true }
      ]);

      mockValidationService.validateRefactoringResults = jest.fn().mockResolvedValue({
        isValid: true,
        score: 85
      });

      mockReportService.generateRefactoringReport = jest.fn().mockResolvedValue({
        summary: {},
        details: {}
      });

      mockOutputService.generateRefactoringOutput = jest.fn().mockResolvedValue({
        files: [],
        reports: []
      });

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.stepName).toBe('VibeCoderRefactorStep');
      expect(result.result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should execute mode step with adapter', async () => {
      const step = factory.createVibeCoderModeStep();
      
      // Mock service responses
      mockDependencies.subprojectDetector.detectSubprojects = jest.fn().mockResolvedValue([
        { path: '/test/project', type: 'unknown', meta: {} }
      ]);

      const mockAnalysisService = adapter.getAnalysisService();
      const mockExecutionService = adapter.getExecutionService();
      const mockValidationService = adapter.getValidationService();
      const mockReportService = adapter.getReportService();
      const mockOutputService = adapter.getOutputService();

      mockAnalysisService.analyzeSubproject = jest.fn().mockResolvedValue({
        projectStructure: { totalFiles: 100 }
      });

      mockExecutionService.determineExecutionStrategy = jest.fn().mockResolvedValue({
        type: 'comprehensive',
        phases: []
      });

      mockExecutionService.executeAnalyzePhase = jest.fn().mockResolvedValue({
        success: true,
        analysis: {},
        recommendations: { refactor: [], generate: [] }
      });

      mockValidationService.validateOverallResults = jest.fn().mockResolvedValue({
        isValid: true,
        score: 85
      });

      mockReportService.generateComprehensiveReport = jest.fn().mockResolvedValue({
        summary: {},
        details: {}
      });

      mockOutputService.generateModeOutput = jest.fn().mockResolvedValue({
        files: [],
        reports: []
      });

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.stepName).toBe('VibeCoderModeStep');
      expect(result.result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service initialization failure', () => {
      const invalidDependencies = {
        logger: console
        // Missing required dependencies
      };

      expect(() => {
        const invalidAdapter = new VibeCoderServiceAdapter(invalidDependencies);
        invalidAdapter.initializeServices(invalidDependencies);
      }).toThrow();
    });

    it('should handle step creation without initialization', () => {
      expect(() => {
        factory.createVibeCoderAnalyzeStep();
      }).toThrow('VibeCoderStepFactory not initialized. Call initialize() first.');
    });

    it('should handle template not found', () => {
      registry.initialize(mockDependencies);
      
      expect(() => {
        registry.createStepFromTemplate('nonexistent-template', {});
      }).toThrow('VibeCoder template not found: nonexistent-template');
    });
  });
}); 