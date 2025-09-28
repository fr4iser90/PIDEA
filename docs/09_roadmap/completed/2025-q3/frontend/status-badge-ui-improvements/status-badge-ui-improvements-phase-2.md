# Phase 2: Frontend Script Integration

## 📋 Phase Overview
- **Phase**: 2 of 3
- **Duration**: 3 hours
- **Status**: Planning
- **Progress**: 0%
- **Dependencies**: Phase 1 (Backend Script Execution Service)

## 🎯 Objectives
Modify the existing IDE start button in SidebarLeft to execute scripts instead of making API calls, and add proper feedback for script execution.

## 📝 Tasks

### 2.1 Modify Existing IDE Start Button (1 hour)
- [ ] Update `frontend/src/presentation/components/SidebarLeft.jsx`
- [ ] Replace API call with script execution call
- [ ] Add script execution state management
- [ ] Implement loading states during script execution
- [ ] Add error handling for script failures

### 2.2 Create IDEScriptService (1 hour)
- [ ] Create `frontend/src/application/services/IDEScriptService.js`
- [ ] Implement script execution API calls
- [ ] Add script execution state management
- [ ] Create script execution result parsing
- [ ] Add error handling and retry logic

### 2.3 Add Script Execution Feedback (1 hour)
- [ ] Create `frontend/src/presentation/components/ide/ScriptExecutionFeedback.jsx`
- [ ] Implement execution progress display
- [ ] Add success/error feedback
- [ ] Create script output display
- [ ] Add execution time tracking

## 🔧 Technical Implementation

### IDEStartModal Component Structure
```jsx
const IDEStartModal = ({ isOpen, onClose, onIDEStarted }) => {
  const [formData, setFormData] = useState({
    ideType: 'cursor',
    port: 'auto',
    workspacePath: '',
    customExecutable: ''
  });
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <IDETypeSelector value={formData.ideType} onChange={handleIDETypeChange} />
        <PortSelector value={formData.port} ideType={formData.ideType} onChange={handlePortChange} />
        <WorkspaceSelector value={formData.workspacePath} onChange={handleWorkspaceChange} />
        <CustomExecutableInput value={formData.customExecutable} onChange={handleExecutableChange} />
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Start IDE</button>
        </div>
      </form>
    </Modal>
  );
};
```

### Port Selection Logic
```javascript
const getPortRange = (ideType) => {
  const ranges = {
    cursor: { start: 9222, end: 9231 },
    vscode: { start: 9232, end: 9241 },
    windsurf: { start: 9242, end: 9251 }
  };
  return ranges[ideType] || ranges.cursor;
};

const findAvailablePort = async (ideType) => {
  const { start, end } = getPortRange(ideType);
  // Implementation for finding available port
};
```

### Workspace Path Validation
```javascript
const validateWorkspacePath = (path) => {
  // Check if path exists
  // Check if it's a directory
  // Check permissions
  // Sanitize path for security
};
```

### Script Integration
```javascript
const executeStartScript = async (config) => {
  const scriptPath = getScriptPath(config.ideType, process.platform);
  const args = buildScriptArgs(config);
  // Execute script with proper error handling
};
```

## 🧪 Testing Requirements

### Unit Tests
- [ ] Test IDEStartModal component rendering
- [ ] Test form validation logic
- [ ] Test port selection functionality
- [ ] Test workspace path validation
- [ ] Test IDE type selection

### Integration Tests
- [ ] Test modal with backend integration
- [ ] Test script execution
- [ ] Test error handling scenarios
- [ ] Test cross-platform compatibility

## 📋 Acceptance Criteria
- [ ] Modal opens and closes properly
- [ ] Form validation works correctly
- [ ] Port selection functions as expected
- [ ] Workspace path selector works
- [ ] IDE type selection is functional
- [ ] Script integration works on all platforms
- [ ] Error handling provides clear feedback
- [ ] All tests pass

## 🚀 Next Phase
After completing Phase 2, proceed to [Phase 3: Enhanced Status Display](./status-badge-ui-improvements-phase-3.md) for implementing detailed status information and real-time updates.

## 📝 Notes
- Ensure the modal is user-friendly and intuitive
- Pay attention to cross-platform compatibility
- Consider security implications of script execution
- Make sure error messages are helpful and actionable
