# Phase 2: Core Implementation - Preview Port Configuration

## 📋 Phase Overview
- **Phase**: 2 of 4
- **Title**: Core Implementation
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Phase Goals
Integrate port configuration and command execution into the existing preview system.

## 📋 Tasks

### 1. Integrate Port Input Field into PreviewComponent Header
- [ ] **File**: `frontend/src/presentation/components/chat/main/PreviewComponent.jsx`
- [ ] **Time**: 30 minutes
- [ ] **Description**: Add port input field to preview header when no port detected
- [ ] **Requirements**:
  - Conditional rendering based on port detection
  - Integration with PortConfigInput component
  - Real-time port validation feedback
  - Error state handling in header
  - Loading state during validation
  - Follow existing header component patterns

### 2. Implement Port Validation Logic
- [ ] **File**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx`
- [ ] **Time**: 20 minutes
- [ ] **Description**: Add port validation method to API repository
- [ ] **Requirements**:
  - `validatePort(port)` method - **Use existing IDEStore validation instead**
  - Port range validation (1-65535) - **IDEStore already has `isValidPortRange`**
  - Port availability checking - **IDEStore already has `validatePort` with health checks**
  - Error handling for invalid ports - **Use existing IDEStore error patterns**
  - Integration with existing API patterns - **Follow existing `apiCall` patterns**
  - **Optional**: Backend validation endpoint (not required for initial implementation)

### 3. Add Port Persistence in IDEStore
- [ ] **File**: `frontend/src/infrastructure/stores/IDEStore.jsx`
- [ ] **Time**: 15 minutes
- [ ] **Description**: Implement custom port persistence and retrieval
- [ ] **Requirements**:
  - `setCustomPort(port)` method implementation - **Leverage existing `validatePort` method**
  - `getCustomPort()` method implementation - **Use existing persistence system**
  - `validateCustomPort(port)` method implementation - **Use existing `validatePort` method**
  - `clearCustomPort()` method implementation - **Use existing persistence system**
  - **Integration with existing port preferences and persistence structure**
  - **Follow existing store patterns and error handling**

### 4. Connect Port Configuration with Preview Loading
- [ ] **File**: `frontend/src/presentation/components/chat/main/PreviewComponent.jsx`
- [ ] **Time**: 25 minutes
- [ ] **Description**: Integrate custom port with preview URL generation
- [ ] **Requirements**:
  - Use custom port in preview URL when available
  - Fallback to detected port when custom port not set
  - Handle port changes and preview refresh
  - Error handling for invalid preview URLs
  - Loading states during preview updates
  - Integration with existing preview logic

### 5. Integrate Start/Stop Command Buttons
- [ ] **File**: `frontend/src/presentation/components/chat/main/PreviewComponent.jsx`
- [ ] **Time**: 30 minutes
- [ ] **Description**: Add ProjectCommandButtons to preview header
- [ ] **Requirements**:
  - Integration with ProjectCommandButtons component
  - Command execution status display
  - Error handling for command failures
  - Loading states during command execution
  - Integration with existing header layout
  - Responsive design considerations

### 6. Add Project Command Execution Functionality
- [ ] **File**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx`
- [ ] **Time**: 20 minutes
- [ ] **Description**: Add project command execution methods
- [ ] **Requirements**:
  - `getProjectCommands(projectId)` method
  - `executeProjectCommand(projectId, commandType)` method
  - Support for start, dev, build, test commands
  - Real-time command execution status
  - Error handling for command failures
  - Integration with existing terminal services

## 🔧 Implementation Details

### PreviewComponent Header Integration
```jsx
// Header section with port input and command buttons
const PreviewHeader = ({ project, port, onPortChange, onCommandExecute }) => {
  const { customPort, setCustomPort, validatePort } = usePortConfiguration();
  
  return (
    <div className="preview-header">
      {/* Existing header content */}
      
      {/* Port configuration when no port detected */}
      {!port && (
        <div className="port-config-section">
          <PortConfigInput
            onPortChange={setCustomPort}
            onPortValidate={validatePort}
            initialPort={customPort}
          />
        </div>
      )}
      
      {/* Command execution buttons */}
      <ProjectCommandButtons
        projectId={project?.id}
        activePort={port || customPort}
        onCommandExecute={onCommandExecute}
        className="header-command-buttons"
      />
    </div>
  );
};
```

### APIChatRepository Port Validation
```javascript
// Optional: New method in APIChatRepository.jsx (if backend endpoint exists)
async validatePort(port) {
  try {
    // Use existing IDEStore validation instead of backend call
    const { validatePort: ideStoreValidatePort } = useIDEStore.getState();
    const isValid = await ideStoreValidatePort(port);
    
    if (isValid) {
      return { valid: true };
    } else {
      return { valid: false, error: 'Port validation failed' };
    }
  } catch (error) {
    logger.error('Port validation failed:', error);
    return { valid: false, error: 'Port validation failed' };
  }
}

// Alternative: Use existing IDEStore directly
// No need to add this method - use IDEStore.validatePort() directly
```

### IDEStore Port Management
```javascript
// Enhanced methods in IDEStore.jsx leveraging existing functionality
setCustomPort: async (port) => {
  try {
    // Use existing validatePort method for validation
    const isValid = await get().validatePort(port);
    if (isValid) {
      set({ customPort: port });
      // Use existing persistence system
      const { portPreferences } = get();
      const existingPreference = portPreferences.find(p => p.port === port);
      if (!existingPreference) {
        portPreferences.push({
          port,
          weight: 100,
          usageCount: 1,
          lastUsed: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
        set({ portPreferences: [...portPreferences] });
      }
      return { success: true };
    } else {
      return { success: false, error: 'Invalid port' };
    }
  } catch (error) {
    logger.error('Failed to set custom port:', error);
    return { success: false, error: 'Failed to set port' };
  }
},

getCustomPort: () => {
  return get().customPort;
},

validateCustomPort: async (port) => {
  // Use existing validatePort method
  return await get().validatePort(port);
},

clearCustomPort: () => {
  set({ customPort: null });
  return { success: true };
}
```

### Project Command Execution
```javascript
// New methods in APIChatRepository.jsx following existing patterns
async getProjectCommands(projectId = null) {
  const currentProjectId = projectId || await this.getCurrentProjectId();
  // Use existing apiCall pattern
  return apiCall(`/api/projects/${currentProjectId}/commands`);
},

async executeProjectCommand(projectId = null, commandType, options = {}) {
  const currentProjectId = projectId || await this.getCurrentProjectId();
  // Use existing apiCall pattern with proper error handling
  return apiCall(`/api/projects/${currentProjectId}/execute-command`, {
    method: 'POST',
    body: JSON.stringify({ commandType, ...options })
  });
}
```

## 🧪 Testing Requirements

### Integration Tests
- [ ] **File**: `tests/integration/PreviewComponent.test.jsx`
- [ ] **Test Cases**:
  - Port input field appears when no port detected
  - Port validation works correctly
  - Preview loads with custom port
  - Command buttons appear and function
  - Error handling for invalid ports
  - Command execution status updates

### API Tests
- [ ] **File**: `tests/integration/APIChatRepository.test.js`
- [ ] **Test Cases**:
  - Port validation method works
  - Project command retrieval works
  - Command execution works
  - Error handling for API failures

## 📝 Documentation Requirements

### Code Documentation
- [ ] Update PreviewComponent JSDoc with new props
- [ ] Document new APIChatRepository methods
- [ ] Document new IDEStore methods
- [ ] Component integration examples

### User Documentation
- [ ] Port configuration user guide
- [ ] Command execution user guide
- [ ] Troubleshooting guide

## 🔍 Quality Assurance

### Code Review Checklist
- [ ] Port input integration follows existing patterns
- [ ] Command execution integration works properly
- [ ] Error handling is comprehensive
- [ ] Performance considerations addressed
- [ ] Security validation implemented
- [ ] UI/UX follows existing design

### Testing Checklist
- [ ] Port configuration works end-to-end
- [ ] Command execution works end-to-end
- [ ] Error states display properly
- [ ] Loading states work correctly
- [ ] Integration with existing preview system
- [ ] No breaking changes to existing functionality

## 🚀 Success Criteria
- [ ] Port input field appears in preview header when needed
- [ ] Port validation works correctly
- [ ] Preview loads with custom port
- [ ] Command buttons appear and function
- [ ] Command execution provides real-time feedback
- [ ] All integration tests pass
- [ ] No breaking changes to existing functionality

## 🔄 Dependencies
- **Prerequisites**: Phase 1 (Foundation Setup)
- **Dependents**: Phase 3 (Integration)
- **External**: React, Zustand, existing preview system

## 📊 Progress Tracking
- **Current Progress**: 0%
- **Next Phase**: Phase 3 (Integration)
- **Estimated Completion**: 2 hours from start

## 🎯 Deliverables
1. Enhanced `PreviewComponent.jsx` - Port input and command button integration
2. Extended `APIChatRepository.jsx` - Port validation and command execution methods
3. Enhanced `IDEStore.jsx` - Custom port management functionality
4. Integration tests for port configuration and command execution
5. Updated documentation and examples

## 🔗 Related Files
- [Main Implementation](./preview-port-configuration-implementation.md)
- [Phase 1](./preview-port-configuration-phase-1.md)
- [Phase 3](./preview-port-configuration-phase-3.md)
- [Master Index](./preview-port-configuration-index.md)

## ✅ Validation Results - 2024-12-19

### Codebase Analysis
- **PreviewComponent.jsx**: ✅ Exists with proper header structure (`preview-header`, `preview-title`, `preview-actions`)
- **IDEStore.jsx**: ✅ Has comprehensive port management (`validatePort`, `isValidPortRange`, port preferences)
- **APIChatRepository.jsx**: ✅ Has extensive endpoint structure and `apiCall` helper function
- **CSS Structure**: ✅ `preview.css` has comprehensive styling for header components
- **Header Integration**: ✅ Existing header pattern supports additional components

### Implementation Patterns
- **Header Structure**: Follows existing `preview-header` with `preview-title` and `preview-actions`
- **Button Patterns**: Uses existing `preview-btn` class with `btn-icon` structure
- **API Patterns**: Follows existing `apiCall` helper function patterns
- **Store Integration**: Leverages existing IDEStore validation and persistence
- **Error Handling**: Uses existing logger and error patterns

### Critical Implementation Notes
1. **IDEStore Integration**: Use existing `validatePort()` and `isValidPortRange()` methods
2. **Header Layout**: Add port input between `preview-title` and `preview-actions`
3. **API Patterns**: Follow existing `apiCall` patterns for new endpoints
4. **CSS Integration**: Use existing CSS variables and button styles
5. **Backend Dependencies**: Optional - can use existing terminal services

### Backend Dependencies
- **Optional**: Project commands endpoint (`/api/projects/{projectId}/commands`)
- **Optional**: Command execution endpoint (`/api/projects/{projectId}/execute-command`)
- **Available**: Existing terminal execution services for command execution
- **Available**: Existing IDEStore validation for port management

### Header Integration Strategy
```jsx
// Updated header structure
<div className="preview-header">
  <div className="preview-title">
    <span className="preview-icon">👁️</span>
    <span className="preview-text">Preview</span>
  </div>
  
  {/* Port configuration when no port detected */}
  {!port && (
    <div className="port-config-section">
      <PortConfigInput
        onPortChange={setCustomPort}
        onPortValidate={validatePort}
        initialPort={customPort}
      />
    </div>
  )}
  
  {/* Command execution buttons */}
  <ProjectCommandButtons
    projectId={project?.id}
    activePort={port || customPort}
    onCommandExecute={onCommandExecute}
    className="header-command-buttons"
  />
  
  <div className="preview-actions">
    {/* Existing action buttons */}
  </div>
</div>
``` 