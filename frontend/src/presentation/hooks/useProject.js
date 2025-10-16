/**
 * useProject Hook
 * Custom hook for project management using DDD patterns
 */
import { useState, useEffect, useCallback } from 'react';
import useProjectStore from '../../infrastructure/stores/ProjectStore.jsx';

export const useProject = (projectId = null) => {
  const store = useProjectStore();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load project data
  const loadProject = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const projectData = await store.getProject(projectId);
      setProject(projectData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, store]);

  // Create project
  const createProject = useCallback(async (projectData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newProject = await store.createProject(projectData);
      return newProject;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  // Update project
  const updateProject = useCallback(async (updates) => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedProject = await store.updateProject(projectId, updates);
      setProject(prev => ({ ...prev, ...updatedProject.toJSON() }));
      return updatedProject;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, store]);

  // Delete project
  const deleteProject = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await store.deleteProject(projectId);
      setProject(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, store]);

  // Get project statistics
  const getStatistics = useCallback(async () => {
    if (!projectId) return null;
    
    try {
      return await store.getProjectStatistics(projectId);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [projectId, store]);

  // Load project on mount or when projectId changes
  useEffect(() => {
    loadProject();
  }, [loadProject]);

  return {
    project,
    isLoading: isLoading || store.isLoading,
    error: error || store.error,
    createProject,
    updateProject,
    deleteProject,
    getStatistics,
    refresh: loadProject,
    clearError: () => {
      setError(null);
      store.clearError();
    }
  };
};

export const useProjectList = () => {
  const store = useProjectStore();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all projects
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await store.loadProjects();
      setProjects(store.getProjectList());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  // Search projects
  const searchProjects = useCallback(async (query, options = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const results = await store.searchProjects(query, options);
      return results;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Update projects when store changes
  useEffect(() => {
    setProjects(store.getProjectList());
  }, [store.projects, store.lastUpdate]);

  return {
    projects,
    isLoading: isLoading || store.isLoading,
    error: error || store.error,
    loadProjects,
    searchProjects,
    clearError: () => {
      setError(null);
      store.clearError();
    }
  };
};
