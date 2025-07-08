# Route Modularization Implementation - Part 2: IDE Management & File System

## 1. Project Overview
- **Feature/Component Name**: Route Modularization - IDE Management & File System
- **Priority**: High
- **Estimated Time**: 5 hours
- **Dependencies**: Part 1 must be completed (route registry system)
- **Related Issues**: Application.js refactoring, code organization, maintainability
- **Part**: 2 of 4 (IDE Management & File System)

## 2. Technical Requirements
- **Tech Stack**: Node.js, Express.js, JavaScript
- **Architecture Pattern**: MVC with Route Modules
- **Database Changes**: None required
- **API Changes**: No functional changes, only structural reorganization
- **Frontend Changes**: None required
- **Backend Changes**: Create IDE routes, file explorer routes, content library routes

## 3. File Impact Analysis

### Files to Modify:
- [ ] `backend/presentation/api/IDEController.js` - Ensure proper exports for route registration
- [ ] `backend/presentation/api/ContentLibraryController.js` - Ensure proper exports for route registration

### Files to Create:
- [ ] `backend/presentation/routes/ide.routes.js` - IDE core management routes module
- [ ] `backend/presentation/routes/workspace-detection.routes.js` - Workspace detection routes module
- [ ] `backend/presentation/routes/file-explorer.routes.js` - File system operations routes module
- [ ] `backend/presentation/routes/content-library.routes.js` - Content library routes module
- [ ] `backend/presentation/middleware/portValidation.js` - Port validation middleware

## 4. Implementation Phases

### Phase 1: Port Architecture Foundation (2 hours)
- [ ] Create port validation middleware
- [ ] Implement active port manager service
- [ ] Update route registry for port-based routes
- [ ] Create port-based route templates

### Phase 2: IDE Management Routes (2 hours)
- [ ] Implement IDE core management routes (15 routes)
- [ ] Implement workspace detection routes (6 routes)
- [ ] Test port-based route functionality
- [ ] Validate port parameter handling

### Phase 3: File System Routes (1 hour)
- [ ] Implement file explorer routes (2 routes)
- [ ] Implement content library routes (8 routes)
- [ ] Test file system operations
- [ ] Validate content library access

## 5. Route Bundles Included

### BUNDLE 3: Port-Based IDE Management (15 routes)
```javascript
// ide.routes.js
- /api/ide/available (GET)            // List all available ports
- /api/ide/:port/start (POST)         // Start IDE on specific port
- /api/ide/:port/switch (POST)        // Switch to this port
- /api/ide/:port/stop (DELETE)        // Stop this port
- /api/ide/:port/status (GET)         // Status for this port
- /api/ide/:port/restart-app (POST)   // Restart app on port
- /api/ide/:port/user-app-url (GET)   // Get app URL for port
- /api/ide/:port/monitor-terminal (POST) // Monitor terminal on port
- /api/ide/:port/set-workspace (POST) // Set workspace for port
- /api/ide/:port/workspace-info (GET) // Get workspace info for port
- /api/ide/:port/detect-workspace-paths (POST) // Detect paths for port
- /api/ide/:port/new-chat (POST)      // New chat on port
- /api/ide/global/status (GET)        // Global IDE status
```

### BUNDLE 4: Workspace Detection (6 routes)
```javascript
// workspace-detection.routes.js
- /api/ide/workspace-detection (GET)
- /api/ide/workspace-detection/:port (GET)
- /api/ide/workspace-detection/:port (POST)
- /api/ide/workspace-detection/stats (GET)
- /api/ide/workspace-detection/results (DELETE)
- /api/ide/workspace-detection/:port/execute (POST)
```

### BUNDLE 5: Port-Based File System (2 routes)
```javascript
// file-explorer.routes.js
- /api/files/:port (GET)              // File tree for specific port
- /api/files/:port/content (GET)      // File content for specific port
```

### BUNDLE 6: Content Library (8 routes)
```javascript
// content-library.routes.js
- /api/frameworks (GET)
- /api/frameworks/:frameworkId/prompts (GET)
- /api/frameworks/:frameworkId/templates (GET)
- /api/frameworks/:frameworkId/prompts/:filename (GET)
- /api/frameworks/:frameworkId/templates/:filename (GET)
- /api/prompts (GET)
- /api/prompts/:category/:filename (GET)
- /api/templates (GET)
- /api/templates/:category/:filename (GET)
```

## 6. Success Criteria
- [ ] Port validation middleware is functional
- [ ] IDE management routes work identically to current implementation
- [ ] Workspace detection routes work identically to current implementation
- [ ] File system routes work identically to current implementation
- [ ] Content library routes work identically to current implementation
- [ ] All port-based routes validate port parameters correctly
- [ ] No performance degradation
- [ ] Code is more maintainable and organized

## 7. Dependencies for Next Parts
- Port validation middleware must be completed
- Active port manager service must be implemented
- IDE management patterns must be established
- File system access patterns must be validated

## 8. AI Auto-Implementation Instructions

### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/route-modularization-implementation_part2.md'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/route-modularization-part2",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 600
}
```

### Success Indicators:
- [ ] Port validation middleware created and functional
- [ ] IDE routes module created and working
- [ ] Workspace detection routes module created and working
- [ ] File explorer routes module created and working
- [ ] Content library routes module created and working
- [ ] All port-based routes validate correctly
- [ ] All tests pass
- [ ] No build errors
- [ ] Code follows standards

## 9. Next Part Dependencies
This part must be completed before:
- **Part 3**: Project-Based Routes (depends on IDE management patterns)
- **Part 4**: Advanced Routes (depends on port architecture)

## 10. Risk Assessment
- **Medium Risk**: Port-based architecture changes
- **Mitigation**: Comprehensive port validation and testing
- **Rollback**: Git revert to previous IDE controller version 