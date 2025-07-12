/**
 * DependenciesAnalysisStep Unit Tests
 */
const DependenciesAnalysisStep = require('../../../../backend/domain/workflows/steps/analysis/DependenciesAnalysisStep');

describe('DependenciesAnalysisStep', () => {
  let step;
  let mockContext;

  beforeEach(() => {
    step = new DependenciesAnalysisStep({
      analyzeDirectDependencies: true,
      analyzeTransitiveDependencies: true,
      analyzeDevDependencies: true,
      analyzePeerDependencies: true,
      analyzeOptionalDependencies: true,
      analyzeDependencyConflicts: true,
      analyzeSecurityVulnerabilities: true,
      analyzeOutdatedDependencies: true,
      analyzeUnusedDependencies: true,
      analyzeCircularDependencies: true
    });

    mockContext = {
      get: jest.fn(),
      set: jest.fn()
    };
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const defaultStep = new DependenciesAnalysisStep();
      expect(defaultStep.options.analyzeDirectDependencies).toBe(true);
      expect(defaultStep.options.analyzeTransitiveDependencies).toBe(true);
      expect(defaultStep.options.analyzeDevDependencies).toBe(true);
      expect(defaultStep.options.analyzePeerDependencies).toBe(true);
      expect(defaultStep.options.analyzeOptionalDependencies).toBe(true);
      expect(defaultStep.options.analyzeDependencyConflicts).toBe(true);
      expect(defaultStep.options.analyzeSecurityVulnerabilities).toBe(true);
      expect(defaultStep.options.analyzeOutdatedDependencies).toBe(true);
      expect(defaultStep.options.analyzeUnusedDependencies).toBe(true);
      expect(defaultStep.options.analyzeCircularDependencies).toBe(true);
    });

    it('should create an instance with custom options', () => {
      const customStep = new DependenciesAnalysisStep({
        analyzeDirectDependencies: false,
        analyzeTransitiveDependencies: false,
        analyzeSecurityVulnerabilities: false
      });
      expect(customStep.options.analyzeDirectDependencies).toBe(false);
      expect(customStep.options.analyzeTransitiveDependencies).toBe(false);
      expect(customStep.options.analyzeSecurityVulnerabilities).toBe(false);
      expect(customStep.options.analyzeDevDependencies).toBe(true); // default
    });
  });

  describe('executeStep', () => {
    it('should throw error when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Project path not found in context'
      );
    });

    it('should throw error when dependencies analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // dependenciesAnalyzer

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Dependencies analyzer not found in context'
      );
    });

    it('should execute successfully with valid context', async () => {
      const mockDependenciesAnalyzer = {
        analyzeDependencies: jest.fn().mockResolvedValue({
          directDependencies: {
            'express': '^4.18.2',
            'lodash': '^4.17.21',
            'axios': '^1.6.0'
          },
          devDependencies: {
            'jest': '^29.7.0',
            'eslint': '^8.55.0'
          },
          peerDependencies: {
            'react': '^18.0.0'
          },
          optionalDependencies: {},
          transitiveDependencies: {
            'express': ['body-parser', 'cookie-parser'],
            'lodash': [],
            'axios': ['follow-redirects']
          },
          conflicts: [],
          vulnerabilities: [
            {
              package: 'lodash',
              severity: 'high',
              description: 'Prototype pollution vulnerability'
            }
          ],
          outdated: [
            {
              package: 'express',
              current: '4.18.2',
              latest: '4.18.3',
              type: 'patch'
            }
          ],
          unused: ['moment'],
          circular: [],
          metrics: {
            totalDependencies: 8,
            directDependenciesCount: 3,
            devDependenciesCount: 2,
            peerDependenciesCount: 1,
            optionalDependenciesCount: 0,
            transitiveDependenciesCount: 3,
            vulnerabilitiesCount: 1,
            outdatedCount: 1,
            unusedCount: 1,
            circularCount: 0
          }
        })
      };

      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(mockDependenciesAnalyzer) // dependenciesAnalyzer
        .mockReturnValueOnce(console); // logger

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(mockDependenciesAnalyzer.analyzeDependencies).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should return valid result with proper context', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce({}); // dependenciesAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid result when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project path is required for dependencies analysis');
    });

    it('should return invalid result when dependencies analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // dependenciesAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dependencies analyzer is required for dependencies analysis');
    });
  });

  describe('generateMetrics', () => {
    it('should generate metrics from analysis result', () => {
      const analysis = {
        directDependencies: {
          'express': '^4.18.2',
          'lodash': '^4.17.21',
          'axios': '^1.6.0'
        },
        devDependencies: {
          'jest': '^29.7.0',
          'eslint': '^8.55.0'
        },
        peerDependencies: {
          'react': '^18.0.0'
        },
        optionalDependencies: {},
        transitiveDependencies: {
          'express': ['body-parser', 'cookie-parser'],
          'lodash': [],
          'axios': ['follow-redirects']
        },
        conflicts: [],
        vulnerabilities: [
          {
            package: 'lodash',
            severity: 'high',
            description: 'Prototype pollution vulnerability'
          }
        ],
        outdated: [
          {
            package: 'express',
            current: '4.18.2',
            latest: '4.18.3',
            type: 'patch'
          }
        ],
        unused: ['moment'],
        circular: [],
        metrics: {
          totalDependencies: 8,
          directDependenciesCount: 3,
          devDependenciesCount: 2,
          peerDependenciesCount: 1,
          optionalDependenciesCount: 0,
          transitiveDependenciesCount: 3,
          vulnerabilitiesCount: 1,
          outdatedCount: 1,
          unusedCount: 1,
          circularCount: 0
        }
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.totalDependencies).toBe(8);
      expect(metrics.directDependenciesCount).toBe(3);
      expect(metrics.devDependenciesCount).toBe(2);
      expect(metrics.peerDependenciesCount).toBe(1);
      expect(metrics.optionalDependenciesCount).toBe(0);
      expect(metrics.transitiveDependenciesCount).toBe(3);
      expect(metrics.vulnerabilitiesCount).toBe(1);
      expect(metrics.outdatedCount).toBe(1);
      expect(metrics.unusedCount).toBe(1);
      expect(metrics.circularCount).toBe(0);
      expect(metrics.conflictsCount).toBe(0);
    });

    it('should handle empty analysis result', () => {
      const analysis = {
        directDependencies: {},
        devDependencies: {},
        peerDependencies: {},
        optionalDependencies: {},
        transitiveDependencies: {},
        conflicts: [],
        vulnerabilities: [],
        outdated: [],
        unused: [],
        circular: [],
        metrics: {
          totalDependencies: 0,
          directDependenciesCount: 0,
          devDependenciesCount: 0,
          peerDependenciesCount: 0,
          optionalDependenciesCount: 0,
          transitiveDependenciesCount: 0,
          vulnerabilitiesCount: 0,
          outdatedCount: 0,
          unusedCount: 0,
          circularCount: 0
        }
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.totalDependencies).toBe(0);
      expect(metrics.vulnerabilitiesCount).toBe(0);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations from analysis result', () => {
      const analysis = {
        directDependencies: { 'express': '^4.18.2' },
        devDependencies: { 'jest': '^29.7.0' },
        peerDependencies: {},
        optionalDependencies: {},
        transitiveDependencies: { 'express': ['body-parser'] },
        conflicts: [],
        vulnerabilities: [
          {
            package: 'lodash',
            severity: 'high',
            description: 'Prototype pollution vulnerability'
          }
        ],
        outdated: [
          {
            package: 'express',
            current: '4.18.2',
            latest: '4.18.3',
            type: 'patch'
          }
        ],
        unused: ['moment'],
        circular: [],
        metrics: {
          totalDependencies: 3,
          vulnerabilitiesCount: 1,
          outdatedCount: 1,
          unusedCount: 1
        }
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('type');
      expect(recommendations[0]).toHaveProperty('severity');
      expect(recommendations[0]).toHaveProperty('message');
    });

    it('should recommend security updates when vulnerabilities found', () => {
      const analysis = {
        directDependencies: { 'lodash': '^4.17.21' },
        devDependencies: {},
        peerDependencies: {},
        optionalDependencies: {},
        transitiveDependencies: {},
        conflicts: [],
        vulnerabilities: [
          {
            package: 'lodash',
            severity: 'high',
            description: 'Prototype pollution vulnerability'
          }
        ],
        outdated: [],
        unused: [],
        circular: [],
        metrics: { vulnerabilitiesCount: 1 }
      };

      const recommendations = step.generateRecommendations(analysis);

      const securityRecommendation = recommendations.find(r => 
        r.type === 'security' && r.severity === 'high'
      );
      expect(securityRecommendation).toBeDefined();
    });

    it('should recommend updates when outdated dependencies found', () => {
      const analysis = {
        directDependencies: { 'express': '4.18.2' },
        devDependencies: {},
        peerDependencies: {},
        optionalDependencies: {},
        transitiveDependencies: {},
        conflicts: [],
        vulnerabilities: [],
        outdated: [
          {
            package: 'express',
            current: '4.18.2',
            latest: '4.18.3',
            type: 'patch'
          }
        ],
        unused: [],
        circular: [],
        metrics: { outdatedCount: 1 }
      };

      const recommendations = step.generateRecommendations(analysis);

      const updateRecommendation = recommendations.find(r => 
        r.type === 'update' && r.message.includes('express')
      );
      expect(updateRecommendation).toBeDefined();
    });

    it('should recommend cleanup when unused dependencies found', () => {
      const analysis = {
        directDependencies: { 'moment': '^2.29.4' },
        devDependencies: {},
        peerDependencies: {},
        optionalDependencies: {},
        transitiveDependencies: {},
        conflicts: [],
        vulnerabilities: [],
        outdated: [],
        unused: ['moment'],
        circular: [],
        metrics: { unusedCount: 1 }
      };

      const recommendations = step.generateRecommendations(analysis);

      const cleanupRecommendation = recommendations.find(r => 
        r.type === 'cleanup' && r.message.includes('moment')
      );
      expect(cleanupRecommendation).toBeDefined();
    });

    it('should return empty recommendations when dependencies are optimal', () => {
      const analysis = {
        directDependencies: { 'express': '^4.18.3' },
        devDependencies: { 'jest': '^29.7.0' },
        peerDependencies: {},
        optionalDependencies: {},
        transitiveDependencies: { 'express': ['body-parser'] },
        conflicts: [],
        vulnerabilities: [],
        outdated: [],
        unused: [],
        circular: [],
        metrics: {
          totalDependencies: 3,
          vulnerabilitiesCount: 0,
          outdatedCount: 0,
          unusedCount: 0
        }
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('clone', () => {
    it('should create a clone with same options', () => {
      const clonedStep = step.clone();

      expect(clonedStep).toBeInstanceOf(DependenciesAnalysisStep);
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
        'DependenciesAnalysisStep: Rolling back dependencies analysis'
      );
    });
  });

  describe('getMetadata', () => {
    it('should return step metadata', () => {
      const metadata = step.getMetadata();

      expect(metadata.name).toBe('DependenciesAnalysisStep');
      expect(metadata.description).toBe('Performs dependencies analysis');
      expect(metadata.category).toBe('analysis');
      expect(metadata.options).toEqual(step.options);
    });
  });
}); 