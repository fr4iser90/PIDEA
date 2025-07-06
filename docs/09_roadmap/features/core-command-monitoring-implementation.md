# Terminal Log Capture & Display System

## 1. Project Overview
- **Feature/Component Name**: Terminal Log Capture & Display System
- **Priority**: Critical
- **Estimated Time**: 1-2 weeks
- **Dependencies**: Playwright, Browser Terminal, REST API, File System, Crypto
- **Related Issues**: Browser terminal output capture, encrypted log storage, real-time log display

## 2. Technical Requirements
- **Tech Stack**: Playwright (CDP only), Node.js, Express (REST API), Crypto (for encryption), File System
- **Architecture Pattern**: Log Capture, File-Based Storage, Encryption, CDP-Based Terminal Access
- **Database Changes**: None (file-based log storage in /tmp/IDEWEB/)
- **API Changes**: New REST endpoints for encrypted log reading
- **Frontend Changes**: Log display components with real-time updates
- **Backend Changes**: Log decryption service, REST endpoints, CDP terminal access via existing connection

## 2.1 Existing Functions to Use (NO NEW BROWSER!)
- **BrowserManager** - `connect(port)` - Verbindet sich über CDP zu Port 9222
- **IDEManager** - `getActiveIDE()`, `switchToIDE(port)` - Verwaltet IDE Instanzen
- **IDEMirrorService** - `typeInIDE()`, `clickElementInIDE()` - Kann Terminal öffnen und Befehle ausführen
- **CursorIDEService** - `switchToPort(port)` - Wechselt zwischen IDE Ports
- **IDEStarter** - `startIDE(port)` - Startet neue IDE Instanzen
- **IDEDetector** - `scanForIDEs()` - Findet laufende IDE Instanzen

## 2.2 EXISTING TERMINAL SERVICES (NUTZLOS FÜR LOG CAPTURE!)
- **TerminalMonitor** - ❌ KANN NICHT Terminal-Output lesen (Terminal ist Canvas!)
- **TerminalContentExtractor** - ❌ KANN NICHT Terminal-Inhalt extrahieren
- **TerminalUrlExtractor** - ❌ KANN NICHT URLs aus Terminal lesen
- **WAHRHEIT**: Diese Services sind KOMPLETT NUTZLOS für Terminal Log Capture!

## 3. File Impact Analysis

### Files to Modify:
- [ ] `backend/presentation/api/IDEController.js` - Add log reading endpoints
- [ ] `frontend/src/presentation/components/ChatComponent.jsx` - Add log display button
- [ ] Playwright scripts - Add terminal log capture

### Files to Create:
- [ ] `backend/domain/services/TerminalLogCaptureService.js` - Core log capture logic (KOMPLETT NEU!)
- [ ] `backend/domain/services/TerminalLogReader.js` - Read and decrypt logs (KOMPLETT NEU!)
- [ ] `backend/infrastructure/security/LogEncryptionService.js` - Log encryption/decryption (KOMPLETT NEU!)
- [ ] `backend/infrastructure/security/LogPermissionManager.js` - Secure log file permissions (KOMPLETT NEU!)
- [ ] `backend/tests/unit/domain/services/TerminalLogCaptureService.test.js` - Unit tests (KOMPLETT NEU!)
- [ ] `backend/tests/integration/TerminalLogCapture.test.js` - Integration tests (KOMPLETT NEU!)
- [ ] `backend/tests/unit/infrastructure/security/LogEncryptionService.test.js` - Security tests (KOMPLETT NEU!)

### Files to Delete:
- [ ] Remove all command monitoring related code

## 4. Implementation Phases

### Phase 1: Foundation Setup
- [ ] **TerminalLogCaptureService.js** with `initializeCapture(port)` function
- [ ] **TerminalLogCaptureService.js** with `fs.mkdir()` to create `/tmp/IDEWEB/{port}/logs/`
- [ ] **LogEncryptionService.js** with `encryptLogEntry()` and `decryptLogEntry()` functions
- [ ] **LogEncryptionService.js** with `crypto.createCipher()` and `crypto.createDecipher()`
- [ ] **LogPermissionManager.js** with `setSecureLogPermissions()` and `fs.chmod()`
- [ ] **LogPermissionManager.js** with `validateLogPath()` to prevent path traversal

### Phase 2: Terminal Capture Using Existing Functions
- [ ] **TerminalLogCaptureService.js** - Nutzt `BrowserManager.connect(port)` für CDP Verbindung
- [ ] **executeTerminalCommand(command)** function mit `IDEMirrorService.typeInIDE(command)`
- [ ] **executeTerminalCommand(command)** function mit `IDEMirrorService.clickElementInIDE('.xterm-helper-textarea')`
- [ ] **executeTerminalCommand(command)** function mit `IDEMirrorService.typeInIDE('Enter')` für Enter-Taste
- [ ] **TerminalLogCaptureService.js** nutzt `IDEManager.getActiveIDE()` für aktuelle IDE
- [ ] **TerminalLogCaptureService.js** öffnet Terminal mit `IDEMirrorService.typeInIDE('Control+Shift+`')`
- [ ] **TerminalLogCaptureService.js** führt Befehle aus wie `npm run dev > /tmp/IDEWEB/${port}/logs/terminal.log 2>&1`
- [ ] **Backend service** überwacht Log-Dateien mit `setInterval()` und `fs.readFile()`

### Phase 3: Backend Log Reading
- [ ] **TerminalLogReader.js** with `getRecentLogs(port, lines)` function
- [ ] **TerminalLogReader.js** with `fs.readFile()` to read encrypted logs
- [ ] **TerminalLogReader.js** with `crypto.createDecipher()` to decrypt logs
- [ ] **IDEController.js** with REST endpoint `GET /api/terminal-logs/:port`
- [ ] **IDEController.js** with query parameter `?lines=50` for log count
- [ ] **IDEController.js** with response format `{ success: true, data: logs }`

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

### Using Existing Functions Pattern (NO NEW BROWSER!):
```javascript
// 1. EXISTING FUNCTIONS SETUP - Nutze bestehende CDP Verbindung
const BrowserManager = require('./infrastructure/external/BrowserManager');
const IDEManager = require('./infrastructure/external/IDEManager');
const IDEMirrorService = require('./domain/services/IDEMirrorService');
const fs = require('fs').promises;
const path = require('path');

// 2. BESTEHENDE CDP VERBINDUNG NUTZEN - KEIN NEUER BROWSER!
await ideManager.initialize();
const activeIDE = await ideManager.getActiveIDE();
await browserManager.connect(activeIDE.port);

// Terminal öffnen mit bestehenden Funktionen
await ideMirrorService.typeInIDE('Control+Shift+`');

// Warten bis Terminal offen ist
await new Promise(resolve => setTimeout(resolve, 1000));

// 3. TERMINAL BEFEHLE AUSFÜHREN - Mit bestehenden Funktionen!
const port = activeIDE.port; // IDE Port (9222-9231)
const commands = [
  `mkdir -p /tmp/IDEWEB/${port}/logs`,
  `npm run dev > /tmp/IDEWEB/${port}/logs/terminal.log 2>&1 & echo $! > /tmp/IDEWEB/${port}/logs/process.pid`,
  `tail -f /tmp/IDEWEB/${port}/logs/terminal.log > /tmp/IDEWEB/${port}/logs/terminal-realtime.log 2>&1 &`
];

for (const command of commands) {
  // FOKUSSIEREN und FÜLLEN - mit bestehenden Funktionen!
  await ideMirrorService.clickElementInIDE('.xterm-helper-textarea');
  await ideMirrorService.typeInIDE(command);
  await ideMirrorService.typeInIDE('Enter');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Warten bis Befehl ausgeführt ist
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

// 7. CLEANUP - Beim Beenden (KEIN BROWSER SCHLIEßEN!)
process.on('SIGINT', async () => {
  console.log('🧹 Cleanup: Prozesse beenden...');
  
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
  
  // KEIN browser.close() - bestehende Verbindung bleibt!
  process.exit(0);
});
```

### DETAILLIERTE ERKLÄRUNG WIE BESTEHENDE FUNKTIONEN TERMINAL-OUTPUT IN DATEIEN SCHREIBT:

**SCHRITT 1: Bestehende CDP Verbindung nutzen**
- `ideManager.getActiveIDE()` - Findet aktive IDE Instanz
- `browserManager.connect(port)` - Verbindet sich über bestehende CDP Verbindung
- `ideMirrorService.typeInIDE('Control+Shift+`')` - Öffnet Terminal mit bestehenden Funktionen
- **KEIN NEUER BROWSER - nur bestehende Verbindung nutzen!**

**SCHRITT 2: Befehle mit bestehenden Funktionen ausführen**
- `ideMirrorService.clickElementInIDE('.xterm-helper-textarea')` - Fokussiert Terminal
- `ideMirrorService.typeInIDE(command)` - Gibt Befehl ein
- `ideMirrorService.typeInIDE('Enter')` - Führt Befehl aus
- **Bestehende Funktionen können Befehle ausführen die Output in Dateien schreiben!**

**SCHRITT 3: Backend liest und verschlüsselt Log-Dateien**
- `setInterval()` prüft alle 2 Sekunden die Log-Datei
- `fs.readFile()` liest den Terminal-Output
- `writeToEncryptedLog()` verschlüsselt und speichert
- **Backend kann Dateien lesen die bestehende Funktionen erstellt haben!**

**SCHRITT 4: Datei-Struktur**
```
/tmp/IDEWEB/{port}/logs/
├── terminal.log              # Terminal-Output (nicht verschlüsselt)
├── terminal.encrypted.log    # Verschlüsselte Log-Einträge
├── process.pid               # Prozess-ID für Cleanup
└── terminal-realtime.log     # Echtzeit-Output
```

**WICHTIG: Bestehende Funktionen KÖNNEN NICHT Terminal-Output LESEN!**
- Terminal ist ein Canvas - kein Text drin!
- Bestehende Funktionen können NUR Befehle eingeben
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

### Phase 1: Foundation Setup ❌ NICHT IMPLEMENTIERT
- [ ] Create TerminalLogCaptureService structure
- [ ] Set up log file system in /tmp/IDEWEB/{port}/logs/
- [ ] Create initial test framework
- [ ] Set up LogEncryptionService and LogPermissionManager

### Phase 2: Terminal Capture Using Existing Functions ❌ NICHT IMPLEMENTIERT
- [ ] Implement TerminalLogCaptureService using existing BrowserManager/IDEManager
- [ ] Add output redirection to encrypted log files using existing CDP connection
- [ ] Implement real-time log writing with existing IDE functions
- [ ] Add log rotation and cleanup

### Phase 3: Backend Log Reading ❌ NICHT IMPLEMENTIERT
- [ ] Implement log file reading and decryption
- [ ] Add REST API endpoints for log access
- [ ] Implement log parsing and formatting
- [ ] Add log search and filtering

### Phase 4: Frontend Integration ❌ NICHT IMPLEMENTIERT
- [ ] Create log display components
- [ ] Add real-time log updates
- [ ] Implement log search and navigation
- [ ] Add log export functionality

### Phase 5: Security Implementation ❌ NICHT IMPLEMENTIERT
- [ ] Implement secure log file permissions (chmod 600/700)
- [ ] Add log encryption for sensitive data
- [ ] Implement auto-cleanup mechanisms
- [ ] Add path validation and traversal prevention
- [ ] Implement secure key management

### Phase 6: Testing & Documentation ❌ NICHT IMPLEMENTIERT
- [ ] Write comprehensive unit tests
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] Create user guide

## 18. Current Status
**❌ KOMPLETT NICHT IMPLEMENTIERT** - Alles gelöscht/discarded!

**WAHRHEIT:**
- ❌ TerminalLogCaptureService.js - **EXISTIERT NICHT**
- ❌ LogEncryptionService.js - **EXISTIERT NICHT**
- ❌ LogPermissionManager.js - **EXISTIERT NICHT**
- ❌ TerminalLogReader.js - **EXISTIERT NICHT**
- ❌ TerminalLogDisplay.jsx - **EXISTIERT NICHT**
- ❌ API Endpoints - **EXISTIEREN NICHT**
- ❌ Tests - **EXISTIEREN NICHT**

**Bestehende Terminal Services sind NUTZLOS:**
- TerminalMonitor.js - Kann Terminal-Output nicht lesen (Terminal ist Canvas!)
- TerminalContentExtractor.js - Kann Terminal-Inhalt nicht extrahieren
- TerminalUrlExtractor.js - Kann URLs nicht aus Terminal lesen

**Next Steps (KOMPLETT NEU IMPLEMENTIEREN):**
1. Create TerminalLogCaptureService.js with log capture logic
2. Create LogEncryptionService.js for log encryption/decryption
3. Create LogPermissionManager.js for secure file permissions
4. Implement terminal capture using existing CDP functions (NO NEW BROWSER!)
5. Create REST API endpoints for log reading
6. Add frontend components for log display 