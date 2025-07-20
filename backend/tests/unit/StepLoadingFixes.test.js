/**
 * Step Loading Fixes Test
 * Tests the fixes for step loading issues
 */

const path = require('path');
const fs = require('fs').promises;

// Import the components we're testing
const StepValidator = require('@/domain/steps/StepValidator');
const FrameworkStepRegistry = require('@/infrastructure/framework/FrameworkStepRegistry');

describe('Step Loading Fixes', () => {
  beforeEach(() => {
    // Reset any mocks
  });

  afterEach(() => {
    // Clean up any mocks
  });

  describe('StepValidator', () => {
    describe('validateStepModule', () => {
      it('should validate a proper step class', () => {
        const mockStepClass = class TestStep {
          constructor() {
            this.name = 'TestStep';
          }
          
          async execute(context) {
            return { success: true };
          }
        };

        const result = StepValidator.validateStepModule(mockStepClass, '/test/path.js');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('class');
        expect(result.hasExecute).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a proper step object', () => {
        const mockStepObject = {
          name: 'TestStep',
          execute: async (context) => ({ success: true })
        };

        const result = StepValidator.validateStepModule(mockStepObject, '/test/path.js');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('object');
        expect(result.hasExecute).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject step without execute method', () => {
        const invalidStep = {
          name: 'InvalidStep'
          // Missing execute method
        };

        const result = StepValidator.validateStepModule(invalidStep, '/test/path.js');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step has no execute method');
      });

      it('should handle null/undefined modules', () => {
        const result = StepValidator.validateStepModule(null, '/test/path.js');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step module is null or undefined');
      });
    });

    describe('validateStepConfig', () => {
      it('should validate a proper step configuration', () => {
        const config = {
          name: 'TestStep',
          type: 'test',
          category: 'testing',
          description: 'A test step',
          dependencies: ['service1', 'service2']
        };

        const result = StepValidator.validateStepConfig(config);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject config without name', () => {
        const config = {
          type: 'test',
          category: 'testing'
          // Missing name
        };

        const result = StepValidator.validateStepConfig(config);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step name is required');
      });

      it('should warn about missing optional fields', () => {
        const config = {
          name: 'TestStep'
          // Missing type, category, description
        };

        const result = StepValidator.validateStepConfig(config);
        
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Step type is recommended');
        expect(result.warnings).toContain('Step category is recommended');
        expect(result.warnings).toContain('Step description is recommended');
      });
    });
  });

  describe('FrameworkStepRegistry', () => {
    let frameworkStepRegistry;
    let mockStepRegistry;

    beforeEach(() => {
      frameworkStepRegistry = new FrameworkStepRegistry();
      mockStepRegistry = {
        register: jest.fn().mockResolvedValue()
      };
    });

    describe('loadFrameworkStep', () => {
      it('should handle missing file property gracefully', async () => {
        const stepConfig = {
          name: 'test_step'
          // Missing file property
        };

        await frameworkStepRegistry.loadFrameworkStep('test_framework', 'test_step', stepConfig, '/test/path');
        
        expect(frameworkStepRegistry.frameworkSteps.size).toBe(0);
      });

      it('should handle missing step files gracefully', async () => {
        const stepConfig = {
          name: 'test_step',
          file: 'steps/nonexistent.js'
        };

        jest.spyOn(fs, 'access').mockRejectedValue(new Error('File not found'));

        await frameworkStepRegistry.loadFrameworkStep('test_framework', 'test_step', stepConfig, '/test/path');
        
        expect(frameworkStepRegistry.frameworkSteps.size).toBe(0);
      });

      it('should handle module loading errors gracefully', async () => {
        const stepConfig = {
          name: 'test_step',
          file: 'steps/test.js'
        };

        jest.spyOn(fs, 'access').mockResolvedValue();
        jest.spyOn(require, 'resolve').mockImplementation(() => {
          throw new Error('Module not found');
        });

        await frameworkStepRegistry.loadFrameworkStep('test_framework', 'test_step', stepConfig, '/test/path');
        
        expect(frameworkStepRegistry.frameworkSteps.size).toBe(0);
      });
    });

    describe('registerFrameworkStep', () => {
      it('should handle missing step registry gracefully', async () => {
        const stepInfo = {
          framework: 'test_framework',
          name: 'test_step',
          config: { name: 'test_step' },
          module: {
            execute: async () => ({ success: true })
          }
        };

        frameworkStepRegistry.stepRegistry = null;

        await frameworkStepRegistry.registerFrameworkStep('test_framework.test_step', stepInfo);
        
        expect(mockStepRegistry.register).not.toHaveBeenCalled();
      });

      it('should handle step registry without register method gracefully', async () => {
        const stepInfo = {
          framework: 'test_framework',
          name: 'test_step',
          config: { name: 'test_step' },
          module: {
            execute: async () => ({ success: true })
          }
        };

        frameworkStepRegistry.stepRegistry = {};

        await frameworkStepRegistry.registerFrameworkStep('test_framework.test_step', stepInfo);
        
        expect(mockStepRegistry.register).not.toHaveBeenCalled();
      });
    });
  });
}); 