/**
 * VibeCoder Workflow Integration Tests
 * 
 * These tests verify the complete integration of the VibeCoder workflow system,
 * including steps, adapters, controllers, and API endpoints.
 */
const request = require('supertest');
const path = require('path');

// Import VibeCoder components
const {
  VibeCoderStepFactory,
  VibeCoderStepRegistry,
  VibeCoderServiceAdapter
} = require('../../../backend/domain/workflows/steps/vibecoder');

const VibeCoderStepAdapter = require('../../../backend/domain/workflows/handlers/adapters/VibeCoderStepAdapter');
const VibeCoderController = require('../../../backend/presentation/api/VibeCoderController');

// Mock dependencies
const mockEventBus = {
  publish: jest.fn(),
  subscribe: jest.fn()
};

const mockCommandBus = {
  execute: jest.fn(),
  register: jest.fn()
};

const mockAnalysisRepository = {
  save: jest.fn(),
  findById: jest.fn(),
  findByProjectId: jest.fn()
};

const mockTaskRepository = {
  save: jest.fn(),
  findById: jest.fn(),
  findByProjectId: jest.fn()
};

const mockCursorIDEService = {
  analyzeProject: jest.fn(),
  generateCode: jest.fn(),
  refactorCode: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

describe('VibeCoder Workflow Integration', () => {
  let stepFactory;
  let stepRegistry;
  let serviceAdapter;
  let stepAdapter;
  let controller;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Initialize components
    stepFactory = new VibeCoderStepFactory();
    stepRegistry = new VibeCoderStepRegistry();
    serviceAdapter = new VibeCoderServiceAdapter();
    stepAdapter = new VibeCoderStepAdapter();

    // Initialize with dependencies
    const dependencies = {
      logger: mockLogger,
      eventBus: mockEventBus,
      commandBus: mockCommandBus,
      analysisRepository: mockAnalysisRepository,
      taskRepository: mockTaskRepository,
      cursorIDEService: mockCursorIDEService
    };

    stepRegistry.initialize(dependencies);
    serviceAdapter.initialize(dependencies);
    stepAdapter.initialize(dependencies);

    controller = new VibeCoderController(dependencies);
  });

  describe('VibeCoderStepFactory Integration', () => {
    test('should create all VibeCoder step types', async () => {
      const dependencies = {
        logger: mockLogger,
        eventBus: mockEventBus,
        commandBus: mockCommandBus,
        analysisRepository: mockAnalysisRepository,
        taskRepository: mockTaskRepository,
        cursorIDEService: mockCursorIDEService
      };

      // Test creating each step type
      const analyzeStep = await stepFactory.createVibeCoderAnalyzeStep(dependencies);
      const generateStep = await stepFactory.createVibeCoderGenerateStep(dependencies);
      const refactorStep = await stepFactory.createVibeCoderRefactorStep(dependencies);
      const modeStep = await stepFactory.createVibeCoderModeStep(dependencies);

      expect(analyzeStep).toBeDefined();
      expect(generateStep).toBeDefined();
      expect(refactorStep).toBeDefined();
      expect(modeStep).toBeDefined();

      expect(analyzeStep.getType()).toBe('analyze');
      expect(generateStep.getType()).toBe('generate');
      expect(refactorStep.getType()).toBe('refactor');
      expect(modeStep.getType()).toBe('mode');
    });

    test('should create comprehensive workflow', async () => {
      const dependencies = {
        logger: mockLogger,
        eventBus: mockEventBus,
        commandBus: mockCommandBus,
        analysisRepository: mockAnalysisRepository,
        taskRepository: mockTaskRepository,
        cursorIDEService: mockCursorIDEService
      };

      const workflow = await stepFactory.createComprehensiveVibeCoderWorkflow(dependencies);

      expect(workflow).toBeDefined();
      expect(workflow.getType()).toBe('mode');
      expect(workflow.getName()).toContain('Comprehensive');
    });
  });

  describe('VibeCoderStepRegistry Integration', () => {
    test('should register and list all VibeCoder steps', () => {
      const steps = stepRegistry.listSteps();
      const templates = stepRegistry.listTemplates();

      expect(steps).toContain('vibecoder-analyze');
      expect(steps).toContain('vibecoder-generate');
      expect(steps).toContain('vibecoder-refactor');
      expect(steps).toContain('vibecoder-mode');

      expect(templates).toContain('vibecoder-comprehensive');
      expect(templates).toContain('vibecoder-analyze-only');
      expect(templates).toContain('vibecoder-generate-only');
      expect(templates).toContain('vibecoder-refactor-only');
    });

    test('should create steps from registry', async () => {
      const dependencies = {
        logger: mockLogger,
        eventBus: mockEventBus,
        commandBus: mockCommandBus,
        analysisRepository: mockAnalysisRepository,
        taskRepository: mockTaskRepository,
        cursorIDEService: mockCursorIDEService
      };

      const analyzeStep = await stepRegistry.createStep('vibecoder-analyze', dependencies);
      const generateStep = await stepRegistry.createStep('vibecoder-generate', dependencies);

      expect(analyzeStep).toBeDefined();
      expect(generateStep).toBeDefined();
      expect(analyzeStep.getType()).toBe('analyze');
      expect(generateStep.getType()).toBe('generate');
    });

    test('should create templates from registry', async () => {
      const dependencies = {
        logger: mockLogger,
        eventBus: mockEventBus,
        commandBus: mockCommandBus,
        analysisRepository: mockAnalysisRepository,
        taskRepository: mockTaskRepository,
        cursorIDEService: mockCursorIDEService
      };

      const comprehensiveTemplate = await stepRegistry.createTemplate('vibecoder-comprehensive', dependencies);
      const analyzeTemplate = await stepRegistry.createTemplate('vibecoder-analyze-only', dependencies);

      expect(comprehensiveTemplate).toBeDefined();
      expect(analyzeTemplate).toBeDefined();
    });
  });

  describe('VibeCoderServiceAdapter Integration', () => {
    test('should adapt existing services to workflow steps', async () => {
      const dependencies = {
        logger: mockLogger,
        eventBus: mockEventBus,
        commandBus: mockCommandBus,
        analysisRepository: mockAnalysisRepository,
        taskRepository: mockTaskRepository,
        cursorIDEService: mockCursorIDEService
      };

      // Test service adapter with analyze step
      const analyzeStep = await stepFactory.createVibeCoderAnalyzeStep(dependencies);
      const adaptedServices = serviceAdapter.adaptServices(dependencies);

      expect(adaptedServices).toBeDefined();
      expect(adaptedServices.analysisService).toBeDefined();
      expect(adaptedServices.securityService).toBeDefined();
      expect(adaptedServices.recommendationService).toBeDefined();
    });

    test('should provide service validation', async () => {
      const dependencies = {
        logger: mockLogger,
        eventBus: mockEventBus,
        commandBus: mockCommandBus,
        analysisRepository: mockAnalysisRepository,
        taskRepository: mockTaskRepository,
        cursorIDEService: mockCursorIDEService
      };

      const validation = await serviceAdapter.validateServices(dependencies);

      expect(validation.isValid).toBe(true);
      expect(validation.services).toBeDefined();
      expect(validation.missingServices).toEqual([]);
    });
  });

  describe('VibeCoderStepAdapter Integration', () => {
    test('should handle VibeCoder requests', async () => {
      const request = {
        type: 'vibecoder_analyze',
        projectId: 'test-project',
        options: { includeMetrics: true }
      };

      const context = {
        getRequest: () => request,
        getResponse: () => ({}),
        getServices: () => ({
          logger: mockLogger,
          eventBus: mockEventBus,
          commandBus: mockCommandBus,
          analysisRepository: mockAnalysisRepository,
          taskRepository: mockTaskRepository,
          cursorIDEService: mockCursorIDEService
        }),
        getLogger: () => mockLogger,
        getMetadata: () => ({ projectId: 'test-project' })
      };

      const canHandle = stepAdapter.canHandle(request);
      expect(canHandle).toBe(true);

      const handler = await stepAdapter.createHandler(request, context);
      expect(handler).toBeDefined();
      expect(handler.getType()).toBe('vibecoder_step');
    });

    test('should determine correct step type from request', () => {
      const analyzeRequest = { type: 'vibecoder_analyze' };
      const generateRequest = { type: 'vibecoder_generate' };
      const refactorRequest = { type: 'vibecoder_refactor' };
      const modeRequest = { type: 'vibecoder_mode' };

      expect(stepAdapter.determineStepType(analyzeRequest)).toBe('analyze');
      expect(stepAdapter.determineStepType(generateRequest)).toBe('generate');
      expect(stepAdapter.determineStepType(refactorRequest)).toBe('refactor');
      expect(stepAdapter.determineStepType(modeRequest)).toBe('mode');
    });

    test('should validate VibeCoder requests', async () => {
      const validRequest = { type: 'vibecoder_analyze' };
      const invalidRequest = { type: 'invalid_type' };

      const validValidation = await stepAdapter.validateRequest(validRequest);
      const invalidValidation = await stepAdapter.validateRequest(invalidRequest);

      expect(validValidation.isValid).toBe(true);
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.errors).toContain('Request type must start with vibecoder_');
    });
  });

  describe('VibeCoderController Integration', () => {
    test('should handle analyze operation', async () => {
      const req = {
        params: { projectId: 'test-project' },
        body: { options: { includeMetrics: true } }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock step execution
      jest.spyOn(stepFactory, 'createVibeCoderAnalyzeStep').mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          analysis: { metrics: {}, insights: [] },
          recommendations: []
        })
      });

      await controller.analyze(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
          metadata: expect.objectContaining({
            operation: 'vibecoder_analyze',
            projectId: 'test-project'
          })
        })
      );
    });

    test('should handle generate operation', async () => {
      const req = {
        params: { projectId: 'test-project' },
        body: { options: { feature: 'new-feature' } }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock step execution
      jest.spyOn(stepFactory, 'createVibeCoderGenerateStep').mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          generatedCode: 'console.log("Hello World");',
          files: ['new-file.js']
        })
      });

      await controller.generate(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
          metadata: expect.objectContaining({
            operation: 'vibecoder_generate',
            projectId: 'test-project'
          })
        })
      );
    });

    test('should handle refactor operation', async () => {
      const req = {
        params: { projectId: 'test-project' },
        body: { options: { improveQuality: true } }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock step execution
      jest.spyOn(stepFactory, 'createVibeCoderRefactorStep').mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          refactoredFiles: ['file1.js', 'file2.js'],
          improvements: ['code-quality', 'performance']
        })
      });

      await controller.refactor(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
          metadata: expect.objectContaining({
            operation: 'vibecoder_refactor',
            projectId: 'test-project'
          })
        })
      );
    });

    test('should handle mode operation', async () => {
      const req = {
        params: { projectId: 'test-project' },
        body: { options: { comprehensive: true } }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock step execution
      jest.spyOn(stepFactory, 'createVibeCoderModeStep').mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          analysis: { comprehensive: true },
          refactoring: { improvements: [] },
          generation: { newFeatures: [] }
        })
      });

      await controller.mode(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
          metadata: expect.objectContaining({
            operation: 'vibecoder_mode',
            projectId: 'test-project'
          })
        })
      );
    });

    test('should handle error cases', async () => {
      const req = {
        params: { projectId: 'test-project' },
        body: { options: {} }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock step execution to throw error
      jest.spyOn(stepFactory, 'createVibeCoderAnalyzeStep').mockRejectedValue(
        new Error('Test error')
      );

      await controller.analyze(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Test error',
          metadata: expect.objectContaining({
            operation: 'vibecoder_analyze',
            projectId: 'test-project'
          })
        })
      );
    });

    test('should provide health check', async () => {
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock health checks
      jest.spyOn(stepFactory, 'isHealthy').mockResolvedValue(true);
      jest.spyOn(stepRegistry, 'isHealthy').mockResolvedValue(true);

      await controller.healthCheck(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'healthy',
            components: expect.objectContaining({
              stepFactory: true,
              stepRegistry: true,
              eventBus: true,
              commandBus: true,
              analysisRepository: true,
              taskRepository: true,
              cursorIDEService: true
            })
          })
        })
      );
    });

    test('should provide available steps', async () => {
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await controller.getAvailableSteps(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            steps: expect.any(Array),
            templates: expect.any(Array)
          })
        })
      );
    });
  });

  describe('End-to-End Workflow Integration', () => {
    test('should execute complete VibeCoder workflow', async () => {
      const dependencies = {
        logger: mockLogger,
        eventBus: mockEventBus,
        commandBus: mockCommandBus,
        analysisRepository: mockAnalysisRepository,
        taskRepository: mockTaskRepository,
        cursorIDEService: mockCursorIDEService
      };

      // Create comprehensive workflow
      const workflow = await stepFactory.createComprehensiveVibeCoderWorkflow(dependencies);

      // Prepare workflow context
      const context = {
        request: { projectId: 'test-project', options: { comprehensive: true } },
        response: {},
        services: dependencies,
        metadata: { projectId: 'test-project', operation: 'comprehensive' }
      };

      // Execute workflow
      const result = await workflow.execute(context);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should handle workflow with error recovery', async () => {
      const dependencies = {
        logger: mockLogger,
        eventBus: mockEventBus,
        commandBus: mockCommandBus,
        analysisRepository: mockAnalysisRepository,
        taskRepository: mockTaskRepository,
        cursorIDEService: mockCursorIDEService
      };

      // Mock service to throw error
      mockCursorIDEService.analyzeProject.mockRejectedValue(new Error('Service error'));

      // Create analyze step
      const analyzeStep = await stepFactory.createVibeCoderAnalyzeStep(dependencies);

      const context = {
        request: { projectId: 'test-project' },
        response: {},
        services: dependencies,
        metadata: { projectId: 'test-project' }
      };

      // Execute step with error
      const result = await analyzeStep.execute(context);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent operations', async () => {
      const dependencies = {
        logger: mockLogger,
        eventBus: mockEventBus,
        commandBus: mockCommandBus,
        analysisRepository: mockAnalysisRepository,
        taskRepository: mockTaskRepository,
        cursorIDEService: mockCursorIDEService
      };

      // Create multiple steps
      const analyzeStep = await stepFactory.createVibeCoderAnalyzeStep(dependencies);
      const generateStep = await stepFactory.createVibeCoderGenerateStep(dependencies);

      const context = {
        request: { projectId: 'test-project' },
        response: {},
        services: dependencies,
        metadata: { projectId: 'test-project' }
      };

      // Execute concurrent operations
      const [analyzeResult, generateResult] = await Promise.all([
        analyzeStep.execute(context),
        generateStep.execute(context)
      ]);

      expect(analyzeResult).toBeDefined();
      expect(generateResult).toBeDefined();
    });

    test('should validate performance requirements', async () => {
      const dependencies = {
        logger: mockLogger,
        eventBus: mockEventBus,
        commandBus: mockCommandBus,
        analysisRepository: mockAnalysisRepository,
        taskRepository: mockTaskRepository,
        cursorIDEService: mockCursorIDEService
      };

      const analyzeStep = await stepFactory.createVibeCoderAnalyzeStep(dependencies);

      const context = {
        request: { projectId: 'test-project' },
        response: {},
        services: dependencies,
        metadata: { projectId: 'test-project' }
      };

      const startTime = Date.now();
      await analyzeStep.execute(context);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(120000); // < 120 seconds
    });
  });
}); 