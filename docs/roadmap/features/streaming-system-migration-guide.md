# Streaming System Migration Guide: Session-Based to Port-Based

## Overview

The streaming system has been migrated from a session-based architecture to a simpler port-based architecture. This change removes unnecessary complexity and makes the system easier to use and maintain.

## Key Changes

### 1. Simplified Architecture

**Before (Session-Based):**
- Required session ID generation and management
- Complex session lifecycle tracking
- Session-specific WebSocket topics
- Session-based API endpoints

**After (Port-Based):**
- Direct port-based management
- Simplified port lifecycle
- Port-based WebSocket topics
- Streamlined API endpoints

### 2. API Endpoint Changes

#### Old Session-Based Endpoints (Deprecated)
```
POST /api/ide-mirror/:port/stream/start
POST /api/ide-mirror/:port/stream/stop
GET /api/ide-mirror/:port/stream/session/:sessionId
GET /api/ide-mirror/stream/sessions
PUT /api/ide-mirror/:port/stream/session/:sessionId/config
POST /api/ide-mirror/:port/stream/session/:sessionId/pause
POST /api/ide-mirror/:port/stream/session/:sessionId/resume
```

#### New Port-Based Endpoints
```
POST /api/ide-mirror/:port/stream/start
POST /api/ide-mirror/:port/stream/stop
GET /api/ide-mirror/:port/stream/status
GET /api/ide-mirror/stream/ports
PUT /api/ide-mirror/:port/stream/config
POST /api/ide-mirror/:port/stream/pause
POST /api/ide-mirror/:port/stream/resume
```

### 3. Request/Response Changes

#### Starting Streaming

**Before:**
```javascript
// Required session ID
POST /api/ide-mirror/3000/stream/start
{
  "sessionId": "stream-3000-1234567890-abc123",
  "fps": 10,
  "quality": 0.8,
  "format": "webp"
}

// Response
{
  "success": true,
  "sessionId": "stream-3000-1234567890-abc123",
  "port": 3000,
  "result": { ... }
}
```

**After:**
```javascript
// No session ID required
POST /api/ide-mirror/3000/stream/start
{
  "fps": 10,
  "quality": 0.8,
  "format": "jpeg"
}

// Response
{
  "success": true,
  "port": 3000,
  "result": { ... }
}
```

#### Stopping Streaming

**Before:**
```javascript
// Required session ID
POST /api/ide-mirror/3000/stream/stop
{
  "sessionId": "stream-3000-1234567890-abc123"
}
```

**After:**
```javascript
// No session ID required
POST /api/ide-mirror/3000/stream/stop
```

### 4. WebSocket Message Changes

#### Old Session-Based Messages
```javascript
{
  "type": "frame",
  "sessionId": "stream-3000-1234567890-abc123",
  "timestamp": 1234567890,
  "frameNumber": 42,
  "format": "webp",
  "size": 15360,
  "quality": 0.8,
  "data": "base64-encoded-frame-data",
  "metadata": {
    "sessionId": "stream-3000-1234567890-abc123",
    "port": 3000,
    "compressionTime": 15,
    "originalSize": 25600,
    "compressionRatio": 0.6
  }
}
```

#### New Port-Based Messages
```javascript
{
  "type": "frame",
  "port": 3000,
  "timestamp": 1234567890,
  "frameNumber": 42,
  "format": "jpeg",
  "size": 15360,
  "quality": 0.8,
  "data": "base64-encoded-frame-data",
  "metadata": {
    "port": 3000,
    "compressionTime": 15,
    "originalSize": 25600,
    "compressionRatio": 0.6
  }
}
```

### 5. WebSocket Topic Changes

**Before:**
```
mirror-3000-frames (session-based)
```

**After:**
```
mirror-3000-frames (port-based)
```

## Migration Steps

### For Frontend Applications

1. **Update API Calls**
   - Remove session ID parameters from all streaming API calls
   - Update endpoint URLs to use new port-based endpoints
   - Remove session ID handling from response processing

2. **Update WebSocket Handling**
   - Remove session ID from frame message processing
   - Use port directly for frame identification
   - Update topic subscription logic

3. **Update State Management**
   - Replace session-based state with port-based state
   - Update UI components to use port instead of session ID
   - Remove session ID generation and tracking

### For Backend Applications

1. **Update Service Calls**
   - Replace session-based service methods with port-based methods
   - Update command and handler usage
   - Remove session ID validation and generation

2. **Update Event Handling**
   - Replace session-based events with port-based events
   - Update event payloads to use port instead of session ID
   - Remove session lifecycle event handling

### For API Consumers

1. **Update Request Format**
   - Remove session ID from request bodies
   - Use port-based endpoint URLs
   - Update authentication if session-based

2. **Update Response Processing**
   - Remove session ID from response handling
   - Use port for stream identification
   - Update error handling for port-based errors

## Code Examples

### Frontend Service Migration

**Before:**
```javascript
class StreamingService {
  async startStreaming(port, sessionId, options = {}) {
    const response = await fetch(`/api/ide-mirror/${port}/stream/start`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        ...options
      })
    });
    return response.json();
  }
}
```

**After:**
```javascript
class StreamingService {
  async startStreaming(port, options = {}) {
    const response = await fetch(`/api/ide-mirror/${port}/stream/start`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
    return response.json();
  }
}
```

### WebSocket Handler Migration

**Before:**
```javascript
wsClient.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'frame') {
    const sessionId = message.sessionId;
    const port = message.metadata.port;
    handleFrame(sessionId, port, message.data);
  }
});
```

**After:**
```javascript
wsClient.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'frame') {
    const port = message.port;
    handleFrame(port, message.data);
  }
});
```

## Benefits of Migration

1. **Simplified Architecture**
   - Reduced complexity in codebase
   - Easier to understand and maintain
   - Fewer moving parts

2. **Better Performance**
   - Reduced overhead from session management
   - Faster API responses
   - Lower memory usage

3. **Improved Developer Experience**
   - Simpler API usage
   - Less boilerplate code
   - Clearer error messages

4. **Enhanced Reliability**
   - Fewer failure points
   - Better error handling
   - More predictable behavior

## Backward Compatibility

The old session-based endpoints are deprecated but may still work during a transition period. However, it's recommended to migrate to the new port-based system as soon as possible.

## Testing Migration

1. **Unit Tests**
   - Update test cases to use port-based methods
   - Remove session ID from test data
   - Update mock objects and fixtures

2. **Integration Tests**
   - Update API endpoint tests
   - Test WebSocket communication
   - Verify port-based workflows

3. **End-to-End Tests**
   - Test complete streaming workflows
   - Verify multiple port handling
   - Test error scenarios

## Support

If you encounter issues during migration:

1. Check the API documentation for the latest endpoint specifications
2. Review the error messages for guidance on required changes
3. Test with the new port-based endpoints in a development environment
4. Contact the development team for assistance

## Timeline

- **Phase 1**: Backend migration (Completed)
- **Phase 2**: Frontend migration (Completed)
- **Phase 3**: Testing and validation (Completed)
- **Phase 4**: Documentation and cleanup (In Progress)
- **Phase 5**: Deprecation of old endpoints (Planned)

## Conclusion

The migration to port-based streaming provides a cleaner, more efficient architecture while maintaining all the functionality of the previous session-based system. The simplified approach makes the system easier to use, maintain, and extend. 