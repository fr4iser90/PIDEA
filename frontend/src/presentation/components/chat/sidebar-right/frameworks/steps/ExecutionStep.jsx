import React, { useState, useEffect } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository.jsx';

function ExecutionStep({ tasks, onTaskProgress, workflowData }) {
  const [taskStatuses, setTaskStatuses] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState(null);
  const api = new APIChatRepository();

  useEffect(() => {
    // Initialize task statuses
    const statuses = {};
    tasks.forEach(task => {
      statuses[task.id] = task.status || 'pending';
    });
    setTaskStatuses(statuses);
  }, [tasks]);

  const executeTask = async (task) => {
    setIsExecuting(true);
    setExecutionError(null);

    try {
      // Update task status to in_progress
      setTaskStatuses(prev => ({
        ...prev,
        [task.id]: 'in_progress'
      }));

      // ⚠️ DEPRECATED: This method uses deprecated task execution API
      // TODO: Migrate to POST /api/projects/:projectId/tasks/enqueue for proper queue-based execution
      console.warn('🚨 [ExecutionStep] Using DEPRECATED executeTask method. Please migrate to tasks/enqueue');
      // Execute the task using existing API
      const response = await api.executeTask(task.databaseId, workflowData.projectId);
      
      if (response.success) {
        // Task executed successfully
        setTaskStatuses(prev => ({
          ...prev,
          [task.id]: 'completed'
        }));
        
        // Update progress counter
        const completedCount = Object.values({
          ...taskStatuses,
          [task.id]: 'completed'
        }).filter(status => status === 'completed').length;
        
        onTaskProgress(completedCount);
      } else {
        throw new Error(response.error || 'Task execution failed');
      }
    } catch (error) {
      setTaskStatuses(prev => ({
        ...prev,
        [task.id]: 'failed'
      }));
      setExecutionError(`Failed to execute "${task.title}": ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const renderTaskItem = (task) => {
    const status = taskStatuses[task.id] || 'pending';
    
    return (
      <div key={task.id} className="execution-task-item">
        <div className="task-header">
          <span className="task-title">{task.title}</span>
          <span className={`task-status status-${status}`}>
            {status === 'pending' && '⏳ Pending'}
            {status === 'in_progress' && '🔄 Executing...'}
            {status === 'completed' && '✅ Completed'}
            {status === 'failed' && '❌ Failed'}
          </span>
        </div>
        
        <div className="task-details">
          <p className="task-description">{task.description}</p>
          <div className="task-meta">
            <span className="meta-item">📂 {task.category}</span>
            <span className="meta-item">⏱️ {task.estimatedHours}h</span>
            <span className="meta-item">#{task.databaseId}</span>
          </div>
        </div>

        <div className="task-actions">
          {status === 'pending' && (
            <button 
              className="btn-primary execute-btn"
              onClick={() => executeTask(task)}
              disabled={isExecuting}
            >
              {isExecuting ? 'Executing...' : 'Execute Task'}
            </button>
          )}
          {status === 'failed' && (
            <button 
              className="btn-secondary retry-btn"
              onClick={() => executeTask(task)}
              disabled={isExecuting}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderProgressSummary = () => {
    const totalTasks = tasks.length;
    const completedTasks = Object.values(taskStatuses).filter(status => status === 'completed').length;
    const failedTasks = Object.values(taskStatuses).filter(status => status === 'failed').length;
    const inProgressTasks = Object.values(taskStatuses).filter(status => status === 'in_progress').length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
      <div className="progress-summary">
        <h4>📊 Execution Progress</h4>
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="progress-text">{progressPercentage}%</span>
        </div>
        
        <div className="progress-stats">
          <div className="stat-item">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{totalTasks}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Completed:</span>
            <span className="stat-value">{completedTasks}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">In Progress:</span>
            <span className="stat-value">{inProgressTasks}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Failed:</span>
            <span className="stat-value">{failedTasks}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="execution-step">
      {renderProgressSummary()}
      
      <div className="task-execution-list">
        <h4>🚀 Task Execution</h4>
        <p>Execute documentation tasks one by one or manage them individually.</p>
        
        {tasks.length > 0 ? (
          <div className="task-list">
            {tasks.map(task => renderTaskItem(task))}
          </div>
        ) : (
          <div className="no-tasks">
            <p>No tasks available for execution.</p>
          </div>
        )}
      </div>

      {executionError && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {executionError}
        </div>
      )}
    </div>
  );
}

export default ExecutionStep; 