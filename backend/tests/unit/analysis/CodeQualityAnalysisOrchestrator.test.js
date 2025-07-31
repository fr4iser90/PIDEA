/**
 * Unit tests for CodeQualityAnalysisOrchestrator
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Test the CodeQualityAnalysisOrchestrator functionality
 */

const CodeQualityAnalysisOrchestrator = require('@domain/steps/categories/analysis/CodeQualityAnalysisOrchestrator');

describe('CodeQualityAnalysisOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new CodeQualityAnalysisOrchestrator();
  });

  describe('Configuration', () => {
    it('should have correct configuration', () => {
      expect(orchestrator.config.name).toBe('CodeQualityAnalysisOrchestrator');
      expect(orchestrator.config.type).toBe('analysis');
      expect(orchestrator.config.category).toBe('analysis');
      expect(orchestrator.config.subcategory).toBe('code-quality');
      expect(orchestrator.config.version).toBe('1.0.0');
    });

    it('should have correct settings', () => {
      expect(orchestrator.config.settings.timeout).toBe(90000);
      expect(orchestrator.config.settings.includeLinting).toBe(true);
      expect(orchestrator.config.settings.includeComplexity).toBe(true);
      expect(orchestrator.config.settings.includeCoverage).toBe(true);
      expect(orchestrator.config.settings.includeDocumentation).toBe(true);
    });
  });

  describe('Step Loading', () => {
    it('should load code quality steps', async () => {
      // Mock the step modules
      jest.doMock('./code-quality/LintingCodeQualityStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./code-quality/ComplexityCodeQualityStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./code-quality/CoverageCodeQualityStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));
      jest.doMock('./code-quality/DocumentationCodeQualityStep', () => ({
        execute: jest.fn().mockResolvedValue({ success: true })
      }));

      await orchestrator.loadCodeQualitySteps();
      
      expect(orchestrator.codeQualitySteps).toBeDefined();
      expect(Object.keys(orchestrator.codeQualitySteps)).toHaveLength(4);
      expect(orchestrator.codeQualitySteps.LintingCodeQualityStep).toBeDefined();
      expect(orchestrator.codeQualitySteps.ComplexityCodeQualityStep).toBeDefined();
      expect(orchestrator.codeQualitySteps.CoverageCodeQualityStep).toBeDefined();
      expect(orchestrator.codeQualitySteps.DocumentationCodeQualityStep).toBeDefined();
    });
  });

  describe('Score Calculation', () => {
    it('should calculate code quality score correctly', () => {
      const results = {
        summary: {
          lintingIssues: [{ severity: 'warning' }],
          complexityIssues: [{ severity: 'high' }],
          coverageIssues: [],
          documentationIssues: [],
          bestPractices: [{ type: 'good' }]
        }
      };

      const score = orchestrator.calculateCodeQualityScore(results);
      
      // 100 - 5 (linting) - 8 (complexity) + 2 (best practices) = 89
      expect(score).toBe(89);
    });

    it('should return minimum score of 0', () => {
      const results = {
        summary: {
          lintingIssues: Array(20).fill({ severity: 'error' }),
          complexityIssues: Array(10).fill({ severity: 'high' }),
          coverageIssues: Array(10).fill({ severity: 'high' }),
          documentationIssues: [],
          bestPractices: []
        }
      };

      const score = orchestrator.calculateCodeQualityScore(results);
      expect(score).toBe(0);
    });

    it('should return maximum score of 100', () => {
      const results = {
        summary: {
          lintingIssues: [],
          complexityIssues: [],
          coverageIssues: [],
          documentationIssues: [],
          bestPractices: Array(50).fill({ type: 'good' })
        }
      };

      const score = orchestrator.calculateCodeQualityScore(results);
      expect(score).toBe(100);
    });
  });

  describe('Execution', () => {
    it('should execute successfully with valid context', async () => {
      const context = {
        projectPath: '/test/project',
        projectId: 'test-123'
      };

      // Mock the step loading
      orchestrator.loadCodeQualitySteps = jest.fn().mockResolvedValue(true);
      
      // Mock individual step execution
      orchestrator.codeQualitySteps = {
        LintingCodeQualityStep: {
          execute: jest.fn().mockResolvedValue({
            success: true,
            lintingIssues: [],
            recommendations: []
          })
        },
        ComplexityCodeQualityStep: {
          execute: jest.fn().mockResolvedValue({
            success: true,
            complexityIssues: [],
            recommendations: []
          })
        },
        CoverageCodeQualityStep: {
          execute: jest.fn().mockResolvedValue({
            success: true,
            coverageIssues: [],
            recommendations: []
          })
        },
        DocumentationCodeQualityStep: {
          execute: jest.fn().mockResolvedValue({
            success: true,
            documentationIssues: [],
            recommendations: []
          })
        }
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(true);
      expect(result.result.summary.totalSteps).toBe(4);
      expect(result.result.summary.completedSteps).toBe(4);
      expect(result.result.summary.failedSteps).toBe(0);
      expect(result.metadata.type).toBe('code-quality-analysis');
      expect(result.metadata.category).toBe('code-quality');
    });

    it('should handle step execution errors gracefully', async () => {
      const context = {
        projectPath: '/test/project',
        projectId: 'test-123'
      };

      // Mock the step loading
      orchestrator.loadCodeQualitySteps = jest.fn().mockResolvedValue(true);
      
      // Mock step execution with one failure
      orchestrator.codeQualitySteps = {
        LintingCodeQualityStep: {
          execute: jest.fn().mockRejectedValue(new Error('Linting failed'))
        },
        ComplexityCodeQualityStep: {
          execute: jest.fn().mockResolvedValue({
            success: true,
            complexityIssues: [],
            recommendations: []
          })
        },
        CoverageCodeQualityStep: {
          execute: jest.fn().mockResolvedValue({
            success: true,
            coverageIssues: [],
            recommendations: []
          })
        },
        DocumentationCodeQualityStep: {
          execute: jest.fn().mockResolvedValue({
            success: true,
            documentationIssues: [],
            recommendations: []
          })
        }
      };

      const result = await orchestrator.execute(context);

      expect(result.success).toBe(true);
      expect(result.result.summary.totalSteps).toBe(4);
      expect(result.result.summary.completedSteps).toBe(3);
      expect(result.result.summary.failedSteps).toBe(1);
      expect(result.result.details.LintingCodeQualityStep.error).toBe('Linting failed');
    });
  });
}); 