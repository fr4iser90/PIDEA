# Phase 2: Frontend API Integration

## 📋 Phase Overview
- **Phase**: 2 of 5
- **Title**: Frontend API Integration
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Dependencies**: Phase 1 (Backend API Extension)
- **Deliverables**: Extended frontend API methods for pidea-agent branch operations

## 🎯 Objectives
Extend the frontend API layer to support pidea-agent branch operations, including proper error handling and TypeScript type definitions.

## 📁 Files to Modify

### 1. APIChatRepository.jsx
**File**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx`
**Purpose**: Add API methods for pidea-agent branch operations

#### Changes Required:
- [ ] Add `pullPideaAgentBranch` method
- [ ] Add `mergeToPideaAgentBranch` method
- [ ] Add `getPideaAgentBranchStatus` method
- [ ] Add `compareWithPideaAgentBranch` method
- [ ] Add proper error handling for pidea-agent operations
- [ ] Add TypeScript types for pidea-agent operations

#### Implementation Details:
```javascript
// New methods to add:
async pullPideaAgentBranch(projectId = null, projectPath = null, remote = 'origin') {
  const actualProjectId = projectId || await this.getCurrentProjectId();
  return apiCall(API_CONFIG.endpoints.git.pullPideaAgent(actualProjectId), {
    method: 'POST',
    body: JSON.stringify({ projectPath, remote })
  });
}

async mergeToPideaAgentBranch(projectId = null, projectPath = null, sourceBranch = null) {
  const actualProjectId = projectId || await this.getCurrentProjectId();
  return apiCall(API_CONFIG.endpoints.git.mergeToPideaAgent(actualProjectId), {
    method: 'POST',
    body: JSON.stringify({ projectPath, sourceBranch })
  });
}

async getPideaAgentBranchStatus(projectId = null, projectPath = null) {
  const actualProjectId = projectId || await this.getCurrentProjectId();
  return apiCall(API_CONFIG.endpoints.git.getPideaAgentStatus(actualProjectId), {
    method: 'POST',
    body: JSON.stringify({ projectPath })
  });
}

async compareWithPideaAgentBranch(projectId = null, projectPath = null, sourceBranch = null) {
  const actualProjectId = projectId || await this.getCurrentProjectId();
  return apiCall(API_CONFIG.endpoints.git.compareWithPideaAgent(actualProjectId), {
    method: 'POST',
    body: JSON.stringify({ projectPath, sourceBranch })
  });
}
```

### 2. API Configuration
**File**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx`
**Purpose**: Add API endpoint configurations for pidea-agent operations

#### Changes Required:
- [ ] Add pidea-agent endpoint configurations to API_CONFIG
- [ ] Add proper URL patterns for pidea-agent endpoints
- [ ] Add error handling configurations
- [ ] Add timeout configurations for pidea-agent operations

#### Implementation Details:
```javascript
// Add to API_CONFIG.endpoints.git:
pullPideaAgent: (projectId) => `/api/projects/${projectId}/git/pull-pidea-agent`,
mergeToPideaAgent: (projectId) => `/api/projects/${projectId}/git/merge-to-pidea-agent`,
getPideaAgentStatus: (projectId) => `/api/projects/${projectId}/git/pidea-agent-status`,
compareWithPideaAgent: (projectId) => `/api/projects/${projectId}/git/compare-with-pidea-agent`,
```

### 3. TypeScript Types (if applicable)
**File**: `frontend/src/types/git.ts` (create if doesn't exist)
**Purpose**: Add TypeScript type definitions for pidea-agent operations

#### Changes Required:
- [ ] Create TypeScript interfaces for pidea-agent operations
- [ ] Add type definitions for API responses
- [ ] Add type definitions for request parameters
- [ ] Add type definitions for error responses

#### Implementation Details:
```typescript
// Type definitions to add:
interface PideaAgentBranchStatus {
  branch: string;
  hasChanges: boolean;
  modifiedFiles: number;
  addedFiles: number;
  deletedFiles: number;
  untrackedFiles: number;
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

interface PideaAgentMergeResult {
  success: boolean;
  sourceBranch: string;
  targetBranch: string;
  mergeResult: any;
  message: string;
  metadata: {
    taskId?: string;
    mergeStrategy: string;
    timestamp: Date;
  };
}

interface PideaAgentCompareResult {
  success: boolean;
  diff: string;
  sourceBranch: string;
  targetBranch: string;
  sourceHistory: any[];
  targetHistory: any[];
}
```

## 🔧 Implementation Steps

### Step 1: Extend APIChatRepository (60 minutes)
1. [ ] Add new API methods for pidea-agent operations
2. [ ] Implement proper error handling for each method
3. [ ] Add parameter validation for API calls
4. [ ] Add logging for API operations
5. [ ] Add retry logic for failed operations

### Step 2: Update API Configuration (30 minutes)
1. [ ] Add endpoint configurations to API_CONFIG
2. [ ] Configure proper URL patterns
3. [ ] Add timeout configurations
4. [ ] Add error handling configurations
5. [ ] Test endpoint configurations

### Step 3: Add TypeScript Types (30 minutes)
1. [ ] Create TypeScript interfaces for pidea-agent operations
2. [ ] Add type definitions for API responses
3. [ ] Add type definitions for request parameters
4. [ ] Add type definitions for error responses
5. [ ] Update existing type definitions if needed

## 🧪 Testing Requirements

### Unit Tests
- [ ] Test APIChatRepository pidea-agent methods
- [ ] Test API configuration endpoints
- [ ] Test error handling scenarios
- [ ] Test parameter validation
- [ ] Test retry logic

### Integration Tests
- [ ] Test API method integration with backend
- [ ] Test complete pidea-agent workflow
- [ ] Test error scenarios
- [ ] Test performance under load
- [ ] Test timeout scenarios

## 📋 Success Criteria
- [ ] All new API methods are functional
- [ ] Proper error handling implemented
- [ ] TypeScript types defined correctly
- [ ] API configuration working
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Performance requirements met
- [ ] Documentation updated

## ⚠️ Risk Mitigation
- **Risk**: API compatibility issues
  - **Mitigation**: Backward compatibility testing
- **Risk**: TypeScript type errors
  - **Mitigation**: Comprehensive type checking
- **Risk**: Performance impact on API calls
  - **Mitigation**: Performance testing and optimization

## 🔗 Dependencies
- Phase 1 backend API endpoints
- Existing API infrastructure
- TypeScript configuration
- Error handling framework

## 📝 Notes
- Ensure backward compatibility with existing API methods
- Follow existing patterns for error handling and logging
- Maintain consistency with current API design
- Consider performance implications of new API calls
- Add proper TypeScript documentation 