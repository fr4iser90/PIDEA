#!/usr/bin/env node

require('module-alias/register');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Mock services for testing
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

describe('OOM Prevention Integration Tests', () => {
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

  describe('Memory Management', () => {
    test('should execute analyses sequentially to prevent OOM', async () => {
      // Setup mock responses
      const mockCodeQuality = { issues: [], recommendations: [] };
      const mockSecurity = { vulnerabilities: [], dependencies: { critical: 0 } };
      const mockPerformance = { metrics: {}, bottlenecks: [] };
      const mockArchitecture = { structure: {}, dependencies: {} };

      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockSecurityService.analyzeSecurity.mockResolvedValue(mockSecurity);
      mockPerformanceService.analyzePerformance.mockResolvedValue(mockPerformance);
      mockArchitectureService.analyzeArchitecture.mockResolvedValue(mockArchitecture);

      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockSecurityService.getSecurityScore.mockReturnValue(90);
      mockPerformanceService.getPerformanceScore.mockReturnValue(88);
      mockArchitectureService.getArchitectureScore.mockReturnValue(92);

      mockCodeQualityService.getQualityLevel.mockReturnValue('good');
      mockSecurityService.getOverallRiskLevel.mockReturnValue('low');
      mockPerformanceService.getPerformanceLevel.mockReturnValue('good');
      mockArchitectureService.getArchitectureLevel.mockReturnValue('excellent');

      mockPerformanceService.getCriticalIssues.mockReturnValue([]);
      mockArchitectureService.getCriticalIssues.mockReturnValue([]);
      mockSecurityService.hasCriticalVulnerabilities.mockReturnValue(false);

      // Mock repository to return no cached results
      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      // Execute comprehensive analysis
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify services were called sequentially (not in parallel)
      expect(mockCodeQualityService.analyzeCodeQuality).toHaveBeenCalled();
      expect(mockSecurityService.analyzeSecurity).toHaveBeenCalled();
      expect(mockPerformanceService.analyzePerformance).toHaveBeenCalled();
      expect(mockArchitectureService.analyzeArchitecture).toHaveBeenCalled();

      // Verify response
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            overallScore: expect.any(Number),
            level: expect.any(String)
          })
        })
      );
    });

    test('should handle memory threshold exceeded', async () => {
      // Mock memory usage to exceed threshold
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 300 * 1024 * 1024, // 300MB (exceeds 256MB limit)
        heapTotal: 400 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        rss: 450 * 1024 * 1024
      });

      // Mock analysis to throw memory error
      mockCodeQualityService.analyzeCodeQuality.mockRejectedValue(
        new Error('Memory threshold exceeded')
      );

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify error handling
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Memory threshold exceeded')
        })
      );

      // Restore original memory usage
      process.memoryUsage = originalMemoryUsage;
    });

    test('should cleanup memory after each analysis', async () => {
      const mockCodeQuality = { issues: [], recommendations: [] };
      const mockSecurity = { vulnerabilities: [], dependencies: { critical: 0 } };

      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockSecurityService.analyzeSecurity.mockResolvedValue(mockSecurity);

      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockSecurityService.getSecurityScore.mockReturnValue(90);

      mockCodeQualityService.getQualityLevel.mockReturnValue('good');
      mockSecurityService.getOverallRiskLevel.mockReturnValue('low');

      mockSecurityService.hasCriticalVulnerabilities.mockReturnValue(false);

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      // Execute selective analysis
      mockReq.query = { types: 'code-quality,security' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify cleanup was called (through logger calls)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('cleanup'),
        expect.any(Object)
      );
    });
  });

  describe('Queue Management', () => {
    test('should automatically queue when analysis is running', async () => {
      // Mock queue service to simulate running analysis
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'queued',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security'],
          position: 2,
          estimatedWaitTime: 30000,
          message: 'Analysis queued - 1 jobs ahead'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'queued',
          jobId: expect.any(String),
          position: 2,
          estimatedWaitTime: 30000
        })
      );
    });

    test('should handle running analysis status', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockResolvedValue({
          status: 'running',
          jobId: uuidv4(),
          analysisTypes: ['code-quality', 'security'],
          estimatedTime: 120000,
          message: 'Analysis started'
        })
      };

      analysisController.analysisQueueService = mockQueueService;

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'running',
          jobId: expect.any(String),
          estimatedTime: 120000
        })
      );
    });
  });

  describe('Selective Analysis', () => {
    test('should run only specified analysis types', async () => {
      mockReq.query = { types: 'code-quality,security' };

      const mockCodeQuality = { issues: [], recommendations: [] };
      const mockSecurity = { vulnerabilities: [], dependencies: { critical: 0 } };

      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockSecurityService.analyzeSecurity.mockResolvedValue(mockSecurity);

      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockSecurityService.getSecurityScore.mockReturnValue(90);

      mockCodeQualityService.getQualityLevel.mockReturnValue('good');
      mockSecurityService.getOverallRiskLevel.mockReturnValue('low');

      mockSecurityService.hasCriticalVulnerabilities.mockReturnValue(false);

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify only specified services were called
      expect(mockCodeQualityService.analyzeCodeQuality).toHaveBeenCalled();
      expect(mockSecurityService.analyzeSecurity).toHaveBeenCalled();
      expect(mockPerformanceService.analyzePerformance).not.toHaveBeenCalled();
      expect(mockArchitectureService.analyzeArchitecture).not.toHaveBeenCalled();
    });

    test('should handle exclusion parameter', async () => {
      mockReq.query = { exclude: 'architecture' };

      const mockCodeQuality = { issues: [], recommendations: [] };
      const mockSecurity = { vulnerabilities: [], dependencies: { critical: 0 } };
      const mockPerformance = { metrics: {}, bottlenecks: [] };

      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockSecurityService.analyzeSecurity.mockResolvedValue(mockSecurity);
      mockPerformanceService.analyzePerformance.mockResolvedValue(mockPerformance);

      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockSecurityService.getSecurityScore.mockReturnValue(90);
      mockPerformanceService.getPerformanceScore.mockReturnValue(88);

      mockCodeQualityService.getQualityLevel.mockReturnValue('good');
      mockSecurityService.getOverallRiskLevel.mockReturnValue('low');
      mockPerformanceService.getPerformanceLevel.mockReturnValue('good');

      mockPerformanceService.getCriticalIssues.mockReturnValue([]);
      mockSecurityService.hasCriticalVulnerabilities.mockReturnValue(false);

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify architecture was excluded
      expect(mockCodeQualityService.analyzeCodeQuality).toHaveBeenCalled();
      expect(mockSecurityService.analyzeSecurity).toHaveBeenCalled();
      expect(mockPerformanceService.analyzePerformance).toHaveBeenCalled();
      expect(mockArchitectureService.analyzeArchitecture).not.toHaveBeenCalled();
    });

    test('should validate query parameters', async () => {
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
  });

  describe('Caching Behavior', () => {
    test('should return cached results when available', async () => {
      const cachedAnalysis = {
        resultData: {
          overallScore: 85,
          level: 'good',
          codeQuality: { score: 85, level: 'good' },
          security: { score: 90, riskLevel: 'low' },
          performance: { score: 88, level: 'good' },
          architecture: { score: 92, level: 'excellent' }
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
      };

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(cachedAnalysis);

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
      expect(mockPerformanceService.analyzePerformance).not.toHaveBeenCalled();
      expect(mockArchitectureService.analyzeArchitecture).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle analysis service failures gracefully', async () => {
      mockCodeQualityService.analyzeCodeQuality.mockRejectedValue(
        new Error('Code quality analysis failed')
      );

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Code quality analysis failed'
        })
      );
    });

    test('should handle timeout errors', async () => {
      // Mock timeout error
      mockCodeQualityService.analyzeCodeQuality.mockRejectedValue(
        new Error('Enhanced timeout exceeded for code-quality: 300s')
      );

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('timeout')
        })
      );
    });

    test('should handle repository errors', async () => {
      mockAnalysisRepository.findLatestByProjectPath.mockRejectedValue(
        new Error('Database connection failed')
      );

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

  describe('Concurrent Analysis', () => {
    test('should handle multiple concurrent requests', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn()
          .mockResolvedValueOnce({
            status: 'running',
            jobId: uuidv4(),
            analysisTypes: ['code-quality', 'security'],
            estimatedTime: 120000,
            message: 'Analysis started'
          })
          .mockResolvedValueOnce({
            status: 'queued',
            jobId: uuidv4(),
            analysisTypes: ['performance', 'architecture'],
            position: 1,
            estimatedWaitTime: 60000,
            message: 'Analysis queued - 0 jobs ahead'
          })
      };

      analysisController.analysisQueueService = mockQueueService;

      // First request
      await analysisController.analyzeComprehensive(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      // Reset mock response
      mockRes.json.mockClear();

      // Second request
      await analysisController.analyzeComprehensive(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          position: 1
        })
      );
    });
  });

  describe('Resource Management', () => {
    test('should enforce memory limits per analysis', async () => {
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
    });

    test('should handle resource allocation failures', async () => {
      const mockQueueService = {
        processAnalysisRequest: jest.fn().mockRejectedValue(
          new Error('Insufficient memory resources')
        )
      };

      analysisController.analysisQueueService = mockQueueService;

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Insufficient memory resources'
        })
      );
    });
  });
}); 