# Backend Performance Bottleneck – Phase 3: Database Storage Enhancement

## 📋 Phase Overview
- **Phase**: 3 of 4
- **Duration**: 1 hour
- **Priority**: Critical
- **Status**: Planning
- **Dependencies**: Phase 2 completion

## 🎯 **PRINCIPLE: Enhance Database Storage for Chat Messages & Session Management**

### **CRITICAL PROBLEM: Inefficient Database Storage**
- **Chat Messages**: Not stored efficiently by port
- **Session Mapping**: No automatic port-session linking
- **Database Schema**: Missing port and session mapping fields
- **Query Performance**: Slow retrieval without proper indexing

## 🔍 **Root Cause Analysis - Database Storage**

### **Problem 1: Inefficient Chat Message Storage**

**Current Storage (PROBLEM):**
```javascript
// ❌ BAD - No port-based storage
class ChatRepository {
  async saveMessage(message) {
    // Messages stored without port information
    const sql = `
      INSERT INTO chat_messages (id, session_id, content, sender, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await this.db.execute(sql, [
      message.id,
      message.sessionId, // No port mapping!
      message.content,
      message.sender,
      message.timestamp
    ]);
  }
}
```

**Enhanced Storage (GOOD):**
```javascript
// ✅ GOOD - Port-based message storage
class EnhancedChatRepository {
  async saveMessageFromIDE(message, port, userId) {
    // Store with port and user mapping
    const sql = `
      INSERT INTO chat_messages (
        id, session_id, content, sender, timestamp, 
        port, user_id, source, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const metadata = {
      extractedAt: new Date().toISOString(),
      idePort: port,
      userId: userId,
      source: 'ide_extraction'
    };
    
    await this.db.execute(sql, [
      message.id || `msg_${Date.now()}_${Math.random()}`,
      message.sessionId,
      message.content,
      message.sender,
      message.timestamp || new Date().toISOString(),
      port,
      userId,
      'ide_extraction',
      JSON.stringify(metadata)
    ]);
  }
}
```

### **Problem 2: Missing Session-Port Mapping**

**Current Schema (PROBLEM):**
```sql
-- ❌ BAD - No port mapping in sessions
CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
    -- Missing: ide_port, ide_type, user_id
);
```

**Enhanced Schema (GOOD):**
```sql
-- ✅ GOOD - Enhanced session schema with port mapping
CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    ide_port INTEGER,           -- NEW: IDE port mapping
    ide_type TEXT,              -- NEW: IDE type (cursor/vscode/windsurf)
    user_id TEXT NOT NULL,      -- NEW: User association
    session_type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'active',
    metadata TEXT,              -- NEW: Additional metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TEXT
);

-- NEW: Indexes for performance
CREATE INDEX idx_chat_sessions_port ON chat_sessions(ide_port);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_type ON chat_sessions(ide_type);
```

### **Problem 3: Inefficient Message Queries**

**Current Queries (PROBLEM):**
```javascript
// ❌ SLOW - No port-based filtering
class ChatRepository {
  async getMessagesByPort(port, userId) {
    // Inefficient query without proper indexing
    const sql = 'SELECT * FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions)';
    const rows = await this.db.query(sql);
    
    // Manual filtering in JavaScript (SLOW!)
    return rows.filter(row => {
      // Complex filtering logic
      return this.isMessageForPort(row, port);
    });
  }
}
```

**Optimized Queries (GOOD):**
```javascript
// ✅ FAST - Direct port-based queries
class EnhancedChatRepository {
  async getMessagesByPort(port, userId) {
    // Direct query with proper indexing
    const sql = `
      SELECT * FROM chat_messages 
      WHERE port = ? AND user_id = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `;
    
    const rows = await this.db.query(sql, [port, userId]);
    return rows.map(row => this.mapRowToMessage(row));
  }
  
  async getSessionMessages(sessionId) {
    // Optimized session-based query
    const sql = `
      SELECT * FROM chat_messages 
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `;
    
    const rows = await this.db.query(sql, [sessionId]);
    return rows.map(row => this.mapRowToMessage(row));
  }
}
```

## 📁 **Files to Create/Modify**

### **1. Database Migration Script (NEW)**
**Path**: `database/migrations/add_chat_port_mapping.sql`

**Purpose**: Add port and session mapping fields to database schema

**Implementation:**
```sql
-- Migration: Add chat port mapping
-- Date: 2024-12-19
-- Description: Enhance chat_sessions and chat_messages tables with port mapping

-- Add port mapping to chat_sessions
ALTER TABLE chat_sessions ADD COLUMN ide_port INTEGER;
ALTER TABLE chat_sessions ADD COLUMN ide_type TEXT;
ALTER TABLE chat_sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT 'me';
ALTER TABLE chat_sessions ADD COLUMN session_type TEXT DEFAULT 'general';
ALTER TABLE chat_sessions ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE chat_sessions ADD COLUMN metadata TEXT;

-- Add port mapping to chat_messages
ALTER TABLE chat_messages ADD COLUMN port INTEGER;
ALTER TABLE chat_messages ADD COLUMN user_id TEXT NOT NULL DEFAULT 'me';
ALTER TABLE chat_messages ADD COLUMN source TEXT DEFAULT 'user_input';
ALTER TABLE chat_messages ADD COLUMN metadata TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_port ON chat_sessions(ide_port);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_type ON chat_sessions(ide_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_port ON chat_messages(port);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);

-- Update existing data (if any)
UPDATE chat_sessions SET user_id = 'me' WHERE user_id IS NULL;
UPDATE chat_messages SET user_id = 'me' WHERE user_id IS NULL;
```

### **2. Enhanced ChatRepository.js (MODIFY)**
**Path**: `backend/infrastructure/database/repositories/ChatRepository.js`

**Enhancements:**
- [ ] Add port-based message storage methods
- [ ] Add session-port mapping methods
- [ ] Optimize database queries with proper indexing
- [ ] Add metadata storage for extracted messages

**Code Changes:**
```javascript
// Add to ChatRepository.js
class EnhancedChatRepository {
  async saveMessagesFromIDE(messages, port, userId) {
    // Store extracted messages with port mapping
    for (const message of messages) {
      const metadata = {
        extractedAt: new Date().toISOString(),
        idePort: port,
        userId: userId,
        source: 'ide_extraction',
        messageType: message.type || 'text'
      };

      const sql = `
        INSERT INTO chat_messages (
          id, session_id, content, sender_type, message_type, timestamp,
          port, user_id, source, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.execute(sql, [
        message.id || `msg_${Date.now()}_${Math.random()}`,
        message.sessionId || null,
        message.content,
        message.sender,
        message.type || 'text',
        message.timestamp || new Date().toISOString(),
        port,
        userId,
        'ide_extraction',
        JSON.stringify(metadata)
      ]);
    }
  }

  async findSessionByPort(port) {
    // Find existing session for this port
    const sql = `
      SELECT * FROM chat_sessions 
      WHERE ide_port = ? AND status = 'active'
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    
    const rows = await this.db.query(sql, [port]);
    
    if (rows.length > 0) {
      return this.mapRowToSession(rows[0]);
    }
    
    return null;
  }

  async createSessionForPort(port, userId, title = 'New Chat') {
    // Create new session with port mapping
    const sessionId = `session_${port}_${Date.now()}`;
    const ideType = this.detectIDEType(port);
    
    const sql = `
      INSERT INTO chat_sessions (
        id, title, ide_port, ide_type, user_id, session_type, status, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const metadata = {
      createdBy: 'system',
      idePort: port,
      ideType: ideType,
      autoCreated: true
    };

    await this.db.execute(sql, [
      sessionId,
      title,
      port,
      ideType,
      userId,
      'general',
      'active',
      JSON.stringify(metadata),
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    return sessionId;
  }

  detectIDEType(port) {
    if (port >= 9222 && port <= 9231) return 'cursor';
    if (port >= 9232 && port <= 9241) return 'vscode';
    if (port >= 9242 && port <= 9251) return 'windsurf';
    return 'unknown';
  }

  mapRowToSession(row) {
    let metadata = {};
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch (error) {
        metadata = {};
      }
    }

    return {
      id: row.id,
      title: row.title,
      idePort: row.ide_port,
      ideType: row.ide_type,
      userId: row.user_id,
      sessionType: row.session_type,
      status: row.status,
      metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
```

### **3. Database Schema Update (MODIFY)**
**Path**: `database/init-postgres.sql` and `database/init-sqlite.sql`

**Enhancements:**
- [ ] Add port mapping fields to chat_sessions table
- [ ] Add port mapping fields to chat_messages table
- [ ] Add performance indexes
- [ ] Add metadata storage fields

**Code Changes:**
```sql
-- Enhanced chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id TEXT,
    title TEXT NOT NULL,
    ide_port INTEGER,           -- NEW: IDE port mapping
    ide_type TEXT,              -- NEW: IDE type
    user_id TEXT NOT NULL DEFAULT 'me', -- NEW: User association
    session_type TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'active',
    metadata TEXT,              -- NEW: Additional metadata
    created_by TEXT NOT NULL DEFAULT 'me',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TEXT,
    message_count INTEGER DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
);

-- Enhanced chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    session_id TEXT NOT NULL,
    sender_type TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    port INTEGER,               -- NEW: IDE port mapping
    user_id TEXT NOT NULL DEFAULT 'me', -- NEW: User association
    source TEXT DEFAULT 'user_input',   -- NEW: Message source
    metadata TEXT,              -- NEW: Additional metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_port ON chat_sessions(ide_port);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_type ON chat_sessions(ide_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_port ON chat_messages(port);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
```

### **4. Migration Runner (NEW)**
**Path**: `backend/scripts/run-migration.js`

**Purpose**: Execute database migrations safely

**Implementation:**
```javascript
const DatabaseConnection = require('@infrastructure/database/DatabaseConnection');
const Logger = require('@logging/Logger');

class MigrationRunner {
  constructor() {
    this.logger = new Logger('MigrationRunner');
    this.db = new DatabaseConnection();
  }

  async runMigration(migrationFile) {
    try {
      this.logger.info(`Running migration: ${migrationFile}`);
      
      // Read migration file
      const fs = require('fs');
      const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
      
      // Execute migration
      await this.db.execute(migrationSQL);
      
      this.logger.info(`Migration completed successfully: ${migrationFile}`);
    } catch (error) {
      this.logger.error(`Migration failed: ${migrationFile}`, error);
      throw error;
    }
  }

  async runChatPortMappingMigration() {
    const migrationFile = 'database/migrations/add_chat_port_mapping.sql';
    await this.runMigration(migrationFile);
  }
}

module.exports = MigrationRunner;
```

## 🎯 **Implementation Steps**

### **Step 1: Create Database Migration (20min)**
1. **Create migration script** - Add port mapping fields
2. **Add performance indexes** - Optimize query performance
3. **Update schema files** - PostgreSQL and SQLite
4. **Test migration** - Verify schema changes

### **Step 2: Enhance ChatRepository (20min)**
1. **Add port-based storage methods** - Store messages by port
2. **Add session-port mapping** - Link sessions to ports
3. **Optimize database queries** - Use proper indexing
4. **Add metadata storage** - Store extraction metadata

### **Step 3: Create Migration Runner (10min)**
1. **Create migration runner** - Safe migration execution
2. **Add migration validation** - Verify successful execution
3. **Add rollback capability** - Emergency rollback if needed
4. **Test migration process** - End-to-end testing

### **Step 4: Update Schema Files (10min)**
1. **Update PostgreSQL schema** - Add new fields and indexes
2. **Update SQLite schema** - Ensure compatibility
3. **Add documentation** - Document schema changes
4. **Test schema creation** - Verify new installations

## ✅ **Success Criteria**

### **Database Performance:**
- **Query Response Time**: <20ms for port-based queries
- **Index Performance**: Proper indexing for all queries
- **Storage Efficiency**: Optimized data structure
- **Migration Success**: Clean migration execution

### **Functionality:**
- **Port-Based Storage** - Messages stored by IDE port
- **Session-Port Mapping** - Automatic session detection
- **Metadata Storage** - Rich metadata for extracted messages
- **Backward Compatibility** - Existing data preserved

### **Code Quality:**
- **Clean Migration** - Safe and reversible
- **Proper Indexing** - Optimized query performance
- **Error Handling** - Graceful migration failures
- **Documentation** - Clear schema documentation

## 🔧 **Technical Details**

### **Database Schema Changes:**
```sql
-- New fields added
ALTER TABLE chat_sessions ADD COLUMN ide_port INTEGER;
ALTER TABLE chat_sessions ADD COLUMN ide_type TEXT;
ALTER TABLE chat_sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT 'me';

ALTER TABLE chat_messages ADD COLUMN port INTEGER;
ALTER TABLE chat_messages ADD COLUMN user_id TEXT NOT NULL DEFAULT 'me';
ALTER TABLE chat_messages ADD COLUMN source TEXT DEFAULT 'user_input';

-- Performance indexes
CREATE INDEX idx_chat_sessions_port ON chat_sessions(ide_port);
CREATE INDEX idx_chat_messages_port ON chat_messages(port);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
```

### **Migration Strategy:**
```javascript
// Direct migration approach
const migrationStrategy = {
  step1: 'Add new columns with defaults',
  step2: 'Create performance indexes',
  step3: 'Validate migration success'
};
```

## 📊 **Expected Results**

### **Before Enhancement:**
```
[ChatRepository] Querying messages for port 9222
[ChatRepository] Found 15 messages in 150ms  ← SLOW!
```

### **After Enhancement:**
```
[ChatRepository] Querying messages for port 9222
[ChatRepository] Found 15 messages in 12ms  ← 12x FASTER!
```

## 🚨 **Risk Mitigation**

### **High Risk:**
- **Schema conflicts** - Mitigation: Direct migration approach
- **Performance impact** - Mitigation: Monitor query performance

### **Medium Risk:**
- **Performance impact** - Mitigation: Monitor query performance
- **Migration failures** - Mitigation: Rollback capability

### **Low Risk:**
- **Index creation time** - Mitigation: Run during low traffic

## 📝 **Notes**

**This phase focuses on database storage enhancement to support the chat performance optimizations from Phase 2. The goal is to provide efficient, indexed storage for chat messages with proper port and session mapping.**

**All database changes use direct queries only - no backwards compatibility or fallbacks.** 