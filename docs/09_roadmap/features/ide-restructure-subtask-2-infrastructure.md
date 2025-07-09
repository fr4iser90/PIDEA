# IDE Organization Restructure - Subtask 2: Infrastructure Restructure

## 1. Project Overview
- **Subtask Name**: IDE Infrastructure Restructure Implementation
- **Priority**: High (Builds on Subtask 1)
- **Estimated Time**: 15 hours
- **Dependencies**: Subtask 1 (Core Abstraction Layer)
- **Related Issues**: Unify IDE detection and startup, implement configuration management
- **Current State**: Separate IDE detectors and starters, no unified management

## 2. Technical Requirements
- **Tech Stack**: Node.js, Playwright, Chrome DevTools Protocol (CDP)
- **Architecture Pattern**: Factory pattern for detectors and starters
- **Database Changes**: Add IDE configuration tables
- **API Changes**: None (this subtask focuses on infrastructure)
- **Frontend Changes**: None (this subtask focuses on infrastructure)
- **Backend Changes**: Unified IDE infrastructure layer

## 3. File Impact Analysis

### Files to Create:
- [ ] `backend/infrastructure/external/ide/IDEDetectorFactory.js` - IDE detection factory
- [ ] `backend/infrastructure/external/ide/IDEStarterFactory.js` - IDE startup factory
- [ ] `backend/infrastructure/external/ide/IDEManager.js` - Unified IDE manager
- [ ] `backend/infrastructure/external/ide/IDEConfigManager.js` - IDE configuration management
- [ ] `backend/infrastructure/external/ide/IDEHealthMonitor.js` - IDE health monitoring
- [ ] `backend/infrastructure/external/ide/detectors/CursorDetector.js` - Cursor detection
- [ ] `backend/infrastructure/external/ide/detectors/VSCodeDetector.js` - VSCode detection
- [ ] `backend/infrastructure/external/ide/detectors/WindsurfDetector.js` - Windsurf detection
- [ ] `backend/infrastructure/external/ide/starters/CursorStarter.js` - Cursor startup
- [ ] `backend/infrastructure/external/ide/starters/VSCodeStarter.js` - VSCode startup
- [ ] `backend/infrastructure/external/ide/starters/WindsurfStarter.js` - Windsurf startup

### Files to Modify:
- [ ] `backend/infrastructure/external/IDEDetector.js` - Refactor to use factory pattern
- [ ] `backend/infrastructure/external/IDEStarter.js` - Refactor to use factory pattern
- [ ] `backend/infrastructure/external/IDEManager.js` - Extend for multi-IDE support
- [ ] `backend/infrastructure/database/` - Add IDE configuration tables

## 4. Implementation Steps

### Step 1: Create IDE Detector Factory (3 hours)
- [ ] Implement `IDEDetectorFactory.js`:
  - `createDetector(type)` - Create detector by IDE type
  - `registerDetector(type, detector)` - Register new detector
  - `getAvailableDetectors()` - Get list of available detectors
  - `detectAll()` - Detect all available IDEs

### Step 2: Create IDE Starter Factory (3 hours)
- [ ] Implement `IDEStarterFactory.js`:
  - `createStarter(type)` - Create starter by IDE type
  - `registerStarter(type, starter)` - Register new starter
  - `getAvailableStarters()` - Get list of available starters
  - `startIDE(type, options)` - Start IDE with options

### Step 3: Create IDE-Specific Detectors (4 hours)
- [ ] Create `detectors/CursorDetector.js`:
  - Detect Cursor processes
  - Check Cursor installation
  - Validate Cursor version
- [ ] Create `detectors/VSCodeDetector.js`:
  - Detect VSCode processes
  - Check VSCode installation
  - Validate VSCode version
- [ ] Create `detectors/WindsurfDetector.js`:
  - Detect Windsurf processes
  - Check Windsurf installation
  - Validate Windsurf version

### Step 4: Create IDE-Specific Starters (3 hours)
- [ ] Create `starters/CursorStarter.js`:
  - Start Cursor with options
  - Handle Cursor-specific startup
  - Manage Cursor processes
- [ ] Create `starters/VSCodeStarter.js`:
  - Start VSCode with options
  - Handle VSCode-specific startup
  - Manage VSCode processes
- [ ] Create `starters/WindsurfStarter.js`:
  - Start Windsurf with options
  - Handle Windsurf-specific startup
  - Manage Windsurf processes

### Step 5: Implement Configuration Management (2 hours)
- [ ] Create `IDEConfigManager.js`:
  - Load IDE configurations
  - Save IDE configurations
  - Validate configurations
  - Default configuration management

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules
- **Naming Conventions**: camelCase for methods, PascalCase for classes
- **Error Handling**: IDE-specific error types
- **Logging**: Winston logger with IDE context
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods

## 6. Testing Strategy

### Unit Tests:
- [ ] `tests/unit/infrastructure/ide/IDEDetectorFactory.test.js` - Detector factory tests
- [ ] `tests/unit/infrastructure/ide/IDEStarterFactory.test.js` - Starter factory tests
- [ ] `tests/unit/infrastructure/ide/IDEManager.test.js` - IDE manager tests
- [ ] `tests/unit/infrastructure/ide/IDEConfigManager.test.js` - Config manager tests
- [ ] `tests/unit/infrastructure/ide/IDEHealthMonitor.test.js` - Health monitor tests

### Integration Tests:
- [ ] `tests/integration/ide/IDEDetection.test.js` - IDE detection integration
- [ ] `tests/integration/ide/IDEStartup.test.js` - IDE startup integration
- [ ] `tests/integration/ide/IDEManagement.test.js` - IDE management integration

## 7. Success Criteria
- [ ] Detector factory creates detectors correctly
- [ ] Starter factory creates starters correctly
- [ ] All IDE-specific detectors implemented
- [ ] All IDE-specific starters implemented
- [ ] Configuration management working
- [ ] Health monitoring active
- [ ] All tests passing with 90% coverage

## 8. Risk Assessment

### High Risk:
- [ ] Breaking existing IDE detection - Mitigation: Comprehensive testing and gradual migration
- [ ] IDE startup failures - Mitigation: Robust error handling and fallbacks

### Medium Risk:
- [ ] Performance impact of factory pattern - Mitigation: Optimize factory implementations
- [ ] Configuration complexity - Mitigation: Simplified configuration schema

### Low Risk:
- [ ] IDE version compatibility - Mitigation: Version detection and validation
- [ ] Process management issues - Mitigation: Proper process cleanup

## 9. Deliverables
- [ ] IDE detector factory implementation
- [ ] IDE starter factory implementation
- [ ] IDE-specific detectors (Cursor, VSCode, Windsurf)
- [ ] IDE-specific starters (Cursor, VSCode, Windsurf)
- [ ] Configuration management system
- [ ] Health monitoring system
- [ ] Complete test suite
- [ ] JSDoc documentation

## 10. Dependencies for Next Subtask
- [ ] IDE detection working for all IDEs
- [ ] IDE startup working for all IDEs
- [ ] Configuration management stable
- [ ] Health monitoring active

---

## AI Auto-Implementation Instructions

### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/ide-restructure-subtask-2-infrastructure.md'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/ide-restructure-subtask-2",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 600
}
```

### Success Indicators:
- [ ] IDE detector factory implemented
- [ ] IDE starter factory implemented
- [ ] All IDE-specific detectors working
- [ ] All IDE-specific starters working
- [ ] Configuration management active
- [ ] All tests passing 