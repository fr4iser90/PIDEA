/**
 * Framework Step Registry Unit Tests
 * Tests the FrameworkStepRegistry class functionality
 */

const path = require('path');
const fs = require('fs').promises;
const FrameworkStepRegistry = require('../../infrastructure/framework/FrameworkStepRegistry');

// Mock the logger
jest.mock('@logging/Logger', () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }));
});

// Mock StepValidator
jest.mock('../../domain/steps/StepValidator', () => ({
  validateStepModule: jest.fn().mockReturnValue({
    isValid: true,
    errors: [],
    warnings: []
  })
}));

describe('FrameworkStepRegistry Unit Tests', () => {
  let frameworkStepRegistry;
  let mockStepRegistry;
  let mockFrameworkBasePath;

  beforeEach(() => {
    frameworkStepRegistry = new FrameworkStepRegistry();
    mockFrameworkBasePath = path.join(__dirname, '../../framework');
    
    mockStepRegistry = {
      registerStep: jest.fn().mockResolvedValue(true),
      register: jest.fn().mockResolvedValue(true)
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with empty state', () => {
      expect(frameworkStepRegistry.frameworkSteps).toBeDefined();
      expect(frameworkStepRegistry.frameworkDirectories).toBeDefined();
      expect(frameworkStepRegistry.loadedFrameworks).toBeDefined();
      expect(frameworkStepRegistry.frameworkSteps.size).toBe(0);
      expect(frameworkStepRegistry.frameworkDirectories.size).toBe(0);
      expect(frameworkStepRegistry.loadedFrameworks.size).toBe(0);
    });
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      jest.spyOn(frameworkStepRegistry, 'discoverFrameworks').mockResolvedValue();
      jest.spyOn(frameworkStepRegistry, 'loadFrameworkSteps').mockResolvedValue();
      jest.spyOn(frameworkStepRegistry, 'registerFrameworkSteps').mockResolvedValue();

      await frameworkStepRegistry.initialize(mockFrameworkBasePath, mockStepRegistry);

      expect(frameworkStepRegistry.frameworkBasePath).toBe(mockFrameworkBasePath);
      expect(frameworkStepRegistry.stepRegistry).toBe(mockStepRegistry);
    });

    test('should handle initialization errors', async () => {
      jest.spyOn(frameworkStepRegistry, 'discoverFrameworks').mockRejectedValue(new Error('Discovery failed'));

      await expect(frameworkStepRegistry.initialize(mockFrameworkBasePath, mockStepRegistry))
        .rejects.toThrow('Discovery failed');
    });
  });

  describe('Framework Discovery', () => {
    test('should discover framework directories', async () => {
      const mockFrameworkDirs = ['framework1', 'framework2'];
      const mockConfig = {
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'testing',
        steps: {
          test_step: {
            name: 'test_step',
            type: 'testing',
            category: 'unit',
            description: 'Test step',
            file: 'test_step.js'
          }
        }
      };

      jest.spyOn(fs, 'readdir').mockResolvedValue(mockFrameworkDirs);
      jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => true });
      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

      await frameworkStepRegistry.discoverFrameworks();

      expect(frameworkStepRegistry.frameworkDirectories.size).toBe(2);
      expect(frameworkStepRegistry.frameworkDirectories.has('framework1')).toBe(true);
      expect(frameworkStepRegistry.frameworkDirectories.has('framework2')).toBe(true);
    });

    test('should handle invalid framework config', async () => {
      const mockFrameworkDirs = ['invalid_framework'];
      
      jest.spyOn(fs, 'readdir').mockResolvedValue(mockFrameworkDirs);
      jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => true });
      jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('Invalid JSON'));

      await frameworkStepRegistry.discoverFrameworks();

      expect(frameworkStepRegistry.frameworkDirectories.size).toBe(0);
    });

    test('should skip non-directory entries', async () => {
      const mockEntries = [
        { name: 'framework1', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false }
      ];

      jest.spyOn(fs, 'readdir').mockResolvedValue(mockEntries);
      jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => true });
      jest.spyOn(fs, 'readFile').mockResolvedValue('{}');

      await frameworkStepRegistry.discoverFrameworks();

      expect(frameworkStepRegistry.frameworkDirectories.size).toBe(1);
    });
  });

  describe('Step Loading', () => {
    beforeEach(() => {
      // Setup mock framework directory
      frameworkStepRegistry.frameworkDirectories.set('test_framework', {
        path: '/path/to/framework',
        config: {
          steps: {
            test_step: {
              name: 'test_step',
              type: 'testing',
              category: 'unit',
              description: 'Test step',
              file: 'test_step.js'
            }
          }
        },
        stepsPath: '/path/to/framework/steps'
      });
    });

    test('should load framework steps successfully', async () => {
      const mockStepModule = {
        execute: jest.fn().mockResolvedValue({ success: true })
      };

      jest.spyOn(fs, 'access').mockResolvedValue();
      jest.spyOn(fs, 'readFile').mockResolvedValue('module.exports = {}');
      
      // Mock require to return our test module
      const originalRequire = require;
      jest.doMock('/path/to/framework/steps/test_step.js', () => mockStepModule);

      await frameworkStepRegistry.loadFrameworkStepsFromDirectory('test_framework', 
        frameworkStepRegistry.frameworkDirectories.get('test_framework'));

      expect(frameworkStepRegistry.loadedFrameworks.has('test_framework')).toBe(true);
    });

    test('should handle missing steps directory', async () => {
      jest.spyOn(fs, 'access').mockRejectedValue(new Error('Directory not found'));

      await frameworkStepRegistry.loadFrameworkStepsFromDirectory('test_framework', 
        frameworkStepRegistry.frameworkDirectories.get('test_framework'));

      expect(frameworkStepRegistry.loadedFrameworks.has('test_framework')).toBe(false);
    });

    test('should handle missing step file', async () => {
      jest.spyOn(fs, 'access').mockImplementation((path) => {
        if (path.includes('steps')) return Promise.resolve();
        return Promise.reject(new Error('File not found'));
      });

      await frameworkStepRegistry.loadFrameworkStepsFromDirectory('test_framework', 
        frameworkStepRegistry.frameworkDirectories.get('test_framework'));

      expect(frameworkStepRegistry.frameworkSteps.size).toBe(0);
    });

    test('should handle invalid step module', async () => {
      const StepValidator = require('../../domain/steps/StepValidator');
      StepValidator.validateStepModule.mockReturnValue({
        isValid: false,
        errors: ['Invalid module structure'],
        warnings: []
      });

      jest.spyOn(fs, 'access').mockResolvedValue();
      jest.spyOn(fs, 'readFile').mockResolvedValue('invalid module');

      await frameworkStepRegistry.loadFrameworkStepsFromDirectory('test_framework', 
        frameworkStepRegistry.frameworkDirectories.get('test_framework'));

      expect(frameworkStepRegistry.frameworkSteps.size).toBe(0);
    });
  });

  describe('Step Registration', () => {
    beforeEach(() => {
      // Setup mock step info
      frameworkStepRegistry.frameworkSteps.set('test_framework.test_step', {
        framework: 'test_framework',
        name: 'test_step',
        config: {
          type: 'testing',
          category: 'unit',
          description: 'Test step'
        },
        module: {
          execute: jest.fn().mockResolvedValue({ success: true })
        },
        filePath: '/path/to/test_step.js',
        loadedAt: new Date()
      });
    });

    test('should register step with new interface', async () => {
      await frameworkStepRegistry.registerFrameworkStep('test_framework.test_step', 
        frameworkStepRegistry.frameworkSteps.get('test_framework.test_step'));

      expect(mockStepRegistry.registerStep).toHaveBeenCalledWith(
        'test_framework.test_step',
        expect.objectContaining({
          name: 'test_step',
          type: 'testing',
          category: 'unit',
          framework: 'test_framework'
        }),
        'unit',
        expect.any(Function)
      );
    });

    test('should fallback to legacy interface', async () => {
      // Remove registerStep method to test fallback
      delete mockStepRegistry.registerStep;

      await frameworkStepRegistry.registerFrameworkStep('test_framework.test_step', 
        frameworkStepRegistry.frameworkSteps.get('test_framework.test_step'));

      expect(mockStepRegistry.register).toHaveBeenCalledWith(
        'test_framework.test_step',
        expect.objectContaining({
          name: 'test_step',
          type: 'testing',
          category: 'unit',
          framework: 'test_framework',
          execute: expect.any(Function)
        })
      );
    });

    test('should handle missing step registry', async () => {
      frameworkStepRegistry.stepRegistry = null;

      await frameworkStepRegistry.registerFrameworkStep('test_framework.test_step', 
        frameworkStepRegistry.frameworkSteps.get('test_framework.test_step'));

      expect(mockStepRegistry.registerStep).not.toHaveBeenCalled();
      expect(mockStepRegistry.register).not.toHaveBeenCalled();
    });

    test('should handle step execution errors', async () => {
      const stepInfo = frameworkStepRegistry.frameworkSteps.get('test_framework.test_step');
      stepInfo.module.execute.mockRejectedValue(new Error('Execution failed'));

      await frameworkStepRegistry.registerFrameworkStep('test_framework.test_step', stepInfo);

      // Should still register the step even if execution fails
      expect(mockStepRegistry.registerStep).toHaveBeenCalled();
    });
  });

  describe('Framework Management', () => {
    beforeEach(() => {
      // Setup test frameworks
      frameworkStepRegistry.frameworkSteps.set('framework1.step1', {
        framework: 'framework1',
        name: 'step1',
        config: { type: 'testing' }
      });
      frameworkStepRegistry.frameworkSteps.set('framework1.step2', {
        framework: 'framework1',
        name: 'step2',
        config: { type: 'testing' }
      });
      frameworkStepRegistry.frameworkSteps.set('framework2.step1', {
        framework: 'framework2',
        name: 'step1',
        config: { type: 'development' }
      });

      frameworkStepRegistry.loadedFrameworks.add('framework1');
      frameworkStepRegistry.loadedFrameworks.add('framework2');
    });

    test('should get all framework steps', () => {
      const steps = frameworkStepRegistry.getFrameworkSteps();
      
      expect(steps).toEqual([
        'framework1.step1',
        'framework1.step2',
        'framework2.step1'
      ]);
    });

    test('should get steps by framework name', () => {
      const steps = frameworkStepRegistry.getFrameworkStepsByName('framework1');
      
      expect(steps).toEqual([
        'framework1.step1',
        'framework1.step2'
      ]);
    });

    test('should check if step is framework step', () => {
      expect(frameworkStepRegistry.isFrameworkStep('framework1.step1')).toBe(true);
      expect(frameworkStepRegistry.isFrameworkStep('regular_step')).toBe(false);
    });

    test('should get framework step info', () => {
      const stepInfo = frameworkStepRegistry.getFrameworkStepInfo('framework1.step1');
      
      expect(stepInfo).toBeDefined();
      expect(stepInfo.framework).toBe('framework1');
      expect(stepInfo.name).toBe('step1');
    });

    test('should get loaded frameworks', () => {
      const frameworks = frameworkStepRegistry.getLoadedFrameworks();
      
      expect(frameworks).toEqual(['framework1', 'framework2']);
    });
  });

  describe('Health Status', () => {
    test('should return correct health status', () => {
      frameworkStepRegistry.frameworkDirectories.set('framework1', {});
      frameworkStepRegistry.frameworkDirectories.set('framework2', {});
      frameworkStepRegistry.loadedFrameworks.add('framework1');
      frameworkStepRegistry.frameworkSteps.set('framework1.step1', {});
      frameworkStepRegistry.stepRegistry = mockStepRegistry;

      const healthStatus = frameworkStepRegistry.getHealthStatus();
      
      expect(healthStatus.totalFrameworks).toBe(2);
      expect(healthStatus.loadedFrameworks).toBe(1);
      expect(healthStatus.totalSteps).toBe(1);
      expect(healthStatus.stepRegistryAvailable).toBe(true);
      expect(healthStatus.healthScore).toBe(50); // 1/2 frameworks loaded
      expect(healthStatus.isHealthy).toBe(true);
    });

    test('should return unhealthy status when step registry unavailable', () => {
      frameworkStepRegistry.stepRegistry = null;

      const healthStatus = frameworkStepRegistry.getHealthStatus();
      
      expect(healthStatus.stepRegistryAvailable).toBe(false);
      expect(healthStatus.isHealthy).toBe(false);
    });
  });

  describe('Framework Reloading', () => {
    test('should reload framework successfully', async () => {
      const mockFrameworkInfo = {
        path: '/path/to/framework',
        config: { steps: {} },
        stepsPath: '/path/to/framework/steps'
      };

      frameworkStepRegistry.frameworkDirectories.set('test_framework', mockFrameworkInfo);
      jest.spyOn(frameworkStepRegistry, 'loadFrameworkStepsFromDirectory').mockResolvedValue();
      jest.spyOn(frameworkStepRegistry, 'registerFrameworkSteps').mockResolvedValue();

      await frameworkStepRegistry.reloadFramework('test_framework');

      expect(frameworkStepRegistry.loadFrameworkStepsFromDirectory).toHaveBeenCalledWith(
        'test_framework',
        mockFrameworkInfo
      );
      expect(frameworkStepRegistry.registerFrameworkSteps).toHaveBeenCalled();
    });

    test('should handle reloading non-existent framework', async () => {
      await expect(frameworkStepRegistry.reloadFramework('non_existent'))
        .rejects.toThrow('Framework non_existent not found');
    });
  });
});
