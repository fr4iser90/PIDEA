/**
 * GenerateIntegrationService - Service for generate step integration
 * 
 * This service provides integration utilities for the generate step system,
 * including backward compatibility, testing, monitoring, and performance analysis.
 */
const fs = require('fs').promises;
const path = require('path');
/**
 * Generate integration service
 */
class GenerateIntegrationService {
  constructor(options = {}) {
    this.options = {
      enableBackwardCompatibility: options.enableBackwardCompatibility !== false,
      enableTesting: options.enableTesting !== false,
      enableMonitoring: options.enableMonitoring !== false,
      enablePerformanceAnalysis: options.enablePerformanceAnalysis !== false,
      integrationLogPath: options.integrationLogPath || 'logs/generate-integration.log',
      ...options
    };
    this.integrationLog = [];
    this.testResults = new Map();
    this.performanceMetrics = new Map();
    this.compatibilityLayer = new Map();
    // Load generate step components
    this._loadGenerateStepComponents();
  }
  /**
   * Load generate step components
   */
  _loadGenerateStepComponents() {
    try {
      const generateSteps = require('../workflows/steps/generate');
      this.generateStepFactory = generateSteps.GenerateStepFactory;
      this.generateStepRegistry = generateSteps.GenerateStepRegistry;
      this.generateServiceAdapter = generateSteps.GenerateServiceAdapter;
      this.generateComplexityManager = generateSteps.GenerateComplexityManager;
      this.generateValidationService = generateSteps.GenerateValidationService;
      this.generatePerformanceOptimizer = generateSteps.GeneratePerformanceOptimizer;
      this.generateComponentsLoaded = true;
    } catch (error) {
      console.warn('Generate step components not available:', error.message);
      this.generateComponentsLoaded = false;
    }
  }
  /**
   * Setup backward compatibility layer
   * @param {Object} options - Compatibility options
   * @returns {Promise<Object>} Setup result
   */
  async setupBackwardCompatibility(options = {}) {
    if (!this.options.enableBackwardCompatibility) {
      return {
        success: false,
        error: 'Backward compatibility is disabled'
      };
    }
    try {
      // Create compatibility mappings
      const compatibilityMappings = {
        'GenerateScriptHandler': {
          stepType: 'GenerateScriptStep',
          adapter: 'GenerateServiceAdapter',
          fallback: true
        },
        'GenerateScriptsHandler': {
          stepType: 'GenerateScriptsStep',
          adapter: 'GenerateServiceAdapter',
          fallback: true
        },
        'GenerateDocumentationHandler': {
          stepType: 'GenerateDocumentationStep',
          adapter: 'GenerateServiceAdapter',
          fallback: true
        }
      };
      // Register compatibility handlers
      for (const [handlerType, mapping] of Object.entries(compatibilityMappings)) {
        this.compatibilityLayer.set(handlerType, mapping);
      }
      // Log setup
      this.logIntegration('backward-compatibility-setup', {
        mappings: Object.keys(compatibilityMappings),
        options: options
      });
      return {
        success: true,
        message: 'Backward compatibility layer setup completed',
        mappings: Object.keys(compatibilityMappings)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Create compatibility handler
   * @param {string} handlerType -  handler type
   * @param {Object} request - Handler request
   * @returns {Promise<Object>} Compatibility handler
   */
  async createCompatibilityHandler(handlerType, request) {
    if (!this.compatibilityLayer.has(handlerType)) {
      throw new Error(`No compatibility mapping for handler type: ${handlerType}`);
    }
    const mapping = this.compatibilityLayer.get(handlerType);
    if (!this.generateComponentsLoaded) {
      throw new Error('Generate step components not available for compatibility handler');
    }
    // Create step
    const task = request.task || request.data || {};
    const options = request.options || {};
    let step;
    switch (mapping.stepType) {
      case 'GenerateScriptStep':
        step = this.generateStepFactory.createGenerateScriptStep(task, options);
        break;
      case 'GenerateScriptsStep':
        step = this.generateStepFactory.createGenerateScriptsStep(task, options);
        break;
      case 'GenerateDocumentationStep':
        step = this.generateStepFactory.createGenerateDocumentationStep(task, options);
        break;
      default:
        throw new Error(`Unknown step type: ${mapping.stepType}`);
    }
    // Create compatibility wrapper
    return this.createCompatibilityWrapper(step, handlerType, mapping);
  }
  /**
   * Create compatibility wrapper
   * @param {BaseWorkflowStep} step - Generate step
   * @param {string} handlerType -  handler type
   * @param {Object} mapping - Compatibility mapping
   * @returns {Object} Compatibility wrapper
   */
  createCompatibilityWrapper(step, handlerType, mapping) {
    return {
      /**
       * Execute compatibility handler
       * @param {Object} data - Handler data
       * @param {Object} context - Handler context
       * @returns {Promise<Object>} Handler result
       */
      async execute(data, context = {}) {
        try {
          // Create workflow context
          const workflowContext = this.createWorkflowContext(context, data);
          // Execute step
          const result = await step.execute(workflowContext);
          const adaptedResult = this.adaptResult(result, handlerType);
          return {
            success: true,
            handlerType: handlerType,
            result: adaptedResult,
            compatibility: true
          };
        } catch (error) {
          // Use fallback if available
          if (mapping.fallback) {
            return await this.executeFallback(data, context, error);
          }
          return {
            success: false,
            handlerType: handlerType,
            error: error.message,
            compatibility: true
          };
        }
      },
      /**
       * Create workflow context
       * @param {Object} context - Handler context
       * @param {Object} data - Handler data
       * @returns {Object} Workflow context
       */
      createWorkflowContext(context, data) {
        return {
          get: (key) => {
            if (data && data[key] !== undefined) {
              return data[key];
            }
            if (context && context[key] !== undefined) {
              return context[key];
            }
            return process.env[key];
          },
          set: (key, value) => {
            if (data) {
              data[key] = value;
            }
          },
          has: (key) => {
            return (data && data[key] !== undefined) ||
                   (context && context[key] !== undefined) ||
                   process.env[key] !== undefined;
          }
        };
      },
      /**
       * Adapt result to  format
       * @param {Object} result - Step result
       * @param {string} handlerType - Handler type
       * @returns {Object} Adapted result
       */
      adaptResult(result, handlerType) {
        // Adapt based on handler type
        switch (handlerType) {
          case 'GenerateScriptHandler':
            return {
              script: result.script || result.content || result.output,
              metadata: result.metadata || {},
              success: result.success !== false
            };
          case 'GenerateScriptsHandler':
            return {
              scripts: result.scripts || result.outputs || [],
              metadata: result.metadata || {},
              success: result.success !== false
            };
          case 'GenerateDocumentationHandler':
            return {
              documentation: result.documentation || result.content || result.output,
              metadata: result.metadata || {},
              success: result.success !== false
            };
          default:
            return result;
        }
      },
      /**
       * Execute fallback handler
       * @param {Object} data - Handler data
       * @param {Object} context - Handler context
       * @param {Error} originalError - Original error
       * @returns {Promise<Object>} Fallback result
       */
      async executeFallback(data, context, originalError) {
        // Log fallback execution
        this.logIntegration('fallback-execution', {
          handlerType: handlerType,
          originalError: originalError.message,
          data: data
        });
        // Return fallback result
        return {
          success: false,
          handlerType: handlerType,
          error: `Fallback not implemented: ${originalError.message}`,
          fallback: true
        };
      }
    };
  }
  /**
   * Run integration tests
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   */
  async runIntegrationTests(options = {}) {
    if (!this.options.enableTesting) {
      return {
        success: false,
        error: 'Testing is disabled'
      };
    }
    try {
      const testResults = [];
      // Test generate step creation
      const creationTest = await this.testStepCreation();
      testResults.push(creationTest);
      // Test step execution
      const executionTest = await this.testStepExecution();
      testResults.push(executionTest);
      // Test validation
      const validationTest = await this.testValidation();
      testResults.push(validationTest);
      // Test performance optimization
      const performanceTest = await this.testPerformanceOptimization();
      testResults.push(performanceTest);
      // Test backward compatibility
      const compatibilityTest = await this.testBackwardCompatibility();
      testResults.push(compatibilityTest);
      // Calculate overall results
      const passed = testResults.filter(r => r.success).length;
      const failed = testResults.filter(r => !r.success).length;
      const overallResult = {
        success: failed === 0,
        total: testResults.length,
        passed: passed,
        failed: failed,
        results: testResults,
        timestamp: new Date().toISOString()
      };
      // Store test results
      this.testResults.set('integration', overallResult);
      // Log test completion
      this.logIntegration('integration-tests-complete', overallResult);
      return overallResult;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Test step creation
   * @returns {Promise<Object>} Test result
   */
  async testStepCreation() {
    try {
      if (!this.generateComponentsLoaded) {
        return {
          test: 'step-creation',
          success: false,
          error: 'Generate components not loaded'
        };
      }
      // Test creating each step type
      const testTask = { description: 'Test task' };
      const testOptions = { test: true };
      const scriptStep = this.generateStepFactory.createGenerateScriptStep(testTask, testOptions);
      const scriptsStep = this.generateStepFactory.createGenerateScriptsStep(testTask, testOptions);
      const documentationStep = this.generateStepFactory.createGenerateDocumentationStep(testTask, testOptions);
      return {
        test: 'step-creation',
        success: true,
        message: 'All step types created successfully',
        steps: ['GenerateScriptStep', 'GenerateScriptsStep', 'GenerateDocumentationStep']
      };
    } catch (error) {
      return {
        test: 'step-creation',
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Test step execution
   * @returns {Promise<Object>} Test result
   */
  async testStepExecution() {
    try {
      if (!this.generateComponentsLoaded) {
        return {
          test: 'step-execution',
          success: false,
          error: 'Generate components not loaded'
        };
      }
      // Create test context
      const testContext = {
        get: (key) => {
          const defaults = {
            projectPath: process.cwd(),
            task: { description: 'Test execution task' },
            aiService: {
              generateScript: () => Promise.resolve({ success: true, script: 'test script' }),
              generateScripts: () => Promise.resolve({ success: true, scripts: ['test script 1', 'test script 2'] }),
              generateDocumentation: () => Promise.resolve({ success: true, documentation: 'test documentation' })
            }
          };
          return defaults[key];
        },
        set: () => {},
        has: () => true
      };
      // Test script step execution
      const scriptStep = this.generateStepFactory.createGenerateScriptStep(
        { description: 'Test script' },
        { test: true }
      );
      const scriptResult = await scriptStep.execute(testContext);
      return {
        test: 'step-execution',
        success: true,
        message: 'Step execution test completed',
        results: {
          scriptStep: scriptResult
        }
      };
    } catch (error) {
      return {
        test: 'step-execution',
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Test validation
   * @returns {Promise<Object>} Test result
   */
  async testValidation() {
    try {
      if (!this.generateComponentsLoaded) {
        return {
          test: 'validation',
          success: false,
          error: 'Generate components not loaded'
        };
      }
      // Test validation service
      const validationService = new this.generateValidationService();
      // Test with valid input
      const validResult = await validationService.validateGenerateScriptStep(
        this.generateStepFactory.createGenerateScriptStep({ description: 'Valid task' }),
        { projectPath: process.cwd() }
      );
      return {
        test: 'validation',
        success: true,
        message: 'Validation test completed',
        results: {
          validInput: validResult
        }
      };
    } catch (error) {
      return {
        test: 'validation',
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Test performance optimization
   * @returns {Promise<Object>} Test result
   */
  async testPerformanceOptimization() {
    try {
      if (!this.generateComponentsLoaded) {
        return {
          test: 'performance-optimization',
          success: false,
          error: 'Generate components not loaded'
        };
      }
      // Test performance optimizer
      const optimizer = new this.generatePerformanceOptimizer();
      // Test optimization methods
      const metrics = optimizer.getPerformanceMetrics();
      return {
        test: 'performance-optimization',
        success: true,
        message: 'Performance optimization test completed',
        results: {
          metrics: metrics
        }
      };
    } catch (error) {
      return {
        test: 'performance-optimization',
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Test backward compatibility
   * @returns {Promise<Object>} Test result
   */
  async testBackwardCompatibility() {
    try {
      // Test compatibility layer
      await this.setupBackwardCompatibility();
      // Test creating compatibility handlers
      const scriptHandler = await this.createCompatibilityHandler('GenerateScriptHandler', {
        task: { description: 'Test compatibility' }
      });
      return {
        test: 'backward-compatibility',
        success: true,
        message: 'Backward compatibility test completed',
        results: {
          compatibilityLayer: this.compatibilityLayer.size,
          scriptHandler: !!scriptHandler
        }
      };
    } catch (error) {
      return {
        test: 'backward-compatibility',
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Monitor generate step performance
   * @param {Object} options - Monitoring options
   * @returns {Promise<Object>} Monitoring result
   */
  async monitorPerformance(options = {}) {
    if (!this.options.enableMonitoring) {
      return {
        success: false,
        error: 'Monitoring is disabled'
      };
    }
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        registry: await this.getRegistryMetrics(),
        performance: await this.getPerformanceMetrics(),
        compatibility: await this.getCompatibilityMetrics()
      };
      // Store metrics
      this.performanceMetrics.set(metrics.timestamp, metrics);
      // Log monitoring
      this.logIntegration('performance-monitoring', metrics);
      return {
        success: true,
        metrics: metrics
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Get registry metrics
   * @returns {Promise<Object>} Registry metrics
   */
  async getRegistryMetrics() {
    if (!this.generateComponentsLoaded) {
      return { error: 'Generate components not loaded' };
    }
    try {
      const statistics = this.generateStepRegistry.getStatistics();
      return {
        registeredSteps: statistics.registeredSteps,
        totalExecutions: statistics.totalExecutions,
        averageExecutionTime: statistics.averageExecutionTime
      };
    } catch (error) {
      return { error: error.message };
    }
  }
  /**
   * Get performance metrics
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformanceMetrics() {
    if (!this.generateComponentsLoaded) {
      return { error: 'Generate components not loaded' };
    }
    try {
      const optimizer = new this.generatePerformanceOptimizer();
      return optimizer.getPerformanceMetrics();
    } catch (error) {
      return { error: error.message };
    }
  }
  /**
   * Get compatibility metrics
   * @returns {Promise<Object>} Compatibility metrics
   */
  async getCompatibilityMetrics() {
    return {
      compatibilityLayerSize: this.compatibilityLayer.size,
      supportedHandlers: Array.from(this.compatibilityLayer.keys())
    };
  }
  /**
   * Log integration event
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  logIntegration(event, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: event,
      data: data
    };
    this.integrationLog.push(logEntry);
    // Write to file if path is configured
    if (this.options.integrationLogPath) {
      this.writeIntegrationLog(logEntry);
    }
  }
  /**
   * Write integration log to file
   * @param {Object} logEntry - Log entry
   */
  async writeIntegrationLog(logEntry) {
    try {
      const logDir = path.dirname(this.options.integrationLogPath);
      await fs.mkdir(logDir, { recursive: true });
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.options.integrationLogPath, logLine);
    } catch (error) {
      console.warn('Failed to write integration log:', error.message);
    }
  }
  /**
   * Get integration statistics
   * @returns {Object} Integration statistics
   */
  getIntegrationStatistics() {
    return {
      logEntries: this.integrationLog.length,
      testResults: this.testResults.size,
      performanceMetrics: this.performanceMetrics.size,
      compatibilityLayer: this.compatibilityLayer.size
    };
  }
  /**
   * Get service options
   * @returns {Object} Service options
   */
  getOptions() {
    return { ...this.options };
  }
  /**
   * Set service options
   * @param {Object} options - Service options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }
}
module.exports = GenerateIntegrationService; 