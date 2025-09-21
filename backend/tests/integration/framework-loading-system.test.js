/**
 * Framework Loading System Integration Tests
 * Tests the complete framework loading workflow with domain/infrastructure separation
 */

const path = require('path');
const fs = require('fs').promises;
const { initializeFrameworkInfrastructure } = require('@infrastructure/framework');
const { initializeFrameworks } = require('@domain/frameworks');

describe('Framework Loading System Integration', () => {
  let frameworkInfrastructure;
  let domainFrameworkSystem;
  let testFrameworkPath;

  beforeAll(async () => {
    // Create test framework directory
    testFrameworkPath = path.join(__dirname, '../../framework/test-framework');
    await fs.mkdir(testFrameworkPath, { recursive: true });
    
    // Create test framework configuration
    const testFrameworkConfig = {
      name: 'test-framework',
      version: '1.0.0',
      description: 'Test framework for integration testing',
      category: 'testing',
      author: 'PIDEA Team',
      dependencies: ['core'],
      steps: {
        'test-step': {
          file: 'test-step.js',
          type: 'action',
          category: 'testing',
          description: 'Test step for integration testing'
        }
      },
      workflows: {
        'test-workflow': {
          name: 'test-workflow',
          steps: ['test-step'],
          description: 'Test workflow for integration testing'
        }
      },
      activation: {
        auto_load: false,
        requires_confirmation: true,
        fallback_to_core: true
      }
    };

    // Create framework.json
    await fs.writeFile(
      path.join(testFrameworkPath, 'framework.json'),
      JSON.stringify(testFrameworkConfig, null, 2)
    );

    // Create steps directory and test step
    const stepsPath = path.join(testFrameworkPath, 'steps');
    await fs.mkdir(stepsPath, { recursive: true });
    
    const testStepContent = `
/**
 * Test Step - Integration Testing
 */
class TestStep {
  async execute(context, options = {}) {
    return {
      success: true,
      message: 'Test step executed successfully',
      context: context,
      options: options
    };
  }
}

module.exports = TestStep;
`;
    
    await fs.writeFile(path.join(stepsPath, 'test-step.js'), testStepContent);
  });

  afterAll(async () => {
    // Clean up test framework directory
    try {
      await fs.rm(testFrameworkPath, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test framework directory:', error.message);
    }
  });

  describe('Infrastructure Layer Initialization', () => {
    it('should initialize framework infrastructure successfully', async () => {
      frameworkInfrastructure = await initializeFrameworkInfrastructure();
      
      expect(frameworkInfrastructure).toBeDefined();
      expect(frameworkInfrastructure.loader).toBeDefined();
      expect(frameworkInfrastructure.validator).toBeDefined();
      expect(frameworkInfrastructure.stepRegistry).toBeDefined();
      expect(frameworkInfrastructure.initializationResults).toBeDefined();
    });

    it('should have critical components initialized', () => {
      const results = frameworkInfrastructure.initializationResults;
      expect(results.loader).toBe(true);
      expect(results.validator).toBe(true);
    });

    it('should load test framework successfully', () => {
      const loader = frameworkInfrastructure.loader;
      const frameworks = loader.getAllFrameworks();
      
      const testFramework = frameworks.find(f => f.name === 'test-framework');
      expect(testFramework).toBeDefined();
      expect(testFramework.status).toBe('loaded');
    });
  });

  describe('Domain Layer Integration', () => {
    it('should initialize domain framework system with configurations', async () => {
      const loader = frameworkInfrastructure.loader;
      const configs = loader.getFrameworkConfigs();
      
      domainFrameworkSystem = await initializeFrameworks(configs);
      
      expect(domainFrameworkSystem).toBeDefined();
      expect(domainFrameworkSystem.registry).toBeDefined();
      expect(domainFrameworkSystem.builder).toBeDefined();
    });

    it('should have framework registered in domain layer', () => {
      const registry = domainFrameworkSystem.registry;
      
      expect(registry.hasFramework('test-framework')).toBe(true);
      
      const framework = registry.getFramework('test-framework');
      expect(framework.name).toBe('test-framework');
      expect(framework.version).toBe('1.0.0');
      expect(framework.description).toBe('Test framework for integration testing');
      expect(framework.category).toBe('testing');
    });

    it('should validate framework metadata in domain layer', () => {
      const registry = domainFrameworkSystem.registry;
      
      // Domain layer should only validate metadata, not steps
      const framework = registry.getFramework('test-framework');
      expect(framework.name).toBe('test-framework');
      expect(framework.version).toBe('1.0.0');
      expect(framework.description).toBe('Test framework for integration testing');
    });
  });

  describe('Infrastructure-Domain Separation', () => {
    it('should handle file operations in infrastructure layer only', () => {
      const loader = frameworkInfrastructure.loader;
      const registry = domainFrameworkSystem.registry;
      
      // Infrastructure layer should handle file operations
      expect(loader.getAllFrameworks().length).toBeGreaterThan(0);
      
      // Domain layer should only handle metadata
      expect(registry.getAllFrameworks().length).toBeGreaterThan(0);
      
      // Both should have the same frameworks but different concerns
      const infrastructureFrameworks = loader.getAllFrameworks();
      const domainFrameworks = registry.getAllFrameworks();
      
      expect(infrastructureFrameworks.length).toBe(domainFrameworks.length);
    });

    it('should validate steps in infrastructure layer only', async () => {
      const validator = frameworkInfrastructure.validator;
      const loader = frameworkInfrastructure.loader;
      
      const testFramework = loader.getAllFrameworks().find(f => f.name === 'test-framework');
      
      // Infrastructure validator should validate steps
      const validation = await validator.validateFramework(testFramework);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should not validate steps in domain layer', () => {
      const registry = domainFrameworkSystem.registry;
      
      // Domain layer should not throw errors for steps validation
      expect(() => {
        registry.validateFrameworkConfig({
          name: 'test-framework',
          version: '1.0.0',
          description: 'Test framework',
          category: 'testing',
          steps: {
            'invalid-step': {
              // Missing file property - should not cause domain validation error
              type: 'action'
            }
          }
        });
      }).not.toThrow();
    });
  });

  describe('Framework Step Registry Integration', () => {
    it('should register framework steps with main step registry', () => {
      const stepRegistry = frameworkInfrastructure.stepRegistry;
      
      expect(stepRegistry).toBeDefined();
      expect(stepRegistry.getFrameworkSteps).toBeDefined();
      
      const frameworkSteps = stepRegistry.getFrameworkSteps();
      expect(frameworkSteps.length).toBeGreaterThan(0);
      
      // Should have test-step registered
      const testStep = frameworkSteps.find(step => step.includes('test-step'));
      expect(testStep).toBeDefined();
    });

    it('should validate domain integration', async () => {
      const stepRegistry = frameworkInfrastructure.stepRegistry;
      
      const validation = await stepRegistry.validateDomainIntegration();
      expect(validation.isValid).toBe(true);
      expect(validation.registeredSteps).toBeGreaterThan(0);
      expect(validation.loadedFrameworks).toBeGreaterThan(0);
      expect(validation.stepRegistryAvailable).toBe(true);
    });
  });

  describe('Health Status and Monitoring', () => {
    it('should provide health status for all components', () => {
      const loader = frameworkInfrastructure.loader;
      const validator = frameworkInfrastructure.validator;
      const stepRegistry = frameworkInfrastructure.stepRegistry;
      
      const loaderHealth = loader.getHealthStatus();
      const validatorHealth = validator.getHealthStatus();
      const stepRegistryHealth = stepRegistry.getHealthStatus();
      
      expect(loaderHealth.isHealthy).toBe(true);
      expect(validatorHealth.isHealthy).toBe(true);
      expect(stepRegistryHealth.isHealthy).toBe(true);
      
      expect(loaderHealth.domainInitialized).toBe(true);
    });

    it('should track framework statistics', () => {
      const loader = frameworkInfrastructure.loader;
      const stats = loader.getStats();
      
      expect(stats.totalFrameworks).toBeGreaterThan(0);
      expect(stats.loadedFrameworks).toBeGreaterThan(0);
      expect(stats.categories).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid framework configurations gracefully', async () => {
      const validator = frameworkInfrastructure.validator;
      
      const invalidFramework = {
        name: 'invalid-framework',
        path: '/non-existent/path',
        config: {
          name: 'invalid-framework',
          version: '1.0.0',
          description: 'Invalid framework',
          category: 'testing',
          steps: {
            'invalid-step': {
              // Missing file property
              type: 'action'
            }
          }
        }
      };
      
      const validation = await validator.validateFramework(invalidFramework);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should continue operation when some frameworks fail', () => {
      const loader = frameworkInfrastructure.loader;
      const healthStatus = loader.getHealthStatus();
      
      // Should still be healthy even if some frameworks failed
      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.loadedFrameworks).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should load frameworks within acceptable time', async () => {
      const startTime = Date.now();
      
      const loader = frameworkInfrastructure.loader;
      await loader.reloadAllFrameworks();
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should load within 500ms as per requirements
      expect(loadTime).toBeLessThan(500);
    });

    it('should support multiple frameworks simultaneously', () => {
      const loader = frameworkInfrastructure.loader;
      const frameworks = loader.getAllFrameworks();
      
      // Should support multiple frameworks
      expect(frameworks.length).toBeGreaterThan(0);
      
      // Each framework should be properly loaded
      frameworks.forEach(framework => {
        expect(framework.status).toBe('loaded');
        expect(framework.config).toBeDefined();
      });
    });
  });
});