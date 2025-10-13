import { logger } from "@/infrastructure/logging/Logger";
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import TimeoutConfig from '@/config/timeout-config.js';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = TimeoutConfig.getRetryConfig('WEBSOCKET').maxAttempts;
    this.reconnectDelay = TimeoutConfig.getTimeout('WEBSOCKET', 'RECONNECT_DELAY');
    this.eventListeners = new Map();
    this.connectionPromise = null;
  }

  connect() {
    // GLOBAL AUTH CHECK - prevent connection if not authenticated
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      logger.info('🔐 WebSocketService: User not authenticated, skipping connection');
      return Promise.reject(new Error('User not authenticated'));
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // SECURITY: Check authentication before connecting
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          logger.info('🔐 WebSocketService: User not authenticated, skipping connection');
          reject(new Error('User not authenticated'));
          return;
        }

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // Extract authentication token from cookies
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        
        const accessToken = getCookie('accessToken');
        if (!accessToken) {
          logger.error('🔐 WebSocketService: No access token found in cookies');
          reject(new Error('No access token found'));
          return;
        }
        
        const wsUrl = `${protocol}//${location.host}/ws?token=${encodeURIComponent(accessToken)}`;
        
        logger.info('🔌 WebSocketService: Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          logger.info('✅ WebSocketService: Connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Authentication token passed via query parameter
          logger.debug('🔐 WebSocketService: Authentication token included in connection');
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            // Handle both JSON and binary messages
            if (event.data instanceof Blob) {
              // Handle binary data (frames)
              this.handleBinaryMessage(event.data);
            } else {
              // Handle JSON messages
              const message = JSON.parse(event.data);
              this.handleMessage(message);
            }
          } catch (error) {
            logger.error('❌ WebSocketService: Failed to parse message:', error);
          }
        };

        this.ws.onclose = (event) => {
          logger.info('🔌 WebSocketService: Disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.connectionPromise = null;
          
          // Handle authentication failure
          if (event.code === 1008) {
            logger.info('🔐 WebSocketService: Authentication failed, logging out');
            const { logout } = useAuthStore.getState();
            logout();
            return;
          }
          
          // Attempt reconnection with exponential backoff
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = TimeoutConfig.getRetryDelay(this.reconnectAttempts, 'WEBSOCKET');
            logger.debug(`🔄 WebSocketService: Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
            setTimeout(() => this.connect(), delay);
          } else {
            logger.error('❌ WebSocketService: Max reconnection attempts reached');
          }
        };

        this.ws.onerror = (error) => {
          logger.error('❌ WebSocketService: Error:', error);
          this.connectionPromise = null;
          reject(error);
        };

      } catch (error) {
        logger.error('❌ WebSocketService: Failed to create WebSocket:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
  }

  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('⚠️ WebSocketService: Cannot send message, not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('❌ WebSocketService: Failed to send message:', error);
      return false;
    }
  }

  handleMessage(message) {
    const { event, data, timestamp, type, topic } = message;
    
    logger.info('📨 WebSocketService: Received message:', event || type, data);
    
    // Handle topic messages for streaming
    if (type === 'topic' && topic) {
      this.handleTopicMessage(topic, data);
      return;
    }
    
    // Handle frame messages
    if (type === 'frame') {
      this.handleFrameMessage(data);
      return;
    }
    
    // Emit to registered listeners
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data, timestamp);
        } catch (error) {
          logger.error('❌ WebSocketService: Error in event listener:', error);
        }
      });
    }
  }

  handleBinaryMessage(blob) {
    try {
      // Convert blob to base64 for processing
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(',')[1]; // Remove data URL prefix
        this.handleFrameMessage({
          data: base64Data,
          format: 'webp', // Default format for binary data
          timestamp: Date.now()
        });
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      logger.error('❌ WebSocketService: Failed to handle binary message:', error);
    }
  }

  handleTopicMessage(topic, data) {
    logger.info('📨 WebSocketService: Received topic message:', topic);
    
    // Emit topic-specific events
    if (this.eventListeners.has(topic)) {
      this.eventListeners.get(topic).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error('❌ WebSocketService: Error in topic listener:', error);
        }
      });
    }
    
    // Also emit generic 'topic' event for StreamingService
    if (this.eventListeners.has('topic')) {
      this.eventListeners.get('topic').forEach(callback => {
        try {
          callback({ topic, data });
        } catch (error) {
          logger.error('❌ WebSocketService: Error in topic listener:', error);
        }
      });
    }
  }

  handleFrameMessage(frameData) {
    logger.info('📨 WebSocketService: Received frame message:', frameData.frameNumber);
    
    // Emit frame events
    if (this.eventListeners.has('frame')) {
      this.eventListeners.get('frame').forEach(callback => {
        try {
          callback(frameData);
        } catch (error) {
          logger.error('❌ WebSocketService: Error in frame listener:', error);
        }
      });
    }
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  // Convenience methods for common events
  onChatUpdate(callback) {
    this.on('chatUpdate', callback);
  }

  onIDEStateChange(callback) {
    this.on('ideStateChange', callback);
  }

  onUserAppUrl(callback) {
    this.on('userAppUrl', callback);
  }

  onActiveIDEChanged(callback) {
    this.on('activeIDEChanged', callback);
  }

  // Send specific message types
  sendChatMessage(message, sessionId) {
    return this.send({
      type: 'chat-message',
      message,
      sessionId
    });
  }

  sendIDEConnect() {
    return this.send({
      type: 'connect-ide'
    });
  }

  sendIDERefresh() {
    return this.send({
      type: 'refresh-ide'
    });
  }

  sendIDESwitch(port) {
    return this.send({
      type: 'switch-ide',
      payload: { port: parseInt(port) }
    });
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService; 