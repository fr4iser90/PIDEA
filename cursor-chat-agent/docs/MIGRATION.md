# Migration Guide: Old Architecture → DDD Architecture

## 🚀 What's New in Version 2.0

The application has been completely restructured using **Domain-Driven Design (DDD)** principles. This provides better scalability, maintainability, and testability.

## 📁 File Structure Changes

### Old Structure
```
cursor-chat-agent/
├── server.js          # Monolithic server file
├── index.js           # Old entry point
├── web/               # Frontend files
└── package.json
```

### New Structure
```
cursor-chat-agent/
├── src/               # Source code directory
│   ├── domain/        # Business logic layer
│   ├── application/   # Use cases layer
│   ├── infrastructure/ # External concerns layer
│   ├── presentation/  # API/UI layer
│   ├── Application.js # Main application class
│   └── server.js      # New entry point
├── config/            # Configuration files
├── tests/             # Test suites
├── docs/              # Documentation
└── web/               # Frontend files (unchanged)
```

## 🔄 API Changes

### Endpoints (Backward Compatible)
- ✅ `/chat` → Still works (legacy endpoint)
- ✅ `/chat-history` → Still works (legacy endpoint)
- 🆕 `/api/chat` → New RESTful endpoint
- 🆕 `/api/chat/history` → New RESTful endpoint
- 🆕 `/api/chat/status` → Connection status
- 🆕 `/api/health` → Health check
- 🆕 `/api/websocket/status` → WebSocket status

### Response Format
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

## 🛠️ Development Changes

### Scripts
```bash
# Old
npm start

# New
npm start                    # Production
npm run dev                  # Development with hot reload
npm run dev:full            # Full development environment
npm test                    # Run tests
npm run lint               # Code linting
```

### Environment Variables
```bash
# New environment variables
PORT=3000                   # Server port
CURSOR_DEBUGGER_URL=http://127.0.0.1:9222
LOG_LEVEL=info
```

## 🔧 Configuration

### New Configuration System
```javascript
// config/default.js
module.exports = {
  server: { port: 3000 },
  cursorIDE: { debuggerUrl: 'http://127.0.0.1:9222' },
  websocket: { port: 3001 },
  chat: { maxMessageLength: 10000 },
  development: { hotReload: true }
};
```

## 🧪 Testing

### New Testing Infrastructure
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Test Structure
```
tests/
├── unit/                  # Unit tests
├── integration/           # Integration tests
└── e2e/                  # End-to-end tests
```

## 📊 Monitoring & Observability

### New Health Endpoints
- `GET /api/health` - Application health
- `GET /api/chat/status` - Cursor IDE connection status
- `GET /api/websocket/status` - WebSocket status

### Event System
- Domain events for better observability
- Event-driven architecture
- Loose coupling between components

## 🚀 Benefits of Migration

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

## 🔄 Migration Steps

### 1. Backup Current Data
```bash
# Backup any important data
cp -r cursor-chat-agent cursor-chat-agent-backup
```

### 2. Install New Dependencies
```bash
npm install
```

### 3. Update Environment
```bash
# Set new environment variables if needed
export PORT=3000
export LOG_LEVEL=info
```

### 4. Test New Architecture
```bash
npm run dev:full
```

### 5. Update Frontend (if needed)
The frontend should work without changes, but you can update to use new endpoints:

```javascript
// Old
fetch('/chat', { method: 'POST', body: JSON.stringify({ message }) })

// New (optional)
fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message }) })
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### 2. Cursor IDE Not Connected
```bash
# Check if Cursor is running with debugger
# Make sure Cursor is started with: --remote-debugging-port=9222
```

#### 3. Dependencies Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 📈 Next Steps

### Immediate
1. Test the new architecture
2. Update any custom configurations
3. Run the test suite

### Future
1. Add persistent database
2. Implement authentication
3. Add monitoring and logging
4. Create deployment pipeline

## 🆘 Support

If you encounter issues during migration:

1. Check the logs for error messages
2. Verify Cursor IDE is running with debugger enabled
3. Ensure all dependencies are installed
4. Check the configuration files

The new architecture provides a solid foundation for future development while maintaining backward compatibility with existing integrations. 