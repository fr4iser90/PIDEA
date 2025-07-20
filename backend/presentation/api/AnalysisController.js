/**
 * AnalysisController - API controller for analysis data retrieval
 * Enhanced with memory management and queue integration
 * 
 * RESPONSIBILITIES:
 * ✅ GET cached analysis data
 * ✅ GET analysis status and metrics
 * ✅ GET analysis history
 * ✅ GET analysis issues and recommendations
 * 
 * ❌ DOES NOT execute analyses (that's done by Steps via WorkflowController)
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const ETagService = require('@domain/services/ETagService');
const AnalysisResult = require('@domain/entities/AnalysisResult');
const AnalysisQueueService = require('@domain/services/AnalysisQueueService');
const MemoryOptimizedAnalysisService = require('@domain/services/MemoryOptimizedAnalysisService');
const logger = new ServiceLogger('AnalysisController');

class AnalysisController {
  constructor(codeQualityService, securityService, performanceService, architectureService, logger, analysisOutputService, analysisRepository, projectRepository = null) {
    this.codeQualityService = codeQualityService;
    this.securityService = securityService;
    this.performanceService = performanceService;
    this.architectureService = architectureService;
    this.logger = logger || { info: () => {}, error: () => {} };
    this.analysisOutputService = analysisOutputService;
    this.analysisRepository = analysisRepository;
    this.projectRepository = projectRepository;
    this.etagService = new ETagService();
    
    // Helper method to get project path from database
    this.getProjectPath = async (projectId) => {
      this.logger.info(`Getting project path for projectId: ${projectId}`);
      
      if (this.projectRepository) {
        try {
          this.logger.info(`ProjectRepository available, searching for project...`);
          const project = await this.projectRepository.findById(projectId);
          this.logger.info(`Project found:`, { 
            found: !!project, 
            hasWorkspacePath: !!(project && project.workspacePath),
            workspacePath: project?.workspacePath 
          });
          
          if (project && project.workspacePath) {
            this.logger.info(`Using workspace path: ${project.workspacePath}`);
            return project.workspacePath;
          }
        } catch (error) {
          this.logger.error(`Failed to get project path for ${projectId}:`, error);
        }
      } else {
        this.logger.warn(`ProjectRepository not available!`);
      }
      
      // Fallback to current working directory
      const fallbackPath = process.cwd();
      this.logger.warn(`Using fallback path: ${fallbackPath}`);
      return fallbackPath;
    };
    
    // Initialize memory management and queue services with Phase 3 enhancements
    this.analysisQueueService = new AnalysisQueueService({
      logger: this.logger,
      maxMemoryUsage: 512, // 512MB per analysis (increased for large codebases)
      enableMemoryMonitoring: true,
      enableSelectiveAnalysis: true,
      enableEnhancedTimeouts: true,
      enableResultStreaming: true,
      enableMemoryLogging: true,
      enableProgressiveDegradation: true
    });
    
    this.memoryOptimizedService = new MemoryOptimizedAnalysisService({
      logger: this.logger,
      maxMemoryUsage: 512, // 512MB per analysis (increased for large codebases)
      enableGarbageCollection: true,
      enableStreaming: true,
      enableEnhancedTimeouts: true,
      enableResultStreaming: true,
      enableMemoryLogging: true,
      enableProgressiveDegradation: true,
      timeoutPerAnalysisType: {
        'code-quality': 2 * 60 * 1000,    // 2 minutes
        'security': 3 * 60 * 1000,        // 3 minutes
        'performance': 4 * 60 * 1000,     // 4 minutes
        'architecture': 5 * 60 * 1000,    // 5 minutes
        'techstack': 3 * 60 * 1000,       // 3 minutes
        'recommendations': 2 * 60 * 1000  // 2 minutes
      }
    });
  }

  // ============================================================================
  // ✅ GET ENDPOINTS - Cached Data Retrieval
  // ============================================================================

  /**
   * Get code quality analysis data (GET - cached data only)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getCodeQualityAnalysis(req, res) {
    try {
      const { projectId } = req.params;

      this.logger.info(`Getting code quality analysis data`);

      // Get latest code quality analysis from database
      const latest = await this.analysisRepository.findLatestByProjectIdAndType(projectId, 'codeQualityAnalysis');
      if (!latest) {
        return res.status(404).json({
          success: false,
          error: 'No code quality analysis found'
        });
      }

      const analysis = latest.resultData;
      const score = this.codeQualityService.getQualityScore(analysis);
      const level = this.codeQualityService.getQualityLevel(score);

      const analysisData = {
        analysis,
        score,
        level,
        summary: {
          overallScore: score,
          issues: analysis.issues?.length || 0,
          recommendations: analysis.recommendations?.length || 0,
          configuration: analysis.configuration || {}
        },
        cached: true,
        timestamp: latest.createdAt
      };

      // Generate ETag for analysis data
      const etag = this.etagService.generateAnalysisETag(analysisData, projectId, 'code-quality');
      
      // Check if client has current version
      if (this.etagService.shouldReturn304(req, etag)) {
        this.logger.info('Client has current version, sending 304 Not Modified');
        this.etagService.sendNotModified(res, etag);
        return;
      }
      
      // Set ETag headers for caching
      this.etagService.setETagHeaders(res, etag, {
        maxAge: 300, // 5 minutes
        mustRevalidate: true,
        isPublic: false
      });

      res.json({
        success: true,
        data: analysisData
      });

    } catch (error) {
      this.logger.error(`Failed to get code quality analysis:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get security analysis data (GET - cached data only)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getSecurityAnalysis(req, res) {
    try {
      const { projectId } = req.params;

      this.logger.info(`Getting security analysis data`);

      // Get latest analysis from database
      const latest = await this.analysisRepository.findLatestByProjectId(projectId);
      if (!latest) {
        return res.status(404).json({
          success: false,
          error: 'No security analysis found'
        });
      }

      const analysis = latest.resultData;
      const score = this.securityService.getSecurityScore(analysis);
      const riskLevel = this.securityService.getOverallRiskLevel(analysis);
      const hasCriticalVulnerabilities = this.securityService.hasCriticalVulnerabilities(analysis);

      const analysisData = {
        analysis,
        score,
        riskLevel,
        hasCriticalVulnerabilities,
        summary: this.securityService.getVulnerabilitySummary(analysis),
        cached: true,
        timestamp: latest.createdAt
      };

      // Generate ETag for analysis data
      const etag = this.etagService.generateAnalysisETag(analysisData, projectId, 'security');
      
      // Check if client has current version
      if (this.etagService.shouldReturn304(req, etag)) {
        this.logger.info('Client has current version, sending 304 Not Modified');
        this.etagService.sendNotModified(res, etag);
        return;
      }
      
      // Set ETag headers for caching
      this.etagService.setETagHeaders(res, etag, {
        maxAge: 300, // 5 minutes
        mustRevalidate: true,
        isPublic: false
      });

      res.json({
        success: true,
        data: analysisData
      });

    } catch (error) {
      this.logger.error(`Failed to get security analysis:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get performance analysis data (GET - cached data only)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getPerformanceAnalysis(req, res) {
    try {
      const { projectId } = req.params;

      this.logger.info(`Getting performance analysis data`);

      // Get latest analysis from database
      const latest = await this.analysisRepository.findLatestByProjectId(projectId);
      if (!latest) {
        return res.status(404).json({
          success: false,
          error: 'No performance analysis found'
        });
      }

      const analysis = latest.resultData;
      const score = this.performanceService.getPerformanceScore(analysis);
      const level = this.performanceService.getPerformanceLevel(score);
      const criticalIssues = this.performanceService.getCriticalIssues(analysis);

      const analysisData = {
        analysis,
        score,
        level,
        criticalIssues,
        summary: this.performanceService.getPerformanceSummary(analysis),
        cached: true,
        timestamp: latest.createdAt
      };

      // Generate ETag for analysis data
      const etag = this.etagService.generateAnalysisETag(analysisData, projectId, 'performance');
      
      // Check if client has current version
      if (this.etagService.shouldReturn304(req, etag)) {
        this.logger.info('Client has current version, sending 304 Not Modified');
        this.etagService.sendNotModified(res, etag);
        return;
      }
      
      // Set ETag headers for caching
      this.etagService.setETagHeaders(res, etag, {
        maxAge: 300, // 5 minutes
        mustRevalidate: true,
        isPublic: false
      });

      res.json({
        success: true,
        data: analysisData
      });

    } catch (error) {
      this.logger.error(`Failed to get performance analysis:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get architecture analysis data (GET - cached data only)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getArchitectureAnalysis(req, res) {
    try {
      const { projectId } = req.params;

      this.logger.info(`Getting architecture analysis data`);

      // Get latest analysis from database
      const latest = await this.analysisRepository.findLatestByProjectId(projectId);
      if (!latest) {
        return res.status(404).json({
          success: false,
          error: 'No architecture analysis found'
        });
      }

      const analysis = latest.resultData;
      const score = this.architectureService.getArchitectureScore(analysis);
      const level = this.architectureService.getArchitectureLevel(score);
      const isWellStructured = this.architectureService.isWellStructured(analysis);
      const hasCircularDependencies = this.architectureService.hasCircularDependencies(analysis);

      const analysisData = {
        analysis,
        score,
        level,
        isWellStructured,
        hasCircularDependencies,
        summary: this.architectureService.getArchitectureSummary(analysis),
        cached: true,
        timestamp: latest.createdAt
      };

      // Generate ETag for analysis data
      const etag = this.etagService.generateAnalysisETag(analysisData, projectId, 'architecture');
      
      // Check if client has current version
      if (this.etagService.shouldReturn304(req, etag)) {
        this.logger.info('Client has current version, sending 304 Not Modified');
        this.etagService.sendNotModified(res, etag);
        return;
      }
      
      // Set ETag headers for caching
      this.etagService.setETagHeaders(res, etag, {
        maxAge: 300, // 5 minutes
        mustRevalidate: true,
        isPublic: false
      });

      res.json({
        success: true,
        data: analysisData
      });

    } catch (error) {
      this.logger.error(`Failed to get architecture analysis:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ============================================================================
  // ✅ STATUS & METRICS ENDPOINTS
  // ============================================================================

  /**
   * Get analysis status
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisStatus(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`Getting analysis status for project`);
      
      // Get only the latest analysis for this project
      const latestAnalysis = await this.analysisRepository.findLatestByProjectId(projectId);
      
      if (!latestAnalysis) {
        // Return default status if no analyses exist
        const defaultStatus = {
          id: 'status',
          projectType: 'unknown',
          complexity: 'unknown',
          issues: [],
          suggestions: [],
          status: 'no-data',
          lastAnalysis: null,
          isRunning: false,
          progress: 0
        };
        
        res.json({ success: true, data: defaultStatus });
        return;
      }
      
      const resultData = latestAnalysis.resultData || {};
      const summary = latestAnalysis.summary || {};
      
      // Extract status information
      const projectType = summary.metadata?.projectType || 
                         resultData.techStack?.frameworks?.[0]?.name || 
                         'nodejs';
      
      const complexity = summary.metadata?.complexity || 
                        (resultData.codeQuality?.issues?.length > 100 ? 'high' : 
                         resultData.codeQuality?.issues?.length > 50 ? 'medium' : 'low');
      
      // Extract issues and suggestions
      const issues = [];
      const suggestions = [];
      
      if (resultData.codeQuality?.issues) {
        issues.push(...resultData.codeQuality.issues.slice(0, 5));
      }
      
      if (summary.recommendations && Array.isArray(summary.recommendations)) {
        suggestions.push(...summary.recommendations.slice(0, 5));
      }
      
      // Determine current status
      const isRunning = latestAnalysis.status === 'running';
      const progress = isRunning ? 50 : 
                      latestAnalysis.status === 'completed' ? 100 : 0;
      
      const status = {
        id: 'status',
        projectType,
        complexity,
        issues,
        suggestions,
        status: latestAnalysis.status,
        lastAnalysis: latestAnalysis.createdAt,
        isRunning,
        progress,
        projectId,
        analysisId: latestAnalysis.id,
        overallScore: summary.overallScore || 0,
        criticalIssues: summary.criticalIssues || 0,
        warnings: summary.warnings || 0,
        recommendations: summary.recommendations?.length || 0
      };
      
      this.logger.info(`Analysis status retrieved successfully`);
      
      res.json({ success: true, data: status });
    } catch (error) {
      this.logger.error(`Failed to get analysis status:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis metrics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisMetrics(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`Getting analysis metrics for project`);
      
      // Get only the latest analysis for this project
      const latestAnalysis = await this.analysisRepository.findLatestByProjectId(projectId);
      
      this.logger.info(`Found latest analysis for project`);
      
      if (!latestAnalysis) {
        // Return default metrics if no analyses exist
        const defaultMetrics = {
          id: 'metrics',
          projectType: 'unknown',
          complexity: 'unknown',
          issues: [],
          suggestions: [],
          totalAnalyses: 0,
          completedAnalyses: 0,
          failedAnalyses: 0,
          successRate: 0,
          averageDuration: 0,
          lastAnalysisDate: null,
          analysisTypes: {}
        };
        
        res.json({ success: true, data: defaultMetrics });
        return;
      }
      
      const resultData = latestAnalysis.resultData || {};
      const summary = latestAnalysis.summary || {};
      
      // Extract metrics from the latest analysis
      const projectType = summary.metadata?.projectType || 
                         resultData.techStack?.frameworks?.[0]?.name || 
                         'nodejs';
      
      const complexity = summary.metadata?.complexity || 
                        (resultData.codeQuality?.issues?.length > 100 ? 'high' : 
                         resultData.codeQuality?.issues?.length > 50 ? 'medium' : 'low');
      
      // Extract issues and suggestions from the analysis
      const issues = [];
      const suggestions = [];
      
      if (resultData.codeQuality?.issues) {
        issues.push(...resultData.codeQuality.issues.slice(0, 5));
      }
      
      if (summary.recommendations && Array.isArray(summary.recommendations)) {
        suggestions.push(...summary.recommendations.slice(0, 5));
      }
      
      // Get project stats for metrics
      const projectStats = await this.analysisRepository.getProjectAnalysisStats(projectId);
      
      const metrics = {
        id: 'metrics',
        projectType,
        complexity,
        issues,
        suggestions,
        totalAnalyses: projectStats.totalAnalyses,
        completedAnalyses: projectStats.totalAnalyses, // Assuming all are completed
        failedAnalyses: 0, // Would need to track failed analyses separately
        successRate: 100, // Assuming all are successful
        averageDuration: projectStats.averageDuration || 0,
        lastAnalysisDate: latestAnalysis.createdAt,
        analysisTypes: {
          [latestAnalysis.analysisType]: {
            count: 1,
            latest: latestAnalysis.createdAt,
            averageScore: latestAnalysis.overallScore || 0
          }
        },
        overallScore: latestAnalysis.overallScore || 0,
        criticalIssues: latestAnalysis.criticalIssuesCount || 0,
        warnings: latestAnalysis.warningsCount || 0,
        recommendations: latestAnalysis.recommendationsCount || 0
      };
      
      this.logger.info(`Calculated metrics successfully`);
      
      // Set ETag for caching with 304 support
      const etagSent = this.setETagHeaders(res, 'analysis-metrics', projectId, metrics, req);
      
      if (!etagSent) {
        res.json({ success: true, data: metrics });
      }
    } catch (error) {
      this.logger.error(`Failed to get analysis metrics:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis history
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisHistory(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`Getting analysis history for project`);
      this.logger.info(`Request URL: ${req.url}`);
      this.logger.info(`Request method: ${req.method}`);
      this.logger.info(`AnalysisRepository type: ${this.analysisRepository.constructor.name}`);
      
      // Get only the latest analysis for this project
      this.logger.info(`Calling analysisRepository.findLatestByProjectId('${projectId}')`);
      const latestAnalysis = await this.analysisRepository.findLatestByProjectId(projectId);
      
      if (!latestAnalysis) {
        this.logger.info(`No analyses found for project`);
        res.json({ success: true, data: [] });
        return;
      }
      
      this.logger.info(`Found latest analysis from repository`);
      
      // Transform to expected format (array with single object)
      const resultData = latestAnalysis.resultData || {};
      const summary = latestAnalysis.summary || {};
      
      // Determine analysis type for display
      const analysisType = latestAnalysis.analysisType || 'unknown';
      const displayType = analysisType === 'advanced-analysis' ? 'analysis' : analysisType;
      
      // Calculate file size from data (if available)
      const dataSize = JSON.stringify(resultData).length;
      
      // Get filename from metadata or generate one
      const filename = summary.metadata?.filename || 
                      summary.metadata?.projectPath?.split('/').pop() || 
                      `${analysisType}-${latestAnalysis.id}.json`;
      
      const transformedAnalysis = {
        id: latestAnalysis.id,
        projectId: latestAnalysis.projectId,
        analysisType: analysisType,
        type: displayType, // Frontend expects 'type' field
        timestamp: latestAnalysis.createdAt,
        status: latestAnalysis.status,
        data: resultData,
        report: summary,
        metadata: summary.metadata || {},
        // Frontend-specific fields
        filename: filename,
        size: dataSize,
        completed: latestAnalysis.status === 'completed',
        error: latestAnalysis.status === 'failed' ? 'Analysis failed' : null,
        progress: latestAnalysis.status === 'completed' ? 100 : 
                 latestAnalysis.status === 'running' ? 50 : 0
      };
      
      this.logger.info(`Transformed analysis successfully`);
      
      // Return array with single analysis for frontend compatibility
      const history = [transformedAnalysis];
      
      this.logger.info(`Analysis history prepared successfully`);
      
      // Generate ETag for history data
      const etag = this.etagService.generateHistoryETag(history, projectId);
      
      // Check if client has current version
      if (this.etagService.shouldReturn304(req, etag)) {
        this.logger.info('Client has current version, sending 304 Not Modified');
        this.etagService.sendNotModified(res, etag);
        return;
      }
      
      // Set ETag headers for caching
      this.etagService.setETagHeaders(res, etag, {
        maxAge: 300, // 5 minutes
        mustRevalidate: true,
        isPublic: false
      });
      
      res.json({ success: true, data: history });
    } catch (error) {
      this.logger.error(`Failed to get analysis history:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================================================================
  // ✅ DETAILED DATA ENDPOINTS
  // ============================================================================

  /**
   * Get analysis issues
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisIssues(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`Getting analysis issues for project: ${projectId}`);
      
      // Get only the latest analysis for this project
      const latestAnalysis = await this.analysisRepository.findLatestByProjectId(projectId);
      
      if (!latestAnalysis) {
        const defaultIssues = {
          issues: [],
          totalIssues: 0,
          criticalIssues: 0,
          warnings: 0,
          info: 0,
          categories: {}
        };
        
        res.json({ success: true, data: defaultIssues });
        return;
      }
      
      const resultData = latestAnalysis.resultData || {};
      const summary = latestAnalysis.summary || {};
      
      // Extract issues from the latest analysis
      const issues = [];
      const categories = {};
      
      // Extract code quality issues
      if (resultData.codeQuality?.issues) {
        resultData.codeQuality.issues.forEach(issue => {
          const issueData = {
            id: `issue-${Date.now()}-${Math.random()}`,
            type: 'code-quality',
            severity: issue.severity || 'medium',
            message: issue.message || 'Code quality issue',
            file: issue.file || 'unknown',
            line: issue.line || 0,
            category: issue.category || 'general',
            description: issue.description || '',
            suggestion: issue.suggestion || '',
            timestamp: latestAnalysis.createdAt
          };
          
          issues.push(issueData);
          
          // Count by category
          if (!categories[issueData.category]) {
            categories[issueData.category] = { count: 0, issues: [] };
          }
          categories[issueData.category].count++;
          categories[issueData.category].issues.push(issueData);
        });
      }
      
      // Extract security issues
      if (resultData.security?.vulnerabilities) {
        resultData.security.vulnerabilities.forEach(vuln => {
          const issueData = {
            id: `security-${Date.now()}-${Math.random()}`,
            type: 'security',
            severity: vuln.severity || 'high',
            message: vuln.title || 'Security vulnerability',
            file: vuln.file || 'unknown',
            line: vuln.line || 0,
            category: 'security',
            description: vuln.description || '',
            suggestion: vuln.recommendation || '',
            cve: vuln.cve || null,
            timestamp: latestAnalysis.createdAt
          };
          
          issues.push(issueData);
          
          if (!categories.security) {
            categories.security = { count: 0, issues: [] };
          }
          categories.security.count++;
          categories.security.issues.push(issueData);
        });
      }
      
      // Count by severity
      const totalIssues = issues.length;
      const criticalIssues = issues.filter(i => i.severity === 'critical').length;
      const warnings = issues.filter(i => i.severity === 'warning').length;
      const info = issues.filter(i => i.severity === 'info').length;
      
      const issuesData = {
        issues: issues.slice(0, 100), // Limit to 100 issues for performance
        totalIssues,
        criticalIssues,
        warnings,
        info,
        categories,
        lastUpdated: latestAnalysis.createdAt,
        analysisId: latestAnalysis.id
      };
      
      this.logger.info(`Issues data extracted, count: ${totalIssues}`);
      
      // Set ETag for caching with 304 support
      const etagSent = this.setETagHeaders(res, 'analysis-issues', projectId, issuesData, req);
      
      if (!etagSent) {
        res.json({ success: true, data: issuesData });
      }
    } catch (error) {
      this.logger.error(`Failed to get analysis issues:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis tech stack
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisTechStack(req, res) {
    try {
      const { projectId } = req.params;
      this.logger.info(`Getting analysis tech stack for project`);
      
       // Get latest tech stack analysis for this project
      const techStackAnalysis = await this.analysisRepository.findLatestByProjectIdAndType(projectId, 'techStackAnalysis');
      const analyses = techStackAnalysis ? [techStackAnalysis] : [];
      if (analyses.length === 0) {
        return res.json({ success: true, data: { 
          dependencies: { direct: {}, dev: {}, outdated: [] },
          structure: { projectType: 'unknown', fileTypes: {}, frameworks: [], libraries: [] }
        } });
      }
      const resultData = techStackAnalysis.resultData || {};
      const summary = techStackAnalysis.summary || {};
      
      // Convert frameworks and libraries to dependencies format
      const directDeps = {};
      const techStackData = resultData.result || resultData;
      const frameworks = techStackData.frameworks || techStackData.structure?.frameworks || [];
      const libraries = techStackData.libraries || techStackData.structure?.libraries || [];
      
      // Add frameworks to direct dependencies
      frameworks.forEach(fw => {
        directDeps[fw.name] = fw.version;
      });
      
      // Add libraries to direct dependencies
      libraries.forEach(lib => {
        directDeps[lib.name] = lib.version;
      });
      
      // Extract and structure the data
      const extractedData = {
        dependencies: {
          direct: Object.keys(directDeps).length > 0 ? directDeps : (techStackData.dependencies?.direct || {}),
          dev: techStackData.dependencies?.dev || {},
          outdated: techStackData.dependencies?.outdated || []
        },
        structure: {
          projectType: techStackData.projectType || techStackData.structure?.projectType || 'unknown',
          fileTypes: techStackData.fileTypes || techStackData.structure?.fileTypes || {},
          frameworks: frameworks,
          libraries: libraries
        }
      };
      
      this.logger.info(`Tech stack data extracted successfully`);
      
      // Set ETag for caching with 304 support
      const etagSent = this.setETagHeaders(res, 'analysis-techstack', projectId, extractedData, req);
      
      if (!etagSent) {
        res.json({ success: true, data: extractedData });
      }
    } catch (error) {
      this.logger.error(`Failed to get tech stack analysis:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tech stack analysis',
        message: error.message
      });
    }
  }

  /**
   * Get analysis architecture
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisArchitecture(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`Getting analysis architecture for project`);
      
      // Get latest architecture analysis for this project
      const architectureAnalysis = await this.analysisRepository.findLatestByProjectIdAndType(projectId, 'architectureAnalysis');
      
      if (!architectureAnalysis) {
        this.logger.warn(`No architecture analysis found for project`);
        return res.json({ success: true, data: { 
          structure: { layers: 0, modules: 0, patterns: [] },
          dependencies: { circular: false, count: 0, graph: null },
          metrics: { coupling: 'unknown', cohesion: 'unknown', complexity: 'unknown', maintainability: 'unknown', testability: 'unknown' },
          patterns: [],
          antiPatterns: [],
          recommendations: []
        } });
      }
      
      const resultData = architectureAnalysis.resultData || {};
      const summary = architectureAnalysis.summary || {};
      
      // Extract data from resultData.result (the actual analysis data)
      const analysisData = resultData.result || resultData;
      
      // Extract and structure the data
      const extractedData = {
        structure: {
          layers: analysisData.structure?.layers || analysisData.layers || 0,
          modules: analysisData.structure?.modules || analysisData.modules || 0,
          patterns: analysisData.structure?.patterns || analysisData.patterns || analysisData.detectedPatterns || []
        },
        dependencies: {
          circular: analysisData.dependencies?.circular || analysisData.circular || false,
          count: analysisData.dependencies?.count || analysisData.dependencyCount || 0,
          graph: analysisData.dependencies?.graph || analysisData.graph || null
        },
        metrics: {
          coupling: analysisData.metrics?.coupling || analysisData.coupling || 'unknown',
          cohesion: analysisData.metrics?.cohesion || analysisData.cohesion || 'unknown',
          complexity: analysisData.metrics?.complexity || analysisData.complexity || 'unknown',
          maintainability: analysisData.metrics?.maintainability || analysisData.maintainability || 'unknown',
          testability: analysisData.metrics?.testability || analysisData.testability || 'unknown'
        },
        patterns: analysisData.patterns || analysisData.detectedPatterns || [],
        antiPatterns: analysisData.antiPatterns || analysisData.antiPatterns || [],
        recommendations: analysisData.recommendations || []
      };
      
      this.logger.info(`Architecture data extracted successfully`);
      
      // Set ETag for caching with 304 support
      const etagSent = this.setETagHeaders(res, 'analysis-architecture', projectId, extractedData, req);
      
      if (!etagSent) {
        res.json({ success: true, data: extractedData });
      }
    } catch (error) {
      this.logger.error(`Failed to get architecture analysis:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to get architecture analysis',
        message: error.message
      });
    }
  }

  /**
   * Get analysis recommendations
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisRecommendations(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`Getting analysis recommendations for project`);
      
      // Get latest recommendations analysis for this project
      const recommendationsAnalysis = await this.analysisRepository.findLatestByProjectIdAndType(projectId, 'recommendations');
      
      if (!recommendationsAnalysis) {
        this.logger.warn(`No recommendations analysis found for project`);
        return res.json({ success: true, data: { recommendations: [], insights: [] } });
      }
      
      const resultData = recommendationsAnalysis.resultData || {};
      const summary = recommendationsAnalysis.summary || {};
      
      // Extract and structure the data - ensure we return an object with recommendations array
      const extractedData = {
        recommendations: Array.isArray(resultData.recommendations) ? resultData.recommendations : 
                        Array.isArray(resultData) ? resultData : [],
        insights: Array.isArray(resultData.insights) ? resultData.insights : []
      };
      
      this.logger.info(`Recommendations data extracted successfully`);
      
      // Set ETag for caching with 304 support
      const etagSent = this.setETagHeaders(res, 'analysis-recommendations', projectId, extractedData, req);
      
      if (!etagSent) {
        res.json({ success: true, data: extractedData });
      }
    } catch (error) {
      this.logger.error(`Failed to get recommendations analysis:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations analysis',
        message: error.message
      });
    }
  }

  // ============================================================================
  // ✅ HELPER METHODS
  // ============================================================================

  /**
   * Get overall level based on score
   * @param {number} score - Overall score
   * @returns {string} Overall level
   */
  getOverallLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Set ETag headers for caching with 304 support
   * @param {Object} res - Express response
   * @param {string} type - Data type
   * @param {string} projectId - Project ID
   * @param {Object} data - Data to cache
   * @param {Object} req - Express request (optional, for 304 checking)
   * @returns {boolean} True if 304 was sent, false if data should be sent
   */
  setETagHeaders(res, type, projectId, data, req = null) {
    if (!this.etagService) {
      return false;
    }
    
    try {
      const etag = this.etagService.generateETag(data, type, projectId);
      
      // Check if client has current version (if request is provided)
      if (req && this.etagService.shouldReturn304(req, etag)) {
        this.logger.info(`Client has current version for ${type}, sending 304 Not Modified`);
        this.etagService.sendNotModified(res, etag);
        return true; // 304 was sent
      }
      
      // Set ETag headers for caching
      this.etagService.setETagHeaders(res, etag, {
        maxAge: 300, // 5 minutes
        mustRevalidate: true,
        isPublic: false
      });
      
      return false; // Data should be sent
    } catch (error) {
      this.logger.warn(`Failed to set ETag headers: ${error.message}`);
      return false;
    }
  }
}

module.exports = AnalysisController; 