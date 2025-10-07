# Active to Selected Naming Refactor – Phase 3: Testing & Documentation

## Overview
This phase focuses on updating all tests and documentation to use the new 'selected' terminology instead of 'active'. This includes unit tests, integration tests, API documentation, and user guides. This phase validates the refactoring completed in Phases 1 and 2.

## Objectives
- [ ] Update all test files to use new naming conventions
- [ ] Refactor test mocks and assertions with new terminology
- [ ] Update API documentation with new field names
- [ ] Modify user guides and troubleshooting documentation
- [ ] Create comprehensive naming conventions guide
- [ ] Validate all functionality works with new naming

## Deliverables
- **Files**: 8 test files + 6 documentation files updated
- **Tests**: All tests pass with new naming conventions
- **Documentation**: All guides updated with 'selected' terminology
- **API Docs**: Updated with new field names and examples
- **Naming Guide**: Comprehensive naming conventions document

## Dependencies
- **Requires**: Phase 1 & 2 completion (backend & frontend refactor)
- **Blocks**: None (final validation phase)

## Estimated Time
4 hours

## Files to Modify

### Test Files (8 files):
- [ ] `tests/unit/usePortConfiguration.test.js` - `setActivePort` → `setSelectedIDE`
- [ ] `tests/integration/usePortConfiguration.test.js` - `setActivePort` → `setSelectedIDE`
- [ ] `tests/integration/IDESendMessageStep.test.js` - `getActivePort` → `getSelectedIDE`
- [ ] `tests/integration/PreviewComponent.test.jsx` - `activePort` → `selectedIDE`, `activeIDEChanged` → `ideSelectedChanged`
- [ ] `tests/unit/ProjectCommandButtons.test.jsx` - `activePort` → `selectedIDE`
- [ ] `frontend/tests/integration/PreviewComponent.test.jsx` - `activeIDEChanged` → `ideSelectedChanged`

### Documentation Files (6 files):
- [ ] `docs/04_ide-support/ide-port-management.md` - `activePort` → `selectedIDE`, `setActivePort` → `setSelectedIDE`, `loadActivePort` → `loadSelectedIDE`
- [ ] `docs/04_ide-support/ide-components.md` - `activePort` → `selectedIDE`, `setActivePort` → `setSelectedIDE`
- [ ] `docs/04_ide-support/ide-integration-guide.md` - `activePort` → `selectedIDE`, `setActivePort` → `setSelectedIDE`
- [ ] `docs/04_ide-support/troubleshooting.md` - `activeIDEChanged` → `ideSelectedChanged`, `setActivePort` → `setSelectedIDE`, `loadActivePort` → `loadSelectedIDE`
- [ ] `docs/03_features/ide-integration.md` - `getActiveIDE` → `getSelectedIDE`, `activeIDEChanged` → `ideSelectedChanged`
- [ ] `docs/03_features/websocket.md` - `activeIDEChanged` → `ideSelectedChanged`

### Files to Create:
- [ ] `docs/architecture/naming-conventions.md` - Comprehensive naming conventions guide
- [ ] `tests/unit/naming/SelectedTerminology.test.js` - Naming consistency tests

## Implementation Steps

### Step 1: Unit Tests Refactoring (1 hour)
1. Update `usePortConfiguration.test.js`:
   - `setActivePort` → `setSelectedIDE`
   - Update all test descriptions and assertions
   - Update mock function names

2. Update `ProjectCommandButtons.test.jsx`:
   - `activePort` → `selectedIDE`
   - Update component props and test data
   - Update test descriptions

3. Create `SelectedTerminology.test.js`:
   - Test naming consistency across the system
   - Validate no 'active' terminology remains
   - Test event naming conventions

### Step 2: Integration Tests Refactoring (1 hour)
1. Update `usePortConfiguration.test.js` (integration):
   - `setActivePort` → `setSelectedIDE`
   - Update integration test scenarios
   - Update mock implementations

2. Update `IDESendMessageStep.test.js`:
   - `getActivePort` → `getSelectedIDE`
   - Update test scenarios and mocks
   - Update test descriptions

3. Update `PreviewComponent.test.jsx` (both locations):
   - `activePort` → `selectedIDE`
   - `activeIDEChanged` → `ideSelectedChanged`
   - Update event handling tests
   - Update component prop tests

### Step 3: API Documentation Refactoring (1 hour)
1. Update `ide-port-management.md`:
   - `activePort` → `selectedIDE`
   - `setActivePort` → `setSelectedIDE`
   - `loadActivePort` → `loadSelectedIDE`
   - Update all code examples and descriptions

2. Update `ide-components.md`:
   - `activePort` → `selectedIDE`
   - `setActivePort` → `setSelectedIDE`
   - Update component documentation and examples

3. Update `ide-integration-guide.md`:
   - `activePort` → `selectedIDE`
   - `setActivePort` → `setSelectedIDE`
   - Update integration examples and tutorials

### Step 4: Feature Documentation Refactoring (30 minutes)
1. Update `ide-integration.md`:
   - `getActiveIDE` → `getSelectedIDE`
   - `activeIDEChanged` → `ideSelectedChanged`
   - Update feature descriptions and examples

2. Update `websocket.md`:
   - `activeIDEChanged` → `ideSelectedChanged`
   - Update WebSocket event documentation
   - Update event handling examples

3. Update `troubleshooting.md`:
   - `activeIDEChanged` → `ideSelectedChanged`
   - `setActivePort` → `setSelectedIDE`
   - `loadActivePort` → `loadSelectedIDE`
   - Update troubleshooting scenarios and solutions

### Step 5: Naming Conventions Guide Creation (30 minutes)
1. Create `naming-conventions.md`:
   - Document new naming conventions
   - Provide migration examples
   - Include best practices
   - Add validation checklist

## Naming Convention Changes

### Test Method Names:
```javascript
// OLD → NEW
setActivePort → setSelectedIDE
getActivePort → getSelectedIDE
loadActivePort → loadSelectedIDE
```

### Test Variables:
```javascript
// OLD → NEW
activePort → selectedIDE
activeIDE → selectedIDE
isActive → isSelected
```

### Test Descriptions:
```javascript
// OLD → NEW
"should set active port" → "should set selected IDE"
"when IDE is active" → "when IDE is selected"
"active port validation" → "selected IDE validation"
```

### Documentation Examples:
```javascript
// OLD → NEW
const { activePort, setActivePort } = useIDEStore();
const { selectedIDE, setSelectedIDE } = useIDEStore();
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

## Testing Strategy

### Unit Tests:
- [ ] Test all renamed methods work correctly
- [ ] Verify test mocks use new naming
- [ ] Test component props with new names
- [ ] Validate test descriptions are updated

### Integration Tests:
- [ ] Test end-to-end flows with new naming
- [ ] Verify event handling with new event names
- [ ] Test API responses with new field names
- [ ] Validate component communication

### Naming Consistency Tests:
- [ ] Test no 'active' terminology remains in code
- [ ] Verify all 'selected' terminology is consistent
- [ ] Test event naming follows conventions
- [ ] Validate API field naming

## Success Criteria
- [ ] All 8 test files updated with new naming
- [ ] All 6 documentation files updated with new terminology
- [ ] All tests pass with new naming conventions
- [ ] All documentation examples use new terminology
- [ ] Naming conventions guide is comprehensive
- [ ] No references to old naming remain
- [ ] All functionality validated with new naming
- [ ] Documentation is clear and consistent

## Risk Mitigation
- **Test Failures**: Update tests alongside code changes
- **Documentation Accuracy**: Ensure examples match actual implementation
- **Naming Consistency**: Use automated tools to validate naming
- **User Confusion**: Provide clear migration guides

## Validation Checklist
- [ ] All test method names updated consistently
- [ ] All test variables updated consistently
- [ ] All test descriptions updated consistently
- [ ] All documentation examples updated consistently
- [ ] All API documentation updated consistently
- [ ] Naming conventions guide is complete
- [ ] No references to old naming remain
- [ ] All tests pass
- [ ] All documentation is accurate
- [ ] Naming consistency is validated

## Documentation Standards

### Code Examples:
- Use new naming conventions in all examples
- Include before/after migration examples
- Provide clear migration steps
- Include error handling examples

### API Documentation:
- Update all field names to use 'selected' terminology
- Include request/response examples with new naming
- Document event names and payloads
- Provide integration examples

### User Guides:
- Update all user-facing text to use 'selected' terminology
- Include screenshots with updated UI text
- Provide troubleshooting with new naming
- Include migration guides for users

## Next Steps
- [ ] Deploy the refactored system
- [ ] Monitor for any naming-related issues
- [ ] Gather feedback on new terminology
- [ ] Plan future naming improvements
- [ ] Document lessons learned

## Final Validation
- [ ] Complete system test with new naming
- [ ] Verify all functionality works correctly
- [ ] Confirm documentation is accurate
- [ ] Validate naming consistency across the system
- [ ] Ensure no breaking changes were introduced 