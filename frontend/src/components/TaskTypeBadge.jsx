import React from 'react';
import { getCategoryInfo, getCategoryColor, getCategoryIcon } from '@/utils/taskTypeUtils';

/**
 * TaskTypeBadge Component
 * Displays task category with icon, color, and proper formatting
 */
const TaskTypeBadge = ({ 
  category, 
  subcategory, 
  className = '',
  showIcon = true,
  showSubcategory = true,
  size = 'default'
}) => {
  const categoryInfo = getCategoryInfo(category, showSubcategory ? subcategory : null);
  const color = getCategoryColor(category);
  const icon = getCategoryIcon(category);

  // Size classes
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-1.5',
    large: 'text-base px-4 py-2'
  };

  const iconSizeClasses = {
    small: 'text-xs',
    default: 'text-sm',
    large: 'text-base'
  };

  return (
    <div 
      className={`task-type-badge inline-flex items-center gap-1.5 rounded font-medium ${sizeClasses[size]} ${className}`}
      style={{ 
        backgroundColor: `${color}20`, // 20% opacity background
        border: `1px solid ${color}40`, // 40% opacity border
        color: color
      }}
    >
      {showIcon && (
        <span className={`category-icon ${iconSizeClasses[size]}`}>
          {icon}
        </span>
      )}
      <span className="category-text whitespace-nowrap">
        {categoryInfo.display}
      </span>
    </div>
  );
};

export default TaskTypeBadge; 