import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectCommandButtons from '../../frontend/src/presentation/components/chat/main/ProjectCommandButtons.jsx';

// Mock the ChatRepository
jest.mock('../../frontend/src/infrastructure/repositories/ChatRepository.jsx', () => {
  return jest.fn().mockImplementation(() => ({
    getProjectCommands: jest.fn(),
    executeProjectCommand: jest.fn()
  }));
});

// Mock the logger
jest.mock('../../frontend/src/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ProjectCommandButtons', () => {
  const defaultProps = {
    projectId: 'test-project-1',
    activePort: 9222,
    onCommandExecute: jest.fn()
  };

  let mockApiRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked ChatRepository instance
    const ChatRepository = require('../../frontend/src/infrastructure/repositories/ChatRepository.jsx');
    mockApiRepository = new ChatRepository();
  });

  test('renders command buttons', () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
      data: {
        start_command: 'npm start',
        dev_command: 'npm run dev',
        build_command: 'npm run build',
        test_command: 'npm test'
      }
    });

    render(<ProjectCommandButtons {...defaultProps} />);
    
    expect(screen.getByText('Project Commands')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Dev')).toBeInTheDocument();
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Stop')).toBeInTheDocument();
  });

  test('loads project commands on mount', async () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
      data: {
        start_command: 'npm start',
        dev_command: 'npm run dev'
      }
    });

    render(<ProjectCommandButtons {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockApiRepository.getProjectCommands).toHaveBeenCalledWith('test-project-1');
    });
  });

  test('executes command when button is clicked', async () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
      data: {
        start_command: 'npm start'
      }
    });

    mockApiRepository.executeProjectCommand.mockResolvedValue({
      message: 'Command executed successfully'
    });

    render(<ProjectCommandButtons {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start').closest('button');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockApiRepository.executeProjectCommand).toHaveBeenCalledWith(
        'test-project-1',
        'start',
        { port: 9222 }
      );
    });

    expect(defaultProps.onCommandExecute).toHaveBeenCalledWith('start', {
      message: 'Command executed successfully'
    });
  });

  test('shows loading state during command execution', async () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
      data: {
        start_command: 'npm start'
      }
    });

    // Mock a delayed response
    mockApiRepository.executeProjectCommand.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({}), 100))
    );

    render(<ProjectCommandButtons {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start').closest('button');
    fireEvent.click(startButton);

    // Should show loading state
    expect(startButton).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('handles command execution error', async () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
      data: {
        start_command: 'npm start'
      }
    });

    mockApiRepository.executeProjectCommand.mockResolvedValue({
     
      error: 'Command failed'
    });

    render(<ProjectCommandButtons {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start').closest('button');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Command failed')).toBeInTheDocument();
    });
  });

  test('shows error message when loading commands fails', async () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
     
      error: 'Failed to load commands'
    });

    render(<ProjectCommandButtons {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load project commands')).toBeInTheDocument();
    });
  });

  test('disables unavailable commands', async () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
      data: {
        // Only start command is available
        start_command: 'npm start'
      }
    });

    render(<ProjectCommandButtons {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    // Start command should be available
    const startButton = screen.getByText('Start').closest('button');
    expect(startButton).not.toBeDisabled();

    // Other commands should be unavailable
    const devButton = screen.getByText('Dev').closest('button');
    const buildButton = screen.getByText('Build').closest('button');
    const testButton = screen.getByText('Test').closest('button');

    expect(devButton).toBeDisabled();
    expect(buildButton).toBeDisabled();
    expect(testButton).toBeDisabled();

    // Stop command is always available
    const stopButton = screen.getByText('Stop').closest('button');
    expect(stopButton).not.toBeDisabled();
  });

  test('shows command status after execution', async () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
      data: {
        start_command: 'npm start'
      }
    });

    mockApiRepository.executeProjectCommand.mockResolvedValue({
      message: 'Server started successfully'
    });

    render(<ProjectCommandButtons {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start').closest('button');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Server started successfully')).toBeInTheDocument();
    });
  });

  test('clears command status when clear button is clicked', async () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
      data: {
        start_command: 'npm start'
      }
    });

    mockApiRepository.executeProjectCommand.mockResolvedValue({
      message: 'Server started successfully'
    });

    render(<ProjectCommandButtons {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start').closest('button');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Server started successfully')).toBeInTheDocument();
    });

    const clearButton = screen.getByLabelText('Clear status');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.queryByText('Server started successfully')).not.toBeInTheDocument();
    });
  });

  test('handles network errors gracefully', async () => {
    mockApiRepository.getProjectCommands.mockRejectedValue(new Error('Network error'));

    render(<ProjectCommandButtons {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load project commands')).toBeInTheDocument();
    });
  });

  test('applies custom className', () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
      data: {}
    });

    render(<ProjectCommandButtons {...defaultProps} className="custom-class" />);
    
    const container = screen.getByText('Project Commands').closest('.project-command-buttons');
    expect(container).toHaveClass('custom-class');
  });

  test('handles missing projectId gracefully', () => {
    render(<ProjectCommandButtons {...defaultProps} projectId={null} />);
    
    // Should not crash when projectId is null
    expect(screen.getByText('Project Commands')).toBeInTheDocument();
  });

  test('shows command icons', async () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
      data: {
        start_command: 'npm start'
      }
    });

    render(<ProjectCommandButtons {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('▶️')).toBeInTheDocument(); // Start icon
      expect(screen.getByText('🚀')).toBeInTheDocument(); // Dev icon
      expect(screen.getByText('🔨')).toBeInTheDocument(); // Build icon
      expect(screen.getByText('🧪')).toBeInTheDocument(); // Test icon
      expect(screen.getByText('⏹️')).toBeInTheDocument(); // Stop icon
    });
  });

  test('prevents multiple simultaneous executions', async () => {
    mockApiRepository.getProjectCommands.mockResolvedValue({
      data: {
        start_command: 'npm start',
        dev_command: 'npm run dev'
      }
    });

    // Mock a delayed response
    mockApiRepository.executeProjectCommand.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({}), 100))
    );

    render(<ProjectCommandButtons {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start').closest('button');
    const devButton = screen.getByText('Dev').closest('button');

    // Click start button
    fireEvent.click(startButton);

    // Try to click dev button while start is executing
    fireEvent.click(devButton);

    // Dev button should be disabled during execution
    expect(devButton).toBeDisabled();
  });
}); 