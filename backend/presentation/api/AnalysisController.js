/**
 * AnalysisController - API controller for analysis data retrieval
 * Enhanced with memory management and queue integration
 * 
 * RESPONSIBILITIES:
 * ✅ GET cached analysis data via Application Service
 * ✅ GET analysis status and metrics via Application Service
 * ✅ GET analysis history via Application Service
 * ✅ GET analysis issues and recommendations via Application Service
 * 
 * ❌ DOES NOT execute analyses (that's done by Steps via WorkflowController)
 * 
 * LAYER COMPLIANCE FIXED:
 * ✅ Uses AnalysisApplicationService (Application layer)
 * ✅ No direct repository or domain service access
 * ✅ Proper DDD layer separation maintained
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('AnalysisController');

class AnalysisController {
  constructor(analysisApplicationService) {
    this.analysisApplicationService = analysisApplicationService;
    this.logger = logger;
    
    // Request deduplication to prevent double execution
    this.activeRequests = new Map();
    this.requestTimeout = 5000; // 5 seconds
  }

  /**
   * Generate request key for deduplication
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} params - Request parameters
   * @returns {string} Request key
   */
  generateRequestKey(method, url, params = {}) {
    const paramString = JSON.stringify(params);
    return `${method}:${url}:${paramString}`;
  }

  /**
   * Check if request is already in progress
   * @param {string} requestKey - Request key
   * @returns {boolean} Whether request is active
   */
  isRequestActive(requestKey) {
    const activeRequest = this.activeRequests.get(requestKey);
    if (!activeRequest) return false;
    
    // Check if request has timed out
    if (Date.now() - activeRequest.timestamp > this.requestTimeout) {
      this.activeRequests.delete(requestKey);
      return false;
    }
    
    return true;
  }

  /**
   * Mark request as active
   * @param {string} requestKey - Request key
   */
  markRequestActive(requestKey) {
    this.activeRequests.set(requestKey, {
      timestamp: Date.now()
    });
  }

  /**
   * Mark request as completed
   * @param {string} requestKey - Request key
   */
  markRequestCompleted(requestKey) {
    this.activeRequests.delete(requestKey);
  }

  /**
   * GET /api/analysis/:projectId - Get cached analysis data
   */
  async getAnalysisData(req, res) {
    try {
      const { projectId } = req.params;
      const { types, cache = 'true', memoryLimit } = req.query;
      
      this.logger.info(`🔍 Getting analysis data for project: ${projectId}`);
      
      // Parse query parameters
      const analysisTypes = types ? types.split(',') : undefined;
      const useCache = cache === 'true';
      const parsedMemoryLimit = memoryLimit ? parseInt(memoryLimit) : undefined;
      
      // Use Application Service for analysis data
      const result = await this.analysisApplicationService.getAnalysisData({
        projectId,
        types: analysisTypes,
        useCache,
        memoryLimit: parsedMemoryLimit
      });
      
      // Generate ETag for caching
      const etag = this.analysisApplicationService.generateETag(result);
      
      // Check client ETag
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      
      // Return analysis data with proper headers
      res.set('ETag', etag);
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      
      res.json({
        success: true,
        data: result,
        projectId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis data',
        message: error.message
      });
    }
  }

  /**
   * GET /api/analysis/:projectId/status - Get analysis status and metrics
   */
  async getAnalysisStatus(req, res) {
    const requestKey = this.generateRequestKey('GET', req.originalUrl, req.params);
    
    // Check for duplicate requests
    if (this.isRequestActive(requestKey)) {
      this.logger.warn(`📊 Duplicate request detected for status: ${requestKey}`);
      return res.status(409).json({
        success: false,
        error: 'Request already in progress',
        message: 'Another request for the same data is currently being processed'
      });
    }
    
    try {
      this.markRequestActive(requestKey);
      const { projectId } = req.params;
      
      this.logger.info(`📊 Getting analysis status for project: ${projectId}`);
      
      // Validate Application Service
      if (!this.analysisApplicationService) {
        throw new Error('AnalysisApplicationService not available');
      }
      
      if (typeof this.analysisApplicationService.getAnalysisStatus !== 'function') {
        throw new Error('AnalysisApplicationService.getAnalysisStatus method not available');
      }
      
      // Use Application Service for status
      const status = await this.analysisApplicationService.getAnalysisStatus(projectId);
      
      this.markRequestCompleted(requestKey);
      res.json({
        success: true,
        data: status,
        projectId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.markRequestCompleted(requestKey);
      this.logger.error('❌ Failed to get analysis status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis status',
        message: error.message
      });
    }
  }

  /**
   * GET /api/analysis/:projectId/history - Get analysis history
   */
  async getAnalysisHistory(req, res) {
    const requestKey = this.generateRequestKey('GET', req.originalUrl, { ...req.params, ...req.query });
    
    // Check for duplicate requests
    if (this.isRequestActive(requestKey)) {
      this.logger.warn(`📚 Duplicate request detected for history: ${requestKey}`);
      return res.status(409).json({
        success: false,
        error: 'Request already in progress',
        message: 'Another request for the same data is currently being processed'
      });
    }
    
    try {
      this.markRequestActive(requestKey);
      const { projectId } = req.params;
      const { limit = '10', offset = '0', types } = req.query;
      
      this.logger.info(`📚 Getting analysis history for project: ${projectId}`);
      
      // Parse query parameters
      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);
      const analysisTypes = types ? types.split(',') : undefined;
      
      // Validate Application Service
      if (!this.analysisApplicationService) {
        throw new Error('AnalysisApplicationService not available');
      }
      
      if (typeof this.analysisApplicationService.getAnalysisHistory !== 'function') {
        throw new Error('AnalysisApplicationService.getAnalysisHistory method not available');
      }
      
      // Use Application Service for history
      const history = await this.analysisApplicationService.getAnalysisHistory(projectId, {
        limit: parsedLimit,
        offset: parsedOffset,
        types: analysisTypes
      });
      
      this.markRequestCompleted(requestKey);
      res.json({
        success: true,
        data: {
          history,
          pagination: {
            limit: parsedLimit,
            offset: parsedOffset,
            total: history.length
          }
        },
        projectId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.markRequestCompleted(requestKey);
      this.logger.error('❌ Failed to get analysis history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis history',
        message: error.message
      });
    }
  }

  /**
   * GET /api/analysis/:projectId/issues - Get analysis issues and recommendations
   */
  async getAnalysisIssues(req, res) {
    const requestKey = this.generateRequestKey('GET', req.originalUrl, { ...req.params, ...req.query });
    
    // Check for duplicate requests
    if (this.isRequestActive(requestKey)) {
      this.logger.warn(`🔍 Duplicate request detected for issues: ${requestKey}`);
      return res.status(409).json({
        success: false,
        error: 'Request already in progress',
        message: 'Another request for the same data is currently being processed'
      });
    }
    
    try {
      this.markRequestActive(requestKey);
      const { projectId } = req.params;
      const { type = 'code-quality' } = req.query;
      
      this.logger.info(`🔍 Getting analysis issues for project: ${projectId}, type: ${type}`);
      
      // Validate Application Service
      if (!this.analysisApplicationService) {
        throw new Error('AnalysisApplicationService not available');
      }
      
      if (typeof this.analysisApplicationService.getAnalysisIssues !== 'function') {
        throw new Error('AnalysisApplicationService.getAnalysisIssues method not available');
      }
      
      // Use Application Service for issues
      const issues = await this.analysisApplicationService.getAnalysisIssues(projectId, type);
      
      this.markRequestCompleted(requestKey);
      res.json({
        success: true,
        data: issues,
        projectId,
        analysisType: type,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.markRequestCompleted(requestKey);
      this.logger.error('❌ Failed to get analysis issues:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis issues',
        message: error.message
      });
    }
  }

  /**
   * POST /api/analysis/:projectId/request - Request new analysis (lightweight endpoint)
   */
  async requestAnalysis(req, res) {
    try {
      const { projectId } = req.params;
      const { types = ['code-quality'], options = {} } = req.body;
      
      this.logger.info(`🚀 Analysis requested for project: ${projectId}, types: ${types.join(', ')}`);
      
      // Note: Actual analysis execution should be handled by WorkflowController
      // This is just a request acknowledgment
      res.json({
        success: true,
        message: 'Analysis request received. Use WorkflowController for execution.',
        data: {
          projectId,
          requestedTypes: types,
          status: 'queued',
          recommendation: 'Use POST /api/workflow/execute for actual analysis execution'
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('❌ Failed to process analysis request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process analysis request',
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/metrics - Get analysis metrics
   */
  async getAnalysisMetrics(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`📊 Getting analysis metrics for project: ${projectId}`);
      
      // Use Application Service to get real metrics from database
      const metrics = await this.analysisApplicationService.getAnalysisMetrics(projectId);
      
      res.json({
        success: true,
        data: metrics,
        projectId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis metrics',
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/database - Get analysis from database
   */
  async getAnalysisFromDatabase(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`🗄️ Getting analysis from database for project: ${projectId}`);
      
      // Use Application Service for database analysis
      const analysis = await this.analysisApplicationService.getAnalysisFromDatabase(projectId);
      
      res.json({
        success: true,
        data: analysis,
        projectId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis from database:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis from database',
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/files/:filename - Get analysis file
   */
  async getAnalysisFile(req, res) {
    try {
      const { projectId, filename } = req.params;
      
      this.logger.info(`📁 Getting analysis file for project: ${projectId}, file: ${filename}`);
      
      // Use Application Service for file retrieval
      const file = await this.analysisApplicationService.getAnalysisFile(projectId, filename);
      
      res.json({
        success: true,
        data: file,
        projectId,
        filename,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis file',
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/techstack - Get analysis tech stack
   */
  async getAnalysisTechStack(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`🔧 Getting analysis tech stack for project: ${projectId}`);
      
      // Use Application Service to get real tech stack data from database
      const techStack = await this.analysisApplicationService.getAnalysisTechStack(projectId);
      
      res.json({
        success: true,
        data: techStack,
        projectId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis tech stack:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis tech stack',
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/architecture - Get analysis architecture
   */
  async getAnalysisArchitecture(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`🏗️ Getting analysis architecture for project: ${projectId}`);
      
      // Validate Application Service
      if (!this.analysisApplicationService) {
        throw new Error('AnalysisApplicationService not available');
      }
      
      if (typeof this.analysisApplicationService.getAnalysisArchitecture !== 'function') {
        throw new Error('AnalysisApplicationService.getAnalysisArchitecture method not available');
      }
      
      // Use Application Service for architecture
      const architecture = await this.analysisApplicationService.getAnalysisArchitecture(projectId);
      
      res.json({
        success: true,
        data: architecture,
        projectId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis architecture:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis architecture',
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/recommendations - Get analysis recommendations
   */
  async getAnalysisRecommendations(req, res) {
    const requestKey = this.generateRequestKey('GET', req.originalUrl, req.params);
    
    // Check for duplicate requests
    if (this.isRequestActive(requestKey)) {
      this.logger.warn(`💡 Duplicate request detected for recommendations: ${requestKey}`);
      return res.status(409).json({
        success: false,
        error: 'Request already in progress',
        message: 'Another request for the same data is currently being processed'
      });
    }
    
    try {
      this.markRequestActive(requestKey);
      const { projectId } = req.params;
      
      this.logger.info(`💡 Getting analysis recommendations for project: ${projectId}`);
      
      // Validate Application Service
      if (!this.analysisApplicationService) {
        throw new Error('AnalysisApplicationService not available');
      }
      
      if (typeof this.analysisApplicationService.getAnalysisRecommendations !== 'function') {
        throw new Error('AnalysisApplicationService.getAnalysisRecommendations method not available');
      }
      
      // Use Application Service to get real recommendations from database
      const recommendations = await this.analysisApplicationService.getAnalysisRecommendations(projectId);
      
      this.markRequestCompleted(requestKey);
      res.json({
        success: true,
        data: recommendations,
        projectId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.markRequestCompleted(requestKey);
      this.logger.error('❌ Failed to get analysis recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis recommendations',
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/charts/:type - Get analysis charts
   */
  async getAnalysisCharts(req, res) {
    try {
      const { projectId, type } = req.params;
      
      this.logger.info(`📈 Getting analysis charts for project: ${projectId}, type: ${type}`);
      
      // Validate Application Service
      if (!this.analysisApplicationService) {
        throw new Error('AnalysisApplicationService not available');
      }
      
      if (typeof this.analysisApplicationService.getAnalysisCharts !== 'function') {
        throw new Error('AnalysisApplicationService.getAnalysisCharts method not available');
      }
      
      // Use Application Service for charts
      const charts = await this.analysisApplicationService.getAnalysisCharts(projectId, type);
      
      res.json({
        success: true,
        data: charts,
        projectId,
        chartType: type,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis charts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis charts',
        message: error.message
      });
    }
  }

  /**
   * GET /api/analysis/health - Get controller health status
   */
  async getHealth(req, res) {
    try {
      const health = {
        status: 'healthy',
        controller: 'AnalysisController',
        services: {
          analysisApplicationService: !!this.analysisApplicationService
        },
        architecture: 'DDD-compliant',
        layerCompliance: 'Uses Application Service layer',
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: health
      });
      
    } catch (error) {
      this.logger.error('❌ Health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error.message
      });
    }
  }
}

module.exports = AnalysisController; 