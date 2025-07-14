# Analysis Data Viewer - Phase 3: Integration

## 📋 Phase Overview
- **Phase**: 3
- **Name**: Integration
- **Estimated Time**: 3 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Phase Goals
Integrate the frontend analysis components with existing backend systems, connect to database results, and ensure proper data flow.

## 📋 Tasks

### Task 1: Integrate with Existing Analysis Backend Endpoints (1 hour)
- [ ] **File**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx`
- [ ] **Action**: Add new analysis data methods to API repository
- [ ] **Details**:
  - Add method to fetch analysis data from database
  - Implement real-time analysis status polling
  - Add methods for different analysis types
  - Include error handling and retry logic
  - Add caching for analysis results
- [ ] **Acceptance Criteria**:
  - API methods successfully fetch analysis data
  - Real-time polling works correctly
  - Error handling is robust
  - Caching improves performance
  - All analysis types are supported

### Task 2: Connect Analysis Data to Database Results (1 hour)
- [ ] **File**: `frontend/src/hooks/useAnalysisData.js`
- [ ] **Action**: Enhance custom hook to work with database results
- [ ] **Details**:
  - Connect to analysis_results table data
  - Implement data transformation for frontend
  - Add support for different analysis types
  - Include data validation and sanitization
  - Add real-time data synchronization
- [ ] **Acceptance Criteria**:
  - Database results are properly fetched and transformed
  - Data validation prevents errors
  - Real-time sync works correctly
  - All analysis types are handled
  - Performance is acceptable

### Task 3: Update Sidebar Right Integration (0.5 hours)
- [ ] **File**: `frontend/src/presentation/components/SidebarRight.jsx`
- [ ] **Action**: Update analysis tab integration with new components
- [ ] **Details**:
  - Integrate enhanced analysis panel
  - Add proper data passing between components
  - Ensure consistent state management
  - Update tab switching logic
  - Add loading states
- [ ] **Acceptance Criteria**:
  - Enhanced analysis panel integrates properly
  - Data flows correctly between components
  - State management is consistent
  - Tab switching works smoothly
  - Loading states are properly handled

### Task 4: Test Analysis Data Flow End-to-End (0.5 hours)
- [ ] **Files**: All analysis-related components
- [ ] **Action**: Test complete data flow from backend to frontend
- [ ] **Details**:
  - Test data fetching from database
  - Verify data transformation pipeline
  - Test real-time updates
  - Validate error handling
  - Test performance with large datasets
- [ ] **Acceptance Criteria**:
  - End-to-end data flow works correctly
  - Data transformation is accurate
  - Real-time updates function properly
  - Error handling prevents crashes
  - Performance meets requirements

### Task 5: Implement Error Handling and Loading States (0.5 hours)
- [ ] **Files**: All analysis components
- [ ] **Action**: Add comprehensive error handling and loading states
- [ ] **Details**:
  - Add loading spinners and skeletons
  - Implement error boundaries
  - Add retry mechanisms
  - Include user-friendly error messages
  - Add fallback UI states
- [ ] **Acceptance Criteria**:
  - Loading states are informative and smooth
  - Error boundaries catch and handle errors
  - Retry mechanisms work correctly
  - Error messages are user-friendly
  - Fallback UI provides good UX

## 🔧 Technical Implementation Details

### Enhanced API Repository Methods
```javascript
// APIChatRepository.jsx
class APIChatRepository {
  // ... existing methods ...

  async getAnalysisData(projectId, options = {}) {
    const response = await apiCall(`/api/projects/${projectId}/analyses`, {
      method: 'GET',
      params: options
    });
    return response;
  }

  async getAnalysisStatus(projectId) {
    const response = await apiCall(`/api/projects/${projectId}/analysis/status`);
    return response;
  }

  async getAnalysisByType(projectId, type) {
    const response = await apiCall(`/api/projects/${projectId}/analyses/${type}`);
    return response;
  }

  async getLatestAnalysisByType(projectId, type) {
    const response = await apiCall(`/api/projects/${projectId}/analyses/${type}/latest`);
    return response;
  }

  async pollAnalysisStatus(projectId, interval = 5000) {
    return new Promise((resolve) => {
      const poll = async () => {
        const status = await this.getAnalysisStatus(projectId);
        if (status.data.completed) {
          resolve(status);
        } else {
          setTimeout(poll, interval);
        }
      };
      poll();
    });
  }
}
```

### Enhanced Custom Hook
```javascript
// useAnalysisData.js
import { useState, useEffect, useCallback } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';

export const useAnalysisData = (projectId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  
  const api = new APIChatRepository();

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getAnalysisData(projectId);
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const pollStatus = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const response = await api.getAnalysisStatus(projectId);
      if (response.success) {
        setStatus(response.data);
      }
    } catch (err) {
      console.error('Status polling error:', err);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
    
    // Set up status polling
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchData, pollStatus]);

  return {
    data,
    loading,
    error,
    status,
    refreshData: fetchData
  };
};
```

### Sidebar Integration
```javascript
// SidebarRight.jsx
import EnhancedAnalysisPanel from './chat/sidebar-right/AnalysisPanelComponent';

function SidebarRight({ eventBus, attachedPrompts, setAttachedPrompts, activePort }) {
  // ... existing code ...

  return (
    <div className="sidebar-right-content">
      {/* ... existing tabs ... */}
      <div className="panel-content">
        {currentTab === 'tasks' && <TasksPanelComponent eventBus={eventBus} activePort={activePort} />}
        {currentTab === 'auto' && <AutoPanelComponent eventBus={eventBus} />}
        {currentTab === 'frameworks' && <FrameworksPanelComponent />}
        {currentTab === 'prompts' && <PromptsPanelComponent attachedPrompts={attachedPrompts} setAttachedPrompts={setAttachedPrompts} />}
        {currentTab === 'templates' && <TemplatesPanelComponent />}
        {currentTab === 'analysis' && <EnhancedAnalysisPanel projectId={activePort} />}
        {currentTab === 'settings' && <div className="settings-tab">Settings Panel (TODO)</div>}
      </div>
    </div>
  );
}
```

## 🧪 Testing Requirements
- [ ] Test API integration with backend endpoints
- [ ] Test database data fetching and transformation
- [ ] Test real-time status polling
- [ ] Test error handling scenarios
- [ ] Test loading states and user feedback
- [ ] Test data flow between components
- [ ] Test performance with various data sizes

## 📊 Success Criteria
- [ ] Backend integration works correctly
- [ ] Database results are properly fetched and displayed
- [ ] Real-time updates function reliably
- [ ] Error handling prevents crashes
- [ ] Loading states provide good UX
- [ ] Data flow between components is smooth
- [ ] Performance meets requirements

## 🔄 Dependencies
- Phase 1 and 2 components
- Existing analysis backend endpoints
- Database analysis_results table
- API infrastructure

## 📝 Notes
- Ensure proper error handling for network issues
- Implement appropriate caching strategies
- Consider implementing optimistic updates
- Plan for offline functionality if needed
- Monitor API rate limits and performance

## 🚀 Next Phase
After completing Phase 3, proceed to [Phase 4: Testing & Documentation](./analysis-data-viewer-phase-4.md) for comprehensive testing and documentation. 