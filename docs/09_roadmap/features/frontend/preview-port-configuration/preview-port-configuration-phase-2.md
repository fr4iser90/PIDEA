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
  - `validatePort(port)` method
  - Port range validation (1-65535)
  - Port availability checking
  - Error handling for invalid ports
  - Integration with existing API patterns
  - Proper error responses

### 3. Add Port Persistence in IDEStore
- [ ] **File**: `frontend/src/infrastructure/stores/IDEStore.jsx`
- [ ] **Time**: 15 minutes
- [ ] **Description**: Implement custom port persistence and retrieval
- [ ] **Requirements**:
  - `setCustomPort(port)` method implementation
  - `getCustomPort()` method implementation
  - `validateCustomPort(port)` method implementation
  - `clearCustomPort()` method implementation
  - Integration with existing persistence system
  - Proper state management

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
// New method in APIChatRepository.jsx
async validatePort(port) {
  try {
    // Basic range validation
    if (port < 1 || port > 65535) {
      return { valid: false, error: 'Port must be between 1 and 65535' };
    }
    
    // Check if port is available (optional backend validation)
    const response = await this.apiCall(`/api/validate-port`, {
      method: 'POST',
      body: JSON.stringify({ port })
    });
    
    return response;
  } catch (error) {
    logger.error('Port validation failed:', error);
    return { valid: false, error: 'Port validation failed' };
  }
}
```

### IDEStore Port Management
```javascript
// New methods in IDEStore.jsx
setCustomPort: async (port) => {
  try {
    const isValid = await validatePort(port);
    if (isValid) {
      set({ customPort: port });
      localStorage.setItem('customPort', port.toString());
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
  const { customPort } = get();
  return customPort || localStorage.getItem('customPort');
},

clearCustomPort: () => {
  set({ customPort: null });
  localStorage.removeItem('customPort');
}
```

### Project Command Execution
```javascript
// New methods in APIChatRepository.jsx
async getProjectCommands(projectId = null) {
  const currentProjectId = projectId || await this.getCurrentProjectId();
  return this.apiCall(`/api/projects/${currentProjectId}/commands`);
},

async executeProjectCommand(projectId = null, commandType, options = {}) {
  const currentProjectId = projectId || await this.getCurrentProjectId();
  return this.apiCall(`/api/projects/${currentProjectId}/execute-command`, {
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