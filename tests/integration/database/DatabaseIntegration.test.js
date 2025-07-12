/**
 * Database Integration Tests
 * 
 * Tests the integration database operations and repository functionality.
 * This includes CRUD operations, metrics storage, and data management.
 */

const { expect } = require('chai');
const IntegrationRepository = require('../../../backend/infrastructure/database/repositories/IntegrationRepository');
const { createIntegrationSystem } = require('../../../backend/domain/workflows/integration');

describe('Database Integration Tests', () => {
  let integrationRepository;
  let integrationSystem;
  let mockDatabase;

  before(async () => {
    // Create mock database connection
    mockDatabase = {
      query: () => Promise.resolve([]),
      one: () => Promise.resolve(null),
      none: () => Promise.resolve(),
      result: () => Promise.resolve({ rows: [] }),
      tx: (callback) => callback(mockDatabase)
    };

    // Initialize integration repository
    integrationRepository = new IntegrationRepository(mockDatabase);

    // Initialize integration system
    integrationSystem = createIntegrationSystem({
      logger: console,
      eventBus: { emit: () => {}, subscribe: () => {} }
    });

    await integrationSystem.initialize();
  });

  after(async () => {
    await integrationSystem.cleanup();
  });

  describe('Integration Repository Operations', () => {
    beforeEach(() => {
      // Reset mock database for each test
      mockDatabase.query = () => Promise.resolve([]);
      mockDatabase.one = () => Promise.resolve(null);
      mockDatabase.none = () => Promise.resolve();
      mockDatabase.result = () => Promise.resolve({ rows: [] });
    });

    it('should create integration record', async () => {
      const integrationData = {
        type: 'system',
        status: 'running',
        projectId: 'test-project',
        configuration: { testMode: true },
        metrics: { startTime: new Date() }
      };

      mockDatabase.one = () => Promise.resolve({ id: 1, ...integrationData });

      const result = await integrationRepository.createIntegration(integrationData);
      
      expect(result).to.be.an('object');
      expect(result.id).to.equal(1);
      expect(result.type).to.equal('system');
      expect(result.status).to.equal('running');
    });

    it('should get integration by ID', async () => {
      const mockIntegration = {
        id: 1,
        type: 'handler',
        status: 'completed',
        projectId: 'test-project',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDatabase.one = () => Promise.resolve(mockIntegration);

      const result = await integrationRepository.getIntegrationById(1);
      
      expect(result).to.be.an('object');
      expect(result.id).to.equal(1);
      expect(result.type).to.equal('handler');
      expect(result.status).to.equal('completed');
    });

    it('should update integration status', async () => {
      const updateData = {
        status: 'completed',
        metrics: { endTime: new Date(), duration: 5000 }
      };

      mockDatabase.none = () => Promise.resolve();

      const result = await integrationRepository.updateIntegration(1, updateData);
      
      expect(result).to.be.true;
    });

    it('should delete integration record', async () => {
      mockDatabase.none = () => Promise.resolve();

      const result = await integrationRepository.deleteIntegration(1);
      
      expect(result).to.be.true;
    });

    it('should get integrations by project ID', async () => {
      const mockIntegrations = [
        { id: 1, type: 'system', status: 'completed', projectId: 'test-project' },
        { id: 2, type: 'handler', status: 'running', projectId: 'test-project' }
      ];

      mockDatabase.query = () => Promise.resolve(mockIntegrations);

      const result = await integrationRepository.getIntegrationsByProject('test-project');
      
      expect(result).to.be.an('array');
      expect(result.length).to.equal(2);
      expect(result[0].projectId).to.equal('test-project');
      expect(result[1].projectId).to.equal('test-project');
    });

    it('should get integrations by type', async () => {
      const mockIntegrations = [
        { id: 1, type: 'system', status: 'completed' },
        { id: 2, type: 'system', status: 'running' }
      ];

      mockDatabase.query = () => Promise.resolve(mockIntegrations);

      const result = await integrationRepository.getIntegrationsByType('system');
      
      expect(result).to.be.an('array');
      expect(result.length).to.equal(2);
      expect(result[0].type).to.equal('system');
      expect(result[1].type).to.equal('system');
    });

    it('should get integrations by status', async () => {
      const mockIntegrations = [
        { id: 1, type: 'handler', status: 'completed' },
        { id: 2, type: 'system', status: 'completed' }
      ];

      mockDatabase.query = () => Promise.resolve(mockIntegrations);

      const result = await integrationRepository.getIntegrationsByStatus('completed');
      
      expect(result).to.be.an('array');
      expect(result.length).to.equal(2);
      expect(result[0].status).to.equal('completed');
      expect(result[1].status).to.equal('completed');
    });
  });

  describe('Test Results Operations', () => {
    beforeEach(() => {
      mockDatabase.query = () => Promise.resolve([]);
      mockDatabase.one = () => Promise.resolve(null);
      mockDatabase.none = () => Promise.resolve();
      mockDatabase.result = () => Promise.resolve({ rows: [] });
    });

    it('should create test result', async () => {
      const testResultData = {
        testId: 'test-123',
        type: 'system',
        status: 'passed',
        projectId: 'test-project',
        results: { passed: 10, failed: 0, total: 10 },
        metrics: { duration: 5000, memory: 100 }
      };

      mockDatabase.one = () => Promise.resolve({ id: 1, ...testResultData });

      const result = await integrationRepository.createTestResult(testResultData);
      
      expect(result).to.be.an('object');
      expect(result.testId).to.equal('test-123');
      expect(result.status).to.equal('passed');
    });

    it('should get test result by ID', async () => {
      const mockTestResult = {
        id: 1,
        testId: 'test-123',
        type: 'handler',
        status: 'passed',
        projectId: 'test-project',
        created_at: new Date()
      };

      mockDatabase.one = () => Promise.resolve(mockTestResult);

      const result = await integrationRepository.getTestResultById('test-123');
      
      expect(result).to.be.an('object');
      expect(result.testId).to.equal('test-123');
      expect(result.status).to.equal('passed');
    });

    it('should update test result', async () => {
      const updateData = {
        status: 'failed',
        results: { passed: 8, failed: 2, total: 10 },
        error: 'Test timeout'
      };

      mockDatabase.none = () => Promise.resolve();

      const result = await integrationRepository.updateTestResult('test-123', updateData);
      
      expect(result).to.be.true;
    });

    it('should get test results by project', async () => {
      const mockTestResults = [
        { id: 1, testId: 'test-1', status: 'passed', projectId: 'test-project' },
        { id: 2, testId: 'test-2', status: 'failed', projectId: 'test-project' }
      ];

      mockDatabase.query = () => Promise.resolve(mockTestResults);

      const result = await integrationRepository.getTestResultsByProject('test-project');
      
      expect(result).to.be.an('array');
      expect(result.length).to.equal(2);
      expect(result[0].projectId).to.equal('test-project');
      expect(result[1].projectId).to.equal('test-project');
    });

    it('should get test results by type', async () => {
      const mockTestResults = [
        { id: 1, testId: 'test-1', type: 'system', status: 'passed' },
        { id: 2, testId: 'test-2', type: 'system', status: 'failed' }
      ];

      mockDatabase.query = () => Promise.resolve(mockTestResults);

      const result = await integrationRepository.getTestResultsByType('system');
      
      expect(result).to.be.an('array');
      expect(result.length).to.equal(2);
      expect(result[0].type).to.equal('system');
      expect(result[1].type).to.equal('system');
    });
  });

  describe('Metrics Operations', () => {
    beforeEach(() => {
      mockDatabase.query = () => Promise.resolve([]);
      mockDatabase.one = () => Promise.resolve(null);
      mockDatabase.none = () => Promise.resolve();
      mockDatabase.result = () => Promise.resolve({ rows: [] });
    });

    it('should create metrics record', async () => {
      const metricsData = {
        type: 'performance',
        projectId: 'test-project',
        data: { responseTime: 100, throughput: 1000 },
        timestamp: new Date()
      };

      mockDatabase.one = () => Promise.resolve({ id: 1, ...metricsData });

      const result = await integrationRepository.createMetrics(metricsData);
      
      expect(result).to.be.an('object');
      expect(result.type).to.equal('performance');
      expect(result.projectId).to.equal('test-project');
    });

    it('should get metrics by type and time range', async () => {
      const mockMetrics = [
        { id: 1, type: 'performance', data: { responseTime: 100 }, timestamp: new Date() },
        { id: 2, type: 'performance', data: { responseTime: 120 }, timestamp: new Date() }
      ];

      mockDatabase.query = () => Promise.resolve(mockMetrics);

      const result = await integrationRepository.getMetricsByType('performance', {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });
      
      expect(result).to.be.an('array');
      expect(result.length).to.equal(2);
      expect(result[0].type).to.equal('performance');
      expect(result[1].type).to.equal('performance');
    });

    it('should get aggregated metrics', async () => {
      const mockAggregatedMetrics = {
        avgResponseTime: 110,
        maxResponseTime: 150,
        minResponseTime: 80,
        totalRequests: 1000
      };

      mockDatabase.one = () => Promise.resolve(mockAggregatedMetrics);

      const result = await integrationRepository.getAggregatedMetrics('performance', {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        aggregation: 'hourly'
      });
      
      expect(result).to.be.an('object');
      expect(result.avgResponseTime).to.equal(110);
      expect(result.totalRequests).to.equal(1000);
    });
  });

  describe('Report Operations', () => {
    beforeEach(() => {
      mockDatabase.query = () => Promise.resolve([]);
      mockDatabase.one = () => Promise.resolve(null);
      mockDatabase.none = () => Promise.resolve();
      mockDatabase.result = () => Promise.resolve({ rows: [] });
    });

    it('should create report', async () => {
      const reportData = {
        type: 'integration-summary',
        projectId: 'test-project',
        content: { summary: 'Integration successful', details: {} },
        format: 'json',
        generatedAt: new Date()
      };

      mockDatabase.one = () => Promise.resolve({ id: 1, reportId: 'report-123', ...reportData });

      const result = await integrationRepository.createReport(reportData);
      
      expect(result).to.be.an('object');
      expect(result.reportId).to.equal('report-123');
      expect(result.type).to.equal('integration-summary');
    });

    it('should get report by ID', async () => {
      const mockReport = {
        id: 1,
        reportId: 'report-123',
        type: 'integration-summary',
        projectId: 'test-project',
        content: { summary: 'Test report' },
        created_at: new Date()
      };

      mockDatabase.one = () => Promise.resolve(mockReport);

      const result = await integrationRepository.getReportById('report-123');
      
      expect(result).to.be.an('object');
      expect(result.reportId).to.equal('report-123');
      expect(result.type).to.equal('integration-summary');
    });

    it('should get reports by project', async () => {
      const mockReports = [
        { id: 1, reportId: 'report-1', type: 'summary', projectId: 'test-project' },
        { id: 2, reportId: 'report-2', type: 'detailed', projectId: 'test-project' }
      ];

      mockDatabase.query = () => Promise.resolve(mockReports);

      const result = await integrationRepository.getReportsByProject('test-project');
      
      expect(result).to.be.an('array');
      expect(result.length).to.equal(2);
      expect(result[0].projectId).to.equal('test-project');
      expect(result[1].projectId).to.equal('test-project');
    });
  });

  describe('Data Management Operations', () => {
    beforeEach(() => {
      mockDatabase.query = () => Promise.resolve([]);
      mockDatabase.one = () => Promise.resolve(null);
      mockDatabase.none = () => Promise.resolve();
      mockDatabase.result = () => Promise.resolve({ rows: [] });
    });

    it('should cleanup old data', async () => {
      mockDatabase.none = () => Promise.resolve();

      const result = await integrationRepository.cleanupOldData({
        olderThan: '30d',
        dataTypes: ['test-results', 'metrics', 'reports']
      });
      
      expect(result).to.be.true;
    });

    it('should get data summary', async () => {
      const mockSummary = {
        totalIntegrations: 100,
        totalTests: 500,
        totalMetrics: 1000,
        totalReports: 50,
        oldestRecord: '2024-01-01',
        newestRecord: '2024-12-31'
      };

      mockDatabase.one = () => Promise.resolve(mockSummary);

      const result = await integrationRepository.getDataSummary();
      
      expect(result).to.be.an('object');
      expect(result.totalIntegrations).to.equal(100);
      expect(result.totalTests).to.equal(500);
    });

    it('should get storage statistics', async () => {
      const mockStats = {
        tableSizes: {
          integrations: 1024,
          test_results: 2048,
          metrics: 4096,
          reports: 512
        },
        totalSize: 7680
      };

      mockDatabase.one = () => Promise.resolve(mockStats);

      const result = await integrationRepository.getStorageStatistics();
      
      expect(result).to.be.an('object');
      expect(result.tableSizes).to.be.an('object');
      expect(result.totalSize).to.equal(7680);
    });
  });

  describe('Transaction Operations', () => {
    it('should handle database transactions', async () => {
      let transactionExecuted = false;
      
      mockDatabase.tx = (callback) => {
        transactionExecuted = true;
        return callback(mockDatabase);
      };

      mockDatabase.none = () => Promise.resolve();

      const result = await integrationRepository.executeTransaction(async (db) => {
        await db.none('INSERT INTO integrations (type, status) VALUES ($1, $2)', ['test', 'running']);
        await db.none('UPDATE integrations SET status = $1 WHERE type = $2', ['completed', 'test']);
        return true;
      });
      
      expect(transactionExecuted).to.be.true;
      expect(result).to.be.true;
    });

    it('should rollback transaction on error', async () => {
      let rollbackCalled = false;
      
      mockDatabase.tx = (callback) => {
        try {
          return callback(mockDatabase);
        } catch (error) {
          rollbackCalled = true;
          throw error;
        }
      };

      mockDatabase.none = () => Promise.reject(new Error('Database error'));

      try {
        await integrationRepository.executeTransaction(async (db) => {
          await db.none('INSERT INTO integrations (type, status) VALUES ($1, $2)', ['test', 'running']);
          await db.none('INVALID SQL');
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Database error');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDatabase.query = () => Promise.reject(new Error('Connection failed'));

      try {
        await integrationRepository.getIntegrationsByProject('test-project');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Connection failed');
      }
    });

    it('should handle invalid data gracefully', async () => {
      mockDatabase.one = () => Promise.resolve(null);

      const result = await integrationRepository.getIntegrationById(999);
      
      expect(result).to.be.null;
    });

    it('should handle empty result sets', async () => {
      mockDatabase.query = () => Promise.resolve([]);

      const result = await integrationRepository.getIntegrationsByType('nonexistent');
      
      expect(result).to.be.an('array');
      expect(result.length).to.equal(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large result sets efficiently', async () => {
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        type: 'system',
        status: 'completed',
        projectId: 'test-project'
      }));

      mockDatabase.query = () => Promise.resolve(largeResultSet);

      const startTime = Date.now();
      const result = await integrationRepository.getIntegrationsByProject('test-project');
      const endTime = Date.now();

      expect(result).to.be.an('array');
      expect(result.length).to.equal(1000);
      expect(endTime - startTime).to.be.lessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent operations', async () => {
      mockDatabase.one = () => Promise.resolve({ id: 1, type: 'test' });
      mockDatabase.none = () => Promise.resolve();

      const promises = Array.from({ length: 10 }, (_, i) =>
        integrationRepository.createIntegration({
          type: 'concurrent',
          status: 'running',
          projectId: `project-${i}`
        })
      );

      const results = await Promise.all(promises);
      
      expect(results).to.be.an('array');
      expect(results.length).to.equal(10);
      results.forEach(result => {
        expect(result).to.be.an('object');
        expect(result.id).to.equal(1);
      });
    });
  });
}); 