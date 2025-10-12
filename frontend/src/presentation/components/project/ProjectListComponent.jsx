/**
 * ProjectListComponent - Project list display for sidebar
 * 
 * This component provides project listing functionality for the sidebar,
 * including search, filtering, and project selection.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import { useProjectManagement } from '@/infrastructure/stores/hooks/useProjectStore';
import { useProjects, useSelectedProject } from '@/infrastructure/stores/selectors/ProjectSelectors';
import ProjectItemComponent from './ProjectItemComponent.jsx';
import ProjectAddComponent from './ProjectAddComponent.jsx';
import '@/scss/components/_project-management.scss';

const ProjectListComponent = ({ eventBus, onProjectSelect, showAddModal, onCloseAddModal }) => {
  logger.info('🔍 ProjectListComponent RENDERING!', { showAddModal });
  
  const { projects, isLoading, error, refresh } = useProjectManagement();
  const selectedProject = useSelectedProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProjects, setFilteredProjects] = useState([]);

  // Filter projects based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredProjects(Object.values(projects));
    } else {
      const filtered = Object.values(projects).filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.workspacePath.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [projects, searchQuery]);

  // Auto-refresh projects on mount
  useEffect(() => {
    if (Object.keys(projects).length === 0 && !isLoading) {
      refresh();
    }
  }, [projects, isLoading, refresh]);


  const handleProjectSelect = (projectId) => {
    logger.info('Project selected:', projectId);
    onProjectSelect?.(projectId);
    eventBus?.emit('project-selected', { projectId });
  };

  const handleProjectCreated = (project) => {
    logger.info('Project created:', project);
    setShowAddForm(false);
    eventBus?.emit('project-created', { project });
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="project-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      {/* Error Display */}
      {error && (
        <div className="project-list-error">
          <div className="error-icon">⚠️</div>
          <p>Failed to load projects</p>
          <button onClick={refresh} className="btn btn-secondary">
            Retry
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="project-list-header">
        <h3>Projects</h3>
        <button 
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary btn-sm"
          title="Add new project"
        >
          + Add Project
        </button>
      </div>

      {/* Search */}
      <div className="project-search">
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="project-search-input"
        />
      </div>

      {/* Project List */}
      <div className="project-list-content">
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? 'No projects found matching your search.' : 'No projects available.'}
          </div>
        ) : (
          filteredProjects.map(project => (
            <ProjectItemComponent
              key={project.id}
              project={project}
              isActive={project.id === selectedProject?.id}
              onClick={() => handleProjectSelect(project.id)}
            />
          ))
        )}
      </div>

    </div>
  );
};

export default ProjectListComponent;
