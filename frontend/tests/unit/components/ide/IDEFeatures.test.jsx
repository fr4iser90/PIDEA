import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import IDEFeatures from '@/presentation/components/ide/IDEFeatures';

// Mock the API call
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: jest.fn()
}));

import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

describe('IDEFeatures Component', () => {
  const mockEventBus = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  };

  const mockFeatures = {
    ide: 'vscode',
    version: '1.85.0',
    features: {
      debugging: { available: true, version: '1.0.0' },
      intellisense: { available: true, version: '2.1.0' },
      git: { available: true, version: '1.5.0' },
      extensions: { available: true, version: '3.0.0' },
      terminal: { available: true, version: '1.2.0' },
      search: { available: true, version: '1.8.0' }
    },
    capabilities: {
      languageSupport: ['javascript', 'typescript', 'python', 'java'],
      debugging: ['node', 'chrome', 'python'],
      extensions: ['marketplace', 'local', 'workspace']
    }
  };

  const defaultProps = {
    eventBus: mockEventBus,
    activePort: 9222
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiCall.mockResolvedValue({ success: true, data: mockFeatures });
  });

  describe('Rendering', () => {
    it('renders features header correctly', () => {
      render(<IDEFeatures {...defaultProps} />);
      expect(screen.getByText('IDE Features')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      render(<IDEFeatures {...defaultProps} />);
      expect(screen.getByText('Loading features...')).toBeInTheDocument();
    });

    it('shows IDE info when features are loaded', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('VS Code')).toBeInTheDocument();
        expect(screen.getByText('v1.85.0')).toBeInTheDocument();
      });
    });

    it('shows no IDE message when no active port', () => {
      render(<IDEFeatures {...defaultProps} activePort={null} />);
      expect(screen.getByText('No IDE connected')).toBeInTheDocument();
    });
  });

  describe('Feature Loading', () => {
    it('loads features when activePort changes', async () => {
      const { rerender } = render(<IDEFeatures {...defaultProps} activePort={null} />);
      
      rerender(<IDEFeatures {...defaultProps} activePort={9222} />);

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledWith('/api/ide/features?port=9222');
      });
    });

    it('handles feature loading error', async () => {
      apiCall.mockRejectedValue(new Error('Failed to load features'));
      
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load features')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      apiCall.mockRejectedValue(new Error('Failed to load features'));
      
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('Feature Display', () => {
    it('renders all available features', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Debugging')).toBeInTheDocument();
        expect(screen.getByText('IntelliSense')).toBeInTheDocument();
        expect(screen.getByText('Git Integration')).toBeInTheDocument();
        expect(screen.getByText('Extensions')).toBeInTheDocument();
        expect(screen.getByText('Terminal')).toBeInTheDocument();
        expect(screen.getByText('Search')).toBeInTheDocument();
      });
    });

    it('shows feature versions', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('v1.0.0')).toBeInTheDocument();
        expect(screen.getByText('v2.1.0')).toBeInTheDocument();
        expect(screen.getByText('v1.5.0')).toBeInTheDocument();
      });
    });

    it('shows feature status indicators', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        const statusIndicators = screen.getAllByText('✓');
        expect(statusIndicators.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Feature Categories', () => {
    it('groups features by category', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Core Features')).toBeInTheDocument();
        expect(screen.getByText('Development Tools')).toBeInTheDocument();
        expect(screen.getByText('Productivity')).toBeInTheDocument();
      });
    });

    it('shows feature counts per category', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Core Features (2)')).toBeInTheDocument();
        expect(screen.getByText('Development Tools (2)')).toBeInTheDocument();
        expect(screen.getByText('Productivity (2)')).toBeInTheDocument();
      });
    });
  });

  describe('Language Support', () => {
    it('displays supported languages', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Language Support')).toBeInTheDocument();
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
        expect(screen.getByText('Python')).toBeInTheDocument();
        expect(screen.getByText('Java')).toBeInTheDocument();
      });
    });

    it('shows language count', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('4 languages supported')).toBeInTheDocument();
      });
    });
  });

  describe('Debugging Capabilities', () => {
    it('displays debugging targets', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Debugging Targets')).toBeInTheDocument();
        expect(screen.getByText('Node.js')).toBeInTheDocument();
        expect(screen.getByText('Chrome')).toBeInTheDocument();
        expect(screen.getByText('Python')).toBeInTheDocument();
      });
    });

    it('shows debugging target count', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('3 debugging targets')).toBeInTheDocument();
      });
    });
  });

  describe('Extension Support', () => {
    it('displays extension sources', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Extension Sources')).toBeInTheDocument();
        expect(screen.getByText('Marketplace')).toBeInTheDocument();
        expect(screen.getByText('Local')).toBeInTheDocument();
        expect(screen.getByText('Workspace')).toBeInTheDocument();
      });
    });

    it('shows extension source count', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('3 extension sources')).toBeInTheDocument();
      });
    });
  });

  describe('Feature Interaction', () => {
    it('allows feature toggling', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        const toggleButton = screen.getByText('Toggle Features');
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Features Toggled')).toBeInTheDocument();
      });
    });

    it('shows feature details when clicked', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        const feature = screen.getByText('Debugging');
        fireEvent.click(feature);
      });

      await waitFor(() => {
        expect(screen.getByText('Feature Details')).toBeInTheDocument();
        expect(screen.getByText('Version: v1.0.0')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes features when refresh button is clicked', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        const refreshButton = screen.getByText('🔄 Refresh');
        fireEvent.click(refreshButton);
      });

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledTimes(2); // Initial load + refresh
      });
    });
  });

  describe('Event Bus Integration', () => {
    it('listens for feature update events', () => {
      render(<IDEFeatures {...defaultProps} />);
      
      expect(mockEventBus.on).toHaveBeenCalledWith('featuresUpdated', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('ideChanged', expect.any(Function));
    });

    it('updates features when featuresUpdated event is received', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        const featuresUpdatedHandler = mockEventBus.on.mock.calls.find(
          call => call[0] === 'featuresUpdated'
        )[1];

        featuresUpdatedHandler({ port: 9222, features: mockFeatures });
      });

      await waitFor(() => {
        expect(screen.getByText('VS Code')).toBeInTheDocument();
      });
    });
  });

  describe('Feature Status', () => {
    it('shows enabled status for available features', async () => {
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        const enabledFeatures = screen.getAllByText('Enabled');
        expect(enabledFeatures.length).toBeGreaterThan(0);
      });
    });

    it('shows disabled status for unavailable features', async () => {
      const mockFeaturesWithDisabled = {
        ...mockFeatures,
        features: {
          ...mockFeatures.features,
          debugging: { available: false, version: '1.0.0' }
        }
      };

      apiCall.mockResolvedValue({ success: true, data: mockFeaturesWithDisabled });
      
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Disabled')).toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    it('shows error message when API call fails', async () => {
      apiCall.mockRejectedValue(new Error('Network error'));
      
      render(<IDEFeatures {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('allows retry when error occurs', async () => {
      apiCall.mockRejectedValue(new Error('Network error'));
      
      render(<IDEFeatures {...defaultProps} />);

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