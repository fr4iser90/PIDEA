# Core Command Monitoring System Implementation

## 1. Project Overview
- **Feature/Component Name**: Core Command Monitoring System
- **Priority**: Critical
- **Estimated Time**: 1-2 weeks
- **Dependencies**: Existing FileBasedWorkspaceDetector, WebSocket system, IDE Extension (optional)
- **Related Issues**: VibeCoderRefactorCommand completion detection, real-time status monitoring, file security

## 2. Technical Requirements
- **Tech Stack**: Node.js, WebSocket, EventEmitter, Jest, File System Monitoring, Crypto (for encryption)
- **Architecture Pattern**: Event-Driven Architecture, Observer Pattern, File-Based Monitoring, Security-First Design
- **Database Changes**: None (file-based state management in /tmp/IDEWEB/)
- **API Changes**: New WebSocket events for command status
- **Frontend Changes**: Real-time status display components
- **Backend Changes**: File-based command monitoring service, enhanced terminal monitoring, encryption service

## 3. File Impact Analysis

### Files to Modify:
- [ ] `backend/domain/services/workspace/FileBasedWorkspaceDetector.js` - Add command monitoring capabilities
- [ ] `backend/domain/services/TaskMonitoringService.js` - Integrate with file-based monitoring
- [ ] `backend/presentation/websocket/WebSocketManager.js` - Add command status events
- [ ] `backend/presentation/api/IDEController.js` - Add command status endpoints
- [ ] `frontend/src/infrastructure/services/WebSocketService.jsx` - Handle command status events
- [ ] `frontend/src/presentation/components/ChatComponent.jsx` - Display command status

### Files to Create:
- [ ] `backend/domain/services/FileBasedCommandMonitor.js` - Core file-based monitoring logic
- [ ] `backend/domain/services/CommandStatusTracker.js` - Real-time status tracking
- [ ] `backend/infrastructure/events/CommandEvents.js` - Command-related event definitions
- [ ] `backend/domain/services/CommandOutputParser.js` - Parse command output from files
- [ ] `backend/infrastructure/security/FileEncryptionService.js` - File encryption/decryption
- [ ] `backend/infrastructure/security/FilePermissionManager.js` - Secure file permissions
- [ ] `backend/domain/services/ExtensionBridgeService.js` - IDE Extension communication
- [ ] `backend/tests/unit/domain/services/FileBasedCommandMonitor.test.js` - Unit tests
- [ ] `backend/tests/integration/CommandMonitoring.test.js` - Integration tests
- [ ] `backend/tests/unit/infrastructure/security/FileEncryptionService.test.js` - Security tests

### Files to Delete:
- [ ] None

## 4. Implementation Phases

### Phase 1: Foundation Setup
- [ ] Create FileBasedCommandMonitor service structure
- [ ] Set up file monitoring system for /tmp/IDEWEB/{port}/
- [ ] Configure WebSocket event handlers
- [ ] Create initial test framework
- [ ] Set up FileEncryptionService and FilePermissionManager

### Phase 2: Core Implementation
- [ ] Implement VibeCoderRefactorCommand file-based execution
- [ ] Add real-time file monitoring with fs.watch
- [ ] Implement progress tracking via status files
- [ ] Add error detection patterns in output files
- [ ] Implement file encryption for sensitive data

### Phase 3: Security Implementation
- [ ] Implement secure file permissions (chmod 600/700)
- [ ] Add file encryption for command output
- [ ] Implement auto-cleanup mechanisms
- [ ] Add path validation and traversal prevention
- [ ] Implement secure key management

### Phase 4: Extension Integration
- [ ] Create ExtensionBridgeService for WebSocket communication
- [ ] Implement fallback mechanism (file-based vs extension)
- [ ] Add extension detection and status reporting
- [ ] Test extension integration

### Phase 5: Integration
- [ ] Connect with existing FileBasedWorkspaceDetector
- [ ] Integrate with WebSocket system
- [ ] Update frontend status display
- [ ] Test integration points

### Phase 6: Testing & Documentation
- [ ] Write comprehensive unit tests
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] Create monitoring guide

### Phase 7: Deployment & Validation
- [ ] Deploy to development environment
- [ ] Perform end-to-end testing
- [ ] Fix any issues
- [ ] Deploy to staging

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with Airbnb config, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes
- **Error Handling**: Try-catch with specific error types, graceful degradation
- **Logging**: Winston logger with structured logging, different levels
- **Testing**: Jest with 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates
- **Security**: Input validation, path sanitization, encryption for sensitive data

## 6. Security Considerations
- [ ] File system access validation
- [ ] Command execution authorization
- [ ] Input sanitization for command parameters
- [ ] Rate limiting for status updates
- [ ] Secure file path handling
- [ ] Access control for monitoring data
- [ ] File encryption for sensitive output
- [ ] Secure file permissions (600/700)
- [ ] Auto-cleanup of temporary files
- [ ] Path traversal prevention
- [ ] Secure key management
- [ ] Extension authentication

## 7. Performance Requirements
- **Response Time**: < 100ms for status updates
- **Throughput**: 1000+ concurrent command monitoring
- **Memory Usage**: < 50MB for monitoring system
- **Database Queries**: N/A (file-based)
- **Caching Strategy**: Command status cached for 5 minutes
- **Encryption Overhead**: < 10ms per file operation

## 8. Testing Strategy

### Unit Tests:
- [ ] Test file: `backend/tests/unit/domain/services/FileBasedCommandMonitor.test.js`
- [ ] Test cases: Command start, progress updates, completion detection, error handling
- [ ] Mock requirements: File system, WebSocket, EventEmitter

### Security Tests:
- [ ] Test file: `backend/tests/unit/infrastructure/security/FileEncryptionService.test.js`
- [ ] Test cases: File encryption/decryption, key management, permission validation
- [ ] Mock requirements: Crypto, File system, Permission system

### Integration Tests:
- [ ] Test file: `backend/tests/integration/CommandMonitoring.test.js`
- [ ] Test scenarios: Full command lifecycle, file monitoring, WebSocket communication
- [ ] Test data: Mock command output files, status files

### E2E Tests:
- [ ] Test file: `backend/tests/e2e/CommandMonitoringE2E.test.js`
- [ ] User flows: Start command, monitor progress, receive completion notification
- [ ] Browser compatibility: Chrome, Firefox

## 9. Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for FileBasedCommandMonitor methods
- [ ] README updates for monitoring system
- [ ] API documentation for WebSocket events
- [ ] Architecture diagrams for file monitoring flow
- [ ] Security documentation for file encryption

### User Documentation:
- [ ] Command monitoring user guide
- [ ] Troubleshooting guide for monitoring issues
- [ ] Performance optimization guide
- [ ] Security best practices guide

## 10. Deployment Checklist

### Pre-deployment:
- [ ] All unit and integration tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] File encryption tested
- [ ] Extension integration tested

### Deployment:
- [ ] Environment variables configured
- [ ] WebSocket service restarted
- [ ] Monitoring service deployed
- [ ] Health checks passing
- [ ] Frontend updated
- [ ] File permissions configured
- [ ] Encryption keys deployed

### Post-deployment:
- [ ] Monitor WebSocket connections
- [ ] Verify command status updates
- [ ] Performance monitoring active
- [ ] User feedback collection
- [ ] Security monitoring active

## 11. Rollback Plan
- [ ] WebSocket service rollback procedure
- [ ] Frontend component rollback
- [ ] File system cleanup procedure
- [ ] Communication plan for users
- [ ] Encryption key rollback procedure

## 12. Success Criteria
- [ ] VibeCoderRefactorCommand completion detected within 5 seconds
- [ ] Real-time status updates working via file monitoring
- [ ] WebSocket events properly transmitted
- [ ] Frontend displays command status correctly
- [ ] 90% test coverage achieved
- [ ] Performance requirements met
- [ ] No memory leaks detected
- [ ] File encryption working correctly
- [ ] Secure file permissions enforced
- [ ] Extension integration functional (if available)

## 13. Risk Assessment

### High Risk:
- [ ] File system permission issues - Implement proper error handling and fallback
- [ ] Command detection false positives - Add multiple validation layers
- [ ] Encryption key compromise - Implement secure key rotation
- [ ] Extension security vulnerabilities - Implement strict authentication

### Medium Risk:
- [ ] Performance degradation with many commands - Implement file cleanup and monitoring limits
- [ ] Frontend status display issues - Add fallback UI states
- [ ] File corruption during encryption - Implement backup and recovery

### Low Risk:
- [ ] Minor UI glitches - Add error boundaries and graceful degradation
- [ ] Extension compatibility issues - Implement fallback to file-based monitoring

## 14. References & Resources
- **Technical Documentation**: [Node.js File System](https://nodejs.org/api/fs.html)
- **API References**: [Node.js EventEmitter](https://nodejs.org/api/events.html)
- **Design Patterns**: Observer Pattern, Event-Driven Architecture, File-Based Monitoring
- **Best Practices**: [File System Best Practices](https://nodejs.org/en/docs/guides/working-with-different-filesystems/)
- **Similar Implementations**: Existing FileBasedWorkspaceDetector.js, WebSocketManager.js

## 15. File-Based Monitoring Strategy

### Command Execution Pattern:
```javascript
// Execute command with output redirection
const command = `VibeCoderRefactorCommand > /tmp/IDEWEB/${port}/vibecoder-output.txt 2>&1 & echo $! > /tmp/IDEWEB/${port}/vibecoder-pid.txt`;

// Monitor these files:
// /tmp/IDEWEB/{port}/vibecoder-status.txt     (running/completed/failed)
// /tmp/IDEWEB/{port}/vibecoder-progress.txt   (progress updates)
// /tmp/IDEWEB/{port}/vibecoder-output.txt     (full output)
// /tmp/IDEWEB/{port}/vibecoder-pid.txt        (process ID)
```

### File Monitoring Approach:
```javascript
// Use fs.watch for real-time file monitoring
fs.watch(`/tmp/IDEWEB/${port}/`, (eventType, filename) => {
  if (filename === 'vibecoder-status.txt') {
    // Status changed - emit WebSocket event
  }
});
```

### Completion Detection:
```javascript
// Check for completion patterns in output file
const output = fs.readFileSync(`/tmp/IDEWEB/${port}/vibecoder-output.txt`, 'utf8');
const isCompleted = output.includes('Refactoring completed') || 
                   output.includes('Task finished') ||
                   !fs.existsSync(`/tmp/IDEWEB/${port}/vibecoder-pid.txt`);
```

## 16. File Security Implementation

### Secure File Structure:
```javascript
// Secure directory structure
/tmp/IDEWEB/{port}/
├── secure/                           # Encrypted files (chmod 700)
│   ├── vibecoder-output.enc         # Encrypted command output
│   ├── vibecoder-status.enc         # Encrypted status
│   └── vibecoder-progress.enc       # Encrypted progress
├── public/                          # Public files (chmod 644)
│   ├── vibecoder-pid.txt            # Process ID (non-sensitive)
│   └── vibecoder-meta.json          # Metadata (non-sensitive)
└── keys/                            # Encryption keys (chmod 600)
    └── session-{sessionId}.key      # Session-specific keys
```

### File Encryption Service:
```javascript
class FileEncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.keyLength = 32;
  }

  async encryptFile(inputPath, outputPath, key) {
    const crypto = require('crypto');
    const fs = require('fs');
    
    const input = fs.readFileSync(inputPath);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, key);
    
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    const result = Buffer.concat([iv, encrypted]);
    
    fs.writeFileSync(outputPath, result);
  }

  async decryptFile(inputPath, outputPath, key) {
    const crypto = require('crypto');
    const fs = require('fs');
    
    const input = fs.readFileSync(inputPath);
    const iv = input.slice(0, 16);
    const encrypted = input.slice(16);
    
    const decipher = crypto.createDecipher(this.algorithm, key);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    fs.writeFileSync(outputPath, decrypted);
  }
}
```

### File Permission Manager:
```javascript
class FilePermissionManager {
  async setSecurePermissions(path, type = 'file') {
    const fs = require('fs');
    
    if (type === 'directory') {
      await fs.chmod(path, 0o700); // Owner read/write/execute only
    } else {
      await fs.chmod(path, 0o600); // Owner read/write only
    }
  }

  async createSecureDirectory(path) {
    const fs = require('fs');
    
    await fs.mkdir(path, { recursive: true });
    await this.setSecurePermissions(path, 'directory');
  }

  validatePath(path) {
    // Prevent directory traversal
    const normalized = require('path').normalize(path);
    if (normalized.includes('..') || normalized.includes('~')) {
      throw new Error('Path traversal detected');
    }
    return normalized;
  }
}
```

## 17. Extension Integration Strategy

### Extension Detection:
```javascript
class ExtensionBridgeService {
  constructor() {
    this.extensionAvailable = false;
    this.extensionPort = null;
    this.fallbackToFileBased = true;
  }

  async detectExtension() {
    // Try to connect to extension WebSocket
    try {
      const ws = new WebSocket('ws://localhost:3001/extension');
      ws.on('open', () => {
        this.extensionAvailable = true;
        this.extensionPort = 3001;
      });
    } catch (error) {
      this.extensionAvailable = false;
    }
  }

  async sendCommandStatus(status) {
    if (this.extensionAvailable) {
      // Send via extension WebSocket
      await this.sendViaExtension(status);
    } else if (this.fallbackToFileBased) {
      // Fallback to file-based monitoring
      await this.sendViaFileSystem(status);
    }
  }
}
```

### Hybrid Monitoring:
```javascript
class HybridCommandMonitor {
  constructor() {
    this.fileMonitor = new FileBasedCommandMonitor();
    this.extensionBridge = new ExtensionBridgeService();
  }

  async monitorCommand(command) {
    // Try extension first, fallback to file-based
    if (this.extensionBridge.extensionAvailable) {
      return await this.extensionBridge.monitorCommand(command);
    } else {
      return await this.fileMonitor.monitorCommand(command);
    }
  }
}
``` 