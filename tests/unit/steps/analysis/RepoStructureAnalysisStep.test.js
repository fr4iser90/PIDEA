/**
 * RepoStructureAnalysisStep Unit Tests
 */
const RepoStructureAnalysisStep = require('../../../../backend/domain/workflows/steps/analysis/RepoStructureAnalysisStep');

describe('RepoStructureAnalysisStep', () => {
  let step;
  let mockContext;

  beforeEach(() => {
    step = new RepoStructureAnalysisStep({
      analyzeDirectoryStructure: true,
      analyzeFileOrganization: true,
      analyzeNamingConventions: true,
      analyzeModuleStructure: true,
      analyzePackageStructure: true,
      analyzeConfigurationFiles: true,
      analyzeDocumentationStructure: true,
      analyzeTestStructure: true
    });

    mockContext = {
      get: jest.fn(),
      set: jest.fn()
    };
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const defaultStep = new RepoStructureAnalysisStep();
      expect(defaultStep.options.analyzeDirectoryStructure).toBe(true);
      expect(defaultStep.options.analyzeFileOrganization).toBe(true);
      expect(defaultStep.options.analyzeNamingConventions).toBe(true);
      expect(defaultStep.options.analyzeModuleStructure).toBe(true);
      expect(defaultStep.options.analyzePackageStructure).toBe(true);
      expect(defaultStep.options.analyzeConfigurationFiles).toBe(true);
      expect(defaultStep.options.analyzeDocumentationStructure).toBe(true);
      expect(defaultStep.options.analyzeTestStructure).toBe(true);
    });

    it('should create an instance with custom options', () => {
      const customStep = new RepoStructureAnalysisStep({
        analyzeDirectoryStructure: false,
        analyzeFileOrganization: false,
        analyzeTestStructure: false
      });
      expect(customStep.options.analyzeDirectoryStructure).toBe(false);
      expect(customStep.options.analyzeFileOrganization).toBe(false);
      expect(customStep.options.analyzeTestStructure).toBe(false);
      expect(customStep.options.analyzeNamingConventions).toBe(true); // default
    });
  });

  describe('executeStep', () => {
    it('should throw error when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Project path not found in context'
      );
    });

    it('should throw error when repo structure analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // repoStructureAnalyzer

      await expect(step.executeStep(mockContext)).rejects.toThrow(
        'Repo structure analyzer not found in context'
      );
    });

    it('should execute successfully with valid context', async () => {
      const mockRepoStructureAnalyzer = {
        analyzeRepoStructure: jest.fn().mockResolvedValue({
          directoryStructure: {
            root: '/test/path',
            directories: ['src', 'tests', 'docs', 'config'],
            files: ['package.json', 'README.md', '.gitignore']
          },
          fileOrganization: {
            srcFiles: 25,
            testFiles: 15,
            configFiles: 5,
            docFiles: 8
          },
          namingConventions: {
            consistent: true,
            violations: [],
            suggestions: []
          },
          moduleStructure: {
            modules: ['auth', 'users', 'products'],
            dependencies: { 'auth': ['users'], 'products': ['auth'] }
          },
          packageStructure: {
            isMonorepo: false,
            packages: [],
            workspaces: []
          },
          configurationFiles: {
            packageJson: true,
            eslintConfig: true,
            prettierConfig: true,
            tsConfig: false
          },
          documentationStructure: {
            readme: true,
            contributing: true,
            changelog: false,
            apiDocs: true
          },
          testStructure: {
            testFramework: 'jest',
            testFiles: 15,
            coverage: 80,
            testTypes: ['unit', 'integration']
          }
        })
      };

      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(mockRepoStructureAnalyzer) // repoStructureAnalyzer
        .mockReturnValueOnce(console); // logger

      const result = await step.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(mockRepoStructureAnalyzer.analyzeRepoStructure).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should return valid result with proper context', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce({}); // repoStructureAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid result when project path is missing', async () => {
      mockContext.get.mockReturnValue(undefined);

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project path is required for repo structure analysis');
    });

    it('should return invalid result when repo structure analyzer is missing', async () => {
      mockContext.get
        .mockReturnValueOnce('/test/path') // projectPath
        .mockReturnValueOnce(undefined); // repoStructureAnalyzer

      const result = await step.validate(mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Repo structure analyzer is required for repo structure analysis');
    });
  });

  describe('generateMetrics', () => {
    it('should generate metrics from analysis result', () => {
      const analysis = {
        directoryStructure: {
          directories: ['src', 'tests', 'docs', 'config'],
          files: ['package.json', 'README.md', '.gitignore']
        },
        fileOrganization: {
          srcFiles: 25,
          testFiles: 15,
          configFiles: 5,
          docFiles: 8
        },
        namingConventions: {
          consistent: true,
          violations: [],
          suggestions: []
        },
        moduleStructure: {
          modules: ['auth', 'users', 'products'],
          dependencies: { 'auth': ['users'], 'products': ['auth'] }
        },
        packageStructure: {
          isMonorepo: false,
          packages: [],
          workspaces: []
        },
        configurationFiles: {
          packageJson: true,
          eslintConfig: true,
          prettierConfig: true,
          tsConfig: false
        },
        documentationStructure: {
          readme: true,
          contributing: true,
          changelog: false,
          apiDocs: true
        },
        testStructure: {
          testFramework: 'jest',
          testFiles: 15,
          coverage: 80,
          testTypes: ['unit', 'integration']
        }
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.directoriesCount).toBe(4);
      expect(metrics.filesCount).toBe(3);
      expect(metrics.srcFilesCount).toBe(25);
      expect(metrics.testFilesCount).toBe(15);
      expect(metrics.configFilesCount).toBe(5);
      expect(metrics.docFilesCount).toBe(8);
      expect(metrics.modulesCount).toBe(3);
      expect(metrics.dependenciesCount).toBe(2);
      expect(metrics.isMonorepo).toBe(false);
      expect(metrics.configFilesCount).toBe(5);
      expect(metrics.documentationFilesCount).toBe(3);
      expect(metrics.testCoverage).toBe(80);
      expect(metrics.testTypesCount).toBe(2);
    });

    it('should handle monorepo metrics', () => {
      const analysis = {
        directoryStructure: { directories: ['packages'], files: ['package.json'] },
        fileOrganization: { srcFiles: 10, testFiles: 5 },
        namingConventions: { consistent: true, violations: [] },
        moduleStructure: { modules: ['pkg1', 'pkg2'], dependencies: {} },
        packageStructure: {
          isMonorepo: true,
          packages: ['pkg1', 'pkg2'],
          workspaces: ['packages/*']
        },
        configurationFiles: { packageJson: true },
        documentationStructure: { readme: true },
        testStructure: { testFiles: 5, coverage: 75 }
      };

      const metrics = step.generateMetrics(analysis);

      expect(metrics.isMonorepo).toBe(true);
      expect(metrics.packagesCount).toBe(2);
      expect(metrics.workspacesCount).toBe(1);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations from analysis result', () => {
      const analysis = {
        directoryStructure: { directories: ['src'], files: ['package.json'] },
        fileOrganization: { srcFiles: 5, testFiles: 0 },
        namingConventions: { consistent: true, violations: [] },
        moduleStructure: { modules: ['main'], dependencies: {} },
        packageStructure: { isMonorepo: false, packages: [] },
        configurationFiles: { packageJson: true, eslintConfig: false },
        documentationStructure: { readme: true, contributing: false },
        testStructure: { testFiles: 0, coverage: 0 }
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('type');
      expect(recommendations[0]).toHaveProperty('severity');
      expect(recommendations[0]).toHaveProperty('message');
    });

    it('should recommend testing when no tests found', () => {
      const analysis = {
        directoryStructure: { directories: ['src'], files: ['package.json'] },
        fileOrganization: { srcFiles: 10, testFiles: 0 },
        namingConventions: { consistent: true, violations: [] },
        moduleStructure: { modules: ['main'], dependencies: {} },
        packageStructure: { isMonorepo: false, packages: [] },
        configurationFiles: { packageJson: true },
        documentationStructure: { readme: true },
        testStructure: { testFiles: 0, coverage: 0 }
      };

      const recommendations = step.generateRecommendations(analysis);

      const testingRecommendation = recommendations.find(r => 
        r.type === 'testing' && r.message.includes('test')
      );
      expect(testingRecommendation).toBeDefined();
    });

    it('should recommend linting configuration when missing', () => {
      const analysis = {
        directoryStructure: { directories: ['src'], files: ['package.json'] },
        fileOrganization: { srcFiles: 10, testFiles: 5 },
        namingConventions: { consistent: true, violations: [] },
        moduleStructure: { modules: ['main'], dependencies: {} },
        packageStructure: { isMonorepo: false, packages: [] },
        configurationFiles: { packageJson: true, eslintConfig: false },
        documentationStructure: { readme: true },
        testStructure: { testFiles: 5, coverage: 80 }
      };

      const recommendations = step.generateRecommendations(analysis);

      const lintingRecommendation = recommendations.find(r => 
        r.type === 'configuration' && r.message.includes('linting')
      );
      expect(lintingRecommendation).toBeDefined();
    });

    it('should return empty recommendations when structure is optimal', () => {
      const analysis = {
        directoryStructure: { directories: ['src', 'tests', 'docs'], files: ['package.json', 'README.md'] },
        fileOrganization: { srcFiles: 20, testFiles: 15 },
        namingConventions: { consistent: true, violations: [] },
        moduleStructure: { modules: ['auth', 'users'], dependencies: {} },
        packageStructure: { isMonorepo: false, packages: [] },
        configurationFiles: { packageJson: true, eslintConfig: true, prettierConfig: true },
        documentationStructure: { readme: true, contributing: true, apiDocs: true },
        testStructure: { testFiles: 15, coverage: 90 }
      };

      const recommendations = step.generateRecommendations(analysis);

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('clone', () => {
    it('should create a clone with same options', () => {
      const clonedStep = step.clone();

      expect(clonedStep).toBeInstanceOf(RepoStructureAnalysisStep);
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
        'RepoStructureAnalysisStep: Rolling back repo structure analysis'
      );
    });
  });

  describe('getMetadata', () => {
    it('should return step metadata', () => {
      const metadata = step.getMetadata();

      expect(metadata.name).toBe('RepoStructureAnalysisStep');
      expect(metadata.description).toBe('Performs repository structure analysis');
      expect(metadata.category).toBe('analysis');
      expect(metadata.options).toEqual(step.options);
    });
  });
}); 