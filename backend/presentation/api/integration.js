/**
 * Integration API - RESTful endpoints for integration system
 * 
 * This module provides RESTful API endpoints for the integration system,
 * including test execution, metrics retrieval, health checks, and system management.
 * It serves as the main interface for integration operations.
 */

const express = require('express');
const { utils } = require('../../domain/workflows/integration');
const IntegrationRepository = require('../../infrastructure/database/repositories/IntegrationRepository');

class IntegrationController {
  /**
   * Create a new integration controller
   * @param {Object} dependencies - Controller dependencies
   */
  constructor(dependencies = {}) {
    this.router = express.Router();
    this.integrationSystem = dependencies.integrationSystem || utils.createIntegrationSystem();
    this.repository = dependencies.repository || new IntegrationRepository(dependencies.database);
    this.logger = dependencies.logger || console;
    
    this.initializeRoutes();
  }

  /**
   * Initialize API routes
   */
  initializeRoutes() {
    // System management routes
    this.router.post('/initialize', this.initializeSystem.bind(this));
    this.router.get('/status', this.getSystemStatus.bind(this));
    this.router.post('/cleanup', this.cleanupSystem.bind(this));

    // Integration execution routes
    this.router.post('/execute', this.executeIntegration.bind(this));
    this.router.post('/execute/workflow', this.executeWorkflowIntegration.bind(this));
    this.router.post('/execute/handler', this.executeHandlerIntegration.bind(this));
    this.router.post('/execute/step', this.executeStepIntegration.bind(this));
    this.router.post('/execute/system', this.executeSystemIntegration.bind(this));

    // Test execution routes
    this.router.post('/tests/run', this.runTests.bind(this));
    this.router.post('/tests/system', this.runSystemTests.bind(this));
    this.router.post('/tests/handlers', this.runHandlerTests.bind(this));
    this.router.post('/tests/performance', this.runPerformanceTests.bind(this));
    this.router.post('/tests/e2e', this.runE2ETests.bind(this));
    this.router.get('/tests/results/:testId', this.getTestResult.bind(this));
    this.router.get('/tests/results', this.getTestResults.bind(this));

    // Metrics routes
    this.router.get('/metrics', this.getMetrics.bind(this));
    this.router.get('/metrics/performance', this.getPerformanceMetrics.bind(this));
    this.router.get('/metrics/errors', this.getErrorMetrics.bind(this));
    this.router.get('/metrics/health', this.getHealthMetrics.bind(this));
    this.router.get('/metrics/history', this.getHistoricalMetrics.bind(this));

    // Health check routes
    this.router.get('/health', this.getHealthCheck.bind(this));
    this.router.post('/health/check', this.performHealthCheck.bind(this));

    // Report routes
    this.router.get('/reports', this.getReports.bind(this));
    this.router.post('/reports/generate', this.generateReport.bind(this));
    this.router.get('/reports/:reportId', this.getReport.bind(this));

    // Configuration routes
    this.router.get('/config', this.getConfiguration.bind(this));
    this.router.post('/config', this.saveConfiguration.bind(this));
    this.router.get('/config/:configName', this.getConfigurationByName.bind(this));

    // Diagnostics routes
    this.router.get('/diagnostics', this.getDiagnostics.bind(this));
    this.router.post('/diagnostics/run', this.runDiagnostics.bind(this));

    // Data management routes
    this.router.delete('/data/cleanup', this.cleanupOldData.bind(this));
    this.router.get('/data/summary', this.getDataSummary.bind(this));
  }

  /**
   * Initialize integration system
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async initializeSystem(req, res) {
    try {
      const config = req.body || {};
      
      // Validate configuration
      const validationResult = utils.validateConfiguration(config);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid configuration',
          details: validationResult.errors,
          warnings: validationResult.warnings
        });
      }

      const result = await this.integrationSystem.initialize(config);
      
      res.json({
        success: true,
        message: 'Integration system initialized successfully',
        result
      });

    } catch (error) {
      this.logger.error('Integration API: System initialization failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'System initialization failed',
        message: error.message
      });
    }
  }

  /**
   * Get system status
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getSystemStatus(req, res) {
    try {
      const status = this.integrationSystem.getStatus();
      const metrics = this.integrationSystem.getMetrics();
      
      res.json({
        success: true,
        status,
        metrics
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get system status', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get system status',
        message: error.message
      });
    }
  }

  /**
   * Cleanup integration system
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async cleanupSystem(req, res) {
    try {
      await this.integrationSystem.cleanup();
      
      res.json({
        success: true,
        message: 'Integration system cleaned up successfully'
      });

    } catch (error) {
      this.logger.error('Integration API: System cleanup failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'System cleanup failed',
        message: error.message
      });
    }
  }

  /**
   * Execute integration
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async executeIntegration(req, res) {
    try {
      const { request, options } = req.body;
      
      if (!request) {
        return res.status(400).json({
          success: false,
          error: 'Integration request is required'
        });
      }

      const result = await this.integrationSystem.executeIntegration(request, options);
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: Integration execution failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Integration execution failed',
        message: error.message
      });
    }
  }

  /**
   * Execute workflow integration
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async executeWorkflowIntegration(req, res) {
    try {
      const { workflow, response, options } = req.body;
      
      if (!workflow) {
        return res.status(400).json({
          success: false,
          error: 'Workflow data is required'
        });
      }

      const request = {
        type: 'workflow',
        workflow,
        response
      };

      const result = await this.integrationSystem.executeIntegration(request, options);
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: Workflow integration failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Workflow integration failed',
        message: error.message
      });
    }
  }

  /**
   * Execute handler integration
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async executeHandlerIntegration(req, res) {
    try {
      const { handlerType, data, context, options } = req.body;
      
      if (!handlerType) {
        return res.status(400).json({
          success: false,
          error: 'Handler type is required'
        });
      }

      const request = {
        type: 'handler',
        handlerType,
        data,
        context
      };

      const result = await this.integrationSystem.executeIntegration(request, options);
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: Handler integration failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Handler integration failed',
        message: error.message
      });
    }
  }

  /**
   * Execute step integration
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async executeStepIntegration(req, res) {
    try {
      const { stepType, data, context, options } = req.body;
      
      if (!stepType) {
        return res.status(400).json({
          success: false,
          error: 'Step type is required'
        });
      }

      const request = {
        type: 'step',
        stepType,
        data,
        context
      };

      const result = await this.integrationSystem.executeIntegration(request, options);
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: Step integration failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Step integration failed',
        message: error.message
      });
    }
  }

  /**
   * Execute system integration
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async executeSystemIntegration(req, res) {
    try {
      const { testConfig, options } = req.body;

      const request = {
        type: 'system',
        testConfig
      };

      const result = await this.integrationSystem.executeIntegration(request, options);
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: System integration failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'System integration failed',
        message: error.message
      });
    }
  }

  /**
   * Run tests
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async runTests(req, res) {
    try {
      const { testConfig } = req.body;
      
      const result = await this.integrationSystem.runTests(testConfig);
      
      // Save test results to database
      if (result.results) {
        for (const [suiteName, suiteResults] of Object.entries(result.results)) {
          for (const testResult of suiteResults) {
            await this.repository.saveTestResult({
              test_id: result.testId,
              suite_name: suiteName,
              test_name: testResult.name,
              test_type: suiteName,
              status: testResult.success ? 'passed' : 'failed',
              success: testResult.success,
              duration_ms: testResult.duration,
              retries: testResult.retries || 0,
              error_message: testResult.error || null,
              result_data: testResult.result || null,
              metadata: {
                timestamp: testResult.timestamp,
                retries: testResult.retries
              }
            });
          }
        }
      }
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: Test execution failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Test execution failed',
        message: error.message
      });
    }
  }

  /**
   * Run system tests
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async runSystemTests(req, res) {
    try {
      const { testConfig } = req.body;
      
      const result = await this.integrationSystem.testRunner.runSystemTests(testConfig);
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: System tests failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'System tests failed',
        message: error.message
      });
    }
  }

  /**
   * Run handler tests
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async runHandlerTests(req, res) {
    try {
      const { testConfig } = req.body;
      
      const result = await this.integrationSystem.testRunner.runHandlerTests(testConfig);
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: Handler tests failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Handler tests failed',
        message: error.message
      });
    }
  }

  /**
   * Run performance tests
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async runPerformanceTests(req, res) {
    try {
      const { testConfig } = req.body;
      
      const result = await this.integrationSystem.testRunner.runPerformanceTests(testConfig);
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: Performance tests failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Performance tests failed',
        message: error.message
      });
    }
  }

  /**
   * Run E2E tests
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async runE2ETests(req, res) {
    try {
      const { testConfig } = req.body;
      
      const result = await this.integrationSystem.testRunner.runE2ETests(testConfig);
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: E2E tests failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'E2E tests failed',
        message: error.message
      });
    }
  }

  /**
   * Get test result
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getTestResult(req, res) {
    try {
      const { testId } = req.params;
      
      const result = await this.repository.getTestResult(testId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Test result not found'
        });
      }
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get test result', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get test result',
        message: error.message
      });
    }
  }

  /**
   * Get test results
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getTestResults(req, res) {
    try {
      const { suiteName, limit, offset, status, success } = req.query;
      
      const results = await this.repository.getTestResultsBySuite(suiteName, {
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0,
        status,
        success: success === 'true'
      });
      
      res.json({
        success: true,
        results,
        count: results.length
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get test results', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get test results',
        message: error.message
      });
    }
  }

  /**
   * Get metrics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getMetrics(req, res) {
    try {
      const metrics = this.integrationSystem.getMetrics();
      
      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get metrics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get metrics',
        message: error.message
      });
    }
  }

  /**
   * Get performance metrics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getPerformanceMetrics(req, res) {
    try {
      const { type, handlerType, success, timeRange } = req.query;
      
      const filters = {};
      if (type) filters.type = type;
      if (handlerType) filters.handlerType = handlerType;
      if (success !== undefined) filters.success = success === 'true';
      if (timeRange) filters.timeRange = parseInt(timeRange);

      const metrics = this.integrationSystem.metrics.getPerformanceMetrics(filters);
      
      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get performance metrics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get performance metrics',
        message: error.message
      });
    }
  }

  /**
   * Get error metrics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getErrorMetrics(req, res) {
    try {
      const { type, handlerType, timeRange } = req.query;
      
      const filters = {};
      if (type) filters.type = type;
      if (handlerType) filters.handlerType = handlerType;
      if (timeRange) filters.timeRange = parseInt(timeRange);

      const metrics = this.integrationSystem.metrics.getErrorMetrics(filters);
      
      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get error metrics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get error metrics',
        message: error.message
      });
    }
  }

  /**
   * Get health metrics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getHealthMetrics(req, res) {
    try {
      const metrics = this.integrationSystem.metrics.getHealthMetrics();
      
      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get health metrics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get health metrics',
        message: error.message
      });
    }
  }

  /**
   * Get historical metrics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getHistoricalMetrics(req, res) {
    try {
      const { timeRange, limit, type, handlerType } = req.query;
      
      const options = {};
      if (timeRange) options.timeRange = parseInt(timeRange);
      if (limit) options.limit = parseInt(limit);
      if (type) options.type = type;
      if (handlerType) options.handlerType = handlerType;

      const metrics = this.integrationSystem.metrics.getHistoricalMetrics(options);
      
      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get historical metrics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get historical metrics',
        message: error.message
      });
    }
  }

  /**
   * Get health check
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getHealthCheck(req, res) {
    try {
      const healthCheck = await this.integrationSystem.manager.performHealthCheck();
      
      res.json({
        success: true,
        healthCheck
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get health check', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get health check',
        message: error.message
      });
    }
  }

  /**
   * Perform health check
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async performHealthCheck(req, res) {
    try {
      const healthCheck = await this.integrationSystem.manager.performHealthCheck();
      
      // Save health check to database
      await this.repository.saveHealthCheck({
        component_type: 'system',
        component_name: 'integration_system',
        health_status: healthCheck.overall,
        health_data: healthCheck
      });
      
      res.json({
        success: true,
        healthCheck
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to perform health check', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to perform health check',
        message: error.message
      });
    }
  }

  /**
   * Get reports
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getReports(req, res) {
    try {
      const { reportType, limit, offset } = req.query;
      
      const reports = await this.repository.getReportsByType(reportType, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      
      res.json({
        success: true,
        reports,
        count: reports.length
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get reports', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get reports',
        message: error.message
      });
    }
  }

  /**
   * Generate report
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async generateReport(req, res) {
    try {
      const { reportType, reportName } = req.body;
      
      const report = await utils.generateReport(this.integrationSystem);
      
      // Save report to database
      const savedReport = await this.repository.saveReport({
        report_type: reportType || 'summary',
        report_name: reportName || 'Integration Report',
        report_data: report
      });
      
      res.json({
        success: true,
        report: savedReport
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to generate report', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        message: error.message
      });
    }
  }

  /**
   * Get report
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getReport(req, res) {
    try {
      const { reportId } = req.params;
      
      const report = await this.repository.getReport(reportId);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }
      
      res.json({
        success: true,
        report
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get report', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get report',
        message: error.message
      });
    }
  }

  /**
   * Get configuration
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getConfiguration(req, res) {
    try {
      const config = utils.createDefaultConfig();
      
      res.json({
        success: true,
        config
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get configuration', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
        message: error.message
      });
    }
  }

  /**
   * Save configuration
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async saveConfiguration(req, res) {
    try {
      const { configName, configType, configData } = req.body;
      
      if (!configName || !configType || !configData) {
        return res.status(400).json({
          success: false,
          error: 'Configuration name, type, and data are required'
        });
      }

      const config = await this.repository.saveConfiguration({
        config_name: configName,
        config_type: configType,
        config_data: configData,
        is_active: true
      });
      
      res.json({
        success: true,
        config
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to save configuration', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to save configuration',
        message: error.message
      });
    }
  }

  /**
   * Get configuration by name
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getConfigurationByName(req, res) {
    try {
      const { configName } = req.params;
      
      const config = await this.repository.getConfigurationByName(configName);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found'
        });
      }
      
      res.json({
        success: true,
        config
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get configuration by name', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration by name',
        message: error.message
      });
    }
  }

  /**
   * Get diagnostics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getDiagnostics(req, res) {
    try {
      const diagnostics = await this.repository.getDiagnostics();
      
      res.json({
        success: true,
        diagnostics
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get diagnostics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get diagnostics',
        message: error.message
      });
    }
  }

  /**
   * Run diagnostics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async runDiagnostics(req, res) {
    try {
      const diagnostics = await utils.runDiagnostics(this.integrationSystem);
      
      res.json({
        success: true,
        diagnostics
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to run diagnostics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to run diagnostics',
        message: error.message
      });
    }
  }

  /**
   * Cleanup old data
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async cleanupOldData(req, res) {
    try {
      const { daysToKeep } = req.query;
      
      const result = await this.repository.cleanupOldData({
        daysToKeep: parseInt(daysToKeep) || 30
      });
      
      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to cleanup old data', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup old data',
        message: error.message
      });
    }
  }

  /**
   * Get data summary
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getDataSummary(req, res) {
    try {
      const { days } = req.query;
      
      const testSummary = await this.repository.getTestSummary({ days: parseInt(days) || 30 });
      const performanceSummary = await this.repository.getPerformanceSummary({ days: parseInt(days) || 30 });
      
      res.json({
        success: true,
        summary: {
          test: testSummary,
          performance: performanceSummary
        }
      });

    } catch (error) {
      this.logger.error('Integration API: Failed to get data summary', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get data summary',
        message: error.message
      });
    }
  }

  /**
   * Get router
   * @returns {Object} Express router
   */
  getRouter() {
    return this.router;
  }
}

module.exports = IntegrationController; 