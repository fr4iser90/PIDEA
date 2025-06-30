# Cursor IDE Chat - Frontend Architecture

## Overview

This frontend follows Domain-Driven Design (DDD) patterns and Clean Architecture principles, mirroring the backend structure. The application is built with vanilla JavaScript using ES6 modules for maintainability and scalability.

## Architecture Layers

### 1. Domain Layer (`/js/domain/`)
Contains business logic and entities:

- **Entities**: `ChatMessage.js`, `ChatSession.js`
- **Value Objects**: Business rules and domain logic
- **Repositories**: Interface definitions (`ChatRepository.js`)

### 2. Application Layer (`/js/application/`)
Contains application services and use cases:

- **Services**: `ChatService.js` - Orchestrates domain operations
- **Commands/Queries**: Application logic for user actions

### 3. Infrastructure Layer (`/js/infrastructure/`)
Contains external concerns and implementations:

- **Repositories**: `APIChatRepository.js` - API implementation
- **Events**: `EventBus.js` - Event-driven communication
- **External Services**: WebSocket connections, API calls

### 4. Presentation Layer (`/js/presentation/`)
Contains UI components and controllers:

- **Controllers**: `AppController.js` - Main application coordinator
- **Components**: `ChatComponent.js`, `CodeExplorerComponent.js`
- **Views**: HTML templates and rendering logic

## File Structure

```
web/
├── js/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── ChatMessage.js
│   │   │   └── ChatSession.js
│   │   └── repositories/
│   │       └── ChatRepository.js
│   ├── application/
│   │   └── services/
│   │       └── ChatService.js
│   ├── infrastructure/
│   │   ├── repositories/
│   │   │   └── APIChatRepository.js
│   │   └── events/
│   │       └── EventBus.js
│   ├── presentation/
│   │   ├── controllers/
│   │   │   └── AppController.js
│   │   └── components/
│   │       ├── ChatComponent.js
│   │       └── CodeExplorerComponent.js
│   └── main.js
├── index.html
├── chat.html
├── code.html
├── tree.html
├── main.css
└── README.md
```

## Key Features

### 1. Modular Architecture
- **Separation of Concerns**: Each layer has specific responsibilities
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Testability**: Easy to unit test each component independently

### 2. Event-Driven Communication
- **EventBus**: Centralized event system for component communication
- **Loose Coupling**: Components communicate through events, not direct references
- **Scalability**: Easy to add new features without modifying existing code

### 3. Reusable Components
- **ChatComponent**: Can be used in multiple views (main chat, right panel)
- **CodeExplorerComponent**: Modular file explorer
- **Consistent UI**: Shared styling and behavior patterns

### 4. Multiple View Support
- **Chat View**: `/chat.html` - Dedicated chat interface
- **Code Explorer**: `/code.html` - File browsing and editing
- **File Tree**: `/tree.html` - Project structure navigation
- **Main App**: `/index.html` - Combined view with mode switching

## Technology Stack

- **Language**: Vanilla JavaScript (ES6+)
- **Modules**: ES6 Modules for code organization
- **Styling**: CSS3 with CSS Custom Properties
- **Markdown**: Marked.js for message rendering
- **Syntax Highlighting**: Highlight.js for code blocks
- **WebSockets**: Real-time communication
- **Build**: No build step required (modern browser support)

## Usage

### Starting the Application
1. Navigate to the web directory
2. Open `index.html` in a modern browser
3. The application will automatically initialize

### Development
- **Hot Reload**: WebSocket connection for live development
- **Debug Mode**: Built-in debugging tools
- **Error Handling**: Comprehensive error handling and logging

### Adding New Features
1. **Domain**: Add entities and business logic in domain layer
2. **Application**: Create services for new use cases
3. **Infrastructure**: Implement external integrations
4. **Presentation**: Build UI components and controllers

## Benefits of This Architecture

1. **Scalability**: Easy to add new features and components
2. **Maintainability**: Clear separation of concerns
3. **Testability**: Each layer can be tested independently
4. **Reusability**: Components can be reused across different views
5. **Performance**: Efficient rendering and state management
6. **Developer Experience**: Clear structure and easy debugging

## Future Enhancements

- **State Management**: Add centralized state management
- **Routing**: Implement client-side routing
- **Caching**: Add intelligent caching strategies
- **Offline Support**: Service worker for offline functionality
- **Testing**: Add comprehensive test suite
- **Build System**: Add bundling and optimization tools 