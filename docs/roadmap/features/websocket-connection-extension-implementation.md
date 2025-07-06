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
- [ ] `backend/domain/services/ExtensionBridgeService.js` - Backend extension bridge
- [ ] `backend/tests/unit/domain/services/ExtensionBridgeService.test.js` - Extension tests

### Files to Delete:
- [ ] None

## 4. Implementation Phases

### Phase 1: Extension Foundation Setup
- [ ] Create VS Code extension project structure
- [ ] Set up TypeScript configuration
- [ ] Configure Webpack for bundling
- [ ] Create basic extension manifest
- [ ] Set up development environment

### Phase 2: WebSocket Communication
- [ ] Implement WebSocket client for backend connection
- [ ] Add connection management and reconnection logic
- [ ] Implement message serialization/deserialization
- [ ] Add error handling and logging
- [ ] Create connection status indicators

### Phase 3: Command Monitoring
- [ ] Implement command execution tracking
- [ ] Add terminal output capture
- [ ] Create command lifecycle monitoring
- [ ] Implement progress tracking
- [ ] Add completion detection

### Phase 4: IDE Integration
- [ ] Add status bar integration
- [ ] Create command palette commands
- [ ] Implement settings and configuration
- [ ] Add notifications and alerts
- [ ] Create extension UI components

### Phase 5: Security Implementation
- [ ] Implement extension authentication
- [ ] Add secure token management
- [ ] Implement message validation
- [ ] Add connection encryption
- [ ] Create security audit logging

### Phase 6: Backend Integration
- [ ] Create ExtensionBridgeService on backend
- [ ] Implement extension authentication endpoints
- [ ] Add WebSocket message routing
- [ ] Create extension status monitoring
- [ ] Test backend-extension communication

### Phase 7: Testing & Documentation
- [ ] Write comprehensive unit tests
- [ ] Create integration tests
- [ ] Test extension in different environments
- [ ] Create user documentation
- [ ] Write developer documentation

### Phase 8: Deployment & Validation
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

## 16. WebSocket Communication Protocol

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

## 17. Command Monitoring Implementation

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

## 18. Status Bar Integration

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

## 19. Security Implementation

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

## 20. Testing Implementation

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
