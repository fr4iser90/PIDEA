const WebSocket = require('ws');
const AuthMiddleware = require('@auth/AuthMiddleware');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('WebSocketManager');


class WebSocketManager {
  constructor(server, eventBus, authMiddleware) {
    this.server = server;
    this.eventBus = eventBus;
    this.authMiddleware = authMiddleware;
    this.wss = null;
    this.clients = new Map(); // Map<userId, Set<WebSocket>>
    this.userConnections = new Map(); // Map<WebSocket, {userId, sessionId}>
    this.ideMirrorController = null;
    this.connectionCount = 0;
    this.maxConnectionsPerUser = 5;
    this.rateLimitWindow = 60000; // 1 minute
    this.rateLimitMax = 100; // max messages per minute per user
    this.userMessageCounts = new Map(); // Map<userId, {count: number, resetTime: number}>
  }

  initialize() {
    logger.info('Initializing WebSocket server...');

    this.wss = new WebSocket.Server({ 
      server: this.server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });

    logger.success('WebSocket server initialized');
  }

  async handleConnection(ws, req) {
    try {
      logger.debug('New WebSocket connection attempt');

      // Try to authenticate the connection, but don't require it initially
      const authResult = await this.authenticateConnection(ws, req);
      let user = null;
      let session = null;
      let userId = null;

      if (authResult.authenticated) {
        user = authResult.user;
        session = authResult.session;
        userId = user.id;

        // Check connection limits for authenticated users
        if (!this.canUserConnect(userId)) {
          ws.close(1008, 'Connection limit exceeded');
          return;
        }

        // Register the connection
        this.registerConnection(ws, userId, session.id);

        // Send welcome message
        this.sendToClient(ws, 'connection-established', {
          userId: userId,
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          permissions: {
            canSendMessages: user.hasPermission('chat:own'),
            canAccessIDE: user.hasPermission('ide:own'),
            canAccessFiles: user.hasPermission('read:own')
          }
        });

        logger.info(`User connected (${this.getUserConnectionCount(userId)} connections)`);
      } else {
        // Register as anonymous connection
        this.registerAnonymousConnection(ws);
        logger.info('Anonymous connection established');
        logger.debug('Total clients after anonymous connection:', this.wss.clients.size);
      }

      // Setup message handling
      ws.on('message', (data) => {
        this.handleMessage(ws, data, user);
      });

      // Setup disconnect handling
      ws.on('close', (code, reason) => {
        if (userId) {
          this.handleDisconnect(ws, userId, code, reason);
        } else {
          this.handleAnonymousDisconnect(ws, code, reason);
        }
      });

      // Setup error handling
      ws.on('error', (error) => {
        logger.error(`WebSocket error:`, error);
        if (userId) {
          this.handleDisconnect(ws, userId, 1011, 'Internal error');
        } else {
          this.handleAnonymousDisconnect(ws, 1011, 'Internal error');
        }
      });

      // Setup ping/pong for connection health
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

    } catch (error) {
      logger.error('Connection setup error:', error);
      ws.close(1011, 'Connection setup failed');
    }
  }

  async authenticateConnection(ws, req) {
    try {
      // Extract token from query parameters or headers
      const token = this.extractTokenFromRequest(req);
      
      if (!token) {
        return { authenticated: false, error: 'No authentication token provided' };
      }

      // Validate token using auth middleware
      const { user, session } = await this.authMiddleware.authService.validateAccessToken(token);
      
      if (!user || !session) {
        return { authenticated: false, error: 'Invalid authentication token' };
      }

      // Check if session is still active
      if (!session.isActive()) {
        return { authenticated: false, error: 'Session expired' };
      }

      return { authenticated: true, user, session };

    } catch (error) {
      logger.error('Authentication error:', error);
      return { authenticated: false, error: 'Authentication failed' };
    }
  }

  extractTokenFromRequest(req) {
    // From query parameters (primary method for WebSocket authentication)
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.searchParams.get('token')) {
      return url.searchParams.get('token');
    }

    // From headers (fallback)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  canUserConnect(userId) {
    const currentConnections = this.getUserConnectionCount(userId);
    return currentConnections < this.maxConnectionsPerUser;
  }

  getUserConnectionCount(userId) {
    const userConnections = this.clients.get(userId);
    return userConnections ? userConnections.size : 0;
  }

  registerConnection(ws, userId, sessionId) {
    // Add to user's connection set
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);

    // Store user info for this connection
    this.userConnections.set(ws, { userId, sessionId });

    this.connectionCount++;
  }

  registerAnonymousConnection(ws) {
    // Store anonymous connection info
    this.userConnections.set(ws, { userId: null, sessionId: null });
    this.connectionCount++;
    logger.debug('Anonymous connection registered. Total connections:', this.connectionCount);
  }

  handleAnonymousDisconnect(ws, code, reason) {
    logger.info(`Anonymous connection disconnected (code: ${code}, reason: ${reason})`);
    this.userConnections.delete(ws);
    this.connectionCount--;
  }

  handleDisconnect(ws, userId, code, reason) {
          logger.info(`User disconnected (code: ${code}, reason: ${reason})`);

    // Remove from user's connection set
    const userConnections = this.clients.get(userId);
    if (userConnections) {
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        this.clients.delete(userId);
      }
    }

    // Remove user info
    this.userConnections.delete(ws);

    this.connectionCount--;
  }

  async handleMessage(ws, data, user) {
    try {
      const message = JSON.parse(data.toString());
      const userId = user ? user.id : null;

      // Rate limiting (use IP or connection ID for anonymous users)
      const rateLimitKey = userId || ws._socket?.remoteAddress || 'anonymous';
      if (!this.checkRateLimit(rateLimitKey)) {
        this.sendToClient(ws, 'error', {
          type: 'rate_limit_exceeded',
          message: 'Too many messages sent'
        });
        return;
      }

      // Validate message structure
      if (!this.validateMessage(message)) {
        this.sendToClient(ws, 'error', {
          type: 'invalid_message',
          message: 'Invalid message format'
        });
        return;
      }

      // Check permissions for authenticated users
      if (user && !this.checkMessagePermissions(message, user)) {
        this.sendToClient(ws, 'error', {
          type: 'permission_denied',
          message: 'Insufficient permissions for this action'
        });
        return;
      }

      // Handle different message types
      await this.routeMessage(ws, message, user);

    } catch (error) {
      logger.error('Message handling error:', error);
      this.sendToClient(ws, 'error', {
        type: 'internal_error',
        message: 'Failed to process message'
      });
    }
  }

  checkRateLimit(userId) {
    const now = Date.now();
    const userRateLimit = this.userMessageCounts.get(userId);

    if (!userRateLimit || now > userRateLimit.resetTime) {
      this.userMessageCounts.set(userId, {
        count: 1,
        resetTime: now + this.rateLimitWindow
      });
      return true;
    }

    if (userRateLimit.count >= this.rateLimitMax) {
      return false;
    }

    userRateLimit.count++;
    return true;
  }

  validateMessage(message) {
    return message && 
           typeof message.type === 'string' && 
           message.type.length > 0 &&
           typeof message.data === 'object';
  }

  checkMessagePermissions(message, user) {
    const messageType = message.type;

    // Define permission requirements for different message types
    const permissionMap = {
      'chat-message': 'chat:own',
      'ide-command': 'ide:own',
      'file-access': 'read:own',
      'file-modify': 'write:own',
      'admin-command': 'admin'
    };

    const requiredPermission = permissionMap[messageType];
    if (!requiredPermission) {
      return true; // No specific permission required
    }

    if (requiredPermission === 'admin') {
      return user.isAdmin();
    }

    return user.hasPermission(requiredPermission);
  }

  async routeMessage(ws, message, user) {
    const { type, data } = message;

    switch (type) {
      case 'authenticate':
        await this.handleAuthentication(ws, data, user);
        break;

      case 'chat-message':
        if (!user) {
          this.sendToClient(ws, 'error', {
            type: 'authentication_required',
            message: 'Authentication required for chat messages'
          });
          return;
        }
        await this.handleChatMessage(ws, data, user);
        break;

      case 'ide-command':
        if (!user) {
          this.sendToClient(ws, 'error', {
            type: 'authentication_required',
            message: 'Authentication required for IDE commands'
          });
          return;
        }
        await this.handleIDECommand(ws, data, user);
        break;

      case 'file-access':
        if (!user) {
          this.sendToClient(ws, 'error', {
            type: 'authentication_required',
            message: 'Authentication required for file access'
          });
          return;
        }
        await this.handleFileAccess(ws, data, user);
        break;

      case 'ping':
        this.sendToClient(ws, 'pong', { timestamp: new Date().toISOString() });
        break;

      default:
        this.sendToClient(ws, 'error', {
          type: 'unknown_message_type',
          message: `Unknown message type: ${type}`
        });
    }
  }

  async handleAuthentication(ws, data, user) {
    try {
      const { token } = data;
      
      if (!token) {
        this.sendToClient(ws, 'error', {
          type: 'authentication_failed',
          message: 'No token provided'
        });
        return;
      }

      // Validate token
      const authResult = await this.authMiddleware.authService.validateAccessToken(token);
      
      if (!authResult.user || !authResult.session) {
        this.sendToClient(ws, 'error', {
          type: 'authentication_failed',
          message: 'Invalid token'
        });
        return;
      }

      // Update user info for this connection
      const userInfo = this.userConnections.get(ws);
      if (userInfo) {
        userInfo.userId = authResult.user.id;
        userInfo.sessionId = authResult.session.id;
      }

      // Add to user's connection set
      const userId = authResult.user.id;
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      this.sendToClient(ws, 'authentication-success', {
        userId: authResult.user.id,
        sessionId: authResult.session.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Authentication error:', error);
      this.sendToClient(ws, 'error', {
        type: 'authentication_failed',
        message: 'Authentication failed'
      });
    }
  }

  async handleChatMessage(ws, data, user) {
    // Broadcast chat message to user's other connections
    this.broadcastToUser(user.id, 'chat-message', {
      ...data,
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    // Emit event for other services
    if (this.eventBus) {
      this.eventBus.emit('chat-message', {
        ...data,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleIDECommand(ws, data, user) {
    // Handle IDE-specific commands
    if (this.ideMirrorController) {
      const result = await this.ideMirrorController.handleCommand(data, user);
      this.sendToClient(ws, 'ide-response', result);
    }
  }

  async handleFileAccess(ws, data, user) {
    // Handle file access requests
    // This would typically involve checking file permissions
    this.sendToClient(ws, 'file-response', {
      success: true,
      data: 'File access granted'
    });
  }

  // Broadcasting methods
  broadcastToUser(userId, event, data) {
    if (!userId) {
      // Fallback to broadcast to all if no userId
      this.broadcastToAll(event, data);
      return;
    }

    const userConnections = this.clients.get(userId);
    if (!userConnections) return;

    const message = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString()
    });

    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  broadcastToAll(event, data) {
    if (!this.wss) return;

    const message = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Broadcasting ${event} to ${this.wss.clients.size} clients:`, data);

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  sendToClient(ws, event, data) {
    if (ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString()
      });
      ws.send(message);
    }
  }

  // Health monitoring
  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
          const userInfo = this.userConnections.get(ws);
          if (userInfo) {
            this.handleDisconnect(ws, userInfo.userId, 1000, 'Connection timeout');
          }
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  // Statistics and monitoring
  getStats() {
    return {
      totalConnections: this.connectionCount,
      activeUsers: this.clients.size,
      totalClients: this.wss.clients.size,
      uptime: process.uptime()
    };
  }

  getUserStats(userId) {
    const connectionCount = this.getUserConnectionCount(userId);
    const rateLimit = this.userMessageCounts.get(userId);
    
    return {
      userId,
      connectionCount,
      rateLimit: rateLimit ? {
        count: rateLimit.count,
        resetTime: rateLimit.resetTime,
        remaining: Math.max(0, this.rateLimitMax - rateLimit.count)
      } : null
    };
  }

  // Cleanup
  cleanup() {
    logger.info('Cleaning up...');
    
    this.wss.clients.forEach(client => {
      client.close(1000, 'Server shutdown');
    });

    this.clients.clear();
    this.userConnections.clear();
    this.userMessageCounts.clear();
  }

  // IDE Mirror Controller integration
  setIDEMirrorController(controller) {
    this.ideMirrorController = controller;
  }

  // Streaming support
  setScreenshotStreamingService(streamingService) {
    this.screenshotStreamingService = streamingService;
  }

  /**
   * Broadcast message to a specific topic
   * @param {string} topic - Topic to broadcast to
   * @param {Object} message - Message to broadcast
   */
  broadcastToTopic(topic, message) {
    try {
      const topicMessage = {
        type: 'topic',
        topic: topic,
        data: message,
        timestamp: new Date().toISOString()
      };

      // Send to all connected clients
      this.wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(JSON.stringify(topicMessage));
          } catch (error) {
            logger.error('Error sending topic message:', error.message);
          }
        }
      });

    } catch (error) {
      logger.error('Error broadcasting to topic:', error.message);
    }
  }

  /**
   * Send binary frame data to clients
   * @param {string} sessionId - Streaming session ID
   * @param {Object} frameData - Frame data to send
   */
  async sendFrameData(sessionId, frameData) {
    try {
      const message = {
        type: 'frame',
        sessionId: sessionId,
        timestamp: frameData.timestamp,
        frameNumber: frameData.frameNumber,
        format: frameData.format,
        size: frameData.size,
        quality: frameData.quality,
        data: frameData.data.toString('base64'), // Convert binary to base64
        metadata: frameData.metadata
      };

      // Broadcast to all clients
      this.broadcastToTopic(`mirror-${frameData.metadata.port}-frames`, message);

    } catch (error) {
      logger.error('Error sending frame data:', error.message);
    }
  }

  getHealthStatus() {
    return {
      status: 'healthy',
      connections: this.connectionCount,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = WebSocketManager; 