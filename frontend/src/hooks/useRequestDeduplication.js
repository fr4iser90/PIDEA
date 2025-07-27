/**
 * useRequestDeduplication Hook
 * 
 * React hook for easy request deduplication usage in components.
 * Provides abort controller support and automatic cleanup.
 */

import { useCallback, useRef, useEffect } from 'react';
import requestDeduplicationService from '@/infrastructure/services/RequestDeduplicationService';

/**
 * React Hook for Request Deduplication
 * Provides easy-to-use deduplication in React components
 * 
 * @returns {Object} Hook methods and state
 */
export const useRequestDeduplication = () => {
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Execute request with deduplication
   * @param {string} key - Request key
   * @param {Function} requestFn - Request function
   * @param {Object} options - Request options
   * @returns {Promise} Request result
   */
  const executeRequest = useCallback(async (key, requestFn, options = {}) => {
    // Check if component is still mounted
    if (!mountedRef.current) {
      throw new Error('Component unmounted');
    }

    // Cancel previous request if abortable
    if (options.abortable && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller if needed
    if (options.abortable) {
      abortControllerRef.current = new AbortController();
      options.signal = abortControllerRef.current.signal;
    }

    try {
      return await requestDeduplicationService.execute(key, requestFn, options);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    }
  }, []);

  /**
   * Cancel current request
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  const getStats = useCallback(() => {
    return requestDeduplicationService.getStats();
  }, []);

  /**
   * Clear cache for specific key
   * @param {string} key - Cache key to clear
   */
  const clearCache = useCallback((key) => {
    if (key) {
      requestDeduplicationService.removeCached(key);
    } else {
      requestDeduplicationService.clearCache();
    }
  }, []);

  /**
   * Execute request with loading state management
   * @param {string} key - Request key
   * @param {Function} requestFn - Request function
   * @param {Object} options - Request options
   * @param {Function} setLoading - Loading state setter
   * @returns {Promise} Request result
   */
  const executeRequestWithLoading = useCallback(async (key, requestFn, options = {}, setLoading) => {
    if (setLoading) {
      setLoading(true);
    }

    try {
      const result = await executeRequest(key, requestFn, options);
      return result;
    } finally {
      if (setLoading && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [executeRequest]);

  /**
   * Execute request with error handling
   * @param {string} key - Request key
   * @param {Function} requestFn - Request function
   * @param {Object} options - Request options
   * @param {Function} setError - Error state setter
   * @returns {Promise} Request result
   */
  const executeRequestWithError = useCallback(async (key, requestFn, options = {}, setError) => {
    if (setError) {
      setError(null);
    }

    try {
      const result = await executeRequest(key, requestFn, options);
      return result;
    } catch (error) {
      if (setError && mountedRef.current) {
        setError(error.message || 'Request failed');
      }
      throw error;
    }
  }, [executeRequest]);

  /**
   * Execute request with both loading and error state management
   * @param {string} key - Request key
   * @param {Function} requestFn - Request function
   * @param {Object} options - Request options
   * @param {Function} setLoading - Loading state setter
   * @param {Function} setError - Error state setter
   * @returns {Promise} Request result
   */
  const executeRequestWithState = useCallback(async (key, requestFn, options = {}, setLoading, setError) => {
    if (setLoading) {
      setLoading(true);
    }
    if (setError) {
      setError(null);
    }

    try {
      const result = await executeRequest(key, requestFn, options);
      return result;
    } catch (error) {
      if (setError && mountedRef.current) {
        setError(error.message || 'Request failed');
      }
      throw error;
    } finally {
      if (setLoading && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [executeRequest]);

  return {
    executeRequest,
    executeRequestWithLoading,
    executeRequestWithError,
    executeRequestWithState,
    cancelRequest,
    getStats,
    clearCache,
    isMounted: () => mountedRef.current
  };
};

export default useRequestDeduplication; 