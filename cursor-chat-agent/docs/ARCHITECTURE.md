# Cursor Chat Agent - DDD Architecture

## 🏗️ Architecture Overview

This application follows **Domain-Driven Design (DDD)** principles with a clean, layered architecture that promotes scalability, maintainability, and testability.

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
│   │       └── CursorIDEService.js # Cursor IDE integration
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
│   │   │   └── BrowserManager.js # Playwright browser management
│   │   └── messaging/            # Event messaging
│   │       └── EventBus.js       # Domain event bus
│   ├── presentation/             # Presentation Layer
│   │   ├── api/                  # REST API
│   │   │   └── ChatController.js # Chat API endpoints
│   │   └── websocket/            # WebSocket handling
│   │       └── WebSocketManager.js
│   ├── Application.js            # Main application class
│   └── server.js                 # Application entry point
├── web/                          # Frontend assets
├── config/                       # Configuration files
├── tests/                        # Test suites
└── docs/                         # Documentation
```

## 🎯 Domain Layer

### Entities
- **ChatMessage**: Represents a single chat message with business logic
- **ChatSession**: Manages a conversation session with multiple messages

### Value Objects
- Message content validation
- Timestamp handling
- Message type validation

### Domain Services
- **CursorIDEService**: Handles integration with Cursor IDE

## 🔧 Application Layer

### Commands
- **SendMessageCommand**: Encapsulates the intent to send a message

### Queries
- **GetChatHistoryQuery**: Encapsulates the intent to retrieve chat history

### Handlers
- **SendMessageHandler**: Orchestrates the send message use case
- **GetChatHistoryHandler**: Orchestrates the get chat history use case

## 🏗️ Infrastructure Layer

### Database
- **InMemoryChatRepository**: In-memory implementation of chat repository
- Easy to swap with persistent storage (MongoDB, PostgreSQL, etc.)

### External Services
- **BrowserManager**: Manages Playwright browser connections
- Handles connection pooling and health checks

### Messaging
- **EventBus**: Domain event publishing and subscription
- Enables loose coupling between components

## 🎨 Presentation Layer

### API
- **ChatController**: RESTful API endpoints
- Proper error handling and validation
- Consistent response format

### WebSocket
- **WebSocketManager**: Real-time communication
- Event-driven updates
- Connection management

## 🔄 Data Flow

1. **Request** → Presentation Layer (Controller/WebSocket)
2. **Command/Query** → Application Layer (Handler)
3. **Domain Logic** → Domain Layer (Entities/Services)
4. **Data Access** → Infrastructure Layer (Repository)
5. **Response** → Back through layers

## 🚀 Benefits of This Architecture

### ✅ Scalability
- Clear separation of concerns
- Easy to add new features
- Horizontal scaling ready

### ✅ Maintainability
- Single responsibility principle
- Dependency inversion
- Easy to understand and modify

### ✅ Testability
- Each layer can be tested independently
- Mock interfaces for external dependencies
- Clear boundaries between concerns

### ✅ Flexibility
- Easy to swap implementations
- Plugin architecture ready
- Configuration-driven behavior

## 🔧 Development Workflow

### Starting Development
```bash
npm run dev:full  # Start with hot reloading
```

### Testing
```bash
npm test          # Run tests
npm run test:watch # Watch mode
```

### Code Quality
```bash
npm run lint      # Check code style
npm run lint:fix  # Auto-fix issues
```

## 📈 Future Enhancements

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

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Browser Automation**: Playwright
- **Real-time**: WebSocket
- **Architecture**: Domain-Driven Design
- **Testing**: Jest
- **Linting**: ESLint
- **Development**: Nodemon, Concurrently

This architecture provides a solid foundation for building a scalable, maintainable chat application that can easily evolve with new requirements. 