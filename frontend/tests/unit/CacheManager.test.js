import { jest } from '@jest/globals';
import { CacheManager } from '@/infrastructure/services/CacheManager';

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

const mockDB = {
  transaction: jest.fn(),
  close: jest.fn()
};

const mockTransaction = {
  objectStore: jest.fn()
};

const mockStore = {
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn()
};

// Mock global objects
global.indexedDB = mockIndexedDB;
global.Blob = jest.fn().mockImplementation((data) => ({
  size: JSON.stringify(data).length
}));

describe('CacheManager', () => {
  let cacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup IndexedDB mocks
    mockIndexedDB.open.mockImplementation((name, version) => {
      const request = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDB
      };
      
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      
      return request;
    });

    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockStore);
    
    cacheManager = new CacheManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await cacheManager.initialize();

      expect(cacheManager.isInitialized).toBe(true);
      expect(mockIndexedDB.open).toHaveBeenCalledWith('PIDEA_Cache', 1);
    });

    test('should handle IndexedDB unavailability', async () => {
      mockIndexedDB.open.mockImplementation(() => {
        const request = {
          onerror: null
        };
        
        setTimeout(() => {
          if (request.onerror) {
            request.onerror();
          }
        }, 0);
        
        return request;
      });

      await cacheManager.initialize();

      expect(cacheManager.isInitialized).toBe(true);
      expect(cacheManager.indexedDBCache).toBeNull();
    });
  });

  describe('Cache Operations', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    test('should set and get data successfully', () => {
      const testData = { message: 'test' };
      const key = 'test-key';
      const ttl = 60000;

      const result = cacheManager.set(key, testData, ttl);
      expect(result).toBe(true);

      const retrievedData = cacheManager.get(key);
      expect(retrievedData).toEqual(testData);
    });

    test('should return null for expired data', () => {
      const testData = { message: 'test' };
      const key = 'test-key';
      const ttl = -1000; // Expired

      cacheManager.set(key, testData, ttl);
      const retrievedData = cacheManager.get(key);
      
      expect(retrievedData).toBeNull();
    });

    test('should return null for non-existent key', () => {
      const retrievedData = cacheManager.get('non-existent-key');
      expect(retrievedData).toBeNull();
    });

    test('should check if key exists', () => {
      const testData = { message: 'test' };
      const key = 'test-key';

      expect(cacheManager.has(key)).toBe(false);

      cacheManager.set(key, testData, 60000);
      expect(cacheManager.has(key)).toBe(true);
    });

    test('should delete data successfully', () => {
      const testData = { message: 'test' };
      const key = 'test-key';

      cacheManager.set(key, testData, 60000);
      expect(cacheManager.has(key)).toBe(true);

      const result = cacheManager.delete(key);
      expect(result).toBe(true);
      expect(cacheManager.has(key)).toBe(false);
    });

    test('should invalidate data', () => {
      const testData = { message: 'test' };
      const key = 'test-key';

      cacheManager.set(key, testData, 60000);
      expect(cacheManager.has(key)).toBe(true);

      cacheManager.invalidate(key);
      expect(cacheManager.has(key)).toBe(false);
    });

    test('should clear all data', () => {
      const testData1 = { message: 'test1' };
      const testData2 = { message: 'test2' };

      cacheManager.set('key1', testData1, 60000);
      cacheManager.set('key2', testData2, 60000);

      expect(cacheManager.has('key1')).toBe(true);
      expect(cacheManager.has('key2')).toBe(true);

      cacheManager.clear();

      expect(cacheManager.has('key1')).toBe(false);
      expect(cacheManager.has('key2')).toBe(false);
    });
  });

  describe('Size Management', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    test('should reject data that is too large', () => {
      const largeData = 'x'.repeat(3 * 1024 * 1024); // 3MB
      const key = 'large-key';

      const result = cacheManager.set(key, largeData, 60000);
      expect(result).toBe(false);
    });

    test('should evict old entries when cache is full', () => {
      // Fill cache with small entries
      for (let i = 0; i < 1000; i++) {
        cacheManager.set(`key-${i}`, { data: i }, 60000);
      }

      // Add one more entry to trigger eviction
      const result = cacheManager.set('new-key', { data: 'new' }, 60000);
      expect(result).toBe(true);
    });
  });

  describe('IndexedDB Integration', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    test('should store data in IndexedDB', () => {
      const testData = { message: 'test' };
      const key = 'test-key';

      cacheManager.set(key, testData, 60000);

      expect(mockStore.put).toHaveBeenCalled();
    });

    test('should load data from IndexedDB on initialization', async () => {
      const testData = { message: 'test' };
      const key = 'test-key';

      // Mock IndexedDB data
      mockStore.getAll.mockImplementation(() => {
        const request = {
          onsuccess: null,
          result: [{
            key,
            data: testData,
            timestamp: Date.now(),
            ttl: 60000,
            size: 100
          }]
        };
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request });
          }
        }, 0);
        
        return request;
      });

      // Create new cache manager to test loading
      const newCacheManager = new CacheManager();
      await newCacheManager.initialize();

      expect(newCacheManager.has(key)).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    test('should return comprehensive statistics', () => {
      const testData = { message: 'test' };
      cacheManager.set('test-key', testData, 60000);
      cacheManager.get('test-key');

      const stats = cacheManager.getStats();

      expect(stats).toHaveProperty('memoryHits');
      expect(stats).toHaveProperty('indexedDBHits');
      expect(stats).toHaveProperty('serverHits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('deletes');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('memoryCacheSize');
      expect(stats).toHaveProperty('memoryCacheEntries');
      expect(stats).toHaveProperty('totalRequests');
    });

    test('should calculate hit rate correctly', () => {
      const testData = { message: 'test' };
      cacheManager.set('test-key', testData, 60000);
      
      // Hit
      cacheManager.get('test-key');
      
      // Miss
      cacheManager.get('non-existent-key');

      const stats = cacheManager.getStats();
      expect(stats.hitRate).toBe(50);
    });
  });

  describe('Cleanup', () => {
    test('should destroy cache manager properly', async () => {
      await cacheManager.initialize();
      
      const testData = { message: 'test' };
      cacheManager.set('test-key', testData, 60000);

      cacheManager.destroy();

      expect(cacheManager.memoryCache.size).toBe(0);
      expect(cacheManager.indexedDBCache).toBeNull();
      expect(cacheManager.isInitialized).toBe(false);
    });
  });
});
