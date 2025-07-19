const { expect } = require('chai');
const sinon = require('sinon');
const FrameworkManager = require('../../../infrastructure/framework/FrameworkManager');

describe('FrameworkManager', () => {
  let frameworkManager;
  let sandbox;
  let mockFrameworkLoader;
  let mockFrameworkValidator;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    frameworkManager = new FrameworkManager();
    
    // Mock dependencies
    mockFrameworkLoader = {
      getFrameworks: sandbox.stub(),
      getFramework: sandbox.stub(),
      getFrameworksByCategory: sandbox.stub()
    };
    
    mockFrameworkValidator = {
      validateFramework: sandbox.stub(),
      validateDependencies: sandbox.stub(),
      validateActivation: sandbox.stub()
    };

    frameworkManager.frameworkLoader = mockFrameworkLoader;
    frameworkManager.frameworkValidator = mockFrameworkValidator;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      expect(frameworkManager.isInitialized).to.be.false;
      expect(frameworkManager.activeFrameworks).to.be.an('array').that.is.empty;
      expect(frameworkManager.frameworkLoader).to.be.undefined;
      expect(frameworkManager.frameworkValidator).to.be.undefined;
    });

    it('should initialize successfully with dependencies', async () => {
      await frameworkManager.initialize(mockFrameworkLoader, mockFrameworkValidator);

      expect(frameworkManager.isInitialized).to.be.true;
      expect(frameworkManager.frameworkLoader).to.equal(mockFrameworkLoader);
      expect(frameworkManager.frameworkValidator).to.equal(mockFrameworkValidator);
    });

    it('should handle initialization errors gracefully', async () => {
      const invalidLoader = null;
      const invalidValidator = null;

      try {
        await frameworkManager.initialize(invalidLoader, invalidValidator);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Framework loader is required');
        expect(frameworkManager.isInitialized).to.be.false;
      }
    });
  });

  describe('Framework Activation', () => {
    beforeEach(async () => {
      await frameworkManager.initialize(mockFrameworkLoader, mockFrameworkValidator);
    });

    it('should activate framework successfully', async () => {
      const frameworkName = 'refactoring_management';
      const mockFramework = {
        name: frameworkName,
        config: {
          name: frameworkName,
          version: '1.0.0',
          description: 'Test framework',
          category: 'refactoring',
          dependencies: ['core'],
          activation: {
            auto_load: false,
            requires_confirmation: true,
            fallback_to_core: true
          }
        }
      };

      mockFrameworkLoader.getFramework.withArgs(frameworkName).returns(mockFramework);
      mockFrameworkValidator.validateFramework.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateDependencies.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateActivation.returns({ valid: true, errors: [] });

      const result = await frameworkManager.activateFramework(frameworkName);

      expect(result.success).to.be.true;
      expect(result.framework).to.equal(mockFramework);
      expect(frameworkManager.activeFrameworks).to.have.length(1);
      expect(frameworkManager.activeFrameworks[0].name).to.equal(frameworkName);
    });

    it('should handle framework not found', async () => {
      const frameworkName = 'non_existent_framework';
      mockFrameworkLoader.getFramework.withArgs(frameworkName).returns(undefined);

      const result = await frameworkManager.activateFramework(frameworkName);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Framework not found');
      expect(frameworkManager.activeFrameworks).to.have.length(0);
    });

    it('should handle validation errors', async () => {
      const frameworkName = 'invalid_framework';
      const mockFramework = {
        name: frameworkName,
        config: { name: frameworkName }
      };

      mockFrameworkLoader.getFramework.withArgs(frameworkName).returns(mockFramework);
      mockFrameworkValidator.validateFramework.returns({ 
        valid: false, 
        errors: ['Invalid configuration'] 
      });

      const result = await frameworkManager.activateFramework(frameworkName);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Invalid configuration');
      expect(frameworkManager.activeFrameworks).to.have.length(0);
    });

    it('should handle dependency validation errors', async () => {
      const frameworkName = 'dependency_framework';
      const mockFramework = {
        name: frameworkName,
        config: {
          name: frameworkName,
          dependencies: ['missing_dependency']
        }
      };

      mockFrameworkLoader.getFramework.withArgs(frameworkName).returns(mockFramework);
      mockFrameworkValidator.validateFramework.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateDependencies.returns({ 
        valid: false, 
        errors: ['Missing dependency: missing_dependency'] 
      });

      const result = await frameworkManager.activateFramework(frameworkName);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Missing dependency');
      expect(frameworkManager.activeFrameworks).to.have.length(0);
    });

    it('should prevent duplicate activation', async () => {
      const frameworkName = 'duplicate_framework';
      const mockFramework = {
        name: frameworkName,
        config: {
          name: frameworkName,
          dependencies: ['core']
        }
      };

      mockFrameworkLoader.getFramework.withArgs(frameworkName).returns(mockFramework);
      mockFrameworkValidator.validateFramework.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateDependencies.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateActivation.returns({ valid: true, errors: [] });

      // Activate first time
      const result1 = await frameworkManager.activateFramework(frameworkName);
      expect(result1.success).to.be.true;

      // Try to activate again
      const result2 = await frameworkManager.activateFramework(frameworkName);
      expect(result2.success).to.be.false;
      expect(result2.error).to.include('already active');
      expect(frameworkManager.activeFrameworks).to.have.length(1);
    });
  });

  describe('Framework Deactivation', () => {
    beforeEach(async () => {
      await frameworkManager.initialize(mockFrameworkLoader, mockFrameworkValidator);
    });

    it('should deactivate framework successfully', async () => {
      const frameworkName = 'test_framework';
      const mockFramework = {
        name: frameworkName,
        config: { name: frameworkName, dependencies: ['core'] }
      };

      // Activate framework first
      mockFrameworkLoader.getFramework.withArgs(frameworkName).returns(mockFramework);
      mockFrameworkValidator.validateFramework.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateDependencies.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateActivation.returns({ valid: true, errors: [] });

      await frameworkManager.activateFramework(frameworkName);
      expect(frameworkManager.activeFrameworks).to.have.length(1);

      // Deactivate framework
      const result = await frameworkManager.deactivateFramework(frameworkName);

      expect(result.success).to.be.true;
      expect(frameworkManager.activeFrameworks).to.have.length(0);
    });

    it('should handle deactivation of non-active framework', async () => {
      const frameworkName = 'non_active_framework';

      const result = await frameworkManager.deactivateFramework(frameworkName);

      expect(result.success).to.be.false;
      expect(result.error).to.include('not active');
    });

    it('should handle deactivation errors', async () => {
      const frameworkName = 'error_framework';
      const mockFramework = {
        name: frameworkName,
        config: { name: frameworkName, dependencies: ['core'] }
      };

      // Activate framework first
      mockFrameworkLoader.getFramework.withArgs(frameworkName).returns(mockFramework);
      mockFrameworkValidator.validateFramework.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateDependencies.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateActivation.returns({ valid: true, errors: [] });

      await frameworkManager.activateFramework(frameworkName);

      // Mock deactivation error
      sandbox.stub(frameworkManager, 'performDeactivation').rejects(new Error('Deactivation failed'));

      const result = await frameworkManager.deactivateFramework(frameworkName);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Deactivation failed');
    });
  });

  describe('Framework Management', () => {
    beforeEach(async () => {
      await frameworkManager.initialize(mockFrameworkLoader, mockFrameworkValidator);
    });

    it('should get active framework by name', async () => {
      const frameworkName = 'active_framework';
      const mockFramework = {
        name: frameworkName,
        config: { name: frameworkName, dependencies: ['core'] }
      };

      // Activate framework
      mockFrameworkLoader.getFramework.withArgs(frameworkName).returns(mockFramework);
      mockFrameworkValidator.validateFramework.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateDependencies.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateActivation.returns({ valid: true, errors: [] });

      await frameworkManager.activateFramework(frameworkName);

      const activeFramework = frameworkManager.getActiveFramework(frameworkName);
      expect(activeFramework).to.not.be.undefined;
      expect(activeFramework.name).to.equal(frameworkName);
    });

    it('should return undefined for non-active framework', () => {
      const activeFramework = frameworkManager.getActiveFramework('non_active');
      expect(activeFramework).to.be.undefined;
    });

    it('should get all active frameworks', async () => {
      const framework1 = {
        name: 'framework1',
        config: { name: 'framework1', dependencies: ['core'] }
      };
      const framework2 = {
        name: 'framework2',
        config: { name: 'framework2', dependencies: ['core'] }
      };

      // Activate frameworks
      mockFrameworkLoader.getFramework.withArgs('framework1').returns(framework1);
      mockFrameworkLoader.getFramework.withArgs('framework2').returns(framework2);
      mockFrameworkValidator.validateFramework.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateDependencies.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateActivation.returns({ valid: true, errors: [] });

      await frameworkManager.activateFramework('framework1');
      await frameworkManager.activateFramework('framework2');

      const activeFrameworks = frameworkManager.getAllActiveFrameworks();
      expect(activeFrameworks).to.have.length(2);
      expect(activeFrameworks.map(f => f.name)).to.include('framework1');
      expect(activeFrameworks.map(f => f.name)).to.include('framework2');
    });

    it('should get active frameworks by category', async () => {
      const refactoringFramework = {
        name: 'refactoring_framework',
        config: { name: 'refactoring_framework', category: 'refactoring', dependencies: ['core'] }
      };
      const testingFramework = {
        name: 'testing_framework',
        config: { name: 'testing_framework', category: 'testing', dependencies: ['core'] }
      };

      // Activate frameworks
      mockFrameworkLoader.getFramework.withArgs('refactoring_framework').returns(refactoringFramework);
      mockFrameworkLoader.getFramework.withArgs('testing_framework').returns(testingFramework);
      mockFrameworkValidator.validateFramework.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateDependencies.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateActivation.returns({ valid: true, errors: [] });

      await frameworkManager.activateFramework('refactoring_framework');
      await frameworkManager.activateFramework('testing_framework');

      const refactoringFrameworks = frameworkManager.getActiveFrameworksByCategory('refactoring');
      expect(refactoringFrameworks).to.have.length(1);
      expect(refactoringFrameworks[0].name).to.equal('refactoring_framework');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await frameworkManager.initialize(mockFrameworkLoader, mockFrameworkValidator);
    });

    it('should provide accurate statistics', async () => {
      const framework1 = {
        name: 'framework1',
        config: { name: 'framework1', category: 'refactoring', dependencies: ['core'] }
      };
      const framework2 = {
        name: 'framework2',
        config: { name: 'framework2', category: 'testing', dependencies: ['core'] }
      };

      // Activate frameworks
      mockFrameworkLoader.getFramework.withArgs('framework1').returns(framework1);
      mockFrameworkLoader.getFramework.withArgs('framework2').returns(framework2);
      mockFrameworkValidator.validateFramework.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateDependencies.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateActivation.returns({ valid: true, errors: [] });

      await frameworkManager.activateFramework('framework1');
      await frameworkManager.activateFramework('framework2');

      const stats = frameworkManager.getStats();
      expect(stats.totalActiveFrameworks).to.equal(2);
      expect(stats.categories).to.have.property('refactoring', 1);
      expect(stats.categories).to.have.property('testing', 1);
      expect(stats.isInitialized).to.be.true;
    });

    it('should handle empty statistics', () => {
      const stats = frameworkManager.getStats();
      expect(stats.totalActiveFrameworks).to.equal(0);
      expect(stats.categories).to.be.an('object').that.is.empty;
      expect(stats.isInitialized).to.be.true;
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await frameworkManager.initialize(mockFrameworkLoader, mockFrameworkValidator);
    });

    it('should handle activation errors gracefully', async () => {
      const frameworkName = 'error_framework';
      const mockFramework = {
        name: frameworkName,
        config: { name: frameworkName, dependencies: ['core'] }
      };

      mockFrameworkLoader.getFramework.withArgs(frameworkName).returns(mockFramework);
      mockFrameworkValidator.validateFramework.rejects(new Error('Validation failed'));

      const result = await frameworkManager.activateFramework(frameworkName);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Validation failed');
    });

    it('should handle deactivation errors gracefully', async () => {
      const frameworkName = 'deactivation_error_framework';
      const mockFramework = {
        name: frameworkName,
        config: { name: frameworkName, dependencies: ['core'] }
      };

      // Activate framework first
      mockFrameworkLoader.getFramework.withArgs(frameworkName).returns(mockFramework);
      mockFrameworkValidator.validateFramework.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateDependencies.returns({ valid: true, errors: [] });
      mockFrameworkValidator.validateActivation.returns({ valid: true, errors: [] });

      await frameworkManager.activateFramework(frameworkName);

      // Mock deactivation error
      sandbox.stub(frameworkManager, 'performDeactivation').rejects(new Error('Deactivation error'));

      const result = await frameworkManager.deactivateFramework(frameworkName);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Deactivation error');
    });
  });
}); 