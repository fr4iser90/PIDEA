const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const PlaywrightTestHandler = require('@handlers/categories/testing/PlaywrightTestHandler');
const PlaywrightTestApplicationService = require('@application/services/PlaywrightTestApplicationService');

// Mock dependencies
jest.mock('@application/services/PlaywrightTestApplicationService');

describe('PlaywrightTestHandler', () => {
  let handler;
  let mockPlaywrightTestService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock service
    mockPlaywrightTestService = {
      executeTests: jest.fn(),
      getTestResults: jest.fn(),
      getAllTestResults: jest.fn(),
      stopTests: jest.fn(),
      getTestRunnerStatus: jest.fn(),
      validateLoginCredentials: jest.fn(),
      loadProjectConfiguration: jest.fn(),
      testManager: {
        validateTestConfig: jest.fn(),
        saveTestConfig: jest.fn()
      }
    };
    
    // Mock the service constructor
    PlaywrightTestApplicationService.mockImplementation(() => mockPlaywrightTestService);
    
    // Create handler instance
    handler = new PlaywrightTestHandler({
      playwrightTestService: mockPlaywrightTestService
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default service', () => {
      const defaultHandler = new PlaywrightTestHandler();
      expect(defaultHandler).toBeDefined();
      expect(defaultHandler.playwrightTestService).toBeDefined();
    });

    test('should initialize with provided service', () => {
      expect(handler.playwrightTestService).toBe(mockPlaywrightTestService);
    });
  });

  describe('handleExecuteTests', () => {
    const command = {
      projectId: 'test-project',
      testName: 'login.test.js',
      options: { timeout: 30000 }
    };
    const mockResult = {
      success: true,
      projectId: 'test-project',
      testFiles: ['login.test.js'],
      duration: 1500
    };

    test('should handle execute tests command successfully', async () => {
      mockPlaywrightTestService.executeTests.mockResolvedValue(mockResult);

      const result = await handler.handleExecuteTests(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('executeTests');
      expect(result.result).toBe(mockResult);
      expect(mockPlaywrightTestService.executeTests).toHaveBeenCalledWith(
        command.projectId,
        { ...command.options, testName: command.testName }
      );
    });

    test('should handle missing project ID', async () => {
      const invalidCommand = { testName: 'login.test.js' };

      await expect(handler.handleExecuteTests(invalidCommand))
        .rejects.toThrow('Project ID is required');
    });

    test('should handle service errors', async () => {
      mockPlaywrightTestService.executeTests.mockRejectedValue(new Error('Service error'));

      await expect(handler.handleExecuteTests(command))
        .rejects.toThrow('Service error');
    });
  });

  describe('handleGetTestResults', () => {
    const command = { testId: 'test-123' };
    const mockResult = {
      testId: 'test-123',
      success: true,
      duration: 1000
    };

    test('should handle get test results command successfully', async () => {
      mockPlaywrightTestService.getTestResults.mockResolvedValue(mockResult);

      const result = await handler.handleGetTestResults(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('getTestResults');
      expect(result.result).toBe(mockResult);
      expect(mockPlaywrightTestService.getTestResults).toHaveBeenCalledWith(command.testId);
    });

    test('should handle missing test ID', async () => {
      const invalidCommand = {};

      await expect(handler.handleGetTestResults(invalidCommand))
        .rejects.toThrow('Test ID is required');
    });
  });

  describe('handleGetAllTestResults', () => {
    const mockResult = {
      results: [
        { testId: 'test-1', success: true },
        { testId: 'test-2', success: false }
      ],
      count: 2
    };

    test('should handle get all test results command successfully', async () => {
      mockPlaywrightTestService.getAllTestResults.mockResolvedValue(mockResult);

      const result = await handler.handleGetAllTestResults({});

      expect(result.success).toBe(true);
      expect(result.command).toBe('getAllTestResults');
      expect(result.result).toBe(mockResult);
      expect(mockPlaywrightTestService.getAllTestResults).toHaveBeenCalled();
    });
  });

  describe('handleStopTests', () => {
    const command = { testId: 'test-123' };
    const mockResult = {
      success: true,
      message: 'Test test-123 stopped'
    };

    test('should handle stop tests command successfully', async () => {
      mockPlaywrightTestService.stopTests.mockResolvedValue(mockResult);

      const result = await handler.handleStopTests(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('stopTests');
      expect(result.result).toBe(mockResult);
      expect(mockPlaywrightTestService.stopTests).toHaveBeenCalledWith(command.testId);
    });

    test('should handle stop all tests command', async () => {
      const stopAllCommand = {};
      mockPlaywrightTestService.stopTests.mockResolvedValue({
        success: true,
        message: 'All tests stopped'
      });

      const result = await handler.handleStopTests(stopAllCommand);

      expect(result.success).toBe(true);
      expect(mockPlaywrightTestService.stopTests).toHaveBeenCalledWith(undefined);
    });
  });

  describe('handleGetTestRunnerStatus', () => {
    const mockStatus = {
      isRunning: false,
      activeTestCount: 0,
      totalResults: 5
    };

    test('should handle get test runner status command successfully', async () => {
      mockPlaywrightTestService.getTestRunnerStatus.mockResolvedValue({
        success: true,
        status: mockStatus
      });

      const result = await handler.handleGetTestRunnerStatus({});

      expect(result.success).toBe(true);
      expect(result.command).toBe('getTestRunnerStatus');
      expect(result.result.status).toBe(mockStatus);
      expect(mockPlaywrightTestService.getTestRunnerStatus).toHaveBeenCalled();
    });
  });

  describe('handleValidateLoginCredentials', () => {
    const command = {
      projectId: 'test-project',
      credentials: { username: 'test', password: 'test123' }
    };
    const mockResult = {
      success: true,
      message: 'Credentials are valid'
    };

    test('should handle validate login credentials command successfully', async () => {
      mockPlaywrightTestService.validateLoginCredentials.mockResolvedValue(mockResult);

      const result = await handler.handleValidateLoginCredentials(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('validateLoginCredentials');
      expect(result.result).toBe(mockResult);
      expect(mockPlaywrightTestService.validateLoginCredentials).toHaveBeenCalledWith(
        command.projectId,
        command.credentials
      );
    });

    test('should handle missing project ID', async () => {
      const invalidCommand = { credentials: { username: 'test' } };

      await expect(handler.handleValidateLoginCredentials(invalidCommand))
        .rejects.toThrow('Project ID is required');
    });

    test('should handle missing credentials', async () => {
      const invalidCommand = { projectId: 'test-project' };

      await expect(handler.handleValidateLoginCredentials(invalidCommand))
        .rejects.toThrow('Credentials are required');
    });
  });

  describe('handleConfigurationCommand', () => {
    const projectId = 'test-project';
    const mockConfig = { baseURL: 'http://localhost:3000' };

    test('should handle get configuration command', async () => {
      const command = { action: 'get', projectId };
      mockPlaywrightTestService.detectWorkspacePath = jest.fn().mockResolvedValue('/workspace');
      mockPlaywrightTestService.loadProjectConfiguration = jest.fn().mockResolvedValue(mockConfig);

      const result = await handler.handleConfigurationCommand(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('getConfiguration');
      expect(result.result.config).toBe(mockConfig);
    });

    test('should handle update configuration command', async () => {
      const command = { action: 'update', projectId, config: mockConfig };
      mockPlaywrightTestService.detectWorkspacePath = jest.fn().mockResolvedValue('/workspace');
      mockPlaywrightTestService.testManager.validateTestConfig.mockReturnValue({
        valid: true,
        errors: [],
        warnings: []
      });
      mockPlaywrightTestService.testManager.saveTestConfig.mockResolvedValue();

      const result = await handler.handleConfigurationCommand(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('updateConfiguration');
      expect(result.result.message).toBe('Configuration updated successfully');
    });

    test('should handle validate configuration command', async () => {
      const command = { action: 'validate', config: mockConfig };
      mockPlaywrightTestService.testManager.validateTestConfig.mockReturnValue({
        valid: true,
        errors: [],
        warnings: ['Minor warning']
      });

      const result = await handler.handleConfigurationCommand(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('validateConfiguration');
      expect(result.result.valid).toBe(true);
      expect(result.result.warnings).toEqual(['Minor warning']);
    });

    test('should handle unknown configuration action', async () => {
      const command = { action: 'unknown', projectId };

      await expect(handler.handleConfigurationCommand(command))
        .rejects.toThrow('Unknown configuration action: unknown');
    });

    test('should handle missing project ID for get/update actions', async () => {
      const command = { action: 'get' };

      await expect(handler.handleConfigurationCommand(command))
        .rejects.toThrow('Project ID is required');
    });
  });

  describe('handleProjectCommand', () => {
    const projectId = 'test-project';

    test('should handle list projects command', async () => {
      const command = { action: 'list', projectId };
      const mockTestFiles = [
        { name: 'login.test.js', path: '/path/login.test.js', directory: '/path' }
      ];
      
      mockPlaywrightTestService.detectWorkspacePath = jest.fn().mockResolvedValue('/workspace');
      mockPlaywrightTestService.discoverProjectTests = jest.fn().mockResolvedValue(mockTestFiles);

      const result = await handler.handleProjectCommand(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('listProjects');
      expect(result.result.projects).toHaveLength(1);
      expect(result.result.projects[0].name).toBe('login.test.js');
    });

    test('should handle create project command', async () => {
      const command = {
        action: 'create',
        projectId,
        projectData: { name: 'New Project', config: {} }
      };
      
      mockPlaywrightTestService.detectWorkspacePath = jest.fn().mockResolvedValue('/workspace');
      mockPlaywrightTestService.testManager.createTestProject.mockResolvedValue();

      const result = await handler.handleProjectCommand(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('createProject');
      expect(result.result.message).toBe('Test project created successfully');
    });

    test('should handle get project config command', async () => {
      const command = { action: 'getConfig', projectId };
      const mockConfig = { baseURL: 'http://localhost:3000' };
      
      mockPlaywrightTestService.detectWorkspacePath = jest.fn().mockResolvedValue('/workspace');
      mockPlaywrightTestService.loadProjectConfiguration = jest.fn().mockResolvedValue(mockConfig);

      const result = await handler.handleProjectCommand(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('getProjectConfig');
      expect(result.result.config).toBe(mockConfig);
    });

    test('should handle update project config command', async () => {
      const command = {
        action: 'updateConfig',
        projectId,
        config: { baseURL: 'http://localhost:3000' }
      };
      
      mockPlaywrightTestService.detectWorkspacePath = jest.fn().mockResolvedValue('/workspace');
      mockPlaywrightTestService.testManager.saveTestConfig.mockResolvedValue();

      const result = await handler.handleProjectCommand(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('updateProjectConfig');
      expect(result.result.message).toBe('Project configuration updated successfully');
    });

    test('should handle unknown project action', async () => {
      const command = { action: 'unknown', projectId };

      await expect(handler.handleProjectCommand(command))
        .rejects.toThrow('Unknown project action: unknown');
    });

    test('should handle missing project ID', async () => {
      const command = { action: 'list' };

      await expect(handler.handleProjectCommand(command))
        .rejects.toThrow('Project ID is required');
    });
  });
});
