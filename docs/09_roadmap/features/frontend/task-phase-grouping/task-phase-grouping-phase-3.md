# Phase 3: Frontend Component Development - CORRECTED

## Overview
Create new React components for displaying grouped tasks by phases and implement phase execution functionality within the existing TasksPanelComponent.

## Current State Analysis
- **TasksPanelComponent.jsx**: Exists at `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx`
- **Current Functionality**: Handles docs tasks but not phase grouping
- **Component Structure**: Uses React hooks and functional components
- **Styling**: CSS exists in `frontend/src/css/global/sidebar-right.css` but needs phase-specific styling
- **Missing Components**: PhaseAccordionSection and PhaseModal don't exist

## Tasks

### 1. Create PhaseAccordionSection for displaying grouped tasks
**File**: `frontend/src/presentation/components/PhaseAccordionSection.jsx`
**Time**: 45 minutes
**Status**: ❌ Not implemented

```jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import '@/css/components/PhaseAccordionSection.css';

const PhaseAccordionSection = ({ 
  phaseName, 
  phaseData, 
  onTaskClick, 
  onExecutePhase,
  isExecuting = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isExecutingPhase, setIsExecutingPhase] = useState(false);

  const progressPercentage = phaseData.totalTasks > 0 
    ? (phaseData.completedTasks / phaseData.totalTasks) * 100 
    : 0;

  const isPhaseComplete = phaseData.completedTasks === phaseData.totalTasks;

  const handleExecutePhase = async () => {
    if (isExecutingPhase || isPhaseComplete) return;
    
    setIsExecutingPhase(true);
    try {
      await onExecutePhase(phaseName);
    } catch (error) {
      console.error('Phase execution failed:', error);
    } finally {
      setIsExecutingPhase(false);
    }
  };

  const getPhaseIcon = () => {
    if (isPhaseComplete) return '✅';
    if (isExecutingPhase) return '⏳';
    if (progressPercentage > 0) return '🔄';
    return '📋';
  };

  const getPhaseStatusClass = () => {
    if (isPhaseComplete) return 'phase-complete';
    if (isExecutingPhase) return 'phase-executing';
    if (progressPercentage > 0) return 'phase-in-progress';
    return 'phase-pending';
  };

  return (
    <div className={`phase-accordion-section ${getPhaseStatusClass()}`}>
      <div className="phase-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="phase-info">
          <span className="phase-icon">{getPhaseIcon()}</span>
          <h3 className="phase-name">{phaseData.name}</h3>
          <span className="phase-count">
            {phaseData.completedTasks}/{phaseData.totalTasks} tasks
          </span>
        </div>
        
        <div className="phase-actions">
          <div className="phase-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(progressPercentage)}%</span>
          </div>
          
          <button 
            className="expand-button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="phase-content">
          <div className="phase-tasks">
            {phaseData.tasks.map(task => (
              <div 
                key={task.id} 
                className={`task-item task-${task.status}`}
                onClick={() => onTaskClick(task)}
              >
                <div className="task-status">
                  {task.status === 'completed' && '✅'}
                  {task.status === 'in_progress' && '🔄'}
                  {task.status === 'pending' && '⏳'}
                  {task.status === 'failed' && '❌'}
                </div>
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  {task.description && (
                    <div className="task-description">{task.description}</div>
                  )}
                </div>
                <div className="task-meta">
                  {task.estimated_hours && (
                    <span className="task-estimate">{task.estimated_hours}h</span>
                  )}
                  {task.priority && (
                    <span className={`task-priority priority-${task.priority}`}>
                      {task.priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isPhaseComplete && (
            <div className="phase-execution">
              <button
                className={`execute-phase-button ${isExecutingPhase ? 'executing' : ''}`}
                onClick={handleExecutePhase}
                disabled={isExecutingPhase || isExecuting}
              >
                {isExecutingPhase ? 'Executing...' : `Execute ${phaseName}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

PhaseAccordionSection.propTypes = {
  phaseName: PropTypes.string.isRequired,
  phaseData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    tasks: PropTypes.array.isRequired,
    totalTasks: PropTypes.number.isRequired,
    completedTasks: PropTypes.number.isRequired
  }).isRequired,
  onTaskClick: PropTypes.func.isRequired,
  onExecutePhase: PropTypes.func.isRequired,
  isExecuting: PropTypes.bool
};

export default PhaseAccordionSection;
```

### 2. Create PhaseModal component for phase execution control
**File**: `frontend/src/presentation/components/PhaseModal.jsx`
**Time**: 30 minutes
**Status**: ❌ Not implemented

```jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import '@/css/components/PhaseModal.css';

const PhaseModal = ({ 
  isOpen, 
  onClose, 
  phases, 
  onExecutePhase,
  onExecuteAllPhases,
  isExecuting = false 
}) => {
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [isExecutingPhase, setIsExecutingPhase] = useState(false);

  const handleExecutePhase = async (phaseName) => {
    if (isExecutingPhase || isExecuting) return;
    
    setIsExecutingPhase(true);
    try {
      await onExecutePhase(phaseName);
      setSelectedPhase(null);
    } catch (error) {
      console.error('Phase execution failed:', error);
    } finally {
      setIsExecutingPhase(false);
    }
  };

  const handleExecuteAllPhases = async () => {
    if (isExecutingPhase || isExecuting) return;
    
    setIsExecutingPhase(true);
    try {
      const phaseNames = Object.keys(phases);
      await onExecuteAllPhases(phaseNames);
      onClose();
    } catch (error) {
      console.error('All phases execution failed:', error);
    } finally {
      setIsExecutingPhase(false);
    }
  };

  const getTotalProgress = () => {
    let totalTasks = 0;
    let completedTasks = 0;
    
    Object.values(phases).forEach(phase => {
      totalTasks += phase.totalTasks;
      completedTasks += phase.completedTasks;
    });
    
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  };

  if (!isOpen) return null;

  return (
    <div className="phase-modal-overlay">
      <div className="phase-modal">
        <div className="modal-header">
          <h2>📋 Project Phases</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="overall-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${getTotalProgress()}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(getTotalProgress())}% Complete</span>
          </div>

          <div className="phases-list">
            {Object.entries(phases).map(([phaseName, phaseData]) => (
              <div key={phaseName} className="phase-item">
                <div className="phase-summary">
                  <div className="phase-info">
                    <h3>{phaseData.name}</h3>
                    <span className="task-count">
                      {phaseData.completedTasks}/{phaseData.totalTasks} tasks
                    </span>
                  </div>
                  <div className="phase-actions">
                    <button
                      className="execute-single-button"
                      onClick={() => handleExecutePhase(phaseName)}
                      disabled={isExecutingPhase || isExecuting || phaseData.completedTasks === phaseData.totalTasks}
                    >
                      Execute {phaseName}
                    </button>
                  </div>
                </div>
                
                <div className="phase-tasks-preview">
                  {phaseData.tasks.slice(0, 3).map(task => (
                    <div key={task.id} className="task-preview">
                      <span className={`task-status task-${task.status}`}>
                        {task.status === 'completed' && '✅'}
                        {task.status === 'pending' && '⏳'}
                      </span>
                      <span className="task-title">{task.title}</span>
                    </div>
                  ))}
                  {phaseData.tasks.length > 3 && (
                    <div className="more-tasks">
                      +{phaseData.tasks.length - 3} more tasks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="execute-all-button"
            onClick={handleExecuteAllPhases}
            disabled={isExecutingPhase || isExecuting}
          >
            {isExecutingPhase ? 'Executing All Phases...' : 'Execute All Phases'}
          </button>
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

PhaseModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  phases: PropTypes.object.isRequired,
  onExecutePhase: PropTypes.func.isRequired,
  onExecuteAllPhases: PropTypes.func.isRequired,
  isExecuting: PropTypes.bool
};

export default PhaseModal;
```

### 3. Modify TasksPanelComponent to integrate phase grouping
**File**: `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx`
**Time**: 60 minutes
**Status**: ❌ Not implemented

```jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import PhaseAccordionSection from '../../PhaseAccordionSection';
import PhaseModal from '../../PhaseModal';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import '@/css/global/sidebar-right.css';

const TasksPanelComponent = ({ eventBus, activePort }) => {
  const api = new APIChatRepository();
  const [groupedTasks, setGroupedTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executingPhases, setExecutingPhases] = useState(new Set());
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  
  // Existing state for docs tasks
  const [docsTasks, setDocsTasks] = useState([]);
  const [docsTaskFilter, setDocsTaskFilter] = useState('all');
  const [docsTaskSearch, setDocsTaskSearch] = useState('');
  const [selectedDocsTask, setSelectedDocsTask] = useState(null);
  const [isDocsTaskModalOpen, setIsDocsTaskModalOpen] = useState(false);
  const [isLoadingDocsTasks, setIsLoadingDocsTasks] = useState(false);
  const [isLoadingDocsTaskDetails, setIsLoadingDocsTaskDetails] = useState(false);

  useEffect(() => {
    if (activePort) {
      console.log('[TasksPanelComponent] Loading tasks for port:', activePort);
      loadGroupedTasks();
      loadDocsTasks();
    } else {
      console.log('[TasksPanelComponent] No active port, clearing tasks');
      setGroupedTasks({});
      setDocsTasks([]);
    }
  }, [activePort]);

  const loadGroupedTasks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const projectId = await api.getCurrentProjectId();
      const phases = await api.getTasksByPhases(projectId);
      setGroupedTasks(phases);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load grouped tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task) => {
    // Handle task selection - can be extended for task details
    console.log('Selected task:', task);
  };

  const handleExecutePhase = async (phaseName) => {
    if (executingPhases.has(phaseName)) return;

    setExecutingPhases(prev => new Set(prev).add(phaseName));
    
    try {
      const projectId = await api.getCurrentProjectId();
      const result = await api.executePhase(projectId, phaseName);
      console.log(`Phase ${phaseName} execution result:`, result);
      
      // Reload tasks to get updated status
      await loadGroupedTasks();
      
      // Show success notification
      showNotification(`Phase ${phaseName} executed successfully`, 'success');
    } catch (error) {
      console.error(`Phase ${phaseName} execution failed:`, error);
      showNotification(`Failed to execute phase ${phaseName}: ${error.message}`, 'error');
    } finally {
      setExecutingPhases(prev => {
        const newSet = new Set(prev);
        newSet.delete(phaseName);
        return newSet;
      });
    }
  };

  const handleExecuteAllPhases = async (phaseNames) => {
    try {
      const projectId = await api.getCurrentProjectId();
      const result = await api.executePhases(projectId, phaseNames);
      console.log('All phases execution result:', result);
      
      // Reload tasks to get updated status
      await loadGroupedTasks();
      
      showNotification('All phases executed successfully', 'success');
    } catch (error) {
      console.error('All phases execution failed:', error);
      showNotification(`Failed to execute all phases: ${error.message}`, 'error');
    }
  };

  const showNotification = (message, type) => {
    // Implement notification system or use existing one
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const getTotalProgress = () => {
    let totalTasks = 0;
    let completedTasks = 0;
    
    Object.values(groupedTasks).forEach(phase => {
      totalTasks += phase.totalTasks;
      completedTasks += phase.completedTasks;
    });
    
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  };

  // Existing docs tasks functions (keep existing implementation)
  const loadDocsTasks = async () => {
    setIsLoadingDocsTasks(true);
    try {
      const response = await api.getDocsTasks();
      if (response.success) {
        setDocsTasks(response.data || []);
      } else {
        setFeedback('Failed to load documentation tasks');
      }
    } catch (error) {
      setFeedback('Error loading documentation tasks: ' + error.message);
    } finally {
      setIsLoadingDocsTasks(false);
    }
  };

  // ... keep all existing docs tasks functions ...

  if (loading) {
    return (
      <div className="tasks-panel loading">
        <div className="loading-spinner"></div>
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tasks-panel error">
        <div className="error-message">
          <h3>Error Loading Tasks</h3>
          <p>{error}</p>
          <button onClick={loadGroupedTasks} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const phaseEntries = Object.entries(groupedTasks);
  const totalProgress = getTotalProgress();

  return (
    <div className="tasks-tab space-y-4 p-3">
      {/* Phase Grouping Section */}
      <div className="panel-block">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">📋 Project Phases</h3>
          <div className="flex gap-2">
            {phaseEntries.length > 0 && (
              <button
                className="btn-primary text-sm"
                onClick={() => setShowPhaseModal(true)}
                disabled={executingPhases.size > 0}
              >
                Execute All Phases
              </button>
            )}
            <button 
              className="btn-secondary text-sm"
              onClick={loadGroupedTasks}
              disabled={loading}
            >
              {loading ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
        
        <div className="overall-progress mb-4">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          <span className="progress-text">{Math.round(totalProgress)}% Complete</span>
        </div>

        <div className="phases-container">
          {phaseEntries.length === 0 ? (
            <div className="no-tasks">
              <p>No tasks found for this project.</p>
            </div>
          ) : (
            phaseEntries.map(([phaseName, phaseData]) => (
              <PhaseAccordionSection
                key={phaseName}
                phaseName={phaseName}
                phaseData={phaseData}
                onTaskClick={handleTaskClick}
                onExecutePhase={handleExecutePhase}
                isExecuting={executingPhases.has(phaseName)}
              />
            ))
          )}
        </div>
      </div>

      {/* Existing Documentation Tasks Section */}
      <div className="panel-block">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">📚 Documentation Tasks</h3>
          <div className="flex gap-2">
            <button 
              className="btn-secondary text-sm"
              onClick={handleSyncDocsTasks}
              disabled={isLoadingDocsTasks}
            >
              {isLoadingDocsTasks ? 'Syncing...' : '🔄 Sync'}
            </button>
            <button 
              className="btn-secondary text-sm"
              onClick={handleCleanDocsTasks}
              disabled={isLoadingDocsTasks}
            >
              {isLoadingDocsTasks ? 'Cleaning...' : '🗑️ Clean'}
            </button>
            <button 
              className="btn-secondary text-sm"
              onClick={loadDocsTasks}
              disabled={isLoadingDocsTasks}
            >
              {isLoadingDocsTasks ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
        
        {/* Keep existing docs tasks implementation */}
        {/* ... existing docs tasks filter and list ... */}
      </div>

      {/* Phase Modal */}
      <PhaseModal
        isOpen={showPhaseModal}
        onClose={() => setShowPhaseModal(false)}
        phases={groupedTasks}
        onExecutePhase={handleExecutePhase}
        onExecuteAllPhases={handleExecuteAllPhases}
        isExecuting={executingPhases.size > 0}
      />

      {/* Keep existing modals and feedback */}
      {/* ... existing modals and feedback implementation ... */}
    </div>
  );
};

TasksPanelComponent.propTypes = {
  eventBus: PropTypes.object,
  activePort: PropTypes.string
};

export default TasksPanelComponent;
```

### 4. Add phase accordion styling
**File**: `frontend/src/css/components/PhaseAccordionSection.css`
**Time**: 30 minutes
**Status**: ❌ Not implemented

```css
.phase-accordion-section {
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  margin-bottom: 16px;
  background: #ffffff;
  transition: all 0.3s ease;
  overflow: hidden;
}

.phase-accordion-section:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.phase-accordion-section.phase-complete {
  border-color: #28a745;
  background: linear-gradient(135deg, #f8fff9 0%, #ffffff 100%);
}

.phase-accordion-section.phase-executing {
  border-color: #ffc107;
  background: linear-gradient(135deg, #fffbf0 0%, #ffffff 100%);
  animation: pulse 2s infinite;
}

.phase-accordion-section.phase-in-progress {
  border-color: #17a2b8;
  background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%);
}

.phase-accordion-section.phase-pending {
  border-color: #6c757d;
  background: #ffffff;
}

.phase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid #e1e5e9;
}

.phase-header:hover {
  background: rgba(0, 0, 0, 0.04);
}

.phase-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.phase-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.phase-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  text-transform: capitalize;
}

.phase-count {
  font-size: 14px;
  color: #6c757d;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 12px;
}

.phase-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.phase-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  transition: width 0.3s ease;
}

.phase-complete .progress-fill {
  background: linear-gradient(90deg, #28a745, #1e7e34);
}

.phase-executing .progress-fill {
  background: linear-gradient(90deg, #ffc107, #e0a800);
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  min-width: 35px;
}

.expand-button {
  background: none;
  border: none;
  font-size: 16px;
  color: #6c757d;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.expand-button:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #495057;
}

.phase-content {
  padding: 20px;
  max-height: 1000px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.phase-tasks {
  margin-bottom: 16px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.task-item:hover {
  background: #f8f9fa;
  border-color: #dee2e6;
}

.task-item.task-completed {
  background: #f8fff9;
  border-color: #c3e6cb;
}

.task-item.task-in_progress {
  background: #fffbf0;
  border-color: #ffeaa7;
}

.task-item.task-failed {
  background: #fff5f5;
  border-color: #feb2b2;
}

.task-status {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.task-info {
  flex: 1;
}

.task-title {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
}

.task-description {
  font-size: 14px;
  color: #6c757d;
  line-height: 1.4;
}

.task-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.task-estimate {
  font-size: 12px;
  color: #6c757d;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.task-priority {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.priority-high {
  background: #f8d7da;
  color: #721c24;
}

.priority-medium {
  background: #fff3cd;
  color: #856404;
}

.priority-low {
  background: #d1ecf1;
  color: #0c5460;
}

.phase-execution {
  border-top: 1px solid #e1e5e9;
  padding-top: 16px;
  text-align: center;
}

.execute-phase-button {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: capitalize;
}

.execute-phase-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #0056b3, #004085);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
}

.execute-phase-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.execute-phase-button.executing {
  background: #ffc107;
  color: #212529;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
}

/* Responsive design */
@media (max-width: 768px) {
  .phase-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .phase-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .task-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .task-meta {
    width: 100%;
    justify-content: flex-start;
  }
}
```

### 5. Add phase modal styling
**File**: `frontend/src/css/components/PhaseModal.css`
**Time**: 15 minutes
**Status**: ❌ Not implemented

```css
.phase-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.phase-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: #6c757d;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #495057;
}

.modal-content {
  padding: 32px;
  overflow-y: auto;
  flex: 1;
}

.overall-progress {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.overall-progress .progress-bar {
  flex: 1;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.overall-progress .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745, #1e7e34);
  transition: width 0.3s ease;
}

.overall-progress .progress-text {
  font-size: 16px;
  font-weight: 600;
  color: #495057;
  min-width: 80px;
}

.phases-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.phase-item {
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 20px;
  background: #ffffff;
  transition: all 0.2s ease;
}

.phase-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.phase-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.phase-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  text-transform: capitalize;
}

.task-count {
  font-size: 14px;
  color: #6c757d;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 12px;
}

.execute-single-button {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: capitalize;
}

.execute-single-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #0056b3, #004085);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
}

.execute-single-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.phase-tasks-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
}

.task-status {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.task-title {
  flex: 1;
  color: #2c3e50;
  font-weight: 500;
}

.more-tasks {
  font-size: 12px;
  color: #6c757d;
  text-align: center;
  padding: 8px;
  font-style: italic;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 24px 32px;
  border-top: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.execute-all-button {
  background: linear-gradient(135deg, #28a745, #1e7e34);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.execute-all-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #1e7e34, #155724);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
}

.execute-all-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.cancel-button {
  background: #6c757d;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button:hover:not(:disabled) {
  background: #5a6268;
  transform: translateY(-1px);
}

/* Responsive design */
@media (max-width: 768px) {
  .phase-modal {
    width: 95%;
    max-height: 90vh;
  }
  
  .modal-header {
    padding: 16px 20px;
  }
  
  .modal-content {
    padding: 20px;
  }
  
  .phase-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .modal-footer {
    flex-direction: column;
    padding: 16px 20px;
  }
}
```

## Success Criteria
- [ ] PhaseAccordionSection displays tasks grouped by phases
- [ ] PhaseModal provides execution functionality with single and bulk options
- [ ] TasksPanelComponent integrates phase grouping with existing docs tasks
- [ ] Phase accordion styling includes animations and visual feedback
- [ ] Phase modal provides comprehensive execution control
- [ ] Components are responsive and accessible
- [ ] Error handling works correctly in all components
- [ ] Loading states are properly managed

## Dependencies
- React hooks (useState, useEffect)
- PropTypes for type checking
- Existing APIChatRepository (from Phase 2)
- CSS animations and transitions

## Integration with Existing Systems
- **APIChatRepository**: Uses phase grouping methods from Phase 2
- **Event Bus**: Integrates with existing event system
- **Project Management**: Uses existing project ID management
- **Error Handling**: Extends existing error handling patterns
- **Docs Tasks**: Maintains existing docs tasks functionality

## Notes
- Uses modern React patterns with hooks
- Implements proper error boundaries and loading states
- Provides comprehensive visual feedback for all states
- Includes responsive design for mobile devices
- Uses CSS animations for smooth user experience
- Implements proper accessibility features
- Integrates with existing TasksPanelComponent without breaking docs tasks
- Depends on Phase 1 and Phase 2 being completed first 