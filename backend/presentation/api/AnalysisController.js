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
  constructor(analysisApplicationService, workflowController = null) {
    this.analysisApplicationService = analysisApplicationService;
    this.workflowController = workflowController;
    this.logger = new Logger('AnalysisController');
    this.activeRequests = new Map();
    this.requestTimeout = 30000; // 30 seconds
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
   * GET /api/projects/:projectId/analysis/techstack - Get analysis tech stack data
   */
  async getAnalysisTechStack(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`🔧 Getting analysis tech stack for project: ${projectId}`);
      
      // Use Application Service for tech stack data
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
   * GET /api/projects/:projectId/analysis/architecture - Get analysis architecture data
   */
  async getAnalysisArchitecture(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`🏗️ Getting analysis architecture for project: ${projectId}`);
      
      // Use Application Service for architecture data
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
   * GET /api/projects/:projectId/analysis/charts/:type - Get analysis charts data
   */
  async getAnalysisCharts(req, res) {
    try {
      const { projectId, type } = req.params;
      
      this.logger.info(`📊 Getting analysis charts for project: ${projectId}, type: ${type}`);
      
      // Use Application Service for charts data
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
   * GET /api/projects/:projectId/analysis/files/:filename - Get analysis file
   */
  async getAnalysisFile(req, res) {
    try {
      const { projectId, filename } = req.params;
      
      this.logger.info(`📄 Getting analysis file for project: ${projectId}, file: ${filename}`);
      
      // Use Application Service for file data
      const fileData = await this.analysisApplicationService.getAnalysisFile(projectId, filename);
      
      res.json({
        success: true,
        data: fileData,
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
   * POST /api/projects/:projectId/analysis/execute - Execute analysis workflow (for complex runs)
   * This is for "Run All Analysis" and complex workflows that need StepRegistry
   */
  async executeAnalysisWorkflow(req, res) {
    try {
      const { projectId } = req.params;
      const { analysisType, options = {} } = req.body || {};
      
      this.logger.info(`🚀 Executing analysis workflow for project: ${projectId}, type: ${analysisType || 'comprehensive'}`);
      
      // If no analysisType is provided, default to comprehensive analysis
      const finalAnalysisType = analysisType || 'comprehensive';
      
      // Check if we have a workflowController injected
      if (!this.workflowController) {
        this.logger.error('❌ WorkflowController not available in AnalysisController');
        return res.status(500).json({
          success: false,
          error: 'WorkflowController not available',
          message: 'AnalysisController was not properly initialized with WorkflowController dependency'
        });
      }
      
      // Set the mode for workflow execution
      req.body = req.body || {};
      // Don't add -analysis suffix if it's already an analysis type
      req.body.mode = finalAnalysisType.includes('-analysis') ? finalAnalysisType : `${finalAnalysisType}-analysis`;
      req.body.projectId = projectId;
      
      // Delegate to the injected WorkflowController for sequential execution
      return await this.workflowController.executeWorkflow(req, res);
      
    } catch (error) {
      this.logger.error('❌ Failed to execute analysis workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute analysis workflow',
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

  // ========================================
  // CATEGORY-BASED METHODS - NEW STRUCTURE
  // ========================================

  /**
   * Map API category to database analysis type
   * @param {string} category - API category (security, code-quality, etc.)
   * @returns {string} Database analysis type
   */
  mapCategoryToAnalysisType(category) {
    const categoryMapping = {
      'security': 'SecurityAnalysisOrchestrator',
      'code-quality': 'CodeQualityAnalysisOrchestrator',
      'architecture': 'ArchitectureAnalysisOrchestrator',
      'performance': 'PerformanceAnalysisOrchestrator',
      'tech-stack': 'TechStackAnalysisOrchestrator',
      'dependencies': 'DependencyAnalysisOrchestrator',
      'manifest': 'ManifestAnalysisOrchestrator'
    };
    
    const mappedType = categoryMapping[category] || category;
    this.logger.info(`🔍 [AnalysisController] Mapping category '${category}' to analysis type: '${mappedType}'`);
    
    return mappedType;
  }

  /**
   * Map database analysis type to API category
   * @param {string} analysisType - Database analysis type
   * @returns {string} API category
   */
  mapAnalysisTypeToCategory(analysisType) {
    const analysisTypeMapping = {
      'SecurityAnalysisOrchestrator': 'security',
      'CodeQualityAnalysisOrchestrator': 'code-quality',
      'ArchitectureAnalysisOrchestrator': 'architecture',
      'PerformanceAnalysisOrchestrator': 'performance',
      'TechStackAnalysisOrchestrator': 'tech-stack',
      'DependencyAnalysisOrchestrator': 'dependencies',
      'ManifestAnalysisOrchestrator': 'manifest'
    };
    
    return analysisTypeMapping[analysisType] || analysisType;
  }

  /**
   * Helper method to get analyses from database
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of analyses
   */
  async getAnalysesFromDatabase(projectId) {
    try {
      logger.debug(`🔍 [AnalysisController] Getting analysis from database for project: ${projectId}`);
      
      const result = await this.analysisApplicationService.getAnalysisFromDatabase(projectId);
      
      if (!result) {
        logger.warn(`⚠️ [AnalysisController] Service returned null/undefined`);
        return [];
      }
      
      if (!result.analysis) {
        logger.warn(`⚠️ [AnalysisController] Service result has no 'analysis' field`);
        return [];
      }
      
      if (!Array.isArray(result.analysis)) {
        logger.warn(`⚠️ [AnalysisController] Service result.analysis is not an array:`, typeof result.analysis);
        return [];
      }
      
      logger.debug(`✅ [AnalysisController] Returning ${result.analysis.length} analyses`);
      
      return result.analysis;
    } catch (error) {
      logger.error(`❌ [AnalysisController] Error in getAnalysesFromDatabase:`, error);
      return [];
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/:category/recommendations
   */
  async getCategoryRecommendations(req, res, category) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`💡 Getting ${category} recommendations for project: ${projectId}`);
      
      // Get all analyses for the project and filter by category
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      // Defensive check: ensure analyses is an array
      if (!analyses || !Array.isArray(analyses)) {
        this.logger.warn(`No analyses found for project: ${projectId}, returning empty recommendations`);
        return res.json({
          success: true,
          data: {
            category,
            recommendations: [],
            count: 0,
            projectId,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Filter for the specific category and extract recommendations
      const targetAnalysisType = this.mapCategoryToAnalysisType(category);
      this.logger.info(`🔍 [AnalysisController] Looking for analysis type: ${targetAnalysisType} in category: ${category}`);
      
      const categoryAnalyses = analyses.filter(a => a.analysisType === targetAnalysisType && a.status === 'completed' && a.result);
      this.logger.info(`🔍 [AnalysisController] Found ${categoryAnalyses.length} completed analyses for category ${category}`);
      
      let recommendations = [];
      if (categoryAnalyses.length > 0) {
        // Get the latest analysis for this category
        const latestAnalysis = categoryAnalyses.sort((a, b) => 
          new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
        )[0];
        
        this.logger.info(`🔍 [AnalysisController] Latest analysis for ${category}:`, {
          id: latestAnalysis.id,
          analysisType: latestAnalysis.analysisType,
          status: latestAnalysis.status,
          hasResult: !!latestAnalysis.result,
          resultKeys: latestAnalysis.result ? Object.keys(latestAnalysis.result) : 'NO_RESULT',
          resultStructure: latestAnalysis.result ? JSON.stringify(latestAnalysis.result, null, 2) : 'NO_RESULT'
        });
        
        if (latestAnalysis.result) {
          // First, try to extract from individual step details (new structure)
          if (latestAnalysis.result.details) {
            const details = latestAnalysis.result.details;
            // Aggregate recommendations from all steps in details
            for (const stepName in details) {
              const stepDetails = details[stepName];
              if (stepDetails.recommendations && Array.isArray(stepDetails.recommendations)) {
                // Filter out circular reference strings
                const validRecommendations = stepDetails.recommendations.filter(rec => 
                  typeof rec === 'object' && rec !== null && rec !== '[Circular Reference]'
                );
                recommendations.push(...validRecommendations);
              }
            }
            this.logger.info(`✅ [AnalysisController] Found ${recommendations.length} recommendations from step details`);
          }
          
          // Fallback: Check traditional structures (for backwards compatibility)
          if (recommendations.length === 0) {
            if (latestAnalysis.result.recommendations && Array.isArray(latestAnalysis.result.recommendations)) {
              // Filter out circular reference strings
              recommendations = latestAnalysis.result.recommendations.filter(rec => 
                typeof rec === 'object' && rec !== null && rec !== '[Circular Reference]'
              );
              this.logger.info(`✅ [AnalysisController] Found ${recommendations.length} recommendations in result.recommendations (filtered)`);
            } else if (latestAnalysis.result.result && latestAnalysis.result.result.recommendations && Array.isArray(latestAnalysis.result.result.recommendations)) {
              // Filter out circular reference strings
              recommendations = latestAnalysis.result.result.recommendations.filter(rec => 
                typeof rec === 'object' && rec !== null && rec !== '[Circular Reference]'
              );
              this.logger.info(`✅ [AnalysisController] Found ${recommendations.length} recommendations in result.result.recommendations (filtered)`);
            } else {
              this.logger.warn(`⚠️ [AnalysisController] No recommendations found in any structure`);
            }
          }
        }
      } else {
        this.logger.warn(`⚠️ [AnalysisController] No completed analyses found for category: ${category}`);
      }
      
      res.json({
        success: true,
        data: {
          category,
          recommendations,
          count: recommendations.length,
          projectId,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      this.logger.error(`❌ Failed to get ${category} recommendations:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to get ${category} recommendations`,
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/:category/issues
   */
  async getCategoryIssues(req, res, category) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`⚠️ Getting ${category} issues for project: ${projectId}`);
      
      // Get all analyses for the project and filter by category
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      // Defensive check: ensure analyses is an array
      if (!analyses || !Array.isArray(analyses)) {
        this.logger.warn(`No analyses found for project: ${projectId}, returning empty issues`);
        return res.json({
          success: true,
          data: {
            category,
            issues: [],
            count: 0,
            projectId,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Filter for the specific category and extract issues
      const targetAnalysisType = this.mapCategoryToAnalysisType(category);
      this.logger.info(`🔍 [AnalysisController] Looking for analysis type: ${targetAnalysisType} in category: ${category}`);
      
      const categoryAnalyses = analyses.filter(a => a.analysisType === targetAnalysisType && a.status === 'completed' && a.result);
      this.logger.info(`🔍 [AnalysisController] Found ${categoryAnalyses.length} completed analyses for category ${category}`);
      
      let issues = [];
      if (categoryAnalyses.length > 0) {
        // Get the latest analysis for this category
        const latestAnalysis = categoryAnalyses.sort((a, b) => 
          new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
        )[0];
        
        this.logger.info(`🔍 [AnalysisController] Latest analysis for ${category}:`, {
          id: latestAnalysis.id,
          analysisType: latestAnalysis.analysisType,
          status: latestAnalysis.status,
          hasResult: !!latestAnalysis.result,
          resultKeys: latestAnalysis.result ? Object.keys(latestAnalysis.result) : 'NO_RESULT'
        });
        
        if (latestAnalysis.result) {
          // First, try to extract from individual step details (new structure)
          if (latestAnalysis.result.details) {
            const details = latestAnalysis.result.details;
            // Aggregate issues from all steps in details
            for (const stepName in details) {
              const stepDetails = details[stepName];
              if (stepDetails.issues && Array.isArray(stepDetails.issues)) {
                // Filter out circular reference strings
                const validIssues = stepDetails.issues.filter(issue => 
                  typeof issue === 'object' && issue !== null && issue !== '[Circular Reference]'
                );
                issues.push(...validIssues);
              }
            }
            this.logger.info(`✅ [AnalysisController] Found ${issues.length} issues from step details`);
          }
          
          // Fallback: Check traditional structures (for backwards compatibility)
          if (issues.length === 0) {
            if (latestAnalysis.result.issues && Array.isArray(latestAnalysis.result.issues)) {
              // Filter out circular reference strings
              issues = latestAnalysis.result.issues.filter(issue => 
                typeof issue === 'object' && issue !== null && issue !== '[Circular Reference]'
              );
              this.logger.info(`✅ [AnalysisController] Found ${issues.length} issues in result.issues (filtered)`);
            } else if (latestAnalysis.result.result && latestAnalysis.result.result.issues && Array.isArray(latestAnalysis.result.result.issues)) {
              // Filter out circular reference strings
              issues = latestAnalysis.result.result.issues.filter(issue => 
                typeof issue === 'object' && issue !== null && issue !== '[Circular Reference]'
              );
              this.logger.info(`✅ [AnalysisController] Found ${issues.length} issues in result.result.issues (filtered)`);
            } else {
              this.logger.warn(`⚠️ [AnalysisController] No issues found in any structure`);
            }
          }
        }
      } else {
        this.logger.warn(`⚠️ [AnalysisController] No completed analyses found for category: ${category}`);
      }
      
      this.logger.info(`📤 [AnalysisController] Sending ${issues.length} issues to frontend for category: ${category}`);
      
      res.json({
        success: true,
        data: {
          category,
          issues,
          count: issues.length,
          projectId,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      this.logger.error(`❌ Failed to get ${category} issues:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to get ${category} issues`,
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/:category/metrics
   */
  async getCategoryMetrics(req, res, category) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`📊 Getting ${category} metrics for project: ${projectId}`);
      
      // Get all analyses for the project and filter by category
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      // Defensive check: ensure analyses is an array
      if (!analyses || !Array.isArray(analyses)) {
        this.logger.warn(`No analyses found for project: ${projectId}, returning empty metrics`);
        return res.json({
          success: true,
          data: {
            category,
            metrics: {
              totalAnalyses: 0,
              completedAnalyses: 0,
              failedAnalyses: 0,
              averageExecutionTime: 0,
              lastAnalysis: null
            },
            projectId,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Filter for the specific category
      const targetAnalysisType = this.mapCategoryToAnalysisType(category);
      const categoryAnalyses = analyses.filter(a => a.analysisType === targetAnalysisType);
      
      const metrics = {
        totalAnalyses: categoryAnalyses.length,
        completedAnalyses: categoryAnalyses.filter(a => a.status === 'completed').length,
        failedAnalyses: categoryAnalyses.filter(a => a.status === 'failed').length,
        lastAnalysis: categoryAnalyses.length > 0 ? 
          new Date(Math.max(...categoryAnalyses.map(a => new Date(a.completedAt || a.createdAt)))) : null,
        averageDuration: 0
      };
      
      // Calculate average duration
      const completedAnalyses = categoryAnalyses.filter(a => a.status === 'completed' && a.executionTime);
      if (completedAnalyses.length > 0) {
        const totalDuration = completedAnalyses.reduce((sum, a) => sum + (a.executionTime || 0), 0);
        metrics.averageDuration = totalDuration / completedAnalyses.length;
      }
      
      // FIXED: Also include metrics from the latest analysis result
      const latestCompletedAnalysis = categoryAnalyses
        .filter(a => a.status === 'completed' && a.result)
        .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))[0];
      
      if (latestCompletedAnalysis) {
        // Look for metrics in the correct structure (result.result.metrics)
        if (latestCompletedAnalysis.result && latestCompletedAnalysis.result.result && latestCompletedAnalysis.result.result.metrics) {
          Object.assign(metrics, latestCompletedAnalysis.result.result.metrics);
        } else if (latestCompletedAnalysis.result && latestCompletedAnalysis.result.metrics) {
          // Fallback to direct metrics
          Object.assign(metrics, latestCompletedAnalysis.result.metrics);
        }
      }
      
      res.json({
        success: true,
        data: {
          category,
          metrics,
          projectId,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      this.logger.error(`❌ Failed to get ${category} metrics:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to get ${category} metrics`,
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/:category/summary
   */
  async getCategorySummary(req, res, category) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`📋 Getting ${category} summary for project: ${projectId}`);
      
      // Get all analyses for the project and filter by category
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      // ADD DETAILED LOGGING
      this.logger.info(`🔍 [AnalysisController] Raw analyses from database:`, JSON.stringify(analyses, null, 2));
      
      // Defensive check: ensure analyses is an array
      if (!analyses || !Array.isArray(analyses)) {
        this.logger.warn(`⚠️ [AnalysisController] No analyses found for project: ${projectId}, returning empty summary`);
        return res.json({
          success: true,
          data: {
            category,
            summary: {},
            projectId,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Filter for the specific category and extract summary
      const targetAnalysisType = this.mapCategoryToAnalysisType(category);
      this.logger.info(`🔍 [AnalysisController] Mapping category '${category}' to analysis type: '${targetAnalysisType}'`);
      
      const categoryAnalyses = analyses.filter(a => a.analysisType === targetAnalysisType && a.status === 'completed' && a.result);
      this.logger.info(`🔍 [AnalysisController] Found ${categoryAnalyses.length} completed analyses for category '${category}'`);
      
      let summary = {};
      if (categoryAnalyses.length > 0) {
        // Get the latest analysis for this category
        const latestAnalysis = categoryAnalyses.sort((a, b) => 
          new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
        )[0];
        
        this.logger.info(`🔍 [AnalysisController] Latest analysis result:`, JSON.stringify(latestAnalysis.result, null, 2));
        
        // Check both possible structures: result.summary and result.result.summary
        if (latestAnalysis.result) {
          if (latestAnalysis.result.summary) {
            summary = latestAnalysis.result.summary;
            this.logger.info(`✅ [AnalysisController] Found summary in result.summary`);
          } else if (latestAnalysis.result.result && latestAnalysis.result.result.summary) {
            summary = latestAnalysis.result.result.summary;
            this.logger.info(`✅ [AnalysisController] Found summary in result.result.summary`);
          } else {
            this.logger.warn(`⚠️ [AnalysisController] No summary found in either result.summary or result.result.summary`);
          }
        }
      }
      
      this.logger.info(`📤 [AnalysisController] Sending summary to frontend:`, JSON.stringify(summary, null, 2));
      res.json({
        success: true,
        data: {
          category,
          summary,
          projectId,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      this.logger.error(`❌ Failed to get ${category} summary:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to get ${category} summary`,
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/:category/results
   */
  async getCategoryResults(req, res, category) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`📄 Getting ${category} results for project: ${projectId}`);
      
      // Get all analyses for the project and filter by category
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      // Defensive check: ensure analyses is an array
      if (!analyses || !Array.isArray(analyses)) {
        this.logger.warn(`No analyses found for project: ${projectId}, returning empty results`);
        return res.json({
          success: true,
          data: {
            category,
            results: {},
            projectId,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Filter for the specific category and extract results
      const targetAnalysisType = this.mapCategoryToAnalysisType(category);
      const categoryAnalyses = analyses.filter(a => a.analysisType === targetAnalysisType && a.status === 'completed' && a.result);
      
      let results = {};
      if (categoryAnalyses.length > 0) {
        // Get the latest analysis for this category
        const latestAnalysis = categoryAnalyses.sort((a, b) => 
          new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
        )[0];
        
        // FIXED: Look for results in the correct structure (result.result)
        if (latestAnalysis.result && latestAnalysis.result.result) {
          results = latestAnalysis.result.result;
        } else if (latestAnalysis.result) {
          // Fallback to direct result
          results = latestAnalysis.result;
        }
      }
      
      res.json({
        success: true,
        data: {
          category,
          results,
          projectId,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      this.logger.error(`❌ Failed to get ${category} results:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to get ${category} results`,
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/:category/tasks
   */
  async getCategoryTasks(req, res, category) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`📋 Getting ${category} tasks for project: ${projectId}`);
      
      // Get all analyses for the project and filter by category
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      // Defensive check: ensure analyses is an array
      if (!analyses || !Array.isArray(analyses)) {
        this.logger.warn(`No analyses found for project: ${projectId}, returning empty tasks`);
        return res.json({
          success: true,
          data: {
            category,
            tasks: [],
            count: 0,
            projectId,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Filter for the specific category and extract tasks
      const targetAnalysisType = this.mapCategoryToAnalysisType(category);
      const categoryAnalyses = analyses.filter(a => a.analysisType === targetAnalysisType && a.status === 'completed' && a.result);
      
      let tasks = [];
      if (categoryAnalyses.length > 0) {
        // Get the latest analysis for this category
        const latestAnalysis = categoryAnalyses.sort((a, b) => 
          new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
        )[0];
        
        // FIXED: Look for tasks in the correct structure (result.result.tasks)
        // ECHTE SecurityAnalysisOrchestrator Struktur!
        if (latestAnalysis.result && latestAnalysis.result.tasks) {
          tasks = latestAnalysis.result.tasks;
        }
      }
      
      res.json({
        success: true,
        data: {
          category,
          tasks,
          count: tasks.length,
          projectId,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      this.logger.error(`❌ Failed to get ${category} tasks:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to get ${category} tasks`,
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/analysis/:category/documentation
   */
  async getCategoryDocumentation(req, res, category) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`📄 Getting ${category} documentation for project: ${projectId}`);
      
      // Get all analyses for the project and filter by category
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      // Defensive check: ensure analyses is an array
      if (!analyses || !Array.isArray(analyses)) {
        this.logger.warn(`No analyses found for project: ${projectId}, returning empty documentation`);
        return res.json({
          success: true,
          data: {
            category,
            documentation: [],
            count: 0,
            projectId,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Filter for the specific category and extract documentation
      const targetAnalysisType = this.mapCategoryToAnalysisType(category);
      const categoryAnalyses = analyses.filter(a => a.analysisType === targetAnalysisType && a.status === 'completed' && a.result);
      
      let documentation = [];
      if (categoryAnalyses.length > 0) {
        // Get the latest analysis for this category
        const latestAnalysis = categoryAnalyses.sort((a, b) => 
          new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
        )[0];
        
        // FIXED: Look for documentation in the correct structure (result.result.documentation)
        if (latestAnalysis.result && latestAnalysis.result.documentation) {
          documentation = latestAnalysis.result.documentation;
        }
      }
      
      res.json({
        success: true,
        data: {
          category,
          documentation,
          count: documentation.length,
          projectId,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      this.logger.error(`❌ Failed to get ${category} documentation:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to get ${category} documentation`,
        message: error.message
      });
    }
  }

  async getSecurityIssues(req, res) {
    try {
      const { projectId } = req.params;
      logger.warn(`⚠️ Getting security issues for project: ${projectId}`);
      
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      if (!analyses || analyses.length === 0) {
        logger.warn(`⚠️ [AnalysisController] No analyses found for project: ${projectId}`);
        return res.json({ issues: [] });
      }

      const latestAnalysis = analyses[0];
      
      let issues = [];
      
      // Try to extract issues from the result structure
      if (latestAnalysis.result && latestAnalysis.result.issues) {
        issues = latestAnalysis.result.issues;
        logger.info(`✅ [AnalysisController] Found ${issues.length} issues in result.issues`);
      } else if (latestAnalysis.result && latestAnalysis.result.result && latestAnalysis.result.result.issues) {
        issues = latestAnalysis.result.result.issues;
        logger.info(`✅ [AnalysisController] Found ${issues.length} issues in result.result.issues`);
      } else {
        logger.warn(`⚠️ [AnalysisController] No issues found in analysis result structure`);
      }
      
      logger.info(`📤 [AnalysisController] Sending ${issues.length} issues to frontend`);
      res.json({ issues });
    } catch (error) {
      logger.error(`❌ Error getting security issues:`, error);
      res.status(500).json({ error: 'Failed to get security issues' });
    }
  }

  async getSecurityRecommendations(req, res) {
    try {
      const { projectId } = req.params;
      logger.info(`💡 Getting security recommendations for project: ${projectId}`);
      
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      // ADD DETAILED LOGGING
      logger.info(`🔍 [AnalysisController] Raw analyses from database:`, JSON.stringify(analyses, null, 2));
      
      if (!analyses || analyses.length === 0) {
        logger.warn(`⚠️ [AnalysisController] No analyses found for project: ${projectId}`);
        return res.json({ recommendations: [] });
      }

      const latestAnalysis = analyses[0];
      logger.info(`🔍 [AnalysisController] Latest analysis result:`, JSON.stringify(latestAnalysis.result, null, 2));
      
      let recommendations = [];
      
      // Try to extract recommendations from the result structure
      if (latestAnalysis.result && latestAnalysis.result.recommendations) {
        recommendations = latestAnalysis.result.recommendations;
        logger.info(`✅ [AnalysisController] Found ${recommendations.length} recommendations in result.recommendations`);
      } else if (latestAnalysis.result && latestAnalysis.result.result && latestAnalysis.result.result.recommendations) {
        recommendations = latestAnalysis.result.result.recommendations;
        logger.info(`✅ [AnalysisController] Found ${recommendations.length} recommendations in result.result.recommendations`);
      } else {
        logger.warn(`⚠️ [AnalysisController] No recommendations found in analysis result structure`);
      }
      
      logger.info(`📤 [AnalysisController] Sending ${recommendations.length} recommendations to frontend`);
      res.json({ recommendations });
    } catch (error) {
      logger.error(`❌ Error getting security recommendations:`, error);
      res.status(500).json({ error: 'Failed to get security recommendations' });
    }
  }

  async getSecurityMetrics(req, res) {
    try {
      const { projectId } = req.params;
      this.logger.info(`📊 Getting security metrics for project: ${projectId}`);
      
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      // ADD DETAILED LOGGING
      this.logger.info(`🔍 [AnalysisController] Raw analyses from database:`, JSON.stringify(analyses, null, 2));
      
      if (!analyses || analyses.length === 0) {
        this.logger.warn(`⚠️ [AnalysisController] No analyses found for project: ${projectId}`);
        return res.json({ metrics: {} });
      }

      const latestAnalysis = analyses[0];
      this.logger.info(`🔍 [AnalysisController] Latest analysis result:`, JSON.stringify(latestAnalysis.result, null, 2));
      
      let metrics = {};
      
      // Try to extract metrics from the result structure
      if (latestAnalysis.result && latestAnalysis.result.metrics) {
        metrics = latestAnalysis.result.metrics;
        this.logger.info(`✅ [AnalysisController] Found metrics in result.metrics`);
      } else if (latestAnalysis.result && latestAnalysis.result.result && latestAnalysis.result.result.metrics) {
        metrics = latestAnalysis.result.result.metrics;
        this.logger.info(`✅ [AnalysisController] Found metrics in result.result.metrics`);
      } else {
        this.logger.warn(`⚠️ [AnalysisController] No metrics found in analysis result structure`);
      }
      
      this.logger.info(`📤 [AnalysisController] Sending metrics to frontend:`, JSON.stringify(metrics, null, 2));
      res.json({ metrics });
    } catch (error) {
      this.logger.error(`❌ Error getting security metrics:`, error);
      res.status(500).json({ error: 'Failed to get security metrics' });
    }
  }

  async getSecuritySummary(req, res) {
    try {
      const { projectId } = req.params;
      this.logger.info(`📋 Getting security summary for project: ${projectId}`);
      
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      // ADD DETAILED LOGGING
      this.logger.info(`🔍 [AnalysisController] Raw analyses from database:`, JSON.stringify(analyses, null, 2));
      
      if (!analyses || analyses.length === 0) {
        this.logger.warn(`⚠️ [AnalysisController] No analyses found for project: ${projectId}`);
        return res.json({ summary: {} });
      }

      const latestAnalysis = analyses[0];
      this.logger.info(`🔍 [AnalysisController] Latest analysis result:`, JSON.stringify(latestAnalysis.result, null, 2));
      
      let summary = {};
      
      // Try to extract summary from the result structure
      if (latestAnalysis.result && latestAnalysis.result.summary) {
        summary = latestAnalysis.result.summary;
        this.logger.info(`✅ [AnalysisController] Found summary in result.summary`);
      } else if (latestAnalysis.result && latestAnalysis.result.result && latestAnalysis.result.result.summary) {
        summary = latestAnalysis.result.result.summary;
        this.logger.info(`✅ [AnalysisController] Found summary in result.result.summary`);
      } else {
        this.logger.warn(`⚠️ [AnalysisController] No summary found in analysis result structure`);
      }
      
      this.logger.info(`📤 [AnalysisController] Sending summary to frontend:`, JSON.stringify(summary, null, 2));
      res.json({ summary });
    } catch (error) {
      this.logger.error(`❌ Error getting security summary:`, error);
      res.status(500).json({ error: 'Failed to get security summary' });
    }
  }

  async getSecurityResults(req, res) {
    try {
      const { projectId } = req.params;
      this.logger.info(`📄 Getting security results for project: ${projectId}`);
      
      const analyses = await this.getAnalysesFromDatabase(projectId);
      
      if (!analyses || analyses.length === 0) {
        this.logger.warn(`⚠️ [AnalysisController] No analyses found for project: ${projectId}`);
        return res.json({ results: {} });
      }

      const latestAnalysis = analyses[0];
      
      this.logger.info(`📤 [AnalysisController] Sending full results to frontend`);
      res.json({ results: latestAnalysis.result });
    } catch (error) {
      this.logger.error(`❌ Error getting security results:`, error);
      res.status(500).json({ error: 'Failed to get security results' });
    }
  }
}

module.exports = AnalysisController; 