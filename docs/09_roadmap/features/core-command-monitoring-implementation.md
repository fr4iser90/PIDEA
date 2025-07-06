# Terminal Log Capture & Display System

## 1. Project Overview
- **Feature/Component Name**: Terminal Log Capture & Display System
- **Priority**: Critical
- **Estimated Time**: 1-2 weeks
- **Dependencies**: Playwright, Browser Terminal, REST API, File System, Crypto
- **Related Issues**: Browser terminal output capture, encrypted log storage, real-time log display

## 2. Technical Requirements
- **Tech Stack**: Playwright, Node.js, Express (REST API), Crypto (for encryption), File System
- **Architecture Pattern**: Log Capture, File-Based Storage, Encryption, Polling-Based Display
- **Database Changes**: None (file-based log storage in /tmp/IDEWEB/)
- **API Changes**: New REST endpoints for encrypted log reading
- **Frontend Changes**: Log display components with real-time updates
- **Backend Changes**: Log decryption service, REST endpoints

## 3. File Impact Analysis

### Files to Modify:
- [ ] `backend/presentation/api/IDEController.js` - Add log reading endpoints
- [ ] `frontend/src/presentation/components/ChatComponent.jsx` - Add log display button
- [ ] Playwright scripts - Add terminal log capture

### Files to Create:
- [ ] `backend/domain/services/TerminalLogCaptureService.js` - Core log capture logic
- [ ] `backend/domain/services/TerminalLogReader.js` - Read and decrypt logs
- [ ] `backend/infrastructure/security/LogEncryptionService.js` - Log encryption/decryption
- [ ] `backend/infrastructure/security/LogPermissionManager.js` - Secure log file permissions
- [ ] `backend/tests/unit/domain/services/TerminalLogCaptureService.test.js` - Unit tests
- [ ] `backend/tests/integration/TerminalLogCapture.test.js` - Integration tests
- [ ] `backend/tests/unit/infrastructure/security/LogEncryptionService.test.js` - Security tests

### Files to Delete:
- [ ] Remove all command monitoring related code

## 4. Implementation Phases

### Phase 1: Foundation Setup
- [ ] Create TerminalLogCaptureService structure
- [ ] Set up log file system in /tmp/IDEWEB/{port}/logs/
- [ ] Create initial test framework
- [ ] Set up LogEncryptionService and LogPermissionManager

### Phase 2: Playwright Terminal Capture
- [ ] Implement Playwright script to capture browser terminal output
- [ ] Add output redirection to encrypted log files
- [ ] Implement real-time log writing
- [ ] Add log rotation and cleanup

### Phase 3: Backend Log Reading
- [ ] Implement log file reading and decryption
- [ ] Add REST API endpoints for log access
- [ ] Implement log parsing and formatting
- [ ] Add log search and filtering

### Phase 4: Frontend Integration
- [ ] Create log display components
- [ ] Add real-time log updates
- [ ] Implement log search and navigation
- [ ] Add log export functionality

### Phase 5: Security Implementation
- [ ] Implement secure log file permissions (chmod 600/700)
- [ ] Add log encryption for sensitive data
- [ ] Implement auto-cleanup mechanisms
- [ ] Add path validation and traversal prevention
- [ ] Implement secure key management

### Phase 6: Testing & Documentation
- [ ] Write comprehensive unit tests
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] Create user guide

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with Airbnb config, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes
- **Error Handling**: Try-catch with specific error types, graceful degradation
- **Logging**: Winston logger with structured logging, different levels
- **Testing**: Jest with 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates
- **Security**: Input validation, path sanitization, encryption for sensitive data

## 6. Security Considerations
- [ ] Log file access validation
- [ ] Terminal output sanitization
- [ ] Input sanitization for log parameters
- [ ] Rate limiting for log reading
- [ ] Secure log file path handling
- [ ] Access control for log data
- [ ] Log encryption for sensitive output
- [ ] Secure log file permissions (600/700)
- [ ] Auto-cleanup of old log files
- [ ] Path traversal prevention
- [ ] Secure key management

## 7. Performance Requirements
- **Response Time**: < 100ms for log reading
- **Throughput**: 100+ concurrent log readers
- **Memory Usage**: < 100MB for log system
- **Database Queries**: N/A (file-based)
- **Caching Strategy**: Recent logs cached for 1 minute
- **Encryption Overhead**: < 20ms per log operation

## 8. Testing Strategy

### Unit Tests:
- [ ] Test file: `backend/tests/unit/domain/services/TerminalLogCaptureService.test.js`
- [ ] Test cases: Log capture, encryption, decryption, file operations
- [ ] Mock requirements: File system, Playwright, Crypto

### Security Tests:
- [ ] Test file: `backend/tests/unit/infrastructure/security/LogEncryptionService.test.js`
- [ ] Test cases: Log encryption/decryption, key management, permission validation
- [ ] Mock requirements: Crypto, File system, Permission system

### Integration Tests:
- [ ] Test file: `backend/tests/integration/TerminalLogCapture.test.js`
- [ ] Test scenarios: Full log capture lifecycle, Playwright integration, API communication
- [ ] Test data: Mock terminal output, log files

### E2E Tests:
- [ ] Test file: `backend/tests/e2e/TerminalLogCaptureE2E.test.js`
- [ ] User flows: Start terminal, capture logs, view in frontend
- [ ] Browser compatibility: Chrome, Firefox

## 9. Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for TerminalLogCaptureService methods
- [ ] README updates for log capture system
- [ ] API documentation for REST endpoints
- [ ] Architecture diagrams for log capture flow
- [ ] Security documentation for log encryption

### User Documentation:
- [ ] Terminal log capture user guide
- [ ] Troubleshooting guide for log issues
- [ ] Performance optimization guide
- [ ] Security best practices guide

## 10. Deployment Checklist

### Pre-deployment:
- [ ] All unit and integration tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] Log encryption tested

### Deployment:
- [ ] Environment variables configured
- [ ] Log capture service deployed
- [ ] Health checks passing
- [ ] Frontend updated
- [ ] Log file permissions configured
- [ ] Encryption keys deployed

### Post-deployment:
- [ ] Verify log capture working
- [ ] Performance monitoring active
- [ ] User feedback collection
- [ ] Security monitoring active

## 11. Rollback Plan
- [ ] REST API rollback procedure
- [ ] Frontend component rollback
- [ ] Log file cleanup procedure
- [ ] Communication plan for users
- [ ] Encryption key rollback procedure

## 12. Success Criteria
- [ ] Browser terminal output captured within 1 second
- [ ] Log updates working via file polling
- [ ] REST endpoints properly transmit logs
- [ ] Frontend displays terminal logs correctly
- [ ] 90% test coverage achieved
- [ ] Performance requirements met
- [ ] No memory leaks detected
- [ ] Log encryption working correctly
- [ ] Secure log file permissions enforced

## 13. Risk Assessment

### High Risk:
- [ ] Log file permission issues - Implement proper error handling and fallback
- [ ] Playwright capture failures - Add multiple capture methods
- [ ] Encryption key compromise - Implement secure key rotation

### Medium Risk:
- [ ] Performance degradation with large logs - Implement log rotation and cleanup
- [ ] Frontend log display issues - Add fallback UI states
- [ ] Log corruption during encryption - Implement backup and recovery

### Low Risk:
- [ ] Minor UI glitches - Add error boundaries and graceful degradation

## 14. References & Resources
- **Technical Documentation**: [Node.js File System](https://nodejs.org/api/fs.html)
- **Playwright Documentation**: [Playwright API](https://playwright.dev/docs/api/class-page)
- **Design Patterns**: Observer Pattern, File-Based Logging, Encryption
- **Best Practices**: [File System Best Practices](https://nodejs.org/en/docs/guides/working-with-different-filesystems/)
- **Similar Implementations**: Existing FileBasedWorkspaceDetector.js

## 15. Terminal Log Capture Strategy

### Playwright Terminal Capture Pattern:
```javascript
// 1. PLAYWRIGHT SETUP - Browser starten und Terminal öffnen
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Browser starten
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();


await page.keyboard.down('Control');
await page.keyboard.down('Shift');
await page.keyboard.press('`');
await page.keyboard.up('Shift');
await page.keyboard.up('Control');

// Warten bis Terminal offen ist
await page.waitForTimeout(1000);

// 3. TERMINAL BEFEHLE AUSFÜHREN - Das macht Playwright WIRKLICH!
const port = XXXX; // IDE Port (9222-9231)
const commands = [
  `mkdir -p /tmp/IDEWEB/${port}/logs`,
  `npm run dev > /tmp/IDEWEB/${port}/logs/terminal.log 2>&1 & echo $! > /tmp/IDEWEB/${port}/logs/process.pid`,
  `tail -f /tmp/IDEWEB/${port}/logs/terminal.log > /tmp/IDEWEB/${port}/logs/terminal-realtime.log 2>&1 &`
];

for (const command of commands) {
  // FOKUSSIEREN und FÜLLEN - das macht Playwright WIRKLICH!
  await page.focus('.xterm-helper-textarea');
  await page.fill('.xterm-helper-textarea', command);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000); // Warten bis Befehl ausgeführt ist
}

// 5. VERSCHLÜSSELTE DATEI SCHREIBEN - Funktion
async function writeToEncryptedLog(filePath, logEntry) {
  try {
    // Verzeichnis erstellen falls nicht vorhanden
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Log-Entry verschlüsseln
    const crypto = require('crypto');
    const key = process.env.LOG_ENCRYPTION_KEY || 'default-key-32-chars-long!!';
    const algorithm = 'aes-256-cbc';
    
    const data = JSON.stringify(logEntry);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const result = Buffer.concat([iv, encrypted]);
    
    // Verschlüsselte Daten an Datei anhängen (append mode)
    await fs.appendFile(filePath, result.toString('base64') + '\n');
    
    console.log('✅ LOG ENTRY VERSCHLÜSSELT GESCHRIEBEN:', filePath);
    
  } catch (error) {
    console.error('❌ FEHLER BEIM SCHREIBEN DER LOG-DATEI:', error);
  }
}

// 6. LOG-DATEI ÜBERWACHEN - Polling alle 2 Sekunden
setInterval(async () => {
  try {
    const logPath = `/tmp/IDEWEB/${port}/logs/terminal.log`;
    const stats = await fs.stat(logPath);
    
    if (stats.size > 0) {
      // Log-Datei lesen
      const logContent = await fs.readFile(logPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      // Neue Zeilen verarbeiten
      for (const line of lines) {
        const logEntry = {
          timestamp: new Date().toISOString(),
          type: 'terminal',
          text: line,
          level: 'info'
        };
        
        // In verschlüsselte Datei schreiben
        await writeToEncryptedLog(`/tmp/IDEWEB/${port}/logs/terminal.encrypted.log`, logEntry);
      }
      
      // Original-Log leeren (nur neue Zeilen behalten)
      await fs.writeFile(logPath, '');
    }
    
  } catch (error) {
    console.log('📝 Log-Datei noch nicht erstellt oder leer');
  }
}, 2000);

// 7. CLEANUP - Beim Beenden
process.on('SIGINT', async () => {
  console.log('🧹 Cleanup: Browser schließen...');
  
  // Prozess beenden falls PID-Datei existiert
  try {
    const pidPath = `/tmp/IDEWEB/${port}/logs/process.pid`;
    const pid = await fs.readFile(pidPath, 'utf8');
    if (pid) {
      process.kill(parseInt(pid), 'SIGTERM');
    }
  } catch (error) {
    console.log('Kein Prozess zu beenden');
  }
  
  await browser.close();
  process.exit(0);
});
```

### DETAILLIERTE ERKLÄRUNG WIE PLAYWRIGHT TERMINAL-OUTPUT IN DATEIEN SCHREIBT:

**SCHRITT 1: Playwright öffnet Terminal**
- `page.keyboard.press('Control+Shift+`')` - Öffnet Terminal in Cursor IDE
- `page.$('.xterm-helper-textarea')` - Findet Terminal-Input-Element
- **Playwright KANN Terminal öffnen und Input senden!**

**SCHRITT 2: Befehle mit Output-Umleitung ausführen**
- `npm run dev > /tmp/IDEWEB/${port}/logs/terminal.log 2>&1` - Leitet Output in Datei um
- `& echo $! > /tmp/IDEWEB/${port}/logs/process.pid` - Speichert Prozess-ID
- `tail -f` - Überwacht Datei in Echtzeit
- **Playwright KANN Befehle ausführen die Output in Dateien schreiben!**

**SCHRITT 3: Backend liest und verschlüsselt Log-Dateien**
- `setInterval()` prüft alle 2 Sekunden die Log-Datei
- `fs.readFile()` liest den Terminal-Output
- `writeToEncryptedLog()` verschlüsselt und speichert
- **Backend kann Dateien lesen die Playwright erstellt hat!**

**SCHRITT 4: Datei-Struktur**
```
/tmp/IDEWEB/{port}/logs/
├── terminal.log              # Terminal-Output (nicht verschlüsselt)
├── terminal.encrypted.log    # Verschlüsselte Log-Einträge
├── process.pid               # Prozess-ID für Cleanup
└── terminal-realtime.log     # Echtzeit-Output
```

**WICHTIG: Playwright KANN NICHT Terminal-Output LESEN!**
- Terminal ist ein Canvas - kein Text drin!
- Playwright kann NUR Befehle eingeben
- Output muss in Dateien umgeleitet werden
- Backend liest dann die Dateien

### Log File Structure:
```javascript
// Log file structure
/tmp/IDEWEB/{port}/logs/
├── terminal.log.enc         # Encrypted terminal output
├── terminal.log.meta        # Log metadata (non-encrypted)
├── terminal.log.index       # Log index for quick access
└── keys/                    # Encryption keys
    └── session-{sessionId}.key
```

### Log Reading Approach:
```javascript
// Read and decrypt logs
const logReader = new TerminalLogReader();
const logs = await logReader.getRecentLogs(port, 50); // Last 50 lines

// API endpoint
app.get('/api/terminal-logs/:port', async (req, res) => {
  const { port } = req.params;
  const { lines = 50 } = req.query;
  
  const logs = await logReader.getRecentLogs(port, parseInt(lines));
  res.json({ success: true, data: logs });
});
```

## 16. Log Security Implementation

### Secure Log Structure:
```javascript
// Secure directory structure
/tmp/IDEWEB/{port}/logs/
├── terminal.log.enc         # Encrypted terminal output (chmod 600)
├── terminal.log.meta        # Log metadata (chmod 644)
├── terminal.log.index       # Log index (chmod 644)
└── keys/                    # Encryption keys (chmod 600)
    └── session-{sessionId}.key
```

### Log Encryption Service:
```javascript
class LogEncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.keyLength = 32;
  }

  async encryptLogEntry(logEntry, key) {
    const crypto = require('crypto');
    
    const data = JSON.stringify(logEntry);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, key);
    
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const result = Buffer.concat([iv, encrypted]);
    
    return result.toString('base64');
  }

  async decryptLogEntry(encryptedData, key) {
    const crypto = require('crypto');
    
    const data = Buffer.from(encryptedData, 'base64');
    const iv = data.slice(0, 16);
    const encrypted = data.slice(16);
    
    const decipher = crypto.createDecipher(this.algorithm, key);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }
}
```

### Log Permission Manager:
```javascript
class LogPermissionManager {
  async setSecureLogPermissions(path, type = 'log') {
    const fs = require('fs');
    
    if (type === 'directory') {
      await fs.chmod(path, 0o700); // Owner read/write/execute only
    } else if (type === 'log') {
      await fs.chmod(path, 0o600); // Owner read/write only
    } else {
      await fs.chmod(path, 0o644); // Owner read/write, others read
    }
  }

  async createSecureLogDirectory(path) {
    const fs = require('fs');
    
    await fs.mkdir(path, { recursive: true });
    await this.setSecureLogPermissions(path, 'directory');
  }

  validateLogPath(path) {
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

### Phase 1: Foundation Setup ⏳ PENDING
- [ ] Create TerminalLogCaptureService structure
- [ ] Set up log file system in /tmp/IDEWEB/{port}/logs/
- [ ] Create initial test framework
- [ ] Set up LogEncryptionService and LogPermissionManager

### Phase 2: Playwright Terminal Capture ⏳ PENDING
- [ ] Implement Playwright script to capture browser terminal output
- [ ] Add output redirection to encrypted log files
- [ ] Implement real-time log writing
- [ ] Add log rotation and cleanup

### Phase 3: Backend Log Reading ⏳ PENDING
- [ ] Implement log file reading and decryption
- [ ] Add REST API endpoints for log access
- [ ] Implement log parsing and formatting
- [ ] Add log search and filtering

### Phase 4: Frontend Integration ⏳ PENDING
- [ ] Create log display components
- [ ] Add real-time log updates
- [ ] Implement log search and navigation
- [ ] Add log export functionality

### Phase 5: Security Implementation ⏳ PENDING
- [ ] Implement secure log file permissions (chmod 600/700)
- [ ] Add log encryption for sensitive data
- [ ] Implement auto-cleanup mechanisms
- [ ] Add path validation and traversal prevention
- [ ] Implement secure key management

### Phase 6: Testing & Documentation ⏳ PENDING
- [ ] Write comprehensive unit tests
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] Create user guide

## 18. Current Status
**Ready to Start** - Foundation setup needs to be implemented.

**Next Steps:**
1. Create TerminalLogCaptureService.js with log capture logic
2. Create LogEncryptionService.js for log encryption/decryption
3. Create LogPermissionManager.js for secure file permissions
4. Implement Playwright terminal capture scripts
5. Create REST API endpoints for log reading
6. Add frontend components for log display 