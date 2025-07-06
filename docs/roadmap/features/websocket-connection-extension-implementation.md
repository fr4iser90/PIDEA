# IDE Extension WebSocket Connection Implementation

## 1. Project Overview
- **Feature/Component Name**: IDE Extension WebSocket Connection
- **Priority**: High
- **Estimated Time**: 2-3 weeks
- **Dependencies**: VS Code Extension API, WebSocket client, PIDEA backend
- **Related Issues**: Secure IDE-backend communication, real-time command monitoring, terminal output capture

## 2. Technical Requirements
- **Tech Stack**: TypeScript, VS Code Extension API, WebSocket, Node.js
- **Architecture Pattern**: Extension Pattern, Bridge Pattern, Event-Driven Architecture
- **Database Changes**: None (extension state only)
- **API Changes**: New WebSocket endpoints for extension communication
- **Frontend Changes**: Extension UI components, status bar integration
- **Backend Changes**: Extension authentication, WebSocket bridge endpoints

## 3. File Impact Analysis

### Files to Modify:
- [ ] `backend/presentation/websocket/WebSocketManager.js` - Add extension-specific handlers
- [ ] `backend/infrastructure/auth/AuthMiddleware.js` - Add extension authentication
- [ ] `backend/presentation/api/IDEController.js` - Add extension status endpoints
- [ ] `frontend/src/presentation/components/ChatComponent.jsx` - Add extension status display
- [ ] `package.json` - Add monorepo scripts for extension development
- [ ] `docker-compose.yml` - Add extension development environment
- [ ] `backend/Application.js` - Register extension services
- [ ] `backend/infrastructure/di/ApplicationIntegration.js` - Add extension DI configuration

### Files to Create:
- [ ] `extension/package.json` - Extension manifest
- [ ] `extension/src/extension.ts` - Main extension entry point
- [ ] `extension/src/websocket/WebSocketClient.ts` - WebSocket communication
- [ ] `extension/src/services/CommandMonitor.ts` - Command monitoring service
- [ ] `extension/src/services/TerminalMonitor.ts` - Terminal output capture
- [ ] `extension/src/services/StatusBarManager.ts` - Status bar integration
- [ ] `extension/src/utils/Configuration.ts` - Extension configuration
- [ ] `extension/src/types/index.ts` - TypeScript type definitions
- [ ] `extension/src/commands/ConnectCommand.ts` - Connection commands
- [ ] `extension/src/commands/MonitorCommand.ts` - Monitoring commands
- [ ] `extension/webpack.config.js` - Webpack configuration
- [ ] `extension/.vscodeignore` - Extension ignore file
- [ ] `extension/README.md` - Extension documentation
- [ ] `extension/tsconfig.json` - TypeScript configuration
- [ ] `extension/jest.config.js` - Jest configuration
- [ ] `extension/.eslintrc.js` - ESLint configuration
- [ ] `extension/.prettierrc` - Prettier configuration
- [ ] `backend/domain/services/ExtensionBridgeService.js` - Backend extension bridge
- [ ] `backend/tests/unit/domain/services/ExtensionBridgeService.test.js` - Extension tests
- [ ] `backend/presentation/api/ExtensionController.js` - Extension API endpoints
- [ ] `backend/infrastructure/auth/ExtensionAuthMiddleware.js` - Extension-specific auth
- [ ] `backend/domain/repositories/ExtensionSessionRepository.js` - Extension session management
- [ ] `backend/infrastructure/database/InMemoryExtensionSessionRepository.js` - In-memory extension sessions
- [ ] `scripts/extension-dev.sh` - Extension development script
- [ ] `scripts/extension-build.sh` - Extension build script
- [ ] `scripts/extension-test.sh` - Extension testing script
- [ ] `scripts/extension-package.sh` - Extension packaging script
- [ ] `docs/extension/installation.md` - Extension installation guide
- [ ] `docs/extension/development.md` - Extension development guide
- [ ] `docs/extension/api.md` - Extension API documentation

### Files to Delete:
- [ ] None

## 4. Implementation Phases

### Phase 1: Monorepo Integration Setup
- [ ] Update root package.json with extension scripts
- [ ] Create extension directory structure
- [ ] Set up extension development environment
- [ ] Configure Docker for extension development
- [ ] Add extension to monorepo build pipeline

### Phase 2: Extension Foundation Setup
- [ ] Create VS Code extension project structure
- [ ] Set up TypeScript configuration
- [ ] Configure Webpack for bundling
- [ ] Create basic extension manifest
- [ ] Set up development environment

### Phase 3: Backend Extension Services
- [ ] Create ExtensionBridgeService
- [ ] Implement ExtensionController
- [ ] Add ExtensionAuthMiddleware
- [ ] Create ExtensionSessionRepository
- [ ] Integrate extension services into DI container

### Phase 4: WebSocket Communication
- [ ] Implement WebSocket client for backend connection
- [ ] Add connection management and reconnection logic
- [ ] Implement message serialization/deserialization
- [ ] Add error handling and logging
- [ ] Create connection status indicators

### Phase 5: Command Monitoring
- [ ] Implement command execution tracking
- [ ] Add terminal output capture
- [ ] Create command lifecycle monitoring
- [ ] Implement progress tracking
- [ ] Add completion detection

### Phase 6: IDE Integration
- [ ] Add status bar integration
- [ ] Create command palette commands
- [ ] Implement settings and configuration
- [ ] Add notifications and alerts
- [ ] Create extension UI components

### Phase 7: Security Implementation
- [ ] Implement extension authentication
- [ ] Add secure token management
- [ ] Implement message validation
- [ ] Add connection encryption
- [ ] Create security audit logging

### Phase 8: Backend Integration
- [ ] Create ExtensionBridgeService on backend
- [ ] Implement extension authentication endpoints
- [ ] Add WebSocket message routing
- [ ] Create extension status monitoring
- [ ] Test backend-extension communication

### Phase 9: Testing & Documentation
- [ ] Write comprehensive unit tests
- [ ] Create integration tests
- [ ] Test extension in different environments
- [ ] Create user documentation
- [ ] Write developer documentation

### Phase 10: Deployment & Validation
- [ ] Package extension for distribution
- [ ] Test extension installation
- [ ] Validate security measures
- [ ] Deploy to extension marketplace
- [ ] Monitor extension usage

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with TypeScript rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes
- **Error Handling**: Try-catch with specific error types, graceful degradation
- **Logging**: VS Code output channel logging, structured logging
- **Testing**: Jest with 85% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates
- **Security**: Input validation, secure token handling, message sanitization

## 6. Security Considerations
- [ ] Extension authentication with JWT tokens
- [ ] Secure WebSocket connection (WSS)
- [ ] Message validation and sanitization
- [ ] Token storage security
- [ ] Connection encryption
- [ ] Rate limiting for extension requests
- [ ] Input validation for all commands
- [ ] Secure configuration storage
- [ ] Audit logging for security events

## 7. Performance Requirements
- **Response Time**: < 50ms for command status updates
- **Throughput**: 100+ concurrent extension connections
- **Memory Usage**: < 30MB for extension
- **Database Queries**: N/A (extension only)
- **Caching Strategy**: Connection state caching, message buffering

## 8. Testing Strategy

### Unit Tests:
- [ ] Test file: `extension/src/__tests__/WebSocketClient.test.ts`
- [ ] Test cases: Connection management, message handling, error scenarios
- [ ] Mock requirements: WebSocket, VS Code API

### Integration Tests:
- [ ] Test file: `extension/src/__tests__/CommandMonitor.test.ts`
- [ ] Test scenarios: Full command lifecycle, terminal monitoring
- [ ] Test data: Mock terminal output, command responses

### E2E Tests:
- [ ] Test file: `extension/src/__tests__/ExtensionE2E.test.ts`
- [ ] User flows: Extension installation, connection, command monitoring
- [ ] Environment compatibility: Windows, macOS, Linux

## 9. Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for all extension methods
- [ ] README updates for extension
- [ ] API documentation for WebSocket events
- [ ] Architecture diagrams for extension flow

### User Documentation:
- [ ] Extension installation guide
- [ ] Configuration guide
- [ ] Troubleshooting guide
- [ ] Security best practices

## 10. Deployment Checklist

### Pre-deployment:
- [ ] All extension tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] Extension packaging tested

### Deployment:
- [ ] Extension packaged and signed
- [ ] Backend extension endpoints deployed
- [ ] WebSocket server configured
- [ ] Authentication system active
- [ ] Monitoring systems active

### Post-deployment:
- [ ] Monitor extension installations
- [ ] Verify WebSocket connections
- [ ] Test command monitoring
- [ ] Collect user feedback

## 11. Rollback Plan
- [ ] Extension uninstall procedure
- [ ] Backend extension endpoints rollback
- [ ] WebSocket configuration rollback
- [ ] Communication plan for users

## 12. Success Criteria
- [ ] Extension successfully connects to backend
- [ ] Command monitoring works in real-time
- [ ] Terminal output captured accurately
- [ ] Status updates displayed in IDE
- [ ] 85% test coverage achieved
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Extension installs without issues

## 13. Risk Assessment

### High Risk:
- [ ] Extension compatibility issues - Implement fallback mechanisms
- [ ] WebSocket connection failures - Add robust reconnection logic
- [ ] Security vulnerabilities - Implement comprehensive security measures

### Medium Risk:
- [ ] Performance impact on IDE - Optimize extension performance
- [ ] User adoption issues - Provide clear documentation and support

### Low Risk:
- [ ] Minor UI issues - Add error boundaries and graceful degradation

## 14. References & Resources
- **Technical Documentation**: [VS Code Extension API](https://code.visualstudio.com/api)
- **API References**: [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- **Design Patterns**: Extension Pattern, Bridge Pattern, Event-Driven Architecture
- **Best Practices**: [VS Code Extension Best Practices](https://code.visualstudio.com/api/extension-guides/webview)
- **Similar Implementations**: Existing WebSocketManager.js, AuthMiddleware.js

## 15. Extension Architecture

### Extension Structure:
```
extension/
├── package.json                 # Extension manifest
├── src/
│   ├── extension.ts            # Main entry point
│   ├── websocket/
│   │   ├── WebSocketClient.ts  # WebSocket communication
│   │   └── MessageHandler.ts   # Message processing
│   ├── services/
│   │   ├── CommandMonitor.ts   # Command monitoring
│   │   ├── TerminalMonitor.ts  # Terminal capture
│   │   └── StatusBarManager.ts # Status bar integration
│   ├── commands/
│   │   ├── ConnectCommand.ts   # Connection commands
│   │   └── MonitorCommand.ts   # Monitoring commands
│   ├── utils/
│   │   ├── Configuration.ts    # Configuration management
│   │   └── Logger.ts           # Logging utilities
│   └── types/
│       └── index.ts            # TypeScript definitions
├── webpack.config.js           # Build configuration
├── .vscodeignore               # Ignore file
└── README.md                   # Documentation
```

### Extension Manifest:
```json
{
  "name": "pidea-connector",
  "displayName": "PIDEA Connector",
  "description": "Connect Cursor IDE to PIDEA backend for real-time command monitoring",
  "version": "0.0.1",
  "publisher": "pidea",
  "engines": {
    "vscode": "^1.60.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "pidea.connect",
        "title": "Connect to PIDEA",
        "category": "PIDEA"
      },
      {
        "command": "pidea.disconnect",
        "title": "Disconnect from PIDEA",
        "category": "PIDEA"
      },
      {
        "command": "pidea.monitor",
        "title": "Start Command Monitoring",
        "category": "PIDEA"
      },
      {
        "command": "pidea.status",
        "title": "Show PIDEA Status",
        "category": "PIDEA"
      }
    ],
    "configuration": {
      "title": "PIDEA Connector",
      "properties": {
        "pidea.backendUrl": {
          "type": "string",
          "default": "ws://localhost:8000/ws",
          "description": "PIDEA backend WebSocket URL"
        },
        "pidea.autoConnect": {
          "type": "boolean",
          "default": false,
          "description": "Automatically connect on startup"
        },
        "pidea.autoMonitor": {
          "type": "boolean",
          "default": true,
          "description": "Automatically start command monitoring"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "test": "jest",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/vscode": "^1.60.0",
    "@types/node": "^16.0.0",
    "typescript": "^4.5.0",
    "jest": "^27.0.0",
    "@types/jest": "^27.0.0",
    "vsce": "^2.0.0"
  }
}
```

## 16. Monorepo Integration

### Root Package.json Scripts:
```json
{
  "scripts": {
    "extension:dev": "cd extension && npm run watch",
    "extension:build": "cd extension && npm run compile",
    "extension:test": "cd extension && npm test",
    "extension:package": "cd extension && npm run package",
    "extension:install": "cd extension && code --install-extension pidea-connector-0.0.1.vsix",
    "extension:uninstall": "code --uninstall-extension pidea-connector",
    "extension:clean": "cd extension && rm -rf out node_modules package-lock.json",
    "extension:setup": "cd extension && npm install && npm run compile",
    "dev:full": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\" \"npm run extension:dev\"",
    "test:full": "npm run test:backend && npm run test:frontend && npm run extension:test",
    "build:full": "npm run build:backend && npm run build:frontend && npm run extension:build"
  },
  "devDependencies": {
    "concurrently": "^7.0.0"
  }
}
```

### Docker Integration:
```yaml
# docker-compose.yml additions
services:
  extension-dev:
    build:
      context: ./extension
      dockerfile: Dockerfile.dev
    volumes:
      - ./extension:/workspace
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - NODE_ENV=development
    ports:
      - "3000:3000"
    depends_on:
      - backend
      - frontend
    command: npm run extension:dev

  extension-test:
    build:
      context: ./extension
      dockerfile: Dockerfile.test
    volumes:
      - ./extension:/workspace
    environment:
      - NODE_ENV=test
    command: npm run extension:test
```

### Extension Development Dockerfile:
```dockerfile
# extension/Dockerfile.dev
FROM node:16-alpine

WORKDIR /workspace

# Install VS Code CLI
RUN npm install -g @vscode/vsce

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "extension:dev"]
```

## 17. Backend Extension Services

### ExtensionBridgeService:
```javascript
// backend/domain/services/ExtensionBridgeService.js
class ExtensionBridgeService {
  constructor(websocketManager, extensionSessionRepository) {
    this.websocketManager = websocketManager;
    this.extensionSessionRepository = extensionSessionRepository;
    this.activeConnections = new Map();
  }

  async handleExtensionConnection(socket, token) {
    try {
      // Validate extension token
      const session = await this.validateExtensionToken(token);
      if (!session) {
        throw new Error('Invalid extension token');
      }

      // Store connection
      this.activeConnections.set(session.id, {
        socket,
        session,
        connectedAt: new Date()
      });

      // Send connection confirmation
      socket.send(JSON.stringify({
        type: 'authenticated',
        data: { sessionId: session.id },
        timestamp: Date.now()
      }));

      // Set up message handlers
      socket.on('message', (data) => {
        this.handleExtensionMessage(session.id, JSON.parse(data));
      });

      socket.on('close', () => {
        this.handleExtensionDisconnect(session.id);
      });

    } catch (error) {
      socket.send(JSON.stringify({
        type: 'error',
        data: { message: error.message },
        timestamp: Date.now()
      }));
      socket.close();
    }
  }

  async handleExtensionMessage(sessionId, message) {
    const connection = this.activeConnections.get(sessionId);
    if (!connection) {
      return;
    }

    switch (message.type) {
      case 'command-started':
        await this.handleCommandStarted(sessionId, message.data);
        break;
      case 'command-completed':
        await this.handleCommandCompleted(sessionId, message.data);
        break;
      case 'terminal-output':
        await this.handleTerminalOutput(sessionId, message.data);
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  async handleCommandStarted(sessionId, data) {
    // Notify backend systems about command start
    await this.websocketManager.broadcastToClients({
      type: 'extension-command-started',
      data: { ...data, sessionId },
      timestamp: Date.now()
    });
  }

  async handleCommandCompleted(sessionId, data) {
    // Notify backend systems about command completion
    await this.websocketManager.broadcastToClients({
      type: 'extension-command-completed',
      data: { ...data, sessionId },
      timestamp: Date.now()
    });
  }

  async handleTerminalOutput(sessionId, data) {
    // Process terminal output
    await this.websocketManager.broadcastToClients({
      type: 'extension-terminal-output',
      data: { ...data, sessionId },
      timestamp: Date.now()
    });
  }

  async handleExtensionDisconnect(sessionId) {
    this.activeConnections.delete(sessionId);
    await this.extensionSessionRepository.removeSession(sessionId);
  }

  async validateExtensionToken(token) {
    // Validate extension JWT token
    // Implementation depends on your auth system
    return await this.extensionSessionRepository.validateToken(token);
  }

  getActiveConnections() {
    return Array.from(this.activeConnections.values());
  }
}

module.exports = ExtensionBridgeService;
```

### ExtensionController:
```javascript
// backend/presentation/api/ExtensionController.js
const ExtensionBridgeService = require('../../domain/services/ExtensionBridgeService');

class ExtensionController {
  constructor(extensionBridgeService) {
    this.extensionBridgeService = extensionBridgeService;
  }

  async getExtensionStatus(req, res) {
    try {
      const connections = this.extensionBridgeService.getActiveConnections();
      res.json({
        status: 'success',
        data: {
          activeConnections: connections.length,
          connections: connections.map(conn => ({
            sessionId: conn.session.id,
            connectedAt: conn.connectedAt,
            status: 'active'
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async generateExtensionToken(req, res) {
    try {
      // Generate new extension token
      const token = await this.extensionBridgeService.generateToken();
      res.json({
        status: 'success',
        data: { token }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async revokeExtensionToken(req, res) {
    try {
      const { token } = req.body;
      await this.extensionBridgeService.revokeToken(token);
      res.json({
        status: 'success',
        message: 'Token revoked successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = ExtensionController;
```

## 18. WebSocket Communication Protocol

### Message Types:
```typescript
interface PIDEAExtensionMessage {
  type: 'connect' | 'disconnect' | 'command-status' | 'terminal-output' | 'error';
  data: any;
  timestamp: number;
  sessionId?: string;
}

interface CommandStatusMessage {
  commandId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  output?: string;
  error?: string;
}

interface TerminalOutputMessage {
  output: string;
  commandId?: string;
  timestamp: number;
}
```

### Connection Flow:
```typescript
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(url: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        // Send authentication
        this.send({
          type: 'authenticate',
          data: { token },
          timestamp: Date.now()
        });
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error) => {
        reject(error);
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };
    });
  }

  private handleMessage(message: PIDEAExtensionMessage): void {
    switch (message.type) {
      case 'authenticated':
        vscode.window.showInformationMessage('Connected to PIDEA backend');
        break;
      case 'command-status':
        this.updateCommandStatus(message.data);
        break;
      case 'error':
        vscode.window.showErrorMessage(`PIDEA Error: ${message.data.message}`);
        break;
    }
  }
}
```

## 19. Command Monitoring Implementation

### Terminal Output Capture:
```typescript
class TerminalMonitor {
  private disposables: vscode.Disposable[] = [];

  startMonitoring(): void {
    // Monitor active terminal
    const terminal = vscode.window.activeTerminal;
    if (terminal) {
      this.monitorTerminal(terminal);
    }

    // Monitor terminal changes
    vscode.window.onDidChangeActiveTerminal((terminal) => {
      if (terminal) {
        this.monitorTerminal(terminal);
      }
    });
  }

  private monitorTerminal(terminal: vscode.Terminal): void {
    // Note: VS Code API doesn't provide direct terminal output access
    // We'll use command execution tracking instead
    this.trackCommandExecution(terminal);
  }

  private trackCommandExecution(terminal: vscode.Terminal): void {
    // Track when commands are executed
    vscode.commands.registerCommand('workbench.action.terminal.sendSequence', (text: string) => {
      if (text.includes('VibeCoderRefactorCommand')) {
        this.notifyCommandStarted(text);
      }
    });
  }

  private notifyCommandStarted(command: string): void {
    // Send command start notification to backend
    this.websocketClient.send({
      type: 'command-started',
      data: { command, timestamp: Date.now() },
      timestamp: Date.now()
    });
  }
}
```

## 20. Status Bar Integration

### Status Bar Manager:
```typescript
class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'pidea.status';
  }

  updateStatus(status: 'connected' | 'disconnected' | 'monitoring' | 'error'): void {
    switch (status) {
      case 'connected':
        this.statusBarItem.text = '$(check) PIDEA';
        this.statusBarItem.tooltip = 'Connected to PIDEA backend';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        break;
      case 'disconnected':
        this.statusBarItem.text = '$(x) PIDEA';
        this.statusBarItem.tooltip = 'Disconnected from PIDEA backend';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
      case 'monitoring':
        this.statusBarItem.text = '$(sync~spin) PIDEA';
        this.statusBarItem.tooltip = 'Monitoring commands...';
        break;
      case 'error':
        this.statusBarItem.text = '$(error) PIDEA';
        this.statusBarItem.tooltip = 'PIDEA connection error';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
    }
    this.statusBarItem.show();
  }
}
```

## 21. Security Implementation

### Token Management:
```typescript
class SecurityManager {
  private readonly secretStorage = vscode.SecretStorage;

  async storeToken(token: string): Promise<void> {
    await this.secretStorage.store('pidea-token', token);
  }

  async getToken(): Promise<string | undefined> {
    return await this.secretStorage.get('pidea-token');
  }

  async clearToken(): Promise<void> {
    await this.secretStorage.delete('pidea-token');
  }

  validateMessage(message: any): boolean {
    // Validate message structure and content
    if (!message || typeof message !== 'object') {
      return false;
    }

    if (!message.type || !message.data || !message.timestamp) {
      return false;
    }

    // Prevent injection attacks
    const sanitized = this.sanitizeMessage(message);
    return sanitized !== null;
  }

  private sanitizeMessage(message: any): any {
    // Sanitize message content
    const sanitized = JSON.parse(JSON.stringify(message));
    
    // Remove potentially dangerous content
    if (typeof sanitized.data === 'string') {
      sanitized.data = sanitized.data.replace(/[<>]/g, '');
    }

    return sanitized;
  }
}
```

## 22. Testing Implementation

### Extension Tests:
```typescript
// extension/src/__tests__/WebSocketClient.test.ts
describe('WebSocketClient', () => {
  let client: WebSocketClient;
  let mockWebSocket: any;

  beforeEach(() => {
    client = new WebSocketClient();
    mockWebSocket = {
      onopen: jest.fn(),
      onmessage: jest.fn(),
      onerror: jest.fn(),
      onclose: jest.fn(),
      send: jest.fn(),
      close: jest.fn()
    };
  });

  test('should connect successfully', async () => {
    const connectPromise = client.connect('ws://localhost:8000', 'test-token');
    
    // Simulate successful connection
    mockWebSocket.onopen();
    
    await expect(connectPromise).resolves.toBeUndefined();
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'authenticate',
        data: { token: 'test-token' },
        timestamp: expect.any(Number)
      })
    );
  });

  test('should handle connection errors', async () => {
    const connectPromise = client.connect('ws://localhost:8000', 'test-token');
    
    // Simulate connection error
    mockWebSocket.onerror(new Error('Connection failed'));
    
    await expect(connectPromise).rejects.toThrow('Connection failed');
  });
});
```

## 23. Development Workflow

### Development Scripts:
```bash
#!/bin/bash
# scripts/extension-dev.sh

echo "Starting PIDEA Extension Development Environment..."

# Check if extension directory exists
if [ ! -d "extension" ]; then
    echo "Creating extension directory..."
    mkdir -p extension
    cd extension
    
    # Initialize extension project
    npm init -y
    npm install --save-dev @types/vscode @types/node typescript jest @types/jest vsce
    npm install --save-dev webpack webpack-cli ts-loader
    
    # Create TypeScript config
    cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
EOF
    
    cd ..
fi

# Install dependencies
echo "Installing extension dependencies..."
cd extension && npm install && cd ..

# Start development servers
echo "Starting development servers..."
concurrently \
  "npm run dev:backend" \
  "npm run dev:frontend" \
  "cd extension && npm run watch" \
  --names "backend,frontend,extension" \
  --prefix-colors "blue,green,yellow"
```

### Build Script:
```bash
#!/bin/bash
# scripts/extension-build.sh

echo "Building PIDEA Extension..."

# Build extension
cd extension
npm run compile

# Run tests
npm test

# Package extension
npm run package

echo "Extension built successfully!"
echo "Package: extension/pidea-connector-0.0.1.vsix"
```

### Test Script:
```bash
#!/bin/bash
# scripts/extension-test.sh

echo "Running PIDEA Extension Tests..."

cd extension

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

echo "All tests completed!"
```

## 24. Deployment Integration

### CI/CD Pipeline:
```yaml
# .github/workflows/extension.yml
name: Extension CI/CD

on:
  push:
    branches: [main]
    paths: ['extension/**']
  pull_request:
    branches: [main]
    paths: ['extension/**']

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
        cache: 'npm'
        cache-dependency-path: extension/package-lock.json
    
    - name: Install dependencies
      run: |
        cd extension
        npm ci
    
    - name: Run tests
      run: |
        cd extension
        npm test
    
    - name: Build extension
      run: |
        cd extension
        npm run compile
    
    - name: Package extension
      run: |
        cd extension
        npm run package
    
    - name: Upload artifact
      uses: actions/upload-artifact@v3
      with:
        name: extension-package
        path: extension/pidea-connector-*.vsix

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Download artifact
      uses: actions/download-artifact@v3
      with:
        name: extension-package
    
    - name: Publish to VS Code Marketplace
      run: |
        # Publish extension to marketplace
        # This requires marketplace publisher token
        echo "Publishing extension..."
```

## 25. Monitoring & Analytics

### Extension Metrics:
```typescript
class ExtensionMetrics {
  private metrics = {
    connections: 0,
    commandsMonitored: 0,
    errors: 0,
    uptime: 0
  };

  trackConnection(): void {
    this.metrics.connections++;
    this.sendMetrics();
  }

  trackCommand(): void {
    this.metrics.commandsMonitored++;
    this.sendMetrics();
  }

  trackError(): void {
    this.metrics.errors++;
    this.sendMetrics();
  }

  private sendMetrics(): void {
    // Send metrics to backend
    this.websocketClient.send({
      type: 'metrics',
      data: this.metrics,
      timestamp: Date.now()
    });
  }
}
```

## 26. Troubleshooting Guide

### Common Issues:
1. **Extension won't connect**: Check backend URL and token
2. **Commands not monitored**: Verify command patterns and permissions
3. **Performance issues**: Check WebSocket connection and message frequency
4. **Security errors**: Validate token and connection encryption

### Debug Commands:
```bash
# Enable extension debugging
code --enable-proposed-api pidea-connector

# View extension logs
code --log-level debug

# Reset extension settings
code --disable-extensions pidea-connector
code --enable-extensions pidea-connector
```

This comprehensive plan now includes all necessary monorepo integration details, backend services, Docker configuration, development workflow, CI/CD pipeline, and deployment procedures for direct implementation.
