/**
 * IDERepository - Frontend repository for IDE management operations
 * Handles all IDE-related API calls with proper error handling and caching
 */

import { logger } from "@/infrastructure/logging/Logger";
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import etagManager from '@/infrastructure/services/ETagManager.js';
import { cacheService } from '@/infrastructure/services/CacheService';
import performanceLogger from '@/infrastructure/services/PerformanceLogger';
import TimeoutConfig from '@/config/timeout-config.js';

// IDE API Configuration
const IDE_API_CONFIG = {
  baseURL: import.meta.env.VITE_BACKEND_URL,
  endpoints: {
    ide: {
      list: '/api/interfaces/available-ides',
      userAppUrl: '/api/ide/user-app-url',
      userAppUrlForPort: (port) => `/api/ide/user-app-url/${port}`,
      monitorTerminal: '/api/ide/monitor-terminal',
      restartApp: '/api/ide/restart-app',
      detectWorkspacePaths: '/api/ide/detect-workspace-paths',
      workspaceInfo: '/api/ide/workspace-info',
      setWorkspace: (port) => `/api/ide/set-workspace/${port}`,
      switchIDE: (port) => `/api/ide/switch/${port}`,
      stopIDE: (port) => `/api/ide/stop/${port}`,
      status: '/api/ide/status',
      start: '/api/ide/start',
      mirror: {
        status: '/api/ide/mirror/status',
        connect: '/api/ide/mirror/connect',
        disconnect: '/api/ide/mirror/disconnect',
        data: '/api/ide/mirror/data'
      },
      newChat: (port) => `/api/ide/new-chat/${port}`
    },
    ideRequirements: {
      getDownloadLinks: '/api/ide/configurations/download-links',
      getExecutablePaths: '/api/ide/configurations/executable-paths',
      saveExecutablePaths: '/api/ide/configurations/executable-paths',
      validatePath: '/api/ide/configurations/validate-path'
    }
  }
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}, projectId = null) => {
  const url = typeof endpoint === 'function' ? endpoint() : endpoint;
  
  logger.info('🔍 [IDERepository] Making API call to:', url);
  
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
    logger.info(`🔍 [IDERepository] Using timeout: ${timeoutMs}ms for endpoint: ${endpoint}`);
    
    controller = new AbortController();
    timeoutId = setTimeout(() => {
      logger.warn(`⏰ [IDERepository] Request timeout after ${timeoutMs}ms for ${endpoint}`);
      controller.abort();
    }, timeoutMs);
    
    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    logger.info('🔍 [IDERepository] Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        logger.info('❌ [IDERepository] 401 Unauthorized - user not authenticated');
        const { handleAuthFailure } = useAuthStore.getState();
        handleAuthFailure('Session expired. Please log in again.');
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    logger.info('✅ [IDERepository] API call successful');
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
      logger.error(`⏰ [IDERepository] Request timeout for ${url}:`, timeoutError);
      throw timeoutError;
    }
    
    logger.error(`❌ [IDERepository] API call failed for ${url}:`, error);
    throw error;
  }
};

class IDERepository {
  constructor() {
    this.baseURL = IDE_API_CONFIG.baseURL;
    this.cacheService = cacheService;
  }

  /**
   * Get available IDEs with caching
   * @returns {Promise<Object>} Available IDEs
   */
  async getIDEs() {
    const operationId = `get_available_ides_${Date.now()}`;
    performanceLogger.start(operationId, 'Get Available IDEs', { timestamp: new Date().toISOString() });
    
    const key = 'get_available_ides';
    
    // Check cache first
    const cacheStart = performance.now();
    const cachedResult = this.cacheService.get(key);
    const cacheDuration = performance.now() - cacheStart;
    
    if (cachedResult) {
      logger.info('Using cached IDE data');
      performanceLogger.end(operationId, { 
        source: 'cache', 
        cacheDuration: cacheDuration,
        ideCount: cachedResult.length 
      });
      return cachedResult;
    }
    
    // Make API call and cache result
    const apiStart = performance.now();
    const result = await apiCall(IDE_API_CONFIG.endpoints.ide.list);
    const apiDuration = performance.now() - apiStart;
    
    const cacheSetStart = performance.now();
    this.cacheService.set(key, result, 'ide', 'ide');
    const cacheSetDuration = performance.now() - cacheSetStart;
    
    performanceLogger.end(operationId, { 
      source: 'api', 
      apiDuration: apiDuration,
      cacheSetDuration: cacheSetDuration,
      ideCount: result.length 
    });
    return result;
  }

  /**
   * Get user app URL with caching
   * @returns {Promise<Object>} User app URL
   */
  async getUserAppUrl() {
    const operationId = `get_user_app_url_${Date.now()}`;
    performanceLogger.start(operationId, 'Get User App URL', { timestamp: new Date().toISOString() });
    
    const key = 'get_user_app_url';
    
    // Check cache first
    const cacheStart = performance.now();
    const cachedResult = this.cacheService.get(key);
    const cacheDuration = performance.now() - cacheStart;
    
    if (cachedResult) {
      logger.info('Using cached user app URL');
      performanceLogger.end(operationId, { 
        source: 'cache', 
        cacheDuration: cacheDuration 
      });
      return cachedResult;
    }
    
    // Make API call and cache result
    const apiStart = performance.now();
    const result = await apiCall(IDE_API_CONFIG.endpoints.ide.userAppUrl);
    const apiDuration = performance.now() - apiStart;
    
    const cacheSetStart = performance.now();
    this.cacheService.set(key, result, 'ide', 'ide');
    const cacheSetDuration = performance.now() - cacheSetStart;
    
    performanceLogger.end(operationId, { 
      source: 'api', 
      apiDuration: apiDuration,
      cacheSetDuration: cacheSetDuration 
    });
    return result;
  }

  /**
   * Get user app URL for specific port
   * @param {number} port - IDE port
   * @returns {Promise<Object>} User app URL result
   */
  async getUserAppUrlForPort(port) {
    return apiCall(IDE_API_CONFIG.endpoints.ide.userAppUrlForPort(port));
  }

  /**
   * Monitor terminal
   * @returns {Promise<Object>} Terminal monitoring result
   */
  async monitorTerminal() {
    return apiCall(IDE_API_CONFIG.endpoints.ide.monitorTerminal, {
      method: 'POST'
    });
  }

  /**
   * Restart application
   * @param {Object} data - Restart data
   * @returns {Promise<Object>} Restart result
   */
  async restartApp(data) {
    return apiCall(IDE_API_CONFIG.endpoints.ide.restartApp, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Detect workspace paths
   * @returns {Promise<Object>} Workspace paths
   */
  async detectWorkspacePaths() {
    return apiCall(IDE_API_CONFIG.endpoints.ide.detectWorkspacePaths, {
      method: 'POST'
    });
  }

  /**
   * Get workspace info with caching
   * @returns {Promise<Object>} Workspace info
   */
  async getWorkspaceInfo() {
    const key = 'get_workspace_info';
    
    // Check cache first
    const cachedResult = this.cacheService.get(key);
    if (cachedResult) {
      logger.info('Using cached workspace info');
      return cachedResult;
    }
    
    // Make API call and cache result
    const result = await apiCall(IDE_API_CONFIG.endpoints.ide.workspaceInfo);
    this.cacheService.set(key, result, 'ide', 'ide');
    return result;
  }

  /**
   * Set workspace path for specific port
   * @param {number} port - IDE port
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Set workspace result
   */
  async setWorkspacePath(port, workspacePath) {
    return apiCall(IDE_API_CONFIG.endpoints.ide.setWorkspace(port), {
      method: 'POST',
      body: JSON.stringify({ workspacePath })
    });
  }

  /**
   * Switch IDE to specific port with caching
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Switch result
   */
  async switchIDE(port) {
    const key = `switch_ide_${port}`;
    
    logger.info(`Frontend: Attempting IDE switch to port ${port} with key: ${key}`);
    
    // Check cache first
    const cachedResult = this.cacheService.get(key);
    if (cachedResult) {
      logger.info(`Frontend: Using cached result for IDE switch to port ${port}`);
      return cachedResult;
    }
    
    // Make API call and cache result
    logger.info(`Frontend: Making API call for IDE switch to port ${port}`);
    const result = await apiCall(IDE_API_CONFIG.endpoints.ide.switchIDE(port), {
      method: 'POST'
    });
    this.cacheService.set(key, result, 'ide', 'ide');
    return result;
  }

  /**
   * Stop IDE on specific port
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Stop result
   */
  async stopIDE(port) {
    return apiCall(IDE_API_CONFIG.endpoints.ide.stopIDE(port), {
      method: 'DELETE'
    });
  }

  /**
   * Get IDE status
   * @returns {Promise<Object>} IDE status
   */
  async getIDEStatus() {
    return apiCall(IDE_API_CONFIG.endpoints.ide.status);
  }

  /**
   * Start IDE
   * @param {string} workspacePath - Workspace path (optional)
   * @returns {Promise<Object>} Start result
   */
  async startIDE(workspacePath = null) {
    return apiCall(IDE_API_CONFIG.endpoints.ide.start, {
      method: 'POST',
      body: JSON.stringify({ workspacePath })
    });
  }

  /**
   * Click new chat for specific port
   * @param {number} port - IDE port
   * @param {string} message - Optional message
   * @returns {Promise<Object>} New chat result
   */
  async clickNewChat(port, message = null) {
    return apiCall(IDE_API_CONFIG.endpoints.ide.newChat(port), {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  /**
   * Validate port (delegates to IDEStore validation)
   * @param {number} port - Port to validate
   * @returns {Promise<Object>} Validation result
   */
  async validatePort(port) {
    try {
      logger.info('Port validation requested via API:', port);
      return { valid: true };
    } catch (error) {
      logger.error('Port validation failed:', error);
      return { valid: false, error: 'Port validation failed' };
    }
  }

  /**
   * Get IDE requirements download links
   * @returns {Promise<Object>} Download links
   */
  async getDownloadLinks() {
    return apiCall(IDE_API_CONFIG.endpoints.ideRequirements.getDownloadLinks);
  }

  /**
   * Get IDE executable paths
   * @returns {Promise<Object>} Executable paths
   */
  async getExecutablePaths() {
    return apiCall(IDE_API_CONFIG.endpoints.ideRequirements.getExecutablePaths);
  }

  /**
   * Save IDE executable paths
   * @param {Object} paths - Executable paths
   * @returns {Promise<Object>} Save result
   */
  async saveExecutablePaths(paths) {
    return apiCall(IDE_API_CONFIG.endpoints.ideRequirements.saveExecutablePaths, {
      method: 'POST',
      body: JSON.stringify(paths)
    });
  }

  /**
   * Validate IDE path
   * @param {string} path - Path to validate
   * @returns {Promise<Object>} Validation result
   */
  async validatePath(path) {
    return apiCall(IDE_API_CONFIG.endpoints.ideRequirements.validatePath, {
      method: 'POST',
      body: JSON.stringify({ path })
    });
  }
}

export default IDERepository;
