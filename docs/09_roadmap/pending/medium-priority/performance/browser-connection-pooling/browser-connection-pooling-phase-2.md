# Browser Connection Pooling – Phase 2: BrowserManager Integration

## Overview
Refactor BrowserManager to use ConnectionPool for instant port switching without disconnect/connect cycles, enabling 95%+ performance improvement in IDE switching.

## Objectives
- [ ] Refactor BrowserManager to use ConnectionPool
- [ ] Update switchToPort to use pooled connections
- [ ] Implement instant port switching without disconnect/connect
- [ ] Add connection validation and error handling

## Deliverables
- File: `backend/infrastructure/external/BrowserManager.js` - Refactored to use ConnectionPool
- Test: `tests/integration/infrastructure/external/BrowserManager.test.js` - Integration tests for pooled connections
- Documentation: Updated BrowserManager API documentation

## Dependencies
- Requires: Phase 1 - Connection Pool Foundation completion
- Blocks: Phase 3 - IDE Service Updates

## Estimated Time
1.5 hours

## Success Criteria
- [ ] BrowserManager uses ConnectionPool for all connections
- [ ] IDE switching time reduced from 6s to <100ms
- [ ] Support for 10+ rapid IDE switches per second
- [ ] All existing functionality preserved
- [ ] Integration tests pass
- [ ] No connection leaks or memory issues

## Implementation Details

### Current State Analysis
The current BrowserManager has these performance bottlenecks:
```javascript
// Current BrowserManager.js lines 84-89
async switchToPort(port) {
  logger.info(`Switching to port ${port}...`);
  this.currentPort = port;
  await this.connect(port); // This triggers disconnect + connect cycle
}

// Current connect method (lines 14-63) - 6 second bottleneck
async connect(port = null) {
  // Disconnect existing connection if switching ports
  if (this.browser && port) {
    await this.disconnect(); // 2-3 seconds
  }
  
  this.browser = await chromium.connectOverCDP(`http://${host}:${this.currentPort}`); // 1-2 seconds
  // Total: 6 seconds per switch
}
```

### New BrowserManager Architecture
```javascript
class BrowserManager {
  constructor() {
    this.connectionPool = new ConnectionPool();
    this.currentPort = null;
    this.isConnecting = false;
  }

  async switchToPort(port) {
    if (this.currentPort === port) {
      return; // Already connected to this port
    }
    
    logger.info(`Switching to port ${port} using connection pool...`);
    
    // Get connection from pool (instant if cached)
    const connection = await this.connectionPool.getConnection(port);
    
    // Update current port
    this.currentPort = port;
    
    // Update internal references
    this.browser = connection.browser;
    this.page = connection.page;
    
    logger.info(`Successfully switched to port ${port} in <100ms`);
    return connection;
  }

  async getPage() {
    if (!this.currentPort) {
      throw new Error('No active port selected');
    }
    
    const connection = await this.connectionPool.getConnection(this.currentPort);
    return connection.page;
  }
}
```

### Key Changes Required
1. **Constructor Update**: Initialize ConnectionPool instead of single connection
2. **switchToPort Method**: Use pooled connections for instant switching
3. **getPage Method**: Get page from connection pool
4. **connect Method**: Delegate to connection pool
5. **disconnect Method**: Close specific connection in pool
6. **Error Handling**: Graceful fallback to connection creation

### Performance Benefits
- **Before**: 6 seconds per IDE switch (disconnect + connect)
- **After**: <100ms per IDE switch (instant port change)
- **Memory**: ~2MB per connection, ~10MB for 5 connections
- **Scalability**: Support for unlimited IDE instances
- **Reliability**: Automatic connection health monitoring and recovery

### Integration Points
- **IDEManager.switchToIDE()**: Will benefit from instant port switching
- **IDE Services**: Will use BrowserManager's pooled connections
- **Step System**: Will execute faster with instant IDE switching
- **API Controllers**: Will respond faster to IDE switch requests

## Technical Requirements
- **Response Time**: IDE switch < 100ms (95% improvement)
- **Throughput**: Support 10+ rapid IDE switches per second
- **Memory Usage**: < 10MB for 5 concurrent connections
- **Backward Compatibility**: All existing API methods preserved
- **Error Recovery**: Automatic fallback to connection creation

## Testing Strategy
- **Integration Tests**: Multiple IDE switching, connection persistence, error recovery
- **Performance Tests**: Before/after benchmarking, stress testing
- **Test Data**: Multiple IDE instances on different ports
- **Mock Requirements**: ConnectionPool, Chrome DevTools Protocol

## Risk Mitigation
- **Connection Failures**: Automatic retry and fallback mechanisms
- **Memory Leaks**: Strict connection limits and cleanup
- **Performance Regression**: Comprehensive benchmarking
- **API Breaking Changes**: Maintain backward compatibility

## Migration Strategy
1. **Phase 1**: Add ConnectionPool as optional dependency
2. **Phase 2**: Refactor core methods to use ConnectionPool
3. **Phase 3**: Remove old single-connection logic
4. **Phase 4**: Performance validation and optimization 