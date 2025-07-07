/**
 * PortStreamingService Unit Tests
 * 
 * Tests for the port-based streaming service functionality including
 * port management, frame capture, compression, and streaming.
 */
const ScreenshotStreamingService = require('../../backend/domain/services/ide-mirror/ScreenshotStreamingService');
const StreamingPort = require('../../backend/domain/entities/StreamingPort');
const FrameMetrics = require('../../backend/domain/entities/FrameMetrics');

// Mock dependencies
jest.mock('../../backend/infrastructure/external/BrowserManager');
jest.mock('../../backend/infrastructure/external/WebSocketManager');

describe('ScreenshotStreamingService - Port-Based', () => {
  let service;
  let mockBrowserManager;
  let mockWebSocketManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockBrowserManager = {
      captureScreenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
      isConnected: jest.fn().mockReturnValue(true)
    };
    
    mockWebSocketManager = {
      broadcastToTopic: jest.fn().mockResolvedValue(true),
      isConnected: jest.fn().mockReturnValue(true)
    };
    
    // Create service instance
    service = new ScreenshotStreamingService(mockBrowserManager, mockWebSocketManager);
  });

  describe('Port Management', () => {
    test('should start streaming for a port', async () => {
      const port = 3000;
      const options = { fps: 15, quality: 0.8, format: 'jpeg' };

      const result = await service.startStreaming(port, options);

      expect(result.success).toBe(true);
      expect(result.port).toBe(port);
      expect(service.activePorts.has(port)).toBe(true);
      
      const streamingPort = service.activePorts.get(port);
      expect(streamingPort.port).toBe(port);
      expect(streamingPort.fps).toBe(15);
      expect(streamingPort.quality).toBe(0.8);
      expect(streamingPort.format).toBe('jpeg');
    });

    test('should stop streaming for a port', async () => {
      const port = 3000;
      
      // Start streaming first
      await service.startStreaming(port);
      
      // Stop streaming
      const result = await service.stopStreaming(port);

      expect(result.success).toBe(true);
      expect(result.port).toBe(port);
      expect(service.activePorts.has(port)).toBe(false);
    });

    test('should pause streaming for a port', async () => {
      const port = 3000;
      
      // Start streaming first
      await service.startStreaming(port);
      
      // Pause streaming
      const result = await service.pauseStreaming(port);

      expect(result.success).toBe(true);
      expect(result.port).toBe(port);
      
      const streamingPort = service.activePorts.get(port);
      expect(streamingPort.status).toBe('paused');
    });

    test('should resume streaming for a port', async () => {
      const port = 3000;
      
      // Start streaming first
      await service.startStreaming(port);
      
      // Pause streaming
      await service.pauseStreaming(port);
      
      // Resume streaming
      const result = await service.resumeStreaming(port);

      expect(result.success).toBe(true);
      expect(result.port).toBe(port);
      
      const streamingPort = service.activePorts.get(port);
      expect(streamingPort.status).toBe('active');
    });

    test('should update port configuration', async () => {
      const port = 3000;
      const newConfig = { fps: 20, quality: 0.9 };
      
      // Start streaming first
      await service.startStreaming(port);
      
      // Update configuration
      const result = await service.updatePortConfig(port, newConfig);

      expect(result.success).toBe(true);
      expect(result.port).toBe(port);
      
      const streamingPort = service.activePorts.get(port);
      expect(streamingPort.fps).toBe(20);
      expect(streamingPort.quality).toBe(0.9);
    });
  });

  describe('Port Information', () => {
    test('should get port information', async () => {
      const port = 3000;
      await service.startStreaming(port);

      const portInfo = service.getPort(port);

      expect(portInfo).toBeDefined();
      expect(portInfo.port).toBe(port);
      expect(portInfo.status).toBe('active');
    });

    test('should return null for non-existent port', () => {
      const portInfo = service.getPort(9999);
      expect(portInfo).toBeNull();
    });

    test('should get all active ports', async () => {
      await service.startStreaming(3000);
      await service.startStreaming(3001);

      const ports = service.getAllPorts();

      expect(ports.length).toBe(2);
      expect(ports.map(p => p.port)).toContain(3000);
      expect(ports.map(p => p.port)).toContain(3001);
    });

    test('should return empty array when no ports active', () => {
      const ports = service.getAllPorts();
      expect(ports).toEqual([]);
    });
  });

  describe('Frame Capture and Streaming', () => {
    test('should capture and stream frame for port', async () => {
      const port = 3000;
      await service.startStreaming(port);

      const result = await service.captureAndStreamFrame(port);

      expect(result).toBe(true);
      expect(mockBrowserManager.captureScreenshot).toHaveBeenCalledWith(port);
      expect(mockWebSocketManager.broadcastToTopic).toHaveBeenCalledWith(
        `mirror-${port}-frames`,
        expect.objectContaining({
          type: 'frame',
          port: port
        })
      );
    });

    test('should handle frame capture errors', async () => {
      const port = 3000;
      mockBrowserManager.captureScreenshot.mockRejectedValue(new Error('Screenshot failed'));
      
      await service.startStreaming(port);

      const result = await service.captureAndStreamFrame(port);

      expect(result).toBe(false);
      
      const streamingPort = service.activePorts.get(port);
      expect(streamingPort.errorCount).toBe(1);
      expect(streamingPort.status).toBe('error');
    });
  });

  describe('Statistics', () => {
    test('should return service statistics', async () => {
      const port = 3000;
      await service.startStreaming(port);

      const stats = service.getStats();

      expect(stats.totalPorts).toBeGreaterThan(0);
      expect(stats.activePorts).toBeGreaterThan(0);
      expect(stats.totalFramesStreamed).toBeGreaterThanOrEqual(0);
      expect(stats.startTime).toBeDefined();
      expect(stats.ports).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid port numbers', async () => {
      const invalidPorts = [0, 65536, -1, 'invalid'];
      
      for (const port of invalidPorts) {
        const result = await service.startStreaming(port);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Valid port number');
      }
    });

    test('should handle duplicate port streaming', async () => {
      const port = 3000;
      
      // Start streaming first time
      await service.startStreaming(port);
      
      // Try to start streaming again
      const result = await service.startStreaming(port);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already streaming');
    });

    test('should handle stopping non-existent port', async () => {
      const result = await service.stopStreaming(9999);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Port not found');
    });
  });

  describe('Multiple Ports', () => {
    test('should handle multiple concurrent ports', async () => {
      const ports = [3000, 3001, 3002];
      
      // Start streaming for all ports
      for (const port of ports) {
        const result = await service.startStreaming(port);
        expect(result.success).toBe(true);
      }
      
      expect(service.activePorts.size).toBe(3);
      
      // Stop all streaming
      const stoppedCount = await service.stopAllStreaming();
      expect(stoppedCount).toBe(3);
      expect(service.activePorts.size).toBe(0);
    });
  });
}); 