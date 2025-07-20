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
    try {
      const { projectId } = req.params;
      
      this.logger.info(`📊 Getting analysis status for project: ${projectId}`);
      
      // Use Application Service for status
      const status = await this.analysisApplicationService.getAnalysisStatus(projectId);
      
      res.json({
        success: true,
        data: status,
        projectId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
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
    try {
      const { projectId } = req.params;
      const { limit = '10', offset = '0', types } = req.query;
      
      this.logger.info(`📚 Getting analysis history for project: ${projectId}`);
      
      // Parse query parameters
      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);
      const analysisTypes = types ? types.split(',') : undefined;
      
      // Use Application Service for history
      const history = await this.analysisApplicationService.getAnalysisHistory(projectId, {
        limit: parsedLimit,
        offset: parsedOffset,
        types: analysisTypes
      });
      
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
    try {
      const { projectId } = req.params;
      const { type = 'code-quality' } = req.query;
      
      this.logger.info(`🔍 Getting analysis issues for project: ${projectId}, type: ${type}`);
      
      // Use Application Service for issues
      const issues = await this.analysisApplicationService.getAnalysisIssues(projectId, type);
      
      res.json({
        success: true,
        data: issues,
        projectId,
        analysisType: type,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
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