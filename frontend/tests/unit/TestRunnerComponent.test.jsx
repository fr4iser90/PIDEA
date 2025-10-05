import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestRunnerComponent from '../../src/presentation/components/tests/main/TestRunnerComponent';
import { useIDEStore } from '../../src/infrastructure/stores/IDEStore';
import { useTestRunner } from '../../src/hooks/useTestRunner';

// Mock dependencies
jest.mock('../../src/infrastructure/stores/IDEStore');
jest.mock('../../src/hooks/useTestRunner');
jest.mock('../../src/presentation/components/tests/main/TestConfiguration', () => {
  return function MockTestConfiguration({ onSelect, selected, testProjects }) {
    return (
      <div data-testid="test-configuration">
        <div>Test Configuration</div>
        {testProjects.map(project => (
          <button
            key={project.id}
            onClick={() => onSelect(project)}
            data-testid={`project-${project.id}`}
            className={selected?.id === project.id ? 'selected' : ''}
          >
            {project.name}
          </button>
        ))}
      </div>
    );
  };
});
jest.mock('../../src/presentation/components/tests/main/TestResultsViewer', () => {
  return function MockTestResultsViewer({ results, error, isRunning }) {
    if (isRunning) {
      return <div data-testid="test-results">Running tests...</div>;
    }
    if (error) {
      return <div data-testid="test-results">Error: {error}</div>;
    }
    if (!results || results.length === 0) {
      return <div data-testid="test-results">No test results</div>;
    }
    return <div data-testid="test-results">Test results: {results.length} tests</div>;
  };
});
jest.mock('../../src/presentation/components/tests/common/TestStatusBadge', () => {
  return function MockTestStatusBadge({ status }) {
    return <div data-testid="test-status-badge">Status: {status?.isRunning ? 'Running' : 'Ready'}</div>;
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('TestRunnerComponent', () => {
  const mockEventBus = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  };
  const mockActivePort = 3000;

  const mockIDEStore = {
    availableIDEs: [
      {
        port: 3000,
        workspacePath: '/path/to/workspace',
        name: 'Test IDE'
      }
    ],
    activePort: 3000
  };

  const mockTestRunner = {
    executeTest: jest.fn(),
    results: [],
    error: null,
    status: {
      isRunning: false,
      activeTestCount: 0,
      totalResults: 0
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    useIDEStore.mockReturnValue(mockIDEStore);
    useTestRunner.mockReturnValue(mockTestRunner);
    
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          config: {
            baseURL: 'http://localhost:3000',
            timeout: 30000,
            browsers: ['chromium']
          },
          projects: [
            { id: 'project-1', name: 'Login Tests', path: '/path/login.test.js' },
            { id: 'project-2', name: 'Dashboard Tests', path: '/path/dashboard.test.js' }
          ]
        }
      })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders test runner component', () => {
    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    expect(screen.getByText('🧪 Test Runner')).toBeInTheDocument();
    expect(screen.getByText('Test Configuration')).toBeInTheDocument();
    expect(screen.getByText('Status: Ready')).toBeInTheDocument();
  });

  test('displays workspace information', () => {
    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    expect(screen.getByText('Workspace: /path/to/workspace')).toBeInTheDocument();
    expect(screen.getByText('Project: Test_IDE')).toBeInTheDocument();
  });

  test('loads test configuration on mount', async () => {
    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/projects/Test_IDE/tests/playwright/config');
    });
  });

  test('loads test projects on mount', async () => {
    render(<TestRunnerComponent eventBus={mockActivePort} activePort={mockActivePort} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/projects/Test_IDE/tests/playwright/projects');
    });
  });

  test('displays test projects', async () => {
    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('project-project-1')).toBeInTheDocument();
      expect(screen.getByTestId('project-project-2')).toBeInTheDocument();
    });
  });

  test('handles test selection', async () => {
    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    await waitFor(() => {
      const loginProject = screen.getByTestId('project-project-1');
      fireEvent.click(loginProject);
    });
    
    expect(screen.getByText('Selected: Login Tests')).toBeInTheDocument();
  });

  test('executes tests when run button is clicked', async () => {
    const mockExecuteTest = jest.fn().mockResolvedValue({ success: true });
    useTestRunner.mockReturnValue({
      ...mockTestRunner,
      executeTest: mockExecuteTest
    });

    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    // Select a test first
    await waitFor(() => {
      const loginProject = screen.getByTestId('project-project-1');
      fireEvent.click(loginProject);
    });
    
    // Click run button
    const runButton = screen.getByText('Run Tests');
    fireEvent.click(runButton);
    
    expect(mockExecuteTest).toHaveBeenCalledWith(
      { id: 'project-1', name: 'Login Tests', path: '/path/login.test.js' },
      {
        workspacePath: '/path/to/workspace',
        projectId: 'Test_IDE',
        config: {
          baseURL: 'http://localhost:3000',
          timeout: 30000,
          browsers: ['chromium']
        }
      }
    );
  });

  test('disables run button when no test is selected', () => {
    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    const runButton = screen.getByText('Run Tests');
    expect(runButton).toBeDisabled();
  });

  test('disables run button when tests are running', () => {
    useTestRunner.mockReturnValue({
      ...mockTestRunner,
      status: { isRunning: true, activeTestCount: 1, totalResults: 0 }
    });

    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    const runButton = screen.getByText('Running...');
    expect(runButton).toBeDisabled();
  });

  test('shows stop button when tests are running', () => {
    useTestRunner.mockReturnValue({
      ...mockTestRunner,
      status: { isRunning: true, activeTestCount: 1, totalResults: 0 }
    });

    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    expect(screen.getByText('Stop Tests')).toBeInTheDocument();
  });

  test('handles test execution error', () => {
    useTestRunner.mockReturnValue({
      ...mockTestRunner,
      error: 'Test execution failed'
    });

    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    expect(screen.getByText('Error: Test execution failed')).toBeInTheDocument();
  });

  test('displays test results', () => {
    const mockResults = [
      { testId: 'test-1', success: true, duration: 1000 },
      { testId: 'test-2', success: false, error: 'Test failed' }
    ];
    
    useTestRunner.mockReturnValue({
      ...mockTestRunner,
      results: mockResults
    });

    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    expect(screen.getByText('Test results: 2 tests')).toBeInTheDocument();
  });

  test('handles configuration update', async () => {
    const mockConfigUpdate = jest.fn();
    
    // Mock TestConfiguration component to call onConfigUpdate
    jest.doMock('../../src/presentation/components/tests/main/TestConfiguration', () => {
      return function MockTestConfiguration({ onConfigUpdate }) {
        return (
          <div data-testid="test-configuration">
            <button onClick={() => onConfigUpdate({ baseURL: 'http://localhost:4000' })}>
              Update Config
            </button>
          </div>
        );
      };
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    const updateButton = screen.getByText('Update Config');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/projects/Test_IDE/tests/playwright/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { baseURL: 'http://localhost:4000' } })
      });
    });
  });

  test('handles project creation', async () => {
    const mockCreateProject = jest.fn();
    
    // Mock TestConfiguration component to call onCreateProject
    jest.doMock('../../src/presentation/components/tests/main/TestConfiguration', () => {
      return function MockTestConfiguration({ onCreateProject }) {
        return (
          <div data-testid="test-configuration">
            <button onClick={() => onCreateProject({ name: 'New Project', description: 'Test project' })}>
              Create Project
            </button>
          </div>
        );
      };
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/projects/Test_IDE/tests/playwright/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Project', description: 'Test project' })
      });
    });
  });

  test('handles missing workspace path', () => {
    useIDEStore.mockReturnValue({
      ...mockIDEStore,
      availableIDEs: []
    });

    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    expect(screen.getByText('No test selected')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));

    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    // Component should still render despite API error
    expect(screen.getByText('🧪 Test Runner')).toBeInTheDocument();
  });

  test('updates status badge based on test runner status', () => {
    useTestRunner.mockReturnValue({
      ...mockTestRunner,
      status: { isRunning: true, activeTestCount: 1, totalResults: 5 }
    });

    render(<TestRunnerComponent eventBus={mockEventBus} activePort={mockActivePort} />);
    
    expect(screen.getByText('Status: Running')).toBeInTheDocument();
  });
});
