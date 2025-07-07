# Prompt: Create Comprehensive Refactoring Task Plan

## Goal
Generate a complete, actionable refactoring plan for large files (>500 LOC) that maintains existing functionality while improving code structure, readability, and maintainability.

## Template Structure

### 1. Refactoring Overview
- **File to Refactor**: [path/to/file.js]
- **Current Size**: [X lines of code]
- **Target Size**: [<500 lines per file]
- **Priority**: [High/Medium/Low based on complexity]
- **Estimated Time**: [X hours]
- **Risk Level**: [Low - no logic changes, only structure]

### 2. Current File Analysis
- **Main Responsibilities**: [List what this file currently does]
- **Code Smells Identified**: [Long functions, deep nesting, etc.]
- **Complexity Issues**: [Cyclomatic complexity, coupling]
- **Maintainability Score**: [Current vs Target]

### 3. Refactoring Strategy
#### Extract Functions:
- [ ] `extractValidationLogic()` - Move validation to separate function
- [ ] `extractDataProcessing()` - Move data processing logic
- [ ] `extractEventHandlers()` - Move event handling logic
- [ ] `extractUtilityFunctions()` - Move utility functions

#### Extract Classes/Components:
- [ ] `[ComponentName]Logic.js` - Extract business logic
- [ ] `[ComponentName]Utils.js` - Extract utility functions
- [ ] `[ComponentName]Types.js` - Extract type definitions
- [ ] `[ComponentName]Constants.js` - Extract constants

#### Split into Multiple Files:
- [ ] `[ComponentName]Core.js` - Core functionality
- [ ] `[ComponentName]Helpers.js` - Helper functions
- [ ] `[ComponentName]Validation.js` - Validation logic
- [ ] `[ComponentName]Events.js` - Event handling

### 4. File Impact Analysis
#### Files to Modify:
- [ ] `path/to/original-file.js` - Split into smaller modules
- [ ] `path/to/importing-files.js` - Update imports

#### Files to Create:
- [ ] `path/to/[ComponentName]Logic.js` - Extracted business logic
- [ ] `path/to/[ComponentName]Utils.js` - Extracted utilities
- [ ] `path/to/[ComponentName]Types.js` - Type definitions
- [ ] `path/to/[ComponentName]Constants.js` - Constants

#### Files to Delete:
- [ ] None (refactoring only, no deletion)

### 5. Implementation Phases

#### Phase 1: Analysis & Planning
- [ ] Analyze current file structure
- [ ] Identify extractable functions
- [ ] Plan new file organization
- [ ] Create backup of original file

#### Phase 2: Extract Functions
- [ ] Extract utility functions
- [ ] Extract validation logic
- [ ] Extract data processing
- [ ] Extract event handlers

#### Phase 3: Create New Files
- [ ] Create logic file
- [ ] Create utils file
- [ ] Create types file
- [ ] Create constants file

#### Phase 4: Update Original File
- [ ] Remove extracted code
- [ ] Add imports for new files
- [ ] Update function calls
- [ ] Clean up remaining code

#### Phase 5: Update Dependencies
- [ ] Update all importing files
- [ ] Update import statements
- [ ] Test all connections
- [ ] Verify functionality

#### Phase 6: Testing & Validation
- [ ] Run existing tests
- [ ] Verify no logic changes
- [ ] Check file sizes
- [ ] Validate imports

### 6. Code Standards & Patterns
- **Function Size**: Max 50 lines per function
- **File Size**: Max 500 lines per file
- **Nesting Depth**: Max 3 levels
- **Import Organization**: Group imports by type
- **Naming**: Use descriptive function/class names
- **Comments**: Add JSDoc for extracted functions

### 7. Refactoring Rules
#### DO:
- [ ] Extract functions without changing logic
- [ ] Maintain existing function signatures
- [ ] Keep same return values
- [ ] Preserve error handling
- [ ] Maintain backward compatibility

#### DON'T:
- [ ] Change business logic
- [ ] Modify function parameters
- [ ] Change return types
- [ ] Remove error handling
- [ ] Break existing tests

### 8. Testing Strategy
#### Before Refactoring:
- [ ] Document current behavior
- [ ] Run all existing tests
- [ ] Note test coverage
- [ ] Create behavior baseline

#### After Refactoring:
- [ ] Run same tests
- [ ] Verify identical results
- [ ] Check performance
- [ ] Validate all functionality

### 9. Success Criteria
- [ ] File size reduced to <500 lines
- [ ] All existing tests pass
- [ ] No logic changes detected
- [ ] Improved readability
- [ ] Better maintainability
- [ ] Cleaner imports

### 10. Rollback Plan
- [ ] Keep original file backup
- [ ] Document all changes made
- [ ] Have rollback script ready
- [ ] Test rollback procedure

### 11. File Structure Example
```
Before:
/components/LargeComponent.js (800 lines)
  - handleUserInput()
  - validateData()
  - processData()
  - renderUI()
  - handleEvents()
  - utilityFunctions()

After:
/components/LargeComponent.js (200 lines)
  - renderUI()
  - handleEvents()

/components/LargeComponentLogic.js (300 lines)
  - handleUserInput()
  - validateData()
  - processData()

/components/LargeComponentUtils.js (200 lines)
  - utilityFunctions()

/components/LargeComponentTypes.js (50 lines)
  - type definitions

/components/LargeComponentConstants.js (50 lines)
  - constants
```

### 12. Common Refactoring Patterns
#### React Components:
- Extract custom hooks
- Split into smaller components
- Move logic to separate files
- Extract constants and types

#### Node.js Files:
- Extract service classes
- Move utility functions
- Split route handlers
- Extract middleware

#### Utility Files:
- Group related functions
- Extract constants
- Create type definitions
- Split by functionality

---

## Usage Instructions

1. **Analyze the file** - Identify what can be extracted
2. **Plan the split** - Decide on new file structure
3. **Extract gradually** - One function/class at a time
4. **Test constantly** - Verify no logic changes
5. **Update imports** - Fix all dependencies
6. **Validate results** - Ensure everything works

## Example Usage

> Create a comprehensive refactoring plan for `/frontend/src/presentation/components/IDEMirrorComponent.jsx` (1137 lines) to split it into smaller, more maintainable files while preserving all existing functionality.
