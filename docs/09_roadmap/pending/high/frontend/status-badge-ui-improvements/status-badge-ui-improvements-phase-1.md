# Phase 1: Backend Script Execution Service

## 📋 Phase Overview
- **Phase**: 1 of 3
- **Duration**: 3 hours
- **Status**: Planning
- **Progress**: 0%
- **Dependencies**: None

## 🎯 Objectives
Create the backend infrastructure for executing IDE start scripts (bash/bat/ps1) based on the operating system, replacing the current API-only approach.

## 📝 Tasks

### 1.1 Create ScriptExecutionService (1 hour)
- [ ] Create `backend/domain/services/ide/ScriptExecutionService.js`
- [ ] Implement cross-platform script detection
- [ ] Add script parameter building logic
- [ ] Create script execution methods
- [ ] Add comprehensive error handling

### 1.2 Implement Script Detection Logic (1 hour)
- [ ] Add OS detection (Windows/Linux/macOS)
- [ ] Implement script path resolution
- [ ] Add script availability checking
- [ ] Create script parameter validation
- [ ] Add script execution logging

### 1.3 Modify Existing IDE Start Endpoint (1 hour)
- [ ] Modify `backend/presentation/api/ide/IDEController.js`
- [ ] Update existing `/api/ide/start` endpoint to execute scripts
- [ ] Integrate ScriptExecutionService into existing endpoint
- [ ] Add script execution response formatting
- [ ] Create error response handling for script failures

## 🔧 Technical Implementation

### ScriptExecutionService Structure
```javascript
// backend/domain/services/ide/ScriptExecutionService.js
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

class ScriptExecutionService {
  constructor() {
    this.platform = os.platform();
    this.scriptPaths = this.getScriptPaths();
  }

  async executeIDEScript(ideType = 'cursor', options = {}) {
    const scriptPath = this.getScriptPath(ideType);
    const args = this.buildScriptArgs(ideType, options);
    
    return new Promise((resolve, reject) => {
      const process = spawn(scriptPath, args, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output, port: this.extractPort(output) });
        } else {
          reject(new Error(`Script failed: ${error}`));
        }
      });
    });
  }

  getScriptPath(ideType) {
    const scripts = {
      windows: {
        cursor: 'start_ide_example.bat',
        vscode: 'start_ide_example.bat'
      },
      linux: {
        cursor: './start_ide_example.sh',
        vscode: './start_ide_example.sh'
      },
      darwin: {
        cursor: './start_ide_example.sh',
        vscode: './start_ide_example.sh'
      }
    };
    
    return scripts[this.platform]?.[ideType] || scripts.linux.cursor;
  }

  buildScriptArgs(ideType, options) {
    const args = [ideType];
    if (options.slot) {
      args.push(options.slot.toString());
    } else if (options.auto) {
      args.push('auto');
    }
    return args;
  }
}
```

### API Endpoint Modification
```javascript
// backend/presentation/api/ide/IDEController.js
async startIDE(req, res) {
  try {
    const { workspacePath, ideType = 'cursor', options = {} } = req.body;
    
    // Execute script instead of just API call
    const scriptResult = await this.scriptExecutionService.executeIDEScript(ideType, options);
    
    // Continue with existing IDE management logic
    const ideInfo = await this.ideManager.startNewIDE(workspacePath, ideType, options);
    
    res.json({
      success: true,
      data: {
        ...ideInfo,
        scriptOutput: scriptResult.output,
        scriptPort: scriptResult.port,
        features: this.getIDEFeatures(ideInfo),
        metadata: this.getIDEMetadata(ideInfo)
      }
    });
  } catch (error) {
    this.logger.error('Error starting IDE:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start IDE',
      details: error.message
    });
  }
}
```

## 🧪 Testing Requirements

### Unit Tests
- [ ] Test ScriptExecutionService script detection
- [ ] Test script parameter building
- [ ] Test script execution methods
- [ ] Test error handling scenarios

### Integration Tests
- [ ] Test modified `/api/ide/start` endpoint functionality
- [ ] Test cross-platform script execution
- [ ] Test script output parsing
- [ ] Test error response handling

## 📋 Acceptance Criteria
- [ ] ScriptExecutionService can detect and execute scripts
- [ ] Modified `/api/ide/start` endpoint executes scripts and returns proper responses
- [ ] Cross-platform script support works
- [ ] Error handling provides clear feedback
- [ ] Script execution logging is comprehensive
- [ ] All tests pass

## 🚀 Next Phase
After completing Phase 1, proceed to [Phase 2: Frontend Script Integration](./status-badge-ui-improvements-phase-2.md) for implementing the frontend integration.

## 📝 Notes
- Focus on robust script execution and error handling
- Ensure cross-platform compatibility
- Pay attention to security implications of script execution
- Consider script execution timeouts and cleanup
