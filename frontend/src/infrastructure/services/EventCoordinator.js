import { logger } from "@/infrastructure/logging/Logger";

/**
 * EventCoordinator - WebSocket event handling and coordination
 * Manages event-driven refresh coordination between frontend and backend
 */
export class EventCoordinator {
  constructor(webSocketService) {
    this.webSocketService = webSocketService;
    this.eventListeners = new Map();
    this.isInitialized = false;
    
    // Event statistics
    this.stats = {
      eventsReceived: 0,
      eventsProcessed: 0,
      eventsFailed: 0,
      listenersRegistered: 0,
      startTime: Date.now()
    };
    
    // Event types for refresh coordination
    this.eventTypes = {
      // Data change events
      'data:git:changed': 'Git repository state changed',
      'data:queue:updated': 'Queue status updated',
      'data:analysis:completed': 'Analysis completed',
      'data:ide:state-changed': 'IDE state changed',
      'data:terminal:output': 'Terminal output updated',
      'data:auth:session-changed': 'Authentication session changed',
      
      // Cache events
      'cache:invalidate': 'Cache invalidation required',
      'cache:refresh': 'Force refresh data',
      'cache:preload': 'Preload data for component',
      
      // System events
      'system:user-active': 'User became active',
      'system:user-inactive': 'User became inactive',
      'system:network-changed': 'Network quality changed',
      'system:tab-visible': 'Tab became visible',
      'system:tab-hidden': 'Tab became hidden',
      
      // Component events
      'component:registered': 'Component registered for refresh',
      'component:unregistered': 'Component unregistered from refresh',
      'component:refresh-requested': 'Component requested refresh',
      'component:refresh-completed': 'Component refresh completed',
      'component:refresh-failed': 'Component refresh failed'
    };
  }

  /**
   * Initialize the event coordinator
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('EventCoordinator already initialized');
      return;
    }

    try {
      logger.info('🔄 Initializing EventCoordinator...');
      
      if (!this.webSocketService) {
        logger.warn('WebSocket service not available, using local events only');
        this.isInitialized = true;
        return;
      }
      
      // Set up WebSocket event listeners
      this.setupWebSocketListeners();
      
      // Set up local event system
      this.setupLocalEventSystem();
      
      this.isInitialized = true;
      logger.info('✅ EventCoordinator initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize EventCoordinator:', error);
      throw error;
    }
  }

  /**
   * Set up WebSocket event listeners
   */
  setupWebSocketListeners() {
    if (!this.webSocketService) {
      return;
    }

    // Listen for all refresh-related events
    Object.keys(this.eventTypes).forEach(eventType => {
      this.webSocketService.on(eventType, (data) => {
        this.handleWebSocketEvent(eventType, data);
      });
    });

    // Listen for generic refresh events
    this.webSocketService.on('refresh-event', (data) => {
      this.handleGenericRefreshEvent(data);
    });

    // Listen for connection events
    this.webSocketService.on('connection-established', () => {
      this.handleConnectionEstablished();
    });

    this.webSocketService.on('disconnect', () => {
      this.handleConnectionLost();
    });

    logger.info('📡 WebSocket event listeners set up');
  }

  /**
   * Set up local event system
   */
  setupLocalEventSystem() {
    // Set up tab visibility detection
    this.setupTabVisibilityDetection();
    
    // Set up page focus detection
    this.setupPageFocusDetection();
    
    logger.info('🏠 Local event system set up');
  }

  /**
   * Set up tab visibility detection
   */
  setupTabVisibilityDetection() {
    if (typeof document === 'undefined') {
      return;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.emit('system:tab-hidden');
      } else {
        this.emit('system:tab-visible');
      }
    });
  }

  /**
   * Set up page focus detection
   */
  setupPageFocusDetection() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('focus', () => {
      this.emit('system:user-active');
    });

    window.addEventListener('blur', () => {
      this.emit('system:user-inactive');
    });
  }

  /**
   * Handle WebSocket event
   * @param {string} eventType - Type of event
   * @param {any} data - Event data
   */
  handleWebSocketEvent(eventType, data) {
    try {
      this.stats.eventsReceived++;
      
      logger.debug(`📨 WebSocket event received: ${eventType}`, data);
      
      // Process the event
      this.processEvent(eventType, data);
      
      this.stats.eventsProcessed++;
      
    } catch (error) {
      logger.error(`❌ Failed to handle WebSocket event ${eventType}:`, error);
      this.stats.eventsFailed++;
    }
  }

  /**
   * Handle generic refresh event
   * @param {Object} data - Event data
   */
  handleGenericRefreshEvent(data) {
    const { type, payload } = data;
    
    if (this.eventTypes[type]) {
      this.handleWebSocketEvent(type, payload);
    } else {
      logger.warn(`Unknown refresh event type: ${type}`);
    }
  }

  /**
   * Handle connection established
   */
  handleConnectionEstablished() {
    logger.info('🔌 WebSocket connection established');
    
    // Emit connection event
    this.emit('system:connection-established');
    
    // Request initial data refresh
    this.emit('cache:refresh', { reason: 'connection-established' });
  }

  /**
   * Handle connection lost
   */
  handleConnectionLost() {
    logger.warn('🔌 WebSocket connection lost');
    
    // Emit connection event
    this.emit('system:connection-lost');
    
    // Fallback to polling mode
    this.emit('system:fallback-to-polling');
  }

  /**
   * Process event
   * @param {string} eventType - Type of event
   * @param {any} data - Event data
   */
  processEvent(eventType, data) {
    // Emit to local listeners
    this.emit(eventType, data);
    
    // Handle specific event types
    switch (eventType) {
      case 'data:git:changed':
        this.handleGitDataChange(data);
        break;
      case 'data:queue:updated':
        this.handleQueueDataUpdate(data);
        break;
      case 'data:analysis:completed':
        this.handleAnalysisDataComplete(data);
        break;
      case 'data:ide:state-changed':
        this.handleIDEStateChange(data);
        break;
      case 'data:terminal:output':
        this.handleTerminalOutput(data);
        break;
      case 'data:auth:session-changed':
        this.handleAuthSessionChange(data);
        break;
      case 'cache:invalidate':
        this.handleCacheInvalidation(data);
        break;
      case 'cache:refresh':
        this.handleCacheRefresh(data);
        break;
      default:
        logger.debug(`No specific handler for event: ${eventType}`);
    }
  }

  /**
   * Handle git data change
   * @param {any} data - Git data
   */
  handleGitDataChange(data) {
    logger.debug('🔄 Git data changed:', data);
    
    // Emit component-specific event
    this.emit('component:refresh-requested', {
      componentType: 'git',
      reason: 'data-changed',
      data
    });
  }

  /**
   * Handle queue data update
   * @param {any} data - Queue data
   */
  handleQueueDataUpdate(data) {
    logger.debug('🔄 Queue data updated:', data);
    
    this.emit('component:refresh-requested', {
      componentType: 'queue',
      reason: 'data-updated',
      data
    });
  }

  /**
   * Handle analysis data complete
   * @param {any} data - Analysis data
   */
  handleAnalysisDataComplete(data) {
    logger.debug('🔄 Analysis data completed:', data);
    
    this.emit('component:refresh-requested', {
      componentType: 'analysis',
      reason: 'analysis-completed',
      data
    });
  }

  /**
   * Handle IDE state change
   * @param {any} data - IDE state data
   */
  handleIDEStateChange(data) {
    logger.debug('🔄 IDE state changed:', data);
    
    this.emit('component:refresh-requested', {
      componentType: 'ide',
      reason: 'state-changed',
      data
    });
  }

  /**
   * Handle terminal output
   * @param {any} data - Terminal output data
   */
  handleTerminalOutput(data) {
    logger.debug('🔄 Terminal output:', data);
    
    this.emit('component:refresh-requested', {
      componentType: 'terminal',
      reason: 'output-updated',
      data
    });
  }

  /**
   * Handle auth session change
   * @param {any} data - Auth session data
   */
  handleAuthSessionChange(data) {
    logger.debug('🔄 Auth session changed:', data);
    
    this.emit('component:refresh-requested', {
      componentType: 'auth',
      reason: 'session-changed',
      data
    });
  }

  /**
   * Handle cache invalidation
   * @param {any} data - Invalidation data
   */
  handleCacheInvalidation(data) {
    logger.debug('🗑️ Cache invalidation:', data);
    
    this.emit('component:refresh-requested', {
      componentType: 'all',
      reason: 'cache-invalidated',
      data
    });
  }

  /**
   * Handle cache refresh
   * @param {any} data - Refresh data
   */
  handleCacheRefresh(data) {
    logger.debug('🔄 Cache refresh requested:', data);
    
    this.emit('component:refresh-requested', {
      componentType: 'all',
      reason: 'force-refresh',
      data
    });
  }

  /**
   * Register event listener
   * @param {string} eventType - Type of event
   * @param {Function} callback - Callback function
   */
  on(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    this.eventListeners.get(eventType).add(callback);
    this.stats.listenersRegistered++;
    
    logger.debug(`📝 Registered listener for event: ${eventType}`);
  }

  /**
   * Unregister event listener
   * @param {string} eventType - Type of event
   * @param {Function} callback - Callback function
   */
  off(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).delete(callback);
      
      if (this.eventListeners.get(eventType).size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }

  /**
   * Emit event to local listeners
   * @param {string} eventType - Type of event
   * @param {any} data - Event data
   */
  emit(eventType, data) {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType);
      
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`❌ Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Send event to backend via WebSocket
   * @param {string} eventType - Type of event
   * @param {any} data - Event data
   */
  send(eventType, data) {
    if (!this.webSocketService || !this.webSocketService.isConnected) {
      logger.warn(`Cannot send event ${eventType}: WebSocket not connected`);
      return;
    }

    try {
      const message = {
        type: 'refresh-event',
        event: eventType,
        data,
        timestamp: Date.now()
      };

      this.webSocketService.send(JSON.stringify(message));
      
      logger.debug(`📤 Sent event to backend: ${eventType}`, data);
      
    } catch (error) {
      logger.error(`❌ Failed to send event ${eventType}:`, error);
    }
  }

  /**
   * Request refresh for specific component
   * @param {string} componentType - Type of component
   * @param {Object} options - Refresh options
   */
  requestRefresh(componentType, options = {}) {
    const data = {
      componentType,
      ...options,
      timestamp: Date.now()
    };

    this.send('component:refresh-requested', data);
    this.emit('component:refresh-requested', data);
  }

  /**
   * Notify component refresh completed
   * @param {string} componentType - Type of component
   * @param {Object} result - Refresh result
   */
  notifyRefreshCompleted(componentType, result) {
    const data = {
      componentType,
      result,
      timestamp: Date.now()
    };

    this.send('component:refresh-completed', data);
    this.emit('component:refresh-completed', data);
  }

  /**
   * Notify component refresh failed
   * @param {string} componentType - Type of component
   * @param {Error} error - Error that occurred
   */
  notifyRefreshFailed(componentType, error) {
    const data = {
      componentType,
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: Date.now()
    };

    this.send('component:refresh-failed', data);
    this.emit('component:refresh-failed', data);
  }

  /**
   * Get event statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const eventRate = uptime > 0 ? (this.stats.eventsReceived / uptime) * 1000 : 0;
    const successRate = this.stats.eventsReceived > 0 
      ? (this.stats.eventsProcessed / this.stats.eventsReceived) * 100 
      : 0;

    return {
      ...this.stats,
      uptime,
      eventRate,
      successRate,
      activeListeners: this.eventListeners.size,
      totalListeners: this.stats.listenersRegistered,
      isConnected: this.webSocketService ? this.webSocketService.isConnected : false
    };
  }

  /**
   * Get available event types
   * @returns {Object} Event types
   */
  getEventTypes() {
    return { ...this.eventTypes };
  }

  /**
   * Destroy event coordinator
   */
  destroy() {
    // Clear all listeners
    this.eventListeners.clear();
    
    // Remove WebSocket listeners
    if (this.webSocketService) {
      Object.keys(this.eventTypes).forEach(eventType => {
        this.webSocketService.off(eventType);
      });
    }
    
    this.isInitialized = false;
    logger.info('🧹 EventCoordinator destroyed');
  }
}
