# Chat System

The Cursor Chat Agent provides a sophisticated chat system that integrates directly with Cursor IDE for seamless development assistance.

## Overview

The chat system enables real-time communication between users and the Cursor IDE, allowing for:
- Direct IDE interaction through natural language
- Context-aware responses based on current workspace
- Real-time message exchange
- Session management
- Message history tracking

## Core Features

### Real-time Messaging

The chat system provides instant message delivery through WebSocket connections:

```javascript
// Send a message
const message = {
  content: "Create a new React component",
  sessionId: "current-session-id",
  timestamp: new Date().toISOString()
};

// Message is processed and sent to IDE
await sendMessage(message);
```

### Session Management

Each chat session maintains context and history:

- **Session Persistence**: Messages are stored per session
- **Context Awareness**: IDE state is maintained across messages
- **Session Switching**: Support for multiple concurrent sessions
- **History Retrieval**: Full message history available

### IDE Integration

The chat system integrates deeply with Cursor IDE:

- **Direct IDE Communication**: Messages are sent directly to the IDE
- **Context Extraction**: Current file, selection, and workspace context
- **Action Execution**: IDE actions can be triggered through chat
- **Response Processing**: IDE responses are captured and displayed

## API Endpoints

### Send Message

**POST** `/api/chat`

Send a message to the connected IDE.

```json
{
  "message": "Create a new file called utils.js",
  "sessionId": "optional-session-id"
}
```

### Get Chat History

**GET** `/api/chat/history`

Retrieve message history for the current session.

```json
{
  "messages": [
    {
      "id": "msg-123",
      "content": "Create a new file called utils.js",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "type": "user",
      "sessionId": "session-456"
    },
    {
      "id": "msg-124",
      "content": "I've created utils.js with basic structure",
      "timestamp": "2024-01-01T12:00:05.000Z",
      "type": "assistant",
      "sessionId": "session-456"
    }
  ]
}
```

### Connection Status

**GET** `/api/chat/status`

Check the current connection status.

```json
{
  "connected": true,
  "activePort": 9222,
  "availablePorts": [9222, 9223],
  "lastActivity": "2024-01-01T12:00:00.000Z"
}
```

## Message Types

### User Messages

Messages sent by the user to the IDE:

```javascript
{
  type: "user",
  content: "The message content",
  timestamp: "2024-01-01T12:00:00.000Z",
  sessionId: "session-id"
}
```

### Assistant Messages

Responses from the IDE or system:

```javascript
{
  type: "assistant",
  content: "Response content",
  timestamp: "2024-01-01T12:00:00.000Z",
  sessionId: "session-id",
  metadata: {
    action: "file_created",
    filePath: "/path/to/file.js"
  }
}
```

### System Messages

System notifications and status updates:

```javascript
{
  type: "system",
  content: "Connected to IDE on port 9222",
  timestamp: "2024-01-01T12:00:00.000Z",
  sessionId: "session-id"
}
```

## WebSocket Events

### Real-time Updates

The chat system uses WebSocket for real-time communication:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000');

// Listen for new messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'messageReceived':
      displayMessage(data.message);
      break;
    case 'connectionStatus':
      updateConnectionStatus(data.status);
      break;
    case 'ideStatusChanged':
      updateIDEStatus(data.status);
      break;
  }
};
```

### Event Types

- **messageReceived**: New message received
- **connectionStatus**: Connection status update
- **ideStatusChanged**: IDE status changed
- **sessionCreated**: New session created
- **sessionEnded**: Session ended

## Session Management

### Session Creation

Sessions are automatically created when needed:

```javascript
// Session is created automatically
const session = await createSession({
  workspacePath: "/path/to/workspace",
  idePort: 9222
});
```

### Session Context

Each session maintains context:

```javascript
{
  id: "session-123",
  workspacePath: "/path/to/workspace",
  idePort: 9222,
  createdAt: "2024-01-01T12:00:00.000Z",
  lastActivity: "2024-01-01T12:05:00.000Z",
  messageCount: 10,
  status: "active"
}
```

### Session Switching

Users can switch between sessions:

```javascript
// Switch to different session
await switchSession("session-456");

// Get session history
const history = await getSessionHistory("session-456");
```

## Message Processing

### Message Flow

1. **User Input**: Message entered in chat interface
2. **Validation**: Message content and format validated
3. **Context Extraction**: Current IDE context gathered
4. **IDE Communication**: Message sent to IDE via Chrome DevTools Protocol
5. **Response Processing**: IDE response captured and processed
6. **Display**: Response displayed in chat interface

### Context Extraction

The system extracts relevant context for each message:

```javascript
const context = {
  currentFile: "/path/to/current/file.js",
  selection: "selected code text",
  workspacePath: "/path/to/workspace",
  idePort: 9222,
  timestamp: "2024-01-01T12:00:00.000Z"
};
```

### Message Validation

Messages are validated before processing:

```javascript
const validation = {
  content: {
    required: true,
    minLength: 1,
    maxLength: 10000
  },
  sessionId: {
    required: false,
    format: "uuid"
  }
};
```

## Error Handling

### Connection Errors

```javascript
// Handle connection failures
try {
  await sendMessage(message);
} catch (error) {
  if (error.code === 'CONNECTION_FAILED') {
    // Attempt to reconnect
    await reconnect();
  } else {
    // Display error to user
    displayError(error.message);
  }
}
```

### Message Errors

```javascript
// Handle message processing errors
const handleMessageError = (error) => {
  switch (error.type) {
    case 'VALIDATION_ERROR':
      displayValidationError(error.details);
      break;
    case 'IDE_ERROR':
      displayIDEError(error.message);
      break;
    case 'TIMEOUT_ERROR':
      displayTimeoutError();
      break;
  }
};
```

## Performance Optimization

### Message Batching

Multiple messages can be batched for efficiency:

```javascript
// Batch multiple messages
const batch = [
  { content: "Message 1" },
  { content: "Message 2" },
  { content: "Message 3" }
];

await sendMessageBatch(batch);
```

### Caching

Message history is cached for quick access:

```javascript
// Cache recent messages
const cache = new MessageCache({
  maxSize: 1000,
  ttl: 3600000 // 1 hour
});
```

## Security Considerations

### Input Sanitization

All user input is sanitized:

```javascript
const sanitizedMessage = sanitizeInput(message.content);
```

### Session Security

Sessions are isolated and secure:

```javascript
// Validate session access
const canAccessSession = (userId, sessionId) => {
  return sessionId.startsWith(userId);
};
```

## Future Enhancements

### Planned Features

- **Message Encryption**: End-to-end encryption for messages
- **File Attachments**: Support for file uploads in chat
- **Code Snippets**: Rich code snippet display
- **Message Reactions**: Like/dislike reactions for messages
- **Search Functionality**: Search through chat history
- **Export Options**: Export chat history to various formats

### Integration Improvements

- **Multi-language Support**: Support for multiple programming languages
- **Plugin System**: Extensible chat functionality
- **AI Integration**: Enhanced AI-powered responses
- **Collaboration**: Multi-user chat sessions 