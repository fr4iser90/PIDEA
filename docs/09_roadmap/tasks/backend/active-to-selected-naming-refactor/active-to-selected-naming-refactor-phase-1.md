# Active to Selected Naming Refactor – Phase 1: Backend Naming Refactor

## Overview
This phase focuses on refactoring all backend naming from 'active' to 'selected' terminology. This includes core services, API endpoints, event system, and backend state management. This phase establishes the foundation for the frontend refactor in Phase 2.

## Objectives
- [ ] Update all backend service method names and variables
- [ ] Refactor API endpoint naming and response fields
- [ ] Update WebSocket event names and handlers
- [ ] Modify backend state management terminology
- [ ] Update backend event system naming
- [ ] Ensure all backend functionality works with new naming

## Deliverables
- **Files**: 12 backend files updated with new naming
- **API**: Updated endpoint responses with `selectedPort` instead of `activePort`
- **Events**: `activeIDEChanged` → `ideSelectedChanged` event system
- **Services**: All IDE services updated with `selected` terminology
- **Tests**: Backend tests updated to use new naming

## Dependencies
- **Requires**: None (foundation layer)
- **Blocks**: Phase 2 start (frontend refactor)

## Estimated Time
4 hours

## Files to Modify

### Core Services (4 files):
- [ ] `backend/infrastructure/external/ide/IDEManager.js` - `activePort` → `selectedPort`, `getActivePort()` → `getSelectedPort()`
- [ ] `backend/domain/services/ide/IDEPortManager.js` - `setActivePort()` → `setSelectedPort()`, `getActivePort()` → `getSelectedPort()`
- [ ] `backend/domain/services/ide/CursorIDEService.js` - `getActivePort()` → `getSelectedPort()`
- [ ] `backend/domain/services/ide/VSCodeService.js` - `getActivePort()` → `getSelectedPort()`

### Additional Services (4 files):
- [ ] `backend/domain/services/ide/WindsurfIDEService.js` - `getActivePort()` → `getSelectedPort()`
- [ ] `backend/domain/services/ide/IDEAutomationService.js` - `getActivePort()` → `getSelectedPort()`
- [ ] `backend/application/services/IDEApplicationService.js` - `getActivePort()` → `getSelectedPort()`
- [ ] `backend/application/services/WebChatApplicationService.js` - `getActivePort()` → `getSelectedPort()`

### API Controllers (2 files):
- [ ] `backend/presentation/api/ide/IDEController.js` - `activeIDEChanged` events → `ideSelectedChanged`
- [ ] `backend/presentation/api/ide/IDEMirrorController.js` - `getActivePort()` → `getSelectedPort()`

### Application Layer (2 files):
- [ ] `backend/Application.js` - `activeIDEChanged` event handlers → `ideSelectedChanged`
- [ ] `backend/application/handlers/categories/chat/SendMessageHandler.js` - `getActivePort()` → `getSelectedPort()`

## Implementation Steps

### Step 1: Core Service Refactoring (1 hour)
1. Update `IDEManager.js`:
   - `activePort` → `selectedPort`
   - `getActivePort()` → `getSelectedPort()`
   - `switchToActiveIDE()` → `selectIDE()`

2. Update `IDEPortManager.js`:
   - `activePort` → `selectedPort`
   - `setActivePort()` → `setSelectedPort()`
   - `getActivePort()` → `getSelectedPort()`
   - `selectActivePort()` → `selectPort()`

### Step 2: IDE Services Refactoring (1 hour)
1. Update all IDE service files:
   - `CursorIDEService.js`
   - `VSCodeService.js`
   - `WindsurfIDEService.js`
   - `IDEAutomationService.js`

2. Update method calls:
   - `getActivePort()` → `getSelectedPort()`
   - Update event subscriptions to use new event names

### Step 3: Application Services Refactoring (30 minutes)
1. Update `IDEApplicationService.js`:
   - `getActivePort()` → `getSelectedPort()`

2. Update `WebChatApplicationService.js`:
   - `getActivePort()` → `getSelectedPort()`

### Step 4: API Controllers Refactoring (1 hour)
1. Update `IDEController.js`:
   - `activeIDEChanged` events → `ideSelectedChanged`
   - Update response fields: `activePort` → `selectedPort`
   - Update method names and variables

2. Update `IDEMirrorController.js`:
   - `getActivePort()` → `getSelectedPort()`

### Step 5: Application Layer Refactoring (30 minutes)
1. Update `Application.js`:
   - `activeIDEChanged` event handlers → `ideSelectedChanged`
   - Update event subscriptions and publishing

2. Update `SendMessageHandler.js`:
   - `getActivePort()` → `getSelectedPort()`

## Naming Convention Changes

### Method Names:
```javascript
// OLD → NEW
getActivePort() → getSelectedPort()
setActivePort() → setSelectedPort()
switchToActiveIDE() → selectIDE()
selectActivePort() → selectPort()
```

### Variables:
```javascript
// OLD → NEW
activePort → selectedPort
activeIDE → selectedIDE
```

### Events:
```javascript
// OLD → NEW
'activeIDEChanged' → 'ideSelectedChanged'
'activePortChanged' → 'selectedPortChanged'
```

### API Responses:
```javascript
// OLD → NEW
{ activePort: 9222 } → { selectedPort: 9222 }
{ activeIDE: {...} } → { selectedIDE: {...} }
```

## Testing Strategy

### Unit Tests:
- [ ] Test all renamed methods work correctly
- [ ] Verify event publishing with new names
- [ ] Test API endpoints return correct field names

### Integration Tests:
- [ ] Test IDE selection flow with new naming
- [ ] Verify WebSocket events work with new names
- [ ] Test API responses contain correct field names

## Success Criteria
- [ ] All 12 backend files updated with new naming
- [ ] All method names changed from 'active' to 'selected'
- [ ] All event names updated to use 'selected' terminology
- [ ] API responses use 'selectedPort' instead of 'activePort'
- [ ] All backend tests pass with new naming
- [ ] No breaking changes to existing functionality
- [ ] Event system works with new event names

## Risk Mitigation
- **Breaking Changes**: Test each file individually before moving to next
- **Event System**: Maintain backward compatibility during transition
- **API Changes**: Update API documentation alongside code changes
- **Dependencies**: Ensure all service dependencies are updated together

## Validation Checklist
- [ ] All method names updated consistently
- [ ] All variable names updated consistently
- [ ] All event names updated consistently
- [ ] API responses use new field names
- [ ] No references to old naming remain
- [ ] All tests pass
- [ ] Backend functionality works correctly
- [ ] Event system publishes and receives events correctly

## Next Phase Preparation
- [ ] Document any API changes for frontend team
- [ ] Update API documentation with new field names
- [ ] Ensure all backend services are stable
- [ ] Prepare for frontend refactor in Phase 2 