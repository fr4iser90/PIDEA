const ETagService = require('@domain/services/ETagService');
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');

/**
 * ETagMiddleware - Handles ETag validation and conditional requests
 * 
 * This middleware validates ETags from requests and returns 304 Not Modified
 * when data hasn't changed, reducing bandwidth usage significantly.
 */
class ETagMiddleware {
  constructor() {
    this.logger = new ServiceLogger('ETagMiddleware');
    this.etagService = new ETagService();
  }

  /**
   * Create ETag middleware for specific endpoint
   * @param {Function} dataGenerator - Function to generate data and ETag
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware function
   */
  createMiddleware(dataGenerator, options = {}) {
    return async (req, res, next) => {
      try {
        // Skip ETag validation for non-GET requests
        if (req.method !== 'GET') {
          return next();
        }

        // Skip if no conditional headers
        const requestETag = this.etagService.extractETagFromRequest(req);
        if (!requestETag) {
          return next();
        }

        this.logger.info('Processing conditional request:', {
          url: req.url,
          method: req.method,
          requestETag: requestETag.substring(0, 20) + '...'
        });

        // Generate current data and ETag
        const { data, etag } = await dataGenerator(req, res);
        
        if (!etag) {
          this.logger.warn('No ETag generated, skipping conditional request');
          return next();
        }

        // Check if ETags match
        if (this.etagService.validateETag(requestETag, etag)) {
          this.logger.info('ETags match, sending 304 Not Modified');
          this.etagService.sendNotModified(res, etag);
          return;
        }

        // ETags don't match, continue with normal response
        this.logger.info('ETags don\'t match, proceeding with full response');
        
        // Store ETag for response headers
        req.currentETag = etag;
        req.responseData = data;
        
        next();
      } catch (error) {
        this.logger.error('ETag middleware error:', error);
        // Continue with normal request processing on error
        next();
      }
    };
  }

  /**
   * Create analysis history ETag middleware
   * @param {Function} historyProvider - Function to get analysis history
   * @returns {Function} Express middleware function
   */
  createAnalysisHistoryMiddleware(historyProvider) {
    return this.createMiddleware(async (req, res) => {
      const { projectId } = req.params;
      
      // Get analysis history
      const history = await historyProvider(projectId);
      
      // Generate ETag for history
      const etag = this.etagService.generateHistoryETag(history, projectId);
      
      return { data: history, etag };
    });
  }

  /**
   * Create analysis data ETag middleware
   * @param {Function} dataProvider - Function to get analysis data
   * @param {string} analysisType - Type of analysis
   * @returns {Function} Express middleware function
   */
  createAnalysisDataMiddleware(dataProvider, analysisType) {
    return this.createMiddleware(async (req, res) => {
      const { projectId } = req.params;
      
      // Get analysis data
      const data = await dataProvider(projectId, analysisType);
      
      // Generate ETag for analysis data
      const etag = this.etagService.generateAnalysisETag(data, projectId, analysisType);
      
      return { data, etag };
    });
  }

  /**
   * Create metrics ETag middleware
   * @param {Function} metricsProvider - Function to get metrics data
   * @returns {Function} Express middleware function
   */
  createMetricsMiddleware(metricsProvider) {
    return this.createMiddleware(async (req, res) => {
      const { projectId } = req.params;
      
      // Get metrics data
      const data = await metricsProvider(projectId);
      
      // Generate ETag for metrics
      const etag = this.etagService.generateMetricsETag(data, projectId);
      
      return { data, etag };
    });
  }

  /**
   * Create charts ETag middleware
   * @param {Function} chartsProvider - Function to get charts data
   * @returns {Function} Express middleware function
   */
  createChartsMiddleware(chartsProvider) {
    return this.createMiddleware(async (req, res) => {
      const { projectId } = req.params;
      const { type = 'trends' } = req.query;
      
      // Get charts data
      const data = await chartsProvider(projectId, type);
      
      // Generate ETag for charts
      const etag = this.etagService.generateChartsETag(data, projectId, type);
      
      return { data, etag };
    });
  }

  /**
   * Response middleware to set ETag headers
   * @param {Object} options - Cache options
   * @returns {Function} Express middleware function
   */
  setETagHeaders(options = {}) {
    return (req, res, next) => {
      // Set ETag headers if available
      if (req.currentETag) {
        this.etagService.setETagHeaders(res, req.currentETag, options);
      }
      next();
    };
  }

  /**
   * Skip ETag validation for specific conditions
   * @param {Function} condition - Function that returns true to skip ETag
   * @returns {Function} Express middleware function
   */
  skipIf(condition) {
    return (req, res, next) => {
      if (condition(req, res)) {
        this.logger.info('Skipping ETag validation based on condition');
        return next();
      }
      next();
    };
  }

  /**
   * Force cache refresh (ignore ETags)
   * @returns {Function} Express middleware function
   */
  forceRefresh() {
    return (req, res, next) => {
      // Remove conditional headers to force fresh response
      delete req.headers['if-none-match'];
      delete req.headers['if-match'];
      
      this.logger.info('Forced cache refresh - removed conditional headers');
      next();
    };
  }

  /**
   * Add cache busting parameter
   * @param {string} paramName - Parameter name (default: '_t')
   * @returns {Function} Express middleware function
   */
  cacheBust(paramName = '_t') {
    return (req, res, next) => {
      if (req.query[paramName]) {
        this.logger.info(`Cache busting with parameter: ${paramName}=${req.query[paramName]}`);
        // Remove conditional headers when cache busting
        delete req.headers['if-none-match'];
        delete req.headers['if-match'];
      }
      next();
    };
  }

  /**
   * Log ETag performance metrics
   * @returns {Function} Express middleware function
   */
  logMetrics() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Log response metrics
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        const etagHit = status === 304;
        
        this.logger.info('ETag performance metrics:', {
          url: req.url,
          method: req.method,
          statusCode: status,
          duration: `${duration}ms`,
          etagHit,
          bandwidthSaved: etagHit ? '100%' : '0%'
        });
      });
      
      next();
    };
  }
}

module.exports = ETagMiddleware; 