const { logger } = require('../../infrastructure/logging/Logger');

/**
 * EventEmissionService - Centralized service to emit refresh events
 * Extends existing WebSocket infrastructure with refresh coordination events
 */
class EventEmissionService {
  constructor(dependencies = {}) {
    this.eventBus = dependencies.eventBus;
    this.webSocketManager = dependencies.webSocketManager;
    this.ideManager = dependencies.ideManager;
    this.taskRepository = dependencies.taskRepository;
    this.analysisRepository = dependencies.analysisRepository;
    
    this.isInitialized = false;
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
      'system:tab-hidden': 'Tab became hidden'
    };
    
    // Event statistics
    this.stats = {
      eventsEmitted: 0,
      eventsByType: new Map(),
      startTime: Date.now()
    };
  }

  /**
   * Initialize the event emission service
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('EventEmissionService already initialized');
      return;
    }

    logger.info('🔄 Initializing EventEmissionService...');
    
    // Set up event listeners for data changes
    this.setupDataChangeListeners();
    
    // Set up periodic event emission
    this.setupPeriodicEvents();
    
    this.isInitialized = true;
    logger.info('✅ EventEmissionService initialized successfully');
  }

  /**
   * Set up listeners for data changes
   */
  setupDataChangeListeners() {
    if (!this.eventBus) {
      logger.warn('EventBus not available, data change listeners not set up');
      return;
    }

    // Git events
    this.eventBus.on('git:status-changed', (data) => {
      this.emitDataChange('data:git:changed', data);
    });
    
    this.eventBus.on('git:branch-changed', (data) => {
      this.emitDataChange('data:git:changed', data);
    });
    
    this.eventBus.on('git:commit-created', (data) => {
      this.emitDataChange('data:git:changed', data);
    });

    // Queue events
    this.eventBus.on('queue:task-added', (data) => {
      this.emitDataChange('data:queue:updated', data);
    });
    
    this.eventBus.on('queue:task-removed', (data) => {
      this.emitDataChange('data:queue:updated', data);
    });
    
    this.eventBus.on('queue:task-updated', (data) => {
      this.emitDataChange('data:queue:updated', data);
    });

    // Analysis events
    this.eventBus.on('analysis:completed', (data) => {
      this.emitDataChange('data:analysis:completed', data);
    });
    
    this.eventBus.on('analysis:progress', (data) => {
      this.emitDataChange('data:analysis:completed', data);
    });

    // IDE events
    this.eventBus.on('ide-started', (data) => {
      this.emitDataChange('data:ide:state-changed', data);
    });
    
    this.eventBus.on('ide-stopped', (data) => {
      this.emitDataChange('data:ide:state-changed', data);
    });
    
    this.eventBus.on('ide-state-changed', (data) => {
      this.emitDataChange('data:ide:state-changed', data);
    });

    // Terminal events
    this.eventBus.on('terminal:output', (data) => {
      this.emitDataChange('data:terminal:output', data);
    });

    // Auth events
    this.eventBus.on('auth:session-changed', (data) => {
      this.emitDataChange('data:auth:session-changed', data);
    });
    
    this.eventBus.on('auth:login', (data) => {
      this.emitDataChange('data:auth:session-changed', data);
    });
    
    this.eventBus.on('auth:logout', (data) => {
      this.emitDataChange('data:auth:session-changed', data);
    });
    
    this.eventBus.on('auth:session-expired', (data) => {
      this.emitDataChange('data:auth:session-changed', data);
    });

    logger.info('📡 Data change listeners set up');
  }

  /**
   * Set up periodic event emission
   */
  setupPeriodicEvents() {
    // Emit system status every 30 seconds
    setInterval(() => {
      this.emitSystemStatus();
    }, 30000);

    // Emit cache invalidation events every 5 minutes
    setInterval(() => {
      this.emitCacheInvalidation();
    }, 5 * 60 * 1000);

    logger.info('⏰ Periodic events set up');
  }

  /**
   * Emit data change event
   * @param {string} eventType - Type of event
   * @param {any} data - Event data
   */
  emitDataChange(eventType, data) {
    const eventData = {
      type: eventType,
      data,
      timestamp: Date.now(),
      source: 'backend'
    };

    this.emitEvent(eventType, eventData);
    
    // Also emit generic refresh event
    this.emitEvent('refresh-event', {
      type: eventType,
      payload: data,
      timestamp: Date.now()
    });
  }

  /**
   * Emit system status event
   */
  emitSystemStatus() {
    const systemStatus = {
      timestamp: Date.now(),
      uptime: Date.now() - this.stats.startTime,
      memoryUsage: process.memoryUsage(),
      activeConnections: this.webSocketManager && typeof this.webSocketManager.getConnectionCount === 'function' 
        ? this.webSocketManager.getConnectionCount() 
        : 0,
      activeIDEs: this.ideManager && typeof this.ideManager.getActiveIDECount === 'function' 
        ? this.ideManager.getActiveIDECount() 
        : 0
    };

    this.emitEvent('system:status', systemStatus);
  }

  /**
   * Emit cache invalidation event
   */
  emitCacheInvalidation() {
    const invalidationData = {
      timestamp: Date.now(),
      reason: 'periodic-cleanup',
      affectedComponents: ['all']
    };

    this.emitEvent('cache:invalidate', invalidationData);
  }

  /**
   * Emit event to WebSocket clients
   * @param {string} eventType - Type of event
   * @param {any} data - Event data
   */
  emitEvent(eventType, data) {
    try {
      // Update statistics
      this.stats.eventsEmitted++;
      const count = this.stats.eventsByType.get(eventType) || 0;
      this.stats.eventsByType.set(eventType, count + 1);

      // Emit via WebSocket if available
      if (this.webSocketManager && typeof this.webSocketManager.broadcastToAll === 'function') {
        this.webSocketManager.broadcastToAll(eventType, data);
      }

      // Emit via EventBus if available
      if (this.eventBus && typeof this.eventBus.emit === 'function') {
        this.eventBus.emit(eventType, data);
      }

      logger.debug(`📤 Emitted event: ${eventType}`, data);

    } catch (error) {
      logger.error(`❌ Failed to emit event ${eventType}:`, error?.message || error || 'Unknown error');
    }
  }

  /**
   * Emit event to specific user
   * @param {string} userId - User ID
   * @param {string} eventType - Type of event
   * @param {any} data - Event data
   */
  emitEventToUser(userId, eventType, data) {
    try {
      if (this.webSocketManager) {
        this.webSocketManager.broadcastToUser(userId, eventType, data);
      }

      logger.debug(`📤 Emitted event to user ${userId}: ${eventType}`, data);

    } catch (error) {
      logger.error(`❌ Failed to emit event to user ${userId}:`, error);
    }
  }

  /**
   * Emit cache invalidation for specific component
   * @param {string} componentType - Type of component
   * @param {string} reason - Reason for invalidation
   */
  emitCacheInvalidationForComponent(componentType, reason = 'manual') {
    const invalidationData = {
      componentType,
      reason,
      timestamp: Date.now()
    };

    this.emitEvent('cache:invalidate', invalidationData);
  }

  /**
   * Emit force refresh for specific component
   * @param {string} componentType - Type of component
   * @param {string} reason - Reason for refresh
   */
  emitForceRefreshForComponent(componentType, reason = 'manual') {
    const refreshData = {
      componentType,
      reason,
      timestamp: Date.now()
    };

    this.emitEvent('cache:refresh', refreshData);
  }

  /**
   * Emit preload event for component
   * @param {string} componentType - Type of component
   * @param {any} data - Data to preload
   */
  emitPreloadForComponent(componentType, data) {
    const preloadData = {
      componentType,
      data,
      timestamp: Date.now()
    };

    this.emitEvent('cache:preload', preloadData);
  }

  /**
   * Emit user activity event
   * @param {string} userId - User ID
   * @param {string} activity - Activity type (active/inactive)
   */
  emitUserActivity(userId, activity) {
    const activityData = {
      userId,
      activity,
      timestamp: Date.now()
    };

    this.emitEventToUser(userId, `system:user-${activity}`, activityData);
  }

  /**
   * Emit network change event
   * @param {string} userId - User ID
   * @param {Object} networkData - Network information
   */
  emitNetworkChange(userId, networkData) {
    const eventData = {
      userId,
      ...networkData,
      timestamp: Date.now()
    };

    this.emitEventToUser(userId, 'system:network-changed', eventData);
  }

  /**
   * Emit tab visibility event
   * @param {string} userId - User ID
   * @param {string} visibility - Visibility state (visible/hidden)
   */
  emitTabVisibility(userId, visibility) {
    const visibilityData = {
      userId,
      visibility,
      timestamp: Date.now()
    };

    this.emitEventToUser(userId, `system:tab-${visibility}`, visibilityData);
  }

  /**
   * Get event statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const eventsByType = Object.fromEntries(this.stats.eventsByType);

    return {
      ...this.stats,
      uptime,
      eventsByType,
      isInitialized: this.isInitialized
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
   * Destroy event emission service
   */
  destroy() {
    this.isInitialized = false;
    logger.info('🧹 EventEmissionService destroyed');
  }
}

module.exports = EventEmissionService;
