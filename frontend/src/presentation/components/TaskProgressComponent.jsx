import React, { useState, useEffect } from 'react';
import './TaskProgressComponent.css';

/**
 * TaskProgressComponent - Component for displaying auto-finish task progress
 * Shows real-time progress updates, task status, and completion information
 */
const TaskProgressComponent = ({ sessionId, onComplete, onError, onCancel }) => {
  const [session, setSession] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('pending');
  const [currentTask, setCurrentTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (sessionId) {
      initializeSession();
      startProgressTracking();
    }

    return () => {
      // Cleanup
    };
  }, [sessionId]);

  useEffect(() => {
    // Update duration timer
    if (startTime && status === 'running') {
      const interval = setInterval(() => {
        setDuration(Date.now() - startTime);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [startTime, status]);

  /**
   * Initialize session data
   */
  const initializeSession = async () => {
    try {
      setIsLoading(true);
      
      // Fetch initial session data
      const response = await fetch(`/api/auto-finish/sessions/${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setSession(data.session);
        setStatus(data.session.status);
        setProgress(data.session.progress || 0);
        setTasks(data.session.tasks || []);
        setStartTime(new Date(data.session.startTime));
        
        if (data.session.status === 'completed') {
          handleComplete(data.session);
        } else if (data.session.status === 'failed') {
          handleError(data.session.error);
        }
      } else {
        throw new Error(data.error || 'Failed to load session');
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start real-time progress tracking
   */
  const startProgressTracking = () => {
    // Listen for WebSocket progress updates
    if (window.autoFinishWebSocket) {
      window.autoFinishWebSocket.addEventListener('auto-finish-progress', handleProgressUpdate);
    }
  };

  /**
   * Handle progress updates from WebSocket
   */
  const handleProgressUpdate = (event) => {
    const { sessionId: updateSessionId, event: eventType, data } = event.detail;
    
    if (updateSessionId !== sessionId) {
      return;
    }

    switch (eventType) {
      case 'session-start':
        setStatus('started');
        setStartTime(new Date());
        break;
        
      case 'tasks-parsed':
        setTasks(data.tasks || []);
        setProgress(0);
        break;
        
      case 'task-start':
        setCurrentTask(data.taskDescription);
        setStatus('running');
        break;
        
      case 'task-complete':
        updateTaskProgress(data);
        setProgress(data.progress || 0);
        break;
        
      case 'task-error':
        handleTaskError(data);
        break;
        
      case 'session-complete':
        handleComplete(data);
        break;
        
      case 'session-error':
        handleError(data.error);
        break;
        
      case 'session-cancelled':
        handleCancelled();
        break;
        
      default:
        break;
    }
  };

  /**
   * Update task progress
   */
  const updateTaskProgress = (data) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === data.taskId 
          ? { ...task, status: 'completed', result: data.result }
          : task
      )
    );
    
    setCurrentTask(null);
  };

  /**
   * Handle task error
   */
  const handleTaskError = (data) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === data.taskId 
          ? { ...task, status: 'failed', error: data.error }
          : task
      )
    );
    
    setCurrentTask(null);
  };

  /**
   * Handle session completion
   */
  const handleComplete = (data) => {
    setStatus('completed');
    setProgress(100);
    setDuration(data.duration || 0);
    
    if (onComplete) {
      onComplete(data);
    }
  };

  /**
   * Handle session error
   */
  const handleError = (errorMessage) => {
    setStatus('failed');
    setError(errorMessage);
    
    if (onError) {
      onError(errorMessage);
    }
  };

  /**
   * Handle session cancellation
   */
  const handleCancelled = () => {
    setStatus('cancelled');
    
    if (onCancel) {
      onCancel();
    }
  };

  /**
   * Cancel session
   */
  const cancelSession = async () => {
    try {
      const response = await fetch(`/api/auto-finish/sessions/${sessionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        handleCancelled();
      } else {
        throw new Error(data.error || 'Failed to cancel session');
      }
    } catch (error) {
      console.error('Failed to cancel session:', error);
      setError(error.message);
    }
  };

  /**
   * Format duration
   */
  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = () => {
    switch (status) {
      case 'pending': return '#6c757d';
      case 'started': return '#007bff';
      case 'running': return '#28a745';
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
      case 'cancelled': return '#ffc107';
      default: return '#6c757d';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return '⏳';
      case 'started': return '🚀';
      case 'running': return '⚡';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '⏹️';
      default: return '⏳';
    }
  };

  if (isLoading) {
    return (
      <div className="task-progress-container">
        <div className="task-progress-loading">
          <div className="spinner"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-progress-container">
        <div className="task-progress-error">
          <div className="error-icon">❌</div>
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-progress-container">
      {/* Header */}
      <div className="task-progress-header">
        <div className="status-indicator">
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text" style={{ color: getStatusColor() }}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        
        {duration > 0 && (
          <div className="duration">
            Duration: {formatDuration(duration)}
          </div>
        )}
        
        {status === 'running' && (
          <button 
            className="cancel-button"
            onClick={cancelSession}
            disabled={status !== 'running'}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%`, backgroundColor: getStatusColor() }}
          ></div>
        </div>
        <div className="progress-text">
          {progress}% Complete
        </div>
      </div>

      {/* Current Task */}
      {currentTask && (
        <div className="current-task">
          <h4>Current Task:</h4>
          <p>{currentTask}</p>
        </div>
      )}

      {/* Task List */}
      {tasks.length > 0 && (
        <div className="task-list">
          <h4>Tasks ({tasks.filter(t => t.status === 'completed').length}/{tasks.length})</h4>
          <div className="tasks">
            {tasks.map((task, index) => (
              <div key={task.id} className={`task-item ${task.status}`}>
                <div className="task-status">
                  {task.status === 'completed' && '✅'}
                  {task.status === 'failed' && '❌'}
                  {task.status === 'running' && '⚡'}
                  {task.status === 'pending' && '⏳'}
                </div>
                <div className="task-content">
                  <div className="task-description">{task.description}</div>
                  <div className="task-meta">
                    <span className="task-type">{task.type}</span>
                    {task.duration && (
                      <span className="task-duration">
                        {formatDuration(task.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Info */}
      {session && (
        <div className="session-info">
          <h4>Session Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>Session ID:</label>
              <span>{session.id}</span>
            </div>
            <div className="info-item">
              <label>Total Tasks:</label>
              <span>{session.totalTasks}</span>
            </div>
            <div className="info-item">
              <label>Completed:</label>
              <span>{session.completedTasks}</span>
            </div>
            <div className="info-item">
              <label>Failed:</label>
              <span>{session.failedTasks}</span>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {status === 'completed' && session?.result && (
        <div className="results-section">
          <h4>Results</h4>
          <div className="results-summary">
            <p>Successfully completed {session.result.completedTasks} tasks</p>
            <p>Total duration: {formatDuration(session.result.duration)}</p>
            {session.result.failedTasks > 0 && (
              <p className="warning">
                {session.result.failedTasks} tasks failed
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskProgressComponent; 