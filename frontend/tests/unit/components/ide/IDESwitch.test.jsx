import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import IDESwitch from '@/presentation/components/ide/IDESwitch';

// Mock the API call
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: jest.fn()
}));

import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

describe('IDESwitch Component', () => {
  const mockEventBus = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  };

  const defaultProps = {
    eventBus: mockEventBus,
    currentPort: 9222,
    targetPort: 9223,
    onSwitchComplete: jest.fn(),
    onSwitchError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiCall.mockResolvedValue({ success: true, data: { port: 9223 } });
  });

  describe('Rendering', () => {
    it('renders switch header correctly', () => {
      render(<IDESwitch {...defaultProps} />);
      expect(screen.getByText('IDE Switch')).toBeInTheDocument();
    });

    it('shows ready status when not switching', () => {
      render(<IDESwitch {...defaultProps} />);
      expect(screen.getByText('Ready to switch')).toBeInTheDocument();
    });

    it('shows switch button when target port is different', () => {
      render(<IDESwitch {...defaultProps} />);
      expect(screen.getByText('Switch to Port 9223')).toBeInTheDocument();
    });

    it('does not show switch button when ports are the same', () => {
      render(<IDESwitch {...defaultProps} currentPort={9223} targetPort={9223} />);
      expect(screen.queryByText('Switch to Port 9223')).not.toBeInTheDocument();
    });
  });

  describe('Switch Functionality', () => {
    it('handles successful IDE switch', async () => {
      render(<IDESwitch {...defaultProps} />);
      
      const switchButton = screen.getByText('Switch to Port 9223');
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledWith('/api/ide/selection', {
          method: 'POST',
          body: JSON.stringify({ 
            port: 9223, 
            reason: 'manual',
            fromPort: 9222 
          })
        });
      });

      await waitFor(() => {
        expect(defaultProps.onSwitchComplete).toHaveBeenCalled();
      });
    });

    it('handles switch error', async () => {
      apiCall.mockRejectedValue(new Error('Switch failed'));
      
      render(<IDESwitch {...defaultProps} />);
      
      const switchButton = screen.getByText('Switch to Port 9223');
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(screen.getByText('Switch failed')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(defaultProps.onSwitchError).toHaveBeenCalled();
      });
    });

    it('shows progress during switch', async () => {
      render(<IDESwitch {...defaultProps} />);
      
      const switchButton = screen.getByText('Switch to Port 9223');
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(screen.getByText('Initiating switch...')).toBeInTheDocument();
      });
    });

    it('allows canceling switch', async () => {
      render(<IDESwitch {...defaultProps} />);
      
      const switchButton = screen.getByText('Switch to Port 9223');
      fireEvent.click(switchButton);

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel Switch');
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Switch cancelled')).toBeInTheDocument();
      });
    });
  });

  describe('Auto Switch', () => {
    it('auto-switches when autoSwitch is true', async () => {
      render(<IDESwitch {...defaultProps} autoSwitch={true} />);

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledWith('/api/ide/selection', {
          method: 'POST',
          body: JSON.stringify({ 
            port: 9223, 
            reason: 'manual',
            fromPort: 9222 
          })
        });
      });
    });

    it('does not auto-switch when autoSwitch is false', () => {
      render(<IDESwitch {...defaultProps} autoSwitch={false} />);
      expect(apiCall).not.toHaveBeenCalled();
    });
  });

  describe('Event Bus Integration', () => {
    it('listens for switch events', () => {
      render(<IDESwitch {...defaultProps} />);
      
      expect(mockEventBus.on).toHaveBeenCalledWith('ideSwitchRequested', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('ideSwitchProgress', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('ideSwitchComplete', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('ideSwitchError', expect.any(Function));
    });

    it('emits switch events', async () => {
      render(<IDESwitch {...defaultProps} />);
      
      const switchButton = screen.getByText('Switch to Port 9223');
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(mockEventBus.emit).toHaveBeenCalledWith('ideSwitchStarted', {
          fromPort: 9222,
          toPort: 9223,
          reason: 'manual'
        });
      });
    });
  });

  describe('Progress Display', () => {
    it('shows progress bar when switching', async () => {
      render(<IDESwitch {...defaultProps} showProgress={true} />);
      
      const switchButton = screen.getByText('Switch to Port 9223');
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(screen.getByText('0%')).toBeInTheDocument();
      });
    });

    it('hides progress bar when showProgress is false', async () => {
      render(<IDESwitch {...defaultProps} showProgress={false} />);
      
      const switchButton = screen.getByText('Switch to Port 9223');
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(screen.queryByText('0%')).not.toBeInTheDocument();
      });
    });
  });

  describe('History Display', () => {
    it('shows switch history after successful switch', async () => {
      render(<IDESwitch {...defaultProps} />);
      
      const switchButton = screen.getByText('Switch to Port 9223');
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(screen.getByText('Recent Switches')).toBeInTheDocument();
      });
    });

    it('shows empty history message when no switches', () => {
      render(<IDESwitch {...defaultProps} />);
      expect(screen.getByText('No recent switches')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when switch fails', async () => {
      apiCall.mockRejectedValue(new Error('Network error'));
      
      render(<IDESwitch {...defaultProps} />);
      
      const switchButton = screen.getByText('Switch to Port 9223');
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('calls onSwitchError callback when switch fails', async () => {
      apiCall.mockRejectedValue(new Error('Switch failed'));
      
      render(<IDESwitch {...defaultProps} />);
      
      const switchButton = screen.getByText('Switch to Port 9223');
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(defaultProps.onSwitchError).toHaveBeenCalledWith({
          fromPort: 9222,
          toPort: 9223,
          error: 'Switch failed'
        });
      });
    });
  });
}); 