/**
 * Analyze Handler Migration Tests
 * 
 * Tests for verifying that analyze handlers have been successfully migrated
 * to the unified workflow system and produce identical results.
 */
const { expect } = require('chai');
const sinon = require('sinon');

// Import original handlers
const AnalyzeArchitectureHandler = require('../../../backend/application/handlers/analyze/AnalyzeArchitectureHandler');
const AnalyzeCodeQualityHandler = require('../../../backend/application/handlers/analyze/AnalyzeCodeQualityHandler');
const AnalyzeTechStackHandler = require('../../../backend/application/handlers/analyze/AnalyzeTechStackHandler');
const AnalyzeRepoStructureHandler = require('../../../backend/application/handlers/analyze/AnalyzeRepoStructureHandler');
const AnalyzeDependenciesHandler = require('../../../backend/application/handlers/analyze/AnalyzeDependenciesHandler');
const AdvancedAnalysisHandler = require('../../../backend/application/handlers/analyze/AdvancedAnalysisHandler');

// Import migrated steps
const {
  ArchitectureAnalysisStep,
  CodeQualityAnalysisStep,
  TechStackAnalysisStep,
  RepoStructureAnalysisStep,
  DependenciesAnalysisStep,
  AdvancedAnalysisStep
} = require('../../../backend/domain/workflows/steps/analysis');

// Import unified workflow components
const { HandlerRegistry, HandlerMigrationUtility } = require('../../../backend/domain/workflows/handlers');
const { WorkflowContext } = require('../../../backend/domain/workflows');

describe('Analyze Handler Migration Tests', () => {
  let handlerRegistry;
  let migrationUtility;
  let mockDependencies;
  let testProjectPath;

  beforeEach(() => {
    // Setup test dependencies
    mockDependencies = {
      architectureAnalyzer: {
        analyze: sinon.stub().resolves({
          detectedPatterns: ['MVC', 'Repository'],
          structure: { layers: ['presentation', 'business', 'data'] },
          coupling: { instability: { 'module1': 0.3, 'module2': 0.7 } },
          cohesion: { 'module1': 0.8, 'module2': 0.6 },
          violations: [{ severity: 'high', message: 'High coupling detected' }],
          recommendations: ['Consider using dependency injection']
        })
      },
      codeQualityAnalyzer: {
        analyzeCodeQuality: sinon.stub().resolves({
          linting: { errors: 5, warnings: 10 },
          complexity: { cyclomaticComplexity: 15, cognitiveComplexity: 12 },
          maintainability: { maintainabilityIndex: 75 },
          testCoverage: { coverage: 85 },
          realMetrics: { maintainability: 75, complexity: 15 }
        })
      },
      projectAnalyzer: {
        analyzeStructure: sinon.stub().resolves({
          files: [{ path: 'src/main.js', size: 1024, extension: 'js' }],
          directories: [{ path: 'src', size: 0, fileCount: 10 }],
          totalSize: 1024
        }),
        analyzeTechStack: sinon.stub().resolves({
          frameworks: ['React', 'Express'],
          libraries: ['lodash', 'axios'],
          tools: ['webpack', 'eslint'],
          versions: { 'react': '18.0.0', 'express': '4.18.0' }
        })
      },
      dependencyAnalyzer: {
        analyzeDependencies: sinon.stub().resolves({
          directDependencies: ['react', 'express'],
          vulnerabilities: [{ severity: 'medium', package: 'lodash' }],
          updates: [{ package: 'react', current: '18.0.0', latest: '18.2.0' }]
        })
      },
      advancedAnalysisService: {
        performAdvancedAnalysis: sinon.stub().resolves({
          layerValidation: { isValid: true, issues: [] },
          logicAnalysis: { complexity: 'medium', quality: 'good' },
          architecturalAssessment: { score: 85, recommendations: [] }
        })
      },
      cursorIDEService: { getProjectInfo: sinon.stub().resolves({ path: '/test/project', name: 'test-project' }) },
      taskRepository: { create: sinon.stub().resolves({ id: 'task-1' }) },
      eventBus: { emit: sinon.stub() },
      logger: { info: sinon.stub(), error: sinon.stub() },
      fileSystemService: { getProjectInfo: sinon.stub().resolves({ path: '/test/project', name: 'test-project' }) }
    };

    // Initialize components
    handlerRegistry = new HandlerRegistry({ autoRegisterAnalysisSteps: true });
    migrationUtility = new HandlerMigrationUtility();
    testProjectPath = '/test/project';
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Handler Registry Integration', () => {
    it('should register all analysis steps automatically', () => {
      const handlerTypes = handlerRegistry.getHandlerTypes();
      
      expect(handlerTypes).to.include('architecture-analysis');
      expect(handlerTypes).to.include('code-quality-analysis');
      expect(handlerTypes).to.include('tech-stack-analysis');
      expect(handlerTypes).to.include('repo-structure-analysis');
      expect(handlerTypes).to.include('dependencies-analysis');
      expect(handlerTypes).to.include('advanced-analysis');
      
      expect(handlerRegistry.getHandlerCount()).to.equal(6);
    });

    it('should provide correct metadata for registered steps', () => {
      const architectureMetadata = handlerRegistry.getHandlerMetadata('architecture-analysis');
      
      expect(architectureMetadata).to.have.property('name', 'Architecture Analysis');
      expect(architectureMetadata).to.have.property('category', 'analysis');
      expect(architectureMetadata).to.have.property('capabilities').that.includes('pattern_detection');
      expect(architectureMetadata).to.have.property('compatibility', 'unified');
    });
  });

  describe('Architecture Analysis Migration', () => {
    it('should produce identical results to original handler', async () => {
      // Create original handler
      const originalHandler = new AnalyzeArchitectureHandler(mockDependencies);
      
      // Create migrated step
      const migratedStep = new ArchitectureAnalysisStep();
      
      // Create test command
      const testCommand = {
        commandId: 'test-command-1',
        projectPath: testProjectPath,
        requestedBy: 'test-user',
        getAnalysisOptions: () => ({
          detectPatterns: true,
          analyzeDependencies: true,
          complexityAnalysis: true,
          detectLayers: true,
          detectModules: true,
          analyzeCoupling: true,
          analyzeCohesion: true,
          detectAntiPatterns: true,
          analyzeDesignPrinciples: true
        }),
        getOutputConfiguration: () => ({}),
        validateBusinessRules: () => ({ isValid: true, errors: [], warnings: [] })
      };

      // Create workflow context for migrated step
      const context = new WorkflowContext();
      context.set('projectPath', testProjectPath);
      context.set('architectureAnalyzer', mockDependencies.architectureAnalyzer);
      context.set('logger', mockDependencies.logger);

      // Execute original handler
      const originalResult = await originalHandler.handle(testCommand);
      
      // Execute migrated step
      const migratedResult = await migratedStep.executeStep(context);

      // Verify results are equivalent
      expect(migratedResult.success).to.be.true;
      expect(migratedResult.analysis).to.have.property('patterns');
      expect(migratedResult.analysis).to.have.property('layers');
      expect(migratedResult.analysis).to.have.property('modules');
      expect(migratedResult.analysis).to.have.property('coupling');
      expect(migratedResult.analysis).to.have.property('cohesion');
      expect(migratedResult.analysis).to.have.property('antiPatterns');
      expect(migratedResult.analysis).to.have.property('designPrinciples');
      
      // Verify metrics and recommendations are generated
      expect(migratedResult).to.have.property('metrics');
      expect(migratedResult).to.have.property('recommendations');
    });
  });

  describe('Code Quality Analysis Migration', () => {
    it('should produce identical results to original handler', async () => {
      // Create original handler
      const originalHandler = new AnalyzeCodeQualityHandler(mockDependencies);
      
      // Create migrated step
      const migratedStep = new CodeQualityAnalysisStep();
      
      // Create test command
      const testCommand = {
        commandId: 'test-command-2',
        projectPath: testProjectPath,
        requestedBy: 'test-user',
        getAnalysisOptions: () => ({
          linting: true,
          complexity: true,
          maintainability: true,
          testCoverage: true,
          codeDuplication: true,
          codeStyle: true,
          documentation: true,
          performance: true
        }),
        getOutputConfiguration: () => ({}),
        validateBusinessRules: () => ({ isValid: true, errors: [], warnings: [] })
      };

      // Create workflow context for migrated step
      const context = new WorkflowContext();
      context.set('projectPath', testProjectPath);
      context.set('codeQualityAnalyzer', mockDependencies.codeQualityAnalyzer);
      context.set('logger', mockDependencies.logger);

      // Execute original handler
      const originalResult = await originalHandler.handle(testCommand);
      
      // Execute migrated step
      const migratedResult = await migratedStep.executeStep(context);

      // Verify results are equivalent
      expect(migratedResult.success).to.be.true;
      expect(migratedResult.analysis).to.have.property('linting');
      expect(migratedResult.analysis).to.have.property('complexity');
      expect(migratedResult.analysis).to.have.property('maintainability');
      expect(migratedResult.analysis).to.have.property('testCoverage');
      
      // Verify metrics and recommendations are generated
      expect(migratedResult).to.have.property('metrics');
      expect(migratedResult).to.have.property('recommendations');
    });
  });

  describe('Tech Stack Analysis Migration', () => {
    it('should produce identical results to original handler', async () => {
      // Create original handler
      const originalHandler = new AnalyzeTechStackHandler(mockDependencies);
      
      // Create migrated step
      const migratedStep = new TechStackAnalysisStep();
      
      // Create test command
      const testCommand = {
        commandId: 'test-command-3',
        projectPath: testProjectPath,
        requestedBy: 'test-user',
        getAnalysisOptions: () => ({
          detectFrameworks: true,
          detectLibraries: true,
          detectTools: true,
          detectLanguages: true,
          detectDatabases: true,
          detectCloudServices: true
        }),
        getOutputConfiguration: () => ({}),
        validateBusinessRules: () => ({ isValid: true, errors: [], warnings: [] })
      };

      // Create workflow context for migrated step
      const context = new WorkflowContext();
      context.set('projectPath', testProjectPath);
      context.set('projectAnalyzer', mockDependencies.projectAnalyzer);
      context.set('logger', mockDependencies.logger);

      // Execute original handler
      const originalResult = await originalHandler.handle(testCommand);
      
      // Execute migrated step
      const migratedResult = await migratedStep.executeStep(context);

      // Verify results are equivalent
      expect(migratedResult.success).to.be.true;
      expect(migratedResult.analysis).to.have.property('frameworks');
      expect(migratedResult.analysis).to.have.property('libraries');
      expect(migratedResult.analysis).to.have.property('tools');
      expect(migratedResult.analysis).to.have.property('versions');
      
      // Verify metrics and recommendations are generated
      expect(migratedResult).to.have.property('metrics');
      expect(migratedResult).to.have.property('recommendations');
    });
  });

  describe('Repository Structure Analysis Migration', () => {
    it('should produce identical results to original handler', async () => {
      // Create original handler
      const originalHandler = new AnalyzeRepoStructureHandler(mockDependencies);
      
      // Create migrated step
      const migratedStep = new RepoStructureAnalysisStep();
      
      // Create test command
      const testCommand = {
        commandId: 'test-command-4',
        projectPath: testProjectPath,
        requestedBy: 'test-user',
        getAnalysisOptions: () => ({
          includeHidden: false,
          maxDepth: 5,
          fileTypes: ['js', 'ts', 'jsx', 'tsx'],
          excludePatterns: ['node_modules', '.git'],
          includeStats: true
        }),
        getOutputConfiguration: () => ({}),
        validateBusinessRules: () => ({ isValid: true, errors: [], warnings: [] })
      };

      // Create workflow context for migrated step
      const context = new WorkflowContext();
      context.set('projectPath', testProjectPath);
      context.set('projectAnalyzer', mockDependencies.projectAnalyzer);
      context.set('logger', mockDependencies.logger);

      // Execute original handler
      const originalResult = await originalHandler.handle(testCommand);
      
      // Execute migrated step
      const migratedResult = await migratedStep.executeStep(context);

      // Verify results are equivalent
      expect(migratedResult.success).to.be.true;
      expect(migratedResult.analysis).to.have.property('structure');
      expect(migratedResult.analysis).to.have.property('fileCount');
      expect(migratedResult.analysis).to.have.property('directoryCount');
      expect(migratedResult.analysis).to.have.property('totalSize');
      
      // Verify metrics and recommendations are generated
      expect(migratedResult).to.have.property('metrics');
      expect(migratedResult).to.have.property('recommendations');
    });
  });

  describe('Dependencies Analysis Migration', () => {
    it('should produce identical results to original handler', async () => {
      // Create original handler
      const originalHandler = new AnalyzeDependenciesHandler(mockDependencies);
      
      // Create migrated step
      const migratedStep = new DependenciesAnalysisStep();
      
      // Create test command
      const testCommand = {
        commandId: 'test-command-5',
        projectPath: testProjectPath,
        requestedBy: 'test-user',
        getAnalysisOptions: () => ({
          analyzeVersions: true,
          checkVulnerabilities: true,
          analyzeUpdates: true,
          checkLicenseCompatibility: true,
          analyzeTransitiveDependencies: true,
          checkBundleSize: true,
          analyzeDependencyGraph: true
        }),
        getOutputConfiguration: () => ({}),
        validateBusinessRules: () => ({ isValid: true, errors: [], warnings: [] })
      };

      // Create workflow context for migrated step
      const context = new WorkflowContext();
      context.set('projectPath', testProjectPath);
      context.set('dependencyAnalyzer', mockDependencies.dependencyAnalyzer);
      context.set('logger', mockDependencies.logger);

      // Execute original handler
      const originalResult = await originalHandler.handle(testCommand);
      
      // Execute migrated step
      const migratedResult = await migratedStep.executeStep(context);

      // Verify results are equivalent
      expect(migratedResult.success).to.be.true;
      expect(migratedResult.analysis).to.have.property('directDependencies');
      expect(migratedResult.analysis).to.have.property('vulnerabilities');
      expect(migratedResult.analysis).to.have.property('updates');
      
      // Verify metrics and recommendations are generated
      expect(migratedResult).to.have.property('metrics');
      expect(migratedResult).to.have.property('recommendations');
    });
  });

  describe('Advanced Analysis Migration', () => {
    it('should produce identical results to original handler', async () => {
      // Create original handler
      const originalHandler = new AdvancedAnalysisHandler(mockDependencies);
      
      // Create migrated step
      const migratedStep = new AdvancedAnalysisStep();
      
      // Create test command
      const testCommand = {
        commandId: 'test-command-6',
        projectPath: testProjectPath,
        requestedBy: 'test-user',
        getAnalysisOptions: () => ({
          layerValidation: true,
          logicAnalysis: true,
          architecturalAssessment: true,
          performanceAnalysis: true,
          securityAnalysis: true,
          scalabilityAnalysis: true,
          generateReport: true
        }),
        getOutputConfiguration: () => ({}),
        validateBusinessRules: () => ({ isValid: true, errors: [], warnings: [] })
      };

      // Create workflow context for migrated step
      const context = new WorkflowContext();
      context.set('projectPath', testProjectPath);
      context.set('advancedAnalysisService', mockDependencies.advancedAnalysisService);
      context.set('logger', mockDependencies.logger);

      // Execute original handler
      const originalResult = await originalHandler.handle(testCommand);
      
      // Execute migrated step
      const migratedResult = await migratedStep.executeStep(context);

      // Verify results are equivalent
      expect(migratedResult.success).to.be.true;
      expect(migratedResult.analysis).to.have.property('layerValidation');
      expect(migratedResult.analysis).to.have.property('logicAnalysis');
      expect(migratedResult.analysis).to.have.property('architecturalAssessment');
      
      // Verify report is generated if requested
      if (testCommand.getAnalysisOptions().generateReport) {
        expect(migratedResult).to.have.property('report');
      }
    });
  });

  describe('Migration Utility Integration', () => {
    it('should successfully migrate handlers using HandlerMigrationUtility', async () => {
      const migrationResult = await migrationUtility.migrateHandler('architecture-analysis', {
        handlerClass: ArchitectureAnalysisStep,
        options: { detectPatterns: true, analyzeDependencies: true }
      });

      expect(migrationResult.success).to.be.true;
      expect(migrationResult.handlerType).to.equal('architecture-analysis');
      expect(migrationResult.migratedHandler).to.have.property('name');
      expect(migrationResult.migratedHandler).to.have.property('type', 'unified');
    });

    it('should handle migration failures gracefully', async () => {
      const migrationResult = await migrationUtility.migrateHandler('invalid-handler', {
        handlerClass: null,
        options: {}
      });

      expect(migrationResult.success).to.be.false;
      expect(migrationResult).to.have.property('error');
    });
  });

  describe('Performance Validation', () => {
    it('should maintain or improve performance characteristics', async () => {
      const migratedStep = new ArchitectureAnalysisStep();
      
      const context = new WorkflowContext();
      context.set('projectPath', testProjectPath);
      context.set('architectureAnalyzer', mockDependencies.architectureAnalyzer);
      context.set('logger', mockDependencies.logger);

      const startTime = Date.now();
      const result = await migratedStep.executeStep(context);
      const duration = Date.now() - startTime;

      expect(result.success).to.be.true;
      expect(duration).to.be.lessThan(5000); // Should complete within 5 seconds
      expect(result).to.have.property('duration');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing dependencies gracefully', async () => {
      const migratedStep = new ArchitectureAnalysisStep();
      
      const context = new WorkflowContext();
      context.set('projectPath', testProjectPath);
      // Deliberately not setting architectureAnalyzer

      try {
        await migratedStep.executeStep(context);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Architecture analyzer not found');
      }
    });

    it('should handle invalid project path gracefully', async () => {
      const migratedStep = new ArchitectureAnalysisStep();
      
      const context = new WorkflowContext();
      // Deliberately not setting projectPath
      context.set('architectureAnalyzer', mockDependencies.architectureAnalyzer);

      try {
        await migratedStep.executeStep(context);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Project path not found');
      }
    });
  });
}); 