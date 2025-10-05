const PlaywrightTestApplicationService = require('@application/services/PlaywrightTestApplicationService');
const Logger = require('@logging/Logger');

describe('PlaywrightConfigService', () => {
  let service;
  let mockLogger;
  let mockApplication;
  let mockProjectRepository;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockProjectRepository = {
      findById: jest.fn(),
      update: jest.fn()
    };

    mockApplication = {
      projectRepository: mockProjectRepository
    };

    service = new PlaywrightTestApplicationService({
      logger: mockLogger,
      application: mockApplication
    });
  });

  describe('saveConfigurationToDatabase', () => {
    it('should save configuration to database successfully', async () => {
      const projectId = 'test-project';
      const config = {
        baseURL: 'http://localhost:4000',
        timeout: 30000,
        browsers: ['chromium'],
        login: {
          required: true,
          username: 'test@example.com',
          password: 'password123'
        }
      };

      const mockProject = {
        id: projectId,
        config: '{"existing": "config"}'
      };

      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.update.mockResolvedValue();

      await service.saveConfigurationToDatabase(projectId, config);

      expect(mockProjectRepository.findById).toHaveBeenCalledWith(projectId);
      expect(mockProjectRepository.update).toHaveBeenCalledWith(projectId, {
        config: expect.stringContaining('playwright'),
        updated_at: expect.any(String)
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Saved Playwright configuration to database for project: ${projectId}`
      );
    });

    it('should throw error when project not found', async () => {
      const projectId = 'non-existent-project';
      const config = { baseURL: 'http://localhost:4000' };

      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(service.saveConfigurationToDatabase(projectId, config))
        .rejects.toThrow(`Project not found: ${projectId}`);
    });

    it('should throw error when project repository not available', async () => {
      const serviceWithoutApp = new PlaywrightTestApplicationService({
        logger: mockLogger
      });

      await expect(serviceWithoutApp.saveConfigurationToDatabase('test', {}))
        .rejects.toThrow('Project repository not available');
    });
  });

  describe('loadConfigurationFromDatabase', () => {
    it('should load configuration from database successfully', async () => {
      const projectId = 'test-project';
      const mockProject = {
        id: projectId,
        config: JSON.stringify({
          existing: 'config',
          playwright: {
            baseURL: 'http://localhost:4000',
            timeout: 30000,
            browsers: ['chromium']
          }
        })
      };

      mockProjectRepository.findById.mockResolvedValue(mockProject);

      const result = await service.loadConfigurationFromDatabase(projectId);

      expect(result).toEqual({
        baseURL: 'http://localhost:4000',
        timeout: 30000,
        browsers: ['chromium']
      });
      expect(mockProjectRepository.findById).toHaveBeenCalledWith(projectId);
    });

    it('should return null when no playwright config exists', async () => {
      const projectId = 'test-project';
      const mockProject = {
        id: projectId,
        config: JSON.stringify({ existing: 'config' })
      };

      mockProjectRepository.findById.mockResolvedValue(mockProject);

      const result = await service.loadConfigurationFromDatabase(projectId);

      expect(result).toBeNull();
    });

    it('should throw error when project not found', async () => {
      const projectId = 'non-existent-project';

      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(service.loadConfigurationFromDatabase(projectId))
        .rejects.toThrow('Project not found: non-existent-project');
    });
  });

  describe('getDefaultPlaywrightConfig (deprecated)', () => {
    it('should return deprecated configuration and log warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const config = service.getDefaultPlaywrightConfig();

      expect(config).toHaveProperty('baseURL');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('browsers');
      expect(config).toHaveProperty('login');
      expect(config).toHaveProperty('tests');
      expect(config).toHaveProperty('screenshots');
      expect(config).toHaveProperty('videos');
      expect(config).toHaveProperty('reports');

      expect(config.baseURL).toBe('http://localhost:4000');
      expect(config.timeout).toBe(30000);
      expect(config.browsers).toContain('chromium');
      expect(config.login.required).toBe(false);
      
      // Verify warning was logged
      expect(consoleSpy).toHaveBeenCalledWith('getDefaultPlaywrightConfig is deprecated and should not be used');
      
      consoleSpy.mockRestore();
    });
  });

  describe('executeTests with configuration persistence', () => {
    it('should save configuration to database during test execution', async () => {
      const projectId = 'test-project';
      const options = {
        workspacePath: '/test/workspace',
        config: {
          baseURL: 'http://localhost:4000',
          timeout: 30000
        }
      };

      const mockProject = {
        id: projectId,
        config: '{"existing": "config"}'
      };

      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.update.mockResolvedValue();

      // Mock the test manager methods
      service.testManager = {
        loadTestConfig: jest.fn().mockResolvedValue(options.config),
        validateTestConfig: jest.fn().mockReturnValue({ valid: true, warnings: [] }),
        discoverTests: jest.fn().mockResolvedValue([])
      };

      const result = await service.executeTests(projectId, options);

      expect(result.success).toBe(true);
      expect(mockProjectRepository.update).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Configuration saved to database',
        { projectId }
      );
    });

    it('should continue execution even if configuration save fails', async () => {
      const projectId = 'test-project';
      const options = {
        workspacePath: '/test/workspace',
        config: { baseURL: 'http://localhost:4000' }
      };

      mockProjectRepository.findById.mockRejectedValue(new Error('Database error'));

      // Mock the test manager methods
      service.testManager = {
        loadTestConfig: jest.fn().mockResolvedValue(options.config),
        validateTestConfig: jest.fn().mockReturnValue({ valid: true, warnings: [] }),
        discoverTests: jest.fn().mockResolvedValue([])
      };

      const result = await service.executeTests(projectId, options);

      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to save configuration to database, continuing with execution',
        expect.any(Error)
      );
    });
  });
});
