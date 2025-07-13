# Phase 4: Integration and Testing - CORRECTED

## Overview
Integrate all components together and perform comprehensive testing of the phase grouping functionality.

## Current State Analysis
- **Backend**: Phase 1 components need to be implemented first
- **Frontend API**: Phase 2 components need to be implemented first
- **Frontend Components**: Phase 3 components need to be implemented first
- **Testing Infrastructure**: Jest and testing libraries are available
- **Integration Points**: Need to connect with existing systems

## Tasks

### 1. Integrate all components together
**File**: `frontend/src/App.jsx`
**Time**: 30 minutes
**Status**: ❌ Not implemented

```jsx
import React, { useState } from 'react';
import TasksPanelComponent from '@/presentation/components/TasksPanelComponent';
import './App.css';

function App() {
  const [selectedProject, setSelectedProject] = useState('project-1');
  const [selectedTask, setSelectedTask] = useState(null);

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    console.log('Selected task:', task);
  };

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    setSelectedTask(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>PIDEA - Task Management</h1>
        <div className="project-selector">
          <label htmlFor="project-select">Project:</label>
          <select 
            id="project-select"
            value={selectedProject}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            <option value="project-1">Project 1</option>
            <option value="project-2">Project 2</option>
            <option value="project-3">Project 3</option>
          </select>
        </div>
      </header>

      <main className="App-main">
        <div className="content-layout">
          <aside className="tasks-sidebar">
            <TasksPanelComponent
              projectId={selectedProject}
              onTaskSelect={handleTaskSelect}
            />
          </aside>
          
          <section className="task-details">
            {selectedTask ? (
              <div className="task-detail-panel">
                <h2>{selectedTask.title}</h2>
                <div className="task-meta">
                  <span className={`status status-${selectedTask.status}`}>
                    {selectedTask.status}
                  </span>
                  {selectedTask.priority && (
                    <span className={`priority priority-${selectedTask.priority}`}>
                      {selectedTask.priority}
                    </span>
                  )}
                  {selectedTask.estimated_hours && (
                    <span className="estimate">
                      {selectedTask.estimated_hours}h
                    </span>
                  )}
                </div>
                {selectedTask.description && (
                  <p className="task-description">{selectedTask.description}</p>
                )}
              </div>
            ) : (
              <div className="no-task-selected">
                <p>Select a task to view details</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
```

### 2. Test phase grouping functionality
**File**: `frontend/tests/integration/TaskPhaseGrouping.test.js`
**Time**: 45 minutes
**Status**: ❌ Not implemented

```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TasksPanelComponent from '@/presentation/components/TasksPanelComponent';
import { APIChatRepository } from '@/infrastructure/api/APIChatRepository';

// Mock the API repository
jest.mock('@/infrastructure/api/APIChatRepository');

const mockAPIRepository = {
  getTasksByPhases: jest.fn(),
  executePhase: jest.fn(),
  executePhases: jest.fn()
};

APIChatRepository.mockImplementation(() => mockAPIRepository);

describe('Task Phase Grouping Integration', () => {
  const mockGroupedTasks = {
    setup: {
      name: 'setup',
      tasks: [
        { id: '1', title: 'Setup Database', status: 'completed', phase: 'setup' },
        { id: '2', title: 'Configure Environment', status: 'pending', phase: 'setup' }
      ],
      totalTasks: 2,
      completedTasks: 1
    },
    implementation: {
      name: 'implementation',
      tasks: [
        { id: '3', title: 'Create API', status: 'pending', phase: 'implementation' },
        { id: '4', title: 'Build UI', status: 'pending', phase: 'implementation' }
      ],
      totalTasks: 2,
      completedTasks: 0
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAPIRepository.getTasksByPhases.mockResolvedValue(mockGroupedTasks);
  });

  describe('Component Rendering', () => {
    it('should render phase groups correctly', async () => {
      render(<TasksPanelComponent projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByText('Setup')).toBeInTheDocument();
        expect(screen.getByText('Implementation')).toBeInTheDocument();
      });

      expect(screen.getByText('1/2 tasks')).toBeInTheDocument();
      expect(screen.getByText('0/2 tasks')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<TasksPanelComponent projectId="test-project" />);
      
      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      mockAPIRepository.getTasksByPhases.mockRejectedValue(
        new Error('Failed to load tasks')
      );

      render(<TasksPanelComponent projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Tasks')).toBeInTheDocument();
        expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
      });
    });

    it('should show no tasks message when no tasks exist', async () => {
      mockAPIRepository.getTasksByPhases.mockResolvedValue({});

      render(<TasksPanelComponent projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByText('No tasks found for this project.')).toBeInTheDocument();
      });
    });
  });

  describe('Phase Interaction', () => {
    it('should expand/collapse phase groups when clicked', async () => {
      render(<TasksPanelComponent projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByText('Setup')).toBeInTheDocument();
      });

      const setupHeader = screen.getByText('Setup').closest('.phase-header');
      fireEvent.click(setupHeader);

      // Check if tasks are visible
      expect(screen.getByText('Setup Database')).toBeInTheDocument();
      expect(screen.getByText('Configure Environment')).toBeInTheDocument();
    });

    it('should execute phase when execute button is clicked', async () => {
      mockAPIRepository.executePhase.mockResolvedValue({
        phaseName: 'setup',
        totalTasks: 2,
        executedTasks: 1,
        failedTasks: 0
      });

      render(<TasksPanelComponent projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByText('Setup')).toBeInTheDocument();
      });

      const setupHeader = screen.getByText('Setup').closest('.phase-header');
      fireEvent.click(setupHeader);

      const executeButton = screen.getByText('Execute setup');
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(mockAPIRepository.executePhase).toHaveBeenCalledWith('test-project', 'setup');
      });
    });

    it('should handle phase execution errors', async () => {
      mockAPIRepository.executePhase.mockRejectedValue(
        new Error('Execution failed')
      );

      render(<TasksPanelComponent projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByText('Setup')).toBeInTheDocument();
      });

      const setupHeader = screen.getByText('Setup').closest('.phase-header');
      fireEvent.click(setupHeader);

      const executeButton = screen.getByText('Execute setup');
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(mockAPIRepository.executePhase).toHaveBeenCalled();
      });
    });
  });

  describe('Task Selection', () => {
    it('should call onTaskSelect when task is clicked', async () => {
      const mockOnTaskSelect = jest.fn();

      render(
        <TasksPanelComponent 
          projectId="test-project" 
          onTaskSelect={mockOnTaskSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Setup')).toBeInTheDocument();
      });

      const setupHeader = screen.getByText('Setup').closest('.phase-header');
      fireEvent.click(setupHeader);

      const taskItem = screen.getByText('Setup Database');
      fireEvent.click(taskItem);

      expect(mockOnTaskSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          title: 'Setup Database',
          status: 'completed'
        })
      );
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate overall progress correctly', async () => {
      render(<TasksPanelComponent projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByText('25% Complete')).toBeInTheDocument();
      });
    });

    it('should show correct phase progress', async () => {
      render(<TasksPanelComponent projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByText('Setup')).toBeInTheDocument();
      });

      const setupHeader = screen.getByText('Setup').closest('.phase-header');
      fireEvent.click(setupHeader);

      // Check progress bar and percentage
      const progressText = screen.getByText('50%');
      expect(progressText).toBeInTheDocument();
    });
  });

  describe('Execute All Phases', () => {
    it('should execute all phases when execute all button is clicked', async () => {
      mockAPIRepository.executePhases.mockResolvedValue({
        projectId: 'test-project',
        totalPhases: 2,
        executedPhases: 2,
        failedPhases: 0
      });

      render(<TasksPanelComponent projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByText('Execute All Phases')).toBeInTheDocument();
      });

      const executeAllButton = screen.getByText('Execute All Phases');
      fireEvent.click(executeAllButton);

      await waitFor(() => {
        expect(mockAPIRepository.executePhases).toHaveBeenCalledWith(
          'test-project',
          ['setup', 'implementation']
        );
      });
    });
  });
});
```

### 3. Test phase execution flow
**File**: `frontend/tests/e2e/TaskPhaseGrouping.test.js`
**Time**: 30 minutes
**Status**: ❌ Not implemented

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Task Phase Grouping E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/projects/*/tasks/phases', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            phases: {
              setup: {
                name: 'setup',
                tasks: [
                  { id: '1', title: 'Setup Database', status: 'completed', phase: 'setup' },
                  { id: '2', title: 'Configure Environment', status: 'pending', phase: 'setup' }
                ],
                totalTasks: 2,
                completedTasks: 1
              },
              implementation: {
                name: 'implementation',
                tasks: [
                  { id: '3', title: 'Create API', status: 'pending', phase: 'implementation' },
                  { id: '4', title: 'Build UI', status: 'pending', phase: 'implementation' }
                ],
                totalTasks: 2,
                completedTasks: 0
              }
            }
          }
        })
      });
    });

    await page.route('**/api/projects/*/phases/*/execute', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            phaseName: route.url().split('/').pop(),
            totalTasks: 2,
            executedTasks: 1,
            failedTasks: 0
          }
        })
      });
    });

    await page.goto('http://localhost:3000');
  });

  test('should display phase groups correctly', async ({ page }) => {
    await expect(page.locator('text=Setup')).toBeVisible();
    await expect(page.locator('text=Implementation')).toBeVisible();
    await expect(page.locator('text=1/2 tasks')).toBeVisible();
    await expect(page.locator('text=0/2 tasks')).toBeVisible();
  });

  test('should expand phase groups when clicked', async ({ page }) => {
    const setupHeader = page.locator('text=Setup').locator('..').locator('.phase-header');
    await setupHeader.click();

    await expect(page.locator('text=Setup Database')).toBeVisible();
    await expect(page.locator('text=Configure Environment')).toBeVisible();
  });

  test('should execute phase when execute button is clicked', async ({ page }) => {
    const setupHeader = page.locator('text=Setup').locator('..').locator('.phase-header');
    await setupHeader.click();

    const executeButton = page.locator('text=Execute setup');
    await executeButton.click();

    // Wait for execution to complete
    await expect(page.locator('text=Executing...')).toBeVisible();
    await expect(page.locator('text=Execute setup')).toBeVisible();
  });

  test('should select task when clicked', async ({ page }) => {
    const setupHeader = page.locator('text=Setup').locator('..').locator('.phase-header');
    await setupHeader.click();

    const taskItem = page.locator('text=Setup Database');
    await taskItem.click();

    // Check if task details are shown
    await expect(page.locator('text=Setup Database')).toBeVisible();
  });

  test('should show overall progress', async ({ page }) => {
    await expect(page.locator('text=25% Complete')).toBeVisible();
  });

  test('should execute all phases', async ({ page }) => {
    const executeAllButton = page.locator('text=Execute All Phases');
    await executeAllButton.click();

    // Wait for execution to complete
    await expect(page.locator('text=Executing...')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/projects/*/tasks/phases', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Database connection failed'
        })
      });
    });

    await page.reload();

    await expect(page.locator('text=Error Loading Tasks')).toBeVisible();
    await expect(page.locator('text=Database connection failed')).toBeVisible();
  });

  test('should refresh tasks when refresh button is clicked', async ({ page }) => {
    const refreshButton = page.locator('text=Refresh Tasks');
    await refreshButton.click();

    // Verify that tasks are reloaded
    await expect(page.locator('text=Setup')).toBeVisible();
    await expect(page.locator('text=Implementation')).toBeVisible();
  });
});
```

### 4. Add error handling for phase operations
**File**: `frontend/src/presentation/components/ErrorBoundary.jsx`
**Time**: 20 minutes
**Status**: ❌ Not implemented

```jsx
import React from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console or error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>The task management system encountered an error.</p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre>{this.state.error.toString()}</pre>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
            
            <div className="error-actions">
              <button onClick={this.handleRetry} className="retry-button">
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="reload-button"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default ErrorBoundary;
```

### 5. Performance testing with large task sets
**File**: `frontend/tests/performance/TaskPhaseGrouping.test.js`
**Time**: 25 minutes
**Status**: ❌ Not implemented

```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TasksPanelComponent from '@/presentation/components/TasksPanelComponent';

// Generate large dataset for performance testing
const generateLargeTaskSet = (numPhases = 10, tasksPerPhase = 50) => {
  const phases = {};
  
  for (let i = 0; i < numPhases; i++) {
    const phaseName = `phase-${i + 1}`;
    const tasks = [];
    
    for (let j = 0; j < tasksPerPhase; j++) {
      tasks.push({
        id: `${phaseName}-task-${j + 1}`,
        title: `Task ${j + 1} in ${phaseName}`,
        status: j % 3 === 0 ? 'completed' : 'pending',
        phase: phaseName,
        description: `Description for task ${j + 1} in phase ${phaseName}`,
        priority: j % 4 === 0 ? 'high' : j % 4 === 1 ? 'medium' : 'low',
        estimated_hours: Math.floor(Math.random() * 8) + 1
      });
    }
    
    phases[phaseName] = {
      name: phaseName,
      tasks,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length
    };
  }
  
  return phases;
};

describe('Task Phase Grouping Performance', () => {
  const mockAPIRepository = {
    getTasksByPhases: jest.fn(),
    executePhase: jest.fn(),
    executePhases: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render large task sets efficiently', () => {
    const largeTaskSet = generateLargeTaskSet(5, 20); // 100 tasks total
    mockAPIRepository.getTasksByPhases.mockResolvedValue(largeTaskSet);

    const startTime = performance.now();
    
    render(<TasksPanelComponent projectId="test-project" />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 100ms for 100 tasks
    expect(renderTime).toBeLessThan(100);
  });

  test('should handle very large task sets', () => {
    const veryLargeTaskSet = generateLargeTaskSet(10, 100); // 1000 tasks total
    mockAPIRepository.getTasksByPhases.mockResolvedValue(veryLargeTaskSet);

    const startTime = performance.now();
    
    render(<TasksPanelComponent projectId="test-project" />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 500ms for 1000 tasks
    expect(renderTime).toBeLessThan(500);
  });

  test('should maintain performance during phase expansion', async () => {
    const largeTaskSet = generateLargeTaskSet(3, 30); // 90 tasks total
    mockAPIRepository.getTasksByPhases.mockResolvedValue(largeTaskSet);

    render(<TasksPanelComponent projectId="test-project" />);

    // Wait for initial render
    await screen.findByText('phase-1');

    const phaseHeader = screen.getByText('phase-1').closest('.phase-header');
    
    const startTime = performance.now();
    fireEvent.click(phaseHeader);
    const endTime = performance.now();
    const expandTime = endTime - startTime;

    // Should expand within 50ms
    expect(expandTime).toBeLessThan(50);
  });

  test('should handle rapid phase switching', async () => {
    const largeTaskSet = generateLargeTaskSet(5, 20); // 100 tasks total
    mockAPIRepository.getTasksByPhases.mockResolvedValue(largeTaskSet);

    render(<TasksPanelComponent projectId="test-project" />);

    await screen.findByText('phase-1');

    const phaseHeaders = screen.getAllByText(/phase-\d+/);
    
    const startTime = performance.now();
    
    // Rapidly click through all phases
    for (const header of phaseHeaders) {
      fireEvent.click(header.closest('.phase-header'));
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should handle rapid switching within 200ms
    expect(totalTime).toBeLessThan(200);
  });

  test('should maintain memory usage under control', () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    const largeTaskSet = generateLargeTaskSet(10, 50); // 500 tasks total
    mockAPIRepository.getTasksByPhases.mockResolvedValue(largeTaskSet);

    render(<TasksPanelComponent projectId="test-project" />);

    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 10MB)
    if (performance.memory) {
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    }
  });
});
```

## Success Criteria
- [ ] All components integrate seamlessly together
- [ ] Phase grouping functionality works correctly in all scenarios
- [ ] Phase execution flow handles all edge cases
- [ ] Error handling works for all error scenarios
- [ ] Performance is acceptable with large task sets
- [ ] All tests pass with comprehensive coverage
- [ ] E2E tests verify complete user workflows
- [ ] Error boundaries catch and handle component errors gracefully

## Dependencies
- React Testing Library for component testing
- Playwright for E2E testing
- Performance API for performance testing
- Error boundary pattern for error handling
- All previous phases (1, 2, 3) must be completed first

## Integration with Existing Systems
- **Testing Infrastructure**: Uses existing Jest and testing libraries
- **Error Handling**: Extends existing error handling patterns
- **Performance Monitoring**: Uses existing performance measurement tools
- **Component Architecture**: Follows existing React component patterns

## Notes
- Comprehensive testing covers all user scenarios
- Performance testing ensures scalability
- Error handling provides graceful degradation
- E2E tests verify complete user workflows
- Integration tests ensure component compatibility
- Depends on all previous phases being completed successfully
- Uses existing testing infrastructure and patterns 