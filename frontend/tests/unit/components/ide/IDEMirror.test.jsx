import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import IDEMirror from '@/presentation/components/ide/IDEMirror';

// Mock the API call
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: jest.fn()
}));

import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

describe('IDEMirror Component', () => {
  const mockEventBus = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  };

  const mockDOMData = {
    root: {
      id: 'root',
      tagName: 'DIV',
      className: 'container',
      textContent: 'Test content',
      children: [
        {
          id: 'child1',
          tagName: 'SPAN',
          className: 'child',
          textContent: 'Child 1',
          children: []
        }
      ]
    },
    elementCount: 2
  };

  const defaultProps = {
    eventBus: mockEventBus,
    activePort: 9222
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiCall.mockResolvedValue({ success: true, data: mockDOMData });
  });

  describe('Rendering', () => {
    it('renders mirror header correctly', () => {
      render(<IDEMirror {...defaultProps} />);
      expect(screen.getByText('IDE Mirror - Port 9222')).toBeInTheDocument();
    });

    it('shows disconnected status when no active port', () => {
      render(<IDEMirror {...defaultProps} activePort={null} />);
      expect(screen.getByText('No IDE connected')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      render(<IDEMirror {...defaultProps} />);
      expect(screen.getByText('Loading DOM data...')).toBeInTheDocument();
    });

    it('shows DOM tree when data is loaded', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('DOM Structure')).toBeInTheDocument();
        expect(screen.getByText('2 elements')).toBeInTheDocument();
      });
    });
  });

  describe('DOM Data Loading', () => {
    it('loads DOM data when activePort changes', async () => {
      const { rerender } = render(<IDEMirror {...defaultProps} activePort={null} />);
      
      rerender(<IDEMirror {...defaultProps} activePort={9222} />);

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledWith('/api/ide/mirror/dom?port=9222');
      });
    });

    it('handles DOM loading error', async () => {
      apiCall.mockRejectedValue(new Error('Failed to load DOM'));
      
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load DOM')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      apiCall.mockRejectedValue(new Error('Failed to load DOM'));
      
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('Interaction Controls', () => {
    it('shows mode selector', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Mode:')).toBeInTheDocument();
        expect(screen.getByDisplayValue('View')).toBeInTheDocument();
      });
    });

    it('shows refresh button', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('🔄 Refresh')).toBeInTheDocument();
      });
    });

    it('allows mode switching', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        const modeSelect = screen.getByDisplayValue('View');
        fireEvent.change(modeSelect, { target: { value: 'interact' } });
        expect(modeSelect.value).toBe('interact');
      });
    });

    it('refreshes DOM data when refresh button is clicked', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        const refreshButton = screen.getByText('🔄 Refresh');
        fireEvent.click(refreshButton);
      });

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledTimes(2); // Initial load + refresh
      });
    });
  });

  describe('DOM Element Interaction', () => {
    it('renders DOM elements correctly', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('div.container')).toBeInTheDocument();
        expect(screen.getByText('span.child')).toBeInTheDocument();
      });
    });

    it('shows element details when clicked', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        const element = screen.getByText('div.container');
        fireEvent.click(element);
      });

      await waitFor(() => {
        expect(screen.getByText('Selected Element')).toBeInTheDocument();
        expect(screen.getByText('DIV')).toBeInTheDocument();
        expect(screen.getByText('container')).toBeInTheDocument();
      });
    });

    it('highlights elements on hover in view mode', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        const element = screen.getByText('div.container');
        fireEvent.mouseEnter(element);
      });

      // Element should be highlighted (this would be tested via CSS classes)
      await waitFor(() => {
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe('Auto Refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('auto-refreshes when enabled', async () => {
      render(<IDEMirror {...defaultProps} autoRefresh={true} refreshInterval={1000} />);

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledTimes(1);
      });

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledTimes(2);
      });
    });

    it('does not auto-refresh when disabled', async () => {
      render(<IDEMirror {...defaultProps} autoRefresh={false} />);

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledTimes(1);
      });

      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledTimes(1); // Still only initial call
      });
    });
  });

  describe('Event Bus Integration', () => {
    it('listens for DOM update events', () => {
      render(<IDEMirror {...defaultProps} />);
      
      expect(mockEventBus.on).toHaveBeenCalledWith('domUpdated', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('mirrorStatusChanged', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('elementInteraction', expect.any(Function));
    });

    it('updates DOM when domUpdated event is received', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        const domUpdatedHandler = mockEventBus.on.mock.calls.find(
          call => call[0] === 'domUpdated'
        )[1];

        domUpdatedHandler({ port: 9222, dom: mockDOMData });
      });

      await waitFor(() => {
        expect(screen.getByText('DOM Structure')).toBeInTheDocument();
      });
    });
  });

  describe('Mirror Status', () => {
    it('shows connected status when mirror is connected', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    it('shows error status when mirror has error', async () => {
      apiCall.mockRejectedValue(new Error('Mirror error'));
      
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });
  });

  describe('Element Details Panel', () => {
    it('shows element properties when element is selected', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        const element = screen.getByText('div.container');
        fireEvent.click(element);
      });

      await waitFor(() => {
        expect(screen.getByText('Tag:')).toBeInTheDocument();
        expect(screen.getByText('DIV')).toBeInTheDocument();
        expect(screen.getByText('Class:')).toBeInTheDocument();
        expect(screen.getByText('container')).toBeInTheDocument();
        expect(screen.getByText('Text:')).toBeInTheDocument();
        expect(screen.getByText('Test content')).toBeInTheDocument();
      });
    });

    it('hides element details when no element is selected', async () => {
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Selected Element')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    it('shows error message when API call fails', async () => {
      apiCall.mockRejectedValue(new Error('Network error'));
      
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('allows retry when error occurs', async () => {
      apiCall.mockRejectedValue(new Error('Network error'));
      
      render(<IDEMirror {...defaultProps} />);

      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledTimes(2);
      });
    });
  });
}); 