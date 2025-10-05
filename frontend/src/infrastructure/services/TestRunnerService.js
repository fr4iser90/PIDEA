/**
 * TestRunnerService - Frontend API service for test runner functionality
 * 
 * Provides API communication layer for test runner operations
 * following existing infrastructure service patterns.
 */
class TestRunnerService {
  constructor() {
    this.baseURL = '/api';
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Execute Playwright tests
   * @param {string} projectId - Project identifier
   * @param {Object} options - Test execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeTests(projectId, options = {}) {
    try {
      const response = await this.makeRequest(
        `POST`,
        `${this.baseURL}/projects/${projectId}/tests/playwright/execute`,
        options
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to execute tests: ${error.message}`);
    }
  }

  /**
   * Get test results by ID
   * @param {string} testId - Test execution ID
   * @returns {Promise<Object>} Test results
   */
  async getTestResults(testId) {
    try {
      const response = await this.makeRequest(
        `GET`,
        `${this.baseURL}/projects/${testId}/tests/playwright/results/${testId}`
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to get test results: ${error.message}`);
    }
  }

  /**
   * Get all test results
   * @returns {Promise<Object>} All test results
   */
  async getAllTestResults() {
    try {
      const response = await this.makeRequest(
        `GET`,
        `${this.baseURL}/projects/all/tests/playwright/results`
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to get all test results: ${error.message}`);
    }
  }

  /**
   * Get test configuration
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Test configuration
   */
  async getTestConfig(projectId) {
    try {
      const response = await this.makeRequest(
        `GET`,
        `${this.baseURL}/projects/${projectId}/tests/playwright/config`
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to get test configuration: ${error.message}`);
    }
  }

  /**
   * Update test configuration
   * @param {string} projectId - Project identifier
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Update result
   */
  async updateTestConfig(projectId, config) {
    try {
      const response = await this.makeRequest(
        `PUT`,
        `${this.baseURL}/projects/${projectId}/tests/playwright/config`,
        { config }
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to update test configuration: ${error.message}`);
    }
  }

  /**
   * Validate test configuration
   * @param {Object} config - Test configuration to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateTestConfig(config) {
    try {
      const response = await this.makeRequest(
        `POST`,
        `${this.baseURL}/projects/validate/tests/playwright/config/validate`,
        { config }
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to validate test configuration: ${error.message}`);
    }
  }

  /**
   * Get test projects
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Test projects
   */
  async getTestProjects(projectId) {
    try {
      const response = await this.makeRequest(
        `GET`,
        `${this.baseURL}/projects/${projectId}/tests/playwright/projects`
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to get test projects: ${error.message}`);
    }
  }

  /**
   * Create test project
   * @param {string} projectId - Project identifier
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Creation result
   */
  async createTestProject(projectId, projectData) {
    try {
      const response = await this.makeRequest(
        `POST`,
        `${this.baseURL}/projects/${projectId}/tests/playwright/projects`,
        projectData
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to create test project: ${error.message}`);
    }
  }

  /**
   * Get project-specific configuration
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Project configuration
   */
  async getProjectConfig(projectId) {
    try {
      const response = await this.makeRequest(
        `GET`,
        `${this.baseURL}/projects/${projectId}/tests/playwright/projects/${projectId}/config`
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to get project configuration: ${error.message}`);
    }
  }

  /**
   * Update project-specific configuration
   * @param {string} projectId - Project identifier
   * @param {Object} config - Configuration
   * @returns {Promise<Object>} Update result
   */
  async updateProjectConfig(projectId, config) {
    try {
      const response = await this.makeRequest(
        `PUT`,
        `${this.baseURL}/projects/${projectId}/tests/playwright/projects/${projectId}/config`,
        { config }
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to update project configuration: ${error.message}`);
    }
  }

  /**
   * Validate login credentials
   * @param {string} projectId - Project identifier
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} Validation result
   */
  async validateLoginCredentials(projectId, credentials) {
    try {
      const response = await this.makeRequest(
        `POST`,
        `${this.baseURL}/projects/${projectId}/tests/playwright/login/validate`,
        { credentials }
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to validate login credentials: ${error.message}`);
    }
  }

  /**
   * Get test runner status
   * @returns {Promise<Object>} Status information
   */
  async getTestRunnerStatus() {
    try {
      const response = await this.makeRequest(
        `GET`,
        `${this.baseURL}/projects/status/tests/playwright/status`
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to get test runner status: ${error.message}`);
    }
  }

  /**
   * Stop running tests
   * @param {string} testId - Optional test ID to stop specific test
   * @returns {Promise<Object>} Stop result
   */
  async stopTests(testId = null) {
    try {
      const response = await this.makeRequest(
        `POST`,
        `${this.baseURL}/projects/stop/tests/playwright/stop`,
        { testId }
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to stop tests: ${error.message}`);
    }
  }

  /**
   * Get test execution logs
   * @param {string} testId - Test ID
   * @param {number} lines - Number of log lines to retrieve
   * @returns {Promise<Object>} Log data
   */
  async getTestLogs(testId, lines = 100) {
    try {
      const response = await this.makeRequest(
        `GET`,
        `${this.baseURL}/projects/${testId}/tests/playwright/logs?testId=${testId}&lines=${lines}`
      );

      return this.handleResponse(response);
    } catch (error) {
      throw new Error(`Failed to get test logs: ${error.message}`);
    }
  }

  /**
   * Make HTTP request with timeout and error handling
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} data - Request data
   * @returns {Promise<Response>} Fetch response
   */
  async makeRequest(method, url, data = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Handle API response
   * @param {Response} response - Fetch response
   * @returns {Promise<Object>} Parsed response data
   */
  async handleResponse(response) {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Use default error message if JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    try {
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Request failed');
      }
      
      return data.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to parse response');
    }
  }

  /**
   * Set request timeout
   * @param {number} timeout - Timeout in milliseconds
   */
  setTimeout(timeout) {
    this.timeout = timeout;
  }

  /**
   * Set base URL
   * @param {string} baseURL - Base URL for API requests
   */
  setBaseURL(baseURL) {
    this.baseURL = baseURL;
  }
}

// Create singleton instance
const testRunnerService = new TestRunnerService();

export default testRunnerService;
