const { expect } = require('chai');
const sinon = require('sinon');
const FrameworkValidator = require('../../../infrastructure/framework/FrameworkValidator');

describe('FrameworkValidator', () => {
  let frameworkValidator;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    frameworkValidator = new FrameworkValidator();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      expect(frameworkValidator.isInitialized).to.be.false;
      expect(frameworkValidator.validationRules).to.be.an('object');
      expect(frameworkValidator.dependencyRegistry).to.be.undefined;
    });

    it('should initialize successfully', async () => {
      await frameworkValidator.initialize();

      expect(frameworkValidator.isInitialized).to.be.true;
      expect(frameworkValidator.validationRules).to.be.an('object');
      expect(frameworkValidator.validationRules.requiredFields).to.be.an('array');
      expect(frameworkValidator.validationRules.fieldTypes).to.be.an('object');
    });
  });

  describe('Framework Validation', () => {
    beforeEach(async () => {
      await frameworkValidator.initialize();
    });

    it('should validate framework with correct structure', async () => {
      const validFramework = {
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
            description: 'Complete refactoring workflow'
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
      };

      const result = await frameworkValidator.validateFramework(validFramework);

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.an('array').that.is.empty;
      expect(result.warnings).to.be.an('array');
    });

    it('should detect missing required fields', async () => {
      const invalidFramework = {
        name: 'invalid_framework',
        // Missing required fields: version, description, category
        steps: {},
        workflows: {}
      };

      const result = await frameworkValidator.validateFramework(invalidFramework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('version'))).to.be.true;
      expect(result.errors.some(error => error.includes('description'))).to.be.true;
      expect(result.errors.some(error => error.includes('category'))).to.be.true;
    });

    it('should validate field types', async () => {
      const invalidFramework = {
        name: 'type_invalid_framework',
        version: 123, // Should be string
        description: 'Test framework',
        category: 'test',
        steps: 'invalid', // Should be object
        workflows: 'invalid', // Should be object
        dependencies: 'core' // Should be array
      };

      const result = await frameworkValidator.validateFramework(invalidFramework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('version'))).to.be.true;
      expect(result.errors.some(error => error.includes('steps'))).to.be.true;
      expect(result.errors.some(error => error.includes('workflows'))).to.be.true;
      expect(result.errors.some(error => error.includes('dependencies'))).to.be.true;
    });

    it('should validate step structure', async () => {
      const frameworkWithInvalidSteps = {
        name: 'step_invalid_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {
          invalid_step: {
            // Missing required fields
            name: 123, // Wrong type
            file: 'steps/invalid_step.js'
          },
          valid_step: {
            name: 'valid_step',
            type: 'test',
            category: 'test',
            description: 'Valid step',
            dependencies: ['core'],
            file: 'steps/valid_step.js'
          }
        },
        workflows: {}
      };

      const result = await frameworkValidator.validateFramework(frameworkWithInvalidSteps);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('invalid_step'))).to.be.true;
    });

    it('should validate workflow structure', async () => {
      const frameworkWithInvalidWorkflows = {
        name: 'workflow_invalid_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {
          test_step: {
            name: 'test_step',
            type: 'test',
            category: 'test',
            description: 'Test step',
            file: 'steps/test_step.js'
          }
        },
        workflows: {
          invalid_workflow: {
            // Missing required fields
            steps: 'invalid', // Should be array
            description: 123 // Should be string
          },
          valid_workflow: {
            name: 'valid_workflow',
            steps: ['test_step'],
            description: 'Valid workflow'
          }
        }
      };

      const result = await frameworkValidator.validateFramework(frameworkWithInvalidWorkflows);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('invalid_workflow'))).to.be.true;
    });

    it('should validate activation settings', async () => {
      const frameworkWithInvalidActivation = {
        name: 'activation_invalid_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {},
        workflows: {},
        activation: {
          auto_load: 'invalid', // Should be boolean
          requires_confirmation: 'invalid', // Should be boolean
          fallback_to_core: 'invalid' // Should be boolean
        }
      };

      const result = await frameworkValidator.validateFramework(frameworkWithInvalidActivation);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('auto_load'))).to.be.true;
      expect(result.errors.some(error => error.includes('requires_confirmation'))).to.be.true;
      expect(result.errors.some(error => error.includes('fallback_to_core'))).to.be.true;
    });

    it('should validate settings structure', async () => {
      const frameworkWithInvalidSettings = {
        name: 'settings_invalid_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {},
        workflows: {},
        settings: {
          max_file_size: 'invalid', // Should be number
          backup_enabled: 'invalid', // Should be boolean
          validation_enabled: 'invalid', // Should be boolean
          undo_enabled: 'invalid' // Should be boolean
        }
      };

      const result = await frameworkValidator.validateFramework(frameworkWithInvalidSettings);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('max_file_size'))).to.be.true;
      expect(result.errors.some(error => error.includes('backup_enabled'))).to.be.true;
      expect(result.errors.some(error => error.includes('validation_enabled'))).to.be.true;
      expect(result.errors.some(error => error.includes('undo_enabled'))).to.be.true;
    });
  });

  describe('Dependency Validation', () => {
    beforeEach(async () => {
      await frameworkValidator.initialize();
    });

    it('should validate dependencies successfully', async () => {
      const framework = {
        name: 'dependency_test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        dependencies: ['core', 'ide', 'cursor'],
        steps: {
          test_step: {
            name: 'test_step',
            dependencies: ['stepRegistry', 'projectPath'],
            file: 'steps/test_step.js'
          }
        },
        workflows: {}
      };

      const result = await frameworkValidator.validateDependencies(framework);

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.an('array').that.is.empty;
      expect(result.missingDependencies).to.be.an('array').that.is.empty;
    });

    it('should detect missing dependencies', async () => {
      const framework = {
        name: 'missing_deps_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        dependencies: ['core', 'missing_dependency'],
        steps: {
          test_step: {
            name: 'test_step',
            dependencies: ['stepRegistry', 'missing_step_dep'],
            file: 'steps/test_step.js'
          }
        },
        workflows: {}
      };

      const result = await frameworkValidator.validateDependencies(framework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.missingDependencies).to.be.an('array').that.is.not.empty;
      expect(result.missingDependencies).to.include('missing_dependency');
      expect(result.missingDependencies).to.include('missing_step_dep');
    });

    it('should validate circular dependencies', async () => {
      const framework = {
        name: 'circular_deps_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        dependencies: ['core'],
        steps: {
          step1: {
            name: 'step1',
            dependencies: ['step2'],
            file: 'steps/step1.js'
          },
          step2: {
            name: 'step2',
            dependencies: ['step1'],
            file: 'steps/step2.js'
          }
        },
        workflows: {}
      };

      const result = await frameworkValidator.validateDependencies(framework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('circular'))).to.be.true;
    });

    it('should validate workflow step dependencies', async () => {
      const framework = {
        name: 'workflow_deps_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        dependencies: ['core'],
        steps: {
          step1: {
            name: 'step1',
            dependencies: ['core'],
            file: 'steps/step1.js'
          }
        },
        workflows: {
          test_workflow: {
            name: 'test_workflow',
            steps: ['step1', 'missing_step'],
            description: 'Test workflow'
          }
        }
      };

      const result = await frameworkValidator.validateDependencies(framework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('missing_step'))).to.be.true;
    });
  });

  describe('Activation Validation', () => {
    beforeEach(async () => {
      await frameworkValidator.initialize();
    });

    it('should validate activation settings successfully', async () => {
      const framework = {
        name: 'activation_test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        dependencies: ['core'],
        steps: {},
        workflows: {},
        activation: {
          auto_load: false,
          requires_confirmation: true,
          fallback_to_core: true
        }
      };

      const result = await frameworkValidator.validateActivation(framework);

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.an('array').that.is.empty;
    });

    it('should detect invalid activation settings', async () => {
      const framework = {
        name: 'invalid_activation_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        dependencies: ['core'],
        steps: {},
        workflows: {},
        activation: {
          auto_load: true,
          requires_confirmation: false,
          fallback_to_core: false // Invalid: should be true when auto_load is true
        }
      };

      const result = await frameworkValidator.validateActivation(framework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('fallback_to_core'))).to.be.true;
    });

    it('should validate activation with missing dependencies', async () => {
      const framework = {
        name: 'missing_deps_activation_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        dependencies: ['missing_dependency'],
        steps: {},
        workflows: {},
        activation: {
          auto_load: true,
          requires_confirmation: false,
          fallback_to_core: true
        }
      };

      const result = await frameworkValidator.validateActivation(framework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('missing_dependency'))).to.be.true;
    });
  });

  describe('Custom Validation Rules', () => {
    beforeEach(async () => {
      await frameworkValidator.initialize();
    });

    it('should add custom validation rules', () => {
      const customRule = {
        name: 'custom_rule',
        validate: (framework) => {
          if (framework.name.length < 3) {
            return { valid: false, error: 'Framework name too short' };
          }
          return { valid: true };
        }
      };

      frameworkValidator.addValidationRule(customRule);

      expect(frameworkValidator.validationRules.custom).to.be.an('array');
      expect(frameworkValidator.validationRules.custom).to.have.length(1);
    });

    it('should apply custom validation rules', async () => {
      const customRule = {
        name: 'name_length_rule',
        validate: (framework) => {
          if (framework.name.length < 5) {
            return { valid: false, error: 'Framework name must be at least 5 characters' };
          }
          return { valid: true };
        }
      };

      frameworkValidator.addValidationRule(customRule);

      const shortNameFramework = {
        name: 'abc',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {},
        workflows: {}
      };

      const result = await frameworkValidator.validateFramework(shortNameFramework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('5 characters'))).to.be.true;
    });

    it('should handle multiple custom validation rules', async () => {
      const rule1 = {
        name: 'rule1',
        validate: (framework) => {
          if (!framework.author) {
            return { valid: false, error: 'Author is required' };
          }
          return { valid: true };
        }
      };

      const rule2 = {
        name: 'rule2',
        validate: (framework) => {
          if (framework.version === '0.0.0') {
            return { valid: false, error: 'Version cannot be 0.0.0' };
          }
          return { valid: true };
        }
      };

      frameworkValidator.addValidationRule(rule1);
      frameworkValidator.addValidationRule(rule2);

      const invalidFramework = {
        name: 'test_framework',
        version: '0.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {},
        workflows: {}
        // Missing author
      };

      const result = await frameworkValidator.validateFramework(invalidFramework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('Author is required'))).to.be.true;
      expect(result.errors.some(error => error.includes('0.0.0'))).to.be.true;
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await frameworkValidator.initialize();
    });

    it('should handle validation errors gracefully', async () => {
      const invalidFramework = null;

      const result = await frameworkValidator.validateFramework(invalidFramework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors[0]).to.include('Framework is required');
    });

    it('should handle dependency validation errors gracefully', async () => {
      const framework = {
        name: 'error_test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        dependencies: ['core'],
        steps: {},
        workflows: {}
      };

      // Mock dependency check to throw error
      sandbox.stub(frameworkValidator, 'checkDependency').rejects(new Error('Dependency check failed'));

      const result = await frameworkValidator.validateDependencies(framework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors[0]).to.include('Dependency check failed');
    });

    it('should handle activation validation errors gracefully', async () => {
      const framework = {
        name: 'activation_error_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        dependencies: ['core'],
        steps: {},
        workflows: {},
        activation: {
          auto_load: true,
          requires_confirmation: false,
          fallback_to_core: false
        }
      };

      // Mock dependency validation to throw error
      sandbox.stub(frameworkValidator, 'validateDependencies').rejects(new Error('Activation validation failed'));

      const result = await frameworkValidator.validateActivation(framework);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors[0]).to.include('Activation validation failed');
    });
  });

  describe('Statistics and Reporting', () => {
    beforeEach(async () => {
      await frameworkValidator.initialize();
    });

    it('should provide validation statistics', async () => {
      const frameworks = [
        {
          name: 'valid_framework',
          version: '1.0.0',
          description: 'Valid framework',
          category: 'test',
          steps: {},
          workflows: {}
        },
        {
          name: 'invalid_framework',
          // Missing required fields
          steps: {},
          workflows: {}
        }
      ];

      // Validate frameworks
      for (const framework of frameworks) {
        await frameworkValidator.validateFramework(framework);
      }

      const stats = frameworkValidator.getValidationStats();

      expect(stats).to.be.an('object');
      expect(stats.totalValidations).to.be.a('number');
      expect(stats.successfulValidations).to.be.a('number');
      expect(stats.failedValidations).to.be.a('number');
      expect(stats.isInitialized).to.be.true;
    });

    it('should provide detailed validation reports', async () => {
      const framework = {
        name: 'detailed_test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        dependencies: ['core'],
        steps: {
          test_step: {
            name: 'test_step',
            file: 'steps/test_step.js'
          }
        },
        workflows: {
          test_workflow: {
            name: 'test_workflow',
            steps: ['test_step'],
            description: 'Test workflow'
          }
        }
      };

      const result = await frameworkValidator.validateFramework(framework);

      expect(result).to.have.property('valid');
      expect(result).to.have.property('errors');
      expect(result).to.have.property('warnings');
      expect(result).to.have.property('validationTime');
      expect(result.validationTime).to.be.a('number');
    });
  });
}); 