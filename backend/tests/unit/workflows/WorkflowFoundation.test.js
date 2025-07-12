/**
 * Unit tests for Unified Workflow Foundation
 * Tests core interfaces, context management, validation system, and exception handling
 */

const {
  IWorkflow,
  IWorkflowStep,
  IWorkflowContext,
  IWorkflowValidator,
  WorkflowContext,
  WorkflowState,
  WorkflowMetadata,
  WorkflowValidator,
  ValidationResult,
  ValidationRule,
  WorkflowException,
  ValidationException,
  ContextException
} = require('@domain/workflows');

describe('Unified Workflow Foundation', () => {
  describe('Core Interfaces', () => {
    describe('IWorkflow', () => {
      it('should define the workflow interface contract', () => {
        expect(typeof IWorkflow).toBe('function');
        expect(IWorkflow.prototype.execute).toBeDefined();
        expect(IWorkflow.prototype.validate).toBeDefined();
        expect(IWorkflow.prototype.rollback).toBeDefined();
        expect(IWorkflow.prototype.getMetadata).toBeDefined();
        expect(IWorkflow.prototype.canExecute).toBeDefined();
        expect(IWorkflow.prototype.getDependencies).toBeDefined();
        expect(IWorkflow.prototype.getSteps).toBeDefined();
      });

      it('should throw error when interface methods are not implemented', () => {
        const workflow = new IWorkflow();
        
        expect(() => workflow.execute()).rejects.toThrow('execute method must be implemented');
        expect(() => workflow.validate()).rejects.toThrow('validate method must be implemented');
        expect(() => workflow.rollback()).rejects.toThrow('rollback method must be implemented');
        expect(() => workflow.getMetadata()).toThrow('getMetadata method must be implemented');
        expect(() => workflow.canExecute()).rejects.toThrow('canExecute method must be implemented');
        expect(() => workflow.getDependencies()).toThrow('getDependencies method must be implemented');
        expect(() => workflow.getSteps()).toThrow('getSteps method must be implemented');
      });
    });

    describe('IWorkflowStep', () => {
      it('should define the workflow step interface contract', () => {
        expect(typeof IWorkflowStep).toBe('function');
        expect(IWorkflowStep.prototype.execute).toBeDefined();
        expect(IWorkflowStep.prototype.validate).toBeDefined();
        expect(IWorkflowStep.prototype.rollback).toBeDefined();
        expect(IWorkflowStep.prototype.getMetadata).toBeDefined();
        expect(IWorkflowStep.prototype.canExecute).toBeDefined();
        expect(IWorkflowStep.prototype.getDependencies).toBeDefined();
        expect(IWorkflowStep.prototype.getName).toBeDefined();
        expect(IWorkflowStep.prototype.getDescription).toBeDefined();
        expect(IWorkflowStep.prototype.isRequired).toBeDefined();
        expect(IWorkflowStep.prototype.canSkip).toBeDefined();
      });
    });

    describe('IWorkflowContext', () => {
      it('should define the workflow context interface contract', () => {
        expect(typeof IWorkflowContext).toBe('function');
        expect(IWorkflowContext.prototype.getState).toBeDefined();
        expect(IWorkflowContext.prototype.setState).toBeDefined();
        expect(IWorkflowContext.prototype.getMetadata).toBeDefined();
        expect(IWorkflowContext.prototype.setMetadata).toBeDefined();
        expect(IWorkflowContext.prototype.getData).toBeDefined();
        expect(IWorkflowContext.prototype.setData).toBeDefined();
        expect(IWorkflowContext.prototype.hasData).toBeDefined();
        expect(IWorkflowContext.prototype.removeData).toBeDefined();
        expect(IWorkflowContext.prototype.getAllData).toBeDefined();
      });
    });

    describe('IWorkflowValidator', () => {
      it('should define the workflow validator interface contract', () => {
        expect(typeof IWorkflowValidator).toBe('function');
        expect(IWorkflowValidator.prototype.isValid).toBeDefined();
        expect(IWorkflowValidator.prototype.getErrors).toBeDefined();
        expect(IWorkflowValidator.prototype.getWarnings).toBeDefined();
        expect(IWorkflowValidator.prototype.getMessages).toBeDefined();
        expect(IWorkflowValidator.prototype.addError).toBeDefined();
        expect(IWorkflowValidator.prototype.addWarning).toBeDefined();
        expect(IWorkflowValidator.prototype.hasErrors).toBeDefined();
        expect(IWorkflowValidator.prototype.hasWarnings).toBeDefined();
        expect(IWorkflowValidator.prototype.getErrorCount).toBeDefined();
        expect(IWorkflowValidator.prototype.getWarningCount).toBeDefined();
      });
    });
  });

  describe('Context Management', () => {
    describe('WorkflowState', () => {
      it('should create a workflow state with default values', () => {
        const state = new WorkflowState();
        
        expect(state.status).toBe(WorkflowState.INITIALIZED);
        expect(state.data).toEqual({});
        expect(state.metadata).toEqual({});
        expect(state.history).toHaveLength(1); // Created entry
        expect(state.progress).toBe(0);
        expect(state.error).toBeNull();
        expect(state.result).toBeNull();
      });

      it('should transition to new states', () => {
        const state = new WorkflowState();
        const newState = state.transitionTo(WorkflowState.EXECUTING, { step: 'test' });
        
        expect(newState.status).toBe(WorkflowState.EXECUTING);
        expect(newState.data.step).toBe('test');
        expect(newState.history).toHaveLength(2); // Created + transitioned
      });

      it('should validate state transitions', () => {
        const state = new WorkflowState();
        
        expect(state.canTransitionTo(WorkflowState.VALIDATING)).toBe(true);
        expect(state.canTransitionTo(WorkflowState.EXECUTING)).toBe(false);
        expect(state.canTransitionTo(WorkflowState.CANCELLED)).toBe(true);
      });

      it('should manage step progress', () => {
        const state = new WorkflowState();
        const newState = state.setProgress(50);
        
        expect(newState.progress).toBe(50);
        expect(newState.history).toHaveLength(2); // Created + progress_updated
      });
    });

    describe('WorkflowMetadata', () => {
      it('should create metadata with default values', () => {
        const metadata = new WorkflowMetadata();
        
        expect(metadata.data).toEqual({});
        expect(metadata.tags).toEqual([]);
        expect(metadata.labels).toEqual({});
        expect(metadata.version).toBe(1);
        expect(metadata.isEmpty()).toBe(true);
      });

      it('should manage data', () => {
        const metadata = new WorkflowMetadata();
        const newMetadata = metadata.setData('key', 'value');
        
        expect(newMetadata.getData('key')).toBe('value');
        expect(newMetadata.hasData('key')).toBe(true);
        expect(newMetadata.size().data).toBe(1);
      });

      it('should manage tags', () => {
        const metadata = new WorkflowMetadata();
        const newMetadata = metadata.addTag('important');
        
        expect(newMetadata.hasTag('important')).toBe(true);
        expect(newMetadata.tags).toContain('important');
      });

      it('should manage labels', () => {
        const metadata = new WorkflowMetadata();
        const newMetadata = metadata.setLabel('priority', 'high');
        
        expect(newMetadata.getLabel('priority')).toBe('high');
        expect(newMetadata.hasLabel('priority')).toBe(true);
      });
    });

    describe('WorkflowContext', () => {
      it('should create a workflow context', () => {
        const context = new WorkflowContext();
        
        expect(context.getWorkflowId()).toBeDefined();
        expect(context.getState()).toBeInstanceOf(WorkflowState);
        expect(context.getMetadata()).toBeInstanceOf(WorkflowMetadata);
        expect(context.getAllData()).toEqual({});
      });

      it('should manage context data', () => {
        const context = new WorkflowContext();
        context.setData('key', 'value');
        
        expect(context.getData('key')).toBe('value');
        expect(context.hasData('key')).toBe(true);
        expect(context.getAllData()).toEqual({ key: 'value' });
      });

      it('should manage dependencies', () => {
        const context = new WorkflowContext();
        
        context.addDependency('test-dependency');
        expect(context.getDependencies()).toContain('test-dependency');
        
        context.removeDependency('test-dependency');
        expect(context.getDependencies()).not.toContain('test-dependency');
      });

      it('should track metrics', () => {
        const context = new WorkflowContext();
        context.setMetric('test', 1000);
        
        expect(context.getMetric('test')).toBe(1000);
        expect(context.hasMetric('test')).toBe(true);
      });

      it('should manage logs', () => {
        const context = new WorkflowContext();
        context.addLog('info', 'Test message');
        
        expect(context.getLogs()).toHaveLength(1);
        expect(context.getLogs()[0].message).toBe('Test message');
        expect(context.getLogs()[0].level).toBe('info');
      });

      it('should manage execution history', () => {
        const context = new WorkflowContext();
        context.addExecutionHistory('test_action', { data: 'test' });
        
        expect(context.getExecutionHistory()).toHaveLength(1);
        expect(context.getExecutionHistory()[0].action).toBe('test_action');
      });
    });
  });

  describe('Validation System', () => {
    describe('ValidationResult', () => {
      it('should create a validation result', () => {
        const result = new ValidationResult();
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
        expect(result.id).toBeDefined();
      });

      it('should add errors', () => {
        const result = new ValidationResult();
        result.addError('field', 'Test error', 'TEST_ERROR');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.getFirstError().message).toBe('Test error');
        expect(result.getFirstError().code).toBe('TEST_ERROR');
        expect(result.getFirstError().field).toBe('field');
      });

      it('should add warnings', () => {
        const result = new ValidationResult();
        result.addWarning('field', 'Test warning', 'TEST_WARNING');
        
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.getFirstWarning().message).toBe('Test warning');
      });

      it('should merge results', () => {
        const result1 = ValidationResult.createWithError('field1', 'Error 1');
        const result2 = ValidationResult.createWithWarning('field2', 'Warning 1');
        
        result1.merge(result2);
        
        expect(result1.isValid).toBe(false);
        expect(result1.getErrorCount()).toBe(1);
        expect(result1.getWarningCount()).toBe(1);
      });

      it('should provide summary', () => {
        const result = ValidationResult.createWithError('field', 'Test error');
        
        const summary = result.getSummary();
        expect(summary.isValid).toBe(false);
        expect(summary.errorCount).toBe(1);
        expect(summary.warningCount).toBe(0);
      });
    });

    describe('ValidationRule', () => {
      it('should create a validation rule', () => {
        const validator = (value) => ValidationResult.createValid();
        const rule = new ValidationRule('test-rule', 'test', 'field', validator);
        
        expect(rule.name).toBe('test-rule');
        expect(rule.field).toBe('field');
        expect(rule.enabled).toBe(true);
      });

      it('should execute validation', async () => {
        const validator = (value) => {
          if (!value) {
            return ValidationResult.createWithError('field', 'Required');
          }
          return ValidationResult.createValid();
        };
        
        const rule = new ValidationRule('test-rule', 'test', 'field', validator);
        
        const result1 = await rule.validate('');
        expect(result1.isValid).toBe(false);
        
        const result2 = await rule.validate('value');
        expect(result2.isValid).toBe(true);
      });

      it('should use built-in validators', async () => {
        const requiredRule = ValidationRule.createRequired('name');
        const stringRule = ValidationRule.createString('description');
        
        const result1 = await requiredRule.validate('');
        expect(result1.isValid).toBe(false);
        
        const result2 = await stringRule.validate('test');
        expect(result2.isValid).toBe(true);
      });

      it('should handle disabled rules', async () => {
        const rule = ValidationRule.createRequired('field');
        rule.disable();
        
        const result = await rule.validate('');
        expect(result.isValid).toBe(true);
      });
    });

    describe('WorkflowValidator', () => {
      it('should create a validator', () => {
        const validator = new WorkflowValidator();
        
        expect(validator.isValid()).toBe(true);
        expect(validator.getErrorCount()).toBe(0);
        expect(validator.getWarningCount()).toBe(0);
      });

      it('should manage validation messages', () => {
        const validator = new WorkflowValidator();
        
        validator.addError('field', 'Test error', 'TEST_ERROR');
        validator.addWarning('field', 'Test warning', 'TEST_WARNING');
        
        expect(validator.isValid()).toBe(false);
        expect(validator.getErrorCount()).toBe(1);
        expect(validator.getWarningCount()).toBe(1);
        expect(validator.getErrorsByField('field')).toHaveLength(1);
      });

      it('should provide summary', () => {
        const validator = new WorkflowValidator();
        validator.addError('field1', 'Error 1');
        validator.addError('field2', 'Error 2');
        validator.addWarning('field1', 'Warning 1');
        
        const summary = validator.getSummary();
        expect(summary.isValid).toBe(false);
        expect(summary.errorCount).toBe(2);
        expect(summary.warningCount).toBe(1);
        expect(summary.fieldsWithErrors).toContain('field1');
        expect(summary.fieldsWithErrors).toContain('field2');
      });

      it('should merge validators', () => {
        const validator1 = new WorkflowValidator();
        const validator2 = new WorkflowValidator();
        
        validator1.addError('field1', 'Error 1');
        validator2.addError('field2', 'Error 2');
        
        validator1.merge(validator2);
        
        expect(validator1.getErrorCount()).toBe(2);
        expect(validator1.getErrorsByField('field1')).toHaveLength(1);
        expect(validator1.getErrorsByField('field2')).toHaveLength(1);
      });
    });
  });

  describe('Exception Handling', () => {
    describe('WorkflowException', () => {
      it('should create a workflow exception', () => {
        const exception = new WorkflowException('Test error', 'TEST_ERROR');
        
        expect(exception.message).toBe('Test error');
        expect(exception.code).toBe('TEST_ERROR');
        expect(exception.name).toBe('WorkflowException');
        expect(exception.timestamp).toBeInstanceOf(Date);
      });

      it('should provide context information', () => {
        const context = { workflowId: 'test', step: 'step1' };
        const exception = new WorkflowException('Test error', 'TEST_ERROR', context);
        
        expect(exception.context).toEqual(context);
        expect(exception.hasContext()).toBe(true);
      });

      it('should manage cause chain', () => {
        const cause = new Error('Root cause');
        const exception = new WorkflowException('Test error', 'TEST_ERROR', null, cause);
        
        expect(exception.hasCause()).toBe(true);
        expect(exception.getRootCause()).toBe(cause);
        expect(exception.getErrorChain()).toHaveLength(2);
      });

      it('should provide utility methods', () => {
        const exception = new WorkflowException('Test error', 'TEST_ERROR');
        
        exception.setRecoverable(true);
        expect(exception.isRecoverable()).toBe(true);
        
        exception.setRetryable(true);
        expect(exception.isRetryable()).toBe(true);
        expect(exception.canRetry()).toBe(true);
      });
    });

    describe('ValidationException', () => {
      it('should create a validation exception', () => {
        const exception = new ValidationException('Validation failed', 'VALIDATION_ERROR');
        
        expect(exception.name).toBe('ValidationException');
        expect(exception.code).toBe('VALIDATION_ERROR');
        expect(exception.field).toBeNull();
        expect(exception.rule).toBeNull();
      });

      it('should create from validation result', () => {
        const result = ValidationResult.createWithError('name', 'Required field');
        const exception = ValidationException.fromValidationResult(result);
        
        expect(exception.validationResult).toBe(result);
        expect(exception.field).toBe('name');
        expect(exception.getErrorCount()).toBe(1);
      });

      it('should provide field-specific methods', () => {
        const exception = ValidationException.fieldRequired('name');
        
        expect(exception.field).toBe('name');
        expect(exception.code).toBe('FIELD_REQUIRED');
        expect(exception.message).toContain('name');
      });
    });

    describe('ContextException', () => {
      it('should create a context exception', () => {
        const exception = new ContextException('Context error', 'CONTEXT_ERROR');
        
        expect(exception.name).toBe('ContextException');
        expect(exception.code).toBe('CONTEXT_ERROR');
        expect(exception.contextData).toBeNull();
        expect(exception.operation).toBeNull();
        expect(exception.key).toBeNull();
      });

      it('should provide context-specific methods', () => {
        const exception = ContextException.contextNotFound('ctx-123');
        
        expect(exception.code).toBe('CONTEXT_NOT_FOUND');
        expect(exception.contextId).toBe('ctx-123');
        expect(exception.message).toContain('ctx-123');
      });
    });
  });

  describe('Integration', () => {
    it('should integrate all components together', async () => {
      // Create a workflow context
      const context = new WorkflowContext();
      context.setData('input', 'test data');
      
      // Create validation rules
      const validator = new WorkflowValidator();
      
      // Create a validation rule
      const rule = ValidationRule.createRequired('input');
      const result = await rule.validate(context.getData('input'));
      
      expect(result.isValid).toBe(true);
      
      // Test error handling
      const errorResult = await rule.validate('');
      expect(errorResult.isValid).toBe(false);
      
      // Create exception from validation result
      const exception = ValidationException.fromValidationResult(errorResult);
      expect(exception.field).toBe('input');
    });

    it('should handle errors gracefully', async () => {
      // Create a validation rule that throws an error
      const rule = ValidationRule.create('test', 'field', () => {
        throw new Error('Validation error');
      });
      
      const result = await rule.validate('test');
      expect(result.isValid).toBe(false);
      expect(result.getFirstError().code).toBe('VALIDATION_RULE_ERROR');
    });
  });
}); 