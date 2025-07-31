/**
 * Unit tests for ManifestAnalysisOrchestrator
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Test the ManifestAnalysisOrchestrator functionality
 */

const ManifestAnalysisOrchestrator = require('@domain/steps/categories/analysis/ManifestAnalysisOrchestrator');

describe('ManifestAnalysisOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new ManifestAnalysisOrchestrator();
  });

  describe('Configuration', () => {
    it('should have correct configuration', () => {
      expect(orchestrator.config.name).toBe('ManifestAnalysisOrchestrator');
      expect(orchestrator.config.type).toBe('analysis');
      expect(orchestrator.config.category).toBe('analysis');
      expect(orchestrator.config.subcategory).toBe('manifest');
      expect(orchestrator.config.version).toBe('1.0.0');
    });

    it('should have correct settings', () => {
      expect(orchestrator.config.settings.timeout).toBe(90000);
      expect(orchestrator.config.settings.includePackageJson).toBe(true);
      expect(orchestrator.config.settings.includeConfigFiles).toBe(true);
      expect(orchestrator.config.settings.includeDockerFiles).toBe(true);
      expect(orchestrator.config.settings.includeCIFiles).toBe(true);
    });
  });

  describe('Step Loading', () => {
    it('should load manifest analysis steps', async () => {
      // Mock the step modules
      jest.doMock('./manifest/PackageJsonAnalysisStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./manifest/DockerfileAnalysisStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./manifest/CIConfigAnalysisStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./manifest/EnvironmentAnalysisStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));

      await orchestrator.loadManifestSteps();
      
      expect(orchestrator.manifestSteps).toBeDefined();
      expect(Object.keys(orchestrator.manifestSteps)).toHaveLength(4);
      expect(orchestrator.manifestSteps.PackageJsonAnalysisStep).toBeDefined();
      expect(orchestrator.manifestSteps.DockerfileAnalysisStep).toBeDefined();
      expect(orchestrator.manifestSteps.CIConfigAnalysisStep).toBeDefined();
      expect(orchestrator.manifestSteps.EnvironmentAnalysisStep).toBeDefined();
    });
  });

  describe('Score Calculation', () => {
    it('should calculate manifest quality score correctly', () => {
      const results = {
        summary: {
          packageJsonIssues: [{ severity: 'medium' }],
          dockerfileIssues: [{ severity: 'high' }],
          ciConfigIssues: [],
          environmentIssues: [],
          bestPractices: [{ type: 'good' }]
        }
      };

      const score = orchestrator.calculateManifestQualityScore(results);
      
      // 100 - 3 (package.json) - 8 (dockerfile) + 2 (best practices) = 91
      expect(score).toBe(91);
    });

    it('should return minimum score of 0', () => {
      const results = {
        summary: {
          packageJsonIssues: Array(15).fill({ severity: 'high' }),
          dockerfileIssues: Array(10).fill({ severity: 'critical' }),
          ciConfigIssues: Array(8).fill({ severity: 'high' }),
          environmentIssues: Array(5).fill({ severity: 'high' }),
          bestPractices: []
        }
      };

      const score = orchestrator.calculateManifestQualityScore(results);
      expect(score).toBe(0);
    });

    it('should return maximum score of 100', () => {
      const results = {
        summary: {
          packageJsonIssues: [],
          dockerfileIssues: [],
          ciConfigIssues: [],
          environmentIssues: [],
          bestPractices: []
        }
      };

      const score = orchestrator.calculateManifestQualityScore(results);
      expect(score).toBe(100);
    });
  });

  describe('Execution', () => {
    it('should execute all manifest analysis steps', async () => {
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

      jest.spyOn(orchestrator, 'loadManifestSteps').mockResolvedValue(true);
      jest.spyOn(orchestrator, 'executeStep').mockResolvedValue(mockStepResult);

      const context = {
        projectId: 'test-project',
        projectPath: '/test/path',
        analysisType: 'manifest'
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
      jest.spyOn(orchestrator, 'loadManifestSteps').mockResolvedValue(true);
      jest.spyOn(orchestrator, 'executeStep').mockRejectedValue(new Error('Step failed'));

      const context = {
        projectId: 'test-project',
        projectPath: '/test/path',
        analysisType: 'manifest'
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.summary.failedSteps).toBeGreaterThan(0);
    });
  });

  describe('Result Format', () => {
    it('should return standardized result format', async () => {
      jest.spyOn(orchestrator, 'loadManifestSteps').mockResolvedValue(true);
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
        analysisType: 'manifest'
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
        analysisType: 'manifest'
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project path is required');
    });

    it('should handle step loading failures', async () => {
      jest.spyOn(orchestrator, 'loadManifestSteps').mockRejectedValue(new Error('Loading failed'));

      const context = {
        projectId: 'test-project',
        projectPath: '/test/path',
        analysisType: 'manifest'
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Loading failed');
    });
  });

  describe('Performance', () => {
    it('should complete within timeout limit', async () => {
      jest.spyOn(orchestrator, 'loadManifestSteps').mockResolvedValue(true);
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
        analysisType: 'manifest'
      };

      const startTime = Date.now();
      const result = await orchestrator.execute(context);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(90000); // 90 second timeout
    });
  });
}); 