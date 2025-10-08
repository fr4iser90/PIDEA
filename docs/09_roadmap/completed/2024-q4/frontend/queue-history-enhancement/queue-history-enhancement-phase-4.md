# Queue History Enhancement - Phase 4: Integration & Real-time Updates

## 📋 Phase Overview
- **Phase Name**: Integration & Real-time Updates
- **Phase Number**: 4
- **Parent Task**: Queue History Enhancement & Workflow Type Identification
- **Estimated Time**: 8 hours
- **Status**: ⏳ Planning
- **Dependencies**: Phase 3 (Frontend Infrastructure)
- **Created**: 2025-07-28T13:25:05.334Z

## 🎯 Phase Objectives
- [ ] Integrate QueueHistoryPanel into QueueManagementPanel
- [ ] Enhance StepTimeline with real-time updates
- [ ] Add WebSocket integration for live history updates
- [ ] Implement step progress real-time tracking
- [ ] Add workflow type badges throughout UI
- [ ] Test real-time functionality

## 📁 Files to Modify

### Existing Components
- [ ] `frontend/src/presentation/components/queue/QueueManagementPanel.jsx` - Add history tab and enhanced type display
  - **Enhancements**: Add history tab, integrate QueueHistoryPanel, add type badges
  - **New Features**: Tab navigation, real-time updates, error handling

- [ ] `frontend/src/presentation/components/queue/StepTimeline.jsx` - Add real-time updates and detailed step information
  - **Enhancements**: Real-time step progress, detailed step information, type badges
  - **New Features**: Live updates, step details, progress indicators

- [ ] `frontend/src/presentation/components/queue/ActiveTaskItem.jsx` - Enhance workflow type display and step progress
  - **Enhancements**: Add taskModeBadge, real-time progress, error handling
  - **New Features**: Type badges, progress indicators, error states

### WebSocket Integration
- [ ] `frontend/src/infrastructure/websocket/QueueWebSocketService.js` - WebSocket service for real-time updates
  - **New Features**: History updates, type detection events, step progress events
  - **Error Handling**: Connection retry, error events, fallback mechanisms

## 📁 Files to Create

### Hooks
- [ ] `frontend/src/hooks/useQueueHistory.js` - Custom hook for queue history management
  - **Purpose**: State management for queue history with real-time updates
  - **Features**: History fetching, filtering, pagination, real-time updates

- [ ] `frontend/src/hooks/useWebSocket.js` - Custom hook for WebSocket management
  - **Purpose**: WebSocket connection management and event handling
  - **Features**: Connection management, event listeners, error handling

### Test Files
- [ ] `frontend/tests/integration/QueueManagementPanel.test.jsx` - Integration tests for queue management
- [ ] `frontend/tests/integration/StepTimeline.test.jsx` - Integration tests for step timeline
- [ ] `frontend/tests/unit/hooks/useQueueHistory.test.js` - Unit tests for queue history hook
- [ ] `frontend/tests/unit/hooks/useWebSocket.test.js` - Unit tests for WebSocket hook

## 🔧 Implementation Details

### Enhanced QueueManagementPanel
```jsx
import React, { useState } from 'react';
import { QueueHistoryPanel } from './QueueHistoryPanel';
import { ActiveTaskItem } from './ActiveTaskItem';
import { StepTimeline } from './StepTimeline';
import { taskModeBadge } from './taskModeBadge';
import { useWebSocket } from '@/hooks/useWebSocket';
import './queue-management-panel.css';

const QueueManagementPanel = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [activeTasks, setActiveTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  // WebSocket connection for real-time updates
  const { connected, error: wsError } = useWebSocket({
    url: process.env.REACT_APP_WS_URL,
    events: {
      'queue.history.updated': handleHistoryUpdate,
      'queue.type.detected': handleTypeDetection,
      'queue.step.progress': handleStepProgress,
      'queue.error.type_detection': handleTypeDetectionError,
      'queue.error.history_update': handleHistoryUpdateError
    }
  });

  const handleHistoryUpdate = (data) => {
    // Update history in real-time
    console.log('History updated:', data);
    // Trigger history refresh if history tab is active
    if (activeTab === 'history') {
      // Refresh history data
    }
  };

  const handleTypeDetection = (data) => {
    // Update workflow type in real-time
    console.log('Type detected:', data);
    setActiveTasks(prev => prev.map(task => 
      task.id === data.workflowId 
        ? { ...task, type: data.type, typeConfidence: data.confidence }
        : task
    ));
  };

  const handleStepProgress = (data) => {
    // Update step progress in real-time
    console.log('Step progress:', data);
    setActiveTasks(prev => prev.map(task => 
      task.id === data.workflowId 
        ? { ...task, currentStep: data.step }
        : task
    ));
  };

  const handleTypeDetectionError = (data) => {
    console.error('Type detection error:', data);
    // Show error notification
  };

  const handleHistoryUpdateError = (data) => {
    console.error('History update error:', data);
    // Show error notification
  };

  const tabs = [
    { id: 'active', label: 'Active Tasks', icon: '⚡' },
    { id: 'history', label: 'History', icon: '📋' },
    { id: 'timeline', label: 'Step Timeline', icon: '📊' }
  ];

  return (
    <div className="queue-management-panel">
      <div className="panel-header">
        <h2>Queue Management</h2>
        <div className="connection-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢' : '🔴'}
          </span>
          <span className="status-text">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {wsError && (
        <div className="websocket-error">
          <p>WebSocket Error: {wsError.message}</p>
          <button onClick={() => window.location.reload()}>
            Reconnect
          </button>
        </div>
      )}

      <div className="panel-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="panel-content">
        {activeTab === 'active' && (
          <div className="active-tasks-section">
            <div className="section-header">
              <h3>Active Tasks ({activeTasks.length})</h3>
              <div className="task-filters">
                <select 
                  onChange={(e) => filterTasksByType(e.target.value)}
                  defaultValue=""
                >
                  <option value="">All Types</option>
                  <option value="refactoring">Refactoring</option>
                  <option value="testing">Testing</option>
                  <option value="analysis">Analysis</option>
                  <option value="feature">Feature</option>
                  <option value="bugfix">Bug Fix</option>
                  <option value="documentation">Documentation</option>
                  <option value="manual">Manual</option>
                  <option value="optimization">Optimization</option>
                  <option value="security">Security</option>
                  <option value="generic">Generic</option>
                </select>
              </div>
            </div>

            <div className="active-tasks-list">
              {activeTasks.length === 0 ? (
                <div className="empty-state">
                  <p>No active tasks</p>
                </div>
              ) : (
                activeTasks.map(task => (
                  <ActiveTaskItem
                    key={task.id}
                    task={task}
                    isSelected={selectedTask?.id === task.id}
                    onSelect={() => setSelectedTask(task)}
                    onTypeError={(error) => handleTypeError(task.id, error)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <QueueHistoryPanel />
        )}

        {activeTab === 'timeline' && selectedTask && (
          <div className="step-timeline-section">
            <div className="section-header">
              <h3>Step Timeline</h3>
              <div className="task-info">
                <taskModeBadge type={selectedTask.type} />
                <span className="task-id">ID: {selectedTask.id}</span>
              </div>
            </div>
            <StepTimeline 
              taskId={selectedTask.id}
              onStepError={(error) => handleStepError(selectedTask.id, error)}
            />
          </div>
        )}

        {activeTab === 'timeline' && !selectedTask && (
          <div className="empty-state">
            <p>Select a task to view its step timeline</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueManagementPanel;
```

### Enhanced StepTimeline Component
```jsx
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { taskModeBadge } from './taskModeBadge';
import './step-timeline.css';

const StepTimeline = ({ taskId, onStepError }) => {
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // WebSocket for real-time step updates
  const { connected } = useWebSocket({
    url: process.env.REACT_APP_WS_URL,
    events: {
      'queue.step.progress': handleStepProgress,
      'queue.error.step_progress': handleStepError
    }
  });

  useEffect(() => {
    if (taskId) {
      fetchStepTimeline(taskId);
    }
  }, [taskId]);

  const fetchStepTimeline = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/queue/tasks/${id}/timeline`);
      if (!response.ok) {
        throw new Error(`Failed to fetch timeline: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch timeline');
      }
      
      setSteps(data.steps);
      setCurrentStep(data.currentStep);
    } catch (err) {
      setError(err.message);
      onStepError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStepProgress = (data) => {
    if (data.workflowId === taskId) {
      setSteps(prev => prev.map(step => 
        step.id === data.step.stepId 
          ? { ...step, ...data.step }
          : step
      ));
      setCurrentStep(data.step);
    }
  };

  const handleStepError = (data) => {
    if (data.workflowId === taskId) {
      const error = new Error(data.error);
      setError(error.message);
      onStepError?.(error);
    }
  };

  const getStepStatus = (step) => {
    if (step.status === 'completed') return 'completed';
    if (step.status === 'failed') return 'failed';
    if (step.status === 'running') return 'running';
    if (step.status === 'pending') return 'pending';
    return 'unknown';
  };

  const getStepIcon = (step) => {
    const status = getStepStatus(step);
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'running': return '🔄';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="step-timeline-loading">
        <div className="loading-spinner"></div>
        <p>Loading step timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="step-timeline-error">
        <h4>Error Loading Timeline</h4>
        <p>{error}</p>
        <button onClick={() => fetchStepTimeline(taskId)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="step-timeline">
      <div className="timeline-header">
        <div className="connection-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢' : '🔴'}
          </span>
          <span>Real-time updates {connected ? 'enabled' : 'disabled'}</span>
        </div>
      </div>

      <div className="timeline-content">
        {steps.length === 0 ? (
          <div className="empty-timeline">
            <p>No steps found for this task</p>
          </div>
        ) : (
          <div className="timeline-steps">
            {steps.map((step, index) => (
              <div 
                key={step.id} 
                className={`timeline-step ${getStepStatus(step)} ${
                  currentStep?.stepId === step.id ? 'current' : ''
                }`}
              >
                <div className="step-marker">
                  <span className="step-icon">{getStepIcon(step)}</span>
                  {index < steps.length - 1 && <div className="step-connector"></div>}
                </div>
                
                <div className="step-content">
                  <div className="step-header">
                    <h4 className="step-title">{step.title}</h4>
                    <span className="step-status">{step.status}</span>
                  </div>
                  
                  <div className="step-details">
                    <p className="step-description">{step.description}</p>
                    
                    {step.metadata && (
                      <div className="step-metadata">
                        {step.metadata.type && (
                          <taskModeBadge type={step.metadata.type} size="small" />
                        )}
                        {step.metadata.duration && (
                          <span className="step-duration">
                            Duration: {formatDuration(step.metadata.duration)}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {step.error && (
                      <div className="step-error">
                        <strong>Error:</strong> {step.error}
                      </div>
                    )}
                    
                    {step.progress && (
                      <div className="step-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${step.progress}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">{step.progress}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="step-timestamps">
                    {step.startedAt && (
                      <span className="step-started">
                        Started: {formatTimestamp(step.startedAt)}
                      </span>
                    )}
                    {step.completedAt && (
                      <span className="step-completed">
                        Completed: {formatTimestamp(step.completedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const formatDuration = (ms) => {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

export default StepTimeline;
```

### Enhanced ActiveTaskItem Component
```jsx
import React from 'react';
import { taskModeBadge } from './taskModeBadge';
import './active-task-item.css';

const ActiveTaskItem = ({ task, isSelected, onSelect, onTypeError }) => {
  const handleTypeError = (error) => {
    console.error('Type error for task:', task.id, error);
    onTypeError?.(error);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'var(--status-running)';
      case 'pending': return 'var(--status-pending)';
      case 'completed': return 'var(--status-completed)';
      case 'failed': return 'var(--status-failed)';
      default: return 'var(--status-unknown)';
    }
  };

  const formatDuration = (startTime) => {
    if (!startTime) return 'N/A';
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    return formatDuration(diff);
  };

  return (
    <div 
      className={`active-task-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(task)}
    >
      <div className="task-header">
        <div className="task-type">
          <taskModeBadge 
            type={task.type} 
            onError={handleTypeError}
          />
        </div>
        <div className="task-status">
          <span 
            className="status-indicator"
            style={{ backgroundColor: getStatusColor(task.status) }}
          ></span>
          <span className="status-text">{task.status}</span>
        </div>
      </div>
      
      <div className="task-content">
        <div className="task-title">
          <h4>{task.title || 'Untitled Task'}</h4>
          <span className="task-id">#{task.id}</span>
        </div>
        
        <div className="task-description">
          {task.description || 'No description available'}
        </div>
        
        <div className="task-metrics">
          <div className="metric">
            <span className="metric-label">Duration:</span>
            <span className="metric-value">{formatDuration(task.startedAt)}</span>
          </div>
          
          {task.currentStep && (
            <div className="metric">
              <span className="metric-label">Current Step:</span>
              <span className="metric-value">{task.currentStep.title}</span>
            </div>
          )}
          
          {task.progress && (
            <div className="metric">
              <span className="metric-label">Progress:</span>
              <span className="metric-value">{task.progress}%</span>
            </div>
          )}
        </div>
        
        {task.error && (
          <div className="task-error">
            <strong>Error:</strong> {task.error}
          </div>
        )}
      </div>
      
      <div className="task-actions">
        <button 
          className="btn btn-view"
          onClick={(e) => {
            e.stopPropagation();
            // View task details
          }}
        >
          View Details
        </button>
        
        {task.status === 'running' && (
          <button 
            className="btn btn-cancel"
            onClick={(e) => {
              e.stopPropagation();
              // Cancel task
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ActiveTaskItem;
```

### useQueueHistory Hook
```javascript
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import QueueRepository from '@/infrastructure/repositories/QueueRepository';

export const useQueueHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentFilters, setCurrentFilters] = useState({});
  const [currentPagination, setCurrentPagination] = useState({ page: 1, limit: 20 });

  // WebSocket for real-time updates
  const { connected } = useWebSocket({
    url: process.env.REACT_APP_WS_URL,
    events: {
      'queue.history.updated': handleHistoryUpdate,
      'queue.error.history_update': handleHistoryError
    }
  });

  const fetchHistory = useCallback(async (filters = {}, pagination = { page: 1, limit: 20 }) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await QueueRepository.getQueueHistory(filters, pagination);
      
      setHistory(result.items || []);
      setTotalPages(result.pagination?.totalPages || 0);
      setCurrentFilters(filters);
      setCurrentPagination(pagination);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch queue history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteHistory = useCallback(async (retentionDays) => {
    try {
      setError(null);
      const result = await QueueRepository.deleteHistory(retentionDays);
      
      // Refresh history after deletion
      await fetchHistory(currentFilters, currentPagination);
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Failed to delete history:', err);
      throw err;
    }
  }, [currentFilters, currentPagination, fetchHistory]);

  const handleHistoryUpdate = useCallback((data) => {
    // Update history in real-time
    setHistory(prev => {
      const existingIndex = prev.findIndex(item => item.id === data.history.id);
      
      if (existingIndex >= 0) {
        // Update existing item
        const updated = [...prev];
        updated[existingIndex] = data.history;
        return updated;
      } else {
        // Add new item
        return [data.history, ...prev];
      }
    });
  }, []);

  const handleHistoryError = useCallback((data) => {
    setError(data.error);
    console.error('History update error:', data);
  }, []);

  // Initial load
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    totalPages,
    connected,
    fetchHistory,
    deleteHistory,
    refresh: () => fetchHistory(currentFilters, currentPagination)
  };
};
```

### useWebSocket Hook
```javascript
import { useEffect, useRef, useState, useCallback } from 'react';

export const useWebSocket = ({ url, events = {} }) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnected(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };
      
      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { event: eventType, ...eventData } = data;
          
          if (events[eventType]) {
            events[eventType](eventData);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError(err);
    }
  }, [url, events]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  const send = useCallback((event, data) => {
    if (wsRef.current && connected) {
      try {
        wsRef.current.send(JSON.stringify({ event, ...data }));
      } catch (err) {
        console.error('Failed to send WebSocket message:', err);
        setError(err);
      }
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, [connected]);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connected,
    error,
    send,
    disconnect,
    reconnect: connect
  };
};
```

## 🧪 Testing Strategy

### Integration Tests for QueueManagementPanel
```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QueueManagementPanel from './QueueManagementPanel';
import { useWebSocket } from '@/hooks/useWebSocket';

jest.mock('@/hooks/useWebSocket');

describe('QueueManagementPanel Integration', () => {
  beforeEach(() => {
    useWebSocket.mockReturnValue({
      connected: true,
      error: null
    });
  });

  it('should switch between tabs correctly', () => {
    render(<QueueManagementPanel />);
    
    const historyTab = screen.getByText('History');
    fireEvent.click(historyTab);
    
    expect(screen.getByText('Queue History')).toBeInTheDocument();
  });

  it('should display WebSocket connection status', () => {
    render(<QueueManagementPanel />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should handle WebSocket errors', () => {
    useWebSocket.mockReturnValue({
      connected: false,
      error: { message: 'Connection failed' }
    });

    render(<QueueManagementPanel />);
    expect(screen.getByText('WebSocket Error: Connection failed')).toBeInTheDocument();
  });
});
```

### Integration Tests for StepTimeline
```javascript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StepTimeline from './StepTimeline';
import { useWebSocket } from '@/hooks/useWebSocket';

jest.mock('@/hooks/useWebSocket');
global.fetch = jest.fn();

describe('StepTimeline Integration', () => {
  beforeEach(() => {
    useWebSocket.mockReturnValue({
      connected: true
    });
  });

  it('should load and display step timeline', async () => {
    const mockSteps = [
      { id: '1', title: 'Step 1', status: 'completed' },
      { id: '2', title: 'Step 2', status: 'running' }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        steps: mockSteps,
        currentStep: mockSteps[1]
      })
    });

    render(<StepTimeline taskId="test-task" />);
    
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });
  });

  it('should handle timeline loading errors', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<StepTimeline taskId="test-task" />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Loading Timeline')).toBeInTheDocument();
    });
  });
});
```

## 🔒 Security Considerations
- [ ] WebSocket connection security (WSS in production)
- [ ] Input validation for all real-time data
- [ ] Rate limiting for WebSocket messages
- [ ] Authentication for WebSocket connections
- [ ] Error message sanitization

## 📊 Performance Requirements
- **WebSocket Latency**: < 50ms for real-time updates
- **Component Rendering**: < 100ms for timeline updates
- **Memory Usage**: < 15MB for WebSocket connections
- **Reconnection**: < 5 seconds for automatic reconnection

## ✅ Success Criteria
- [ ] QueueHistoryPanel integrates seamlessly into QueueManagementPanel
- [ ] StepTimeline shows real-time updates correctly
- [ ] WebSocket connections work reliably with error handling
- [ ] taskModeBadge displays throughout the UI
- [ ] All real-time functionality works without fallbacks
- [ ] Integration tests pass with 90%+ coverage

## 🚨 Risk Mitigation
- **WebSocket Reliability**: Automatic reconnection with exponential backoff
- **Real-time Performance**: Optimized rendering and state updates
- **Error Propagation**: Comprehensive error handling and user feedback
- **Memory Leaks**: Proper cleanup of WebSocket connections and event listeners

## 🔄 Next Phase Dependencies
- All components must be integrated and functional
- WebSocket connections must be stable and reliable
- Real-time updates must work correctly
- Integration tests must pass before final testing phase

---

**Note**: This phase focuses on integration and real-time updates with strict error handling and no fallback mechanisms. All real-time functionality will throw specific errors rather than using default values. 