const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const request = require('supertest');
const express = require('express');
const TestManagementController = require('@controllers/TestManagementController');
const PlaywrightTestHandler = require('@handlers/categories/testing/PlaywrightTestHandler');

// Mock dependencies
jest.mock('@handlers/categories/testing/PlaywrightTestHandler');

describe('TestManagementController - Playwright Endpoints', () => {
  let app;
  let controller;
  let mockPlaywrightTestHandler;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock handler
    mockPlaywrightTestHandler = {
      handleExecuteTests: jest.fn(),
      handleGetTestResults: jest.fn(),
      handleGetAllTestResults: jest.fn(),
      handleStopTests: jest.fn(),
      handleGetTestRunnerStatus: jest.fn(),
      handleValidateLoginCredentials: jest.fn(),
      handleConfigurationCommand: jest.fn(),
      handleProjectCommand: jest.fn()
    };
    
    // Mock the handler constructor
    PlaywrightTestHandler.mockImplementation(() => mockPlaywrightTestHandler);
    
    // Create controller
    controller = new TestManagementController();
    
    // Create Express app for testing
    app = express();
    app.use(express.json());
    
    // Add routes
    app.post('/api/projects/:projectId/tests/playwright/execute', controller.executePlaywrightTests.bind(controller));
    app.get('/api/projects/:projectId/tests/playwright/results/:testId', controller.getPlaywrightTestResults.bind(controller));
    app.get('/api/projects/all/tests/playwright/results', controller.getAllPlaywrightTestResults.bind(controller));
    app.get('/api/projects/:projectId/tests/playwright/config', controller.getPlaywrightTestConfig.bind(controller));
    app.put('/api/projects/:projectId/tests/playwright/config', controller.updatePlaywrightTestConfig.bind(controller));
    app.post('/api/projects/validate/tests/playwright/config/validate', controller.validatePlaywrightTestConfig.bind(controller));
    app.get('/api/projects/:projectId/tests/playwright/projects', controller.getPlaywrightTestProjects.bind(controller));
    app.post('/api/projects/:projectId/tests/playwright/projects', controller.createPlaywrightTestProject.bind(controller));
    app.get('/api/projects/:projectId/tests/playwright/projects/:id/config', controller.getPlaywrightProjectConfig.bind(controller));
    app.put('/api/projects/:projectId/tests/playwright/projects/:id/config', controller.updatePlaywrightProjectConfig.bind(controller));
    app.post('/api/projects/:projectId/tests/playwright/login/validate', controller.validatePlaywrightLoginCredentials.bind(controller));
    app.get('/api/projects/status/tests/playwright/status', controller.getPlaywrightTestRunnerStatus.bind(controller));
    app.post('/api/projects/stop/tests/playwright/stop', controller.stopPlaywrightTests.bind(controller));
    app.get('/api/projects/:testId/tests/playwright/logs', controller.getPlaywrightTestLogs.bind(controller));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/projects/:projectId/tests/playwright/execute', () => {
    test('should execute Playwright tests successfully', async () => {
      const projectId = 'test-project';
      const requestBody = {
        testName: 'login.test.js',
        options: { timeout: 30000 }
      };
      const mockResult = {
        success: true,
        result: {
          projectId,
          testFiles: ['login.test.js'],
          duration: 1500
        }
      };

      mockPlaywrightTestHandler.handleExecuteTests.mockResolvedValue(mockResult);

      const response = await request(app)
        .post(`/api/projects/${projectId}/tests/playwright/execute`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(mockResult.result);
      expect(response.body.message).toBe('Playwright tests executed successfully');
      expect(mockPlaywrightTestHandler.handleExecuteTests).toHaveBeenCalledWith({
        projectId,
        testName: requestBody.testName,
        options: requestBody.options
      });
    });

    test('should handle missing project ID', async () => {
      const response = await request(app)
        .post('/api/projects//tests/playwright/execute')
        .send({ testName: 'login.test.js' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project ID is required');
    });

    test('should handle handler errors', async () => {
      const projectId = 'test-project';
      mockPlaywrightTestHandler.handleExecuteTests.mockRejectedValue(new Error('Handler error'));

      const response = await request(app)
        .post(`/api/projects/${projectId}/tests/playwright/execute`)
        .send({ testName: 'login.test.js' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Handler error');
    });
  });

  describe('GET /api/projects/:projectId/tests/playwright/results/:testId', () => {
    test('should get test results successfully', async () => {
      const projectId = 'test-project';
      const testId = 'test-123';
      const mockResult = {
        success: true,
        result: {
          testId,
          success: true,
          duration: 1000
        }
      };

      mockPlaywrightTestHandler.handleGetTestResults.mockResolvedValue(mockResult);

      const response = await request(app)
        .get(`/api/projects/${projectId}/tests/playwright/results/${testId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(mockResult.result);
      expect(mockPlaywrightTestHandler.handleGetTestResults).toHaveBeenCalledWith({ testId });
    });

    test('should handle missing test ID', async () => {
      const response = await request(app)
        .get('/api/projects/test-project/tests/playwright/results/')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Test ID is required');
    });
  });

  describe('GET /api/projects/all/tests/playwright/results', () => {
    test('should get all test results successfully', async () => {
      const mockResult = {
        success: true,
        result: {
          results: [
            { testId: 'test-1', success: true },
            { testId: 'test-2', success: false }
          ],
          count: 2
        }
      };

      mockPlaywrightTestHandler.handleGetAllTestResults.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/projects/all/tests/playwright/results')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(mockResult.result);
      expect(mockPlaywrightTestHandler.handleGetAllTestResults).toHaveBeenCalledWith({});
    });
  });

  describe('GET /api/projects/:projectId/tests/playwright/config', () => {
    test('should get test configuration successfully', async () => {
      const projectId = 'test-project';
      const mockResult = {
        success: true,
        result: {
          projectId,
          config: {
            baseURL: 'http://localhost:3000',
            timeout: 30000,
            browsers: ['chromium']
          }
        }
      };

      mockPlaywrightTestHandler.handleConfigurationCommand.mockResolvedValue(mockResult);

      const response = await request(app)
        .get(`/api/projects/${projectId}/tests/playwright/config`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(mockResult.result);
      expect(mockPlaywrightTestHandler.handleConfigurationCommand).toHaveBeenCalledWith({
        action: 'get',
        projectId
      });
    });
  });

  describe('PUT /api/projects/:projectId/tests/playwright/config', () => {
    test('should update test configuration successfully', async () => {
      const projectId = 'test-project';
      const config = {
        baseURL: 'http://localhost:3000',
        timeout: 30000,
        browsers: ['chromium', 'firefox']
      };
      const mockResult = {
        success: true,
        result: {
          projectId,
          message: 'Configuration updated successfully'
        }
      };

      mockPlaywrightTestHandler.handleConfigurationCommand.mockResolvedValue(mockResult);

      const response = await request(app)
        .put(`/api/projects/${projectId}/tests/playwright/config`)
        .send({ config })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(mockResult.result);
      expect(response.body.message).toBe('Playwright configuration updated successfully');
      expect(mockPlaywrightTestHandler.handleConfigurationCommand).toHaveBeenCalledWith({
        action: 'update',
        projectId,
        config
      });
    });

    test('should handle missing configuration', async () => {
      const projectId = 'test-project';

      const response = await request(app)
        .put(`/api/projects/${projectId}/tests/playwright/config`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Configuration is required');
    });
  });

  describe('POST /api/projects/validate/tests/playwright/config/validate', () => {
    test('should validate configuration successfully', async () => {
      const config = {
        baseURL: 'http://localhost:3000',
        timeout: 30000
      };
      const mockResult = {
        success: true,
        result: {
          valid: true,
          errors: [],
          warnings: ['Minor warning']
        }
      };

      mockPlaywrightTestHandler.handleConfigurationCommand.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/projects/validate/tests/playwright/config/validate')
        .send({ config })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(mockResult.result);
      expect(mockPlaywrightTestHandler.handleConfigurationCommand).toHaveBeenCalledWith({
        action: 'validate',
        config
      });
    });
  });

  describe('GET /api/projects/:projectId/tests/playwright/projects', () => {
    test('should get test projects successfully', async () => {
      const projectId = 'test-project';
      const mockResult = {
        success: true,
        result: {
          projectId,
          projects: [
            { id: 'project-1', name: 'Login Tests', path: '/path/login.test.js' },
            { id: 'project-2', name: 'Dashboard Tests', path: '/path/dashboard.test.js' }
          ],
          count: 2
        }
      };

      mockPlaywrightTestHandler.handleProjectCommand.mockResolvedValue(mockResult);

      const response = await request(app)
        .get(`/api/projects/${projectId}/tests/playwright/projects`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(mockResult.result);
      expect(mockPlaywrightTestHandler.handleProjectCommand).toHaveBeenCalledWith({
        action: 'list',
        projectId
      });
    });
  });

  describe('POST /api/projects/:projectId/tests/playwright/projects', () => {
    test('should create test project successfully', async () => {
      const projectId = 'test-project';
      const projectData = {
        name: 'New Test Project',
        description: 'A new test project'
      };
      const mockResult = {
        success: true,
        result: {
          projectId,
          message: 'Test project created successfully'
        }
      };

      mockPlaywrightTestHandler.handleProjectCommand.mockResolvedValue(mockResult);

      const response = await request(app)
        .post(`/api/projects/${projectId}/tests/playwright/projects`)
        .send(projectData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(mockResult.result);
      expect(response.body.message).toBe('Playwright test project created successfully');
      expect(mockPlaywrightTestHandler.handleProjectCommand).toHaveBeenCalledWith({
        action: 'create',
        projectId,
        projectData
      });
    });

    test('should handle missing project name', async () => {
      const projectId = 'test-project';

      const response = await request(app)
        .post(`/api/projects/${projectId}/tests/playwright/projects`)
        .send({ description: 'No name provided' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project name is required');
    });
  });

  describe('POST /api/projects/:projectId/tests/playwright/login/validate', () => {
    test('should validate login credentials successfully', async () => {
      const projectId = 'test-project';
      const credentials = {
        username: 'testuser',
        password: 'testpass'
      };
      const mockResult = {
        success: true,
        result: {
          success: true,
          message: 'Credentials are valid'
        }
      };

      mockPlaywrightTestHandler.handleValidateLoginCredentials.mockResolvedValue(mockResult);

      const response = await request(app)
        .post(`/api/projects/${projectId}/tests/playwright/login/validate`)
        .send({ credentials })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(mockResult.result);
      expect(mockPlaywrightTestHandler.handleValidateLoginCredentials).toHaveBeenCalledWith({
        projectId,
        credentials
      });
    });

    test('should handle missing credentials', async () => {
      const projectId = 'test-project';

      const response = await request(app)
        .post(`/api/projects/${projectId}/tests/playwright/login/validate`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Credentials are required');
    });
  });

  describe('GET /api/projects/status/tests/playwright/status', () => {
    test('should get test runner status successfully', async () => {
      const mockResult = {
        success: true,
        result: {
          status: {
            isRunning: false,
            activeTestCount: 0,
            totalResults: 5
          }
        }
      };

      mockPlaywrightTestHandler.handleGetTestRunnerStatus.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/projects/status/tests/playwright/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(mockResult.result);
      expect(mockPlaywrightTestHandler.handleGetTestRunnerStatus).toHaveBeenCalledWith({});
    });
  });

  describe('POST /api/projects/stop/tests/playwright/stop', () => {
    test('should stop tests successfully', async () => {
      const testId = 'test-123';
      const mockResult = {
        success: true,
        result: {
          success: true,
          message: 'Test test-123 stopped'
        }
      };

      mockPlaywrightTestHandler.handleStopTests.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/projects/stop/tests/playwright/stop')
        .send({ testId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(mockResult.result);
      expect(response.body.message).toBe('Playwright tests stopped successfully');
      expect(mockPlaywrightTestHandler.handleStopTests).toHaveBeenCalledWith({ testId });
    });
  });

  describe('GET /api/projects/:testId/tests/playwright/logs', () => {
    test('should get test logs successfully', async () => {
      const testId = 'test-123';
      const lines = 50;

      const response = await request(app)
        .get(`/api/projects/${testId}/tests/playwright/logs?testId=${testId}&lines=${lines}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.testId).toBe(testId);
      expect(response.body.data.lines).toBe(lines);
      expect(response.body.data.message).toBe('Log retrieval not yet implemented');
    });
  });
});
