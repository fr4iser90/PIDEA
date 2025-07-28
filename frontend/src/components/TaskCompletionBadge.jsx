import React from 'react';
import { 
  getCompletionStatus, 
  getCompletionDisplayText, 
  getCompletionColor, 
  getCompletionIcon,
  getTaskProgress 
} from '@/utils/taskCompletionUtils';

/**
 * TaskCompletionBadge Component
 * Displays task completion status with progress information
 * 
 * @param {Object} props - Component props
 * @param {Object} props.task - Task object
 * @param {string} props.size - Badge size ('small', 'medium', 'large')
 * @param {boolean} props.showIcon - Whether to show status icon
 * @param {boolean} props.showProgress - Whether to show progress information
 * @returns {JSX.Element} Task completion badge
 */
const TaskCompletionBadge = ({ 
  task, 
  size = 'medium', 
  showIcon = true, 
  showProgress = true 
}) => {
  if (!task) {
    return (
      <span className={`status-badge ${size} unknown`}>
        {showIcon && '❓'} Unknown
      </span>
    );
  }

  const status = getCompletionStatus(task);
  const displayText = getCompletionDisplayText(task);
  const color = getCompletionColor(task);
  const icon = getCompletionIcon(task);
  const progress = getTaskProgress(task);

  // Determine if we should show progress
  const shouldShowProgress = showProgress && status === 'partially_completed';

  return (
    <span 
      className={`status-badge ${size} ${status}`}
      style={{ backgroundColor: color }}
      title={shouldShowProgress ? `${progress}% complete` : displayText}
    >
      {showIcon && icon} {displayText}
    </span>
  );
};

export default TaskCompletionBadge; 