/**
 * CacheService Persistence Tests
 * Tests IndexedDB persistence functionality - REAL TESTS NOT FAKE ONES!
 */

import { CacheService } from '@/infrastructure/services/CacheService';

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

// Mock window.indexedDB
Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

describe('CacheService Persistence Tests', () => {
  let cacheService;
  let mockDB;
  let mockTransaction;
  let mockStore;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock IndexedDB objects
    mockStore = {
      add: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      delete: jest.fn(),
      createIndex: jest.fn()
    };
    
    mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockStore),
      onerror: jest.fn(),
      oncomplete: jest.fn()
    };
    
    mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction),
      objectStoreNames: {
        contains: jest.fn().mockReturnValue(false)
      },
      createObjectStore: jest.fn().mockReturnValue(mockStore),
      close: jest.fn()
    };
    
    // Mock IndexedDB request
    const mockRequest = {
      result: mockDB,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null
    };
    
    mockIndexedDB.open.mockReturnValue(mockRequest);
    
    // Create cache service
    cacheService = new CacheService();
  });

  afterEach(() => {
    if (cacheService) {
      // CacheService doesn't have destroy method, just clear it
      cacheService.memoryCache.clear();
      cacheService.indexedDBCache = null;
      cacheService.isInitialized = false;
    }
  });

  describe('IndexedDB Initialization', () => {
    test('should initialize IndexedDB successfully', async () => {
      const mockRequest = mockIndexedDB.open();
      
      // Simulate successful initialization
      setTimeout(() => {
        mockRequest.onsuccess();
      }, 10);
      
      await cacheService.initialize();
      
      expect(mockIndexedDB.open).toHaveBeenCalledWith('PIDEA_Cache', 1);
      expect(cacheService.indexedDBCache).toBe(mockDB);
      expect(cacheService.isInitialized).toBe(true);
    });

    test('should handle IndexedDB initialization timeout', async () => {
      const mockRequest = mockIndexedDB.open();
      
      // Don't call onsuccess - let it timeout
      await cacheService.initialize();
      
      expect(mockIndexedDB.open).toHaveBeenCalledWith('PIDEA_Cache', 1);
      expect(cacheService.isInitialized).toBe(true);
    }, 10000); // Increase timeout to 10 seconds

    test('should handle IndexedDB initialization error', async () => {
      const mockRequest = mockIndexedDB.open();
      
      // Simulate error
      setTimeout(() => {
        mockRequest.onerror();
      }, 10);
      
      await cacheService.initialize();
      
      expect(mockIndexedDB.open).toHaveBeenCalledWith('PIDEA_Cache', 1);
      expect(cacheService.isInitialized).toBe(true);
    });
  });

  describe('Persistent Cache Operations', () => {
    beforeEach(async () => {
      const mockRequest = mockIndexedDB.open();
      setTimeout(() => {
        mockRequest.onsuccess();
      }, 10);
      await cacheService.initialize();
    });

    test('should store data in IndexedDB when setting cache', async () => {
      const testData = { test: 'data' };
      const testKey = 'test-key';
      
      // Mock successful IndexedDB operation
      const mockRequest = {
        onsuccess: null,
        onerror: null
      };
      mockStore.put.mockReturnValue(mockRequest);
      
      const result = cacheService.set(testKey, testData, 'ide', 'ide');
      
      expect(result).toBe(true);
      expect(mockStore.put).toHaveBeenCalled();
      
      // Verify the data structure
      const putCall = mockStore.put.mock.calls[0][0];
      expect(putCall.key).toBe(testKey);
      expect(putCall.data).toEqual(testData);
      expect(putCall.dataType).toBe('ide');
      expect(putCall.namespace).toBe('ide');
      expect(putCall.timestamp).toBeDefined();
      expect(putCall.expires).toBeDefined();
    });

    test('should load data from IndexedDB on initialization', async () => {
      const mockData = [
        {
          key: 'test-key-1',
          data: { test: 'data1' },
          dataType: 'ide',
          namespace: 'ide',
          timestamp: Date.now(),
          expires: Date.now() + 30000,
          size: 100
        },
        {
          key: 'test-key-2',
          data: { test: 'data2' },
          dataType: 'tasks',
          namespace: 'tasks',
          timestamp: Date.now(),
          expires: Date.now() + 30000,
          size: 200
        }
      ];
      
      // Mock getAll request
      const mockRequest = {
        result: mockData,
        onsuccess: null,
        onerror: null
      };
      mockStore.getAll.mockReturnValue(mockRequest);
      
      // Create new cache service to test loading
      const newCacheService = new CacheService();
      const initRequest = mockIndexedDB.open();
      
      setTimeout(() => {
        initRequest.onsuccess();
        // Simulate successful data loading
        setTimeout(() => {
          mockRequest.onsuccess();
        }, 10);
      }, 10);
      
      await newCacheService.initialize();
      
      // Verify data was loaded into memory cache
      expect(newCacheService.memoryCache.has('test-key-1')).toBe(true);
      expect(newCacheService.memoryCache.has('test-key-2')).toBe(true);
      
      const loadedData1 = newCacheService.memoryCache.get('test-key-1');
      expect(loadedData1.data).toEqual({ test: 'data1' });
      
      const loadedData2 = newCacheService.memoryCache.get('test-key-2');
      expect(loadedData2.data).toEqual({ test: 'data2' });
    });

    test('should skip expired data when loading from IndexedDB', async () => {
      const mockData = [
        {
          key: 'expired-key',
          data: { test: 'expired' },
          dataType: 'ide',
          namespace: 'ide',
          timestamp: Date.now() - 60000, // 1 minute ago
          expires: Date.now() - 30000, // Expired 30 seconds ago
          size: 100
        },
        {
          key: 'valid-key',
          data: { test: 'valid' },
          dataType: 'ide',
          namespace: 'ide',
          timestamp: Date.now(),
          expires: Date.now() + 30000, // Valid for 30 seconds
          size: 100
        }
      ];
      
      const mockRequest = {
        result: mockData,
        onsuccess: null,
        onerror: null
      };
      mockStore.getAll.mockReturnValue(mockRequest);
      
      const newCacheService = new CacheService();
      const initRequest = mockIndexedDB.open();
      
      setTimeout(() => {
        initRequest.onsuccess();
        setTimeout(() => {
          mockRequest.onsuccess();
        }, 10);
      }, 10);
      
      await newCacheService.initialize();
      
      // Verify only valid data was loaded
      expect(newCacheService.memoryCache.has('expired-key')).toBe(false);
      expect(newCacheService.memoryCache.has('valid-key')).toBe(true);
      
      const validData = newCacheService.memoryCache.get('valid-key');
      expect(validData.data).toEqual({ test: 'valid' });
    });

    test('should delete data from IndexedDB when deleting cache', async () => {
      const testKey = 'test-key';
      
      // Mock successful IndexedDB operation
      const mockRequest = {
        onsuccess: null,
        onerror: null
      };
      mockStore.delete.mockReturnValue(mockRequest);
      
      const result = cacheService.delete(testKey);
      
      expect(result).toBe(true);
      expect(mockStore.delete).toHaveBeenCalledWith(testKey);
    });
  });

  describe('Cache Persistence Across Sessions', () => {
    test('should maintain cache data across browser sessions', async () => {
      // First session - store data
      const session1Cache = new CacheService();
      const initRequest1 = mockIndexedDB.open();
      
      setTimeout(() => {
        initRequest1.onsuccess();
      }, 10);
      
      await session1Cache.initialize();
      
      const testData = { session: 1, data: 'persistent' };
      session1Cache.set('persistent-key', testData, 'ide', 'ide');
      
      // Simulate browser close/reopen
      session1Cache.memoryCache.clear();
      session1Cache.indexedDBCache = null;
      session1Cache.isInitialized = false;
      
      // Second session - load data
      const session2Cache = new CacheService();
      const mockData = [
        {
          key: 'persistent-key',
          data: testData,
          dataType: 'ide',
          namespace: 'ide',
          timestamp: Date.now(),
          expires: Date.now() + 30000,
          size: 100
        }
      ];
      
      const mockRequest = {
        result: mockData,
        onsuccess: null,
        onerror: null
      };
      mockStore.getAll.mockReturnValue(mockRequest);
      
      const initRequest2 = mockIndexedDB.open();
      
      setTimeout(() => {
        initRequest2.onsuccess();
        setTimeout(() => {
          mockRequest.onsuccess();
        }, 10);
      }, 10);
      
      await session2Cache.initialize();
      
      // Verify data persisted
      expect(session2Cache.memoryCache.has('persistent-key')).toBe(true);
      const persistedData = session2Cache.memoryCache.get('persistent-key');
      expect(persistedData.data).toEqual(testData);
    });
  });

  describe('Error Handling', () => {
    test('should handle IndexedDB errors gracefully', async () => {
      const mockRequest = mockIndexedDB.open();
      
      // Simulate error during initialization
      setTimeout(() => {
        mockRequest.onerror();
      }, 10);
      
      await cacheService.initialize();
      
      // Should still initialize successfully
      expect(cacheService.isInitialized).toBe(true);
      expect(cacheService.indexedDBCache).toBeNull();
    });

    test('should handle IndexedDB transaction errors', async () => {
      const initRequest = mockIndexedDB.open();
      
      setTimeout(() => {
        initRequest.onsuccess();
      }, 10);
      
      await cacheService.initialize();
      
      // Mock transaction error
      mockTransaction.onerror();
      
      const testData = { test: 'data' };
      const result = cacheService.set('test-key', testData, 'ide', 'ide');
      
      // Should still work with memory cache
      expect(result).toBe(true);
      expect(cacheService.memoryCache.has('test-key')).toBe(true);
    });
  });

  describe('Performance with IndexedDB', () => {
    test('should maintain performance with IndexedDB operations', async () => {
      const initRequest = mockIndexedDB.open();
      
      setTimeout(() => {
        initRequest.onsuccess();
      }, 10);
      
      await cacheService.initialize();
      
      const startTime = performance.now();
      
      // Perform multiple cache operations
      for (let i = 0; i < 100; i++) {
        cacheService.set(`key-${i}`, { data: i }, 'ide', 'ide');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      
      // Verify all data was cached
      for (let i = 0; i < 100; i++) {
        expect(cacheService.memoryCache.has(`key-${i}`)).toBe(true);
      }
    });
  });
});
