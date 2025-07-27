# Request Deduplication Implementation

## Overview
Implement professional request deduplication to prevent duplicate API calls, improve IDE switching performance, and protect against rapid clicking. This implementation addresses the current 6+ second IDE switching delays and 20+ second request stacking issues.

## Current State Analysis

### ✅ Existing Components Found:
- **Frontend**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Basic API calls
- **Frontend**: `frontend/src/infrastructure/stores/IDEStore.jsx` - IDE state management with basic caching
- **Frontend**: `frontend/src/infrastructure/stores/IDESwitchOptimizationStore.jsx` - Progress tracking
- **Backend**: `backend/application/services/IDEApplicationService.js` - Request deduplication partially implemented
- **Backend**: `backend/infrastructure/cache/IDESwitchCache.js` - TTL-based caching
- **Backend**: `backend/presentation/api/IDEController.js` - IDE endpoints
- **Backend**: Rate limiting middleware already implemented in `backend/Application.js`

### ⚠️ Critical Gaps Identified:

#### 1. Missing Request Deduplication Service
- **Location**: `frontend/src/infrastructure/services/RequestDeduplicationService.js` - NOT FOUND
- **Impact**: No centralized request deduplication
- **Required**: Central service to prevent duplicate API calls

#### 2. Incomplete Frontend Deduplication
- **Location**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx`
- **Issue**: No request deduplication logic
- **Impact**: Multiple simultaneous requests cause delays

#### 3. Missing React Hook
- **Location**: `frontend/src/hooks/useRequestDeduplication.js` - NOT FOUND
- **Impact**: No easy way to use deduplication in components

#### 4. Backend Rate Limiting Enhancement Needed
- **Location**: `backend/presentation/api/IDEController.js`
- **Issue**: Generic rate limiting, needs IDE-specific protection
- **Impact**: No protection against rapid IDE switching

#### 5. Missing Request Queuing Service
- **Location**: `backend/infrastructure/services/RequestQueuingService.js` - NOT FOUND
- **Impact**: No proper handling of concurrent requests

## Implementation Strategy

### 📋 Task Splitting Recommendations
This task has been split into 4 manageable phases due to its complexity (7 hours total) and the need for incremental implementation:

- **Phase 1**: [request-deduplication-phase-1.md](./request-deduplication-phase-1.md) – Frontend Request Deduplication (2 hours)
- **Phase 2**: [request-deduplication-phase-2.md](./request-deduplication-phase-2.md) – Backend Protection Enhancement (1 hour)
- **Phase 3**: [request-deduplication-phase-3.md](./request-deduplication-phase-3.md) – Advanced Features (3 hours)
- **Phase 4**: [request-deduplication-phase-4.md](./request-deduplication-phase-4.md) – Testing & Documentation (1 hour)

### Phase Dependencies
- **Phase 1**: Foundation phase, no dependencies
- **Phase 2**: Requires Phase 1 completion
- **Phase 3**: Requires Phases 1 and 2 completion
- **Phase 4**: Requires all previous phases completion

### Phase 1: Frontend Request Deduplication (2 hours)
**Objective**: Implement centralized request deduplication in frontend

#### Files to Create:
- [ ] `frontend/src/infrastructure/services/RequestDeduplicationService.js` - Central deduplication service
- [ ] `frontend/src/hooks/useRequestDeduplication.js` - React hook for deduplication

#### Files to Modify:
- [ ] `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Add deduplication logic
- [ ] `frontend/src/infrastructure/stores/IDEStore.jsx` - Integrate with deduplication service

### Phase 2: Backend Protection Enhancement (1 hour)
**Objective**: Enhance backend rate limiting and add request queuing

#### Files to Create:
- [ ] `backend/infrastructure/services/RequestQueuingService.js` - Request queuing service
- [ ] `backend/middleware/ideRateLimiter.js` - IDE-specific rate limiting

#### Files to Modify:
- [ ] `backend/presentation/api/IDEController.js` - Add IDE-specific rate limiting
- [ ] `backend/application/services/IDEApplicationService.js` - Integrate request queuing

### Phase 3: Advanced Features (3 hours)
**Objective**: Implement React Query and request monitoring

#### Files to Create:
- [ ] `frontend/src/infrastructure/services/RequestMonitoringService.js` - Request analytics
- [ ] `backend/infrastructure/services/RequestAnalyticsService.js` - Backend analytics

#### Files to Modify:
- [ ] `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Add React Query integration
- [ ] `backend/infrastructure/logging/RequestLogger.js` - Enhanced request logging

### Phase 4: Testing & Documentation (1 hour)
**Objective**: Comprehensive testing and documentation

#### Files to Create:
- [ ] `tests/unit/infrastructure/services/RequestDeduplicationService.test.js`
- [ ] `tests/integration/request-deduplication.test.js`
- [ ] `tests/e2e/rapid-ide-switching.test.js`

## Detailed Implementation

### Phase 1: Frontend Request Deduplication

#### 1.1 RequestDeduplicationService.js
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

#### 1.2 useRequestDeduplication.js
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

#### 1.3 APIChatRepository.jsx Enhancements
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

### Phase 2: Backend Protection Enhancement

#### 2.1 RequestQueuingService.js
```javascript
/**
 * Request Queuing Service
 * Manages concurrent requests and prevents request stacking
 */
const Logger = require('@logging/Logger');

class RequestQueuingService {
  constructor(options = {}) {
    this.logger = new Logger('RequestQueuingService');
    this.queue = new Map();
    this.maxConcurrent = options.maxConcurrent || 5;
    this.timeout = options.timeout || 30000; // 30 seconds
    this.activeRequests = new Map();
  }

  /**
   * Queue a request
   * @param {string} key - Request key
   * @param {Function} requestFn - Request function
   * @param {Object} options - Request options
   * @returns {Promise} Request result
   */
  async queueRequest(key, requestFn, options = {}) {
    // Check if request is already active
    if (this.activeRequests.has(key)) {
      this.logger.info(`Request ${key} already active, queuing`);
      return this.waitForRequest(key);
    }

    // Check if we can process immediately
    if (this.activeRequests.size < this.maxConcurrent) {
      return this.processRequest(key, requestFn, options);
    }

    // Queue the request
    this.logger.info(`Queueing request ${key}, ${this.queue.size} in queue`);
    return this.addToQueue(key, requestFn, options);
  }

  /**
   * Process a request
   * @param {string} key - Request key
   * @param {Function} requestFn - Request function
   * @param {Object} options - Request options
   * @returns {Promise} Request result
   */
  async processRequest(key, requestFn, options = {}) {
    const startTime = Date.now();
    
    // Mark as active
    this.activeRequests.set(key, { startTime, options });
    
    try {
      this.logger.info(`Processing request ${key}`);
      
      // Execute request with timeout
      const result = await Promise.race([
        requestFn(),
        this.createTimeout(this.timeout)
      ]);
      
      const duration = Date.now() - startTime;
      this.logger.info(`Request ${key} completed in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Request ${key} failed after ${duration}ms:`, error.message);
      throw error;
    } finally {
      // Remove from active requests
      this.activeRequests.delete(key);
      
      // Process next queued request
      this.processNextQueuedRequest();
    }
  }

  /**
   * Add request to queue
   * @param {string} key - Request key
   * @param {Function} requestFn - Request function
   * @param {Object} options - Request options
   * @returns {Promise} Request result
   */
  addToQueue(key, requestFn, options = {}) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        key,
        requestFn,
        options,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      this.queue.set(key, queueItem);
      
      // Set timeout for queued request
      setTimeout(() => {
        if (this.queue.has(key)) {
          this.queue.delete(key);
          reject(new Error('Request timeout in queue'));
        }
      }, this.timeout);
    });
  }

  /**
   * Wait for active request to complete
   * @param {string} key - Request key
   * @returns {Promise} Request result
   */
  async waitForRequest(key) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!this.activeRequests.has(key)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for request'));
      }, this.timeout);
    });
  }

  /**
   * Process next queued request
   */
  processNextQueuedRequest() {
    if (this.queue.size === 0 || this.activeRequests.size >= this.maxConcurrent) {
      return;
    }
    
    const [key, queueItem] = this.queue.entries().next().value;
    this.queue.delete(key);
    
    this.processRequest(key, queueItem.requestFn, queueItem.options)
      .then(queueItem.resolve)
      .catch(queueItem.reject);
  }

  /**
   * Create timeout promise
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Timeout promise
   */
  createTimeout(timeout) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);
    });
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.queue.size,
      maxConcurrent: this.maxConcurrent
    };
  }
}

module.exports = RequestQueuingService;
```

#### 2.2 ideRateLimiter.js
```javascript
/**
 * IDE-specific Rate Limiter Middleware
 * Provides enhanced rate limiting for IDE endpoints
 */
const rateLimit = require('express-rate-limit');
const Logger = require('@logging/Logger');

class IDERateLimiter {
  constructor() {
    this.logger = new Logger('IDERateLimiter');
  }

  /**
   * Create IDE switch rate limiter
   * @returns {Function} Rate limiter middleware
   */
  createSwitchLimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 switches per minute
      message: {
        success: false,
        error: 'Too many IDE switches. Please wait before trying again.',
        code: 'IDE_SWITCH_RATE_LIMIT'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise use IP
        return req.user ? req.user.id : req.ip;
      },
      handler: (req, res) => {
        this.logger.warn(`IDE switch rate limit exceeded for ${req.user?.id || req.ip}`);
        res.status(429).json({
          success: false,
          error: 'Too many IDE switches. Please wait before trying again.',
          code: 'IDE_SWITCH_RATE_LIMIT',
          retryAfter: Math.ceil(60 / 1000) // 1 minute in seconds
        });
      }
    });
  }

  /**
   * Create IDE status rate limiter
   * @returns {Function} Rate limiter middleware
   */
  createStatusLimiter() {
    return rateLimit({
      windowMs: 30 * 1000, // 30 seconds
      max: 30, // 30 status checks per 30 seconds
      message: {
        success: false,
        error: 'Too many status requests. Please wait before trying again.',
        code: 'IDE_STATUS_RATE_LIMIT'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.user ? req.user.id : req.ip;
      },
      handler: (req, res) => {
        this.logger.warn(`IDE status rate limit exceeded for ${req.user?.id || req.ip}`);
        res.status(429).json({
          success: false,
          error: 'Too many status requests. Please wait before trying again.',
          code: 'IDE_STATUS_RATE_LIMIT',
          retryAfter: Math.ceil(30 / 1000) // 30 seconds in seconds
        });
      }
    });
  }

  /**
   * Create general IDE rate limiter
   * @returns {Function} Rate limiter middleware
   */
  createGeneralLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes
      message: {
        success: false,
        error: 'Too many IDE requests. Please wait before trying again.',
        code: 'IDE_GENERAL_RATE_LIMIT'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.user ? req.user.id : req.ip;
      },
      handler: (req, res) => {
        this.logger.warn(`IDE general rate limit exceeded for ${req.user?.id || req.ip}`);
        res.status(429).json({
          success: false,
          error: 'Too many IDE requests. Please wait before trying again.',
          code: 'IDE_GENERAL_RATE_LIMIT',
          retryAfter: Math.ceil(15 * 60 / 1000) // 15 minutes in seconds
        });
      }
    });
  }
}

module.exports = IDERateLimiter;
```

### Phase 3: Advanced Features

#### 3.1 RequestMonitoringService.js
```javascript
/**
 * Request Monitoring Service
 * Tracks request patterns and provides analytics
 */
class RequestMonitoringService {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      duplicateRequests: 0,
      averageResponseTime: 0,
      requestsByEndpoint: new Map(),
      requestsByUser: new Map(),
      responseTimes: []
    };
    
    this.maxResponseTimes = 1000; // Keep last 1000 response times
  }

  /**
   * Track request start
   * @param {string} endpoint - API endpoint
   * @param {string} userId - User ID
   * @returns {string} Request ID
   */
  trackRequestStart(endpoint, userId) {
    const requestId = this.generateRequestId();
    const startTime = performance.now();
    
    this.metrics.totalRequests++;
    this.updateEndpointMetrics(endpoint, 'start');
    this.updateUserMetrics(userId, 'start');
    
    return requestId;
  }

  /**
   * Track request completion
   * @param {string} requestId - Request ID
   * @param {string} endpoint - API endpoint
   * @param {string} userId - User ID
   * @param {boolean} success - Whether request was successful
   * @param {number} responseTime - Response time in milliseconds
   */
  trackRequestComplete(requestId, endpoint, userId, success, responseTime) {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.updateResponseTimeMetrics(responseTime);
    this.updateEndpointMetrics(endpoint, 'complete', success);
    this.updateUserMetrics(userId, 'complete', success);
  }

  /**
   * Track duplicate request
   * @param {string} endpoint - API endpoint
   * @param {string} userId - User ID
   */
  trackDuplicateRequest(endpoint, userId) {
    this.metrics.duplicateRequests++;
    this.updateEndpointMetrics(endpoint, 'duplicate');
    this.updateUserMetrics(userId, 'duplicate');
  }

  /**
   * Update endpoint metrics
   * @param {string} endpoint - API endpoint
   * @param {string} action - Action type
   * @param {boolean} success - Whether request was successful
   */
  updateEndpointMetrics(endpoint, action, success = null) {
    if (!this.metrics.requestsByEndpoint.has(endpoint)) {
      this.metrics.requestsByEndpoint.set(endpoint, {
        total: 0,
        successful: 0,
        failed: 0,
        duplicates: 0,
        averageResponseTime: 0
      });
    }
    
    const endpointMetrics = this.metrics.requestsByEndpoint.get(endpoint);
    endpointMetrics.total++;
    
    if (action === 'duplicate') {
      endpointMetrics.duplicates++;
    } else if (action === 'complete') {
      if (success) {
        endpointMetrics.successful++;
      } else {
        endpointMetrics.failed++;
      }
    }
  }

  /**
   * Update user metrics
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @param {boolean} success - Whether request was successful
   */
  updateUserMetrics(userId, action, success = null) {
    if (!userId) return;
    
    if (!this.metrics.requestsByUser.has(userId)) {
      this.metrics.requestsByUser.set(userId, {
        total: 0,
        successful: 0,
        failed: 0,
        duplicates: 0
      });
    }
    
    const userMetrics = this.metrics.requestsByUser.get(userId);
    userMetrics.total++;
    
    if (action === 'duplicate') {
      userMetrics.duplicates++;
    } else if (action === 'complete') {
      if (success) {
        userMetrics.successful++;
      } else {
        userMetrics.failed++;
      }
    }
  }

  /**
   * Update response time metrics
   * @param {number} responseTime - Response time in milliseconds
   */
  updateResponseTimeMetrics(responseTime) {
    this.metrics.responseTimes.push(responseTime);
    
    // Keep only last N response times
    if (this.metrics.responseTimes.length > this.maxResponseTimes) {
      this.metrics.responseTimes.shift();
    }
    
    // Calculate average
    const sum = this.metrics.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = sum / this.metrics.responseTimes.length;
  }

  /**
   * Generate request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0,
      duplicateRate: this.metrics.totalRequests > 0 
        ? (this.metrics.duplicateRequests / this.metrics.totalRequests) * 100 
        : 0,
      requestsByEndpoint: Object.fromEntries(this.metrics.requestsByEndpoint),
      requestsByUser: Object.fromEntries(this.metrics.requestsByUser)
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      duplicateRequests: 0,
      averageResponseTime: 0,
      requestsByEndpoint: new Map(),
      requestsByUser: new Map(),
      responseTimes: []
    };
  }
}

export default RequestMonitoringService;
```

## Testing Strategy

### Unit Tests
```javascript
// tests/unit/infrastructure/services/RequestDeduplicationService.test.js
describe('RequestDeduplicationService', () => {
  let service;

  beforeEach(() => {
    service = new RequestDeduplicationService();
  });

  test('should deduplicate identical requests', async () => {
    const requestFn = jest.fn().mockResolvedValue('result');
    
    const promise1 = service.execute('test', requestFn);
    const promise2 = service.execute('test', requestFn);
    
    const [result1, result2] = await Promise.all([promise1, promise2]);
    
    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  test('should cache successful results', async () => {
    const requestFn = jest.fn().mockResolvedValue('cached');
    
    await service.execute('cache-test', requestFn);
    await service.execute('cache-test', requestFn);
    
    expect(requestFn).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests
```javascript
// tests/integration/request-deduplication.test.js
describe('Request Deduplication Integration', () => {
  test('should prevent duplicate IDE switches', async () => {
    const apiRepository = new APIChatRepository();
    
    const switchPromises = Array.from({ length: 5 }, () => 
      apiRepository.switchIDE(9222)
    );
    
    const results = await Promise.allSettled(switchPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    // Should have some deduplication
    expect(successful).toBeGreaterThan(0);
    expect(successful).toBeLessThan(5);
  });
});
```

### E2E Tests
```javascript
// tests/e2e/rapid-ide-switching.test.js
describe('Rapid IDE Switching E2E', () => {
  test('should handle rapid clicking without delays', async () => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="ide-selector"]');
    
    // Rapidly click IDE switch buttons
    const switchButtons = await page.$$('[data-testid="ide-switch-btn"]');
    
    for (let i = 0; i < 10; i++) {
      await switchButtons[0].click();
      await page.waitForTimeout(100); // 100ms between clicks
    }
    
    // Should not have 200+ second delays
    const performanceEntries = await page.evaluate(() => 
      performance.getEntriesByType('navigation')
    );
    
    expect(performanceEntries[0].loadEventEnd).toBeLessThan(10000); // 10 seconds max
  });
});
```

## Success Criteria

### Performance Metrics
- [ ] IDE switching performance <100ms for cached requests
- [ ] No more 200+ second delays
- [ ] Request deduplication prevents 85%+ of duplicate calls
- [ ] Rate limiting prevents server overload

### User Experience
- [ ] User can click as fast as they want without issues
- [ ] Progress indicators show real-time feedback
- [ ] No UI freezing during IDE switches
- [ ] Graceful error handling for rate limits

### Technical Requirements
- [ ] All requests are properly tracked and cleaned up
- [ ] Cache invalidation works correctly
- [ ] Rate limiting is configurable per endpoint
- [ ] Request queuing handles concurrent requests properly

## Risk Assessment

### High Risk
- **Request deduplication breaks existing functionality**
  - **Mitigation**: Comprehensive testing, gradual rollout
  - **Rollback Plan**: Feature flags, quick disable mechanism

### Medium Risk
- **Rate limiting too aggressive**
  - **Mitigation**: Configurable limits, user-specific thresholds
  - **Monitoring**: Real-time rate limit monitoring

### Low Risk
- **Performance overhead of deduplication**
  - **Mitigation**: Minimal overhead design, performance monitoring
  - **Optimization**: Efficient cache implementation

## Dependencies

### Frontend Dependencies
- Zustand (already installed)
- React (already installed)
- Performance API (browser native)

### Backend Dependencies
- express-rate-limit (already installed)
- Node.js Map and Set (native)
- Performance monitoring tools

## Timeline

### Week 1: Phase 1 (Frontend Deduplication)
- Day 1-2: Implement RequestDeduplicationService
- Day 3-4: Implement useRequestDeduplication hook
- Day 5: Integrate with APIChatRepository

### Week 2: Phase 2 (Backend Protection)
- Day 1-2: Implement RequestQueuingService
- Day 3-4: Implement IDE-specific rate limiting
- Day 5: Integration and testing

### Week 3: Phase 3 (Advanced Features)
- Day 1-2: Implement request monitoring
- Day 3-4: React Query integration
- Day 5: Performance optimization

### Week 4: Phase 4 (Testing & Documentation)
- Day 1-2: Unit and integration tests
- Day 3-4: E2E tests
- Day 5: Documentation and deployment

## Monitoring & Maintenance

### Performance Monitoring
- Request response times
- Cache hit rates
- Rate limit violations
- Queue lengths

### Alerting
- High response times (>1 second)
- High error rates (>5%)
- Rate limit violations (>10 per minute)
- Queue overflow (>100 requests)

### Maintenance Tasks
- Weekly cache cleanup
- Monthly performance review
- Quarterly rate limit adjustment
- Annual architecture review

This implementation provides a comprehensive solution for request deduplication that addresses all identified gaps while maintaining compatibility with the existing codebase architecture. 