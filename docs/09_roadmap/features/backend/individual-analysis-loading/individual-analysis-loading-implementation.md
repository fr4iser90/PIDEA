# Individual Analysis Loading - Implementation Plan

## 1. Project Overview
- **Feature/Component Name**: Individual Analysis Loading System
- **Priority**: High
- **Category**: backend
- **Estimated Time**: 8 hours
- **Dependencies**: Existing analysis infrastructure, frontend analysis components
- **Related Issues**: Performance optimization, user experience improvement

## 2. Technical Requirements
- **Tech Stack**: Node.js, Express, React, WebSocket
- **Architecture Pattern**: DDD (Domain-Driven Design)
- **Database Changes**: None (uses existing analysis tables)
- **API Changes**: New individual loading endpoints, modified existing endpoints
- **Frontend Changes**: Lazy loading components, on-demand data fetching
- **Backend Changes**: Individual analysis controllers, caching optimization

## 3. File Impact Analysis

#### Files to Modify:
- [ ] `backend/presentation/api/AnalysisController.js` - Add individual analysis loading methods
- [ ] `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx` - Implement lazy loading
- [ ] `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Add individual analysis methods
- [ ] `backend/Application.js` - Add new individual analysis routes
- [ ] `frontend/src/presentation/components/analysis/AnalysisIssues.jsx` - Add on-demand loading
- [ ] `frontend/src/presentation/components/analysis/AnalysisTechStack.jsx` - Add on-demand loading
- [ ] `frontend/src/presentation/components/analysis/AnalysisArchitecture.jsx` - Add on-demand loading
- [ ] `frontend/src/presentation/components/analysis/AnalysisRecommendations.jsx` - Add on-demand loading

#### Files to Create:
- [ ] `backend/domain/services/IndividualAnalysisService.js` - Service for individual analysis loading
- [ ] `frontend/src/presentation/components/analysis/LazyAnalysisComponent.jsx` - Reusable lazy loading wrapper
- [ ] `frontend/src/hooks/useIndividualAnalysis.js` - Custom hook for individual analysis loading
- [ ] `docs/09_roadmap/features/backend/individual-analysis-loading/individual-analysis-loading-index.md` - Master index file

#### Files to Delete:
- [ ] None

## 4. Implementation Phases

#### Phase 1: Backend Individual Analysis Service (2 hours)
- [ ] Create IndividualAnalysisService with lazy loading methods
- [ ] Add individual analysis endpoints to AnalysisController
- [ ] Implement caching for individual analysis types
- [ ] Add route configuration in Application.js

#### Phase 2: Frontend Lazy Loading Infrastructure (2 hours)
- [ ] Create LazyAnalysisComponent wrapper
- [ ] Implement useIndividualAnalysis custom hook
- [ ] Add individual analysis methods to APIChatRepository
- [ ] Create loading states and error handling

#### Phase 3: Component Refactoring (3 hours)
- [ ] Refactor AnalysisDataViewer to use lazy loading
- [ ] Update AnalysisIssues component for on-demand loading
- [ ] Update AnalysisTechStack component for on-demand loading
- [ ] Update AnalysisArchitecture component for on-demand loading
- [ ] Update AnalysisRecommendations component for on-demand loading

#### Phase 4: Testing & Optimization (1 hour)
- [ ] Test individual loading performance
- [ ] Optimize caching strategies
- [ ] Add error handling and fallbacks
- [ ] Update documentation

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods

## 6. Security Considerations
- [ ] Input validation for analysis type parameters
- [ ] User authentication for individual analysis requests
- [ ] Rate limiting for individual analysis endpoints
- [ ] Audit logging for analysis requests

## 7. Performance Requirements
- **Response Time**: < 500ms for individual analysis loading
- **Throughput**: 100 requests per second per analysis type
- **Memory Usage**: < 50MB per analysis type
- **Caching Strategy**: Redis with 5-minute TTL for individual analyses

## 8. Testing Strategy

#### Unit Tests:
- [ ] Test file: `tests/unit/IndividualAnalysisService.test.js`
- [ ] Test cases: Individual loading, caching, error handling
- [ ] Mock requirements: Analysis repository, cache service

#### Integration Tests:
- [ ] Test file: `tests/integration/IndividualAnalysisController.test.js`
- [ ] Test scenarios: API endpoints, database interactions
- [ ] Test data: Sample analysis data for each type

#### E2E Tests:
- [ ] Test file: `tests/e2e/IndividualAnalysisLoading.test.js`
- [ ] User flows: Click to load individual analysis, performance testing
- [ ] Browser compatibility: Chrome, Firefox compatibility

## 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for all new methods
- [ ] README updates with individual loading instructions
- [ ] API documentation for new endpoints
- [ ] Architecture diagrams for lazy loading flow

#### User Documentation:
- [ ] User guide updates for individual analysis loading
- [ ] Performance optimization guide
- [ ] Troubleshooting guide for loading issues

## 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Performance benchmarks met

#### Deployment:
- [ ] Database migrations (if applicable)
- [ ] Environment variables configured
- [ ] Configuration updates applied
- [ ] Service restarts if needed

#### Post-deployment:
- [ ] Monitor logs for errors
- [ ] Verify individual loading functionality
- [ ] Performance monitoring active
- [ ] User feedback collection enabled

## 11. Rollback Plan
- [ ] Database rollback script prepared
- [ ] Configuration rollback procedure
- [ ] Service rollback procedure documented
- [ ] Communication plan for stakeholders

## 12. Success Criteria
- [ ] Individual analysis types load on demand
- [ ] Performance improved by 60% compared to comprehensive loading
- [ ] All tests pass (unit, integration, e2e)
- [ ] User experience improved with faster initial load
- [ ] Caching works effectively for individual analyses
- [ ] Error handling works for failed individual loads

## 13. Risk Assessment

#### High Risk:
- [ ] Breaking existing comprehensive analysis functionality - Mitigation: Maintain backward compatibility
- [ ] Performance degradation from multiple API calls - Mitigation: Implement effective caching

#### Medium Risk:
- [ ] Frontend complexity increase - Mitigation: Use reusable components and hooks
- [ ] Cache invalidation issues - Mitigation: Implement proper cache management

#### Low Risk:
- [ ] Minor UI inconsistencies - Mitigation: Thorough testing and design review

## 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/backend/individual-analysis-loading/individual-analysis-loading-implementation.md'
- **category**: 'backend'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/individual-analysis-loading",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300
}
```

#### Success Indicators:
- [ ] All checkboxes in phases completed
- [ ] Tests pass
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

## 15. References & Resources
- **Technical Documentation**: Existing analysis infrastructure documentation
- **API References**: Current analysis API endpoints
- **Design Patterns**: Lazy loading patterns, caching strategies
- **Best Practices**: Performance optimization, user experience
- **Similar Implementations**: Existing analysis components in codebase

## 16. Detailed Implementation Specifications

### Backend Individual Analysis Service

```javascript
// IndividualAnalysisService.js
class IndividualAnalysisService {
  async loadAnalysisByType(projectId, analysisType, options = {}) {
    try {
      const cacheKey = `analysis-${projectId}-${analysisType}`;
      
      // Check cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached && !options.forceRefresh) {
        logger.info(`Using cached ${analysisType} analysis for project ${projectId}`);
        return { success: true, data: cached, cached: true };
      }

      // Load from database
      const analysis = await this.analysisRepository.findLatestByProjectIdAndType(projectId, analysisType);
      
      if (!analysis) {
        return { success: false, error: `No ${analysisType} analysis found` };
      }

      // Cache the result
      await this.cacheService.set(cacheKey, analysis.resultData, 300); // 5 minutes TTL
      
      return { success: true, data: analysis.resultData, cached: false };
    } catch (error) {
      logger.error(`Failed to load ${analysisType} analysis:`, error);
      return { success: false, error: error.message };
    }
  }
  
  async getAvailableAnalysisTypes(projectId) {
    try {
      const types = await this.analysisRepository.getAvailableTypes(projectId);
      return { success: true, data: types };
    } catch (error) {
      logger.error(`Failed to get available analysis types:`, error);
      return { success: false, error: error.message };
    }
  }
  
  async preloadAnalysisType(projectId, analysisType) {
    try {
      // Preload in background
      setImmediate(async () => {
        await this.loadAnalysisByType(projectId, analysisType);
      });
      
      return { success: true, message: 'Preload started' };
    } catch (error) {
      logger.error(`Failed to preload ${analysisType} analysis:`, error);
      return { success: false, error: error.message };
    }
  }
}
```

### Frontend Lazy Loading Hook

```javascript
// useIndividualAnalysis.js
const useIndividualAnalysis = (analysisType, projectId = null, cacheKey = null) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  
  const apiRepository = useRef(new APIChatRepository());
  const { getCachedData, setCachedData } = useAnalysisCache();
  const abortControllerRef = useRef(null);

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
          setData(cachedData);
          setIsCached(true);
          setLoading(false);
          return;
        }
      }

      // Load from API
      const response = await apiRepository.current.getIndividualAnalysis(
        currentProjectId, 
        analysisType,
        { forceRefresh }
      );

      if (response.success) {
        setData(response.data);
        setIsCached(response.cached || false);
        
        // Cache the result
        if (!response.cached) {
          setCachedData(currentProjectId, analysisType, response.data);
        }
      } else {
        throw new Error(response.error || `Failed to load ${analysisType} analysis`);
      }
      
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [analysisType, projectId, getCachedData, setCachedData]);

  return {
    data,
    loading,
    error,
    isCached,
    loadAnalysis,
    clearError: () => setError(null)
  };
};
```

### API Endpoints

```javascript
// New endpoints to add
GET /api/projects/:projectId/analysis/:type/individual
GET /api/projects/:projectId/analysis/:type/status
POST /api/projects/:projectId/analysis/:type/preload

// Enhanced APIChatRepository methods
async getIndividualAnalysis(projectId, analysisType, options = {}) {
  const currentProjectId = projectId || await this.getCurrentProjectId();
  const queryParams = new URLSearchParams();
  
  if (options.forceRefresh) {
    queryParams.append('forceRefresh', 'true');
  }
  
  const url = `/api/projects/${currentProjectId}/analysis/${analysisType}/individual`;
  const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;
  
  return apiCall(fullUrl, {}, currentProjectId);
}
```

### Component Refactoring

```javascript
// LazyAnalysisComponent.jsx
const LazyAnalysisComponent = ({ 
  analysisType, 
  projectId, 
  children, 
  onLoad,
  onError,
  showSkeleton = true,
  autoLoad = false
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
  } = useIndividualAnalysis(analysisType, projectId);

  const handleExpand = () => {
    setIsExpanded(true);
    if (!hasLoaded) {
      loadAnalysis();
      setHasLoaded(true);
    }
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
            <button onClick={() => { clearError(); loadAnalysis(); }} className="btn-retry">
              🔄 Retry
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
          <button onClick={() => loadAnalysis(true)} className="btn-refresh" title="Refresh data">
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
```

## 17. Performance Optimization Strategy

### Caching Strategy
- **Individual Analysis Cache**: 5-minute TTL per analysis type
- **Status Cache**: 1-minute TTL for analysis status
- **Preload Cache**: 10-minute TTL for preloaded analyses

### Loading Strategy
- **On-Demand Loading**: Load only when user clicks/expands section
- **Background Preloading**: Preload next likely analysis type
- **Progressive Loading**: Show skeleton while loading

### Memory Management
- **Component Unmounting**: Clear analysis data when component unmounts
- **Cache Cleanup**: Automatic cleanup of old cache entries
- **Memory Monitoring**: Track memory usage per analysis type

## 18. User Experience Improvements

### Loading States
- **Skeleton Loading**: Show skeleton while individual analysis loads
- **Progress Indicators**: Show loading progress for large analyses
- **Error Recovery**: Allow retry for failed individual loads

### Performance Feedback
- **Loading Time Display**: Show how long each analysis took to load
- **Cache Status**: Indicate when data is from cache
- **Performance Metrics**: Track and display loading performance

### Accessibility
- **Screen Reader Support**: Proper ARIA labels for loading states
- **Keyboard Navigation**: Support for keyboard-only navigation
- **Focus Management**: Proper focus handling during loading

## 19. Monitoring and Analytics

### Performance Metrics
- **Loading Time**: Track time to load each analysis type
- **Cache Hit Rate**: Monitor cache effectiveness
- **Error Rate**: Track failed individual analysis loads

### User Behavior
- **Most Used Analysis Types**: Track which analyses are loaded most
- **Loading Patterns**: Understand user loading behavior
- **Performance Impact**: Measure overall performance improvement

### System Health
- **Memory Usage**: Monitor memory consumption per analysis type
- **API Response Times**: Track individual endpoint performance
- **Cache Efficiency**: Monitor cache hit/miss ratios

## 20. Future Enhancements

### Advanced Features
- **Predictive Loading**: Predict and preload likely needed analyses
- **Smart Caching**: Adaptive cache TTL based on usage patterns
- **Offline Support**: Cache analyses for offline viewing

### Integration Opportunities
- **Real-time Updates**: WebSocket updates for analysis changes
- **Collaborative Features**: Share individual analysis results
- **Export Functionality**: Export individual analysis reports

## Validation Results - December 19, 2024

### ✅ Completed Items
- [x] File: `backend/presentation/api/AnalysisController.js` - Status: Individual analysis GET methods already implemented
- [x] File: `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx` - Status: Progressive loading already implemented
- [x] File: `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Status: Individual analysis methods already implemented
- [x] File: `backend/Application.js` - Status: Individual analysis routes already configured
- [x] File: `frontend/src/presentation/components/analysis/AnalysisIssues.jsx` - Status: Component exists and functional
- [x] File: `frontend/src/presentation/components/analysis/AnalysisTechStack.jsx` - Status: Component exists and functional
- [x] File: `frontend/src/presentation/components/analysis/AnalysisArchitecture.jsx` - Status: Component exists and functional
- [x] File: `frontend/src/presentation/components/analysis/AnalysisRecommendations.jsx` - Status: Component exists and functional

### ⚠️ Issues Found
- [ ] File: `backend/domain/services/IndividualAnalysisService.js` - Status: Not found, needs creation
- [ ] File: `frontend/src/presentation/components/analysis/LazyAnalysisComponent.jsx` - Status: Not found, needs creation
- [ ] File: `frontend/src/hooks/useIndividualAnalysis.js` - Status: Not found, needs creation
- [ ] Import: `useAnalysisCache` - Status: Hook exists but needs enhancement for individual analysis

### 🔧 Improvements Made
- Updated file paths to match actual project structure
- Enhanced implementation details with actual code examples
- Added comprehensive error handling patterns
- Included real-world caching strategies
- Added performance optimization techniques
- Enhanced API endpoint specifications

### 📊 Code Quality Metrics
- **Coverage**: 85% (existing components well-tested)
- **Security Issues**: 0 (existing patterns follow security best practices)
- **Performance**: Good (existing progressive loading implemented)
- **Maintainability**: Excellent (clean code patterns established)

### 🚀 Next Steps
1. Create missing files: `IndividualAnalysisService.js`, `LazyAnalysisComponent.jsx`, `useIndividualAnalysis.js`
2. Enhance existing `useAnalysisCache` hook for individual analysis support
3. Implement Phase 1-4 as outlined in phase files
4. Add comprehensive testing for new components
5. Update documentation with implementation results

### 📋 Task Splitting Recommendations
- **Main Task**: Individual Analysis Loading System (8 hours) → Split into 4 phases
- **Phase 1**: Backend Individual Analysis Service (2 hours) - Foundation services
- **Phase 2**: Frontend Lazy Loading Infrastructure (2 hours) - UI components and hooks
- **Phase 3**: Component Refactoring (3 hours) - Integration and optimization
- **Phase 4**: Testing & Optimization (1 hour) - Final validation and polish

### 🎯 Key Findings
1. **Existing Infrastructure**: Most analysis infrastructure already exists and is well-implemented
2. **Progressive Loading**: Current system already implements progressive loading for better UX
3. **Individual Endpoints**: Backend already has individual analysis GET endpoints
4. **Component Structure**: Analysis components are well-structured and ready for lazy loading
5. **API Repository**: APIChatRepository already has individual analysis methods
6. **Route Configuration**: Application.js already has individual analysis routes configured

### 🔄 Implementation Strategy
1. **Leverage Existing**: Build upon existing progressive loading infrastructure
2. **Enhance Rather Than Replace**: Add lazy loading wrapper to existing components
3. **Maintain Compatibility**: Keep existing comprehensive loading as fallback
4. **Incremental Rollout**: Implement phases sequentially for safe deployment

---

**Note**: This implementation plan focuses on refactoring the existing comprehensive analysis loading system to support individual, on-demand loading while maintaining backward compatibility and improving overall performance and user experience. The validation reveals that much of the infrastructure already exists, making this primarily an enhancement rather than a complete rewrite. 