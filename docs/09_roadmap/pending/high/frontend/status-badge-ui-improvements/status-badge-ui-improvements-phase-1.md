# Phase 1: Status Badge Foundation

## 📋 Phase Overview
- **Phase**: 1 of 4
- **Duration**: 3 hours
- **Status**: In Progress
- **Progress**: 0%
- **Dependencies**: Existing IDE integration system
- **Started**: 2025-09-27T21:31:50.000Z

## 🎯 Objectives
Create the foundation for the Status Badge system with real-time IDE status display, visual indicators, and basic integration with the header component.

## 📝 Tasks

### 1.1 Create StatusBadge Component (1 hour)
- [ ] Create `frontend/src/presentation/components/ide/StatusBadge.jsx`
- [ ] Implement status detection logic using IDEStore
- [ ] Add visual status indicators (green/yellow/red)
- [ ] Create status tooltips with detailed information
- [ ] Add click-to-refresh functionality

### 1.2 Implement Status Detection Logic (1 hour)
- [ ] Integrate with existing IDEStore for real-time status
- [ ] Add status polling mechanism
- [ ] Implement status change detection
- [ ] Create status validation logic
- [ ] Add error state handling

### 1.3 Integrate with Header Component (1 hour)
- [ ] Modify `frontend/src/presentation/components/Header.jsx`
- [ ] Add StatusBadge to header layout
- [ ] Create responsive positioning
- [ ] Add CSS styling for status badge
- [ ] Implement status context integration

## 🔧 Technical Implementation

### StatusBadge Component Structure
```javascript
// frontend/src/presentation/components/ide/StatusBadge.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';

const StatusBadge = ({ className = '', showTooltip = true, onClick }) => {
  const { activePort, availableIDEs, isLoading, error } = useIDEStore();
  const [status, setStatus] = useState('unknown');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Status detection logic
  const detectStatus = useCallback(() => {
    if (!activePort) {
      setStatus('disconnected');
      return;
    }

    const activeIDE = availableIDEs.find(ide => ide.port === activePort);
    if (!activeIDE) {
      setStatus('unknown');
      return;
    }

    setStatus(activeIDE.status || 'unknown');
    setLastUpdate(new Date().toISOString());
  }, [activePort, availableIDEs]);

  // Refresh status manually
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await useIDEStore.getState().refresh();
      detectStatus();
    } catch (error) {
      logger.error('Error refreshing status:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, detectStatus]);

  // Auto-detect status changes
  useEffect(() => {
    detectStatus();
  }, [detectStatus]);

  // Get status indicator
  const getStatusIndicator = () => {
    switch (status) {
      case 'running':
        return { icon: '🟢', color: 'green', text: 'Running' };
      case 'starting':
        return { icon: '🟡', color: 'yellow', text: 'Starting' };
      case 'stopped':
        return { icon: '🔴', color: 'red', text: 'Stopped' };
      case 'error':
        return { icon: '🔴', color: 'red', text: 'Error' };
      case 'disconnected':
        return { icon: '⚪', color: 'gray', text: 'Disconnected' };
      default:
        return { icon: '⚪', color: 'gray', text: 'Unknown' };
    }
  };

  const statusInfo = getStatusIndicator();
  const activeIDE = availableIDEs.find(ide => ide.port === activePort);

  return (
    <div 
      className={`status-badge ${className} ${status}`}
      onClick={onClick || handleRefresh}
      title={showTooltip ? `IDE Status: ${statusInfo.text}${lastUpdate ? ` (Last updated: ${new Date(lastUpdate).toLocaleTimeString()})` : ''}` : ''}
    >
      <span className={`status-indicator ${statusInfo.color}`}>
        {statusInfo.icon}
      </span>
      {isRefreshing && <span className="refresh-spinner">⟳</span>}
      {error && <span className="error-indicator">⚠️</span>}
    </div>
  );
};

export default StatusBadge;
```

### Header Integration
```javascript
// frontend/src/presentation/components/Header.jsx
import StatusBadge from './ide/StatusBadge.jsx';

function Header({ eventBus, currentView, onNavigationClick, onLeftSidebarToggle, onRightSidebarToggle }) {
  // ... existing code ...

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">PIDEA - Your personal AI agent</h1>
        
        {/* Status Badge */}
        <StatusBadge className="header-status-badge" />
        
        {/* Navigation */}
        <nav className="header-navigation">
          {/* ... existing navigation ... */}
        </nav>
      </div>
      
      <div className="header-actions">
        {/* ... existing actions ... */}
      </div>
    </header>
  );
}
```

### CSS Styling
```css
/* frontend/src/css/components/ide/status-badge.css */
.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9em;
}

.status-badge:hover {
  background: var(--hover-bg);
  transform: translateY(-1px);
}

.status-indicator {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.status-indicator.green {
  color: var(--accent-green);
}

.status-indicator.yellow {
  color: var(--accent-yellow);
}

.status-indicator.red {
  color: var(--accent-red);
}

.status-indicator.gray {
  color: var(--text-secondary);
}

.refresh-spinner {
  animation: spin 1s linear infinite;
  font-size: 10px;
}

.error-indicator {
  color: var(--accent-red);
  font-size: 10px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Header specific styling */
.header-status-badge {
  margin-right: 16px;
}

/* Responsive design */
@media (max-width: 768px) {
  .status-badge {
    padding: 2px 6px;
    font-size: 0.8em;
  }
  
  .header-status-badge {
    margin-right: 8px;
  }
}
```

## 🧪 Testing Requirements

### Unit Tests
- [ ] Test StatusBadge component rendering
- [ ] Test status detection logic
- [ ] Test refresh functionality
- [ ] Test error state handling
- [ ] Test tooltip display

### Integration Tests
- [ ] Test integration with IDEStore
- [ ] Test header integration
- [ ] Test responsive design
- [ ] Test status change detection

## 📋 Acceptance Criteria
- [ ] StatusBadge component displays correct status indicators
- [ ] Real-time status updates work correctly
- [ ] Click-to-refresh functionality works
- [ ] Tooltips show detailed status information
- [ ] Header integration is seamless
- [ ] Responsive design works on all screen sizes
- [ ] All tests pass

## 🚀 Next Phase
After completing Phase 1, proceed to [Phase 2: IDE Start Modal](./status-badge-ui-improvements-phase-2.md) for implementing the IDE start modal functionality.

## 📝 Notes
- Focus on real-time status detection and display
- Ensure smooth integration with existing IDE system
- Pay attention to performance and avoid unnecessary re-renders
- Consider accessibility features for status indicators