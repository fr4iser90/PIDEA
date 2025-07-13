# Modular IDE Commands – Phase 2: Terminal & Analysis Commands

## Overview
This phase implements terminal and analysis commands that leverage existing TerminalMonitor, WorkspacePathDetector, and PackageJsonAnalyzer services to provide comprehensive IDE automation capabilities.

## Objectives
- [ ] Create terminal commands (OpenTerminal, ExecuteTerminal, MonitorTerminal, RestartUserApp, TerminalLogCapture)
- [ ] Create analysis commands (AnalyzeProject, AnalyzeAgain, GetWorkspaceInfo, DetectPackageJson)
- [ ] Create corresponding handlers with selector integration
- [ ] Create IDEAutomationService for unified IDE automation

## Deliverables

### Terminal Commands
- **File**: `backend/application/commands/categories/ide/OpenTerminalCommand.js` - Open IDE terminal
- **File**: `backend/application/commands/categories/ide/ExecuteTerminalCommand.js` - Execute terminal command
- **File**: `backend/application/commands/categories/ide/MonitorTerminalOutputCommand.js` - Monitor terminal output
- **File**: `backend/application/commands/categories/ide/RestartUserAppCommand.js` - Restart user application
- **File**: `backend/application/commands/categories/ide/TerminalLogCaptureCommand.js` - Capture terminal logs

### Analysis Commands
- **File**: `backend/application/commands/categories/ide/AnalyzeProjectCommand.js` - Analyze project structure
- **File**: `backend/application/commands/categories/ide/AnalyzeAgainCommand.js` - Re-analyze project
- **File**: `backend/application/commands/categories/ide/GetWorkspaceInfoCommand.js` - Get workspace information
- **File**: `backend/application/commands/categories/ide/DetectPackageJsonCommand.js` - Detect package.json and dev server

### Terminal Handlers
- **File**: `backend/application/handlers/categories/ide/OpenTerminalHandler.js` - Handle terminal operations
- **File**: `backend/application/handlers/categories/ide/ExecuteTerminalHandler.js` - Handle command execution
- **File**: `backend/application/handlers/categories/ide/MonitorTerminalOutputHandler.js` - Handle terminal monitoring
- **File**: `backend/application/handlers/categories/ide/RestartUserAppHandler.js` - Handle app restart
- **File**: `backend/application/handlers/categories/ide/TerminalLogCaptureHandler.js` - Handle log capture

### Analysis Handlers
- **File**: `backend/application/handlers/categories/ide/AnalyzeProjectHandler.js` - Handle project analysis
- **File**: `backend/application/handlers/categories/ide/AnalyzeAgainHandler.js` - Handle re-analysis
- **File**: `backend/application/handlers/categories/ide/GetWorkspaceInfoHandler.js` - Handle workspace info
- **File**: `backend/application/handlers/categories/ide/DetectPackageJsonHandler.js` - Handle package.json detection

### Domain Services
- **File**: `backend/domain/services/IDEAutomationService.js` - Unified IDE automation

## Dependencies
- Requires: Phase 1 completion (IDE category, ChatSessionService)
- Requires: TerminalMonitor, WorkspacePathDetector, PackageJsonAnalyzer
- Blocks: Phase 3 start (browser/IDE commands and integration)

## Estimated Time
2 hours

## Implementation Details

### 1. Terminal Commands Implementation
All terminal commands should:
- Use existing TerminalMonitor service for terminal operations
- Support IDE-specific terminal shortcuts (Ctrl+` for VSCode, Ctrl+Shift+` for Cursor)
- Integrate with BrowserManager for IDE automation
- Include proper error handling and timeout management
- Support multiple IDE types with appropriate selectors

### 2. Analysis Commands Implementation
All analysis commands should:
- Leverage existing PackageJsonAnalyzer for project analysis
- Use WorkspacePathDetector for workspace information
- Integrate with existing analysis services
- Support caching and result persistence
- Include comprehensive error handling

### 3. Terminal Handlers Implementation
All terminal handlers should:
- Use IDEAutomationService for unified automation
- Integrate with existing IDE services
- Support real-time terminal monitoring
- Include proper validation and error handling
- Follow existing Handler pattern structure

### 4. Analysis Handlers Implementation
All analysis handlers should:
- Use existing analysis infrastructure
- Support multiple analysis types
- Integrate with workspace detection
- Include result caching and optimization
- Follow existing Handler pattern structure

### 5. IDEAutomationService
Implement unified IDE automation service:
- Terminal operation management
- Analysis operation orchestration
- IDE type detection and routing
- Selector management and fallbacks
- Event publishing for automation events

## Key Integration Points

### TerminalMonitor Integration
```javascript
// Use existing TerminalMonitor service
const terminalMonitor = new TerminalMonitor(browserManager, eventBus);
const result = await terminalMonitor.monitorTerminalOutput();
```

### PackageJsonAnalyzer Integration
```javascript
// Use existing PackageJsonAnalyzer service
const packageJsonAnalyzer = new PackageJsonAnalyzer(eventBus);
const analysis = await packageJsonAnalyzer.analyzePackageJsonInPath(workspacePath);
```

### WorkspacePathDetector Integration
```javascript
// Use existing WorkspacePathDetector service
const workspacePathDetector = new WorkspacePathDetector(browserManager, ideManager);
const workspaceInfo = await workspacePathDetector.detectWorkspacePath(port);
```

## Success Criteria
- [ ] All 5 terminal commands created and functional
- [ ] All 4 analysis commands created and functional
- [ ] All 9 handlers created and functional
- [ ] IDEAutomationService implemented with unified automation
- [ ] All commands integrate with existing services
- [ ] All commands support multiple IDE types
- [ ] Terminal monitoring and log capture working
- [ ] Project analysis and workspace detection working
- [ ] Basic tests passing
- [ ] No build errors

## Testing Requirements
- [ ] Unit tests for all terminal commands
- [ ] Unit tests for all analysis commands
- [ ] Unit tests for all handlers
- [ ] Unit tests for IDEAutomationService
- [ ] Integration tests for terminal operations
- [ ] Integration tests for analysis operations
- [ ] Tests for multiple IDE type support

## Risk Mitigation
- **Terminal Automation Failures**: Use existing proven TerminalMonitor patterns
- **Analysis Performance Issues**: Implement caching and optimization
- **IDE Selector Changes**: Use IDETypes system with fallback selectors
- **Integration Complexity**: Leverage existing service infrastructure

## Performance Considerations
- **Terminal Monitoring**: Implement efficient monitoring with proper cleanup
- **Analysis Caching**: Cache analysis results to avoid repeated processing
- **Workspace Detection**: Optimize workspace detection for speed
- **Event Handling**: Efficient event publishing and subscription

## Next Phase Dependencies
This phase must be completed before Phase 3 can begin, as Phase 3 will build upon the IDEAutomationService and may integrate terminal and analysis capabilities with browser/IDE commands for comprehensive workflows. 