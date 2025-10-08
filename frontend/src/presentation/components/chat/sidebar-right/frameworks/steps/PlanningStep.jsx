import React, { useState } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository.jsx';

function PlanningStep({ analysisResults, onTasksCreated, workflowData }) {
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  const [createdTasks, setCreatedTasks] = useState([]);
  const [planningError, setPlanningError] = useState(null);
  const api = new APIChatRepository();

  const handleCreateTasks = async () => {
    if (!analysisResults || !workflowData.projectId) {
      setPlanningError('Missing analysis results or project ID');
      return;
    }

    setIsCreatingTasks(true);
    setPlanningError(null);

    try {
      const tasks = [];
      
      // Convert analysis results to database tasks
      for (const task of analysisResults.prioritizedTasks) {
        const taskData = {
          title: task.title,
          description: task.description,
          type: 'documentation',
          category: task.category,
          priority: task.priority.toLowerCase(),
          status: 'pending',
          source_type: 'framework_generated',
          source_content: `Documentation Framework Analysis Task`,
          metadata: {
            estimated_hours: task.estimatedHours,
            framework: 'documentation-framework',
            analysis_id: workflowData.analysisId,
            coverage_area: task.category
          }
        };

        // Create task in database using existing API
        const response = await api.createTask(taskData, workflowData.projectId);
        
        if (response.success) {
          tasks.push({
            ...task,
            id: response.data.id,
            status: 'pending',
            databaseId: response.data.id
          });
        } else {
          throw new Error(`Failed to create task: ${task.title}`);
        }
      }

      setCreatedTasks(tasks);
      onTasksCreated(tasks);
      
    } catch (error) {
      setPlanningError('Failed to create tasks: ' + error.message);
    } finally {
      setIsCreatingTasks(false);
    }
  };

  const renderAnalysisSummary = () => {
    if (!analysisResults) return null;

    return (
      <div className="analysis-summary">
        <h4>📊 Analysis Summary</h4>
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Overall Coverage:</span>
            <span className="stat-value">{analysisResults.overallCoverage}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Quality Score:</span>
            <span className="stat-value">{analysisResults.qualityScore}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Areas Analyzed:</span>
            <span className="stat-value">{analysisResults.areas.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Recommended Tasks:</span>
            <span className="stat-value">{analysisResults.prioritizedTasks.length}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTaskPlanning = () => {
    if (!analysisResults) return null;

    return (
      <div className="task-planning">
        <h4>📋 Task Creation Plan</h4>
        <p>The following tasks will be created in the database for project <strong>{workflowData.projectName}</strong>:</p>
        
        <div className="task-create-list">
          {analysisResults.prioritizedTasks.map((task, index) => (
            <div key={index} className="task-create-item">
              <div className="task-create-header">
                <span className="task-number">#{index + 1}</span>
                <span className="task-title">{task.title}</span>
                <span className={`priority-badge ${(task.priority?.value || task.priority || '').toLowerCase()}`}>
                  {task.priority?.value || task.priority}
                </span>
              </div>
              <div className="task-create-details">
                <p className="task-description">{task.description}</p>
                <div className="task-metadata">
                  <span className="meta-item">📂 {task.category}</span>
                  <span className="meta-item">⏱️ {task.estimatedHours}h</span>
                  <span className="meta-item">🏷️ documentation</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="creation-summary">
          <div className="summary-row">
            <span>Total Tasks:</span>
            <span>{analysisResults.prioritizedTasks.length}</span>
          </div>
          <div className="summary-row">
            <span>Total Estimated Time:</span>
            <span>{analysisResults.prioritizedTasks.reduce((sum, task) => sum + task.estimatedHours, 0)}h</span>
          </div>
          <div className="summary-row">
            <span>High Priority Tasks:</span>
            <span>{analysisResults.prioritizedTasks.filter(t => (t.priority?.value || t.priority) === 'High').length}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCreatedTasks = () => {
    if (createdTasks.length === 0) return null;

    return (
      <div className="created-tasks">
        <h4>✅ Tasks Created Successfully</h4>
        <p>{createdTasks.length} tasks have been created in the database.</p>
        
        <div className="created-task-list">
          {createdTasks.map((task, index) => (
            <div key={task.id} className="created-task-item">
              <div className="task-header">
                <span className="task-id">#{task.databaseId}</span>
                <span className="task-title">{task.title}</span>
                <span className="task-status">✅ Created</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="planning-step">
      {renderAnalysisSummary()}
      
      {createdTasks.length === 0 ? (
        <>
          {renderTaskPlanning()}
          
          <div className="action-section">
            <button 
              className="btn-primary create-tasks-btn"
              onClick={handleCreateTasks}
              disabled={isCreatingTasks || !analysisResults}
            >
              {isCreatingTasks ? (
                <>
                  <div className="spinner"></div>
                  Creating {analysisResults?.prioritizedTasks.length} Tasks...
                </>
              ) : (
                <>
                  📋 Create {analysisResults?.prioritizedTasks.length} Database Tasks
                </>
              )}
            </button>
            
            {planningError && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {planningError}
              </div>
            )}
          </div>
        </>
      ) : (
        renderCreatedTasks()
      )}
    </div>
  );
}

export default PlanningStep; 