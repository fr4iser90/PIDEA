/**
 * Integration Module - Unified Integration System
 * 
 * This module provides the complete integration system for PIDEA workflows,
 * including integration management, validation, metrics collection, and testing.
 * It orchestrates the integration of all workflow components and provides
 * comprehensive monitoring and validation capabilities.
 */

// Core Integration Components
const IntegrationManager = require('./IntegrationManager');
const IntegrationValidator = require('./IntegrationValidator');
const IntegrationMetrics = require('./IntegrationMetrics');
const IntegrationTestRunner = require('./IntegrationTestRunner');

// Module exports
module.exports = {
  // Core Components
  IntegrationManager,
  IntegrationValidator,
  IntegrationMetrics,
  IntegrationTestRunner,

  // Convenience exports
  core: {
    IntegrationManager,
    IntegrationValidator,
    IntegrationMetrics,
    IntegrationTestRunner
  },

  // Factory functions for easy instantiation
  createIntegrationManager: (dependencies = {}) => {
    return new IntegrationManager(dependencies);
  },

  createIntegrationValidator: (options = {}) => {
    return new IntegrationValidator(options);
  },

  createIntegrationMetrics: (options = {}) => {
    return new IntegrationMetrics(options);
  },

  createIntegrationTestRunner: (options = {}) => {
    return new IntegrationTestRunner(options);
  },

  // Utility functions
  utils: {
    /**
     * Create a complete integration system with default configuration
     * @param {Object} options - System options
     * @returns {Object} Complete integration system
     */
    createIntegrationSystem: (options = {}) => {
      const validator = new IntegrationValidator(options.validator || {});
      const metrics = new IntegrationMetrics(options.metrics || {});
      const testRunner = new IntegrationTestRunner(options.testRunner || {});
      
      const manager = new IntegrationManager({
        validator,
        metrics,
        testRunner,
        logger: options.logger || console,
        eventBus: options.eventBus,
        ...options.manager
      });

      return {
        manager,
        validator,
        metrics,
        testRunner,
        
        // Convenience methods
        initialize: async (config) => {
          await manager.initialize(config);
        },
        
        executeIntegration: async (request, options) => {
          return await manager.executeIntegration(request, options);
        },
        
        runTests: async (testConfig) => {
          return await testRunner.runAllTests(testConfig);
        },
        
        getMetrics: () => {
          return metrics.getMetrics();
        },
        
        getStatus: () => {
          return manager.getStatus();
        },
        
        cleanup: async () => {
          await manager.cleanup();
        }
      };
    },

    /**
     * Validate integration system configuration
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result
     */
    validateConfiguration: (config) => {
      const errors = [];
      const warnings = [];

      if (!config) {
        errors.push('Configuration is required');
        return { isValid: false, errors, warnings };
      }

      // Validate manager configuration
      if (config.manager) {
        if (config.manager.maxConcurrentIntegrations && config.manager.maxConcurrentIntegrations < 1) {
          errors.push('Manager maxConcurrentIntegrations must be at least 1');
        }
      }

      // Validate validator configuration
      if (config.validator) {
        if (config.validator.maxRequestSize && config.validator.maxRequestSize < 1024) {
          warnings.push('Validator maxRequestSize is very small');
        }
      }

      // Validate metrics configuration
      if (config.metrics) {
        if (config.metrics.maxHistorySize && config.metrics.maxHistorySize < 100) {
          warnings.push('Metrics maxHistorySize is very small');
        }
      }

      // Validate test runner configuration
      if (config.testRunner) {
        if (config.testRunner.testTimeout && config.testRunner.testTimeout < 5000) {
          warnings.push('Test runner timeout is very short');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    },

    /**
     * Create default integration configuration
     * @returns {Object} Default configuration
     */
    createDefaultConfig: () => {
      return {
        manager: {
          enableRealTimeMonitoring: true,
          enableErrorRecovery: true,
          maxConcurrentIntegrations: 10
        },
        validator: {
          enableStrictValidation: true,
          maxRequestSize: 1024 * 1024, // 1MB
          enableSecurityValidation: true,
          allowedIntegrationTypes: ['workflow', 'handler', 'step', 'system'],
          allowedComponentTypes: ['handler', 'step', 'service']
        },
        metrics: {
          enableRealTimeMetrics: true,
          enableHistoricalMetrics: true,
          maxHistorySize: 10000,
          metricsRetentionHours: 24,
          enablePerformanceMetrics: true,
          enableErrorMetrics: true,
          enableHealthMetrics: true
        },
        testRunner: {
          enableSystemTests: true,
          enableHandlerTests: true,
          enablePerformanceTests: true,
          enableE2ETests: true,
          testTimeout: 30000, // 30 seconds
          maxConcurrentTests: 5,
          enableTestRetries: true,
          maxRetries: 3,
          enableDetailedReporting: true
        }
      };
    },

    /**
     * Generate integration report
     * @param {Object} integrationSystem - Integration system instance
     * @returns {Promise<Object>} Integration report
     */
    generateReport: async (integrationSystem) => {
      const status = integrationSystem.getStatus();
      const metrics = integrationSystem.getMetrics();
      const healthCheck = await integrationSystem.manager.performHealthCheck();
      const report = await integrationSystem.manager.generateIntegrationReport();

      return {
        timestamp: new Date(),
        status,
        metrics,
        healthCheck,
        report,
        summary: {
          isHealthy: healthCheck.overall === 'healthy',
          totalIntegrations: status.integrationCount,
          successRate: metrics.summary.errorRate ? (100 - metrics.summary.errorRate) : 100,
          averageResponseTime: metrics.summary.averageDuration,
          uptime: metrics.uptime
        }
      };
    },

    /**
     * Run integration diagnostics
     * @param {Object} integrationSystem - Integration system instance
     * @returns {Promise<Object>} Diagnostics result
     */
    runDiagnostics: async (integrationSystem) => {
      const diagnostics = {
        timestamp: new Date(),
        components: {},
        issues: [],
        recommendations: []
      };

      try {
        // Check manager status
        const status = integrationSystem.getStatus();
        diagnostics.components.manager = {
          isInitialized: status.isInitialized,
          isRunning: status.isRunning,
          registeredComponents: status.registeredComponents,
          activeIntegrations: status.activeIntegrations
        };

        if (!status.isInitialized) {
          diagnostics.issues.push('Integration manager is not initialized');
          diagnostics.recommendations.push('Initialize the integration manager');
        }

        // Check metrics
        const metrics = integrationSystem.getMetrics();
        diagnostics.components.metrics = {
          totalIntegrations: metrics.summary.totalIntegrations,
          errorRate: metrics.summary.errorRate,
          averageDuration: metrics.summary.averageDuration
        };

        if (metrics.summary.errorRate > 10) {
          diagnostics.issues.push('High error rate detected');
          diagnostics.recommendations.push('Investigate integration errors');
        }

        // Check health
        const healthCheck = await integrationSystem.manager.performHealthCheck();
        diagnostics.components.health = healthCheck;

        if (healthCheck.overall !== 'healthy') {
          diagnostics.issues.push('System health is degraded');
          diagnostics.recommendations.push('Check component health status');
        }

        // Run basic tests
        const testResults = await integrationSystem.runTests({ quick: true });
        diagnostics.components.tests = {
          success: testResults.success,
          summary: testResults.summary
        };

        if (!testResults.success) {
          diagnostics.issues.push('Integration tests are failing');
          diagnostics.recommendations.push('Fix failing integration tests');
        }

      } catch (error) {
        diagnostics.issues.push(`Diagnostics failed: ${error.message}`);
        diagnostics.recommendations.push('Check system configuration');
      }

      return diagnostics;
    }
  },

  // Constants
  constants: {
    INTEGRATION_TYPES: {
      WORKFLOW: 'workflow',
      HANDLER: 'handler',
      STEP: 'step',
      SYSTEM: 'system'
    },

    COMPONENT_TYPES: {
      HANDLER: 'handler',
      STEP: 'step',
      SERVICE: 'service'
    },

    HEALTH_STATUS: {
      HEALTHY: 'healthy',
      DEGRADED: 'degraded',
      UNHEALTHY: 'unhealthy'
    },

    TEST_SUITES: {
      SYSTEM: 'system',
      HANDLERS: 'handlers',
      PERFORMANCE: 'performance',
      E2E: 'e2e'
    }
  },

  // Version information
  version: '1.0.0',
  description: 'Unified Integration System for PIDEA Workflows'
}; 