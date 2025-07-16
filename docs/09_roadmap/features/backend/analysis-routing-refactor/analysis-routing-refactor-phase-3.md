# Analysis Routing Refactor - Phase 3: Frontend Integration

## Overview
Phase 3 focuses on updating the frontend to use the new RESTful analysis API structure, including API client updates, component modifications, and user interface improvements.

## Objectives
- [ ] Update frontend API client
- [ ] Modify AnalysisPanel component
- [ ] Update any other components using analysis API
- [ ] Test frontend-backend integration

## Deliverables

### API Client Updates
- **File**: `frontend/src/infrastructure/api/analysisApi.js`
- **Changes**:
  - Add new `analyzeProjectBatch` method
  - Update existing methods to use new endpoint structure
  - Add support for analysis types and options
  - Implement progress tracking for batch requests
  - Add error handling for partial failures

### AnalysisPanel Component Updates
- **File**: `frontend/src/presentation/components/AnalysisPanel.jsx`
- **Changes**:
  - Update to send analysis types array instead of single requests
  - Add UI for selecting multiple analysis types
  - Implement progress indicators for batch operations
  - Add result display for multiple analyses
  - Enhance error handling and user feedback

### Component Integration
- **Files to Update**:
  - Any components that call analysis API endpoints
  - Dashboard components that display analysis results
  - Project overview components
  - Settings panels for analysis configuration

### User Interface Enhancements
- **Features**:
  - Analysis type selection interface
  - Progress tracking visualization
  - Batch result display
  - Error handling and retry mechanisms
  - Performance improvements

## Implementation Details

### Updated API Client
```javascript
class AnalysisApi {
  async analyzeProjectBatch(projectId, types, options = {}) {
    try {
      const response = await this.apiClient.post(
        `/api/projects/${projectId}/analysis`,
        {
          types: types,
          options: options
        }
      );
      
      return {
        success: true,
        analysisId: response.data.analysisId,
        results: response.data.results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAnalysisTypes(projectId) {
    const response = await this.apiClient.get(
      `/api/projects/${projectId}/analysis/types`
    );
    return response.data.types;
  }

  async getAnalysisStatus(projectId, analysisId) {
    const response = await this.apiClient.get(
      `/api/projects/${projectId}/analysis/status/${analysisId}`
    );
    return response.data;
  }
}
```

### Enhanced AnalysisPanel Component
```javascript
const AnalysisPanel = ({ projectId }) => {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [analysisOptions, setAnalysisOptions] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState({});
  const [progress, setProgress] = useState(0);

  const availableTypes = [
    'code-quality', 'security', 'performance', 'architecture',
    'techstack', 'recommendations', 'dependencies', 'build-deployment',
    'test-strategy', 'database-schema', 'documentation'
  ];

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    setProgress(0);
    
    try {
      const result = await analysisApi.analyzeProjectBatch(
        projectId,
        selectedTypes,
        analysisOptions
      );
      
      if (result.success) {
        setResults(result.results);
      } else {
        // Handle error
      }
    } catch (error) {
      // Handle error
    } finally {
      setIsAnalyzing(false);
      setProgress(100);
    }
  };

  return (
    <div className="analysis-panel">
      <div className="analysis-selection">
        <h3>Select Analysis Types</h3>
        {availableTypes.map(type => (
          <label key={type}>
            <input
              type="checkbox"
              checked={selectedTypes.includes(type)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedTypes([...selectedTypes, type]);
                } else {
                  setSelectedTypes(selectedTypes.filter(t => t !== type));
                }
              }}
            />
            {type.replace('-', ' ')}
          </label>
        ))}
      </div>

      {isAnalyzing && (
        <div className="progress-indicator">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>Analyzing... {progress}%</span>
        </div>
      )}

      <button 
        onClick={handleAnalysis}
        disabled={selectedTypes.length === 0 || isAnalyzing}
      >
        {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="analysis-results">
          <h3>Analysis Results</h3>
          {Object.entries(results).map(([type, result]) => (
            <div key={type} className={`result-item ${result.success ? 'success' : 'error'}`}>
              <h4>{type.replace('-', ' ')}</h4>
              {result.success ? (
                <pre>{JSON.stringify(result.data, null, 2)}</pre>
              ) : (
                <div className="error-message">{result.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Progress Tracking Integration
```javascript
const useAnalysisProgress = (analysisId) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    if (!analysisId) return;

    const interval = setInterval(async () => {
      try {
        const statusData = await analysisApi.getAnalysisStatus(analysisId);
        setProgress(statusData.progress);
        setStatus(statusData.status);

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error fetching analysis status:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [analysisId]);

  return { progress, status };
};
```

## User Experience Improvements

### Analysis Type Selection
- **Checkbox Interface**: Easy selection of multiple analysis types
- **Presets**: Common analysis combinations (e.g., "Full Analysis", "Quick Check")
- **Validation**: Prevent invalid combinations
- **Descriptions**: Tooltips explaining each analysis type

### Progress Visualization
- **Progress Bar**: Visual indication of analysis progress
- **Status Updates**: Real-time status messages
- **Time Estimates**: Expected completion time
- **Cancel Option**: Ability to cancel running analysis

### Result Display
- **Organized Layout**: Clear separation of different analysis results
- **Success/Error Indicators**: Visual feedback for each analysis type
- **Expandable Details**: Collapsible sections for detailed results
- **Export Options**: Download results in various formats

## Testing Requirements

### Unit Tests
- **File**: `frontend/tests/unit/components/AnalysisPanel.test.js`
- **Test Cases**:
  - Analysis type selection
  - Batch analysis execution
  - Progress tracking
  - Error handling
  - Result display

### Integration Tests
- **File**: `frontend/tests/integration/api/analysisApi.test.js`
- **Test Cases**:
  - API client functionality
  - Error handling
  - Response processing
  - Progress tracking

### E2E Tests
- **File**: `frontend/tests/e2e/analysis-workflow.test.js`
- **Test Cases**:
  - Complete analysis workflow
  - Multiple analysis types
  - Error scenarios
  - Performance under load

## Success Criteria
- [ ] API client supports new batch endpoint
- [ ] AnalysisPanel component works with new API
- [ ] Progress tracking functions correctly
- [ ] Error handling provides good user feedback
- [ ] All existing functionality preserved
- [ ] Performance improvements achieved
- [ ] All tests pass

## Time Estimate: 2 hours

## Dependencies
- Phase 1: Core API Refactor
- Phase 2: Service Layer Updates

## Next Phase
Phase 4: Testing & Documentation - Comprehensive testing and documentation updates 