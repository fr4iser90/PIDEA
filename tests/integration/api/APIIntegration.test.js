/**
 * API Integration Tests
 * 
 * Tests the integration API endpoints and their interaction with the integration system.
 * This includes system management, test execution, metrics, and health checks.
 */

const { expect } = require('chai');
const request = require('supertest');
const express = require('express');
const IntegrationController = require('../../../backend/presentation/api/integration');
const { createIntegrationSystem } = require('../../../backend/domain/workflows/integration');
const IntegrationRepository = require('../../../backend/infrastructure/database/repositories/IntegrationRepository');

describe('API Integration Tests', () => {
  let app;
  let integrationController;
  let integrationSystem;
  let integrationRepository;

  before(async () => {
    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Initialize integration system
    integrationSystem = createIntegrationSystem({
      logger: console,
      eventBus: { emit: () => {}, subscribe: () => {} }
    });

    await integrationSystem.initialize();

    // Initialize integration repository
    integrationRepository = new IntegrationRepository({
      query: () => Promise.resolve([]),
      one: () => Promise.resolve(null),
      none: () => Promise.resolve(),
      result: () => Promise.resolve({ rows: [] })
    });

    // Initialize integration controller
    integrationController = new IntegrationController({
      integrationSystem,
      repository: integrationRepository,
      logger: console
    });

    // Mount integration routes
    app.use('/api/integration', integrationController.getRouter());
  });

  after(async () => {
    await integrationSystem.cleanup();
  });

  describe('System Management Endpoints', () => {
    it('should initialize integration system', async () => {
      const response = await request(app)
        .post('/api/integration/initialize')
        .send({
          handler: { enableValidation: true },
          steps: { enableTemplates: true },
          validator: { strictMode: false },
          metrics: { enableCollection: true },
          testRunner: { parallelExecution: true }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('initialized successfully');
      expect(response.body.result).to.be.an('object');
      expect(response.body.result.components).to.be.an('object');
    });

    it('should get system status', async () => {
      const response = await request(app)
        .get('/api/integration/status')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.status).to.be.an('object');
      expect(response.body.metrics).to.be.an('object');
    });

    it('should cleanup integration system', async () => {
      const response = await request(app)
        .post('/api/integration/cleanup')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('cleaned up successfully');
    });
  });

  describe('Integration Execution Endpoints', () => {
    beforeEach(async () => {
      // Re-initialize system before each test
      await integrationSystem.initialize();
    });

    it('should execute general integration', async () => {
      const response = await request(app)
        .post('/api/integration/execute')
        .send({
          request: {
            type: 'analyze',
            subType: 'architecture',
            projectId: 'test-project',
            options: { depth: 'comprehensive' }
          },
          options: {
            timeout: 30000,
            retryAttempts: 3
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.result).to.be.an('object');
    });

    it('should execute workflow integration', async () => {
      const response = await request(app)
        .post('/api/integration/execute/workflow')
        .send({
          workflow: {
            steps: [
              { type: 'analysis', options: { type: 'architecture' } },
              { type: 'testing', options: { type: 'unit' } }
            ],
            projectId: 'test-project'
          },
          options: {
            parallel: false,
            timeout: 60000
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.result).to.be.an('object');
    });

    it('should execute handler integration', async () => {
      const response = await request(app)
        .post('/api/integration/execute/handler')
        .send({
          handler: {
            type: 'analyze',
            subType: 'code-quality',
            projectId: 'test-project'
          },
          options: {
            validateInput: true,
            collectMetrics: true
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.result).to.be.an('object');
    });

    it('should execute step integration', async () => {
      const response = await request(app)
        .post('/api/integration/execute/step')
        .send({
          step: {
            type: 'analysis',
            options: {
              type: 'architecture',
              projectId: 'test-project'
            }
          },
          options: {
            validateStep: true,
            collectMetrics: true
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.result).to.be.an('object');
    });

    it('should execute system integration', async () => {
      const response = await request(app)
        .post('/api/integration/execute/system')
        .send({
          system: {
            components: ['handlers', 'steps', 'validators'],
            projectId: 'test-project'
          },
          options: {
            comprehensive: true,
            timeout: 120000
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.result).to.be.an('object');
    });
  });

  describe('Test Execution Endpoints', () => {
    beforeEach(async () => {
      await integrationSystem.initialize();
    });

    it('should run all tests', async () => {
      const response = await request(app)
        .post('/api/integration/tests/run')
        .send({
          testConfig: {
            includeSystem: true,
            includeHandlers: true,
            includePerformance: true,
            includeE2E: true,
            parallel: true,
            timeout: 300000
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.result).to.be.an('object');
      expect(response.body.result.testId).to.be.a('string');
    });

    it('should run system tests', async () => {
      const response = await request(app)
        .post('/api/integration/tests/system')
        .send({
          systemConfig: {
            testComponents: ['handlers', 'steps', 'validators'],
            validateIntegration: true,
            timeout: 60000
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.result).to.be.an('object');
    });

    it('should run handler tests', async () => {
      const response = await request(app)
        .post('/api/integration/tests/handlers')
        .send({
          handlerConfig: {
            testTypes: ['analyze', 'generate', 'refactor', 'vibecoder'],
            validateMetadata: true,
            testErrorHandling: true,
            timeout: 30000
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.result).to.be.an('object');
    });

    it('should run performance tests', async () => {
      const response = await request(app)
        .post('/api/integration/tests/performance')
        .send({
          performanceConfig: {
            concurrentRequests: 10,
            duration: 30000,
            testScenarios: ['handler-execution', 'step-execution', 'system-integration'],
            collectMetrics: true
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.result).to.be.an('object');
    });

    it('should run end-to-end tests', async () => {
      const response = await request(app)
        .post('/api/integration/tests/e2e')
        .send({
          e2eConfig: {
            testScenarios: ['complete-workflow', 'error-recovery', 'performance-stress'],
            projectId: 'test-project',
            validateResults: true,
            timeout: 180000
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.result).to.be.an('object');
    });

    it('should get test results by ID', async () => {
      // First run a test to get a test ID
      const testResponse = await request(app)
        .post('/api/integration/tests/system')
        .send({
          systemConfig: { testComponents: ['handlers'], timeout: 10000 }
        });

      const testId = testResponse.body.result.testId;

      const response = await request(app)
        .get(`/api/integration/tests/results/${testId}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.result).to.be.an('object');
      expect(response.body.result.testId).to.equal(testId);
    });

    it('should get all test results', async () => {
      const response = await request(app)
        .get('/api/integration/tests/results')
        .query({
          limit: 10,
          offset: 0,
          status: 'completed'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.results).to.be.an('array');
    });
  });

  describe('Metrics Endpoints', () => {
    beforeEach(async () => {
      await integrationSystem.initialize();
    });

    it('should get general metrics', async () => {
      const response = await request(app)
        .get('/api/integration/metrics')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.metrics).to.be.an('object');
    });

    it('should get performance metrics', async () => {
      const response = await request(app)
        .get('/api/integration/metrics/performance')
        .query({
          timeRange: '1h',
          includeDetails: true
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.metrics).to.be.an('object');
    });

    it('should get error metrics', async () => {
      const response = await request(app)
        .get('/api/integration/metrics/errors')
        .query({
          timeRange: '24h',
          errorType: 'all'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.metrics).to.be.an('object');
    });

    it('should get health metrics', async () => {
      const response = await request(app)
        .get('/api/integration/metrics/health')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.metrics).to.be.an('object');
    });

    it('should get historical metrics', async () => {
      const response = await request(app)
        .get('/api/integration/metrics/history')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          interval: '1d'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.metrics).to.be.an('object');
    });
  });

  describe('Health Check Endpoints', () => {
    beforeEach(async () => {
      await integrationSystem.initialize();
    });

    it('should get health check status', async () => {
      const response = await request(app)
        .get('/api/integration/health')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.health).to.be.an('object');
      expect(response.body.health.status).to.be.a('string');
    });

    it('should perform health check', async () => {
      const response = await request(app)
        .post('/api/integration/health/check')
        .send({
          checkComponents: ['handlers', 'steps', 'validators'],
          timeout: 30000
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.health).to.be.an('object');
    });
  });

  describe('Report Endpoints', () => {
    beforeEach(async () => {
      await integrationSystem.initialize();
    });

    it('should get available reports', async () => {
      const response = await request(app)
        .get('/api/integration/reports')
        .query({
          type: 'integration',
          limit: 10
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.reports).to.be.an('array');
    });

    it('should generate new report', async () => {
      const response = await request(app)
        .post('/api/integration/reports/generate')
        .send({
          reportConfig: {
            type: 'integration-summary',
            timeRange: '7d',
            includeMetrics: true,
            includeTests: true,
            format: 'json'
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.report).to.be.an('object');
      expect(response.body.report.reportId).to.be.a('string');
    });

    it('should get specific report', async () => {
      // First generate a report
      const generateResponse = await request(app)
        .post('/api/integration/reports/generate')
        .send({
          reportConfig: {
            type: 'integration-summary',
            timeRange: '1d',
            format: 'json'
          }
        });

      const reportId = generateResponse.body.report.reportId;

      const response = await request(app)
        .get(`/api/integration/reports/${reportId}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.report).to.be.an('object');
      expect(response.body.report.reportId).to.equal(reportId);
    });
  });

  describe('Configuration Endpoints', () => {
    beforeEach(async () => {
      await integrationSystem.initialize();
    });

    it('should get current configuration', async () => {
      const response = await request(app)
        .get('/api/integration/config')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.config).to.be.an('object');
    });

    it('should save configuration', async () => {
      const config = {
        handler: { enableValidation: true },
        steps: { enableTemplates: true },
        validator: { strictMode: false },
        metrics: { enableCollection: true },
        testRunner: { parallelExecution: true }
      };

      const response = await request(app)
        .post('/api/integration/config')
        .send({ config })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('saved successfully');
    });

    it('should get configuration by name', async () => {
      const response = await request(app)
        .get('/api/integration/config/default')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.config).to.be.an('object');
    });
  });

  describe('Diagnostics Endpoints', () => {
    beforeEach(async () => {
      await integrationSystem.initialize();
    });

    it('should get diagnostics information', async () => {
      const response = await request(app)
        .get('/api/integration/diagnostics')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.diagnostics).to.be.an('object');
    });

    it('should run diagnostics', async () => {
      const response = await request(app)
        .post('/api/integration/diagnostics/run')
        .send({
          diagnosticsConfig: {
            checkComponents: ['handlers', 'steps', 'validators'],
            validateConnections: true,
            timeout: 60000
          }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.diagnostics).to.be.an('object');
    });
  });

  describe('Data Management Endpoints', () => {
    beforeEach(async () => {
      await integrationSystem.initialize();
    });

    it('should cleanup old data', async () => {
      const response = await request(app)
        .delete('/api/integration/data/cleanup')
        .query({
          olderThan: '30d',
          dataTypes: ['test-results', 'metrics', 'reports']
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('cleaned up successfully');
    });

    it('should get data summary', async () => {
      const response = await request(app)
        .get('/api/integration/data/summary')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.summary).to.be.an('object');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await integrationSystem.initialize();
    });

    it('should handle invalid requests gracefully', async () => {
      const response = await request(app)
        .post('/api/integration/execute')
        .send({
          invalidRequest: true
        })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.be.a('string');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/integration/execute')
        .send({})
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('required');
    });

    it('should handle system errors gracefully', async () => {
      // Test with invalid configuration
      const response = await request(app)
        .post('/api/integration/initialize')
        .send({
          invalidConfig: true
        })
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.be.a('string');
    });
  });
}); 