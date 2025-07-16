# REST API Reference

Complete documentation for the Cursor Chat Agent REST API.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "error": null
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": "Error message"
}
```

## Chat API

### Send Message

**POST** `/api/chat`

Send a message to the connected Cursor IDE.

#### Request Body

```json
{
  "message": "Your message here",
  "sessionId": "optional-session-id"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "messageId": "uuid",
    "content": "Your message here",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "sessionId": "session-uuid",
    "status": "sent"
  }
}
```

### Get Chat History

**GET** `/api/chat/history`

Retrieve chat history for the current session.

#### Query Parameters

- `sessionId` (optional): Specific session ID
- `limit` (optional): Number of messages to return (default: 50)
- `offset` (optional): Number of messages to skip (default: 0)

#### Response

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message-uuid",
        "content": "Message content",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "type": "user|assistant",
        "sessionId": "session-uuid"
      }
    ],
    "total": 25,
    "hasMore": false
  }
}
```

### Get Chat History for Port

**GET** `/api/chat/port/:port/history`

Retrieve chat history for a specific IDE port.

#### Path Parameters

- `port`: IDE port number (e.g., 9222)

#### Response

```json
{
  "success": true,
  "data": {
    "port": 9222,
    "messages": [
      {
        "id": "message-uuid",
        "content": "Message content",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "type": "user|assistant"
      }
    ]
  }
}
```

### Switch to Port

**POST** `/api/chat/port/:port/switch`

Switch the active IDE to a specific port.

#### Path Parameters

- `port`: IDE port number to switch to

#### Response

```json
{
  "success": true,
  "data": {
    "previousPort": 9222,
    "currentPort": 9223,
    "status": "switched"
  }
}
```

### Get Connection Status

**GET** `/api/chat/status`

Get the current connection status.

#### Response

```json
{
  "success": true,
  "data": {
    "connected": true,
    "activePort": 9222,
    "availablePorts": [9222, 9223],
    "lastActivity": "2024-01-01T12:00:00.000Z"
  }
}
```

## IDE Management API

### Get Available IDEs

**GET** `/api/ide/available`

Get list of available Cursor IDE instances.

#### Response

```json
{
  "success": true,
  "data": [
    {
      "port": 9222,
      "status": "running",
      "url": "http://127.0.0.1:9222",
      "source": "detected",
      "workspacePath": "/path/to/workspace"
    }
  ]
}
```

### Start IDE

**POST** `/api/ide/start`

Start a new Cursor IDE instance.

#### Request Body

```json
{
  "workspacePath": "/path/to/workspace",
  "port": 9224
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "port": 9224,
    "status": "starting",
    "workspacePath": "/path/to/workspace",
    "url": "http://127.0.0.1:9224"
  }
}
```

### Switch IDE

**POST** `/api/ide/switch/:port`

Switch to a specific IDE instance.

#### Path Parameters

- `port`: IDE port number to switch to

#### Response

```json
{
  "success": true,
  "data": {
    "port": 9223,
    "status": "active",
    "workspacePath": "/path/to/workspace",
    "previousPort": 9222
  }
}
```

### Stop IDE

**DELETE** `/api/ide/stop/:port`

Stop a specific IDE instance.

#### Path Parameters

- `port`: IDE port number to stop

#### Response

```json
{
  "success": true,
  "data": {
    "port": 9223,
    "status": "stopped"
  }
}
```

### Get IDE Status

**GET** `/api/ide/status`

Get the current IDE status.

#### Response

```json
{
  "success": true,
  "data": {
    "activePort": 9222,
    "totalInstances": 3,
    "runningInstances": 2,
    "workspacePath": "/path/to/workspace"
  }
}
```

### Restart User App

**POST** `/api/ide/restart-app`

Restart the user's development server.

#### Response

```json
{
  "success": true,
  "data": {
    "status": "restarting",
    "message": "Development server restart initiated"
  }
}
```

### Get User App URL

**GET** `/api/ide/user-app-url`

Get the URL of the user's development server.

#### Response

```json
{
  "success": true,
  "data": {
    "url": "http://localhost:3000",
    "detected": true,
    "workspacePath": "/path/to/workspace"
  }
}
```

### Monitor Terminal

**POST** `/api/ide/monitor-terminal`

Start monitoring the IDE terminal.

#### Response

```json
{
  "success": true,
  "data": {
    "status": "monitoring",
    "terminalId": "terminal-uuid"
  }
}
```

### Set Workspace Path

**POST** `/api/ide/set-workspace/:port`

Set the workspace path for a specific IDE.

#### Path Parameters

- `port`: IDE port number

#### Request Body

```json
{
  "workspacePath": "/path/to/workspace"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "port": 9222,
    "workspacePath": "/path/to/workspace",
    "status": "updated"
  }
}
```

### Get Workspace Info

**GET** `/api/ide/workspace-info`

Get information about the current workspace.

#### Response

```json
{
  "success": true,
  "data": {
    "workspacePath": "/path/to/workspace",
    "activePort": 9222,
    "hasPackageJson": true,
    "devScripts": ["dev", "start", "build"],
    "detectedDevServer": "http://localhost:3000"
  }
}
```

### Debug DOM

**GET** `/api/ide/debug-dom`

Get current DOM state for debugging.

#### Response

```json
{
  "success": true,
  "data": {
    "domState": "current-dom-state",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "port": 9222
  }
}
```

## File Explorer API

### Get File Tree

**GET** `/api/files`

Get the file tree structure of the current workspace.

#### Response

```json
{
  "success": true,
  "data": [
    {
      "name": "src",
      "type": "directory",
      "path": "/workspace/src",
      "children": [
        {
          "name": "index.js",
          "type": "file",
          "path": "/workspace/src/index.js",
          "size": 1024
        }
      ]
    }
  ]
}
```

### Get File Content

**GET** `/api/files/content`

Get the content of a specific file.

#### Query Parameters

- `path`: File path relative to workspace

#### Response

```json
{
  "success": true,
  "data": {
    "path": "/workspace/src/index.js",
    "content": "console.log('Hello World');",
    "size": 1024,
    "lastModified": "2024-01-01T12:00:00.000Z"
  }
}
```

## Analysis API

### Create Techstack Analysis

**POST** `/api/analysis/techstack`

Create and queue a new techstack analysis for a project.

#### Request Body

```json
{
  "projectId": "project-uuid",
  "projectPath": "/path/to/project",
  "analysisType": "techstack",
  "priority": "high|medium|low",
  "metadata": {
    "framework": "react",
    "language": "javascript",
    "additionalContext": "optional-context"
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "analysisId": "analysis-uuid",
    "projectId": "project-uuid",
    "analysisType": "techstack",
    "status": "queued",
    "priority": "high",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "estimatedDuration": 300
  }
}
```

### Get Techstack Analysis

**GET** `/api/analysis/techstack/:projectId`

Retrieve techstack analysis results for a specific project.

#### Path Parameters

- `projectId`: Project identifier

#### Response

```json
{
  "success": true,
  "data": {
    "analysisId": "analysis-uuid",
    "projectId": "project-uuid",
    "analysisType": "techstack",
    "status": "completed",
    "results": {
      "frameworks": ["react", "express"],
      "languages": ["javascript", "typescript"],
      "databases": ["mongodb"],
      "tools": ["webpack", "babel"],
      "dependencies": {
        "production": ["react", "express"],
        "development": ["jest", "eslint"]
      }
    },
    "createdAt": "2024-01-01T12:00:00.000Z",
    "completedAt": "2024-01-01T12:05:00.000Z"
  }
}
```

### Create Recommendations Analysis

**POST** `/api/analysis/recommendations`

Create and queue a new recommendations analysis for a project.

#### Request Body

```json
{
  "projectId": "project-uuid",
  "projectPath": "/path/to/project",
  "analysisType": "recommendations",
  "priority": "high|medium|low",
  "metadata": {
    "currentTechstack": ["react", "nodejs"],
    "targetFeatures": ["authentication", "database"],
    "projectGoals": ["scalability", "performance"],
    "constraints": ["budget", "timeline"]
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "analysisId": "analysis-uuid",
    "projectId": "project-uuid",
    "analysisType": "recommendations",
    "status": "queued",
    "priority": "medium",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "estimatedDuration": 600
  }
}
```

### Get Recommendations Analysis

**GET** `/api/analysis/recommendations/:projectId`

Retrieve recommendations analysis results for a specific project.

#### Path Parameters

- `projectId`: Project identifier

#### Response

```json
{
  "success": true,
  "data": {
    "analysisId": "analysis-uuid",
    "projectId": "project-uuid",
    "analysisType": "recommendations",
    "status": "completed",
    "results": {
      "recommendations": [
        {
          "category": "authentication",
          "suggestions": ["passport.js", "auth0"],
          "priority": "high",
          "reasoning": "Security best practices"
        },
        {
          "category": "database",
          "suggestions": ["mongodb", "postgresql"],
          "priority": "medium",
          "reasoning": "Scalability requirements"
        }
      ],
      "techstackEnhancements": [
        {
          "component": "state-management",
          "recommendation": "redux-toolkit",
          "benefits": ["simplified setup", "better performance"]
        }
      ]
    },
    "createdAt": "2024-01-01T12:00:00.000Z",
    "completedAt": "2024-01-01T12:10:00.000Z"
  }
}
```

### Get Analysis Status

**GET** `/api/analysis/status/:analysisId`

Get the current status of an analysis.

#### Path Parameters

- `analysisId`: Analysis identifier

#### Response

```json
{
  "success": true,
  "data": {
    "analysisId": "analysis-uuid",
    "status": "processing",
    "progress": 65,
    "estimatedTimeRemaining": 120,
    "currentStep": "analyzing-dependencies",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

## Git Management API

For complete Git management functionality, see the dedicated [Git API Documentation](git-api.md).

### Available Git Endpoints

- **POST** `/api/projects/:projectId/git/status` - Get Git status
- **POST** `/api/projects/:projectId/git/branches` - Get all branches
- **POST** `/api/projects/:projectId/git/validate` - Validate changes
- **POST** `/api/projects/:projectId/git/compare` - Compare branches
- **POST** `/api/projects/:projectId/git/pull` - Pull changes
- **POST** `/api/projects/:projectId/git/checkout` - Checkout branch
- **POST** `/api/projects/:projectId/git/merge` - Merge branches
- **POST** `/api/projects/:projectId/git/create-branch` - Create branch
- **POST** `/api/projects/:projectId/git/info` - Get repository info

## System API

### Health Check

**GET** `/api/health`

Check the health status of the application.

#### Response

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "version": "2.0.0",
    "uptime": 3600
  }
}
```

### WebSocket Status

**GET** `/api/websocket/status`

Get WebSocket connection status.

#### Response

```json
{
  "success": true,
  "data": {
    "connected": true,
    "clients": 2,
    "lastActivity": "2024-01-01T12:00:00.000Z"
  }
}
```

## Error Codes

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Analysis already exists for project |
| 422 | Unprocessable Entity | Invalid analysis type or configuration |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | IDE not available or analysis service unavailable |

## Rate Limiting

Currently, no rate limiting is implemented. All endpoints are unlimited.

## CORS

The API supports CORS with the following configuration:

- **Origin**: `*` (all origins)
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

## Examples

### cURL Examples

```bash
# Send a message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, Cursor!"}'

# Get chat history
curl http://localhost:3000/api/chat/history

# Get available IDEs
curl http://localhost:3000/api/ide/available

# Start a new IDE
curl -X POST http://localhost:3000/api/ide/start \
  -H "Content-Type: application/json" \
  -d '{"workspacePath": "/path/to/project"}'

# Create techstack analysis
curl -X POST http://localhost:3000/api/analysis/techstack \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-project-123",
    "projectPath": "/path/to/project",
    "analysisType": "techstack",
    "priority": "high"
  }'

# Get techstack analysis results
curl http://localhost:3000/api/analysis/techstack/my-project-123

# Create recommendations analysis
curl -X POST http://localhost:3000/api/analysis/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-project-123",
    "projectPath": "/path/to/project",
    "analysisType": "recommendations",
    "metadata": {
      "currentTechstack": ["react", "nodejs"],
      "targetFeatures": ["authentication", "database"]
    }
  }'
```

### JavaScript Examples

```javascript
// Send a message
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Hello, Cursor!'
  })
});

const result = await response.json();

// Get available IDEs
const ides = await fetch('/api/ide/available')
  .then(res => res.json())
  .then(data => data.data);

// Create techstack analysis
const techstackAnalysis = await fetch('/api/analysis/techstack', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectId: 'my-project-123',
    projectPath: '/path/to/project',
    analysisType: 'techstack',
    priority: 'high'
  })
}).then(res => res.json());

// Get techstack analysis results
const techstackResults = await fetch('/api/analysis/techstack/my-project-123')
  .then(res => res.json())
  .then(data => data.data);

// Create recommendations analysis
const recommendationsAnalysis = await fetch('/api/analysis/recommendations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectId: 'my-project-123',
    projectPath: '/path/to/project',
    analysisType: 'recommendations',
    metadata: {
      currentTechstack: ['react', 'nodejs'],
      targetFeatures: ['authentication', 'database']
    }
  })
}).then(res => res.json());
```

## WebSocket Events

The application also provides real-time updates via WebSocket on `ws://localhost:3000`:

- `messageReceived`: New message received
- `ideStatusChanged`: IDE status changed
- `workspaceChanged`: Workspace path changed
- `userAppDetected`: User app detected
- `connectionStatus`: Connection status update 