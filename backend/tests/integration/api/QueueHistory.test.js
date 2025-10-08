/**
 * Queue History API Integration Tests
 * Tests queue history endpoints with strict error handling validation
 */

const request = require('supertest');
const { expect } = require('chai');
const app = require('../../../Application');
const QueueHistoryService = require('../../../domain/services/queue/QueueHistoryService');
const TaskModeDetector = require('../../../domain/services/queue/TaskModeDetector');

describe('Queue History API Integration Tests', () => {
  let authToken;
  let testProjectId = 'test-project-123';
  let testHistoryId;

  before(async () => {
    // Setup test authentication
    authToken = 'test-auth-token';
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { id: 'test-user' };
      next();
    });
  });

  describe('GET /api/projects/:projectId/queue/history', () => {
    it('should return queue history with pagination', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('items');
      expect(response.body.data).to.have.property('pagination');
      expect(response.body.data.pagination).to.have.property('page', 1);
      expect(response.body.data.pagination).to.have.property('limit', 10);
    });

    it('should filter history by workflow type', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'refactoring' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.items).to.be.an('array');
      
      // Verify all items are of the specified type
      response.body.data.items.forEach(item => {
        expect(item.taskMode).to.equal('refactoring');
      });
    });

    it('should filter history by status', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'completed' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.items).to.be.an('array');
      
      // Verify all items have the specified status
      response.body.data.items.forEach(item => {
        expect(item.status).to.equal('completed');
      });
    });

    it('should filter history by date range', async () => {
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-12-31T23:59:59Z';

      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.items).to.be.an('array');
      
      // Verify all items are within the date range
      response.body.data.items.forEach(item => {
        const createdAt = new Date(item.createdAt);
        const start = new Date(startDate);
        const end = new Date(endDate);
        expect(createdAt).to.be.at.least(start);
        expect(createdAt).to.be.at.most(end);
      });
    });

    it('should search history by text', async () => {
      const searchTerm = 'test';

      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: searchTerm })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.items).to.be.an('array');
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 0, limit: 0 })
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Failed to get queue history');
    });

    it('should handle invalid filter parameters', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'invalid_type' })
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Failed to get queue history');
    });
  });

  describe('GET /api/projects/:projectId/queue/history/:historyId', () => {
    it('should return specific history item', async () => {
      // First create a test history item
      const testHistoryData = {
        workflowId: 'test-workflow-123',
        taskMode: 'testing',
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        executionTimeMs: 5000,
        metadata: { test: true },
        stepsData: [{ step: 1, action: 'test' }]
      };

      const historyService = new QueueHistoryService({});
      const createdHistory = await historyService.persistWorkflowHistory(testHistoryData);
      testHistoryId = createdHistory.id;

      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history/${testHistoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.id).to.equal(testHistoryId);
      expect(response.body.data.workflowId).to.equal(testHistoryData.workflowId);
      expect(response.body.data.taskMode).to.equal(testHistoryData.taskMode);
    });

    it('should return 404 for non-existent history item', async () => {
      const nonExistentId = 'non-existent-id';

      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('History item not found');
    });

    it('should handle invalid history ID format', async () => {
      const invalidId = 'invalid-id-format';

      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Failed to get history item');
    });
  });

  describe('DELETE /api/projects/:projectId/queue/history', () => {
    it('should delete old history items based on retention policy', async () => {
      const retentionDays = 30;

      const response = await request(app)
        .delete(`/api/projects/${testProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ retentionDays })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('deletedCount');
      expect(response.body.data).to.have.property('deletedIds');
      expect(response.body.message).to.include('Successfully deleted');
    });

    it('should handle invalid retention days', async () => {
      const invalidRetentionDays = -1;

      const response = await request(app)
        .delete(`/api/projects/${testProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ retentionDays: invalidRetentionDays })
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Failed to delete history items');
    });

    it('should use default retention days when not provided', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).to.be.true;
    });
  });

  describe('GET /api/projects/:projectId/queue/history/export', () => {
    it('should export history to CSV format', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'testing' })
        .expect(200);

      expect(response.headers['content-type']).to.include('text/csv');
      expect(response.headers['content-disposition']).to.include('attachment');
      expect(response.headers['content-disposition']).to.include('queue-history.csv');
      expect(response.text).to.include('ID,Type,Status,Created At,Completed At,Duration (ms),Error Message');
    });

    it('should export filtered history to CSV', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          type: 'testing', 
          status: 'completed',
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-12-31T23:59:59Z'
        })
        .expect(200);

      expect(response.headers['content-type']).to.include('text/csv');
      expect(response.text).to.include('ID,Type,Status,Created At,Completed At,Duration (ms),Error Message');
    });
  });

  describe('GET /api/projects/:projectId/queue/history/statistics', () => {
    it('should return history statistics', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history/statistics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('totalItems');
      expect(response.body.data).to.have.property('completedCount');
      expect(response.body.data).to.have.property('failedCount');
      expect(response.body.data).to.have.property('cancelledCount');
      expect(response.body.data).to.have.property('avgExecutionTime');
      expect(response.body.data).to.have.property('typeDistribution');
      expect(response.body.data).to.have.property('successRate');
    });

    it('should return filtered statistics', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history/statistics`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'testing', status: 'completed' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('totalItems');
      expect(response.body.data).to.have.property('typeDistribution');
    });
  });

  describe('POST /api/projects/:projectId/queue/type-detect', () => {
    it('should detect workflow type from valid workflow data', async () => {
      const workflowData = {
        id: 'test-workflow-456',
        steps: [
          { action: 'refactor_code', parameters: { language: 'javascript' } },
          { action: 'extract_method', parameters: { methodName: 'testMethod' } }
        ]
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/queue/type-detect`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ workflowData })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('type');
      expect(response.body.data).to.have.property('confidence');
      expect(response.body.data).to.have.property('analysis');
      expect(response.body.data.type).to.equal('refactoring');
      expect(response.body.data.confidence).to.be.a('number');
      expect(response.body.data.confidence).to.be.at.least(0);
      expect(response.body.data.confidence).to.be.at.most(1);
    });

    it('should throw error for invalid workflow data', async () => {
      const invalidWorkflowData = {
        id: 'test-workflow-456'
        // Missing steps array
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/queue/type-detect`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ workflowData: invalidWorkflowData })
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Failed to detect workflow type');
    });

    it('should throw error for unknown workflow type', async () => {
      const unknownWorkflowData = {
        id: 'test-workflow-789',
        steps: [
          { action: 'unknown_action_that_does_not_exist' }
        ]
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/queue/type-detect`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ workflowData: unknownWorkflowData })
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Failed to detect workflow type');
    });

    it('should detect testing workflow type', async () => {
      const testingWorkflowData = {
        id: 'test-workflow-testing',
        steps: [
          { action: 'run_tests', parameters: { framework: 'jest' } },
          { action: 'test_coverage', parameters: { threshold: 80 } }
        ]
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/queue/type-detect`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ workflowData: testingWorkflowData })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.type).to.equal('testing');
    });

    it('should detect analysis workflow type', async () => {
      const analysisWorkflowData = {
        id: 'test-workflow-analysis',
        steps: [
          { action: 'analyze_code', parameters: { tool: 'eslint' } },
          { action: 'code_review', parameters: { reviewer: 'ai' } }
        ]
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/queue/type-detect`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ workflowData: analysisWorkflowData })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.type).to.equal('analysis');
    });
  });

  describe('GET /api/projects/:projectId/queue/types', () => {
    it('should return list of all known workflow types', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/types`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('types');
      expect(response.body.data).to.have.property('count');
      expect(response.body.data).to.have.property('detectionMethod');
      expect(response.body.data.types).to.be.an('array');
      expect(response.body.data.count).to.be.a('number');
      expect(response.body.data.detectionMethod).to.equal('strict_no_fallbacks');
      
              // Use central taskModes constants
        const taskModes = require('../../../domain/constants/taskModes');
        const expectedTypes = taskModes.getAllTypes();
      
      expectedTypes.forEach(type => {
        expect(response.body.data.types).to.include(type);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing authentication', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history`)
        .expect(401);

      expect(response.body.success).to.be.false;
    });

    it('should handle invalid project ID', async () => {
      const invalidProjectId = '';

      const response = await request(app)
        .get(`/api/projects/${invalidProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).to.be.false;
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database connection failures
      // For now, we'll test the error response structure
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/queue/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: -1 }) // Invalid page to trigger error
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body).to.have.property('error');
      expect(response.body).to.have.property('message');
    });
  });

  after(async () => {
    // Cleanup test data
    if (testHistoryId) {
      try {
        const historyService = new QueueHistoryService({});
        await historyService.updateHistoryItem(testHistoryId, { status: 'deleted' });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
}); 