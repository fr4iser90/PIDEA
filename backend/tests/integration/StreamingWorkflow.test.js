/**
 * StreamingWorkflow Integration Tests
 * 
 * End-to-end tests for the complete IDE screenshot streaming workflow
 * including session management, frame capture, compression, and delivery.
 */
const ScreenshotStreamingService = require('@/domain/services/ide-mirror/ScreenshotStreamingService');
const StreamingController = require('@/presentation/api/StreamingController');
const StartStreamingHandler = require('@handler-categories/management/StartStreamingHandler');
const StopStreamingHandler = require('@handler-categories/management/StopStreamingHandler');
const StreamingSessionRepository = require('@/infrastructure/database/StreamingSessionRepository');
const StreamingSession = require('@/domain/entities/StreamingSession');

// Mock external dependencies
jest.mock('@/infrastructure/external/BrowserManager');
jest.mock('@/presentation/websocket/WebSocketManager');

describe('StreamingWorkflow Integration', () => {
  // Global cleanup after all tests
  afterAll(() => {
    // Clear any remaining timers and intervals
    jest.clearAllTimers();
  });

  let streamingService;
  let streamingController;
  let startHandler;
  let stopHandler;
  let sessionRepository;
  let mockBrowserManager;
  let mockWebSocketManager;
  let mockEventBus;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockBrowserManager = {
      isConnected: jest.fn().mockReturnValue(true),
      getCurrentPort: jest.fn().mockReturnValue(3000),
      connectToPort: jest.fn().mockResolvedValue(true),
      captureScreenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot-data')),
      getPage: jest.fn().mockReturnValue({
        screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot-data'))
      })
    };

    mockWebSocketManager = {
      broadcastToTopic: jest.fn().mockResolvedValue(true),
      isConnected: jest.fn().mockReturnValue(true),
      setScreenshotStreamingService: jest.fn()
    };

    mockEventBus = {
      emit: jest.fn(),
      publish: jest.fn()
    };

    // Create repository
    sessionRepository = new StreamingSessionRepository();

    // Create streaming service
    streamingService = new ScreenshotStreamingService(mockBrowserManager, mockWebSocketManager, {
      defaultFPS: 10,
      maxFPS: 30,
      defaultQuality: 0.8,
      maxFrameSize: 50 * 1024
    });

    // Create handlers
    startHandler = new StartStreamingHandler(streamingService, mockEventBus);
    stopHandler = new StopStreamingHandler(streamingService, mockEventBus);

    // Create controller
    streamingController = new StreamingController(streamingService, mockEventBus);

    // Initialize services
    await sessionRepository.initialize();
  });

  afterEach(async () => {
    // Clean up streaming service to prevent open handles
    if (streamingService) {
      try {
        await streamingService.cleanup();
      } catch (error) {
        console.warn('Error during streaming service cleanup:', error.message);
      }
    }
  });

  describe('Complete Streaming Workflow', () => {
    test('should handle complete streaming session lifecycle', async () => {
      const sessionId = 'integration-test-session';
      const port = 3000;
      const options = {
        fps: 10,
        quality: 0.8,
        format: 'webp',
        maxFrameSize: 50 * 1024,
        enableRegionDetection: false
      };

      // Step 1: Start streaming
      const startResult = await startHandler.handle({
        sessionId,
        port,
        options,
        validate: () => true,
        commandId: 'test-command-1'
      });

      expect(startResult.success).toBe(true);
      expect(startResult.sessionId).toBe(sessionId);

      // Verify session is active
      const session = streamingService.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session.isActive()).toBe(true);

      // Step 2: Verify frame capture and streaming
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for frame capture

      expect(mockBrowserManager.captureScreenshot).toHaveBeenCalled();
      expect(mockWebSocketManager.broadcastToTopic).toHaveBeenCalled();

      // Step 3: Pause streaming
      const pauseResult = await streamingService.pauseStreaming(sessionId);
      expect(pauseResult.success).toBe(true);
      expect(session.status).toBe('paused');

      // Step 4: Resume streaming
      const resumeResult = await streamingService.resumeStreaming(sessionId);
      expect(resumeResult.success).toBe(true);
      expect(session.status).toBe('active');

      // Step 5: Stop streaming
      const stopResult = await stopHandler.handle({
        sessionId,
        validate: () => true,
        commandId: 'test-command-2'
      });

      expect(stopResult.success).toBe(true);
      expect(session.isStopped()).toBe(true);

      // Verify cleanup
      expect(streamingService.activeSessions.has(sessionId)).toBe(false);
      expect(streamingService.streamingIntervals.has(sessionId)).toBe(false);
    });

    test('should handle multiple concurrent sessions', async () => {
      const sessions = [
        { id: 'session-1', port: 3000 },
        { id: 'session-2', port: 3001 },
        { id: 'session-3', port: 3002 }
      ];

      // Start all sessions
      for (const session of sessions) {
        await startHandler.handle({
          sessionId: session.id,
          port: session.port,
          options: { fps: 5 },
          validate: () => true,
          commandId: `command-${session.id}`
        });
      }

      // Verify all sessions are active
      const activeSessions = streamingService.getAllSessions();
      expect(activeSessions.length).toBe(3);

      // Verify each session is independent
      for (const session of sessions) {
        const sessionObj = streamingService.getSession(session.id);
        expect(sessionObj).toBeDefined();
        expect(sessionObj.isActive()).toBe(true);
        expect(sessionObj.port).toBe(session.port);
      }

      // Stop all sessions
      for (const session of sessions) {
        await stopHandler.handle({
          sessionId: session.id,
          validate: () => true,
          commandId: `stop-command-${session.id}`
        });
      }

      // Verify all sessions are stopped
      const remainingSessions = streamingService.getAllSessions();
      expect(remainingSessions.length).toBe(0);
    });
  });

  describe('API Controller Integration', () => {
    test('should handle streaming API requests', async () => {
      const sessionId = 'api-test-session';
      const port = 3000;

      // Mock request and response objects
      const req = {
        params: { port: port.toString() },
        body: {
          sessionId,
          fps: 10,
          quality: 0.8,
          format: 'webp'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Test start streaming endpoint
      await streamingController.startStreaming(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sessionId: sessionId,
          port: port
        })
      );

      // Test stop streaming endpoint
      const stopReq = {
        params: { port: port.toString() },
        body: { sessionId }
      };

      await streamingController.stopStreaming(stopReq, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sessionId: sessionId
        })
      );
    });

    test('should handle API validation errors', async () => {
      const req = {
        params: { port: 'invalid-port' },
        body: { sessionId: 'test-session' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await streamingController.startStreaming(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid port number')
        })
      );
    });
  });

  describe('Performance and Metrics', () => {
    test('should track performance metrics correctly', async () => {
      const sessionId = 'metrics-test-session';
      const port = 3000;

      // Start streaming
      await startHandler.handle({
        sessionId,
        port,
        options: { fps: 10 },
        validate: () => true,
        commandId: 'metrics-test-command'
      });

      // Wait for some frames to be captured
      await new Promise(resolve => setTimeout(resolve, 500));

      const session = streamingService.getSession(sessionId);
      expect(session.frameCount).toBeGreaterThan(0);
      expect(session.averageFrameSize).toBeGreaterThan(0);
      expect(session.averageLatency).toBeGreaterThan(0);

      // Check service stats
      const stats = streamingService.getStats();
      expect(stats.totalSessions).toBeGreaterThan(0);
      expect(stats.activeSessions).toBeGreaterThan(0);
      expect(stats.totalFramesStreamed).toBeGreaterThan(0);

      // Stop streaming
      await stopHandler.handle({
        sessionId,
        validate: () => true,
        commandId: 'stop-metrics-test'
      });
    });

    test('should handle memory constraints', async () => {
      const sessionId = 'memory-test-session';
      const port = 3000;

      // Start streaming with small frame size limit
      await startHandler.handle({
        sessionId,
        port,
        options: { maxFrameSize: 1024 }, // 1KB limit
        validate: () => true,
        commandId: 'memory-test-command'
      });

      // Wait for frame capture
      await new Promise(resolve => setTimeout(resolve, 200));

      const session = streamingService.getSession(sessionId);
      expect(session.maxFrameSize).toBe(1024);

      // Stop streaming
      await stopHandler.handle({
        sessionId,
        validate: () => true,
        commandId: 'stop-memory-test'
      });
    });
  });

  describe('Error Recovery', () => {
    test('should recover from browser connection failures', async () => {
      const sessionId = 'recovery-test-session';
      const port = 3000;

      // Mock browser connection failure
      mockBrowserManager.connectToPort.mockRejectedValueOnce(new Error('Connection failed'));

      const startResult = await startHandler.handle({
        sessionId,
        port,
        options: { fps: 10 },
        validate: () => true,
        commandId: 'recovery-test-command'
      });

      expect(startResult.success).toBe(false);
      expect(startResult.error).toContain('Connection failed');

      // Verify session is not created
      const session = streamingService.getSession(sessionId);
      expect(session).toBeNull();
    });

    test('should handle WebSocket disconnections gracefully', async () => {
      const sessionId = 'websocket-test-session';
      const port = 3000;

      // Start streaming
      await startHandler.handle({
        sessionId,
        port,
        options: { fps: 10 },
        validate: () => true,
        commandId: 'websocket-test-command'
      });

      // Mock WebSocket disconnection
      mockWebSocketManager.isConnected.mockReturnValue(false);

      // Should continue to capture frames even if WebSocket is down
      await streamingService.captureAndStreamFrame(sessionId);

      const session = streamingService.getSession(sessionId);
      expect(session.errorCount).toBe(0); // Should not count as error

      // Stop streaming
      await stopHandler.handle({
        sessionId,
        validate: () => true,
        commandId: 'stop-websocket-test'
      });
    });
  });

  describe('Session Repository Integration', () => {
    test('should persist and retrieve sessions', async () => {
      const sessionId = 'persistence-test-session';
      const port = 3000;

      // Create session
      const session = StreamingSession.create(sessionId, port, { fps: 10 });
      await sessionRepository.saveSession(session);

      // Retrieve session
      const retrievedSession = await sessionRepository.getSession(sessionId);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession.id).toBe(sessionId);
      expect(retrievedSession.port).toBe(port);

      // Update session
      session.start();
      session.activate();
      await sessionRepository.saveSession(session);

      // Verify update
      const updatedSession = await sessionRepository.getSession(sessionId);
      expect(updatedSession.status).toBe('active');
    });

    test('should handle session cleanup', async () => {
      const sessionId = 'cleanup-test-session';
      const port = 3000;

      // Create and save session
      const session = StreamingSession.create(sessionId, port, { fps: 10 });
      session.start();
      session.stop();
      await sessionRepository.saveSession(session);

      // Verify session exists
      let retrievedSession = await sessionRepository.getSession(sessionId);
      expect(retrievedSession).toBeDefined();

      // Cleanup old sessions
      await sessionRepository.cleanup(0); // Clean up immediately

      // Verify session is cleaned up
      retrievedSession = await sessionRepository.getSession(sessionId);
      expect(retrievedSession).toBeNull();
    });
  });
}); 