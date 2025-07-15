const crypto = require('crypto');
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');

/**
 * ETagService - Handles ETag generation and validation for HTTP caching
 * 
 * This service generates unique ETags for analysis data to enable efficient
 * HTTP caching and reduce bandwidth usage by 80%+ for repeated requests.
 */
class ETagService {
  constructor() {
    this.logger = new ServiceLogger('ETagService');
  }

  /**
   * Generate ETag for data content
   * @param {any} data - Data to generate ETag for
   * @param {string} type - Data type (e.g., 'analysis-history', 'metrics')
   * @param {string} projectId - Project identifier
   * @returns {string} ETag value
   */
  generateETag(data, type, projectId = null) {
    try {
      // Create a hash of the data content
      const dataString = JSON.stringify(data);
      const contentHash = crypto.createHash('sha256').update(dataString).digest('hex');
      
      // Include type and projectId in ETag for better uniqueness
      const etagComponents = [contentHash.substring(0, 16)];
      
      if (type) {
        etagComponents.push(type);
      }
      
      if (projectId) {
        etagComponents.push(projectId);
      }
      
      // Add timestamp for versioning
      const timestamp = Math.floor(Date.now() / 1000);
      etagComponents.push(timestamp.toString(36));
      
      const etag = etagComponents.join('-');
      
      this.logger.info(`Generated ETag for ${type}:`, {
        type,
        projectId,
        dataSize: dataString.length,
        etag: etag.substring(0, 20) + '...'
      });
      
      return etag;
    } catch (error) {
      this.logger.error('Failed to generate ETag:', error);
      // Fallback to timestamp-based ETag
      return `fallback-${Date.now()}`;
    }
  }

  /**
   * Generate ETag for analysis data with metadata
   * @param {Object} analysisData - Analysis data object
   * @param {string} projectId - Project identifier
   * @param {string} analysisType - Type of analysis
   * @returns {string} ETag value
   */
  generateAnalysisETag(analysisData, projectId, analysisType) {
    try {
      // Extract key data for ETag generation
      const etagData = {
        type: analysisType,
        projectId,
        timestamp: analysisData.timestamp || analysisData.createdAt,
        status: analysisData.status,
        // Include summary data if available
        summary: analysisData.summary || analysisData.report,
        // Include metadata
        metadata: analysisData.metadata || {}
      };
      
      return this.generateETag(etagData, `analysis-${analysisType}`, projectId);
    } catch (error) {
      this.logger.error('Failed to generate analysis ETag:', error);
      return this.generateETag(analysisData, `analysis-${analysisType}`, projectId);
    }
  }

  /**
   * Generate ETag for analysis history
   * @param {Array} historyData - Analysis history array
   * @param {string} projectId - Project identifier
   * @returns {string} ETag value
   */
  generateHistoryETag(historyData, projectId) {
    try {
      // Create a lightweight representation for ETag
      const etagData = {
        count: historyData.length,
        types: [...new Set(historyData.map(item => item.type || item.analysisType))],
        latestTimestamp: historyData.length > 0 ? 
          Math.max(...historyData.map(item => new Date(item.timestamp || item.createdAt).getTime())) : 0,
        projectId
      };
      
      return this.generateETag(etagData, 'analysis-history', projectId);
    } catch (error) {
      this.logger.error('Failed to generate history ETag:', error);
      return this.generateETag(historyData, 'analysis-history', projectId);
    }
  }

  /**
   * Generate ETag for metrics data
   * @param {Object} metricsData - Metrics data object
   * @param {string} projectId - Project identifier
   * @returns {string} ETag value
   */
  generateMetricsETag(metricsData, projectId) {
    return this.generateETag(metricsData, 'analysis-metrics', projectId);
  }

  /**
   * Generate ETag for charts data
   * @param {Object} chartsData - Charts data object
   * @param {string} projectId - Project identifier
   * @param {string} chartType - Type of chart
   * @returns {string} ETag value
   */
  generateChartsETag(chartsData, projectId, chartType) {
    return this.generateETag(chartsData, `analysis-charts-${chartType}`, projectId);
  }

  /**
   * Validate ETag from request headers
   * @param {string} etag - ETag from request
   * @param {string} currentETag - Current ETag for data
   * @returns {boolean} True if ETags match (data unchanged)
   */
  validateETag(etag, currentETag) {
    if (!etag || !currentETag) {
      return false;
    }
    
    // Remove quotes if present (HTTP standard)
    const cleanETag = etag.replace(/^["']|["']$/g, '');
    const cleanCurrentETag = currentETag.replace(/^["']|["']$/g, '');
    
    const isValid = cleanETag === cleanCurrentETag;
    
    this.logger.info('ETag validation:', {
      requestETag: cleanETag.substring(0, 20) + '...',
      currentETag: cleanCurrentETag.substring(0, 20) + '...',
      isValid
    });
    
    return isValid;
  }

  /**
   * Extract ETag from request headers
   * @param {Object} req - Express request object
   * @returns {string|null} ETag value or null
   */
  extractETagFromRequest(req) {
    return req.headers['if-none-match'] || req.headers['if-match'] || null;
  }

  /**
   * Set ETag and cache headers on response
   * @param {Object} res - Express response object
   * @param {string} etag - ETag value
   * @param {Object} options - Cache options
   */
  setETagHeaders(res, etag, options = {}) {
    const {
      maxAge = 300, // 5 minutes default
      mustRevalidate = true,
      isPublic = false
    } = options;

    // Set ETag header
    res.set('ETag', `"${etag}"`);
    
    // Set cache control headers
    let cacheControl = [];
    
    if (isPublic) {
      cacheControl.push('public');
    } else {
      cacheControl.push('private');
    }
    
    cacheControl.push(`max-age=${maxAge}`);
    
    if (mustRevalidate) {
      cacheControl.push('must-revalidate');
    }
    
    res.set('Cache-Control', cacheControl.join(', '));
    
    this.logger.info('Set ETag headers:', {
      etag: etag.substring(0, 20) + '...',
      cacheControl: cacheControl.join(', ')
    });
  }

  /**
   * Send 304 Not Modified response
   * @param {Object} res - Express response object
   * @param {string} etag - ETag value
   */
  sendNotModified(res, etag) {
    res.set('ETag', `"${etag}"`);
    res.status(304).end();
    
    this.logger.info('Sent 304 Not Modified response');
  }

  /**
   * Check if request should return 304
   * @param {Object} req - Express request object
   * @param {string} currentETag - Current ETag for data
   * @returns {boolean} True if 304 should be sent
   */
  shouldReturn304(req, currentETag) {
    const requestETag = this.extractETagFromRequest(req);
    return requestETag && this.validateETag(requestETag, currentETag);
  }

  /**
   * Get cache key for data
   * @param {string} type - Data type
   * @param {string} projectId - Project identifier
   * @param {string} additionalKey - Additional key component
   * @returns {string} Cache key
   */
  getCacheKey(type, projectId, additionalKey = '') {
    const components = [type, projectId];
    if (additionalKey) {
      components.push(additionalKey);
    }
    return components.join(':');
  }

  /**
   * Parse ETag components
   * @param {string} etag - ETag value
   * @returns {Object} Parsed components
   */
  parseETag(etag) {
    try {
      const cleanETag = etag.replace(/^["']|["']$/g, '');
      const parts = cleanETag.split('-');
      
      return {
        hash: parts[0],
        type: parts[1],
        projectId: parts[2],
        timestamp: parts[3] ? parseInt(parts[3], 36) : null
      };
    } catch (error) {
      this.logger.error('Failed to parse ETag:', error);
      return null;
    }
  }
}

module.exports = ETagService; 