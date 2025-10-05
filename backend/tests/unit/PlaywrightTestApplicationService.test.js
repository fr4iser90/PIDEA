const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const PlaywrightTestApplicationService = require('@application/services/PlaywrightTestApplicationService');
const PlaywrightTestRunner = require('@tests/playwright/utils/test-runner');
const PlaywrightTestManager = require('@tests/playwright/utils/test-manager');
const fs = require('fs-extra');
const path = require('path');

// Mock dependencies
jest.mock('@tests/playwright/utils/test-runner');
jest.mock('@tests/playwright/utils/test-manager');
jest.mock('fs-extra');

describe('PlaywrightTestApplicationService', () => {
  let service;
  let mockTestRunner;
  let mockTestManager;
  let mockWorkspaceDetector;
  let mockProjectMapper;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockTestRunner = {
      executeTest: jest.fn(),
      getTestResult: jest.fn(),
      getAllTestResults: jest.fn(),
      isTestRunning: jest.fn(),
      stopAllTests: jest.fn()
    };
    
    mockTestManager = {
      loadTestConfig: jest.fn(),
      saveTestConfig: jest.fn(),
      validateTestConfig: jest.fn(),
      discoverTests: jest.fn(),
      createTestProject: jest.fn()
    };
    
    mockWorkspaceDetector = {
      detectWorkspacePath: jest.fn()
    };
    
    mockProjectMapper = {
      getProjectPath: jest.fn()
    };
    
    // Mock fs-extra methods
    fs.pathExists = jest.fn();
    fs.ensureDir = jest.fn();
    
    // Create service instance
    service = new PlaywrightTestApplicationService({
      testRunner: mockTestRunner,
      testManager: mockTestManager,
      workspaceDetector: mockWorkspaceDetector,
      projectMapper: mockProjectMapper
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default dependencies', () => {
      const defaultService = new PlaywrightTestApplicationService();
      expect(defaultService).toBeDefined();
      expect(defaultService.testRunner).toBeDefined();
      expect(defaultService.testManager).toBeDefined();
    });

    test('should initialize with provided dependencies', () => {
      expect(service.testRunner).toBe(mockTestRunner);
      expect(service.testManager).toBe(mockTestManager);
      expect(service.workspaceDetector).toBe(mockWorkspaceDetector);
      expect(service.projectMapper).toBe(mockProjectMapper);
    });
  });

  describe('executeTests', () => {
    const projectId = 'test-project';
    const workspacePath = '/path/to/workspace';
    const mockConfig = {
      baseURL: 'http://localhost:3000',
      timeout: 30000,
      browsers: ['chromium']
    };
    const mockTestFiles = [
      { name: 'login.test.js', path: '/path/to/login.test.js' },
      { name: 'dashboard.test.js', path: '/path/to/dashboard.test.js' }
    ];
    const mockResults = [
      { testFile: 'login.test.js', success: true, duration: 1000 },
      { testFile: 'dashboard.test.js', success: false, error: 'Test failed' }
    ];

    beforeEach(() => {
      mockWorkspaceDetector.detectWorkspacePath.mockResolvedValue(workspacePath);
      mockTestManager.loadTestConfig.mockResolvedValue(mockConfig);
      mockTestManager.discoverTests.mockResolvedValue(mockTestFiles);
      mockTestRunner.executeTest.mockResolvedValue(mockResults[0]);
    });

    test('should execute tests successfully', async () => {
      const result = await service.executeTests(projectId);

      expect(result.success).toBe(true);
      expect(result.projectId).toBe(projectId);
      expect(result.workspacePath).toBe(workspacePath);
      expect(result.testFiles).toEqual(['login.test.js', 'dashboard.test.js']);
      expect(result.results).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should handle workspace path detection failure', async () => {
      mockWorkspaceDetector.detectWorkspacePath.mockResolvedValue(null);

      const result = await service.executeTests(projectId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workspace path not found');
    });

    test('should handle configuration loading failure', async () => {
      mockTestManager.loadTestConfig.mockRejectedValue(new Error('Config load failed'));

      const result = await service.executeTests(projectId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Config load failed');
    });

    test('should handle no tests found', async () => {
      mockTestManager.discoverTests.mockResolvedValue([]);

      const result = await service.executeTests(projectId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('No tests found to execute');
      expect(result.testFiles).toEqual([]);
    });

    test('should use provided workspace path in options', async () => {
      const providedPath = '/custom/workspace/path';
      const options = { workspacePath: providedPath };

      await service.executeTests(projectId, options);

      expect(mockWorkspaceDetector.detectWorkspacePath).not.toHaveBeenCalled();
      expect(mockTestManager.loadTestConfig).toHaveBeenCalledWith(providedPath, options);
    });
  });

  describe('getTestResults', () => {
    const testId = 'test-123';
    const mockResult = {
      testId,
      success: true,
      duration: 1500,
      timestamp: new Date().toISOString()
    };

    test('should get test results successfully', async () => {
      mockTestRunner.getTestResult.mockReturnValue(mockResult);

      const result = await service.getTestResults(testId);

      expect(result.success).toBe(true);
      expect(result.testId).toBe(testId);
      expect(result.result).toBe(mockResult);
    });

    test('should handle test results not found', async () => {
      mockTestRunner.getTestResult.mockReturnValue(null);

      await expect(service.getTestResults(testId)).rejects.toThrow('Test results not found');
    });
  });

  describe('getAllTestResults', () => {
    const mockResults = [
      { testId: 'test-1', success: true },
      { testId: 'test-2', success: false }
    ];

    test('should get all test results successfully', async () => {
      mockTestRunner.getAllTestResults.mockReturnValue(mockResults);

      const result = await service.getAllTestResults();

      expect(result.success).toBe(true);
      expect(result.results).toBe(mockResults);
      expect(result.count).toBe(2);
    });
  });

  describe('stopTests', () => {
    test('should stop all tests successfully', async () => {
      mockTestRunner.stopAllTests.mockResolvedValue();

      const result = await service.stopTests();

      expect(result.success).toBe(true);
      expect(result.message).toBe('All tests stopped');
      expect(mockTestRunner.stopAllTests).toHaveBeenCalled();
    });

    test('should stop specific test successfully', async () => {
      const testId = 'test-123';
      mockTestRunner.getTestResult.mockReturnValue({ isRunning: true });
      mockTestRunner.stopAllTests.mockResolvedValue();

      const result = await service.stopTests(testId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(`Test ${testId} stopped`);
    });
  });

  describe('getTestRunnerStatus', () => {
    test('should get test runner status successfully', async () => {
      mockTestRunner.isTestRunning.mockReturnValue(false);
      mockTestRunner.getAllTestResults.mockReturnValue([]);

      const result = await service.getTestRunnerStatus();

      expect(result.success).toBe(true);
      expect(result.status.isRunning).toBe(false);
      expect(result.status.activeTestCount).toBe(0);
      expect(result.status.totalResults).toBe(0);
    });
  });

  describe('detectWorkspacePath', () => {
    test('should use provided workspace path', async () => {
      const providedPath = '/provided/path';
      const options = { workspacePath: providedPath };

      const result = await service.detectWorkspacePath('project-id', options);

      expect(result).toBe(providedPath);
      expect(mockWorkspaceDetector.detectWorkspacePath).not.toHaveBeenCalled();
    });

    test('should use workspace detector when available', async () => {
      const detectedPath = '/detected/path';
      mockWorkspaceDetector.detectWorkspacePath.mockResolvedValue(detectedPath);

      const result = await service.detectWorkspacePath('project-id');

      expect(result).toBe(detectedPath);
      expect(mockWorkspaceDetector.detectWorkspacePath).toHaveBeenCalledWith('project-id');
    });

    test('should use project mapper when workspace detector fails', async () => {
      const mappedPath = '/mapped/path';
      mockWorkspaceDetector.detectWorkspacePath.mockResolvedValue(null);
      mockProjectMapper.getProjectPath.mockResolvedValue(mappedPath);

      const result = await service.detectWorkspacePath('project-id');

      expect(result).toBe(mappedPath);
      expect(mockProjectMapper.getProjectPath).toHaveBeenCalledWith('project-id');
    });

    test('should use default path when all methods fail', async () => {
      mockWorkspaceDetector.detectWorkspacePath.mockResolvedValue(null);
      mockProjectMapper.getProjectPath.mockResolvedValue(null);
      fs.pathExists.mockResolvedValue(true);

      const result = await service.detectWorkspacePath('project-id');

      expect(result).toBe('./projects/project-id');
    });

    test('should return null when no path is found', async () => {
      mockWorkspaceDetector.detectWorkspacePath.mockResolvedValue(null);
      mockProjectMapper.getProjectPath.mockResolvedValue(null);
      fs.pathExists.mockResolvedValue(false);

      const result = await service.detectWorkspacePath('project-id');

      expect(result).toBeNull();
    });
  });

  describe('loadProjectConfiguration', () => {
    const workspacePath = '/path/to/workspace';
    const mockConfig = { baseURL: 'http://localhost:3000' };
    const mockValidation = { valid: true, errors: [], warnings: [] };

    test('should load configuration successfully', async () => {
      mockTestManager.loadTestConfig.mockResolvedValue(mockConfig);
      mockTestManager.validateTestConfig.mockReturnValue(mockValidation);

      const result = await service.loadProjectConfiguration(workspacePath);

      expect(result).toBe(mockConfig);
      expect(mockTestManager.loadTestConfig).toHaveBeenCalledWith(workspacePath);
      expect(mockTestManager.validateTestConfig).toHaveBeenCalledWith(mockConfig);
    });

    test('should handle configuration validation failure', async () => {
      const invalidValidation = { valid: false, errors: ['Invalid config'], warnings: [] };
      mockTestManager.loadTestConfig.mockResolvedValue(mockConfig);
      mockTestManager.validateTestConfig.mockReturnValue(invalidValidation);

      await expect(service.loadProjectConfiguration(workspacePath))
        .rejects.toThrow('Invalid configuration: Invalid config');
    });

    test('should merge with provided options', async () => {
      const options = { config: { timeout: 60000 } };
      const mergedConfig = { ...mockConfig, timeout: 60000 };
      
      mockTestManager.loadTestConfig.mockResolvedValue(mockConfig);
      mockTestManager.validateTestConfig.mockReturnValue(mockValidation);

      const result = await service.loadProjectConfiguration(workspacePath, options);

      expect(mockTestManager.validateTestConfig).toHaveBeenCalledWith(mergedConfig);
    });
  });

  describe('validateLoginCredentials', () => {
    const projectId = 'test-project';
    const credentials = { username: 'test', password: 'test123' };
    const mockConfig = {
      login: { required: true, usernameField: 'input[name="username"]' }
    };

    test('should validate credentials successfully', async () => {
      mockWorkspaceDetector.detectWorkspacePath.mockResolvedValue('/workspace');
      mockTestManager.loadTestConfig.mockResolvedValue(mockConfig);
      
      // Mock the testLoginCredentials method
      jest.spyOn(service, 'testLoginCredentials').mockResolvedValue({
        success: true,
        details: 'Login successful'
      });

      const result = await service.validateLoginCredentials(projectId, credentials);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Credentials are valid');
    });

    test('should handle login not required', async () => {
      const configWithoutLogin = { login: { required: false } };
      mockWorkspaceDetector.detectWorkspacePath.mockResolvedValue('/workspace');
      mockTestManager.loadTestConfig.mockResolvedValue(configWithoutLogin);

      const result = await service.validateLoginCredentials(projectId, credentials);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login not required for this project');
    });

    test('should handle missing credentials', async () => {
      await expect(service.validateLoginCredentials(projectId, {}))
        .rejects.toThrow('Username and password are required');
    });
  });
});
