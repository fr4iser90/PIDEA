/**
 * AutoFinishService - Frontend service for auto-finish system integration
 * Handles API calls, WebSocket communication, and state management
 */
class AutoFinishService {
  constructor() {
    this.baseUrl = '/api/auto-finish';
    this.webSocket = null;
    this.eventListeners = new Map();
    this.isConnected = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      console.log('[AutoFinishService] Initializing...');
      
      // Test connection
      await this.healthCheck();
      
      // Setup WebSocket connection
      this.setupWebSocket();
      
      console.log('[AutoFinishService] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[AutoFinishService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup WebSocket connection
   */
  setupWebSocket() {
    try {
      // Use existing WebSocket connection if available
      if (window.autoFinishWebSocket) {
        this.webSocket = window.autoFinishWebSocket;
        this.isConnected = true;
        console.log('[AutoFinishService] Using existing WebSocket connection');
        return;
      }

      // Create new WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.webSocket = new WebSocket(wsUrl);
      
      this.webSocket.onopen = () => {
        this.isConnected = true;
        console.log('[AutoFinishService] WebSocket connected');
        this.emit('connected');
      };
      
      this.webSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('[AutoFinishService] Failed to parse WebSocket message:', error);
        }
      };
      
      this.webSocket.onclose = () => {
        this.isConnected = false;
        console.log('[AutoFinishService] WebSocket disconnected');
        this.emit('disconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          this.setupWebSocket();
        }, 5000);
      };
      
      this.webSocket.onerror = (error) => {
        console.error('[AutoFinishService] WebSocket error:', error);
        this.emit('error', error);
      };
      
      // Store globally for other components to use
      window.autoFinishWebSocket = this.webSocket;
      
    } catch (error) {
      console.error('[AutoFinishService] Failed to setup WebSocket:', error);
    }
  }

  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(data) {
    const { event, ...eventData } = data;
    
    if (event === 'auto-finish-progress') {
      this.emit('progress', eventData);
      
      // Also emit as custom event for components
      const customEvent = new CustomEvent('auto-finish-progress', {
        detail: eventData
      });
      window.dispatchEvent(customEvent);
    }
  }

  /**
   * Process TODO list
   * @param {string} todoInput - TODO input text
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processTodoList(todoInput, options = {}) {
    try {
      console.log('[AutoFinishService] Processing TODO list...');
      
      const response = await fetch(`${this.baseUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          todoInput,
          options
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to process TODO list');
      }
      
      console.log('[AutoFinishService] TODO list processing started:', data.sessionId);
      
      return data;
      
    } catch (error) {
      console.error('[AutoFinishService] Failed to process TODO list:', error);
      throw error;
    }
  }

  /**
   * Get session status
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session data
   */
  async getSessionStatus(sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get session status');
      }
      
      return data.session;
      
    } catch (error) {
      console.error('[AutoFinishService] Failed to get session status:', error);
      throw error;
    }
  }

  /**
   * Get user sessions
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of sessions
   */
  async getUserSessions(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      if (options.status) params.append('status', options.status);
      
      const response = await fetch(`${this.baseUrl}/sessions?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get user sessions');
      }
      
      return data.sessions;
      
    } catch (error) {
      console.error('[AutoFinishService] Failed to get user sessions:', error);
      throw error;
    }
  }

  /**
   * Get project sessions
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of sessions
   */
  async getProjectSessions(projectId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      if (options.status) params.append('status', options.status);
      
      const response = await fetch(`/api/projects/${projectId}/auto-finish/sessions?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get project sessions');
      }
      
      return data.sessions;
      
    } catch (error) {
      console.error('[AutoFinishService] Failed to get project sessions:', error);
      throw error;
    }
  }

  /**
   * Cancel session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelSession(sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel session');
      }
      
      console.log('[AutoFinishService] Session cancelled:', sessionId);
      
      return data;
      
    } catch (error) {
      console.error('[AutoFinishService] Failed to cancel session:', error);
      throw error;
    }
  }

  /**
   * Get system statistics
   * @returns {Promise<Object>} System stats
   */
  async getSystemStats() {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get system stats');
      }
      
      return data.stats;
      
    } catch (error) {
      console.error('[AutoFinishService] Failed to get system stats:', error);
      throw error;
    }
  }

  /**
   * Get supported patterns
   * @returns {Promise<Array>} Array of patterns
   */
  async getSupportedPatterns() {
    try {
      const response = await fetch(`${this.baseUrl}/patterns`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get supported patterns');
      }
      
      return data.patterns;
      
    } catch (error) {
      console.error('[AutoFinishService] Failed to get supported patterns:', error);
      throw error;
    }
  }

  /**
   * Get task type keywords
   * @returns {Promise<Object>} Task type keywords
   */
  async getTaskTypeKeywords() {
    try {
      const response = await fetch(`${this.baseUrl}/task-types`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get task type keywords');
      }
      
      return data.taskTypes;
      
    } catch (error) {
      console.error('[AutoFinishService] Failed to get task type keywords:', error);
      throw error;
    }
  }

  /**
   * Health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Health check failed');
      }
      
      return data.health;
      
    } catch (error) {
      console.error('[AutoFinishService] Health check failed:', error);
      throw error;
    }
  }

  /**
   * Subscribe to progress updates
   * @param {string} sessionId - Session ID to watch
   * @param {Function} callback - Progress callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToProgress(sessionId, callback) {
    const eventHandler = (event) => {
      const { sessionId: updateSessionId } = event.detail;
      if (updateSessionId === sessionId) {
        callback(event.detail);
      }
    };
    
    window.addEventListener('auto-finish-progress', eventHandler);
    
    // Return unsubscribe function
    return () => {
      window.removeEventListener('auto-finish-progress', eventHandler);
    };
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[AutoFinishService] Event callback error:', error);
        }
      });
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      webSocket: !!this.webSocket,
      eventListeners: this.eventListeners.size
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log('[AutoFinishService] Cleaning up...');
    
    // Close WebSocket connection
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
    
    // Clear event listeners
    this.eventListeners.clear();
    
    // Remove global reference
    if (window.autoFinishWebSocket === this.webSocket) {
      delete window.autoFinishWebSocket;
    }
    
    this.isConnected = false;
  }
}

// Create singleton instance
const autoFinishService = new AutoFinishService();

export default autoFinishService; 