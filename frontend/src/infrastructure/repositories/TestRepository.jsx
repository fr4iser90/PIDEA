/**
 * TestRepository - Frontend repository for Playwright test operations
 * Handles all test-related API calls with proper error handling
 */

import { logger } from "@/infrastructure/logging/Logger";
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import TimeoutConfig from '@/config/timeout-config.js';

// Test API Configuration
const TEST_API_CONFIG = {
  baseURL: import.meta.env.VITE_BACKEND_URL,
  endpoints: {
    projects: {
      tests: {
        playwright: {
          config: (projectId) => `/api/projects/${projectId}/tests/playwright/config`,
          projects: (projectId) => `/api/projects/${projectId}/tests/playwright/projects`,
          execute: (projectId) => `/api/projects/${projectId}/tests/playwright/execute`,
          stop: (projectId) => `/api/projects/${projectId}/tests/playwright/stop`,
          create: (projectId) => `/api/projects/${projectId}/tests/playwright/projects`,
          results: (projectId) => `/api/projects/${projectId}/tests/playwright/results`,
          resultById: (projectId, testId) => `/api/projects/${projectId}/tests/playwright/results/${testId}`,
          history: (projectId) => `/api/projects/${projectId}/tests/playwright/history`
        },
        browserEnvironment: '/api/tests/browser-environment'
      }
    }
  }
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}, projectId = null) => {
  const url = typeof endpoint === 'function' ? endpoint() : endpoint;
  
  logger.info('🔍 [TestRepository] Making API call to:', url);
  
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
    logger.info(`🔍 [TestRepository] Using timeout: ${timeoutMs}ms for endpoint: ${endpoint}`);
    
    controller = new AbortController();
    timeoutId = setTimeout(() => {
      logger.warn(`⏰ [TestRepository] Request timeout after ${timeoutMs}ms for ${endpoint}`);
      controller.abort();
    }, timeoutMs);
    
    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    logger.info('🔍 [TestRepository] Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        logger.info('❌ [TestRepository] 401 Unauthorized - user not authenticated');
        const { handleAuthFailure } = useAuthStore.getState();
        handleAuthFailure('Session expired. Please log in again.');
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    logger.info('✅ [TestRepository] API call successful');
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
      logger.error(`⏰ [TestRepository] Request timeout for ${url}:`, timeoutError);
      throw timeoutError;
    }
    
    logger.error(`❌ [TestRepository] API call failed for ${url}:`, error);
    throw error;
  }
};

class TestRepository {
  constructor() {
    this.baseURL = TEST_API_CONFIG.baseURL;
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
   * Get Playwright test configuration for a project
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Test configuration
   */
  async getPlaywrightTestConfig(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TEST_API_CONFIG.endpoints.projects.tests.playwright.config(currentProjectId), {}, currentProjectId);
  }

  /**
   * Update Playwright test configuration for a project
   * @param {string} projectId - Project ID (optional)
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Update result
   */
  async updatePlaywrightTestConfig(projectId = null, config) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TEST_API_CONFIG.endpoints.projects.tests.playwright.config(currentProjectId), {
      method: 'PUT',
      body: JSON.stringify({ config })
    }, currentProjectId);
  }

  /**
   * Get Playwright test projects for a project
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Test projects
   */
  async getPlaywrightTestProjects(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TEST_API_CONFIG.endpoints.projects.tests.playwright.projects(currentProjectId), {}, currentProjectId);
  }

  /**
   * Execute Playwright tests for a project
   * @param {string} projectId - Project ID (optional)
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executePlaywrightTests(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TEST_API_CONFIG.endpoints.projects.tests.playwright.execute(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  /**
   * Stop running Playwright tests for a project
   * @param {string} projectId - Project ID (optional)
   * @param {Object} options - Stop options
   * @returns {Promise<Object>} Stop result
   */
  async stopPlaywrightTests(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TEST_API_CONFIG.endpoints.projects.tests.playwright.stop(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  /**
   * Create a new Playwright test project
   * @param {string} projectId - Project ID (optional)
   * @param {Object} testData - Test project data
   * @returns {Promise<Object>} Creation result
   */
  async createPlaywrightTestProject(projectId = null, testData) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TEST_API_CONFIG.endpoints.projects.tests.playwright.create(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(testData)
    }, currentProjectId);
  }

  /**
   * Get Playwright test results for a project
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Test results
   */
  async getPlaywrightTestResults(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TEST_API_CONFIG.endpoints.projects.tests.playwright.results(currentProjectId), {}, currentProjectId);
  }

  /**
   * Get specific Playwright test result by ID
   * @param {string} projectId - Project ID (optional)
   * @param {string} testId - Test ID
   * @returns {Promise<Object>} Test result
   */
  async getPlaywrightTestResultById(projectId = null, testId) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TEST_API_CONFIG.endpoints.projects.tests.playwright.resultById(currentProjectId, testId), {}, currentProjectId);
  }

  /**
   * Get Playwright test history for a project
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Test history
   */
  async getPlaywrightTestHistory(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(TEST_API_CONFIG.endpoints.projects.tests.playwright.history(currentProjectId), {}, currentProjectId);
  }

  /**
   * Get browser environment information
   * @returns {Promise<Object>} Browser environment data
   */
  async getBrowserEnvironment() {
    return apiCall(TEST_API_CONFIG.endpoints.projects.tests.browserEnvironment);
  }
}

export default TestRepository;
