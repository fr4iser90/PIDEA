/**
 * Integration tests for Framework Step Registration
 */

const StepRegistry = require('../../../domain/steps/StepRegistry');
const { config: docConfig, execute: docExecute } = require('../../../domain/steps/categories/documentation/analyze_project_structure_step');
const { config: aiConfig, execute: aiExecute } = require('../../../domain/steps/categories/ai/analyze_context_step');

describe('Framework Step Registration Integration', () => {
  let stepRegistry;

  beforeEach(() => {
    stepRegistry = new StepRegistry();
  });

  describe('Step Registration', () => {
    test('should register documentation framework step', async () => {
      const result = await stepRegistry.registerStep(
        docConfig.name,
        docConfig,
        docConfig.category,
        docExecute
      );
      
      expect(result).toBe(true);
      expect(stepRegistry.steps.has(docConfig.name)).toBe(true);
      
      const registeredStep = stepRegistry.steps.get(docConfig.name);
      expect(registeredStep.name).toBe(docConfig.name);
      expect(registeredStep.category).toBe(docConfig.category);
      expect(registeredStep.config).toBe(docConfig);
      expect(registeredStep.executor).toBe(docExecute);
    });

    test('should register AI framework step', async () => {
      const result = await stepRegistry.registerStep(
        aiConfig.name,
        aiConfig,
        aiConfig.category,
        aiExecute
      );
      
      expect(result).toBe(true);
      expect(stepRegistry.steps.has(aiConfig.name)).toBe(true);
      
      const registeredStep = stepRegistry.steps.get(aiConfig.name);
      expect(registeredStep.name).toBe(aiConfig.name);
      expect(registeredStep.category).toBe(aiConfig.category);
      expect(registeredStep.config).toBe(aiConfig);
      expect(registeredStep.executor).toBe(aiExecute);
    });

    test('should handle duplicate step registration', async () => {
      // Register step first time
      await stepRegistry.registerStep(
        docConfig.name,
        docConfig,
        docConfig.category,
        docExecute
      );
      
      // Register same step again
      const result = await stepRegistry.registerStep(
        docConfig.name,
        docConfig,
        docConfig.category,
        docExecute
      );
      
      expect(result).toBe(true);
      expect(stepRegistry.steps.size).toBe(1); // Should still be only one step
    });
  });

  describe('Step Execution', () => {
    beforeEach(async () => {
      // Register steps for execution tests
      await stepRegistry.registerStep(
        docConfig.name,
        docConfig,
        docConfig.category,
        docExecute
      );
      
      await stepRegistry.registerStep(
        aiConfig.name,
        aiConfig,
        aiConfig.category,
        aiExecute
      );
    });

    test('should execute registered documentation step', async () => {
      const step = stepRegistry.steps.get(docConfig.name);
      const context = { projectPath: '/test/project', startTime: Date.now() };
      
      const result = await step.executor(context);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.projectPath).toBe('/test/project');
    });

    test('should execute registered AI step', async () => {
      const step = stepRegistry.steps.get(aiConfig.name);
      const context = { projectPath: '/test/project', startTime: Date.now() };
      
      const result = await step.executor(context);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.projectPath).toBe('/test/project');
    });

    test('should handle step execution errors', async () => {
      const step = stepRegistry.steps.get(docConfig.name);
      const invalidContext = { invalid: 'context' };
      
      const result = await step.executor(invalidContext);
      
      // Should still return a result, even if with errors
      expect(result).toBeDefined();
    });
  });

  describe('Step Categories', () => {
    beforeEach(async () => {
      await stepRegistry.registerStep(
        docConfig.name,
        docConfig,
        docConfig.category,
        docExecute
      );
      
      await stepRegistry.registerStep(
        aiConfig.name,
        aiConfig,
        aiConfig.category,
        aiExecute
      );
    });

    test('should organize steps by category', () => {
      expect(stepRegistry.categories.has('documentation')).toBe(true);
      expect(stepRegistry.categories.has('ai')).toBe(true);
      
      const docSteps = stepRegistry.categories.get('documentation');
      const aiSteps = stepRegistry.categories.get('ai');
      
      expect(docSteps).toContain(docConfig.name);
      expect(aiSteps).toContain(aiConfig.name);
    });

    test('should get steps by category', () => {
      const docSteps = stepRegistry.getStepsByCategory('documentation');
      const aiSteps = stepRegistry.getStepsByCategory('ai');
      
      expect(docSteps).toHaveLength(1);
      expect(aiSteps).toHaveLength(1);
      expect(docSteps[0]).toBe(docConfig.name);
      expect(aiSteps[0]).toBe(aiConfig.name);
    });
  });

  describe('Step Metadata', () => {
    beforeEach(async () => {
      await stepRegistry.registerStep(
        docConfig.name,
        docConfig,
        docConfig.category,
        docExecute
      );
    });

    test('should track step metadata', () => {
      const step = stepRegistry.steps.get(docConfig.name);
      
      expect(step.registeredAt).toBeDefined();
      expect(step.status).toBe('active');
      expect(step.executionCount).toBe(0);
      expect(step.lastExecuted).toBeNull();
      expect(step.metadata).toBeDefined();
      expect(step.metadata.type).toBe('step');
      expect(step.metadata.category).toBe('documentation');
      expect(step.metadata.version).toBe('1.0.0');
      expect(step.metadata.isFrameworkStep).toBe(true);
      expect(step.metadata.framework).toBe('Documentation Framework');
    });

    test('should update execution count', async () => {
      const step = stepRegistry.steps.get(docConfig.name);
      const context = { projectPath: '/test/project', startTime: Date.now() };
      
      await step.executor(context);
      
      expect(step.executionCount).toBeGreaterThan(0);
      expect(step.lastExecuted).toBeDefined();
    });
  });
});
