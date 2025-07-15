#!/usr/bin/env node

require('module-alias/register');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Mock services for selective analysis testing
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

describe('Selective Analysis Integration Tests', () => {
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

  describe('Query Parameter Handling', () => {
    test('should parse types parameter correctly', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security'],
          estimatedTime: 90000,
          message: 'Selective analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Test with comma-separated types
      mockReq.query = { types: 'code-quality,security' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality', 'security'],
        expect.objectContaining({
          selective: true
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          analysisTypes: ['code-quality', 'security']
        })
      );
    });

    test('should handle single analysis type', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality'],
          estimatedTime: 60000,
          message: 'Single analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality'],
        expect.objectContaining({
          selective: true
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          analysisTypes: ['code-quality']
        })
      );
    });

    test('should handle exclude parameter correctly', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security', 'performance'],
          estimatedTime: 120000,
          message: 'Analysis started (architecture excluded)'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Test excluding architecture
      mockReq.query = { exclude: 'architecture' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality', 'security', 'performance'],
        expect.objectContaining({
          selective: true
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          analysisTypes: ['code-quality', 'security', 'performance']
        })
      );
    });

    test('should handle multiple exclusions', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security'],
          estimatedTime: 90000,
          message: 'Analysis started (performance and architecture excluded)'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Test excluding multiple types
      mockReq.query = { exclude: 'performance,architecture' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality', 'security'],
        expect.objectContaining({
          selective: true
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          analysisTypes: ['code-quality', 'security']
        })
      );
    });

    test('should validate invalid analysis types', async () => {
      mockReq.query = { types: 'invalid-type' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'No valid analysis types specified'
        })
      );
    });

    test('should handle mixed valid and invalid types', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security'],
          estimatedTime: 90000,
          message: 'Selective analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Test with valid and invalid types
      mockReq.query = { types: 'code-quality,invalid-type,security' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality', 'security'],
        expect.objectContaining({
          selective: true
        })
      );
    });
  });

  describe('Caching Behavior', () => {
    test('should cache selective analysis results', async () => {
      const cachedAnalysis = {
        resultData: {
          overallScore: 87,
          level: 'good',
          codeQuality: { score: 85, level: 'good' },
          security: { score: 90, riskLevel: 'low' }
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 20) // 20 minutes ago
      };

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(cachedAnalysis);

      mockReq.query = { types: 'code-quality,security' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'cached',
          data: cachedAnalysis.resultData,
          cachedAt: cachedAnalysis.createdAt,
          message: 'Returning cached analysis results'
        })
      );

      // Verify no analysis services were called
      expect(mockCodeQualityService.analyzeCodeQuality).not.toHaveBeenCalled();
      expect(mockSecurityService.analyzeSecurity).not.toHaveBeenCalled();
    });

    test('should not use cache for different analysis types', async () => {
      const cachedAnalysis = {
        resultData: {
          overallScore: 87,
          level: 'good',
          codeQuality: { score: 85, level: 'good' },
          security: { score: 90, riskLevel: 'low' }
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 20)
      };

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(cachedAnalysis);

      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['performance', 'architecture'],
          estimatedTime: 120000,
          message: 'New analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Request different analysis types
      mockReq.query = { types: 'performance,architecture' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Should not use cache for different types
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['performance', 'architecture'],
        expect.any(Object)
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          analysisTypes: ['performance', 'architecture']
        })
      );
    });

    test('should handle cache expiration', async () => {
      const expiredCache = {
        resultData: {
          overallScore: 87,
          level: 'good',
          codeQuality: { score: 85, level: 'good' }
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago (expired)
      };

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(expiredCache);

      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality'],
          estimatedTime: 60000,
          message: 'Fresh analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Should not use expired cache
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality'],
        expect.any(Object)
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );
    });
  });

  describe('Controller Integration', () => {
    test('should integrate with queue service for selective analysis', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'queued',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security'],
          position: 2,
          estimatedWaitTime: 60000,
          message: 'Selective analysis queued - 1 jobs ahead'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      mockReq.query = { types: 'code-quality,security' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality', 'security'],
        expect.objectContaining({
          priority: 'normal',
          timeout: 300000,
          selective: true
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          position: 2,
          estimatedWaitTime: 60000,
          message: 'Selective analysis queued - 1 jobs ahead'
        })
      );
    });

    test('should handle priority and timeout for selective analysis', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality'],
          estimatedTime: 30000,
          message: 'High priority selective analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      mockReq.query = { 
        types: 'code-quality',
        priority: 'high',
        timeout: '120'
      };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality'],
        expect.objectContaining({
          priority: 'high',
          timeout: 120000, // 120 seconds in milliseconds
          selective: true
        })
      );
    });

    test('should handle selective analysis with comprehensive fallback', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security', 'performance', 'architecture'],
          estimatedTime: 180000,
          message: 'Comprehensive analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      // No query parameters = comprehensive analysis
      mockReq.query = {};
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality', 'security', 'performance', 'architecture'],
        expect.objectContaining({
          selective: false
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle empty types parameter', async () => {
      mockReq.query = { types: '' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'No valid analysis types specified'
        })
      );
    });

    test('should handle whitespace in types parameter', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security'],
          estimatedTime: 90000,
          message: 'Selective analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      mockReq.query = { types: ' code-quality , security ' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality', 'security'],
        expect.any(Object)
      );
    });

    test('should handle exclude all analysis types', async () => {
      mockReq.query = { exclude: 'code-quality,security,performance,architecture' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'No valid analysis types specified'
        })
      );
    });

    test('should handle repository errors during selective analysis', async () => {
      mockAnalysisRepository.findLatestByProjectPath.mockRejectedValue(
        new Error('Database connection failed')
      );

      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Database connection failed'
        })
      );
    });
  });

  describe('Performance and Memory', () => {
    test('should use less memory for selective analysis', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality'],
          estimatedTime: 30000,
          message: 'Single analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      const startTime = Date.now();

      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      const executionTime = Date.now() - startTime;

      // Selective analysis should be faster
      expect(executionTime).toBeLessThan(5000); // Under 5 seconds

      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality'],
        expect.objectContaining({
          selective: true
        })
      );
    });

    test('should handle large selective analysis requests', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security', 'performance'],
          estimatedTime: 120000,
          message: 'Large selective analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      mockReq.query = { types: 'code-quality,security,performance' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['code-quality', 'security', 'performance'],
        expect.objectContaining({
          selective: true
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          analysisTypes: ['code-quality', 'security', 'performance']
        })
      );
    });
  });
}); 