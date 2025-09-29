# Phase 1: Enhanced IDE Start Modal

## Overview
Enhance the existing IDEStartModal component with download links, executable path selection, and improved UX for IDE setup.

## Tasks

### 1.1 Add Download Links for Each IDE Type (45 minutes)
- [ ] Research official download URLs for Cursor, VS Code, and Windsurf
- [ ] Add download section to IDE type selection
- [ ] Implement click handlers for download links
- [ ] Add external link indicators and security warnings
- [ ] Test download link functionality

### 1.2 Add Executable Path Selection (45 minutes)
- [ ] Add file browser input for custom executable paths
- [ ] Implement path validation for IDE executables
- [ ] Add default path suggestions for each IDE type
- [ ] Add path validation feedback
- [ ] No auto-detection - user chooses their executables

### 1.3 Add IDE Version Detection and Storage (45 minutes)
- [ ] Implement IDE version detection from executable
- [ ] Add version display in modal
- [ ] Store version information in database
- [ ] Add version validation for selector compatibility
- [ ] Implement version update detection

### 1.4 Enhance Modal UX (30 minutes)
- [ ] Add IDE detection status indicators
- [ ] Improve visual hierarchy and spacing
- [ ] Add helpful tooltips and descriptions
- [ ] Implement better error messaging
- [ ] Add loading states for IDE detection

### 1.5 Update CSS Styling (15 minutes)
- [ ] Update modal layout for new sections
- [ ] Style download links section
- [ ] Style executable path input
- [ ] Add responsive design improvements
- [ ] Ensure accessibility compliance

## Implementation Details

### Download Links Implementation
```javascript
const downloadLinks = {
  cursor: {
    windows: 'https://cursor.sh/download/windows',
    macos: 'https://cursor.sh/download/macos',
    linux: 'https://cursor.sh/download/linux'
  },
  vscode: {
    windows: 'https://code.visualstudio.com/download',
    macos: 'https://code.visualstudio.com/download',
    linux: 'https://code.visualstudio.com/download'
  },
  windsurf: {
    windows: 'https://windsurf.dev/download/windows',
    macos: 'https://windsurf.dev/download/macos',
    linux: 'https://windsurf.dev/download/linux'
  }
};
```

### IDE Version Detection Implementation
```javascript
const detectIDEVersion = async (executablePath) => {
  try {
    // For Windows
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const command = `"${executablePath}" --version`;
      const version = await execAsync(command);
      return parseVersion(version);
    }
    
    // For macOS/Linux
    const { exec } = require('child_process');
    const command = `"${executablePath}" --version`;
    const version = await execAsync(command);
    return parseVersion(version);
  } catch (error) {
    logger.warn('Failed to detect IDE version:', error);
    return null;
  }
};

const parseVersion = (versionString) => {
  // Extract version number from IDE output
  const match = versionString.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
};
```

### Database Persistence Implementation
```javascript
const saveIDEConfiguration = async (ideConfig) => {
  const config = {
    ide_type: ideConfig.ideType,
    executable_path: ideConfig.executablePath,
    version: ideConfig.version,
    build_number: ideConfig.buildNumber,
    installation_path: ideConfig.installationPath,
    is_default: ideConfig.isDefault,
    startup_options: JSON.stringify(ideConfig.startupOptions),
    metadata: JSON.stringify(ideConfig.metadata)
  };
  
  return await apiCall('/api/ide/configurations', {
    method: 'POST',
    body: JSON.stringify(config)
  });
};
```

## Success Criteria
- [ ] Download links work correctly for all IDE types
- [ ] Executable path selection functions properly
- [ ] IDE version detection works for all supported IDEs
- [ ] Database persistence saves IDE configurations correctly
- [ ] Modal maintains existing functionality
- [ ] Enhanced UX improves user experience
- [ ] All tests pass

## Files to Modify
- `frontend/src/presentation/components/ide/IDEStartModal.jsx`
- `frontend/src/css/components/ide/ide-start-modal.css`

## Files to Create
- `backend/infrastructure/database/migrations/add-ide-configurations-table.sql`
- `backend/domain/entities/IDEConfiguration.js`
- `backend/domain/repositories/IDEConfigurationRepository.js`
- `backend/application/services/IDEConfigurationService.js`
- `backend/presentation/api/ide/IDEConfigurationController.js`

## Estimated Time: 3 hours
