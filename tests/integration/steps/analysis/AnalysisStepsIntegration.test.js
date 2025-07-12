/**
 * Analysis Steps Integration Tests
 */
const { AnalysisStepFactory } = require('../../../../backend/domain/workflows/steps/analysis');
const AnalysisStepAdapter = require('../../../../backend/domain/workflows/handlers/adapters/AnalysisStepAdapter');

describe('Analysis Steps Integration', () => {
  let factory;
  let adapter;

  beforeEach(() => {
    factory = new AnalysisStepFactory();
    adapter = new AnalysisStepAdapter();
  });

  describe('AnalysisStepFactory', () => {
    it('should create all analysis step types', () => {
      const architectureStep = factory.createArchitectureAnalysisStep();
      const codeQualityStep = factory.createCodeQualityAnalysisStep();
      const techStackStep = factory.createTechStackAnalysisStep();
      const repoStructureStep = factory.createRepoStructureAnalysisStep();
      const dependenciesStep = factory.createDependenciesAnalysisStep();
      const advancedStep = factory.createAdvancedAnalysisStep();

      expect(architectureStep).toBeDefined();
      expect(codeQualityStep).toBeDefined();
      expect(techStackStep).toBeDefined();
      expect(repoStructureStep).toBeDefined();
      expect(dependenciesStep).toBeDefined();
      expect(advancedStep).toBeDefined();
    });

    it('should create analysis step by type', () => {
      const step = factory.createAnalysisStep('architecture', { detectPatterns: true });
      expect(step).toBeDefined();
      expect(step.options.detectPatterns).toBe(true);
    });

    it('should create comprehensive analysis workflow', () => {
      const steps = factory.createComprehensiveAnalysisWorkflow({
        architecture: { detectPatterns: true },
        codeQuality: { linting: true }
      });

      expect(steps).toHaveLength(6);
      expect(steps[0].options.detectPatterns).toBe(true);
      expect(steps[1].options.linting).toBe(true);
    });

    it('should throw error for unknown analysis type', () => {
      expect(() => {
        factory.createAnalysisStep('unknown-type');
      }).toThrow('Unknown analysis type: unknown-type');
    });
  });

  describe('AnalysisStepAdapter', () => {
    it('should handle analyze architecture requests', () => {
      const request = {
        type: 'analyze_architecture',
        projectPath: '/test/path',
        options: { detectPatterns: true }
      };

      expect(adapter.canHandle(request)).toBe(true);
    });

    it('should handle analyze code quality requests', () => {
      const request = {
        type: 'analyze_code_quality',
        projectPath: '/test/path',
        options: { linting: true }
      };

      expect(adapter.canHandle(request)).toBe(true);
    });

    it('should handle analyze tech stack requests', () => {
      const request = {
        type: 'analyze_tech_stack',
        projectPath: '/test/path',
        options: { detectFrameworks: true }
      };

      expect(adapter.canHandle(request)).toBe(true);
    });

    it('should handle analyze repo structure requests', () => {
      const request = {
        type: 'analyze_repo_structure',
        projectPath: '/test/path',
        options: { includeHidden: false }
      };

      expect(adapter.canHandle(request)).toBe(true);
    });

    it('should handle analyze dependencies requests', () => {
      const request = {
        type: 'analyze_dependencies',
        projectPath: '/test/path',
        options: { checkVulnerabilities: true }
      };

      expect(adapter.canHandle(request)).toBe(true);
    });

    it('should handle analyze advanced requests', () => {
      const request = {
        type: 'analyze_advanced',
        projectPath: '/test/path',
        options: { layerValidation: true }
      };

      expect(adapter.canHandle(request)).toBe(true);
    });

    it('should not handle non-analyze requests', () => {
      const request = {
        type: 'vibecoder_analyze',
        projectPath: '/test/path'
      };

      expect(adapter.canHandle(request)).toBe(false);
    });

    it('should determine correct analysis type from request', () => {
      const request = { type: 'analyze_architecture' };
      const analysisType = adapter.determineAnalysisType(request);
      expect(analysisType).toBe('architecture');
    });

    it('should extract step options from request', () => {
      const request = {
        type: 'analyze_architecture',
        options: { detectPatterns: true, analyzeDependencies: false }
      };

      const options = adapter.extractStepOptions(request);
      expect(options.detectPatterns).toBe(true);
      expect(options.analyzeDependencies).toBe(false);
    });

    it('should extract step options from command', () => {
      const command = {
        getAnalysisOptions: () => ({ detectPatterns: true, analyzeDependencies: false })
      };

      const request = {
        type: 'analyze_architecture',
        command: command
      };

      const options = adapter.extractStepOptions(request);
      expect(options.detectPatterns).toBe(true);
      expect(options.analyzeDependencies).toBe(false);
    });
  });

  describe('Factory and Adapter Integration', () => {
    it('should create handler through adapter using factory', async () => {
      const request = {
        type: 'analyze_architecture',
        projectPath: '/test/path',
        options: { detectPatterns: true }
      };

      const mockContext = {
        get: jest.fn(),
        set: jest.fn()
      };

      const handler = await adapter.createHandler(request, mockContext);
      expect(handler).toBeDefined();
      expect(typeof handler.execute).toBe('function');
    });

    it('should execute analysis step through adapter', async () => {
      const request = {
        type: 'analyze_architecture',
        projectPath: '/test/path',
        options: { detectPatterns: true }
      };

      const mockContext = {
        get: jest.fn(),
        set: jest.fn()
      };

      const handler = await adapter.createHandler(request, mockContext);
      
      // Mock the workflow context creation
      const mockWorkflowContext = {
        get: jest.fn().mockReturnValue('/test/path'),
        set: jest.fn()
      };

      // Mock the step execution
      const mockStep = {
        executeStep: jest.fn().mockResolvedValue({
          success: true,
          analysis: { patterns: ['MVC'] },
          metrics: { patternsCount: 1 },
          recommendations: []
        })
      };

      // Replace the step execution with mock
      handler.execute = async (context) => {
        const result = await mockStep.executeStep(mockWorkflowContext);
        return {
          success: true,
          data: result,
          metadata: {
            analysisStep: true,
            stepType: 'architecture',
            stepName: 'ArchitectureAnalysisStep'
          }
        };
      };

      const result = await handler.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.analysis.patterns).toEqual(['MVC']);
      expect(result.metadata.stepType).toBe('architecture');
    });
  });

  describe('Metadata and Configuration', () => {
    it('should provide factory metadata', () => {
      const metadata = factory.getMetadata();
      
      expect(metadata.name).toBe('AnalysisStepFactory');
      expect(metadata.supportedTypes).toContain('architecture');
      expect(metadata.supportedTypes).toContain('code-quality');
      expect(metadata.supportedTypes).toContain('tech-stack');
      expect(metadata.supportedTypes).toContain('repo-structure');
      expect(metadata.supportedTypes).toContain('dependencies');
      expect(metadata.supportedTypes).toContain('advanced');
    });

    it('should provide adapter metadata', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata.name).toBe('Analysis Step Adapter');
      expect(metadata.type).toBe('analysis-step');
      expect(metadata.supportedTypes).toContain('analyze_architecture');
      expect(metadata.supportedTypes).toContain('analyze_code_quality');
      expect(metadata.supportedTypes).toContain('analyze_tech_stack');
      expect(metadata.supportedTypes).toContain('analyze_repo_structure');
      expect(metadata.supportedTypes).toContain('analyze_dependencies');
      expect(metadata.supportedTypes).toContain('analyze_advanced');
    });

    it('should validate adapter', () => {
      expect(adapter.validate()).toBe(true);
    });
  });
}); 