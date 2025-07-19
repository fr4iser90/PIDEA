# Phase 1: Foundation Setup - Preview Port Configuration

## 📋 Phase Overview
- **Phase**: 1 of 4
- **Title**: Foundation Setup
- **Estimated Time**: 1 hour
- **Status**: Planning
- **Progress**: 0%

## 🎯 Phase Goals
Set up the foundational components and structure for the port configuration feature.

## 📋 Tasks

### 1. Create PortConfigInput Component
- [ ] **File**: `frontend/src/presentation/components/chat/main/PortConfigInput.jsx`
- [ ] **Time**: 20 minutes
- [ ] **Description**: Create a reusable port input component with validation
- [ ] **Requirements**:
  - Number input with port range validation (1-65535)
  - Real-time validation feedback
  - Error state handling
  - Loading state for validation
  - Consistent styling with existing components
  - Follow existing component patterns from PreviewComponent.jsx

### 2. Create usePortConfiguration Hook
- [ ] **File**: `frontend/src/hooks/usePortConfiguration.js`
- [ ] **Time**: 20 minutes
- [ ] **Description**: Create custom hook for port configuration state management
- [ ] **Requirements**:
  - Port validation logic
  - Port persistence in localStorage
  - Integration with IDEStore
  - Error handling and state management
  - TypeScript-like JSDoc documentation
  - Follow existing hook patterns from useAnalysisCache.js

### 3. Add Port Configuration Methods to IDEStore
- [ ] **File**: `frontend/src/infrastructure/stores/IDEStore.jsx`
- [ ] **Time**: 15 minutes
- [ ] **Description**: Extend IDEStore with custom port management functionality
- [ ] **Requirements**:
  - `setCustomPort(port)` method
  - `getCustomPort()` method
  - `validateCustomPort(port)` method
  - `clearCustomPort()` method
  - Persistence with existing store structure
  - Integration with existing `isValidPortRange` method

### 4. Create ProjectCommandButtons Component
- [ ] **File**: `frontend/src/presentation/components/chat/main/ProjectCommandButtons.jsx`
- [ ] **Time**: 20 minutes
- [ ] **Description**: Create component for start/stop command execution
- [ ] **Requirements**:
  - Integration with existing project database schema
  - Support for start_command, dev_command, build_command, test_command
  - Start/Stop button functionality
  - Loading states and error handling
  - Real-time execution status
  - Integration with existing terminal execution services

### 5. Set Up Basic Styling Structure
- [ ] **File**: `frontend/src/css/main/preview.css`
- [ ] **Time**: 5 minutes
- [ ] **Description**: Add CSS classes for port configuration UI
- [ ] **Requirements**:
  - `.port-config` container styles
  - `.port-input` input field styles
  - `.port-validation` feedback styles
  - `.port-error` error state styles
  - `.project-commands` button container styles
  - `.command-btn` button styles
  - `.command-executing` loading state styles
  - Responsive design considerations
  - Follow existing CSS variable patterns

## 🔧 Implementation Details

### PortConfigInput Component Structure
```jsx
// Basic component structure following existing patterns
import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';

const PortConfigInput = ({ 
  onPortChange, 
  onPortValidate, 
  initialPort, 
  disabled = false 
}) => {
  // Component implementation following PreviewComponent patterns
};
```

### usePortConfiguration Hook Structure
```javascript
// Basic hook structure following existing patterns
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';

const usePortConfiguration = () => {
  // Hook implementation following useAnalysisCache patterns
  return {
    customPort,
    setCustomPort,
    validatePort,
    isValidating,
    error
  };
};
```

### ProjectCommandButtons Component Structure
```jsx
// Basic component structure following existing patterns
import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository.jsx';

const ProjectCommandButtons = ({ 
  projectId, 
  activePort, 
  onCommandExecute,
  className = '' 
}) => {
  const [projectCommands, setProjectCommands] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentCommand, setCurrentCommand] = useState(null);
  const [error, setError] = useState(null);
  
  // Component implementation following PreviewComponent patterns
};
```

### IDEStore Extension
```javascript
// New methods to add to IDEStore following existing patterns
setCustomPort: async (port) => {
  // Implementation using existing validatePort method
},
getCustomPort: () => {
  // Implementation using existing persistence
},
validateCustomPort: async (port) => {
  // Implementation using existing isValidPortRange
},
// New project command methods
getProjectCommands: async (projectId) => {
  // Implementation using APIChatRepository
},
executeProjectCommand: async (projectId, commandType) => {
  // Implementation using existing terminal services
}
```

## 🧪 Testing Requirements

### Unit Tests
- [ ] **File**: `tests/unit/PortConfigInput.test.jsx`
- [ ] **Test Cases**:
  - Port input validation (1-65535 range)
  - Error state display
  - Loading state during validation
  - Component props handling
  - Event handling (onChange, onBlur)

### Integration Tests
- [ ] **File**: `tests/integration/usePortConfiguration.test.js`
- [ ] **Test Cases**:
  - Hook state management
  - Port persistence
  - Validation logic
  - Error handling
  - IDEStore integration

## 📝 Documentation Requirements

### Code Documentation
- [ ] JSDoc comments for PortConfigInput component
- [ ] JSDoc comments for usePortConfiguration hook
- [ ] JSDoc comments for new IDEStore methods
- [ ] Component usage examples

### User Documentation
- [ ] Component API documentation
- [ ] Hook usage examples
- [ ] Integration guide

## 🔍 Quality Assurance

### Code Review Checklist
- [ ] Component follows React best practices
- [ ] Hook follows custom hook patterns
- [ ] Store methods integrate properly
- [ ] CSS follows existing design system
- [ ] Error handling is comprehensive
- [ ] Performance considerations addressed

### Testing Checklist
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Component renders correctly
- [ ] Hook state management works
- [ ] Store persistence functions
- [ ] Error states display properly

## 🚀 Success Criteria
- [ ] PortConfigInput component created and functional
- [ ] usePortConfiguration hook created and tested
- [ ] IDEStore extended with port methods
- [ ] Basic styling structure in place
- [ ] All tests passing
- [ ] Documentation complete

## 🔄 Dependencies
- **Prerequisites**: None (foundation phase)
- **Dependents**: Phase 2 (Core Implementation)
- **External**: React, Zustand, existing IDEStore

## 📊 Progress Tracking
- **Current Progress**: 0%
- **Next Phase**: Phase 2 - Core Implementation
- **Estimated Completion**: 1 hour from start

## 🎯 Deliverables
1. `PortConfigInput.jsx` - Reusable port input component
2. `usePortConfiguration.js` - Custom hook for port management
3. `ProjectCommandButtons.jsx` - Start/Stop command execution component
4. Enhanced `IDEStore.jsx` - Extended with port and command methods
5. Updated `preview.css` - Port configuration and command button styles
6. Unit and integration tests
7. Documentation and examples

## 🔗 Related Files
- [Main Implementation](./preview-port-configuration-implementation.md)
- [Phase 2](./preview-port-configuration-phase-2.md)
- [Master Index](./preview-port-configuration-index.md)

## ✅ Validation Results - 2024-12-19

### Codebase Analysis
- **PreviewComponent.jsx**: ✅ Exists at correct path with proper structure
- **IDEStore.jsx**: ✅ Exists with Zustand store pattern and port management
- **APIChatRepository.jsx**: ✅ Exists with proper API configuration
- **preview.css**: ✅ Exists with comprehensive styling system
- **hooks/ directory**: ✅ Exists with proper patterns
- **Import aliases**: ✅ `@/` alias correctly configured in vite.config.js

### Implementation Patterns
- **Component Structure**: Follows existing PreviewComponent patterns
- **Hook Patterns**: Aligns with useAnalysisCache.js structure
- **Store Integration**: Uses existing IDEStore persistence and validation
- **Styling**: Follows existing CSS variable system
- **Error Handling**: Uses existing logger and notification patterns

### File Paths Validation
- ✅ All planned file paths match actual project structure
- ✅ Import statements use correct `@/` alias pattern
- ✅ Directory structure follows existing conventions
- ✅ Component placement aligns with existing organization 