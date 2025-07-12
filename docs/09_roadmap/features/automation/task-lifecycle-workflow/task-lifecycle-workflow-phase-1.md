# Task Lifecycle Workflow - Phase 1: Chat Input Processing

## Phase Overview
**Duration**: 4 hours  
**Goal**: Enhance existing chat input processing with task-create.md prompt integration

## Tasks

### 1. Enhance ChatController.sendMessage()
- [ ] **File**: `backend/presentation/api/ChatController.js`
- [ ] **Enhance existing method**:
  - `sendMessage()` - Add task-create.md prompt detection
- [ ] **Add new functionality**:
  - Detect task-create.md prompt in chat input
  - Extract task requirements from message
  - Route to appropriate handler based on content type
- [ ] **Integration**: Use existing validation and error handling patterns

### 2. Enhance SendMessageHandler with Task Detection
- [ ] **File**: `backend/application/handlers/SendMessageHandler.js`
- [ ] **Enhance existing methods**:
  - `handle()` - Add task-create.md detection logic
  - `validateCommand()` - Add task prompt validation
- [ ] **Add new methods**:
  - `detectTaskCreatePrompt(message)`
  - `processTaskCreatePrompt(promptContent)`
  - `extractTaskRequirements(message)`
- [ ] **Integration**: Use existing IDE service selection logic

### 3. Enhance TaskService with Prompt Loading
- [ ] **File**: `backend/domain/services/TaskService.js`
- [ ] **Enhance existing methods**:
  - `buildTaskExecutionPrompt()` - Add task-create.md support
- [ ] **Add new methods**:
  - `loadTaskCreatePrompt()` - Load via API call to content library
  - `processTaskCreateContent(promptContent)`
  - `validateTaskCreatePrompt(content)`
- [ ] **Integration**: Use existing API call pattern for prompt loading

### 4. Enhance IDE Services with Task Support
- [ ] **File**: `backend/domain/services/CursorIDEService.js`
- [ ] **Enhance existing methods**:
  - `sendMessage()` - Add task-create.md support
- [ ] **Add new functionality**:
  - Send task-create.md prompt to IDE
  - Handle IDE response with task details
- [ ] **File**: `backend/domain/services/VSCodeService.js`
- [ ] **Enhance existing methods**:
  - `sendMessage()` - Add task-create.md support
- [ ] **Add new functionality**:
  - Send task-create.md prompt to IDE
  - Handle IDE response with task details

### 5. Create Prompt Processing Tests
- [ ] **File**: `tests/unit/ChatController.test.js`
- [ ] **File**: `tests/unit/SendMessageHandler.test.js`
- [ ] **File**: `tests/unit/TaskService.test.js`
- [ ] **Test coverage**: 90% minimum

## Success Criteria
- [ ] Chat input properly processed with task-create.md detection
- [ ] task-create.md prompt correctly loaded from content library
- [ ] task-create.md prompt correctly sent to IDE
- [ ] IDE response properly captured for next phase
- [ ] All existing functionality preserved

## Dependencies
- Existing ChatController.js
- Existing SendMessageHandler.js
- Existing TaskService.js
- Existing CursorIDEService.js
- Existing VSCodeService.js
- Existing content-library/prompts/task-management/task-create.md

## Next Phase
Phase 2: IDE Response & Task Review - Process IDE response and review tasks 