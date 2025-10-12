/**
 * ProjectAddComponent - Project creation form for sidebar
 * 
 * This component provides project creation functionality with form validation
 * and integration with the ProjectStore.
 */

import React, { useState } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import { useProjectManagement } from '@/infrastructure/stores/hooks/useProjectStore';

const ProjectAddComponent = ({ isOpen, onClose, onProjectCreated }) => {
  logger.info('🔍 ProjectAddComponent RENDERING!', { isOpen });
  
  const { createProject } = useProjectManagement();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    workspacePath: '',
    type: 'development',
    framework: '',
    language: '',
    packageManager: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    
    if (!formData.workspacePath.trim()) {
      newErrors.workspacePath = 'Workspace path is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const project = await createProject(formData);
      logger.info('Project created successfully:', project);
      onProjectCreated?.(project);
    } catch (error) {
      logger.error('Failed to create project:', error);
      setErrors({ submit: error.message || 'Failed to create project' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      workspacePath: '',
      type: 'development',
      framework: '',
      language: '',
      packageManager: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="project-add-modal">
      <div className="modal-overlay" onClick={handleCancel}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button onClick={handleCancel} className="btn-close">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label htmlFor="name">Project Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? 'error' : ''}
              placeholder="Enter project name"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter project description"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="workspacePath">Workspace Path *</label>
            <input
              id="workspacePath"
              type="text"
              value={formData.workspacePath}
              onChange={(e) => handleInputChange('workspacePath', e.target.value)}
              className={errors.workspacePath ? 'error' : ''}
              placeholder="Enter workspace path"
            />
            {errors.workspacePath && <span className="error-message">{errors.workspacePath}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Type</label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
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
                id="framework"
                type="text"
                value={formData.framework}
                onChange={(e) => handleInputChange('framework', e.target.value)}
                placeholder="e.g., React, Vue, Angular"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="language">Language</label>
              <input
                id="language"
                type="text"
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                placeholder="e.g., JavaScript, TypeScript"
              />
            </div>

            <div className="form-group">
              <label htmlFor="packageManager">Package Manager</label>
              <select
                id="packageManager"
                value={formData.packageManager}
                onChange={(e) => handleInputChange('packageManager', e.target.value)}
              >
                <option value="">Select package manager</option>
                <option value="npm">npm</option>
                <option value="yarn">yarn</option>
                <option value="pnpm">pnpm</option>
              </select>
            </div>
          </div>

          {errors.submit && (
            <div className="error-banner">
              {errors.submit}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectAddComponent;
