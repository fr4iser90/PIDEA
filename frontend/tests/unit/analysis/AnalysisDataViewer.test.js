import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalysisDataViewer from '@/presentation/components/analysis/AnalysisDataViewer';

// Mock dependencies
jest.mock('@/infrastructure/repositories/APIChatRepository');
jest.mock('@/hooks/useAnalysisCache');
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock CSS imports
jest.mock('@/css/components/analysis/analysis-data-viewer.css', () => ({}));
jest.mock('@/css/components/analysis/analysis-charts.css', () => ({}));
jest.mock('@/css/components/analysis/analysis-metrics.css', () => ({}));
jest.mock('@/css/components/analysis/analysis-filters.css', () => ({}));
jest.mock('@/css/components/analysis/analysis-history.css', () => ({}));
jest.mock('@/css/components/analysis/analysis-status.css', () => ({}));
jest.mock('@/css/components/analysis/analysis-modal.css', () => ({}));
jest.mock('@/css/components/analysis/analysis-issues.css', () => ({}));
jest.mock('@/css/components/analysis/analysis-techstack.css', () => ({}));
jest.mock('@/css/components/analysis/analysis-architecture.css', () => ({}));
jest.mock('@/css/components/analysis/analysis-recommendations.css', () => ({}));

// Mock components
jest.mock('@/presentation/components/analysis/AnalysisCharts', () => {
  return function MockAnalysisCharts({ loading }) {
    return <div data-testid="analysis-charts">{loading ? 'Loading charts...' : 'Charts loaded'}</div>;
  };
});

jest.mock('@/presentation/components/analysis/AnalysisMetrics', () => {
  return function MockAnalysisMetrics({ loading }) {
    return <div data-testid="analysis-metrics">{loading ? 'Loading metrics...' : 'Metrics loaded'}</div>;
  };
});

jest.mock('@/presentation/components/analysis/AnalysisFilters', () => {
  return function MockAnalysisFilters() {
    return <div data-testid="analysis-filters">Filters</div>;
  };
});

jest.mock('@/presentation/components/analysis/AnalysisHistory', () => {
  return function MockAnalysisHistory({ loading }) {
    return <div data-testid="analysis-history">{loading ? 'Loading history...' : 'History loaded'}</div>;
  };
});

jest.mock('@/presentation/components/analysis/AnalysisStatus', () => {
  return function MockAnalysisStatus() {
    return <div data-testid="analysis-status">Status</div>;
  };
});

jest.mock('@/presentation/components/analysis/AnalysisModal', () => {
  return function MockAnalysisModal() {
    return <div data-testid="analysis-modal">Modal</div>;
  };
});

jest.mock('@/presentation/components/analysis/AnalysisIssues', () => {
  return function MockAnalysisIssues({ loading }) {
    return <div data-testid="analysis-issues">{loading ? 'Loading issues...' : 'Issues loaded'}</div>;
  };
});

jest.mock('@/presentation/components/analysis/AnalysisTechStack', () => {
  return function MockAnalysisTechStack({ loading }) {
    return <div data-testid="analysis-techstack">{loading ? 'Loading tech stack...' : 'Tech stack loaded'}</div>;
  };
});

jest.mock('@/presentation/components/analysis/AnalysisArchitecture', () => {
  return function MockAnalysisArchitecture({ loading }) {
    return <div data-testid="analysis-architecture">{loading ? 'Loading architecture...' : 'Architecture loaded'}</div>;
  };
});

jest.mock('@/presentation/components/analysis/AnalysisRecommendations', () => {
  return function MockAnalysisRecommendations({ loading }) {
    return <div data-testid="analysis-recommendations">{loading ? 'Loading recommendations...' : 'Recommendations loaded'}</div>;
  };
});

describe('AnalysisDataViewer', () => {
  let mockAPIChatRepository;
  let mockUseAnalysisCache;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock APIChatRepository
    mockAPIChatRepository = {
      getCurrentProjectId: jest.fn().mockResolvedValue('test-project'),
      getAnalysisMetrics: jest.fn().mockResolvedValue({ success: true, data: { totalAnalyses: 5 } }),
      getAnalysisStatus: jest.fn().mockResolvedValue({ success: true, data: { isRunning: false } }),
      getAnalysisHistory: jest.fn().mockResolvedValue({ success: true, data: [] }),
      getAnalysisIssues: jest.fn().mockResolvedValue({ success: true, data: { issues: [] } }),
      getAnalysisTechStack: jest.fn().mockResolvedValue({ success: true, data: { dependencies: {} } }),
      getAnalysisArchitecture: jest.fn().mockResolvedValue({ success: true, data: { structure: {} } }),
      getAnalysisRecommendations: jest.fn().mockResolvedValue({ success: true, data: { recommendations: [] } })
    };

    // Mock useAnalysisCache hook
    mockUseAnalysisCache = {
      getCachedData: jest.fn().mockReturnValue(null),
      setCachedData: jest.fn(),
      hasCachedData: jest.fn().mockReturnValue(false)
    };

    // Setup mocks
    const { default: APIChatRepository } = require('@/infrastructure/repositories/APIChatRepository');
    APIChatRepository.mockImplementation(() => mockAPIChatRepository);

    const useAnalysisCache = require('@/hooks/useAnalysisCache').default;
    useAnalysisCache.mockReturnValue(mockUseAnalysisCache);
  });

  describe('Initial Rendering', () => {
    it('should render the analysis dashboard header', () => {
      render(<AnalysisDataViewer />);
      
      expect(screen.getByText('📊 Analysis Dashboard')).toBeInTheDocument();
      expect(screen.getByText('🔄 Refresh')).toBeInTheDocument();
    });

    it('should render all collapsible sections', () => {
      render(<AnalysisDataViewer />);
      
      expect(screen.getByText('📊 Metrics')).toBeInTheDocument();
      expect(screen.getByText('📈 Charts')).toBeInTheDocument();
      expect(screen.getByText('📋 History')).toBeInTheDocument();
      expect(screen.getByText('⚠️ Issues')).toBeInTheDocument();
      expect(screen.getByText('🔧 Tech Stack')).toBeInTheDocument();
      expect(screen.getByText('🏗️ Architecture')).toBeInTheDocument();
      expect(screen.getByText('💡 Recommendations')).toBeInTheDocument();
    });

    it('should render all analysis components', () => {
      render(<AnalysisDataViewer />);
      
      expect(screen.getByTestId('analysis-issues')).toBeInTheDocument();
      expect(screen.getByTestId('analysis-techstack')).toBeInTheDocument();
      expect(screen.getByTestId('analysis-architecture')).toBeInTheDocument();
      expect(screen.getByTestId('analysis-recommendations')).toBeInTheDocument();
    });
  });

  describe('Section Toggle Functionality', () => {
    it('should toggle section visibility when header is clicked', () => {
      render(<AnalysisDataViewer />);
      
      // Initially, sections should be expanded/collapsed based on default state
      expect(screen.getByTestId('analysis-metrics')).toBeInTheDocument(); // Metrics expanded by default
      expect(screen.getByTestId('analysis-charts')).toBeInTheDocument(); // Charts expanded by default
      expect(screen.getByTestId('analysis-history')).toBeInTheDocument(); // History expanded by default
      
      // Issues should be collapsed by default
      expect(screen.queryByTestId('analysis-issues')).not.toBeVisible();
      
      // Click on Issues header to expand
      fireEvent.click(screen.getByText('⚠️ Issues'));
      expect(screen.getByTestId('analysis-issues')).toBeVisible();
      
      // Click again to collapse
      fireEvent.click(screen.getByText('⚠️ Issues'));
      expect(screen.queryByTestId('analysis-issues')).not.toBeVisible();
    });

    it('should show correct toggle arrows', () => {
      render(<AnalysisDataViewer />);
      
      // Expanded sections should show ▼
      const expandedSections = screen.getAllByText('▼');
      expect(expandedSections).toHaveLength(3); // metrics, charts, history
      
      // Collapsed sections should show ▶
      const collapsedSections = screen.getAllByText('▶');
      expect(collapsedSections).toHaveLength(4); // issues, techStack, architecture, recommendations
    });
  });

  describe('Data Loading', () => {
    it('should load data on mount', async () => {
      render(<AnalysisDataViewer />);
      
      await waitFor(() => {
        expect(mockAPIChatRepository.getCurrentProjectId).toHaveBeenCalled();
        expect(mockAPIChatRepository.getAnalysisMetrics).toHaveBeenCalled();
        expect(mockAPIChatRepository.getAnalysisStatus).toHaveBeenCalled();
        expect(mockAPIChatRepository.getAnalysisHistory).toHaveBeenCalled();
        expect(mockAPIChatRepository.getAnalysisIssues).toHaveBeenCalled();
        expect(mockAPIChatRepository.getAnalysisTechStack).toHaveBeenCalled();
        expect(mockAPIChatRepository.getAnalysisArchitecture).toHaveBeenCalled();
        expect(mockAPIChatRepository.getAnalysisRecommendations).toHaveBeenCalled();
      });
    });

    it('should use cached data when available', async () => {
      const cachedData = { totalAnalyses: 10 };
      mockUseAnalysisCache.getCachedData.mockReturnValue(cachedData);
      
      render(<AnalysisDataViewer />);
      
      await waitFor(() => {
        expect(mockUseAnalysisCache.getCachedData).toHaveBeenCalled();
        expect(mockAPIChatRepository.getAnalysisMetrics).not.toHaveBeenCalled(); // Should use cache
      });
    });

    it('should cache data after loading from API', async () => {
      render(<AnalysisDataViewer />);
      
      await waitFor(() => {
        expect(mockUseAnalysisCache.setCachedData).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner during initial load', () => {
      // Mock loading state
      mockAPIChatRepository.getAnalysisMetrics.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: {} }), 100))
      );
      
      render(<AnalysisDataViewer />);
      
      expect(screen.getByText('Loading analysis data...')).toBeInTheDocument();
    });

    it('should show individual loading states for sections', async () => {
      render(<AnalysisDataViewer />);
      
      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading analysis data...')).not.toBeInTheDocument();
      });
      
      // Check that components receive loading states
      expect(screen.getByTestId('analysis-metrics')).toHaveTextContent('Metrics loaded');
      expect(screen.getByTestId('analysis-charts')).toHaveTextContent('Charts loaded');
      expect(screen.getByTestId('analysis-history')).toHaveTextContent('History loaded');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      mockAPIChatRepository.getAnalysisMetrics.mockRejectedValue(new Error('API Error'));
      
      render(<AnalysisDataViewer />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load analysis data/)).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading when retry button is clicked', async () => {
      mockAPIChatRepository.getAnalysisMetrics.mockRejectedValueOnce(new Error('API Error'));
      
      render(<AnalysisDataViewer />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      // Mock successful response for retry
      mockAPIChatRepository.getAnalysisMetrics.mockResolvedValue({ success: true, data: {} });
      
      fireEvent.click(screen.getByText('Retry'));
      
      await waitFor(() => {
        expect(screen.queryByText(/Failed to load analysis data/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      render(<AnalysisDataViewer />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockAPIChatRepository.getAnalysisMetrics).toHaveBeenCalledTimes(1);
      });
      
      // Click refresh
      fireEvent.click(screen.getByText('🔄 Refresh'));
      
      await waitFor(() => {
        expect(mockAPIChatRepository.getAnalysisMetrics).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Project ID Handling', () => {
    it('should use provided projectId prop', async () => {
      render(<AnalysisDataViewer projectId="custom-project" />);
      
      await waitFor(() => {
        expect(mockAPIChatRepository.getAnalysisMetrics).toHaveBeenCalledWith('custom-project');
      });
    });

    it('should fall back to current project ID when no projectId prop', async () => {
      render(<AnalysisDataViewer />);
      
      await waitFor(() => {
        expect(mockAPIChatRepository.getCurrentProjectId).toHaveBeenCalled();
        expect(mockAPIChatRepository.getAnalysisMetrics).toHaveBeenCalledWith('test-project');
      });
    });
  });

  describe('Event Bus Integration', () => {
    it('should set up event listeners when eventBus is provided', () => {
      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };
      
      render(<AnalysisDataViewer eventBus={mockEventBus} />);
      
      expect(mockEventBus.on).toHaveBeenCalledWith('analysis-status-update', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('analysis-completed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('analysis-progress', expect.any(Function));
    });
  });
}); 