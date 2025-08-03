import React, { useState } from 'react';
import { useAnalysisData } from '@/hooks/useAnalysisData';
import AnalysisIssues from './AnalysisIssues';
import '@/css/components/analysis/aggregated-analysis-dashboard.css';

const AggregatedAnalysisDashboard = ({ projectId = 'PIDEA', category = 'security' }) => {
  const [activeTab, setActiveTab] = useState('issues');
  
  const {
    issues,
    recommendations,
    tasks,
    documentation,
    metrics,
    summary,
    loading,
    error,
    totalIssues,
    totalRecommendations,
    totalTasks,
    totalDocumentation,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    highPriorityTasks,
    criticalTasks,
    fetchAllData
  } = useAnalysisData(projectId, category);

  if (loading) {
    return (
      <div className="analysis-dashboard loading">
        <div className="loading-spinner">🔄 Loading aggregated analysis data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-dashboard error">
        <div className="error-message">
          ❌ Error loading analysis data: {error}
          <button onClick={fetchAllData} className="retry-button">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-dashboard">
      <div className="dashboard-header">
        <h2>🔍 Aggregated Analysis Dashboard</h2>
        <div className="analysis-type-badge">{category}</div>
        <button onClick={fetchAllData} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      {/* Metrics Overview */}
      <div className="metrics-overview">
        <div className="metric-card">
          <div className="metric-value">{totalIssues}</div>
          <div className="metric-label">Total Issues</div>
          <div className="metric-breakdown">
            <span className="critical">{criticalIssues.length} Critical</span>
            <span className="high">{highIssues.length} High</span>
            <span className="medium">{mediumIssues.length} Medium</span>
            <span className="low">{lowIssues.length} Low</span>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-value">{totalRecommendations}</div>
          <div className="metric-label">Recommendations</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-value">{totalTasks}</div>
          <div className="metric-label">Tasks</div>
          <div className="metric-breakdown">
            <span className="critical">{criticalTasks.length} Critical</span>
            <span className="high">{highPriorityTasks.length} High</span>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-value">{totalDocumentation}</div>
          <div className="metric-label">Documentation</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          🚨 Issues ({totalIssues})
        </button>
        <button 
          className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          💡 Recommendations ({totalRecommendations})
        </button>
        <button 
          className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          📋 Tasks ({totalTasks})
        </button>
        <button 
          className={`tab-button ${activeTab === 'documentation' ? 'active' : ''}`}
          onClick={() => setActiveTab('documentation')}
        >
          📚 Documentation ({totalDocumentation})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'issues' && (
          <div className="issues-tab">
            <AnalysisIssues 
              issues={issues} 
              loading={loading} 
              error={error}
              category={category}
            />
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="recommendations-tab">
            <h3>💡 Recommendations</h3>
            {recommendations.length === 0 ? (
              <p className="no-data">No recommendations available</p>
            ) : (
              <div className="recommendations-list">
                {recommendations.map((rec, index) => (
                  <div key={index} className="recommendation-card">
                    <div className="recommendation-header">
                      <h4>{rec.title}</h4>
                      <span className={`priority-badge ${rec.priority}`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="recommendation-description">{rec.description}</p>
                    <div className="recommendation-meta">
                      <span className="category">{rec.category}</span>
                      <span className="source">{rec.source}</span>
                    </div>
                    {rec.action && (
                      <div className="recommendation-action">
                        <strong>Action:</strong> {rec.action}
                      </div>
                    )}
                    {rec.impact && (
                      <div className="recommendation-impact">
                        <strong>Impact:</strong> {rec.impact}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="tasks-tab">
            <h3>📋 Tasks</h3>
            {tasks.length === 0 ? (
              <p className="no-data">No tasks available</p>
            ) : (
              <div className="tasks-list">
                {tasks.map((task, index) => (
                  <div key={index} className="task-card">
                    <div className="task-header">
                      <h4>{task.title}</h4>
                      <span className={`priority-badge ${task.priority}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="task-description">{task.description}</p>
                    <div className="task-meta">
                      <span className="category">{task.category}</span>
                      <span className="status">{task.status}</span>
                      <span className="phase">{task.phase}</span>
                    </div>
                    {task.estimatedHours && (
                      <div className="task-estimate">
                        <strong>Estimated:</strong> {task.estimatedHours}h
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documentation' && (
          <div className="documentation-tab">
            <h3>📚 Documentation</h3>
            {documentation.length === 0 ? (
              <p className="no-data">No documentation available</p>
            ) : (
              <div className="documentation-list">
                {documentation.map((doc, index) => (
                  <div key={index} className="documentation-card">
                    <div className="documentation-header">
                      <h4>{doc.title}</h4>
                      <span className="type-badge">{doc.type}</span>
                    </div>
                    <div className="documentation-meta">
                      <span className="category">{doc.category}</span>
                      <span className="source">{doc.source}</span>
                    </div>
                    {doc.path && (
                      <div className="documentation-path">
                        <strong>Path:</strong> {doc.path}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AggregatedAnalysisDashboard; 