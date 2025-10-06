const Application = require('@Application');
const EventBus = require('@infrastructure/messaging/EventBus');
const WebSocketManager = require('@presentation/websocket/WebSocketManager');
const PlaywrightTestApplicationService = require('@application/services/PlaywrightTestApplicationService');
const Logger = require('@logging/Logger');

describe('Playwright Event Flow Integration', () => {
  let application;
  let eventBus;
  let webSocketManager;
  let playwrightService;
  let mockServer;
  let mockProjectRepository;

  beforeEach(() => {
    // Mock HTTP server
    mockServer = {
      on: jest.fn(),
      listen: jest.fn(),
      close: jest.fn()
    };

    // Mock Project Repository
    mockProjectRepository = {
      findById: jest.fn(),
      update: jest.fn()
    };

    // Create EventBus
    eventBus = new EventBus();

    // Mock WebSocketManager
    webSocketManager = {
      initialize: jest.fn(),
      broadcastToAll: jest.fn(),
      broadcastToUser: jest.fn()
    };

    // Create Application with mocked dependencies
    application = new Application({
      port: 3000,
      server: mockServer
    });

    // Inject dependencies
    application.eventBus = eventBus;
    application.webSocketManager = webSocketManager;
    application.projectRepository = mockProjectRepository;

    // Create PlaywrightTestApplicationService
    playwrightService = new PlaywrightTestApplicationService({
      application: application,
      logger: new Logger('PlaywrightTestApplicationService')
    });

    // Setup event handlers
    application.setupEventHandlers();
  });

  describe('Complete Event Flow', () => {
    const projectId = 'integration-test-project';
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
      name: 'Integration Test Project',
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

    it('should complete full event flow from service to WebSocket broadcast', async () => {
      // Arrange
      const eventSpy = jest.fn();
      eventBus.subscribe('playwright:config:saved', eventSpy);

      // Act
      await playwrightService.saveConfigurationToDatabase(projectId, testConfig);

      // Assert - Event should be emitted by service
      expect(eventSpy).toHaveBeenCalledWith({
        projectId,
        config: testConfig,
        timestamp: expect.any(String)
      });

      // Assert - WebSocket should broadcast the event
      expect(webSocketManager.broadcastToAll).toHaveBeenCalledWith(
        'playwright:config:saved',
        {
          projectId,
          config: testConfig,
          timestamp: expect.any(String)
        }
      );
    });

    it('should handle failed configuration save event flow', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockProjectRepository.update.mockRejectedValue(error);

      const eventSpy = jest.fn();
      eventBus.subscribe('playwright:config:failed', eventSpy);

      // Act & Assert
      await expect(playwrightService.saveConfigurationToDatabase(projectId, testConfig))
        .rejects.toThrow('Database connection failed');

      // Assert - Failed event should be emitted
      expect(eventSpy).toHaveBeenCalledWith({
        projectId,
        error: error.message,
        timestamp: expect.any(String)
      });

      // Assert - WebSocket should broadcast the failed event
      expect(webSocketManager.broadcastToAll).toHaveBeenCalledWith(
        'playwright:config:failed',
        {
          projectId,
          error: error.message,
          timestamp: expect.any(String)
        }
      );
    });

    it('should handle multiple concurrent configuration saves', async () => {
      // Arrange
      const projectIds = ['project-1', 'project-2', 'project-3'];
      const configs = [
        { timeout: 30000, browsers: ['chromium'] },
        { timeout: 45000, browsers: ['firefox'] },
        { timeout: 60000, browsers: ['webkit'] }
      ];

      projectIds.forEach((id, index) => {
        mockProjectRepository.findById.mockResolvedValueOnce({
          id,
          name: `Project ${index + 1}`,
          config: {}
        });
        mockProjectRepository.update.mockResolvedValueOnce({
          id,
          config: { playwright: configs[index] }
        });
      });

      const eventSpy = jest.fn();
      eventBus.subscribe('playwright:config:saved', eventSpy);

      // Act
      const promises = projectIds.map((id, index) =>
        playwrightService.saveConfigurationToDatabase(id, configs[index])
      );
      await Promise.all(promises);

      // Assert
      expect(eventSpy).toHaveBeenCalledTimes(3);
      expect(webSocketManager.broadcastToAll).toHaveBeenCalledTimes(3);

      // Verify each project received its own event
      projectIds.forEach((id, index) => {
        expect(eventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: id,
            config: configs[index]
          })
        );
      });
    });
  });

  describe('Event Handler Registration', () => {
    it('should register playwright event handlers in Application', () => {
      // The setupEventHandlers method should have been called
      // and playwright event handlers should be registered
      expect(eventBus.handlers.has('playwright:config:saved')).toBe(true);
      expect(eventBus.handlers.has('playwright:config:failed')).toBe(true);
    });

    it('should handle missing WebSocketManager gracefully', async () => {
      // Arrange
      application.webSocketManager = null;
      const projectId = 'test-project';
      const testConfig = { timeout: 30000 };

      mockProjectRepository.findById.mockResolvedValue({ id: projectId });
      mockProjectRepository.update.mockResolvedValue({});

      // Act
      await playwrightService.saveConfigurationToDatabase(projectId, testConfig);

      // Assert - Event should still be emitted
      expect(eventBus.handlers.get('playwright:config:saved')).toBeDefined();
      
      // WebSocket broadcast should not be called
      expect(webSocketManager.broadcastToAll).not.toHaveBeenCalled();
    });
  });

  describe('Event Data Integrity', () => {
    it('should preserve event data through the complete flow', async () => {
      // Arrange
      const projectId = 'data-integrity-test';
      const testConfig = {
        timeout: 30000,
        retries: 2,
        browsers: ['chromium', 'firefox', 'webkit'],
        login: {
          required: true,
          username: 'testuser',
          password: 'testpass'
        },
        customSettings: {
          headless: true,
          viewport: { width: 1280, height: 720 }
        }
      };

      mockProjectRepository.findById.mockResolvedValue({ id: projectId });
      mockProjectRepository.update.mockResolvedValue({});

      const eventSpy = jest.fn();
      eventBus.subscribe('playwright:config:saved', eventSpy);

      // Act
      await playwrightService.saveConfigurationToDatabase(projectId, testConfig);

      // Assert
      const eventData = eventSpy.mock.calls[0][0];
      expect(eventData.projectId).toBe(projectId);
      expect(eventData.config).toEqual(testConfig);
      expect(eventData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Verify WebSocket broadcast received same data
      const broadcastData = webSocketManager.broadcastToAll.mock.calls[0][1];
      expect(broadcastData).toEqual(eventData);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high-frequency configuration saves', async () => {
      // Arrange
      const numberOfSaves = 100;
      const projectId = 'performance-test';
      const testConfig = { timeout: 30000 };

      mockProjectRepository.findById.mockResolvedValue({ id: projectId });
      mockProjectRepository.update.mockResolvedValue({});

      const eventSpy = jest.fn();
      eventBus.subscribe('playwright:config:saved', eventSpy);

      // Act
      const startTime = Date.now();
      const promises = Array(numberOfSaves).fill().map(() =>
        playwrightService.saveConfigurationToDatabase(projectId, testConfig)
      );
      await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      expect(eventSpy).toHaveBeenCalledTimes(numberOfSaves);
      expect(webSocketManager.broadcastToAll).toHaveBeenCalledTimes(numberOfSaves);
      
      // Performance check - should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });
});
