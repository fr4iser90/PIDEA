# Phase 3: Frontend Integration

## 📋 Phase Overview
- **Phase Name**: Frontend Integration
- **Duration**: 12 hours
- **Status**: Planning
- **Dependencies**: Phase 1 (Foundation Setup), Phase 2 (Backend Integration)
- **Deliverables**: Frontend event handling, component integration, event-driven refresh system

## 🎯 Objectives
Integrate the event-driven refresh system with existing frontend components, replacing polling with event-driven updates and implementing advanced refresh functionality.

## 📝 Tasks

### 1. Implement useRefresh Custom Hook (1.5 hours)
- [ ] Create `frontend/src/hooks/useRefresh.jsx`
- [ ] Implement smart refresh logic with activity tracking
- [ ] Add network-aware refresh control
- [ ] Create tab visibility-based refresh
- [ ] Implement refresh strategy selection
- [ ] Add refresh state management

**Hook Implementation:**
```javascript
import { useState, useEffect, useCallback } from 'react';
import { useRefreshService } from '@/infrastructure/services/RefreshService';
import { useUserActivityTracker } from '@/infrastructure/services/UserActivityTracker';
import { useNetworkStatusMonitor } from '@/infrastructure/services/NetworkStatusMonitor';

export const useRefresh = (options = {}) => {
  const refreshService = useRefreshService();
  const activityTracker = useUserActivityTracker();
  const networkMonitor = useNetworkStatusMonitor();
  
  const [refreshState, setRefreshState] = useState({
    isActive: true,
    strategy: 'event-driven',
    lastRefresh: null,
    error: null
  });
  
  const executeRefresh = useCallback(async (operation, data) => {
    if (!refreshState.isActive) return;
    
    try {
      await refreshService.executeRefresh(operation, {
        data,
        strategy: refreshState.strategy,
        userActive: activityTracker.isUserActive(),
        networkQuality: networkMonitor.getConnectionQuality()
      });
      
      setRefreshState(prev => ({
        ...prev,
        lastRefresh: new Date(),
        error: null
      }));
    } catch (error) {
      setRefreshState(prev => ({
        ...prev,
        error: error.message
      }));
    }
  }, [refreshService, refreshState, activityTracker, networkMonitor]);
  
  return {
    refreshState,
    executeRefresh,
    pauseRefresh: () => setRefreshState(prev => ({ ...prev, isActive: false })),
    resumeRefresh: () => setRefreshState(prev => ({ ...prev, isActive: true }))
  };
};
```

### 2. Create useQueueUpdates Hook for Queue Management (1 hour)
- [ ] Create `frontend/src/hooks/useQueueUpdates.jsx`
- [ ] Implement queue-specific event handling
- [ ] Add queue cache management
- [ ] Create queue update notifications
- [ ] Implement queue history tracking
- [ ] Add queue validation handling

### 3. Create useAnalysisUpdates Hook for Analysis Management (1 hour)
- [ ] Create `frontend/src/hooks/useAnalysisUpdates.jsx`
- [ ] Implement analysis-specific event handling
- [ ] Add analysis cache management
- [ ] Create analysis update notifications
- [ ] Implement analysis progress tracking
- [ ] Add analysis result handling

### 4. Create useIDEUpdates Hook for IDE Management (1 hour)
- [ ] Create `frontend/src/hooks/useIDEUpdates.jsx`
- [ ] Implement IDE-specific event handling
- [ ] Add IDE cache management
- [ ] Create IDE update notifications
- [ ] Implement IDE status tracking
- [ ] Add IDE feature handling

### 5. Update IDEStore with Unified Refresh Event Handlers (1.5 hours)
- [ ] Modify `frontend/src/infrastructure/stores/IDEStore.jsx`
- [ ] Replace existing refresh logic with event-driven service
- [ ] Add event handlers for WebSocket events
- [ ] Implement optimistic updates for IDE operations
- [ ] Add cache integration for IDE data
- [ ] Update error handling for refresh operations

### 6. Update AuthStore with Unified Refresh Integration (1 hour)
- [ ] Modify `frontend/src/infrastructure/stores/AuthStore.jsx`
- [ ] Replace authentication refresh logic with event-driven service
- [ ] Add event handlers for auth events
- [ ] Implement session monitoring integration
- [ ] Add cache integration for auth data
- [ ] Update error handling for auth refresh operations

### 7. Replace GitManagementComponent Polling with Event-Driven Updates (1.5 hours)

**Version Hook Implementation:**
```javascript
import { useState, useEffect, useCallback } from 'react';
import { useWebSocketService } from '@/infrastructure/services/WebSocketService';
import { useCacheManager } from '@/infrastructure/cache/CacheManager';

export const useVersionUpdates = (workspacePath) => {
  const webSocketService = useWebSocketService();
  const cacheManager = useCacheManager();
  
  const [versionData, setVersionData] = useState({
    currentVersion: null,
    versionHistory: [],
    lastUpdate: null,
    isLoading: false,
    error: null
  });
  
  useEffect(() => {
    const handleVersionUpdated = (data) => {
      if (data.workspacePath === workspacePath) {
        setVersionData(prev => ({
          ...prev,
          currentVersion: data.version,
          lastUpdate: data.timestamp,
          error: null
        }));
        
        // Update cache
        cacheManager.set(`version:${workspacePath}`, data);
      }
    };
    
    webSocketService.on('version:updated', handleVersionUpdated);
    
    return () => {
      webSocketService.off('version:updated', handleVersionUpdated);
    };
  }, [workspacePath, webSocketService, cacheManager]);
  
  const refreshVersion = useCallback(async () => {
    setVersionData(prev => ({ ...prev, isLoading: true }));
    
    try {
      const cached = await cacheManager.get(`version:${workspacePath}`);
      if (cached) {
        setVersionData(prev => ({
          ...prev,
          currentVersion: cached.version,
          lastUpdate: cached.timestamp,
          isLoading: false
        }));
      }
      
      // Fetch fresh data
      const response = await fetch(`/api/version/${workspacePath}`);
      const data = await response.json();
      
      setVersionData(prev => ({
        ...prev,
        currentVersion: data.version,
        lastUpdate: new Date().toISOString(),
        isLoading: false,
        error: null
      }));
    } catch (error) {
      setVersionData(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, [workspacePath, cacheManager]);
  
  return {
    versionData,
    refreshVersion
  };
};
```

### 3. Update IDEStore with Unified Refresh Event Handlers (1.5 hours)
- [ ] Modify `frontend/src/infrastructure/stores/IDEStore.jsx`
- [ ] Replace existing refresh logic with event-driven service
- [ ] Add event handlers for WebSocket events
- [ ] Implement optimistic updates for IDE operations
- [ ] Add cache integration for IDE data
- [ ] Update error handling for refresh operations

**IDEStore Integration:**
```javascript
// In IDEStore.jsx
import { useRefreshService } from '@/infrastructure/services/RefreshService';
import { useCacheManager } from '@/infrastructure/cache/CacheManager';

const useIDEStore = create((set, get) => ({
  // Existing state...
  
  // NEW: Unified refresh integration
  setupUnifiedRefresh: () => {
    const refreshService = useRefreshService();
    const cacheManager = useCacheManager();
    
    // Register refresh strategies
    refreshService.registerStrategy('ide-switch', {
      execute: async (data) => {
        const { newPort, previousPort } = data;
        
        // Optimistic update
        set({ activePort: newPort });
        
        // Background validation
        try {
          const isValid = await get().validatePort(newPort);
          if (!isValid) {
            // Rollback on failure
            set({ activePort: previousPort });
            throw new Error('Invalid port');
          }
        } catch (error) {
          set({ activePort: previousPort });
          throw error;
        }
      }
    });
    
    // WebSocket event handlers
    const handleIDESwitched = (data) => {
      set({
        activePort: data.newPort,
        lastSwitch: data.timestamp
      });
      
      // Update cache
      cacheManager.set('activeIDE', data);
    };
    
    const handleIDEStatusChanged = (data) => {
      set(state => ({
        availableIDEs: state.availableIDEs.map(ide => 
          ide.port === data.port 
            ? { ...ide, status: data.status }
            : ide
        )
      }));
    };
    
    // Register event listeners
    refreshService.eventBus.on('ide:switched', handleIDESwitched);
    refreshService.eventBus.on('ide:status:changed', handleIDEStatusChanged);
  },
  
  // Updated refresh method
  refresh: async () => {
    const refreshService = useRefreshService();
    await refreshService.executeRefresh('ide-refresh', {
      currentPort: get().activePort
    });
  }
}));
```

### 4. Replace GitManagementComponent Polling with Event-Driven Updates (1.5 hours)
- [ ] Modify `frontend/src/presentation/components/git/main/GitManagementComponent.jsx`
- [ ] Remove periodic refresh intervals
- [ ] Add WebSocket event listeners for git events
- [ ] Implement optimistic updates for git operations
- [ ] Add cache integration for git data
- [ ] Update error handling and retry logic

**GitManagementComponent Updates:**
```javascript
// In GitManagementComponent.jsx
import { useRefresh } from '@/hooks/useRefresh';
import { useWebSocketService } from '@/infrastructure/services/WebSocketService';

const GitManagementComponent = () => {
  const { refreshState, executeRefresh } = useRefresh();
  const webSocketService = useWebSocketService();
  
  // Remove old polling useEffect
  // useEffect(() => {
  //   const interval = setInterval(refreshGitStatus, 15000);
  //   return () => clearInterval(interval);
  // }, []);
  
  // NEW: Event-driven updates
  useEffect(() => {
    const handleGitStatusUpdated = (data) => {
      if (data.workspacePath === activeIDE.workspacePath) {
        setGitStatus(data.gitStatus);
        setLastUpdate(data.timestamp);
      }
    };
    
    const handleGitBranchChanged = (data) => {
      if (data.workspacePath === activeIDE.workspacePath) {
        setGitStatus(prev => ({
          ...prev,
          currentBranch: data.newBranch
        }));
      }
    };
    
    webSocketService.on('git:status:changed', handleGitStatusUpdated);
    webSocketService.on('git:branch:changed', handleGitBranchChanged);
    
    return () => {
      webSocketService.off('git:status:changed', handleGitStatusUpdated);
      webSocketService.off('git:branch:changed', handleGitBranchChanged);
    };
  }, [activeIDE.workspacePath, webSocketService]);
  
  // Updated refresh function
  const refreshGitStatus = async () => {
    await executeRefresh('git-status', {
      workspacePath: activeIDE.workspacePath
    });
  };
  
  // Optimistic git operations
  const handleGitOperation = async (operation, options = {}) => {
    // Optimistic update
    if (operation === 'checkout') {
      setGitStatus(prev => ({
        ...prev,
        currentBranch: options.branch
      }));
    }
    
    try {
      const result = await apiCall(`/api/git/${operation}`, {
        method: 'POST',
        body: JSON.stringify({ workspacePath: activeIDE.workspacePath, ...options })
      });
      
      if (!result.success) {
        // Rollback on failure
        await refreshGitStatus();
        throw new Error(result.error);
      }
    } catch (error) {
      // Rollback on error
      await refreshGitStatus();
      throw error;
    }
  };
};
```

### 5. Add Dynamic Version Updates to Footer Component (1 hour)
- [ ] Modify `frontend/src/presentation/components/Footer.jsx`
- [ ] Replace hardcoded version with dynamic version
- [ ] Add useVersionUpdates hook integration
- [ ] Implement version update notifications
- [ ] Add version history access
- [ ] Update version display styling

**Footer Component Updates:**
```javascript
// In Footer.jsx
import { useVersionUpdates } from '@/hooks/useVersionUpdates';
import { useIDEStore } from '@/infrastructure/stores/IDEStore';

const Footer = () => {
  const { activeIDE } = useIDEStore();
  const { versionData, refreshVersion } = useVersionUpdates(activeIDE?.workspacePath);
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="version-info">
          <span className="version-label">Version:</span>
          <span className="version-value">
            {versionData.currentVersion || 'Loading...'}
          </span>
          {versionData.lastUpdate && (
            <span className="version-timestamp">
              Updated: {new Date(versionData.lastUpdate).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="git-info">
          <span className="git-branch">
            Branch: {gitStatus.currentBranch || 'Unknown'}
          </span>
        </div>
        
        <div className="refresh-controls">
          <button 
            onClick={refreshVersion}
            disabled={versionData.isLoading}
            className="refresh-button"
          >
            {versionData.isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </footer>
  );
};
```

### 6. Create VersionStatusComponent for Real-Time Version Display (1 hour)
- [ ] Create `frontend/src/presentation/components/version/VersionStatusComponent.jsx`
- [ ] Implement real-time version display
- [ ] Add version update notifications
- [ ] Create version history viewer
- [ ] Add version validation status
- [ ] Implement version comparison features

**VersionStatusComponent Implementation:**
```javascript
import React, { useState } from 'react';
import { useVersionUpdates } from '@/hooks/useVersionUpdates';
import { useRefresh } from '@/hooks/useRefresh';

const VersionStatusComponent = ({ workspacePath }) => {
  const { versionData, refreshVersion } = useVersionUpdates(workspacePath);
  const { refreshState } = useRefresh();
  const [showHistory, setShowHistory] = useState(false);
  
  return (
    <div className="version-status-component">
      <div className="version-header">
        <h3>Version Status</h3>
        <div className="refresh-indicator">
          {refreshState.isActive ? '🟢 Active' : '🔴 Paused'}
        </div>
      </div>
      
      <div className="version-content">
        <div className="current-version">
          <label>Current Version:</label>
          <span className="version-value">{versionData.currentVersion}</span>
        </div>
        
        <div className="last-update">
          <label>Last Update:</label>
          <span className="timestamp">
            {versionData.lastUpdate 
              ? new Date(versionData.lastUpdate).toLocaleString()
              : 'Never'
            }
          </span>
        </div>
        
        {versionData.error && (
          <div className="error-message">
            Error: {versionData.error}
          </div>
        )}
      </div>
      
      <div className="version-actions">
        <button 
          onClick={refreshVersion}
          disabled={versionData.isLoading}
          className="btn btn-primary"
        >
          {versionData.isLoading ? 'Refreshing...' : 'Refresh Version'}
        </button>
        
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="btn btn-secondary"
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>
      
      {showHistory && (
        <div className="version-history">
          <h4>Version History</h4>
          <div className="history-list">
            {versionData.versionHistory.map((entry, index) => (
              <div key={index} className="history-item">
                <span className="version">{entry.version}</span>
                <span className="timestamp">{entry.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### 7. Implement GlobalRefreshButton for Unified Refresh Control (1 hour)
- [ ] Create `frontend/src/presentation/components/refresh/GlobalRefreshButton.jsx`
- [ ] Implement unified refresh button
- [ ] Add refresh status indicators
- [ ] Create refresh progress display
- [ ] Add refresh error handling
- [ ] Implement refresh history

**GlobalRefreshButton Implementation:**
```javascript
import React, { useState } from 'react';
import { useRefresh } from '@/hooks/useRefresh';
import { useRefreshService } from '@/infrastructure/services/RefreshService';

const GlobalRefreshButton = () => {
  const { refreshState, executeRefresh, pauseRefresh, resumeRefresh } = useRefresh();
  const refreshService = useRefreshService();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState([]);
  
  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Execute refresh for all components
      await Promise.all([
        executeRefresh('ide-refresh'),
        executeRefresh('git-refresh'),
        executeRefresh('version-refresh'),
        executeRefresh('preview-refresh')
      ]);
      
      setRefreshHistory(prev => [{
        timestamp: new Date(),
        status: 'success',
        operations: ['ide', 'git', 'version', 'preview']
      }, ...prev.slice(0, 9)]); // Keep last 10 entries
      
    } catch (error) {
      setRefreshHistory(prev => [{
        timestamp: new Date(),
        status: 'error',
        error: error.message,
        operations: ['ide', 'git', 'version', 'preview']
      }, ...prev.slice(0, 9)]);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <div className="global-refresh-button">
      <button
        onClick={handleGlobalRefresh}
        disabled={isRefreshing || !refreshState.isActive}
        className={`btn btn-primary ${isRefreshing ? 'loading' : ''}`}
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh All'}
      </button>
      
      <div className="refresh-controls">
        <button
          onClick={refreshState.isActive ? pauseRefresh : resumeRefresh}
          className="btn btn-secondary"
        >
          {refreshState.isActive ? 'Pause' : 'Resume'}
        </button>
      </div>
      
      <div className="refresh-status">
        <span className="status-indicator">
          {refreshState.isActive ? '🟢 Active' : '🔴 Paused'}
        </span>
        <span className="strategy">
          Strategy: {refreshState.strategy}
        </span>
      </div>
      
      {refreshHistory.length > 0 && (
        <div className="refresh-history">
          <h4>Recent Refreshes</h4>
          <div className="history-list">
            {refreshHistory.map((entry, index) => (
              <div key={index} className={`history-item ${entry.status}`}>
                <span className="timestamp">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
                <span className="status">
                  {entry.status === 'success' ? '✅' : '❌'}
                </span>
                <span className="operations">
                  {entry.operations.join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### 8. Update PreviewComponent to Use Unified Refresh Service (1 hour)
- [ ] Modify `frontend/src/presentation/components/chat/main/PreviewComponent.jsx`
- [ ] Replace individual refresh logic with event-driven service
- [ ] Add WebSocket event handling for preview updates
- [ ] Implement cache integration for preview data
- [ ] Update error handling for refresh operations
- [ ] Add refresh status indicators

**PreviewComponent Updates:**
```javascript
// In PreviewComponent.jsx
import { useRefresh } from '@/hooks/useRefresh';
import { useWebSocketService } from '@/infrastructure/services/WebSocketService';

const PreviewComponent = () => {
  const { refreshState, executeRefresh } = useRefresh();
  const webSocketService = useWebSocketService();
  
  // Replace individual refresh with event-driven service
  const handleRefresh = async () => {
    await executeRefresh('preview-refresh', {
      port: customPort || activePort,
      workspacePath: activeIDE.workspacePath
    });
  };
  
  // Add WebSocket event handling
  useEffect(() => {
    const handlePreviewUpdated = (data) => {
      if (data.port === (customPort || activePort)) {
        setPreviewData(data.previewData);
        setLastUpdate(data.timestamp);
      }
    };
    
    webSocketService.on('preview:updated', handlePreviewUpdated);
    
    return () => {
      webSocketService.off('preview:updated', handlePreviewUpdated);
    };
  }, [customPort, activePort, webSocketService]);
  
  // Rest of component logic...
};
```

## 🧪 Testing Requirements

### Integration Tests Coverage:
- **useRefresh Hook**: 90% coverage
  - Smart refresh logic
  - Activity tracking integration
  - Network awareness
  - Error handling
  
- **useVersionUpdates Hook**: 90% coverage
  - Version event handling
  - Cache integration
  - Error handling
  - Version history tracking
  
- **IDEStore Integration**: 85% coverage
  - Event handler integration
  - Optimistic updates
  - Cache integration
  - Error handling
  
- **GitManagementComponent**: 85% coverage
  - Event-driven updates
  - Optimistic operations
  - Error handling
  - Cache integration
  
- **Footer Component**: 80% coverage
  - Dynamic version display
  - Version update handling
  - Error states
  
- **VersionStatusComponent**: 85% coverage
  - Real-time version display
  - Version history
  - Error handling
  
- **GlobalRefreshButton**: 85% coverage
  - Unified refresh execution
  - Refresh status management
  - Error handling
  
- **PreviewComponent**: 80% coverage
  - Unified refresh integration
  - Event handling
  - Error handling

## 📋 Deliverables Checklist
- [ ] useRefresh hook created and tested
- [ ] useVersionUpdates hook created and tested
- [ ] IDEStore updated with unified refresh integration
- [ ] GitManagementComponent migrated to event-driven updates
- [ ] Footer component updated with dynamic version display
- [ ] VersionStatusComponent created and tested
- [ ] GlobalRefreshButton created and tested
- [ ] PreviewComponent updated with unified refresh service
- [ ] All integration tests passing with required coverage
- [ ] Documentation updated with new integration patterns

## 🔄 Integration Points
- **Backend WebSocket Events**: Connected to frontend event handlers
- **Unified Refresh Service**: Integrated with all components
- **Smart Cache Manager**: Used by all components for data caching
- **User Activity Tracker**: Integrated with refresh control
- **Network Status Monitor**: Integrated with refresh strategies

## 📊 Success Criteria
- [ ] All components use unified refresh service
- [ ] Event-driven updates work for all components
- [ ] Optimistic updates implemented for user operations
- [ ] Cache integration working for all components
- [ ] Error handling and retry mechanisms functional
- [ ] Integration tests achieve required coverage
- [ ] No performance degradation from event handling
- [ ] User experience improved with real-time updates

## 🚀 Next Phase Preparation
- Frontend components ready for smart refresh features
- Event-driven updates working across all components
- Cache system integrated with all components
- Error handling and retry mechanisms in place
- User activity tracking integrated with refresh control

---

**Phase 3 completes the frontend integration of the event-driven refresh system. Phase 4 will add advanced smart refresh features and optimizations.**
