# Phase 3: Legacy Code Removal

## 📋 Phase Overview
- **Phase**: 3 of 3
- **Duration**: 4 hours
- **Priority**: High
- **Status**: Ready
- **Dependencies**: Phase 1, 2 completion

## 🎯 **GOAL: Complete Legacy Code Removal**

### **Objective:**
- ❌ **REMOVE**: All commands and handlers (legacy architecture)
- ✅ **KEEP**: Only step-based architecture
- 🔧 **UPDATE**: All service references to use steps
- 🧪 **VALIDATE**: All functionality preserved through steps

## 🗑️ **Step 1: Command Directory Removal**

### **Complete Commands Removal:**
```bash
# ❌ DELETE: Complete commands directory structure
rm -rf backend/application/commands/
rm -rf backend/application/commands/categories/
rm -rf backend/application/commands/categories/analysis/
rm -rf backend/application/commands/categories/generate/
rm -rf backend/application/commands/categories/refactoring/
rm -rf backend/application/commands/categories/management/
rm -rf backend/application/commands/categories/ide/

# ❌ DELETE: Command registry files
rm backend/application/commands/CommandRegistry.js
rm backend/application/commands/CommandBuilder.js
rm backend/application/commands/index.js
```

### **Individual Command Files to Remove (43 total):**

#### **Analysis Category (6 files):**
- [ ] `backend/application/commands/categories/analysis/AdvancedAnalysisCommand.js`
- [ ] `backend/application/commands/categories/analysis/AnalyzeArchitectureCommand.js`
- [ ] `backend/application/commands/categories/analysis/AnalyzeCodeQualityCommand.js`
- [ ] `backend/application/commands/categories/analysis/AnalyzeDependenciesCommand.js`
- [ ] `backend/application/commands/categories/analysis/AnalyzeRepoStructureCommand.js`
- [ ] `backend/application/commands/categories/analysis/AnalyzeTechStackCommand.js`

#### **Generate Category (4 files):**
- [ ] `backend/application/commands/categories/generate/GenerateConfigsCommand.js`
- [ ] `backend/application/commands/categories/generate/GenerateDocumentationCommand.js`
- [ ] `backend/application/commands/categories/generate/GenerateScriptsCommand.js`
- [ ] `backend/application/commands/categories/generate/GenerateTestsCommand.js`

#### **Refactoring Category (4 files):**
- [ ] `backend/application/commands/categories/refactoring/OrganizeModulesCommand.js`
- [ ] `backend/application/commands/categories/refactoring/RestructureArchitectureCommand.js`
- [ ] `backend/application/commands/categories/refactoring/SplitLargeFilesCommand.js`
- [ ] `backend/application/commands/categories/refactoring/CleanDependenciesCommand.js`

#### **Management Category (9 files):**
- [ ] `backend/application/commands/categories/management/AutoRefactorCommand.js`
- [ ] `backend/application/commands/categories/management/CreateTaskCommand.js`
- [ ] `backend/application/commands/categories/management/PortStreamingCommand.js`
- [ ] `backend/application/commands/categories/management/ProcessTodoListCommand.js`
- [ ] `backend/application/commands/categories/management/SendMessageCommand.js`
- [ ] `backend/application/commands/categories/management/StartStreamingCommand.js`
- [ ] `backend/application/commands/categories/management/StopStreamingCommand.js`
- [ ] `backend/application/commands/categories/management/TestCorrectionCommand.js`
- [ ] `backend/application/commands/categories/management/UpdateTestStatusCommand.js`

#### **IDE Category (20 files):**
- [ ] `backend/application/commands/categories/ide/CreateChatCommand.js`
- [ ] `backend/application/commands/categories/ide/SendMessageCommand.js`
- [ ] `backend/application/commands/categories/ide/SwitchChatCommand.js`
- [ ] `backend/application/commands/categories/ide/ListChatsCommand.js`
- [ ] `backend/application/commands/categories/ide/CloseChatCommand.js`
- [ ] `backend/application/commands/categories/ide/GetChatHistoryCommand.js`
- [ ] `backend/application/commands/categories/ide/OpenTerminalCommand.js`
- [ ] `backend/application/commands/categories/ide/ExecuteTerminalCommand.js`
- [ ] `backend/application/commands/categories/ide/MonitorTerminalOutputCommand.js`
- [ ] `backend/application/commands/categories/ide/RestartUserAppCommand.js`
- [ ] `backend/application/commands/categories/ide/TerminalLogCaptureCommand.js`
- [ ] `backend/application/commands/categories/ide/AnalyzeProjectCommand.js`
- [ ] `backend/application/commands/categories/ide/AnalyzeAgainCommand.js`
- [ ] `backend/application/commands/categories/ide/GetWorkspaceInfoCommand.js`
- [ ] `backend/application/commands/categories/ide/DetectPackageJsonCommand.js`
- [ ] `backend/application/commands/categories/ide/SwitchIDEPortCommand.js`
- [ ] `backend/application/commands/categories/ide/OpenFileExplorerCommand.js`
- [ ] `backend/application/commands/categories/ide/OpenCommandPaletteCommand.js`
- [ ] `backend/application/commands/categories/ide/ExecuteIDEActionCommand.js`
- [ ] `backend/application/commands/categories/ide/GetIDESelectorsCommand.js`

## 🗑️ **Step 2: Handler Directory Removal**

### **Complete Handlers Removal:**
```bash
# ❌ DELETE: Complete handlers directory structure
rm -rf backend/application/handlers/
rm -rf backend/application/handlers/categories/
rm -rf backend/application/handlers/categories/analysis/
rm -rf backend/application/handlers/categories/generate/
rm -rf backend/application/handlers/categories/refactoring/
rm -rf backend/application/handlers/categories/management/
rm -rf backend/application/handlers/categories/ide/

# ❌ DELETE: Handler registry files
rm backend/application/handlers/HandlerRegistry.js
rm backend/application/handlers/HandlerBuilder.js
rm backend/application/handlers/index.js
```

### **Individual Handler Files to Remove (37 total):**

#### **Analysis Category (1 file):**
- [ ] `backend/application/handlers/categories/analysis/AdvancedAnalysisHandler.js`

#### **Generate Category (4 files):**
- [ ] `backend/application/handlers/categories/generate/GenerateConfigsHandler.js`
- [ ] `backend/application/handlers/categories/generate/GenerateDocumentationHandler.js`
- [ ] `backend/application/handlers/categories/generate/GenerateScriptsHandler.js`
- [ ] `backend/application/handlers/categories/generate/GenerateTestsHandler.js`

#### **Refactoring Category (4 files):**
- [ ] `backend/application/handlers/categories/refactoring/OrganizeModulesHandler.js`
- [ ] `backend/application/handlers/categories/refactoring/RestructureArchitectureHandler.js`
- [ ] `backend/application/handlers/categories/refactoring/SplitLargeFilesHandler.js`
- [ ] `backend/application/handlers/categories/refactoring/CleanDependenciesHandler.js`

#### **Management Category (8 files):**
- [ ] `backend/application/handlers/categories/management/CreateTaskHandler.js`
- [ ] `backend/application/handlers/categories/management/GetChatHistoryHandler.js`
- [ ] `backend/application/handlers/categories/management/PortStreamingHandler.js`
- [ ] `backend/application/handlers/categories/management/ProcessTodoListHandler.js`
- [ ] `backend/application/handlers/categories/management/SendMessageHandler.js`
- [ ] `backend/application/handlers/categories/management/StartStreamingHandler.js`
- [ ] `backend/application/handlers/categories/management/StopStreamingHandler.js`
- [ ] `backend/application/handlers/categories/management/UpdateTestStatusHandler.js`

#### **IDE Category (20 files):**
- [ ] `backend/application/handlers/categories/ide/CreateChatHandler.js`
- [ ] `backend/application/handlers/categories/ide/SendMessageHandler.js`
- [ ] `backend/application/handlers/categories/ide/SwitchChatHandler.js`
- [ ] `backend/application/handlers/categories/ide/ListChatsHandler.js`
- [ ] `backend/application/handlers/categories/ide/CloseChatHandler.js`
- [ ] `backend/application/handlers/categories/ide/GetChatHistoryHandler.js`
- [ ] `backend/application/handlers/categories/ide/OpenTerminalHandler.js`
- [ ] `backend/application/handlers/categories/ide/ExecuteTerminalHandler.js`
- [ ] `backend/application/handlers/categories/ide/MonitorTerminalOutputHandler.js`
- [ ] `backend/application/handlers/categories/ide/RestartUserAppHandler.js`
- [ ] `backend/application/handlers/categories/ide/TerminalLogCaptureHandler.js`
- [ ] `backend/application/handlers/categories/ide/AnalyzeProjectHandler.js`
- [ ] `backend/application/handlers/categories/ide/AnalyzeAgainHandler.js`
- [ ] `backend/application/handlers/categories/ide/GetWorkspaceInfoHandler.js`
- [ ] `backend/application/handlers/categories/ide/DetectPackageJsonHandler.js`
- [ ] `backend/application/handlers/categories/ide/SwitchIDEPortHandler.js`
- [ ] `backend/application/handlers/categories/ide/OpenFileExplorerHandler.js`
- [ ] `backend/application/handlers/categories/ide/OpenCommandPaletteHandler.js`
- [ ] `backend/application/handlers/categories/ide/ExecuteIDEActionHandler.js`
- [ ] `backend/application/handlers/categories/ide/GetIDESelectorsHandler.js`

## 🔧 **Step 3: Service Registry Updates**

### **Update ServiceRegistry.js:**
```javascript
// File: backend/infrastructure/dependency-injection/ServiceRegistry.js

// ❌ REMOVE: Command and Handler registrations
// Remove all references to CommandRegistry and HandlerRegistry

// ✅ KEEP: Step registry registrations
// Ensure StepRegistry is properly registered and configured

// ❌ REMOVE: Command/Handler service registrations
// Remove any service registrations that depend on commands/handlers

// ✅ ADD: Step-based service registrations
// Update services to use StepRegistry instead of CommandRegistry/HandlerRegistry
```

### **Files to Update:**
- [ ] `backend/infrastructure/dependency-injection/ServiceRegistry.js` - Remove command/handler registrations
- [ ] `backend/Application.js` - Update to use only StepRegistry
- [ ] `backend/application/services/` - Update all services to use steps

## 🔧 **Step 4: Test File Updates**

### **Remove Legacy Test Files:**
```bash
# ❌ DELETE: Command and Handler test files
rm backend/tests/unit/ide-phase-3-commands.test.js
rm backend/tests/unit/ide-chat-commands.test.js
rm backend/tests/unit/ide-phase-2-commands.test.js
rm backend/tests/unit/ide-phase-1-commands.test.js
```

### **Update Integration Tests:**
- [ ] `backend/tests/integration/` - Update to test steps instead of commands/handlers
- [ ] `backend/tests/e2e/` - Update to use step-based execution

## 🔧 **Step 5: Import Statement Cleanup**

### **Remove Command/Handler Imports:**
```javascript
// ❌ REMOVE: From all files that import commands/handlers
const { CommandRegistry } = require('../../application/commands');
const { HandlerRegistry } = require('../../application/handlers');

// ✅ REPLACE: With step registry imports
const { StepRegistry } = require('../../domain/steps');
```

### **Files to Update:**
- [ ] All service files that import CommandRegistry/HandlerRegistry
- [ ] All controller files that use commands/handlers
- [ ] All test files that import legacy components

## 🔧 **Step 6: API Endpoint Updates**

### **Update Controllers:**
```javascript
// ❌ REMOVE: Command/Handler usage in controllers
const command = CommandRegistry.buildFromCategory('ide', 'CreateChatCommand', params);
const result = await command.execute(context);

// ✅ REPLACE: With step execution
const result = await this.stepRegistry.executeStep('CreateChatStep', context);
```

### **Files to Update:**
- [ ] `backend/presentation/api/` - Update all controllers to use steps
- [ ] `backend/presentation/websocket/` - Update websocket handlers to use steps

## 🧪 **Step 7: Validation and Testing**

### **Functionality Validation:**
- [ ] **Chat Operations**: Create, send, switch, list, close chats
- [ ] **Terminal Operations**: Open, execute, monitor, capture logs
- [ ] **Analysis Operations**: Project analysis, code quality, dependencies
- [ ] **Management Operations**: Task creation, streaming, message sending
- [ ] **IDE Operations**: Port switching, file explorer, command palette

### **Integration Tests:**
```javascript
// tests/integration/StepMigration.test.js
describe('Step Migration Validation', () => {
  it('should execute all migrated functionality through steps', async () => {
    const stepRegistry = new StepRegistry();
    
    // Test all migrated operations
    const operations = [
      { step: 'CreateChatStep', context: { userId: 'test', port: 3000 } },
      { step: 'SendMessageStep', context: { sessionId: 'test', message: 'Hello' } },
      { step: 'OpenTerminalStep', context: { projectPath: '/test' } },
      { step: 'AnalyzeProjectStep', context: { projectPath: '/test' } }
    ];
    
    for (const operation of operations) {
      const result = await stepRegistry.executeStep(operation.step, operation.context);
      expect(result.success).toBe(true);
    }
  });
});
```

### **Performance Validation:**
- [ ] **Response Times**: Maintain or improve current performance
- [ ] **Memory Usage**: No significant increase in memory usage
- [ ] **Error Rates**: Maintain or reduce current error rates

## 📊 **Step 8: Documentation Updates**

### **Update Documentation:**
- [ ] `docs/architecture/` - Update architecture documentation
- [ ] `docs/api/` - Update API documentation to reflect step-based approach
- [ ] `README.md` - Update project overview
- [ ] `docs/development/` - Update development guides

### **Remove Legacy Documentation:**
- [ ] Remove any documentation referencing commands/handlers
- [ ] Update examples to use step-based approach
- [ ] Update diagrams to show step-based architecture

## 📋 **Step 9: Final Validation Checklist**

### **Architecture Validation:**
- [ ] ❌ No command files remain in codebase
- [ ] ❌ No handler files remain in codebase
- [ ] ❌ No command/handler imports remain
- [ ] ✅ All functionality works through steps
- [ ] ✅ Step registry properly configured
- [ ] ✅ JSON workflow configuration working

### **Code Quality Validation:**
- [ ] ✅ All tests pass (unit, integration, e2e)
- [ ] ✅ No build errors
- [ ] ✅ No linting errors
- [ ] ✅ Code coverage maintained (90%+)
- [ ] ✅ Performance benchmarks met

### **Functionality Validation:**
- [ ] ✅ Chat system fully functional
- [ ] ✅ Terminal operations working
- [ ] ✅ Analysis operations working
- [ ] ✅ Management operations working
- [ ] ✅ IDE operations working

## 📁 **Files to Delete (Summary)**

### **Commands (43 files):**
```bash
# Analysis (6 files)
rm backend/application/commands/categories/analysis/*.js

# Generate (4 files)
rm backend/application/commands/categories/generate/*.js

# Refactoring (4 files)
rm backend/application/commands/categories/refactoring/*.js

# Management (9 files)
rm backend/application/commands/categories/management/*.js

# IDE (20 files)
rm backend/application/commands/categories/ide/*.js

# Registry files
rm backend/application/commands/CommandRegistry.js
rm backend/application/commands/CommandBuilder.js
rm backend/application/commands/index.js
```

### **Handlers (37 files):**
```bash
# Analysis (1 file)
rm backend/application/handlers/categories/analysis/*.js

# Generate (4 files)
rm backend/application/handlers/categories/generate/*.js

# Refactoring (4 files)
rm backend/application/handlers/categories/refactoring/*.js

# Management (8 files)
rm backend/application/handlers/categories/management/*.js

# IDE (20 files)
rm backend/application/handlers/categories/ide/*.js

# Registry files
rm backend/application/handlers/HandlerRegistry.js
rm backend/application/handlers/HandlerBuilder.js
rm backend/application/handlers/index.js
```

### **Test Files:**
```bash
# Remove legacy test files
rm backend/tests/unit/ide-phase-*-commands.test.js
rm backend/tests/unit/ide-chat-commands.test.js
```

## 📊 **Success Criteria**
- [ ] All 80 legacy components (43 commands + 37 handlers) removed
- [ ] All service references updated to use steps
- [ ] All test files updated to test steps
- [ ] All imports cleaned up
- [ ] All functionality preserved through steps
- [ ] All tests pass (unit, integration, e2e)
- [ ] Performance maintained or improved
- [ ] JSON workflow configuration working
- [ ] Clean, maintainable step-based architecture
- [ ] No legacy code remains in codebase

## 🎉 **Migration Complete**

### **Final State:**
- ✅ **Pure Step Architecture**: Only step-based execution
- ✅ **JSON Workflow Ready**: All operations configurable via JSON
- ✅ **Clean Codebase**: No legacy commands/handlers
- ✅ **Maintained Functionality**: All features work through steps
- ✅ **Improved Architecture**: Better maintainability and flexibility

## 📝 **Notes**
- **Focus**: Complete removal of all legacy components
- **Principle**: Clean, modern step-based architecture
- **Goal**: 100% legacy code removal with functionality preservation
- **Quality**: Robust, testable, JSON-workflow-ready system
- **Result**: Modern, flexible, maintainable backend architecture 