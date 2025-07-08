/**
 * PortStreamingWorkflow Integration Tests
 * 
 * Integration tests for the complete port-based streaming workflow
 * including API endpoints, WebSocket communication, and frontend integration.
 */
const request = require('supertest');
const WebSocket = require('ws');

// Import test utilities
const { createTestServer } = require('../utils/testServer');
const { createMockBrowserManager } = require('../utils/mockBrowserManager');
const { createMockWebSocketManager } = require('../utils/mockWebSocketManager');

describe('PortStreamingWorkflow Integration', () => {
  let app;
  let server;
  let mockBrowserManager;
  let mockWebSocketManager;
  let wsClient;

  beforeAll(async () => {
    // Create mock services
    mockBrowserManager = createMockBrowserManager();
    mockWebSocketManager = createMockWebSocketManager();
    
    // Create test server
    const testServer = await createTestServer(mockBrowserManager, mockWebSocketManager);
    app = testServer.app;
    server = testServer.server;
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
    if (wsClient) {
      wsClient.close();
    }
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('API Endpoints', () => {
    test('should start streaming for a port', async () => {
      const port = 3000;
      const options = { fps: 15, quality: 0.8, format: 'jpeg' };

      const response = await request(app)
        .post(`/api/ide-mirror/${port}/stream/start`)
        .send(options)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.port).toBe(port);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.port).toBe(port);
      expect(response.body.result.status).toBe('active');
    });

    test('should stop streaming for a port', async () => {
      const port = 3000;
      
      // Start streaming first
      await request(app)
        .post(`/api/ide-mirror/${port}/stream/start`)
        .send({ fps: 10 });

      // Stop streaming
      const response = await request(app)
        .post(`/api/ide-mirror/${port}/stream/stop`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.port).toBe(port);
      expect(response.body.result).toBeDefined();
    });

    test('should pause streaming for a port', async () => {
      const port = 3000;
      
      // Start streaming first
      await request(app)
        .post(`/api/ide-mirror/${port}/stream/start`)
        .send({ fps: 10 });

      // Pause streaming
      const response = await request(app)
        .post(`/api/ide-mirror/${port}/stream/pause`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.port).toBe(port);
      expect(response.body.status).toBe('paused');
    });

    test('should resume streaming for a port', async () => {
      const port = 3000;
      
      // Start streaming first
      await request(app)
        .post(`/api/ide-mirror/${port}/stream/start`)
        .send({ fps: 10 });

      // Pause streaming
      await request(app)
        .post(`/api/ide-mirror/${port}/stream/pause`);

      // Resume streaming
      const response = await request(app)
        .post(`/api/ide-mirror/${port}/stream/resume`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.port).toBe(port);
      expect(response.body.status).toBe('active');
    });

    test('should update port configuration', async () => {
      const port = 3000;
      const newConfig = { fps: 20, quality: 0.9 };
      
      // Start streaming first
      await request(app)
        .post(`/api/ide-mirror/${port}/stream/start`)
        .send({ fps: 10 });

      // Update configuration
      const response = await request(app)
        .put(`/api/ide-mirror/${port}/stream/config`)
        .send(newConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.port).toBe(port);
      expect(response.body.config).toBeDefined();
    });

    test('should get port status', async () => {
      const port = 3000;
      
      // Start streaming first
      await request(app)
        .post(`/api/ide-mirror/${port}/stream/start`)
        .send({ fps: 10 });

      // Get port status
      const response = await request(app)
        .get(`/api/ide-mirror/${port}/stream/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.port).toBe(port);
      expect(response.body.status).toBeDefined();
      expect(response.body.status.port).toBe(port);
    });

    test('should get all active ports', async () => {
      // Start streaming for multiple ports
      await request(app)
        .post('/api/ide-mirror/3000/stream/start')
        .send({ fps: 10 });

      await request(app)
        .post('/api/ide-mirror/3001/stream/start')
        .send({ fps: 10 });

      // Get all ports
      const response = await request(app)
        .get('/api/ide-mirror/stream/ports')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.ports).toBeDefined();
      expect(response.body.count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid port numbers', async () => {
      const invalidPorts = [0, 65536, -1];
      
      for (const port of invalidPorts) {
        const response = await request(app)
          .post(`/api/ide-mirror/${port}/stream/start`)
          .send({ fps: 10 })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid port number');
      }
    });

    test('should handle duplicate port streaming', async () => {
      const port = 3000;
      
      // Start streaming first time
      await request(app)
        .post(`/api/ide-mirror/${port}/stream/start`)
        .send({ fps: 10 });

      // Try to start streaming again
      const response = await request(app)
        .post(`/api/ide-mirror/${port}/stream/start`)
        .send({ fps: 10 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already streaming');
    });

    test('should handle stopping non-existent port', async () => {
      const response = await request(app)
        .post('/api/ide-mirror/9999/stream/stop')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Port not found');
    });
  });

  describe('WebSocket Communication', () => {
    test('should receive frame messages via WebSocket', (done) => {
      const port = 3000;
      const receivedFrames = [];

      // Connect WebSocket client
      wsClient = new WebSocket(`ws://localhost:${server.address().port}/ws`);

      wsClient.on('open', async () => {
        // Subscribe to port frames
        wsClient.send(JSON.stringify({
          type: 'subscribe',
          topic: `mirror-${port}-frames`
        }));

        // Start streaming
        await request(app)
          .post(`/api/ide-mirror/${port}/stream/start`)
          .send({ fps: 10 });
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'frame' && message.port === port) {
          receivedFrames.push(message);
          
          // Stop after receiving a few frames
          if (receivedFrames.length >= 3) {
            expect(receivedFrames.length).toBeGreaterThanOrEqual(3);
            expect(receivedFrames[0].port).toBe(port);
            expect(receivedFrames[0].type).toBe('frame');
            expect(receivedFrames[0].data).toBeDefined();
            
            // Stop streaming
            request(app)
              .post(`/api/ide-mirror/${port}/stream/stop`)
              .then(() => {
                wsClient.close();
                done();
              });
          }
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    }, 10000);
  });

  describe('Multiple Ports Workflow', () => {
    test('should handle multiple concurrent ports', async () => {
      const ports = [3000, 3001, 3002];
      
      // Start streaming for all ports
      for (const port of ports) {
        const response = await request(app)
          .post(`/api/ide-mirror/${port}/stream/start`)
          .send({ fps: 10 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.port).toBe(port);
      }
      
      // Verify all ports are active
      const statusResponse = await request(app)
        .get('/api/ide-mirror/stream/ports')
        .expect(200);

      expect(statusResponse.body.count).toBe(3);
      
      // Stop all streaming
      for (const port of ports) {
        const response = await request(app)
          .post(`/api/ide-mirror/${port}/stream/stop`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
      
      // Verify no ports are active
      const finalStatusResponse = await request(app)
        .get('/api/ide-mirror/stream/ports')
        .expect(200);

      expect(finalStatusResponse.body.count).toBe(0);
    });
  });

  describe('Performance and Limits', () => {
    test('should handle high FPS settings', async () => {
      const port = 3000;
      const highFPS = 30;

      const response = await request(app)
        .post(`/api/ide-mirror/${port}/stream/start`)
        .send({ fps: highFPS })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.fps).toBe(highFPS);
    });

    test('should handle quality settings', async () => {
      const port = 3000;
      const highQuality = 0.95;

      const response = await request(app)
        .post(`/api/ide-mirror/${port}/stream/start`)
        .send({ quality: highQuality })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.quality).toBe(highQuality);
    });

    test('should reject invalid FPS values', async () => {
      const port = 3000;
      const invalidFPS = 100;

      const response = await request(app)
        .post(`/api/ide-mirror/${port}/stream/start`)
        .send({ fps: invalidFPS })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('FPS must be between');
    });
  });
}); 