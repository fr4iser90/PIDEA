# Phase 3: Data Migration & Hardcoded Path Replacement

## Overview
Replace all hardcoded IDE paths with database-driven configuration system and migrate existing hardcoded data to the database.

## Tasks

### 3.1 Create Data Migration Service (45 minutes)
- [ ] Create IDE data migration service
- [ ] Implement user configuration for executable paths
- [ ] Add path validation for user-provided executables
- [ ] Implement version detection for found IDEs
- [ ] Add migration logging and error handling
- [ ] No auto-scanning - user chooses executables

### 3.2 Replace Hardcoded Paths in Detectors (30 minutes)
- [ ] Update CursorDetector to use database lookup
- [ ] Update VSCodeDetector to use database lookup
- [ ] Update WindsurfDetector to use database lookup
- [ ] Implement fallback to hardcoded paths if database empty
- [ ] Add path validation in detectors

### 3.3 Replace Hardcoded Paths in Starters (30 minutes)
- [ ] Update CursorStarter to use database lookup
- [ ] Update VSCodeStarter to use database lookup
- [ ] Update WindsurfStarter to use database lookup
- [ ] Implement fallback to hardcoded paths if database empty
- [ ] Add executable validation in starters

### 3.4 Update Core IDE Management (15 minutes)
- [ ] Update IDEManager to use database configurations
- [ ] Update IDEConfigManager to integrate with database
- [ ] Implement data validation and integrity checks
- [ ] Add error handling for missing database entries

## Implementation Details

### Data Migration Service
```javascript
class IDEConfigurationMigrationService {
  async migrateFromHardcoded() {
    // User manually configures executable paths
    // No auto-scanning of system installations
    // Just validate and save user-provided paths
  }
  
  async validateUserProvidedExecutable(executablePath) {
    // Validate executable exists
    // Check if it's executable
    // Get version information
    // Save to database
  }
  
  async validateAndSaveIDE(ideConfig) {
    // Validate executable path
    // Detect version
    // Save to database
  }
}
```

### Database-First Detector Implementation
```javascript
class DatabaseAwareCursorDetector {
  constructor(ideConfigurationService) {
    this.ideConfigurationService = ideConfigurationService;
  }
  
  async findCursorExecutable() {
    // First try database configurations
    const dbConfigs = await this.ideConfigurationService.getActiveConfigurations('cursor');
    for (const config of dbConfigs) {
      if (await this.validateExecutable(config.executable_path)) {
        return config.executable_path;
      }
    }
    
    // Fallback to hardcoded paths if database empty
    return this.findCursorExecutableHardcoded();
  }
}
```

### Fallback System Implementation
```javascript
const IDE_PATH_FALLBACK = {
  cursor: {
    windows: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\cursor\\Cursor.exe',
    macos: '/Applications/Cursor.app/Contents/MacOS/Cursor',
    linux: '/usr/bin/cursor'
  },
  vscode: {
    windows: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
    macos: '/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
    linux: '/usr/bin/code'
  }
};
```

## Success Criteria
- [ ] All hardcoded paths replaced with database lookup
- [ ] Data migration successfully scans and saves existing installations
- [ ] Fallback system works when database is empty
- [ ] Path validation ensures data integrity
- [ ] Version detection works for all IDE types
- [ ] System maintains backward compatibility

## Files to Modify
- `backend/infrastructure/external/ide/detectors/CursorDetector.js`
- `backend/infrastructure/external/ide/detectors/VSCodeDetector.js`
- `backend/infrastructure/external/ide/detectors/WindsurfDetector.js`
- `backend/infrastructure/external/ide/starters/CursorStarter.js`
- `backend/infrastructure/external/ide/starters/VSCodeStarter.js`
- `backend/infrastructure/external/ide/starters/WindsurfStarter.js`
- `backend/infrastructure/external/ide/IDEManager.js`
- `backend/infrastructure/external/ide/IDEConfigManager.js`

## Files to Create
- `backend/application/services/IDEConfigurationMigrationService.js`
- `backend/infrastructure/services/IDEValidationService.js`

## Estimated Time: 2 hours