import React, { useState, useEffect } from 'react';
import '@/scss/components/_task-selection-modal.scss';;

const TestFixTaskModal = ({ 
  isOpen, 
  onClose, 
  tasks = [], 
  onStartTestFix,
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

  const handleStartTestFix = () => {
    const selectedTaskList = tasks.filter(task => selectedTasks.has(task.id));
    onStartTestFix(selectedTaskList);
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

  const getTestStatusColor = (status) => {
    switch (status) {
      case 'failed': return '#ff4444';
      case 'passed': return '#44aa44';
      case 'skipped': return '#ffaa00';
      case 'pending': return '#888888';
      default: return '#888888';
    }
  };

  const formatCoverage = (coverage) => {
    if (!coverage || coverage === 'undefined' || coverage === undefined || coverage === null) {
      return 'unknown';
    }
    
    const coverageNum = parseFloat(coverage) || 0;
    return `${coverageNum.toFixed(1)}%`;
  };

  const formatFileSize = (lines) => {
    if (!lines || lines === 'undefined' || lines === undefined || lines === null) {
      return 'unknown lines';
    }
    
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
          <h2>🧪 Auto Test Fix Tasks</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="task-selection-modal-content">
          {tasks.length === 0 ? (
            <div className="no-tasks">
              <p>🎉 No test fix tasks found!</p>
              <p>All tests are passing or no test issues detected.</p>
            </div>
          ) : (
            <>
              <div className="task-selection-summary">
                <p>Found <strong>{tasks.length}</strong> test fix tasks</p>
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
                          {task.testStatus && (
                            <span 
                              className="test-status-badge"
                              style={{ backgroundColor: getTestStatusColor(task.testStatus) }}
                            >
                              {task.testStatus}
                            </span>
                          )}
                          {task.coverage && (
                            <span className="coverage-badge">
                              {formatCoverage(task.coverage)} coverage
                            </span>
                          )}
                          <span className="file-size">{formatFileSize(task.lines)}</span>
                        </div>
                      </div>
                      
                      <div className="task-details">
                        <p className="file-path">{task.filePath}</p>
                        <p className="task-description">{task.description}</p>
                      </div>

                      {/* Test-specific information */}
                      {task.testFailures && task.testFailures.length > 0 && (
                        <div className="test-failures">
                          <h4>Test Failures:</h4>
                          <ul>
                            {task.testFailures.map((failure, index) => (
                              <li key={index} className="test-failure">
                                <strong>{failure.testName}</strong>: {failure.error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {task.fixSteps && task.fixSteps.length > 0 && (
                        <div className="task-steps">
                          <h4>Fix Steps:</h4>
                          <ol>
                            {task.fixSteps.map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {task.metadata?.refactoringSteps && (
                        <div className="task-steps">
                          <h4>Refactoring Steps:</h4>
                          <ol>
                            {task.metadata?.refactoringSteps.map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
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
              onClick={handleStartTestFix}
              disabled={selectedTasks.size === 0 || isLoading}
            >
              {isLoading ? 'Starting...' : `Start Test Fix (${selectedTasks.size} tasks)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestFixTaskModal; 