/**
 * Centralized Response Manager
 *
 * This module provides a single, consistent way to handle all API responses
 * across the entire application. It eliminates the need for manual response
 * formatting in every controller.
 */

class ResponseManager {
  constructor() {
    const Logger = require("../logging/Logger");
    this.logger = new Logger("ResponseManager");
  }

  /**
   * Create standardized success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {number} statusCode - HTTP status code (default: 200)
   * @param {Object} options - Additional options
   */
  success(res, data = null, statusCode = 200, options = {}) {
    // 2025 Standard: Direct data, no wrapping!
    let response = data;

    // Only add metadata if explicitly requested
    if (options.meta || options.pagination) {
      response = {
        ...data,
        ...(options.meta && { meta: options.meta }),
        ...(options.pagination && { pagination: options.pagination }),
      };
    }

    // Remove null/undefined values
    const cleanResponse = this.cleanResponse(response);

    this.logger.debug("Sending success response", {
      statusCode,
      dataKeys: Object.keys(cleanResponse),
    });

    return res.status(statusCode).json(cleanResponse);
  }

  /**
   * Create standardized error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {Object} details - Additional error details
   */
  error(res, message, statusCode = 500, details = {}) {
    const response = {
      error: {
        message,
        code: this.getErrorCode(statusCode),
        statusCode,
        timestamp: new Date().toISOString(),
        ...details,
      },
    };

    this.logger.warn("Sending error response", {
      statusCode,
      message,
      details: Object.keys(details),
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Create paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Array of data
   * @param {Object} pagination - Pagination info
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  paginated(res, data, pagination, statusCode = 200) {
    // 2025 Standard: Only wrap when pagination is needed
    const response = {
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || data.length,
        totalPages: Math.ceil(
          (pagination.total || data.length) / (pagination.limit || 10),
        ),
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false,
      },
    };

    this.logger.debug("Sending paginated response", {
      statusCode,
      itemCount: data.length,
      pagination: response.pagination,
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Create created response (201)
   * @param {Object} res - Express response object
   * @param {*} data - Created resource data
   * @param {string} location - Location header value
   */
  created(res, data, location = null) {
    // 2025 Standard: Direct data, no wrapping!
    let response = data;

    if (location) {
      res.set("Location", location);
    }

    this.logger.debug("Sending created response", {
      dataKeys: Object.keys(response),
      location,
    });

    return res.status(201).json(response);
  }

  /**
   * Create no content response (204)
   * @param {Object} res - Express response object
   */
  noContent(res) {
    this.logger.debug("Sending no content response");
    return res.status(204).send();
  }

  /**
   * Create not found response (404)
   * @param {Object} res - Express response object
   * @param {string} resource - Resource name
   */
  notFound(res, resource = "Resource") {
    return this.error(res, `${resource} not found`, 404);
  }

  /**
   * Create unauthorized response (401)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  unauthorized(res, message = "Unauthorized") {
    return this.error(res, message, 401);
  }

  /**
   * Create forbidden response (403)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  forbidden(res, message = "Forbidden") {
    return this.error(res, message, 403);
  }

  /**
   * Create bad request response (400)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Object} validation - Validation errors
   */
  badRequest(res, message = "Bad Request", validation = {}) {
    return this.error(res, message, 400, { validation });
  }

  /**
   * Create conflict response (409)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  conflict(res, message = "Conflict") {
    return this.error(res, message, 409);
  }

  /**
   * Create internal server error response (500)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Object} details - Error details
   */
  internalError(res, message = "Internal Server Error", details = {}) {
    return this.error(res, message, 500, details);
  }

  /**
   * Create OK response (200) - Synonym for success
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   */
  ok(res, data) {
    return this.success(res, data, 200);
  }

  /**
   * Create accepted response (202) - Request accepted for processing
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   */
  accepted(res, data) {
    return this.success(res, data, 202);
  }

  /**
   * Create unprocessable entity response (422) - Validation failed
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Object} validation - Validation errors
   */
  unprocessableEntity(res, message = "Validation failed", validation = {}) {
    return this.error(res, message, 422, { validation });
  }

  /**
   * Create too many requests response (429) - Rate limiting
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  tooManyRequests(res, message = "Too many requests") {
    return this.error(res, message, 429);
  }

  /**
   * Create service unavailable response (503) - Service down
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  serviceUnavailable(res, message = "Service unavailable") {
    return this.error(res, message, 503);
  }

  /**
   * Create bad gateway response (502) - Upstream error
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  badGateway(res, message = "Bad gateway") {
    return this.error(res, message, 502);
  }

  /**
   * Create method not allowed response (405) - HTTP method not supported
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  methodNotAllowed(res, message = "Method not allowed") {
    return this.error(res, message, 405);
  }

  /**
   * Create gone response (410) - Resource permanently removed
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  gone(res, message = "Resource gone") {
    return this.error(res, message, 410);
  }

  /**
   * Get error code from status code
   * @param {number} statusCode - HTTP status code
   * @returns {string} Error code
   */
  getErrorCode(statusCode) {
    const codes = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      405: "METHOD_NOT_ALLOWED",
      409: "CONFLICT",
      410: "GONE",
      422: "UNPROCESSABLE_ENTITY",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_SERVER_ERROR",
      502: "BAD_GATEWAY",
      503: "SERVICE_UNAVAILABLE",
    };
    return codes[statusCode] || "UNKNOWN_ERROR";
  }

  /**
   * Clean response object by removing null/undefined values
   * @param {Object} obj - Object to clean
   * @returns {Object} Cleaned object
   */
  cleanResponse(obj) {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.cleanResponse(item));
    }

    if (typeof obj === "object") {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
          cleaned[key] = this.cleanResponse(value);
        }
      }
      return cleaned;
    }

    return obj;
  }

  /**
   * Middleware to attach response methods to res object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  middleware(req, res, next) {
    // Attach response methods to res object
    res.success = (data, statusCode, options) =>
      this.success(res, data, statusCode, options);
    res.error = (message, statusCode, details) =>
      this.error(res, message, statusCode, details);
    res.paginated = (data, pagination, statusCode) =>
      this.paginated(res, data, pagination, statusCode);
    res.created = (data, location) => this.created(res, data, location);
    res.noContent = () => this.noContent(res);
    res.notFound = (resource) => this.notFound(res, resource);
    res.unauthorized = (message) => this.unauthorized(res, message);
    res.forbidden = (message) => this.forbidden(res, message);
    res.badRequest = (message, validation) =>
      this.badRequest(res, message, validation);
    res.conflict = (message) => this.conflict(res, message);
    res.internalError = (message, details) =>
      this.internalError(res, message, details);
    res.ok = (data) => this.ok(res, data);
    res.accepted = (data) => this.accepted(res, data);
    res.unprocessableEntity = (message, validation) =>
      this.unprocessableEntity(res, message, validation);
    res.tooManyRequests = (message) => this.tooManyRequests(res, message);
    res.serviceUnavailable = (message) => this.serviceUnavailable(res, message);
    res.badGateway = (message) => this.badGateway(res, message);
    res.methodNotAllowed = (message) => this.methodNotAllowed(res, message);
    res.gone = (message) => this.gone(res, message);

    next();
  }
}

module.exports = ResponseManager;
