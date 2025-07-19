const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;
const FrameworkStepRegistry = require('../../../infrastructure/framework/FrameworkStepRegistry');

describe('FrameworkStepRegistry', () => {
  let frameworkStepRegistry;
  let sandbox;
  let mockStepRegistry;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    frameworkStepRegistry = new FrameworkStepRegistry();
    
    // Mock step registry
    mockStepRegistry = {
      register: sandbox.stub(),
      get: sandbox.stub(),
      has: sandbox.stub(),
      getAll: sandbox.stub()
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      expect(frameworkStepRegistry.frameworkSteps).to.be.instanceof(Map);
      expect(frameworkStepRegistry.frameworkDirectories).to.be.instanceof(Map);
      expect(frameworkStepRegistry.loadedFrameworks).to.be.instanceof(Set);
      expect(frameworkStepRegistry.frameworkBasePath).to.be.undefined;
      expect(frameworkStepRegistry.stepRegistry).to.be.undefined;
    });

    it('should initialize successfully with valid parameters', async () => {
      const frameworkBasePath = '/test/framework/path';
      const frameworkDirs = ['refactoring_management'];
      
      sandbox.stub(fs, 'readdir').resolves(frameworkDirs);
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
      sandbox.stub(fs, 'access').resolves(); // File exists
      sandbox.stub(require, 'resolve').returns('/test/path');

      await frameworkStepRegistry.initialize(frameworkBasePath, mockStepRegistry);

      expect(frameworkStepRegistry.frameworkBasePath).to.equal(frameworkBasePath);
      expect(frameworkStepRegistry.stepRegistry).to.equal(mockStepRegistry);
      expect(frameworkStepRegistry.loadedFrameworks.has('refactoring_management')).to.be.true;
    });

    it('should handle initialization errors gracefully', async () => {
      const frameworkBasePath = '/invalid/path';
      sandbox.stub(fs, 'readdir').rejects(new Error('Directory not found'));

      try {
        await frameworkStepRegistry.initialize(frameworkBasePath, mockStepRegistry);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Directory not found');
      }
    });
  });

  describe('Framework Discovery', () => {
    it('should discover valid framework directories', async () => {
      const frameworkBasePath = '/test/framework/path';
      const frameworkDirs = ['refactoring_management', 'testing_management'];
      
      sandbox.stub(fs, 'readdir').resolves(frameworkDirs);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {}
      }));

      await frameworkStepRegistry.discoverFrameworks();

      expect(frameworkStepRegistry.frameworkDirectories.size).to.equal(2);
      expect(frameworkStepRegistry.frameworkDirectories.has('refactoring_management')).to.be.true;
      expect(frameworkStepRegistry.frameworkDirectories.has('testing_management')).to.be.true;
    });

    it('should skip non-directory items', async () => {
      const frameworkBasePath = '/test/framework/path';
      const items = ['refactoring_management', 'README.md', 'testing_management'];
      
      sandbox.stub(fs, 'readdir').resolves(items);
      sandbox.stub(fs, 'stat').callsFake((filePath) => {
        const isDir = !filePath.endsWith('.md');
        return Promise.resolve({ isDirectory: () => isDir });
      });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {}
      }));

      await frameworkStepRegistry.discoverFrameworks();

      expect(frameworkStepRegistry.frameworkDirectories.size).to.equal(2);
      expect(frameworkStepRegistry.frameworkDirectories.has('README.md')).to.be.false;
    });

    it('should handle invalid framework configurations', async () => {
      const frameworkBasePath = '/test/framework/path';
      const frameworkDirs = ['invalid_framework'];
      
      sandbox.stub(fs, 'readdir').resolves(frameworkDirs);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').rejects(new Error('Invalid JSON'));

      await frameworkStepRegistry.discoverFrameworks();

      expect(frameworkStepRegistry.frameworkDirectories.size).to.equal(0);
    });
  });

  describe('Step Loading', () => {
    it('should load framework steps successfully', async () => {
      const frameworkName = 'refactoring_management';
      const frameworkInfo = {
        path: '/test/framework/refactoring_management',
        config: {
          name: frameworkName,
          steps: {
            refactor_step: {
              name: 'refactor_step',
              file: 'steps/refactor_step.js'
            },
            refactor_analyze: {
              name: 'refactor_analyze',
              file: 'steps/refactor_analyze.js'
            }
          }
        },
        stepsPath: '/test/framework/refactoring_management/steps'
      };

      sandbox.stub(fs, 'access').resolves(); // File exists
      sandbox.stub(require, 'resolve').returns('/test/path');

      await frameworkStepRegistry.loadFrameworkStepsFromDirectory(frameworkName, frameworkInfo);

      expect(frameworkStepRegistry.frameworkSteps.size).to.equal(2);
      expect(frameworkStepRegistry.frameworkSteps.has('refactoring_management.refactor_step')).to.be.true;
      expect(frameworkStepRegistry.frameworkSteps.has('refactoring_management.refactor_analyze')).to.be.true;
      expect(frameworkStepRegistry.loadedFrameworks.has(frameworkName)).to.be.true;
    });

    it('should handle missing steps directory', async () => {
      const frameworkName = 'missing_steps_framework';
      const frameworkInfo = {
        path: '/test/framework/missing_steps_framework',
        config: {
          name: frameworkName,
          steps: {}
        },
        stepsPath: '/test/framework/missing_steps_framework/steps'
      };

      sandbox.stub(fs, 'access').rejects(new Error('Directory not found'));

      await frameworkStepRegistry.loadFrameworkStepsFromDirectory(frameworkName, frameworkInfo);

      expect(frameworkStepRegistry.frameworkSteps.size).to.equal(0);
      expect(frameworkStepRegistry.loadedFrameworks.has(frameworkName)).to.be.false;
    });

    it('should handle missing step files', async () => {
      const frameworkName = 'missing_files_framework';
      const frameworkInfo = {
        path: '/test/framework/missing_files_framework',
        config: {
          name: frameworkName,
          steps: {
            missing_step: {
              name: 'missing_step',
              file: 'steps/missing_step.js'
            }
          }
        },
        stepsPath: '/test/framework/missing_files_framework/steps'
      };

      sandbox.stub(fs, 'access').callsFake((filePath) => {
        if (filePath.includes('missing_step.js')) {
          return Promise.reject(new Error('File not found'));
        }
        return Promise.resolve();
      });

      await frameworkStepRegistry.loadFrameworkStepsFromDirectory(frameworkName, frameworkInfo);

      expect(frameworkStepRegistry.frameworkSteps.size).to.equal(0);
    });

    it('should handle invalid step modules', async () => {
      const frameworkName = 'invalid_module_framework';
      const frameworkInfo = {
        path: '/test/framework/invalid_module_framework',
        config: {
          name: frameworkName,
          steps: {
            invalid_step: {
              name: 'invalid_step',
              file: 'steps/invalid_step.js'
            }
          }
        },
        stepsPath: '/test/framework/invalid_module_framework/steps'
      };

      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(require, 'resolve').returns('/test/path');
      sandbox.stub(require, 'main').returns({}); // Invalid module (no config or execute)

      await frameworkStepRegistry.loadFrameworkStepsFromDirectory(frameworkName, frameworkInfo);

      expect(frameworkStepRegistry.frameworkSteps.size).to.equal(0);
    });
  });

  describe('Step Registration', () => {
    beforeEach(async () => {
      frameworkStepRegistry.stepRegistry = mockStepRegistry;
    });

    it('should register framework steps with main registry', async () => {
      const stepKey = 'refactoring_management.refactor_step';
      const stepInfo = {
        framework: 'refactoring_management',
        name: 'refactor_step',
        config: {
          name: 'refactor_step',
          type: 'refactoring',
          category: 'orchestration',
          description: 'Main refactoring orchestration step',
          dependencies: ['stepRegistry', 'projectPath']
        },
        module: {
          config: { name: 'refactor_step' },
          execute: async () => ({ success: true })
        },
        filePath: '/test/path/steps/refactor_step.js'
      };

      frameworkStepRegistry.frameworkSteps.set(stepKey, stepInfo);

      await frameworkStepRegistry.registerFrameworkSteps();

      expect(mockStepRegistry.register.calledOnce).to.be.true;
      const registeredStep = mockStepRegistry.register.firstCall.args[1];
      expect(registeredStep.name).to.equal('refactor_step');
      expect(registeredStep.framework).to.equal('refactoring_management');
      expect(registeredStep.execute).to.be.a('function');
    });

    it('should handle registration errors gracefully', async () => {
      const stepKey = 'refactoring_management.error_step';
      const stepInfo = {
        framework: 'refactoring_management',
        name: 'error_step',
        config: { name: 'error_step' },
        module: {
          config: { name: 'error_step' },
          execute: async () => ({ success: true })
        },
        filePath: '/test/path/steps/error_step.js'
      };

      frameworkStepRegistry.frameworkSteps.set(stepKey, stepInfo);
      mockStepRegistry.register.rejects(new Error('Registration failed'));

      await frameworkStepRegistry.registerFrameworkSteps();

      // Should not throw error, just log it
      expect(mockStepRegistry.register.calledOnce).to.be.true;
    });

    it('should handle missing step registry', async () => {
      frameworkStepRegistry.stepRegistry = null;
      const stepKey = 'refactoring_management.test_step';
      const stepInfo = {
        framework: 'refactoring_management',
        name: 'test_step',
        config: { name: 'test_step' },
        module: {
          config: { name: 'test_step' },
          execute: async () => ({ success: true })
        },
        filePath: '/test/path/steps/test_step.js'
      };

      frameworkStepRegistry.frameworkSteps.set(stepKey, stepInfo);

      await frameworkStepRegistry.registerFrameworkSteps();

      // Should not throw error, just log warning
      expect(mockStepRegistry.register.called).to.be.false;
    });
  });

  describe('Framework Management', () => {
    beforeEach(async () => {
      const stepKey1 = 'refactoring_management.step1';
      const stepKey2 = 'testing_management.step2';
      
      frameworkStepRegistry.frameworkSteps.set(stepKey1, {
        framework: 'refactoring_management',
        name: 'step1',
        config: { name: 'step1' },
        module: { config: {}, execute: async () => ({}) },
        filePath: '/test/path1'
      });
      
      frameworkStepRegistry.frameworkSteps.set(stepKey2, {
        framework: 'testing_management',
        name: 'step2',
        config: { name: 'step2' },
        module: { config: {}, execute: async () => ({}) },
        filePath: '/test/path2'
      });

      frameworkStepRegistry.loadedFrameworks.add('refactoring_management');
      frameworkStepRegistry.loadedFrameworks.add('testing_management');
    });

    it('should get all framework steps', () => {
      const steps = frameworkStepRegistry.getFrameworkSteps();
      expect(steps).to.have.length(2);
      expect(steps).to.include('refactoring_management.step1');
      expect(steps).to.include('testing_management.step2');
    });

    it('should get steps for specific framework', () => {
      const steps = frameworkStepRegistry.getFrameworkStepsByName('refactoring_management');
      expect(steps).to.have.length(1);
      expect(steps[0]).to.equal('refactoring_management.step1');
    });

    it('should check if step is framework step', () => {
      expect(frameworkStepRegistry.isFrameworkStep('refactoring_management.step1')).to.be.true;
      expect(frameworkStepRegistry.isFrameworkStep('core.step')).to.be.false;
    });

    it('should get framework step info', () => {
      const stepInfo = frameworkStepRegistry.getFrameworkStepInfo('refactoring_management.step1');
      expect(stepInfo).to.not.be.undefined;
      expect(stepInfo.framework).to.equal('refactoring_management');
      expect(stepInfo.name).to.equal('step1');
    });

    it('should return undefined for non-existent step', () => {
      const stepInfo = frameworkStepRegistry.getFrameworkStepInfo('non_existent.step');
      expect(stepInfo).to.be.undefined;
    });

    it('should get loaded frameworks', () => {
      const frameworks = frameworkStepRegistry.getLoadedFrameworks();
      expect(frameworks).to.have.length(2);
      expect(frameworks).to.include('refactoring_management');
      expect(frameworks).to.include('testing_management');
    });
  });

  describe('Framework Reloading', () => {
    beforeEach(async () => {
      frameworkStepRegistry.stepRegistry = mockStepRegistry;
      
      const frameworkInfo = {
        path: '/test/framework/refactoring_management',
        config: {
          name: 'refactoring_management',
          steps: {
            reload_step: {
              name: 'reload_step',
              file: 'steps/reload_step.js'
            }
          }
        },
        stepsPath: '/test/framework/refactoring_management/steps'
      };

      frameworkStepRegistry.frameworkDirectories.set('refactoring_management', frameworkInfo);
      
      // Add existing step
      frameworkStepRegistry.frameworkSteps.set('refactoring_management.old_step', {
        framework: 'refactoring_management',
        name: 'old_step',
        config: { name: 'old_step' },
        module: { config: {}, execute: async () => ({}) },
        filePath: '/test/path'
      });

      frameworkStepRegistry.loadedFrameworks.add('refactoring_management');
    });

    it('should reload framework successfully', async () => {
      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(require, 'resolve').returns('/test/path');

      await frameworkStepRegistry.reloadFramework('refactoring_management');

      // Old step should be removed
      expect(frameworkStepRegistry.frameworkSteps.has('refactoring_management.old_step')).to.be.false;
      
      // New step should be loaded
      expect(frameworkStepRegistry.frameworkSteps.has('refactoring_management.reload_step')).to.be.true;
    });

    it('should handle reload of non-existent framework', async () => {
      try {
        await frameworkStepRegistry.reloadFramework('non_existent_framework');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Framework non_existent_framework not found');
      }
    });

    it('should handle reload errors gracefully', async () => {
      sandbox.stub(fs, 'access').rejects(new Error('Access denied'));

      try {
        await frameworkStepRegistry.reloadFramework('refactoring_management');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Access denied');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      sandbox.stub(fs, 'readdir').rejects(new Error('Permission denied'));

      try {
        await frameworkStepRegistry.discoverFrameworks();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Permission denied');
      }
    });

    it('should handle JSON parsing errors', async () => {
      const frameworkBasePath = '/test/framework/path';
      const frameworkDirs = ['invalid_framework'];
      
      sandbox.stub(fs, 'readdir').resolves(frameworkDirs);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves('invalid json content');

      await frameworkStepRegistry.discoverFrameworks();

      expect(frameworkStepRegistry.frameworkDirectories.size).to.equal(0);
    });

    it('should handle module loading errors', async () => {
      const frameworkName = 'module_error_framework';
      const frameworkInfo = {
        path: '/test/framework/module_error_framework',
        config: {
          name: frameworkName,
          steps: {
            error_step: {
              name: 'error_step',
              file: 'steps/error_step.js'
            }
          }
        },
        stepsPath: '/test/framework/module_error_framework/steps'
      };

      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(require, 'resolve').throws(new Error('Module not found'));

      await frameworkStepRegistry.loadFrameworkStepsFromDirectory(frameworkName, frameworkInfo);

      expect(frameworkStepRegistry.frameworkSteps.size).to.equal(0);
    });
  });
}); 