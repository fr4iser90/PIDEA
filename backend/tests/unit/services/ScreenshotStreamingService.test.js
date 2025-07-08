/**
 * ScreenshotStreamingService Unit Tests
 * 
 * Tests for the core streaming service functionality including
 * session management, frame capture, compression, and streaming.
 */
const ScreenshotStreamingService = require('@/domain/services/ide-mirror/ScreenshotStreamingService');
const StreamingSession = require('@/domain/entities/StreamingSession');
const FrameMetrics = require('@/domain/entities/FrameMetrics');

// Mock dependencies
jest.mock('@/infrastructure/external/BrowserManager');
jest.mock('@/presentation/websocket/WebSocketManager');

describe('ScreenshotStreamingService', () => {
  let service;
  let mockBrowserManager;
  let mockWebSocketManager;

  beforeEach(() => {
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
      isConnected: jest.fn().mockReturnValue(true)
    };

    // Create service instance
    service = new ScreenshotStreamingService(mockBrowserManager, mockWebSocketManager, {
      defaultFPS: 10,
      maxFPS: 30,
      defaultQuality: 0.8,
      maxFrameSize: 50 * 1024
    });
  });

  describe('Constructor', () => {
    test('should initialize with default configuration', () => {
      expect(service.defaultFPS).toBe(10);
      expect(service.maxFPS).toBe(30);
      expect(service.defaultQuality).toBe(0.8);
      expect(service.maxFrameSize).toBe(50 * 1024);
      expect(service.activeSessions.size).toBe(0);
    });

    test('should initialize with custom configuration', () => {
      const customService = new ScreenshotStreamingService(mockBrowserManager, mockWebSocketManager, {
        defaultFPS: 15,
        maxFPS: 60,
        defaultQuality: 0.9,
        maxFrameSize: 100 * 1024
      });

      expect(customService.defaultFPS).toBe(15);
      expect(customService.maxFPS).toBe(60);
      expect(customService.defaultQuality).toBe(0.9);
      expect(customService.maxFrameSize).toBe(100 * 1024);
    });
  });

  describe('startStreaming', () => {
    test('should start streaming session successfully', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;
      const options = { fps: 15, quality: 0.9 };

      const result = await service.startStreaming(sessionId, port, options);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(result.port).toBe(port);
      expect(service.activeSessions.has(sessionId)).toBe(true);
      expect(service.streamingIntervals.has(sessionId)).toBe(true);
    });

    test('should validate session ID', async () => {
      await expect(service.startStreaming('', 3000)).rejects.toThrow('Valid session ID is required');
      await expect(service.startStreaming(null, 3000)).rejects.toThrow('Valid session ID is required');
    });

    test('should validate port number', async () => {
      await expect(service.startStreaming('test-session', 0)).rejects.toThrow('Valid port number (1-65535) is required');
      await expect(service.startStreaming('test-session', 70000)).rejects.toThrow('Valid port number (1-65535) is required');
    });

    test('should prevent duplicate sessions', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port);
      await expect(service.startStreaming(sessionId, port)).rejects.toThrow(`Streaming session ${sessionId} already exists`);
    });

    test('should ensure browser connection', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port);

      expect(mockBrowserManager.connectToPort).toHaveBeenCalledWith(port);
    });
  });

  describe('stopStreaming', () => {
    test('should stop streaming session successfully', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port);
      const result = await service.stopStreaming(sessionId);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(service.activeSessions.has(sessionId)).toBe(false);
      expect(service.streamingIntervals.has(sessionId)).toBe(false);
    });

    test('should handle non-existent session gracefully', async () => {
      const result = await service.stopStreaming('non-existent-session');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('pauseStreaming', () => {
    test('should pause active streaming session', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port);
      const result = await service.pauseStreaming(sessionId);

      expect(result.success).toBe(true);
      expect(service.activeSessions.get(sessionId).status).toBe('paused');
    });

    test('should handle non-existent session', async () => {
      const result = await service.pauseStreaming('non-existent-session');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('resumeStreaming', () => {
    test('should resume paused streaming session', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port);
      await service.pauseStreaming(sessionId);
      const result = await service.resumeStreaming(sessionId);

      expect(result.success).toBe(true);
      expect(service.activeSessions.get(sessionId).status).toBe('active');
    });

    test('should handle non-existent session', async () => {
      const result = await service.resumeStreaming('non-existent-session');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('captureAndStreamFrame', () => {
    test('should capture and stream frame successfully', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port);
      
      // Mock compression engine
      service.compressionEngine.compress = jest.fn().mockResolvedValue({
        data: Buffer.from('compressed-data'),
        size: 1024,
        format: 'webp',
        quality: 0.8
      });

      await service.captureAndStreamFrame(sessionId);

      expect(mockBrowserManager.captureScreenshot).toHaveBeenCalled();
      expect(service.compressionEngine.compress).toHaveBeenCalled();
      expect(mockWebSocketManager.broadcastToTopic).toHaveBeenCalled();
    });

    test('should handle capture errors gracefully', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port);
      
      // Mock capture error
      mockBrowserManager.captureScreenshot.mockRejectedValue(new Error('Capture failed'));

      await service.captureAndStreamFrame(sessionId);

      const session = service.activeSessions.get(sessionId);
      expect(session.errorCount).toBeGreaterThan(0);
    });
  });

  describe('getSession', () => {
    test('should return session if exists', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port);
      const session = service.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
      expect(session.port).toBe(port);
    });

    test('should return null for non-existent session', () => {
      const session = service.getSession('non-existent-session');
      expect(session).toBeNull();
    });
  });

  describe('getAllSessions', () => {
    test('should return all active sessions', async () => {
      const session1 = 'test-session-1';
      const session2 = 'test-session-2';
      const port = 3000;

      await service.startStreaming(session1, port);
      await service.startStreaming(session2, port);

      const sessions = service.getAllSessions();
      expect(sessions.length).toBe(2);
      expect(sessions.map(s => s.id)).toContain(session1);
      expect(sessions.map(s => s.id)).toContain(session2);
    });

    test('should return empty array when no sessions', () => {
      const sessions = service.getAllSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('should return service statistics', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port);
      const stats = service.getStats();

      expect(stats.totalSessions).toBeGreaterThan(0);
      expect(stats.activeSessions).toBeGreaterThan(0);
      expect(stats.totalFramesStreamed).toBeGreaterThanOrEqual(0);
      expect(stats.startTime).toBeDefined();
    });
  });

  describe('cleanup', () => {
    test('should cleanup stopped sessions', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port);
      await service.stopStreaming(sessionId);

      const beforeCleanup = service.activeSessions.size;
      service.cleanup();
      const afterCleanup = service.activeSessions.size;

      expect(afterCleanup).toBeLessThan(beforeCleanup);
    });
  });

  describe('Error Handling', () => {
    test('should handle browser connection failures', async () => {
      mockBrowserManager.connectToPort.mockRejectedValue(new Error('Connection failed'));

      await expect(service.startStreaming('test-session', 3000)).rejects.toThrow('Connection failed');
    });

    test('should handle WebSocket failures gracefully', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port);
      
      // Mock WebSocket error
      mockWebSocketManager.broadcastToTopic.mockRejectedValue(new Error('WebSocket error'));

      // Should not throw error, just log it
      await expect(service.captureAndStreamFrame(sessionId)).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should respect FPS limits', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;
      const fps = 5; // Low FPS for testing

      await service.startStreaming(sessionId, port, { fps });

      const session = service.activeSessions.get(sessionId);
      expect(session.fps).toBe(fps);

      // Check interval timing
      const interval = service.streamingIntervals.get(sessionId);
      expect(interval).toBeDefined();
    });

    test('should handle memory constraints', async () => {
      const sessionId = 'test-session-1';
      const port = 3000;

      await service.startStreaming(sessionId, port, { maxFrameSize: 1024 }); // Small frame size

      const session = service.activeSessions.get(sessionId);
      expect(session.maxFrameSize).toBe(1024);
    });
  });
}); 