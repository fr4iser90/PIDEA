/**
 * Unit tests for TechStackAnalysisOrchestrator
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Test the TechStackAnalysisOrchestrator functionality
 */

const TechStackAnalysisOrchestratorModule = require('@domain/steps/categories/analysis/TechStackAnalysisOrchestrator');

describe('TechStackAnalysisOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    // Create instance using the module's exported class
    const TechStackAnalysisOrchestrator = require('@domain/steps/StepBuilder').StepBuilder;
    orchestrator = new TechStackAnalysisOrchestrator(TechStackAnalysisOrchestratorModule.config);
  });

  describe('Configuration', () => {
    it('should have correct configuration', () => {
      expect(orchestrator.config.name).toBe('TechStackAnalysisOrchestrator');
      expect(orchestrator.config.type).toBe('analysis');
      expect(orchestrator.config.category).toBe('analysis');
      expect(orchestrator.config.subcategory).toBe('tech-stack');
      expect(orchestrator.config.version).toBe('1.0.0');
    });

    it('should have correct settings', () => {
      expect(orchestrator.config.settings.timeout).toBe(90000);
      expect(orchestrator.config.settings.includeFrameworks).toBe(true);
      expect(orchestrator.config.settings.includeLibraries).toBe(true);
      expect(orchestrator.config.settings.includeTools).toBe(true);
      expect(orchestrator.config.settings.includeVersions).toBe(true);
    });
  });

  describe('Step Loading', () => {
    it('should load tech stack analysis steps', async () => {
      // Mock the step modules
      jest.doMock('./tech-stack/FrameworkDetectionStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./tech-stack/LibraryAnalysisStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./tech-stack/ToolDetectionStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./tech-stack/VersionAnalysisStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));

      await orchestrator.loadTechStackSteps();
      
      expect(orchestrator.techStackSteps).toBeDefined();
      expect(Object.keys(orchestrator.techStackSteps)).toHaveLength(4);
      expect(orchestrator.techStackSteps.FrameworkDetectionStep).toBeDefined();
      expect(orchestrator.techStackSteps.LibraryAnalysisStep).toBeDefined();
      expect(orchestrator.techStackSteps.ToolDetectionStep).toBeDefined();
      expect(orchestrator.techStackSteps.VersionAnalysisStep).toBeDefined();
    });
  });

  describe('Score Calculation', () => {
    it('should calculate tech stack maturity score correctly', () => {
      const results = {
        issues: [
          { severity: 'medium' },
          { severity: 'high' }
        ]
      };

      const score = orchestrator.calculateTechStackMaturityScore(results);
      
      // 100 - 4 (medium) - 7 (high) = 89
      expect(score).toBe(89);
    });

    it('should return minimum score of 0', () => {
      const results = {
        issues: Array(15).fill({ severity: 'high' })
      };

      const score = orchestrator.calculateTechStackMaturityScore(results);
      expect(score).toBe(0);
    });

        it('should return maximum score of 100', () => {
      const results = {
        issues: []
      };

      const score = orchestrator.calculateTechStackMaturityScore(results);
      expect(score).toBe(100);
    });
  });

  describe('Execution', () => {
    it('should execute all tech stack analysis steps', async () => {
      // Mock step execution
      const mockStepResult = {
        success: true,
        summary: { test: 'data' },
        details: { test: 'details' },
        recommendations: ['test recommendation'],
        issues: ['test issue'],
        tasks: ['test task'],
        documentation: ['test doc']
      };

      jest.spyOn(orchestrator, 'loadTechStackSteps').mockResolvedValue(true);
      jest.spyOn(orchestrator, 'executeStep').mockResolvedValue(mockStepResult);

      const context = {
        projectId: 'test-project',
        projectPath: '/test/path',
        analysisType: 'tech-stack'
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.tasks).toBeDefined();
      expect(result.documentation).toBeDefined();
      expect(result.score).toBeDefined();
    });

    it('should handle step execution errors gracefully', async () => {
      jest.spyOn(orchestrator, 'loadTechStackSteps').mockResolvedValue(true);
      jest.spyOn(orchestrator, 'executeStep').mockRejectedValue(new Error('Step failed'));

      const context = {
        projectId: 'test-project',
        projectPath: '/test/path',
        analysisType: 'tech-stack'
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.summary.failedSteps).toBeGreaterThan(0);
    });
  });

  describe('Result Format', () => {
    it('should return standardized result format', async () => {
      jest.spyOn(orchestrator, 'loadTechStackSteps').mockResolvedValue(true);
      jest.spyOn(orchestrator, 'executeStep').mockResolvedValue({
        success: true,
        summary: { test: 'summary' },
        details: { test: 'details' },
        recommendations: ['rec1'],
        issues: ['issue1'],
        tasks: ['task1'],
        documentation: ['doc1']
      });

      const context = {
        projectId: 'test-project',
        projectPath: '/test/path',
        analysisType: 'tech-stack'
      };

      const result = await orchestrator.execute(context);

      // Check standardized format
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('documentation');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('executionTime');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project path', async () => {
      const context = {
        projectId: 'test-project',
        projectPath: null,
        analysisType: 'tech-stack'
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project path is required');
    });

    it('should handle step loading failures', async () => {
      jest.spyOn(orchestrator, 'loadTechStackSteps').mockRejectedValue(new Error('Loading failed'));

      const context = {
        projectId: 'test-project',
        projectPath: '/test/path',
        analysisType: 'tech-stack'
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Loading failed');
    });
  });

  describe('Performance', () => {
    it('should complete within timeout limit', async () => {
      jest.spyOn(orchestrator, 'loadTechStackSteps').mockResolvedValue(true);
      jest.spyOn(orchestrator, 'executeStep').mockResolvedValue({
        success: true,
        summary: {},
        details: {},
        recommendations: [],
        issues: [],
        tasks: [],
        documentation: []
      });

      const context = {
        projectId: 'test-project',
        projectPath: '/test/path',
        analysisType: 'tech-stack'
      };

      const startTime = Date.now();
      const result = await orchestrator.execute(context);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(90000); // 90 second timeout
    });
  });
}); 