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
import ProjectCardComponent from './ProjectCardComponent.jsx';
import ProjectAddComponent from './ProjectAddComponent.jsx';
import '@/scss/components/_project-card.scss';

const ProjectListComponent = ({ eventBus, onProjectSelect, showAddModal, onCloseAddModal, onOpenAddModal }) => {
  // Removed render log to prevent spam during typing
  
  const { projects, isLoading, error, refresh, stopLoading } = useProjectManagement(true);
  const selectedProject = useSelectedProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProjects, setFilteredProjects] = useState([]);

  // Manual load trigger for testing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(projects).length === 0 && !isLoading) {
        logger.info('🔍 [ProjectListComponent] MANUAL LOAD TRIGGERED');
        refresh();
      }
    }, 2000); // Wait 2 seconds after mount
    
    return () => clearTimeout(timer);
  }, [projects, isLoading, refresh]);
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

  // Auto-load projects on component mount
  useEffect(() => {
    const loadProjects = async () => {
      logger.info('🔍 [ProjectListComponent] AUTO-LOADING PROJECTS ON MOUNT');
      await refresh();
    };
    
    // Only load if we don't have projects yet and we're not already loading
    if (Object.keys(projects).length === 0 && !isLoading) {
      loadProjects();
    }
  }, []); // Only run once on mount

  // MANUAL LOAD for refresh button
  const handleManualLoad = async () => {
    logger.info('🔍 [ProjectListComponent] MANUAL LOAD TRIGGERED');
    await refresh();
  };

  const handleProjectCreated = async (newProject) => {
    logger.info('🔍 [ProjectListComponent] Project created:', newProject);
    await refresh(); // Refresh the project list
    onCloseAddModal?.(false); // Close the modal
  };


  const handleProjectSelect = (projectId) => {
    onProjectSelect?.(projectId);
    eventBus?.emit('project-selected', { projectId });
  };

  const handleInterfaceSwitch = (interfaceItem) => {
    logger.info('Interface switch requested:', interfaceItem);
    // Handle interface switching logic here
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="project-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading projects...</p>
        <button 
          onClick={stopLoading} 
          className="btn btn-secondary btn-sm"
          style={{ marginTop: '10px' }}
        >
          Stop Loading
        </button>
      </div>
    );
  }

  return (
    <div className="project-list">
      {/* Error Display */}
      {error && (
        <div className="project-list-error">
          <div className="error-icon">⚠️</div>
          <p>Failed to load projects: {error}</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={refresh} className="btn btn-secondary">
              Retry
            </button>
            <button onClick={stopLoading} className="btn btn-secondary">
              Stop Loading
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="project-list-header">
        <h3>Projects</h3>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button 
            onClick={handleManualLoad}
            className="btn btn-secondary btn-sm"
            title="Load projects"
            disabled={isLoading}
          >
            🔄 Load
          </button>
          <button 
            onClick={() => onOpenAddModal && onOpenAddModal(true)}
            className="btn btn-primary btn-sm"
            title="Add new project"
          >
            + Add Project
          </button>
        </div>
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
            <ProjectCardComponent
              key={project.id}
              project={project}
              isActive={project.id === selectedProject?.id}
              onClick={() => handleProjectSelect(project.id)}
              eventBus={eventBus}
              onInterfaceSwitch={handleInterfaceSwitch}
            />
          ))
        )}
      </div>

      {/* Project Add Modal */}
      <ProjectAddComponent
        isOpen={showAddModal}
        onClose={() => onCloseAddModal?.(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
};

export default ProjectListComponent;
