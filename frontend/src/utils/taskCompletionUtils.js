/**
 * Task Completion Utilities
 * Provides functions for detecting and managing task completion status
 */

/**
 * Check if a task is fully completed
 * @param {Object} task - Task object
 * @returns {boolean} True if task is completed
 */
export const isTaskCompleted = (task) => {
  if (!task) return false;
  
  // ✅ FIXED: Only check status, not progress (backend handles intelligent detection)
  const status = typeof task.status === 'object' && task.status?.value 
    ? task.status.value 
    : task.status;
  
  // Task is completed ONLY if status is 'completed'
  return status === 'completed';
};

/**
 * Check if a task is partially completed
 * @param {Object} task - Task object
 * @returns {boolean} True if task is partially completed
 */
export const isTaskPartiallyCompleted = (task) => {
  if (!task) return false;
  
  // ✅ FIXED: Use the same progress detection logic as getTaskProgress
  let progress = 0;
  
  // First check main progress field
  if (task.progress !== undefined && task.progress !== null) {
    progress = task.progress;
  }
  // Then check metadata.progress
  else if (task.metadata?.progress !== undefined && task.metadata.progress !== null) {
    progress = task.metadata.progress;
  }
  // Finally check overallProgress in metadata
  else if (task.metadata?.overallProgress !== undefined && task.metadata.overallProgress !== null) {
    progress = task.metadata.overallProgress;
  }
  
  // ✅ FIXED: Handle both string status and value object status
  const status = typeof task.status === 'object' && task.status?.value 
    ? task.status.value 
    : task.status;
  
  // Task is partially completed if progress is between 1-99% and not fully completed
  return progress > 0 && progress < 100 && status !== 'completed';
};

/**
 * Get the completion status of a task
 * @param {Object} task - Task object
 * @returns {string} 'completed', 'partially_completed', or 'pending'
 */
export const getCompletionStatus = (task) => {
  if (!task) return 'pending';
  
  if (isTaskCompleted(task)) return 'completed';
  if (isTaskPartiallyCompleted(task)) return 'partially_completed';
  return 'pending';
};

/**
 * Get the progress percentage of a task
 * @param {Object} task - Task object
 * @returns {number} Progress percentage (0-100)
 */
export const getTaskProgress = (task) => {
  if (!task) return 0;
  
  // ✅ FIXED: Check for progress in multiple locations
  let progress = 0;
  
  // First check main progress field
  if (task.progress !== undefined && task.progress !== null) {
    progress = task.progress;
  }
  // Then check metadata.progress
  else if (task.metadata?.progress !== undefined && task.metadata.progress !== null) {
    progress = task.metadata.progress;
  }
  // Finally check overallProgress in metadata
  else if (task.metadata?.overallProgress !== undefined && task.metadata.overallProgress !== null) {
    progress = task.metadata.overallProgress;
  }
  
  // ✅ FIXED: Handle both string status and value object status
  const status = typeof task.status === 'object' && task.status?.value 
    ? task.status.value 
    : task.status;
  
  // If status is completed, return 100%
  if (status === 'completed') return 100;
  
  // Return actual progress, capped at 100%
  return Math.min(100, Math.max(0, progress));
};

/**
 * Get display text for task completion status
 * @param {Object} task - Task object
 * @returns {string} Display text for the task status
 */
export const getCompletionDisplayText = (task) => {
  if (!task) return 'Unknown';
  
  const status = getCompletionStatus(task);
  const progress = getTaskProgress(task);
  
  switch (status) {
    case 'completed':
      return 'COMPLETED';
    case 'partially_completed':
      return `${progress}% COMPLETE`;
    case 'pending':
      return 'PENDING';
    default:
      return 'Unknown';
  }
};

/**
 * Get color for task completion status
 * @param {Object} task - Task object
 * @returns {string} CSS color value
 */
export const getCompletionColor = (task) => {
  if (!task) return '#6b7280'; // Default gray
  
  const status = getCompletionStatus(task);
  
  switch (status) {
    case 'completed':
      return '#10b981'; // Green
    case 'partially_completed':
      return '#3b82f6'; // Blue
    case 'pending':
      return '#f59e0b'; // Orange
    default:
      return '#6b7280'; // Gray
  }
};

/**
 * Get icon for task completion status
 * @param {Object} task - Task object
 * @returns {string} Icon emoji
 */
export const getCompletionIcon = (task) => {
  if (!task) return '❓';
  
  const status = getCompletionStatus(task);
  
  switch (status) {
    case 'completed':
      return '✅';
    case 'partially_completed':
      return '🔄';
    case 'pending':
      return '⏳';
    default:
      return '❓';
  }
};

/**
 * Filter tasks based on completion status
 * @param {Array} tasks - Array of task objects
 * @param {boolean} showCompleted - Whether to show completed tasks
 * @returns {Array} Filtered tasks
 */
export const filterTasksByCompletion = (tasks, showCompleted = false) => {
  if (!Array.isArray(tasks)) return [];
  
  return tasks.filter(task => {
    const isCompleted = isTaskCompleted(task);
    return showCompleted || !isCompleted;
  });
};

/**
 * Get completion statistics for a task list
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Statistics object
 */
export const getCompletionStats = (tasks) => {
  if (!Array.isArray(tasks)) {
    return { total: 0, completed: 0, partiallyCompleted: 0, pending: 0, completionRate: 0 };
  }
  
  const total = tasks.length;
  const completed = tasks.filter(isTaskCompleted).length;
  const partiallyCompleted = tasks.filter(isTaskPartiallyCompleted).length;
  const pending = tasks.filter(task => !isTaskCompleted(task) && !isTaskPartiallyCompleted(task)).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return {
    total,
    completed,
    partiallyCompleted,
    pending,
    completionRate
  };
}; 