/**
 * Integration Tests for Version Management System
 */

const VersionManagementService = require('@application/services/VersionManagementService');
const AutomationOrchestrator = require('@application/services/AutomationOrchestrator');
const VersionController = require('@presentation/api/ide/VersionController');

describe('Version Management Integration', () => {
  let versionManagementService;
  let automationOrchestrator;
  let versionController;
  let mockVersionDetectionService;
  let mockSelectorCollectionBot;
  let mockIDETypesUpdater;
  let mockLogger;

  beforeEach(() => {
    // Mock version detection service
    mockVersionDetectionService = {
      detectVersion: jest.fn()
    };

    // Mock selector collection bot
    mockSelectorCollectionBot = {
      collectSelectors: jest.fn(),
      testSelectors: jest.fn(),
      saveSelectors: jest.fn()
    };

    // Mock IDE types updater
    mockIDETypesUpdater = {
      updateVersion: jest.fn()
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    // Create service instances
    versionManagementService = new VersionManagementService({
      versionDetectionService: mockVersionDetectionService,
      selectorCollectionBot: mockSelectorCollectionBot,
      ideTypesUpdater: mockIDETypesUpdater,
      logger: mockLogger
    });

    automationOrchestrator = new AutomationOrchestrator({
      versionManagementService,
      logger: mockLogger
    });

    versionController = new VersionController({
      versionManagementService,
      automationOrchestrator,
      logger: mockLogger
    });
  });

  describe('VersionManagementService Integration', () => {
    it('should complete full workflow for new version', async () => {
      // Mock version detection
      mockVersionDetectionService.detectVersion.mockResolvedValue({
        currentVersion: '1.7.0',
        isNewVersion: true,
        isKnownVersion: false,
        ideType: 'cursor',
        port: 9222
      });

      // Mock selector collection
      const mockSelectors = {
        chat: { chatInput: '.aislash-editor-input' },
        editor: { monacoEditor: '.monaco-editor' }
      };

      mockSelectorCollectionBot.collectSelectors.mockResolvedValue(mockSelectors);
      mockSelectorCollectionBot.testSelectors.mockResolvedValue({
        tested: 2,
        passed: 2,
        failed: 0
      });
      mockSelectorCollectionBot.saveSelectors.mockResolvedValue(true);

      // Run workflow
      const result = await versionManagementService.detectAndUpdateVersion('cursor', 9222);

      expect(result.success).toBe(true);
      expect(result.finalVersion).toBe('1.7.0');
      expect(result.isNewVersion).toBe(true);
      expect(result.steps).toHaveLength(4);
      expect(result.steps[0].step).toBe('version_detection');
      expect(result.steps[1].step).toBe('selector_collection');
      expect(result.steps[2].step).toBe('ide_types_update');
      expect(result.steps[3].step).toBe('validation');
    });

    it('should handle known version without collection', async () => {
      // Mock version detection for known version
      mockVersionDetectionService.detectVersion.mockResolvedValue({
        currentVersion: '1.5.7',
        isNewVersion: false,
        isKnownVersion: true,
        ideType: 'cursor',
        port: 9222
      });

      // Run workflow
      const result = await versionManagementService.detectAndUpdateVersion('cursor', 9222);

      expect(result.success).toBe(true);
      expect(result.finalVersion).toBe('1.5.7');
      expect(result.isNewVersion).toBe(false);
      expect(result.steps).toHaveLength(4);
      
      // Should not call selector collection
      expect(mockSelectorCollectionBot.collectSelectors).not.toHaveBeenCalled();
    });

    it('should handle version detection failure', async () => {
      // Mock version detection failure
      mockVersionDetectionService.detectVersion.mockResolvedValue(null);

      // Run workflow
      const result = await versionManagementService.detectAndUpdateVersion('cursor', 9222);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to detect version');
    });

    it('should handle selector collection failure', async () => {
      // Mock version detection
      mockVersionDetectionService.detectVersion.mockResolvedValue({
        currentVersion: '1.7.0',
        isNewVersion: true,
        isKnownVersion: false,
        ideType: 'cursor',
        port: 9222
      });

      // Mock selector collection failure
      mockSelectorCollectionBot.collectSelectors.mockRejectedValue(
        new Error('Collection failed')
      );

      // Run workflow
      const result = await versionManagementService.detectAndUpdateVersion('cursor', 9222);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Collection failed');
    });

    it('should use cache for repeated requests', async () => {
      // Mock version detection
      mockVersionDetectionService.detectVersion.mockResolvedValue({
        currentVersion: '1.7.0',
        isNewVersion: false,
        isKnownVersion: true,
        ideType: 'cursor',
        port: 9222
      });

      // Clear any existing cache
      versionManagementService.clearCache();

      // Run workflow twice
      await versionManagementService.detectAndUpdateVersion('cursor', 9222);
      await versionManagementService.detectAndUpdateVersion('cursor', 9222);

      // Should only call version detection once due to caching
      expect(mockVersionDetectionService.detectVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('AutomationOrchestrator Integration', () => {
    it('should start and stop automation', async () => {
      // Start automation
      const startResult = await automationOrchestrator.startAutomaticDetection({
        ideTypes: ['cursor'],
        ports: { cursor: 9222 },
        interval: 60000
      });

      expect(startResult).toBe(true);
      expect(automationOrchestrator.isRunning).toBe(true);

      // Stop automation
      const stopResult = await automationOrchestrator.stopAutomaticDetection();

      expect(stopResult).toBe(true);
      expect(automationOrchestrator.isRunning).toBe(false);
    });

    it('should schedule detection tasks', async () => {
      // Mock version management service
      versionManagementService.detectAndUpdateVersion = jest.fn().mockResolvedValue({
        success: true,
        finalVersion: '1.7.0',
        isNewVersion: false
      });

      // Schedule detection
      const result = await automationOrchestrator.scheduleDetection('cursor', 9222, 60000);

      expect(result).toBe(true);
      expect(automationOrchestrator.scheduledTasks.has('cursor:9222')).toBe(true);

      // Check task status
      const tasks = automationOrchestrator.getScheduledTasksStatus();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].ideType).toBe('cursor');
      expect(tasks[0].port).toBe(9222);
    });

    it('should handle event handlers', () => {
      const successHandler = jest.fn();
      const errorHandler = jest.fn();

      // Add event handlers
      automationOrchestrator.addEventHandler('detection_success', successHandler);
      automationOrchestrator.addEventHandler('detection_error', errorHandler);

      // Emit events
      automationOrchestrator.emitEvent('detection_success', { ideType: 'cursor' });
      automationOrchestrator.emitEvent('detection_error', { ideType: 'cursor', error: 'test' });

      expect(successHandler).toHaveBeenCalledWith({ ideType: 'cursor' });
      expect(errorHandler).toHaveBeenCalledWith({ ideType: 'cursor', error: 'test' });

      // Remove event handler
      automationOrchestrator.removeEventHandler('detection_success', successHandler);
      automationOrchestrator.emitEvent('detection_success', { ideType: 'cursor' });

      // Should not be called again
      expect(successHandler).toHaveBeenCalledTimes(1);
    });

    it('should get orchestrator statistics', () => {
      const stats = automationOrchestrator.getStats();

      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('scheduledTasks');
      expect(stats).toHaveProperty('totalRuns');
      expect(stats).toHaveProperty('totalSuccesses');
      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('eventHandlers');
      expect(stats).toHaveProperty('timestamp');
    });
  });

  describe('VersionController Integration', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
      mockReq = {
        body: {},
        params: {},
        query: {}
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });

    it('should handle version detection request', async () => {
      mockReq.body = { ideType: 'cursor', port: 9222 };

      // Mock version management service
      versionManagementService.detectAndUpdateVersion = jest.fn().mockResolvedValue({
        success: true,
        ideType: 'cursor',
        port: 9222,
        finalVersion: '1.7.0',
        isNewVersion: false,
        steps: [],
        timestamp: new Date().toISOString()
      });

      await versionController.detectVersion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          ideType: 'cursor',
          port: 9222,
          version: '1.7.0',
          isNewVersion: false
        })
      });
    });

    it('should handle selector collection request', async () => {
      mockReq.body = { ideType: 'cursor', version: '1.7.0', port: 9222 };

      // Mock version management service
      versionManagementService.collectSelectorsForNewVersion = jest.fn().mockResolvedValue({
        success: true,
        selectors: { chat: { chatInput: '.aislash-editor-input' } },
        testResults: { tested: 1, passed: 1, failed: 0 },
        message: 'Successfully collected selectors'
      });

      await versionController.collectSelectors(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          ideType: 'cursor',
          version: '1.7.0',
          port: 9222,
          selectors: { chat: { chatInput: '.aislash-editor-input' } }
        })
      });
    });

    it('should handle automation start request', async () => {
      mockReq.body = { options: { ideTypes: ['cursor'] } };

      // Mock automation orchestrator
      automationOrchestrator.startAutomaticDetection = jest.fn().mockResolvedValue(true);

      await versionController.startAutomation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          message: 'Automatic detection started successfully'
        })
      });
    });

    it('should handle automation status request', async () => {
      // Mock automation orchestrator
      automationOrchestrator.getStats = jest.fn().mockReturnValue({
        isRunning: true,
        scheduledTasks: 1,
        totalRuns: 5,
        totalSuccesses: 4,
        totalErrors: 1
      });

      automationOrchestrator.getScheduledTasksStatus = jest.fn().mockReturnValue([
        { ideType: 'cursor', port: 9222, runCount: 5 }
      ]);

      await versionController.getAutomationStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          stats: expect.objectContaining({
            isRunning: true,
            scheduledTasks: 1
          }),
          tasks: expect.arrayContaining([
            expect.objectContaining({
              ideType: 'cursor',
              port: 9222
            })
          ])
        })
      });
    });

    it('should handle health check request', async () => {
      await versionController.healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          status: 'healthy',
          services: expect.objectContaining({
            versionManagement: true,
            automationOrchestrator: true
          })
        })
      });
    });

    it('should handle validation errors', async () => {
      mockReq.body = { ideType: 'cursor' }; // Missing port

      await versionController.detectVersion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required parameters',
        message: 'ideType and port are required'
      });
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full automation workflow', async () => {
      // Mock all services
      mockVersionDetectionService.detectVersion.mockResolvedValue({
        currentVersion: '1.8.0',
        isNewVersion: true,
        isKnownVersion: false,
        ideType: 'cursor',
        port: 9222
      });

      const mockSelectors = {
        chat: { chatInput: '.aislash-editor-input' },
        editor: { monacoEditor: '.monaco-editor' }
      };

      mockSelectorCollectionBot.collectSelectors.mockResolvedValue(mockSelectors);
      mockSelectorCollectionBot.testSelectors.mockResolvedValue({
        tested: 2,
        passed: 2,
        failed: 0
      });
      mockSelectorCollectionBot.saveSelectors.mockResolvedValue(true);

      // Start automation
      await automationOrchestrator.startAutomaticDetection({
        ideTypes: ['cursor'],
        ports: { cursor: 9222 },
        interval: 100
      });

      // Wait for detection to run
      await new Promise(resolve => setTimeout(resolve, 200));

      // Stop automation
      await automationOrchestrator.stopAutomaticDetection();

      // Verify workflow was executed
      expect(mockVersionDetectionService.detectVersion).toHaveBeenCalled();
      expect(mockSelectorCollectionBot.collectSelectors).toHaveBeenCalled();
      expect(mockSelectorCollectionBot.testSelectors).toHaveBeenCalled();
      expect(mockSelectorCollectionBot.saveSelectors).toHaveBeenCalled();

      // Check orchestrator stats
      const stats = automationOrchestrator.getStats();
      expect(stats.totalRuns).toBeGreaterThan(0);
    });
  });
});
