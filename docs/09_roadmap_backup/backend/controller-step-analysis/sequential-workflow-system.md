# Sequentielles Workflow-System - PIDEA Dev Tool

## 🎯 **Korrekte Architektur: Nur sequentielle Ausführung**

### **Warum KEINE Parallelität:**
- **Ein Cursor Chat** kann nur **eine Aufgabe** bearbeiten
- **AI Response** muss **abgewartet** werden
- **Bestätigung** muss **manuell** erfolgen
- **Git Operations** sind **sequentiell**

### **✅ Korrekte sequentielle Ausführung:**

#### **1. Einzelner Task**
```javascript
// backend/domain/services/WorkflowOrchestrationService.js
class WorkflowOrchestrationService {
  async executeWorkflow(task, workflowConfig = null) {
    // 1. Workflow automatisch erkennen
    if (!workflowConfig) {
      workflowConfig = await this.detectWorkflow(task);
    }
    
    // 2. Steps SEQUENTIELL ausführen
    const workflow = await this.composeWorkflowFromSteps(workflowConfig.steps);
    return await workflow.execute({
      task,
      projectPath: task.metadata?.projectPath,
      ...workflowConfig.options
    });
  }
}
```

#### **2. Sequentieller Workflow**
```javascript
// backend/domain/workflows/ComposedWorkflow.js
class ComposedWorkflow {
  async execute(context) {
    const startTime = Date.now();
    const results = [];
    
    // Steps SEQUENTIELL ausführen - ein nach dem anderen
    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      
      try {
        // Step ausführen und auf Response warten
        const stepResult = await step.execute(context);
        results.push(stepResult);
        
        // Bei Fehler abbrechen
        if (!stepResult.success) {
          throw new Error(`Step ${step.name} failed: ${stepResult.error}`);
        }
        
        // Auf Bestätigung warten (falls erforderlich)
        if (step.requiresConfirmation) {
          await this.waitForConfirmation(stepResult);
        }
        
      } catch (error) {
        // Rollback bei Fehler
        if (this.rollbackStrategy) {
          await this.rollbackStrategy.rollback(context, i, results);
        }
        throw error;
      }
    }
    
    return {
      success: true,
      results,
      duration: Date.now() - startTime
    };
  }
  
  async waitForConfirmation(stepResult) {
    // Auf manuelle Bestätigung warten
    return new Promise((resolve) => {
      // Event-basiertes System für Bestätigung
      this.eventBus.once('task.confirmed', resolve);
    });
  }
}
```

#### **3. Sequentieller Step**
```javascript
// backend/domain/steps/RefactoringStep.js
class RefactoringStep {
  async execute(context) {
    const { task } = context;
    
    // 1. Neuen Chat erstellen
    await this.cursorIDEService.browserManager.clickNewChat();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Prompt senden und auf Response warten
    const prompt = await this.buildRefactoringPrompt(task);
    const result = await this.cursorIDEService.sendMessage(prompt, {
      waitForResponse: true,
      timeout: 300000
    });
    
    // 3. Auf Bestätigung warten (falls erforderlich)
    if (context.options.autoConfirm) {
      await this.autoConfirm(result);
    } else {
      await this.waitForManualConfirmation(result);
    }
    
    return {
      success: true,
      result: result,
      stepName: 'RefactoringStep',
      timestamp: new Date()
    };
  }
  
  async waitForManualConfirmation(result) {
    // Auf manuelle Bestätigung warten
    return new Promise((resolve) => {
      // Event-basiertes System
      this.eventBus.once('refactoring.confirmed', resolve);
    });
  }
}
```

## 🔄 **Batch-Task-Execution (Sequentiell)**

### **Korrekte sequentielle Batch-Ausführung:**
```javascript
// backend/domain/services/BatchTaskService.js
class BatchTaskService {
  async executeBatchTasks(tasks, options = {}) {
    const results = [];
    const { projectId } = options;
    
    // Tasks SEQUENTIELL ausführen - ein nach dem anderen
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      try {
        console.log(`Executing task ${i + 1}/${tasks.length}: ${task.title}`);
        
        // Einzelnen Task ausführen und auf Completion warten
        const result = await this.executeSingleTask(task);
        results.push(result);
        
        // Kurze Pause zwischen Tasks
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Task ${task.title} failed:`, error.message);
        results.push({
          success: false,
          task: task,
          error: error.message
        });
        
        // Bei Fehler abbrechen oder weitermachen
        if (options.stopOnError) {
          break;
        }
      }
    }
    
    return {
      success: true,
      results,
      summary: this.generateSummary(results)
    };
  }
  
  async executeSingleTask(task) {
    // Workflow automatisch erkennen und SEQUENTIELL ausführen
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
      successRate: (successful / results.length) * 100,
      executionType: 'sequential'
    };
  }
}
```

## 🎯 **Projekt-basierte Isolation**

### **Mehrere Projekte können parallel arbeiten:**
```javascript
// backend/domain/services/MultiProjectService.js
class MultiProjectService {
  async executeTasksForMultipleProjects(projectTasks) {
    const projectResults = {};
    
    // Projekte können parallel arbeiten (verschiedene Cursor-Instanzen)
    const projectPromises = projectTasks.map(async (projectTask) => {
      const { projectId, tasks } = projectTask;
      
      // Jedes Projekt arbeitet SEQUENTIELL
      const batchService = new BatchTaskService();
      const result = await batchService.executeBatchTasks(tasks, {
        projectId: projectId
      });
      
      return { projectId, result };
    });
    
    // Warten auf alle Projekte
    const results = await Promise.all(projectPromises);
    
    // Ergebnisse gruppieren
    results.forEach(({ projectId, result }) => {
      projectResults[projectId] = result;
    });
    
    return projectResults;
  }
}

// Beispiel: Mehrere Projekte parallel
const projectTasks = [
  {
    projectId: 'project-a',
    tasks: [
      { title: 'Refactor Auth', type: 'refactor', filePath: 'src/auth/AuthService.js' },
      { title: 'Add Tests', type: 'testing', filePath: 'src/auth/AuthService.test.js' }
    ]
  },
  {
    projectId: 'project-b', 
    tasks: [
      { title: 'Create Component', type: 'feature', filePath: 'src/components/Button.jsx' }
    ]
  }
];

// Projekte arbeiten parallel, Tasks innerhalb Projekts sequentiell
const results = await multiProjectService.executeTasksForMultipleProjects(projectTasks);
```

## 🎨 **Frontend: Sequentieller Progress**

### **Sequentieller Progress-Tracker:**
```javascript
// frontend/src/components/SequentialProgress.jsx
const SequentialProgress = ({ tasks, onProgress }) => {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [results, setResults] = useState([]);
  
  const executeSequentially = async () => {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      // Aktuellen Task markieren
      setCurrentTaskIndex(i);
      onProgress?.({
        current: i + 1,
        total: tasks.length,
        task: task,
        status: 'executing'
      });
      
      try {
        // Task ausführen und auf Completion warten
        const result = await taskService.executeTask(task);
        
        setResults(prev => [...prev, result]);
        onProgress?.({
          current: i + 1,
          total: tasks.length,
          task: task,
          status: 'completed',
          result: result
        });
        
      } catch (error) {
        setResults(prev => [...prev, { success: false, error }]);
        onProgress?.({
          current: i + 1,
          total: tasks.length,
          task: task,
          status: 'failed',
          error: error
        });
      }
    }
  };
  
  return (
    <div className="sequential-progress">
      <h3>Sequential Task Execution</h3>
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${(currentTaskIndex / tasks.length) * 100}%` }}
        />
      </div>
      
      <div className="task-list">
        {tasks.map((task, index) => (
          <div 
            key={index}
            className={`task-item ${index === currentTaskIndex ? 'current' : ''}`}
          >
            <span className="task-number">{index + 1}</span>
            <span className="task-title">{task.title}</span>
            <span className="task-status">
              {index < currentTaskIndex ? '✅' : 
               index === currentTaskIndex ? '🔄' : '⏳'}
            </span>
          </div>
        ))}
      </div>
      
      <button onClick={executeSequentially}>
        Execute Sequentially
      </button>
    </div>
  );
};
```

## 🎯 **Vorteile der sequentiellen Ausführung:**

### **1. Chat-basiert korrekt**
- **Ein Chat** pro Task
- **Response warten** vor nächstem Task
- **Bestätigung** vor Fortsetzung

### **2. Fehlerbehandlung**
- **Stop bei Fehler** möglich
- **Rollback** bei Fehlern
- **Kontinuierliche Ausführung** bei Fehlern

### **3. Progress-Tracking**
- **Aktueller Task** sichtbar
- **Fortschritt** in Echtzeit
- **Ergebnisse** pro Task

### **4. Projekt-Isolation**
- **Mehrere Projekte** parallel möglich
- **Verschiedene Cursor-Instanzen**
- **Unabhängige Ausführung**

## 🚀 **Zusammenfassung:**

- ✅ **Sequentiell** - ein Task nach dem anderen
- ✅ **Chat-basiert** - warten auf Cursor Response
- ✅ **Bestätigung** - warten auf manuelle Bestätigung
- ✅ **Projekt-Isolation** - mehrere Projekte parallel möglich
- ❌ **Keine Parallelität** innerhalb eines Projekts

Das ist die **korrekte Architektur** für ein Chat-basiertes Dev Tool! 🎉 