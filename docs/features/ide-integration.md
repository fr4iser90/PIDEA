# IDE Integration

The Cursor Chat Agent provides deep integration with Cursor IDE through Chrome DevTools Protocol, enabling automated interaction and real-time communication.

## Overview

The IDE integration system allows the application to:
- Automatically detect running Cursor IDE instances
- Connect to IDEs via Chrome DevTools Protocol
- Manage multiple IDE instances simultaneously
- Extract workspace and file information
- Execute IDE actions programmatically
- Monitor IDE state changes

## Core Components

### IDEDetector

Automatically scans for running Cursor IDE instances on configured ports.

```javascript
const IDEDetector = require('./src/infrastructure/external/IDEDetector');

const detector = new IDEDetector();
const availableIDEs = await detector.scanForIDEs();
```

**Features:**
- **Port Range Scanning**: Scans ports 9222-9231 by default
- **HTTP-based Detection**: Uses `/json/version` endpoint for detection
- **Timeout Handling**: Configurable scan timeout per port
- **Port Availability**: Finds available ports for new IDE instances

### IDEManager

Manages multiple IDE instances and provides high-level IDE operations.

```javascript
const IDEManager = require('./src/infrastructure/external/IDEManager');

const ideManager = new IDEManager();
await ideManager.initialize();
```

**Features:**
- **Instance Management**: Tracks multiple IDE instances
- **Active IDE Switching**: Switch between different IDE instances
- **Workspace Management**: Track workspace paths per IDE
- **Health Monitoring**: Monitor IDE instance health
- **Auto-start Capability**: Start new IDE instances when needed

### BrowserManager

Handles Playwright browser connections to IDE instances.

```javascript
const BrowserManager = require('./src/infrastructure/external/BrowserManager');

const browserManager = new BrowserManager();
await browserManager.connect(9222);
```

**Features:**
- **Chrome DevTools Protocol**: Direct IDE communication
- **Page Management**: Manage browser pages and contexts
- **DOM Access**: Extract and manipulate IDE DOM
- **File Operations**: Read file explorer and file contents
- **Action Execution**: Execute IDE actions programmatically

## IDE Detection

### Automatic Detection

The system automatically detects running Cursor IDE instances:

```javascript
// Scan for available IDEs
const availableIDEs = await ideManager.getAvailableIDEs();

// Result format
[
  {
    port: 9222,
    status: 'running',
    url: 'http://127.0.0.1:9222',
    source: 'detected',
    workspacePath: '/path/to/workspace'
  }
]
```

### Detection Configuration

```javascript
// Configure detection settings
const detector = new IDEDetector({
  portRange: { start: 9222, end: 9231 },
  scanTimeout: 1000,
  retryAttempts: 3
});
```

### Manual Detection

```bash
# Test IDE detection manually
node -e "
const IDEDetector = require('./src/infrastructure/external/IDEDetector');
const detector = new IDEDetector();
detector.scanForIDEs().then(console.log);
"
```

## IDE Management

### Starting IDE Instances

```javascript
// Start a new IDE instance
const ideInfo = await ideManager.startNewIDE('/path/to/workspace');

// Result
{
  port: 9224,
  status: 'starting',
  workspacePath: '/path/to/workspace',
  url: 'http://127.0.0.1:9224'
}
```

### Switching Between IDEs

```javascript
// Switch to a specific IDE
const result = await ideManager.switchToIDE(9223);

// Result
{
  port: 9223,
  status: 'active',
  workspacePath: '/path/to/workspace',
  previousPort: 9222
}
```

### Stopping IDE Instances

```javascript
// Stop a specific IDE
const result = await ideManager.stopIDE(9223);

// Result
{
  port: 9223,
  status: 'stopped'
}
```

## Workspace Management

### Workspace Detection

The system automatically detects workspace paths:

```javascript
// Get workspace info for current IDE
const workspaceInfo = await ideManager.getActiveIDE();

// Result
{
  port: 9222,
  status: 'running',
  workspacePath: '/path/to/workspace',
  hasPackageJson: true,
  devScripts: ['dev', 'start', 'build']
}
```

### Workspace Configuration

```javascript
// Set workspace path for an IDE
await ideManager.setWorkspacePath(9222, '/path/to/workspace');

// Get workspace path
const workspacePath = ideManager.getWorkspacePath(9222);
```

### Development Server Detection

```javascript
// Detect development server from package.json
const devServerUrl = await cursorIDEService.detectDevServerFromPackageJson(workspacePath);

// Result
{
  url: 'http://localhost:3000',
  script: 'dev',
  detected: true
}
```

## DOM Integration

### DOM Access

Access IDE DOM elements through Playwright:

```javascript
// Get current page
const page = await browserManager.getPage();

// Extract DOM content
const html = await page.content();

// Find specific elements
const chatContainer = await page.$('.chat-container');
const editorContent = await page.$('.editor-content');
```

### DOM Analysis

The system includes automated DOM analysis tools:

```bash
# Run full DOM analysis
npm run full-analysis

# Collect DOM data from different IDE states
npm run auto-collect-dom

# Analyze collected DOM data
npm run analyze-dom
```

### Selector Generation

Generate reliable selectors for IDE elements:

```bash
# Generate selectors
npm run analyze-dom

# Check generated selectors
cat generated/selectors.js
```

## File Operations

### File Explorer Access

```javascript
// Get file tree
const fileTree = await browserManager.getFileExplorerTree();

// Result
[
  {
    name: 'src',
    type: 'directory',
    path: '/workspace/src',
    children: [
      {
        name: 'index.js',
        type: 'file',
        path: '/workspace/src/index.js',
        size: 1024
      }
    ]
  }
]
```

### File Content Reading

```javascript
// Read file content
const content = await browserManager.getFileContent('/path/to/file.js');

// Result
{
  path: '/path/to/file.js',
  content: 'console.log("Hello World");',
  size: 1024,
  lastModified: '2024-01-01T12:00:00.000Z'
}
```

## API Endpoints

### IDE Management API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ide/available` | GET | Get available IDE instances |
| `/api/ide/start` | POST | Start new IDE instance |
| `/api/ide/switch/:port` | POST | Switch to specific IDE |
| `/api/ide/stop/:port` | DELETE | Stop IDE instance |
| `/api/ide/status` | GET | Get current IDE status |

### Workspace API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ide/workspace-info` | GET | Get workspace information |
| `/api/ide/set-workspace/:port` | POST | Set workspace path |
| `/api/ide/user-app-url` | GET | Get development server URL |

### File API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/files` | GET | Get file tree |
| `/api/files/content` | GET | Get file content |

## Event System

### IDE Events

The system publishes events for IDE state changes:

```javascript
// Subscribe to IDE events
eventBus.subscribe('activeIDEChanged', (eventData) => {
  console.log('Active IDE changed:', eventData);
});

eventBus.subscribe('userAppDetected', (eventData) => {
  console.log('User app detected:', eventData);
});
```

### WebSocket Events

Real-time IDE updates via WebSocket:

```javascript
// WebSocket events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'ideStatusChanged':
      updateIDEStatus(data.status);
      break;
    case 'workspaceChanged':
      updateWorkspace(data.workspace);
      break;
    case 'userAppDetected':
      updateUserApp(data.url);
      break;
  }
};
```

## Error Handling

### Connection Errors

```javascript
// Handle IDE connection failures
try {
  await browserManager.connect(port);
} catch (error) {
  if (error.code === 'CONNECTION_FAILED') {
    // Attempt to reconnect or start new IDE
    await ideManager.startNewIDE();
  }
}
```

### IDE Detection Errors

```javascript
// Handle detection failures
try {
  const ides = await detector.scanForIDEs();
  if (ides.length === 0) {
    // No IDEs found, start one
    await ideManager.startNewIDE();
  }
} catch (error) {
  console.error('IDE detection failed:', error);
}
```

## Performance Optimization

### Connection Pooling

```javascript
// Reuse browser connections
const browserManager = new BrowserManager({
  maxConnections: 5,
  connectionTimeout: 30000,
  keepAlive: true
});
```

### Caching

```javascript
// Cache IDE information
const ideCache = new Map();

const getIDEInfo = async (port) => {
  if (ideCache.has(port)) {
    return ideCache.get(port);
  }
  
  const info = await ideManager.getIDEInfo(port);
  ideCache.set(port, info);
  return info;
};
```

## Security Considerations

### Port Validation

```javascript
// Validate IDE ports
const isValidPort = (port) => {
  return port >= 9222 && port <= 9231;
};
```

### Workspace Path Validation

```javascript
// Validate workspace paths
const isValidWorkspace = (path) => {
  return fs.existsSync(path) && fs.statSync(path).isDirectory();
};
```

## Troubleshooting

### Common Issues

#### IDE Not Detected

```bash
# Check if IDE is running
curl http://127.0.0.1:9222/json/version

# Test detection manually
node -e "
const IDEDetector = require('./src/infrastructure/external/IDEDetector');
const detector = new IDEDetector();
detector.scanForIDEs().then(console.log);
"
```

#### Connection Failed

```bash
# Check browser installation
npx playwright install --force

# Test browser connection
npx playwright test --headed
```

#### Workspace Not Detected

```bash
# Check workspace path
ls -la /path/to/workspace

# Verify package.json exists
cat /path/to/workspace/package.json
```

## Future Enhancements

### Planned Features

- **Multi-workspace Support**: Manage multiple workspaces per IDE
- **Plugin System**: Extensible IDE integration
- **Advanced DOM Analysis**: More sophisticated DOM manipulation
- **Performance Monitoring**: IDE performance metrics
- **Collaboration Features**: Multi-user IDE sharing

### Integration Improvements

- **VS Code Integration**: Support for VS Code instances
- **JetBrains Integration**: Support for IntelliJ IDEs
- **Remote IDE Support**: Connect to remote IDE instances
- **Cloud IDE Integration**: Support for cloud-based IDEs 