/**
 * System End-to-End Tests
 * 
 * Tests the complete integration system workflow from API request to final result.
 * This includes full system integration, error scenarios, and real-world usage patterns.
 */

const { expect } = require('chai');
const request = require('supertest');
const express = require('express');
const IntegrationController = require('../../../backend/presentation/api/integration');
const { createIntegrationSystem } = require('../../../backend/domain/workflows/integration');
const IntegrationRepository = require('../../../backend/infrastructure/database/repositories/IntegrationRepository');

describe('System End-to-End Tests', () => {
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

  describe('Complete Integration Workflow', () => {
    it('should execute complete integration workflow end-to-end', async () => {
      // Step 1: Initialize the system
      const initResponse = await request(app)
        .post('/api/integration/initialize')
        .send({
          handler: { enableValidation: true },
          steps: { enableTemplates: true },
          validator: { strictMode: false },
          metrics: { enableCollection: true },
          testRunner: { parallelExecution: true }
        })
        .expect(200);

      expect(initResponse.body.success).to.be.true;

      // Step 2: Execute a comprehensive integration
      const integrationResponse = await request(app)
        .post('/api/integration/execute')
        .send({
          request: {
            type: 'system',
            components: ['handlers', 'steps', 'validators'],
            projectId: 'e2e-test-project',
            options: {
              comprehensive: true,
              timeout: 60000,
              collectMetrics: true
            }
          }
        })
        .expect(200);

      expect(integrationResponse.body.success).to.be.true;
      expect(integrationResponse.body.result).to.be.an('object');

      // Step 3: Run system tests
      const testResponse = await request(app)
        .post('/api/integration/tests/system')
        .send({
          systemConfig: {
            testComponents: ['handlers', 'steps', 'validators'],
            validateIntegration: true,
            timeout: 30000
          }
        })
        .expect(200);

      expect(testResponse.body.success).to.be.true;
      expect(testResponse.body.result).to.be.an('object');

      // Step 4: Check system status
      const statusResponse = await request(app)
        .get('/api/integration/status')
        .expect(200);

      expect(statusResponse.body.success).to.be.true;
      expect(statusResponse.body.status).to.be.an('object');
      expect(statusResponse.body.metrics).to.be.an('object');

      // Step 5: Generate a report
      const reportResponse = await request(app)
        .post('/api/integration/reports/generate')
        .send({
          reportConfig: {
            type: 'integration-summary',
            timeRange: '1h',
            includeMetrics: true,
            includeTests: true,
            format: 'json'
          }
        })
        .expect(200);

      expect(reportResponse.body.success).to.be.true;
      expect(reportResponse.body.report).to.be.an('object');
      expect(reportResponse.body.report.reportId).to.be.a('string');

      // Step 6: Get the generated report
      const reportId = reportResponse.body.report.reportId;
      const getReportResponse = await request(app)
        .get(`/api/integration/reports/${reportId}`)
        .expect(200);

      expect(getReportResponse.body.success).to.be.true;
      expect(getReportResponse.body.report.reportId).to.equal(reportId);
    });

    it('should handle complete handler integration workflow', async () => {
      // Step 1: Execute handler integration
      const handlerResponse = await request(app)
        .post('/api/integration/execute/handler')
        .send({
          handler: {
            type: 'analyze',
            subType: 'architecture',
            projectId: 'e2e-handler-test'
          },
          options: {
            validateInput: true,
            collectMetrics: true,
            timeout: 30000
          }
        })
        .expect(200);

      expect(handlerResponse.body.success).to.be.true;
      expect(handlerResponse.body.result).to.be.an('object');

      // Step 2: Run handler tests
      const testResponse = await request(app)
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

      expect(testResponse.body.success).to.be.true;
      expect(testResponse.body.result).to.be.an('object');

      // Step 3: Get handler metrics
      const metricsResponse = await request(app)
        .get('/api/integration/metrics')
        .expect(200);

      expect(metricsResponse.body.success).to.be.true;
      expect(metricsResponse.body.metrics).to.be.an('object');
    });

    it('should handle complete step integration workflow', async () => {
      // Step 1: Execute step integration
      const stepResponse = await request(app)
        .post('/api/integration/execute/step')
        .send({
          step: {
            type: 'analysis',
            options: {
              type: 'code-quality',
              projectId: 'e2e-step-test'
            }
          },
          options: {
            validateStep: true,
            collectMetrics: true,
            timeout: 30000
          }
        })
        .expect(200);

      expect(stepResponse.body.success).to.be.true;
      expect(stepResponse.body.result).to.be.an('object');

      // Step 2: Run performance tests
      const perfResponse = await request(app)
        .post('/api/integration/tests/performance')
        .send({
          performanceConfig: {
            concurrentRequests: 5,
            duration: 15000,
            testScenarios: ['step-execution'],
            collectMetrics: true
          }
        })
        .expect(200);

      expect(perfResponse.body.success).to.be.true;
      expect(perfResponse.body.result).to.be.an('object');

      // Step 3: Get performance metrics
      const perfMetricsResponse = await request(app)
        .get('/api/integration/metrics/performance')
        .query({
          timeRange: '1h',
          includeDetails: true
        })
        .expect(200);

      expect(perfMetricsResponse.body.success).to.be.true;
      expect(perfMetricsResponse.body.metrics).to.be.an('object');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle and recover from integration failures', async () => {
      // Step 1: Attempt invalid integration
      const invalidResponse = await request(app)
        .post('/api/integration/execute')
        .send({
          request: {
            type: 'invalid-type',
            projectId: 'error-recovery-test'
          }
        })
        .expect(400);

      expect(invalidResponse.body.success).to.be.false;
      expect(invalidResponse.body.error).to.be.a('string');

      // Step 2: Verify system is still functional
      const statusResponse = await request(app)
        .get('/api/integration/status')
        .expect(200);

      expect(statusResponse.body.success).to.be.true;
      expect(statusResponse.body.status).to.be.an('object');

      // Step 3: Execute valid integration after error
      const validResponse = await request(app)
        .post('/api/integration/execute')
        .send({
          request: {
            type: 'analyze',
            subType: 'architecture',
            projectId: 'error-recovery-test',
            options: { depth: 'basic' }
          }
        })
        .expect(200);

      expect(validResponse.body.success).to.be.true;
      expect(validResponse.body.result).to.be.an('object');
    });

    it('should handle test failures gracefully', async () => {
      // Step 1: Run tests with invalid configuration
      const testResponse = await request(app)
        .post('/api/integration/tests/system')
        .send({
          systemConfig: {
            testComponents: ['invalid-component'],
            timeout: 5000
          }
        })
        .expect(200);

      expect(testResponse.body.success).to.be.true;
      expect(testResponse.body.result).to.be.an('object');

      // Step 2: Verify error metrics are collected
      const errorMetricsResponse = await request(app)
        .get('/api/integration/metrics/errors')
        .query({
          timeRange: '1h',
          errorType: 'all'
        })
        .expect(200);

      expect(errorMetricsResponse.body.success).to.be.true;
      expect(errorMetricsResponse.body.metrics).to.be.an('object');
    });

    it('should maintain system stability during concurrent failures', async () => {
      // Step 1: Execute multiple requests with some failures
      const requests = [
        // Valid request
        {
          request: {
            type: 'analyze',
            subType: 'architecture',
            projectId: 'concurrent-stability-1',
            options: { depth: 'basic' }
          }
        },
        // Invalid request
        {
          request: {
            type: 'invalid-type',
            projectId: 'concurrent-stability-2'
          }
        },
        // Another valid request
        {
          request: {
            type: 'generate',
            subType: 'tests',
            projectId: 'concurrent-stability-3',
            options: { framework: 'jest' }
          }
        }
      ];

      const responses = await Promise.all(
        requests.map(req => 
          request(app)
            .post('/api/integration/execute')
            .send(req)
            .catch(err => ({ status: err.status, body: err.response?.body }))
        )
      );

      expect(responses).to.be.an('array');
      expect(responses.length).to.equal(3);

      // Step 2: Verify system is still functional
      const statusResponse = await request(app)
        .get('/api/integration/status')
        .expect(200);

      expect(statusResponse.body.success).to.be.true;
      expect(statusResponse.body.status).to.be.an('object');
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('should handle typical development workflow', async () => {
      const projectId = 'real-world-workflow';

      // Step 1: Analyze project architecture
      const analysisResponse = await request(app)
        .post('/api/integration/execute')
        .send({
          request: {
            type: 'analyze',
            subType: 'architecture',
            projectId,
            options: { depth: 'comprehensive' }
          }
        })
        .expect(200);

      expect(analysisResponse.body.success).to.be.true;

      // Step 2: Generate tests based on analysis
      const generateResponse = await request(app)
        .post('/api/integration/execute')
        .send({
          request: {
            type: 'generate',
            subType: 'tests',
            projectId,
            options: { 
              framework: 'jest',
              coverage: 80,
              basedOnAnalysis: true
            }
          }
        })
        .expect(200);

      expect(generateResponse.body.success).to.be.true;

      // Step 3: Run tests to validate
      const testResponse = await request(app)
        .post('/api/integration/tests/system')
        .send({
          systemConfig: {
            testComponents: ['handlers'],
            validateIntegration: true,
            timeout: 30000
          }
        })
        .expect(200);

      expect(testResponse.body.success).to.be.true;

      // Step 4: Generate documentation
      const docResponse = await request(app)
        .post('/api/integration/execute')
        .send({
          request: {
            type: 'generate',
            subType: 'documentation',
            projectId,
            options: { 
              format: 'markdown',
              includeArchitecture: true
            }
          }
        })
        .expect(200);

      expect(docResponse.body.success).to.be.true;

      // Step 5: Create comprehensive report
      const reportResponse = await request(app)
        .post('/api/integration/reports/generate')
        .send({
          reportConfig: {
            type: 'development-workflow-summary',
            timeRange: '1h',
            includeMetrics: true,
            includeTests: true,
            includeAnalysis: true,
            format: 'json'
          }
        })
        .expect(200);

      expect(reportResponse.body.success).to.be.true;
      expect(reportResponse.body.report).to.be.an('object');
    });

    it('should handle continuous integration scenario', async () => {
      const projectId = 'ci-scenario';

      // Step 1: Initialize CI environment
      const initResponse = await request(app)
        .post('/api/integration/initialize')
        .send({
          handler: { enableValidation: true },
          steps: { enableTemplates: true },
          validator: { strictMode: true },
          metrics: { enableCollection: true },
          testRunner: { parallelExecution: true }
        })
        .expect(200);

      expect(initResponse.body.success).to.be.true;

      // Step 2: Run comprehensive tests
      const testResponse = await request(app)
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

      expect(testResponse.body.success).to.be.true;
      const testId = testResponse.body.result.testId;

      // Step 3: Check test results
      const resultsResponse = await request(app)
        .get(`/api/integration/tests/results/${testId}`)
        .expect(200);

      expect(resultsResponse.body.success).to.be.true;
      expect(resultsResponse.body.result.testId).to.equal(testId);

      // Step 4: Get health check
      const healthResponse = await request(app)
        .post('/api/integration/health/check')
        .send({
          checkComponents: ['handlers', 'steps', 'validators'],
          timeout: 30000
        })
        .expect(200);

      expect(healthResponse.body.success).to.be.true;
      expect(healthResponse.body.health).to.be.an('object');

      // Step 5: Generate CI report
      const reportResponse = await request(app)
        .post('/api/integration/reports/generate')
        .send({
          reportConfig: {
            type: 'ci-summary',
            timeRange: '1h',
            includeMetrics: true,
            includeTests: true,
            includeHealth: true,
            format: 'json'
          }
        })
        .expect(200);

      expect(reportResponse.body.success).to.be.true;
    });
  });

  describe('Data Management and Cleanup', () => {
    it('should handle data lifecycle management', async () => {
      // Step 1: Create test data
      const testData = Array.from({ length: 5 }, (_, i) => ({
        request: {
          type: 'analyze',
          subType: 'architecture',
          projectId: `data-lifecycle-${i}`,
          options: { depth: 'basic' }
        }
      }));

      await Promise.all(
        testData.map(req => 
          request(app)
            .post('/api/integration/execute')
            .send(req)
        )
      );

      // Step 2: Get data summary
      const summaryResponse = await request(app)
        .get('/api/integration/data/summary')
        .expect(200);

      expect(summaryResponse.body.success).to.be.true;
      expect(summaryResponse.body.summary).to.be.an('object');

      // Step 3: Cleanup old data
      const cleanupResponse = await request(app)
        .delete('/api/integration/data/cleanup')
        .query({
          olderThan: '1h',
          dataTypes: ['test-results', 'metrics', 'reports']
        })
        .expect(200);

      expect(cleanupResponse.body.success).to.be.true;
      expect(cleanupResponse.body.message).to.include('cleaned up successfully');

      // Step 4: Verify cleanup
      const postCleanupSummary = await request(app)
        .get('/api/integration/data/summary')
        .expect(200);

      expect(postCleanupSummary.body.success).to.be.true;
    });

    it('should handle configuration management', async () => {
      // Step 1: Save custom configuration
      const customConfig = {
        handler: { enableValidation: true, maxRetries: 3 },
        steps: { enableTemplates: true, cacheResults: true },
        validator: { strictMode: false, allowWarnings: true },
        metrics: { enableCollection: true, retentionDays: 30 },
        testRunner: { parallelExecution: true, maxConcurrent: 5 }
      };

      const saveResponse = await request(app)
        .post('/api/integration/config')
        .send({ config: customConfig })
        .expect(200);

      expect(saveResponse.body.success).to.be.true;

      // Step 2: Retrieve configuration
      const getResponse = await request(app)
        .get('/api/integration/config')
        .expect(200);

      expect(getResponse.body.success).to.be.true;
      expect(getResponse.body.config).to.be.an('object');

      // Step 3: Get specific configuration
      const specificResponse = await request(app)
        .get('/api/integration/config/default')
        .expect(200);

      expect(specificResponse.body.success).to.be.true;
      expect(specificResponse.body.config).to.be.an('object');
    });
  });

  describe('Monitoring and Observability', () => {
    it('should provide comprehensive monitoring capabilities', async () => {
      // Step 1: Get system diagnostics
      const diagnosticsResponse = await request(app)
        .get('/api/integration/diagnostics')
        .expect(200);

      expect(diagnosticsResponse.body.success).to.be.true;
      expect(diagnosticsResponse.body.diagnostics).to.be.an('object');

      // Step 2: Run diagnostics
      const runDiagnosticsResponse = await request(app)
        .post('/api/integration/diagnostics/run')
        .send({
          diagnosticsConfig: {
            checkComponents: ['handlers', 'steps', 'validators'],
            validateConnections: true,
            timeout: 30000
          }
        })
        .expect(200);

      expect(runDiagnosticsResponse.body.success).to.be.true;
      expect(runDiagnosticsResponse.body.diagnostics).to.be.an('object');

      // Step 3: Get historical metrics
      const historicalResponse = await request(app)
        .get('/api/integration/metrics/history')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          interval: '1d'
        })
        .expect(200);

      expect(historicalResponse.body.success).to.be.true;
      expect(historicalResponse.body.metrics).to.be.an('object');

      // Step 4: Get health metrics
      const healthMetricsResponse = await request(app)
        .get('/api/integration/metrics/health')
        .expect(200);

      expect(healthMetricsResponse.body.success).to.be.true;
      expect(healthMetricsResponse.body.metrics).to.be.an('object');
    });
  });
}); 