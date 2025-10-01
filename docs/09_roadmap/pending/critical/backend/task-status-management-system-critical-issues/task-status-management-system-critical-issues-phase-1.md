# Phase 1: Foundation Setup - Task Status Management System Critical Issues

## 📋 Phase Overview
- **Phase Number**: 1
- **Phase Name**: Foundation Setup
- **Estimated Time**: 6 hours
- **Status**: Planning
- **Progress**: 0%
- **Dependencies**: Analysis completion ✅

## 🎯 Phase Objectives
Establish the foundational services and infrastructure needed for modern task status management with content addressable storage and event sourcing.

## 📋 Phase Tasks

### 1.1 Create TaskContentHashService (2 hours)
- [ ] **Task**: Implement content addressable storage service
- [ ] **Location**: `backend/domain/services/task/TaskContentHashService.js`
- [ ] **Purpose**: Generate and manage content hashes for task files
- [ ] **Key Features**:
  - SHA-256 content hash generation
  - Content deduplication
  - Hash validation
  - Content storage and retrieval
- [ ] **Dependencies**: Node.js crypto module, file system operations

### 1.2 Create TaskEventStore (2 hours)
- [ ] **Task**: Implement event sourcing for task status changes
- [ ] **Location**: `backend/domain/services/task/TaskEventStore.js`
- [ ] **Purpose**: Store and retrieve task status change events
- [ ] **Key Features**:
  - Event storage and retrieval
  - Event replay capability
  - Event versioning
  - Event querying
- [ ] **Dependencies**: Database connection, event serialization

### 1.3 Add Database Migration (1 hour)
- [ ] **Task**: Create migration for content hash and file path columns
- [ ] **Location**: `backend/infrastructure/database/migrations/add-task-content-hash.sql`
- [ ] **Purpose**: Add new columns to tasks table for content addressing
- [ ] **Changes**:
  - Add `content_hash` column (TEXT, indexed)
  - Add `file_path` column (TEXT, for metadata only)
  - Add `last_synced_at` column (TIMESTAMP)
  - Create `task_file_events` table for event sourcing
- [ ] **Dependencies**: Database connection, migration system

### 1.4 Create Base Test Structure (1 hour)
- [ ] **Task**: Set up test infrastructure for new services
- [ ] **Location**: 
  - `backend/tests/unit/TaskContentHashService.test.js`
  - `backend/tests/unit/TaskEventStore.test.js`
  - `backend/tests/integration/TaskContentHashService.test.js`
- [ ] **Purpose**: Establish testing framework for new services
- [ ] **Key Features**:
  - Unit test structure
  - Integration test structure
  - Mock setup
  - Test data fixtures
- [ ] **Dependencies**: Jest framework, test utilities

## 🔧 Technical Implementation Details

### TaskContentHashService Implementation
```javascript
class TaskContentHashService {
  constructor(fileSystemService, crypto = require('crypto')) {
    this.fileSystemService = fileSystemService;
    this.crypto = crypto;
    this.logger = new Logger('TaskContentHashService');
  }

  async generateContentHash(content) {
    // Generate SHA-256 hash of content
    const hash = this.crypto.createHash('sha256').update(content).digest('hex');
    return hash;
  }

  async storeContent(content, hash = null) {
    // Store content with hash for deduplication
    const contentHash = hash || await this.generateContentHash(content);
    // Implementation details...
  }

  async validateContentHash(content, expectedHash) {
    // Validate content against expected hash
    const actualHash = await this.generateContentHash(content);
    return actualHash === expectedHash;
  }
}
```

### TaskEventStore Implementation
```javascript
class TaskEventStore {
  constructor(databaseConnection) {
    this.databaseConnection = databaseConnection;
    this.logger = new Logger('TaskEventStore');
  }

  async appendEvent(event) {
    // Store event in database
    const eventData = {
      id: uuidv4(),
      type: event.type,
      taskId: event.taskId,
      data: JSON.stringify(event.data),
      timestamp: new Date(),
      version: event.version || 1
    };
    
    await this.databaseConnection.execute(
      'INSERT INTO task_file_events (id, type, task_id, data, timestamp, version) VALUES (?, ?, ?, ?, ?, ?)',
      [eventData.id, eventData.type, eventData.taskId, eventData.data, eventData.timestamp, eventData.version]
    );
  }

  async getEventsForTask(taskId) {
    // Retrieve all events for a specific task
    const events = await this.databaseConnection.query(
      'SELECT * FROM task_file_events WHERE task_id = ? ORDER BY timestamp ASC',
      [taskId]
    );
    return events.map(event => ({
      ...event,
      data: JSON.parse(event.data)
    }));
  }
}
```

### Database Migration
```sql
-- Add content hash and file path columns to tasks table
ALTER TABLE tasks ADD COLUMN content_hash TEXT;
ALTER TABLE tasks ADD COLUMN file_path TEXT;
ALTER TABLE tasks ADD COLUMN last_synced_at TIMESTAMP;

-- Create index for content hash
CREATE INDEX IF NOT EXISTS idx_tasks_content_hash ON tasks(content_hash);

-- Create task_file_events table for event sourcing
CREATE TABLE IF NOT EXISTS task_file_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  task_id TEXT NOT NULL,
  data TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Create indexes for event store
CREATE INDEX IF NOT EXISTS idx_task_file_events_task_id ON task_file_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_file_events_timestamp ON task_file_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_task_file_events_type ON task_file_events(type);
```

## 🧪 Testing Strategy

### Unit Tests
- [ ] **TaskContentHashService**: Test hash generation, content storage, validation
- [ ] **TaskEventStore**: Test event storage, retrieval, querying
- [ ] **Mock Requirements**: File system operations, database connections

### Integration Tests
- [ ] **Database Migration**: Test migration execution and rollback
- [ ] **Content Hash Integration**: Test with real database operations
- [ ] **Event Store Integration**: Test event storage and retrieval with database

## 📊 Success Criteria
- [ ] TaskContentHashService implemented with all required methods
- [ ] TaskEventStore implemented with event storage and retrieval
- [ ] Database migration created and tested
- [ ] Test infrastructure established
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Code coverage > 90% for new services

## 🔄 Phase Dependencies
- **Input**: Analysis completion ✅
- **Output**: Foundation services ready for Phase 2
- **Blockers**: None
- **Enables**: Core implementation in Phase 2

## 📝 Phase Notes
This phase establishes the foundational infrastructure needed for modern task status management. The content hash service will eliminate path-based conflicts, while the event store will provide audit trail and replay capability for all status changes.

## 🚀 Next Phase Preview
Phase 2 will build upon these foundations to implement the core status management logic, including unified markdown parsing and status validation services.
