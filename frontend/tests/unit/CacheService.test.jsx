/**
 * CacheService Unit Tests
 * Tests for the consolidated cache service functionality
 * Covers TTL management, selective invalidation, memory management, and performance monitoring
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CacheService } from '@/infrastructure/services/CacheService';
import { EventCoordinator } from '@/infrastructure/services/EventCoordinator';

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
    emit: jest.fn()
  }))
}));

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          put: jest.fn(),
          get: jest.fn(),
          delete: jest.fn(),
          clear: jest.fn()
        }))
      }))
    }
  }))
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

describe('CacheService', () => {
  let cacheService;
  let mockEventCoordinator;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create new instance
    cacheService = new CacheService();
    mockEventCoordinator = new EventCoordinator();
    
    // Mock event coordinator
    cacheService.eventCoordinator = mockEventCoordinator;
  });

  afterEach(() => {
    if (cacheService) {
      cacheService.clear();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(cacheService.config).toBeDefined();
      expect(cacheService.config.default.ttl).toBe(12 * 60 * 60 * 1000); // 12 hours
      expect(cacheService.config.project.ttl).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(cacheService.config.ide.ttl).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should initialize memory cache as empty Map', () => {
      expect(cacheService.memoryCache).toBeInstanceOf(Map);
      expect(cacheService.memoryCache.size).toBe(0);
    });

    it('should initialize statistics with zero values', () => {
      expect(cacheService.stats.hits).toBe(0);
      expect(cacheService.stats.misses).toBe(0);
      expect(cacheService.stats.sets).toBe(0);
      expect(cacheService.stats.deletes).toBe(0);
    });

    it('should setup event listeners for selective invalidation', () => {
      expect(mockEventCoordinator.on).toHaveBeenCalledWith('ide:switch', expect.any(Function));
      expect(mockEventCoordinator.on).toHaveBeenCalledWith('project:change', expect.any(Function));
      expect(mockEventCoordinator.on).toHaveBeenCalledWith('analysis:complete', expect.any(Function));
      expect(mockEventCoordinator.on).toHaveBeenCalledWith('chat:new', expect.any(Function));
    });
  });

  describe('Cache Operations', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should set and get data successfully', () => {
      const key = 'test:key';
      const data = { test: 'data' };
      const dataType = 'project';
      const namespace = 'test';

      const setResult = cacheService.set(key, data, dataType, namespace);
      expect(setResult).toBe(true);

      const retrievedData = cacheService.get(key);
      expect(retrievedData).toEqual(data);
      expect(cacheService.stats.hits).toBe(1);
      expect(cacheService.stats.sets).toBe(1);
    });

    it('should return null for non-existent key', () => {
      const retrievedData = cacheService.get('non:existent');
      expect(retrievedData).toBeNull();
      expect(cacheService.stats.misses).toBe(1);
    });

    it('should return null for expired data', () => {
      const key = 'test:expired';
      const data = { test: 'data' };
      
      // Set data with very short TTL
      cacheService.set(key, data, 'ide', 'test'); // 5 minutes TTL
      
      // Manually expire the data
      const cacheItem = cacheService.memoryCache.get(key);
      cacheItem.expires = Date.now() - 1000; // Expired 1 second ago
      
      const retrievedData = cacheService.get(key);
      expect(retrievedData).toBeNull();
      expect(cacheService.stats.misses).toBe(1);
    });

    it('should delete cache entry successfully', () => {
      const key = 'test:delete';
      const data = { test: 'data' };
      
      cacheService.set(key, data, 'default', 'test');
      expect(cacheService.memoryCache.has(key)).toBe(true);
      
      const deleteResult = cacheService.delete(key);
      expect(deleteResult).toBe(true);
      expect(cacheService.memoryCache.has(key)).toBe(false);
      expect(cacheService.stats.deletes).toBe(1);
    });

    it('should handle delete of non-existent key gracefully', () => {
      const deleteResult = cacheService.delete('non:existent');
      expect(deleteResult).toBe(false);
    });
  });

  describe('TTL Management', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should use correct TTL for different data types', () => {
      const projectData = { project: 'data' };
      const ideData = { ide: 'data' };
      
      cacheService.set('project:test', projectData, 'project', 'test');
      cacheService.set('ide:test', ideData, 'ide', 'test');
      
      const projectItem = cacheService.memoryCache.get('project:test');
      const ideItem = cacheService.memoryCache.get('ide:test');
      
      expect(projectItem.ttl).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(ideItem.ttl).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should use default TTL for unknown data type', () => {
      const data = { test: 'data' };
      
      cacheService.set('test:unknown', data, 'unknownType', 'test');
      
      const cacheItem = cacheService.memoryCache.get('test:unknown');
      expect(cacheItem.ttl).toBe(12 * 60 * 60 * 1000); // Default 12 hours
    });

    it('should calculate correct expiration time', () => {
      const key = 'test:expiration';
      const data = { test: 'data' };
      const beforeSet = Date.now();
      
      cacheService.set(key, data, 'ide', 'test'); // 5 minutes TTL
      
      const cacheItem = cacheService.memoryCache.get(key);
      const afterSet = Date.now();
      
      expect(cacheItem.expires).toBeGreaterThanOrEqual(beforeSet + (5 * 60 * 1000));
      expect(cacheItem.expires).toBeLessThanOrEqual(afterSet + (5 * 60 * 1000));
    });
  });

  describe('Selective Invalidation', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should track namespaces correctly', () => {
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      cacheService.set('ide:port2', { data: 2 }, 'ide', 'ide');
      cacheService.set('project:proj1', { data: 3 }, 'project', 'project');
      
      expect(cacheService.namespaces.has('ide')).toBe(true);
      expect(cacheService.namespaces.has('project')).toBe(true);
      expect(cacheService.namespaces.get('ide').size).toBe(2);
      expect(cacheService.namespaces.get('project').size).toBe(1);
    });

    it('should invalidate by namespace', () => {
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      cacheService.set('ide:port2', { data: 2 }, 'ide', 'ide');
      cacheService.set('project:proj1', { data: 3 }, 'project', 'project');
      
      cacheService.invalidateByNamespace('ide');
      
      expect(cacheService.memoryCache.has('ide:port1')).toBe(false);
      expect(cacheService.memoryCache.has('ide:port2')).toBe(false);
      expect(cacheService.memoryCache.has('project:proj1')).toBe(true);
      expect(cacheService.stats.selectiveInvalidations).toBe(1);
    });

    it('should invalidate by namespace with identifier', () => {
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      cacheService.set('ide:port2', { data: 2 }, 'ide', 'ide');
      cacheService.set('project:proj1', { data: 3 }, 'project', 'project');
      
      cacheService.invalidateByNamespace('ide', 'port1');
      
      expect(cacheService.memoryCache.has('ide:port1')).toBe(false);
      expect(cacheService.memoryCache.has('ide:port2')).toBe(true);
      expect(cacheService.memoryCache.has('project:proj1')).toBe(true);
    });

    it('should remove from namespace tracking when deleting', () => {
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      cacheService.set('ide:port2', { data: 2 }, 'ide', 'ide');
      
      expect(cacheService.namespaces.get('ide').size).toBe(2);
      
      cacheService.delete('ide:port1');
      
      expect(cacheService.namespaces.get('ide').size).toBe(1);
      expect(cacheService.namespaces.get('ide').has('ide:port1')).toBe(false);
      expect(cacheService.namespaces.get('ide').has('ide:port2')).toBe(true);
    });
  });

  describe('Memory Management', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should calculate data size correctly', () => {
      const smallData = { small: 'data' };
      const largeData = { large: 'data'.repeat(1000) };
      
      const smallSize = cacheService.calculateSize(smallData);
      const largeSize = cacheService.calculateSize(largeData);
      
      expect(smallSize).toBeGreaterThan(0);
      expect(largeSize).toBeGreaterThan(smallSize);
    });

    it('should evict by priority when memory limit reached', () => {
      // Set max memory size to a small value for testing
      cacheService.maxMemorySize = 1000; // 1KB
      
      // Add low priority data
      cacheService.set('low:1', { data: 'low priority' }, 'chat', 'low');
      cacheService.set('low:2', { data: 'low priority' }, 'chat', 'low');
      
      // Add high priority data that should trigger eviction
      cacheService.set('high:1', { data: 'high priority' }, 'project', 'high');
      
      // Low priority data should be evicted
      expect(cacheService.memoryCache.has('low:1')).toBe(false);
      expect(cacheService.memoryCache.has('high:1')).toBe(true);
    });

    it('should evict oldest entry when entry limit reached', () => {
      // Set max entries to a small value for testing
      cacheService.maxMemoryEntries = 2;
      
      cacheService.set('first', { data: 1 }, 'default', 'test');
      cacheService.set('second', { data: 2 }, 'default', 'test');
      cacheService.set('third', { data: 3 }, 'default', 'test');
      
      // First entry should be evicted (oldest)
      expect(cacheService.memoryCache.has('first')).toBe(false);
      expect(cacheService.memoryCache.has('second')).toBe(true);
      expect(cacheService.memoryCache.has('third')).toBe(true);
    });

    it('should update memory size tracking', () => {
      const data1 = { test: 'data1' };
      const data2 = { test: 'data2' };
      
      cacheService.set('test:1', data1, 'default', 'test');
      const size1 = cacheService.currentMemorySize;
      
      cacheService.set('test:2', data2, 'default', 'test');
      const size2 = cacheService.currentMemorySize;
      
      expect(size2).toBeGreaterThan(size1);
      
      cacheService.delete('test:1');
      const size3 = cacheService.currentMemorySize;
      
      expect(size3).toBeLessThan(size2);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should track hit rate correctly', () => {
      cacheService.set('test:1', { data: 1 }, 'default', 'test');
      cacheService.set('test:2', { data: 2 }, 'default', 'test');
      
      // Hit
      cacheService.get('test:1');
      expect(cacheService.stats.hitRate).toBe(1);
      
      // Miss
      cacheService.get('test:3');
      expect(cacheService.stats.hitRate).toBe(0.5);
      
      // Another hit
      cacheService.get('test:2');
      expect(cacheService.stats.hitRate).toBe(2/3);
    });

    it('should track average response time', () => {
      cacheService.set('test:1', { data: 1 }, 'default', 'test');
      
      // Mock performance.now to return specific values
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount * 10; // 10ms, 20ms, 30ms, etc.
      });
      
      cacheService.get('test:1');
      
      // Restore original function
      performance.now = originalNow;
      
      expect(cacheService.stats.averageResponseTime).toBeGreaterThan(0);
    });

    it('should provide comprehensive statistics', () => {
      cacheService.set('test:1', { data: 1 }, 'default', 'test');
      cacheService.get('test:1');
      cacheService.get('test:2'); // miss
      cacheService.delete('test:1');
      
      const stats = cacheService.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.deletes).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.memoryEntries).toBe(0);
      expect(stats.namespaces).toBe(0);
      expect(stats.isInitialized).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = cacheService.getConfig();
      
      expect(config).toBeDefined();
      expect(config.default).toBeDefined();
      expect(config.project).toBeDefined();
      expect(config.ide).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = {
        custom: { ttl: 1000, priority: 'high' }
      };
      
      cacheService.updateConfig(newConfig);
      
      expect(cacheService.config.custom).toBeDefined();
      expect(cacheService.config.custom.ttl).toBe(1000);
      expect(cacheService.config.custom.priority).toBe('high');
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should cleanup expired entries', () => {
      const key = 'test:expired';
      const data = { test: 'data' };
      
      cacheService.set(key, data, 'ide', 'test');
      
      // Manually expire the data
      const cacheItem = cacheService.memoryCache.get(key);
      cacheItem.expires = Date.now() - 1000;
      
      cacheService.cleanupExpiredEntries();
      
      expect(cacheService.memoryCache.has(key)).toBe(false);
    });

    it('should cleanup old entries based on access time', () => {
      const key = 'test:old';
      const data = { test: 'data' };
      
      cacheService.set(key, data, 'default', 'test');
      
      // Manually set old access time
      const cacheItem = cacheService.memoryCache.get(key);
      cacheItem.lastAccess = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      
      cacheService.cleanupOldEntries();
      
      expect(cacheService.memoryCache.has(key)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should handle set errors gracefully', () => {
      // Mock calculateSize to throw error
      const originalCalculateSize = cacheService.calculateSize;
      cacheService.calculateSize = jest.fn(() => {
        throw new Error('Size calculation failed');
      });
      
      const result = cacheService.set('test:error', { data: 1 }, 'default', 'test');
      
      expect(result).toBe(false);
      
      // Restore original function
      cacheService.calculateSize = originalCalculateSize;
    });

    it('should handle get errors gracefully', () => {
      // Mock memoryCache.get to throw error
      const originalGet = cacheService.memoryCache.get;
      cacheService.memoryCache.get = jest.fn(() => {
        throw new Error('Cache access failed');
      });
      
      const result = cacheService.get('test:error');
      
      expect(result).toBeNull();
      expect(cacheService.stats.misses).toBe(1);
      
      // Restore original function
      cacheService.memoryCache.get = originalGet;
    });

    it('should handle delete errors gracefully', () => {
      // Mock memoryCache.get to throw error
      const originalGet = cacheService.memoryCache.get;
      cacheService.memoryCache.get = jest.fn(() => {
        throw new Error('Cache access failed');
      });
      
      const result = cacheService.delete('test:error');
      
      expect(result).toBe(false);
      
      // Restore original function
      cacheService.memoryCache.get = originalGet;
    });
  });
});
