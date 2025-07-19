const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;

// Import framework components
const { 
  FrameworkLoader, 
  FrameworkManager, 
  FrameworkValidator, 
  FrameworkConfig,
  FrameworkStepRegistry,
  initializeFrameworkInfrastructure 
} = require('../../../infrastructure/framework');

describe('Framework Integration Tests', () => {
  let sandbox;
  let mockStepRegistry;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock step registry
    mockStepRegistry = {
      register: sandbox.stub(),
      get: sandbox.stub(),
      has: sandbox.stub(),
      getAll: sandbox.stub(),
      executeStep: sandbox.stub()
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Framework Infrastructure Initialization', () => {
    it('should initialize all framework components successfully', async () => {
      // Mock file system operations
      sandbox.stub(fs, 'readdir').resolves(['refactoring_management', 'testing_management']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {},
        workflows: {}
      }));
      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(require, 'resolve').returns('/test/path');

      const infrastructure = await initializeFrameworkInfrastructure(mockStepRegistry);

      expect(infrastructure.loader).to.be.instanceof(FrameworkLoader);
      expect(infrastructure.manager).to.be.instanceof(FrameworkManager);
      expect(infrastructure.validator).to.be.instanceof(FrameworkValidator);
      expect(infrastructure.config).to.be.instanceof(FrameworkConfig);
      expect(infrastructure.stepRegistry).to.be.instanceof(FrameworkStepRegistry);

      expect(infrastructure.loader.isInitialized).to.be.true;
      expect(infrastructure.manager.isInitialized).to.be.true;
      expect(infrastructure.validator.isInitialized).to.be.true;
      expect(infrastructure.config.isInitialized).to.be.true;
    });

    it('should handle initialization errors gracefully', async () => {
      sandbox.stub(fs, 'readdir').rejects(new Error('Directory not found'));

      try {
        await initializeFrameworkInfrastructure(mockStepRegistry);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Directory not found');
      }
    });
  });

  describe('Framework Loading and Management', () => {
    let frameworkLoader;
    let frameworkManager;
    let frameworkValidator;

    beforeEach(async () => {
      // Mock file system operations
      sandbox.stub(fs, 'readdir').resolves(['refactoring_management']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'refactoring_management',
        version: '1.0.0',
        description: 'Advanced refactoring operations',
        category: 'refactoring',
        author: 'PIDEA Team',
        dependencies: ['core'],
        steps: {
          refactor_step: {
            name: 'refactor_step',
            type: 'refactoring',
            category: 'orchestration',
            description: 'Main refactoring orchestration step',
            dependencies: ['stepRegistry', 'projectPath'],
            file: 'steps/refactor_step.js'
          }
        },
        workflows: {
          complete_refactoring: {
            name: 'complete_refactoring',
            steps: ['refactor_analyze', 'refactor_generate_task', 'refactor_step'],
            description: 'Complete refactoring workflow with analysis and task generation'
          }
        },
        activation: {
          auto_load: false,
          requires_confirmation: true,
          fallback_to_core: true
        },
        settings: {
          max_file_size: 1000000,
          backup_enabled: true,
          validation_enabled: true,
          undo_enabled: true
        }
      }));
      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(require, 'resolve').returns('/test/path');

      // Initialize components
      frameworkLoader = new FrameworkLoader();
      frameworkManager = new FrameworkManager();
      frameworkValidator = new FrameworkValidator();

      await frameworkLoader.initialize('/test/framework/path');
      await frameworkValidator.initialize();
      await frameworkManager.initialize(frameworkLoader, frameworkValidator);
    });

    it('should load and manage frameworks correctly', async () => {
      // Get framework from loader
      const frameworks = frameworkLoader.getFrameworks();
      expect(frameworks).to.have.length(1);
      expect(frameworks[0].name).to.equal('refactoring_management');

      // Activate framework
      const activationResult = await frameworkManager.activateFramework('refactoring_management');
      expect(activationResult.success).to.be.true;
      expect(activationResult.framework.name).to.equal('refactoring_management');

      // Check active frameworks
      const activeFrameworks = frameworkManager.getAllActiveFrameworks();
      expect(activeFrameworks).to.have.length(1);
      expect(activeFrameworks[0].name).to.equal('refactoring_management');

      // Get framework by category
      const refactoringFrameworks = frameworkManager.getActiveFrameworksByCategory('refactoring');
      expect(refactoringFrameworks).to.have.length(1);
      expect(refactoringFrameworks[0].name).to.equal('refactoring_management');
    });

    it('should validate framework configuration', async () => {
      const framework = frameworkLoader.getFramework('refactoring_management');
      
      const validationResult = await frameworkValidator.validateFramework(framework);
      expect(validationResult.valid).to.be.true;
      expect(validationResult.errors).to.be.an('array').that.is.empty;

      const dependencyResult = await frameworkValidator.validateDependencies(framework);
      expect(dependencyResult.valid).to.be.true;
      expect(dependencyResult.errors).to.be.an('array').that.is.empty;
    });

    it('should handle framework deactivation', async () => {
      // Activate framework first
      await frameworkManager.activateFramework('refactoring_management');
      expect(frameworkManager.getAllActiveFrameworks()).to.have.length(1);

      // Deactivate framework
      const deactivationResult = await frameworkManager.deactivateFramework('refactoring_management');
      expect(deactivationResult.success).to.be.true;
      expect(frameworkManager.getAllActiveFrameworks()).to.have.length(0);
    });
  });

  describe('Framework Step Integration', () => {
    let frameworkStepRegistry;

    beforeEach(async () => {
      // Mock file system operations
      sandbox.stub(fs, 'readdir').resolves(['refactoring_management']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'refactoring_management',
        version: '1.0.0',
        description: 'Test framework',
        category: 'refactoring',
        steps: {
          refactor_step: {
            name: 'refactor_step',
            file: 'steps/refactor_step.js'
          }
        }
      }));
      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(require, 'resolve').returns('/test/path');

      frameworkStepRegistry = new FrameworkStepRegistry();
      await frameworkStepRegistry.initialize('/test/framework/path', mockStepRegistry);
    });

    it('should register framework steps with main registry', async () => {
      const frameworkSteps = frameworkStepRegistry.getFrameworkSteps();
      expect(frameworkSteps).to.have.length(1);
      expect(frameworkSteps[0]).to.equal('refactoring_management.refactor_step');

      // Check if step was registered with main registry
      expect(mockStepRegistry.register.calledOnce).to.be.true;
      const registeredStep = mockStepRegistry.register.firstCall.args[1];
      expect(registeredStep.name).to.equal('refactor_step');
      expect(registeredStep.framework).to.equal('refactoring_management');
    });

    it('should provide framework context to steps', async () => {
      const stepInfo = frameworkStepRegistry.getFrameworkStepInfo('refactoring_management.refactor_step');
      expect(stepInfo).to.not.be.undefined;
      expect(stepInfo.framework).to.equal('refactoring_management');
      expect(stepInfo.name).to.equal('refactor_step');
    });

    it('should identify framework steps correctly', () => {
      expect(frameworkStepRegistry.isFrameworkStep('refactoring_management.refactor_step')).to.be.true;
      expect(frameworkStepRegistry.isFrameworkStep('core.step')).to.be.false;
    });

    it('should get steps by framework name', () => {
      const steps = frameworkStepRegistry.getFrameworkStepsByName('refactoring_management');
      expect(steps).to.have.length(1);
      expect(steps[0]).to.equal('refactoring_management.refactor_step');
    });
  });

  describe('Framework Configuration Management', () => {
    let frameworkConfig;

    beforeEach(async () => {
      frameworkConfig = new FrameworkConfig();
      await frameworkConfig.initialize();
    });

    it('should manage framework configuration settings', () => {
      const config = frameworkConfig.getConfig();
      expect(config).to.be.an('object');
      expect(config.frameworkBasePath).to.be.a('string');
      expect(config.autoLoadFrameworks).to.be.a('boolean');
      expect(config.requireConfirmation).to.be.a('boolean');
      expect(config.fallbackToCore).to.be.a('boolean');
    });

    it('should validate configuration settings', () => {
      const validationResult = frameworkConfig.validateConfig({
        frameworkBasePath: '/test/path',
        autoLoadFrameworks: false,
        requireConfirmation: true,
        fallbackToCore: true
      });

      expect(validationResult.valid).to.be.true;
      expect(validationResult.errors).to.be.an('array').that.is.empty;
    });

    it('should handle invalid configuration', () => {
      const validationResult = frameworkConfig.validateConfig({
        frameworkBasePath: '', // Invalid empty path
        autoLoadFrameworks: 'invalid', // Invalid type
        requireConfirmation: true,
        fallbackToCore: true
      });

      expect(validationResult.valid).to.be.false;
      expect(validationResult.errors).to.be.an('array').that.is.not.empty;
    });

    it('should provide configuration statistics', () => {
      const stats = frameworkConfig.getConfigStats();
      expect(stats).to.be.an('object');
      expect(stats.isInitialized).to.be.true;
      expect(stats.configPath).to.be.a('string');
      expect(stats.lastModified).to.be.a('string');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle framework loading errors gracefully', async () => {
      sandbox.stub(fs, 'readdir').rejects(new Error('Permission denied'));

      const frameworkLoader = new FrameworkLoader();
      
      try {
        await frameworkLoader.initialize('/test/framework/path');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Permission denied');
        expect(frameworkLoader.isInitialized).to.be.false;
      }
    });

    it('should handle framework activation errors gracefully', async () => {
      const frameworkManager = new FrameworkManager();
      const mockLoader = { getFramework: sandbox.stub().returns(undefined) };
      const mockValidator = { validateFramework: sandbox.stub() };

      await frameworkManager.initialize(mockLoader, mockValidator);

      const result = await frameworkManager.activateFramework('non_existent_framework');
      expect(result.success).to.be.false;
      expect(result.error).to.include('Framework not found');
    });

    it('should handle step registration errors gracefully', async () => {
      const frameworkStepRegistry = new FrameworkStepRegistry();
      mockStepRegistry.register.rejects(new Error('Registration failed'));

      await frameworkStepRegistry.initialize('/test/framework/path', mockStepRegistry);

      // Should not throw error, just log it
      expect(mockStepRegistry.register.called).to.be.true;
    });
  });

  describe('Performance and Statistics', () => {
    it('should provide accurate statistics for all components', async () => {
      // Mock file system operations
      sandbox.stub(fs, 'readdir').resolves(['refactoring_management', 'testing_management']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: { step1: {}, step2: {} },
        workflows: { workflow1: {} }
      }));
      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(require, 'resolve').returns('/test/path');

      const infrastructure = await initializeFrameworkInfrastructure(mockStepRegistry);

      // Get statistics from each component
      const loaderStats = infrastructure.loader.getStats();
      const managerStats = infrastructure.manager.getStats();
      const configStats = infrastructure.config.getConfigStats();
      const stepRegistryStats = infrastructure.stepRegistry.getLoadedFrameworks();

      // Verify statistics
      expect(loaderStats.totalFrameworks).to.equal(2);
      expect(loaderStats.isInitialized).to.be.true;
      expect(managerStats.totalActiveFrameworks).to.equal(0);
      expect(managerStats.isInitialized).to.be.true;
      expect(configStats.isInitialized).to.be.true;
      expect(stepRegistryStats).to.be.an('array');
    });
  });
}); 