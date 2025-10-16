/**
 * ProjectManagementComponent
 * Refactored component using DDD patterns
 */
import React, { useState, useEffect } from 'react';
import { useProject, useProjectList } from '../hooks/useProject.js';
import { useTaskList } from '../hooks/useTask.js';
import { useAnalysisList } from '../hooks/useAnalysis.js';

const ProjectManagementComponent = ({ onProjectSelect, onProjectCreate }) => {
  // Domain-specific hooks
  const { projects, isLoading: projectsLoading, error: projectsError, loadProjects, searchProjects } = useProjectList();
  const { tasks, isLoading: tasksLoading, getStatistics: getTaskStats } = useTaskList();
  const { analyses, isLoading: analysesLoading, getStatistics: getAnalysisStats } = useAnalysisList();

  // Local state
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    workspacePath: '',
    type: 'development',
    framework: '',
    language: '',
    packageManager: ''
  });

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Handle project selection
  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
    onProjectSelect?.(projectId);
  };

  // Handle project creation
  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    try {
      const newProject = await onProjectCreate?.(formData);
      if (newProject) {
        setShowCreateForm(false);
        setFormData({
          name: '',
          description: '',
          workspacePath: '',
          type: 'development',
          framework: '',
          language: '',
          packageManager: ''
        });
        // Refresh projects list
        await loadProjects();
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  // Handle search
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      await searchProjects(query);
    } else {
      await loadProjects();
    }
  };

  // Get project statistics
  const getProjectStats = async (projectId) => {
    try {
      const [taskStats, analysisStats] = await Promise.all([
        getTaskStats(projectId),
        getAnalysisStats(projectId)
      ]);
      
      return {
        tasks: taskStats,
        analysis: analysisStats
      };
    } catch (error) {
      console.error('Failed to get project statistics:', error);
      return null;
    }
  };

  if (projectsLoading) {
    return (
      <div className="project-management-loading">
        <div className="loading-spinner">Loading projects...</div>
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="project-management-error">
        <div className="error-message">Error: {projectsError}</div>
        <button onClick={loadProjects} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="project-management-component">
      {/* Header */}
      <div className="project-management-header">
        <h2>Project Management</h2>
        <div className="project-actions">
          <button 
            onClick={() => setShowCreateForm(true)}
            className="create-project-button"
          >
            Create Project
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="project-search">
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Projects List */}
      <div className="projects-list">
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={selectedProjectId === project.id}
            onSelect={() => handleProjectSelect(project.id)}
            onGetStats={() => getProjectStats(project.id)}
          />
        ))}
      </div>

      {/* Create Project Form */}
      {showCreateForm && (
        <CreateProjectForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreateProject}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

// Project Card Component
const ProjectCard = ({ project, isSelected, onSelect, onGetStats }) => {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const handleGetStats = async () => {
    setLoadingStats(true);
    try {
      const projectStats = await onGetStats();
      setStats(projectStats);
    } catch (error) {
      console.error('Failed to load project stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div 
      className={`project-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="project-card-header">
        <h3>{project.name}</h3>
        <span className="project-type">{project.type}</span>
      </div>
      
      <div className="project-card-body">
        <p className="project-description">{project.description}</p>
        <p className="project-path">{project.workspacePath}</p>
        
        {project.framework && (
          <div className="project-tech">
            <span className="tech-item">Framework: {project.framework}</span>
            {project.language && <span className="tech-item">Language: {project.language}</span>}
            {project.packageManager && <span className="tech-item">Package Manager: {project.packageManager}</span>}
          </div>
        )}
      </div>

      <div className="project-card-footer">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleGetStats();
          }}
          className="stats-button"
          disabled={loadingStats}
        >
          {loadingStats ? 'Loading...' : 'Get Stats'}
        </button>
        
        {stats && (
          <div className="project-stats">
            <div className="stat-item">
              Tasks: {stats.tasks?.total || 0}
            </div>
            <div className="stat-item">
              Analysis: {stats.analysis?.total || 0}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Create Project Form Component
const CreateProjectForm = ({ formData, setFormData, onSubmit, onCancel }) => {
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="create-project-modal">
      <div className="modal-content">
        <h3>Create New Project</h3>
        
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Project Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Workspace Path</label>
            <input
              type="text"
              value={formData.workspacePath}
              onChange={(e) => handleInputChange('workspacePath', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Type</label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
            >
              <option value="development">Development</option>
              <option value="production">Production</option>
              <option value="testing">Testing</option>
            </select>
          </div>

          <div className="form-group">
            <label>Framework</label>
            <input
              type="text"
              value={formData.framework}
              onChange={(e) => handleInputChange('framework', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Language</label>
            <input
              type="text"
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Package Manager</label>
            <input
              type="text"
              value={formData.packageManager}
              onChange={(e) => handleInputChange('packageManager', e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button">
              Create Project
            </button>
            <button type="button" onClick={onCancel} className="cancel-button">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectManagementComponent;