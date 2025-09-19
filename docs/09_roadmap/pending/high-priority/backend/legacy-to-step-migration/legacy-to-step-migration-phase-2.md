# Phase 2: Missing Steps Implementation

## 📋 Phase Overview
- **Phase**: 2 of 3
- **Duration**: 5 hours
- **Priority**: High
- **Status**: Ready
- **Dependencies**: Phase 1 completion

## 🎯 **GOAL: Implement All 24 Missing Steps**

### **Objective:**
- 🔧 **CREATE**: All missing step implementations
- 📋 **EXTRACT**: Logic from existing commands/handlers
- ✅ **PRESERVE**: All existing functionality
- 🚀 **ENABLE**: JSON workflow configuration

## 📊 **CORRECTED Implementation Plan**

### **Total Steps to Create: 24 (not 26, not 38)**
- **Generate**: 4 steps
- **Refactoring**: 4 steps
- **Task**: 9 steps (create task category)
- **IDE**: 7 steps

## 🔧 **Step 1: Create Task Category Directory**

### **1.1 Create Task Category Structure**
```bash
# Create task category directory
mkdir -p backend/domain/steps/categories/task

# Create index file for task category
touch backend/domain/steps/categories/task/index.js
```

### **1.2 Task Category Index**
```javascript
// File: backend/domain/steps/categories/task/index.js
const CreateTaskStep = require('./create_task_step');
const PortStreamingStep = require('./port_streaming_step');
const ProcessTodoListStep = require('./process_todo_list_step');
const SendMessageStep = require('./send_message_step');
const StartStreamingStep = require('./start_streaming_step');
const StopStreamingStep = require('./stop_streaming_step');
const TestCorrectionStep = require('./test_correction_step');
const UpdateTestStatusStep = require('./update_test_status_step');
const AutoRefactorStep = require('./auto_refactor_step');

module.exports = {
  CreateTaskStep,
  PortStreamingStep,
  ProcessTodoListStep,
  SendMessageStep,
  StartStreamingStep,
  StopStreamingStep,
  TestCorrectionStep,
  UpdateTestStatusStep,
  AutoRefactorStep
};
```

## 🔧 **Step 2: Generate Category Steps (4 steps)**

### **2.1 GenerateConfigsStep**
```javascript
// File: backend/domain/steps/categories/generate/generate_configs_step.js
class GenerateConfigsStep {
  async execute(context) {
    // Extract logic from GenerateConfigsCommand + GenerateConfigsHandler
    // Generate configuration files for projects
  }
}
```

### **2.2 GenerateDocumentationStep**
```javascript
// File: backend/domain/steps/categories/generate/generate_documentation_step.js
class GenerateDocumentationStep {
  async execute(context) {
    // Extract logic from GenerateDocumentationCommand + GenerateDocumentationHandler
    // Generate documentation for projects
  }
}
```

### **2.3 GenerateScriptsStep**
```javascript
// File: backend/domain/steps/categories/generate/generate_scripts_step.js
class GenerateScriptsStep {
  async execute(context) {
    // Extract logic from GenerateScriptsCommand + GenerateScriptsHandler
    // Generate scripts for projects
  }
}
```

### **2.4 GenerateTestsStep**
```javascript
// File: backend/domain/steps/categories/generate/generate_tests_step.js
class GenerateTestsStep {
  async execute(context) {
    // Extract logic from GenerateTestsCommand + GenerateTestsHandler
    // Generate tests for projects
  }
}
```

## 🔧 **Step 3: Refactoring Category Steps (4 steps)**

### **3.1 OrganizeModulesStep**
```javascript
// File: backend/domain/steps/categories/refactoring/organize_modules_step.js
class OrganizeModulesStep {
  async execute(context) {
    // Extract logic from OrganizeModulesCommand + OrganizeModulesHandler
    // Organize modules in projects
  }
}
```

### **3.2 RestructureArchitectureStep**
```javascript
// File: backend/domain/steps/categories/refactoring/restructure_architecture_step.js
class RestructureArchitectureStep {
  async execute(context) {
    // Extract logic from RestructureArchitectureCommand + RestructureArchitectureHandler
    // Restructure architecture of projects
  }
}
```

### **3.3 SplitLargeFilesStep**
```javascript
// File: backend/domain/steps/categories/refactoring/split_large_files_step.js
class SplitLargeFilesStep {
  async execute(context) {
    // Extract logic from SplitLargeFilesCommand + SplitLargeFilesHandler
    // Split large files in projects
  }
}
```

### **3.4 CleanDependenciesStep**
```javascript
// File: backend/domain/steps/categories/refactoring/clean_dependencies_step.js
class CleanDependenciesStep {
  async execute(context) {
    // Extract logic from CleanDependenciesCommand + CleanDependenciesHandler
    // Clean dependencies in projects
  }
}
```

## 🔧 **Step 4: Task Category Steps (9 steps)**

### **4.1 CreateTaskStep**
```javascript
// File: backend/domain/steps/categories/task/create_task_step.js
class CreateTaskStep {
  async execute(context) {
    // Extract logic from CreateTaskCommand + CreateTaskHandler
    // Create tasks for projects
    // Leverage existing todo_parsing_step.js logic
  }
}
```

### **4.2 PortStreamingStep**
```javascript
// File: backend/domain/steps/categories/task/port_streaming_step.js
class PortStreamingStep {
  async execute(context) {
    // Extract logic from PortStreamingCommand + PortStreamingHandler
    // Handle port streaming operations
  }
}
```

### **4.3 ProcessTodoListStep**
```javascript
// File: backend/domain/steps/categories/task/process_todo_list_step.js
class ProcessTodoListStep {
  async execute(context) {
    // Extract logic from ProcessTodoListCommand + ProcessTodoListHandler
    // Process TODO lists
    // Leverage existing todo_parsing_step.js logic
  }
}
```

### **4.4 SendMessageStep**
```javascript
// File: backend/domain/steps/categories/task/send_message_step.js
class SendMessageStep {
  async execute(context) {
    // Extract logic from SendMessageCommand + SendMessageHandler
    // Send messages
  }
}
```

### **4.5 StartStreamingStep**
```javascript
// File: backend/domain/steps/categories/task/start_streaming_step.js
class StartStreamingStep {
  async execute(context) {
    // Extract logic from StartStreamingCommand + StartStreamingHandler
    // Start streaming operations
  }
}
```

### **4.6 StopStreamingStep**
```javascript
// File: backend/domain/steps/categories/task/stop_streaming_step.js
class StopStreamingStep {
  async execute(context) {
    // Extract logic from StopStreamingCommand + StopStreamingHandler
    // Stop streaming operations
  }
}
```

### **4.7 TestCorrectionStep**
```javascript
// File: backend/domain/steps/categories/task/test_correction_step.js
class TestCorrectionStep {
  async execute(context) {
    // Extract logic from TestCorrectionCommand
    // Correct tests
  }
}
```

### **4.8 UpdateTestStatusStep**
```javascript
// File: backend/domain/steps/categories/task/update_test_status_step.js
class UpdateTestStatusStep {
  async execute(context) {
    // Extract logic from UpdateTestStatusCommand + UpdateTestStatusHandler
    // Update test status
  }
}
```

### **4.9 AutoRefactorStep**
```javascript
// File: backend/domain/steps/categories/task/auto_refactor_step.js
class AutoRefactorStep {
  async execute(context) {
    // Extract logic from AutoRefactorCommand
    // Auto refactor code
  }
}
```

## 🔧 **Step 5: IDE Category Steps (7 steps)**

### **5.1 RestartUserAppStep**
```javascript
// File: backend/domain/steps/categories/ide/restart_user_app_step.js
class RestartUserAppStep {
  async execute(context) {
    // Extract logic from RestartUserAppCommand + RestartUserAppHandler
    // Restart user application
  }
}
```

### **5.2 AnalyzeProjectStep**
```javascript
// File: backend/domain/steps/categories/ide/analyze_project_step.js
class AnalyzeProjectStep {
  async execute(context) {
    // Extract logic from AnalyzeProjectCommand + AnalyzeProjectHandler
    // Analyze project structure
  }
}
```

### **5.3 AnalyzeAgainStep**
```javascript
// File: backend/domain/steps/categories/ide/analyze_again_step.js
class AnalyzeAgainStep {
  async execute(context) {
    // Extract logic from AnalyzeAgainCommand + AnalyzeAgainHandler
    // Analyze project again
  }
}
```

### **5.4 GetWorkspaceInfoStep**
```javascript
// File: backend/domain/steps/categories/ide/get_workspace_info_step.js
class GetWorkspaceInfoStep {
  async execute(context) {
    // Extract logic from GetWorkspaceInfoCommand + GetWorkspaceInfoHandler
    // Get workspace information
  }
}
```

### **5.5 DetectPackageJsonStep**
```javascript
// File: backend/domain/steps/categories/ide/detect_package_json_step.js
class DetectPackageJsonStep {
  async execute(context) {
    // Extract logic from DetectPackageJsonCommand + DetectPackageJsonHandler
    // Detect package.json files
  }
}
```

### **5.6 SwitchIDEPortStep**
```javascript
// File: backend/domain/steps/categories/ide/switch_ide_port_step.js
class SwitchIDEPortStep {
  async execute(context) {
    // Extract logic from SwitchIDEPortCommand + SwitchIDEPortHandler
    // Switch IDE port
  }
}
```

### **5.7 OpenFileExplorerStep**
```javascript
// File: backend/domain/steps/categories/ide/open_file_explorer_step.js
class OpenFileExplorerStep {
  async execute(context) {
    // Extract logic from OpenFileExplorerCommand + OpenFileExplorerHandler
    // Open file explorer
  }
}
```

### **5.8 OpenCommandPaletteStep**
```javascript
// File: backend/domain/steps/categories/ide/open_command_palette_step.js
class OpenCommandPaletteStep {
  async execute(context) {
    // Extract logic from OpenCommandPaletteCommand + OpenCommandPaletteHandler
    // Open command palette
  }
}
```

### **5.9 ExecuteIDEActionStep**
```javascript
// File: backend/domain/steps/categories/ide/execute_ide_action_step.js
class ExecuteIDEActionStep {
  async execute(context) {
    // Extract logic from ExecuteIDEActionCommand + ExecuteIDEActionHandler
    // Execute IDE actions
  }
}
```

### **5.10 GetIDESelectorsStep**
```javascript
// File: backend/domain/steps/categories/ide/get_ide_selectors_step.js
class GetIDESelectorsStep {
  async execute(context) {
    // Extract logic from GetIDESelectorsCommand + GetIDESelectorsHandler
    // Get IDE selectors
  }
}
```

## 📋 **Step Template Pattern**

### **Standard Step Template:**
```javascript
/**
 * [StepName] - [Category] Step
 * [Description]
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('[step_name]');

// Step configuration
const config = {
  name: '[StepName]',
  type: '[category]',
  description: '[Description]',
  category: '[category]',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000
  },
  validation: {
    requiredFields: ['projectPath']
  }
};

class [StepName] {
  constructor() {
    this.name = '[StepName]';
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = [StepName].getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      // Extract logic from command/handler
      const result = await this.performOperation(context);

      logger.info(`✅ ${this.name} completed successfully`);

      return {
        success: true,
        result: result,
        metadata: {
          stepName: this.name,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ ${this.name} failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          timestamp: new Date()
        }
      };
    }
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required');
    }
  }

  async performOperation(context) {
    // Extract and implement logic from command/handler
    // This is where the actual business logic goes
  }
}

module.exports = [StepName];
```

## 🔧 **Logic Extraction Process**

### **For Each Missing Step:**

#### **1. Read Command File:**
```javascript
// Read the command file to understand the interface
const commandFile = require('./path/to/Command.js');
// Analyze constructor, methods, validation rules
```

#### **2. Read Handler File:**
```javascript
// Read the handler file to understand the business logic
const handlerFile = require('./path/to/Handler.js');
// Analyze handle() method, service calls, error handling
```

#### **3. Extract Core Logic:**
```javascript
// Extract the core business logic from handler.handle() method
// Preserve all functionality, error handling, validation
// Adapt to step.execute() interface
```

#### **4. Implement Step:**
```javascript
// Implement using the standard step template
// Add proper logging, error handling, validation
// Ensure JSON workflow compatibility
```

#### **5. Test Integration:**
```javascript
// Test that the step works correctly
// Verify all functionality is preserved
// Test JSON workflow execution
```

## 📊 **CORRECTED Success Criteria**
- [ ] All 24 missing steps implemented (not 26, not 38)
- [ ] Task category directory created
- [ ] All step logic extracted from commands/handlers
- [ ] All functionality preserved
- [ ] All steps JSON workflow ready
- [ ] All steps properly categorized
- [ ] All steps have proper error handling
- [ ] All steps have comprehensive logging
- [ ] All steps have validation rules
- [ ] All steps follow standard template pattern

## 🔄 **Implementation Order**

### **Priority 1: Task Category (9 steps)**
1. Create task category directory
2. Implement CreateTaskStep (leverage todo_parsing_step.js)
3. Implement ProcessTodoListStep (leverage todo_parsing_step.js)
4. Implement other task steps

### **Priority 2: Generate Category (4 steps)**
1. Implement GenerateConfigsStep
2. Implement GenerateDocumentationStep
3. Implement GenerateScriptsStep
4. Implement GenerateTestsStep

### **Priority 3: Refactoring Category (4 steps)**
1. Implement OrganizeModulesStep
2. Implement RestructureArchitectureStep
3. Implement SplitLargeFilesStep
4. Implement CleanDependenciesStep

### **Priority 4: IDE Category (7 steps)**
1. Implement RestartUserAppStep
2. Implement AnalyzeProjectStep
3. Implement other IDE steps

## 📝 **Notes**
- **Focus**: Implement all 24 missing steps
- **Principle**: Preserve all existing functionality
- **Goal**: Complete step-based architecture
- **Quality**: Follow standard step template pattern
- **Leverage**: Existing completion steps like todo_parsing_step.js
- **Categorization**: Proper task category for task operations
- **Result**: Ready for legacy code removal in Phase 3 