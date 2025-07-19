# Phase 4: Testing & Documentation - Preview Port Configuration

## 📋 Phase Overview
- **Phase**: 4 of 4
- **Title**: Testing & Documentation
- **Estimated Time**: 0.5 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Phase Goals
Complete comprehensive testing and documentation for the port configuration feature.

## 📋 Tasks

### 1. Write Unit Tests for New Components
- [ ] **File**: `tests/unit/PortConfigInput.test.jsx`
- [ ] **Time**: 15 minutes
- [ ] **Description**: Create comprehensive unit tests for PortConfigInput component
- [ ] **Requirements**:
  - Test port input validation (1-65535 range)
  - Test error state display
  - Test loading state during validation
  - Test component props handling
  - Test event handling (onChange, onBlur)
  - Test accessibility features
  - Achieve 90% code coverage

### 2. Write Unit Tests for Custom Hook
- [ ] **File**: `tests/unit/usePortConfiguration.test.js`
- [ ] **Time**: 10 minutes
- [ ] **Description**: Create unit tests for usePortConfiguration hook
- [ ] **Requirements**:
  - Test hook state management
  - Test port persistence in localStorage
  - Test validation logic
  - Test error handling
  - Test IDEStore integration
  - Test cleanup on unmount
  - Achieve 90% code coverage

### 3. Write Unit Tests for ProjectCommandButtons
- [ ] **File**: `tests/unit/ProjectCommandButtons.test.jsx`
- [ ] **Time**: 10 minutes
- [ ] **Description**: Create unit tests for ProjectCommandButtons component
- [ ] **Requirements**:
  - Test component rendering with different props
  - Test command button functionality
  - Test loading states
  - Test error handling
  - Test command execution callbacks
  - Test accessibility features
  - Achieve 90% code coverage

### 4. Test Port Configuration Scenarios
- [ ] **File**: `tests/integration/PreviewComponent.test.jsx`
- [ ] **Time**: 10 minutes
- [ ] **Description**: Test port configuration integration scenarios
- [ ] **Requirements**:
  - Test port input field appearance when no port detected
  - Test port validation integration
  - Test preview loading with custom port
  - Test fallback behavior
  - Test persistence across sessions
  - Test error handling scenarios

### 5. Test Command Execution Scenarios
- [ ] **File**: `tests/integration/ProjectCommandButtons.test.jsx`
- [ ] **Time**: 5 minutes
- [ ] **Description**: Test command execution integration scenarios
- [ ] **Requirements**:
  - Test start command execution
  - Test stop command execution
  - Test command status updates
  - Test error handling for command failures
  - Test integration with existing terminal services
  - Test real-time status updates

### 6. Update Component Documentation
- [ ] **File**: Various component files
- [ ] **Time**: 5 minutes
- [ ] **Description**: Update JSDoc documentation for all new components
- [ ] **Requirements**:
  - JSDoc comments for PortConfigInput component
  - JSDoc comments for usePortConfiguration hook
  - JSDoc comments for ProjectCommandButtons component
  - JSDoc comments for new IDEStore methods
  - JSDoc comments for new APIChatRepository methods
  - Component usage examples

### 7. Create User Guide
- [ ] **File**: `docs/features/preview-port-configuration.md`
- [ ] **Time**: 5 minutes
- [ ] **Description**: Create comprehensive user guide for port configuration feature
- [ ] **Requirements**:
  - Feature overview and benefits
  - Step-by-step usage instructions
  - Screenshots and examples
  - Troubleshooting guide
  - FAQ section
  - Best practices

## 🔧 Implementation Details

### Unit Test Structure
```javascript
// PortConfigInput.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PortConfigInput from '@/presentation/components/chat/main/PortConfigInput.jsx';

describe('PortConfigInput', () => {
  const mockOnPortChange = vi.fn();
  const mockOnPortValidate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders port input field', () => {
    render(
      <PortConfigInput
        onPortChange={mockOnPortChange}
        onPortValidate={mockOnPortValidate}
        initialPort={3000}
      />
    );

    expect(screen.getByLabelText(/port/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
  });

  test('validates port range correctly', async () => {
    render(
      <PortConfigInput
        onPortChange={mockOnPortChange}
        onPortValidate={mockOnPortValidate}
      />
    );

    const input = screen.getByLabelText(/port/i);
    
    // Test valid port
    fireEvent.change(input, { target: { value: '3000' } });
    await waitFor(() => {
      expect(mockOnPortValidate).toHaveBeenCalledWith(3000);
    });

    // Test invalid port
    fireEvent.change(input, { target: { value: '70000' } });
    await waitFor(() => {
      expect(screen.getByText(/port must be between 1 and 65535/i)).toBeInTheDocument();
    });
  });

  test('handles error states', async () => {
    mockOnPortValidate.mockResolvedValue({ valid: false, error: 'Port already in use' });
    
    render(
      <PortConfigInput
        onPortChange={mockOnPortChange}
        onPortValidate={mockOnPortValidate}
      />
    );

    const input = screen.getByLabelText(/port/i);
    fireEvent.change(input, { target: { value: '3000' } });
    
    await waitFor(() => {
      expect(screen.getByText('Port already in use')).toBeInTheDocument();
    });
  });
});
```

### Hook Test Structure
```javascript
// usePortConfiguration.test.js
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import usePortConfiguration from '@/hooks/usePortConfiguration.js';

// Mock IDEStore
vi.mock('@/infrastructure/stores/IDEStore.jsx', () => ({
  default: () => ({
    setCustomPort: vi.fn(),
    getCustomPort: vi.fn(),
    validateCustomPort: vi.fn(),
    clearCustomPort: vi.fn()
  })
}));

describe('usePortConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('initializes with default state', () => {
    const { result } = renderHook(() => usePortConfiguration());

    expect(result.current.customPort).toBeNull();
    expect(result.current.isValidating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('sets custom port successfully', async () => {
    const { result } = renderHook(() => usePortConfiguration());

    await act(async () => {
      const success = await result.current.setCustomPort(3000);
      expect(success).toBe(true);
    });

    expect(result.current.customPort).toBe(3000);
  });

  test('validates port correctly', async () => {
    const { result } = renderHook(() => usePortConfiguration());

    await act(async () => {
      const isValid = await result.current.validatePort(3000);
      expect(isValid).toBe(true);
    });

    expect(result.current.isValidating).toBe(false);
  });

  test('handles validation errors', async () => {
    const { result } = renderHook(() => usePortConfiguration());

    await act(async () => {
      const isValid = await result.current.validatePort(70000);
      expect(isValid).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
```

### Integration Test Structure
```javascript
// PreviewComponent.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PreviewComponent from '@/presentation/components/chat/main/PreviewComponent.jsx';

// Mock dependencies
vi.mock('@/hooks/usePortConfiguration.js');
vi.mock('@/infrastructure/repositories/APIChatRepository.jsx');

describe('PreviewComponent Integration', () => {
  const mockProject = {
    id: 1,
    name: 'Test Project',
    path: '/test/project'
  };

  test('shows port input when no port detected', () => {
    render(<PreviewComponent project={mockProject} port={null} />);

    expect(screen.getByLabelText(/port/i)).toBeInTheDocument();
    expect(screen.getByText(/configure port/i)).toBeInTheDocument();
  });

  test('loads preview with custom port', async () => {
    render(<PreviewComponent project={mockProject} port={null} />);

    const input = screen.getByLabelText(/port/i);
    fireEvent.change(input, { target: { value: '3000' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText(/preview loading/i)).toBeInTheDocument();
    });
  });

  test('shows command buttons', () => {
    render(<PreviewComponent project={mockProject} port={3000} />);

    expect(screen.getByText(/start/i)).toBeInTheDocument();
    expect(screen.getByText(/stop/i)).toBeInTheDocument();
  });
});
```

## 🧪 Testing Requirements

### Test Coverage Requirements
- **Unit Tests**: 90% coverage minimum
- **Integration Tests**: All critical user flows
- **E2E Tests**: Complete user journey testing
- **Performance Tests**: Response time validation

### Test Data Requirements
- **Valid Ports**: 3000, 8080, 5000, 4000
- **Invalid Ports**: 0, 65536, -1, "abc"
- **Edge Cases**: Port conflicts, network errors, timeouts
- **Command Types**: start, dev, build, test, stop

### Test Environment Setup
- **Mock Services**: APIChatRepository, IDEStore
- **Test Database**: Isolated test data
- **Network Simulation**: Success/failure scenarios
- **Browser Testing**: Chrome, Firefox compatibility

## 📝 Documentation Requirements

### Code Documentation
```javascript
/**
 * PortConfigInput Component
 * 
 * A reusable port input component with validation and error handling.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onPortChange - Callback when port changes
 * @param {Function} props.onPortValidate - Callback for port validation
 * @param {number} props.initialPort - Initial port value
 * @param {boolean} props.disabled - Whether input is disabled
 * 
 * @example
 * <PortConfigInput
 *   onPortChange={(port) => console.log('Port changed:', port)}
 *   onPortValidate={(port) => validatePort(port)}
 *   initialPort={3000}
 * />
 */
```

### User Documentation
```markdown
# Preview Port Configuration

## Overview
The Preview Port Configuration feature allows users to manually configure the port for their project preview when automatic port detection fails.

## Features
- Manual port input with validation
- Real-time port availability checking
- Start/Stop command execution
- Persistent port configuration
- Fallback to detected ports

## Usage

### Setting a Custom Port
1. When no port is detected, a port input field appears in the preview header
2. Enter a port number between 1 and 65535
3. The system validates the port automatically
4. If valid, the preview loads with the custom port

### Using Start/Stop Commands
1. Click the "Start" button to execute the project's start command
2. Click the "Stop" button to stop the development server
3. Monitor the execution status in real-time

## Troubleshooting

### Common Issues
- **Port already in use**: Try a different port number
- **Invalid port range**: Use ports between 1 and 65535
- **Command execution failed**: Check project configuration

### Error Messages
- "Port must be between 1 and 65535" - Invalid port range
- "Port already in use" - Port is occupied by another service
- "Port validation failed" - Network or server error
```

## 🔍 Quality Assurance

### Code Quality Checklist
- [ ] All components follow React best practices
- [ ] Hooks follow custom hook patterns
- [ ] Error handling is comprehensive
- [ ] Performance optimizations implemented
- [ ] Accessibility features included
- [ ] Security validation implemented

### Testing Checklist
- [ ] All unit tests pass with 90% coverage
- [ ] Integration tests cover all user flows
- [ ] E2E tests validate complete functionality
- [ ] Performance tests meet requirements
- [ ] Browser compatibility verified
- [ ] Error scenarios tested

## 🚀 Success Criteria
- [ ] All unit tests pass with 90% coverage
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Documentation is complete and accurate
- [ ] User guide is comprehensive
- [ ] Code quality standards met
- [ ] Performance requirements satisfied

## 🔄 Dependencies
- **Prerequisites**: Phase 3 (Integration)
- **Dependents**: None (final phase)
- **External**: Jest, React Testing Library, documentation tools

## 📊 Progress Tracking
- **Current Progress**: 0%
- **Next Phase**: None (final phase)
- **Estimated Completion**: 0.5 hours from start

## 🎯 Deliverables
1. Comprehensive unit test suite
2. Integration test suite
3. Complete JSDoc documentation
4. User guide and troubleshooting documentation
5. Test coverage report
6. Quality assurance validation

## 🔗 Related Files
- [Main Implementation](./preview-port-configuration-implementation.md)
- [Phase 3](./preview-port-configuration-phase-3.md)
- [Master Index](./preview-port-configuration-index.md) 