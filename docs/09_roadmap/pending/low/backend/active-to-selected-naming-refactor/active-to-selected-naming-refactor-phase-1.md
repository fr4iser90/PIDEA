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
- **API**: Updated endpoint responses with `selectedIDE` instead of `activePort`
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
- [ ] `backend/infrastructure/external/ide/IDEManager.js` - `activePort` → `selectedIDE`, `getActivePort()` → `getSelectedIDE()`
- [ ] `backend/domain/services/ide/IDEPortManager.js` - `setActivePort()` → `setSelectedIDE()`, `getActivePort()` → `getSelectedIDE()`
- [ ] `backend/domain/services/ide/CursorIDEService.js` - `getActivePort()` → `getSelectedIDE()`
- [ ] `backend/domain/services/ide/VSCodeService.js` - `getActivePort()` → `getSelectedIDE()`

### Additional Services (4 files):
- [ ] `backend/domain/services/ide/WindsurfIDEService.js` - `getActivePort()` → `getSelectedIDE()`
- [ ] `backend/domain/services/ide/IDEAutomationService.js` - `getActivePort()` → `getSelectedIDE()`
- [ ] `backend/application/services/IDEApplicationService.js` - `getActivePort()` → `getSelectedIDE()`
- [ ] `backend/application/services/WebChatApplicationService.js` - `getActivePort()` → `getSelectedIDE()`

### API Controllers (2 files):
- [ ] `backend/presentation/api/ide/IDEController.js` - `activeIDEChanged` events → `ideSelectedChanged`
- [ ] `backend/presentation/api/ide/IDEMirrorController.js` - `getActivePort()` → `getSelectedIDE()`

### Application Layer (2 files):
- [ ] `backend/Application.js` - `activeIDEChanged` event handlers → `ideSelectedChanged`
- [ ] `backend/application/handlers/categories/chat/SendMessageHandler.js` - `getActivePort()` → `getSelectedIDE()`

## Implementation Steps

### Step 1: Core Service Refactoring (1 hour)
1. Update `IDEManager.js`:
   - `activePort` → `selectedIDE`
   - `getActivePort()` → `getSelectedIDE()`
   - `switchToActiveIDE()` → `selectIDE()`

2. Update `IDEPortManager.js`:
   - `activePort` → `selectedIDE`
   - `setActivePort()` → `setSelectedIDE()`
   - `getActivePort()` → `getSelectedIDE()`
   - `selectActivePort()` → `selectIDE()`

### Step 2: IDE Services Refactoring (1 hour)
1. Update all IDE service files:
   - `CursorIDEService.js`
   - `VSCodeService.js`
   - `WindsurfIDEService.js`
   - `IDEAutomationService.js`

2. Update method calls:
   - `getActivePort()` → `getSelectedIDE()`
   - Update event subscriptions to use new event names

### Step 3: Application Services Refactoring (30 minutes)
1. Update `IDEApplicationService.js`:
   - `getActivePort()` → `getSelectedIDE()`

2. Update `WebChatApplicationService.js`:
   - `getActivePort()` → `getSelectedIDE()`

### Step 4: API Controllers Refactoring (1 hour)
1. Update `IDEController.js`:
   - `activeIDEChanged` events → `ideSelectedChanged`
   - Update response fields: `activePort` → `selectedIDE`
   - Update method names and variables

2. Update `IDEMirrorController.js`:
   - `getActivePort()` → `getSelectedIDE()`

### Step 5: Application Layer Refactoring (30 minutes)
1. Update `Application.js`:
   - `activeIDEChanged` event handlers → `ideSelectedChanged`
   - Update event subscriptions and publishing

2. Update `SendMessageHandler.js`:
   - `getActivePort()` → `getSelectedIDE()`

## Naming Convention Changes

### Method Names:
```javascript
// OLD → NEW
getActivePort() → getSelectedIDE()   // Returns selectedIDE object
setActivePort() → setSelectedIDE()   // Sets selectedIDE object
switchToActiveIDE() → selectIDE()
selectActivePort() → selectIDE()
getActiveIDE() → getSelectedIDE()    // Returns selectedIDE object
```

### Variables:
```javascript
// OLD → NEW
activePort → selectedIDE
activeIDE → selectedIDE
```

### Events:
```javascript
// OLD → NEW
'activeIDEChanged' → 'ideSelectedChanged'
'activePortChanged' → 'selectedIDEChanged'
```

### API Responses:
```javascript
// OLD -> NEW
{ activePort: 9222 } → { selectedIDE: { port: 9222, name: 'Cursor', ... } }
{ activeIDE: {...} } → { selectedIDE: {...} }
```

### State Example:
```javascript
// ❌ WRONG:
selectedPort: null
// ✅ CORRECT:
selectedIDE: null
```

### Store Example:
```javascript
// ❌ WRONG:
const useIDEStore = create(() => ({
  selectedPort: null,
  setSelectedPort: (port) => ...
}))
// ✅ CORRECT:
const useIDEStore = create(() => ({
  selectedIDE: null,
  setSelectedIDE: (ide) => ...
}))
```

### Method Example:
```javascript
// ✅ ALLOWED:
getSelectedPort() { return this.selectedIDE?.port || null; }
```

### ✅ **CLEAN IMPLEMENTATION:**
```javascript
// Single source of truth
this.selectedIDE = null;

// Get IDE object
getSelectedIDE() { return this.selectedIDE; }

// Get port number (derived from selectedIDE)
getSelectedPort() { 
  return this.selectedIDE?.port || null;
}

// Set selection
setSelectedIDE(ide) { 
  this.selectedIDE = ide;
  // No need to track activePort separately!
}
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
- [ ] API responses use 'selectedIDE' instead of 'activePort'
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