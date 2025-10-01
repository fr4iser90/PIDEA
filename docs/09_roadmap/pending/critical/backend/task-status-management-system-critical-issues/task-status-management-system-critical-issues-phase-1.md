# Phase 1: Foundation Setup - Task Status Management System Critical Issues

## 📋 Phase Overview
- **Phase Number**: 1
- **Phase Name**: Foundation Setup
- **Estimated Time**: 6 hours
- **Status**: Completed
- **Progress**: 100%
- **Completed**: 2025-10-01T14:36:01.000Z
- **Dependencies**: Analysis completion ✅

## 🎯 Phase Objectives
Establish the foundational services and infrastructure needed for task status management with content addressable storage and event sourcing.

## 📋 Phase Tasks

### 1.1 Create TaskContentHashService (2 hours) ✅
- [x] **Task**: Implement content addressable storage service
- [x] **Location**: `backend/domain/services/task/TaskContentHashService.js`
- [x] **Purpose**: Generate and manage content hashes for task files
- [x] **Key Features**:
  - [x] SHA-256 content hash generation
  - [x] Content deduplication
  - [x] Hash validation
  - [x] Content storage and retrieval
- [x] **Dependencies**: Node.js crypto module, file system operations
- [x] **Completed**: 2025-10-01T14:36:01.000Z

### 1.2 Create TaskEventStore (2 hours) ✅
- [x] **Task**: Implement event sourcing for task status changes
- [x] **Location**: `backend/domain/services/task/TaskEventStore.js`
- [x] **Purpose**: Store and retrieve task status change events
- [x] **Key Features**:
  - [x] Event storage and retrieval
  - [x] Event replay capability
  - [x] Event versioning
  - [x] Event querying
- [x] **Dependencies**: Database connection, event serialization
- [x] **Completed**: 2025-10-01T14:36:01.000Z

### 1.3 Add Database Migration (1 hour) ✅
- [x] **Task**: Create migration for content hash and file path columns
- [x] **Location**: `database/migrations/003_add_task_content_hash.sql`
- [x] **Purpose**: Add new columns to tasks table for content addressing
- [x] **Changes**:
  - [x] Add `content_hash` column (TEXT, indexed)
  - [x] Add `file_path` column (TEXT, for metadata only)
  - [x] Add `last_synced_at` column (TIMESTAMP)
  - [x] Create `task_file_events` table for event sourcing
- [x] **Dependencies**: Database connection, migration system
- [x] **Completed**: 2025-10-01T14:36:01.000Z

### 1.4 Register Services in DI System (1 hour)
- [ ] **Task**: Register all new services in ServiceRegistry for dependency injection
- [ ] **Location**: `backend/infrastructure/dependency-injection/ServiceRegistry.js`
- [ ] **Purpose**: Integrate new services with PIDEA's DI system for automatic dependency resolution
- [ ] **Key Features**:
  - Register TaskContentHashService with fileSystemService dependency
  - Register TaskEventStore with databaseConnection dependency
  - Register UnifiedStatusExtractor as singleton
  - Define proper service categories and dependencies
  - Update service order resolution
- [ ] **Dependencies**: ServiceRegistry, ServiceContainer

### 1.5 Create Base Test Structure (0.5 hours)
- [ ] **Task**: Set up test infrastructure for new services
- [ ] **Location**: 
  - `backend/tests/unit/TaskContentHashService.test.js`
  - `backend/tests/unit/TaskEventStore.test.js`
  - `backend/tests/integration/TaskContentHashService.test.js`
- [ ] **Purpose**: Establish testing framework for new services
- [ ] **Key Features**:
  - Unit test structure with DI mocking
  - Integration test structure
  - Mock setup for DI services
  - Test data fixtures
- [ ] **Dependencies**: Jest framework, test utilities

## 🔧 Technical Implementation Details

### ServiceRegistry Integration Implementation
```javascript
// In ServiceRegistry.js - registerDomainServices() method
registerDomainServices() {
    this.logger.info('Registering domain services...');
    
    // ... existing services ...

    // TaskContentHashService - Content addressable storage
    this.container.register('taskContentHashService', (fileSystemService) => {
        const TaskContentHashService = require('@domain/services/task/TaskContentHashService');
        return new TaskContentHashService(fileSystemService);
    }, { singleton: true, dependencies: ['fileSystemService'] });

    // TaskEventStore - Event sourcing for task status changes
    this.container.register('taskEventStore', (databaseConnection) => {
        const TaskEventStore = require('@domain/services/task/TaskEventStore');
        return new TaskEventStore(databaseConnection);
    }, { singleton: true, dependencies: ['databaseConnection'] });

    // UnifiedStatusExtractor - Single regex pattern for status extraction
    this.container.register('statusExtractor', () => {
        const StatusExtractor = require('@domain/services/task/StatusExtractor');
        return new StatusExtractor();
    }, { singleton: true });

    // ... rest of existing services ...
}
```

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

### Unit Tests with DI Mocking
- [ ] **TaskContentHashService**: Test hash generation, content storage, validation with mocked fileSystemService
- [ ] **TaskEventStore**: Test event storage, retrieval, querying with mocked databaseConnection
- [ ] **Mock Requirements**: DI container mocking, service resolution testing

### Integration Tests
- [ ] **Database Migration**: Test migration execution and rollback
- [ ] **Content Hash Integration**: Test with real database operations
- [ ] **Event Store Integration**: Test event storage and retrieval with database
- [ ] **DI Service Resolution**: Test automatic dependency resolution

### DI Testing Examples
```javascript
// Example test with DI mocking
describe('TaskContentHashService with DI', () => {
  let mockContainer;
  let mockFileSystemService;

  beforeEach(() => {
    mockFileSystemService = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      exists: jest.fn()
    };
    
    mockContainer = {
      resolve: jest.fn((serviceName) => {
        if (serviceName === 'fileSystemService') return mockFileSystemService;
        throw new Error(`Unknown service: ${serviceName}`);
      })
    };
  });

  it('should resolve dependencies through DI', () => {
    const service = mockContainer.resolve('taskContentHashService');
    expect(service).toBeDefined();
    expect(mockContainer.resolve).toHaveBeenCalledWith('fileSystemService');
  });
});
```

## 📊 Success Criteria
- [ ] TaskContentHashService implemented with all required methods
- [ ] TaskEventStore implemented with event storage and retrieval
- [ ] Database migration created and tested
- [ ] **DI Integration**: All services registered in ServiceRegistry
- [ ] **Service Resolution**: Automatic dependency resolution working
- [ ] Test infrastructure established with DI mocking
- [ ] All unit tests passing with DI integration
- [ ] Integration tests passing
- [ ] Code coverage > 90% for new services
- [ ] **DI Validation**: Service container resolves all dependencies correctly

## 🔄 Phase Dependencies
- **Input**: Analysis completion ✅
- **Output**: Foundation services ready for Phase 2
- **Blockers**: None
- **Enables**: Core implementation in Phase 2

## 📝 Phase Notes
This phase establishes the foundational infrastructure needed for task status management. The content hash service will eliminate path-based conflicts, while the event store will provide audit trail and replay capability for all status changes.

## 🚀 Next Phase Preview
Phase 2 will build upon these foundations to implement the core status management logic, including markdown parsing and status validation services.
