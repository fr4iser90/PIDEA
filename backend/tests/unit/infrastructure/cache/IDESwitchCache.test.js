const IDESwitchCache = require('@infrastructure/cache/IDESwitchCache');

describe('IDESwitchCache', () => {
  let cache;

  beforeEach(() => {
    cache = new IDESwitchCache({ ttl: 1000, maxSize: 5 });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Caching', () => {
    test('should cache and retrieve switch results', async () => {
      const result = { port: 9222, status: 'active' };
      
      cache.setCachedSwitch(9222, result);
      const cached = await cache.getCachedSwitch(9222);
      
      expect(cached).toEqual(result);
    });

    test('should return null for non-existent port', async () => {
      const cached = await cache.getCachedSwitch(9999);
      expect(cached).toBeNull();
    });

    test('should handle multiple ports', async () => {
      const result1 = { port: 9222, status: 'active' };
      const result2 = { port: 9223, status: 'running' };
      
      cache.setCachedSwitch(9222, result1);
      cache.setCachedSwitch(9223, result2);
      
      const cached1 = await cache.getCachedSwitch(9222);
      const cached2 = await cache.getCachedSwitch(9223);
      
      expect(cached1).toEqual(result1);
      expect(cached2).toEqual(result2);
    });
  });

  describe('TTL Expiration', () => {
    test('should expire cached results after TTL', async () => {
      const result = { port: 9222, status: 'active' };
      
      cache.setCachedSwitch(9222, result);
      
      // Should be cached immediately
      let cached = await cache.getCachedSwitch(9222);
      expect(cached).toEqual(result);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be expired
      cached = await cache.getCachedSwitch(9222);
      expect(cached).toBeNull();
    });

    test('should not expire before TTL', async () => {
      const result = { port: 9222, status: 'active' };
      
      cache.setCachedSwitch(9222, result);
      
      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Should still be cached
      const cached = await cache.getCachedSwitch(9222);
      expect(cached).toEqual(result);
    });
  });

  describe('Cache Size Limits', () => {
    test('should respect max size limit', () => {
      for (let i = 0; i < 10; i++) {
        cache.setCachedSwitch(9220 + i, { port: 9220 + i });
      }
      
      expect(cache.cache.size).toBeLessThanOrEqual(5);
    });

    test('should evict oldest entries when limit reached', () => {
      // Add entries
      for (let i = 0; i < 5; i++) {
        cache.setCachedSwitch(9220 + i, { port: 9220 + i });
      }
      
      // Add one more to trigger eviction
      cache.setCachedSwitch(9225, { port: 9225 });
      
      // Should still be at max size
      expect(cache.cache.size).toBeLessThanOrEqual(5);
      
      // Oldest entry should be evicted
      expect(cache.cache.has(9220)).toBe(false);
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate specific port', async () => {
      const result1 = { port: 9222, status: 'active' };
      const result2 = { port: 9223, status: 'running' };
      
      cache.setCachedSwitch(9222, result1);
      cache.setCachedSwitch(9223, result2);
      
      // Invalidate specific port
      cache.invalidateCache(9222);
      
      // Should be invalidated
      const cached1 = await cache.getCachedSwitch(9222);
      expect(cached1).toBeNull();
      
      // Other port should still be cached
      const cached2 = await cache.getCachedSwitch(9223);
      expect(cached2).toEqual(result2);
    });

    test('should invalidate all cache', async () => {
      const result1 = { port: 9222, status: 'active' };
      const result2 = { port: 9223, status: 'running' };
      
      cache.setCachedSwitch(9222, result1);
      cache.setCachedSwitch(9223, result2);
      
      // Invalidate all
      cache.invalidateCache();
      
      // All should be invalidated
      const cached1 = await cache.getCachedSwitch(9222);
      const cached2 = await cache.getCachedSwitch(9223);
      
      expect(cached1).toBeNull();
      expect(cached2).toBeNull();
    });
  });

  describe('Cleanup', () => {
    test('should clean up expired entries', async () => {
      const result = { port: 9222, status: 'active' };
      
      cache.setCachedSwitch(9222, result);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Manually trigger cleanup
      cache.cleanup();
      
      // Should be cleaned up
      const cached = await cache.getCachedSwitch(9222);
      expect(cached).toBeNull();
    });

    test('should handle cleanup with no expired entries', () => {
      const result = { port: 9222, status: 'active' };
      
      cache.setCachedSwitch(9222, result);
      
      // Cleanup should not affect valid entries
      cache.cleanup();
      
      expect(cache.cache.size).toBe(1);
    });
  });

  describe('Statistics', () => {
    test('should provide cache statistics', () => {
      const result = { port: 9222, status: 'active' };
      
      cache.setCachedSwitch(9222, result);
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(5);
      expect(stats.ttl).toBe(1000);
      expect(stats.entries).toHaveLength(1);
      expect(stats.entries[0].port).toBe(9222);
      expect(stats.entries[0].age).toBeGreaterThanOrEqual(0);
      expect(stats.entries[0].expiresIn).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully in getCachedSwitch', async () => {
      // Mock cache.get to throw error
      const originalGet = cache.cache.get;
      cache.cache.get = jest.fn().mockImplementation(() => {
        throw new Error('Cache error');
      });
      
      const result = await cache.getCachedSwitch(9222);
      expect(result).toBeNull();
      
      // Restore original method
      cache.cache.get = originalGet;
    });

    test('should handle errors gracefully in setCachedSwitch', () => {
      // Mock cache.set to throw error
      const originalSet = cache.cache.set;
      cache.cache.set = jest.fn().mockImplementation(() => {
        throw new Error('Cache error');
      });
      
      // Should not throw
      expect(() => {
        cache.setCachedSwitch(9222, { port: 9222 });
      }).not.toThrow();
      
      // Restore original method
      cache.cache.set = originalSet;
    });
  });

  describe('Performance', () => {
    test('should handle rapid cache operations', async () => {
      const start = Date.now();
      
      // Perform many cache operations
      for (let i = 0; i < 100; i++) {
        cache.setCachedSwitch(9220 + i, { port: 9220 + i });
        await cache.getCachedSwitch(9220 + i);
      }
      
      const duration = Date.now() - start;
      
      // Should complete quickly (under 100ms for 100 operations)
      expect(duration).toBeLessThan(100);
    });
  });
}); 