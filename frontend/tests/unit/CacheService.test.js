/**
 * CacheService Tests
 * Comprehensive test suite for cache functionality
 * Tests bundle caching, hierarchical keys, and performance
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CacheService } from '@/infrastructure/services/CacheService';
import { cacheConfig } from '@/config/cache-config';

// Mock dependencies
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/infrastructure/services/EventCoordinator', () => ({
  EventCoordinator: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn()
  }))
}));

describe('CacheService', () => {
  let cacheService;

  beforeEach(() => {
    cacheService = new CacheService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (cacheService) {
      cacheService.cleanup?.();
    }
  });

  describe('Basic Cache Operations', () => {
    it('should set and get data correctly', () => {
      const key = 'test-key';
      const data = { message: 'test data' };
      
      const result = cacheService.set(key, data, 'default', 'test');
      expect(result).toBe(true);
      
      const retrieved = cacheService.get(key);
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      const retrieved = cacheService.get('non-existent-key');
      expect(retrieved).toBeNull();
    });

    it('should delete data correctly', () => {
      const key = 'test-key';
      const data = { message: 'test data' };
      
      cacheService.set(key, data, 'default', 'test');
      const deleteResult = cacheService.delete(key);
      
      expect(deleteResult).toBe(true);
      expect(cacheService.get(key)).toBeNull();
    });

    it('should handle TTL expiration', () => {
      const key = 'test-key';
      const data = { message: 'test data' };
      
      // Set with very short TTL
      cacheService.set(key, data, 'default', 'test');
      
      // Mock expired timestamp
      const cacheItem = cacheService.memoryCache.get(key);
      cacheItem.expires = Date.now() - 1000; // Expired 1 second ago
      
      const retrieved = cacheService.get(key);
      expect(retrieved).toBeNull();
    });
  });

  describe('Hierarchical Key Generation', () => {
    it('should generate correct hierarchical keys', () => {
      const key = cacheService.generateHierarchicalKey('tasks', '9222', 'project123', 'data');
      expect(key).toBe('tasks:9222:project123:data');
    });

    it('should generate keys with different parameters', () => {
      const key1 = cacheService.generateHierarchicalKey('ide', '9232', 'project456', 'status');
      expect(key1).toBe('ide:9232:project456:status');
      
      const key2 = cacheService.generateHierarchicalKey('git', '9242', 'project789', 'branch');
      expect(key2).toBe('git:9242:project789:branch');
    });
  });

  describe('Bundle Caching', () => {
    it('should cache bundle data correctly', () => {
      const bundleKey = 'project-bundle';
      const bundleData = {
        tasks: [{ id: 1, title: 'Task 1' }],
        git: { branch: 'main', status: 'clean' },
        analysis: { score: 85 }
      };
      const port = '9222';
      const projectId = 'project123';
      
      const result = cacheService.cacheBundle(bundleKey, bundleData, port, projectId);
      expect(result).toBe(true);
      
      // Check bundle cache
      const bundleCacheKey = cacheService.generateHierarchicalKey('analysisBundle', port, projectId, bundleKey);
      const cachedBundle = cacheService.get(bundleCacheKey);
      expect(cachedBundle).toEqual(bundleData);
      
      // Check individual component caches
      const tasksKey = cacheService.generateHierarchicalKey('tasks', port, projectId, 'data');
      const cachedTasks = cacheService.get(tasksKey);
      expect(cachedTasks).toEqual(bundleData.tasks);
    });

    it('should retrieve bundle data correctly', () => {
      const bundleKey = 'project-bundle';
      const bundleData = {
        tasks: [{ id: 1, title: 'Task 1' }],
        git: { branch: 'main' }
      };
      const port = '9222';
      const projectId = 'project123';
      
      cacheService.cacheBundle(bundleKey, bundleData, port, projectId);
      
      const retrieved = cacheService.getBundle(bundleKey, port, projectId);
      expect(retrieved).toEqual(bundleData);
    });

    it('should return null for non-existent bundles', () => {
      const retrieved = cacheService.getBundle('non-existent', '9222', 'project123');
      expect(retrieved).toBeNull();
    });
  });

  describe('Cache Warming', () => {
    beforeEach(() => {
      // Mock apiCall for warming tests
      jest.doMock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
        apiCall: jest.fn()
      }));
    });

    it('should warm cache with patterns', async () => {
      const patterns = [
        { namespace: 'tasks', dataType: 'tasks', priority: 'high' },
        { namespace: 'git', dataType: 'git', priority: 'medium' }
      ];
      const port = '9222';
      const projectId = 'project123';
      
      // Mock successful API responses
      const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
      apiCall.mockImplementation((url) => {
        if (url.includes('/tasks')) {
          return Promise.resolve({ success: true, data: [{ id: 1, title: 'Task 1' }] });
        }
        if (url.includes('/git/status')) {
          return Promise.resolve({ success: true, data: { branch: 'main' } });
        }
        return Promise.resolve({ success: false });
      });
      
      const results = await cacheService.warmCache(patterns, port, projectId);
      
      expect(results.warmed).toHaveLength(2);
      expect(results.failed).toHaveLength(0);
      expect(results.totalTime).toBeGreaterThan(0);
    });

    it('should handle warming failures gracefully', async () => {
      const patterns = [
        { namespace: 'tasks', dataType: 'tasks', priority: 'high' }
      ];
      const port = '9222';
      const projectId = 'project123';
      
      // Mock API failure
      const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
      apiCall.mockRejectedValue(new Error('API Error'));
      
      const results = await cacheService.warmCache(patterns, port, projectId);
      
      expect(results.warmed).toHaveLength(0);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].status).toBe('error');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track cache statistics', () => {
      const key = 'test-key';
      const data = { message: 'test data' };
      
      // Set data
      cacheService.set(key, data, 'default', 'test');
      expect(cacheService.stats.sets).toBe(1);
      
      // Get data (hit)
      cacheService.get(key);
      expect(cacheService.stats.hits).toBe(1);
      
      // Get non-existent data (miss)
      cacheService.get('non-existent');
      expect(cacheService.stats.misses).toBe(1);
      
      // Delete data
      cacheService.delete(key);
      expect(cacheService.stats.deletes).toBe(1);
    });

    it('should calculate hit rate correctly', () => {
      const key = 'test-key';
      const data = { message: 'test data' };
      
      cacheService.set(key, data, 'default', 'test');
      
      // 2 hits, 1 miss = 66.7% hit rate
      cacheService.get(key); // hit
      cacheService.get(key); // hit
      cacheService.get('non-existent'); // miss
      
      expect(cacheService.stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should track response times', () => {
      const key = 'test-key';
      const data = { message: 'test data' };
      
      cacheService.set(key, data, 'default', 'test');
      cacheService.get(key);
      
      expect(cacheService.stats.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    it('should respect memory limits', () => {
      const originalMaxSize = cacheService.maxMemorySize;
      cacheService.maxMemorySize = 100; // Very small limit for testing
      
      // Try to cache large data
      const largeData = new Array(1000).fill('x').join('');
      const result = cacheService.set('large-key', largeData, 'default', 'test');
      
      // Should still succeed but may trigger eviction
      expect(result).toBe(true);
      
      // Restore original limit
      cacheService.maxMemorySize = originalMaxSize;
    });

    it('should evict entries when limit exceeded', () => {
      const originalMaxEntries = cacheService.maxMemoryEntries;
      cacheService.maxMemoryEntries = 2; // Very small limit for testing
      
      // Fill cache beyond limit
      cacheService.set('key1', 'data1', 'default', 'test');
      cacheService.set('key2', 'data2', 'default', 'test');
      cacheService.set('key3', 'data3', 'default', 'test');
      
      // Should have evicted oldest entries
      expect(cacheService.memoryCache.size).toBeLessThanOrEqual(2);
      
      // Restore original limit
      cacheService.maxMemoryEntries = originalMaxEntries;
    });
  });

  describe('Configuration Integration', () => {
    it('should use correct TTL from configuration', () => {
      const key = 'test-key';
      const data = { message: 'test data' };
      
      cacheService.set(key, data, 'tasks', 'test');
      
      const cacheItem = cacheService.memoryCache.get(key);
      const expectedTTL = cacheConfig.dataTypes.tasks.ttl;
      
      expect(cacheItem.ttl).toBe(expectedTTL);
    });

    it('should use correct priority from configuration', () => {
      const key = 'test-key';
      const data = { message: 'test data' };
      
      cacheService.set(key, data, 'tasks', 'test');
      
      const cacheItem = cacheService.memoryCache.get(key);
      const expectedPriority = cacheConfig.dataTypes.tasks.priority;
      
      expect(cacheItem.priority).toBe(expectedPriority);
    });
  });

  describe('Error Handling', () => {
    it('should handle set errors gracefully', () => {
      // Mock error in calculateSize
      const originalCalculateSize = cacheService.calculateSize;
      cacheService.calculateSize = jest.fn().mockImplementation(() => {
        throw new Error('Size calculation failed');
      });
      
      const result = cacheService.set('test-key', 'test-data', 'default', 'test');
      expect(result).toBe(false);
      
      // Restore original method
      cacheService.calculateSize = originalCalculateSize;
    });

    it('should handle get errors gracefully', () => {
      // Mock error in memory cache access
      const originalGet = cacheService.memoryCache.get;
      cacheService.memoryCache.get = jest.fn().mockImplementation(() => {
        throw new Error('Cache access failed');
      });
      
      const result = cacheService.get('test-key');
      expect(result).toBeNull();
      expect(cacheService.stats.misses).toBe(1);
      
      // Restore original method
      cacheService.memoryCache.get = originalGet;
    });
  });
});
