/**
 * QueryCache Unit Tests
 *
 * Tests for query caching system including cache management,
 * query storage, retrieval, invalidation, and performance optimization.
 */

const QueryCache = require("../../infrastructure/database/QueryCache");
const Logger = require("../../infrastructure/logging/Logger");

describe("QueryCache Unit Tests", () => {
  let queryCache;
  let mockLogger;
  let mockConfig;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.spyOn(Logger, "Logger").mockImplementation(() => mockLogger);

    // Mock configuration
    mockConfig = {
      maxSize: 1000,
      ttl: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      enableStats: true,
    };

    queryCache = new QueryCache(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (queryCache) {
      queryCache.clear();
      queryCache.destroy();
    }
  });

  describe("Constructor", () => {
    test("should create instance with correct configuration", () => {
      expect(queryCache.config).toEqual(mockConfig);
      expect(queryCache.cache).toBeDefined();
      expect(queryCache.stats).toBeDefined();
    });

    test("should handle missing configuration gracefully", () => {
      const cache = new QueryCache({});

      expect(cache.config).toEqual({});
      expect(cache.cache).toBeDefined();
    });

    test("should initialize with default values", () => {
      const cache = new QueryCache();

      expect(cache.cache).toBeDefined();
      expect(cache.stats).toBeDefined();
    });
  });

  describe("Cache Operations", () => {
    test("should store query result in cache", () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const params = [1];
      const result = [{ id: 1, name: "John" }];

      queryCache.set(query, params, result);

      expect(queryCache.has(query, params)).toBe(true);
    });

    test("should retrieve query result from cache", () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const params = [1];
      const result = [{ id: 1, name: "John" }];

      queryCache.set(query, params, result);
      const cachedResult = queryCache.get(query, params);

      expect(cachedResult).toEqual(result);
    });

    test("should return null for non-existent query", () => {
      const query = "SELECT * FROM non_existent_table";
      const params = [];

      const result = queryCache.get(query, params);

      expect(result).toBeNull();
    });

    test("should handle different parameter combinations", () => {
      const query = "SELECT * FROM users WHERE id = ? AND status = ?";
      const params1 = [1, "active"];
      const params2 = [2, "inactive"];
      const result1 = [{ id: 1, name: "John", status: "active" }];
      const result2 = [{ id: 2, name: "Jane", status: "inactive" }];

      queryCache.set(query, params1, result1);
      queryCache.set(query, params2, result2);

      expect(queryCache.get(query, params1)).toEqual(result1);
      expect(queryCache.get(query, params2)).toEqual(result2);
    });
  });

  describe("Cache Invalidation", () => {
    test("should invalidate specific query", () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const params = [1];
      const result = [{ id: 1, name: "John" }];

      queryCache.set(query, params, result);
      expect(queryCache.has(query, params)).toBe(true);

      queryCache.invalidate(query, params);
      expect(queryCache.has(query, params)).toBe(false);
    });

    test("should invalidate all queries for a table", () => {
      const query1 = "SELECT * FROM users WHERE id = ?";
      const query2 = "SELECT * FROM users WHERE status = ?";
      const query3 = "SELECT * FROM posts WHERE user_id = ?";
      const result = [{ id: 1, name: "John" }];

      queryCache.set(query1, [1], result);
      queryCache.set(query2, ["active"], result);
      queryCache.set(query3, [1], result);

      queryCache.invalidateTable("users");

      expect(queryCache.has(query1, [1])).toBe(false);
      expect(queryCache.has(query2, ["active"])).toBe(false);
      expect(queryCache.has(query3, [1])).toBe(true); // Different table
    });

    test("should clear entire cache", () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const params = [1];
      const result = [{ id: 1, name: "John" }];

      queryCache.set(query, params, result);
      expect(queryCache.has(query, params)).toBe(true);

      queryCache.clear();
      expect(queryCache.has(query, params)).toBe(false);
    });
  });

  describe("Cache Statistics", () => {
    test("should track cache hits and misses", () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const params = [1];
      const result = [{ id: 1, name: "John" }];

      // Miss
      queryCache.get(query, params);
      expect(queryCache.stats.misses).toBe(1);

      // Set and hit
      queryCache.set(query, params, result);
      queryCache.get(query, params);
      expect(queryCache.stats.hits).toBe(1);
    });

    test("should calculate hit ratio correctly", () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const params = [1];
      const result = [{ id: 1, name: "John" }];

      // 2 misses
      queryCache.get(query, params);
      queryCache.get(query, [2]);

      // 1 hit
      queryCache.set(query, params, result);
      queryCache.get(query, params);

      const hitRatio = queryCache.getHitRatio();
      expect(hitRatio).toBe(1 / 3); // 1 hit out of 3 total requests
    });

    test("should track cache size", () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const result = [{ id: 1, name: "John" }];

      queryCache.set(query, [1], result);
      queryCache.set(query, [2], result);

      expect(queryCache.getSize()).toBe(2);
    });

    test("should reset statistics", () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const params = [1];
      const result = [{ id: 1, name: "John" }];

      queryCache.get(query, params); // Miss
      queryCache.set(query, params, result);
      queryCache.get(query, params); // Hit

      expect(queryCache.stats.hits).toBe(1);
      expect(queryCache.stats.misses).toBe(1);

      queryCache.resetStats();

      expect(queryCache.stats.hits).toBe(0);
      expect(queryCache.stats.misses).toBe(0);
    });
  });

  describe("TTL (Time To Live)", () => {
    test("should expire entries after TTL", async () => {
      const shortTTLConfig = { ttl: 100 }; // 100ms
      const cache = new QueryCache(shortTTLConfig);

      const query = "SELECT * FROM users WHERE id = ?";
      const params = [1];
      const result = [{ id: 1, name: "John" }];

      cache.set(query, params, result);
      expect(cache.has(query, params)).toBe(true);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.has(query, params)).toBe(false);

      cache.destroy();
    });

    test("should not expire entries before TTL", async () => {
      const longTTLConfig = { ttl: 1000 }; // 1 second
      const cache = new QueryCache(longTTLConfig);

      const query = "SELECT * FROM users WHERE id = ?";
      const params = [1];
      const result = [{ id: 1, name: "John" }];

      cache.set(query, params, result);
      expect(cache.has(query, params)).toBe(true);

      // Wait less than TTL
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(cache.has(query, params)).toBe(true);

      cache.destroy();
    });
  });

  describe("Cache Size Management", () => {
    test("should respect maximum cache size", () => {
      const smallCacheConfig = { maxSize: 2 };
      const cache = new QueryCache(smallCacheConfig);

      const query = "SELECT * FROM users WHERE id = ?";
      const result = [{ id: 1, name: "John" }];

      cache.set(query, [1], result);
      cache.set(query, [2], result);
      cache.set(query, [3], result); // Should evict oldest entry

      expect(cache.getSize()).toBe(2);
      expect(cache.has(query, [1])).toBe(false); // Should be evicted
      expect(cache.has(query, [2])).toBe(true);
      expect(cache.has(query, [3])).toBe(true);

      cache.destroy();
    });

    test("should handle unlimited cache size", () => {
      const unlimitedCacheConfig = { maxSize: 0 };
      const cache = new QueryCache(unlimitedCacheConfig);

      const query = "SELECT * FROM users WHERE id = ?";
      const result = [{ id: 1, name: "John" }];

      // Add many entries
      for (let i = 0; i < 1000; i++) {
        cache.set(query, [i], result);
      }

      expect(cache.getSize()).toBe(1000);

      cache.destroy();
    });
  });

  describe("Cache Cleanup", () => {
    test("should cleanup expired entries", async () => {
      const cleanupConfig = {
        ttl: 100,
        cleanupInterval: 50,
      };
      const cache = new QueryCache(cleanupConfig);

      const query = "SELECT * FROM users WHERE id = ?";
      const params = [1];
      const result = [{ id: 1, name: "John" }];

      cache.set(query, params, result);
      expect(cache.has(query, params)).toBe(true);

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(cache.has(query, params)).toBe(false);

      cache.destroy();
    });

    test("should handle cleanup errors gracefully", () => {
      const cache = new QueryCache({ cleanupInterval: 100 });

      // Mock cleanup to throw error
      jest.spyOn(cache, "cleanup").mockImplementation(() => {
        throw new Error("Cleanup failed");
      });

      expect(() => {
        cache.cleanup();
      }).toThrow("Cleanup failed");

      cache.destroy();
    });
  });

  describe("Cache Performance", () => {
    test("should handle high-frequency cache operations", () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const result = [{ id: 1, name: "John" }];

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        queryCache.set(query, [i], result);
        queryCache.get(query, [i]);
      }

      expect(queryCache.getSize()).toBe(1000);
      expect(queryCache.stats.hits).toBe(1000);
    });

    test("should handle concurrent cache operations", async () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const result = [{ id: 1, name: "John" }];

      const promises = Array(100)
        .fill()
        .map(async (_, i) => {
          queryCache.set(query, [i], result);
          return queryCache.get(query, [i]);
        });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach((result) => {
        expect(result).toEqual(result);
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle cache storage errors gracefully", () => {
      // Mock cache to throw error
      jest.spyOn(queryCache.cache, "set").mockImplementation(() => {
        throw new Error("Storage failed");
      });

      expect(() => {
        queryCache.set("SELECT * FROM test", [], []);
      }).toThrow("Storage failed");
    });

    test("should handle cache retrieval errors gracefully", () => {
      // Mock cache to throw error
      jest.spyOn(queryCache.cache, "get").mockImplementation(() => {
        throw new Error("Retrieval failed");
      });

      expect(() => {
        queryCache.get("SELECT * FROM test", []);
      }).toThrow("Retrieval failed");
    });

    test("should handle invalid configuration gracefully", () => {
      const invalidConfig = {
        maxSize: -1,
        ttl: -100,
        cleanupInterval: -50,
      };

      expect(() => {
        new QueryCache(invalidConfig);
      }).not.toThrow();
    });
  });

  describe("Cache Serialization", () => {
    test("should handle complex query parameters", () => {
      const query = "SELECT * FROM users WHERE id IN (?, ?, ?) AND status = ?";
      const params = [[1, 2, 3], "active"];
      const result = [{ id: 1, name: "John" }];

      queryCache.set(query, params, result);
      const cachedResult = queryCache.get(query, params);

      expect(cachedResult).toEqual(result);
    });

    test("should handle special characters in queries", () => {
      const query = 'SELECT * FROM "users" WHERE "name" = ? AND "email" LIKE ?';
      const params = ["John Doe", "%@example.com"];
      const result = [{ id: 1, name: "John Doe" }];

      queryCache.set(query, params, result);
      const cachedResult = queryCache.get(query, params);

      expect(cachedResult).toEqual(result);
    });
  });

  describe("Cache Destruction", () => {
    test("should destroy cache and cleanup resources", () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const params = [1];
      const result = [{ id: 1, name: "John" }];

      queryCache.set(query, params, result);
      expect(queryCache.has(query, params)).toBe(true);

      queryCache.destroy();

      // Cache should be cleared after destruction
      expect(queryCache.cache).toBeNull();
    });

    test("should handle multiple destroy calls gracefully", () => {
      queryCache.destroy();
      expect(() => {
        queryCache.destroy();
      }).not.toThrow();
    });
  });
});
