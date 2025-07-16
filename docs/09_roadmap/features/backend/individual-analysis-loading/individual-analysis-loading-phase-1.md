# Individual Analysis Loading – Phase 1: Frontend Lazy Loading Infrastructure

## Overview
Create the frontend infrastructure for lazy loading individual analysis components, including reusable components, custom hooks, and integration with existing API routes.

## Objectives
- [ ] Create LazyAnalysisComponent wrapper
- [ ] Implement useIndividualAnalysis custom hook
- [ ] Create loading states and error handling
- [ ] Implement skeleton loading components
- [ ] Integrate with existing API routes

## Deliverables
- [ ] File: `frontend/src/presentation/components/analysis/LazyAnalysisComponent.jsx` - Reusable lazy loading wrapper
- [ ] File: `frontend/src/hooks/useIndividualAnalysis.js` - Custom hook for individual analysis loading
- [ ] File: `frontend/src/presentation/components/analysis/AnalysisSkeleton.jsx` - Skeleton loading component
- [ ] File: `frontend/src/css/components/analysis/lazy-analysis.css` - Styling for lazy loading
- [ ] Test: `tests/unit/hooks/useIndividualAnalysis.test.js` - Hook unit tests
- [ ] Test: `tests/unit/components/LazyAnalysisComponent.test.js` - Component unit tests

## Dependencies
- Requires: Existing individual analysis routes (already implemented)
- Blocks: Phase 2 start

## Estimated Time
1 hour

## Success Criteria
- [ ] LazyAnalysisComponent can wrap any analysis component
- [ ] useIndividualAnalysis hook manages loading states correctly
- [ ] Skeleton loading provides good UX during loading
- [ ] Error handling works for failed individual loads
- [ ] Integration with existing API routes works correctly
- [ ] All tests pass

## Implementation Details

### LazyAnalysisComponent.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import useIndividualAnalysis from '@/hooks/useIndividualAnalysis';
import AnalysisSkeleton from './AnalysisSkeleton';
import '@/css/components/analysis/lazy-analysis.css';

const LazyAnalysisComponent = ({ 
  analysisType, 
  projectId, 
  children, 
  onLoad,
  onError,
  showSkeleton = true,
  autoLoad = false,
  cacheKey = null
}) => {
  const [isExpanded, setIsExpanded] = useState(autoLoad);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  const {
    data,
    loading,
    error,
    loadAnalysis,
    clearError,
    isCached
  } = useIndividualAnalysis(analysisType, projectId, cacheKey);

  useEffect(() => {
    if (autoLoad && !hasLoaded) {
      loadAnalysis();
      setHasLoaded(true);
    }
  }, [autoLoad, hasLoaded, loadAnalysis]);

  useEffect(() => {
    if (data && onLoad) {
      onLoad(data);
    }
  }, [data, onLoad]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleExpand = () => {
    setIsExpanded(true);
    if (!hasLoaded) {
      loadAnalysis();
      setHasLoaded(true);
    }
  };

  const handleRetry = () => {
    clearError();
    loadAnalysis();
  };

  const handleRefresh = () => {
    loadAnalysis(true); // forceRefresh = true
  };

  // Show skeleton while loading
  if (loading && showSkeleton) {
    return (
      <div className="lazy-analysis-component loading">
        <AnalysisSkeleton type={analysisType} />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="lazy-analysis-component error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <div className="error-message">
            <h4>Failed to load {analysisType} analysis</h4>
            <p>{error}</p>
          </div>
          <div className="error-actions">
            <button onClick={handleRetry} className="btn-retry">
              🔄 Retry
            </button>
            <button onClick={handleRefresh} className="btn-refresh">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show expandable content
  if (!isExpanded) {
    return (
      <div className="lazy-analysis-component collapsed">
        <div className="expand-trigger" onClick={handleExpand}>
          <div className="trigger-content">
            <h3>{getAnalysisTypeTitle(analysisType)}</h3>
            <p>Click to load {analysisType} analysis</p>
          </div>
          <div className="trigger-icon">▶</div>
        </div>
      </div>
    );
  }

  // Show loaded content
  return (
    <div className="lazy-analysis-component expanded">
      <div className="analysis-header">
        <div className="analysis-title">
          <h3>{getAnalysisTypeTitle(analysisType)}</h3>
          {isCached && <span className="cache-indicator">📋 Cached</span>}
        </div>
        <div className="analysis-actions">
          <button onClick={handleRefresh} className="btn-refresh" title="Refresh data">
            🔄
          </button>
        </div>
      </div>
      <div className="analysis-content">
        {children(data)}
      </div>
    </div>
  );
};

const getAnalysisTypeTitle = (type) => {
  const titles = {
    'issues': '⚠️ Issues',
    'techstack': '🔧 Tech Stack',
    'architecture': '🏗️ Architecture',
    'recommendations': '💡 Recommendations',
    'code-quality': '📊 Code Quality',
    'security': '🔒 Security',
    'performance': '⚡ Performance'
  };
  return titles[type] || type;
};

export default LazyAnalysisComponent;
```

### useIndividualAnalysis.js
```javascript
import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import useAnalysisCache from '@/hooks/useAnalysisCache';

const useIndividualAnalysis = (analysisType, projectId = null, cacheKey = null) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [lastLoaded, setLastLoaded] = useState(null);
  
  const apiRepository = useRef(new APIChatRepository());
  const { getCachedData, setCachedData, hasCachedData } = useAnalysisCache();
  const abortControllerRef = useRef(null);

  const cacheKeyFinal = cacheKey || `${projectId}-${analysisType}`;

  const loadAnalysis = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const currentProjectId = projectId || await apiRepository.current.getCurrentProjectId();
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = getCachedData(currentProjectId, analysisType);
        if (cachedData) {
          logger.info(`🔍 [useIndividualAnalysis] Using cached ${analysisType} data`);
          setData(cachedData);
          setIsCached(true);
          setLastLoaded(new Date());
          setLoading(false);
          return;
        }
      }

      // Load from API using existing routes
      logger.info(`🔍 [useIndividualAnalysis] Loading ${analysisType} from API`);
      
      let response;
      
      // Use existing API methods based on analysis type
      switch (analysisType) {
        case 'issues':
          response = await apiRepository.current.getAnalysisIssues(currentProjectId);
          break;
        case 'techstack':
          response = await apiRepository.current.getAnalysisTechStack(currentProjectId);
          break;
        case 'architecture':
          response = await apiRepository.current.getAnalysisArchitecture(currentProjectId);
          break;
        case 'recommendations':
          response = await apiRepository.current.getAnalysisRecommendations(currentProjectId);
          break;
        case 'code-quality':
          response = await apiRepository.current.getCodeQualityAnalysis(currentProjectId);
          break;
        case 'security':
          response = await apiRepository.current.getSecurityAnalysis(currentProjectId);
          break;
        case 'performance':
          response = await apiRepository.current.getPerformanceAnalysis(currentProjectId);
          break;
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }

      if (response.success) {
        setData(response.data);
        setIsCached(response.cached || false);
        setLastLoaded(new Date());
        
        // Cache the result
        if (!response.cached) {
          const cached = setCachedData(currentProjectId, analysisType, response.data);
          if (!cached) {
            logger.warn(`Failed to cache ${analysisType} data (too large)`);
          }
        }
      } else {
        throw new Error(response.error || `Failed to load ${analysisType} analysis`);
      }
      
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.info(`🔍 [useIndividualAnalysis] ${analysisType} request cancelled`);
        return;
      }
      
      logger.error(`❌ [useIndividualAnalysis] Failed to load ${analysisType}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [analysisType, projectId, cacheKeyFinal, getCachedData, setCachedData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    isCached,
    lastLoaded,
    loadAnalysis,
    clearError
  };
};

export default useIndividualAnalysis;
```

### AnalysisSkeleton.jsx
```javascript
import React from 'react';
import '@/css/components/analysis/analysis-skeleton.css';

const AnalysisSkeleton = ({ type = 'default' }) => {
  const getSkeletonContent = () => {
    switch (type) {
      case 'issues':
        return (
          <div className="skeleton-issues">
            <div className="skeleton-header">
              <div className="skeleton-title"></div>
              <div className="skeleton-count"></div>
            </div>
            <div className="skeleton-list">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-item">
                  <div className="skeleton-severity"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text short"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'techstack':
        return (
          <div className="skeleton-techstack">
            <div className="skeleton-header">
              <div className="skeleton-title"></div>
            </div>
            <div className="skeleton-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-icon"></div>
                  <div className="skeleton-name"></div>
                  <div className="skeleton-version"></div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'architecture':
        return (
          <div className="skeleton-architecture">
            <div className="skeleton-header">
              <div className="skeleton-title"></div>
            </div>
            <div className="skeleton-diagram">
              <div className="skeleton-box"></div>
              <div className="skeleton-arrow"></div>
              <div className="skeleton-box"></div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="skeleton-default">
            <div className="skeleton-header">
              <div className="skeleton-title"></div>
            </div>
            <div className="skeleton-content">
              <div className="skeleton-text"></div>
              <div className="skeleton-text"></div>
              <div className="skeleton-text short"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="analysis-skeleton">
      <div className="skeleton-pulse">
        {getSkeletonContent()}
      </div>
    </div>
  );
};

export default AnalysisSkeleton;
```

### CSS Styling
```css
/* frontend/src/css/components/analysis/lazy-analysis.css */

.lazy-analysis-component {
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.lazy-analysis-component.collapsed {
  background: #f8f9fa;
}

.lazy-analysis-component.expanded {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.expand-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.expand-trigger:hover {
  background-color: #f1f3f4;
}

.trigger-content h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a73e8;
}

.trigger-content p {
  margin: 0;
  font-size: 14px;
  color: #5f6368;
}

.trigger-icon {
  font-size: 12px;
  color: #5f6368;
  transition: transform 0.2s ease;
}

.expand-trigger:hover .trigger-icon {
  transform: scale(1.2);
}

.analysis-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.analysis-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.analysis-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.cache-indicator {
  font-size: 12px;
  color: #34a853;
  background: #e6f4ea;
  padding: 2px 6px;
  border-radius: 4px;
}

.analysis-actions {
  display: flex;
  gap: 8px;
}

.btn-refresh {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.btn-refresh:hover {
  background-color: #e8eaed;
}

.analysis-content {
  padding: 16px;
}

.lazy-analysis-component.error {
  border-color: #d93025;
  background: #fce8e6;
}

.error-content {
  padding: 16px;
  text-align: center;
}

.error-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.error-message h4 {
  margin: 0 0 8px 0;
  color: #d93025;
}

.error-message p {
  margin: 0 0 16px 0;
  color: #5f6368;
}

.error-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-retry, .btn-refresh {
  padding: 8px 16px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-retry:hover, .btn-refresh:hover {
  background: #f1f3f4;
  border-color: #1a73e8;
}

.lazy-analysis-component.loading {
  border-color: #1a73e8;
  background: white;
}
```

## Testing Strategy

### Hook Unit Tests
```javascript
// tests/unit/hooks/useIndividualAnalysis.test.js
import { renderHook, act } from '@testing-library/react';
import useIndividualAnalysis from '@/hooks/useIndividualAnalysis';

// Mock APIChatRepository
jest.mock('@/infrastructure/repositories/APIChatRepository');
jest.mock('@/hooks/useAnalysisCache');

describe('useIndividualAnalysis', () => {
  let mockAPIRepository;
  let mockCache;

  beforeEach(() => {
    mockAPIRepository = {
      getCurrentProjectId: jest.fn(),
      getAnalysisIssues: jest.fn(),
      getAnalysisTechStack: jest.fn(),
      getAnalysisArchitecture: jest.fn(),
      getAnalysisRecommendations: jest.fn()
    };
    
    mockCache = {
      getCachedData: jest.fn(),
      setCachedData: jest.fn()
    };
  });

  it('should load analysis data successfully', async () => {
    const mockData = { test: 'data' };
    mockAPIRepository.getCurrentProjectId.mockResolvedValue('project1');
    mockAPIRepository.getAnalysisIssues.mockResolvedValue({
      success: true,
      data: mockData
    });

    const { result } = renderHook(() => 
      useIndividualAnalysis('issues', 'project1')
    );

    await act(async () => {
      await result.current.loadAnalysis();
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should use cached data when available', async () => {
    const cachedData = { test: 'cached' };
    mockCache.getCachedData.mockReturnValue(cachedData);

    const { result } = renderHook(() => 
      useIndividualAnalysis('issues', 'project1')
    );

    await act(async () => {
      await result.current.loadAnalysis();
    });

    expect(result.current.data).toEqual(cachedData);
    expect(result.current.isCached).toBe(true);
    expect(mockAPIRepository.getAnalysisIssues).not.toHaveBeenCalled();
  });
});
```

## Error Handling
- Network errors should show retry options
- Cache failures should fallback to API calls
- Aborted requests should not update state
- Invalid analysis types should show appropriate errors

## Performance Considerations
- Request cancellation on component unmount
- Debounced loading to prevent rapid requests
- Skeleton loading for better perceived performance
- Cache-first strategy with fallback

## Next Phase Dependencies
This phase provides the frontend infrastructure that Phase 2 (Component Refactoring) will use to refactor existing analysis components to use lazy loading. 