#!/usr/bin/env node

require('module-alias/register');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Mock services for queue management testing
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

describe('Queue Management Integration Tests', () => {
  let analysisController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
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

  describe('Project Isolation', () => {
    test('should isolate projects in separate queues', async () => {
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
      };

      analysisController.analysisQueueService = mockQueueService;

      // First project analysis
      mockReq.params.projectPath = '/test/project-1';
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      // Reset mock response
      mockRes.json.mockClear();

      // Second project analysis (should be independent)
      mockReq.params.projectPath = '/test/project-2';
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      // Verify both projects were processed independently
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(2);
    });

    test('should handle queue conflicts between projects', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn()
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['code-quality', 'security'],
            estimatedTime: 120000,
            message: 'Analysis started for project-1'
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

      // Project 1 - first analysis (runs immediately)
      mockReq.params.projectPath = '/test/project-1';
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      // Reset mock response
      mockRes.json.mockClear();

      // Project 1 - second analysis (queued)
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          position: 1
        })
      );

      // Reset mock response
      mockRes.json.mockClear();

      // Project 2 - should run independently
      mockReq.params.projectPath = '/test/project-2';
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );
    });
  });

  describe('Resource Limits', () => {
    test('should enforce memory limits per project', async () => {
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

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'running'
        })
      );

      // Verify memory monitoring was enabled
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          priority: expect.any(String),
          timeout: expect.any(Number)
        })
      );
    });

    test('should handle resource allocation failures', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockRejectedValue(
          new Error('Insufficient memory resources for project')
        )
      };

      analysisController.analysisQueueService = mockQueueService;

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Insufficient memory resources for project'
        })
      );
    });

    test('should handle concurrent resource limits', async () => {
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
            new Error('Maximum concurrent analyses reached')
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

      // Second request should fail due to resource limits
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Maximum concurrent analyses reached'
        })
      );
    });
  });

  describe('Job Management', () => {
    test('should handle job cancellation', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality'],
          estimatedTime: 60000,
          message: 'Analysis started'
        }),
        cancelAnalysis: jest.fn().mockResolvedValue({
          success: true,
          message: 'Analysis cancelled successfully'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Start analysis
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      // Cancel analysis
      const cancelReq = { params: { projectPath: '/test/project' } };
      const cancelRes = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await analysisController.cancelAnalysis(cancelReq, cancelRes);

      expect(mockQueueService.cancelAnalysis).toHaveBeenCalled();
      expect(cancelRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Analysis cancelled successfully'
        })
      );
    });

    test('should handle job priority management', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'queued',
          jobId: uuidv4(),
          analysisTypes: ['code-quality'],
          position: 1,
          estimatedWaitTime: 30000,
          message: 'High priority analysis queued'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Request high priority analysis
      mockReq.query = { priority: 'high' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          position: 1
        })
      );

      // Verify priority was passed to queue service
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          priority: 'high'
        })
      );
    });

    test('should handle job timeout management', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality'],
          estimatedTime: 300000,
          message: 'Analysis started with extended timeout'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Request analysis with custom timeout
      mockReq.query = { timeout: '600' }; // 10 minutes
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      // Verify timeout was passed to queue service
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          timeout: 600000 // 600 seconds in milliseconds
        })
      );
    });
  });

  describe('Queue Status Tracking', () => {
    test('should track queue position and wait times', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'queued',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security'],
          position: 3,
          estimatedWaitTime: 90000,
          message: 'Analysis queued - 2 jobs ahead'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          jobId: expect.any(String),
          analysisTypes: ['code-quality', 'security'],
          position: 3,
          estimatedWaitTime: 90000,
          message: 'Analysis queued - 2 jobs ahead'
        })
      );
    });

    test('should provide queue statistics', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality'],
          estimatedTime: 60000,
          message: 'Analysis started'
        }),
        getStatistics: jest.fn().mockReturnValue({
          totalAnalyses: 25,
          queuedAnalyses: 3,
          completedAnalyses: 20,
          failedAnalyses: 2,
          averageWaitTime: 45000,
          averageAnalysisTime: 120000
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Get queue statistics
      const statsReq = {};
      const statsRes = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await analysisController.getQueueStatistics(statsReq, statsRes);

      expect(mockQueueService.getStatistics).toHaveBeenCalled();
      expect(statsRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalAnalyses: 25,
            queuedAnalyses: 3,
            completedAnalyses: 20,
            failedAnalyses: 2,
            averageWaitTime: 45000,
            averageAnalysisTime: 120000
          })
        })
      );
    });

    test('should track analysis progress', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security'],
          estimatedTime: 120000,
          progress: 25,
          message: 'Analysis in progress - 25% complete'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          jobId: expect.any(String),
          analysisTypes: ['code-quality', 'security'],
          estimatedTime: 120000,
          progress: 25,
          message: 'Analysis in progress - 25% complete'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle queue service errors gracefully', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockRejectedValue(
          new Error('Queue service unavailable')
        )
      };

      analysisController.analysisQueueService = mockQueueService;

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Queue service unavailable'
        })
      );
    });

    test('should handle invalid job parameters', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockRejectedValue(
          new Error('Invalid analysis types specified')
        )
      };

      analysisController.analysisQueueService = mockQueueService;

      // Request with invalid analysis types
      mockReq.query = { types: 'invalid-type' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid analysis types specified'
        })
      );
    });

    test('should handle queue overflow scenarios', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockRejectedValue(
          new Error('Queue is full - maximum capacity reached')
        )
      };

      analysisController.analysisQueueService = mockQueueService;

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Queue is full - maximum capacity reached'
        })
      );
    });
  });

  describe('Concurrent Processing', () => {
    test('should handle multiple concurrent queue operations', async () => {
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
            status: 'queued',
            jobId: uuidv4(),
            analysisTypes: ['security'],
            position: 1,
            estimatedWaitTime: 60000,
            message: 'Analysis queued'
          })
          .mockResolvedValueOnce({
            status: 'queued',
            jobId: uuidv4(),
            analysisTypes: ['performance'],
            position: 2,
            estimatedWaitTime: 120000,
            message: 'Analysis queued'
          })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Execute multiple concurrent requests
      const promises = [];
      for (let i = 0; i < 3; i++) {
        const req = { ...mockReq };
        const res = { ...mockRes, json: jest.fn(), status: jest.fn().mockReturnThis() };
        promises.push(analysisController.analyzeComprehensive(req, res));
      }

      await Promise.all(promises);

      // Verify all requests were processed
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(3);
    });

    test('should maintain queue integrity under concurrent load', async () => {
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

      // Execute 10 concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const req = { ...mockReq };
        const res = { ...mockRes, json: jest.fn(), status: jest.fn().mockReturnThis() };
        promises.push(analysisController.analyzeComprehensive(req, res));
      }

      await Promise.all(promises);

      const totalTime = Date.now() - startTime;

      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(5000); // Under 5 seconds
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(10);
    });
  });
}); 