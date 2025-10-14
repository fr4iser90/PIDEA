/**
 * Centralized API Service
 * Provides a single point for all API calls with built-in authentication, error handling, and caching
 * Implements DRY principle - no more repeated authentication checks across the codebase
 */

import { logger } from "@/infrastructure/logging/Logger";
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import etagManager from '@/infrastructure/services/ETagManager.js';
import TimeoutConfig from '@/config/timeout-config.js';
import responseManager from '@/utils/ResponseManager.js';

class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_BACKEND_URL;
  }

  /**
   * Centralized API call with built-in authentication check
   * Uses ResponseManager for consistent response handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @param {string} projectId - Project ID for ETag support
   * @returns {Promise<Object>} API response
   */
  async call(endpoint, options = {}, projectId = null) {
    const url = typeof endpoint === 'function' ? endpoint() : endpoint;
    
    logger.info('🔍 [ApiService] Making API call to:', url);
    
    // SECURITY: Skip auth check for auth endpoints (login, register, validate, refresh)
    const isAuthEndpoint = url.includes('/api/auth/login') || 
                          url.includes('/api/auth/register') || 
                          url.includes('/api/auth/validate') || 
                          url.includes('/api/auth/refresh');
    
    // Centralized authentication check (except for auth endpoints)
    const { isAuthenticated, getAuthHeaders } = useAuthStore.getState();
    if (!isAuthEndpoint && !isAuthenticated) {
      logger.info('🔐 [ApiService] User not authenticated, skipping API call to:', url);
      throw new Error('User not authenticated');
    }
    
    // Get authentication headers (only if authenticated)
    const authHeaders = isAuthenticated ? getAuthHeaders() : {};
    
    logger.info('🔍 [ApiService] Auth headers:', authHeaders);
    
    // Add ETag headers only for analysis endpoints
    const isAnalysisEndpoint = url.includes('/analysis') || url.includes('/auto-finish') || url.includes('/auto-test');
    const etagOptions = isAnalysisEndpoint ? etagManager.addETagHeaders(options, url, projectId) : options;
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(etagOptions.headers || {})
      },
      credentials: 'include',
      ...etagOptions,
      ...options
    };

    logger.info('🔍 [ApiService] Final headers:', config.headers);
    logger.info('🔍 [ApiService] Request config:', {
      method: config.method || 'GET',
      headers: config.headers,
      hasBody: !!config.body
    });

    // Initialize timeout variables
    let timeoutId = null;
    let controller = null;

    try {
      // Get appropriate timeout based on endpoint type
      const timeoutMs = TimeoutConfig.getApiTimeout(endpoint);
      logger.info(`🔍 [ApiService] Using timeout: ${timeoutMs}ms for endpoint: ${endpoint}`);
      
      // Add timeout to prevent hanging
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        logger.warn(`⏰ [ApiService] Request timeout after ${timeoutMs}ms for ${endpoint}`);
        controller.abort();
      }, timeoutMs);

      config.signal = controller.signal;

      const response = await fetch(url, config);
      
      // Clear timeout on successful response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      logger.info('🔍 [ApiService] Response status:', response.status);

      // Handle authentication errors
      if (response.status === 401) {
        logger.info('❌ [ApiService] 401 Unauthorized - user not authenticated');
        const { handleAuthFailure } = useAuthStore.getState();
        handleAuthFailure('Session expired. Please log in again.');
        throw new Error('Authentication failed');
      }

      // Use ResponseManager for consistent response handling
      const result = await responseManager.handleResponse(response);
      
      // Modern API: Direct data response (no success wrapper)
      logger.info('✅ [ApiService] API call successful');
      logger.info('🔍 [ApiService] Response data:', { 
        dataType: typeof result, 
        hasData: !!result, 
        dataKeys: result ? Object.keys(result) : 'null',
        dataLength: Array.isArray(result) ? result.length : 'not array'
      });
      
      // Handle backend response format: { data: [...], pagination: {...} }
      if (result && typeof result === 'object' && result.data !== undefined) {
        return result.data; // Return just the data array
      }
      
      // Return data directly
      return result;

    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (error.name === 'AbortError') {
        logger.error(`⏰ [ApiService] Request aborted (timeout) for ${endpoint}`);
        throw new Error('Request timeout');
      }

      logger.error(`❌ [ApiService] API call failed for ${endpoint}:`, error);
      throw error; // Re-throw to let calling code handle
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} API response
   */
  async get(endpoint, options = {}, projectId = null) {
    return this.call(endpoint, { ...options, method: 'GET' }, projectId);
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} API response
   */
  async post(endpoint, data = {}, options = {}, projectId = null) {
    return this.call(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    }, projectId);
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} API response
   */
  async put(endpoint, data = {}, options = {}, projectId = null) {
    return this.call(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    }, projectId);
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} API response
   */
  async delete(endpoint, options = {}, projectId = null) {
    return this.call(endpoint, { ...options, method: 'DELETE' }, projectId);
  }
}

// Create singleton instance
const apiService = new ApiService();

// Export both the class and the singleton instance
export { ApiService };
export default apiService;
