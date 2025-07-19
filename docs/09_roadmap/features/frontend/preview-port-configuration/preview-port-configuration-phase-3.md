# Phase 3: Integration - Preview Port Configuration

## 📋 Phase Overview
- **Phase**: 3 of 4
- **Title**: Integration
- **Estimated Time**: 0.5 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Phase Goals
Test and validate the complete port configuration system with proper error handling and fallback behavior.

## 📋 Tasks

### 1. Test Port Configuration with Existing Preview System
- [ ] **File**: `frontend/src/presentation/components/chat/main/PreviewComponent.jsx`
- [ ] **Time**: 15 minutes
- [ ] **Description**: Validate port configuration integration with existing preview functionality
- [ ] **Requirements**:
  - Test port input field appearance/disappearance
  - Test port validation with existing preview loading
  - Test fallback behavior when port detection fails
  - Test persistence across page refreshes
  - Test integration with existing preview refresh logic
  - Ensure no conflicts with existing port detection

### 2. Ensure Proper Error Handling
- [ ] **File**: `frontend/src/presentation/components/chat/main/PreviewComponent.jsx`
- [ ] **Time**: 10 minutes
- [ ] **Description**: Implement comprehensive error handling for port configuration
- [ ] **Requirements**:
  - Handle invalid port input gracefully
  - Display user-friendly error messages
  - Handle network errors during port validation
  - Handle API failures for command execution
  - Provide fallback options when errors occur
  - Log errors appropriately for debugging

### 3. Validate Port Input with Backend Endpoints
- [ ] **File**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx`
- [ ] **Time**: 10 minutes
- [ ] **Description**: Test port validation with actual backend endpoints
- [ ] **Requirements**:
  - Test port validation API endpoint
  - Test project command retrieval endpoint
  - Test command execution endpoint
  - Handle API response errors
  - Validate error response formats
  - Test timeout scenarios

### 4. Test Fallback Behavior
- [ ] **File**: `frontend/src/presentation/components/chat/main/PreviewComponent.jsx`
- [ ] **Time**: 10 minutes
- [ ] **Description**: Test fallback mechanisms when port configuration fails
- [ ] **Requirements**:
  - Test fallback to detected port when custom port fails
  - Test fallback to default port when no port available
  - Test graceful degradation of functionality
  - Test user notification of fallback behavior
  - Test recovery from error states
  - Test persistence of fallback decisions

### 5. Test Start/Stop Command Execution
- [ ] **File**: `frontend/src/presentation/components/chat/main/ProjectCommandButtons.jsx`
- [ ] **Time**: 5 minutes
- [ ] **Description**: Validate command execution functionality
- [ ] **Requirements**:
  - Test start command execution
  - Test stop command execution
  - Test command status updates
  - Test error handling for command failures
  - Test loading states during execution
  - Test integration with existing terminal services

## 🔧 Implementation Details

### Error Handling Integration
```jsx
// Enhanced error handling in PreviewComponent
const PreviewComponent = ({ project, port }) => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { customPort, setCustomPort, validatePort } = usePortConfiguration();

  const handlePortChange = async (newPort) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await setCustomPort(newPort);
      if (!result.success) {
        setError(result.error);
        return;
      }
      
      // Refresh preview with new port
      await refreshPreview(newPort);
    } catch (err) {
      setError('Failed to update port configuration');
      logger.error('Port change failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommandExecute = async (commandType) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await executeProjectCommand(project.id, commandType);
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to execute command');
      logger.error('Command execution failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Error display component
  const ErrorDisplay = ({ error }) => {
    if (!error) return null;
    
    return (
      <div className="error-message">
        <span className="error-icon">⚠️</span>
        <span className="error-text">{error}</span>
        <button onClick={() => setError(null)} className="error-close">×</button>
      </div>
    );
  };
};
```

### Fallback Behavior Implementation
```jsx
// Fallback logic in PreviewComponent
const getEffectivePort = () => {
  // Priority: custom port > detected port > default port
  if (customPort && isValidPort(customPort)) {
    return customPort;
  }
  
  if (port && isValidPort(port)) {
    return port;
  }
  
  // Default fallback port
  return 3000;
};

const isValidPort = (port) => {
  return port && port >= 1 && port <= 65535;
};

const refreshPreview = async (portToUse) => {
  const effectivePort = portToUse || getEffectivePort();
  
  try {
    // Update preview URL with effective port
    const previewUrl = generatePreviewUrl(project, effectivePort);
    setPreviewUrl(previewUrl);
    
    // Test if preview is accessible
    await testPreviewAccessibility(previewUrl);
  } catch (error) {
    // Fallback to detected port if custom port fails
    if (portToUse && portToUse !== port) {
      logger.warn('Custom port failed, falling back to detected port');
      await refreshPreview(port);
    } else {
      throw error;
    }
  }
};
```

### API Error Handling
```javascript
// Enhanced error handling in APIChatRepository
async validatePort(port) {
  try {
    // Basic validation first
    if (port < 1 || port > 65535) {
      return { valid: false, error: 'Port must be between 1 and 65535' };
    }
    
    // API validation with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await this.apiCall(`/api/validate-port`, {
      method: 'POST',
      body: JSON.stringify({ port }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      return { valid: false, error: 'Port validation timed out' };
    }
    
    logger.error('Port validation failed:', error);
    return { valid: false, error: 'Port validation failed' };
  }
}

async executeProjectCommand(projectId, commandType) {
  try {
    const response = await this.apiCall(`/api/projects/${projectId}/execute-command`, {
      method: 'POST',
      body: JSON.stringify({ commandType })
    });
    
    return response;
  } catch (error) {
    logger.error('Command execution failed:', error);
    
    // Provide specific error messages based on error type
    if (error.status === 404) {
      return { success: false, error: 'Project not found' };
    } else if (error.status === 400) {
      return { success: false, error: 'Invalid command type' };
    } else if (error.status === 500) {
      return { success: false, error: 'Command execution failed' };
    } else {
      return { success: false, error: 'Failed to execute command' };
    }
  }
}
```

## 🧪 Testing Requirements

### Integration Test Scenarios
- [ ] **Port Configuration Flow**:
  - Test port input field appears when no port detected
  - Test port validation with valid/invalid inputs
  - Test preview loading with custom port
  - Test persistence across sessions

- [ ] **Error Handling Flow**:
  - Test invalid port input handling
  - Test network error handling
  - Test API timeout scenarios
  - Test fallback behavior

- [ ] **Command Execution Flow**:
  - Test start command execution
  - Test stop command execution
  - Test command status updates
  - Test error handling for command failures

### Manual Testing Checklist
- [ ] **Port Input Testing**:
  - Enter valid port numbers (1-65535)
  - Enter invalid port numbers (0, 65536, text)
  - Test port validation feedback
  - Test error message display

- [ ] **Preview Integration Testing**:
  - Test preview loading with custom port
  - Test preview refresh with port changes
  - Test fallback to detected port
  - Test persistence across page refreshes

- [ ] **Command Execution Testing**:
  - Test start command button
  - Test stop command button
  - Test loading states
  - Test error states

## 📝 Documentation Requirements

### Error Handling Documentation
- [ ] Document error scenarios and handling
- [ ] Document fallback behavior
- [ ] Document user error messages
- [ ] Document debugging information

### Integration Documentation
- [ ] Document integration points
- [ ] Document API endpoints
- [ ] Document error codes
- [ ] Document troubleshooting guide

## 🔍 Quality Assurance

### Error Handling Validation
- [ ] All error scenarios handled gracefully
- [ ] User-friendly error messages displayed
- [ ] Fallback mechanisms work correctly
- [ ] Error logging is comprehensive
- [ ] Recovery from error states works

### Integration Validation
- [ ] Port configuration integrates with existing preview
- [ ] Command execution integrates with terminal services
- [ ] No breaking changes to existing functionality
- [ ] Performance impact is minimal
- [ ] Security validation is maintained

## 🚀 Success Criteria
- [ ] Port configuration works with existing preview system
- [ ] Error handling is comprehensive and user-friendly
- [ ] Fallback behavior works correctly
- [ ] Command execution integrates properly
- [ ] All integration tests pass
- [ ] No breaking changes to existing functionality

## 🔄 Dependencies
- **Prerequisites**: Phase 2 (Core Implementation)
- **Dependents**: Phase 4 (Testing & Documentation)
- **External**: React, Zustand, existing preview system, backend APIs

## 📊 Progress Tracking
- **Current Progress**: 0%
- **Next Phase**: Phase 4 (Testing & Documentation)
- **Estimated Completion**: 0.5 hours from start

## 🎯 Deliverables
1. Validated port configuration integration
2. Comprehensive error handling implementation
3. Tested fallback behavior
4. Validated command execution integration
5. Integration test results

## 🔗 Related Files
- [Main Implementation](./preview-port-configuration-implementation.md)
- [Phase 2](./preview-port-configuration-phase-2.md)
- [Phase 4](./preview-port-configuration-phase-4.md)
- [Master Index](./preview-port-configuration-index.md) 