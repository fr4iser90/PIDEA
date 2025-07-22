# Phase 3: Layer Structure Organization

## 📋 **Phase Overview**
- **Duration**: 8 hours
- **Priority**: Critical
- **Status**: Planning
- **Dependencies**: Phase 1 & 2 completed

## 🎯 **Goals**
- Verify proper 4-layer DDD architecture separation
- Fix any layer violations and improper dependencies
- Ensure correct data flow: Presentation → Application → Domain → Infrastructure
- Validate component placement in correct layers

## 🏗️ **Layer Architecture Validation**

### **🌐 Presentation Layer (API/UI)**
```javascript
// ✅ CORRECT PLACEMENT
backend/presentation/api/
├── ChatController.js           // REST API Endpoints
├── WorkflowController.js       // Workflow API
├── AnalysisController.js       // Analysis API
└── WebChatController.js        // WebSocket Communication

backend/presentation/middleware/
├── AuthMiddleware.js           // Request Processing
└── ValidationMiddleware.js     // Input Validation

backend/presentation/websocket/
├── WebSocketHandler.js         // Real-time Communication
└── ChatWebSocketHandler.js     // Chat-specific WebSocket
```

### **🔧 Application Layer (Business Logic)**
```javascript
// ✅ CORRECT PLACEMENT
backend/application/handlers/
├── SendMessageHandler.js       // Command Processing
├── GetChatHistoryHandler.js    // Query Processing
└── CreateTaskHandler.js        // Business Operations

backend/application/commands/
├── SendMessageCommand.js       // Business Commands
└── CreateTaskCommand.js        // Business Commands

backend/application/queries/
├── GetChatHistoryQuery.js      // Data Retrieval
└── GetAnalysisQuery.js         // Data Retrieval
```

### **🏗️ Domain Layer (Core Business)**
```javascript
// ✅ CORRECT PLACEMENT
backend/domain/services/
├── ChatService.js              // Core Business Logic
├── AnalysisService.js          // Business Rules
└── WorkflowService.js          // Process Logic

backend/domain/entities/
├── ChatMessage.js              // Business Objects
├── AnalysisResult.js           // Data Models
└── Task.js                     // Business Objects

backend/domain/steps/
├── IDESendMessageStep.js       // Workflow Components
├── AnalysisStep.js             // Modular Units
└── ValidationStep.js           // Process Steps

backend/domain/workflows/
├── AnalysisWorkflow.js         // Process Orchestration
└── TaskWorkflow.js             // Step Composition
```

### **🔌 Infrastructure Layer (External)**
```javascript
// ✅ CORRECT PLACEMENT
backend/infrastructure/database/
├── ChatRepository.js           // Data Access
├── AnalysisRepository.js       // Database Operations
└── TaskRepository.js           // Data Persistence

backend/infrastructure/external/
├── AnalysisOrchestrator.js     // System Coordination
├── WorkflowOrchestrator.js     // Service Management
└── VSCodeService.js            // External APIs

backend/infrastructure/messaging/
├── EventBus.js                 // Message Passing
└── CommandBus.js               // Command Routing
```

## 🔄 **Step-by-Step Tasks**

### **Task 3.1: Layer Boundary Analysis (2 hours)**
- [ ] Audit all current file placements
- [ ] Identify misplaced components
- [ ] Document layer violations
- [ ] Create relocation plan
- [ ] Validate against DDD principles

### **Task 3.2: Dependency Direction Validation (2 hours)**
- [ ] Check Presentation → Application dependencies
- [ ] Check Application → Domain dependencies  
- [ ] Check Domain → Infrastructure dependencies
- [ ] Identify reverse dependencies (violations)
- [ ] Fix improper dependency directions

### **Task 3.3: Interface Implementation Review (2 hours)**
- [ ] Ensure repositories implement domain interfaces
- [ ] Verify service abstractions in domain layer
- [ ] Check orchestrator interface compliance
- [ ] Validate dependency inversion patterns
- [ ] Fix missing interface implementations

### **Task 3.4: Component Relocation (1.5 hours)**
- [ ] Move misplaced files to correct layers
- [ ] Update import paths after relocation
- [ ] Verify no circular dependencies created
- [ ] Test relocated components
- [ ] Update documentation references

### **Task 3.5: Architecture Compliance Testing (0.5 hours)**
- [ ] Run architecture validation script
- [ ] Check for layer violations
- [ ] Verify dependency directions
- [ ] Validate component placement
- [ ] Document compliance status

## 🎯 **Layer Violation Fixes**

### **❌ Common Violations to Fix**
```javascript
// ❌ VIOLATION: Controller directly accessing Repository
class ChatController {
  constructor() {
    this.chatRepository = new ChatRepository(); // WRONG!
  }
}

// ✅ CORRECT: Controller → Handler → Service → Repository
class ChatController {
  constructor(sendMessageHandler) {
    this.sendMessageHandler = sendMessageHandler; // CORRECT!
  }
}
```

### **❌ Reverse Dependency Violations**
```javascript
// ❌ VIOLATION: Domain depending on Infrastructure
// In domain/services/ChatService.js
const PostgreSQLChatRepository = require('../../infrastructure/database/PostgreSQLChatRepository'); // WRONG!

// ✅ CORRECT: Domain depending on Interface
// In domain/services/ChatService.js
const ChatRepository = require('../interfaces/ChatRepository'); // CORRECT!
```

### **❌ Layer Skipping Violations**
```javascript
// ❌ VIOLATION: Presentation directly accessing Domain
// In presentation/api/ChatController.js
const ChatService = require('../../domain/services/ChatService'); // WRONG!

// ✅ CORRECT: Presentation → Application → Domain
// In presentation/api/ChatController.js
const SendMessageHandler = require('../../application/handlers/SendMessageHandler'); // CORRECT!
```

## 🔧 **Proper Data Flow Implementation**

### **✅ Correct Request Flow**
```javascript
// 🌐 Presentation Layer
class ChatController {
  async sendMessage(req, res) {
    const command = new SendMessageCommand(req.body);
    const result = await this.sendMessageHandler.handle(command);
    res.json(result);
  }
}

// 🔧 Application Layer
class SendMessageHandler {
  async handle(command) {
    return await this.chatService.sendMessage(command.message, command.userId);
  }
}

// 🏗️ Domain Layer
class ChatService {
  async sendMessage(message, userId) {
    const chatMessage = new ChatMessage(message, userId);
    return await this.chatRepository.save(chatMessage);
  }
}

// 🔌 Infrastructure Layer
class ChatRepository {
  async save(chatMessage) {
    // Database persistence logic
  }
}
```

## 🔍 **Architecture Validation Script**
```javascript
// scripts/validate-architecture-phase3.js
const fs = require('fs');
const path = require('path');

function validateLayerDependencies() {
  const layers = {
    presentation: [],
    application: [],
    domain: [],
    infrastructure: []
  };
  
  // Scan each layer for improper dependencies
  function checkDependencies(layerPath, layerName) {
    const files = fs.readdirSync(layerPath, { withFileTypes: true });
    
    files.forEach(file => {
      if (file.isFile() && file.name.endsWith('.js')) {
        const content = fs.readFileSync(path.join(layerPath, file.name), 'utf8');
        
        // Check for layer violations
        if (layerName === 'presentation') {
          if (content.includes('domain/') && !content.includes('application/')) {
            console.error(`❌ Layer violation: ${file.name} skips application layer`);
          }
        }
        
        if (layerName === 'domain') {
          if (content.includes('infrastructure/')) {
            console.error(`❌ Reverse dependency: ${file.name} depends on infrastructure`);
          }
        }
      }
    });
  }
  
  checkDependencies('./backend/presentation', 'presentation');
  checkDependencies('./backend/application', 'application');
  checkDependencies('./backend/domain', 'domain');
  checkDependencies('./backend/infrastructure', 'infrastructure');
}

function validateComponentPlacement() {
  // Check if components are in correct layers
  const misplacements = [];
  
  // Domain entities should not be in infrastructure
  const infraFiles = fs.readdirSync('./backend/infrastructure', { recursive: true });
  infraFiles.forEach(file => {
    if (file.includes('Entity') || file.includes('ValueObject')) {
      misplacements.push(`❌ Domain object in infrastructure: ${file}`);
    }
  });
  
  if (misplacements.length === 0) {
    console.log('✅ All components properly placed');
  } else {
    misplacements.forEach(console.error);
  }
}

validateLayerDependencies();
validateComponentPlacement();
```

## ✅ **Success Criteria**
- [ ] All components placed in correct architectural layers
- [ ] No reverse dependencies (Infrastructure → Domain)
- [ ] No layer skipping (Presentation → Domain)
- [ ] Proper dependency injection patterns
- [ ] Interface-based abstractions in place
- [ ] Clean dependency directions maintained
- [ ] Architecture validation script passes
- [ ] No circular dependencies

## 📊 **Layer Responsibility Matrix**

| Layer | Responsibilities | Should Contain | Should NOT Contain |
|-------|------------------|----------------|-------------------|
| **Presentation** | HTTP/WebSocket handling | Controllers, Middleware | Business Logic, Database Access |
| **Application** | Orchestration, Commands | Handlers, Commands, Queries | Database Details, External APIs |
| **Domain** | Business Logic | Services, Entities, Steps | Database Code, HTTP Details |
| **Infrastructure** | External Systems | Repositories, External Services | Business Rules, HTTP Logic |

## 🔧 **Interface Creation Tasks**
```javascript
// Create missing domain interfaces

// domain/interfaces/ChatRepository.js
class ChatRepository {
  async save(chatMessage) {
    throw new Error('Method must be implemented');
  }
  
  async findById(id) {
    throw new Error('Method must be implemented');
  }
}

// infrastructure/database/PostgreSQLChatRepository.js
class PostgreSQLChatRepository extends ChatRepository {
  async save(chatMessage) {
    // PostgreSQL implementation
  }
  
  async findById(id) {
    // PostgreSQL implementation
  }
}
```

## 🚀 **Next Phase**
After Phase 3 completion, proceed to **Phase 4: Documentation & Validation** to create comprehensive documentation and final validation scripts. 