import React, { useState, useEffect } from 'react';
import APIChatRepository from '@infrastructure/repositories/APIChatRepository.jsx';

function TrackingStep({ tasks, analysisResults, workflowData }) {
  const [projectTasks, setProjectTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);
  const api = new APIChatRepository();

  useEffect(() => {
    loadProjectTasks();
  }, [workflowData.projectId]);

  const loadProjectTasks = async () => {
    if (!workflowData.projectId) return;
    
    setIsLoading(true);
    try {
      const response = await api.getTasks(workflowData.projectId);
      if (response.success) {
        // Filter for documentation tasks created by this framework
        const docTasks = response.data.filter(task => 
          task.type === 'documentation' && 
          task.source_type === 'framework_generated'
        );
        setProjectTasks(docTasks);
      }
    } catch (error) {
      setTrackingError('Failed to load project tasks: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = () => {
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = projectTasks.filter(task => task.status === 'in_progress').length;
    const failedTasks = projectTasks.filter(task => task.status === 'failed').length;
    const pendingTasks = projectTasks.filter(task => task.status === 'pending').length;
    
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Calculate estimated vs actual time
    const totalEstimatedHours = projectTasks.reduce((sum, task) => {
      const estimatedHours = task.metadata?.estimated_hours || 0;
      return sum + estimatedHours;
    }, 0);
    
    const completedEstimatedHours = projectTasks
      .filter(task => task.status === 'completed')
      .reduce((sum, task) => {
        const estimatedHours = task.metadata?.estimated_hours || 0;
        return sum + estimatedHours;
      }, 0);

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      failedTasks,
      pendingTasks,
      completionPercentage,
      totalEstimatedHours,
      completedEstimatedHours
    };
  };

  const renderMetricsOverview = () => {
    const metrics = calculateMetrics();
    
    return (
      <div className="metrics-overview">
        <h4>📊 Project Metrics</h4>
        
        <div className="metric-cards">
          <div className="metric-card completion">
            <div className="metric-header">
              <span className="metric-icon">✅</span>
              <span className="metric-label">Completion</span>
            </div>
            <div className="metric-value">{metrics.completionPercentage}%</div>
            <div className="metric-detail">{metrics.completedTasks}/{metrics.totalTasks} tasks</div>
          </div>
          
          <div className="metric-card time">
            <div className="metric-header">
              <span className="metric-icon">⏱️</span>
              <span className="metric-label">Time Progress</span>
            </div>
            <div className="metric-value">{metrics.completedEstimatedHours}h</div>
            <div className="metric-detail">of {metrics.totalEstimatedHours}h estimated</div>
          </div>
          
          <div className="metric-card quality">
            <div className="metric-header">
              <span className="metric-icon">⭐</span>
              <span className="metric-label">Quality Score</span>
            </div>
            <div className="metric-value">{analysisResults?.qualityScore || 0}%</div>
            <div className="metric-detail">Initial analysis</div>
          </div>
          
          <div className="metric-card coverage">
            <div className="metric-header">
              <span className="metric-icon">📈</span>
              <span className="metric-label">Coverage</span>
            </div>
            <div className="metric-value">{analysisResults?.overallCoverage || 0}%</div>
            <div className="metric-detail">Documentation coverage</div>
          </div>
        </div>
      </div>
    );
  };

  const renderTaskStatus = () => {
    const metrics = calculateMetrics();
    
    return (
      <div className="task-status">
        <h4>📋 Task Status Breakdown</h4>
        
        <div className="status-breakdown">
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span className="status-label">Completed</span>
            <span className="status-count">{metrics.completedTasks}</span>
          </div>
          
          <div className="status-item in-progress">
            <span className="status-icon">🔄</span>
            <span className="status-label">In Progress</span>
            <span className="status-count">{metrics.inProgressTasks}</span>
          </div>
          
          <div className="status-item pending">
            <span className="status-icon">⏳</span>
            <span className="status-label">Pending</span>
            <span className="status-count">{metrics.pendingTasks}</span>
          </div>
          
          <div className="status-item failed">
            <span className="status-icon">❌</span>
            <span className="status-label">Failed</span>
            <span className="status-count">{metrics.failedTasks}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderRecentTasks = () => {
    const recentTasks = projectTasks
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5);
    
    return (
      <div className="recent-tasks">
        <h4>🕒 Recent Activity</h4>
        
        {recentTasks.length > 0 ? (
          <div className="task-activity-list">
            {recentTasks.map(task => (
              <div key={task.id} className="activity-item">
                <div className="activity-header">
                  <span className="task-title">{task.title}</span>
                  <span className={`task-status status-${task.status}`}>
                    {task.status}
                  </span>
                </div>
                <div className="activity-meta">
                  <span className="update-time">
                    Updated: {new Date(task.updated_at).toLocaleDateString()}
                  </span>
                  <span className="task-category">{task.category}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-activity">
            <p>No recent task activity</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tracking-step">
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading project tracking data...</p>
        </div>
      ) : (
        <>
          {renderMetricsOverview()}
          {renderTaskStatus()}
          {renderRecentTasks()}
          
          <div className="tracking-actions">
            <button 
              className="btn-secondary refresh-btn"
              onClick={loadProjectTasks}
              disabled={isLoading}
            >
              🔄 Refresh Data
            </button>
          </div>
        </>
      )}
      
      {trackingError && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {trackingError}
        </div>
      )}
    </div>
  );
}

export default TrackingStep; 