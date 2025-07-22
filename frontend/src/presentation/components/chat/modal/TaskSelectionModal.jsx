import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import '@/css/modal/task-selection-modal.css';

const TaskSelectionModal = ({ 
  isOpen, 
  onClose, 
  tasks = [], 
  onStartRefactoring,
  isLoading = false 
}) => {
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState(new Set());

  useEffect(() => {
    if (isOpen && tasks.length > 0) {
      setSelectedTasks(new Set());
      setSelectAll(false);
      setExpandedPlans(new Set());
    }
  }, [isOpen, tasks]);

  const handleTaskToggle = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
    setSelectAll(newSelected.size === tasks.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTasks(new Set());
      setSelectAll(false);
    } else {
      setSelectedTasks(new Set(tasks.map(task => task.id)));
      setSelectAll(true);
    }
  };

  const handleStartRefactoring = () => {
    const selectedTaskList = tasks.filter(task => selectedTasks.has(task.id));
    onStartRefactoring(selectedTaskList);
  };

  const togglePlanExpansion = (taskId) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedPlans(newExpanded);
  };

  const getPriorityColor = (priority) => {
    // Handle value objects
    const priorityValue = priority?.value || priority;
    const priorityStr = String(priorityValue || '').toLowerCase();
    switch (priorityStr) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#44aa44';
      default: return '#888888';
    }
  };

  const getPriorityText = (priority) => {
    // Handle value objects
    const priorityValue = priority?.value || priority;
    return String(priorityValue || 'Unknown');
  };

  const formatFileSize = (lines) => {
    // Handle undefined, null, or invalid values
    if (!lines || lines === 'undefined' || lines === undefined || lines === null) {
      return 'unknown lines';
    }
    
    // Convert to number if it's a string
    const lineCount = parseInt(lines) || 0;
    
    if (lineCount === 0) {
      return 'unknown lines';
    }
    
    if (lineCount > 1000) {
      return `${lineCount} lines`;
    }
    
    return `${lineCount} lines`;
  };

  if (!isOpen) return null;

  return (
    <div className="task-selection-modal-overlay">
      <div className="task-selection-modal">
        <div className="task-selection-modal-header">
          <h2>🔄 Auto Refactor Tasks</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="task-selection-modal-content">
          {tasks.length === 0 ? (
            <div className="no-tasks">
              <p>🎉 No refactoring tasks found!</p>
              <p>All files are under the 500-line threshold.</p>
            </div>
          ) : (
            <>
              <div className="task-selection-summary">
                <p>Found <strong>{tasks.length}</strong> files that need refactoring</p>
                <div className="task-selection-controls">
                  <label className="select-all-checkbox">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                    <span>Select All ({selectedTasks.size}/{tasks.length})</span>
                  </label>
                </div>
              </div>

              <div className="task-list">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`task-item ${selectedTasks.has(task.id) ? 'selected' : ''}`}
                  >
                    <div className="task-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => handleTaskToggle(task.id)}
                      />
                    </div>
                    
                    <div className="task-content">
                      <div className="task-header">
                        <h3 className="task-title">{task.title}</h3>
                        <div className="task-meta">
                          <span 
                            className="priority-badge"
                            style={{ backgroundColor: getPriorityColor(task.priority) }}
                          >
                            {getPriorityText(task.priority)}
                          </span>
                          <span className="file-size">{formatFileSize(task.metadata?.lines)}</span>
                        </div>
                      </div>
                      
                      <div className="task-details">
                        <p className="file-path">{task.filePath}</p>
                        <p className="task-description">{task.description}</p>
                      </div>

                      <div className="task-plan">
                        <h4>Refactoring Plan:</h4>
                        {task.metadata?.refactoringPlan ? (
                          <div className="refactoring-plan-preview">
                            <div className="plan-header">
                              <strong>File:</strong> {task.metadata?.filePath || task.filePath}
                              <br />
                              <strong>Current Size:</strong> {task.metadata?.lines || 'unknown'} lines
                              <br />
                              <strong>Target Size:</strong> &lt;500 lines per file
                              <br />
                              <strong>Priority:</strong> {getPriorityText(task.priority)}
                              <br />
                              <strong>Estimated Time:</strong> {task.metadata?.estimatedTime || 'unknown'}
                            </div>
                            <div className="plan-summary">
                              <p><strong>Strategy:</strong> Split large file into smaller, maintainable modules without changing logic.</p>
                              <p><strong>Risk Level:</strong> Low - no logic changes, only structure improvements.</p>
                            </div>
                            
                            {expandedPlans.has(task.id) ? (
                              <div className="expanded-plan">
                                <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(task.metadata?.refactoringPlan || '') }} />
                                <button 
                                  className="collapse-plan-btn"
                                  onClick={() => togglePlanExpansion(task.id)}
                                >
                                  📋 Collapse Full Plan
                                </button>
                              </div>
                            ) : (
                              <div className="plan-actions">
                                <button 
                                  className="expand-plan-btn"
                                  onClick={() => togglePlanExpansion(task.id)}
                                >
                                  📋 Expand Full Refactoring Plan
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="fallback-steps">
                            <h5>Refactoring Steps:</h5>
                            <ol>
                              {(task.metadata?.refactoringSteps || task.refactoringSteps || task.steps || []).map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ol>
                            {(!task.metadata?.refactoringSteps && !task.refactoringSteps && !task.steps) && (
                              <p className="no-steps">No specific steps provided</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="task-selection-modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          {tasks.length > 0 && (
            <button 
              className="start-refactoring-button"
              onClick={handleStartRefactoring}
              disabled={selectedTasks.size === 0 || isLoading}
            >
              {isLoading ? 'Starting...' : `Start Refactoring (${selectedTasks.size} tasks)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskSelectionModal; 