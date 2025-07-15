const request = require('supertest');
const express = require('express');
const ETagService = require('@domain/services/ETagService');
const ETagMiddleware = require('@infrastructure/middleware/ETagMiddleware');

describe('ETag Caching Integration', () => {
  let app;
  let etagService;
  let etagMiddleware;

  beforeEach(() => {
    app = express();
    etagService = new ETagService();
    etagMiddleware = new ETagMiddleware();
  });

  describe('Backend ETag Integration', () => {
    it('should return 304 for unchanged data', async () => {
      // Mock data provider
      const mockData = { test: 'data', timestamp: Date.now() };
      const mockDataProvider = jest.fn().mockResolvedValue(mockData);
      
      // Create test endpoint with ETag middleware
      app.get('/api/test/:projectId', 
        etagMiddleware.createMiddleware(async (req, res) => {
          const { projectId } = req.params;
          const data = await mockDataProvider(projectId);
          const etag = etagService.generateETag(data, 'test-type', projectId);
          return { data, etag };
        }),
        etagMiddleware.setETagHeaders(),
        (req, res) => {
          res.json({ success: true, data: req.responseData || mockData });
        }
      );

      // First request - should return 200 with ETag
      const response1 = await request(app)
        .get('/api/test/project1')
        .expect(200);

      expect(response1.headers.etag).toBeDefined();
      expect(response1.body.success).toBe(true);

      // Second request with If-None-Match - should return 304
      const response2 = await request(app)
        .get('/api/test/project1')
        .set('If-None-Match', response1.headers.etag)
        .expect(304);

      expect(response2.headers.etag).toBe(response1.headers.etag);
      expect(response2.body).toEqual({});
    });

    it('should handle project analyses ETag correctly', async () => {
      const mockAnalyses = [
        { id: '1', type: 'code-quality', projectId: 'project1' },
        { id: '2', type: 'security', projectId: 'project1' }
      ];
      
      const mockAnalysesProvider = jest.fn().mockResolvedValue(mockAnalyses);
      
      app.get('/api/projects/:projectId/analyses',
        etagMiddleware.createMiddleware(async (req, res) => {
          const { projectId } = req.params;
          const data = await mockAnalysesProvider(projectId);
          const etag = etagService.generateETag(data, 'project-analyses', projectId);
          return { data, etag };
        }),
        etagMiddleware.setETagHeaders(),
        (req, res) => {
          res.json({ success: true, data: req.responseData || mockAnalyses });
        }
      );

      // First request
      const response1 = await request(app)
        .get('/api/projects/project1/analyses')
        .expect(200);

      expect(response1.headers.etag).toBeDefined();
      expect(response1.body.data).toHaveLength(2);

      // Second request with ETag - should return 304
      const response2 = await request(app)
        .get('/api/projects/project1/analyses')
        .set('If-None-Match', response1.headers.etag)
        .expect(304);
    });

    it('should handle task management ETag correctly', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', projectId: 'project1' },
        { id: '2', title: 'Task 2', projectId: 'project1' }
      ];
      
      const mockTasksProvider = jest.fn().mockResolvedValue(mockTasks);
      
      app.get('/api/projects/:projectId/tasks',
        etagMiddleware.createMiddleware(async (req, res) => {
          const { projectId } = req.params;
          const data = await mockTasksProvider(projectId);
          const etag = etagService.generateETag(data, 'project-tasks', projectId);
          return { data, etag };
        }),
        etagMiddleware.setETagHeaders(),
        (req, res) => {
          res.json({ success: true, data: req.responseData || mockTasks });
        }
      );

      // First request
      const response1 = await request(app)
        .get('/api/projects/project1/tasks')
        .expect(200);

      expect(response1.headers.etag).toBeDefined();
      expect(response1.body.data).toHaveLength(2);

      // Second request with ETag - should return 304
      const response2 = await request(app)
        .get('/api/projects/project1/tasks')
        .set('If-None-Match', response1.headers.etag)
        .expect(304);
    });

    it('should return 200 for changed data', async () => {
      let mockData = { test: 'data1', timestamp: Date.now() };
      const mockDataProvider = jest.fn().mockImplementation(() => mockData);
      
      app.get('/api/test/:projectId', 
        etagMiddleware.createMiddleware(async (req, res) => {
          const { projectId } = req.params;
          const data = await mockDataProvider(projectId);
          const etag = etagService.generateETag(data, 'test-type', projectId);
          return { data, etag };
        }),
        etagMiddleware.setETagHeaders(),
        (req, res) => {
          res.json({ success: true, data: req.responseData || mockData });
        }
      );

      // First request
      const response1 = await request(app)
        .get('/api/test/project1')
        .expect(200);

      // Change data
      mockData = { test: 'data2', timestamp: Date.now() };

      // Second request with old ETag - should return 200 with new data
      const response2 = await request(app)
        .get('/api/test/project1')
        .set('If-None-Match', response1.headers.etag)
        .expect(200);

      expect(response2.headers.etag).not.toBe(response1.headers.etag);
      expect(response2.body.data.test).toBe('data2');
    });

    it('should handle analysis history ETag correctly', async () => {
      const mockHistory = [
        { id: '1', type: 'code-quality', timestamp: '2024-01-01T12:00:00.000Z' },
        { id: '2', type: 'security', timestamp: '2024-01-01T13:00:00.000Z' }
      ];
      
      const mockHistoryProvider = jest.fn().mockResolvedValue(mockHistory);
      
      app.get('/api/projects/:projectId/analysis/history',
        etagMiddleware.createAnalysisHistoryMiddleware(mockHistoryProvider),
        etagMiddleware.setETagHeaders(),
        (req, res) => {
          res.json({ success: true, data: req.responseData || mockHistory });
        }
      );

      // First request
      const response1 = await request(app)
        .get('/api/projects/project1/analysis/history')
        .expect(200);

      expect(response1.headers.etag).toBeDefined();
      expect(response1.body.data).toHaveLength(2);

      // Second request with ETag - should return 304
      const response2 = await request(app)
        .get('/api/projects/project1/analysis/history')
        .set('If-None-Match', response1.headers.etag)
        .expect(304);
    });

    it('should handle metrics ETag correctly', async () => {
      const mockMetrics = {
        totalAnalyses: 10,
        successRate: 0.8,
        averageDuration: 5000
      };
      
      const mockMetricsProvider = jest.fn().mockResolvedValue(mockMetrics);
      
      app.get('/api/projects/:projectId/analysis/metrics',
        etagMiddleware.createMetricsMiddleware(mockMetricsProvider),
        etagMiddleware.setETagHeaders(),
        (req, res) => {
          res.json({ success: true, data: req.responseData || mockMetrics });
        }
      );

      // First request
      const response1 = await request(app)
        .get('/api/projects/project1/analysis/metrics')
        .expect(200);

      expect(response1.headers.etag).toBeDefined();
      expect(response1.body.data.totalAnalyses).toBe(10);

      // Second request with ETag - should return 304
      const response2 = await request(app)
        .get('/api/projects/project1/analysis/metrics')
        .set('If-None-Match', response1.headers.etag)
        .expect(304);
    });
  });

  describe('Cache Control Headers', () => {
    it('should set proper cache control headers', async () => {
      const mockData = { test: 'data' };
      const mockDataProvider = jest.fn().mockResolvedValue(mockData);
      
      app.get('/api/test/:projectId', 
        etagMiddleware.createMiddleware(async (req, res) => {
          const { projectId } = req.params;
          const data = await mockDataProvider(projectId);
          const etag = etagService.generateETag(data, 'test-type', projectId);
          return { data, etag };
        }),
        etagMiddleware.setETagHeaders({ maxAge: 600, isPublic: true }),
        (req, res) => {
          res.json({ success: true, data: req.responseData || mockData });
        }
      );

      const response = await request(app)
        .get('/api/test/project1')
        .expect(200);

      expect(response.headers.etag).toBeDefined();
      expect(response.headers['cache-control']).toContain('public');
      expect(response.headers['cache-control']).toContain('max-age=600');
      expect(response.headers['cache-control']).toContain('must-revalidate');
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      const mockDataProvider = jest.fn().mockRejectedValue(new Error('Database error'));
      
      app.get('/api/test/:projectId', 
        etagMiddleware.createMiddleware(async (req, res) => {
          const { projectId } = req.params;
          const data = await mockDataProvider(projectId);
          const etag = etagService.generateETag(data, 'test-type', projectId);
          return { data, etag };
        }),
        etagMiddleware.setETagHeaders(),
        (req, res) => {
          res.json({ success: true, data: req.responseData || {} });
        }
      );

      // Should continue with normal request processing on error
      const response = await request(app)
        .get('/api/test/project1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle missing ETag gracefully', async () => {
      const mockData = { test: 'data' };
      const mockDataProvider = jest.fn().mockResolvedValue(mockData);
      
      app.get('/api/test/:projectId', 
        etagMiddleware.createMiddleware(async (req, res) => {
          const { projectId } = req.params;
          const data = await mockDataProvider(projectId);
          // Return data without ETag
          return { data };
        }),
        etagMiddleware.setETagHeaders(),
        (req, res) => {
          res.json({ success: true, data: req.responseData || mockData });
        }
      );

      const response = await request(app)
        .get('/api/test/project1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockData);
    });
  });

  describe('Performance Metrics', () => {
    it('should log performance metrics', async () => {
      const mockData = { test: 'data' };
      const mockDataProvider = jest.fn().mockResolvedValue(mockData);
      
      app.get('/api/test/:projectId', 
        etagMiddleware.logMetrics(),
        etagMiddleware.createMiddleware(async (req, res) => {
          const { projectId } = req.params;
          const data = await mockDataProvider(projectId);
          const etag = etagService.generateETag(data, 'test-type', projectId);
          return { data, etag };
        }),
        etagMiddleware.setETagHeaders(),
        (req, res) => {
          res.json({ success: true, data: req.responseData || mockData });
        }
      );

      const response = await request(app)
        .get('/api/test/project1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Cache Busting', () => {
    it('should ignore ETags when cache busting parameter is present', async () => {
      const mockData = { test: 'data' };
      const mockDataProvider = jest.fn().mockResolvedValue(mockData);
      
      app.get('/api/test/:projectId', 
        etagMiddleware.cacheBust('_t'),
        etagMiddleware.createMiddleware(async (req, res) => {
          const { projectId } = req.params;
          const data = await mockDataProvider(projectId);
          const etag = etagService.generateETag(data, 'test-type', projectId);
          return { data, etag };
        }),
        etagMiddleware.setETagHeaders(),
        (req, res) => {
          res.json({ success: true, data: req.responseData || mockData });
        }
      );

      // First request
      const response1 = await request(app)
        .get('/api/test/project1')
        .expect(200);

      // Second request with cache busting - should return 200 even with ETag
      const response2 = await request(app)
        .get('/api/test/project1?_t=123')
        .set('If-None-Match', response1.headers.etag)
        .expect(200);

      expect(response2.body.success).toBe(true);
    });
  });
}); 