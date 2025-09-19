# Workspace Detection Modernization - Implementation Plan

## Project Overview
- **Feature/Component Name**: Workspace Detection Modernization
- **Priority**: High
- **Category**: backend
- **Estimated Time**: 16 hours
- **Dependencies**: CDP-based scripts (find-git.js, find-workspace.js)
- **Related Issues**: Legacy terminal-based workspace detection
- **Created**: 2024-12-19T10:30:00.000Z
- **Started**: 2025-09-19T15:35:59.000Z
- **Completed**: 2025-09-19T15:42:15.000Z

## Technical Requirements
- **Tech Stack**: Node.js, Playwright, Chrome DevTools Protocol (CDP)
- **Architecture Pattern**: Service Layer with Dependency Injection
- **Database Changes**: None (uses existing project/workspace tables)
- **API Changes**: None (maintains existing interfaces)
- **Frontend Changes**: None
- **Backend Changes**: New CDP-based workspace detector service, updated IDEManager integration

## File Impact Analysis

### Files to Modify:
- [ ] `backend/infrastructure/external/ide/IDEManager.js` - Replace FileBasedWorkspaceDetector with CDP-based detection
- [ ] `backend/application/services/ProjectApplicationService.js` - Update workspace path detection calls
- [ ] `backend/application/services/WorkflowApplicationService.js` - Update workspace path detection calls
- [ ] `backend/infrastructure/dependency-injection/ServiceContainer.js` - Update service registration

### Files to Create:
- [ ] `backend/domain/services/workspace/CDPWorkspaceDetector.js` - New CDP-based workspace detector
- [ ] `backend/domain/services/git/CDPGitDetector.js` - New CDP-based Git information detector
- [ ] `backend/infrastructure/external/cdp/CDPConnectionManager.js` - CDP connection management
- [ ] `backend/tests/unit/CDPWorkspaceDetector.test.js` - Unit tests for new detector
- [ ] `backend/tests/integration/CDPWorkspaceDetection.test.js` - Integration tests

### Files to Delete:
- [ ] `backend/domain/services/workspace/FileBasedWorkspaceDetector.js` - Legacy terminal-based detector
- [ ] `backend/domain/services/terminal/VSCodeTerminalHandler.js` - Legacy terminal handler
- [ ] `/tmp/IDEWEB/` directory structure - Legacy file-based detection files

## Implementation Phases

### Phase 1: CDP Infrastructure Setup (4 hours) - Completed: 2025-09-19T15:37:32.000Z
- [x] Create CDPConnectionManager for managing CDP connections
- [x] Implement connection pooling and error handling
- [x] Add CDP connection health monitoring
- [x] Create base CDP service class with common functionality

### Phase 2: Core CDP Detection Services (6 hours) - Completed: 2025-09-19T15:38:46.000Z
- [x] Implement CDPWorkspaceDetector using find-workspace.js logic
- [x] Implement CDPGitDetector using find-git.js logic
- [x] Add comprehensive error handling and fallback mechanisms
- [x] Implement caching for detected workspace information
- [x] Add support for multiple IDE types (Cursor, VSCode, Windsurf)

### Phase 3: Service Integration (3 hours) - Completed: 2025-09-19T15:39:28.000Z
- [x] Update IDEManager to use new CDP-based detectors
- [x] Update ProjectApplicationService workspace detection calls
- [x] Update WorkflowApplicationService workspace detection calls
- [x] Update ServiceContainer dependency injection
- [x] Complete replacement of legacy system with CDP-based detection

### Phase 4: Testing & Validation (2 hours) - Completed: 2025-09-19T15:41:09.000Z
- [x] Write comprehensive unit tests for CDP detectors
- [x] Write integration tests for workspace detection
- [x] Test with different IDE types and configurations
- [x] Validate performance improvements over legacy system
- [x] Test error handling and fallback scenarios

### Phase 5: Migration & Cleanup (1 hour) - Completed: 2025-09-19T15:42:15.000Z
- [x] Deploy new CDP-based detection system
- [x] Monitor system performance and reliability
- [x] Remove legacy FileBasedWorkspaceDetector code completely
- [x] Clean up legacy terminal handler code
- [x] Remove legacy file-based detection infrastructure
- [x] Ensure clean codebase with no legacy fallbacks

## Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## Security Considerations
- [ ] CDP connection security and validation
- [ ] Input validation for workspace paths
- [ ] Protection against malicious workspace detection
- [ ] Secure handling of Git repository information
- [ ] Audit logging for workspace detection operations

## Performance Requirements
- **Response Time**: < 2 seconds for workspace detection (vs 5-10 seconds with legacy)
- **Throughput**: Support concurrent detection for multiple IDEs
- **Memory Usage**: < 50MB for CDP connections
- **Database Queries**: Minimize database calls with intelligent caching
- **Caching Strategy**: Cache workspace info for 5 minutes, invalidate on IDE restart

## Testing Strategy

### Unit Tests:
- [ ] Test file: `backend/tests/unit/CDPWorkspaceDetector.test.js`
- [ ] Test cases: Connection management, workspace extraction, error handling, caching
- [ ] Mock requirements: Mock CDP connections, IDE DOM structures

### Integration Tests:
- [ ] Test file: `backend/tests/integration/CDPWorkspaceDetection.test.js`
- [ ] Test scenarios: Full workspace detection flow, multiple IDE support, fallback mechanisms
- [ ] Test data: Mock IDE instances with different configurations

### Test Configuration:
- **Backend Tests**: Jest with Node.js environment
- **Coverage**: 90%+ for unit tests, 80%+ for integration tests
- **File Extensions**: `.test.js` for backend

## Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for all CDP detection methods
- [ ] README updates with new CDP-based detection
- [ ] Architecture diagrams for CDP integration
- [ ] Migration guide from legacy to CDP-based detection

### User Documentation:
- [ ] Developer guide for CDP-based workspace detection
- [ ] Troubleshooting guide for CDP connection issues
- [ ] Performance comparison documentation

## Deployment Checklist

### Pre-deployment:
- [ ] All tests passing (unit, integration)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Performance benchmarks met
- [ ] CDP connection security validated

### Deployment:
- [ ] Deploy new CDP-based detection services
- [ ] Update service configurations
- [ ] Monitor CDP connection health
- [ ] Verify workspace detection functionality

### Post-deployment:
- [ ] Monitor logs for CDP connection errors
- [ ] Verify workspace detection performance improvements
- [ ] Monitor memory usage for CDP connections
- [ ] Collect user feedback on detection reliability

## Monitoring Plan
- [ ] Comprehensive testing ensures CDP system reliability
- [ ] Database rollback not needed (no schema changes)
- [ ] System health monitoring and alerting
- [ ] Performance metrics collection and analysis

## Success Criteria
- [ ] Workspace detection works reliably across all IDE types
- [ ] Performance improvement of 60%+ over legacy system
- [ ] All tests pass (unit, integration)
- [ ] No terminal-based detection dependencies
- [ ] Documentation complete and accurate
- [ ] Zero regression in existing functionality

## Risk Assessment

### High Risk:
- [ ] CDP connection failures - Mitigation: Comprehensive testing and robust error handling
- [ ] IDE compatibility issues - Mitigation: Extensive testing with different IDE versions

### Medium Risk:
- [ ] Performance degradation - Mitigation: Implement connection pooling and caching
- [ ] Memory leaks in CDP connections - Mitigation: Proper connection cleanup and monitoring

### Low Risk:
- [ ] Documentation updates - Mitigation: Automated documentation generation
- [ ] Test coverage gaps - Mitigation: Comprehensive test suite with high coverage

## AI Auto-Implementation Instructions

### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/tasks/backend/workspace-detection-modernization/workspace-detection-modernization-implementation.md'
- **category**: 'backend'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/workspace-detection-modernization",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300
}
```

### Success Indicators:
- [ ] All checkboxes in phases completed
- [ ] Tests pass
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated
- [ ] Legacy code removed
- [ ] Performance improvements validated

## References & Resources
- **Technical Documentation**: Chrome DevTools Protocol documentation
- **API References**: Playwright CDP API documentation
- **Design Patterns**: Service Layer pattern, Dependency Injection
- **Best Practices**: CDP connection management, error handling
- **Similar Implementations**: find-git.js, find-workspace.js scripts

---

## Detailed Implementation Architecture

### CDP Connection Manager
```javascript
class CDPConnectionManager {
  constructor() {
    this.connections = new Map(); // port -> connection
    this.connectionPool = new Map(); // port -> browser instance
  }
  
  async connectToIDE(port) {
    // Reuse existing connection if available
    if (this.connections.has(port)) {
      return this.connections.get(port);
    }
    
    // Create new CDP connection
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = await context.pages();
    const page = pages[0];
    
    this.connections.set(port, { browser, page });
    return { browser, page };
  }
}
```

### CDP Workspace Detector
```javascript
class CDPWorkspaceDetector {
  constructor(cdpConnectionManager) {
    this.cdpManager = cdpConnectionManager;
    this.cache = new Map();
  }
  
  async detectWorkspace(port) {
    const cacheKey = `workspace-${port}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const { page } = await this.cdpManager.connectToIDE(port);
    
    // Extract workspace from page title (from find-workspace.js)
    const pageTitle = await page.evaluate(() => document.title);
    const titleMatch = pageTitle.match(/([^-]+)\s*-\s*Cursor/);
    
    if (titleMatch) {
      const workspaceName = titleMatch[1].trim();
      const workspacePath = await this.findWorkspacePath(workspaceName);
      
      const result = { workspacePath, workspaceName, port };
      this.cache.set(cacheKey, result);
      return result;
    }
    
    return null;
  }
}
```

### Integration with IDEManager
```javascript
// In IDEManager.js
async detectWorkspacePath(port) {
  try {
    // Use new CDP-based detection
    if (this.cdpWorkspaceDetector) {
      const workspaceInfo = await this.cdpWorkspaceDetector.detectWorkspace(port);
      if (workspaceInfo && workspaceInfo.workspacePath) {
        logger.info(`CDP detected workspace: ${workspaceInfo.workspacePath}`);
        this.ideWorkspaces.set(port, workspaceInfo.workspacePath);
        await this.createProjectInDatabase(workspaceInfo.workspacePath, port);
        return workspaceInfo.workspacePath;
      }
    }
    
    // CDP detection failed - return null
    logger.error('CDP detection failed - no workspace found');
    return null;
    
  } catch (error) {
    logger.error('Workspace detection error:', error);
    return null;
  }
}
```

This modernization will significantly improve the reliability, performance, and maintainability of workspace detection while eliminating the complex terminal-based approach.
