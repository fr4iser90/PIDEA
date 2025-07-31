/**
 * Category Routes Integration Tests
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Test all category-based analysis routes and endpoints
 */

const request = require('supertest');
const express = require('express');

// Import test utilities
const { setupTestDatabase, cleanupTestDatabase } = require('../setup');
const { createTestProject, createTestUser } = require('../utils/testHelpers');

// Import application components
const AnalysisApplicationService = require('@application/services/AnalysisApplicationService');
const AnalysisController = require('@presentation/api/AnalysisController');
const WorkflowController = require('@presentation/api/WorkflowController');
const AnalysisRoutes = require('@presentation/api/routes/analysis');

describe('Category Routes Integration', () => {
  let app;
  let testProjectId;
  let testUserId;
  let analysisApplicationService;
  let analysisController;
  let workflowController;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
    
    // Create test data
    testUserId = await createTestUser();
    testProjectId = await createTestProject(testUserId);
    
    // Initialize services
    analysisApplicationService = new AnalysisApplicationService({
      analysisOutputService: null,
      analysisRepository: null,
      projectRepository: null,
      logger: console
    });
    
    analysisController = new AnalysisController(analysisApplicationService);
    workflowController = new WorkflowController({
      analysisApplicationService,
      logger: console
    });
    
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Setup routes
    const analysisRoutes = new AnalysisRoutes(
      workflowController,
      analysisController,
      { authenticate: () => (req, res, next) => next() },
      null
    );
    analysisRoutes.setupRoutes(app);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  // Define all categories and their expected endpoints
  const categories = [
    'security',
    'performance', 
    'architecture',
    'code-quality',
    'tech-stack',
    'dependencies',
    'manifest'
  ];

  const endpoints = [
    'recommendations',
    'issues', 
    'metrics',
    'summary',
    'results'
  ];

  describe('Category Route Structure', () => {
    categories.forEach(category => {
      describe(`${category} category`, () => {
        endpoints.forEach(endpoint => {
          it(`should have ${category}/${endpoint} endpoint`, async () => {
            const response = await request(app)
              .get(`/api/projects/${testProjectId}/analysis/${category}/${endpoint}`)
              .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.category).toBe(category);
            expect(response.body.data.projectId).toBe(testProjectId);
            expect(response.body.data.timestamp).toBeDefined();
          });
        });
      });
    });
  });

  describe('Route Response Format', () => {
    it('should return consistent response format for all categories', async () => {
      const category = 'code-quality';
      const endpoint = 'recommendations';
      
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/${category}/${endpoint}`)
        .expect(200);

      // Check response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('category');
      expect(response.body.data).toHaveProperty('projectId');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('count');
      
      // Check data types
      expect(typeof response.body.success).toBe('boolean');
      expect(typeof response.body.data.category).toBe('string');
      expect(typeof response.body.data.projectId).toBe('string');
      expect(typeof response.body.data.timestamp).toBe('string');
      expect(typeof response.body.data.count).toBe('number');
    });
  });

  describe('Recommendations Endpoint', () => {
    categories.forEach(category => {
      it(`should return recommendations for ${category}`, async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/analysis/${category}/recommendations`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.category).toBe(category);
        expect(Array.isArray(response.body.data.recommendations)).toBe(true);
        expect(response.body.data.count).toBe(response.body.data.recommendations.length);
      });
    });
  });

  describe('Issues Endpoint', () => {
    categories.forEach(category => {
      it(`should return issues for ${category}`, async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/analysis/${category}/issues`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.category).toBe(category);
        expect(Array.isArray(response.body.data.issues)).toBe(true);
        expect(response.body.data.count).toBe(response.body.data.issues.length);
      });
    });
  });

  describe('Metrics Endpoint', () => {
    categories.forEach(category => {
      it(`should return metrics for ${category}`, async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/analysis/${category}/metrics`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.category).toBe(category);
        expect(response.body.data.metrics).toBeDefined();
        expect(typeof response.body.data.metrics).toBe('object');
        
        // Check metrics structure
        expect(response.body.data.metrics).toHaveProperty('totalAnalyses');
        expect(response.body.data.metrics).toHaveProperty('completedAnalyses');
        expect(response.body.data.metrics).toHaveProperty('failedAnalyses');
        expect(response.body.data.metrics).toHaveProperty('lastAnalysis');
        expect(response.body.data.metrics).toHaveProperty('averageDuration');
      });
    });
  });

  describe('Summary Endpoint', () => {
    categories.forEach(category => {
      it(`should return summary for ${category}`, async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/analysis/${category}/summary`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.category).toBe(category);
        expect(response.body.data.summary).toBeDefined();
        expect(typeof response.body.data.summary).toBe('object');
      });
    });
  });

  describe('Results Endpoint', () => {
    categories.forEach(category => {
      it(`should return results for ${category}`, async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/analysis/${category}/results`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.category).toBe(category);
        expect(response.body.data.results).toBeDefined();
        expect(typeof response.body.data.results).toBe('object');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project ID', async () => {
      const response = await request(app)
        .get('/api/projects/invalid-id/analysis/code-quality/recommendations')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle invalid category', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/invalid-category/recommendations`)
        .expect(200); // Should still return empty results

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('invalid-category');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      expect(response.body.data.recommendations.length).toBe(0);
    });

    it('should handle invalid endpoint', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/code-quality/invalid-endpoint`)
        .expect(404);
    });
  });

  describe('Cross-Category Consistency', () => {
    it('should return consistent data structure across all categories', async () => {
      const endpoint = 'recommendations';
      
      for (const category of categories) {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/analysis/${category}/${endpoint}`)
          .expect(200);

        // All categories should have the same response structure
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('category');
        expect(response.body.data).toHaveProperty('projectId');
        expect(response.body.data).toHaveProperty('timestamp');
        expect(response.body.data).toHaveProperty('count');
        expect(response.body.data).toHaveProperty(endpoint);
        
        // Category should match the request
        expect(response.body.data.category).toBe(category);
      }
    });
  });

  describe('Performance Validation', () => {
    it('should respond within reasonable time for all categories', async () => {
      const startTime = Date.now();
      
      for (const category of categories) {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/analysis/${category}/recommendations`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All category requests should complete within 5 seconds
      expect(totalTime).toBeLessThan(5000);
    });
  });
}); 