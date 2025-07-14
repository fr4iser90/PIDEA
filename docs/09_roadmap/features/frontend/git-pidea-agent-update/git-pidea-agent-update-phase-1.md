# Phase 1: Backend API Extension

## 📋 Phase Overview
- **Phase**: 1 of 5
- **Title**: Backend API Extension
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Dependencies**: None
- **Deliverables**: Extended git API endpoints for pidea-agent branch operations

## 🎯 Objectives
Extend the backend git API to support pidea-agent branch operations, including pull, merge, and status checking functionality.

## 📁 Files to Modify

### 1. GitController.js
**File**: `backend/presentation/api/GitController.js`
**Purpose**: Add new API endpoints for pidea-agent branch operations

#### Changes Required:
- [ ] Add `pullPideaAgent` method for pulling pidea-agent branch
- [ ] Add `mergeToPideaAgent` method for merging to pidea-agent branch
- [ ] Add `getPideaAgentStatus` method for checking pidea-agent branch status
- [ ] Add `compareWithPideaAgent` method for comparing current branch with pidea-agent
- [ ] Add validation for pidea-agent branch operations
- [ ] Add proper error handling and logging

#### Implementation Details:
```javascript
// New methods to add:
async pullPideaAgent(req, res) {
  // Pull latest changes from pidea-agent branch
}

async mergeToPideaAgent(req, res) {
  // Merge current branch into pidea-agent branch
}

async getPideaAgentStatus(req, res) {
  // Get status of pidea-agent branch
}

async compareWithPideaAgent(req, res) {
  // Compare current branch with pidea-agent branch
}
```

### 2. GitService.js
**File**: `backend/infrastructure/external/GitService.js`
**Purpose**: Add low-level git operations for pidea-agent branch

#### Changes Required:
- [ ] Add `pullPideaAgentBranch` method
- [ ] Add `mergeToPideaAgentBranch` method
- [ ] Add `getPideaAgentBranchStatus` method
- [ ] Add `compareWithPideaAgentBranch` method
- [ ] Add proper error handling for pidea-agent operations
- [ ] Add event publishing for pidea-agent operations

#### Implementation Details:
```javascript
// New methods to add:
async pullPideaAgentBranch(repoPath, options = {}) {
  // Pull from pidea-agent branch
}

async mergeToPideaAgentBranch(repoPath, sourceBranch, options = {}) {
  // Merge source branch into pidea-agent
}

async getPideaAgentBranchStatus(repoPath) {
  // Get pidea-agent branch status
}

async compareWithPideaAgentBranch(repoPath, sourceBranch) {
  // Compare with pidea-agent branch
}
```

### 3. WorkflowGitService.js
**File**: `backend/domain/services/WorkflowGitService.js`
**Purpose**: Extend branch strategies to handle pidea-agent operations

#### Changes Required:
- [ ] Add pidea-agent branch strategy configuration
- [ ] Add `mergeToPideaAgent` method
- [ ] Add `pullPideaAgent` method
- [ ] Add pidea-agent branch validation
- [ ] Update branch strategy mappings for pidea-agent operations

#### Implementation Details:
```javascript
// Add to branch strategies:
pideaAgent: {
  type: 'pidea-agent',
  prefix: 'pidea-agent',
  startPoint: 'main',
  protection: 'medium',
  autoMerge: false,
  requiresReview: true,
  mergeTarget: 'pidea-agent'
}

// New methods to add:
async mergeToPideaAgent(projectPath, sourceBranch, task, options = {}) {
  // Merge to pidea-agent branch
}

async pullPideaAgent(projectPath, options = {}) {
  // Pull pidea-agent branch
}
```

## 🔧 Implementation Steps

### Step 1: Extend GitController (45 minutes)
1. [ ] Add new route handlers for pidea-agent operations
2. [ ] Implement input validation for pidea-agent endpoints
3. [ ] Add proper error handling and response formatting
4. [ ] Add logging for pidea-agent operations
5. [ ] Add event publishing for pidea-agent operations

### Step 2: Extend GitService (45 minutes)
1. [ ] Implement low-level git operations for pidea-agent branch
2. [ ] Add proper error handling for git commands
3. [ ] Add event publishing for git operations
4. [ ] Add validation for pidea-agent branch existence
5. [ ] Add conflict detection for merge operations

### Step 3: Extend WorkflowGitService (30 minutes)
1. [ ] Add pidea-agent branch strategy configuration
2. [ ] Implement high-level pidea-agent operations
3. [ ] Add integration with existing workflow patterns
4. [ ] Add validation for pidea-agent operations
5. [ ] Update branch strategy mappings

## 🧪 Testing Requirements

### Unit Tests
- [ ] Test GitController pidea-agent endpoints
- [ ] Test GitService pidea-agent operations
- [ ] Test WorkflowGitService pidea-agent methods
- [ ] Test error handling scenarios
- [ ] Test validation logic

### Integration Tests
- [ ] Test complete pidea-agent workflow
- [ ] Test API endpoint integration
- [ ] Test event publishing
- [ ] Test error scenarios
- [ ] Test performance under load

## 📋 Success Criteria
- [ ] All new API endpoints are functional
- [ ] Proper error handling implemented
- [ ] Event publishing working correctly
- [ ] Validation logic implemented
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Performance requirements met
- [ ] Documentation updated

## ⚠️ Risk Mitigation
- **Risk**: Breaking existing git functionality
  - **Mitigation**: Comprehensive testing of existing endpoints
- **Risk**: Performance impact on git operations
  - **Mitigation**: Performance testing and optimization
- **Risk**: Security vulnerabilities in new endpoints
  - **Mitigation**: Security review and input validation

## 🔗 Dependencies
- Existing git service infrastructure
- Event bus system
- Logging system
- Validation framework

## 📝 Notes
- Ensure backward compatibility with existing git operations
- Follow existing patterns for error handling and logging
- Maintain consistency with current API design
- Consider performance implications of new operations 