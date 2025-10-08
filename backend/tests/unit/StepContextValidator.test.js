/**
 * StepContextValidator Tests
 * Comprehensive test suite for step context validation
 */

const StepContextValidator = require('@steps/validation/StepContextValidator');

describe('StepContextValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new StepContextValidator({
      strictMode: true
    });
  });

  describe('Constructor', () => {
    test('should initialize with default configuration', () => {
      expect(validator.strictMode).toBe(true);
      expect(validator.validationRules).toBeDefined();
      expect(validator.stepOverrides).toBeDefined();
      expect(validator.config).toBeDefined();
    });

    test('should allow custom options', () => {
      const customValidator = new StepContextValidator({
        strictMode: false,
        logger: console
      });
      expect(customValidator.strictMode).toBe(false);
    });
  });

  describe('validateStepContext', () => {
    describe('Common validation', () => {
      test('should validate required common fields', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001'
        };

        const result = validator.validateStepContext('ide', 'ide_send_message_step', context);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should fail on missing required fields', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000'
          // Missing projectId
        };

        const result = validator.validateStepContext('ide', 'ide_send_message_step', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Required field 'projectId' is missing or null");
      });

      test('should fail on empty required fields', () => {
        const context = {
          userId: '',
          projectId: '123e4567-e89b-12d3-a456-426614174001'
        };

        const result = validator.validateStepContext('ide', 'ide_send_message_step', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Required field 'userId' is empty");
      });
    });

    describe('IDE step validation', () => {
      test('should validate IDE step with activeIDE', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          activeIDE: {
            port: 3000,
            type: 'cursor',
            workspace: '/path/to/workspace'
          },
          message: 'Test message'
        };

        const result = validator.validateStepContext('ide', 'ide_send_message_step', context);
        expect(result.isValid).toBe(true);
      });

      test('should fail IDE step without activeIDE', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          message: 'Test message'
        };

        const result = validator.validateStepContext('ide', 'ide_send_message_step', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('IDE steps require activeIDE context');
      });

      test('should validate activeIDE nested object', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          activeIDE: {
            port: 3000,
            type: 'cursor'
          }
        };

        const result = validator.validateStepContext('ide', 'ide_send_message_step', context);
        expect(result.isValid).toBe(true);
      });

      test('should fail on invalid IDE port', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          activeIDE: {
            port: 50, // Invalid port
            type: 'cursor'
          }
        };

        const result = validator.validateStepContext('ide', 'ide_send_message_step', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('IDE port must be between 1000 and 65535');
      });

      test('should fail on invalid IDE type', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          activeIDE: {
            port: 3000,
            type: 'invalid-ide'
          }
        };

        const result = validator.validateStepContext('ide', 'ide_send_message_step', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('IDE type must be one of: cursor, vscode, windsurf, jetbrains');
      });
    });

    describe('Terminal step validation', () => {
      test('should validate terminal step with command', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          command: 'npm install',
          workingDirectory: '/path/to/project'
        };

        const result = validator.validateStepContext('terminal', 'execute_terminal_step', context);
        expect(result.isValid).toBe(true);
      });

      test('should validate terminal step with script', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          script: 'console.log("Hello World");',
          interpreter: 'node'
        };

        const result = validator.validateStepContext('terminal', 'execute_terminal_script_step', context);
        expect(result.isValid).toBe(true);
      });

      test('should fail on command too long', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          command: 'a'.repeat(1001) // Too long
        };

        const result = validator.validateStepContext('terminal', 'execute_terminal_step', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Command must be less than 1000 characters');
      });

      test('should fail on invalid interpreter', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          script: 'console.log("Hello");',
          interpreter: 'invalid-interpreter'
        };

        const result = validator.validateStepContext('terminal', 'execute_terminal_script_step', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Interpreter must be one of the supported types');
      });
    });

    describe('Chat step validation', () => {
      test('should validate chat step', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          message: 'Hello, how can I help?',
          sessionId: 'session-123'
        };

        const result = validator.validateStepContext('chat', 'ide_send_message_step', context);
        expect(result.isValid).toBe(true);
      });

      test('should fail on message too long', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          message: 'a'.repeat(10001) // Too long
        };

        const result = validator.validateStepContext('chat', 'ide_send_message_step', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Message must be between 1 and 5000 characters');
      });
    });

    describe('Git step validation', () => {
      test('should validate git step', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          projectPath: '/path/to/project',
          branchName: 'feature/new-feature',
          commitMessage: 'Add new feature'
        };

        const result = validator.validateStepContext('git', 'git_create_branch', context);
        expect(result.isValid).toBe(true);
      });

      test('should fail on invalid branch name', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          projectPath: '/path/to/project',
          branchName: 'invalid branch name!' // Invalid characters
        };

        const result = validator.validateStepContext('git', 'git_create_branch', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Branch name must contain only alphanumeric characters, dots, underscores, slashes, and hyphens');
      });

      test('should fail git step without projectPath', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          branchName: 'feature/new-feature'
        };

        const result = validator.validateStepContext('git', 'git_create_branch', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Git steps require projectPath');
      });
    });

    describe('Analysis step validation', () => {
      test('should validate analysis step', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          projectPath: '/path/to/project',
          analysisType: 'code-quality'
        };

        const result = validator.validateStepContext('analysis', 'analyze_project_step', context);
        expect(result.isValid).toBe(true);
      });

      test('should fail on invalid analysis type', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          projectPath: '/path/to/project',
          analysisType: 'invalid-analysis'
        };

        const result = validator.validateStepContext('analysis', 'analyze_project_step', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Analysis type must be one of: code-quality, security, performance, architecture, dependencies, coverage');
      });
    });

    describe('Type validation', () => {
      test('should validate field types', () => {
        const context = {
          userId: 123, // Should be string
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          waitForResponse: 'true' // Should be boolean
        };

        const result = validator.validateStepContext('ide', 'ide_send_message_step', context);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Field 'userId' should be string, got number");
        expect(result.errors).toContain("Field 'waitForResponse' should be boolean, got string");
      });
    });

    describe('UUID validation', () => {
      test('should validate UUID format', () => {
        const context = {
          userId: 'invalid-uuid',
          projectId: '123e4567-e89b-12d3-a456-426614174001'
        };

        const result = validator.validateStepContext('ide', 'ide_send_message_step', context);
        expect(result.warnings).toContain('userId should be a valid UUID');
      });

      test('should accept valid UUID', () => {
        const context = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001'
        };

        const result = validator.validateStepContext('ide', 'ide_send_message_step', context);
        expect(result.warnings).not.toContain('userId should be a valid UUID');
      });
    });
  });

  describe('validateStepConfiguration', () => {
    test('should validate valid step configuration', () => {
      const step = {
        id: 'step-1',
        type: 'ide',
        step: 'ide_send_message_step'
      };

      const result = validator.validateStepConfiguration(step);
      expect(result.isValid).toBe(true);
    });

    test('should fail on missing required properties', () => {
      const step = {
        id: 'step-1'
        // Missing type and step
      };

      const result = validator.validateStepConfiguration(step);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Step missing required property: type');
      expect(result.errors).toContain('Step missing required property: step');
    });

    test('should warn on unknown step type', () => {
      const step = {
        id: 'step-1',
        type: 'unknown-type',
        step: 'some_step'
      };

      const result = validator.validateStepConfiguration(step);
      expect(result.warnings).toContain('Unknown step type: unknown-type');
    });

    test('should fail on invalid step name type', () => {
      const step = {
        id: 'step-1',
        type: 'ide',
        step: 123 // Should be string
      };

      const result = validator.validateStepConfiguration(step);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Step name must be a string');
    });
  });

  describe('getValidationStatistics', () => {
    test('should return validation statistics', () => {
      const stats = validator.getValidationStatistics();
      expect(stats).toHaveProperty('stepTypes');
      expect(stats).toHaveProperty('stepOverrides');
      expect(stats).toHaveProperty('strictMode');
      expect(stats).toHaveProperty('supportedTypes');
      expect(stats.strictMode).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle null context', () => {
      const result = validator.validateStepContext('ide', 'ide_send_message_step', null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Context must be a valid object');
    });

    test('should handle undefined context', () => {
      const result = validator.validateStepContext('ide', 'ide_send_message_step', undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Context must be a valid object');
    });

    test('should handle non-object context', () => {
      const result = validator.validateStepContext('ide', 'ide_send_message_step', 'invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Context must be a valid object');
    });

    test('should handle unknown step type', () => {
      const context = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        projectId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = validator.validateStepContext('unknown-type', 'some_step', context);
      expect(result.isValid).toBe(true); // Should fall back to common rules
    });
  });
});
