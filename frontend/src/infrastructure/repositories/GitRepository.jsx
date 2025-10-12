/**
 * GitRepository - Frontend repository for git operations
 * Handles all git-related API calls with proper error handling and caching
 */

import { logger } from "@/infrastructure/logging/Logger";
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import { cacheService } from '@/infrastructure/services/CacheService';
import TimeoutConfig from '@/config/timeout-config.js';

// Git API Configuration
const GIT_API_CONFIG = {
  baseURL: import.meta.env.VITE_BACKEND_URL,
  endpoints: {
    git: {
      status: (projectId) => `/api/projects/${projectId}/git/status`,
      branches: (projectId) => `/api/projects/${projectId}/git/branches`,
      validate: (projectId) => `/api/projects/${projectId}/git/validate`,
      compare: (projectId) => `/api/projects/${projectId}/git/compare`,
      pull: (projectId) => `/api/projects/${projectId}/git/pull`,
      checkout: (projectId) => `/api/projects/${projectId}/git/checkout`,
      merge: (projectId) => `/api/projects/${projectId}/git/merge`,
      createBranch: (projectId) => `/api/projects/${projectId}/git/create-branch`,
      info: (projectId) => `/api/projects/${projectId}/git/info`,
      // Pidea-Agent specific endpoints
      pullPideaAgent: (projectId) => `/api/projects/${projectId}/git/pull-pidea-agent`,
      mergeToPideaAgent: (projectId) => `/api/projects/${projectId}/git/merge-to-pidea-agent`,
      pideaAgentStatus: (projectId) => `/api/projects/${projectId}/git/pidea-agent-status`,
      comparePideaAgent: (projectId) => `/api/projects/${projectId}/git/compare-pidea-agent`
    }
  }
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}, projectId = null) => {
  const url = typeof endpoint === 'function' ? endpoint() : endpoint;
  
  logger.info('🔍 [GitRepository] Making API call to:', url);
  
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
    logger.info(`🔍 [GitRepository] Using timeout: ${timeoutMs}ms for endpoint: ${endpoint}`);
    
    controller = new AbortController();
    timeoutId = setTimeout(() => {
      logger.warn(`⏰ [GitRepository] Request timeout after ${timeoutMs}ms for ${endpoint}`);
      controller.abort();
    }, timeoutMs);
    
    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    logger.info('🔍 [GitRepository] Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        logger.info('❌ [GitRepository] 401 Unauthorized - user not authenticated');
        const { handleAuthFailure } = useAuthStore.getState();
        handleAuthFailure('Session expired. Please log in again.');
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    logger.info('✅ [GitRepository] API call successful');
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
      logger.error(`⏰ [GitRepository] Request timeout for ${url}:`, timeoutError);
      throw timeoutError;
    }
    
    logger.error(`❌ [GitRepository] API call failed for ${url}:`, error);
    throw error;
  }
};

class GitRepository {
  constructor() {
    this.baseURL = GIT_API_CONFIG.baseURL;
    this.cacheService = cacheService;
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
   * Get project path (delegates to ProjectRepository)
   * @param {string} projectId - Project ID
   * @returns {Promise<string>} Project path
   */
  async getProjectPath(projectId) {
    const { default: ProjectRepository } = await import('./ProjectRepository.jsx');
    const projectRepo = new ProjectRepository();
    return projectRepo.getProjectPath(projectId);
  }

  /**
   * Get git status with caching
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @returns {Promise<Object>} Git status
   */
  async getGitStatus(projectId = null, projectPath = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const currentProjectPath = projectPath || await this.getProjectPath(currentProjectId);
    
    // Use CacheService for git status instead of direct API call
    return this.cacheService.getGitData(currentProjectPath, currentProjectId);
  }

  /**
   * Get git branches
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @returns {Promise<Object>} Git branches
   */
  async getGitBranches(projectId = null, projectPath = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const currentProjectPath = projectPath || await this.getProjectPath(currentProjectId);
    
    return apiCall(`/api/projects/${currentProjectId}/git/branches`, {
      method: 'POST',
      body: JSON.stringify({ projectPath: currentProjectPath })
    }, currentProjectId);
  }

  /**
   * Get git info
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @returns {Promise<Object>} Git info
   */
  async getGitInfo(projectId = null, projectPath = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const currentProjectPath = projectPath || await this.getProjectPath(currentProjectId);
    
    return apiCall(`/api/projects/${currentProjectId}/git/info`, {
      method: 'POST',
      body: JSON.stringify({ projectPath: currentProjectPath })
    }, currentProjectId);
  }

  /**
   * Perform git operation
   * @param {string} projectId - Project ID
   * @param {string} projectPath - Project path
   * @param {string} operation - Git operation
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} Operation result
   */
  async performGitOperation(projectId, projectPath, operation, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const currentProjectPath = projectPath || await this.getProjectPath(currentProjectId);
    
    return apiCall(`/api/projects/${currentProjectId}/git/${operation}`, {
      method: 'POST',
      body: JSON.stringify({ projectPath: currentProjectPath, ...options })
    }, currentProjectId);
  }

  /**
   * Compare branches
   * @param {string} projectId - Project ID
   * @param {string} projectPath - Project path
   * @param {string} sourceBranch - Source branch
   * @param {string} targetBranch - Target branch
   * @returns {Promise<Object>} Comparison result
   */
  async compareBranches(projectId, projectPath, sourceBranch, targetBranch) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const currentProjectPath = projectPath || await this.getProjectPath(currentProjectId);
    
    return apiCall(`/api/projects/${currentProjectId}/git/compare`, {
      method: 'POST',
      body: JSON.stringify({ 
        projectPath: currentProjectPath, 
        sourceBranch, 
        targetBranch 
      })
    }, currentProjectId);
  }

  /**
   * Validate git changes
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @returns {Promise<Object>} Validation result
   */
  async validateGitChanges(projectId = null, projectPath = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(GIT_API_CONFIG.endpoints.git.validate(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath })
    });
  }

  /**
   * Compare git branches
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @param {string} sourceBranch - Source branch (optional)
   * @param {string} targetBranch - Target branch (default: main)
   * @returns {Promise<Object>} Comparison result
   */
  async compareGitBranches(projectId = null, projectPath = null, sourceBranch = null, targetBranch = 'main') {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(GIT_API_CONFIG.endpoints.git.compare(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, sourceBranch, targetBranch })
    });
  }

  /**
   * Pull git changes
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @param {string} branch - Branch (default: main)
   * @param {string} remote - Remote (default: origin)
   * @returns {Promise<Object>} Pull result
   */
  async pullGitChanges(projectId = null, projectPath = null, branch = 'main', remote = 'origin') {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(GIT_API_CONFIG.endpoints.git.pull(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, branch, remote })
    });
  }

  /**
   * Checkout git branch
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @param {string} branch - Branch (optional)
   * @returns {Promise<Object>} Checkout result
   */
  async checkoutGitBranch(projectId = null, projectPath = null, branch = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(GIT_API_CONFIG.endpoints.git.checkout(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, branch })
    });
  }

  /**
   * Merge git branches
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @param {string} sourceBranch - Source branch (optional)
   * @param {string} targetBranch - Target branch (default: main)
   * @returns {Promise<Object>} Merge result
   */
  async mergeGitBranches(projectId = null, projectPath = null, sourceBranch = null, targetBranch = 'main') {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(GIT_API_CONFIG.endpoints.git.merge(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, sourceBranch, targetBranch })
    });
  }

  /**
   * Create git branch
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @param {string} branchName - Branch name (optional)
   * @param {string} startPoint - Start point (default: main)
   * @returns {Promise<Object>} Create branch result
   */
  async createGitBranch(projectId = null, projectPath = null, branchName = null, startPoint = 'main') {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(GIT_API_CONFIG.endpoints.git.createBranch(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, branchName, startPoint })
    });
  }

  /**
   * Get git repository info
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @returns {Promise<Object>} Repository info
   */
  async getGitRepositoryInfo(projectId = null, projectPath = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(GIT_API_CONFIG.endpoints.git.info(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath })
    });
  }

  // ============================================================================
  // PIDEA-AGENT GIT MANAGEMENT METHODS
  // ============================================================================

  /**
   * Pull pidea-agent branch
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @param {Object} options - Pull options
   * @returns {Promise<Object>} Pull result
   */
  async pullPideaAgentBranch(projectId = null, projectPath = null, options = {}) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    const { remote = 'origin', force = false } = options;
    
    return apiCall(GIT_API_CONFIG.endpoints.git.pullPideaAgent(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, remote, force })
    });
  }

  /**
   * Merge to pidea-agent branch
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @param {string} sourceBranch - Source branch (optional)
   * @returns {Promise<Object>} Merge result
   */
  async mergeToPideaAgentBranch(projectId = null, projectPath = null, sourceBranch = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    
    if (!sourceBranch) {
      throw new Error('Source branch is required for merging to pidea-agent branch');
    }
    
    return apiCall(GIT_API_CONFIG.endpoints.git.mergeToPideaAgent(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, sourceBranch })
    });
  }

  /**
   * Get pidea-agent branch status
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @returns {Promise<Object>} Branch status
   */
  async getPideaAgentBranchStatus(projectId = null, projectPath = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    
    return apiCall(GIT_API_CONFIG.endpoints.git.pideaAgentStatus(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath })
    });
  }

  /**
   * Compare with pidea-agent branch
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @param {string} sourceBranch - Source branch (optional)
   * @returns {Promise<Object>} Comparison result
   */
  async compareWithPideaAgentBranch(projectId = null, projectPath = null, sourceBranch = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    
    if (!sourceBranch) {
      throw new Error('Source branch is required for comparison with pidea-agent branch');
    }
    
    return apiCall(GIT_API_CONFIG.endpoints.git.comparePideaAgent(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, sourceBranch })
    });
  }

  // ============================================================================
  // PIDEA-AGENT UTILITY METHODS
  // ============================================================================

  /**
   * Check if pidea-agent branch is available
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @returns {Promise<boolean>} Availability status
   */
  async isPideaAgentBranchAvailable(projectId = null, projectPath = null) {
    try {
      const status = await this.getPideaAgentBranchStatus(projectId, projectPath);
      return status.success && status.data?.pideaAgentExists;
    } catch (error) {
      logger.error('Failed to check pidea-agent branch availability:', error);
      return false;
    }
  }

  /**
   * Get current branch for pidea-agent operations
   * @param {string} projectId - Project ID (optional)
   * @param {string} projectPath - Project path (optional)
   * @returns {Promise<string|null>} Current branch
   */
  async getCurrentBranchForPideaAgent(projectId = null, projectPath = null) {
    try {
      const status = await this.getPideaAgentBranchStatus(projectId, projectPath);
      if (status.success && status.data) {
        return status.data.currentBranch;
      }
      return null;
    } catch (error) {
      logger.error('Failed to get current branch for pidea-agent operations:', error);
      return null;
    }
  }
}

export default GitRepository;
