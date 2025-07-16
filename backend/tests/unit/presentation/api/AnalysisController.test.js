const AnalysisController = require('@presentation/api/AnalysisController');

describe('AnalysisController', () => {
  let controller;
  let mockCodeQualityService;
  let mockSecurityService;
  let mockPerformanceService;
  let mockArchitectureService;
  let mockLogger;
  let mockAnalysisOutputService;
  let mockAnalysisRepository;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Create mock services
    mockCodeQualityService = {
      analyzeCodeQuality: jest.fn(),
      getQualityScore: jest.fn(),
      getQualityLevel: jest.fn()
    };

    mockSecurityService = {
      analyzeSecurity: jest.fn(),
      getSecurityScore: jest.fn(),
      getOverallRiskLevel: jest.fn(),
      hasCriticalVulnerabilities: jest.fn(),
      getVulnerabilitySummary: jest.fn()
    };

    mockPerformanceService = {
      analyzePerformance: jest.fn(),
      getPerformanceScore: jest.fn(),
      getPerformanceLevel: jest.fn(),
      getCriticalIssues: jest.fn(),
      getPerformanceSummary: jest.fn()
    };

    mockArchitectureService = {
      analyzeArchitecture: jest.fn(),
      getArchitectureScore: jest.fn(),
      getArchitectureLevel: jest.fn(),
      isWellStructured: jest.fn(),
      hasCircularDependencies: jest.fn(),
      getArchitectureSummary: jest.fn(),
      getCriticalIssues: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    mockAnalysisOutputService = {
      getAnalysisHistory: jest.fn(),
      getAnalysisFile: jest.fn(),
      generateMarkdownReport: jest.fn()
    };

    mockAnalysisRepository = {
      findByProjectIdAndType: jest.fn(),
      findByProjectId: jest.fn()
    };

    // Create controller instance
    controller = new AnalysisController(
      mockCodeQualityService,
      mockSecurityService,
      mockPerformanceService,
      mockArchitectureService,
      mockLogger,
      mockAnalysisOutputService,
      mockAnalysisRepository
    );

    // Create mock request and response objects
    mockReq = {
      params: {},
      body: {},
      query: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('constructor', () => {
    it('should initialize with all dependencies', () => {
      expect(controller.codeQualityService).toBe(mockCodeQualityService);
      expect(controller.securityService).toBe(mockSecurityService);
      expect(controller.performanceService).toBe(mockPerformanceService);
      expect(controller.architectureService).toBe(mockArchitectureService);
      expect(controller.logger).toBe(mockLogger);
      expect(controller.analysisOutputService).toBe(mockAnalysisOutputService);
      expect(controller.analysisRepository).toBe(mockAnalysisRepository);
    });

    it('should use default logger when not provided', () => {
      const controllerWithoutLogger = new AnalysisController(
        mockCodeQualityService,
        mockSecurityService,
        mockPerformanceService,
        mockArchitectureService
      );
      
      expect(controllerWithoutlogger.infoger).toBeDefined();
      expect(typeof controllerWithoutlogger.infoger.info).toBe('function');
      expect(typeof controllerWithoutlogger.infoger.error).toBe('function');
    });
  });

  describe('analyzeCodeQuality', () => {
    beforeEach(() => {
      mockReq.params = { projectPath: '/test/project' };
      mockReq.body = { includeTests: true };
    });

    it('should analyze code quality successfully', async () => {
      const mockAnalysis = {
        issues: [{ severity: 'high', message: 'Test issue' }],
        recommendations: [{ type: 'refactor', message: 'Test recommendation' }],
        configuration: { maxComplexity: 10 }
      };

      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockAnalysis);
      mockCodeQualityService.getQualityScore.mockReturnValue(85);
      mockCodeQualityService.getQualityLevel.mockReturnValue('good');

      await controller.analyzeCodeQuality(mockReq, mockRes);

      expect(mockCodeQualityService.analyzeCodeQuality).toHaveBeenCalledWith('/test/project', { includeTests: true });
      expect(mockCodeQualityService.getQualityScore).toHaveBeenCalledWith(mockAnalysis);
      expect(mockCodeQualityService.getQualityLevel).toHaveBeenCalledWith(85);
      expect(mockLogger.info).toHaveBeenCalledWith('[AnalysisController] Code quality analysis requested for: /test/project');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          analysis: mockAnalysis,
          score: 85,
          level: 'good',
          summary: {
            overallScore: 85,
            issues: 1,
            recommendations: 1,
            configuration: { maxComplexity: 10 }
          }
        }
      });
    });

    it('should handle empty body options', async () => {
      mockReq.body = undefined;
      const mockAnalysis = { issues: [], recommendations: [], configuration: {} };

      mockCodeQualityService.analyzeCodeQuality.mockResolvedValue(mockAnalysis);
      mockCodeQualityService.getQualityScore.mockReturnValue(90);
      mockCodeQualityService.getQualityLevel.mockReturnValue('excellent');

      await controller.analyzeCodeQuality(mockReq, mockRes);

      expect(mockCodeQualityService.analyzeCodeQuality).toHaveBeenCalledWith('/test/project', {});
    });

    it('should handle analysis errors', async () => {
      const error = new Error('Analysis failed');
      mockCodeQualityService.analyzeCodeQuality.mockRejectedValue(error);

      await controller.analyzeCodeQuality(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('[AnalysisController] Code quality analysis failed:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Analysis failed'
      });
    });
  });

  describe('analyzeSecurity', () => {
    beforeEach(() => {
      mockReq.params = { projectPath: '/test/project' };
      mockReq.body = { scanDependencies: true };
    });

    it('should analyze security successfully', async () => {
      const mockAnalysis = {
        vulnerabilities: [{ severity: 'critical', type: 'sql-injection' }],
        dependencies: { critical: 1, high: 2 }
      };

      mockSecurityService.analyzeSecurity.mockResolvedValue(mockAnalysis);
      mockSecurityService.getSecurityScore.mockReturnValue(75);
      mockSecurityService.getOverallRiskLevel.mockReturnValue('medium');
      mockSecurityService.hasCriticalVulnerabilities.mockReturnValue(true);
      mockSecurityService.getVulnerabilitySummary.mockReturnValue({
        total: 3,
        critical: 1,
        high: 2
      });

      await controller.analyzeSecurity(mockReq, mockRes);

      expect(mockSecurityService.analyzeSecurity).toHaveBeenCalledWith('/test/project', { scanDependencies: true });
      expect(mockSecurityService.getSecurityScore).toHaveBeenCalledWith(mockAnalysis);
      expect(mockSecurityService.getOverallRiskLevel).toHaveBeenCalledWith(mockAnalysis);
      expect(mockSecurityService.hasCriticalVulnerabilities).toHaveBeenCalledWith(mockAnalysis);
      expect(mockSecurityService.getVulnerabilitySummary).toHaveBeenCalledWith(mockAnalysis);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          analysis: mockAnalysis,
          score: 75,
          riskLevel: 'medium',
          hasCriticalVulnerabilities: true,
          summary: { total: 3, critical: 1, high: 2 }
        }
      });
    });

    it('should handle security analysis errors', async () => {
      const error = new Error('Security scan failed');
      mockSecurityService.analyzeSecurity.mockRejectedValue(error);

      await controller.analyzeSecurity(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('[AnalysisController] Security analysis failed:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Security scan failed'
      });
    });
  });

  describe('analyzePerformance', () => {
    beforeEach(() => {
      mockReq.params = { projectPath: '/test/project' };
      mockReq.body = { includeMetrics: true };
    });

    it('should analyze performance successfully', async () => {
      const mockAnalysis = {
        metrics: { responseTime: 200, throughput: 1000 },
        bottlenecks: [{ location: 'database', impact: 'high' }]
      };

      mockPerformanceService.analyzePerformance.mockResolvedValue(mockAnalysis);
      mockPerformanceService.getPerformanceScore.mockReturnValue(88);
      mockPerformanceService.getPerformanceLevel.mockReturnValue('good');
      mockPerformanceService.getCriticalIssues.mockReturnValue([
        { type: 'slow-query', severity: 'critical' }
      ]);
      mockPerformanceService.getPerformanceSummary.mockReturnValue({
        overallScore: 88,
        criticalIssues: 1,
        recommendations: 3
      });

      await controller.analyzePerformance(mockReq, mockRes);

      expect(mockPerformanceService.analyzePerformance).toHaveBeenCalledWith('/test/project', { includeMetrics: true });
      expect(mockPerformanceService.getPerformanceScore).toHaveBeenCalledWith(mockAnalysis);
      expect(mockPerformanceService.getPerformanceLevel).toHaveBeenCalledWith(88);
      expect(mockPerformanceService.getCriticalIssues).toHaveBeenCalledWith(mockAnalysis);
      expect(mockPerformanceService.getPerformanceSummary).toHaveBeenCalledWith(mockAnalysis);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          analysis: mockAnalysis,
          score: 88,
          level: 'good',
          criticalIssues: [{ type: 'slow-query', severity: 'critical' }],
          summary: { overallScore: 88, criticalIssues: 1, recommendations: 3 }
        }
      });
    });

    it('should handle performance analysis errors', async () => {
      const error = new Error('Performance analysis failed');
      mockPerformanceService.analyzePerformance.mockRejectedValue(error);

      await controller.analyzePerformance(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('[AnalysisController] Performance analysis failed:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Performance analysis failed'
      });
    });
  });

  describe('analyzeArchitecture', () => {
    beforeEach(() => {
      mockReq.params = { projectPath: '/test/project' };
      mockReq.body = { includeDependencies: true };
    });

    it('should analyze architecture successfully', async () => {
      const mockAnalysis = {
        structure: { layers: 3, modules: 10 },
        dependencies: { circular: false, count: 25 }
      };

      mockArchitectureService.analyzeArchitecture.mockResolvedValue(mockAnalysis);
      mockArchitectureService.getArchitectureScore.mockReturnValue(92);
      mockArchitectureService.getArchitectureLevel.mockReturnValue('excellent');
      mockArchitectureService.isWellStructured.mockReturnValue(true);
      mockArchitectureService.hasCircularDependencies.mockReturnValue(false);
      mockArchitectureService.getArchitectureSummary.mockReturnValue({
        overallScore: 92,
        structure: 'excellent',
        dependencies: 'clean'
      });

      await controller.analyzeArchitecture(mockReq, mockRes);

      expect(mockArchitectureService.analyzeArchitecture).toHaveBeenCalledWith('/test/project', { includeDependencies: true });
      expect(mockArchitectureService.getArchitectureScore).toHaveBeenCalledWith(mockAnalysis);
      expect(mockArchitectureService.getArchitectureLevel).toHaveBeenCalledWith(92);
      expect(mockArchitectureService.isWellStructured).toHaveBeenCalledWith(mockAnalysis);
      expect(mockArchitectureService.hasCircularDependencies).toHaveBeenCalledWith(mockAnalysis);
      expect(mockArchitectureService.getArchitectureSummary).toHaveBeenCalledWith(mockAnalysis);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          analysis: mockAnalysis,
          score: 92,
          level: 'excellent',
          isWellStructured: true,
          hasCircularDependencies: false,
          summary: { overallScore: 92, structure: 'excellent', dependencies: 'clean' }
        }
      });
    });

    it('should handle architecture analysis errors', async () => {
      const error = new Error('Architecture analysis failed');
      mockArchitectureService.analyzeArchitecture.mockRejectedValue(error);

      await controller.analyzeArchitecture(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('[AnalysisController] Architecture analysis failed:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Architecture analysis failed'
      });
    });
  });

  describe('analyzeComprehensive', () => {
    beforeEach(() => {
      mockReq.params = { projectPath: '/test/project' };
      mockReq.body = { comprehensive: true };
    });

    it('should perform comprehensive analysis successfully', async () => {
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

      await controller.analyzeComprehensive(mockReq, mockRes);

      // Verify all services were called
      expect(mockCodeQualityService.analyzeCodeQuality).toHaveBeenCalledWith('/test/project', { comprehensive: true });
      expect(mockSecurityService.analyzeSecurity).toHaveBeenCalledWith('/test/project', { comprehensive: true });
      expect(mockPerformanceService.analyzePerformance).toHaveBeenCalledWith('/test/project', { comprehensive: true });
      expect(mockArchitectureService.analyzeArchitecture).toHaveBeenCalledWith('/test/project', { comprehensive: true });

      // Verify response structure
      const responseCall = mockRes.json.mock.calls[0][0];
      expect(responseCall.success).toBe(true);
      expect(responseCall.data.comprehensive.overallScore).toBe(89); // (85*0.25 + 90*0.30 + 88*0.25 + 92*0.20)
      expect(responseCall.data.comprehensive.level).toBe('good');
      expect(responseCall.data.comprehensive.criticalIssues).toEqual([]);
      expect(responseCall.data.comprehensive.timestamp).toBeInstanceOf(Date);
    });

    it('should handle critical vulnerabilities in comprehensive analysis', async () => {
      const mockCodeQuality = { issues: [], recommendations: [] };
      const mockSecurity = { vulnerabilities: [], dependencies: { critical: 2 } };
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
      mockSecurityService.hasCriticalVulnerabilities.mockReturnValue(true);

      await controller.analyzeComprehensive(mockReq, mockRes);

      const responseCall = mockRes.json.mock.calls[0][0];
      expect(responseCall.data.comprehensive.criticalIssues).toContainEqual({
        type: 'security-vulnerabilities',
        severity: 'critical',
        description: 'Critical security vulnerabilities detected',
        value: 2
      });
    });

    it('should handle comprehensive analysis errors', async () => {
      const error = new Error('Comprehensive analysis failed');
      mockCodeQualityService.analyzeCodeQuality.mockRejectedValue(error);

      await controller.analyzeComprehensive(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('[AnalysisController] Comprehensive analysis failed:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comprehensive analysis failed'
      });
    });
  });

  describe('getAnalysisStatus', () => {
    it('should return analysis status successfully', async () => {
      mockReq.params = { projectPath: '/test/project' };

      await controller.getAnalysisStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          projectPath: '/test/project',
          availableAnalyses: [
            'code-quality',
            'security',
            'performance',
            'architecture',
            'comprehensive'
          ],
          status: 'ready'
        }
      });
    });


  });

  describe('getAnalysisHistory', () => {
    it('should get analysis history successfully', async () => {
      mockReq.params = { projectId: 'project-123' };
      const mockHistory = [
        { id: 1, type: 'code-quality', timestamp: new Date() },
        { id: 2, type: 'security', timestamp: new Date() }
      ];

      mockAnalysisOutputService.getAnalysisHistory.mockResolvedValue(mockHistory);

      await controller.getAnalysisHistory(mockReq, mockRes);

      expect(mockAnalysisOutputService.getAnalysisHistory).toHaveBeenCalledWith('project-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory
      });
    });

    it('should handle get analysis history errors', async () => {
      mockReq.params = { projectId: 'project-123' };
      const error = new Error('History retrieval failed');
      mockAnalysisOutputService.getAnalysisHistory.mockRejectedValue(error);

      await controller.getAnalysisHistory(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('[AnalysisController] Failed to get analysis history:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'History retrieval failed'
      });
    });
  });

  describe('getAnalysisFile', () => {
    it('should get analysis file successfully', async () => {
      mockReq.params = { projectId: 'project-123', filename: 'report.md' };
      const mockContent = '# Analysis Report\n\nThis is a test report.';

      mockAnalysisOutputService.getAnalysisFile.mockResolvedValue(mockContent);

      await controller.getAnalysisFile(mockReq, mockRes);

      expect(mockAnalysisOutputService.getAnalysisFile).toHaveBeenCalledWith('project-123', 'report.md');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockContent
      });
    });

    it('should handle get analysis file errors with 404 status', async () => {
      mockReq.params = { projectId: 'project-123', filename: 'nonexistent.md' };
      const error = new Error('File not found');
      mockAnalysisOutputService.getAnalysisFile.mockRejectedValue(error);

      await controller.getAnalysisFile(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('[AnalysisController] Failed to get analysis file:', error);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'File not found'
      });
    });
  });

  describe('getAnalysisFromDatabase', () => {
    it('should get analysis by project ID and type', async () => {
      mockReq.params = { projectId: 'project-123' };
      mockReq.query = { type: 'code-quality' };
      const mockAnalyses = [
        { id: 1, type: 'code-quality', score: 85 }
      ];

      mockAnalysisRepository.findByProjectIdAndType.mockResolvedValue(mockAnalyses);

      await controller.getAnalysisFromDatabase(mockReq, mockRes);

      expect(mockAnalysisRepository.findByProjectIdAndType).toHaveBeenCalledWith('project-123', 'code-quality');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalyses
      });
    });

    it('should get all analyses by project ID when no type specified', async () => {
      mockReq.params = { projectId: 'project-123' };
      mockReq.query = {};
      const mockAnalyses = [
        { id: 1, type: 'code-quality', score: 85 },
        { id: 2, type: 'security', score: 90 }
      ];

      mockAnalysisRepository.findByProjectId.mockResolvedValue(mockAnalyses);

      await controller.getAnalysisFromDatabase(mockReq, mockRes);

      expect(mockAnalysisRepository.findByProjectId).toHaveBeenCalledWith('project-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalyses
      });
    });

    it('should handle get analysis from database errors', async () => {
      mockReq.params = { projectId: 'project-123' };
      mockReq.query = { type: 'code-quality' };
      const error = new Error('Database query failed');
      mockAnalysisRepository.findByProjectIdAndType.mockRejectedValue(error);

      await controller.getAnalysisFromDatabase(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('[AnalysisController] Failed to get analysis from database:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database query failed'
      });
    });
  });

  describe('generateComprehensiveReport', () => {
    it('should generate comprehensive report successfully', async () => {
      mockReq.params = { projectId: 'project-123' };
      const mockAnalyses = [
        { analysisType: 'code-quality', timestamp: new Date('2023-01-01'), score: 85 },
        { analysisType: 'code-quality', timestamp: new Date('2023-01-02'), score: 88 },
        { analysisType: 'security', timestamp: new Date('2023-01-01'), score: 90 }
      ];

      const mockReportResult = {
        filename: 'comprehensive-report.md',
        filepath: '/reports/project-123/comprehensive-report.md'
      };

      mockAnalysisRepository.findByProjectId.mockResolvedValue(mockAnalyses);
      mockAnalysisOutputService.generateMarkdownReport.mockResolvedValue(mockReportResult);

      await controller.generateComprehensiveReport(mockReq, mockRes);

      expect(mockAnalysisRepository.findByProjectId).toHaveBeenCalledWith('project-123');
      expect(mockAnalysisOutputService.generateMarkdownReport).toHaveBeenCalledWith(
        'project-123',
        expect.objectContaining({
          'code-quality': expect.objectContaining({ score: 88 }),
          'security': expect.objectContaining({ score: 90 })
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          reportFile: 'comprehensive-report.md',
          reportPath: '/reports/project-123/comprehensive-report.md',
          analyses: ['code-quality', 'security']
        }
      });
    });

    it('should handle generate comprehensive report errors', async () => {
      mockReq.params = { projectId: 'project-123' };
      const error = new Error('Report generation failed');
      mockAnalysisRepository.findByProjectId.mockRejectedValue(error);

      await controller.generateComprehensiveReport(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('[AnalysisController] Failed to generate comprehensive report:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Report generation failed'
      });
    });
  });

  describe('getOverallLevel', () => {
    it('should return excellent for score >= 90', () => {
      expect(controller.getOverallLevel(95)).toBe('excellent');
      expect(controller.getOverallLevel(90)).toBe('excellent');
    });

    it('should return good for score >= 80 and < 90', () => {
      expect(controller.getOverallLevel(85)).toBe('good');
      expect(controller.getOverallLevel(80)).toBe('good');
    });

    it('should return fair for score >= 70 and < 80', () => {
      expect(controller.getOverallLevel(75)).toBe('fair');
      expect(controller.getOverallLevel(70)).toBe('fair');
    });

    it('should return poor for score >= 60 and < 70', () => {
      expect(controller.getOverallLevel(65)).toBe('poor');
      expect(controller.getOverallLevel(60)).toBe('poor');
    });

    it('should return critical for score < 60', () => {
      expect(controller.getOverallLevel(55)).toBe('critical');
      expect(controller.getOverallLevel(0)).toBe('critical');
    });
  });

  describe('analyzeTechStack', () => {
    beforeEach(() => {
      mockReq.params = { projectId: 'project-123' };
      mockReq.body = { includeFrameworks: true };
      
      // Mock global application context
      global.application = {
        techStackAnalyzer: {
          analyzeTechStack: jest.fn()
        }
      };
    });

    afterEach(() => {
      delete global.application;
    });

    it('should analyze tech stack successfully', async () => {
      const mockAnalysis = {
        frameworks: [{ name: 'React', version: '18.0.0' }],
        libraries: [{ name: 'lodash', version: '4.17.21' }],
        tools: [{ name: 'webpack', version: '5.0.0' }]
      };

      global.application.techStackAnalyzer.analyzeTechStack.mockResolvedValue(mockAnalysis);
      mockAnalysisRepository.findLatestByProjectId.mockResolvedValue(null);
      mockAnalysisRepository.save.mockResolvedValue({});

      await controller.analyzeTechStack(mockReq, mockRes);

      expect(global.application.techStackAnalyzer.analyzeTechStack).toHaveBeenCalledWith(
        expect.any(String),
        { includeFrameworks: true, saveToFile: false, saveToDatabase: true },
        'project-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          analysis: mockAnalysis,
          summary: 'Tech stack analysis completed successfully'
        }
      });
    });

    it('should handle tech stack analyzer not available', async () => {
      global.application = {};

      await controller.analyzeTechStack(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('Tech stack analysis failed:', expect.any(Error));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tech stack analysis failed',
        message: 'Tech stack analyzer not available'
      });
    });

    it('should handle analysis errors', async () => {
      const error = new Error('Tech stack analysis failed');
      global.application.techStackAnalyzer.analyzeTechStack.mockRejectedValue(error);
      mockAnalysisRepository.findLatestByProjectId.mockResolvedValue(null);

      await controller.analyzeTechStack(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('Tech stack analysis failed:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tech stack analysis failed',
        message: 'Tech stack analysis failed'
      });
    });
  });

  describe('analyzeRecommendations', () => {
    beforeEach(() => {
      mockReq.params = { projectId: 'project-123' };
      mockReq.body = { includeInsights: true };
      
      // Mock global application context
      global.application = {
        recommendationsService: {
          generateRecommendations: jest.fn()
        }
      };
    });

    afterEach(() => {
      delete global.application;
    });

    it('should generate recommendations successfully', async () => {
      const mockAnalysis = {
        recommendations: [
          { title: 'Add TypeScript', priority: 'medium', category: 'development' }
        ],
        insights: [
          { type: 'performance', message: 'Consider code splitting' }
        ]
      };

      global.application.recommendationsService.generateRecommendations.mockResolvedValue(mockAnalysis);
      mockAnalysisRepository.findLatestByProjectId.mockResolvedValue(null);
      mockAnalysisRepository.findByProjectId.mockResolvedValue([]);
      mockAnalysisRepository.save.mockResolvedValue({});

      await controller.analyzeRecommendations(mockReq, mockRes);

      expect(global.application.recommendationsService.generateRecommendations).toHaveBeenCalledWith({});
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          analysis: mockAnalysis,
          summary: 'Recommendations analysis completed successfully'
        }
      });
    });

    it('should handle recommendations service not available', async () => {
      global.application = {};

      await controller.analyzeRecommendations(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('Recommendations analysis failed:', expect.any(Error));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Recommendations analysis failed',
        message: 'Recommendations service not available'
      });
    });

    it('should handle analysis errors', async () => {
      const error = new Error('Recommendations generation failed');
      global.application.recommendationsService.generateRecommendations.mockRejectedValue(error);
      mockAnalysisRepository.findLatestByProjectId.mockResolvedValue(null);
      mockAnalysisRepository.findByProjectId.mockResolvedValue([]);

      await controller.analyzeRecommendations(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('Recommendations analysis failed:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Recommendations analysis failed',
        message: 'Recommendations generation failed'
      });
    });
  });
}); 