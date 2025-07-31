/**
 * Unit tests for DependencyAnalysisOrchestrator
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Test the DependencyAnalysisOrchestrator functionality
 */

const DependencyAnalysisOrchestrator = require('@domain/steps/categories/analysis/DependencyAnalysisOrchestrator');

describe('DependencyAnalysisOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new DependencyAnalysisOrchestrator();
  });

  describe('Configuration', () => {
    it('should have correct configuration', () => {
      expect(orchestrator.config.name).toBe('DependencyAnalysisOrchestrator');
      expect(orchestrator.config.type).toBe('analysis');
      expect(orchestrator.config.category).toBe('analysis');
      expect(orchestrator.config.subcategory).toBe('dependencies');
      expect(orchestrator.config.version).toBe('1.0.0');
    });

    it('should have correct settings', () => {
      expect(orchestrator.config.settings.timeout).toBe(90000);
      expect(orchestrator.config.settings.includeOutdated).toBe(true);
      expect(orchestrator.config.settings.includeVulnerabilities).toBe(true);
      expect(orchestrator.config.settings.includeUnused).toBe(true);
      expect(orchestrator.config.settings.includeLicense).toBe(true);
    });
  });

  describe('Step Loading', () => {
    it('should load dependency analysis steps', async () => {
      // Mock the step modules
      jest.doMock('./dependencies/OutdatedDependenciesStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./dependencies/VulnerableDependenciesStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./dependencies/UnusedDependenciesStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./dependencies/LicenseAnalysisStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));

      await orchestrator.loadDependencySteps();
      
      expect(orchestrator.dependencySteps).toBeDefined();
      expect(Object.keys(orchestrator.dependencySteps)).toHaveLength(4);
      expect(orchestrator.dependencySteps.OutdatedDependenciesStep).toBeDefined();
      expect(orchestrator.dependencySteps.VulnerableDependenciesStep).toBeDefined();
      expect(orchestrator.dependencySteps.UnusedDependenciesStep).toBeDefined();
      expect(orchestrator.dependencySteps.LicenseAnalysisStep).toBeDefined();
    });
  });

  describe('Score Calculation', () => {
    it('should calculate dependency health score correctly', () => {
      const results = {
        summary: {
          outdatedDependencies: [{ severity: 'medium' }],
          vulnerableDependencies: [{ severity: 'high' }],
          unusedDependencies: [],
          licenseIssues: [],
          securityIssues: [{ type: 'critical' }]
        }
      };

      const score = orchestrator.calculateDependencyHealthScore(results);
      
      // 100 - 3 (outdated) - 8 (vulnerable) - 5 (security) = 84
      expect(score).toBe(84);
    });

    it('should return minimum score of 0', () => {
      const results = {
        summary: {
          outdatedDependencies: Array(15).fill({ severity: 'high' }),
          vulnerableDependencies: Array(10).fill({ severity: 'critical' }),
          unusedDependencies: Array(20).fill({ severity: 'high' }),
          licenseIssues: Array(5).fill({ severity: 'high' }),
          securityIssues: Array(10).fill({ type: 'critical' })
        }
      };

      const score = orchestrator.calculateDependencyHealthScore(results);
      expect(score).toBe(0);
    });

    it('should return maximum score of 100', () => {
      const results = {
        summary: {
          outdatedDependencies: [],
          vulnerableDependencies: [],
          unusedDependencies: [],
          licenseIssues: [],
          securityIssues: []
        }
      };

      const score = orchestrator.calculateDependencyHealthScore(results);
      expect(score).toBe(100);
    });
  });

  describe('Execution', () => {
    it('should execute all dependency analysis steps', async () => {
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

      jest.spyOn(orchestrator, 'loadDependencySteps').mockResolvedValue(true);
      jest.spyOn(orchestrator, 'executeStep').mockResolvedValue(mockStepResult);

      const context = {
        projectId: 'test-project',
        projectPath: '/test/path',
        analysisType: 'dependencies'
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
      jest.spyOn(orchestrator, 'loadDependencySteps').mockResolvedValue(true);
      jest.spyOn(orchestrator, 'executeStep').mockRejectedValue(new Error('Step failed'));

      const context = {
        projectId: 'test-project',
        projectPath: '/test/path',
        analysisType: 'dependencies'
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.summary.failedSteps).toBeGreaterThan(0);
    });
  });

  describe('Result Format', () => {
    it('should return standardized result format', async () => {
      jest.spyOn(orchestrator, 'loadDependencySteps').mockResolvedValue(true);
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
        analysisType: 'dependencies'
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
        analysisType: 'dependencies'
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project path is required');
    });

    it('should handle step loading failures', async () => {
      jest.spyOn(orchestrator, 'loadDependencySteps').mockRejectedValue(new Error('Loading failed'));

      const context = {
        projectId: 'test-project',
        projectPath: '/test/path',
        analysisType: 'dependencies'
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Loading failed');
    });
  });

  describe('Performance', () => {
    it('should complete within timeout limit', async () => {
      jest.spyOn(orchestrator, 'loadDependencySteps').mockResolvedValue(true);
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
        analysisType: 'dependencies'
      };

      const startTime = Date.now();
      const result = await orchestrator.execute(context);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(90000); // 90 second timeout
    });
  });
}); 