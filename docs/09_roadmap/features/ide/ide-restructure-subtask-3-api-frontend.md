# IDE Organization Restructure - Subtask 3: API & Frontend Unification

## 1. Project Overview
- **Subtask Name**: API & Frontend Unification Implementation
- **Priority**: High (Builds on Subtasks 1 & 2)
- **Estimated Time**: 15 hours
- **Dependencies**: Subtask 1 (Core Abstraction Layer), Subtask 2 (Infrastructure Restructure)
- **Related Issues**: Unify IDE API endpoints, implement IDE selection UI, create unified mirror interface
- **Current State**: IDE-specific API endpoints, no unified frontend interface

## 2. Technical Requirements
- **Tech Stack**: Node.js, Express.js, React.js, WebSocket
- **Architecture Pattern**: RESTful API with unified IDE endpoints
- **Database Changes**: None (this subtask focuses on API and frontend)
- **API Changes**: Unified IDE API endpoints, IDE-agnostic controllers
- **Frontend Changes**: IDE selection UI, unified IDE mirror interface
- **Backend Changes**: Unified IDE API layer

## 3. File Impact Analysis

### Files to Create:
- [ ] `backend/presentation/api/ide/IDEController.js` - Unified IDE controller
- [ ] `backend/presentation/api/ide/IDESelectionController.js` - IDE selection API
- [ ] `backend/presentation/api/ide/IDEMirrorController.js` - IDE mirror API
- [ ] `backend/presentation/api/ide/IDEFeatureController.js` - IDE feature API
- [ ] `frontend/src/presentation/components/ide/IDESelector.jsx` - IDE selection component
- [ ] `frontend/src/presentation/components/ide/IDEMirror.jsx` - Unified IDE mirror component
- [ ] `frontend/src/presentation/components/ide/IDEFeatures.jsx` - IDE-specific features component
- [ ] `frontend/src/presentation/components/ide/IDESwitch.jsx` - IDE switching component

### Files to Modify:
- [ ] `backend/presentation/api/IDEController.js` - Refactor to use unified approach
- [ ] `frontend/src/presentation/components/mirror/main/IDEMirrorComponent.jsx` - Add IDE selection
- [ ] `frontend/src/App.jsx` - Add IDE selection routing
- [ ] `backend/presentation/websocket/TaskWebSocket.js` - Add IDE-specific notifications

## 4. Implementation Steps

### Step 1: Create Unified IDE API Layer (4 hours)
- [ ] Implement `IDEController.js`:
  - `GET /api/ide/list` - List available IDEs
  - `GET /api/ide/status` - Get IDE status
  - `POST /api/ide/start` - Start IDE
  - `POST /api/ide/stop` - Stop IDE
  - `GET /api/ide/features` - Get IDE features
- [ ] Implement `IDESelectionController.js`:
  - `GET /api/ide/selection` - Get current IDE selection
  - `POST /api/ide/selection` - Set IDE selection
  - `GET /api/ide/available` - Get available IDEs
- [ ] Implement `IDEMirrorController.js`:
  - `GET /api/ide/mirror/dom` - Get IDE DOM
  - `POST /api/ide/mirror/interact` - Interact with IDE
  - `GET /api/ide/mirror/status` - Get mirror status

### Step 2: Create IDE Selection UI (3 hours)
- [ ] Implement `IDESelector.jsx`:
  - IDE selection dropdown
  - IDE status indicators
  - IDE feature badges
  - IDE switching buttons
- [ ] Implement `IDESwitch.jsx`:
  - Smooth IDE switching
  - Progress indicators
  - Error handling
  - Success notifications

### Step 3: Create Unified IDE Mirror Interface (4 hours)
- [ ] Implement `IDEMirror.jsx`:
  - Unified DOM display
  - IDE-agnostic interactions
  - Real-time updates
  - Error handling
- [ ] Implement `IDEFeatures.jsx`:
  - IDE-specific feature detection
  - Feature availability indicators
  - Feature-specific UI components

### Step 4: Update Existing Components (2 hours)
- [ ] Modify `IDEMirrorComponent.jsx`:
  - Add IDE selection integration
  - Update to use unified API
  - Add IDE switching support
- [ ] Update `App.jsx`:
  - Add IDE selection routing
  - Update navigation
  - Add IDE context provider

### Step 5: Implement WebSocket Integration (2 hours)
- [ ] Update `TaskWebSocket.js`:
  - Add IDE-specific notifications
  - Add IDE status updates
  - Add IDE switching events

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules
- **Naming Conventions**: camelCase for methods, PascalCase for components
- **Error Handling**: React error boundaries, API error handling
- **Logging**: Winston logger with IDE context
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all API endpoints

## 6. Testing Strategy

### Unit Tests:
- [ ] `tests/unit/presentation/api/ide/IDEController.test.js` - IDE controller tests
- [ ] `tests/unit/presentation/api/ide/IDESelectionController.test.js` - Selection controller tests
- [ ] `tests/unit/presentation/api/ide/IDEMirrorController.test.js` - Mirror controller tests
- [ ] `tests/unit/frontend/components/ide/IDESelector.test.jsx` - IDE selector tests
- [ ] `tests/unit/frontend/components/ide/IDEMirror.test.jsx` - IDE mirror tests

### Integration Tests:
- [ ] `tests/integration/api/ide/IDEApi.test.js` - IDE API integration
- [ ] `tests/integration/frontend/ide/IDEComponents.test.jsx` - IDE components integration

### E2E Tests:
- [ ] `tests/e2e/ide/IDESelection.test.js` - IDE selection E2E
- [ ] `tests/e2e/ide/IDESwitching.test.js` - IDE switching E2E

## 7. Success Criteria
- [ ] Unified IDE API endpoints working
- [ ] IDE selection UI functional
- [ ] Unified IDE mirror interface working
- [ ] IDE switching capabilities operational
- [ ] WebSocket integration active
- [ ] All tests passing with 90% coverage

## 8. Risk Assessment

### High Risk:
- [ ] Breaking existing API endpoints - Mitigation: Comprehensive testing and gradual migration
- [ ] Frontend component conflicts - Mitigation: Isolated component development

### Medium Risk:
- [ ] API performance issues - Mitigation: Optimize API responses
- [ ] UI/UX complexity - Mitigation: Simplified interface design

### Low Risk:
- [ ] WebSocket connection issues - Mitigation: Robust connection handling
- [ ] Component reusability - Mitigation: Modular component design

## 9. Deliverables
- [ ] Unified IDE API controllers
- [ ] IDE selection UI components
- [ ] Unified IDE mirror interface
- [ ] IDE switching functionality
- [ ] WebSocket integration
- [ ] Complete test suite
- [ ] API documentation

## 10. Dependencies for Next Subtask
- [ ] Unified API endpoints working
- [ ] IDE selection UI functional
- [ ] IDE mirror interface stable
- [ ] IDE switching operational

---

## AI Auto-Implementation Instructions

### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/ide-restructure-subtask-3-api-frontend.md'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/ide-restructure-subtask-3",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 600
}
```

### Success Indicators:
- [ ] Unified IDE API implemented
- [ ] IDE selection UI working
- [ ] IDE mirror interface functional
- [ ] IDE switching operational
- [ ] WebSocket integration active
- [ ] All tests passing 