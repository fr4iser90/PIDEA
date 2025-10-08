import React, { useState, useEffect } from 'react';
import '@/css/modal/task-review-selection-modal.css';

const TaskReviewSelectionModal = ({ 
  isOpen, 
  onClose, 
  tasks = [], 
  onStartReview,
  isLoading = false 
}) => {
  // State management
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [reviewMode, setReviewMode] = useState('review'); // 'review' or 'check-state'

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && tasks.length > 0) {
      setSelectedTasks(new Set());
      setSelectAll(false);
      setExpandedTasks(new Set());
    }
  }, [isOpen, tasks]);

  // Filter out completed tasks and apply filters
  const getFilteredTasks = () => {
    return tasks.filter(task => {
      // Exclude completed tasks
      const status = task.status?.value || task.status;
      if (status === 'completed' || status === 'done') {
        return false;
      }

      // Apply category filter
      if (filterCategory !== 'all') {
        const category = task.category?.value || task.category;
        if (category !== filterCategory) {
          return false;
        }
      }

      // Apply priority filter
      if (filterPriority !== 'all') {
        const priority = task.priority?.value || task.priority;
        if (priority !== filterPriority) {
          return false;
        }
      }

      // Apply status filter
      if (filterStatus !== 'all') {
        const taskStatus = task.status?.value || task.status;
        if (taskStatus !== filterStatus) {
          return false;
        }
      }

      return true;
    });
  };

  // Sort tasks based on current sort settings
  const getSortedTasks = () => {
    const filteredTasks = getFilteredTasks();
    
    return filteredTasks.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'priority':
          aValue = getPriorityValue(a.priority);
          bValue = getPriorityValue(b.priority);
          break;
        case 'status':
          aValue = getStatusValue(a.status);
          bValue = getStatusValue(b.status);
          break;
        case 'date':
          aValue = new Date(a.createdAt || a.created_at || 0);
          bValue = new Date(b.createdAt || b.created_at || 0);
          break;
        case 'name':
        default:
          aValue = (a.title || a.name || '').toLowerCase();
          bValue = (b.title || b.name || '').toLowerCase();
          break;
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
  };

  // Helper functions for sorting
  const getPriorityValue = (priority) => {
    const priorityStr = String(priority?.value || priority || '').toLowerCase();
    switch (priorityStr) {
      case 'urgent': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  const getStatusValue = (status) => {
    const statusStr = String(status?.value || status || '').toLowerCase();
    switch (statusStr) {
      case 'in-progress': return 3;
      case 'pending': return 2;
      case 'blocked': return 1;
      default: return 0;
    }
  };

  // Task selection handlers
  const handleTaskToggle = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
    
    const sortedTasks = getSortedTasks();
    setSelectAll(newSelected.size === sortedTasks.length);
  };

  const handleSelectAll = () => {
    const sortedTasks = getSortedTasks();
    if (selectAll) {
      setSelectedTasks(new Set());
      setSelectAll(false);
    } else {
      setSelectedTasks(new Set(sortedTasks.map(task => task.id)));
      setSelectAll(true);
    }
  };

  const handleStartReview = () => {
    const selectedTaskList = tasks.filter(task => selectedTasks.has(task.id));
    const workflowType = reviewMode === 'check-state' ? 'task-check-state' : 'task-review';
    onStartReview(selectedTaskList, workflowType);
  };

  const toggleTaskExpansion = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // UI helper functions
  const getPriorityColor = (priority) => {
    const priorityStr = String(priority?.value || priority || '').toLowerCase();
    switch (priorityStr) {
      case 'urgent': return '#ff0000';
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#44aa44';
      default: return '#888888';
    }
  };

  const getPriorityText = (priority) => {
    const priorityStr = String(priority?.value || priority || '').toLowerCase();
    return priorityStr.charAt(0).toUpperCase() + priorityStr.slice(1);
  };

  const getStatusColor = (status) => {
    const statusStr = String(status?.value || status || '').toLowerCase();
    switch (statusStr) {
      case 'in-progress': return '#007acc';
      case 'pending': return '#ffaa00';
      case 'blocked': return '#ff4444';
      default: return '#888888';
    }
  };

  const getStatusText = (status) => {
    const statusStr = String(status?.value || status || '').toLowerCase();
    return statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get unique categories and priorities for filters
  const getUniqueCategories = () => {
    const categories = new Set();
    tasks.forEach(task => {
      const category = task.category?.value || task.category;
      if (category) categories.add(category);
    });
    return Array.from(categories).sort();
  };

  const getUniquePriorities = () => {
    const priorities = new Set();
    tasks.forEach(task => {
      const priority = task.priority?.value || task.priority;
      if (priority) priorities.add(priority);
    });
    return Array.from(priorities).sort();
  };

  const getUniqueStatuses = () => {
    const statuses = new Set();
    tasks.forEach(task => {
      const status = task.status?.value || task.status;
      if (status && status !== 'completed' && status !== 'done') {
        statuses.add(status);
      }
    });
    return Array.from(statuses).sort();
  };

  if (!isOpen) return null;

  const sortedTasks = getSortedTasks();
  const selectedCount = selectedTasks.size;
  const totalCount = sortedTasks.length;

  return (
    <div className="task-review-selection-modal-overlay" onClick={onClose}>
      <div className="task-review-selection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Select Tasks for Review</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          {/* Summary */}
          <div className="task-review-summary">
            <p>Select tasks to review. Completed tasks are automatically excluded.</p>
            <div className="selection-info">
              <span className="selected-count">{selectedCount}</span> of <span className="total-count">{totalCount}</span> tasks selected
            </div>
          </div>

          {/* Review Mode Toggle */}
          <div className="review-mode-toggle">
            <label className="toggle-label">
              <span className="toggle-text">Mode:</span>
              <div className="toggle-switch">
                <input
                  type="radio"
                  name="reviewMode"
                  value="review"
                  checked={reviewMode === 'review'}
                  onChange={(e) => setReviewMode(e.target.value)}
                  id="mode-review"
                />
                <label htmlFor="mode-review" className="toggle-option">
                  📋 Review
                </label>
                
                <input
                  type="radio"
                  name="reviewMode"
                  value="check-state"
                  checked={reviewMode === 'check-state'}
                  onChange={(e) => setReviewMode(e.target.value)}
                  id="mode-check-state"
                />
                <label htmlFor="mode-check-state" className="toggle-option">
                  🔍 Check State
                </label>
              </div>
            </label>
            <div className="mode-description">
              {reviewMode === 'review' ? (
                <span>📋 Comprehensive review: Validates plan against codebase, creates missing files, analyzes implementation status, updates plan</span>
              ) : (
                <span>🔍 Quick check: Only checks existing files, updates status indicators, detects/translates non-English content, no file creation</span>
              )}
            </div>
          </div>

          {/* Filters and Sorting */}
          <div className="task-review-controls">
            <div className="filter-group">
              <label>Category:</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {getUniqueCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Priority:</label>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="all">All Priorities</option>
                {getUniquePriorities().map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                {getUniqueStatuses().map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="sort-group">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="date">Date</option>
                <option value="name">Name</option>
              </select>
              <button 
                className="sort-order-btn"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Select All */}
          <div className="select-all-controls">
            <label className="select-all-checkbox">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                disabled={totalCount === 0}
              />
              <span>Select All ({totalCount} tasks)</span>
            </label>
          </div>

          {/* Task List */}
          <div className="task-list">
            {totalCount === 0 ? (
              <div className="no-tasks">
                <p>No reviewable tasks found.</p>
                <p>All tasks may be completed or filtered out.</p>
              </div>
            ) : (
              sortedTasks.map(task => (
                <div key={task.id} className="task-item">
                  <div className="task-item-header">
                    <label className="task-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => handleTaskToggle(task.id)}
                      />
                    </label>
                    
                    <div className="task-info" onClick={() => toggleTaskExpansion(task.id)}>
                      <div className="task-title">{task.title || task.name || 'Untitled Task'}</div>
                      <div className="task-meta">
                        <span 
                          className="task-priority" 
                          style={{ color: getPriorityColor(task.priority) }}
                        >
                          {getPriorityText(task.priority)}
                        </span>
                        <span 
                          className="task-status" 
                          style={{ color: getStatusColor(task.status) }}
                        >
                          {getStatusText(task.status)}
                        </span>
                        <span className="task-category">{task.category?.value || task.category || 'Uncategorized'}</span>
                        <span className="task-date">{formatDate(task.createdAt || task.created_at)}</span>
                      </div>
                    </div>

                    <button 
                      className="expand-btn"
                      onClick={() => toggleTaskExpansion(task.id)}
                      title={expandedTasks.has(task.id) ? 'Collapse' : 'Expand'}
                    >
                      {expandedTasks.has(task.id) ? '−' : '+'}
                    </button>
                  </div>

                  {expandedTasks.has(task.id) && (
                    <div className="task-details">
                      <div className="task-description">
                        {task.description || 'No description available'}
                      </div>
                      {task.estimatedHours && (
                        <div className="task-estimated-hours">
                          <strong>Estimated:</strong> {task.estimatedHours} hours
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button 
              className="btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              className="btn-primary"
              onClick={handleStartReview}
              disabled={selectedCount === 0 || isLoading}
            >
              {isLoading ? 'Starting Review...' : `Start Review (${selectedCount})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskReviewSelectionModal;
