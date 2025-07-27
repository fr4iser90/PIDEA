# Global State Management - Phase 1: Backend Session State Foundation

**Phase:** 1 of 4
**Status:** Planning
**Duration:** 2 hours
**Priority:** High

## Phase 1 Goals
- Create session_state database table
- Implement SessionStateService
- Extend ProjectRepository with session data
- Create session API endpoint

## Implementation Steps

### Step 1: Database Schema Update ✅
**Add session_state table to init files:**
- [ ] File: `database/init-postgres.sql` - Add session_state table
- [ ] File: `database/init-sqlite.sql` - Add session_state table
- [ ] PostgreSQL schema with proper indexes
- [ ] SQLite schema for development

**Database Schema:**
```sql
-- PostgreSQL version
CREATE TABLE IF NOT EXISTS session_state (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL DEFAULT 'me',
    project_id TEXT NOT NULL,
    session_data JSONB NOT NULL,
    last_update TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_state_user_project ON session_state (user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_session_state_expires_at ON session_state (expires_at);
CREATE INDEX IF NOT EXISTS idx_session_state_last_update ON session_state (last_update);
```

### Step 2: SessionStateService Implementation ✅
**Create domain service:**
- [ ] File: `backend/domain/services/SessionStateService.js`
- [ ] Session data management methods
- [ ] Data validation and sanitization
- [ ] Session expiration handling
- [ ] WebSocket event integration

**Service Structure:**
```javascript
class SessionStateService {
  constructor(dependencies) {
    this.projectRepository = dependencies.projectRepository;
    this.webSocketManager = dependencies.webSocketManager;
    this.logger = dependencies.logger;
  }

  async loadSessionData(userId, projectId) {
    // Load project, git, ide, and analysis data
  }

  async updateSessionData(userId, projectId, updates) {
    // Update specific session data
  }

  async clearSession(userId, projectId) {
    // Clear session data
  }
}
```

### Step 3: ProjectRepository Enhancement ✅
**Extend repository:**
- [ ] File: `backend/domain/repositories/ProjectRepository.js` - Add session methods
- [ ] File: `backend/infrastructure/database/PostgreSQLProjectRepository.js` - Implement session methods
- [ ] File: `backend/infrastructure/database/SQLiteProjectRepository.js` - Implement session methods

**New Methods:**
```javascript
// Add to ProjectRepository interface
async findSessionData(userId, projectId) { }
async saveSessionData(userId, projectId, sessionData) { }
async updateSessionData(userId, projectId, updates) { }
async deleteSessionData(userId, projectId) { }
```

### Step 4: ProjectApplicationService Enhancement ✅
**Add session management:**
- [ ] File: `backend/application/services/ProjectApplicationService.js` - Add session methods
- [ ] Session data loading orchestration
- [ ] Data transformation and DTOs
- [ ] Error handling and validation

**New Methods:**
```javascript
async loadProjectSession(userId, projectId) {
  // Coordinate session data loading
}

async updateProjectSession(userId, projectId, updates) {
  // Handle session updates
}

async clearProjectSession(userId, projectId) {
  // Clear session data
}
```

### Step 5: Session API Endpoints ✅
**Create API routes:**
- [ ] File: `backend/presentation/api/routes/session.js` - Session routes
- [ ] File: `backend/presentation/api/controllers/ProjectController.js` - Add session endpoints
- [ ] Authentication and authorization
- [ ] Request validation and error handling

**API Endpoints:**
```javascript
// Add to ProjectController
async loadSession(req, res) { }
async getSession(req, res) { }
async updateSession(req, res) { }
async clearSession(req, res) { }
```

## Dependencies
- Requires: Database connection, WebSocket system
- Blocks: Phase 2 start

## Success Criteria
- [ ] Database schema updated successfully
- [ ] SessionStateService loads and saves session data
- [ ] ProjectRepository handles session operations
- [ ] API endpoints respond correctly
- [ ] WebSocket events are triggered
- [ ] All unit tests pass

## Testing Requirements
- [ ] Unit tests for SessionStateService
- [ ] Integration tests for database operations
- [ ] API endpoint tests
- [ ] WebSocket event tests

## Risk Mitigation
- [ ] Database transaction rollback on errors
- [ ] Session data validation and sanitization
- [ ] Proper error handling and logging
- [ ] Authentication and authorization checks 