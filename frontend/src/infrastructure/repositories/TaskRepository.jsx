/**
 * TaskRepository - Frontend repository for task management operations
 * Handles all task-related API calls with proper error handling
 */

import { logger } from "@/infrastructure/logging/Logger";
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import TimeoutConfig from '@/config/timeout-config.js';

// Task API Configuration
const TASK_API_CONFIG = {
  baseURL: import.meta.env.VITE_BACKEND_URL,
  endpoints: {
    tasks: {
      projectTasks: (projectId) => `/api/projects/${projectId}/tasks`,
      projectCreate: (projectId) => `/api/projects/${projectId}/tasks`,
      projectGet: (projectId, id) => `/api/projects/${projectId}/tasks/${id}`,
      projectUpdate: (projectId, id) => `/api/projects/${projectId}/tasks/${id}`,
      projectDelete: (projectId, id) => `/api/projects/${projectId}/tasks/${id}`,
      projectExecute: (projectId, taskId) => `/api/projects/${projectId}/tasks/${taskId}/execute`,
      projectStatus: (projectId, id) => `/api/projects/${projectId}/tasks/${id}/execution`,
      analysis: {
        project: (projectId) => `/api/projects/${projectId}/analysis`,
        ai: (projectId) => `/api/projects/${projectId}/analysis/ai`
      },
      autoMode: {
        start: (projectId) => `/api/projects/${projectId}/tasks/enqueue`,
        stop: (projectId) => `/api/projects/${projectId}/workflow/stop`,
        status: (projectId) => `/api/projects/${projectId}/workflow/status`
      },
      autoRefactor: {
        execute: (projectId) => `/api/projects/${projectId}/tasks/enqueue`
      },
      syncManual: (projectId) => `/api/projects/${projectId}/tasks/sync-manual`,
      cleanManual: (projectId) => `/api/projects/${projectId}/tasks/clean-manual`,
      syncStatus: (projectId) => `/api/projects/${projectId}/tasks/sync-status`,
      validateStatus: (projectId) => `/api/projects/${projectId}/tasks/validate-status`,
      rollbackStatus: (projectId) => `/api/projects/${projectId}/tasks/rollback-status`
    }
  }
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}, projectId = null) => {
  const url = typeof endpoint === 'function' ? endpoint() : endpoint;
  
  logger.info('🔍 [TaskRepository] Making API call to:', url);
  
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
    logger.info(`🔍 [TaskRepository] Using timeout: ${timeoutMs}ms for endpoint: ${endpoint}`);
    
    controller = new AbortController();
    timeoutId = setTimeout(() => {
      logger.warn(`⏰ [TaskRepository] Request timeout after ${timeoutMs}ms for ${endpoint}`);
      controller.abort();
    }, timeoutMs);
    
    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    logger.info('🔍 [TaskRepository] Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        logger.info('❌ [TaskRepository] 401 Unauthorized - user not authenticated');
        const { handleAuthFailure } = useAuthStore.getState();
        handleAuthFailure('Session expired. Please log in again.');
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    logger.info('✅ [TaskRepository] API call successful');
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
      logger.error(`⏰ [TaskRepository] Request timeout for ${url}:`, timeoutError);
      throw timeoutError;
    }
    
    logger.error(`❌ [TaskRepository] API call failed for ${url}:`, error);
    throw error;
  }
};

class TaskRepository {
  constructor() {
    this.baseURL = TASK_API_CONFIG.baseURL;
  }

  /**
   * Get current project ID (delegates to ProjectRepository)
   * @returns {Promise<string>} Current project ID
   */
  async getCurrentProjectId() {
    const { default: ProjectRepository } = await import('./ProjectRepository.jsx');
    const projectRepo = new ProjectRepository();
    return projectRepo.getCurrentProjectId();
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Create result
   */
  async createTask(taskData, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TASK_API_CONFIG.endpoints.tasks.projectCreate(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  /**
   * Get all tasks for a project
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Tasks list
   */
  async getTasks(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TASK_API_CONFIG.endpoints.tasks.projectTasks(currentProjectId));
  }

  /**
   * Get a specific task
   * @param {string} taskId - Task ID
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Task data
   */
  async getTask(taskId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TASK_API_CONFIG.endpoints.tasks.projectGet(currentProjectId, taskId));
  }

  /**
   * Update a task
   * @param {string} taskId - Task ID
   * @param {Object} taskData - Updated task data
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Update result
   */
  async updateTask(taskId, taskData, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TASK_API_CONFIG.endpoints.tasks.projectUpdate(currentProjectId, taskId), {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  }

  /**
   * Delete a task
   * @param {string} taskId - Task ID
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Delete result
   */
  async deleteTask(taskId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TASK_API_CONFIG.endpoints.tasks.projectDelete(currentProjectId, taskId), {
      method: 'DELETE'
    });
  }

  /**
   * Execute a task
   * @param {string} taskId - Task ID
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Execution result
   */
  async executeTask(taskId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TASK_API_CONFIG.endpoints.tasks.projectExecute(currentProjectId, taskId), {
      method: 'POST'
    });
  }

  /**
   * Get task execution status
   * @param {string} taskId - Task ID
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Task status
   */
  async getTaskStatus(taskId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TASK_API_CONFIG.endpoints.tasks.projectStatus(currentProjectId, taskId));
  }

  /**
   * Analyze project
   * @param {string} projectPath - Project path
   * @param {Object} options - Analysis options
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeProject(projectPath, options = {}, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TASK_API_CONFIG.endpoints.tasks.analysis.project(currentProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, ...options })
    });
  }

  /**
   * Start auto mode
   * @param {string} projectId - Project ID (optional)
   * @param {Object} options - Auto mode options
   * @returns {Promise<Object>} Start result
   */
  async startAutoMode(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TASK_API_CONFIG.endpoints.tasks.autoMode.start(currentProjectId), {
      method: 'POST',
      body: JSON.stringify({ ...options })
    });
  }

  /**
   * Stop auto mode
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Stop result
   */
  async stopAutoMode(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TASK_API_CONFIG.endpoints.tasks.autoMode.stop(currentProjectId), {
      method: 'POST'
    });
  }

  /**
   * Get auto mode status
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Auto mode status
   */
  async getAutoModeStatus(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TASK_API_CONFIG.endpoints.tasks.autoMode.status(currentProjectId));
  }

  /**
   * Start auto refactor
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Refactor result
   */
  async startAutoRefactor(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    // Get the current workspace path from the active IDE
    const { default: IDERepository } = await import('./IDERepository.jsx');
    const ideRepo = new IDERepository();
    
    const ideList = await ideRepo.getIDEs();
    if (!ideList.success || !ideList.data) {
      throw new Error('Failed to get IDE information');
    }
    
    const activeIDE = ideList.data.find(ide => ide.active);
    if (!activeIDE || !activeIDE.workspacePath) {
      throw new Error('No active IDE with workspace path found');
    }
    
    // Use the unified auto mode with refactor mode
    return apiCall(TASK_API_CONFIG.endpoints.tasks.autoMode.start(currentProjectId), {
      method: 'POST',
      body: JSON.stringify({ 
        mode: 'refactor',
        projectPath: activeIDE.workspacePath 
      })
    });
  }

  /**
   * Get manual tasks
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Manual tasks
   */
  async getManualTasks(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/tasks`, {}, currentProjectId);
  }

  /**
   * Get manual task details
   * @param {string} taskId - Task ID
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Task details
   */
  async getManualTaskDetails(taskId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return await apiCall(`/api/projects/${currentProjectId}/tasks/${taskId}`, {}, currentProjectId);
  }

  /**
   * Sync manual tasks
   * @returns {Promise<Object>} Sync result
   */
  async syncManualTasks() {
    const projectId = await this.getCurrentProjectId();
    return await apiCall(`/api/projects/${projectId}/tasks/sync-manual`, {
      method: 'POST'
    });
  }

  /**
   * Sync task statuses
   * @param {string} projectId - Project ID (optional)
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async syncTaskStatuses(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return await apiCall(TASK_API_CONFIG.endpoints.tasks.syncStatus(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  /**
   * Validate task statuses
   * @param {string} projectId - Project ID (optional)
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateTaskStatuses(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return await apiCall(TASK_API_CONFIG.endpoints.tasks.validateStatus(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  /**
   * Rollback task statuses
   * @param {string} projectId - Project ID (optional)
   * @param {Object} options - Rollback options
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackTaskStatuses(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return await apiCall(TASK_API_CONFIG.endpoints.tasks.rollbackStatus(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  /**
   * Clean manual tasks
   * @returns {Promise<Object>} Clean result
   */
  async cleanManualTasks() {
    const projectId = await this.getCurrentProjectId();
    return await apiCall(`/api/projects/${projectId}/tasks/clean-manual`, {
      method: 'POST'
    });
  }
}

export default TaskRepository;
