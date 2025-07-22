# Intelligentes Workflow-System - PIDEA Dev Tool

## 🎯 **Intelligente Workflow-Auswahl**

### **1. Automatische Workflow-Erkennung**
```javascript
// backend/domain/services/WorkflowOrchestrationService.js
class WorkflowOrchestrationService {
  async executeWorkflow(task, workflowConfig = null) {
    // 1. Workflow automatisch erkennen (falls nicht angegeben)
    if (!workflowConfig) {
      workflowConfig = await this.detectWorkflow(task);
    }
    
    // 2. Workflow ausführen
    return await this.executeWorkflowWithConfig(task, workflowConfig);
  }
  
  async detectWorkflow(task) {
    const { type, title, description, filePath, projectId } = task;
    
    // Basierend auf Task-Typ
    switch (type) {
      case 'refactor':
        return this.getRefactoringWorkflow(task);
      case 'feature':
        return this.getFeatureWorkflow(task);
      case 'testing':
        return this.getTestingWorkflow(task);
      case 'framework':
        return this.getFrameworkWorkflow(task);
      case 'ide':
        return this.getIDEWorkflow(task);
      default:
        return this.getGenericWorkflow(task);
    }
  }
  
  async getRefactoringWorkflow(task) {
    // Refactoring-Workflow mit Auto-Confirm
    return {
      steps: {
        analysis: true,
        refactoring: true,
        validation: true,
        autoConfirm: true,
        gitBranch: true,
        gitCommit: true,
        testing: false,
        documentation: false
      },
      options: {
        autoConfirm: true,
        createBranch: true,
        timeout: 300000
      }
    };
  }
  
  async getFeatureWorkflow(task) {
    // Feature-Workflow mit Tests und Dokumentation
    return {
      steps: {
        analysis: true,
        refactoring: false,
        validation: true,
        autoConfirm: false,
        gitBranch: true,
        gitCommit: true,
        testing: true,
        documentation: true
      },
      options: {
        autoConfirm: false,
        createBranch: true,
        timeout: 600000
      }
    };
  }
  
  async getFrameworkWorkflow(task) {
    // Framework-spezifischer Workflow
    const framework = await this.detectFramework(task.filePath);
    
    return {
      steps: {
        analysis: true,
        frameworkAnalysis: true,
        componentGeneration: true,
        validation: true,
        autoConfirm: true,
        gitBranch: true,
        gitCommit: true,
        testing: true,
        documentation: true
      },
      options: {
        autoConfirm: true,
        createBranch: true,
        framework: framework,
        timeout: 450000
      }
    };
  }
  
  async getIDEWorkflow(task) {
    // IDE-spezifischer Workflow
    const ide = await this.detectIDE(task.projectId);
    
    return {
      steps: {
        analysis: true,
        idePrompt: true,
        refactoring: true,
        validation: true,
        autoConfirm: true,
        gitBranch: true,
        gitCommit: true,
        testing: false,
        documentation: false
      },
      options: {
        autoConfirm: true,
        createBranch: true,
        ide: ide,
        timeout: 300000
      }
    };
  }
}
```

### **2. Batch-Task-Execution**
```javascript
// backend/domain/services/BatchTaskService.js
class BatchTaskService {
  async executeBatchTasks(tasks, options = {}) {
    const results = [];
    const { parallel = false, maxConcurrent = 3 } = options;
    
    if (parallel) {
      // Parallele Ausführung
      const chunks = this.chunkArray(tasks, maxConcurrent);
      
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(task => this.executeSingleTask(task))
        );
        results.push(...chunkResults);
      }
    } else {
      // Sequentielle Ausführung
      for (const task of tasks) {
        const result = await this.executeSingleTask(task);
        results.push(result);
      }
    }
    
    return {
      success: true,
      results,
      summary: this.generateSummary(results)
    };
  }
  
  async executeSingleTask(task) {
    // Workflow automatisch erkennen und ausführen
    const workflowOrchestrator = new WorkflowOrchestrationService();
    return await workflowOrchestrator.executeWorkflow(task);
  }
  
  generateSummary(results) {
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    return {
      total: results.length,
      successful,
      failed,
      successRate: (successful / results.length) * 100
    };
  }
}
```

## 🎨 **Frontend Workflow-Editor**

### **1. Workflow-Editor Komponente**
```javascript
// frontend/src/components/WorkflowEditor.jsx
import React, { useState, useEffect } from 'react';
import { WorkflowStepToggle } from './WorkflowStepToggle';
import { WorkflowOptions } from './WorkflowOptions';
import { WorkflowPreview } from './WorkflowPreview';

const WorkflowEditor = ({ 
  initialWorkflow = null, 
  taskType = 'refactor',
  onWorkflowChange 
}) => {
  const [workflow, setWorkflow] = useState(initialWorkflow || getDefaultWorkflow(taskType));
  const [availableSteps, setAvailableSteps] = useState([]);
  
  useEffect(() => {
    // Verfügbare Steps basierend auf Task-Typ laden
    loadAvailableSteps(taskType);
  }, [taskType]);
  
  const loadAvailableSteps = async (type) => {
    const steps = await api.get(`/api/workflows/steps/${type}`);
    setAvailableSteps(steps);
  };
  
  const handleStepToggle = (stepName, enabled) => {
    const newWorkflow = {
      ...workflow,
      steps: {
        ...workflow.steps,
        [stepName]: enabled
      }
    };
    
    setWorkflow(newWorkflow);
    onWorkflowChange?.(newWorkflow);
  };
  
  const handleOptionChange = (optionName, value) => {
    const newWorkflow = {
      ...workflow,
      options: {
        ...workflow.options,
        [optionName]: value
      }
    };
    
    setWorkflow(newWorkflow);
    onWorkflowChange?.(newWorkflow);
  };
  
  const resetToDefault = () => {
    const defaultWorkflow = getDefaultWorkflow(taskType);
    setWorkflow(defaultWorkflow);
    onWorkflowChange?.(defaultWorkflow);
  };
  
  const saveAsTemplate = async (templateName) => {
    await api.post('/api/workflows/templates', {
      name: templateName,
      type: taskType,
      workflow: workflow
    });
  };
  
  return (
    <div className="workflow-editor">
      <div className="workflow-header">
        <h3>Workflow Editor - {taskType}</h3>
        <div className="workflow-actions">
          <button onClick={resetToDefault}>Reset to Default</button>
          <button onClick={() => saveAsTemplate('My Template')}>Save as Template</button>
        </div>
      </div>
      
      <div className="workflow-content">
        <div className="workflow-steps">
          <h4>Steps</h4>
          {availableSteps.map(step => (
            <WorkflowStepToggle
              key={step.name}
              step={step}
              enabled={workflow.steps[step.name] || false}
              onToggle={(enabled) => handleStepToggle(step.name, enabled)}
            />
          ))}
        </div>
        
        <div className="workflow-options">
          <h4>Options</h4>
          <WorkflowOptions
            options={workflow.options}
            onChange={handleOptionChange}
          />
        </div>
        
        <div className="workflow-preview">
          <h4>Preview</h4>
          <WorkflowPreview workflow={workflow} />
        </div>
      </div>
    </div>
  );
};

export default WorkflowEditor;
```

### **2. Workflow-Step-Toggle Komponente**
```javascript
// frontend/src/components/WorkflowStepToggle.jsx
const WorkflowStepToggle = ({ step, enabled, onToggle }) => {
  return (
    <div className="workflow-step-toggle">
      <div className="step-info">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          id={`step-${step.name}`}
        />
        <label htmlFor={`step-${step.name}`}>
          <strong>{step.displayName}</strong>
          <span className="step-description">{step.description}</span>
        </label>
      </div>
      
      <div className="step-details">
        <span className="step-category">{step.category}</span>
        <span className="step-duration">{step.estimatedDuration}s</span>
      </div>
      
      {enabled && step.configurable && (
        <div className="step-config">
          <input
            type="text"
            placeholder={step.configPlaceholder}
            defaultValue={step.defaultConfig}
            onChange={(e) => step.onConfigChange?.(e.target.value)}
          />
        </div>
      )}
    </div>
  );
};
```

### **3. Workflow-Options Komponente**
```javascript
// frontend/src/components/WorkflowOptions.jsx
const WorkflowOptions = ({ options, onChange }) => {
  return (
    <div className="workflow-options">
      <div className="option-group">
        <h5>Git Options</h5>
        <label>
          <input
            type="checkbox"
            checked={options.createBranch || false}
            onChange={(e) => onChange('createBranch', e.target.checked)}
          />
          Create Git Branch
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={options.autoCommit || false}
            onChange={(e) => onChange('autoCommit', e.target.checked)}
          />
          Auto Commit Changes
        </label>
      </div>
      
      <div className="option-group">
        <h5>Confirmation Options</h5>
        <label>
          <input
            type="checkbox"
            checked={options.autoConfirm || false}
            onChange={(e) => onChange('autoConfirm', e.target.checked)}
          />
          Auto Confirm Changes
        </label>
        
        <label>
          Confirmation Timeout (ms):
          <input
            type="number"
            value={options.confirmationTimeout || 5000}
            onChange={(e) => onChange('confirmationTimeout', parseInt(e.target.value))}
            min="1000"
            max="60000"
          />
        </label>
      </div>
      
      <div className="option-group">
        <h5>Performance Options</h5>
        <label>
          Timeout (ms):
          <input
            type="number"
            value={options.timeout || 300000}
            onChange={(e) => onChange('timeout', parseInt(e.target.value))}
            min="30000"
            max="1800000"
          />
        </label>
        
        <label>
          Max Retries:
          <input
            type="number"
            value={options.maxRetries || 3}
            onChange={(e) => onChange('maxRetries', parseInt(e.target.value))}
            min="0"
            max="10"
          />
        </label>
      </div>
    </div>
  );
};
```

### **4. Workflow-Preview Komponente**
```javascript
// frontend/src/components/WorkflowPreview.jsx
const WorkflowPreview = ({ workflow }) => {
  const enabledSteps = Object.entries(workflow.steps)
    .filter(([name, enabled]) => enabled)
    .map(([name, enabled]) => name);
  
  const estimatedDuration = enabledSteps.reduce((total, stepName) => {
    const step = getStepInfo(stepName);
    return total + (step?.estimatedDuration || 30);
  }, 0);
  
  return (
    <div className="workflow-preview">
      <div className="preview-steps">
        <h5>Execution Order:</h5>
        <ol>
          {enabledSteps.map((stepName, index) => (
            <li key={stepName}>
              <strong>{getStepDisplayName(stepName)}</strong>
              <span className="step-duration">
                (~{getStepInfo(stepName)?.estimatedDuration || 30}s)
              </span>
            </li>
          ))}
        </ol>
      </div>
      
      <div className="preview-summary">
        <div className="summary-item">
          <strong>Total Steps:</strong> {enabledSteps.length}
        </div>
        <div className="summary-item">
          <strong>Estimated Duration:</strong> {estimatedDuration}s
        </div>
        <div className="summary-item">
          <strong>Git Branch:</strong> {workflow.options.createBranch ? 'Yes' : 'No'}
        </div>
        <div className="summary-item">
          <strong>Auto Confirm:</strong> {workflow.options.autoConfirm ? 'Yes' : 'No'}
        </div>
      </div>
      
      <div className="preview-json">
        <h5>JSON Configuration:</h5>
        <pre>{JSON.stringify(workflow, null, 2)}</pre>
      </div>
    </div>
  );
};
```

## 🎯 **Task Management UI mit Workflow-Editor**

### **Haupt-Task-Management**
```javascript
// frontend/src/components/TaskManagement.jsx
const TaskManagement = () => {
  const [selectedTaskType, setSelectedTaskType] = useState('refactor');
  const [customWorkflow, setCustomWorkflow] = useState(null);
  const [showWorkflowEditor, setShowWorkflowEditor] = useState(false);
  
  const handleQuickAction = async (action, filePath) => {
    // Schnelle Aktionen mit Standard-Workflows
    const result = await taskService.executeTask({
      title: `${action} ${filePath}`,
      type: action,
      projectId: currentProject.id,
      filePath: filePath
    });
    
    setResult(result);
  };
  
  const handleCustomAction = async (taskData) => {
    // Benutzerdefinierte Aktionen mit Workflow-Editor
    const result = await taskService.executeTask(taskData, customWorkflow);
    setResult(result);
  };
  
  const handleBatchExecution = async (tasks) => {
    // Batch-Ausführung mehrerer Tasks
    const result = await batchService.executeBatchTasks(tasks, {
      parallel: true,
      maxConcurrent: 3
    });
    
    setBatchResult(result);
  };
  
  return (
    <div className="task-management">
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <button onClick={() => handleQuickAction('refactor', 'src/auth/AuthService.js')}>
          Auto Refactor
        </button>
        <button onClick={() => handleQuickAction('analyze', 'src/auth/AuthService.js')}>
          Analyze Code
        </button>
        <button onClick={() => handleQuickAction('test', 'src/auth/AuthService.js')}>
          Generate Tests
        </button>
      </div>
      
      <div className="custom-workflow">
        <h3>Custom Workflow</h3>
        <select 
          value={selectedTaskType} 
          onChange={(e) => setSelectedTaskType(e.target.value)}
        >
          <option value="refactor">Refactoring</option>
          <option value="feature">Feature Development</option>
          <option value="testing">Testing</option>
          <option value="framework">Framework</option>
          <option value="ide">IDE Integration</option>
        </select>
        
        <button onClick={() => setShowWorkflowEditor(true)}>
          Edit Workflow
        </button>
        
        <button onClick={() => handleCustomAction({
          title: 'Custom Task',
          type: selectedTaskType,
          projectId: currentProject.id,
          filePath: 'src/auth/AuthService.js'
        })}>
          Execute Custom Workflow
        </button>
      </div>
      
      {showWorkflowEditor && (
        <div className="workflow-editor-modal">
          <WorkflowEditor
            taskType={selectedTaskType}
            onWorkflowChange={setCustomWorkflow}
            onClose={() => setShowWorkflowEditor(false)}
          />
        </div>
      )}
      
      <div className="batch-execution">
        <h3>Batch Execution</h3>
        <button onClick={() => handleBatchExecution([
          { title: 'Refactor Auth', type: 'refactor', filePath: 'src/auth/AuthService.js' },
          { title: 'Add Tests', type: 'testing', filePath: 'src/auth/AuthService.test.js' },
          { title: 'Update Docs', type: 'documentation', filePath: 'docs/auth.md' }
        ])}>
          Execute Batch Tasks
        </button>
      </div>
    </div>
  );
};
```

## 🎯 **Vorteile dieses Systems:**

### **1. Intelligente Automatisierung**
- **Automatische Workflow-Erkennung** basierend auf Task-Typ
- **Framework-Erkennung** für spezifische Workflows
- **IDE-Erkennung** für IDE-spezifische Steps

### **2. Flexibler Workflow-Editor**
- **Visueller Editor** für Workflow-Konfiguration
- **Step-Toggles** zum Aktivieren/Deaktivieren
- **Live-Preview** der Workflow-Ausführung
- **Template-System** für wiederverwendbare Workflows

### **3. Batch-Execution**
- **Parallele Ausführung** mehrerer Tasks
- **Sequentielle Ausführung** mit Abhängigkeiten
- **Progress-Tracking** und Error-Handling

### **4. Benutzerfreundlichkeit**
- **Quick Actions** für Standard-Workflows
- **Custom Workflows** für spezielle Anforderungen
- **JSON-Export/Import** für Workflow-Sharing

Dieses System macht PIDEA zu einem **echten Dev Tool** mit **intelligenter Workflow-Orchestrierung**! 🚀 