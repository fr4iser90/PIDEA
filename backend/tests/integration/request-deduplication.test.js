/**
 * Request Deduplication Integration Tests
 * 
 * End-to-end integration tests for the complete request deduplication system,
 * including frontend-backend integration, caching, and performance validation.
 */

import { jest } from '@jest/globals';
import requestDeduplicationService from '@/infrastructure/services/RequestDeduplicationService';
import requestMonitoringService from '@/infrastructure/services/RequestMonitoringService';
import { useRequestDeduplication } from '@/hooks/useRequestDeduplication';
import { renderHook, act } from '@testing-library/react';

// Mock fetch
global.fetch = jest.fn();

// Mock logger
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Request Deduplication Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestDeduplicationService.clearCache();
    requestMonitoringService.resetStats();
  });

  afterEach(() => {
    requestDeduplicationService.destroy();
    requestMonitoringService.destroy();
  });

  describe('Frontend-Backend Integration', () => {
    test('should deduplicate concurrent IDE switch requests', async () => {
      const mockResponse = { success: true, ide: 'vscode' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // Simulate multiple concurrent requests
      const requestFn = () => fetch('/api/ide/switch/3000');
      
      const promises = [
        requestDeduplicationService.execute('ide-switch-3000', requestFn),
        requestDeduplicationService.execute('ide-switch-3000', requestFn),
        requestDeduplicationService.execute('ide-switch-3000', requestFn)
      ];

      const results = await Promise.all(promises);

      // Should only make one actual request
      expect(fetch).toHaveBeenCalledTimes(1);
      
      // All promises should resolve with the same result
      results.forEach(result => {
        expect(result).toEqual(mockResponse);
      });

      // Check monitoring stats
      const stats = requestDeduplicationService.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.duplicateRequests).toBe(2);
      expect(stats.cacheHits).toBe(0); // No cache hits for concurrent requests
    });

    test('should cache successful requests and serve from cache', async () => {
      const mockResponse = { success: true, ides: ['vscode', 'cursor'] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const requestFn = () => fetch('/api/ide/available');

      // First request
      const result1 = await requestDeduplicationService.execute('ide-available', requestFn, {
        useCache: true,
        cacheTTL: 30000 // 30 seconds
      });

      // Second request (should be served from cache)
      const result2 = await requestDeduplicationService.execute('ide-available', requestFn, {
        useCache: true,
        cacheTTL: 30000
      });

      // Should only make one actual request
      expect(fetch).toHaveBeenCalledTimes(1);
      
      // Both should return the same result
      expect(result1).toEqual(mockResponse);
      expect(result2).toEqual(mockResponse);

      // Check cache stats
      const stats = requestDeduplicationService.getStats();
      expect(stats.cacheHits).toBe(1);
    });

    test('should handle request timeouts gracefully', async () => {
      // Mock a slow request
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 5000)) // 5 second delay
      );

      const requestFn = () => fetch('/api/ide/switch/3000');

      await expect(
        requestDeduplicationService.execute('ide-switch-3000', requestFn, {
          timeout: 1000 // 1 second timeout
        })
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('React Hook Integration', () => {
    test('should work with useRequestDeduplication hook', async () => {
      const mockResponse = { success: true, data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useRequestDeduplication());

      const requestFn = () => fetch('/api/test');

      let response;
      await act(async () => {
        response = await result.current.executeRequest('test-request', requestFn);
      });

      expect(response).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('should handle loading state correctly', async () => {
      const mockResponse = { success: true, data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useRequestDeduplication());

      const requestFn = () => fetch('/api/test');
      let loading = false;

      const promise = act(async () => {
        await result.current.executeRequestWithLoading('test-request', requestFn, {}, setLoading);
      });

      // Loading should be true during request
      expect(loading).toBe(true);

      await promise;

      // Loading should be false after request
      expect(loading).toBe(false);
    });

    test('should handle error state correctly', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useRequestDeduplication());

      const requestFn = () => fetch('/api/test');
      let error = null;

      await act(async () => {
        try {
          await result.current.executeRequestWithError('test-request', requestFn, {}, setError);
        } catch (e) {
          // Expected error
        }
      });

      expect(error).toBe('Network error');
    });
  });

  describe('Cache Management', () => {
    test('should respect cache TTL', async () => {
      const mockResponse = { success: true, data: 'test' };
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const requestFn = () => fetch('/api/test');

      // First request
      await requestDeduplicationService.execute('test-cache', requestFn, {
        useCache: true,
        cacheTTL: 100 // 100ms TTL
      });

      // Second request within TTL (should be cached)
      await requestDeduplicationService.execute('test-cache', requestFn, {
        useCache: true,
        cacheTTL: 100
      });

      // Should only make one actual request
      expect(fetch).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third request after TTL (should make new request)
      await requestDeduplicationService.execute('test-cache', requestFn, {
        useCache: true,
        cacheTTL: 100
      });

      // Should make second actual request
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('should handle cache size limits', async () => {
      const mockResponse = { success: true, data: 'test' };
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      // Create a service with small cache size
      const smallCacheService = new (require('@/infrastructure/services/RequestDeduplicationService').default)({
        maxCacheSize: 2
      });

      const requestFn = () => fetch('/api/test');

      // Fill cache
      await smallCacheService.execute('key1', requestFn, { useCache: true });
      await smallCacheService.execute('key2', requestFn, { useCache: true });
      await smallCacheService.execute('key3', requestFn, { useCache: true });

      // Should have evicted oldest entry
      expect(smallCacheService.cache.size).toBeLessThanOrEqual(2);

      smallCacheService.destroy();
    });
  });

  describe('Performance Validation', () => {
    test('should improve response time for cached requests', async () => {
      const mockResponse = { success: true, data: 'test' };
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const requestFn = () => fetch('/api/test');

      // First request (uncached)
      const start1 = Date.now();
      await requestDeduplicationService.execute('perf-test', requestFn, { useCache: true });
      const time1 = Date.now() - start1;

      // Second request (cached)
      const start2 = Date.now();
      await requestDeduplicationService.execute('perf-test', requestFn, { useCache: true });
      const time2 = Date.now() - start2;

      // Cached request should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.1); // At least 10x faster
    });

    test('should handle high concurrency without performance degradation', async () => {
      const mockResponse = { success: true, data: 'test' };
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const requestFn = () => fetch('/api/test');

      // Create many concurrent requests
      const promises = Array.from({ length: 50 }, (_, i) =>
        requestDeduplicationService.execute(`concurrent-${i}`, requestFn)
      );

      const start = Date.now();
      await Promise.all(promises);
      const totalTime = Date.now() - start;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // Less than 5 seconds

      // Should make exactly 50 requests (no deduplication for different keys)
      expect(fetch).toHaveBeenCalledTimes(50);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const requestFn = () => fetch('/api/test');

      await expect(
        requestDeduplicationService.execute('error-test', requestFn)
      ).rejects.toThrow('Network error');

      // Should not cache failed requests
      const stats = requestDeduplicationService.getStats();
      expect(stats.errors).toBe(1);
    });

    test('should handle partial failures in concurrent requests', async () => {
      let callCount = 0;
      fetch.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true })
        });
      });

      const requestFn = () => fetch('/api/test');

      const promises = [
        requestDeduplicationService.execute('partial-failure-1', requestFn),
        requestDeduplicationService.execute('partial-failure-2', requestFn),
        requestDeduplicationService.execute('partial-failure-3', requestFn)
      ];

      const results = await Promise.allSettled(promises);

      // One should fail, others should succeed
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');

      expect(fulfilled.length).toBe(2);
      expect(rejected.length).toBe(1);
    });
  });

  describe('Monitoring Integration', () => {
    test('should track requests in monitoring service', async () => {
      const mockResponse = { success: true, data: 'test' };
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const requestFn = () => fetch('/api/test');

      // Track request start
      const requestId = requestMonitoringService.trackRequestStart('/api/test', 'user123');

      // Execute request
      await requestDeduplicationService.execute('monitoring-test', requestFn);

      // Track request completion
      requestMonitoringService.trackRequestComplete(requestId, true, 100, mockResponse);

      // Check monitoring stats
      const stats = requestMonitoringService.getStats();
      expect(stats.performance.totalRequests).toBe(1);
      expect(stats.performance.successfulRequests).toBe(1);
    });

    test('should track duplicate requests', async () => {
      const mockResponse = { success: true, data: 'test' };
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const requestFn = () => fetch('/api/test');

      // Track duplicate request
      requestMonitoringService.trackDuplicateRequest('/api/test', 'user123');

      // Execute request
      await requestDeduplicationService.execute('duplicate-test', requestFn);

      // Check monitoring stats
      const stats = requestMonitoringService.getStats();
      expect(stats.endpoints['/api/test'].duplicateRequests).toBe(1);
    });
  });
}); 