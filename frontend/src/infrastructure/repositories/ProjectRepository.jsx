/**
 * ProjectRepository - Frontend repository for project management operations
 * Handles all project-related API calls with proper error handling
 */

import { logger } from "@/infrastructure/logging/Logger";
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import TimeoutConfig from '@/config/timeout-config.js';

// Project API Configuration
const PROJECT_API_CONFIG = {
  baseURL: import.meta.env.VITE_BACKEND_URL,
  endpoints: {
    projects: {
      list: '/api/projects',
      byId: (id) => `/api/projects/${id}`,
      updatePort: (projectId) => `/api/projects/${projectId}/port`,
      savePort: (projectId) => `/api/projects/${projectId}/save-port`,
      detect: '/api/projects/detect',
      path: (projectId) => `/api/projects/${projectId}/path`
    }
  }
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}, projectId = null) => {
  const url = typeof endpoint === 'function' ? endpoint() : endpoint;
  
  logger.info('🔍 [ProjectRepository] Making API call to:', url);
  
  // Get authentication headers
  const { getAuthHeaders } = useAuthStore.getState();
  const authHeaders = getAuthHeaders();
  
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    credentials: 'include',
    ...options
  };

  // Initialize timeout variables
  let timeoutId = null;
  let controller = null;

  try {
    const timeoutMs = TimeoutConfig.getApiTimeout(endpoint);
    logger.info(`🔍 [ProjectRepository] Using timeout: ${timeoutMs}ms for endpoint: ${endpoint}`);
    
    controller = new AbortController();
    timeoutId = setTimeout(() => {
      logger.warn(`⏰ [ProjectRepository] Request timeout after ${timeoutMs}ms for ${endpoint}`);
      controller.abort();
    }, timeoutMs);
    
    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    logger.info('🔍 [ProjectRepository] Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        logger.info('❌ [ProjectRepository] 401 Unauthorized - user not authenticated');
        const { handleAuthFailure } = useAuthStore.getState();
        handleAuthFailure('Session expired. Please log in again.');
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    logger.info('✅ [ProjectRepository] API call successful');
    return data;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (error.name === 'AbortError') {
      const timeoutMs = TimeoutConfig.getApiTimeout(endpoint);
      const timeoutError = new Error(`Request timeout after ${timeoutMs}ms for ${endpoint}. The server may be slow or unresponsive.`);
      timeoutError.name = 'TimeoutError';
      timeoutError.code = 'TIMEOUT';
      logger.error(`⏰ [ProjectRepository] Request timeout for ${url}:`, timeoutError);
      throw timeoutError;
    }
    
    logger.error(`❌ [ProjectRepository] API call failed for ${url}:`, error);
    throw error;
  }
};

// Utility function to convert workspace path to project ID
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return 'default';
  
  // Extract project name from path
  const pathParts = workspacePath.split('/');
  const projectName = pathParts[pathParts.length - 1];
  
  // Keep original case - Backend now supports it
  return projectName.replace(/[^a-zA-Z0-9]/g, '_');
};

class ProjectRepository {
  constructor() {
    this.baseURL = PROJECT_API_CONFIG.baseURL;
    this.currentProjectId = null;
  }

  /**
   * Get current project ID from active IDE
   * @returns {Promise<string>} Current project ID
   */
  async getCurrentProjectId() {
    try {
      // Import IDERepository to get IDE information
      const { default: IDERepository } = await import('./IDERepository.jsx');
      const ideRepo = new IDERepository();
      
      const ideList = await ideRepo.getIDEs();
      if (ideList.success && ideList.data) {
        const activeIDE = ideList.data.find(ide => ide.active);
        if (activeIDE && activeIDE.workspacePath) {
          this.currentProjectId = getProjectIdFromWorkspace(activeIDE.workspacePath);
          logger.info('✅ [ProjectRepository] Current project ID from active IDE:', this.currentProjectId, 'from workspace:', activeIDE.workspacePath);
          return this.currentProjectId;
        }
        
        // Fallback: Take the first available IDE
        const firstIDE = ideList.data[0];
        if (firstIDE && firstIDE.workspacePath) {
          this.currentProjectId = getProjectIdFromWorkspace(firstIDE.workspacePath);
          logger.info('🔍 [ProjectRepository] Current project ID from first IDE:', this.currentProjectId, 'from workspace:', firstIDE.workspacePath);
          return this.currentProjectId;
        }
      }
      
      // Fallback: Workspace Info
      const workspaceInfo = await ideRepo.getWorkspaceInfo();
      if (workspaceInfo.success && workspaceInfo.data && workspaceInfo.data.workspacePath) {
        this.currentProjectId = getProjectIdFromWorkspace(workspaceInfo.data.workspacePath);
        logger.info('🔍 [ProjectRepository] Current project ID from workspace info:', this.currentProjectId);
        return this.currentProjectId;
      }
      
    } catch (error) {
      logger.error('❌ [ProjectRepository] Error getting current project ID:', error);
    }
    
    // Final fallback: Hardcoded for PIDEA (only as last option)
    this.currentProjectId = 'pidea';
    logger.info('🔍 [ProjectRepository] Using hardcoded project ID:', this.currentProjectId);
    return this.currentProjectId;
  }

  /**
   * Detect projects
   * @returns {Promise<Object>} Detected projects
   */
  async detectProjects() {
    return apiCall(PROJECT_API_CONFIG.endpoints.projects.detect, {
      method: 'POST'
    });
  }

  /**
   * Get project by workspace path
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Project data
   */
  async getProjectByWorkspacePath(workspacePath) {
    try {
      // Import IDERepository to get workspace info
      const { default: IDERepository } = await import('./IDERepository.jsx');
      const ideRepo = new IDERepository();
      
      const workspaceResult = await ideRepo.getWorkspaceInfo();
      if (workspaceResult.success && workspaceResult.data) {
        const workspaceInfo = workspaceResult.data;
        
        // Find project by workspace path
        const projectsResult = await apiCall(PROJECT_API_CONFIG.endpoints.projects.list);
        if (projectsResult.success && projectsResult.data) {
          const project = projectsResult.data.find(p => p.workspacePath === workspacePath);
          if (project) {
            return { success: true, data: project };
          }
        }
      }
      
      return { success: false, error: 'Project not found for workspace path' };
    } catch (error) {
      logger.error('Failed to get project by workspace path:', error);
      return { success: false, error: 'Failed to get project' };
    }
  }

  /**
   * Save project port to database
   * @param {string} projectId - Project ID
   * @param {number} port - Port number to save
   * @param {string} portType - Type of port (frontend, backend, database)
   * @returns {Promise<Object>} Save result
   */
  async saveProjectPort(projectId, port, portType = 'frontend') {
    try {
      return apiCall(PROJECT_API_CONFIG.endpoints.projects.savePort(projectId), {
        method: 'POST',
        body: JSON.stringify({ port, portType })
      });
    } catch (error) {
      logger.error('Failed to save project port:', error);
      return { success: false, error: 'Failed to save port' };
    }
  }

  /**
   * Update project port
   * @param {string} projectId - Project ID
   * @param {number} port - Port number
   * @param {string} portType - Type of port (frontend, backend, database)
   * @returns {Promise<Object>} Update result
   */
  async updateProjectPort(projectId, port, portType = 'frontend') {
    try {
      return apiCall(PROJECT_API_CONFIG.endpoints.projects.updatePort(projectId), {
        method: 'PUT',
        body: JSON.stringify({ port, portType })
      });
    } catch (error) {
      logger.error('Failed to update project port:', error);
      return { success: false, error: 'Failed to update port' };
    }
  }

  /**
   * Get project path
   * @param {string} projectId - Project ID
   * @returns {Promise<string>} Project path
   */
  async getProjectPath(projectId) {
    try {
      const response = await apiCall(PROJECT_API_CONFIG.endpoints.projects.path(projectId), {}, projectId);
      return response.data?.path || '/home/fr4iser/Documents/Git/PIDEA';
    } catch (error) {
      console.warn('Failed to get project path, using default:', error);
      return '/home/fr4iser/Documents/Git/PIDEA';
    }
  }

  /**
   * Get project commands from database
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project commands
   */
  async getProjectCommands(projectId = null) {
    try {
      const currentProjectId = projectId || await this.getCurrentProjectId();
      
      // Use existing terminal services to get project commands
      return apiCall(`/api/projects/${currentProjectId}/commands`);
    } catch (error) {
      logger.error('Failed to get project commands:', error);
      return { success: false, error: 'Failed to get project commands' };
    }
  }

  /**
   * Execute project command
   * @param {string} projectId - Project ID
   * @param {string} commandType - Command type (start, dev, build, test, stop)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Command execution result
   */
  async executeProjectCommand(projectId = null, commandType, options = {}) {
    try {
      const currentProjectId = projectId || await this.getCurrentProjectId();
      
      // Use existing terminal execution services
      return apiCall(`/api/projects/${currentProjectId}/execute-command`, {
        method: 'POST',
        body: JSON.stringify({ commandType, ...options })
      });
    } catch (error) {
      logger.error('Failed to execute project command:', error);
      return { success: false, error: 'Failed to execute command' };
    }
  }
}

export default ProjectRepository;
