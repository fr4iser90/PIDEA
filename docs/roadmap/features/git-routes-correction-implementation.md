# Git Routes Correction Implementation

## Goal
Correct Git routes from global (`/api/git/*`) to project-based (`/api/projects/:projectId/git/*`) and update all related documentation and frontend code to match the correct API structure.

## Template Structure

### 1. Project Overview
- **Feature/Component Name**: Git Routes Correction
- **Priority**: High
- **Estimated Time**: 2 hours
- **Dependencies**: Existing Git functionality
- **Related Issues**: Incorrect route structure, documentation inconsistencies

### 2. Technical Requirements
- **Tech Stack**: Node.js, Express, React
- **Architecture Pattern**: REST API with project-based routing
- **Database Changes**: None
- **API Changes**: Convert Git routes from global to project-based
- **Frontend Changes**: Update all Git API calls to use project-based routes
- **Backend Changes**: Update GitController and Application.js routes

### 3. File Impact Analysis

#### Files to Modify:
- [ ] `backend/Application.js` - Convert Git routes from global to project-based
- [ ] `backend/presentation/api/GitController.js` - Update to handle projectId parameter
- [ ] `frontend/src/presentation/components/git/main/GitManagementComponent.jsx` - Update API calls
- [ ] `frontend/src/App.jsx` - Update Git status fetching
- [ ] `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Add project-based Git endpoints
- [ ] `docs/08_reference/api/rest-api.md` - Add Git API documentation
- [ ] `docs/06_development/git-workflow.md` - Update with correct API endpoints

#### Files to Create:
- [ ] `docs/08_reference/api/git-api.md` - Detailed Git API documentation

### 4. Implementation Phases

#### Phase 1: Backend Route Correction
- [ ] Update Application.js to use project-based Git routes
- [ ] Modify GitController to extract projectId from route parameters
- [ ] Update GitController methods to use projectId instead of projectPath from body
- [ ] Test all Git endpoints with project-based routing

#### Phase 2: Frontend Integration
- [ ] Update APIChatRepository.jsx with project-based Git endpoints
- [ ] Modify GitManagementComponent.jsx to use project-based routes
- [ ] Update App.jsx Git status fetching
- [ ] Add project ID detection logic

#### Phase 3: Documentation Update
- [ ] Create comprehensive Git API documentation
- [ ] Update existing documentation with correct endpoints
- [ ] Add examples and usage patterns
- [ ] Update workflow documentation

### 5. Route Changes

#### Current (INCORRECT) Global Routes:
```javascript
// ❌ WRONG - Global routes
POST /api/git/status
POST /api/git/branches
POST /api/git/validate
POST /api/git/compare
POST /api/git/pull
POST /api/git/checkout
POST /api/git/merge
POST /api/git/create-branch
POST /api/git/info
```

#### New (CORRECT) Project-Based Routes:
```javascript
// ✅ CORRECT - Project-based routes
POST /api/projects/:projectId/git/status
POST /api/projects/:projectId/git/branches
POST /api/projects/:projectId/git/validate
POST /api/projects/:projectId/git/compare
POST /api/projects/:projectId/git/pull
POST /api/projects/:projectId/git/checkout
POST /api/projects/:projectId/git/merge
POST /api/projects/:projectId/git/create-branch
POST /api/projects/:projectId/git/info
```

### 6. Backend Changes

#### Application.js Route Updates:
```javascript
// Git Management routes (protected) - PROJECT-BASED
this.app.use('/api/projects/:projectId/git', this.authMiddleware.authenticate());
this.app.post('/api/projects/:projectId/git/status', (req, res) => this.gitController.getStatus(req, res));
this.app.post('/api/projects/:projectId/git/branches', (req, res) => this.gitController.getBranches(req, res));
this.app.post('/api/projects/:projectId/git/validate', (req, res) => this.gitController.validate(req, res));
this.app.post('/api/projects/:projectId/git/compare', (req, res) => this.gitController.compare(req, res));
this.app.post('/api/projects/:projectId/git/pull', (req, res) => this.gitController.pull(req, res));
this.app.post('/api/projects/:projectId/git/checkout', (req, res) => this.gitController.checkout(req, res));
this.app.post('/api/projects/:projectId/git/merge', (req, res) => this.gitController.merge(req, res));
this.app.post('/api/projects/:projectId/git/create-branch', (req, res) => this.gitController.createBranch(req, res));
this.app.post('/api/projects/:projectId/git/info', (req, res) => this.gitController.getRepositoryInfo(req, res));
```

#### GitController Updates:
```javascript
// Extract projectId from route parameters instead of body
const projectId = req.params.projectId;
const { projectPath } = req.body; // Still needed for Git operations

// Validate projectId exists
if (!projectId) {
    return res.status(400).json({
        success: false,
        error: 'Project ID is required'
    });
}
```

### 7. Frontend Changes

#### APIChatRepository.jsx Updates:
```javascript
git: {
    status: (projectId) => `/api/projects/${projectId}/git/status`,
    branches: (projectId) => `/api/projects/${projectId}/git/branches`,
    validate: (projectId) => `/api/projects/${projectId}/git/validate`,
    compare: (projectId) => `/api/projects/${projectId}/git/compare`,
    pull: (projectId) => `/api/projects/${projectId}/git/pull`,
    checkout: (projectId) => `/api/projects/${projectId}/git/checkout`,
    merge: (projectId) => `/api/projects/${projectId}/git/merge`,
    createBranch: (projectId) => `/api/projects/${projectId}/git/create-branch`,
    info: (projectId) => `/api/projects/${projectId}/git/info`
}
```

#### GitManagementComponent.jsx Updates:
```javascript
// Get project ID from workspace path
const getProjectId = (workspacePath) => {
    if (!workspacePath) return 'default';
    const pathParts = workspacePath.split('/');
    const projectName = pathParts[pathParts.length - 1];
    return projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Update API calls
const loadGitStatus = async () => {
    const projectId = getProjectId(workspacePath);
    const data = await apiCall(`/api/projects/${projectId}/git/status`, {
        method: 'POST',
        body: JSON.stringify({ projectPath: workspacePath })
    });
};
```

### 8. Documentation Updates

#### New Git API Documentation:
```markdown
# Git Management API

## Base URL
`/api/projects/:projectId/git`

## Authentication
All Git endpoints require authentication.

## Endpoints

### Get Git Status
**POST** `/api/projects/:projectId/git/status`

### Get Branches
**POST** `/api/projects/:projectId/git/branches`

### Validate Changes
**POST** `/api/projects/:projectId/git/validate`

### Compare Branches
**POST** `/api/projects/:projectId/git/compare`

### Pull Changes
**POST** `/api/projects/:projectId/git/pull`

### Checkout Branch
**POST** `/api/projects/:projectId/git/checkout`

### Merge Branches
**POST** `/api/projects/:projectId/git/merge`

### Create Branch
**POST** `/api/projects/:projectId/git/create-branch`

### Get Repository Info
**POST** `/api/projects/:projectId/git/info`
```

### 9. Code Standards & Patterns
- **Coding Style**: Follow existing ESLint rules
- **Naming Conventions**: Use camelCase for variables, PascalCase for classes
- **Error Handling**: Consistent error responses with proper HTTP status codes
- **Logging**: Use existing logger with appropriate levels
- **Testing**: Update existing tests to use project-based routes
- **Documentation**: JSDoc for all updated functions

### 10. Security Considerations
- [ ] Validate projectId parameter in all Git endpoints
- [ ] Ensure user has access to the specified project
- [ ] Maintain existing authentication and authorization
- [ ] Sanitize all input parameters
- [ ] Log all Git operations with project context

### 11. Testing Strategy
- [ ] Test all Git endpoints with valid project IDs
- [ ] Test error handling for invalid project IDs
- [ ] Test authentication requirements
- [ ] Test frontend integration with new routes
- [ ] Verify existing functionality still works

### 12. Migration Plan
- [ ] Deploy backend changes first
- [ ] Update frontend to use new routes
- [ ] Test complete workflow
- [ ] Update documentation
- [ ] Monitor for any issues

### 13. Success Criteria
- [ ] All Git routes use project-based structure
- [ ] Frontend correctly calls project-based Git endpoints
- [ ] Documentation accurately reflects new API structure
- [ ] All existing Git functionality works correctly
- [ ] No breaking changes to other systems

### 14. Risk Assessment
#### High Risk:
- [ ] Breaking existing Git functionality - Mitigation: Thorough testing
- [ ] Frontend integration issues - Mitigation: Update all Git-related components

#### Medium Risk:
- [ ] Documentation inconsistencies - Mitigation: Comprehensive documentation review
- [ ] Performance impact - Mitigation: Monitor API response times

#### Low Risk:
- [ ] Code style inconsistencies - Mitigation: Follow existing patterns

### 15. References & Resources
- **Current Git Implementation**: `backend/presentation/api/GitController.js`
- **Frontend Git Component**: `frontend/src/presentation/components/git/main/GitManagementComponent.jsx`
- **API Repository**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx`
- **Existing Documentation**: `docs/06_development/git-workflow.md`

---

## Implementation Notes

This correction ensures that Git operations are properly scoped to specific projects, maintaining consistency with the rest of the API structure where tasks, auto-finish, and analysis operations are all project-based.

The change from global Git routes to project-based routes improves:
1. **Security**: Better isolation between projects
2. **Consistency**: Aligns with other project-based endpoints
3. **Scalability**: Supports multi-project environments
4. **Maintainability**: Clearer API structure 