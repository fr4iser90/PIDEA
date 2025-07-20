/**
 * AnalysisApplicationService - Application layer service for analysis operations
 * 
 * RESPONSIBILITIES:
 * ✅ Coordinate analysis use cases
 * ✅ Handle analysis data retrieval and caching
 * ✅ Manage analysis status and metrics
 * ✅ Orchestrate memory optimization and queue management
 * 
 * LAYER COMPLIANCE:
 * ✅ Application layer - coordinates between Presentation and Domain
 * ✅ Uses Domain services and Infrastructure repositories through interfaces
 * ✅ Handles DTOs and use case orchestration
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const ETagService = require('@domain/services/ETagService');
const AnalysisResult = require('@domain/entities/AnalysisResult');
const AnalysisQueueService = require('@domain/services/AnalysisQueueService');
const MemoryOptimizedAnalysisService = require('@domain/services/MemoryOptimizedAnalysisService');

class AnalysisApplicationService {
  constructor({
    analysisOutputService,
    analysisRepository,
    projectRepository,
    logger
  }) {
    // Domain services
    this.analysisOutputService = analysisOutputService;
    
    // Infrastructure repositories (accessed through domain interfaces)
    this.analysisRepository = analysisRepository;
    this.projectRepository = projectRepository;
    
    // Application services
    this.logger = logger || new ServiceLogger('AnalysisApplicationService');
    this.etagService = new ETagService();
    
    // Initialize memory management and queue services
    this.analysisQueueService = new AnalysisQueueService({
      logger: this.logger,
      maxMemoryUsage: 512,
      enableMemoryMonitoring: true,
      enableSelectiveAnalysis: true,
      enableEnhancedTimeouts: true,
      enableResultStreaming: true,
      enableMemoryLogging: true,
      enableProgressiveDegradation: true
    });
    
    this.memoryOptimizedService = new MemoryOptimizedAnalysisService({
      logger: this.logger,
      maxMemoryUsage: 512,
      enableGarbageCollection: true,
      enableStreaming: true,
      enableEnhancedTimeouts: true,
      enableResultStreaming: true,
      enableMemoryLogging: true,
      enableProgressiveDegradation: true,
      timeoutPerAnalysisType: {
        'code-quality': 2 * 60 * 1000,
        'security': 3 * 60 * 1000,
        'performance': 4 * 60 * 1000,
        'architecture': 5 * 60 * 1000,
        'techstack': 3 * 60 * 1000,
        'recommendations': 2 * 60 * 1000
      }
    });
  }

  /**
   * Get project path from database
   * @param {string} projectId - Project identifier
   * @returns {Promise<string>} Project workspace path
   */
  async getProjectPath(projectId) {
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
  }

  /**
   * Get analysis data with caching and optimization
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} Analysis result
   */
  async getAnalysisData(params) {
    const { projectId, types, useCache = true, memoryLimit } = params;
    
    try {
      this.logger.info(`🔍 Getting analysis data for project: ${projectId}`);
      
      // Get project path
      const projectPath = await this.getProjectPath(projectId);
      
      // Check cache if enabled
      if (useCache) {
        const cachedResult = await this.analysisRepository.getCachedAnalysis(projectId, types);
        if (cachedResult) {
          this.logger.info('✅ Returning cached analysis result');
          return cachedResult;
        }
      }
      
      // Perform analysis with memory optimization
      const analysisOptions = {
        projectPath,
        projectId,
        types: types || ['code-quality', 'security', 'performance', 'architecture'],
        memoryLimit: memoryLimit || 512,
        enableStreaming: true,
        enableMemoryMonitoring: true
      };
      
      const result = await this.memoryOptimizedService.performAnalysis(analysisOptions);
      
      // Cache result
      if (useCache && result) {
        await this.analysisRepository.cacheAnalysis(projectId, types, result);
      }
      
      return result;
      
    } catch (error) {
      this.logger.error('❌ Analysis failed:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Get analysis status and metrics
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Analysis status
   */
  async getAnalysisStatus(projectId) {
    try {
      const queueStatus = await this.analysisQueueService.getQueueStatus();
      const projectAnalysis = await this.analysisRepository.getLatestAnalysis(projectId);
      
      return {
        queueStatus,
        projectAnalysis: projectAnalysis ? {
          id: projectAnalysis.id,
          status: projectAnalysis.status,
          progress: projectAnalysis.progress,
          completedAt: projectAnalysis.completedAt,
          duration: projectAnalysis.duration
        } : null,
        memoryUsage: await this.memoryOptimizedService.getMemoryMetrics()
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis status:', error);
      throw new Error(`Failed to get analysis status: ${error.message}`);
    }
  }

  /**
   * Get analysis history for project
   * @param {string} projectId - Project identifier
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Analysis history
   */
  async getAnalysisHistory(projectId, options = {}) {
    try {
      const { limit = 10, offset = 0, types } = options;
      
      const history = await this.analysisRepository.getAnalysisHistory(projectId, {
        limit,
        offset,
        types
      });
      
      return history.map(analysis => ({
        id: analysis.id,
        type: analysis.type,
        status: analysis.status,
        createdAt: analysis.createdAt,
        completedAt: analysis.completedAt,
        duration: analysis.duration,
        summary: analysis.summary
      }));
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis history:', error);
      throw new Error(`Failed to get analysis history: ${error.message}`);
    }
  }

  /**
   * Get analysis issues and recommendations
   * @param {string} projectId - Project identifier
   * @param {string} analysisType - Type of analysis
   * @returns {Promise<Object>} Issues and recommendations
   */
  async getAnalysisIssues(projectId, analysisType = 'code-quality') {
    try {
      const latestAnalysis = await this.analysisRepository.getLatestAnalysis(projectId, analysisType);
      
      if (!latestAnalysis) {
        return {
          issues: [],
          recommendations: [],
          summary: null
        };
      }
      
      return {
        issues: latestAnalysis.issues || [],
        recommendations: latestAnalysis.recommendations || [],
        summary: latestAnalysis.summary,
        analysisId: latestAnalysis.id,
        completedAt: latestAnalysis.completedAt
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis issues:', error);
      throw new Error(`Failed to get analysis issues: ${error.message}`);
    }
  }

  /**
   * Generate ETag for caching
   * @param {Object} data - Data to generate ETag for
   * @returns {string} ETag value
   */
  generateETag(data) {
    return this.etagService.generate(data);
  }

  /**
   * Validate ETag for conditional requests
   * @param {string} etag - ETag from request
   * @param {Object} data - Current data
   * @returns {boolean} Whether ETag matches
   */
  validateETag(etag, data) {
    return this.etagService.validate(etag, data);
  }
}

module.exports = AnalysisApplicationService; 