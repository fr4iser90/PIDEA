# Phase 2: Git Service Optimization Implementation

## 📋 Phase Overview
- **Phase**: 2 of 5
- **Duration**: 3 hours
- **Priority**: Medium
- **Status**: Planning
- **Dependencies**: Phase 1 completion, GitService, StepRegistry

## 🎯 Objectives
1. Add caching layer to GitService
2. Implement request batching for Git operations
3. Create Git operation deduplication
4. Add cache invalidation for Git state changes
5. Optimize GitGetCurrentBranchStep execution

## 📁 Files to Modify

### 1. GitService.js Optimizations
**Path**: `backend/infrastructure/external/GitService.js`

**Current Issues Identified**:
- Multiple calls to `getCurrentBranch` in same request
- No caching for Git operations
- Each Git step executed independently
- No request batching

**Key Modifications**:
```javascript
class GitService {
  constructor(dependencies = {}) {
    // ... existing constructor code ...
    
    // Add caching layer
    this.cache = new Map();
    this.cacheTTL = {
      status: 30000,      // 30 seconds
      currentBranch: 60000, // 1 minute
      branches: 120000,   // 2 minutes
      remoteUrl: 300000   // 5 minutes
    };
    
    // Add request batching
    this.pendingRequests = new Map();
    this.batchTimeout = 100; // 100ms batch window
  }

  // Enhanced getCurrentBranch with caching
  async getCurrentBranch(repoPath) {
    const cacheKey = `currentBranch:${repoPath}`;
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      this.logger.debug('GitService: Returning cached current branch', { repoPath });
      return cached;
    }

    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      this.logger.debug('GitService: Waiting for pending current branch request', { repoPath });
      return await this.pendingRequests.get(cacheKey);
    }

    // Create new request promise
    const requestPromise = this.executeGetCurrentBranch(repoPath);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.setCachedResult(cacheKey, result, this.cacheTTL.currentBranch);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Enhanced getStatus with caching
  async getStatus(repoPath, options = {}) {
    const { porcelain = true } = options;
    const cacheKey = `status:${repoPath}:${porcelain}`;
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      this.logger.debug('GitService: Returning cached status', { repoPath });
      return cached;
    }

    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      this.logger.debug('GitService: Waiting for pending status request', { repoPath });
      return await this.pendingRequests.get(cacheKey);
    }

    // Create new request promise
    const requestPromise = this.executeGetStatus(repoPath, options);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.setCachedResult(cacheKey, result, this.cacheTTL.status);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Enhanced getBranches with caching and batching
  async getBranches(repoPath, options = {}) {
    const { includeRemote = true, includeLocal = true } = options;
    const cacheKey = `branches:${repoPath}:${includeRemote}:${includeLocal}`;
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      this.logger.debug('GitService: Returning cached branches', { repoPath });
      return cached;
    }

    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      this.logger.debug('GitService: Waiting for pending branches request', { repoPath });
      return await this.pendingRequests.get(cacheKey);
    }

    // Create new request promise
    const requestPromise = this.executeGetBranches(repoPath, options);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.setCachedResult(cacheKey, result, this.cacheTTL.branches);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Cache management methods
  getCachedResult(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  setCachedResult(key, value, ttl) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  // Cache invalidation methods
  invalidateCache(repoPath) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(repoPath)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.logger.debug('GitService: Invalidated cache for repository', { repoPath, keysDeleted: keysToDelete.length });
  }

  // Execute methods (extracted from original methods)
  async executeGetCurrentBranch(repoPath) {
    try {
      this.logger.info('GitService: Getting current branch using step', { repoPath });
      
      if (!this.stepRegistry) {
        throw new Error('StepRegistry not available for Git operations');
      }

      const stepContext = {
        projectPath: repoPath
      };

      const result = await this.stepRegistry.executeStep('GitGetCurrentBranchStep', stepContext);
      
      if (result.success) {
        const currentBranch = result.result?.currentBranch || result.currentBranch;
        this.logger.info(`Aktueller Branch für ${repoPath}: "${currentBranch}"`);
        return currentBranch;
      } else {
        throw new Error(result.error || 'Failed to get current branch');
      }
    } catch (error) {
      this.logger.error('GitService: Failed to get current branch', {
        repoPath,
        error: error.message
      });
      throw new Error(`Failed to get current branch: ${error.message}`);
    }
  }

  async executeGetStatus(repoPath, options = {}) {
    const { porcelain = true } = options;
    
    try {
      this.logger.info('GitService: Getting status using step', { repoPath, porcelain });
      
      if (!this.stepRegistry) {
        throw new Error('StepRegistry not available for Git operations');
      }

      const stepContext = {
        projectPath: repoPath,
        porcelain
      };

      const result = await this.stepRegistry.executeStep('GitGetStatusStep', stepContext);
      
      if (result.success) {
        return result.result?.status || result.status;
      } else {
        throw new Error(result.error || 'Failed to get status');
      }
    } catch (error) {
      this.logger.error('GitService: Failed to get status', {
        repoPath,
        error: error.message
      });
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }

  async executeGetBranches(repoPath, options = {}) {
    const { includeRemote = true, includeLocal = true } = options;
    
    try {
      this.logger.info('GitService: Getting branches using step', { repoPath, includeRemote, includeLocal });
      
      if (!this.stepRegistry) {
        throw new Error('StepRegistry not available for Git operations');
      }

      const stepContext = {
        projectPath: repoPath,
        includeRemote,
        includeLocal
      };

      const result = await this.stepRegistry.executeStep('GitGetBranchesStep', stepContext);
      
      if (result.success) {
        return result.result?.branches || { local: [], remote: [], all: [] };
      } else {
        throw new Error(result.error || 'Failed to get branches');
      }
    } catch (error) {
      this.logger.error('GitService: Failed to get branches', {
        repoPath,
        error: error.message
      });
      throw new Error(`Failed to get branches: ${error.message}`);
    }
  }

  // Cache statistics
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      pendingRequests: this.pendingRequests.size
    };
  }

  // Cleanup expired cache entries
  cleanupCache() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.logger.debug('GitService: Cleaned up expired cache entries', { 
        cleaned: keysToDelete.length,
        remaining: this.cache.size
      });
    }
  }
}
```

### 2. GitApplicationService.js Optimizations
**Path**: `backend/application/services/GitApplicationService.js`

**Current Issues Identified**:
- Multiple calls to `getCurrentBranch` in same request
- No request batching
- Redundant Git operations

**Key Modifications**:
```javascript
class GitApplicationService {
  constructor(dependencies = {}) {
    // ... existing constructor code ...
    
    // Add request batching
    this.pendingRequests = new Map();
    this.batchTimeout = 50; // 50ms batch window
  }

  // Optimized getStatus with single getCurrentBranch call
  async getStatus(projectId, projectPath, userId) {
    try {
      this.logger.info('GitApplicationService: Getting Git status', { projectId, userId });

      // Check if it's a Git repository
      const isGitRepo = await this.gitService.isGitRepository(projectPath);
      if (!isGitRepo) {
        throw new Error('Not a Git repository');
      }

      // Batch status and current branch requests
      const [status, currentBranch] = await Promise.all([
        this.gitService.getStatus(projectPath),
        this.gitService.getCurrentBranch(projectPath)
      ]);

      return {
        success: true,
        data: {
          status,
          currentBranch
        }
      };
    } catch (error) {
      this.logger.error('Error getting Git status:', error);
      throw error;
    }
  }

  // Optimized getBranches with single getCurrentBranch call
  async getBranches(projectPath, userId) {
    try {
      this.logger.info('GitApplicationService: Getting branches', { userId });
      
      // Batch branches and current branch requests
      const [branches, currentBranch] = await Promise.all([
        this.gitService.getBranches(projectPath),
        this.gitService.getCurrentBranch(projectPath)
      ]);
      
      return {
        success: true,
        data: {
          branches,
          currentBranch
        }
      };
    } catch (error) {
      this.logger.error('Error getting branches:', error);
      throw error;
    }
  }

  // New method for batch Git operations
  async getGitInfo(projectPath, userId) {
    try {
      this.logger.info('GitApplicationService: Getting comprehensive Git info', { userId });
      
      // Check if it's a Git repository
      const isGitRepo = await this.gitService.isGitRepository(projectPath);
      if (!isGitRepo) {
        throw new Error('Not a Git repository');
      }

      // Batch all Git operations
      const [status, currentBranch, branches] = await Promise.all([
        this.gitService.getStatus(projectPath),
        this.gitService.getCurrentBranch(projectPath),
        this.gitService.getBranches(projectPath)
      ]);

      return {
        success: true,
        data: {
          status,
          currentBranch,
          branches,
          isGitRepository: true
        }
      };
    } catch (error) {
      this.logger.error('Error getting Git info:', error);
      throw error;
    }
  }

  // Cache invalidation method
  async invalidateGitCache(projectPath) {
    try {
      this.gitService.invalidateCache(projectPath);
      this.logger.info('GitApplicationService: Invalidated Git cache', { projectPath });
    } catch (error) {
      this.logger.error('Error invalidating Git cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      return this.gitService.getCacheStats();
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return null;
    }
  }
}
```

### 3. GitController.js Optimizations
**Path**: `backend/presentation/api/GitController.js`

**Key Modifications**:
```javascript
class GitController {
  // ... existing constructor and methods ...

  // New endpoint for comprehensive Git info
  async getGitInfo(req, res) {
    try {
      const projectId = req.params.projectId;
      const { projectPath } = req.body;
      const userId = req.user?.id;

      if (!projectId || !projectPath) {
        return res.status(400).json({
          success: false,
          error: 'Project ID and project path are required'
        });
      }

      this.logger.info('GitController: Getting comprehensive Git info', { projectId, userId });

      const result = await this.gitApplicationService.getGitInfo(projectPath, userId);

      res.json({
        success: true,
        data: result.data,
        message: 'Git info retrieved successfully'
      });

    } catch (error) {
      this.logger.error('GitController: Failed to get Git info', {
        projectPath: req.body.projectPath,
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get Git info',
        message: error.message
      });
    }
  }

  // New endpoint for cache management
  async getCacheStats(req, res) {
    try {
      const userId = req.user?.id;

      this.logger.info('GitController: Getting cache stats', { userId });

      const stats = await this.gitApplicationService.getCacheStats();

      res.json({
        success: true,
        data: stats,
        message: 'Cache stats retrieved successfully'
      });

    } catch (error) {
      this.logger.error('GitController: Failed to get cache stats', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get cache stats',
        message: error.message
      });
    }
  }

  // New endpoint for cache invalidation
  async invalidateCache(req, res) {
    try {
      const projectId = req.params.projectId;
      const { projectPath } = req.body;
      const userId = req.user?.id;

      if (!projectId || !projectPath) {
        return res.status(400).json({
          success: false,
          error: 'Project ID and project path are required'
        });
      }

      this.logger.info('GitController: Invalidating Git cache', { projectId, userId });

      await this.gitApplicationService.invalidateGitCache(projectPath);

      res.json({
        success: true,
        message: 'Git cache invalidated successfully'
      });

    } catch (error) {
      this.logger.error('GitController: Failed to invalidate cache', {
        projectPath: req.body.projectPath,
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to invalidate cache',
        message: error.message
      });
    }
  }
}
```

## 📁 Files to Create

### 1. GitCacheManager.js
**Path**: `backend/domain/services/GitCacheManager.js`

**Purpose**: Dedicated cache management for Git operations

**Implementation**:
```javascript
const { Logger } = require('@infrastructure/logging/Logger');

class GitCacheManager {
  constructor(logger = null) {
    this.logger = logger || new Logger('GitCacheManager');
    this.cache = new Map();
    this.pendingRequests = new Map();
    
    // Cache TTL configuration
    this.ttl = {
      status: 30000,      // 30 seconds
      currentBranch: 60000, // 1 minute
      branches: 120000,   // 2 minutes
      remoteUrl: 300000   // 5 minutes
    };
    
    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Every minute
  }

  async getOrExecute(key, executor, ttl = 30000) {
    // Check cache first
    const cached = this.get(key);
    if (cached) {
      this.logger.debug('GitCacheManager: Cache hit', { key: key.substring(0, 20) });
      return cached;
    }

    // Check for pending request
    if (this.pendingRequests.has(key)) {
      this.logger.debug('GitCacheManager: Waiting for pending request', { key: key.substring(0, 20) });
      return await this.pendingRequests.get(key);
    }

    // Execute and cache
    const requestPromise = executor();
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      this.set(key, result, ttl);
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  set(key, value, ttl = 30000) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  invalidate(pattern) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    this.logger.info('GitCacheManager: Invalidated cache entries', {
      pattern,
      keysDeleted: keysToDelete.length
    });
  }

  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug('GitCacheManager: Cleaned expired entries', {
        cleaned,
        remaining: this.cache.size
      });
    }
  }

  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      pendingRequests: this.pendingRequests.size
    };
  }

  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
    this.logger.info('GitCacheManager: Cache cleared');
  }
}

module.exports = GitCacheManager;
```

## 🧪 Testing Strategy

### Unit Tests
**File**: `tests/unit/GitServiceOptimization.test.js`

**Test Cases**:
- Cache hit/miss scenarios
- Request batching functionality
- Cache invalidation
- Concurrent request handling
- TTL expiration

### Integration Tests
**File**: `tests/integration/GitServiceOptimization.test.js`

**Test Cases**:
- End-to-end Git operations with caching
- Cache invalidation on Git state changes
- Performance improvements measurement
- Error handling with cache

## 📊 Success Metrics
- [ ] 90% reduction in duplicate Git operations
- [ ] 70% improvement in Git operation response times
- [ ] Cache hit rate > 85% for Git operations
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] No memory leaks in Git cache

## 🔄 Next Phase
After completing Phase 2, proceed to [Phase 3: Chat and IDE Service Fixes](./backend-duplicate-execution-fix-phase-3.md) to address chat and IDE service optimizations.

## 📝 Notes
- This phase builds on Phase 1's deduplication foundation
- Git operations are now batched and cached efficiently
- Cache invalidation ensures data consistency
- Performance improvements are measurable and significant
- The implementation maintains backward compatibility 