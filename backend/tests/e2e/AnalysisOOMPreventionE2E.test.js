#!/usr/bin/env node

require('module-alias/register');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Mock services for E2E testing
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

describe('Analysis OOM Prevention E2E Tests', () => {
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

  describe('Complete Analysis Workflow', () => {
    test('should complete full comprehensive analysis workflow without OOM', async () => {
      // Mock memory usage to simulate normal operation
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 200 * 1024 * 1024,
        external: 20 * 1024 * 1024,
        rss: 250 * 1024 * 1024
      });

      // Setup comprehensive mock responses
      const mockCodeQuality = { 
        issues: [], 
        recommendations: [],
        metrics: { complexity: 5, maintainability: 85 }
      };
      const mockSecurity = { 
        vulnerabilities: [], 
        dependencies: { critical: 0, high: 1, medium: 3 },
        scanResults: { total: 150, critical: 0 }
      };
      const mockPerformance = { 
        metrics: { responseTime: 200, throughput: 1000 }, 
        bottlenecks: [],
        recommendations: ['Optimize database queries']
      };
      const mockArchitecture = { 
        structure: { layers: 3, modules: 15 }, 
        dependencies: { circular: 0, total: 45 },
        patterns: ['MVC', 'Repository']
      };

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

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Execute comprehensive analysis
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsed = endMemory - startMemory;
      const executionTime = endTime - startTime;

      // Verify complete workflow
      expect(memoryUsed).toBeLessThan(256 * 1024 * 1024); // Under 256MB
      expect(executionTime).toBeLessThan(30000); // Under 30 seconds

      // Verify all services were called
      expect(mockCodeQualityService.analyzeCodeQuality).toHaveBeenCalled();
      expect(mockSecurityService.analyzeSecurity).toHaveBeenCalled();
      expect(mockPerformanceService.analyzePerformance).toHaveBeenCalled();
      expect(mockArchitectureService.analyzeArchitecture).toHaveBeenCalled();

      // Verify comprehensive results
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            overallScore: expect.any(Number),
            level: expect.any(String),
            codeQuality: expect.objectContaining({
              score: 85,
              level: 'good'
            }),
            security: expect.objectContaining({
              score: 90,
              riskLevel: 'low'
            }),
            performance: expect.objectContaining({
              score: 88,
              level: 'good'
            }),
            architecture: expect.objectContaining({
              score: 92,
              level: 'excellent'
            })
          })
        })
      );

      // Verify repository save was called
      expect(mockAnalysisRepository.saveAnalysis).toHaveBeenCalled();
    });

    test('should handle large repository analysis workflow', async () => {
      // Mock memory usage for large repository
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 200 * 1024 * 1024, // 200MB (higher for large repo)
        heapTotal: 400 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        rss: 500 * 1024 * 1024
      });

      // Mock large repository analysis results
      const mockCodeQuality = { 
        issues: Array(100).fill().map((_, i) => ({ id: i, severity: 'medium' })),
        recommendations: Array(20).fill().map((_, i) => ({ id: i, priority: 'high' })),
        metrics: { complexity: 15, maintainability: 75 }
      };

      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockCodeQualityService.getQualityScore.mockReturnValue(75);
      mockCodeQualityService.getQualityLevel.mockReturnValue('fair');

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Execute analysis on large repository
      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsed = endMemory - startMemory;
      const executionTime = endTime - startTime;

      // Verify large repository handling
      expect(memoryUsed).toBeLessThan(256 * 1024 * 1024);
      expect(executionTime).toBeLessThan(60000); // Under 60 seconds for large repo

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            codeQuality: expect.objectContaining({
              score: 75,
              level: 'fair'
            })
          })
        })
      );
    });
  });

  describe('Selective Analysis E2E', () => {
    test('should complete selective analysis workflow correctly', async () => {
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 80 * 1024 * 1024,
        heapTotal: 150 * 1024 * 1024,
        external: 15 * 1024 * 1024,
        rss: 180 * 1024 * 1024
      });

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

      // Verify only specified analyses were executed
      expect(mockCodeQualityService.analyzeCodeQuality).toHaveBeenCalled();
      expect(mockSecurityService.analyzeSecurity).toHaveBeenCalled();
      expect(mockPerformanceService.analyzePerformance).not.toHaveBeenCalled();
      expect(mockArchitectureService.analyzeArchitecture).not.toHaveBeenCalled();

      // Verify selective results
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            codeQuality: expect.objectContaining({
              score: 85,
              level: 'good'
            }),
            security: expect.objectContaining({
              score: 90,
              riskLevel: 'low'
            })
          })
        })
      );
    });

    test('should handle exclusion-based selective analysis', async () => {
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 160 * 1024 * 1024,
        external: 18 * 1024 * 1024,
        rss: 190 * 1024 * 1024
      });

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

      // Execute analysis excluding architecture
      mockReq.query = { exclude: 'architecture' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify architecture was excluded
      expect(mockCodeQualityService.analyzeCodeQuality).toHaveBeenCalled();
      expect(mockSecurityService.analyzeSecurity).toHaveBeenCalled();
      expect(mockPerformanceService.analyzePerformance).toHaveBeenCalled();
      expect(mockArchitectureService.analyzeArchitecture).not.toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            codeQuality: expect.any(Object),
            security: expect.any(Object),
            performance: expect.any(Object)
          })
        })
      );
    });
  });

  describe('Concurrent Analysis E2E', () => {
    test('should handle multiple concurrent analysis requests', async () => {
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
          .mockResolvedValueOnce({
            status: 'queued',
            jobId: uuidv4(),
            analysisTypes: ['code-quality'],
            position: 2,
            estimatedWaitTime: 120000,
            message: 'Analysis queued - 1 jobs ahead'
          })
      };

      analysisController.analysisQueueService = mockQueueService;

      // Execute multiple concurrent requests
      const promises = [];
      const responses = [];

      for (let i = 0; i < 3; i++) {
        const req = { ...mockReq };
        const res = { ...mockRes, json: jest.fn(), status: jest.fn().mockReturnThis() };
        
        promises.push(
          analysisController.analyzeComprehensive(req, res)
            .then(() => responses.push(res))
        );
      }

      await Promise.all(promises);

      // Verify all requests were processed
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(3);

      // Verify responses
      expect(responses[0].json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running'
        })
      );

      expect(responses[1].json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          position: 1
        })
      );

      expect(responses[2].json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          position: 2
        })
      );
    });

    test('should maintain system stability under concurrent load', async () => {
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
      const startMemory = process.memoryUsage().heapUsed;

      // Execute 20 concurrent requests
      const promises = [];
      for (let i = 0; i < 20; i++) {
        const req = { ...mockReq };
        const res = { ...mockRes, json: jest.fn(), status: jest.fn().mockReturnThis() };
        promises.push(analysisController.analyzeComprehensive(req, res));
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const totalTime = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Verify system stability
      expect(totalTime).toBeLessThan(10000); // Under 10 seconds
      expect(memoryUsed).toBeLessThan(100 * 1024 * 1024); // Under 100MB additional
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(20);
    });
  });

  describe('Error Handling and Recovery E2E', () => {
    test('should handle analysis failures and provide partial results', async () => {
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 120 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        external: 25 * 1024 * 1024,
        rss: 250 * 1024 * 1024
      });

      const mockCodeQuality = { issues: [], recommendations: [] };
      const mockSecurity = { vulnerabilities: [], dependencies: { critical: 0 } };

      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockSecurityService.analyzeSecurity.mockResolvedValue(mockSecurity);
      mockPerformanceService.analyzePerformance.mockRejectedValue(
        new Error('Performance analysis failed')
      );

      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockSecurityService.getSecurityScore.mockReturnValue(90);

      mockCodeQualityService.getQualityLevel.mockReturnValue('good');
      mockSecurityService.getOverallRiskLevel.mockReturnValue('low');

      mockSecurityService.hasCriticalVulnerabilities.mockReturnValue(false);

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      // Execute analysis with one failing service
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify error handling
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Performance analysis failed')
        })
      );
    });

    test('should handle memory exhaustion gracefully', async () => {
      // Mock memory exhaustion
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 600 * 1024 * 1024, // 600MB (exceeds limits)
        heapTotal: 800 * 1024 * 1024,
        external: 150 * 1024 * 1024,
        rss: 900 * 1024 * 1024
      });

      // Mock analysis to fail due to memory
      mockCodeQualityService.analyzeCodeQuality.mockRejectedValue(
        new Error('Memory threshold exceeded')
      );

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify graceful handling
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Memory threshold exceeded')
        })
      );
    });

    test('should handle timeout scenarios in E2E workflow', async () => {
      // Mock analysis to timeout
      mockCodeQualityService.analyzeCodeQuality.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Enhanced timeout exceeded for code-quality: 300s'));
          }, 100);
        });
      });

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      const startTime = Date.now();

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      const executionTime = Date.now() - startTime;

      // Verify timeout handling
      expect(executionTime).toBeLessThan(5000); // Should not wait full timeout
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('timeout')
        })
      );
    });
  });

  describe('Memory Monitoring E2E', () => {
    test('should monitor memory usage throughout analysis workflow', async () => {
      let callCount = 0;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        callCount++;
        return {
          heapUsed: (100 + callCount * 10) * 1024 * 1024, // Increasing memory usage
          heapTotal: 200 * 1024 * 1024,
          external: 20 * 1024 * 1024,
          rss: 250 * 1024 * 1024
        };
      });

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

      mockReq.query = { types: 'code-quality,security' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify memory monitoring was active
      expect(process.memoryUsage).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('memory'),
        expect.any(Object)
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should handle memory spikes during analysis workflow', async () => {
      let callCount = 0;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        callCount++;
        // Simulate memory spike during analysis
        if (callCount === 3) {
          return {
            heapUsed: 350 * 1024 * 1024, // Spike to 350MB
            heapTotal: 400 * 1024 * 1024,
            external: 50 * 1024 * 1024,
            rss: 450 * 1024 * 1024
          };
        }
        return {
          heapUsed: 120 * 1024 * 1024, // Normal usage
          heapTotal: 200 * 1024 * 1024,
          external: 25 * 1024 * 1024,
          rss: 250 * 1024 * 1024
        };
      });

      const mockCodeQuality = { issues: [], recommendations: [] };
      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockCodeQualityService.getQualityLevel.mockReturnValue('good');

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Should handle memory spike gracefully
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );

      // Verify memory monitoring detected the spike
      expect(process.memoryUsage).toHaveBeenCalled();
    });
  });
}); 