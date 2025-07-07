import React, { useState, useEffect } from 'react';
import '@css/modal/task-selection-modal.css';

const TaskSelectionModal = ({ 
  isOpen, 
  onClose, 
  tasks = [], 
  onStartRefactoring,
  isLoading = false 
}) => {
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (isOpen && tasks.length > 0) {
      setSelectedTasks(new Set());
      setSelectAll(false);
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#44aa44';
      default: return '#888888';
    }
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
      return `${(lineCount / 1000).toFixed(1)}k lines`;
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
                            {task.priority}
                          </span>
                          <span className="file-size">{formatFileSize(task.lines)}</span>
                        </div>
                      </div>
                      
                      <div className="task-details">
                        <p className="file-path">{task.filePath}</p>
                        <p className="task-description">{task.description}</p>
                      </div>

                      <div className="task-steps">
                        <h4>Refactoring Steps:</h4>
                        <ol>
                          {(task.metadata?.refactoringSteps || task.refactoringSteps || task.steps || []).map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                        {(!task.metadata?.refactoringSteps && !task.refactoringSteps && !task.steps) && (
                          <p className="no-steps">No specific steps provided</p>
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