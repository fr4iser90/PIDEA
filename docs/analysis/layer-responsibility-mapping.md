# Layer Responsibility Mapping - PIDEA Backend

## 🎯 **Executive Summary**

### **❌ Aktuelle Probleme:**
- **Layer Violations** - Business Logic in Controllern
- **Cross-Layer Dependencies** - Verletzung der Clean Architecture
- **Unklare Verantwortlichkeiten** zwischen Layern
- **Infrastructure Concerns** in Domain Layer

### **✅ Empfohlene Lösung:**
- **Strikte Layer-Trennung** nach Clean Architecture
- **Business Logic** in Domain Services
- **Controller** nur für HTTP-Handling
- **Dependency Injection** für Layer-Kommunikation

## 📊 **Clean Architecture Layer Mapping**

### **1. Presentation Layer** (API & Controllers)
```javascript
// Verantwortlichkeiten:
✅ HTTP Request/Response Handling
✅ Input Validation & Sanitization
✅ Response Formatting & Status Codes
✅ Authentication & Authorization
✅ Error Response Formatting

// NICHT erlaubt:
❌ Business Logic
❌ Database Operations
❌ External Service Calls
❌ Domain Logic

// Beispiele:
class TaskController {
  async createTask(req, res) {
    // ✅ Input validieren
    const { title, type, projectId } = req.body;
    
    // ✅ Service aufrufen (keine Business Logic)
    const task = await this.taskService.createTask({
      title, type, projectId, userId: req.user.id
    });
    
    // ✅ Response formatieren
    res.status(201).json({
      success: true,
      data: task
    });
  }
}
```

### **2. Application Layer** (Use Cases & Application Services)
```javascript
// Verantwortlichkeiten:
✅ Use Case Orchestration
✅ Transaction Management
✅ Service Coordination
✅ Business Workflow Management
✅ Application-Specific Logic

// NICHT erlaubt:
❌ HTTP Concerns
❌ Database Implementation Details
❌ External Service Implementation

// Beispiele:
class TaskService {
  async createTask(taskData) {
    // ✅ Business Logic orchestrieren
    const task = await this.taskRepository.create(taskData);
    
    // ✅ Domain Events auslösen
    await this.eventBus.publish('task.created', { taskId: task.id });
    
    // ✅ Workflow starten falls nötig
    if (task.autoExecute) {
      await this.workflowOrchestrationService.executeWorkflow(task);
    }
    
    return task;
  }
}
```

### **3. Domain Layer** (Domain Services, Entities, Value Objects)
```javascript
// Verantwortlichkeiten:
✅ Business Rules & Logic
✅ Domain Entities & Value Objects
✅ Domain Services
✅ Business Validation
✅ Domain Events

// NICHT erlaubt:
❌ Infrastructure Concerns
❌ External Dependencies
❌ Framework-Specific Code

// Beispiele:
class Task {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.type = new TaskType(data.type);
    this.status = new TaskStatus(data.status);
  }
  
  // ✅ Business Logic
  canExecute() {
    return this.status.value === 'pending' && this.type.isExecutable();
  }
  
  // ✅ Business Rules
  validate() {
    if (!this.title || this.title.length < 3) {
      throw new DomainException('Task title must be at least 3 characters');
    }
  }
}
```

### **4. Infrastructure Layer** (External Services, Repositories)
```javascript
// Verantwortlichkeiten:
✅ Database Operations
✅ External API Calls
✅ File System Operations
✅ Configuration Management
✅ Logging & Monitoring

// NICHT erlaubt:
❌ Business Logic
❌ Domain Rules
❌ Application Logic

// Beispiele:
class TaskRepository {
  async create(taskData) {
    // ✅ Database Operation
    const query = 'INSERT INTO tasks (id, title, type, status) VALUES (?, ?, ?, ?)';
    const result = await this.database.execute(query, [
      taskData.id, taskData.title, taskData.type, taskData.status
    ]);
    
    return result;
  }
}
```

## 🔍 **Identifizierte Layer Violations**

### **❌ Violation 1: Business Logic in Controllers**
```javascript
// PROBLEM: TaskController hat Business Logic
class TaskController {
  async executeTask(req, res) {
    const { taskId } = req.params;
    
    // ❌ VIOLATION: Business Logic in Controller
    const task = await this.taskRepository.findById(taskId);
    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Task cannot be executed'
      });
    }
    
    // ❌ VIOLATION: Workflow Logic in Controller
    const workflow = await this.createWorkflowFromTask(task);
    const result = await workflow.execute();
    
    res.json({ success: true, result });
  }
}

// LÖSUNG: Business Logic in Service verschieben
class TaskController {
  async executeTask(req, res) {
    const { taskId } = req.params;
    
    // ✅ Service aufrufen (Business Logic ist im Service)
    const result = await this.taskService.executeTask(taskId);
    
    res.json(result);
  }
}
```

### **❌ Violation 2: Infrastructure in Domain**
```javascript
// PROBLEM: Domain Service hat Infrastructure Dependencies
class WorkflowOrchestrationService {
  constructor() {
    // ❌ VIOLATION: Infrastructure in Domain
    this.database = new DatabaseConnection();
    this.fileSystem = require('fs');
  }
  
  async executeWorkflow(task) {
    // ❌ VIOLATION: Database Operation in Domain
    const workflow = await this.database.query(
      'SELECT * FROM workflows WHERE task_id = ?', [task.id]
    );
    
    // ❌ VIOLATION: File System in Domain
    const config = JSON.parse(this.fileSystem.readFileSync('config.json'));
  }
}

// LÖSUNG: Dependency Injection verwenden
class WorkflowOrchestrationService {
  constructor(workflowRepository, configService) {
    // ✅ Dependencies injiziert
    this.workflowRepository = workflowRepository;
    this.configService = configService;
  }
  
  async executeWorkflow(task) {
    // ✅ Repository Pattern verwenden
    const workflow = await this.workflowRepository.findByTaskId(task.id);
    const config = await this.configService.getConfig();
  }
}
```

### **❌ Violation 3: Cross-Layer Dependencies**
```javascript
// PROBLEM: Controller hat direkte Domain Dependencies
class TaskController {
  constructor() {
    // ❌ VIOLATION: Domain Entities direkt in Controller
    this.Task = require('@domain/entities/Task');
    this.TaskType = require('@domain/value-objects/TaskType');
  }
  
  async createTask(req, res) {
    // ❌ VIOLATION: Domain Logic in Controller
    const taskType = new this.TaskType(req.body.type);
    if (!taskType.isValid()) {
      return res.status(400).json({ error: 'Invalid task type' });
    }
    
    const task = new this.Task(req.body);
    // ...
  }
}

// LÖSUNG: Service Layer verwenden
class TaskController {
  constructor(taskService) {
    this.taskService = taskService;
  }
  
  async createTask(req, res) {
    // ✅ Service kümmert sich um Domain Logic
    const task = await this.taskService.createTask(req.body);
    res.json({ success: true, data: task });
  }
}
```

### **❌ Violation 4: Presentation in Domain**
```javascript
// PROBLEM: Domain Service hat Presentation Concerns
class AnalysisService {
  async analyzeProject(projectPath) {
    const result = await this.performAnalysis(projectPath);
    
    // ❌ VIOLATION: Presentation Logic in Domain
    return {
      success: true,
      data: result,
      message: 'Analysis completed successfully',
      timestamp: new Date().toISOString()
    };
  }
}

// LÖSUNG: Domain Service nur Domain Data zurückgeben
class AnalysisService {
  async analyzeProject(projectPath) {
    const result = await this.performAnalysis(projectPath);
    
    // ✅ Nur Domain Data zurückgeben
    return {
      analysisId: result.id,
      findings: result.findings,
      recommendations: result.recommendations,
      completedAt: result.completedAt
    };
  }
}
```

## 🎯 **Korrekte Layer-Struktur**

### **✅ Korrekte Dependencies (Innere Layer kennen äußere Layer nicht)**
```javascript
// ✅ RICHTIG: Dependencies zeigen nach innen
Presentation Layer → Application Layer → Domain Layer ← Infrastructure Layer

// ✅ RICHTIG: Domain Layer kennt keine anderen Layer
class Task {
  // Domain Logic - keine Dependencies zu anderen Layern
  canExecute() { return this.status === 'pending'; }
}

// ✅ RICHTIG: Infrastructure implementiert Domain Interfaces
class TaskRepository implements ITaskRepository {
  async findById(id) { /* Database implementation */ }
}

// ✅ RICHTIG: Application Layer orchestriert
class TaskService {
  constructor(taskRepository, eventBus) {
    this.taskRepository = taskRepository; // Infrastructure
    this.eventBus = eventBus; // Infrastructure
  }
  
  async createTask(taskData) {
    const task = new Task(taskData); // Domain
    await this.taskRepository.save(task); // Infrastructure
    await this.eventBus.publish('task.created', { task }); // Infrastructure
  }
}
```

### **✅ Korrekte Controller-Struktur**
```javascript
// ✅ RICHTIG: Controller nur HTTP-Handling
class TaskController {
  constructor(taskService, validationService) {
    this.taskService = taskService; // Application Layer
    this.validationService = validationService; // Application Layer
  }
  
  async createTask(req, res) {
    try {
      // ✅ Input Validation
      const validationResult = await this.validationService.validateTask(req.body);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          errors: validationResult.errors
        });
      }
      
      // ✅ Service Call (keine Business Logic)
      const task = await this.taskService.createTask(req.body);
      
      // ✅ Response Formatting
      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully'
      });
      
    } catch (error) {
      // ✅ Error Handling
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
```

### **✅ Korrekte Service-Struktur**
```javascript
// ✅ RICHTIG: Application Service orchestriert
class TaskService {
  constructor(taskRepository, workflowService, eventBus) {
    this.taskRepository = taskRepository; // Infrastructure
    this.workflowService = workflowService; // Application
    this.eventBus = eventBus; // Infrastructure
  }
  
  async createTask(taskData) {
    // ✅ Business Logic orchestrieren
    const task = new Task(taskData); // Domain
    
    // ✅ Domain Validation
    task.validate();
    
    // ✅ Persistence
    const savedTask = await this.taskRepository.save(task);
    
    // ✅ Domain Events
    await this.eventBus.publish('task.created', { task: savedTask });
    
    // ✅ Workflow Management
    if (task.autoExecute) {
      await this.workflowService.executeWorkflow(savedTask);
    }
    
    return savedTask;
  }
}
```

## 🚀 **Refactoring Plan**

### **Phase 1: Controller Cleanup**
1. **Business Logic** aus Controllern entfernen
2. **Service Layer** für alle Business Operations erstellen
3. **Input Validation** in separate Services verschieben
4. **Response Formatting** standardisieren

### **Phase 2: Domain Layer Isolation**
1. **Infrastructure Dependencies** aus Domain entfernen
2. **Dependency Injection** für Domain Services implementieren
3. **Domain Events** implementieren
4. **Domain Validation** zentralisieren

### **Phase 3: Infrastructure Layer Cleanup**
1. **Repository Pattern** konsistent implementieren
2. **External Service Abstractions** erstellen
3. **Configuration Management** zentralisieren
4. **Error Handling** standardisieren

### **Phase 4: Application Layer Enhancement**
1. **Use Case Services** erstellen
2. **Transaction Management** implementieren
3. **Service Coordination** verbessern
4. **Event Handling** zentralisieren

## 🎉 **Ergebnis**

### **Vorher:**
- **Layer Violations** in Controllern und Services
- **Business Logic** in Presentation Layer
- **Infrastructure Concerns** in Domain Layer
- **Cross-Layer Dependencies** verletzen Clean Architecture

### **Nachher:**
- **Saubere Layer-Trennung** nach Clean Architecture
- **Business Logic** nur in Domain und Application Layer
- **Controller** nur für HTTP-Handling
- **Dependency Injection** für saubere Kommunikation
- **Testbare und wartbare Architektur**

**Das ist professionelle Clean Architecture!** 🚀 