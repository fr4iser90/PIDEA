/**
 * Project Management Component
 * Main component for project management using ProjectStore
 * Provides project listing, creation, editing, and management functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import { useProjectManagement, useProjectSelection, useProjectValidation } from '@/infrastructure/stores/hooks/useProjectStore';
import { useProjects, useSelectedProject, useProjectStats } from '@/infrastructure/stores/selectors/ProjectSelectors';

const ProjectManagementComponent = ({ onProjectSelect, onProjectCreate, onProjectUpdate, onProjectDelete }) => {
  // Store hooks
  const {
    projects,
    selectedProject,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    setSelectedProject,
    refresh,
    clearError
  } = useProjectManagement();

  const { selectProject, searchAndSelect } = useProjectSelection();
  const { validateForCreation, validateForUpdate } = useProjectValidation();
  const projectStats = useProjectStats();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    workspacePath: '',
    type: 'development',
    framework: '',
    language: '',
    packageManager: ''
  });
  const [formErrors, setFormErrors] = useState([]);

  // Filtered projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return Object.values(projects);
    return searchAndSelect(searchQuery);
  }, [projects, searchQuery, searchAndSelect]);

  // Form validation
  const validateForm = useCallback(() => {
    const validation = editingProject 
      ? validateForUpdate(editingProject.id, formData)
      : validateForCreation(formData);
    
    setFormErrors(validation.errors);
    return validation.isValid;
  }, [formData, editingProject, validateForCreation, validateForUpdate]);

  // Form handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData);
        logger.info('Project updated successfully');
        onProjectUpdate?.(editingProject.id, formData);
      } else {
        const newProject = await createProject(formData);
        logger.info('Project created successfully');
        onProjectCreate?.(newProject);
      }
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        workspacePath: '',
        type: 'development',
        framework: '',
        language: '',
        packageManager: ''
      });
      setShowCreateForm(false);
      setEditingProject(null);
      setFormErrors([]);
    } catch (error) {
      logger.error('Failed to save project:', error);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      workspacePath: project.workspacePath,
      type: project.type || 'development',
      framework: project.framework || '',
      language: project.language || '',
      packageManager: project.packageManager || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await deleteProject(projectId);
      logger.info('Project deleted successfully');
      onProjectDelete?.(projectId);
    } catch (error) {
      logger.error('Failed to delete project:', error);
    }
  };

  const handleProjectSelect = (projectId) => {
    selectProject(projectId);
    onProjectSelect?.(projectId);
  };

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      logger.error('Failed to refresh projects:', error);
    }
  };

  // Auto-refresh on mount
  useEffect(() => {
    if (Object.keys(projects).length === 0) {
      handleRefresh();
    }
  }, []);

  return (
    <div className="project-management">
      {/* Header */}
      <div className="project-header">
        <h2>Project Management</h2>
        <div className="project-actions">
          <button 
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
            disabled={isLoading}
          >
            Create Project
          </button>
          <button 
            onClick={handleRefresh}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="project-stats">
        <div className="stat-item">
          <span className="stat-label">Total Projects:</span>
          <span className="stat-value">{projectStats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Selected Projects:</span>
          <span className="stat-value">{projectStats.active}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Last Update:</span>
          <span className="stat-value">
            {projectStats.lastUpdate ? new Date(projectStats.lastUpdate).toLocaleString() : 'Never'}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="project-search">
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={clearError} className="btn-close">×</button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="loading-message">
          Loading projects...
        </div>
      )}

      {/* Project List */}
      <div className="project-list">
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? 'No projects found matching your search.' : 'No projects available.'}
          </div>
        ) : (
          filteredProjects.map(project => (
            <div 
              key={project.id} 
              className={`project-item ${selectedProject === project.id ? 'active' : ''}`}
              onClick={() => handleProjectSelect(project.id)}
            >
              <div className="project-info">
                <h3 className="project-name">{project.name}</h3>
                <p className="project-description">{project.description}</p>
                <div className="project-meta">
                  <span className="project-type">{project.type}</span>
                  {project.framework && <span className="project-framework">{project.framework}</span>}
                  <span className="project-path">{project.workspacePath}</span>
                </div>
              </div>
              <div className="project-actions">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(project);
                  }}
                  className="btn btn-sm btn-secondary"
                >
                  Edit
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id);
                  }}
                  className="btn btn-sm btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProject ? 'Edit Project' : 'Create New Project'}</h3>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="btn-close"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="project-form">
              {/* Form Errors */}
              {formErrors.length > 0 && (
                <div className="form-errors">
                  {formErrors.map((error, index) => (
                    <div key={index} className="error-item">{error}</div>
                  ))}
                </div>
              )}

              {/* Form Fields */}
              <div className="form-group">
                <label htmlFor="name">Project Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="form-textarea"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="workspacePath">Workspace Path *</label>
                <input
                  type="text"
                  id="workspacePath"
                  value={formData.workspacePath}
                  onChange={(e) => handleInputChange('workspacePath', e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="type">Type</label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="form-select"
                  >
                    <option value="development">Development</option>
                    <option value="production">Production</option>
                    <option value="testing">Testing</option>
                    <option value="demo">Demo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="framework">Framework</label>
                  <input
                    type="text"
                    id="framework"
                    value={formData.framework}
                    onChange={(e) => handleInputChange('framework', e.target.value)}
                    className="form-input"
                    placeholder="React, Vue, Angular, etc."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="language">Language</label>
                  <input
                    type="text"
                    id="language"
                    value={formData.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                    className="form-input"
                    placeholder="JavaScript, TypeScript, Python, etc."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="packageManager">Package Manager</label>
                  <select
                    id="packageManager"
                    value={formData.packageManager}
                    onChange={(e) => handleInputChange('packageManager', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select Package Manager</option>
                    <option value="npm">npm</option>
                    <option value="yarn">yarn</option>
                    <option value="pnpm">pnpm</option>
                    <option value="bun">bun</option>
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : (editingProject ? 'Update Project' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagementComponent;
