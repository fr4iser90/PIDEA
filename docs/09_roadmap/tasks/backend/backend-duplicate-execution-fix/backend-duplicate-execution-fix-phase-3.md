# Phase 3: Chat and IDE Service Fixes Implementation

## 📋 Phase Overview
- **Phase**: 3 of 5
- **Duration**: 3 hours
- **Priority**: High
- **Status**: Planning
- **Dependencies**: Phase 1 completion, WebChatApplicationService, IDEApplicationService

## 🎯 Objectives
1. Fix WebChatApplicationService duplicate executions
2. Add caching to IDEApplicationService
3. Remove deprecated CursorIDEService.sendMessage method
4. Implement chat history deduplication
5. Add IDE data caching with proper invalidation

## 📁 Files to Modify

### 1. WebChatApplicationService.js Fixes
**Path**: `backend/application/services/WebChatApplicationService.js`

**Current Issues Identified**:
- References non-existent `IDESendMessageStepEnhanced`
- Should use `IDESendMessageStep` instead
- No caching for chat operations
- Potential duplicate message sending

**Key Modifications**:
```javascript
class WebChatApplicationService {
  constructor({
    stepRegistry,
    cursorIDEService,
    authService,
    chatSessionService,
    eventBus,
    logger
  }) {
    // ... existing constructor code ...
    
    // Add caching for chat operations
    this.chatCache = new Map();
    this.cacheTTL = {
      chatHistory: 30000,    // 30 seconds
      sessionInfo: 60000,    // 1 minute
      userPermissions: 300000 // 5 minutes
    };
    
    // Add request deduplication
    this.pendingRequests = new Map();
  }

  /**
   * Send message through chat system with deduplication
   * @param {Object} messageData - Message data
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(messageData, userContext) {
    try {
      const { message, requestedBy, sessionId, metadata, port } = messageData;
      
      this.logger.info('Processing chat message:', { 
        messageLength: message?.length,
        requestedBy,
        sessionId: sessionId?.substring(0, 8) + '...',
        userRole: userContext.role
      });
      
      // Validate required fields
      if (!message || message.trim().length === 0) {
        throw new Error('Message content is required');
      }
      
      if (!requestedBy) {
        throw new Error('Requested by is required');
      }
      
      // Create request fingerprint for deduplication
      const fingerprint = this.generateMessageFingerprint(messageData, userContext);
      
      // Check for duplicate request
      if (this.pendingRequests.has(fingerprint)) {
        this.logger.info('Duplicate message request detected, returning existing result');
        return await this.pendingRequests.get(fingerprint);
      }
      
      // Create request promise
      const requestPromise = this.executeSendMessage(messageData, userContext, fingerprint);
      this.pendingRequests.set(fingerprint, requestPromise);
      
      try {
        const result = await requestPromise;
        return result;
      } finally {
        this.pendingRequests.delete(fingerprint);
      }
    } catch (error) {
      this.logger.error('Send message error:', error);
      throw error;
    }
  }

  /**
   * Execute the actual message sending with proper step reference
   * @param {Object} messageData - Message data
   * @param {Object} userContext - User context
   * @param {string} fingerprint - Request fingerprint
   * @returns {Promise<Object>} Send result
   */
  async executeSendMessage(messageData, userContext, fingerprint) {
    const { message, requestedBy, sessionId, metadata, port } = messageData;
    
    // Authenticate user if auth service is available
    if (this.authService && userContext.userId) {
      const isAuthorized = await this.authService.authorizeUser(userContext.userId, 'chat:send');
      if (!isAuthorized) {
        throw new Error('User not authorized to send chat messages');
      }
    }

    // Get current project ID from database based on active port
    const activePort = this.cursorIDEService?.ideManager?.getActivePort?.();
    let projectId = null;
    
    if (activePort) {
      // Get workspace path from IDE Manager
      const workspacePath = this.cursorIDEService?.ideManager?.getWorkspacePath?.(activePort);
      
      if (workspacePath) {
        // Get project repository from DI container
        const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
        const container = getServiceContainer();
        const projectRepository = container?.resolve('projectRepository');
        
        if (projectRepository) {
          const project = await projectRepository.findByWorkspacePath(workspacePath);
          if (project) {
            projectId = project.id;
          }
        }
      }
    }
    
    // Execute send message step with CORRECT step name
    const step = this.stepRegistry.getStep('IDESendMessageStep');
    if (!step) {
      throw new Error('Send message step not found');
    }
    
    const stepData = {
      message: message,
      sessionId: sessionId,
      userId: userContext.userId,
      port: port,
      projectId: projectId,
      metadata: {
        ...metadata,
        timestamp: new Date(),
        userId: userContext.userId,
        fingerprint: fingerprint
      }
    };
    
    const result = await this.stepRegistry.executeStep('IDESendMessageStep', stepData);
    
    // Check if step execution was successful
    if (!result.success) {
      throw new Error(`Step execution failed: ${result.error}`);
    }
    
    return {
      messageId: result.result.messageId,
      sessionId: result.result.sessionId,
      timestamp: result.result.timestamp,
      status: result.result.status
    };
  }

  /**
   * Get chat history for session with caching
   * @param {Object} queryData - Query parameters
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Chat history
   */
  async getChatHistory(queryData, userContext) {
    try {
      const { sessionId, limit = 50, offset = 0 } = queryData;
      
      this.logger.info('Getting chat history:', { 
        sessionId: sessionId?.substring(0, 8) + '...',
        limit,
        offset,
        userId: userContext.userId
      });
      
      // Create cache key
      const cacheKey = `chatHistory:${sessionId}:${limit}:${offset}:${userContext.userId}`;
      
      // Check cache first
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.debug('WebChatApplicationService: Returning cached chat history');
        return cached;
      }
      
      // Execute chat history step
      const step = this.stepRegistry.getStep('GetChatHistoryStep');
      if (!step) {
        throw new Error('Chat history step not found');
      }
      
      const stepData = {
        sessionId: sessionId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        userId: userContext.userId,
        includeUserData: userContext.isAdmin || false
      };
      
      const result = await step.execute(stepData);
      
      const response = {
        messages: result.messages,
        sessionId: result.sessionId,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      };
      
      // Cache the result
      this.setCachedResult(cacheKey, response, this.cacheTTL.chatHistory);
      
      return response;
    } catch (error) {
      this.logger.error('Get chat history error:', error);
      throw error;
    }
  }

  /**
   * Generate fingerprint for message deduplication
   * @param {Object} messageData - Message data
   * @param {Object} userContext - User context
   * @returns {string} Fingerprint
   */
  generateMessageFingerprint(messageData, userContext) {
    const { message, requestedBy, sessionId, port } = messageData;
    const { userId } = userContext;
    
    const data = {
      message: message?.trim(),
      requestedBy,
      sessionId,
      port,
      userId,
      timestamp: Math.floor(Date.now() / 1000) // Round to nearest second
    };
    
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Cache management methods
   */
  getCachedResult(key) {
    const entry = this.chatCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.chatCache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  setCachedResult(key, value, ttl) {
    this.chatCache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  /**
   * Invalidate chat cache for session
   * @param {string} sessionId - Session ID
   */
  invalidateChatCache(sessionId) {
    const keysToDelete = [];
    for (const key of this.chatCache.keys()) {
      if (key.includes(sessionId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.chatCache.delete(key));
    
    this.logger.debug('WebChatApplicationService: Invalidated chat cache', {
      sessionId,
      keysDeleted: keysToDelete.length
    });
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const [key, entry] of this.chatCache.entries()) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      totalEntries: this.chatCache.size,
      validEntries,
      expiredEntries,
      pendingRequests: this.pendingRequests.size
    };
  }

  // ... existing methods remain unchanged ...
}
```

### 2. IDEApplicationService.js Enhancements
**Path**: `backend/application/services/IDEApplicationService.js`

**Current Issues Identified**:
- Basic 5-second cache exists but needs enhancement
- No cache invalidation on IDE state changes
- No request deduplication

**Key Modifications**:
```javascript
class IDEApplicationService {
  constructor(dependencies = {}) {
    // ... existing constructor code ...
    
    // Enhanced caching with different TTLs
    this.cache = new Map();
    this.cacheTTL = {
      availableIDEs: 10000,     // 10 seconds
      workspaceInfo: 30000,     // 30 seconds
      projectInfo: 60000,       // 1 minute
      userPermissions: 300000   // 5 minutes
    };
    
    // Add request deduplication
    this.pendingRequests = new Map();
    
    // Setup cache invalidation on IDE changes
    this.setupCacheInvalidation();
  }

  // Enhanced getAvailableIDEs with better caching
  async getAvailableIDEs(userId) {
    try {
      this.logger.info('IDEApplicationService: Getting available IDEs', { userId });
      
      const cacheKey = `availableIDEs:${userId}`;
      
      // Check cache first
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.info('Returning cached IDE data');
        return {
          success: true,
          data: cached
        };
      }
      
      // Check for pending request
      if (this.pendingRequests.has(cacheKey)) {
        this.logger.info('Waiting for pending IDE data request');
        return await this.pendingRequests.get(cacheKey);
      }
      
      // Create new request promise
      const requestPromise = this.executeGetAvailableIDEs(userId);
      this.pendingRequests.set(cacheKey, requestPromise);
      
      try {
        const availableIDEs = await requestPromise;
        
        // Cache the result
        this.setCachedResult(cacheKey, availableIDEs, this.cacheTTL.availableIDEs);
        
        return {
          success: true,
          data: availableIDEs
        };
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    } catch (error) {
      this.logger.error('Error getting available IDEs:', error);
      throw error;
    }
  }

  // Execute method for getting available IDEs
  async executeGetAvailableIDEs(userId) {
    return await this.ideManager.getAvailableIDEs();
  }

  // Enhanced cache invalidation
  invalidateIDECache(pattern = null) {
    if (pattern) {
      // Invalidate specific pattern
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => this.cache.delete(key));
      
      this.logger.info('IDE cache invalidated for pattern', {
        pattern,
        keysDeleted: keysToDelete.length
      });
    } else {
      // Invalidate all cache
      this.cache.clear();
      this.logger.info('IDE cache completely invalidated');
    }
  }

  // Setup cache invalidation on IDE state changes
  setupCacheInvalidation() {
    if (this.eventBus) {
      this.eventBus.subscribe('activeIDEChanged', (eventData) => {
        this.logger.info('IDE changed, invalidating cache');
        this.invalidateIDECache('availableIDEs');
      });
      
      this.eventBus.subscribe('workspaceChanged', (eventData) => {
        this.logger.info('Workspace changed, invalidating cache');
        this.invalidateIDECache('workspaceInfo');
      });
      
      this.eventBus.subscribe('projectChanged', (eventData) => {
        this.logger.info('Project changed, invalidating cache');
        this.invalidateIDECache('projectInfo');
      });
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

  // Get cache statistics
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

  // ... existing methods remain unchanged ...
}
```

### 3. CursorIDEService.js Cleanup
**Path**: `backend/domain/services/CursorIDEService.js`

**Current Issues Identified**:
- Deprecated `sendMessage` method still exists
- Should be removed to prevent confusion

**Key Modifications**:
```javascript
class CursorIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    // ... existing constructor code ...
    
    // Remove deprecated sendMessage method reference
    this.logger.info('CursorIDEService: Initialized without deprecated sendMessage method');
  }

  // REMOVE the deprecated sendMessage method entirely
  // It should not exist in this class anymore
  
  // Keep all other methods unchanged
  // ... existing methods remain unchanged ...
}
```

## 📁 Files to Create

### 1. ChatDeduplicationService.js
**Path**: `backend/domain/services/ChatDeduplicationService.js`

**Purpose**: Dedicated service for chat message deduplication

**Implementation**:
```javascript
const { Logger } = require('@infrastructure/logging/Logger');
const crypto = require('crypto');

class ChatDeduplicationService {
  constructor(logger = null) {
    this.logger = logger || new Logger('ChatDeduplicationService');
    this.pendingMessages = new Map();
    this.messageHistory = new Map();
    this.deduplicationWindow = 5000; // 5 seconds
  }

  /**
   * Check if message is duplicate and handle accordingly
   * @param {Object} messageData - Message data
   * @param {Object} userContext - User context
   * @returns {Object} Deduplication result
   */
  async checkDuplicate(messageData, userContext) {
    const fingerprint = this.generateFingerprint(messageData, userContext);
    const now = Date.now();
    
    // Check if message is already being processed
    if (this.pendingMessages.has(fingerprint)) {
      this.logger.info('ChatDeduplicationService: Duplicate message detected (pending)', { fingerprint: fingerprint.substring(0, 8) });
      return {
        isDuplicate: true,
        type: 'pending',
        existingPromise: this.pendingMessages.get(fingerprint)
      };
    }
    
    // Check if message was recently sent
    const recentMessage = this.messageHistory.get(fingerprint);
    if (recentMessage && (now - recentMessage.timestamp) < this.deduplicationWindow) {
      this.logger.info('ChatDeduplicationService: Duplicate message detected (recent)', { fingerprint: fingerprint.substring(0, 8) });
      return {
        isDuplicate: true,
        type: 'recent',
        existingResult: recentMessage.result
      };
    }
    
    return {
      isDuplicate: false,
      fingerprint
    };
  }

  /**
   * Register message as being processed
   * @param {string} fingerprint - Message fingerprint
   * @param {Promise} promise - Processing promise
   */
  registerPendingMessage(fingerprint, promise) {
    this.pendingMessages.set(fingerprint, promise);
    
    // Clean up after promise resolves
    promise.finally(() => {
      this.pendingMessages.delete(fingerprint);
    });
  }

  /**
   * Register completed message
   * @param {string} fingerprint - Message fingerprint
   * @param {Object} result - Message result
   */
  registerCompletedMessage(fingerprint, result) {
    this.messageHistory.set(fingerprint, {
      result,
      timestamp: Date.now()
    });
    
    // Clean up old messages
    this.cleanupOldMessages();
  }

  /**
   * Generate fingerprint for message
   * @param {Object} messageData - Message data
   * @param {Object} userContext - User context
   * @returns {string} Fingerprint
   */
  generateFingerprint(messageData, userContext) {
    const { message, requestedBy, sessionId, port } = messageData;
    const { userId } = userContext;
    
    const data = {
      message: message?.trim(),
      requestedBy,
      sessionId,
      port,
      userId,
      timestamp: Math.floor(Date.now() / 1000) // Round to nearest second
    };
    
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Clean up old messages from history
   */
  cleanupOldMessages() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.messageHistory.entries()) {
      if (now - entry.timestamp > this.deduplicationWindow) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.messageHistory.delete(key));
    
    if (keysToDelete.length > 0) {
      this.logger.debug('ChatDeduplicationService: Cleaned up old messages', {
        cleaned: keysToDelete.length,
        remaining: this.messageHistory.size
      });
    }
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      pendingMessages: this.pendingMessages.size,
      messageHistory: this.messageHistory.size,
      deduplicationWindow: this.deduplicationWindow
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.pendingMessages.clear();
    this.messageHistory.clear();
    this.logger.info('ChatDeduplicationService: All data cleared');
  }
}

module.exports = ChatDeduplicationService;
```

## 🧪 Testing Strategy

### Unit Tests
**File**: `tests/unit/ChatAndIDEServiceFixes.test.js`

**Test Cases**:
- WebChatApplicationService deduplication
- IDEApplicationService caching
- Chat message fingerprinting
- Cache invalidation scenarios
- Error handling with deduplication

### Integration Tests
**File**: `tests/integration/ChatAndIDEServiceFixes.test.js`

**Test Cases**:
- End-to-end chat message flow
- IDE data caching and invalidation
- Concurrent message handling
- Performance improvements measurement

## 📊 Success Metrics
- [ ] 95% reduction in duplicate chat messages
- [ ] 80% improvement in IDE data response times
- [ ] Cache hit rate > 90% for IDE operations
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] No deprecated method usage

## 🔄 Next Phase
After completing Phase 3, proceed to [Phase 4: Analytics and Monitoring](./backend-duplicate-execution-fix-phase-4.md) to implement analytics and monitoring systems.

## 📝 Notes
- This phase addresses the most critical duplicate execution issues
- Chat message deduplication prevents spam and improves performance
- IDE caching reduces redundant API calls
- Deprecated methods are properly removed
- The implementation maintains backward compatibility 