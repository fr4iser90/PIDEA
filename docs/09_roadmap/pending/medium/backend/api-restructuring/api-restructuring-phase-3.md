# API Restructuring - Phase 3: Complete API Replacement

## 📋 Phase Overview
- **Phase**: 3 of 4
- **Title**: Complete API Replacement
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Dependencies**: Phase 1 and 2 completion
- **Created**: 2025-10-10T20:57:44.000Z

## 🎯 Objectives
Remove all legacy IDE-centric API endpoints, update all frontend API calls to use new project-centric endpoints, and completely replace the old API system.

## 📋 Implementation Tasks

### Task 3.1: Remove Legacy IDE API Endpoints (60 minutes)
- [ ] Delete `backend/presentation/api/ide/*` - All legacy IDE controllers
- [ ] Delete `backend/presentation/routes/ideRoutes.js` - Legacy IDE routes
- [ ] Delete `backend/presentation/middleware/ideMiddleware.js` - Legacy IDE middleware
- [ ] Remove IDE API imports from main server
- [ ] Clean up unused IDE API dependencies

**Files to Delete**:
```bash
# Remove all legacy IDE API files
rm -rf backend/presentation/api/ide/
rm backend/presentation/routes/ideRoutes.js
rm backend/presentation/middleware/ideMiddleware.js
rm backend/presentation/controllers/IDEController.js
rm backend/presentation/controllers/IDEStatusController.js
```

**Server.js Updates**:
```javascript
// Remove legacy IDE API imports
// const ideRoutes = require('./presentation/routes/ideRoutes');
// const ideMiddleware = require('./presentation/middleware/ideMiddleware');

// Remove legacy IDE API routes
// app.use('/api/ide', ideRoutes);

// Keep only new project-centric API
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/interfaces', interfaceRoutes);
```

### Task 3.2: Update All Frontend API Calls (45 minutes)
- [ ] Update `frontend/src/infrastructure/repositories/APIChatRepository.jsx`
- [ ] Replace all IDE API calls with project-centric calls
- [ ] Update API endpoint URLs
- [ ] Update request/response data structures
- [ ] Remove legacy API call methods

**API Repository Updates**:
```javascript
// OLD IDE-centric API calls
// const response = await apiCall('/api/ide/list');
// const response = await apiCall(`/api/ide/${port}/status`);
// const response = await apiCall(`/api/ide/${port}/start`);

// NEW Project-centric API calls
const response = await apiCall('/api/projects');
const response = await apiCall(`/api/projects/${projectId}/interfaces/${interfaceId}/status`);
const response = await apiCall(`/api/projects/${projectId}/interfaces/${interfaceId}/start`);
```

**Updated Methods**:
```javascript
// Replace IDE list with project list
async getProjects() {
  const response = await apiCall('/api/projects');
  return response.projects;
}

// Replace IDE status with interface status
async getInterfaceStatus(projectId, interfaceId) {
  const response = await apiCall(`/api/projects/${projectId}/interfaces/${interfaceId}/status`);
  return response.interface;
}

// Replace IDE start with interface start
async startInterface(projectId, interfaceId) {
  const response = await apiCall(`/api/projects/${projectId}/interfaces/${interfaceId}/start`, {
    method: 'POST'
  });
  return response.interface;
}
```

### Task 3.3: Remove Legacy API Code (30 minutes)
- [ ] Remove unused IDE API imports
- [ ] Clean up legacy API constants
- [ ] Remove legacy API types and interfaces
- [ ] Update API documentation
- [ ] Remove legacy API tests

**Code Cleanup**:
```javascript
// Remove legacy constants
// const IDE_API_ENDPOINTS = {
//   LIST: '/api/ide/list',
//   STATUS: '/api/ide/:port/status',
//   START: '/api/ide/:port/start'
// };

// Remove legacy types
// interface IDEStatus {
//   port: number;
//   name: string;
//   type: string;
//   status: string;
// }

// Keep only new project-centric types
interface Project {
  id: string;
  name: string;
  workspacePath: string;
  interfaces: Interface[];
}

interface Interface {
  id: string;
  name: string;
  type: string;
  status: string;
  projectId: string;
}
```

### Task 3.4: Test Complete Replacement (15 minutes)
- [ ] Test all new API endpoints work correctly
- [ ] Verify no legacy API calls remain
- [ ] Test frontend integration with new API
- [ ] Verify all functionality works with new API
- [ ] Run comprehensive integration tests

**Replacement Tests**:
```javascript
describe('Complete API Replacement', () => {
  it('should have no legacy IDE endpoints', async () => {
    // Test that legacy endpoints return 404
    await request(app)
      .get('/api/ide/list')
      .expect(404);
    
    await request(app)
      .get('/api/ide/3000/status')
      .expect(404);
  });

  it('should have all new project-centric endpoints', async () => {
    // Test new endpoints work
    await request(app)
      .get('/api/projects')
      .expect(200);
    
    await request(app)
      .get('/api/projects/project1/interfaces')
      .expect(200);
  });

  it('should have no legacy API imports', () => {
    // Check that no legacy API files exist
    expect(fs.existsSync('backend/presentation/api/ide/')).toBe(false);
    expect(fs.existsSync('backend/presentation/routes/ideRoutes.js')).toBe(false);
  });
});
```

## 🔧 Technical Implementation Details

### Complete Replacement Strategy
- **No Fallbacks**: Remove all legacy code permanently
- **No Compatibility**: No backward compatibility layer
- **Clean Break**: Complete API replacement in one go
- **Frontend Update**: Update all frontend API calls simultaneously

### Files to Remove
- All IDE API controllers
- All IDE API routes
- All IDE API middleware
- All IDE API tests
- All IDE API documentation

### Files to Update
- Frontend API repository
- Frontend API calls
- API documentation
- Integration tests

## 🧪 Testing Strategy

### Replacement Tests
- **File**: `backend/tests/integration/APIReplacement.integration.test.js`
- **Coverage**: 100% for replacement verification
- **Test Scenarios**: Legacy endpoint removal, new endpoint functionality

### Test Scenarios
1. **Legacy Endpoint Removal**:
   - All legacy endpoints return 404
   - No legacy API files exist
   - No legacy API imports remain

2. **New Endpoint Functionality**:
   - All new endpoints work correctly
   - Frontend integration works
   - All functionality preserved

3. **Complete Replacement**:
   - No mixed API usage
   - Clean codebase
   - No legacy references

## 📊 Success Criteria
- [ ] All legacy IDE API endpoints removed
- [ ] All frontend API calls updated
- [ ] All legacy API code removed
- [ ] All new API endpoints working
- [ ] No legacy API references remain
- [ ] All tests pass
- [ ] Complete API replacement successful

## 🔄 Integration Points
- **Frontend**: All API calls updated
- **Backend**: All legacy code removed
- **Tests**: All tests updated for new API
- **Documentation**: All documentation updated

## 📝 Notes
- Complete replacement - no gradual migration
- No backward compatibility maintained
- Clean break from legacy API
- All functionality must work with new API

## 🚀 Next Phase
After completing Phase 3, proceed to **Phase 4: Testing & Documentation** for comprehensive testing and documentation.