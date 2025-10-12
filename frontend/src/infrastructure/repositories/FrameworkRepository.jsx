/**
 * FrameworkRepository - Frontend repository for framework management operations
 * Handles all framework-related API calls with proper error handling
 */

import { logger } from "@/infrastructure/logging/Logger";
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import TimeoutConfig from '@/config/timeout-config.js';

// Framework API Configuration
const FRAMEWORK_API_CONFIG = {
  baseURL: import.meta.env.VITE_BACKEND_URL,
  endpoints: {
    frameworks: {
      list: '/api/frameworks',
      prompts: (frameworkId) => `/api/frameworks/${frameworkId}/prompts`,
      promptFile: (frameworkId, filename) => `/api/frameworks/${frameworkId}/prompts/${filename}`,
      templates: (frameworkId) => `/api/frameworks/${frameworkId}/templates`,
      templateFile: (frameworkId, filename) => `/api/frameworks/${frameworkId}/templates/${filename}`
    },
    framework: {
      structure: '/api/framework/structure',
      search: '/api/framework/search',
      stats: '/api/framework/stats'
    },
    prompts: {
      list: '/api/prompts',
      byCategory: (category) => `/api/prompts/${category}`,
      file: (category, filename) => `/api/prompts/${category}/${filename}`
    },
    templates: {
      list: '/api/templates',
      byCategory: (category) => `/api/templates/${category}`,
      file: (category, filename) => `/api/templates/${category}/${filename}`
    }
  }
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}, projectId = null) => {
  const url = typeof endpoint === 'function' ? endpoint() : endpoint;
  
  logger.info('🔍 [FrameworkRepository] Making API call to:', url);
  
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
    logger.info(`🔍 [FrameworkRepository] Using timeout: ${timeoutMs}ms for endpoint: ${endpoint}`);
    
    controller = new AbortController();
    timeoutId = setTimeout(() => {
      logger.warn(`⏰ [FrameworkRepository] Request timeout after ${timeoutMs}ms for ${endpoint}`);
      controller.abort();
    }, timeoutMs);
    
    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    logger.info('🔍 [FrameworkRepository] Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        logger.info('❌ [FrameworkRepository] 401 Unauthorized - user not authenticated');
        const { handleAuthFailure } = useAuthStore.getState();
        handleAuthFailure('Session expired. Please log in again.');
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    logger.info('✅ [FrameworkRepository] API call successful');
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
      logger.error(`⏰ [FrameworkRepository] Request timeout for ${url}:`, timeoutError);
      throw timeoutError;
    }
    
    logger.error(`❌ [FrameworkRepository] API call failed for ${url}:`, error);
    throw error;
  }
};

class FrameworkRepository {
  constructor() {
    this.baseURL = FRAMEWORK_API_CONFIG.baseURL;
  }

  /**
   * Get framework structure
   * @returns {Promise<Object>} Framework structure
   */
  async getFrameworkStructure() {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.framework.structure);
  }

  /**
   * Get framework template
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Framework template
   */
  async getFrameworkTemplate(templateId) {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.framework.template(templateId));
  }

  /**
   * Get framework prompt
   * @param {string} promptId - Prompt ID
   * @returns {Promise<Object>} Framework prompt
   */
  async getFrameworkPrompt(promptId) {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.framework.prompt(promptId));
  }

  /**
   * Search frameworks
   * @param {string} query - Search query
   * @returns {Promise<Object>} Search results
   */
  async searchFrameworks(query) {
    return apiCall(`${FRAMEWORK_API_CONFIG.endpoints.framework.search}?query=${encodeURIComponent(query)}`);
  }

  /**
   * Get framework stats
   * @returns {Promise<Object>} Framework statistics
   */
  async getFrameworkStats() {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.framework.stats);
  }

  /**
   * Get all frameworks
   * @returns {Promise<Object>} Frameworks list
   */
  async getFrameworks() {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.frameworks.list);
  }

  /**
   * Get framework prompts
   * @param {string} frameworkId - Framework ID
   * @returns {Promise<Object>} Framework prompts
   */
  async getFrameworkPrompts(frameworkId) {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.frameworks.prompts(frameworkId));
  }

  /**
   * Get framework prompt file
   * @param {string} frameworkId - Framework ID
   * @param {string} filename - File name
   * @returns {Promise<Object>} Prompt file content
   */
  async getFrameworkPromptFile(frameworkId, filename) {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.frameworks.promptFile(frameworkId, filename));
  }

  /**
   * Get framework templates
   * @param {string} frameworkId - Framework ID
   * @returns {Promise<Object>} Framework templates
   */
  async getFrameworkTemplates(frameworkId) {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.frameworks.templates(frameworkId));
  }

  /**
   * Get framework template file
   * @param {string} frameworkId - Framework ID
   * @param {string} filename - File name
   * @returns {Promise<Object>} Template file content
   */
  async getFrameworkTemplateFile(frameworkId, filename) {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.frameworks.templateFile(frameworkId, filename));
  }

  /**
   * Get all prompts
   * @returns {Promise<Object>} Prompts list
   */
  async getPrompts() {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.prompts.list);
  }

  /**
   * Get prompts by category
   * @param {string} category - Category name
   * @returns {Promise<Object>} Category prompts
   */
  async getPromptsByCategory(category) {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.prompts.byCategory(category));
  }

  /**
   * Get prompt file
   * @param {string} category - Category name
   * @param {string} filename - File name
   * @returns {Promise<Object>} Prompt file content
   */
  async getPromptFile(category, filename) {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.prompts.file(category, filename));
  }

  /**
   * Get all templates
   * @returns {Promise<Object>} Templates list
   */
  async getTemplates() {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.templates.list);
  }

  /**
   * Get templates by category
   * @param {string} category - Category name
   * @returns {Promise<Object>} Category templates
   */
  async getTemplatesByCategory(category) {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.templates.byCategory(category));
  }

  /**
   * Get template file
   * @param {string} category - Category name
   * @param {string} filename - File name
   * @returns {Promise<Object>} Template file content
   */
  async getTemplateFile(category, filename) {
    return apiCall(FRAMEWORK_API_CONFIG.endpoints.templates.file(category, filename));
  }
}

export default FrameworkRepository;
