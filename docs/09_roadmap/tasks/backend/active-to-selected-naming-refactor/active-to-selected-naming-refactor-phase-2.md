# Active to Selected Naming Refactor – Phase 2: Frontend Naming Refactor

## Overview
This phase focuses on refactoring all frontend naming from 'active' to 'selected' terminology. This includes React components, state management, UI text, and frontend event handling. This phase builds upon the backend refactor completed in Phase 1.

## Objectives
- [ ] Update all frontend component props and state variables
- [ ] Refactor Zustand store naming and methods
- [ ] Update UI text and component labels
- [ ] Modify frontend event handling and WebSocket events
- [ ] Update React hooks and custom hooks
- [ ] Ensure all frontend functionality works with new naming

## Deliverables
- **Files**: 15 frontend files updated with new naming
- **State Management**: IDEStore updated with `selectedIDE` instead of `activePort`
- **Components**: All React components use `selected` terminology
- **UI Text**: All user-facing text updated to use 'selected' instead of 'active'
- **Events**: Frontend event handlers updated for new event names

## Dependencies
- **Requires**: Phase 1 completion (backend refactor)
- **Blocks**: Phase 3 start (testing & documentation)

## Estimated Time
4 hours

## Files to Modify

### Core Components (5 files):
- [ ] `frontend/src/App.jsx` - `activePort` → `selectedIDE`, `setActivePort` → `setSelectedIDE`, `loadActivePort` → `loadSelectedIDE`
- [ ] `frontend/src/presentation/components/ide/IDEContext.jsx` - `activePort` → `selectedIDE`, `setActivePort` → `setSelectedIDE`, `loadActivePort` → `loadSelectedIDE`
- [ ] `frontend/src/presentation/components/SidebarLeft.jsx` - `activePort` → `selectedIDE`, `activeIDEChanged` → `ideSelectedChanged`
- [ ] `frontend/src/presentation/components/SidebarRight.jsx` - `activePort` → `selectedIDE`
- [ ] `frontend/src/presentation/components/ide/IDESelector.jsx` - `activeIDEChanged` → `ideSelectedChanged`, `isActive` → `isSelected`

### Chat Components (3 files):
- [ ] `frontend/src/presentation/components/chat/main/ChatComponent.jsx` - `activePort` → `selectedIDE`
- [ ] `frontend/src/presentation/components/chat/main/PreviewComponent.jsx` - `activePort` → `selectedIDE`, `activeIDEChanged` → `ideSelectedChanged`
- [ ] `frontend/src/presentation/components/chat/main/ProjectCommandButtons.jsx` - `activePort` → `selectedIDE`

### Infrastructure (3 files):
- [ ] `frontend/src/infrastructure/stores/IDEStore.jsx` - `activePort` → `selectedIDE`, `setActivePort` → `setSelectedIDE`, `loadActivePort` → `loadSelectedIDE`
- [ ] `frontend/src/infrastructure/services/WebSocketService.jsx` - `activeIDEChanged` → `ideSelectedChanged`
- [ ] `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - `activeIDE` → `selectedIDE`

### Hooks and Utilities (2 files):
- [ ] `frontend/src/hooks/usePortConfiguration.js` - `setActivePort` → `setSelectedIDE`
- [ ] `frontend/src/presentation/components/Footer.jsx` - `activePort` → `selectedIDE`, `activeIDE` → `selectedIDE`

### Git Components (2 files):
- [ ] `frontend/src/presentation/components/git/pidea-agent/PideaAgentBranchComponent.jsx` - `activePort` → `selectedIDE`, `activeIDE` → `selectedIDE`
- [ ] `frontend/src/presentation/components/git/main/GitManagementComponent.jsx` - `activePort` → `selectedIDE`, `activeIDE` → `selectedIDE`

## Implementation Steps

### Step 1: State Management Refactoring (1 hour)
1. Update `IDEStore.jsx`:
   - `activePort` → `selectedIDE`
   - `setActivePort` → `setSelectedIDE`
   - `loadActivePort` → `loadSelectedIDE`
   - Update all method implementations

2. Update `IDEContext.jsx`:
   - `activePort` → `selectedIDE`
   - `setActivePort` → `setSelectedIDE`
   - `loadActivePort` → `loadSelectedIDE`
   - Update context provider and consumer

### Step 2: Core Components Refactoring (1 hour)
1. Update `App.jsx`:
   - `activePort` → `selectedIDE`
   - `activeIDEChanged` → `ideSelectedChanged`
   - Update event handlers and component props

2. Update `SidebarLeft.jsx`:
   - `activePort` → `selectedIDE`
   - `activeIDEChanged` → `ideSelectedChanged`
   - Update UI logic and event handling

3. Update `SidebarRight.jsx`:
   - `activePort` → `selectedIDE`

### Step 3: IDE Components Refactoring (1 hour)
1. Update `IDESelector.jsx`:
   - `activeIDEChanged` → `ideSelectedChanged`
   - `isActive` → `isSelected`
   - Update UI logic for selected state

2. Update chat components:
   - `ChatComponent.jsx`: `activePort` → `selectedIDE`
   - `PreviewComponent.jsx`: `activePort` → `selectedIDE`, `activeIDEChanged` → `ideSelectedChanged`
   - `ProjectCommandButtons.jsx`: `activePort` → `selectedIDE`

### Step 4: Infrastructure Refactoring (30 minutes)
1. Update `WebSocketService.jsx`:
   - `activeIDEChanged` → `ideSelectedChanged`
   - Update event handling methods

2. Update `APIChatRepository.jsx`:
   - `activeIDE` → `selectedIDE`

3. Update `usePortConfiguration.js`:
   - `setActivePort` → `setSelectedIDE`

### Step 5: Additional Components Refactoring (30 minutes)
1. Update `Footer.jsx`:
   - `activePort` → `selectedIDE`
   - `activeIDE` → `selectedIDE`

2. Update Git components:
   - `PideaAgentBranchComponent.jsx`: `activePort` → `selectedIDE`, `activeIDE` → `selectedIDE`
   - `GitManagementComponent.jsx`: `activePort` → `selectedIDE`, `activeIDE` → `selectedIDE`

## Naming Convention Changes

### State Variables:
```javascript
// OLD → NEW
activePort → selectedIDE
activeIDE → selectedIDE
isActive → isSelected
```

### Method Names:
```javascript
// OLD → NEW
setActivePort → setSelectedIDE
loadActivePort → loadSelectedIDE
getActivePort → getSelectedIDE   // Returns selectedIDE object
getActiveIDE → getSelectedIDE    // Returns selectedIDE object
```

### Events:
```javascript
// OLD → NEW
'activeIDEChanged' → 'ideSelectedChanged'
'activePortChanged' → 'selectedIDEChanged'
```

### Props and Component State:
```javascript
// OLD → NEW
activePort={port} → selectedIDE={ide}
isActive={true} → isSelected={true}
onActivePortChange → onSelectedIDEChange
activeIDE={ide} → selectedIDE={ide}
```

### UI Text:
```javascript
// OLD → NEW
"Active IDE" → "Selected IDE"
"Set Active" → "Select"
"Active Port" → "Selected Port"
"IDE is active" → "IDE is selected"
```

### ✅ **CLEAN FRONTEND IMPLEMENTATION:**
```javascript
// Zustand Store - Single source of truth
const useIDEStore = create((set, get) => ({
  selectedIDE: null,  // Only track IDE object
  
  setSelectedIDE: (ide) => set({ selectedIDE: ide }),
  
  getSelectedPort: () => {
    const { selectedIDE } = get();
    return selectedIDE?.port || null;
  }
}));

// Component usage
const { selectedIDE, setSelectedIDE, getSelectedPort } = useIDEStore();
const selectedPort = getSelectedPort();  // Derived from selectedIDE.port
```

## Testing Strategy

### Component Tests:
- [ ] Test all components render correctly with new props
- [ ] Verify state management works with new naming
- [ ] Test event handling with new event names

### Integration Tests:
- [ ] Test IDE selection flow with new naming
- [ ] Verify WebSocket events work with new names
- [ ] Test component communication with new props

### UI Tests:
- [ ] Verify all UI text displays correctly
- [ ] Test component interactions work as expected
- [ ] Ensure accessibility labels are updated

## Success Criteria
- [ ] All 15 frontend files updated with new naming
- [ ] All component props use 'selected' terminology
- [ ] All state variables use 'selected' terminology
- [ ] All UI text uses 'selected' instead of 'active'
- [ ] All event handlers work with new event names
- [ ] All frontend tests pass with new naming
- [ ] No breaking changes to existing functionality
- [ ] UI components render and interact correctly

## Risk Mitigation
- **Breaking Changes**: Test each component individually before moving to next
- **State Management**: Ensure Zustand store updates don't break existing functionality
- **Event System**: Maintain compatibility with backend events from Phase 1
- **UI Consistency**: Ensure all UI text is updated consistently

## Validation Checklist
- [ ] All component props updated consistently
- [ ] All state variables updated consistently
- [ ] All method names updated consistently
- [ ] All UI text updated consistently
- [ ] All event handlers updated consistently
- [ ] No references to old naming remain
- [ ] All tests pass
- [ ] Frontend functionality works correctly
- [ ] UI components render correctly
- [ ] Event system works with new names

## Next Phase Preparation
- [ ] Document any component API changes for testing team
- [ ] Update component documentation with new prop names
- [ ] Ensure all frontend components are stable
- [ ] Prepare for testing and documentation in Phase 3 