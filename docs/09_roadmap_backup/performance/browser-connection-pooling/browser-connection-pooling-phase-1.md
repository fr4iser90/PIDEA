# Browser Connection Pooling – Phase 1: Connection Pool Foundation

## Overview
Create the ConnectionPool class with Map-based storage, connection lifecycle management, health monitoring, and cleanup mechanisms to support multiple parallel Chrome DevTools connections.

## Objectives
- [ ] Create ConnectionPool class with Map-based storage
- [ ] Implement connection lifecycle management (create, get, close)
- [ ] Add connection health monitoring
- [ ] Implement connection cleanup and garbage collection

## Deliverables
- File: `backend/infrastructure/external/ConnectionPool.js` - New connection pool manager
- Test: `tests/unit/infrastructure/external/ConnectionPool.test.js` - Unit tests for connection pool
- Documentation: JSDoc comments for ConnectionPool class and methods

## Dependencies
- Requires: Existing BrowserManager.js, Playwright chromium
- Blocks: Phase 2 - BrowserManager Integration

## Estimated Time
1 hour

## Success Criteria
- [ ] ConnectionPool class created with Map-based storage
- [ ] Connection lifecycle methods implemented (create, get, close, cleanup)
- [ ] Health monitoring with connection validation
- [ ] Automatic cleanup of stale connections
- [ ] Unit tests pass with 90%+ coverage
- [ ] Memory usage < 10MB for 5 concurrent connections

## Implementation Details

### Current State Analysis
The current BrowserManager uses a single connection approach:
```javascript
// Current BrowserManager.js lines 6-10
class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isConnecting = false;
    this.currentPort = null;
  }
```

**Performance Bottleneck**: Every IDE switch requires:
1. `browser.close()` (2-3 seconds)
2. `chromium.connectOverCDP()` (1-2 seconds)
3. Total: 6 seconds per switch

### ConnectionPool Class Structure
```javascript
class ConnectionPool {
  constructor(options = {}) {
    this.connections = new Map(); // port -> {browser, page, lastUsed, health, createdAt}
    this.maxConnections = options.maxConnections || 5;
    this.connectionTimeout = options.connectionTimeout || 30000;
    this.cleanupInterval = options.cleanupInterval || 60000;
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    
    // Start cleanup timer
    this.startCleanupTimer();
  }

  async getConnection(port) {
    // Get existing connection or create new one
  }

  async createConnection(port) {
    // Create new Chrome DevTools connection
  }

  async closeConnection(port) {
    // Close specific connection
  }

  async cleanup() {
    // Remove stale connections
  }

  getHealth() {
    // Return connection pool health status
  }
}
```

### Key Features to Implement
1. **Connection Storage**: Map-based storage with port as key
2. **Connection Lifecycle**: Create, retrieve, close, cleanup
3. **Health Monitoring**: Validate connection health
4. **Memory Management**: Automatic cleanup of stale connections
5. **Error Handling**: Graceful failure handling and recovery

### Integration Points
- **BrowserManager**: Will use ConnectionPool for instant port switching
- **IDEManager**: Will benefit from pooled connections
- **IDE Services**: Will use pooled connections instead of individual connections

## Technical Requirements
- **Memory Limit**: < 10MB for 5 concurrent connections
- **Connection Timeout**: 30 seconds default
- **Cleanup Interval**: 60 seconds default
- **Health Check**: 30 seconds default
- **Max Connections**: 5 default (configurable)

## Testing Strategy
- **Unit Tests**: Connection creation, retrieval, cleanup, health monitoring
- **Mock Requirements**: Playwright browser instances, Chrome DevTools Protocol
- **Coverage Target**: 90%+ test coverage
- **Performance Tests**: Memory usage validation

## Risk Mitigation
- **Connection Leaks**: Comprehensive cleanup and monitoring
- **Memory Issues**: Strict memory limits and cleanup intervals
- **Health Failures**: Automatic connection validation and recovery
- **Timeout Issues**: Configurable timeouts with fallback mechanisms 