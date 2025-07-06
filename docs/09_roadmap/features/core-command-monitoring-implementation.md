# Core Command Monitoring System Implementation (File-Based Polling Only)

## 1. Project Overview
- **Feature/Component Name**: Core Command Monitoring System (File-Based Polling)
- **Priority**: Critical
- **Estimated Time**: 1-2 weeks
- **Dependencies**: Existing FileBasedWorkspaceDetector, REST API, File System
- **Related Issues**: VibeCoderRefactorCommand completion detection, real-time status monitoring, file security

## 2. Technical Requirements
- **Tech Stack**: Node.js, Express (REST API), EventEmitter, Jest, File System Monitoring, Crypto (for encryption)
- **Architecture Pattern**: Polling-Based Monitoring, Observer Pattern, File-Based Monitoring, Security-First Design
- **Database Changes**: None (file-based state management in /tmp/IDEWEB/)
- **API Changes**: New REST endpoints for command status polling
- **Frontend Changes**: Polling-based status display components
- **Backend Changes**: File-based command monitoring service, REST endpoints, encryption service

## 3. File Impact Analysis

### Files to Modify:
- [x] `backend/domain/services/workspace/FileBasedWorkspaceDetector.js` - Add command monitoring capabilities
- [x] `backend/domain/services/TaskMonitoringService.js` - Integrate with file-based monitoring
- [x] `backend/presentation/api/IDEController.js` - Add REST endpoints for command status polling
- [ ] `frontend/src/presentation/components/ChatComponent.jsx` - Display command status (polling)

### Files to Create:
- [ ] `backend/domain/services/FileBasedCommandMonitor.js` - Core file-based monitoring logic
- [ ] `backend/domain/services/CommandStatusTracker.js` - Real-time status tracking
- [ ] `backend/domain/services/CommandOutputParser.js` - Parse command output from files
- [ ] `backend/infrastructure/security/FileEncryptionService.js` - File encryption/decryption
- [ ] `backend/infrastructure/security/FilePermissionManager.js` - Secure file permissions
- [ ] `backend/tests/unit/domain/services/FileBasedCommandMonitor.test.js` - Unit tests
- [ ] `backend/tests/integration/CommandMonitoring.test.js` - Integration tests
- [ ] `backend/tests/unit/infrastructure/security/FileEncryptionService.test.js` - Security tests

### Files to Delete:
- [ ] Remove all WebSocket and Extension-related monitoring code

## 4. Implementation Phases

### Phase 1: Foundation Setup
- [x] Create FileBasedCommandMonitor service structure
- [x] Set up file polling system for /tmp/IDEWEB/{port}/
- [x] Create initial test framework
- [x] Set up FileEncryptionService and FilePermissionManager

### Phase 2: Core Implementation
- [ ] Implement VibeCoderRefactorCommand file-based execution
- [ ] Add polling-based file monitoring (setInterval or similar)
- [ ] Implement progress tracking via status files
- [ ] Add error detection patterns in output files
- [ ] Implement file encryption for sensitive data

### Phase 3: Security Implementation
- [ ] Implement secure file permissions (chmod 600/700)
- [ ] Add file encryption for command output
- [ ] Implement auto-cleanup mechanisms
- [ ] Add path validation and traversal prevention
- [ ] Implement secure key management

### Phase 4: Integration
- [ ] Connect with existing FileBasedWorkspaceDetector
- [ ] Update frontend status display to use polling
- [ ] Test integration points

### Phase 5: Testing & Documentation
- [ ] Write comprehensive unit tests
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] Create monitoring guide

### Phase 6: Deployment & Validation
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
- [ ] Rate limiting for status polling
- [ ] Secure file path handling
- [ ] Access control for monitoring data
- [ ] File encryption for sensitive output
- [ ] Secure file permissions (600/700)
- [ ] Auto-cleanup of temporary files
- [ ] Path traversal prevention
- [ ] Secure key management

## 7. Performance Requirements
- **Response Time**: < 100ms for status polling
- **Throughput**: 1000+ concurrent command monitoring
- **Memory Usage**: < 50MB for monitoring system
- **Database Queries**: N/A (file-based)
- **Caching Strategy**: Command status cached for 5 minutes
- **Encryption Overhead**: < 10ms per file operation

## 8. Testing Strategy

### Unit Tests:
- [ ] Test file: `backend/tests/unit/domain/services/FileBasedCommandMonitor.test.js`
- [ ] Test cases: Command start, progress updates, completion detection, error handling
- [ ] Mock requirements: File system, REST API, EventEmitter

### Security Tests:
- [ ] Test file: `backend/tests/unit/infrastructure/security/FileEncryptionService.test.js`
- [ ] Test cases: File encryption/decryption, key management, permission validation
- [ ] Mock requirements: Crypto, File system, Permission system

### Integration Tests:
- [ ] Test file: `backend/tests/integration/CommandMonitoring.test.js`
- [ ] Test scenarios: Full command lifecycle, file monitoring, REST API communication
- [ ] Test data: Mock command output files, status files

### E2E Tests:
- [ ] Test file: `backend/tests/e2e/CommandMonitoringE2E.test.js`
- [ ] User flows: Start command, monitor progress, receive completion notification
- [ ] Browser compatibility: Chrome, Firefox

## 9. Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for FileBasedCommandMonitor methods
- [ ] README updates for monitoring system
- [ ] API documentation for REST endpoints
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

### Deployment:
- [ ] Environment variables configured
- [ ] Monitoring service deployed
- [ ] Health checks passing
- [ ] Frontend updated
- [ ] File permissions configured
- [ ] Encryption keys deployed

### Post-deployment:
- [ ] Verify command status polling
- [ ] Performance monitoring active
- [ ] User feedback collection
- [ ] Security monitoring active

## 11. Rollback Plan
- [ ] REST API rollback procedure
- [ ] Frontend component rollback
- [ ] File system cleanup procedure
- [ ] Communication plan for users
- [ ] Encryption key rollback procedure

## 12. Success Criteria
- [ ] VibeCoderRefactorCommand completion detected within 5 seconds
- [ ] Status updates working via file polling
- [ ] REST endpoints properly transmit status
- [ ] Frontend displays command status correctly
- [ ] 90% test coverage achieved
- [ ] Performance requirements met
- [ ] No memory leaks detected
- [ ] File encryption working correctly
- [ ] Secure file permissions enforced

## 13. Risk Assessment

### High Risk:
- [ ] File system permission issues - Implement proper error handling and fallback
- [ ] Command detection false positives - Add multiple validation layers
- [ ] Encryption key compromise - Implement secure key rotation

### Medium Risk:
- [ ] Performance degradation with many commands - Implement file cleanup and monitoring limits
- [ ] Frontend status display issues - Add fallback UI states
- [ ] File corruption during encryption - Implement backup and recovery

### Low Risk:
- [ ] Minor UI glitches - Add error boundaries and graceful degradation

## 14. References & Resources
- **Technical Documentation**: [Node.js File System](https://nodejs.org/api/fs.html)
- **API References**: [Node.js EventEmitter](https://nodejs.org/api/events.html)
- **Design Patterns**: Observer Pattern, Polling-Based Monitoring, File-Based Monitoring
- **Best Practices**: [File System Best Practices](https://nodejs.org/en/docs/guides/working-with-different-filesystems/)
- **Similar Implementations**: Existing FileBasedWorkspaceDetector.js

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

### File Polling Approach:
```javascript
// Use setInterval for polling file status
setInterval(() => {
  // Read status/progress/output files
  // Detect completion/error patterns
}, 2000); // Poll every 2 seconds
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

## 17. Implementation Progress

### Phase 1: Foundation Setup ✅ COMPLETED
- [x] Created FileBasedCommandMonitor service structure
- [x] Set up file polling system for /tmp/IDEWEB/{port}/
- [x] Created initial test framework
- [x] Set up FileEncryptionService and FilePermissionManager

### Phase 2: Core Implementation 🔄 IN PROGRESS
- [ ] Implement VibeCoderRefactorCommand file-based execution
- [ ] Add polling-based file monitoring (setInterval or similar)
- [ ] Implement progress tracking via status files
- [ ] Add error detection patterns in output files
- [ ] Implement file encryption for sensitive data

### Phase 3: Security Implementation ⏳ PENDING
- [ ] Implement secure file permissions (chmod 600/700)
- [ ] Add file encryption for command output
- [ ] Implement auto-cleanup mechanisms
- [ ] Add path validation and traversal prevention
- [ ] Implement secure key management

### Phase 4: Integration ⏳ PENDING
- [ ] Connect with existing FileBasedWorkspaceDetector
- [ ] Update frontend status display to use polling
- [ ] Test integration points

### Phase 5: Testing & Documentation ⏳ PENDING
- [ ] Write comprehensive unit tests
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] Create monitoring guide

### Phase 6: Deployment & Validation ⏳ PENDING
- [ ] Deploy to development environment
- [ ] Perform end-to-end testing
- [ ] Fix any issues
- [ ] Deploy to staging

## 18. Current Status
**Phase 1 Completed** - Foundation setup is complete. Moving to Phase 2: Core Implementation.

**Next Steps:**
1. Create FileBasedCommandMonitor.js with core monitoring logic
2. Create CommandStatusTracker.js for real-time status tracking
3. Create CommandOutputParser.js for parsing command output
4. Create security services (FileEncryptionService.js, FilePermissionManager.js)
5. Update existing services to integrate with new monitoring system 