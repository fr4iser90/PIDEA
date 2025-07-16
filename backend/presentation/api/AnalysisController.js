const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const ETagService = require('@domain/services/ETagService');
const AnalysisResult = require('@domain/entities/AnalysisResult');
const AnalysisQueueService = require('@domain/services/AnalysisQueueService');
const MemoryOptimizedAnalysisService = require('@domain/services/MemoryOptimizedAnalysisService');
const logger = new ServiceLogger('AnalysisController');

/**
 * AnalysisController - API controller for specialized analysis endpoints
 * Enhanced with memory management and queue integration
 */
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

  /**
   * Analyze code quality
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyzeCodeQuality(req, res) {
    try {
      const { projectId } = req.params;
      const options = req.body || {};

      this.logger.info(`Code quality analysis requested for project`);

      // Get project path from database
      const projectPath = await this.getProjectPath(projectId);

      // Suche nach aktueller Analyse
      const latest = await this.analysisRepository.findLatestByProjectId(projectId);
      if (latest && isAnalysisFresh(latest)) {
        this.logger.info(`Returning cached code quality analysis for project`);
        const analysis = latest.resultData;
        const score = this.codeQualityService.getQualityScore(analysis);
        const level = this.codeQualityService.getQualityLevel(score);
        const criticalIssues = this.codeQualityService.getCriticalIssues(analysis);

        res.json({
          success: true,
          data: {
            analysis,
            score,
            level,
            criticalIssues,
            summary: this.codeQualityService.getQualitySummary(analysis)
          }
        });
        return;
      }

      this.logger.info(`Calling codeQualityService.analyzeCodeQuality with path: ${projectPath}`);
      const analysis = await this.codeQualityService.analyzeCodeQuality(projectPath, {
        ...options,
        saveToFile: false, // Prevent automatic file generation
        saveToDatabase: true // Allow database saving for caching
      }, projectId);
      const score = this.codeQualityService.getQualityScore(analysis);
      const level = this.codeQualityService.getQualityLevel(score);
      const criticalIssues = this.codeQualityService.getCriticalIssues(analysis);
      
      // Create and save analysis result
      const analysisResult = AnalysisResult.create(projectId, 'codeQuality', analysis, {
        overallScore: score,
        criticalIssuesCount: criticalIssues?.length || 0
      });
      await this.analysisRepository.save(analysisResult);

      res.json({
        success: true,
        data: {
          analysis,
          score,
          level,
          criticalIssues,
          summary: this.codeQualityService.getQualitySummary(analysis)
        }
      });
    } catch (error) {
      this.logger.error(`Code quality analysis failed:`, error);
      res.status(500).json({
        success: false,
        error: 'Code quality analysis failed',
        message: error.message
      });
    }
  }

  /**
   * Analyze security
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyzeSecurity(req, res) {
    try {
      const { projectId } = req.params;
      const options = req.body || {};

      this.logger.info(`Security analysis requested for project`);

      // Get project path from database
      const projectPath = await this.getProjectPath(projectId);

      // Suche nach aktueller Analyse
      const latest = await this.analysisRepository.findLatestByProjectId(projectId);
      if (latest && isAnalysisFresh(latest)) {
        this.logger.info(`Returning cached security analysis for project`);
        const analysis = latest.resultData;
        const score = this.securityService.getSecurityScore(analysis);
        const level = this.securityService.getSecurityLevel(score);
        const criticalIssues = this.securityService.getCriticalIssues(analysis);

        res.json({
          success: true,
          data: {
            analysis,
            score,
            level,
            criticalIssues,
            summary: this.securityService.getSecuritySummary(analysis)
          }
        });
        return;
      }

      const analysis = await this.securityService.analyzeSecurity(projectPath, {
        ...options,
        saveToFile: false, // Prevent automatic file generation
        saveToDatabase: true // Allow database saving for caching
      }, projectId);
      const score = this.securityService.getSecurityScore(analysis);
      const level = this.securityService.getSecurityLevel(score);
      const criticalIssues = this.securityService.getCriticalIssues(analysis);
      
      // Create and save analysis result
      const analysisResult = AnalysisResult.create(projectId, 'security', analysis, {
        overallScore: score,
        criticalIssuesCount: criticalIssues?.length || 0
      });
      await this.analysisRepository.save(analysisResult);

      res.json({
        success: true,
        data: {
          analysis,
          score,
          level,
          criticalIssues,
          summary: this.securityService.getSecuritySummary(analysis)
        }
      });
    } catch (error) {
      this.logger.error(`Security analysis failed:`, error);
      res.status(500).json({
        success: false,
        error: 'Security analysis failed',
        message: error.message
      });
    }
  }

  /**
   * Analyze performance
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyzePerformance(req, res) {
    try {
      const { projectId } = req.params;
      const options = req.body || {};

      this.logger.info(`Performance analysis requested for project`);

      // Get project path from database
      const projectPath = await this.getProjectPath(projectId);

      // Suche nach aktueller Analyse
      const latest = await this.analysisRepository.findLatestByProjectId(projectId);
      if (latest && isAnalysisFresh(latest)) {
        this.logger.info(`Returning cached performance analysis for project`);
        const analysis = latest.resultData;
        const score = this.performanceService.getPerformanceScore(analysis);
        const level = this.performanceService.getPerformanceLevel(score);
        const criticalIssues = this.performanceService.getCriticalIssues(analysis);

        res.json({
          success: true,
          data: {
            analysis,
            score,
            level,
            criticalIssues,
            summary: this.performanceService.getPerformanceSummary(analysis)
          }
        });
        return;
      }

      const analysis = await this.performanceService.analyzePerformance(projectPath, {
        ...options,
        saveToFile: false, // Prevent automatic file generation
        saveToDatabase: true // Allow database saving for caching
      }, projectId);
      const score = this.performanceService.getPerformanceScore(analysis);
      const level = this.performanceService.getPerformanceLevel(score);
      const criticalIssues = this.performanceService.getCriticalIssues(analysis);
      
      // Create and save analysis result
      const analysisResult = AnalysisResult.create(projectId, 'performance', analysis, {
        overallScore: score,
        criticalIssuesCount: criticalIssues?.length || 0
      });
      await this.analysisRepository.save(analysisResult);

      res.json({
        success: true,
        data: {
          analysis,
          score,
          level,
          criticalIssues,
          summary: this.performanceService.getPerformanceSummary(analysis)
        }
      });

    } catch (error) {
      this.logger.error(`Performance analysis failed:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Analyze architecture
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyzeArchitecture(req, res) {
    try {
      const { projectId } = req.params;
      const options = req.body || {};

      this.logger.info(`Architecture analysis requested for project`);

      // Get project path from database
      const projectPath = await this.getProjectPath(projectId);

      // Suche nach aktueller Analyse
      const latest = await this.analysisRepository.findLatestByProjectId(projectId);
      if (latest && isAnalysisFresh(latest)) {
        this.logger.info(`Returning cached architecture analysis for project`);
        const analysis = latest.resultData;
        const score = this.architectureService.getArchitectureScore(analysis);
        const level = this.architectureService.getArchitectureLevel(score);
        const criticalIssues = this.architectureService.getCriticalIssues(analysis);

        res.json({
          success: true,
          data: {
            analysis,
            score,
            level,
            criticalIssues,
            summary: this.architectureService.getArchitectureSummary(analysis)
          }
        });
        return;
      }

      const analysis = await this.architectureService.analyzeArchitecture(projectPath, {
        ...options,
        saveToFile: false, // Prevent automatic file generation
        saveToDatabase: true // Allow database saving for caching
      }, projectId);
      const score = this.architectureService.getArchitectureScore(analysis);
      const level = this.architectureService.getArchitectureLevel(score);
      const criticalIssues = this.architectureService.getCriticalIssues(analysis);
      
      // Create and save analysis result
      const analysisResult = AnalysisResult.create(projectId, 'architecture', analysis, {
        overallScore: score,
        criticalIssuesCount: criticalIssues?.length || 0
      });
      await this.analysisRepository.save(analysisResult);

      res.json({
        success: true,
        data: {
          analysis,
          score,
          level,
          criticalIssues,
          summary: this.architectureService.getArchitectureSummary(analysis)
        }
      });
    } catch (error) {
      this.logger.error(`Architecture analysis failed:`, error);
      res.status(500).json({
        success: false,
        error: 'Architecture analysis failed',
        message: error.message
      });
    }
  }

  /**
   * Analyze tech stack
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyzeTechStack(req, res) {
    try {
      const { projectId } = req.params;
      const options = req.body || {};

      this.logger.info(`Tech stack analysis requested for project`);

      // Get project path from database
      const projectPath = await this.getProjectPath(projectId);

      // Check for cached analysis
      const latest = await this.analysisRepository.findLatestByProjectId(projectId);
      if (latest && isAnalysisFresh(latest)) {
        this.logger.info(`Returning cached tech stack analysis for project`);
        const analysis = latest.resultData;
        
        res.json({
          success: true,
          data: {
            analysis,
            summary: 'Tech stack analysis from cache'
          }
        });
        return;
      }

      // Get tech stack analyzer from application context
      const application = global.application;
      if (!application || !application.techStackAnalyzer) {
        throw new Error('Tech stack analyzer not available');
      }

      const analysis = await application.techStackAnalyzer.analyzeTechStack(projectPath, {
        ...options,
        saveToFile: false,
        saveToDatabase: true
      }, projectId);
      
      // Create and save analysis result
      const analysisResult = AnalysisResult.create(projectId, 'techstack', analysis, {
        frameworksCount: analysis.frameworks?.length || 0,
        librariesCount: analysis.libraries?.length || 0,
        toolsCount: analysis.tools?.length || 0
      });
      await this.analysisRepository.save(analysisResult);

      res.json({
        success: true,
        data: {
          analysis,
          summary: 'Tech stack analysis completed successfully'
        }
      });
    } catch (error) {
      this.logger.error(`Tech stack analysis failed:`, error);
      res.status(500).json({
        success: false,
        error: 'Tech stack analysis failed',
        message: error.message
      });
    }
  }

  /**
   * Analyze recommendations
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyzeRecommendations(req, res) {
    try {
      const { projectId } = req.params;
      const options = req.body || {};

      this.logger.info(`Recommendations analysis requested for project`);

      // Get project path from database
      const projectPath = await this.getProjectPath(projectId);

      // Check for cached analysis
      const latest = await this.analysisRepository.findLatestByProjectId(projectId);
      if (latest && isAnalysisFresh(latest)) {
        this.logger.info(`Returning cached recommendations analysis for project`);
        const analysis = latest.resultData;
        
        res.json({
          success: true,
          data: {
            analysis,
            summary: 'Recommendations analysis from cache'
          }
        });
        return;
      }

      // Get recommendations service from application context
      const application = global.application;
      if (!application || !application.recommendationsService) {
        throw new Error('Recommendations service not available');
      }

      // First get existing analysis data to generate recommendations
      const existingAnalyses = await this.analysisRepository.findByProjectId(projectId);
      const analysisData = {};
      for (const a of existingAnalyses) {
        analysisData[a.analysisType] = a.resultData;
      }

      const analysis = await application.recommendationsService.generateRecommendations(analysisData);
      
      // KORREKTES FORMAT für Speicherung und Response
      const resultToSave = {
        recommendations: analysis.recommendations || [],
        insights: analysis.insights || []
      };
      // Create and save analysis result
      const analysisResult = AnalysisResult.create(projectId, 'recommendations', resultToSave, {
        recommendationsCount: resultToSave.recommendations.length,
        insightsCount: resultToSave.insights.length
      });
      await this.analysisRepository.save(analysisResult);

      res.json({
        success: true,
        data: {
          ...resultToSave,
          summary: 'Recommendations analysis completed successfully'
        }
      });
    } catch (error) {
      this.logger.error(`Failed to get recommendations analysis:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations analysis',
        message: error.message
      });
    }
  }

  /**
   * Parse analysis types from query parameters
   * @param {string} types - Comma-separated analysis types
   * @param {string} exclude - Comma-separated types to exclude
   * @returns {Array} Array of analysis types
   */
  parseAnalysisTypes(types, exclude) {
    const allTypes = ['code-quality', 'security', 'performance', 'architecture', 'techstack', 'recommendations'];
    
    if (!types || types === 'all') {
      return allTypes;
    }
    
    const requestedTypes = types.split(',').map(t => t.trim());
    const validTypes = requestedTypes.filter(t => allTypes.includes(t));
    
    if (exclude) {
      const excludedTypes = exclude.split(',').map(t => t.trim());
      return validTypes.filter(t => !excludedTypes.includes(t));
    }
    
    return validTypes;
  }



  /**
   * Execute single analysis with enhanced timeout and memory monitoring (Phase 3)
   * @param {string} analysisType - Type of analysis
   * @param {string} projectPath - Project path
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeAnalysisWithTimeout(analysisType, projectPath, options) {
    // **NEW**: Use analysis-type-specific timeouts from Phase 3
    const timeout = options.timeout || this.memoryOptimizedService.timeoutPerAnalysisType[analysisType] || 300000;
    
    this.logger.info(`Executing analysis with enhanced timeout`, {
      analysisType,
      projectPath,
      timeout: `${timeout / 1000}s`
    });
    
    // **NEW**: Apply progressive degradation for large repositories
    const degradedOptions = this.memoryOptimizedService.applyProgressiveDegradation(projectPath, options);
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new Error(`Enhanced timeout exceeded for ${analysisType}: ${timeout / 1000}s`);
        error.name = 'EnhancedTimeoutError';
        error.analysisType = analysisType;
        error.timeout = timeout;
        reject(error);
      }, timeout);
      
      // Execute analysis based on type with enhanced error handling
      let analysisPromise;
      try {
        switch (analysisType) {
          case 'code-quality':
            analysisPromise = this.codeQualityService.analyzeCodeQuality(projectPath, degradedOptions);
            break;
          case 'security':
            analysisPromise = this.securityService.analyzeSecurity(projectPath, degradedOptions);
            break;
          case 'performance':
            analysisPromise = this.performanceService.analyzePerformance(projectPath, degradedOptions);
            break;
          case 'architecture':
            analysisPromise = this.architectureService.analyzeArchitecture(projectPath, degradedOptions);
            break;
          case 'techstack':
            const application = global.application;
            if (!application || !application.techStackAnalyzer) {
              reject(new Error('Tech stack analyzer not available'));
              return;
            }
            analysisPromise = application.techStackAnalyzer.analyzeTechStack(projectPath, degradedOptions);
            break;
          case 'recommendations':
            const app = global.application;
            if (!app || !app.recommendationsService) {
              reject(new Error('Recommendations service not available'));
              return;
            }
            // Get existing analysis data for recommendations
            this.analysisRepository.findByProjectId(projectPath)
              .then(existingAnalyses => {
                const analysisData = existingAnalyses.length > 0 ? existingAnalyses[0].resultData : {};
                return app.recommendationsService.generateRecommendations(analysisData);
              })
              .then(result => {
                clearTimeout(timeoutId);
                resolve(result);
              })
              .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
              });
            return;
          default:
            reject(new Error(`Unknown analysis type: ${analysisType}`));
            return;
        }
        
        analysisPromise
          .then(result => {
            clearTimeout(timeoutId);
            this.logger.info(`Analysis completed successfully`, {
              analysisType,
              projectPath,
              duration: `${Date.now() - Date.now()}ms`
            });
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timeoutId);
            this.logger.error(`Analysis failed with error`, {
              analysisType,
              projectPath,
              error: error.message
            });
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeoutId);
        this.logger.error(`Analysis setup failed`, {
          analysisType,
          projectPath,
          error: error.message
        });
        reject(error);
      }
    });
  }

  /**
   * Check memory usage and trigger enhanced cleanup if needed (Phase 3)
   */
  async checkMemoryUsage() {
    const usage = process.memoryUsage();
    const currentUsage = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotal = Math.round(usage.heapTotal / 1024 / 1024);
    const external = Math.round(usage.external / 1024 / 1024);
    const rss = Math.round(usage.rss / 1024 / 1024);
    
    // **NEW**: Enhanced memory logging with detailed metrics
    this.logger.info(`Enhanced memory usage check`, {
      heapUsed: `${currentUsage}MB`,
      heapTotal: `${heapTotal}MB`,
      external: `${external}MB`,
      rss: `${rss}MB`,
      threshold: `${this.memoryOptimizedService.maxMemoryUsage}MB`
    });
    
    // **NEW**: Check against enhanced memory threshold with fallback mechanisms
    if (currentUsage > this.memoryOptimizedService.maxMemoryUsage * this.memoryOptimizedService.memoryThreshold) {
      this.logger.warn(`Memory threshold exceeded: ${currentUsage}MB, triggering enhanced cleanup`, {
        currentUsage: `${currentUsage}MB`,
        threshold: `${this.memoryOptimizedService.maxMemoryUsage * this.memoryOptimizedService.memoryThreshold}MB`
      });
      
      // **NEW**: Trigger fallback mechanisms from MemoryOptimizedAnalysisService
      this.memoryOptimizedService.triggerFallbackMechanisms();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // **NEW**: Enhanced cleanup wait time
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // **NEW**: Log cleanup results
      const afterUsage = process.memoryUsage();
      const afterCurrentUsage = Math.round(afterUsage.heapUsed / 1024 / 1024);
      this.logger.info(`Memory cleanup completed`, {
        before: `${currentUsage}MB`,
        after: `${afterCurrentUsage}MB`,
        reduction: `${currentUsage - afterCurrentUsage}MB`
      });
    }
  }

  /**
   * Enhanced cleanup after analysis (Phase 3)
   */
  async cleanupAfterAnalysis() {
    this.logger.info(`Starting enhanced cleanup after analysis`);
    
    // **NEW**: Enhanced garbage collection with multiple passes
    if (global.gc) {
      // First pass
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Second pass for thorough cleanup
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // **NEW**: Cleanup enhanced resources from MemoryOptimizedAnalysisService
    await this.memoryOptimizedService.cleanupEnhanced();
    
    // **NEW**: Enhanced cleanup wait time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // **NEW**: Log cleanup results
    const usage = process.memoryUsage();
    const currentUsage = Math.round(usage.heapUsed / 1024 / 1024);
    this.logger.info(`Enhanced cleanup completed`, {
      finalMemoryUsage: `${currentUsage}MB`
    });
  }

  /**
   * Get analysis status
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisStatus(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`Getting analysis status for project`);
      
      // Get all analyses for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
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
      
      // Get the latest analysis
      const latestAnalysis = analyses[0];
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
      
      // Get all analyses for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      this.logger.info(`Found ${analyses.length} analyses for project`);
      
      if (analyses.length === 0) {
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
      
      // Get the latest analysis for detailed metrics
      const latestAnalysis = analyses[0]; // Already sorted by created_at DESC
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
      
      // Add code quality issues
      if (resultData.codeQuality?.issues) {
        issues.push(...resultData.codeQuality.issues.slice(0, 10)); // Limit to 10 most important
      }
      
      // Add security issues
      if (resultData.security?.vulnerabilities) {
        issues.push(...resultData.security.vulnerabilities.slice(0, 5));
      }
      
      // Add performance issues
      if (resultData.performance?.issues) {
        issues.push(...resultData.performance.issues.slice(0, 5));
      }
      
      // Add recommendations
      if (summary.recommendations && Array.isArray(summary.recommendations)) {
        suggestions.push(...summary.recommendations.slice(0, 10));
      }
      
      // Calculate basic metrics - count individual analyses from summary data
      let totalAnalyses = 0;
      let completedAnalyses = 0;
      let failedAnalyses = 0;
      
      this.logger.info(`Processing ${analyses.length} workflow executions for metrics calculation`);
      
      // Count individual analyses from each workflow execution
      analyses.forEach((analysis, index) => {
        const summary = analysis.summary || {};
        const resultData = analysis.resultData || {};
        const analysisType = analysis.analysisType;
        
        // Count this analysis record
        totalAnalyses++;
        
        // Check if this analysis was successful
        if (analysis.status === 'completed' && !analysis.error) {
          completedAnalyses++;
        } else {
          failedAnalyses++;
        }
        
        // Also count individual analysis types if this is a comprehensive analysis
        if (analysisType === 'comprehensive-analysis' || analysisType === 'advanced-analysis') {
          const analysisTypes = ['projectAnalysis', 'codeQuality', 'security', 'performance', 'architecture', 'techStack', 'dependencies'];
          let foundTypes = 0;
          analysisTypes.forEach(type => {
            if (resultData[type]) {
              foundTypes++;
            }
          });
          this.logger.info(`Analysis ${index + 1}: Found ${foundTypes} analysis types in comprehensive analysis`);
        } else {
          this.logger.info(`Analysis ${index + 1}: Individual analysis of type ${analysisType}`);
        }
      });
      
      this.logger.info(`Final metrics: totalAnalyses=${totalAnalyses}, completedAnalyses=${completedAnalyses}, failedAnalyses=${failedAnalyses}`);
      
      const successRate = totalAnalyses > 0 ? completedAnalyses / totalAnalyses : 0;
      
      // Calculate average duration per individual analysis
      let totalDuration = 0;
      let durationCount = 0;
      analyses.forEach(analysis => {
        if (analysis.durationMs) {
          const analysisType = analysis.analysisType;
          
          if (analysisType === 'comprehensive-analysis' || analysisType === 'advanced-analysis') {
            // For comprehensive analyses, distribute duration across individual analysis types
            const summary = analysis.summary || {};
            const resultData = analysis.resultData || {};
            
            let individualAnalysisCount = 0;
            if (summary.totalAnalyses) {
              individualAnalysisCount = summary.totalAnalyses;
            } else {
              // Fallback: count individual analysis types
              const analysisTypes = ['projectAnalysis', 'codeQuality', 'security', 'performance', 'architecture', 'techStack', 'dependencies'];
              individualAnalysisCount = analysisTypes.filter(type => resultData[type]).length;
            }
            
            if (individualAnalysisCount > 0) {
              // Distribute workflow duration across individual analyses
              const durationPerAnalysis = analysis.durationMs / individualAnalysisCount;
              totalDuration += durationPerAnalysis * individualAnalysisCount;
              durationCount += individualAnalysisCount;
            }
          } else {
            // For individual analyses, use the duration directly
            totalDuration += analysis.durationMs;
            durationCount++;
          }
        }
      });
      const averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;
      
      // Group by individual analysis types
      const analysisTypes = {};
      analyses.forEach(analysis => {
        const resultData = analysis.resultData || {};
        const summary = analysis.summary || {};
        const analysisType = analysis.analysisType;
        
        if (analysisType === 'comprehensive-analysis' || analysisType === 'advanced-analysis') {
          // Count individual analysis types from resultData for comprehensive analyses
          const individualTypes = ['projectAnalysis', 'codeQuality', 'security', 'performance', 'architecture', 'techStack', 'dependencies'];
          individualTypes.forEach(type => {
            if (resultData[type]) {
              const displayName = type === 'projectAnalysis' ? 'Project Analysis' :
                                type === 'codeQuality' ? 'Code Quality' :
                                type === 'techStack' ? 'Tech Stack' :
                                type.charAt(0).toUpperCase() + type.slice(1);
              
              analysisTypes[displayName] = (analysisTypes[displayName] || 0) + 1;
            }
          });
          
          // Also count from summary categories if available
          if (summary.categories) {
            Object.keys(summary.categories).forEach(category => {
              const displayName = category === 'projectAnalysis' ? 'Project Analysis' :
                                category === 'codeQuality' ? 'Code Quality' :
                                category === 'techStack' ? 'Tech Stack' :
                                category.charAt(0).toUpperCase() + category.slice(1);
              
              analysisTypes[displayName] = (analysisTypes[displayName] || 0) + 1;
            });
          }
        } else {
          // Count individual analysis records by their type
          const displayName = analysisType === 'codeQuality' ? 'Code Quality' :
                            analysisType === 'techStack' ? 'Tech Stack' :
                            analysisType === 'security' ? 'Security' :
                            analysisType === 'performance' ? 'Performance' :
                            analysisType === 'architecture' ? 'Architecture' :
                            analysisType === 'recommendations' ? 'Recommendations' :
                            analysisType.charAt(0).toUpperCase() + analysisType.slice(1);
          
          analysisTypes[displayName] = (analysisTypes[displayName] || 0) + 1;
        }
      });
      
      const metrics = {
        id: 'metrics',
        projectType,
        complexity,
        issues,
        suggestions,
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        successRate,
        averageDuration,
        lastAnalysisDate: latestAnalysis.createdAt,
        analysisTypes,
        overallScore: summary.overallScore || 0,
        criticalIssues: summary.criticalIssues || 0,
        warnings: summary.warnings || 0,
        recommendations: summary.recommendations?.length || 0
      };
      
      this.logger.info(`Calculated metrics successfully`);
      
      // Generate ETag for metrics data
      const etag = this.etagService.generateMetricsETag(metrics, projectId);
      
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
      
      res.json({ success: true, data: metrics });
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
      
      // Get analysis history from database
      this.logger.info(`Calling analysisRepository.findByProjectId('${projectId}')`);
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      this.logger.info(`Found ${analyses.length} analyses from repository`);
      
      // Transform to expected format (array of objects)
      const history = analyses.map(analysis => {
        // Extract data from the analysis result
        const resultData = analysis.resultData || {};
        const summary = analysis.summary || {};
        
        // Determine analysis type for display
        const analysisType = analysis.analysisType || 'unknown';
        const displayType = analysisType === 'advanced-analysis' ? 'analysis' : analysisType;
        
        // Calculate file size from data (if available)
        const dataSize = JSON.stringify(resultData).length;
        
        // Get filename from metadata or generate one
        const filename = summary.metadata?.filename || 
                        summary.metadata?.projectPath?.split('/').pop() || 
                        `${analysisType}-${analysis.id}.json`;
        
        const transformedAnalysis = {
          id: analysis.id,
          projectId: analysis.projectId,
          analysisType: analysisType,
          type: displayType, // Frontend expects 'type' field
          timestamp: analysis.createdAt,
          status: analysis.status,
          data: resultData,
          report: summary,
          metadata: summary.metadata || {},
          // Frontend-specific fields
          filename: filename,
          size: dataSize,
          completed: analysis.status === 'completed',
          error: analysis.status === 'failed' ? 'Analysis failed' : null,
          progress: analysis.status === 'completed' ? 100 : 
                   analysis.status === 'running' ? 50 : 0
        };
        
        this.logger.info(`Transformed analysis successfully`);
        return transformedAnalysis;
      });
      
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

  /**
   * Get analysis file
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisFile(req, res) {
    try {
      const { projectId, filename } = req.params;
      const content = await this.analysisOutputService.getAnalysisFile(projectId, filename);
      
      const responseData = { content, filename, projectId };

      // Generate ETag for analysis file
      const etag = this.etagService.generateETag(responseData, `analysis-file-${filename}`, projectId);
      
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
      
      res.json({ success: true, data: content });
    } catch (error) {
      this.logger.error(`Failed to get analysis file:`, error);
      res.status(404).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis from database
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisFromDatabase(req, res) {
    try {
      const { projectId } = req.params;
      const { type } = req.query;
      
      let analyses;
      if (type) {
        analyses = await this.analysisRepository.findByProjectIdAndType(projectId, type);
      } else {
        analyses = await this.analysisRepository.findByProjectId(projectId);
      }
      
      const responseData = { analyses, type, projectId };

      // Generate ETag for database analyses
      const etag = this.etagService.generateETag(responseData, `analysis-database-${type || 'all'}`, projectId);
      
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
      
      res.json({ success: true, data: analyses });
    } catch (error) {
      this.logger.error(`Failed to get analysis from database:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis issues
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisIssues(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`Getting analysis issues for project: ${projectId}`);
      
      // Get latest analysis for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        return res.json({ success: true, data: { 
          issues: [], 
          summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, byCategory: {} } 
        } });
      }
      
      const latestAnalysis = analyses[0];
      const resultData = latestAnalysis.resultData || {};
      
      // Extract ONLY issues from various analysis types
      // Don't send the entire resultData file!
      const issues = [];
      
      // Code quality issues
      if (resultData.codeQuality?.issues && Array.isArray(resultData.codeQuality.issues)) {
        issues.push(...resultData.codeQuality.issues.map(issue => ({
          id: issue.id || issue.name || `cq-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Code Quality Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'code-quality',
          source: 'code-quality',
          file: issue.file || issue.path || null,
          line: issue.line || issue.lineNumber || null,
          rule: issue.rule || issue.type || null
        })));
      }
      
      // Security issues
      if (resultData.security?.vulnerabilities && Array.isArray(resultData.security.vulnerabilities)) {
        issues.push(...resultData.security.vulnerabilities.map(issue => ({
          id: issue.id || issue.name || `sec-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Security Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'security',
          source: 'security',
          cve: issue.cve || issue.cveId || null,
          package: issue.package || issue.dependency || null,
          version: issue.version || issue.affectedVersion || null
        })));
      }
      
      // Architecture issues
      if (resultData.architecture?.violations && Array.isArray(resultData.architecture.violations)) {
        issues.push(...resultData.architecture.violations.map(issue => ({
          id: issue.id || issue.name || `arch-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Architecture Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'architecture',
          source: 'architecture',
          pattern: issue.pattern || issue.type || null,
          component: issue.component || issue.file || null
        })));
      }
      
      // Project analysis issues
      if (resultData.projectAnalysis?.issues && Array.isArray(resultData.projectAnalysis.issues)) {
        issues.push(...resultData.projectAnalysis.issues.map(issue => ({
          id: issue.id || issue.name || `proj-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Project Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'project',
          source: 'project-analysis',
          file: issue.file || issue.path || null
        })));
      }
      
      // Performance issues
      if (resultData.performance?.issues && Array.isArray(resultData.performance.issues)) {
        issues.push(...resultData.performance.issues.map(issue => ({
          id: issue.id || issue.name || `perf-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Performance Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'performance',
          source: 'performance',
          metric: issue.metric || issue.type || null,
          value: issue.value || issue.currentValue || null,
          threshold: issue.threshold || issue.targetValue || null
        })));
      }
      
      // Layer validation issues
      if (resultData.layerValidation?.violations && Array.isArray(resultData.layerValidation.violations)) {
        issues.push(...resultData.layerValidation.violations.map(issue => ({
          id: issue.id || issue.name || `layer-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Layer Validation Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'architecture',
          source: 'layer-validation',
          layer: issue.layer || issue.type || null,
          component: issue.component || issue.file || null
        })));
      }
      
      // Logic validation issues
      if (resultData.logicValidation?.violations && Array.isArray(resultData.logicValidation.violations)) {
        issues.push(...resultData.logicValidation.violations.map(issue => ({
          id: issue.id || issue.name || `logic-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Logic Validation Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'logic',
          source: 'logic-validation',
          rule: issue.rule || issue.type || null,
          component: issue.component || issue.file || null
        })));
      }
      
      // Sort by severity
      issues.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
      });
      
      const summary = {
        total: issues.length,
        bySeverity: {
          critical: issues.filter(i => i.severity === 'critical').length,
          high: issues.filter(i => i.severity === 'high').length,
          medium: issues.filter(i => i.severity === 'medium').length,
          low: issues.filter(i => i.severity === 'low').length
        },
        byCategory: {
          'code-quality': issues.filter(i => i.category === 'code-quality').length,
          security: issues.filter(i => i.category === 'security').length,
          architecture: issues.filter(i => i.category === 'architecture').length,
          logic: issues.filter(i => i.category === 'logic').length,
          project: issues.filter(i => i.category === 'project').length,
          performance: issues.filter(i => i.category === 'performance').length
        }
      };
      
      this.logger.info(`Issues data extracted, count: ${issues.length}`);
      
      const issuesData = { issues, summary };
      
      // Generate ETag for issues data
      const etag = this.etagService.generateETag(issuesData, 'analysis-issues', projectId);
      
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
      
      res.json({ success: true, data: issuesData });
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
      
      // Get latest analysis for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      if (analyses.length === 0) {
        return res.json({ success: true, data: { 
          dependencies: { direct: {}, dev: {}, outdated: [] },
          structure: { projectType: 'unknown', fileTypes: {}, frameworks: [], libraries: [] }
        } });
      }
      
      // Look for techstack-specific analysis first
      let techStackAnalysis = analyses.find(a => a.analysisType === 'techstack');
      
      // If no specific techstack analysis, look for comprehensive analysis
      if (!techStackAnalysis) {
        techStackAnalysis = analyses.find(a => 
          a.analysisType === 'comprehensive-analysis' || 
          a.analysisType === 'advanced-analysis'
        );
      }
      
      if (!techStackAnalysis) {
        this.logger.warn(`No tech stack analysis found for project`);
        return res.json({ success: true, data: { 
          dependencies: { direct: {}, dev: {}, outdated: [] },
          structure: { projectType: 'unknown', fileTypes: {}, frameworks: [], libraries: [] }
        } });
      }
      
      const resultData = techStackAnalysis.resultData || {};
      const summary = techStackAnalysis.summary || {};
      
      // For individual techstack analysis, the data is directly in resultData
      // For comprehensive analysis, it's nested under techStack key
      let techStackData = resultData;
      
      if (techStackAnalysis.analysisType === 'comprehensive-analysis' || 
          techStackAnalysis.analysisType === 'advanced-analysis') {
        techStackData = resultData.techStack || resultData;
      }
      
      // Convert frameworks and libraries to dependencies format
      const directDeps = {};
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
      
      // Set ETag for caching
      this.setETagHeaders(res, 'analysis-techstack', projectId, extractedData);
      
      res.json({ success: true, data: extractedData });
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
      
      // Get latest analysis for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        return res.json({ success: true, data: { 
          structure: { layers: 0, modules: 0, patterns: [] },
          dependencies: { circular: false, count: 0, graph: null },
          metrics: { coupling: 'unknown', cohesion: 'unknown', complexity: 'unknown', maintainability: 'unknown', testability: 'unknown' },
          patterns: [],
          antiPatterns: [],
          recommendations: []
        } });
      }
      
      // Look for architecture-specific analysis first
      let architectureAnalysis = analyses.find(a => a.analysisType === 'architecture');
      
      // If no specific architecture analysis, look for comprehensive analysis
      if (!architectureAnalysis) {
        architectureAnalysis = analyses.find(a => 
          a.analysisType === 'comprehensive-analysis' || 
          a.analysisType === 'advanced-analysis'
        );
      }
      
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
      
      // For individual architecture analysis, the data is directly in resultData
      // For comprehensive analysis, it's nested under architecture key
      let architectureData = resultData;
      
      if (architectureAnalysis.analysisType === 'comprehensive-analysis' || 
          architectureAnalysis.analysisType === 'advanced-analysis') {
        architectureData = resultData.architecture || resultData;
      }
      
      // Extract and structure the data
      const extractedData = {
        structure: {
          layers: architectureData.structure?.layers || architectureData.layers || 0,
          modules: architectureData.structure?.modules || architectureData.modules || 0,
          patterns: architectureData.structure?.patterns || architectureData.patterns || []
        },
        dependencies: {
          circular: architectureData.dependencies?.circular || architectureData.circular || false,
          count: architectureData.dependencies?.count || architectureData.dependencyCount || 0,
          graph: architectureData.dependencies?.graph || architectureData.graph || null
        },
        metrics: {
          coupling: architectureData.metrics?.coupling || architectureData.coupling || 'unknown',
          cohesion: architectureData.metrics?.cohesion || architectureData.cohesion || 'unknown',
          complexity: architectureData.metrics?.complexity || architectureData.complexity || 'unknown',
          maintainability: architectureData.metrics?.maintainability || architectureData.maintainability || 'unknown',
          testability: architectureData.metrics?.testability || architectureData.testability || 'unknown'
        },
        patterns: architectureData.patterns || [],
        antiPatterns: architectureData.antiPatterns || architectureData.antiPatterns || [],
        recommendations: architectureData.recommendations || []
      };
      
      this.logger.info(`Architecture data extracted successfully`);
      
      // Set ETag for caching
      this.setETagHeaders(res, 'analysis-architecture', projectId, extractedData);
      
      res.json({ success: true, data: extractedData });
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
   * Get analysis charts data
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisCharts(req, res) {
    try {
      const { projectId } = req.params;
      const { type = 'trends' } = req.query;
      
      this.logger.info(`Getting analysis charts for project, type: ${type}`);
      
      // Get all analyses for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        return res.json({ success: true, data: { trends: [], metrics: {}, distributions: {} } });
      }
      
      // Generate chart data based on type
      let chartData = {};
      
      switch (type) {
        case 'trends':
          chartData = this.generateTrendsData(analyses);
          break;
        case 'metrics':
          chartData = this.generateMetricsData(analyses);
          break;
        case 'distributions':
          chartData = this.generateDistributionsData(analyses);
          break;
        default:
          chartData = this.generateTrendsData(analyses);
      }
      
      // Generate ETag for charts data
      const etag = this.etagService.generateChartsETag(chartData, projectId, type);
      
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
      
      res.json({ success: true, data: chartData });
    } catch (error) {
      this.logger.error(`Failed to get analysis charts:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Generate trends data for charts
   * @param {Array} analyses - Array of analyses
   * @returns {Object} Trends data
   */
  generateTrendsData(analyses) {
    const trends = analyses.map(analysis => {
      const resultData = analysis.resultData || {};
      const summary = analysis.summary || {};
      
      return {
        date: analysis.createdAt,
        overallScore: summary.overallScore || 0,
        issuesCount: summary.criticalIssues || 0,
        recommendationsCount: summary.recommendations || 0,
        analysisType: analysis.analysisType || 'unknown'
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return { trends };
  }

  /**
   * Generate metrics data for charts
   * @param {Array} analyses - Array of analyses
   * @returns {Object} Metrics data
   */
  generateMetricsData(analyses) {
    if (analyses.length === 0) return {};
    
    const latestAnalysis = analyses[0];
    const resultData = latestAnalysis.resultData || {};
    const summary = latestAnalysis.summary || {};
    
    return {
      metrics: {
        overallScore: summary.overallScore || 0,
        totalAnalyses: summary.totalAnalyses || analyses.length,
        successfulAnalyses: summary.successfulAnalyses || analyses.filter(a => a.status === 'completed').length,
        criticalIssues: summary.criticalIssues || 0,
        recommendations: summary.recommendations || 0
      }
    };
  }

  /**
   * Generate distributions data for charts
   * @param {Array} analyses - Array of analyses
   * @returns {Object} Distributions data
   */
  generateDistributionsData(analyses) {
    if (analyses.length === 0) return {};
    
    const latestAnalysis = analyses[0];
    const resultData = latestAnalysis.resultData || {};
    
    return {
      distributions: {
        issuesBySeverity: {
          critical: resultData.codeQuality?.issues?.filter(i => i.severity === 'critical')?.length || 0,
          high: resultData.codeQuality?.issues?.filter(i => i.severity === 'high')?.length || 0,
          medium: resultData.codeQuality?.issues?.filter(i => i.severity === 'medium')?.length || 0,
          low: resultData.codeQuality?.issues?.filter(i => i.severity === 'low')?.length || 0
        },
        recommendationsByPriority: {
          critical: 1, // From your data
          high: 3,
          medium: 3,
          low: 1
        }
      }
    };
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
      
      // Get latest analysis for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        return res.json({ success: true, data: { recommendations: [], insights: [] } });
      }
      
      // Look for recommendations-specific analysis first
      let recommendationsAnalysis = analyses.find(a => a.analysisType === 'recommendations');
      
      // If no specific recommendations analysis, look for comprehensive analysis
      if (!recommendationsAnalysis) {
        recommendationsAnalysis = analyses.find(a => 
          a.analysisType === 'comprehensive-analysis' || 
          a.analysisType === 'advanced-analysis'
        );
      }
      
      if (!recommendationsAnalysis) {
        this.logger.warn(`No recommendations analysis found for project`);
        return res.json({ success: true, data: { recommendations: [], insights: [] } });
      }
      
      const resultData = recommendationsAnalysis.resultData || {};
      const summary = recommendationsAnalysis.summary || {};
      
      // For individual recommendations analysis, the data is directly in resultData
      // For comprehensive analysis, it's nested under recommendations key
      let recommendationsData = resultData;
      
      if (recommendationsAnalysis.analysisType === 'comprehensive-analysis' || 
          recommendationsAnalysis.analysisType === 'advanced-analysis') {
        recommendationsData = resultData.recommendations || resultData;
      }
      
      // Extract and structure the data - ensure we return an object with recommendations array
      const extractedData = {
        recommendations: Array.isArray(recommendationsData.recommendations) ? recommendationsData.recommendations : 
                        Array.isArray(recommendationsData) ? recommendationsData : [],
        insights: Array.isArray(recommendationsData.insights) ? recommendationsData.insights : []
      };
      
      this.logger.info(`Recommendations data extracted successfully`);
      
      // Set ETag for caching
      this.setETagHeaders(res, 'analysis-recommendations', projectId, extractedData);
      
      res.json({ success: true, data: extractedData });
    } catch (error) {
      this.logger.error(`Failed to get recommendations analysis:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations analysis',
        message: error.message
      });
    }
  }



  /**
   * Get code quality analysis data (GET - no analysis)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getCodeQualityAnalysis(req, res) {
    try {
      const { projectId } = req.params;

      this.logger.info(`Getting code quality analysis data`);

      // Get latest analysis from database
      const latest = await this.analysisRepository.findLatestByProjectId(projectId);
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
          issues: analysis.issues.length,
          recommendations: analysis.recommendations.length,
          configuration: analysis.configuration
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
   * Get security analysis data (GET - no analysis)
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
   * Get performance analysis data (GET - no analysis)
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
   * Get architecture analysis data (GET - no analysis)
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
   * Set ETag headers for caching
   * @param {Object} res - Express response
   * @param {string} type - Data type
   * @param {string} projectId - Project ID
   * @param {Object} data - Data to cache
   */
  setETagHeaders(res, type, projectId, data) {
    if (!this.etagService) {
      return;
    }
    
    try {
      const etag = this.etagService.generateETag(data, type, projectId);
      this.etagService.setETagHeaders(res, etag, {
        maxAge: 300, // 5 minutes
        mustRevalidate: true,
        isPublic: false
      });
    } catch (error) {
      this.logger.warn(`Failed to set ETag headers: ${error.message}`);
    }
  }
}

// Hilfsfunktion: Prüfe, ob Analyse aktuell ist (z.B. < 10 Minuten alt)
function isAnalysisFresh(analysis, maxAgeMinutes = 10) {
  if (!analysis || !analysis.timestamp) return false;
  const now = Date.now();
  const ts = new Date(analysis.timestamp).getTime();
  return (now - ts) < maxAgeMinutes * 60 * 1000;
}

module.exports = AnalysisController; 