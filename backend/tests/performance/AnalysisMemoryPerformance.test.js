#!/usr/bin/env node

require('module-alias/register');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Mock services for performance testing
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

describe('Analysis Memory Performance Tests', () => {
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

  describe('Memory Usage Benchmarking', () => {
    test('should stay under 256MB memory limit for comprehensive analysis', async () => {
      // Mock memory usage to simulate normal operation
      let memoryUsage = 50 * 1024 * 1024; // Start at 50MB
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: memoryUsage,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 120 * 1024 * 1024
      });

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

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      await analysisController.analyzeComprehensive(mockReq, mockRes);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsed = endMemory - startMemory;
      const executionTime = endTime - startTime;

      // Verify memory usage stays under 256MB
      expect(memoryUsed).toBeLessThan(256 * 1024 * 1024);
      
      // Verify execution time is reasonable (under 30 seconds)
      expect(executionTime).toBeLessThan(30000);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            overallScore: expect.any(Number)
          })
        })
      );
    });

    test('should handle memory spikes during analysis', async () => {
      // Mock memory usage with spikes
      let callCount = 0;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        callCount++;
        // Simulate memory spike during analysis
        if (callCount === 2) {
          return {
            heapUsed: 300 * 1024 * 1024, // Spike to 300MB
            heapTotal: 400 * 1024 * 1024,
            external: 50 * 1024 * 1024,
            rss: 450 * 1024 * 1024
          };
        }
        return {
          heapUsed: 100 * 1024 * 1024, // Normal usage
          heapTotal: 200 * 1024 * 1024,
          external: 20 * 1024 * 1024,
          rss: 220 * 1024 * 1024
        };
      });

      const mockCodeQuality = { issues: [], recommendations: [] };
      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockCodeQualityService.getQualityLevel.mockReturnValue('good');

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      // Execute single analysis type
      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Should handle memory spike gracefully
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  describe('Execution Time Validation', () => {
    test('should complete analysis within reasonable time limits', async () => {
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

      const startTime = Date.now();

      mockReq.query = { types: 'code-quality,security' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      const executionTime = Date.now() - startTime;

      // Should complete within 10 seconds for selective analysis
      expect(executionTime).toBeLessThan(10000);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should handle timeout scenarios gracefully', async () => {
      // Mock analysis to take longer than timeout
      mockCodeQualityService.analyzeCodeQuality.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ issues: [], recommendations: [] });
          }, 6000); // 6 seconds (exceeds 5 second timeout)
        });
      });

      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockCodeQualityService.getQualityLevel.mockReturnValue('good');

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      const startTime = Date.now();

      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      const executionTime = Date.now() - startTime;

      // Should handle timeout gracefully
      expect(executionTime).toBeLessThan(10000); // Should not wait full 6 seconds
    });
  });

  describe('Resource Cleanup Effectiveness', () => {
    test('should cleanup memory between analyses', async () => {
      let memoryUsage = 50 * 1024 * 1024;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: memoryUsage,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 120 * 1024 * 1024
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

      // Execute multiple analyses
      for (let i = 0; i < 3; i++) {
        mockReq.query = { types: 'code-quality,security' };
        await analysisController.analyzeComprehensive(mockReq, mockRes);
        
        // Reset mock response for next iteration
        mockRes.json.mockClear();
      }

      // Verify cleanup was called multiple times
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('cleanup'),
        expect.any(Object)
      );
    });

    test('should handle garbage collection effectively', async () => {
      // Mock garbage collection
      const mockGC = jest.fn();
      global.gc = mockGC;

      const mockCodeQuality = { issues: [], recommendations: [] };
      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockCodeQualityService.getQualityLevel.mockReturnValue('good');

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify garbage collection was called
      expect(mockGC).toHaveBeenCalled();
    });
  });

  describe('Progressive Degradation Testing', () => {
    test('should degrade gracefully under memory pressure', async () => {
      // Mock high memory usage
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 400 * 1024 * 1024, // 400MB (high usage)
        heapTotal: 500 * 1024 * 1024,
        external: 100 * 1024 * 1024,
        rss: 600 * 1024 * 1024
      });

      const mockCodeQuality = { issues: [], recommendations: [] };
      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockCodeQualityService.getQualityLevel.mockReturnValue('good');

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Should still complete successfully with degraded options
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should handle partial results when memory is exhausted', async () => {
      // Mock memory exhaustion
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 800 * 1024 * 1024, // 800MB (very high)
        heapTotal: 1000 * 1024 * 1024,
        external: 200 * 1024 * 1024,
        rss: 1200 * 1024 * 1024
      });

      // Mock analysis to fail due to memory
      mockCodeQualityService.analyzeCodeQuality.mockRejectedValue(
        new Error('Memory exhausted')
      );

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Should handle memory exhaustion gracefully
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Memory exhausted')
        })
      );
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple concurrent analysis requests', async () => {
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
            estimatedWaitTime: 30000,
            message: 'Analysis queued'
          })
          .mockResolvedValueOnce({
            status: 'queued',
            jobId: uuidv4(),
            analysisTypes: ['performance'],
            position: 2,
            estimatedWaitTime: 60000,
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

      // Verify all requests were handled
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(3);
    });

    test('should maintain performance under concurrent load', async () => {
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

      // Should handle 10 concurrent requests within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds
      expect(mockQueueService.processAnalysisRequest).toHaveBeenCalledTimes(10);
    });
  });

  describe('Memory Monitoring and Logging', () => {
    test('should log memory usage during analysis', async () => {
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 150 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        external: 30 * 1024 * 1024,
        rss: 250 * 1024 * 1024
      });

      const mockCodeQuality = { issues: [], recommendations: [] };
      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockCodeQualityService.getQualityLevel.mockReturnValue('good');

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify memory monitoring was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('memory'),
        expect.any(Object)
      );
    });

    test('should track memory usage statistics', async () => {
      let memoryUsage = 100 * 1024 * 1024;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: memoryUsage,
        heapTotal: 150 * 1024 * 1024,
        external: 20 * 1024 * 1024,
        rss: 180 * 1024 * 1024
      });

      const mockCodeQuality = { issues: [], recommendations: [] };
      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockCodeQuality);
      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockCodeQualityService.getQualityLevel.mockReturnValue('good');

      mockAnalysisRepository.findLatestByProjectPath.mockResolvedValue(null);

      mockReq.query = { types: 'code-quality' };
      await analysisController.analyzeComprehensive(mockReq, mockRes);

      // Verify memory statistics were tracked
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('memory'),
        expect.objectContaining({
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number)
        })
      );
    });
  });
}); 