/**
 * Base Controller Class
 * Eliminates DRY violations in controller patterns
 * Provides common functionality for all API controllers
 */

const Logger = require("@logging/Logger");

class BaseController {
  constructor(serviceName, service = null) {
    this.serviceName = serviceName;
    this.service = service;
    this.logger = new Logger(`${serviceName}Controller`);
  }

  /**
   * Standard analysis endpoint pattern
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} analysisFunction - Service analysis function
   * @param {Object} options - Additional options
   */
  async handleAnalysis(req, res, analysisFunction, options = {}) {
    try {
      this.logger.info(`${this.serviceName} analysis request received`, {
        projectId: req.body.projectId,
        userId: req.user?.id,
      });

      const { projectId, projectPath, config = {} } = req.body;

      // Standard validation
      const validation = this.validateAnalysisRequest(projectId, projectPath);
      if (!validation.isValid) {
        return res.badRequest(validation.message);
      }

      // Execute analysis
      const result = await analysisFunction({
        projectId,
        projectPath,
        config,
        ...options,
      });

      this.logger.info(`${this.serviceName} analysis completed`, {
        projectId,
        results: result.data?.length || 0,
      });

      // Standard success response
      res.success({
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: this.serviceName.toLowerCase(),
          results: result.data || {},
          metadata: result.metadata || {},
        },
      });
    } catch (error) {
      this.logger.error(`${this.serviceName} analysis failed`, {
        projectId: req.body.projectId,
        error: error.message,
      });

      res.error(`${this.serviceName} analysis failed`, 500, { 
        details: error.message 
      });
    }
  }

  /**
   * Standard configuration endpoint pattern
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Object} defaultConfig - Default configuration
   */
  async handleGetConfiguration(req, res, defaultConfig = {}) {
    try {
      res.success({
        config: defaultConfig,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to get configuration", {
        error: error.message,
      });

      res.error("Failed to get configuration", 500, { 
        details: error.message 
      });
    }
  }

  /**
   * Standard status endpoint pattern
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Object} statusData - Additional status data
   */
  async handleGetStatus(req, res, statusData = {}) {
    try {
      res.success({
        status: "active",
        service: this.serviceName,
        timestamp: new Date().toISOString(),
        ...statusData,
      });
    } catch (error) {
      this.logger.error("Failed to get status", {
        error: error.message,
      });

      res.error("Failed to get status", 500, { 
        details: error.message 
      });
    }
  }

  /**
   * Validate analysis request parameters
   * @param {string} projectId - Project ID
   * @param {string} projectPath - Project path
   * @returns {Object} Validation result
   */
  validateAnalysisRequest(projectId, projectPath) {
    if (!projectId || !projectPath) {
      return {
        isValid: false,
        message: "Missing required parameters: projectId and projectPath"
      };
    }

    if (typeof projectId !== 'string' || typeof projectPath !== 'string') {
      return {
        isValid: false,
        message: "Invalid parameter types: projectId and projectPath must be strings"
      };
    }

    return { isValid: true };
  }

  /**
   * Validate user authentication
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @returns {boolean} True if valid, false if invalid (response sent)
   */
  validateAuthentication(req, res) {
    if (!req.user || !req.user.id) {
      res.unauthorized("User not authenticated");
      return false;
    }
    return true;
  }

  /**
   * Validate required fields in request body
   * @param {Object} body - Request body
   * @param {Array} requiredFields - Array of required field names
   * @returns {Object} Validation result
   */
  validateRequiredFields(body, requiredFields) {
    const missing = requiredFields.filter(field => !body[field]);
    
    if (missing.length > 0) {
      return {
        isValid: false,
        message: `Missing required fields: ${missing.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Standard error handling wrapper
   * @param {Function} asyncFunction - Async function to wrap
   * @param {string} operationName - Name of the operation for logging
   * @returns {Function} Wrapped function
   */
  wrapAsync(asyncFunction, operationName) {
    return async (req, res) => {
      try {
        await asyncFunction(req, res);
      } catch (error) {
        this.logger.error(`${operationName} failed`, {
          error: error.message,
          stack: error.stack,
          url: req.url,
          method: req.method,
        });

        res.error(`${operationName} failed`, 500, {
          details: process.env.NODE_ENV === 'development' 
            ? error.message 
            : 'Something went wrong'
        });
      }
    };
  }
}

module.exports = BaseController;
