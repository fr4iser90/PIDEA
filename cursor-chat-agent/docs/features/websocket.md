# WebSocket Communication

The Cursor Chat Agent uses WebSocket for real-time communication between the server and clients, enabling instant updates and bidirectional communication.

## Overview

The WebSocket system provides:
- Real-time bidirectional communication
- Event-driven updates
- Connection management
- Automatic reconnection
- Message broadcasting
- Client tracking

## Core Components

### WebSocket Manager

Manages WebSocket connections and handles real-time communication.

```javascript
const WebSocketManager = require('./src/presentation/websocket/WebSocketManager');

const webSocketManager = new WebSocketManager(server, eventBus);
```

**Features:**
- **Connection Management**: Manages client connections
- **Event Broadcasting**: Broadcasts events to all clients
- **Message Routing**: Routes messages to appropriate handlers
- **Health Monitoring**: Monitors connection health
- **Automatic Cleanup**: Cleans up disconnected clients

### Event Bus Integration

Integrates with the domain event bus for real-time updates.

```javascript
const EventBus = require('./src/infrastructure/messaging/EventBus');

const eventBus = new EventBus();
eventBus.subscribe('MessageSent', (data) => {
  webSocketManager.broadcastToClients('messageReceived', data);
});
```

## Connection Management

### Server-Side Setup

```javascript
// Setup WebSocket server
const WebSocket = require('ws');
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize WebSocket manager
const webSocketManager = new WebSocketManager(server, eventBus);
```

### Client Connection

```javascript
// Client-side connection
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleWebSocketMessage(data);
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket');
};
```

## Message Types

### Event Messages

Real-time events from the server:

```javascript
{
  type: 'messageReceived',
  data: {
    id: 'msg-123',
    content: 'Hello, Cursor!',
    timestamp: '2024-01-01T12:00:00.000Z',
    type: 'user'
  }
}
```

### Status Updates

Connection and system status updates:

```javascript
{
  type: 'connectionStatus',
  data: {
    connected: true,
    activePort: 9222,
    lastActivity: '2024-01-01T12:00:00.000Z'
  }
}
```

### IDE Events

IDE-related real-time updates:

```javascript
{
  type: 'ideStatusChanged',
  data: {
    port: 9222,
    status: 'active',
    workspacePath: '/path/to/workspace'
  }
}
```

## Event System

### Server Events

The server publishes events that are broadcast to clients:

#### Message Events
```javascript
// Message sent event
eventBus.publish('MessageSent', {
  id: 'msg-123',
  content: 'Hello, Cursor!',
  timestamp: new Date().toISOString()
});

// Message received event
eventBus.publish('MessageReceived', {
  id: 'msg-124',
  content: 'Response from IDE',
  timestamp: new Date().toISOString()
});
```

#### IDE Events
```javascript
// IDE status changed
eventBus.publish('activeIDEChanged', {
  port: 9223,
  previousPort: 9222,
  workspacePath: '/path/to/workspace'
});

// User app detected
eventBus.publish('userAppDetected', {
  url: 'http://localhost:3000',
  workspacePath: '/path/to/workspace'
});
```

#### System Events
```javascript
// Connection status
eventBus.publish('connectionStatus', {
  connected: true,
  activePort: 9222,
  availablePorts: [9222, 9223]
});

// Workspace changed
eventBus.publish('workspaceChanged', {
  workspacePath: '/path/to/workspace',
  port: 9222
});
```

### Client Event Handling

```javascript
// Handle WebSocket messages
const handleWebSocketMessage = (data) => {
  switch (data.type) {
    case 'messageReceived':
      displayMessage(data.data);
      break;
      
    case 'ideStatusChanged':
      updateIDEStatus(data.data);
      break;
      
    case 'connectionStatus':
      updateConnectionStatus(data.data);
      break;
      
    case 'userAppDetected':
      updateUserApp(data.data);
      break;
      
    case 'workspaceChanged':
      updateWorkspace(data.data);
      break;
      
    default:
      console.log('Unknown event type:', data.type);
  }
};
```

## Broadcasting

### Broadcast to All Clients

```javascript
// Broadcast to all connected clients
webSocketManager.broadcastToClients('messageReceived', {
  id: 'msg-123',
  content: 'Hello, everyone!',
  timestamp: new Date().toISOString()
});
```

### Broadcast to Specific Clients

```javascript
// Broadcast to specific client
webSocketManager.sendToClient(clientId, 'privateMessage', {
  content: 'Private message for you'
});
```

### Conditional Broadcasting

```javascript
// Broadcast based on conditions
webSocketManager.broadcastToClients('ideStatusChanged', data, (client) => {
  return client.subscribedToIDE;
});
```

## Connection Health

### Health Monitoring

```javascript
// Monitor connection health
const healthStatus = webSocketManager.getHealthStatus();

// Result
{
  connected: true,
  clients: 3,
  lastActivity: '2024-01-01T12:00:00.000Z',
  uptime: 3600,
  messageCount: 150
}
```

### Heartbeat System

```javascript
// Send heartbeat to keep connections alive
setInterval(() => {
  webSocketManager.broadcastToClients('heartbeat', {
    timestamp: new Date().toISOString()
  });
}, 30000); // Every 30 seconds
```

### Connection Cleanup

```javascript
// Clean up disconnected clients
webSocketManager.cleanupDisconnectedClients();

// Get active clients
const activeClients = webSocketManager.getActiveClients();
```

## Error Handling

### Connection Errors

```javascript
// Handle connection errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  
  // Attempt to reconnect
  setTimeout(() => {
    connectWebSocket();
  }, 5000);
};
```

### Message Errors

```javascript
// Handle message errors
try {
  const data = JSON.parse(event.data);
  handleWebSocketMessage(data);
} catch (error) {
  console.error('Failed to parse message:', error);
  
  // Send error response
  ws.send(JSON.stringify({
    type: 'error',
    error: 'Invalid message format'
  }));
}
```

### Server-Side Error Handling

```javascript
// Handle client connection errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Handle individual client errors
wss.on('connection', (ws) => {
  ws.on('error', (error) => {
    console.error('Client connection error:', error);
  });
});
```

## Reconnection Strategy

### Automatic Reconnection

```javascript
// Client-side reconnection
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('Connected to WebSocket');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected from WebSocket');
      this.attemptReconnect();
    };
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, delay);
    }
  }
}
```

### Connection State Management

```javascript
// Track connection state
const connectionState = {
  connected: false,
  reconnecting: false,
  lastConnected: null,
  reconnectAttempts: 0
};

// Update connection state
const updateConnectionState = (state) => {
  Object.assign(connectionState, state);
  
  // Broadcast state change
  webSocketManager.broadcastToClients('connectionStateChanged', connectionState);
};
```

## Performance Optimization

### Message Batching

```javascript
// Batch multiple messages
const messageQueue = [];
let batchTimeout = null;

const queueMessage = (type, data) => {
  messageQueue.push({ type, data });
  
  if (!batchTimeout) {
    batchTimeout = setTimeout(() => {
      flushMessageQueue();
    }, 100);
  }
};

const flushMessageQueue = () => {
  if (messageQueue.length > 0) {
    webSocketManager.broadcastToClients('batchUpdate', {
      messages: messageQueue
    });
    messageQueue.length = 0;
  }
  batchTimeout = null;
};
```

### Connection Pooling

```javascript
// Manage multiple connections
class ConnectionPool {
  constructor(maxConnections = 10) {
    this.connections = new Map();
    this.maxConnections = maxConnections;
  }
  
  addConnection(id, connection) {
    if (this.connections.size >= this.maxConnections) {
      // Remove oldest connection
      const oldestId = this.connections.keys().next().value;
      this.removeConnection(oldestId);
    }
    
    this.connections.set(id, connection);
  }
  
  removeConnection(id) {
    const connection = this.connections.get(id);
    if (connection) {
      connection.close();
      this.connections.delete(id);
    }
  }
}
```

## Security Considerations

### Message Validation

```javascript
// Validate incoming messages
const validateMessage = (message) => {
  const schema = {
    type: 'string',
    data: 'object'
  };
  
  for (const [key, expectedType] of Object.entries(schema)) {
    if (!message.hasOwnProperty(key)) {
      throw new Error(`Missing required field: ${key}`);
    }
    
    if (typeof message[key] !== expectedType) {
      throw new Error(`Invalid type for ${key}: expected ${expectedType}`);
    }
  }
  
  return true;
};
```

### Rate Limiting

```javascript
// Implement rate limiting
const rateLimiter = new Map();

const checkRateLimit = (clientId, limit = 100, window = 60000) => {
  const now = Date.now();
  const clientLimits = rateLimiter.get(clientId) || [];
  
  // Remove old entries
  const validLimits = clientLimits.filter(time => now - time < window);
  
  if (validLimits.length >= limit) {
    return false; // Rate limit exceeded
  }
  
  validLimits.push(now);
  rateLimiter.set(clientId, validLimits);
  return true;
};
```

## API Endpoints

### WebSocket Status

**GET** `/api/websocket/status`

Get WebSocket connection status.

```json
{
  "success": true,
  "data": {
    "connected": true,
    "clients": 3,
    "lastActivity": "2024-01-01T12:00:00.000Z",
    "uptime": 3600,
    "messageCount": 150
  }
}
```

## Testing

### WebSocket Testing

```javascript
// Test WebSocket connection
const testWebSocket = async () => {
  const ws = new WebSocket('ws://localhost:3000');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 5000);
    
    ws.onopen = () => {
      clearTimeout(timeout);
      ws.close();
      resolve('Connection successful');
    };
    
    ws.onerror = (error) => {
      clearTimeout(timeout);
      reject(error);
    };
  });
};
```

### Message Testing

```javascript
// Test message sending
const testMessage = async () => {
  const ws = new WebSocket('ws://localhost:3000');
  
  return new Promise((resolve) => {
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'test',
        data: { message: 'Hello, WebSocket!' }
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      ws.close();
      resolve(data);
    };
  });
};
```

## Troubleshooting

### Common Issues

#### Connection Fails

```bash
# Check if WebSocket server is running
curl http://localhost:3000/api/websocket/status

# Check server logs
tail -f logs/websocket.log
```

#### Messages Not Received

```bash
# Check client connection
# Open browser dev tools and check WebSocket tab

# Test with simple client
node -e "
const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Received:', e.data);
"
```

#### High Memory Usage

```bash
# Check active connections
curl http://localhost:3000/api/websocket/status

# Restart WebSocket server
npm run dev:full
```

## Future Enhancements

### Planned Features

- **Message Encryption**: End-to-end encryption for sensitive data
- **Compression**: Message compression for better performance
- **Load Balancing**: Support for multiple WebSocket servers
- **Analytics**: WebSocket usage analytics and monitoring
- **Plugin System**: Extensible WebSocket event handling

### Performance Improvements

- **Binary Messages**: Support for binary message formats
- **Connection Multiplexing**: Multiple logical connections over single WebSocket
- **Message Prioritization**: Priority-based message handling
- **Caching**: Message caching for offline scenarios
- **Optimization**: Further performance optimizations 