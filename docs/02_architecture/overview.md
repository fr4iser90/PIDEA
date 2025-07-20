# Architecture Overview

The Cursor Chat Agent follows **Domain-Driven Design (DDD)** principles with a clean, layered architecture that promotes scalability, maintainability, and testability.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Web Interface (Port 3000)  │  WebSocket  │  REST API       │
│  - Chat Interface           │  - Real-time│  - Chat API     │
│  - Code Explorer            │  - Events   │  - IDE API      │
│  - IDE Mirror               │  - Status   │  - File API     │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Commands & Queries  │  Handlers  │  Use Cases              │
│  - SendMessage       │  - Chat    │  - Chat Operations      │
│  - GetChatHistory    │  - IDE     │  - IDE Management       │
│  - IDE Operations    │  - File    │  - File Operations      │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Entities  │  Services  │  Repositories  │  Value Objects   │
│  - Chat    │  - Cursor  │  - Chat        │  - Message       │
│  - Session │  - IDE     │  - IDE         │  - Timestamp     │
│  - Message │  - Mirror  │  - File        │  - Status        │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
├─────────────────────────────────────────────────────────────┤
│  External Services  │  Data Access  │  Messaging            │
│  - BrowserManager   │  - InMemory   │  - EventBus           │
│  - IDEManager       │  - Database   │  - WebSocket          │
│  - Playwright       │  - FileSystem │  - HTTP               │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
cursor-chat-agent/
├── src/
│   ├── domain/                    # Domain Layer (Business Logic)
│   │   ├── entities/             # Business entities
│   │   │   ├── ChatMessage.js    # Chat message entity
│   │   │   └── ChatSession.js    # Chat session entity
│   │   ├── repositories/         # Repository interfaces
│   │   │   └── ChatRepository.js # Chat data access interface
│   │   └── services/             # Domain services
│   │       ├── CursorIDEService.js # Cursor IDE integration
│   │       └── IDEMirrorService.js # IDE mirroring service
│   ├── application/              # Application Layer (Use Cases)
│   │   ├── commands/             # Command objects
│   │   │   └── SendMessageCommand.js
│   │   ├── queries/              # Query objects
│   │   │   └── GetChatHistoryQuery.js
│   │   └── handlers/             # Command/Query handlers
│   │       ├── SendMessageHandler.js
│   │       └── GetChatHistoryHandler.js
│   ├── infrastructure/           # Infrastructure Layer
│   │   ├── database/             # Data persistence
│   │   │   └── InMemoryChatRepository.js
│   │   ├── external/             # External services
│   │   │   ├── BrowserManager.js # Playwright browser management
│   │   │   ├── IDEManager.js     # IDE instance management
│   │   │   ├── IDEDetector.js    # IDE detection service
│   │   │   └── IDEStarter.js     # IDE startup service
│   │   └── messaging/            # Event messaging
│   │       └── EventBus.js       # Domain event bus
│   ├── presentation/             # Presentation Layer
│   │   ├── api/                  # REST API controllers
│   │   │   ├── WebChatController.js # Chat API endpoints
│   │   │   ├── IDEController.js  # IDE management API
│   │   │   └── IDEMirrorController.js # IDE mirror API
│   │   └── websocket/            # WebSocket handling
│   │       └── WebSocketManager.js # Real-time communication
│   ├── Application.js            # Main application class
│   └── server.js                 # Application entry point
├── web/                          # Frontend assets
│   ├── assets/                   # Static assets
│   │   ├── css/                  # Stylesheets
│   │   └── js/                   # Frontend JavaScript
│   ├── pages/                    # HTML pages
│   └── index.html                # Main application page
├── scripts/                      # Utility scripts
│   ├── auto-dom-collector.js     # Automated DOM collection
│   ├── dom-analyzer.js           # DOM analysis tools
│   ├── bulk-dom-analyzer.js      # Bulk DOM analysis
│   ├── coverage-validator.js     # Coverage validation
│   └── selector-generator.js     # Selector generation
├── generated/                    # Generated files
│   ├── CursorIDE.js              # Generated IDE selectors
│   └── selectors.js              # Generated selectors
├── output/                       # Analysis output
│   └── auto-collected/           # Auto-collected DOM data
├── docs/                         # Documentation
├── tests/                        # Test suites
├── config/                       # Configuration files
├── dev-server.js                 # Development server
├── start-dev.sh                  # Development startup script
└── package.json                  # Project configuration
```

## 🔄 Data Flow

### 1. Request Processing
```
Client Request → Presentation Layer → Application Layer → Domain Layer → Infrastructure Layer
```

### 2. Response Flow
```
Infrastructure Layer → Domain Layer → Application Layer → Presentation Layer → Client Response
```

### 3. Event Flow
```
Domain Event → EventBus → WebSocket → Client Update
```

## 🎯 Key Components

### Domain Layer
- **Entities**: ChatMessage, ChatSession - Core business objects
- **Services**: CursorIDEService, IDEMirrorService - Business logic
- **Repositories**: ChatRepository - Data access interfaces

### Application Layer
- **Commands**: SendMessageCommand - Intent to perform actions
- **Queries**: GetChatHistoryQuery - Intent to retrieve data
- **Handlers**: SendMessageHandler, GetChatHistoryHandler - Use case orchestration

### Infrastructure Layer
- **BrowserManager**: Manages Playwright browser connections
- **IDEManager**: Manages Cursor IDE instances
- **EventBus**: Domain event publishing and subscription
- **InMemoryChatRepository**: In-memory data storage

### Presentation Layer
- **WebChatController**: RESTful chat API endpoints
- **IDEController**: IDE management API endpoints
- **WebSocketManager**: Real-time communication
- **Frontend**: Modern web interface with multiple views

## 🚀 Key Features

### IDE Integration
- **Automatic Detection**: Scans ports 9222-9231 for Cursor IDE
- **Multiple Instances**: Manages multiple IDE instances
- **Chrome DevTools Protocol**: Direct IDE communication
- **Workspace Management**: Automatic workspace detection

### DOM Analysis
- **Automated Collection**: Collects DOM data from IDE states
- **Selector Generation**: Generates reliable selectors
- **Coverage Validation**: Validates selector coverage
- **Bulk Analysis**: Processes multiple IDE states

### Real-time Communication
- **WebSocket**: Real-time updates and events
- **Event-driven**: Domain events trigger UI updates
- **Live Reload**: Development hot reloading
- **Status Monitoring**: Real-time connection status

## 🔧 Technology Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js 5.1+
- **Browser Automation**: Playwright 1.44+
- **Real-time**: WebSocket (ws 8.14+)
- **Architecture**: Domain-Driven Design
- **Testing**: Jest 29.7+
- **Linting**: ESLint 8.55+
- **Development**: Nodemon, Concurrently, Chokidar

## 📈 Benefits

### ✅ Scalability
- Clear separation of concerns
- Easy to add new features
- Horizontal scaling ready
- Modular architecture

### ✅ Maintainability
- Single responsibility principle
- Dependency inversion
- Easy to understand and modify
- Clean code structure

### ✅ Testability
- Each layer can be tested independently
- Mock interfaces for external dependencies
- Clear boundaries between concerns
- Comprehensive test coverage

### ✅ Flexibility
- Easy to swap implementations
- Plugin architecture ready
- Configuration-driven behavior
- Extensible design

## 🔮 Future Enhancements

### Database Integration
- MongoDB repository implementation
- PostgreSQL repository implementation
- Redis caching layer

### Authentication & Authorization
- JWT token authentication
- Role-based access control
- Session management

### Advanced Features
- Message encryption
- File upload support
- Multi-user chat sessions
- Chat history search
- Message reactions

### Monitoring & Observability
- Application metrics
- Performance monitoring
- Distributed tracing
- Health checks

This architecture provides a solid foundation for building a scalable, maintainable chat application that can easily evolve with new requirements. 