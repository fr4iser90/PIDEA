# Workspace Detection Modernization – Phase 3: Service Integration

## Overview
Integrate the new CDP-based detection services into the existing application architecture. This phase updates IDEManager, application services, and dependency injection to use the modern CDP approach while maintaining backward compatibility.

## Objectives
- [ ] Update IDEManager to use new CDP-based detectors
- [ ] Update ProjectApplicationService workspace detection calls
- [ ] Update WorkflowApplicationService workspace detection calls
- [ ] Update ServiceContainer dependency injection
- [ ] Maintain backward compatibility during transition

## Deliverables
- File: `backend/infrastructure/external/ide/IDEManager.js` - Updated with CDP integration
- File: `backend/application/services/ProjectApplicationService.js` - Updated workspace detection calls
- File: `backend/application/services/WorkflowApplicationService.js` - Updated workspace detection calls
- File: `backend/infrastructure/dependency-injection/ServiceContainer.js` - Updated service registration
- File: `backend/tests/integration/CDPWorkspaceDetection.test.js` - Integration tests
- Documentation: Service integration guide and migration notes

## Dependencies
- Requires: Phase 2 (Core CDP Detection Services) completion
- Blocks: Phase 4 (Testing & Validation) start

## Estimated Time
3 hours

## Success Criteria
- [ ] IDEManager successfully uses CDP-based detection with fallback
- [ ] Application services use new detection methods
- [ ] Service container properly registers CDP services
- [ ] Backward compatibility maintained during transition
- [ ] Integration tests pass
- [ ] No regression in existing functionality

## Technical Implementation Details

### IDEManager Integration
```javascript
// In IDEManager.js
class IDEManager {
  constructor(browserManager = null, eventBus = null, gitService = null) {
    // ... existing initialization ...
    
    // Initialize CDP-based detection
    this.cdpWorkspaceDetector = null;
    this.cdpGitDetector = null;
    this.cdpConnectionManager = null;
    
    if (browserManager) {
      try {
        this.cdpConnectionManager = new CDPConnectionManager(browserManager.connectionPool);
        this.cdpWorkspaceDetector = new CDPWorkspaceDetector(this.cdpConnectionManager);
        this.cdpGitDetector = new CDPGitDetector(this.cdpConnectionManager);
      } catch (error) {
        logger.warn('Could not initialize CDP detectors:', error.message);
      }
    }
  }
  
  async detectWorkspacePath(port) {
    try {
      // Use CDP-based detection exclusively
      const workspaceInfo = await this.cdpWorkspaceDetector.detectWorkspace(port);
      if (workspaceInfo && workspaceInfo.workspacePath) {
        logger.info(`CDP detected workspace: ${workspaceInfo.workspacePath}`);
        this.ideWorkspaces.set(port, workspaceInfo.workspacePath);
        await this.createProjectInDatabase(workspaceInfo.workspacePath, port);
        return workspaceInfo.workspacePath;
      }
      
      logger.error('CDP workspace detection failed - no workspace found');
      return null;
      
    } catch (error) {
      logger.error('CDP workspace detection error:', error);
      return null;
    }
  }
}
```

### ServiceContainer Updates
```javascript
// In ServiceContainer.js or ServiceRegistry.js
registerWorkspaceServices() {
  // Register CDP services
  this.container.register('cdpConnectionManager', () => {
    const browserManager = this.container.resolve('browserManager');
    return new CDPConnectionManager(browserManager.connectionPool);
  }, { singleton: true, dependencies: ['browserManager'] });
  
  this.container.register('cdpWorkspaceDetector', () => {
    const cdpConnectionManager = this.container.resolve('cdpConnectionManager');
    return new CDPWorkspaceDetector(cdpConnectionManager);
  }, { singleton: true, dependencies: ['cdpConnectionManager'] });
  
  this.container.register('cdpGitDetector', () => {
    const cdpConnectionManager = this.container.resolve('cdpConnectionManager');
    return new CDPGitDetector(cdpConnectionManager);
  }, { singleton: true, dependencies: ['cdpConnectionManager'] });
}
```

### Application Service Updates
```javascript
// In ProjectApplicationService.js
class ProjectApplicationService {
  constructor({
    projectRepository,
    ideManager,
    workspacePathDetector,
    projectMappingService,
    logger
  }) {
    // ... existing initialization ...
  }
  
  async detectWorkspacePath() {
    try {
      // Use IDEManager's CDP-based detection exclusively
      const activePort = this.ideManager.getActivePort();
      if (activePort) {
        const workspacePath = await this.ideManager.detectWorkspacePath(activePort);
        if (workspacePath) {
          return workspacePath;
        }
      }
      
      this.logger.error('No active IDE port found for workspace detection');
      return null;
      
    } catch (error) {
      this.logger.error('CDP workspace detection failed:', error);
      return null;
    }
  }
}
```

### Clean Migration Strategy
- Complete replacement of FileBasedWorkspaceDetector with CDP-based system
- No fallback to legacy terminal-based detection
- Comprehensive testing ensures CDP system works reliably
- Clean codebase without legacy complexity

### Integration Testing
- Test CDP detection with real IDE instances
- Test error handling and recovery mechanisms
- Test service container resolution
- Test application service integration
- Validate CDP system reliability across different IDE types

## Risk Mitigation
- **Integration Failures**: Comprehensive testing and validation before deployment
- **Service Resolution Issues**: Proper dependency injection setup
- **CDP Reliability**: Extensive testing with different IDE types and configurations
- **Performance Issues**: Monitor and optimize CDP connection management
