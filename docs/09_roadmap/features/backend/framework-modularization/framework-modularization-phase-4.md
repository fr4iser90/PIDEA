# Phase 4: Framework Migration

## 📋 Phase Overview
- **Phase**: 4 of 5
- **Duration**: 8 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Phase Objectives
1. Migrate TaskService to task_management framework
2. Migrate WorkflowExecutionService to workflow_management framework
3. Migrate refactoring steps to refactoring_management framework
4. Migrate testing steps to testing_management framework
5. Migrate documentation steps to documentation_management framework
6. Migrate deployment steps to deployment_management framework
7. Update all framework step implementations

## 🔄 Task 1: TaskService Migration

### 1.1 Create task_management Framework Structure

```bash
# Create framework directory structure
mkdir -p backend/framework/task_management/{steps,services,config,tests}
```

### 1.2 TaskService Framework Configuration

```json
// backend/framework/task_management/config.json
{
    "name": "task_management",
    "version": "1.0.0",
    "description": "Task management framework for PIDEA",
    "author": "PIDEA Team",
    "dependencies": {
        "core": ["GitService", "BrowserManager", "IDEManager"],
        "frameworks": []
    },
    "steps": {
        "task_create": {
            "file": "steps/task_create.js",
            "category": "task",
            "dependencies": ["GitService"]
        },
        "task_execute": {
            "file": "steps/task_execute.js",
            "category": "task",
            "dependencies": ["WorkflowExecutionService"]
        },
        "task_list": {
            "file": "steps/task_list.js",
            "category": "task",
            "dependencies": ["TaskRepository"]
        },
        "task_update": {
            "file": "steps/task_update.js",
            "category": "task",
            "dependencies": ["GitService", "TaskRepository"]
        },
        "task_delete": {
            "file": "steps/task_delete.js",
            "category": "task",
            "dependencies": ["TaskRepository"]
        }
    },
    "services": {
        "TaskService": {
            "file": "services/TaskService.js",
            "dependencies": ["TaskRepository", "WorkflowExecutionService"]
        },
        "TaskRepository": {
            "file": "services/TaskRepository.js",
            "dependencies": ["DatabaseService"]
        }
    },
    "activation": {
        "auto": false,
        "required": false
    }
}
```

### 1.3 Migrate TaskService to Framework

```javascript
// backend/framework/task_management/services/TaskService.js
const TaskRepository = require('./TaskRepository');
const WorkflowExecutionService = require('@/domain/services/WorkflowExecutionService');

class TaskService {
    constructor() {
        this.dependencies = ['TaskRepository', 'WorkflowExecutionService'];
        this.taskRepository = null;
        this.workflowExecutionService = null;
    }
    
    async initialize() {
        this.taskRepository = new TaskRepository();
        this.workflowExecutionService = global.application.workflowExecutionService;
        await this.taskRepository.initialize();
    }
    
    async cleanup() {
        if (this.taskRepository) {
            await this.taskRepository.cleanup();
        }
    }
    
    async createTask(taskData) {
        try {
            // Validate task data
            this.validateTaskData(taskData);
            
            // Create task in repository
            const task = await this.taskRepository.create(taskData);
            
            // Create workflow from task
            const workflow = await this.createWorkflowFromTask(task);
            
            console.log(`✅ Task '${task.name}' created successfully`);
            return task;
            
        } catch (error) {
            console.error(`❌ Failed to create task:`, error.message);
            throw error;
        }
    }
    
    async executeTask(taskId) {
        try {
            // Get task from repository
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task with ID '${taskId}' not found`);
            }
            
            // Execute workflow
            const result = await this.workflowExecutionService.executeWorkflow(task.workflowId);
            
            console.log(`✅ Task '${task.name}' executed successfully`);
            return result;
            
        } catch (error) {
            console.error(`❌ Failed to execute task:`, error.message);
            throw error;
        }
    }
    
    async listTasks(filters = {}) {
        try {
            const tasks = await this.taskRepository.findAll(filters);
            return tasks;
        } catch (error) {
            console.error(`❌ Failed to list tasks:`, error.message);
            throw error;
        }
    }
    
    async updateTask(taskId, updateData) {
        try {
            const task = await this.taskRepository.update(taskId, updateData);
            console.log(`✅ Task '${task.name}' updated successfully`);
            return task;
        } catch (error) {
            console.error(`❌ Failed to update task:`, error.message);
            throw error;
        }
    }
    
    async deleteTask(taskId) {
        try {
            await this.taskRepository.delete(taskId);
            console.log(`✅ Task with ID '${taskId}' deleted successfully`);
        } catch (error) {
            console.error(`❌ Failed to delete task:`, error.message);
            throw error;
        }
    }
    
    async createWorkflowFromTask(task) {
        try {
            // Create workflow steps from task description
            const steps = await this.generateStepsFromTask(task);
            
            // Create workflow using WorkflowExecutionService
            const workflow = await this.workflowExecutionService.createWorkflow({
                name: `Workflow for ${task.name}`,
                description: task.description,
                steps: steps
            });
            
            return workflow;
            
        } catch (error) {
            console.error(`❌ Failed to create workflow from task:`, error.message);
            throw error;
        }
    }
    
    async generateStepsFromTask(task) {
        // This would use AI to generate steps from task description
        // For now, return basic steps
        return [
            {
                type: 'analysis',
                name: 'analyze_task',
                parameters: { taskDescription: task.description }
            },
            {
                type: 'git',
                name: 'git_create_branch',
                parameters: { branchName: `task-${task.id}` }
            }
        ];
    }
    
    validateTaskData(taskData) {
        if (!taskData.name) {
            throw new Error('Task name is required');
        }
        if (!taskData.description) {
            throw new Error('Task description is required');
        }
    }
}

module.exports = TaskService;
```

### 1.4 Create Task Steps

```javascript
// backend/framework/task_management/steps/task_create.js
class TaskCreateStep {
    constructor() {
        this.category = 'task';
        this.dependencies = ['GitService'];
    }
    
    async execute(context) {
        try {
            const { taskData } = context;
            
            // Get TaskService from framework
            const taskService = global.application.frameworkManager
                .getService('task_management.TaskService');
            
            // Create task
            const task = await taskService.createTask(taskData);
            
            return {
                success: true,
                task: task,
                message: `Task '${task.name}' created successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async validate(context) {
        const { taskData } = context;
        
        if (!taskData) {
            throw new Error('Task data is required');
        }
        
        if (!taskData.name) {
            throw new Error('Task name is required');
        }
        
        if (!taskData.description) {
            throw new Error('Task description is required');
        }
    }
}

module.exports = TaskCreateStep;
```

```javascript
// backend/framework/task_management/steps/task_execute.js
class TaskExecuteStep {
    constructor() {
        this.category = 'task';
        this.dependencies = ['WorkflowExecutionService'];
    }
    
    async execute(context) {
        try {
            const { taskId } = context;
            
            // Get TaskService from framework
            const taskService = global.application.frameworkManager
                .getService('task_management.TaskService');
            
            // Execute task
            const result = await taskService.executeTask(taskId);
            
            return {
                success: true,
                result: result,
                message: `Task executed successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async validate(context) {
        const { taskId } = context;
        
        if (!taskId) {
            throw new Error('Task ID is required');
        }
    }
}

module.exports = TaskExecuteStep;
```

## 🔄 Task 2: WorkflowExecutionService Migration

### 2.1 Create workflow_management Framework Structure

```bash
# Create framework directory structure
mkdir -p backend/framework/workflow_management/{steps,services,config,tests}
```

### 2.2 WorkflowExecutionService Framework Configuration

```json
// backend/framework/workflow_management/config.json
{
    "name": "workflow_management",
    "version": "1.0.0",
    "description": "Workflow execution management framework for PIDEA",
    "author": "PIDEA Team",
    "dependencies": {
        "core": ["GitService", "BrowserManager", "IDEManager", "StepRegistry"],
        "frameworks": []
    },
    "steps": {
        "workflow_create": {
            "file": "steps/workflow_create.js",
            "category": "workflow",
            "dependencies": ["StepRegistry"]
        },
        "workflow_execute": {
            "file": "steps/workflow_execute.js",
            "category": "workflow",
            "dependencies": ["WorkflowExecutionService"]
        },
        "workflow_pause": {
            "file": "steps/workflow_pause.js",
            "category": "workflow",
            "dependencies": ["WorkflowExecutionService"]
        },
        "workflow_resume": {
            "file": "steps/workflow_resume.js",
            "category": "workflow",
            "dependencies": ["WorkflowExecutionService"]
        },
        "workflow_cancel": {
            "file": "steps/workflow_cancel.js",
            "category": "workflow",
            "dependencies": ["WorkflowExecutionService"]
        }
    },
    "services": {
        "WorkflowExecutionService": {
            "file": "services/WorkflowExecutionService.js",
            "dependencies": ["BrowserManager", "IDEManager", "StepRegistry"]
        },
        "WorkflowRepository": {
            "file": "services/WorkflowRepository.js",
            "dependencies": ["DatabaseService"]
        }
    },
    "activation": {
        "auto": false,
        "required": false
    }
}
```

### 2.3 Migrate WorkflowExecutionService to Framework

```javascript
// backend/framework/workflow_management/services/WorkflowExecutionService.js
const WorkflowRepository = require('./WorkflowRepository');

class WorkflowExecutionService {
    constructor() {
        this.dependencies = ['BrowserManager', 'IDEManager', 'StepRegistry'];
        this.browserManager = null;
        this.ideManager = null;
        this.stepRegistry = null;
        this.workflowRepository = null;
        this.activeWorkflows = new Map();
    }
    
    async initialize() {
        this.browserManager = global.application.browserManager;
        this.ideManager = global.application.ideManager;
        this.stepRegistry = global.application.stepRegistry;
        this.workflowRepository = new WorkflowRepository();
        await this.workflowRepository.initialize();
    }
    
    async cleanup() {
        // Cancel all active workflows
        for (const [workflowId, workflow] of this.activeWorkflows) {
            await this.cancelWorkflow(workflowId);
        }
        
        if (this.workflowRepository) {
            await this.workflowRepository.cleanup();
        }
    }
    
    async createWorkflow(workflowData) {
        try {
            // Validate workflow data
            this.validateWorkflowData(workflowData);
            
            // Create workflow in repository
            const workflow = await this.workflowRepository.create(workflowData);
            
            console.log(`✅ Workflow '${workflow.name}' created successfully`);
            return workflow;
            
        } catch (error) {
            console.error(`❌ Failed to create workflow:`, error.message);
            throw error;
        }
    }
    
    async executeWorkflow(workflowId) {
        try {
            // Get workflow from repository
            const workflow = await this.workflowRepository.findById(workflowId);
            if (!workflow) {
                throw new Error(`Workflow with ID '${workflowId}' not found`);
            }
            
            // Initialize workflow execution
            const executionContext = await this.initializeExecutionContext(workflow);
            
            // Add to active workflows
            this.activeWorkflows.set(workflowId, {
                workflow: workflow,
                context: executionContext,
                status: 'running'
            });
            
            // Execute workflow steps
            const result = await this.executeWorkflowSteps(workflow, executionContext);
            
            // Remove from active workflows
            this.activeWorkflows.delete(workflowId);
            
            console.log(`✅ Workflow '${workflow.name}' executed successfully`);
            return result;
            
        } catch (error) {
            console.error(`❌ Failed to execute workflow:`, error.message);
            throw error;
        }
    }
    
    async pauseWorkflow(workflowId) {
        try {
            const workflowInfo = this.activeWorkflows.get(workflowId);
            if (!workflowInfo) {
                throw new Error(`Workflow with ID '${workflowId}' not running`);
            }
            
            workflowInfo.status = 'paused';
            console.log(`⏸️ Workflow '${workflowInfo.workflow.name}' paused`);
            
        } catch (error) {
            console.error(`❌ Failed to pause workflow:`, error.message);
            throw error;
        }
    }
    
    async resumeWorkflow(workflowId) {
        try {
            const workflowInfo = this.activeWorkflows.get(workflowId);
            if (!workflowInfo) {
                throw new Error(`Workflow with ID '${workflowId}' not found`);
            }
            
            if (workflowInfo.status !== 'paused') {
                throw new Error(`Workflow is not paused`);
            }
            
            workflowInfo.status = 'running';
            console.log(`▶️ Workflow '${workflowInfo.workflow.name}' resumed`);
            
        } catch (error) {
            console.error(`❌ Failed to resume workflow:`, error.message);
            throw error;
        }
    }
    
    async cancelWorkflow(workflowId) {
        try {
            const workflowInfo = this.activeWorkflows.get(workflowId);
            if (!workflowInfo) {
                throw new Error(`Workflow with ID '${workflowId}' not running`);
            }
            
            workflowInfo.status = 'cancelled';
            this.activeWorkflows.delete(workflowId);
            
            console.log(`❌ Workflow '${workflowInfo.workflow.name}' cancelled`);
            
        } catch (error) {
            console.error(`❌ Failed to cancel workflow:`, error.message);
            throw error;
        }
    }
    
    async initializeExecutionContext(workflow) {
        return {
            workflowId: workflow.id,
            workflowName: workflow.name,
            browserManager: this.browserManager,
            ideManager: this.ideManager,
            stepRegistry: this.stepRegistry,
            variables: {},
            results: {}
        };
    }
    
    async executeWorkflowSteps(workflow, context) {
        const results = [];
        
        for (const step of workflow.steps) {
            try {
                // Check if workflow is paused or cancelled
                const workflowInfo = this.activeWorkflows.get(workflow.id);
                if (workflowInfo.status === 'paused') {
                    // Wait for resume
                    while (workflowInfo.status === 'paused') {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
                
                if (workflowInfo.status === 'cancelled') {
                    throw new Error('Workflow was cancelled');
                }
                
                // Execute step
                const stepResult = await this.executeStep(step, context);
                results.push(stepResult);
                
                // Store result in context
                context.results[step.name] = stepResult;
                
            } catch (error) {
                console.error(`❌ Step '${step.name}' failed:`, error.message);
                throw error;
            }
        }
        
        return {
            workflowId: workflow.id,
            workflowName: workflow.name,
            results: results,
            success: true
        };
    }
    
    async executeStep(step, context) {
        try {
            // Get step from registry
            const stepInstance = this.stepRegistry.getStep(step.type);
            if (!stepInstance) {
                throw new Error(`Step type '${step.type}' not found`);
            }
            
            // Validate step
            await stepInstance.validate({
                ...context,
                ...step.parameters
            });
            
            // Execute step
            const result = await stepInstance.execute({
                ...context,
                ...step.parameters
            });
            
            return {
                stepName: step.name,
                stepType: step.type,
                success: result.success,
                result: result,
                timestamp: new Date()
            };
            
        } catch (error) {
            return {
                stepName: step.name,
                stepType: step.type,
                success: false,
                error: error.message,
                timestamp: new Date()
            };
        }
    }
    
    validateWorkflowData(workflowData) {
        if (!workflowData.name) {
            throw new Error('Workflow name is required');
        }
        if (!workflowData.steps || !Array.isArray(workflowData.steps)) {
            throw new Error('Workflow steps are required and must be an array');
        }
    }
    
    getActiveWorkflows() {
        return Array.from(this.activeWorkflows.keys());
    }
    
    getWorkflowStatus(workflowId) {
        const workflowInfo = this.activeWorkflows.get(workflowId);
        return workflowInfo ? workflowInfo.status : 'not_found';
    }
}

module.exports = WorkflowExecutionService;
```

## 🔄 Task 3: Refactoring Framework Migration

### 3.1 Migrate Refactoring Steps

```javascript
// backend/framework/refactoring_management/steps/refactor_code.js
class RefactorCodeStep {
    constructor() {
        this.category = 'refactoring';
        this.dependencies = ['GitService', 'BrowserManager'];
    }
    
    async execute(context) {
        try {
            const { filePath, refactoringType, parameters } = context;
            
            // Get refactoring service from framework
            const refactoringService = global.application.frameworkManager
                .getService('refactoring_management.RefactoringService');
            
            // Perform refactoring
            const result = await refactoringService.refactorCode(filePath, refactoringType, parameters);
            
            return {
                success: true,
                result: result,
                message: `Code refactored successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async validate(context) {
        const { filePath, refactoringType } = context;
        
        if (!filePath) {
            throw new Error('File path is required');
        }
        
        if (!refactoringType) {
            throw new Error('Refactoring type is required');
        }
    }
}

module.exports = RefactorCodeStep;
```

## 🔄 Task 4: Testing Framework Migration

### 4.1 Migrate Testing Steps

```javascript
// backend/framework/testing_management/steps/run_tests.js
class RunTestsStep {
    constructor() {
        this.category = 'testing';
        this.dependencies = ['GitService', 'TerminalService'];
    }
    
    async execute(context) {
        try {
            const { testType, testPath, options } = context;
            
            // Get testing service from framework
            const testingService = global.application.frameworkManager
                .getService('testing_management.TestingService');
            
            // Run tests
            const result = await testingService.runTests(testType, testPath, options);
            
            return {
                success: true,
                result: result,
                message: `Tests executed successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async validate(context) {
        const { testType } = context;
        
        if (!testType) {
            throw new Error('Test type is required');
        }
    }
}

module.exports = RunTestsStep;
```

## 🔄 Task 5: Documentation Framework Migration

### 5.1 Migrate Documentation Steps

```javascript
// backend/framework/documentation_management/steps/generate_docs.js
class GenerateDocsStep {
    constructor() {
        this.category = 'documentation';
        this.dependencies = ['FileSystemService'];
    }
    
    async execute(context) {
        try {
            const { docType, sourcePath, outputPath, options } = context;
            
            // Get documentation service from framework
            const documentationService = global.application.frameworkManager
                .getService('documentation_management.DocumentationService');
            
            // Generate documentation
            const result = await documentationService.generateDocs(docType, sourcePath, outputPath, options);
            
            return {
                success: true,
                result: result,
                message: `Documentation generated successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async validate(context) {
        const { docType, sourcePath } = context;
        
        if (!docType) {
            throw new Error('Documentation type is required');
        }
        
        if (!sourcePath) {
            throw new Error('Source path is required');
        }
    }
}

module.exports = GenerateDocsStep;
```

## 🔄 Task 6: Deployment Framework Migration

### 6.1 Migrate Deployment Steps

```javascript
// backend/framework/deployment_management/steps/deploy_application.js
class DeployApplicationStep {
    constructor() {
        this.category = 'deployment';
        this.dependencies = ['GitService', 'TerminalService'];
    }
    
    async execute(context) {
        try {
            const { deploymentType, target, options } = context;
            
            // Get deployment service from framework
            const deploymentService = global.application.frameworkManager
                .getService('deployment_management.DeploymentService');
            
            // Deploy application
            const result = await deploymentService.deploy(deploymentType, target, options);
            
            return {
                success: true,
                result: result,
                message: `Application deployed successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async validate(context) {
        const { deploymentType, target } = context;
        
        if (!deploymentType) {
            throw new Error('Deployment type is required');
        }
        
        if (!target) {
            throw new Error('Deployment target is required');
        }
    }
}

module.exports = DeployApplicationStep;
```

## 🔄 Task 7: Update Core System Integration

### 7.1 Update Application.js for Framework Integration

```javascript
// backend/Application.js
// Add framework manager integration
const FrameworkManager = require('./infrastructure/framework/FrameworkManager');

class Application {
    constructor() {
        // ... existing initialization ...
        
        // Initialize framework manager
        this.frameworkManager = new FrameworkManager();
    }
    
    async initialize() {
        // ... existing initialization ...
        
        // Initialize framework manager
        await this.frameworkManager.initialize();
        
        // Load required frameworks
        await this.loadRequiredFrameworks();
    }
    
    async loadRequiredFrameworks() {
        const requiredFrameworks = this.frameworkManager.config.getRequiredFrameworks();
        
        for (const frameworkName of requiredFrameworks) {
            try {
                await this.frameworkManager.activateFramework(frameworkName);
                console.log(`✅ Required framework '${frameworkName}' loaded`);
            } catch (error) {
                console.error(`❌ Failed to load required framework '${frameworkName}':`, error.message);
            }
        }
    }
    
    async cleanup() {
        // ... existing cleanup ...
        
        // Cleanup framework manager
        if (this.frameworkManager) {
            await this.frameworkManager.cleanup();
        }
    }
    
    // Add framework manager access
    getFrameworkManager() {
        return this.frameworkManager;
    }
}
```

### 7.2 Update StepRegistry for Framework Steps

```javascript
// backend/domain/steps/StepRegistry.js
// Add framework step support
class StepRegistry {
    constructor() {
        this.steps = new Map();
        this.categories = new Set();
        this.frameworkSteps = new Map();
    }
    
    registerStep(stepName, stepInstance) {
        // Check if it's a framework step
        if (stepName.includes('.')) {
            const [frameworkName, actualStepName] = stepName.split('.');
            this.frameworkSteps.set(stepName, {
                framework: frameworkName,
                step: actualStepName,
                instance: stepInstance
            });
        } else {
            this.steps.set(stepName, stepInstance);
        }
        
        this.categories.add(stepInstance.category);
    }
    
    unregisterStep(stepName) {
        if (stepName.includes('.')) {
            this.frameworkSteps.delete(stepName);
        } else {
            this.steps.delete(stepName);
        }
    }
    
    getStep(stepName) {
        // Check framework steps first
        if (this.frameworkSteps.has(stepName)) {
            return this.frameworkSteps.get(stepName).instance;
        }
        
        // Check core steps
        return this.steps.get(stepName);
    }
    
    getAllSteps() {
        const allSteps = new Map();
        
        // Add core steps
        for (const [name, step] of this.steps) {
            allSteps.set(name, step);
        }
        
        // Add framework steps
        for (const [name, stepInfo] of this.frameworkSteps) {
            allSteps.set(name, stepInfo.instance);
        }
        
        return allSteps;
    }
    
    getStepsByCategory(category) {
        const steps = [];
        
        // Get core steps
        for (const [name, step] of this.steps) {
            if (step.category === category) {
                steps.push({ name, step });
            }
        }
        
        // Get framework steps
        for (const [name, stepInfo] of this.frameworkSteps) {
            if (stepInfo.instance.category === category) {
                steps.push({ name, step: stepInfo.instance });
            }
        }
        
        return steps;
    }
}
```

## 📊 Phase 4 Deliverables

### **✅ TaskService Migration:**
- [ ] task_management framework created
- [ ] TaskService migrated to framework
- [ ] Task steps implemented
- [ ] TaskRepository created

### **✅ WorkflowExecutionService Migration:**
- [ ] workflow_management framework created
- [ ] WorkflowExecutionService migrated to framework
- [ ] Workflow steps implemented
- [ ] WorkflowRepository created

### **✅ Refactoring Framework Migration:**
- [ ] refactoring_management framework created
- [ ] Refactoring steps migrated
- [ ] RefactoringService implemented

### **✅ Testing Framework Migration:**
- [ ] testing_management framework created
- [ ] Testing steps migrated
- [ ] TestingService implemented

### **✅ Documentation Framework Migration:**
- [ ] documentation_management framework created
- [ ] Documentation steps migrated
- [ ] DocumentationService implemented

### **✅ Deployment Framework Migration:**
- [ ] deployment_management framework created
- [ ] Deployment steps migrated
- [ ] DeploymentService implemented

### **✅ Core System Integration:**
- [ ] Application.js updated for framework integration
- [ ] StepRegistry updated for framework steps
- [ ] Framework manager integration complete

## 🚀 Success Criteria

### **Phase 4 Success Indicators:**
- [ ] All business logic services migrated to frameworks
- [ ] All framework steps implemented and working
- [ ] Core system integration complete
- [ ] Framework activation/deactivation working
- [ ] All tests pass
- [ ] Performance requirements met
- [ ] Documentation updated

## 🔄 Next Steps

### **After Phase 4 Completion:**
1. **Phase 5**: Integration & Testing
   - Integrate framework system with existing application
   - Test framework activation/deactivation
   - Test fallback to core when framework unavailable
   - Performance testing of framework loading

## 📝 Notes & Updates

### **2024-12-19 - Phase 4 Planning:**
- Planned migration of all business logic services to frameworks
- Designed framework step implementations
- Planned core system integration updates
- Created comprehensive migration strategy

### **Key Migration Decisions:**
- TaskService and WorkflowExecutionService move to frameworks
- All business logic steps move to appropriate frameworks
- Core system remains focused on infrastructure
- Framework integration provides dynamic loading
- Backward compatibility maintained during migration 