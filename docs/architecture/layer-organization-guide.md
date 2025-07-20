# Layer Organization Guide - PIDEA Architecture

## 🎯 **ARCHITEKTUR-BEGRIFFE ERKLÄRT:**

### **📋 WAS IST WAS:**

#### **🌐 PRESENTATION LAYER (API/UI):**
```javascript
✅ Controllers - REST API Endpoints
✅ Middleware - Request/Response Processing
✅ Routes - URL Mapping
✅ WebSocket Handlers - Real-time Communication
```

#### **🔧 APPLICATION LAYER (Business Logic):**
```javascript
✅ Handlers - Command/Query Processing
✅ Commands - Business Operations
✅ Queries - Data Retrieval
✅ Validators - Input Validation
```

#### **🏗️ DOMAIN LAYER (Core Business):**
```javascript
✅ Services - Business Logic
✅ Entities - Data Models
✅ Value Objects - Immutable Data
✅ Steps - Workflow Components
✅ Workflows - Process Orchestration
```

#### **🔌 INFRASTRUCTURE LAYER (External):**
```javascript
✅ Repositories - Data Access
✅ External Services - Third-party APIs
✅ Orchestrators - System Coordination
✅ Event Bus - Message Passing
✅ Logging - System Monitoring
```

## 🎯 **PROFESSIONELLE NAMING-KONVENTIONEN:**

### **📋 AKTUELLE ANALYSE:**

#### **✅ WAS KORREKT IST:**
```javascript
// ✅ Controllers - Perfekt!
ChatController, WorkflowController, AnalysisController

// ✅ Handlers - Perfekt!
SendMessageHandler, GetChatHistoryHandler, CreateTaskHandler

// ✅ Services - Perfekt!
ChatService, AnalysisService, TaskService

// ✅ Steps - Perfekt!
IDESendMessageStep, ProjectAnalysisStep, GitCommitStep

// ✅ Repositories - Perfekt!
ChatRepository, TaskRepository, AnalysisRepository
```

#### **❌ WAS KORRIGIERT WERDEN MUSS:**
```javascript
// ❌ Inkonsistente Datei-Namen
ide_send_message.js          // Sollte: IDESendMessageStep.js
git_commit.js               // Sollte: GitCommitStep.js
project_analysis_step.js    // Sollte: ProjectAnalysisStep.js

// ❌ Inkonsistente Klassen-Namen
VSCodeIDEService           // Sollte: VSCodeService
PostgreSQLChatRepository   // Sollte: ChatRepository (Interface)
SQLiteTaskRepository       // Sollte: TaskRepository (Interface)
```

### **🎯 PROFESSIONELLE STANDARDS (OHNE PREFIX/SUFFIX):**

#### **🌐 PRESENTATION LAYER:**
```javascript
// ✅ Datei-Namen
ChatController.js
WorkflowController.js
AnalysisController.js
AuthMiddleware.js
ValidationMiddleware.js

// ✅ Klassen-Namen
class ChatController {}
class WorkflowController {}
class AnalysisController {}
class AuthMiddleware {}
class ValidationMiddleware {}
```

#### **🔧 APPLICATION LAYER:**
```javascript
// ✅ Datei-Namen
SendMessageHandler.js
GetChatHistoryHandler.js
CreateTaskHandler.js
SendMessageCommand.js
GetChatHistoryQuery.js

// ✅ Klassen-Namen
class SendMessageHandler {}
class GetChatHistoryHandler {}
class CreateTaskHandler {}
class SendMessageCommand {}
class GetChatHistoryQuery {}
```

#### **🏗️ DOMAIN LAYER:**
```javascript
// ✅ Datei-Namen
ChatService.js
AnalysisService.js
TaskService.js
ChatMessage.js
AnalysisResult.js
IDESendMessageStep.js
ProjectAnalysisStep.js

// ✅ Klassen-Namen
class ChatService {}
class AnalysisService {}
class TaskService {}
class ChatMessage {}
class AnalysisResult {}
class IDESendMessageStep {}
class ProjectAnalysisStep {}
```

#### **🔌 INFRASTRUCTURE LAYER:**
```javascript
// ✅ Datei-Namen
ChatRepository.js
TaskRepository.js
AnalysisRepository.js
AnalysisOrchestrator.js
WorkflowOrchestrator.js

// ✅ Klassen-Namen
class ChatRepository {}
class TaskRepository {}
class AnalysisRepository {}
class AnalysisOrchestrator {}
class WorkflowOrchestrator {}
```

### **🎯 IMPLEMENTATION-SPEZIFISCHE NAMING:**

#### **🗄️ DATABASE IMPLEMENTATIONS:**
```javascript
// ✅ Interface (Domain)
ChatRepository.js
TaskRepository.js
AnalysisRepository.js

// ✅ Implementation (Infrastructure)
PostgreSQLChatRepository.js
SQLiteChatRepository.js
InMemoryChatRepository.js

// ✅ Klassen-Namen
class ChatRepository {}           // Interface
class PostgreSQLChatRepository extends ChatRepository {}
class SQLiteChatRepository extends ChatRepository {}
class InMemoryChatRepository extends ChatRepository {}
```

#### **🔌 EXTERNAL SERVICE IMPLEMENTATIONS:**
```javascript
// ✅ Interface (Domain)
IDEService.js
AnalysisService.js

// ✅ Implementation (Infrastructure)
CursorIDEService.js
VSCodeService.js
AdvancedAnalysisService.js

// ✅ Klassen-Namen
class IDEService {}               // Interface
class CursorIDEService implements IDEService {}
class VSCodeService implements IDEService {}
class AdvancedAnalysisService {}
```

### **🎯 PROFESSIONELLE REGELN:**

#### **✅ DATEI-NAMEN:**
```javascript
✅ PascalCase für Klassen-Dateien
✅ camelCase für Utility-Dateien
✅ Keine Prefix/Suffix
✅ Beschreibende Namen
✅ Konsistente Endungen
```

#### **✅ KLASSEN-NAMEN:**
```javascript
✅ PascalCase
✅ Keine Prefix/Suffix
✅ Beschreibende Namen
✅ Layer-spezifische Endungen
✅ Konsistente Namensgebung
```

#### **✅ METHODEN-NAMEN:**
```javascript
✅ camelCase
✅ Verb-basierte Namen
✅ Klare Aktionen
✅ Konsistente Patterns
```

#### **✅ VARIABLEN-NAMEN:**
```javascript
✅ camelCase
✅ Beschreibende Namen
✅ Keine Abkürzungen
✅ Konsistente Patterns
```

### **🎯 KORREKTUR-TEMPLATE:**

#### **📁 VON (AKTUELL):**
```
backend/domain/steps/categories/ide/ide_send_message.js
backend/domain/steps/categories/git/git_commit.js
backend/domain/steps/categories/analysis/project_analysis_step.js
```

#### **📁 NACH (PROFESSIONELL):**
```
backend/domain/steps/categories/ide/IDESendMessageStep.js
backend/domain/steps/categories/git/GitCommitStep.js
backend/domain/steps/categories/analysis/ProjectAnalysisStep.js
```

#### **🔧 KLASSEN-NAMEN:**
```javascript
// VON
class ide_send_message {}
class git_commit {}
class project_analysis_step {}

// NACH
class IDESendMessageStep {}
class GitCommitStep {}
class ProjectAnalysisStep {}
```

### **🎯 PROFESSIONELLE HIERARCHIE:**

#### **📋 LAYER-SPEZIFISCHE ENDUNGEN:**
```javascript
// 🌐 Presentation Layer
*Controller.js     // REST API Endpoints
*Middleware.js     // Request Processing
*Handler.js        // WebSocket/Real-time

// 🔧 Application Layer
*Handler.js        // Command/Query Processing
*Command.js        // Business Operations
*Query.js          // Data Retrieval
*Validator.js      // Input Validation

// 🏗️ Domain Layer
*Service.js        // Business Logic
*Entity.js         // Data Models
*Step.js           // Workflow Components
*Workflow.js       // Process Orchestration
*ValueObject.js    // Immutable Data

// 🔌 Infrastructure Layer
*Repository.js     // Data Access
*Orchestrator.js   // System Coordination
*Service.js        // External Services
*Bus.js            // Message Passing
*Logger.js         // System Monitoring
```

#### **📋 IMPLEMENTATION-SPEZIFISCHE PREFIX:**
```javascript
// 🗄️ Database Implementations
PostgreSQL*Repository.js
SQLite*Repository.js
InMemory*Repository.js

// 🔌 External Service Implementations
Cursor*Service.js
VSCode*Service.js
Advanced*Service.js
```

## 🎯 **DETAILIERTE ERKLÄRUNG:**

### **🌐 CONTROLLERS (Presentation Layer):**
```javascript
// WAS: REST API Endpoints
// WO: backend/presentation/api/
// WIE: HTTP Request/Response

class ChatController {
  async sendMessage(req, res) {
    // ✅ Validiert HTTP Request
    // ✅ Ruft Handler auf
    // ✅ Gibt JSON Response zurück
  }
}
```

### **🔧 HANDLERS (Application Layer):**
```javascript
// WAS: Command/Query Processing
// WO: backend/application/handlers/
// WIE: Business Logic Execution

class SendMessageHandler {
  async handle(command) {
    // ✅ Verarbeitet Business Commands
    // ✅ Ruft Domain Services auf
    // ✅ Gibt Business Result zurück
  }
}
```

### **📝 COMMANDS (Application Layer):**
```javascript
// WAS: Business Operations
// WO: backend/application/commands/
// WIE: Immutable Data Objects

class SendMessageCommand {
  constructor(message, userId) {
    // ✅ Definiert Business Operation
    // ✅ Validiert Input Data
    // ✅ Ist Immutable
  }
}
```

### **🔍 QUERIES (Application Layer):**
```javascript
// WAS: Data Retrieval
// WO: backend/application/queries/
// WIE: Read-only Operations

class GetChatHistoryQuery {
  constructor(sessionId, limit) {
    // ✅ Definiert Data Retrieval
    // ✅ Ist Read-only
    // ✅ Validiert Parameters
  }
}
```

### **🏗️ SERVICES (Domain Layer):**
```javascript
// WAS: Core Business Logic
// WO: backend/domain/services/
// WIE: Business Rules

class ChatService {
  async sendMessage(message, userId) {
    // ✅ Implementiert Business Rules
    // ✅ Nutzt Entities
    // ✅ Ist Domain-spezifisch
  }
}
```

### **📊 ENTITIES (Domain Layer):**
```javascript
// WAS: Data Models
// WO: backend/domain/entities/
// WIE: Business Objects

class ChatMessage {
  constructor(content, sender) {
    // ✅ Repräsentiert Business Object
    // ✅ Hat Business Methods
    // ✅ Ist Domain-spezifisch
  }
}
```

### **🔄 STEPS (Domain Layer):**
```javascript
// WAS: Workflow Components
// WO: backend/domain/steps/
// WIE: Modular Workflow Units

class IDESendMessageStep {
  async execute(context) {
    // ✅ Führt Workflow-Schritt aus
    // ✅ Ist Wiederverwendbar
    // ✅ Hat Lifecycle Management
  }
}
```

### **🎭 WORKFLOWS (Domain Layer):**
```javascript
// WAS: Process Orchestration
// WO: backend/domain/workflows/
// WIE: Step Composition

class AnalysisWorkflow {
  async execute(context) {
    // ✅ Orchestriert Steps
    // ✅ Definiert Process Flow
    // ✅ Ist Configurable
  }
}
```

### **🗄️ REPOSITORIES (Infrastructure Layer):**
```javascript
// WAS: Data Access
// WO: backend/infrastructure/database/
// WIE: Database Operations

class ChatRepository {
  async save(message) {
    // ✅ Speichert in Database
    // ✅ Ist Infrastructure-spezifisch
    // ✅ Versteckt Database Details
  }
}
```

### **🎼 ORCHESTRATORS (Infrastructure Layer):**
```javascript
// WAS: System Coordination
// WO: backend/infrastructure/external/
// WIE: Service Coordination

class AnalysisOrchestrator {
  async executeAnalysis(type, projectPath) {
    // ✅ Koordiniert Services
    // ✅ Managed Lifecycle
    // ✅ Ist Infrastructure-spezifisch
  }
}
```

## 🎯 **RICHTIGE LAYER-EINSORTIERUNG:**

### **📁 DATEI-STRUKTUR TEMPLATE:**

```
backend/
├── presentation/                    # 🌐 PRESENTATION LAYER
│   ├── api/
│   │   ├── ChatController.js       # ✅ REST API Endpoints
│   │   ├── WorkflowController.js   # ✅ Workflow API
│   │   └── AnalysisController.js   # ✅ Analysis API
│   ├── middleware/
│   │   ├── AuthMiddleware.js       # ✅ Request Processing
│   │   └── ValidationMiddleware.js # ✅ Input Validation
│   └── websocket/
│       └── WebSocketHandler.js     # ✅ Real-time Communication
│
├── application/                     # 🔧 APPLICATION LAYER
│   ├── handlers/
│   │   ├── SendMessageHandler.js   # ✅ Command Processing
│   │   └── GetChatHistoryHandler.js # ✅ Query Processing
│   ├── commands/
│   │   ├── SendMessageCommand.js   # ✅ Business Operations
│   │   └── CreateTaskCommand.js    # ✅ Business Operations
│   ├── queries/
│   │   ├── GetChatHistoryQuery.js  # ✅ Data Retrieval
│   │   └── GetAnalysisQuery.js     # ✅ Data Retrieval
│   └── validators/
│       └── InputValidator.js       # ✅ Input Validation
│
├── domain/                         # 🏗️ DOMAIN LAYER
│   ├── services/
│   │   ├── ChatService.js          # ✅ Core Business Logic
│   │   ├── AnalysisService.js      # ✅ Business Rules
│   │   └── WorkflowService.js      # ✅ Process Logic
│   ├── entities/
│   │   ├── ChatMessage.js          # ✅ Business Objects
│   │   ├── AnalysisResult.js       # ✅ Data Models
│   │   └── Task.js                 # ✅ Business Objects
│   ├── steps/
│   │   ├── IDESendMessageStep.js   # ✅ Workflow Components
│   │   ├── AnalysisStep.js         # ✅ Modular Units
│   │   └── ValidationStep.js       # ✅ Process Steps
│   ├── workflows/
│   │   ├── AnalysisWorkflow.js     # ✅ Process Orchestration
│   │   └── TaskWorkflow.js         # ✅ Step Composition
│   └── value-objects/
│       ├── ProjectPath.js          # ✅ Immutable Data
│       └── AnalysisType.js         # ✅ Value Objects
│
└── infrastructure/                 # 🔌 INFRASTRUCTURE LAYER
    ├── database/
    │   ├── ChatRepository.js       # ✅ Data Access
    │   ├── AnalysisRepository.js   # ✅ Database Operations
    │   └── TaskRepository.js       # ✅ Data Persistence
    ├── external/
    │   ├── AnalysisOrchestrator.js # ✅ System Coordination
    │   ├── WorkflowOrchestrator.js # ✅ Service Management
    │   └── IDEService.js           # ✅ External APIs
    ├── messaging/
    │   ├── EventBus.js             # ✅ Message Passing
    │   └── CommandBus.js           # ✅ Command Routing
    └── logging/
        └── Logger.js               # ✅ System Monitoring
```

## 🎯 **VERBINDUNGEN ZWISCHEN LAYERN:**

### **✅ RICHTIGE FLOWS:**

#### **🌐 Web-API Flow:**
```
Frontend → Controller → Handler → Service → Repository → Database
```

#### **🤖 Workflow Flow:**
```
Workflow-UI → Controller → Orchestrator → Steps → Services → External APIs
```

#### **📊 Analysis Flow:**
```
Analysis-UI → Controller → AnalysisOrchestrator → AnalysisSteps → AnalysisServices → Repositories
```

### **❌ FALSCH:**
```javascript
❌ Controller → Repository (überspringt Application Layer)
❌ Handler → External API (überspringt Domain Layer)
❌ Step → Database (überspringt Infrastructure Layer)
```

### **✅ RICHTIG:**
```javascript
✅ Controller → Handler → Service → Repository
✅ WorkflowController → Orchestrator → Steps → Services
✅ AnalysisController → AnalysisOrchestrator → AnalysisSteps
```

## 🎯 **NAMENSKONVENTIONEN:**

### **🌐 Presentation Layer:**
```javascript
✅ *Controller.js     // REST API Endpoints
✅ *Middleware.js     // Request Processing
✅ *Handler.js        // WebSocket/Real-time
```

### **🔧 Application Layer:**
```javascript
✅ *Handler.js        // Command/Query Processing
✅ *Command.js        // Business Operations
✅ *Query.js          // Data Retrieval
✅ *Validator.js      // Input Validation
```

### **🏗️ Domain Layer:**
```javascript
✅ *Service.js        // Business Logic
✅ *Entity.js         // Data Models
✅ *Step.js           // Workflow Components
✅ *Workflow.js       // Process Orchestration
✅ *ValueObject.js    // Immutable Data
```

### **🔌 Infrastructure Layer:**
```javascript
✅ *Repository.js     // Data Access
✅ *Orchestrator.js   // System Coordination
✅ *Service.js        // External Services
✅ *Bus.js            // Message Passing
✅ *Logger.js         // System Monitoring
```

## 🎯 **PRAKTISCHE REGELN:**

### **✅ WANN WAS VERWENDEN:**

#### **🌐 Controller verwenden für:**
- **REST API Endpoints**
- **HTTP Request/Response**
- **WebSocket Communication**
- **File Uploads/Downloads**

#### **🔧 Handler verwenden für:**
- **Command Processing**
- **Query Processing**
- **Business Logic Coordination**
- **Input Validation**

#### **🏗️ Service verwenden für:**
- **Core Business Logic**
- **Business Rules**
- **Domain-specific Operations**
- **Complex Calculations**

#### **🔄 Step verwenden für:**
- **Workflow Components**
- **Modular Operations**
- **Reusable Logic**
- **Process Steps**

#### **🎼 Orchestrator verwenden für:**
- **System Coordination**
- **Service Management**
- **Lifecycle Management**
- **External Integration**

#### **🗄️ Repository verwenden für:**
- **Data Access**
- **Database Operations**
- **Data Persistence**
- **Query Optimization**

## 🎯 **ZUSAMMENFASSUNG:**

### **✅ RICHTIGE ARCHITEKTUR:**
```
🌐 Presentation → 🔧 Application → 🏗️ Domain → 🔌 Infrastructure
```

### **✅ KLARE TRENNUNG:**
- **Controllers** = API Endpoints
- **Handlers** = Business Logic
- **Services** = Core Logic
- **Steps** = Workflow Components
- **Orchestrators** = System Coordination
- **Repositories** = Data Access

### **✅ PERFEKTE ORGANISATION:**
- **Jede Komponente** hat einen **klaren Zweck**
- **Jede Schicht** hat **definierte Verantwortlichkeiten**
- **Keine Vermischung** zwischen Layern
- **Klare Namenskonventionen** für einfache Identifikation

**DIESE ARCHITEKTUR** = **MAINTAINABLE, SCALABLE, TESTABLE** 🎯 