# Backend Performance Bottleneck – Phase 1: In-Memory Chat Cache

## 📋 Phase Overview
- **Phase**: 1 of 2
- **Duration**: 2 hours
- **Priority**: Critical
- **Status**: Planning
- **Dependencies**: None

## 🎯 **PRINCIPLE: Simple In-Memory Cache for Live IDE Chat**

### **CRITICAL PROBLEM: Chat Extraction Performance**
- **GetChatHistoryStep**: 1000ms+ execution time (TOO SLOW!)
- **Live Extraction**: Every request hits browser directly
- **No Caching**: No performance optimization
- **Browser Overhead**: Heavy browser operations every time

## 🔍 **Root Cause Analysis - Chat Performance**

### **Problem 1: Slow Chat Extraction**

**Current Performance (PROBLEM):**
```javascript
// ❌ SLOW - backend/domain/steps/categories/chat/get_chat_history_step.js:162
if (messages.length === 0 || isPortNumber || context.sessionId === context.port) {
  const cursorIDEService = context.getService('cursorIDEService');
  if (cursorIDEService) {
    // Extract live chat from IDE - 1000ms+ every time!
    messages = await cursorIDEService.extractChatHistory(); // SLOW!
  }
}
```

**Optimized Performance (GOOD):**
```javascript
// ✅ FAST - backend/domain/steps/categories/chat/get_chat_history_step.js
async execute(context) {
  // Check cache first
  const cachedMessages = this.chatCacheService.getChatHistory(context.port);
  if (cachedMessages) {
    return {
      success: true,
      messages: cachedMessages,
      fromCache: true
    };
  }

  // Extract from browser if cache miss
  const messages = await cursorIDEService.extractChatHistory();
  
  // Cache the result
  this.chatCacheService.setChatHistory(context.port, messages);
  
  return {
    success: true,
    messages: messages,
    fromCache: false
  };
}
```

### **Problem 2: Heavy Browser Operations**

**Current Approach (PROBLEM):**
```javascript
// ❌ SLOW - backend/domain/services/chat/ChatHistoryExtractor.js:24
async extractChatHistory() {
  const page = await this.browserManager.getPage();
  await page.waitForTimeout(1000); // ← 1 SECOND DELAY!
  const allMessages = await this.extractMessagesByIDEType(page); // ← DOM OVERHEAD!
  return allMessages;
}
```

**Optimized Approach (GOOD):**
```javascript
// ✅ FAST - backend/domain/services/chat/ChatHistoryExtractor.js
async extractChatHistory() {
  const page = await this.browserManager.getPage();
  
  // Reduce timeout from 1000ms to 100ms
  await page.waitForTimeout(100); // ← OPTIMIZED!
  
  // Optimize DOM extraction
  const allMessages = await this.extractMessagesByIDEType(page);
  
  return allMessages;
}
```

## 📁 **Files to Create/Modify**

### **1. ChatCacheService.js (NEW)**
**Path**: `backend/infrastructure/cache/ChatCacheService.js`

**Purpose**: Simple in-memory cache for chat messages

**Implementation:**
```javascript
const Logger = require('@logging/Logger');
const logger = new Logger('ChatCacheService');

class ChatCacheService {
  constructor() {
    this.memoryCache = new Map(); // port -> { messages, timestamp }
    this.cacheTTL = 300000; // 5 minutes
    this.maxCacheSize = 100; // Maximum number of cached ports
  }

  /**
   * Get chat history from cache
   * @param {number} port - IDE port
   * @returns {Array|null} Cached messages or null if cache miss
   */
  getChatHistory(port) {
    try {
      const cached = this.memoryCache.get(port);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        logger.info(`Cache HIT for port ${port}: ${cached.messages.length} messages`);
        return cached.messages;
      }
      
      if (cached) {
        logger.info(`Cache EXPIRED for port ${port}`);
        this.memoryCache.delete(port);
      }
      
      logger.info(`Cache MISS for port ${port}`);
      return null; // Cache miss
    } catch (error) {
      logger.error(`Error getting cache for port ${port}:`, error);
      return null;
    }
  }

  /**
   * Set chat history in cache
   * @param {number} port - IDE port
   * @param {Array} messages - Chat messages
   */
  setChatHistory(port, messages) {
    try {
      // Clean up old entries if cache is full
      if (this.memoryCache.size >= this.maxCacheSize) {
        this.cleanupOldEntries();
      }

      this.memoryCache.set(port, {
        messages,
        timestamp: Date.now()
      });
      
      logger.info(`Cache SET for port ${port}: ${messages.length} messages`);
    } catch (error) {
      logger.error(`Error setting cache for port ${port}:`, error);
    }
  }

  /**
   * Invalidate cache for specific port
   * @param {number} port - IDE port
   */
  invalidateCache(port) {
    try {
      this.memoryCache.delete(port);
      logger.info(`Cache INVALIDATED for port ${port}`);
    } catch (error) {
      logger.error(`Error invalidating cache for port ${port}:`, error);
    }
  }

  /**
   * Clean up old cache entries
   */
  cleanupOldEntries() {
    try {
      const now = Date.now();
      const expiredPorts = [];
      
      for (const [port, cached] of this.memoryCache.entries()) {
        if (now - cached.timestamp > this.cacheTTL) {
          expiredPorts.push(port);
        }
      }
      
      expiredPorts.forEach(port => this.memoryCache.delete(port));
      
      if (expiredPorts.length > 0) {
        logger.info(`Cleaned up ${expiredPorts.length} expired cache entries`);
      }
    } catch (error) {
      logger.error('Error cleaning up cache:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const cached of this.memoryCache.values()) {
      if (now - cached.timestamp < this.cacheTTL) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries: this.memoryCache.size,
      validEntries,
      expiredEntries,
      maxSize: this.maxCacheSize,
      ttl: this.cacheTTL
    };
  }
}

module.exports = ChatCacheService;
```

### **2. GetChatHistoryStep.js (MODIFY)**
**Path**: `backend/domain/steps/categories/chat/get_chat_history_step.js`

**Enhancements:**
- [ ] Add cache service dependency
- [ ] Add cache check before browser extraction
- [ ] Add cache storage after extraction
- [ ] Add cache performance logging

**Code Changes:**
```javascript
// Add to constructor
constructor() {
  // ... existing code ...
  this.chatCacheService = null; // Will be injected
}

// Add to execute method
async execute(context) {
  const stepId = `get_chat_history_step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // ... existing validation code ...

    // Check cache first if we have a port
    if (context.port && this.chatCacheService) {
      const cachedMessages = this.chatCacheService.getChatHistory(context.port);
      if (cachedMessages && cachedMessages.length > 0) {
        logger.info(`Returning cached messages for port ${context.port}: ${cachedMessages.length} messages`);
        
        return {
          success: true,
          stepId,
          sessionId: context.sessionId,
          port: context.port,
          userId: context.userId,
          timestamp: new Date(),
          fromCache: true,
          data: {
            messages: cachedMessages,
            pagination: {
              limit,
              offset,
              total: cachedMessages.length
            }
          }
        };
      }
    }

    // ... existing session logic ...

    // If no messages from session or if sessionId is a port number, try IDE extraction
    if (messages.length === 0 || isPortNumber || context.sessionId === context.port) {
      const cursorIDEService = context.getService('cursorIDEService');
      if (cursorIDEService) {
        try {
          // Extract live chat from IDE
          messages = await cursorIDEService.extractChatHistory();
          logger.info(`Extracted ${messages.length} messages from IDE on port ${context.port || context.sessionId}`);
          
          // Cache the extracted messages
          if (context.port && this.chatCacheService && messages.length > 0) {
            this.chatCacheService.setChatHistory(context.port, messages);
            logger.info(`Cached ${messages.length} messages for port ${context.port}`);
          }
        } catch (error) {
          logger.error(`Failed to extract chat from IDE on port ${context.port || context.sessionId}:`, error);
          messages = [];
        }
      } else {
        logger.warn(`No cursorIDEService available for port ${context.port || context.sessionId}`);
        messages = [];
      }
    }

    // ... rest of existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
}
```

### **3. WebChatApplicationService.js (MODIFY)**
**Path**: `backend/application/services/WebChatApplicationService.js`

**Enhancements:**
- [ ] Add chat cache service dependency
- [ ] Pass cache service to step context
- [ ] Add cache performance monitoring

**Code Changes:**
```javascript
// Add to constructor
constructor(dependencies = {}) {
  // ... existing dependencies ...
  this.chatCacheService = dependencies.chatCacheService;
}

// Modify getPortChatHistory method
async getPortChatHistory(queryData, userContext) {
  try {
    const { port, limit = 50, offset = 0 } = queryData;
    
    const stepData = {
      sessionId: port, // Use port as sessionId for port-based chat history
      limit: parseInt(limit),
      offset: parseInt(offset),
      userId: userContext.userId,
      includeUserData: userContext.isAdmin || false,
      port: port // Add port to step data
    };
    
    // Add cache service to step context
    const stepContext = {
      ...stepData,
      getService: (serviceName) => {
        if (serviceName === 'chatCacheService') {
          return this.chatCacheService;
        }
        return this.serviceRegistry.getService(serviceName);
      }
    };
    
    const result = await this.stepRegistry.executeStep('GetChatHistoryStep', stepContext);
    
    // Check if step execution was successful
    if (!result.success) {
      throw new Error(`Step execution failed: ${result.error}`);
    }
    
    return {
      messages: result.result.data?.messages || result.result.messages || [],
      sessionId: result.result.sessionId,
      port: port,
      totalCount: result.result.data?.pagination?.total || result.result.totalCount || 0,
      hasMore: result.result.hasMore || false,
      fromCache: result.result.fromCache || false
    };
  } catch (error) {
    this.logger.error('Get port chat history error:', error);
    throw error;
  }
}
```

## 🎯 **Implementation Steps**

### **Step 1: Create ChatCacheService (45min)**
1. **Create cache service file** - Simple in-memory cache
2. **Implement cache methods** - get/set/invalidate with TTL
3. **Add cache cleanup** - Remove expired entries
4. **Add logging** - Track cache hits/misses

### **Step 2: Integrate Cache into GetChatHistoryStep (45min)**
1. **Add cache service dependency** - Inject into step
2. **Add cache check** - Check cache before browser extraction
3. **Add cache storage** - Store extracted messages
4. **Add cache logging** - Track performance improvements

### **Step 3: Update WebChatApplicationService (30min)**
1. **Add cache service dependency** - Inject into service
2. **Pass cache to step context** - Make cache available to steps
3. **Add cache monitoring** - Track cache usage
4. **Test integration** - Verify cache works

## ✅ **Success Criteria**

### **Performance Targets:**
- **Cache Hit Response Time**: <10ms (from 1000ms)
- **Cache Miss Response Time**: <200ms (from 1000ms)
- **Cache Hit Rate**: >80% for repeated requests
- **Memory Usage**: <100MB for cache

### **Functionality:**
- **Port-Based Caching** - No session IDs required
- **TTL Management** - 5-minute cache expiration
- **Cache Cleanup** - Automatic expired entry removal
- **Error Resilience** - Graceful cache failures

### **Code Quality:**
- **Simple Implementation** - No complex session management
- **Memory Efficient** - TTL-based cache cleanup
- **Proper Logging** - Track cache performance
- **Error Handling** - Graceful failures

## 🔧 **Technical Details**

### **Cache Strategy:**
```javascript
const cacheStrategy = {
  ttl: 300000, // 5 minutes
  maxSize: 100, // Maximum cached ports
  cleanup: 'automatic', // Remove expired entries
  key: 'port', // Port-based caching
  fallback: 'browser_extraction' // Fallback to live extraction
};
```

### **Performance Impact:**
```javascript
const performanceMetrics = {
  current: {
    extractionTime: 1000ms,  // Live browser extraction
    totalTime: 1000ms        // Every request
  },
  cached: {
    cacheHitTime: 10ms,      // Memory access
    cacheMissTime: 200ms,    // Optimized extraction
    averageTime: 50ms        // 80% hit rate
  }
};
```

## 📊 **Expected Results**

### **Before Cache:**
```
[GetChatHistoryStep] Extracted 15 messages from IDE on port 9222
[GetChatHistoryStep] executed successfully in 1016ms  ← TOO SLOW!
```

### **After Cache:**
```
[ChatCacheService] Cache HIT for port 9222: 15 messages
[GetChatHistoryStep] executed successfully in 8ms  ← 125x FASTER!
```

## 🚨 **Risk Mitigation**

### **High Risk:**
- **Cache invalidation issues** - Mitigation: Proper TTL management
- **Memory usage increase** - Mitigation: Cache size limits

### **Medium Risk:**
- **Cache miss performance** - Mitigation: Graceful fallback
- **Stale data** - Mitigation: 5-minute TTL

### **Low Risk:**
- **Minor bugs** - Mitigation: Code review and testing

## 📝 **Notes**

**This phase focuses on adding simple in-memory caching to eliminate the 1000ms+ chat extraction time. No session IDs, no database changes, just fast port-based caching.**

**The goal is to reduce chat response time from 1000ms to under 100ms through intelligent caching.** 