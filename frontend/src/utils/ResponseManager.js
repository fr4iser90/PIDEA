/**
 * Frontend Response Manager
 * 
 * Handles API responses from the backend ResponseManager
 * Provides consistent error handling and data extraction
 */

class ResponseManager {
  constructor() {
    this.logger = console; // You can replace with your logger
  }

  /**
   * Handle API response
   * @param {Response} response - Fetch response object
   * @param {Object} options - Options for handling
   * @returns {Promise<Object>} Processed response
   */
  async handleResponse(response, options = {}) {
    try {
      const data = await response.json();
      
      if (response.ok) {
        // Success response - data is direct
        return {
          success: true,
          data: data,
          status: response.status,
          headers: response.headers
        };
      } else {
        // Error response - structured error object
        return {
          success: false,
          error: data.error || {
            message: 'Unknown error',
            code: 'UNKNOWN_ERROR',
            statusCode: response.status
          },
          status: response.status,
          headers: response.headers
        };
      }
    } catch (error) {
      // JSON parsing error
      return {
        success: false,
        error: {
          message: 'Failed to parse response',
          code: 'PARSE_ERROR',
          statusCode: response.status,
          details: error.message
        },
        status: response.status
      };
    }
  }

  /**
   * Make API request with automatic response handling
   * @param {string} url - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Processed response
   */
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      return await this.handleResponse(response);
    } catch (error) {
      // Network error
      return {
        success: false,
        error: {
          message: 'Network error',
          code: 'NETWORK_ERROR',
          details: error.message
        }
      };
    }
  }

  /**
   * GET request
   * @param {string} url - API endpoint
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Processed response
   */
  async get(url, options = {}) {
    return this.request(url, { method: 'GET', ...options });
  }

  /**
   * POST request
   * @param {string} url - API endpoint
   * @param {Object} data - Request data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Processed response
   */
  async post(url, data, options = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  /**
   * PUT request
   * @param {string} url - API endpoint
   * @param {Object} data - Request data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Processed response
   */
  async put(url, data, options = {}) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  }

  /**
   * DELETE request
   * @param {string} url - API endpoint
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Processed response
   */
  async delete(url, options = {}) {
    return this.request(url, { method: 'DELETE', ...options });
  }

  /**
   * Handle error response
   * @param {Object} errorResponse - Error response from handleResponse
   * @param {Function} onError - Error handler function
   */
  handleError(errorResponse, onError) {
    const error = errorResponse.error;
    
    // Log error
    this.logger.error('API Error:', error);
    
    // Call error handler if provided
    if (onError) {
      onError(error);
    }
    
    // Return error for further handling
    return error;
  }

  /**
   * Extract data from success response
   * @param {Object} successResponse - Success response from handleResponse
   * @returns {*} Response data
   */
  extractData(successResponse) {
    return successResponse.data;
  }
}

// Create singleton instance
const responseManager = new ResponseManager();

export default responseManager;
