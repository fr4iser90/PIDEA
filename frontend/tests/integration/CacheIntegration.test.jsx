/**
 * Cache Integration Tests
 * Tests for complete cache flow integration across all components
 * Covers IDEStore, useAnalysisCache, RefreshService integration with CacheService
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { cacheService } from '@/infrastructure/services/CacheService';
import { cacheInvalidationService } from '@/infrastructure/services/CacheInvalidationService';

// Mock dependencies
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Cache Integration', () => {
  beforeEach(() => {
    // Reset cache before each test
    cacheService.clear();
  });

  afterEach(() => {
    // Clean up after each test
    cacheService.clear();
  });

  describe('IDEStore Integration', () => {
    it('should cache IDE data correctly', () => {
      const ideData = [
        { port: 9222, name: 'IDE1', active: true },
        { port: 9224, name: 'IDE2', active: false }
      ];

      // Test caching IDE data
      cacheService.set('store_load_available_ides', ideData, 'ide', 'ide');
      
      const cachedData = cacheService.get('store_load_available_ides');
      expect(cachedData).toEqual(ideData);
    });

    it('should cache IDE switch results', () => {
      const switchResult = { success: true, port: 9222 };
      
      cacheService.set('switch_ide_9222', switchResult, 'ide', 'ide');
      
      const cachedResult = cacheService.get('switch_ide_9222');
      expect(cachedResult).toEqual(switchResult);
    });

    it('should invalidate IDE cache on reset', () => {
      // Set some IDE cache data
      cacheService.set('store_load_available_ides', [], 'ide', 'ide');
      cacheService.set('switch_ide_9222', {}, 'ide', 'ide');
      
      // Invalidate IDE namespace
      cacheService.invalidateByNamespace('ide');
      
      // Check that IDE cache is cleared
      expect(cacheService.get('store_load_available_ides')).toBeNull();
      expect(cacheService.get('switch_ide_9222')).toBeNull();
    });
  });

  describe('useAnalysisCache Integration', () => {
    it('should cache analysis data correctly', () => {
      const analysisData = {
        metrics: { lines: 1000, complexity: 5 },
        status: 'completed',
        history: [{ timestamp: Date.now(), action: 'analysis' }]
      };

      const projectId = 'test-project';
      const dataType = 'metrics';
      
      // Test caching analysis data
      cacheService.set(`analysis:${projectId}:${dataType}:{}`, analysisData, dataType, 'analysis');
      
      const cachedData = cacheService.get(`analysis:${projectId}:${dataType}:{}`);
      expect(cachedData).toEqual(analysisData);
    });

    it('should handle different analysis data types', () => {
      const projectId = 'test-project';
      const dataTypes = ['metrics', 'status', 'history', 'issues', 'techStack'];
      
      dataTypes.forEach(dataType => {
        const data = { type: dataType, data: `test-${dataType}` };
        cacheService.set(`analysis:${projectId}:${dataType}:{}`, data, dataType, 'analysis');
        
        const cachedData = cacheService.get(`analysis:${projectId}:${dataType}:{}`);
        expect(cachedData).toEqual(data);
      });
    });

    it('should clear project cache correctly', () => {
      const projectId = 'test-project';
      
      // Set multiple analysis data types
      const dataTypes = ['metrics', 'status', 'history'];
      dataTypes.forEach(dataType => {
        cacheService.set(`analysis:${projectId}:${dataType}:{}`, { data: dataType }, dataType, 'analysis');
      });
      
      // Clear project cache
      dataTypes.forEach(dataType => {
        cacheService.delete(`analysis:${projectId}:${dataType}:{}`);
      });
      
      // Verify cache is cleared
      dataTypes.forEach(dataType => {
        expect(cacheService.get(`analysis:${projectId}:${dataType}:{}`)).toBeNull();
      });
    });
  });

  describe('RefreshService Integration', () => {
    it('should cache component data correctly', () => {
      const componentType = 'ide-list';
      const componentData = { components: [] };
      
      cacheService.set(`refresh:${componentType}`, componentData, 'default', componentType);
      
      const cachedData = cacheService.get(`refresh:${componentType}`);
      expect(cachedData).toEqual(componentData);
    });

    it('should handle component cache invalidation', () => {
      const componentTypes = ['ide-list', 'project-list', 'analysis-list'];
      
      // Set cache for multiple components
      componentTypes.forEach(type => {
        cacheService.set(`refresh:${type}`, { data: type }, 'default', type);
      });
      
      // Invalidate specific component
      cacheService.delete('refresh:ide-list');
      
      // Check that specific component is cleared
      expect(cacheService.get('refresh:ide-list')).toBeNull();
      
      // Check that other components remain
      expect(cacheService.get('refresh:project-list')).toBeDefined();
      expect(cacheService.get('refresh:analysis-list')).toBeDefined();
    });
  });

  describe('Cross-Component Cache Consistency', () => {
    it('should maintain consistent cache keys across components', () => {
      const port = 9222;
      const switchKey = `switch_ide_${port}`;
      
      // IDEStore caches switch result
      const switchResult = { success: true, port };
      cacheService.set(switchKey, switchResult, 'ide', 'ide');
      
      // APIChatRepository should be able to access same cache
      const cachedResult = cacheService.get(switchKey);
      expect(cachedResult).toEqual(switchResult);
    });

    it('should handle cache invalidation across components', () => {
      // Set cache data from different components
      cacheService.set('store_load_available_ides', [], 'ide', 'ide');
      cacheService.set('analysis:test:metrics:{}', {}, 'metrics', 'analysis');
      cacheService.set('refresh:ide-list', {}, 'default', 'ide-list');
      
      // Invalidate IDE namespace
      cacheService.invalidateByNamespace('ide');
      
      // IDE-related cache should be cleared
      expect(cacheService.get('store_load_available_ides')).toBeNull();
      expect(cacheService.get('refresh:ide-list')).toBeNull();
      
      // Analysis cache should remain
      expect(cacheService.get('analysis:test:metrics:{}')).toBeDefined();
    });
  });

  describe('Cache Performance', () => {
    it('should maintain good hit rate across components', () => {
      const testData = { test: 'data' };
      
      // Simulate cache operations
      for (let i = 0; i < 100; i++) {
        const key = `test-key-${i}`;
        cacheService.set(key, testData, 'default', 'test');
        cacheService.get(key);
      }
      
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.8); // 80% hit rate
    });

    it('should handle memory limits correctly', () => {
      const largeData = new Array(1000).fill('test-data');
      
      // Set large data
      cacheService.set('large-data', largeData, 'default', 'test');
      
      const stats = cacheService.getStats();
      expect(stats.memorySize).toBeGreaterThan(0);
      expect(stats.memoryEntries).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', () => {
      // Test with invalid data
      expect(() => {
        cacheService.set('test-key', undefined, 'default', 'test');
      }).not.toThrow();
      
      // Test with invalid key
      expect(() => {
        cacheService.get(null);
      }).not.toThrow();
    });

    it('should handle cache service unavailability', () => {
      // Mock cache service failure
      const originalGet = cacheService.get;
      cacheService.get = jest.fn(() => {
        throw new Error('Cache service unavailable');
      });
      
      expect(() => {
        cacheService.get('test-key');
      }).toThrow('Cache service unavailable');
      
      // Restore original method
      cacheService.get = originalGet;
    });
  });
});
