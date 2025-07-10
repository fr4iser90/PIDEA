# Unified IDE API Documentation

## Overview

The Unified IDE API provides a standardized interface for managing multiple IDE instances, switching between them, and accessing their features and DOM data. This API abstracts the differences between various IDEs (VS Code, Cursor, WebStorm, etc.) and provides a consistent interface for frontend applications.

## Base URL

All IDE API endpoints are prefixed with `/api/ide/`

## Authentication

All endpoints require authentication. Include the authentication token in the request headers:

```
Authorization: Bearer <your-token>
```

## Core IDE Management

### List Available IDEs

**GET** `/api/ide/list`

Returns a list of all available IDE instances.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "port": 9222,
      "name": "VS Code",
      "status": "running",
      "version": "1.85.0",
      "uptime": 3600,
      "memory": "512MB"
    },
    {
      "port": 9223,
      "name": "Cursor",
      "status": "stopped",
      "version": "0.1.0",
      "uptime": 0,
      "memory": "0MB"
    }
  ]
}
```

### Get IDE Status

**GET** `/api/ide/status?port=<port>`

Returns detailed status information for a specific IDE instance.

**Parameters:**
- `port` (required): The port number of the IDE instance

**Response:**
```json
{
  "success": true,
  "data": {
    "port": 9222,
    "name": "VS Code",
    "status": "running",
    "version": "1.85.0",
    "uptime": 3600,
    "memory": "512MB",
    "connected": true,
    "lastPing": "2024-12-19T10:30:00Z",
    "processId": 12345
  }
}
```

### Start IDE

**POST** `/api/ide/start`

Starts a new IDE instance.

**Request Body:**
```json
{
  "port": 9222,
  "name": "VS Code",
  "type": "vscode",
  "workspace": "/path/to/workspace"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "port": 9222,
    "name": "VS Code",
    "status": "running",
    "startedAt": "2024-12-19T10:30:00Z"
  }
}
```

### Stop IDE

**POST** `/api/ide/stop`

Stops an IDE instance.

**Request Body:**
```json
{
  "port": 9222
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "port": 9222,
    "status": "stopped",
    "stoppedAt": "2024-12-19T10:35:00Z"
  }
}
```

## IDE Selection Management

### Get Current Selection

**GET** `/api/ide/selection`

Returns the currently selected IDE instance.

**Response:**
```json
{
  "success": true,
  "data": {
    "port": 9222,
    "name": "VS Code",
    "selectedAt": "2024-12-19T10:30:00Z",
    "reason": "manual"
  }
}
```

### Set IDE Selection

**POST** `/api/ide/selection`

Changes the currently selected IDE instance.

**Request Body:**
```json
{
  "port": 9223,
  "reason": "manual",
  "fromPort": 9222
}
```

**Parameters:**
- `port` (required): The port number of the target IDE
- `reason` (optional): The reason for the switch ("manual", "auto", "error_recovery")
- `fromPort` (optional): The port number of the previous IDE

**Response:**
```json
{
  "success": true,
  "data": {
    "previousPort": 9222,
    "currentPort": 9223,
    "reason": "manual",
    "switchedAt": "2024-12-19T10:35:00Z"
  }
}
```

### Get Available IDEs

**GET** `/api/ide/available`

Returns a list of available IDE instances for selection.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "port": 9222,
      "name": "VS Code",
      "status": "running",
      "selectable": true
    },
    {
      "port": 9223,
      "name": "Cursor",
      "status": "running",
      "selectable": true
    }
  ]
}
```

## IDE Mirror Interface

### Get DOM Data

**GET** `/api/ide/mirror/dom?port=<port>`

Returns the DOM structure of the IDE interface.

**Parameters:**
- `port` (required): The port number of the IDE instance

**Response:**
```json
{
  "success": true,
  "data": {
    "root": {
      "id": "root",
      "tagName": "DIV",
      "className": "monaco-editor",
      "textContent": "",
      "children": [
        {
          "id": "editor",
          "tagName": "DIV",
          "className": "editor-container",
          "textContent": "",
          "children": []
        }
      ]
    },
    "elementCount": 150,
    "lastUpdate": "2024-12-19T10:30:00Z"
  }
}
```

### Interact with IDE

**POST** `/api/ide/mirror/interact`

Sends interaction commands to the IDE.

**Request Body:**
```json
{
  "port": 9222,
  "action": "click",
  "elementId": "button1",
  "coordinates": {
    "x": 100,
    "y": 200
  },
  "modifiers": ["ctrl", "shift"]
}
```

**Parameters:**
- `port` (required): The port number of the IDE instance
- `action` (required): The action to perform ("click", "type", "hover", "scroll")
- `elementId` (optional): The ID of the target element
- `coordinates` (optional): Mouse coordinates
- `modifiers` (optional): Keyboard modifiers

**Response:**
```json
{
  "success": true,
  "data": {
    "action": "click",
    "elementId": "button1",
    "timestamp": "2024-12-19T10:30:00Z",
    "result": "success"
  }
}
```

### Get Mirror Status

**GET** `/api/ide/mirror/status?port=<port>`

Returns the status of the IDE mirror connection.

**Parameters:**
- `port` (required): The port number of the IDE instance

**Response:**
```json
{
  "success": true,
  "data": {
    "port": 9222,
    "connected": true,
    "lastUpdate": "2024-12-19T10:30:00Z",
    "elementCount": 150,
    "updateFrequency": "1000ms"
  }
}
```

## IDE Features

### Get IDE Features

**GET** `/api/ide/features?port=<port>`

Returns the features and capabilities of the IDE instance.

**Parameters:**
- `port` (required): The port number of the IDE instance

**Response:**
```json
{
  "success": true,
  "data": {
    "ide": "vscode",
    "version": "1.85.0",
    "features": {
      "debugging": {
        "available": true,
        "version": "1.0.0",
        "enabled": true
      },
      "intellisense": {
        "available": true,
        "version": "2.1.0",
        "enabled": true
      },
      "git": {
        "available": true,
        "version": "1.5.0",
        "enabled": true
      },
      "extensions": {
        "available": true,
        "version": "3.0.0",
        "enabled": true
      },
      "terminal": {
        "available": true,
        "version": "1.2.0",
        "enabled": true
      },
      "search": {
        "available": true,
        "version": "1.8.0",
        "enabled": true
      }
    },
    "capabilities": {
      "languageSupport": ["javascript", "typescript", "python", "java"],
      "debugging": ["node", "chrome", "python"],
      "extensions": ["marketplace", "local", "workspace"]
    }
  }
}
```

## Error Handling

All endpoints return consistent error responses:

**Error Response Format:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

**Common Error Codes:**
- `MISSING_PARAMETER`: Required parameter is missing
- `INVALID_PORT`: Port number is invalid or out of range
- `IDE_NOT_FOUND`: IDE instance not found
- `IDE_ALREADY_RUNNING`: IDE is already running
- `IDE_NOT_RUNNING`: IDE is not running
- `CONNECTION_FAILED`: Failed to connect to IDE
- `PERMISSION_DENIED`: Insufficient permissions
- `INTERNAL_ERROR`: Internal server error

## WebSocket Events

The IDE API also supports real-time updates via WebSocket connections:

### Connection

Connect to the WebSocket endpoint:
```
ws://localhost:3000/ws/ide
```

### Event Types

#### IDE Status Changed
```json
{
  "type": "ideStatusChanged",
  "data": {
    "port": 9222,
    "status": "running",
    "timestamp": "2024-12-19T10:30:00Z"
  }
}
```

#### IDE Selection Changed
```json
{
  "type": "ideSelectionChanged",
  "data": {
    "previousPort": 9222,
    "currentPort": 9223,
    "reason": "manual",
    "timestamp": "2024-12-19T10:35:00Z"
  }
}
```

#### DOM Updated
```json
{
  "type": "domUpdated",
  "data": {
    "port": 9222,
    "elementCount": 150,
    "timestamp": "2024-12-19T10:30:00Z"
  }
}
```

#### IDE Started
```json
{
  "type": "ideStarted",
  "data": {
    "port": 9222,
    "name": "VS Code",
    "timestamp": "2024-12-19T10:30:00Z"
  }
}
```

#### IDE Stopped
```json
{
  "type": "ideStopped",
  "data": {
    "port": 9222,
    "timestamp": "2024-12-19T10:35:00Z"
  }
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Standard endpoints**: 100 requests per minute
- **Mirror endpoints**: 60 requests per minute
- **Interaction endpoints**: 30 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Examples

### Complete IDE Switch Workflow

1. **Get available IDEs:**
```bash
curl -X GET "http://localhost:3000/api/ide/available" \
  -H "Authorization: Bearer <token>"
```

2. **Set IDE selection:**
```bash
curl -X POST "http://localhost:3000/api/ide/selection" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "port": 9223,
    "reason": "manual",
    "fromPort": 9222
  }'
```

3. **Get IDE features:**
```bash
curl -X GET "http://localhost:3000/api/ide/features?port=9223" \
  -H "Authorization: Bearer <token>"
```

4. **Get DOM data:**
```bash
curl -X GET "http://localhost:3000/api/ide/mirror/dom?port=9223" \
  -H "Authorization: Bearer <token>"
```

### WebSocket Integration

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/ide');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'ideStatusChanged':
      console.log(`IDE ${data.data.port} status: ${data.data.status}`);
      break;
    case 'ideSelectionChanged':
      console.log(`Switched from ${data.data.previousPort} to ${data.data.currentPort}`);
      break;
    case 'domUpdated':
      console.log(`DOM updated for IDE ${data.data.port}`);
      break;
  }
};
```

## Best Practices

1. **Always check response success**: Verify the `success` field before processing data
2. **Handle errors gracefully**: Implement proper error handling for all API calls
3. **Use WebSocket for real-time updates**: Subscribe to WebSocket events for live updates
4. **Cache IDE data**: Cache IDE information to reduce API calls
5. **Validate port numbers**: Ensure port numbers are within valid range (1-65535)
6. **Implement retry logic**: Add retry mechanisms for failed requests
7. **Monitor rate limits**: Respect rate limits and implement backoff strategies
8. **Use appropriate timeouts**: Set reasonable timeouts for API requests

## Migration Guide

### From Legacy IDE APIs

If migrating from IDE-specific APIs:

1. **Update endpoint URLs**: Change from `/api/vscode/*` to `/api/ide/*`
2. **Add port parameter**: Include port parameter in all requests
3. **Update response handling**: Adapt to new response format
4. **Implement selection logic**: Use IDE selection endpoints
5. **Update WebSocket events**: Subscribe to new event types

### Backward Compatibility

The legacy IDE-specific endpoints remain available during the transition period but are deprecated. New applications should use the unified API. 