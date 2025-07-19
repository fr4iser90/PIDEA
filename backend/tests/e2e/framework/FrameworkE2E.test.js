const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;

// Import the main Application class to test full integration
const Application = require('../../../Application');

describe('Framework E2E Tests', () => {
  let sandbox;
  let app;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    if (app) {
      app = null;
    }
  });

  describe('Complete Framework Workflow', () => {
    beforeEach(async () => {
      // Mock file system operations for framework discovery
      sandbox.stub(fs, 'readdir').resolves(['refactoring_management', 'testing_management']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
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
          },
          refactor_analyze: {
            name: 'refactor_analyze',
            type: 'refactoring',
            category: 'analysis',
            description: 'Analyze code for refactoring opportunities',
            dependencies: ['ide', 'cursor'],
            file: 'steps/refactor_analyze.js'
          },
          refactor_generate_task: {
            name: 'refactor_generate_task',
            type: 'refactoring',
            category: 'task_generation',
            description: 'Generate refactoring tasks',
            dependencies: ['taskService'],
            file: 'steps/refactor_generate_task.js'
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

      // Mock core services
      sandbox.stub(require('../../../domain/services/TaskService'), 'default').returns({
        createTask: sandbox.stub().resolves({ id: 'task-123', success: true }),
        getTask: sandbox.stub().resolves({ id: 'task-123', status: 'completed' })
      });

      // Mock IDE and cursor services
      sandbox.stub(require('../../../domain/services/IDEService'), 'default').returns({
        getCurrentFile: sandbox.stub().resolves('/test/file.js'),
        getProjectPath: sandbox.stub().resolves('/test/project'),
        readFile: sandbox.stub().resolves('console.log("test");'),
        writeFile: sandbox.stub().resolves(true)
      });

      sandbox.stub(require('../../../domain/services/CursorService'), 'default').returns({
        getCurrentPosition: sandbox.stub().resolves({ line: 1, column: 1 }),
        getSelection: sandbox.stub().resolves('console.log("test");'),
        setPosition: sandbox.stub().resolves(true)
      });

      // Initialize application
      app = new Application();
      await app.initialize();
    });

    it('should complete full framework workflow from initialization to step execution', async () => {
      // 1. Verify framework infrastructure is initialized
      expect(app.frameworkManager).to.not.be.undefined;
      expect(app.frameworkLoader).to.not.be.undefined;
      expect(app.frameworkValidator).to.not.be.undefined;
      expect(app.frameworkConfig).to.not.be.undefined;
      expect(app.frameworkStepRegistry).to.not.be.undefined;

      // 2. Verify frameworks are discovered and loaded
      const frameworks = app.frameworkLoader.getFrameworks();
      expect(frameworks).to.have.length(2);
      expect(frameworks.map(f => f.name)).to.include('refactoring_management');
      expect(frameworks.map(f => f.name)).to.include('testing_management');

      // 3. Verify framework steps are registered
      const frameworkSteps = app.frameworkStepRegistry.getFrameworkSteps();
      expect(frameworkSteps.length).to.be.greaterThan(0);
      expect(frameworkSteps.some(step => step.includes('refactoring_management'))).to.be.true;

      // 4. Activate refactoring framework
      const activationResult = await app.frameworkManager.activateFramework('refactoring_management');
      expect(activationResult.success).to.be.true;
      expect(activationResult.framework.name).to.equal('refactoring_management');

      // 5. Verify framework is active
      const activeFrameworks = app.frameworkManager.getAllActiveFrameworks();
      expect(activeFrameworks).to.have.length(1);
      expect(activeFrameworks[0].name).to.equal('refactoring_management');

      // 6. Execute framework step
      const stepKey = 'refactoring_management.refactor_step';
      const stepInfo = app.frameworkStepRegistry.getFrameworkStepInfo(stepKey);
      expect(stepInfo).to.not.be.undefined;

      // Mock step execution
      const mockExecute = sandbox.stub().resolves({
        success: true,
        result: 'Refactoring completed successfully',
        changes: ['extracted method', 'renamed variable']
      });

      // Replace the step's execute function with mock
      if (stepInfo && stepInfo.module) {
        stepInfo.module.execute = mockExecute;
      }

      // 7. Execute the step through the main step registry
      const executionResult = await app.stepRegistry.executeStep(stepKey, {
        projectPath: '/test/project',
        filePath: '/test/file.js',
        context: 'refactoring'
      });

      expect(executionResult.success).to.be.true;
      expect(mockExecute.calledOnce).to.be.true;

      // 8. Verify step execution context
      const executionCall = mockExecute.firstCall;
      expect(executionCall.args[0]).to.have.property('projectPath', '/test/project');
      expect(executionCall.args[0]).to.have.property('filePath', '/test/file.js');
      expect(executionCall.args[0]).to.have.property('context', 'refactoring');
    });

    it('should handle framework workflow execution', async () => {
      // 1. Activate framework
      await app.frameworkManager.activateFramework('refactoring_management');

      // 2. Get framework workflow
      const framework = app.frameworkLoader.getFramework('refactoring_management');
      const workflow = framework.config.workflows.complete_refactoring;
      expect(workflow).to.not.be.undefined;
      expect(workflow.steps).to.have.length(3);

      // 3. Mock step executions
      const mockExecute = sandbox.stub().resolves({
        success: true,
        result: 'Step executed successfully'
      });

      // Mock all framework steps
      const stepKeys = [
        'refactoring_management.refactor_analyze',
        'refactoring_management.refactor_generate_task',
        'refactoring_management.refactor_step'
      ];

      stepKeys.forEach(stepKey => {
        const stepInfo = app.frameworkStepRegistry.getFrameworkStepInfo(stepKey);
        if (stepInfo && stepInfo.module) {
          stepInfo.module.execute = mockExecute;
        }
      });

      // 4. Execute workflow steps
      const workflowContext = {
        projectPath: '/test/project',
        filePath: '/test/file.js',
        context: 'complete_refactoring_workflow'
      };

      for (const stepName of workflow.steps) {
        const stepKey = `refactoring_management.${stepName}`;
        const result = await app.stepRegistry.executeStep(stepKey, workflowContext);
        expect(result.success).to.be.true;
      }

      // 5. Verify all steps were executed
      expect(mockExecute.callCount).to.equal(3);
    });

    it('should handle framework deactivation and cleanup', async () => {
      // 1. Activate framework
      await app.frameworkManager.activateFramework('refactoring_management');
      expect(app.frameworkManager.getAllActiveFrameworks()).to.have.length(1);

      // 2. Deactivate framework
      const deactivationResult = await app.frameworkManager.deactivateFramework('refactoring_management');
      expect(deactivationResult.success).to.be.true;

      // 3. Verify framework is deactivated
      expect(app.frameworkManager.getAllActiveFrameworks()).to.have.length(0);

      // 4. Verify steps are still available (they remain registered)
      const frameworkSteps = app.frameworkStepRegistry.getFrameworkSteps();
      expect(frameworkSteps.length).to.be.greaterThan(0);

      // 5. Verify step execution still works (fallback behavior)
      const stepKey = 'refactoring_management.refactor_step';
      const stepInfo = app.frameworkStepRegistry.getFrameworkStepInfo(stepKey);
      expect(stepInfo).to.not.be.undefined;
    });

    it('should handle framework errors and fallback to core', async () => {
      // 1. Activate framework
      await app.frameworkManager.activateFramework('refactoring_management');

      // 2. Mock framework step to throw error
      const stepKey = 'refactoring_management.refactor_step';
      const stepInfo = app.frameworkStepRegistry.getFrameworkStepInfo(stepKey);
      
      if (stepInfo && stepInfo.module) {
        stepInfo.module.execute = sandbox.stub().rejects(new Error('Framework step failed'));
      }

      // 3. Execute step and expect error
      try {
        await app.stepRegistry.executeStep(stepKey, {
          projectPath: '/test/project',
          filePath: '/test/file.js'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Framework step failed');
      }

      // 4. Verify framework remains active (error doesn't deactivate)
      expect(app.frameworkManager.getAllActiveFrameworks()).to.have.length(1);
    });

    it('should provide comprehensive framework statistics', async () => {
      // 1. Activate frameworks
      await app.frameworkManager.activateFramework('refactoring_management');
      await app.frameworkManager.activateFramework('testing_management');

      // 2. Get statistics from all components
      const loaderStats = app.frameworkLoader.getStats();
      const managerStats = app.frameworkManager.getStats();
      const configStats = app.frameworkConfig.getConfigStats();
      const stepRegistryStats = app.frameworkStepRegistry.getLoadedFrameworks();

      // 3. Verify statistics
      expect(loaderStats.totalFrameworks).to.equal(2);
      expect(loaderStats.isInitialized).to.be.true;
      expect(managerStats.totalActiveFrameworks).to.equal(2);
      expect(managerStats.isInitialized).to.be.true;
      expect(configStats.isInitialized).to.be.true;
      expect(stepRegistryStats).to.be.an('array');
      expect(stepRegistryStats.length).to.be.greaterThan(0);

      // 4. Verify category statistics
      expect(loaderStats.categories).to.have.property('test', 2);
      expect(managerStats.categories).to.have.property('test', 2);
    });
  });

  describe('Framework Configuration and Settings', () => {
    beforeEach(async () => {
      // Mock file system operations
      sandbox.stub(fs, 'readdir').resolves(['refactoring_management']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'refactoring_management',
        version: '1.0.0',
        description: 'Test framework',
        category: 'refactoring',
        steps: {},
        workflows: {},
        activation: {
          auto_load: true,
          requires_confirmation: false,
          fallback_to_core: true
        },
        settings: {
          max_file_size: 500000,
          backup_enabled: false,
          validation_enabled: true,
          undo_enabled: false
        }
      }));
      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(require, 'resolve').returns('/test/path');

      app = new Application();
      await app.initialize();
    });

    it('should respect framework configuration settings', async () => {
      // 1. Get framework configuration
      const framework = app.frameworkLoader.getFramework('refactoring_management');
      const config = framework.config;

      // 2. Verify activation settings
      expect(config.activation.auto_load).to.be.true;
      expect(config.activation.requires_confirmation).to.be.false;
      expect(config.activation.fallback_to_core).to.be.true;

      // 3. Verify settings
      expect(config.settings.max_file_size).to.equal(500000);
      expect(config.settings.backup_enabled).to.be.false;
      expect(config.settings.validation_enabled).to.be.true;
      expect(config.settings.undo_enabled).to.be.false;

      // 4. Test auto-load behavior (if implemented)
      if (config.activation.auto_load) {
        // Framework should be auto-activated
        const activeFrameworks = app.frameworkManager.getAllActiveFrameworks();
        expect(activeFrameworks.some(f => f.name === 'refactoring_management')).to.be.true;
      }
    });

    it('should handle framework validation settings', async () => {
      const framework = app.frameworkLoader.getFramework('refactoring_management');
      
      // Test validation based on framework settings
      if (framework.config.settings.validation_enabled) {
        const validationResult = await app.frameworkValidator.validateFramework(framework);
        expect(validationResult.valid).to.be.true;
      }
    });
  });

  describe('Framework Performance and Scalability', () => {
    beforeEach(async () => {
      // Mock multiple frameworks
      const frameworkDirs = Array.from({ length: 10 }, (_, i) => `framework_${i}`);
      sandbox.stub(fs, 'readdir').resolves(frameworkDirs);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {
          test_step: {
            name: 'test_step',
            file: 'steps/test_step.js'
          }
        },
        workflows: {}
      }));
      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(require, 'resolve').returns('/test/path');

      app = new Application();
      await app.initialize();
    });

    it('should handle multiple frameworks efficiently', async () => {
      // 1. Verify all frameworks are loaded
      const frameworks = app.frameworkLoader.getFrameworks();
      expect(frameworks).to.have.length(10);

      // 2. Activate multiple frameworks
      const activationPromises = frameworks.map(f => 
        app.frameworkManager.activateFramework(f.name)
      );
      const activationResults = await Promise.all(activationPromises);

      // 3. Verify all activations succeeded
      activationResults.forEach(result => {
        expect(result.success).to.be.true;
      });

      // 4. Verify all frameworks are active
      const activeFrameworks = app.frameworkManager.getAllActiveFrameworks();
      expect(activeFrameworks).to.have.length(10);

      // 5. Test performance statistics
      const loaderStats = app.frameworkLoader.getStats();
      const managerStats = app.frameworkManager.getStats();

      expect(loaderStats.totalFrameworks).to.equal(10);
      expect(managerStats.totalActiveFrameworks).to.equal(10);
    });

    it('should provide memory and performance metrics', async () => {
      // 1. Get initial statistics
      const initialStats = app.frameworkLoader.getStats();

      // 2. Activate frameworks
      const frameworks = app.frameworkLoader.getFrameworks();
      for (const framework of frameworks.slice(0, 5)) {
        await app.frameworkManager.activateFramework(framework.name);
      }

      // 3. Get final statistics
      const finalStats = app.frameworkLoader.getStats();
      const managerStats = app.frameworkManager.getStats();

      // 4. Verify metrics are available
      expect(initialStats.totalFrameworks).to.equal(10);
      expect(finalStats.totalFrameworks).to.equal(10);
      expect(managerStats.totalActiveFrameworks).to.equal(5);
    });
  });
}); 