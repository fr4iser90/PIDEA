# Backend Performance Bottleneck – Phase 2: Chat Performance Optimization

## 📋 Phase Overview
- **Phase**: 2 of 4
- **Duration**: 2 hours
- **Priority**: Critical
- **Status**: Planning
- **Dependencies**: Phase 1 completion

## 🎯 **PRINCIPLE: Optimize Chat Performance with Caching & Session Management**

### **CRITICAL PROBLEM: Chat Extraction Performance**
- **GetChatHistoryStep**: 1000ms+ execution time (TOO SLOW!)
- **Live Extraction**: Every request hits IDE directly
- **No Background Polling**: No automatic DB storage
- **No Caching**: No performance optimization
- **Session Management**: No automatic session detection

## 🔍 **Root Cause Analysis - Chat Performance**

### **Problem 1: Slow Chat Extraction**

**Current Performance (PROBLEM):**
```javascript
// ❌ SLOW - backend/domain/steps/categories/chat/get_chat_history_step.js
class GetChatHistoryStep {
  async execute(context) {
    // Always extract live from IDE - 1000ms+ every time!
    const cursorIDEService = context.getService('cursorIDEService');
    const messages = await cursorIDEService.extractChatHistory(); // SLOW!
    
    return {
      success: true,
      messages: messages
    };
  }
}
```

**Optimized Performance (GOOD):**
```javascript
// ✅ FAST - backend/domain/steps/categories/chat/get_chat_history_step.js
class GetChatHistoryStep {
  async execute(context) {
    const { port, userId } = context;
    const cacheKey = `${port}_${userId}`;
    
    // 1. Check memory cache first (fastest)
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5min TTL
        return { success: true, messages: cached.messages };
      }
    }
    
    // 2. Query database directly (background polling fills this)
    const dbMessages = await this.chatRepository.getMessagesByPort(port, userId);
    
    // 3. Store in memory cache
    this.memoryCache.set(cacheKey, {
      messages: dbMessages,
      timestamp: Date.now()
    });
    
    return { success: true, messages: dbMessages };
  }
}
```

### **Problem 2: No Session-Port Mapping**

**Current Approach (PROBLEM):**
```javascript
// ❌ BAD - No automatic session detection
class ChatSessionService {
  async getChatHistory(userId, sessionId, options = {}) {
    // Session ID must be provided manually
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    // No automatic mapping to IDE ports
    const messages = await this.chatRepository.getSessionMessages(sessionId);
    return messages;
  }
}
```

**Enhanced Approach (GOOD):**
```javascript
// ✅ GOOD - Automatic session-port mapping
class EnhancedChatSessionService {
  async getChatHistory(userId, port, options = {}) {
    // 1. Detect or create session for this port
    const sessionId = await this.sessionDetectionService.detectSessionForPort(port);
    
    // 2. Get messages with caching
    const messages = await this.getChatHistoryWithCache(port, userId, sessionId);
    
    return {
      messages,
      sessionId,
      port,
      ideType: this.detectIDEType(port)
    };
  }
  
  detectIDEType(port) {
    if (port >= 9222 && port <= 9231) return 'cursor';
    if (port >= 9232 && port <= 9241) return 'vscode';
    if (port >= 9242 && port <= 9251) return 'windsurf';
    return 'unknown';
  }
}
```

## 📁 **Files to Create/Modify**

### **1. ChatCacheService.js (NEW)**
**Path**: `backend/infrastructure/cache/ChatCacheService.js`

**Purpose**: Memory and database caching for chat messages

**Implementation:**
```javascript
class ChatCacheService {
  constructor() {
    this.memoryCache = new Map(); // 5-minute TTL
  }

  async getChatHistory(port, userId) {
    const memoryKey = `${port}_${userId}`;
    
    // Check memory cache only
    if (this.memoryCache.has(memoryKey)) {
      const cached = this.memoryCache.get(memoryKey);
      if (Date.now() - cached.timestamp < 300000) { // 5min TTL
        return cached.messages;
      }
    }

    return null; // Cache miss - query database directly
  }

  async setChatHistory(port, userId, messages) {
    const memoryKey = `${port}_${userId}`;
    
    // Store in memory cache only
    this.memoryCache.set(memoryKey, {
      messages,
      timestamp: Date.now()
    });
  }
  }
}
```

### **2. SessionDetectionService.js (NEW)**
**Path**: `backend/domain/services/chat/SessionDetectionService.js`

**Purpose**: Automatic session detection for IDE ports

### **3. ChatBackgroundPollingService.js (NEW)**
**Path**: `backend/domain/services/chat/ChatBackgroundPollingService.js`

**Purpose**: Smart background polling with real-time detection

**Implementation:**
```javascript
class ChatBackgroundPollingService {
  constructor(ideManager, chatRepository, eventBus) {
    this.ideManager = ideManager;
    this.chatRepository = chatRepository;
    this.eventBus = eventBus;
    this.lastMessageHashes = new Map(); // port -> Set of message hashes
    this.isPolling = false;
  }

  async startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.logger.info('Starting smart chat background polling...');
    
    // Smart polling: Check every 5 seconds for new messages
    setInterval(async () => {
      await this.pollAllActiveIDEs();
    }, 5000); // 5 seconds - much faster!
  }

  async pollAllActiveIDEs() {
    try {
      const activeIDEs = await this.ideManager.getAvailableIDEs();
      
      for (const [port, ide] of Object.entries(activeIDEs)) {
        await this.pollIDEForChat(port, ide);
      }
    } catch (error) {
      this.logger.error('Error polling IDEs for chat:', error);
    }
  }

  async pollIDEForChat(port, ide) {
    try {
      // Get IDE service for this port
      const ideService = await this.getIDEServiceForPort(port);
      if (!ideService) return;

      // Extract chat history from IDE
      const messages = await ideService.extractChatHistory();
      
      // Get existing message hashes for this port
      const existingHashes = this.lastMessageHashes.get(port) || new Set();
      const newMessages = [];
      
      // Check each message for new content
      for (const message of messages) {
        // Create unique hash from content + sender + timestamp
        const messageHash = this.createMessageHash(message);
        
        if (!existingHashes.has(messageHash)) {
          // New message detected!
          newMessages.push(message);
          existingHashes.add(messageHash);
        }
      }
      
      if (newMessages.length > 0) {
        // Store new messages in database
        await this.chatRepository.saveMessagesFromIDE(newMessages, port, 'system');
        
        this.logger.info(`New messages detected on port ${port}: ${newMessages.length} messages`);
        
        // Emit real-time WebSocket event for immediate frontend update
        this.eventBus.emit('chat:new:messages', {
          port,
          messageCount: newMessages.length,
          messages: newMessages,
          timestamp: new Date()
        });
        
        // Update hash set
        this.lastMessageHashes.set(port, existingHashes);
      }
    } catch (error) {
      this.logger.error(`Error polling IDE port ${port}:`, error);
    }
  }

  createMessageHash(message) {
    // Create unique hash from message content and metadata
    const content = message.content || '';
    const sender = message.sender || '';
    const timestamp = message.timestamp || '';
    
    // Simple hash function (can be replaced with crypto.createHash)
    let hash = 0;
    const str = `${content}|${sender}|${timestamp}`;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }

  async getIDEServiceForPort(port) {
    // Get appropriate IDE service based on port
    if (port >= 9222 && port <= 9231) {
      return this.serviceRegistry.getService('cursorIDEService');
    } else if (port >= 9232 && port <= 9241) {
      return this.serviceRegistry.getService('vscodeIDEService');
    } else if (port >= 9242 && port <= 9251) {
      return this.serviceRegistry.getService('windsurfIDEService');
    }
    return null;
  }

  stopPolling() {
    this.isPolling = false;
    this.logger.info('Stopped smart chat background polling');
  }
}
```
```javascript
class SessionDetectionService {
  async detectSessionForPort(port) {
    // 1. Check existing sessions for this port
    const existingSession = await this.chatRepository.findSessionByPort(port);
    if (existingSession) {
      return existingSession.id;
    }

    // 2. Create new session with port mapping
    const sessionId = `session_${port}_${Date.now()}`;
    const session = {
      id: sessionId,
      port: port,
      ideType: this.detectIDEType(port),
      createdAt: new Date(),
      status: 'active'
    };

    await this.chatRepository.saveSession(session);
    return sessionId;
  }

  detectIDEType(port) {
    if (port >= 9222 && port <= 9231) return 'cursor';
    if (port >= 9232 && port <= 9241) return 'vscode';
    if (port >= 9242 && port <= 9251) return 'windsurf';
    return 'unknown';
  }
}
```

### **4. WebChatApplicationService.js (MODIFY)**
**Path**: `backend/application/services/WebChatApplicationService.js`

**Enhancements:**
- [ ] Add chat caching integration
- [ ] Add session detection integration
- [ ] Optimize getPortChatHistory method
- [ ] Add performance monitoring

**Code Changes:**
```javascript
// Add to WebChatApplicationService.js
class WebChatApplicationService {
  constructor(dependencies) {
    this.chatCacheService = dependencies.chatCacheService;
    this.sessionDetectionService = dependencies.sessionDetectionService;
  }

  async getPortChatHistory(queryData, userContext) {
    const { port, limit = 50, offset = 0 } = queryData;
    const { userId } = userContext;
    
    // 1. Check cache first
    const cachedMessages = await this.chatCacheService.getChatHistory(port, userId);
    if (cachedMessages) {
      return {
        messages: cachedMessages.slice(offset, offset + limit),
        sessionId: await this.sessionDetectionService.detectSessionForPort(port),
        port: port,
        totalCount: cachedMessages.length,
        hasMore: cachedMessages.length > offset + limit
      };
    }

    // 2. Query database directly (no IDE extraction)
    const messages = await this.chatRepository.getMessagesByPort(port, userId, limit, offset);
    
    // 3. Cache the result
    await this.chatCacheService.setChatHistory(port, userId, messages);
    
    return {
      messages: messages,
      sessionId: await this.sessionDetectionService.detectSessionForPort(port),
      port: port,
      totalCount: messages.length,
      hasMore: messages.length === limit
    };
  }
}
```

### **4. ChatRepository.js (MODIFY)**
**Path**: `backend/infrastructure/database/repositories/ChatRepository.js`

**Enhancements:**
- [ ] Add port-based message storage
- [ ] Add session-port mapping
- [ ] Add message caching methods
- [ ] Optimize database queries

**Code Changes:**
```javascript
// Add to ChatRepository.js
class ChatRepository {
  async saveMessagesFromIDE(messages, port, userId) {
    // Store extracted messages immediately
    for (const message of messages) {
      const dbMessage = {
        id: message.id || `msg_${Date.now()}_${Math.random()}`,
        content: message.content,
        sender: message.sender,
        port: port,
        userId: userId,
        timestamp: message.timestamp || new Date().toISOString(),
        source: 'ide_extraction'
      };

      await this.db.execute(
        'INSERT INTO chat_messages (id, content, sender, port, user_id, timestamp, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [dbMessage.id, dbMessage.content, dbMessage.sender, dbMessage.port, dbMessage.userId, dbMessage.timestamp, dbMessage.source]
      );
    }
  }

  async findSessionByPort(port) {
    const sql = 'SELECT * FROM chat_sessions WHERE ide_port = ? AND status = "active" ORDER BY updated_at DESC LIMIT 1';
    const rows = await this.db.query(sql, [port]);
    
    if (rows.length > 0) {
      return ChatSession.fromJSON(rows[0]);
    }
    
    return null;
  }
}
```

## 🎯 **Implementation Steps**

### **Step 1: Create ChatCacheService (30min)**
1. **Create memory cache** - 5-minute TTL for fast access
2. **Implement cache methods** - get/set with TTL management
3. **Add cache invalidation** - clear expired entries
4. **No database cache** - Direct DB queries only

### **Step 2: Create SessionDetectionService (30min)**
1. **Implement port-based session detection** - automatic mapping
2. **Add IDE type detection** - Cursor/VSCode/Windsurf
3. **Create session management** - create/find sessions
4. **Add session validation** - ensure proper session state

### **Step 3: Create ChatBackgroundPollingService (30min)**
1. **Create smart polling** - Check every 5 seconds for new messages
2. **Detect new messages** - Compare content hashes for accurate detection
3. **Emit real-time events** - Immediate WebSocket updates when new messages detected
4. **Handle multiple IDEs** - Poll all active IDE ports

### **Step 4: Enhance WebChatApplicationService (30min)**
1. **Integrate chat caching** - use cache service
2. **Add session detection** - automatic session mapping
3. **Optimize getPortChatHistory** - cache-first approach
4. **Add performance monitoring** - track response times

### **Step 5: Enhance ChatRepository (15min)**
1. **Add port-based storage** - store messages by port
2. **Add session-port mapping** - link sessions to ports
3. **Optimize database queries** - faster retrieval
4. **Add message storage** - Store background polling results

## ✅ **Success Criteria**

### **Performance Targets:**
- **Chat Response Time**: 1000ms → <100ms (10x faster)
- **Cache Hit Rate**: >80% for repeated requests
- **Memory Usage**: Optimized with intelligent caching
- **Database Queries**: Reduced by 70% through caching

### **Functionality:**
- **Automatic Session Detection** - Port → Session mapping
- **Memory Caching** - 5-minute TTL for fast access
- **Smart Background Polling** - Check every 5 seconds for new messages
- **Content Hash Detection** - Compare message content hashes for accurate detection
- **Immediate WebSocket Updates** - Frontend updates instantly when new messages detected
- **Database Storage** - Store new messages immediately
- **IDE Type Recognition** - Cursor/VSCode/Windsurf

### **Code Quality:**
- **Clean Architecture** - Separation of concerns
- **Proper Error Handling** - Graceful cache failures
- **Performance Monitoring** - Track improvements
- **Comprehensive Testing** - Cache behavior validation

## 🔧 **Technical Details**

### **Smart Polling Strategy:**
```javascript
// Smart polling approach
const pollingStrategy = {
  interval: 5000, // 5 seconds - much faster!
  purpose: 'Detect new chat messages in real-time',
  storage: 'database',
  events: 'Immediate WebSocket updates when new messages detected',
  detection: 'Content hash comparison for accurate detection',
  ides: ['cursor', 'vscode', 'windsurf']
};
```

### **Session Detection Strategy:**
```javascript
// Automatic session-port mapping
const sessionMapping = {
  cursor: {
    portRange: [9222, 9231],
    sessionPrefix: 'cursor_session'
  },
  vscode: {
    portRange: [9232, 9241],
    sessionPrefix: 'vscode_session'
  },
  windsurf: {
    portRange: [9242, 9251],
    sessionPrefix: 'windsurf_session'
  }
};
```

## 📊 **Expected Results**

### **Before Optimization:**
```
[GetChatHistoryStep] Extracted 15 messages from IDE on port 9222
[GetChatHistoryStep] executed successfully in 1016ms  ← TOO SLOW!
```

### **After Optimization:**
```
[ChatRepository] Querying messages for port 9222
[ChatRepository] Found 15 messages in 12ms  ← 85x FASTER!
```

## 🚨 **Risk Mitigation**

### **High Risk:**
- **Cache invalidation issues** - Mitigation: Proper TTL management
- **Session mapping conflicts** - Mitigation: Unique session IDs

### **Medium Risk:**
- **Memory usage increase** - Mitigation: Cache size limits
- **Database performance impact** - Mitigation: Optimized queries

### **Low Risk:**
- **Cache miss performance** - Mitigation: Graceful fallback

## 📝 **Notes**

**This phase focuses on chat performance optimization through background polling and session management. The goal is to reduce chat response time from 1000ms to under 100ms by using background extraction instead of live extraction.**

**Background polling extracts chat every 30 seconds and stores in database, eliminating the need for live extraction on every request.** 