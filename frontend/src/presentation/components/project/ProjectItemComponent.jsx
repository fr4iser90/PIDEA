/**
 * ProjectItemComponent - Individual project item for sidebar
 * 
 * This component displays individual project items with status indicators,
 * actions, and metadata display.
 */

import React, { useState } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import { useProjectManagement } from '@/infrastructure/stores/hooks/useProjectStore';

const ProjectItemComponent = ({ project, isActive, onClick }) => {
  const { deleteProject, updateProject } = useProjectManagement();
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete project "${project.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    
    try {
      await deleteProject(project.id);
      logger.info('Project deleted successfully:', project.id);
    } catch (error) {
      logger.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    // TODO: Implement edit functionality
    logger.info('Edit project requested:', project.id);
  };

  const handleMouseEnter = () => {
    setShowActions(true);
  };

  const handleMouseLeave = () => {
    setShowActions(false);
  };

  const getProjectIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'development':
        return '🛠️';
      case 'production':
        return '🚀';
      case 'testing':
        return '🧪';
      case 'demo':
        return '🎯';
      default:
        return '📁';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'error':
        return 'status-error';
      default:
        return 'status-default';
    }
  };

  return (
    <div
      className={`project-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="project-info">
        <div className="project-header">
          <div className="project-icon">
            {getProjectIcon(project.type)}
          </div>
          <div className="project-title">
            <h4>{project.name}</h4>
            <div className="project-meta">
              <span className={`project-status ${getStatusColor(project.status || 'default')}`}>
                {project.status || 'inactive'}
              </span>
              {project.framework && (
                <span className="project-framework">{project.framework}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="project-details">
          <p className="project-description">
            {project.description || 'No description'}
          </p>
          <p className="project-path">
            📁 {project.workspacePath}
          </p>
        </div>
      </div>

      <div className={`project-actions ${showActions ? 'visible' : ''}`}>
        <button
          onClick={handleEdit}
          className="btn-action btn-edit"
          title="Edit project"
        >
          ✏️
        </button>
        <button
          onClick={handleDelete}
          className="btn-action btn-delete"
          title="Delete project"
          disabled={isDeleting}
        >
          {isDeleting ? '⏳' : '🗑️'}
        </button>
      </div>
    </div>
  );
};

export default ProjectItemComponent;
