# Terminal Logging Modernization - Phase 2: Service Integration

## 📋 Phase Overview
- **Phase**: 2 of 3
- **Name**: Service Integration
- **Estimated Time**: 3 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Objectives
- Integrate ProjectLogManager with existing services
- Update IDEController endpoints
- Implement project-to-port mapping logic
- Add backward compatibility layer

## 📝 Tasks

### 2.1 Integrate ProjectLogManager (1 hour)
- [ ] Update `backend/domain/services/terminal/TerminalLogCaptureService.js`
- [ ] Integrate with ProjectLogManager service
- [ ] Add dependency injection for ProjectLogManager
- [ ] Update service initialization logic
- [ ] Add error handling for project resolution

**Integration Points:**
```javascript
class TerminalLogCaptureService {
  constructor(dependencies = {}) {
    this.projectLogManager = dependencies.projectLogManager;
    this.ideManager = dependencies.ideManager;
    // ... existing dependencies
  }

  async initializeLogging(port) {
    const projectId = await this.resolveProjectId(port);
    const logDir = await this.projectLogManager.createProjectLogDirectory(projectId);
    // ... rest of initialization
  }
}
```

### 2.2 Update IDEController Endpoints (1 hour)
- [ ] Modify `backend/presentation/api/IDEController.js`
- [ ] Update terminal log endpoints to use project-based paths
- [ ] Add project ID resolution logic
- [ ] Update request validation
- [ ] Maintain API compatibility

**Endpoint Updates:**
```javascript
// OLD: Port-based endpoints
POST /api/terminal-logs/:port/initialize
POST /api/terminal-logs/:port/execute
GET /api/terminal-logs/:port

// NEW: Project-based endpoints (with backward compatibility)
POST /api/terminal-logs/projects/:projectId/initialize
POST /api/terminal-logs/projects/:projectId/execute
GET /api/terminal-logs/projects/:projectId
```

### 2.3 Implement Project-to-Port Mapping (45 minutes)
- [ ] Create project-to-port resolution service
- [ ] Add caching for mapping lookups
- [ ] Implement reverse mapping (port-to-project)
- [ ] Add mapping validation and error handling
- [ ] Update service registry for new dependencies

**Mapping Logic:**
```javascript
class ProjectPortMapper {
  constructor(dependencies = {}) {
    this.ideManager = dependencies.ideManager;
    this.projectService = dependencies.projectService;
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  async getProjectIdFromPort(port) {
    // Resolve project ID from port
  }

  async getPortFromProjectId(projectId) {
    // Resolve port from project ID
  }
}
```

### 2.4 Add Backward Compatibility Layer (15 minutes)
- [ ] Create compatibility wrapper for old port-based calls
- [ ] Add automatic port-to-project resolution
- [ ] Implement graceful fallback mechanisms
- [ ] Add deprecation warnings for old endpoints
- [ ] Update service documentation

## 🧪 Testing Requirements

### Unit Tests
- [ ] Test ProjectLogManager integration
- [ ] Test project-to-port mapping
- [ ] Test IDEController endpoint updates
- [ ] Test backward compatibility layer

### Integration Tests
- [ ] Test end-to-end log capture with project-based paths
- [ ] Test API endpoint compatibility
- [ ] Test service integration points

## 📊 Success Criteria
- [ ] ProjectLogManager fully integrated with existing services
- [ ] IDEController endpoints updated for project-based paths
- [ ] Project-to-port mapping working correctly
- [ ] Backward compatibility maintained
- [ ] All integration tests passing
- [ ] API documentation updated

## 🔄 Dependencies
- **Input**: ProjectLogManager from Phase 1
- **Output**: Integrated services, updated endpoints, mapping service
- **Blockers**: Phase 1 completion

## 📝 Notes
- Ensure smooth transition from port-based to project-based system
- Maintain API compatibility for existing clients
- Test all integration points thoroughly
- Document all changes and new dependencies

## 🚀 Next Phase
After completing Phase 2, proceed to [Phase 3: Testing & Migration](./terminal-logging-modernization-phase-3.md)
