#!/usr/bin/env node

require('module-alias/register');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Mock services for concurrent analysis E2E testing
const mockCodeQualityService = {
  analyzeCodeQuality: jest.fn(),
  getQualityScore: jest.fn(),
  getQualityLevel: jest.fn()
};

const mockSecurityService = {
  analyzeSecurity: jest.fn(),
  getSecurityScore: jest.fn(),
  getOverallRiskLevel: jest.fn(),
  hasCriticalVulnerabilities: jest.fn()
};

const mockPerformanceService = {
  analyzePerformance: jest.fn(),
  getPerformanceScore: jest.fn(),
  getPerformanceLevel: jest.fn(),
  getCriticalIssues: jest.fn()
};

const mockArchitectureService = {
  analyzeArchitecture: jest.fn(),
  getArchitectureScore: jest.fn(),
  getArchitectureLevel: jest.fn(),
  getCriticalIssues: jest.fn()
};

const mockAnalysisRepository = {
  findLatestByProjectPath: jest.fn(),
  saveAnalysis: jest.fn()
};

const mockAnalysisOutputService = {
  generateMarkdownReport: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Import the controller to test
const AnalysisController = require('@presentation/api/AnalysisController');

describe('Concurrent Analysis E2E Tests', () => {
  let analysisController;
  let mockReq;
  let mockRes;
  let originalMemoryUsage;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Store original memory usage function
    originalMemoryUsage = process.memoryUsage;
    
    // Create controller instance
    analysisController = new AnalysisController(
      mockCodeQualityService,
      mockSecurityService,
      mockPerformanceService,
      mockArchitectureService,
      mockLogger,
      mockAnalysisOutputService,
      mockAnalysisRepository
    );

    // Setup mock request and response
    mockReq = {
      params: { projectPath: '/test/project' },
      query: {},
      body: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    // Restore original memory usage function
    process.memoryUsage = originalMemoryUsage;
  });

  describe('Multiple Project Handling', () => {
    test('should handle multiple projects concurrently', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn()
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['code-quality'],
            estimatedTime: 60000,
            message: 'Analysis started for project-1'
          })
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['security'],
            estimatedTime: 45000,
            message: 'Analysis started for project-2'
          })
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['performance'],
            estimatedTime: 75000,
            message: 'Analysis started for project-3'
          })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Execute analyses for multiple projects concurrently
      const promises = [];
      const responses = [];

      for (let i = 1; i <= 3; i++) {
        const req = { 
          params: { projectPath: `/test/project-${i}` },
          query: { types: i === 1 ? 'code-quality' : i === 2 ? 'security' : 'performance' },
          body: {}
        };
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        
        promises.push(
          analysisController.analyzeComprehensive(req, res)
            .then(() => responses.push(res))
        );
      }

      await Promise.all(promises);

      // Verify all projects were processed
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(3);

      // Verify all responses indicate running status
      responses.forEach(res => {
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'running'
          })
        );
      });
    });

    test('should maintain project isolation under concurrent load', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn()
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['code-quality', 'security'],
            estimatedTime: 120000,
            message: 'Comprehensive analysis started for project-1'
          })
          .mockResolvedValueOnce({
            status: 'queued',
            jobId: uuidv4(),
            analysisTypes: ['performance', 'architecture'],
            position: 1,
            estimatedWaitTime: 120000,
            message: 'Analysis queued for project-1'
          })
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['code-quality'],
            estimatedTime: 60000,
            message: 'Analysis started for project-2'
          })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Project 1 - comprehensive analysis
      const req1 = { 
        params: { projectPath: '/test/project-1' },
        query: {},
        body: {}
      };
      const res1 = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      // Project 1 - second analysis (should be queued)
      const req2 = { 
        params: { projectPath: '/test/project-1' },
        query: { types: 'performance,architecture' },
        body: {}
      };
      const res2 = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      // Project 2 - independent analysis
      const req3 = { 
        params: { projectPath: '/test/project-2' },
        query: { types: 'code-quality' },
        body: {}
      };
      const res3 = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      // Execute all requests concurrently
      await Promise.all([
        analysisController.analyzeComprehensive(req1, res1),
        analysisController.analyzeComprehensive(req2, res2),
        analysisController.analyzeComprehensive(req3, res3)
      ]);

      // Verify project isolation
      expect(res1.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      expect(res2.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          position: 1
        })
      );

      expect(res3.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );
    });
  });

  describe('Global Resource Limits', () => {
    test('should enforce global memory limits across projects', async () => {
      // Mock memory usage to simulate high usage
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 800 * 1024 * 1024, // 800MB (high usage)
        heapTotal: 1000 * 1024 * 1024,
        external: 200 * 1024 * 1024,
        rss: 1200 * 1024 * 1024
      });

      const mockQueueService = {
        processAnalysisRequest: jest.fn()
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['code-quality'],
            estimatedTime: 60000,
            message: 'Analysis started'
          })
          .mockRejectedValueOnce(
            new Error('Global memory limit exceeded')
          )
      };

      analysisController.analysisQueueService = mockQueueService;

      // First request should succeed
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      // Reset mock response
      mockRes.json.mockClear();

      // Second request should fail due to global limits
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Global memory limit exceeded'
        })
      );
    });

    test('should handle global concurrent analysis limits', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn()
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['code-quality'],
            estimatedTime: 60000,
            message: 'Analysis started'
          })
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['security'],
            estimatedTime: 45000,
            message: 'Analysis started'
          })
          .mockRejectedValueOnce(
            new Error('Maximum concurrent analyses reached globally')
          )
      };

      analysisController.analysisQueueService = mockQueueService;

      // Execute multiple requests
      const promises = [];
      const responses = [];

      for (let i = 0; i < 3; i++) {
        const req = { ...mockReq };
        const res = { ...mockRes, json: jest.fn(), status: jest.fn().mockReturnThis() };
        
        promises.push(
          analysisController.analyzeComprehensive(req, res)
            .then(() => responses.push(res))
            .catch(() => responses.push(res))
        );
      }

      await Promise.all(promises);

      // Verify first two succeeded, third failed
      expect(responses[0].json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      expect(responses[1].json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      expect(responses[2].status).toHaveBeenCalledWith(500);
      expect(responses[2].json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Maximum concurrent analyses reached globally'
        })
      );
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain performance with high concurrent load', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality'],
          estimatedTime: 60000,
          message: 'Analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      const startTime = Date.now();

      // Execute 50 concurrent requests
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const req = { 
          params: { projectPath: `/test/project-${i}` },
          query: {},
          body: {}
        };
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        promises.push(analysisController.analyzeComprehensive(req, res));
      }

      await Promise.all(promises);

      const totalTime = Date.now() - startTime;

      // Should handle 50 concurrent requests efficiently
      expect(totalTime).toBeLessThan(10000); // Under 10 seconds
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(50);
    });

    test('should handle mixed analysis types under load', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn()
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['code-quality'],
            estimatedTime: 60000,
            message: 'Code quality analysis started'
          })
          .mockResolvedValueOnce({
            status: 'queued',
            jobId: uuidv4(),
            analysisTypes: ['security'],
            position: 1,
            estimatedWaitTime: 60000,
            message: 'Security analysis queued'
          })
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['performance', 'architecture'],
            estimatedTime: 120000,
            message: 'Comprehensive analysis started'
          })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Execute mixed analysis types
      const requests = [
        { types: 'code-quality' },
        { types: 'security' },
        { types: 'performance,architecture' }
      ];

      const promises = [];
      for (let i = 0; i < requests.length; i++) {
        const req = { 
          params: { projectPath: `/test/project-${i}` },
          query: requests[i],
          body: {}
        };
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        promises.push(analysisController.analyzeComprehensive(req, res));
      }

      await Promise.all(promises);

      // Verify all requests were processed correctly
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(3);
    });
  });

  describe('Memory Usage Monitoring', () => {
    test('should monitor memory usage across concurrent analyses', async () => {
      let callCount = 0;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        callCount++;
        return {
          heapUsed: (200 + callCount * 5) * 1024 * 1024, // Increasing memory usage
          heapTotal: 500 * 1024 * 1024,
          external: 50 * 1024 * 1024,
          rss: 600 * 1024 * 1024
        };
      });

      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality'],
          estimatedTime: 60000,
          message: 'Analysis started with memory monitoring'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Execute multiple concurrent analyses
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const req = { 
          params: { projectPath: `/test/project-${i}` },
          query: {},
          body: {}
        };
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        promises.push(analysisController.analyzeComprehensive(req, res));
      }

      await Promise.all(promises);

      // Verify memory monitoring was active
      expect(process.memoryUsage).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('memory'),
        expect.any(Object)
      );
    });

    test('should handle memory spikes during concurrent analysis', async () => {
      let callCount = 0;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        callCount++;
        // Simulate memory spike during concurrent analysis
        if (callCount === 5) {
          return {
            heapUsed: 600 * 1024 * 1024, // Spike to 600MB
            heapTotal: 800 * 1024 * 1024,
            external: 100 * 1024 * 1024,
            rss: 900 * 1024 * 1024
          };
        }
        return {
          heapUsed: 250 * 1024 * 1024, // Normal usage
          heapTotal: 400 * 1024 * 1024,
          external: 50 * 1024 * 1024,
          rss: 500 * 1024 * 1024
        };
      });

      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality'],
          estimatedTime: 60000,
          message: 'Analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Execute concurrent analyses
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const req = { 
          params: { projectPath: `/test/project-${i}` },
          query: {},
          body: {}
        };
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        promises.push(analysisController.analyzeComprehensive(req, res));
      }

      await Promise.all(promises);

      // Should handle memory spike gracefully
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(10);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle partial failures during concurrent analysis', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn()
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['code-quality'],
            estimatedTime: 60000,
            message: 'Analysis started'
          })
          .mockRejectedValueOnce(
            new Error('Analysis service unavailable')
          )
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['security'],
            estimatedTime: 45000,
            message: 'Analysis started'
          })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Execute concurrent analyses with one failure
      const promises = [];
      const responses = [];

      for (let i = 0; i < 3; i++) {
        const req = { ...mockReq };
        const res = { ...mockRes, json: jest.fn(), status: jest.fn().mockReturnThis() };
        
        promises.push(
          analysisController.analyzeComprehensive(req, res)
            .then(() => responses.push(res))
            .catch(() => responses.push(res))
        );
      }

      await Promise.all(promises);

      // Verify successful and failed responses
      expect(responses[0].json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      expect(responses[1].status).toHaveBeenCalledWith(500);
      expect(responses[1].json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Analysis service unavailable'
        })
      );

      expect(responses[2].json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );
    });

    test('should handle timeout scenarios in concurrent analysis', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn()
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['code-quality'],
            estimatedTime: 60000,
            message: 'Analysis started'
          })
          .mockRejectedValueOnce(
            new Error('Enhanced timeout exceeded for security: 300s')
          )
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['performance'],
            estimatedTime: 75000,
            message: 'Analysis started'
          })
      };

      analysisController.analysisQueueService = mockQueueService;

      const startTime = Date.now();

      // Execute concurrent analyses with timeout
      const promises = [];
      for (let i = 0; i < 3; i++) {
        const req = { ...mockReq };
        const res = { ...mockRes, json: jest.fn(), status: jest.fn().mockReturnThis() };
        promises.push(analysisController.analyzeComprehensive(req, res));
      }

      await Promise.all(promises);

      const totalTime = Date.now() - startTime;

      // Should handle timeout gracefully
      expect(totalTime).toBeLessThan(10000); // Should not wait full timeout
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(3);
    });

    test('should recover from queue service failures', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn()
          .mockRejectedValueOnce(
            new Error('Queue service temporarily unavailable')
          )
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['code-quality'],
            estimatedTime: 60000,
            message: 'Analysis started after recovery'
          })
      };

      analysisController.analysisQueueService = mockQueueService;

      // First request should fail
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Queue service temporarily unavailable'
        })
      );

      // Reset mock response
      mockRes.json.mockClear();

      // Second request should succeed after recovery
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          message: 'Analysis started after recovery'
        })
      );
    });
  });
}); 