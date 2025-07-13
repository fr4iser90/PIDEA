import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import '@/css/modal/task-workflow-progress.css';

const TaskWorkflowProgress = ({ 
  workflowId, 
  taskData, 
  onCancel, 
  onComplete,
  eventBus 
}) => {
  const [progress, setProgress] = useState({
    status: 'starting',
    step: 'initializing',
    progress: 0,
    details: '',
    error: null,
    startTime: new Date(),
    estimatedTime: taskData?.estimatedTime || 1
  });

  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState([]);

  // Progress steps configuration
  const progressSteps = [
    { key: 'initializing', label: 'Initializing Workflow', progress: 5 },
    { key: 'ai_planning', label: 'AI Planning & Analysis', progress: 20 },
    { key: 'implementation', label: 'Implementation', progress: 50 },
    { key: 'testing', label: 'Testing & Validation', progress: 80 },
    { key: 'deployment', label: 'Deployment & Cleanup', progress: 95 },
    { key: 'completed', label: 'Completed', progress: 100 }
  ];

  // Get current step info
  const getCurrentStepInfo = useCallback(() => {
    return progressSteps.find(step => step.key === progress.step) || progressSteps[0];
  }, [progress.step]);

  // Format elapsed time
  const formatElapsedTime = useCallback((startTime) => {
    const elapsed = Date.now() - startTime.getTime();
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Format estimated time
  const formatEstimatedTime = useCallback((hours) => {
    if (!hours || hours <= 0) return 'Unknown';
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours === 1) return '1 hour';
    return `${hours} hours`;
  }, []);

  // Handle progress updates from event bus
  useEffect(() => {
    if (!eventBus) return;

    const handleProgress = (data) => {
      if (data.workflowId === workflowId) {
        logger.log('[TaskWorkflowProgress] Progress update received:', data);
        setProgress(prev => ({
          ...prev,
          ...data,
          lastUpdate: new Date()
        }));
        setIsLoading(false);
      }
    };

    const handleCompleted = (data) => {
      if (data.workflowId === workflowId) {
        logger.log('[TaskWorkflowProgress] Workflow completed:', data);
        setProgress(prev => ({
          ...prev,
          status: 'completed',
          step: 'completed',
          progress: 100,
          details: 'Task creation completed successfully!',
          completedAt: new Date()
        }));
        setIsLoading(false);
        
        // Call completion callback after delay
        setTimeout(() => {
          if (onComplete) onComplete(data);
        }, 2000);
      }
    };

    const handleError = (data) => {
      if (data.workflowId === workflowId) {
        logger.error('[TaskWorkflowProgress] Workflow error:', data);
        setProgress(prev => ({
          ...prev,
          status: 'error',
          error: data.error || 'An error occurred during task creation',
          lastUpdate: new Date()
        }));
        setIsLoading(false);
      }
    };

    const handleCancelled = (data) => {
      if (data.workflowId === workflowId) {
        logger.log('[TaskWorkflowProgress] Workflow cancelled:', data);
        setProgress(prev => ({
          ...prev,
          status: 'cancelled',
          details: 'Task creation was cancelled',
          lastUpdate: new Date()
        }));
        setIsLoading(false);
      }
    };

    // Subscribe to events
    eventBus.on('task-creation:progress', handleProgress);
    eventBus.on('task-creation:completed', handleCompleted);
    eventBus.on('task-creation:error', handleError);
    eventBus.on('task-creation:cancelled', handleCancelled);

    // Cleanup
    return () => {
      eventBus.off('task-creation:progress', handleProgress);
      eventBus.off('task-creation:completed', handleCompleted);
      eventBus.off('task-creation:error', handleError);
      eventBus.off('task-creation:cancelled', handleCancelled);
    };
  }, [workflowId, eventBus, onComplete]);

  // Add log entry
  const addLogEntry = useCallback((message, type = 'info') => {
    const logEntry = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setLogs(prev => [...prev, logEntry]);
  }, []);

  // Handle cancel
  const handleCancel = useCallback(async () => {
    if (progress.status === 'completed' || progress.status === 'error') {
      if (onComplete) onComplete(progress);
      return;
    }

    try {
      addLogEntry('Cancelling workflow...', 'warning');
      
      if (onCancel) {
        await onCancel(workflowId);
      }
      
      addLogEntry('Workflow cancelled successfully', 'success');
    } catch (error) {
      logger.error('[TaskWorkflowProgress] Failed to cancel workflow:', error);
      addLogEntry(`Failed to cancel workflow: ${error.message}`, 'error');
    }
  }, [workflowId, progress.status, onCancel, onComplete, addLogEntry]);

  // Get status color
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'completed': return '#44aa44';
      case 'error': return '#ff4444';
      case 'cancelled': return '#ffaa00';
      case 'running': return '#4488ff';
      default: return '#888888';
    }
  }, []);

  // Get step icon
  const getStepIcon = useCallback((step) => {
    switch (step) {
      case 'initializing': return '⚙️';
      case 'ai_planning': return '🧠';
      case 'implementation': return '🔨';
      case 'testing': return '🧪';
      case 'deployment': return '🚀';
      case 'completed': return '✅';
      default: return '📋';
    }
  }, []);

  return (
    <div className="task-workflow-progress">
      {/* Header */}
      <div className="progress-header">
        <h3 className="progress-title">
          {getStepIcon(progress.step)} {getCurrentStepInfo().label}
        </h3>
        <div className="progress-meta">
          <span className="elapsed-time">
            ⏱️ {formatElapsedTime(progress.startTime)}
          </span>
          <span className="estimated-time">
            📅 Est: {formatEstimatedTime(progress.estimatedTime)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${progress.progress}%`,
              backgroundColor: getStatusColor(progress.status)
            }}
          />
        </div>
        <div className="progress-text">
          {progress.progress}% Complete
        </div>
      </div>

      {/* Status Display */}
      <div className="status-display">
        <div className={`status-badge status-${progress.status}`}>
          {progress.status.toUpperCase()}
        </div>
        {progress.details && (
          <div className="status-details">
            {progress.details}
          </div>
        )}
      </div>

      {/* Error Display */}
      {progress.error && (
        <div className="error-display">
          <div className="error-icon">⚠️</div>
          <div className="error-message">
            {progress.error}
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="progress-steps">
        {progressSteps.map((step, index) => {
          const isActive = step.key === progress.step;
          const isCompleted = progress.progress >= step.progress;
          const isUpcoming = progress.progress < step.progress;
          
          return (
            <div 
              key={step.key}
              className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isUpcoming ? 'upcoming' : ''}`}
            >
              <div className="step-icon">
                {isCompleted ? '✅' : isActive ? getStepIcon(step.key) : '⏳'}
              </div>
              <div className="step-label">{step.label}</div>
              <div className="step-progress">{step.progress}%</div>
            </div>
          );
        })}
      </div>

      {/* Task Details */}
      {taskData && (
        <div className="task-details">
          <h4>Task Details</h4>
          <div className="task-info">
            <div className="task-field">
              <strong>Title:</strong> {taskData.title}
            </div>
            <div className="task-field">
              <strong>Type:</strong> {taskData.type}
            </div>
            <div className="task-field">
              <strong>Priority:</strong> {taskData.priority}
            </div>
            <div className="task-field">
              <strong>Category:</strong> {taskData.category}
            </div>
            {taskData.estimatedTime && (
              <div className="task-field">
                <strong>Estimated Time:</strong> {taskData.estimatedTime} hours
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="workflow-logs">
          <h4>Workflow Logs</h4>
          <div className="logs-container">
            {logs.map(log => (
              <div key={log.id} className={`log-entry log-${log.type}`}>
                <span className="log-timestamp">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="progress-actions">
        {progress.status === 'completed' ? (
          <button 
            className="btn-primary"
            onClick={handleCancel}
          >
            ✅ View Results
          </button>
        ) : progress.status === 'error' ? (
          <button 
            className="btn-secondary"
            onClick={handleCancel}
          >
            ❌ Close
          </button>
        ) : (
          <button 
            className="btn-danger"
            onClick={handleCancel}
            disabled={isLoading}
          >
            🛑 Cancel Workflow
          </button>
        )}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="loading-indicator">
          <div className="loading-spinner"></div>
          <p>Connecting to workflow...</p>
        </div>
      )}
    </div>
  );
};

export default TaskWorkflowProgress; 