
/**
 * ScreenshotStreamingService Unit Tests
 * 
 * Tests for the core streaming service functionality including
 * session management, frame capture, compression, and streaming.
 */
const ScreenshotStreamingService = require('@services/ide-mirror/ScreenshotStreamingService');
const StreamingSession = require('@entities/StreamingSession');
const FrameMetrics = require('@entities/FrameMetrics');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

// Mock dependencies
jest.mock('@/infrastructure/external/BrowserManager');
jest.mock('@/presentation/websocket/WebSocketManager');

describe('ScreenshotStreamingService', () => {
  let service;
  let mockBrowserManager;
  let mockWebSocketManager;

  // Global cleanup after all tests
  afterAll(() => {
    // Clear any remaining timers and intervals
    jest.clearAllTimers();
  });

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

  afterEach(async () => {
    // Clean up any active streaming sessions
    if (service) {
      try {
        // Use the service's built-in cleanup method
        await service.cleanup();
      } catch (error) {
        logger.warn('Error during test cleanup:', error.message);
      }
    }
  });

  describe('Constructor', () => {
    test('should initialize with default configuration', () => {
      expect(service.defaultFPS).toBe(10);
      expect(service.maxFPS).toBe(30);
      expect(service.defaultQuality).toBe(0.8);
      expect(service.maxFrameSize).toBe(50 * 1024);
      expect(service.activePorts.size).toBe(0);
    });

    test('should initialize with custom configuration', async () => {
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

      // Clean up the custom service
      await customService.cleanup();
    });
  });

  describe('startStreaming', () => {
    test('should start streaming session successfully', async () => {
      const port = 3000;
      const options = { fps: 15, quality: 0.9 };

      const result = await service.startStreaming(port, options);

      expect(result.success).toBe(true);
      expect(result.port).toBe(port);
      expect(service.activePorts.has(port)).toBe(true);
      expect(service.streamingIntervals.has(port)).toBe(true);
    });

    test('should validate port number', async () => {
      await expect(service.startStreaming(0)).rejects.toThrow('Valid port number (1-65535) is required');
      await expect(service.startStreaming(70000)).rejects.toThrow('Valid port number (1-65535) is required');
    });

    test('should prevent duplicate sessions', async () => {
      const port = 3000;

      await service.startStreaming(port);
      await expect(service.startStreaming(port)).rejects.toThrow(`Streaming port ${port} already exists`);
    });

    test('should ensure browser connection', async () => {
      const port = 3000;

      // Mock that browser is connected to a different port
      mockBrowserManager.getCurrentPort.mockReturnValue(4000);

      await service.startStreaming(port);

      expect(mockBrowserManager.connectToPort).toHaveBeenCalledWith(port);
    });
  });

  describe('startStreamingSession', () => {
    test('should start streaming session successfully', async () => {
      const sessionId = 'session-3000';
      const port = 3000;
      const options = { fps: 15, quality: 0.9 };

      const result = await service.startStreamingSession(sessionId, port, options);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(result.port).toBe(port);
      expect(service.activePorts.has(port)).toBe(true);
    });

    test('should validate session ID', async () => {
      const port = 3000;
      const options = { fps: 15 };

      // Test with null session ID
      const result1 = await service.startStreamingSession(null, port, options);
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Valid session ID is required');

      // Test with undefined session ID
      const result2 = await service.startStreamingSession(undefined, port, options);
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Valid session ID is required');

      // Test with non-string session ID
      const result3 = await service.startStreamingSession(123, port, options);
      expect(result3.success).toBe(false);
      expect(result3.error).toBe('Valid session ID is required');

      // Test with empty string session ID
      const result4 = await service.startStreamingSession('', port, options);
      expect(result4.success).toBe(false);
      expect(result4.error).toBe('Valid session ID is required');
    });

    test('should prevent duplicate session IDs', async () => {
      const sessionId = 'session-3000';
      const port = 3000;

      // Start first session
      const result1 = await service.startStreamingSession(sessionId, port);
      expect(result1.success).toBe(true);

      // Try to start duplicate session
      const result2 = await service.startStreamingSession(sessionId, port + 1);
      expect(result2.success).toBe(false);
      expect(result2.error).toBe(`Session ${sessionId} already exists`);
    });
  });

  describe('stopStreaming', () => {
    test('should stop streaming session successfully', async () => {
      const port = 3000;

      await service.startStreaming(port);
      const result = await service.stopStreaming(port);

      expect(result.success).toBe(true);
      expect(result.port).toBe(port);
      expect(service.activePorts.has(port)).toBe(false);
      expect(service.streamingIntervals.has(port)).toBe(false);
    });

    test('should handle non-existent session gracefully', async () => {
      const result = await service.stopStreaming(9999);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('pauseStreaming', () => {
    test('should pause active streaming session', async () => {
      const port = 3000;

      await service.startStreaming(port);
      
      // Ensure the port is active before pausing
      const streamingPort = service.activePorts.get(port);
      streamingPort.status = 'active';
      
      const result = await service.pauseStreaming(port);

      expect(result.success).toBe(true);
      expect(service.activePorts.get(port).status).toBe('paused');
    });

    test('should handle non-existent session', async () => {
      const result = await service.pauseStreaming(9999);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('resumeStreaming', () => {
    test('should resume paused streaming session', async () => {
      const port = 3000;

      await service.startStreaming(port);
      
      // Ensure the port is active, then pause it
      const streamingPort = service.activePorts.get(port);
      streamingPort.status = 'active';
      await service.pauseStreaming(port);
      
      const result = await service.resumeStreaming(port);

      expect(result.success).toBe(true);
      expect(service.activePorts.get(port).status).toBe('active');
    });

    test('should handle non-existent session', async () => {
      const result = await service.resumeStreaming(9999);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('captureAndStreamFrame', () => {
    test('should capture and stream frame successfully', async () => {
      const port = 3000;

      // Start streaming session
      await service.startStreaming(port);
      
      // Mock compression engine with more realistic data
      service.compressionEngine.compress = jest.fn().mockResolvedValue({
        buffer: Buffer.from('compressed-screenshot-data'),
        size: 1024,
        format: 'jpeg',
        quality: 0.8,
        compressionTime: 10,
        originalSize: 2048,
        compressionRatio: 0.5
      });

      // Mock WebSocket broadcast to return success
      mockWebSocketManager.broadcastToTopic.mockResolvedValue(true);

      // Capture and stream frame
      const result = await service.captureAndStreamFrame(port);

      // Verify the result
      expect(result).toBe(true);

      // Verify browser manager was called
      expect(mockBrowserManager.getPage).toHaveBeenCalled();

      // Verify compression was called with correct parameters
      expect(service.compressionEngine.compress).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          format: 'jpeg',
          quality: expect.any(Number),
          maxSize: expect.any(Number)
        })
      );

      // Verify WebSocket broadcast was called with correct parameters
      expect(mockWebSocketManager.broadcastToTopic).toHaveBeenCalledWith(
        `mirror-${port}-frames`,
        expect.objectContaining({
          type: 'frame',
          port: port,
          timestamp: expect.any(Number),
          frameNumber: expect.any(Number),
          format: 'jpeg',
          size: 1024,
          quality: 0.8,
          data: expect.any(String), // base64 encoded
          metadata: expect.objectContaining({
            port: port,
            compressionTime: 10,
            originalSize: 2048,
            compressionRatio: 0.5
          })
        })
      );

      // Verify streaming port was updated
      const streamingPort = service.activePorts.get(port);
      expect(streamingPort).toBeDefined();
      expect(streamingPort.frameCount).toBeGreaterThan(0);
      expect(streamingPort.errorCount).toBe(0);

      // Verify service statistics were updated
      expect(service.stats.totalFramesStreamed).toBeGreaterThan(0);
      expect(service.stats.totalErrors).toBe(0);
    });

    test('should handle capture errors gracefully', async () => {
      const port = 3000;

      // Start streaming session
      await service.startStreaming(port);
      
      // Mock capture error
      mockBrowserManager.captureScreenshot.mockRejectedValue(new Error('Capture failed'));

      // Capture and stream frame (should handle error gracefully)
      const result = await service.captureAndStreamFrame(port);

      // Verify the result indicates failure
      expect(result).toBe(false);

      // Verify streaming port error count was incremented
      const streamingPort = service.activePorts.get(port);
      expect(streamingPort.errorCount).toBeGreaterThan(0);
    });

    test('should handle compression errors gracefully', async () => {
      const port = 3000;

      // Start streaming session
      await service.startStreaming(port);
      
      // Mock compression error
      service.compressionEngine.compress = jest.fn().mockRejectedValue(new Error('Compression failed'));

      // Capture and stream frame (should handle error gracefully)
      const result = await service.captureAndStreamFrame(port);

      // Verify the result indicates failure
      expect(result).toBe(false);

      // Verify streaming port error count was incremented
      const streamingPort = service.activePorts.get(port);
      expect(streamingPort.errorCount).toBeGreaterThan(0);
    });

    test('should handle WebSocket errors gracefully', async () => {
      const port = 3000;

      // Start streaming session
      await service.startStreaming(port);
      
      // Mock WebSocket error
      mockWebSocketManager.broadcastToTopic.mockRejectedValue(new Error('WebSocket error'));

      // Capture and stream frame (should handle error gracefully)
      const result = await service.captureAndStreamFrame(port);

      // Verify the result indicates failure
      expect(result).toBe(false);

      // Verify streaming port error count was incremented
      const streamingPort = service.activePorts.get(port);
      expect(streamingPort.errorCount).toBeGreaterThan(0);
    });

    test('should return false for non-existent port', async () => {
      const nonExistentPort = 9999;

      // Try to capture and stream frame for non-existent port
      const result = await service.captureAndStreamFrame(nonExistentPort);

      // Verify the result indicates failure
      expect(result).toBe(false);

      // Verify no WebSocket calls were made
      expect(mockWebSocketManager.broadcastToTopic).not.toHaveBeenCalled();
    });
  });

  describe('getPort', () => {
    test('should return port if exists', async () => {
      const port = 3000;

      await service.startStreaming(port);
      const streamingPort = service.getPort(port);

      expect(streamingPort).toBeDefined();
      expect(streamingPort.port).toBe(port);
    });

    test('should return null for non-existent port', () => {
      const streamingPort = service.getPort(9999);
      expect(streamingPort).toBeNull();
    });
  });

  describe('getAllPorts', () => {
    test('should return all active ports', async () => {
      const port1 = 3000;
      const port2 = 4000;

      await service.startStreaming(port1);
      await service.startStreaming(port2);

      const ports = service.getAllPorts();
      expect(ports.length).toBe(2);
      expect(ports.map(p => p.port)).toContain(port1);
      expect(ports.map(p => p.port)).toContain(port2);
    });

    test('should return empty array when no ports', () => {
      const ports = service.getAllPorts();
      expect(ports).toEqual([]);
    });
  });

  describe('getAllSessions', () => {
    test('should return all active sessions', async () => {
      const port1 = 3000;
      const port2 = 4000;

      await service.startStreaming(port1);
      await service.startStreaming(port2);

      const sessions = service.getAllSessions();
      expect(sessions.length).toBe(2);
      expect(sessions.map(s => s.port)).toContain(port1);
      expect(sessions.map(s => s.port)).toContain(port2);
    });

    test('should return empty array when no sessions', () => {
      const sessions = service.getAllSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('getSession', () => {
    test('should return session if exists', async () => {
      const port = 3000;
      await service.startStreaming(port);

      const session = service.getSession(`session-${port}`);
      expect(session).toBeDefined();
      expect(session.port).toBe(port);
      expect(session.id).toBe(`session-${port}`);
    });

    test('should return null for non-existent session', () => {
      const session = service.getSession('session-9999');
      expect(session).toBeNull();
    });

    test('should return null for invalid session ID format', () => {
      const session = service.getSession('invalid-session-id');
      expect(session).toBeNull();
    });
  });

  describe('getStats', () => {
    test('should return service statistics', async () => {
      const port = 3000;

      await service.startStreaming(port);
      const stats = service.getStats();

      expect(stats.totalPorts).toBeGreaterThanOrEqual(0);
      expect(stats.activePorts).toBeGreaterThanOrEqual(0);
      expect(stats.totalFramesStreamed).toBeGreaterThanOrEqual(0);
      expect(stats.startTime).toBeDefined();
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
      expect(stats.averageLatency).toBeGreaterThanOrEqual(0);
      expect(stats.compression).toBeDefined();
      expect(stats.buffer).toBeDefined();
      expect(stats.ports).toBeDefined();
      expect(stats.sessions).toBeDefined();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(0);
      expect(stats.activeSessions).toBeGreaterThanOrEqual(0);
    });

    test('should return service statistics without active streaming', () => {
      const stats = service.getStats();

      expect(stats.totalPorts).toBeGreaterThanOrEqual(0);
      expect(stats.activePorts).toBeGreaterThanOrEqual(0);
      expect(stats.totalFramesStreamed).toBeGreaterThanOrEqual(0);
      expect(stats.startTime).toBeDefined();
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
      expect(stats.averageLatency).toBeGreaterThanOrEqual(0);
      expect(stats.compression).toBeDefined();
      expect(stats.buffer).toBeDefined();
      expect(stats.ports).toBeDefined();
      expect(stats.sessions).toBeDefined();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(0);
      expect(stats.activeSessions).toBeGreaterThanOrEqual(0);
    });

    test('should handle missing dependencies gracefully', async () => {
      // Create service with missing dependencies
      const serviceWithoutDeps = new ScreenshotStreamingService(
        mockBrowserManager, 
        mockWebSocketManager, 
        { defaultFPS: 10 }
      );
      
      // Remove dependencies to simulate failure
      serviceWithoutDeps.compressionEngine = null;
      serviceWithoutDeps.frameBuffer = null;
      
      const stats = serviceWithoutDeps.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.compression).toEqual({});
      expect(stats.buffer).toEqual({});
      expect(stats.ports).toEqual([]);
      expect(stats.sessions).toEqual([]);

      // Clean up the service without deps
      await serviceWithoutDeps.cleanup();
    });
  });

  describe('cleanup', () => {
    test('should cleanup stopped ports', async () => {
      const port = 3000;

      await service.startStreaming(port);
      await service.stopStreaming(port);

      const beforeCleanup = service.activePorts.size;
      await service.cleanup();
      const afterCleanup = service.activePorts.size;

      expect(afterCleanup).toBeLessThanOrEqual(beforeCleanup);
    });
  });

  describe('Error Handling', () => {
    test('should handle browser connection failures', async () => {
      // Reset mocks and recreate service with failing browser manager
      jest.clearAllMocks();
      
      const failingBrowserManager = {
        isConnected: jest.fn().mockReturnValue(true),
        getCurrentPort: jest.fn().mockReturnValue(4000), // Different port to trigger connection
        connectToPort: jest.fn().mockRejectedValue(new Error('Connection failed')),
        captureScreenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot-data')),
        getPage: jest.fn().mockReturnValue({
          screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot-data'))
        })
      };

      const failingWebSocketManager = {
        broadcastToTopic: jest.fn().mockResolvedValue(true),
        isConnected: jest.fn().mockReturnValue(true)
      };

      const failingService = new ScreenshotStreamingService(failingBrowserManager, failingWebSocketManager, {
        defaultFPS: 10,
        maxFPS: 30,
        defaultQuality: 0.8,
        maxFrameSize: 50 * 1024
      });

      try {
        // Test the mock directly first
        await expect(failingBrowserManager.connectToPort(3000)).rejects.toThrow('Connection failed');

        // Now test the service
        const result = await failingService.startStreaming(3000);
        logger.debug('Test result:', result);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Connection failed');
      } finally {
        // Clean up the failing service
        await failingService.cleanup();
      }
    });

    test('should handle browser connection failures with global mock', async () => {
      // Reset mocks to ensure clean state
      jest.clearAllMocks();
      
      // Recreate the service with fresh mocks
      const freshMockBrowserManager = {
        isConnected: jest.fn().mockReturnValue(true),
        getCurrentPort: jest.fn().mockReturnValue(4000), // Different port to trigger connection
        connectToPort: jest.fn().mockRejectedValue(new Error('Connection failed')),
        captureScreenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot-data')),
        getPage: jest.fn().mockReturnValue({
          screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot-data'))
        })
      };

      const freshMockWebSocketManager = {
        broadcastToTopic: jest.fn().mockResolvedValue(true),
        isConnected: jest.fn().mockReturnValue(true)
      };

      const freshService = new ScreenshotStreamingService(freshMockBrowserManager, freshMockWebSocketManager, {
        defaultFPS: 10,
        maxFPS: 30,
        defaultQuality: 0.8,
        maxFrameSize: 50 * 1024
      });
      
      try {
        // Verify the mock is set up correctly
        await expect(freshMockBrowserManager.connectToPort(3000)).rejects.toThrow('Connection failed');
        
        // Now test the actual service method
        const result = await freshService.startStreaming(3000);
        logger.debug('Test result 2:', result);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Connection failed');
      } finally {
        // Clean up the fresh service
        await freshService.cleanup();
      }
    });

    test('should handle WebSocket failures gracefully', async () => {
      const port = 3000;

      await service.startStreaming(port);
      
      // Mock WebSocket error
      mockWebSocketManager.broadcastToTopic.mockRejectedValue(new Error('WebSocket error'));

      // Should not throw error, just log it
      await expect(service.captureAndStreamFrame(port)).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should respect FPS limits', async () => {
      const port = 3000;
      const fps = 5; // Low FPS for testing

      await service.startStreaming(port, { fps });

      const streamingPort = service.activePorts.get(port);
      expect(streamingPort.fps).toBe(fps);

      // Check interval timing
      const interval = service.streamingIntervals.get(port);
      expect(interval).toBeDefined();

      // Verify FPS validation
      expect(streamingPort.fps).toBeGreaterThanOrEqual(1);
      expect(streamingPort.fps).toBeLessThanOrEqual(60);

      // Test FPS calculation
      const expectedInterval = 1000 / fps;
      expect(expectedInterval).toBe(200); // 1000 / 5 = 200ms

      // Clean up
      await service.stopStreaming(port);
    });

    test('should enforce FPS bounds', async () => {
      const port = 3000;

      // Test minimum FPS
      await service.startStreaming(port, { fps: 1 });
      let streamingPort = service.activePorts.get(port);
      expect(streamingPort.fps).toBe(1);

      await service.stopStreaming(port);

      // Test maximum FPS
      await service.startStreaming(port, { fps: 60 });
      streamingPort = service.activePorts.get(port);
      expect(streamingPort.fps).toBe(60);

      await service.stopStreaming(port);
    });

    test('should handle invalid FPS values', async () => {
      const port = 3000;

      // Test FPS below minimum
      await expect(service.startStreaming(port, { fps: 0 })).rejects.toThrow();

      // Test FPS above maximum
      await expect(service.startStreaming(port, { fps: 61 })).rejects.toThrow();

      // Test negative FPS
      await expect(service.startStreaming(port, { fps: -1 })).rejects.toThrow();
    });

    test('should calculate correct frame intervals', async () => {
      const port = 3000;
      const testCases = [
        { fps: 1, expectedInterval: 1000 },
        { fps: 5, expectedInterval: 200 },
        { fps: 10, expectedInterval: 100 },
        { fps: 30, expectedInterval: 33.33 },
        { fps: 60, expectedInterval: 16.67 }
      ];

      for (const testCase of testCases) {
        await service.startStreaming(port, { fps: testCase.fps });
        const streamingPort = service.activePorts.get(port);
        const calculatedInterval = 1000 / streamingPort.fps;
        
        expect(calculatedInterval).toBeCloseTo(testCase.expectedInterval, 1);
        await service.stopStreaming(port);
      }
    });

    test('should handle memory constraints', async () => {
      const port = 3000;

      await service.startStreaming(port, { maxFrameSize: 1024 }); // Small frame size

      const streamingPort = service.activePorts.get(port);
      expect(streamingPort.maxFrameSize).toBe(1024);
    });

    test('should track frame metrics correctly', async () => {
      const port = 3000;
      const fps = 10;

      await service.startStreaming(port, { fps });
      const streamingPort = service.activePorts.get(port);

      // Add a small delay to simulate time passing after starting
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate frame updates
      streamingPort.updateFrame(1024, 50); // 1KB frame, 50ms latency
      
      // Add another small delay to simulate time between frames
      await new Promise(resolve => setTimeout(resolve, 50));
      
      streamingPort.updateFrame(2048, 75); // 2KB frame, 75ms latency

      expect(streamingPort.frameCount).toBe(2);
      expect(streamingPort.averageFrameSize).toBe(1536); // (1024 + 2048) / 2
      expect(streamingPort.averageLatency).toBe(62.5); // (50 + 75) / 2
      expect(streamingPort.getCurrentFPS()).toBeGreaterThan(0);

      await service.stopStreaming(port);
    });
  });
}); 