const PlaywrightTestApplicationService = require('@application/services/PlaywrightTestApplicationService');
const EventBus = require('@infrastructure/messaging/EventBus');
const Logger = require('@logging/Logger');

describe('Playwright Event System', () => {
  let service;
  let mockEventBus;
  let mockApplication;
  let mockProjectRepository;
  let mockLogger;

  beforeEach(() => {
    // Mock EventBus
    mockEventBus = {
      emit: jest.fn().mockResolvedValue(),
      subscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue()
    };

    // Mock Application
    mockApplication = {
      eventBus: mockEventBus,
      projectRepository: mockProjectRepository
    };

    // Mock Project Repository
    mockProjectRepository = {
      findById: jest.fn(),
      update: jest.fn()
    };

    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    // Create service instance
    service = new PlaywrightTestApplicationService({
      logger: mockLogger,
      application: mockApplication
    });
  });

  describe('Event Emission on Configuration Save', () => {
    const projectId = 'test-project-123';
    const testConfig = {
      timeout: 30000,
      retries: 2,
      browsers: ['chromium'],
      login: {
        required: true,
        username: 'testuser',
        password: 'testpass'
      }
    };

    const mockProject = {
      id: projectId,
      name: 'Test Project',
      config: {
        existing: 'config'
      }
    };

    beforeEach(() => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.update.mockResolvedValue({
        ...mockProject,
        config: {
          existing: 'config',
          playwright: testConfig
        }
      });
    });

    it('should emit playwright:config:saved event on successful save', async () => {
      // Act
      await service.saveConfigurationToDatabase(projectId, testConfig);

      // Assert
      expect(mockEventBus.emit).toHaveBeenCalledWith('playwright:config:saved', {
        projectId,
        config: testConfig,
        timestamp: expect.any(String)
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Emitted playwright:config:saved event for project: ${projectId}`
      );
    });

    it('should emit playwright:config:failed event on save failure', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockProjectRepository.update.mockRejectedValue(error);

      // Act & Assert
      await expect(service.saveConfigurationToDatabase(projectId, testConfig))
        .rejects.toThrow('Database connection failed');

      expect(mockEventBus.emit).toHaveBeenCalledWith('playwright:config:failed', {
        projectId,
        error: error.message,
        timestamp: expect.any(String)
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Emitted playwright:config:failed event for project: ${projectId}`
      );
    });

    it('should handle missing EventBus gracefully', async () => {
      // Arrange
      service.application.eventBus = null;

      // Act
      await service.saveConfigurationToDatabase(projectId, testConfig);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'EventBus not available for playwright:config:saved event'
      );
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should handle missing Application gracefully', async () => {
      // Arrange
      service.application = null;

      // Act
      await service.saveConfigurationToDatabase(projectId, testConfig);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'EventBus not available for playwright:config:saved event'
      );
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should include correct event data structure', async () => {
      // Act
      await service.saveConfigurationToDatabase(projectId, testConfig);

      // Assert
      const emitCall = mockEventBus.emit.mock.calls.find(
        call => call[0] === 'playwright:config:saved'
      );
      
      expect(emitCall).toBeDefined();
      expect(emitCall[1]).toEqual({
        projectId,
        config: testConfig,
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      });
    });
  });

  describe('Event Data Validation', () => {
    it('should include projectId in event data', async () => {
      const projectId = 'test-project-456';
      const testConfig = { timeout: 30000 };

      mockProjectRepository.findById.mockResolvedValue({ id: projectId });
      mockProjectRepository.update.mockResolvedValue({});

      await service.saveConfigurationToDatabase(projectId, testConfig);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'playwright:config:saved',
        expect.objectContaining({
          projectId: projectId
        })
      );
    });

    it('should include config in event data', async () => {
      const projectId = 'test-project-789';
      const testConfig = {
        timeout: 45000,
        retries: 3,
        browsers: ['chromium', 'firefox']
      };

      mockProjectRepository.findById.mockResolvedValue({ id: projectId });
      mockProjectRepository.update.mockResolvedValue({});

      await service.saveConfigurationToDatabase(projectId, testConfig);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'playwright:config:saved',
        expect.objectContaining({
          config: testConfig
        })
      );
    });

    it('should include timestamp in event data', async () => {
      const projectId = 'test-project-timestamp';
      const testConfig = { timeout: 30000 };

      mockProjectRepository.findById.mockResolvedValue({ id: projectId });
      mockProjectRepository.update.mockResolvedValue({});

      await service.saveConfigurationToDatabase(projectId, testConfig);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'playwright:config:saved',
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should emit failed event with error message', async () => {
      const projectId = 'test-project-error';
      const testConfig = { timeout: 30000 };
      const error = new Error('Validation failed');

      mockProjectRepository.findById.mockRejectedValue(error);

      await expect(service.saveConfigurationToDatabase(projectId, testConfig))
        .rejects.toThrow('Validation failed');

      expect(mockEventBus.emit).toHaveBeenCalledWith('playwright:config:failed', {
        projectId,
        error: error.message,
        timestamp: expect.any(String)
      });
    });

    it('should handle EventBus emit failure gracefully', async () => {
      const projectId = 'test-project-emit-error';
      const testConfig = { timeout: 30000 };

      mockProjectRepository.findById.mockResolvedValue({ id: projectId });
      mockProjectRepository.update.mockResolvedValue({});
      mockEventBus.emit.mockRejectedValue(new Error('EventBus error'));

      // Should not throw error even if EventBus fails
      await expect(service.saveConfigurationToDatabase(projectId, testConfig))
        .resolves.not.toThrow();
    });
  });
});
