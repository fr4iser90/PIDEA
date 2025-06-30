const WebSocket = require('ws');

class WebSocketManager {
  constructor(server, eventBus) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Set();
    this.eventBus = eventBus;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Subscribe to domain events
    if (this.eventBus) {
      this.eventBus.subscribe('MessageSent', (eventData) => {
        this.broadcastToClients('messageSent', eventData);
      });

      this.eventBus.subscribe('ChatHistoryUpdated', (eventData) => {
        this.broadcastToClients('chatHistoryUpdated', eventData);
      });
    }
  }

  handleConnection(ws, req) {
    console.log('[WebSocketManager] Client connected');
    this.clients.add(ws);

    // Send welcome message
    this.sendToClient(ws, 'connected', {
      message: 'Connected to Cursor Chat Agent',
      timestamp: new Date().toISOString()
    });

    ws.on('message', (data) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', () => {
      console.log('[WebSocketManager] Client disconnected');
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('[WebSocketManager] WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data);
      console.log('[WebSocketManager] Received message:', message);

      switch (message.type) {
        case 'ping':
          this.sendToClient(ws, 'pong', { timestamp: new Date().toISOString() });
          break;
        
        case 'subscribe':
          // Handle subscription to specific events
          this.sendToClient(ws, 'subscribed', { 
            events: message.events || [],
            timestamp: new Date().toISOString()
          });
          break;
        
        default:
          console.log('[WebSocketManager] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[WebSocketManager] Error parsing message:', error);
      this.sendToClient(ws, 'error', { 
        error: 'Invalid message format',
        timestamp: new Date().toISOString()
      });
    }
  }

  sendToClient(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(message));
    }
  }

  broadcastToClients(type, data) {
    const message = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Manual broadcast for live reload
  broadcastReload(filePath = null) {
    this.broadcastToClients('reload', { file: filePath });
  }

  getClientCount() {
    return this.clients.size;
  }

  // Health check
  getHealthStatus() {
    return {
      connectedClients: this.clients.size,
      serverStatus: 'running',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = WebSocketManager; 