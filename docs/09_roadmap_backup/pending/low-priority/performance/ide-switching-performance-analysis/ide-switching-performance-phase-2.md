# IDE Switching Performance Optimization – Phase 2: Implement Request Deduplication

## Overview
Implement centralized request deduplication to prevent duplicate API calls during rapid IDE switching. This eliminates the 6+ second delays caused by request stacking.

## Objectives
- [ ] Create RequestDeduplicationService for centralized request management
- [ ] Implement useRequestDeduplication React hook
- [ ] Integrate deduplication with APIChatRepository
- [ ] Add deduplication to IDEStore switching operations
- [ ] Test deduplication effectiveness

## Deliverables
- File: `frontend/src/infrastructure/services/RequestDeduplicationService.js` - Central deduplication service
- File: `frontend/src/hooks/useRequestDeduplication.js` - React hook for deduplication
- File: `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Enhanced with deduplication
- File: `frontend/src/infrastructure/stores/IDEStore.jsx` - Integrated with deduplication
- Test: `tests/unit/infrastructure/services/RequestDeduplicationService.test.js` - Unit tests

## Dependencies
- Requires: Phase 1 - Remove Double Switching (completed)
- Blocks: Phase 3 - Integration & Testing

## Estimated Time
2.5 hours

## Success Criteria
- [ ] RequestDeduplicationService prevents duplicate API calls
- [ ] React hook provides easy-to-use deduplication interface
- [ ] IDE switching performance <1 second for all operations
- [ ] No breaking changes to existing functionality
- [ ] Unit tests pass with 90%+ coverage
- [ ] Cache hit rate >80% for repeated operations

## Implementation Details

### 1. RequestDeduplicationService.js
**Location**: `frontend/src/infrastructure/services/RequestDeduplicationService.js`

**Features**:
- Request deduplication using Map-based tracking
- TTL-based caching (5 minutes default)
- Automatic cleanup of expired cache entries
- Request lifecycle management
- Performance metrics tracking

**Implementation**:
```javascript
/**
 * Request Deduplication Service
 * Prevents duplicate API calls and manages request lifecycle
 */
class RequestDeduplicationService {
  constructor() {
    this.pendingRequests = new Map();
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    this.cleanupInterval = 60000; // 1 minute
    
    // Start cleanup timer
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Execute request with deduplication
   * @param {string} key - Unique request key
   * @param {Function} requestFn - Request function
   * @param {Object} options - Request options
   * @returns {Promise} Request result
   */
  async execute(key, requestFn, options = {}) {
    const cacheKey = this.generateCacheKey(key, options);
    
    // Check cache first
    if (options.useCache !== false) {
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    // Create new request
    const requestPromise = this.performRequest(requestFn, cacheKey, options);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // Cache successful result
      if (options.useCache !== false) {
        this.setCached(cacheKey, result);
      }
      
      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Generate cache key
   * @param {string} key - Base key
   * @param {Object} options - Request options
   * @returns {string} Cache key
   */
  generateCacheKey(key, options) {
    const { method = 'GET', body, params } = options;
    const hash = this.hashObject({ method, body, params });
    return `${key}_${hash}`;
  }

  /**
   * Get cached result
   * @param {string} key - Cache key
   * @returns {Object|null} Cached result or null
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Set cached result
   * @param {string} key - Cache key
   * @param {Object} result - Result to cache
   */
  setCached(key, result) {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Perform actual request
   * @param {Function} requestFn - Request function
   * @param {string} cacheKey - Cache key
   * @param {Object} options - Request options
   * @returns {Promise} Request result
   */
  async performRequest(requestFn, cacheKey, options) {
    try {
      const result = await requestFn();
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Hash object for cache key generation
   * @param {Object} obj - Object to hash
   * @returns {string} Hash string
   */
  hashObject(obj) {
    return btoa(JSON.stringify(obj)).slice(0, 8);
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      cacheSize: this.cache.size,
      cacheHitRate: this.calculateHitRate()
    };
  }

  /**
   * Calculate cache hit rate
   * @returns {number} Hit rate percentage
   */
  calculateHitRate() {
    // Implementation for hit rate calculation
    return 0; // Placeholder
  }
}

export default RequestDeduplicationService;
```

### 2. useRequestDeduplication.js
**Location**: `frontend/src/hooks/useRequestDeduplication.js`

**Features**:
- React hook for easy deduplication usage
- Abort controller support for cancellable requests
- Automatic cleanup on component unmount
- Statistics access

**Implementation**:
```javascript
/**
 * React Hook for Request Deduplication
 * Provides easy-to-use deduplication in React components
 */
import { useCallback, useRef } from 'react';
import RequestDeduplicationService from '@/infrastructure/services/RequestDeduplicationService';

const deduplicationService = new RequestDeduplicationService();

export const useRequestDeduplication = () => {
  const abortControllerRef = useRef(null);

  /**
   * Execute request with deduplication
   * @param {string} key - Request key
   * @param {Function} requestFn - Request function
   * @param {Object} options - Request options
   * @returns {Promise} Request result
   */
  const executeRequest = useCallback(async (key, requestFn, options = {}) => {
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
      return await deduplicationService.execute(key, requestFn, options);
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
    return deduplicationService.getStats();
  }, []);

  return {
    executeRequest,
    cancelRequest,
    getStats
  };
};
```

### 3. APIChatRepository.jsx Enhancements
**Location**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx`

**Enhancements**:
- Import and initialize RequestDeduplicationService
- Wrap all API calls with deduplication
- Add cache TTL configuration per endpoint
- Maintain backward compatibility

**Modified Methods**:
```javascript
// Add to existing APIChatRepository.jsx
import RequestDeduplicationService from '@/infrastructure/services/RequestDeduplicationService';

export default class APIChatRepository extends ChatRepository {
  constructor() {
    super();
    this.baseURL = API_CONFIG.baseURL;
    this.currentSession = null;
    this.currentProjectId = null;
    
    // Initialize deduplication service
    this.deduplicationService = new RequestDeduplicationService();
  }

  // Enhanced switchIDE method with deduplication
  async switchIDE(port) {
    const key = `switch_ide_${port}`;
    
    return this.deduplicationService.execute(key, async () => {
      return apiCall(API_CONFIG.endpoints.ide.switchIDE(port), {
        method: 'POST'
      });
    }, {
      useCache: true,
      cacheTTL: 5 * 60 * 1000 // 5 minutes
    });
  }

  // Enhanced getIDEs method with deduplication
  async getIDEs() {
    const key = 'get_available_ides';
    
    return this.deduplicationService.execute(key, async () => {
      return apiCall(API_CONFIG.endpoints.ide.list);
    }, {
      useCache: true,
      cacheTTL: 30 * 1000 // 30 seconds
    });
  }

  // Enhanced getUserAppUrl method with deduplication
  async getUserAppUrl() {
    const key = 'get_user_app_url';
    
    return this.deduplicationService.execute(key, async () => {
      return apiCall(API_CONFIG.endpoints.ide.userAppUrl);
    }, {
      useCache: true,
      cacheTTL: 60 * 1000 // 1 minute
    });
  }
}
```

### 4. IDEStore.jsx Integration
**Location**: `frontend/src/infrastructure/stores/IDEStore.jsx`

**Enhancements**:
- Import RequestDeduplicationService
- Use deduplication for IDE switching operations
- Add deduplication statistics to store state
- Maintain existing optimization features

**Modified Methods**:
```javascript
// In IDEStore.jsx - switchIDE method
import RequestDeduplicationService from '@/infrastructure/services/RequestDeduplicationService';

const deduplicationService = new RequestDeduplicationService();

const switchIDE = async (port, reason = 'manual') => {
  const startTime = performance.now();
  
  try {
    set({ isLoading: true, error: null });
    
    // Use deduplication service for API call
    const result = await deduplicationService.execute(`switch_ide_${port}`, async () => {
      return apiCall(`/api/ide/switch/${port}`, {
        method: 'POST'
      });
    }, {
      useCache: true,
      cacheTTL: 5 * 60 * 1000 // 5 minutes
    });

    if (result.success) {
      // Update state optimistically
      set({ activePort: port });
      
      // Update IDE status
      const { availableIDEs } = get();
      const updatedIDEs = availableIDEs.map(ide => ({
        ...ide,
        active: ide.port === port
      }));
      set({ availableIDEs: updatedIDEs });
      
      logger.info('Successfully switched to IDE:', port);
      return true;
    } else {
      throw new Error(result.error || 'Failed to switch IDE');
    }
  } catch (error) {
    logger.error('Error switching IDE:', error);
    set({ error: error.message });
    return false;
  } finally {
    set({ isLoading: false });
  }
};
```

## Testing Strategy

### Unit Tests
**File**: `tests/unit/infrastructure/services/RequestDeduplicationService.test.js`

**Test Cases**:
- [ ] `execute()` deduplicates identical requests
- [ ] `execute()` caches successful results
- [ ] `execute()` handles errors properly
- [ ] `cleanup()` removes expired cache entries
- [ ] `getStats()` returns correct statistics

### Integration Tests
**File**: `tests/integration/request-deduplication.test.js`

**Test Cases**:
- [ ] APIChatRepository uses deduplication correctly
- [ ] IDEStore integrates with deduplication service
- [ ] React hook provides expected interface
- [ ] No breaking changes to existing functionality

## Risk Assessment

### High Risk
- **Risk**: Deduplication breaks existing API calls
  - **Mitigation**: Comprehensive testing, gradual rollout
  - **Rollback**: Feature flags, quick disable mechanism

### Medium Risk
- **Risk**: Cache invalidation issues
  - **Mitigation**: Proper TTL management, manual invalidation
  - **Monitoring**: Cache hit rate tracking

### Low Risk
- **Risk**: Performance overhead of deduplication
  - **Mitigation**: Minimal overhead design, performance monitoring
  - **Optimization**: Efficient cache implementation

## Success Metrics
- **Performance**: IDE switching <1 second for all operations
- **Cache Hit Rate**: >80% for repeated operations
- **Reliability**: No breaking changes to existing functionality
- **Code Quality**: Clean, maintainable implementation

## Next Phase Dependencies
This phase must be completed before Phase 3 (Integration & Testing) because:
1. Core deduplication functionality must be implemented
2. Integration testing requires working deduplication
3. Performance validation needs complete implementation

## Implementation Checklist
- [ ] Create RequestDeduplicationService.js
- [ ] Create useRequestDeduplication.js hook
- [ ] Enhance APIChatRepository.jsx with deduplication
- [ ] Integrate deduplication with IDEStore.jsx
- [ ] Write comprehensive unit tests
- [ ] Test deduplication effectiveness
- [ ] Update documentation
- [ ] Commit changes with clear commit message 