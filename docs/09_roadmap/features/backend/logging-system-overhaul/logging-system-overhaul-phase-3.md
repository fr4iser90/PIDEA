# Logging System Overhaul – Phase 3: Integration & Migration

## Overview
Integrate the new logging system into the application, migrate existing services, implement Express middleware, create API endpoints, and set up real-time log streaming.

## Duration: 3 hours

## Objectives
- [ ] Update Application.js to use new logger with middleware integration
- [ ] Create LogMiddleware for Express request logging
- [ ] Migrate all existing service logging calls
- [ ] Update configuration files and environment setup
- [ ] Implement real-time log streaming via WebSocket
- [ ] Add log management API endpoints
- [ ] Create log viewer backend components

## Deliverables

### Application Integration
- File: `backend/Application.js` - Updated with new logger and middleware
- File: `backend/server.js` - Updated logger setup and request logging
- File: `backend/infrastructure/logging/LogMiddleware.js` - Express middleware for request logging
- File: `backend/infrastructure/logging/LogWebSocket.js` - Real-time log streaming

### Service Migration
- File: `backend/domain/services/IDEWorkspaceDetectionService.js` - Updated logging calls
- File: `backend/domain/services/IDEManager.js` - Updated logging calls
- File: `backend/infrastructure/external/IDEDetector.js` - Updated logging calls
- File: `backend/infrastructure/external/BrowserManager.js` - Updated logging calls
- File: `backend/domain/services/FileBasedWorkspaceDetector.js` - Updated logging calls
- File: `backend/domain/services/TerminalLogCaptureService.js` - Updated logging calls
- File: `backend/infrastructure/messaging/EventBus.js` - Updated logging calls

### API & WebSocket
- File: `backend/presentation/api/controllers/LogController.js` - Log management API
- File: `backend/presentation/websocket/LogWebSocket.js` - Real-time log streaming
- File: `backend/presentation/api/routes/logRoutes.js` - Log API routes
- File: `backend/presentation/websocket/logHandlers.js` - WebSocket event handlers

### Configuration Updates
- File: `backend/config/ide-deployment.js` - Updated logging configuration
- File: `backend/config/logging.js` - New centralized logging config
- File: `backend/infrastructure/logging/middleware.js` - Middleware configuration

### Tests
- Test: `tests/integration/logging/LoggingIntegration.test.js` - End-to-end logging flow
- Test: `tests/integration/logging/LogMiddleware.test.js` - Express middleware
- Test: `tests/integration/logging/LogWebSocket.test.js` - Real-time streaming
- Test: `tests/integration/logging/LogAPI.test.js` - API endpoints

## Dependencies
- Requires: Phase 1 and Phase 2 completion
- Blocks: Phase 4 start

## Technical Specifications

### LogMiddleware Features
```javascript
class LogMiddleware {
  constructor(options = {}) {
    this.logger = options.logger || new StructuredLogger('HTTP');
    this.correlation = options.correlation !== false;
    this.performance = options.performance !== false;
  }

  // Request logging middleware
  requestLogger() { /* implementation */ }
  
  // Response logging middleware
  responseLogger() { /* implementation */ }
  
  // Error logging middleware
  errorLogger() { /* implementation */ }
  
  // Performance monitoring
  performanceLogger() { /* implementation */ }
}
```

### LogWebSocket Features
- Real-time log streaming
- Client authentication
- Log level filtering
- Service-specific streams
- Connection management
- Rate limiting

### LogController API Endpoints
```javascript
// GET /api/logs - Retrieve logs with filtering
// GET /api/logs/stream - Real-time log streaming
// GET /api/logs/metrics - Log analytics
// POST /api/logs/clear - Clear old logs
// GET /api/logs/download - Download log files
// POST /api/logs/level - Change log level
// GET /api/logs/health - Log system health
```

### Service Migration Strategy
1. **Gradual Migration**: Update one service at a time
2. **Backward Compatibility**: Maintain old logger during transition
3. **Testing**: Verify each service after migration
4. **Rollback Plan**: Ability to revert if issues arise

## Success Criteria
- [ ] Application.js successfully using new logger
- [ ] Express middleware logging all requests/responses
- [ ] All services migrated to new logging system
- [ ] Real-time log streaming functional
- [ ] API endpoints working correctly
- [ ] Configuration files updated and working
- [ ] All integration tests passing
- [ ] Performance impact < 2%
- [ ] No breaking changes to existing functionality

## Migration Checklist

### Application Integration
- [ ] Update Application.js logger initialization
- [ ] Add LogMiddleware to Express app
- [ ] Update server.js logging setup
- [ ] Test application startup and shutdown

### Service Migration
- [ ] IDEWorkspaceDetectionService - Update all log calls
- [ ] IDEManager - Update all log calls
- [ ] IDEDetector - Update all log calls
- [ ] BrowserManager - Update all log calls
- [ ] FileBasedWorkspaceDetector - Update all log calls
- [ ] TerminalLogCaptureService - Update all log calls
- [ ] EventBus - Update all log calls

### API Implementation
- [ ] LogController with all endpoints
- [ ] Log routes configuration
- [ ] Authentication and authorization
- [ ] Rate limiting implementation
- [ ] Error handling and validation

### WebSocket Implementation
- [ ] Real-time log streaming
- [ ] Client connection management
- [ ] Event handling and broadcasting
- [ ] Authentication and security
- [ ] Performance optimization

## Risk Mitigation
- **Breaking Changes**: Gradual migration with rollback capability
- **Performance Impact**: Monitor and optimize during migration
- **Data Loss**: Backup existing logs before migration
- **Service Disruption**: Test thoroughly before production deployment

## Configuration Examples

### Express Middleware Configuration
```javascript
const logMiddleware = new LogMiddleware({
  logger: new StructuredLogger('HTTP'),
  correlation: true,
  performance: true,
  sanitize: true
});

app.use(logMiddleware.requestLogger());
app.use(logMiddleware.responseLogger());
app.use(logMiddleware.errorLogger());
```

### WebSocket Configuration
```javascript
const logWebSocket = new LogWebSocket({
  logger: new StructuredLogger('WebSocket'),
  maxConnections: 100,
  rateLimit: 1000,
  authentication: true
});
```

### API Configuration
```javascript
const logController = new LogController({
  logger: new StructuredLogger('API'),
  rateLimit: 100,
  authentication: true,
  authorization: ['admin', 'developer']
});
```

## Next Phase Dependencies
- All services must be migrated successfully
- API endpoints must be functional and tested
- WebSocket streaming must be working
- Integration tests must pass
- Performance benchmarks must be met 