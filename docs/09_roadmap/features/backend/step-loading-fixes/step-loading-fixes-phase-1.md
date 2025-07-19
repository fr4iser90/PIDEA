# Phase 1: Fix Empty Step Files

## Phase Overview
Fix empty step files and missing module exports that are causing step loading failures during application startup.

## Estimated Time: 3 hours

## Objectives
- Fix completely empty step files
- Add missing module.exports to step classes
- Ensure all step files can be loaded successfully
- Test step loading for all affected categories

## Detailed Tasks

### 1. Fix Empty Step Files

#### 1.1 Fix `run_dev_step.js` (30 minutes)
**File**: `backend/domain/steps/categories/completion/run_dev_step.js`

**Current Issue**: File is completely empty (0 bytes)

**Solution**: Implement proper RunDevStep class

```javascript
/**
 * Run Dev Server Step
 * Starts the development server for the project
 */

const { BaseStep } = require('../../BaseStep');
const Logger = require('@logging/Logger');
const logger = new Logger('RunDevStep');

class RunDevStep extends BaseStep {
  constructor() {
    super({
      name: 'RUN_DEV_STEP',
      type: 'completion',
      category: 'completion',
      description: 'Starts the development server',
      version: '1.0.0',
      config: {
        required: ['projectPath'],
        optional: ['port', 'host', 'env']
      }
    });
  }

  async execute(context) {
    try {
      const { projectPath, port = 3000, host = 'localhost', env = 'development' } = context;
      
      logger.info('Executing RUN_DEV_STEP', {
        projectPath,
        port,
        host,
        env
      });

      // Get TerminalService from DI container
      const { getServiceRegistry } = require('@/infrastructure/di/ServiceRegistry');
      const serviceRegistry = getServiceRegistry();
      const terminalService = serviceRegistry.getContainer().resolve('terminalService');

      if (!terminalService) {
        throw new Error('TerminalService not available');
      }

      // Start dev server
      const command = `npm run dev`;
      const result = await terminalService.executeCommand(command, {
        cwd: projectPath,
        env: {
          ...process.env,
          NODE_ENV: env,
          PORT: port,
          HOST: host
        }
      });

      logger.info('RUN_DEV_STEP completed successfully', {
        success: result.success,
        output: result.output?.substring(0, 200) + '...'
      });

      return {
        success: result.success,
        command,
        output: result.output,
        error: result.error,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('RUN_DEV_STEP failed', {
        error: error.message,
        context
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = RunDevStep;
```

### 2. Fix Missing Module Exports

#### 2.1 Fix Cursor Step Exports (30 minutes)

**Files to fix**:
- `backend/domain/steps/categories/cursor/cursor_send_message.js`

**Issue**: Missing `module.exports` at end of files

**Note**: `cursor_get_response.js` already has proper module.exports ✅

**Solution**: Add proper exports

For `cursor_send_message.js`:
```javascript
// ... existing code ...

module.exports = CursorSendMessageStep;
```

#### 2.2 Fix IDE Step Exports (45 minutes)

**Files to fix**:
- `backend/domain/steps/categories/ide/dev_server_start_step.js`
- `backend/domain/steps/categories/ide/dev_server_stop_step.js`
- `backend/domain/steps/categories/ide/dev_server_restart_step.js`

**Issue**: Missing `module.exports` at end of files

**Note**: `ide_get_file_content.js` already has proper module.exports ✅

**Solution**: Add proper exports for each file

For `dev_server_start_step.js`:
```javascript
// ... existing code ...

module.exports = DevServerStartStep;
```

For `dev_server_stop_step.js`:
```javascript
// ... existing code ...

module.exports = DevServerStopStep;
```

For `dev_server_restart_step.js`:
```javascript
// ... existing code ...

module.exports = DevServerRestartStep;
```

#### 2.3 Fix Testing Step Exports (45 minutes)

**Files to fix**:
- `backend/domain/steps/categories/testing/project_build_step.js`
- `backend/domain/steps/categories/testing/project_health_check_step.js`
- `backend/domain/steps/categories/testing/project_test_step.js`

**Issue**: Missing `module.exports` at end of files

**Solution**: Add proper exports for each file

For `project_build_step.js`:
```javascript
// ... existing code ...

module.exports = ProjectBuildStep;
```

For `project_health_check_step.js`:
```javascript
// ... existing code ...

module.exports = ProjectHealthCheckStep;
```

For `project_test_step.js`:
```javascript
// ... existing code ...

module.exports = ProjectTestStep;
```

### 3. Testing and Validation (30 minutes)

#### 3.1 Test Step Loading
- [ ] Test completion category step loading
- [ ] Test cursor category step loading  
- [ ] Test IDE category step loading
- [ ] Test testing category step loading

#### 3.2 Verify Module Exports
- [ ] Verify all step files can be required without errors
- [ ] Verify step classes are properly exported
- [ ] Verify step registry can load all steps

#### 3.3 Check Application Startup
- [ ] Restart application and check logs
- [ ] Verify no step loading errors for fixed categories
- [ ] Verify step registry shows correct step counts

## Success Criteria
- [ ] All empty step files are properly implemented
- [ ] All step files have proper module.exports
- [ ] No step loading errors for completion, cursor, IDE, and testing categories
- [ ] Application starts without step loading failures for these categories
- [ ] All tests pass

## Risk Mitigation
- **Risk**: Breaking existing functionality
  - **Mitigation**: Test each change individually before proceeding
- **Risk**: Import path issues
  - **Mitigation**: Use existing import patterns from working step files
- **Risk**: Dependency injection issues
  - **Mitigation**: Follow existing DI patterns from working steps

## Dependencies
- None - this phase is self-contained

## Deliverables
- Fixed step files with proper implementations
- Working module exports for all step classes
- Verified step loading for affected categories
- Updated test results

## Next Phase
Phase 2: Fix Framework Configuration - Create missing steps directories and update framework configurations

## Validation Results - 2024-12-19

### ✅ Already Fixed
- [x] `cursor_get_response.js` - Has proper module.exports
- [x] `ide_get_file_content.js` - Has proper module.exports

### ⚠️ Still Need Fixing
- [ ] `run_dev_step.js` - Completely empty (0 bytes)
- [ ] `cursor_send_message.js` - Missing module.exports
- [ ] `dev_server_start_step.js` - Missing module.exports
- [ ] `dev_server_stop_step.js` - Missing module.exports
- [ ] `dev_server_restart_step.js` - Missing module.exports
- [ ] `project_build_step.js` - Missing module.exports
- [ ] `project_health_check_step.js` - Missing module.exports
- [ ] `project_test_step.js` - Missing module.exports 