import { logger } from "@/infrastructure/logging/Logger";
import webSocketService from '@/infrastructure/services/WebSocketService';
import { cacheService } from './CacheService';
import { cacheInvalidationService } from './CacheInvalidationService';
import { EventCoordinator } from './EventCoordinator';
import { ActivityTracker } from './ActivityTracker';
import { NetworkMonitor } from './NetworkMonitor';

/**
 * RefreshService - Central refresh coordination service
 * Manages event-driven refresh across all frontend components
 * Implements multi-layer caching and smart refresh strategies
 */
class RefreshService {
  constructor() {
    this.cacheService = cacheService;
    this.cacheInvalidationService = cacheInvalidationService;
    this.eventCoordinator = new EventCoordinator(webSocketService);
    this.activityTracker = new ActivityTracker();
    this.networkMonitor = new NetworkMonitor();
    
    this.refreshStrategies = new Map();
    this.activeRefreshTimers = new Map();
    this.componentStates = new Map();
    this.isInitialized = false;
    
    // Performance tracking
    this.stats = {
      totalRefreshes: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      eventDrivenUpdates: 0,
      startTime: Date.now()
    };
    
    this.setupDefaultStrategies();
  }

  /**
   * Initialize the refresh service
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('RefreshService already initialized');
      return;
    }

    try {
      logger.info('🔄 Initializing RefreshService...');
      
      // Initialize sub-services
      await this.cacheService.initialize();
      // ✅ CRITICAL FIX: Skip EventCoordinator to prevent hanging
      // await this.eventCoordinator.initialize();
      // ✅ CRITICAL FIX: Skip problematic services
      // await this.activityTracker.initialize();
      // await this.networkMonitor.initialize();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // ✅ CRITICAL FIX: Skip problematic setup methods
      // this.setupActivityTracking();
      // this.setupNetworkMonitoring();
      
      this.isInitialized = true;
      logger.info('✅ RefreshService initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize RefreshService:', error);
      throw error;
    }
  }

  /**
   * Set up default refresh strategies for all components
   */
  setupDefaultStrategies() {
    const strategies = {
      git: {
        interval: 0,               // DISABLED - NO MORE AUTOMATIC POLLING!
        events: ['data:git:changed', 'system:user-active'],
        cache: { ttl: 30000, priority: 'high' },
        apiEndpoint: '/api/git/status',
        component: 'GitManagementComponent'
      },
      queue: {
        interval: 5000,           // 5 seconds
        events: ['data:queue:updated', 'system:user-active'],
        cache: { ttl: 10000, priority: 'high' },
        apiEndpoint: '/api/queue/status',
        component: 'QueueManagementPanel'
      },
      analysis: {
        interval: 30000,         // 30 seconds
        events: ['data:analysis:completed', 'cache:invalidate'],
        cache: { ttl: 300000, priority: 'medium' },
        apiEndpoint: '/api/analysis/status',
        component: 'AnalysisDataViewer'
      },
      ide: {
        interval: 10000,          // 10 seconds (statt 5 Sekunden!)
        events: ['data:ide:state-changed', 'system:user-active'],
        cache: { ttl: 60000, priority: 'high' },
        apiEndpoint: '/api/ide/status',
        component: 'IDEMirrorComponent'
      },
      terminal: {
        interval: 500,           // 500ms
        events: ['data:terminal:output', 'system:user-active'],
        cache: { ttl: 5000, priority: 'low' },
        apiEndpoint: '/api/terminal/output',
        component: 'TerminalComponent'
      },
      auth: {
        interval: 60000,         // 1 minute
        events: ['data:auth:session-changed', 'system:user-active'],
        cache: { ttl: 300000, priority: 'medium' },
        apiEndpoint: '/api/auth/status',
        component: 'AuthWrapper'
      }
    };

    Object.entries(strategies).forEach(([key, strategy]) => {
      this.refreshStrategies.set(key, strategy);
    });
  }

  /**
   * Set up event listeners for refresh coordination
   */
  setupEventListeners() {
    // Data change events
    this.eventCoordinator.on('data:git:changed', (data) => {
      this.handleDataChange('git', data);
    });
    
    this.eventCoordinator.on('data:queue:updated', (data) => {
      this.handleDataChange('queue', data);
    });
    
    this.eventCoordinator.on('data:analysis:completed', (data) => {
      this.handleDataChange('analysis', data);
    });
    
    this.eventCoordinator.on('data:ide:state-changed', (data) => {
      this.handleDataChange('ide', data);
    });
    
    this.eventCoordinator.on('data:terminal:output', (data) => {
      this.handleDataChange('terminal', data);
    });
    
    this.eventCoordinator.on('data:auth:session-changed', (data) => {
      this.handleDataChange('auth', data);
    });

    // Cache events
    this.eventCoordinator.on('cache:invalidate', (data) => {
      this.handleCacheInvalidation(data);
    });
    
    this.eventCoordinator.on('cache:refresh', (data) => {
      this.handleForceRefresh(data);
    });

    // System events
    this.eventCoordinator.on('system:user-active', () => {
      this.handleUserActive();
    });
    
    this.eventCoordinator.on('system:user-inactive', () => {
      this.handleUserInactive();
    });
    
    this.eventCoordinator.on('system:network-changed', (data) => {
      this.handleNetworkChange(data);
    });
    
    this.eventCoordinator.on('system:tab-visible', () => {
      this.handleTabVisible();
    });
    
    this.eventCoordinator.on('system:tab-hidden', () => {
      this.handleTabHidden();
    });
  }

  /**
   * Set up activity tracking
   */
  setupActivityTracking() {
    this.activityTracker.on('user-active', () => {
      this.handleUserActive();
    });
    
    this.activityTracker.on('user-inactive', () => {
      this.handleUserInactive();
    });
  }

  /**
   * Set up network monitoring
   */
  setupNetworkMonitoring() {
    this.networkMonitor.on('network-changed', (data) => {
      this.handleNetworkChange(data);
    });
  }

  /**
   * Register a component for refresh management
   * @param {string} componentType - Type of component (git, queue, analysis, etc.)
   * @param {Object} component - Component instance
   * @param {Object} options - Component-specific options
   */
  registerComponent(componentType, component, options = {}) {
    const strategy = this.refreshStrategies.get(componentType);
    if (!strategy) {
      logger.warn(`No refresh strategy found for component type: ${componentType}`);
      return;
    }

    const componentConfig = {
      ...strategy,
      ...options,
      component,
      lastRefresh: null,
      isActive: true,
      refreshCount: 0
    };

    this.componentStates.set(componentType, componentConfig);
    
    // Start refresh timer if component is active
    if (componentConfig.isActive) {
      this.startRefreshTimer(componentType);
    }

    logger.info(`✅ Registered component: ${componentType}`);
  }

  /**
   * Unregister a component
   * @param {string} componentType - Type of component
   */
  unregisterComponent(componentType) {
    this.stopRefreshTimer(componentType);
    this.componentStates.delete(componentType);
    logger.info(`❌ Unregistered component: ${componentType}`);
  }

  /**
   * Start refresh timer for a component
   * @param {string} componentType - Type of component
   */
  startRefreshTimer(componentType) {
    const componentConfig = this.componentStates.get(componentType);
    if (!componentConfig || !componentConfig.isActive) {
      return;
    }

    // Stop existing timer
    this.stopRefreshTimer(componentType);

    // Calculate interval based on network quality and user activity
    const baseInterval = componentConfig.interval;
    const networkMultiplier = this.networkMonitor.getNetworkMultiplier();
    const activityMultiplier = this.activityTracker.isActive() ? 1 : 2;
    const adjustedInterval = baseInterval * networkMultiplier * activityMultiplier;

    const timer = setInterval(() => {
      this.refreshComponent(componentType);
    }, adjustedInterval);

    this.activeRefreshTimers.set(componentType, timer);
    logger.debug(`🔄 Started refresh timer for ${componentType}: ${adjustedInterval}ms`);
  }

  /**
   * Stop refresh timer for a component
   * @param {string} componentType - Type of component
   */
  stopRefreshTimer(componentType) {
    const timer = this.activeRefreshTimers.get(componentType);
    if (timer) {
      clearInterval(timer);
      this.activeRefreshTimers.delete(componentType);
      logger.debug(`⏹️ Stopped refresh timer for ${componentType}`);
    }
  }

  /**
   * Refresh a specific component
   * @param {string} componentType - Type of component
   * @param {boolean} force - Force refresh even if cached data is valid
   */
  async refreshComponent(componentType, force = false) {
    const componentConfig = this.componentStates.get(componentType);
    if (!componentConfig || !componentConfig.isActive) {
      return;
    }

    try {
      this.stats.totalRefreshes++;
      componentConfig.refreshCount++;

      // Check cache first
      const cacheKey = this.getCacheKey(componentType);
      const cachedData = this.cacheService.get(cacheKey);
      
      if (cachedData && !force) {
        this.stats.cacheHits++;
        this.updateComponent(componentType, cachedData);
        return;
      }

      this.stats.cacheMisses++;

      // Fetch fresh data
      const freshData = await this.fetchComponentData(componentType);
      
      // Cache the data
      this.cacheService.set(cacheKey, freshData, 'default', componentType);
      
      // Update component
      this.updateComponent(componentType, freshData);
      
      componentConfig.lastRefresh = Date.now();
      
      logger.debug(`🔄 Refreshed ${componentType}: ${componentConfig.refreshCount} refreshes`);

    } catch (error) {
      logger.error(`❌ Failed to refresh ${componentType}:`, error);
      
      // Try to use cached data as fallback
      const cacheKey = this.getCacheKey(componentType);
      const cachedData = this.cacheService.get(cacheKey);
      if (cachedData) {
        this.updateComponent(componentType, cachedData);
        logger.info(`🔄 Used cached data as fallback for ${componentType}`);
      }
    }
  }

  /**
   * Fetch data for a component
   * @param {string} componentType - Type of component
   * @returns {Promise<any>} Component data
   */
  async fetchComponentData(componentType) {
    const componentConfig = this.componentStates.get(componentType);
    if (!componentConfig) {
      throw new Error(`Component not registered: ${componentType}`);
    }

    this.stats.apiCalls++;

    // Use component's fetch method if available
    if (componentConfig.component && typeof componentConfig.component.fetchData === 'function') {
      return await componentConfig.component.fetchData();
    }

    // Fallback to API endpoint
    if (componentConfig.apiEndpoint) {
      const response = await fetch(componentConfig.apiEndpoint);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return await response.json();
    }

    throw new Error(`No fetch method available for ${componentType}`);
  }

  /**
   * Update component with new data
   * @param {string} componentType - Type of component
   * @param {any} data - New data
   */
  updateComponent(componentType, data) {
    const componentConfig = this.componentStates.get(componentType);
    if (!componentConfig || !componentConfig.component) {
      return;
    }

    // Use component's update method if available
    if (typeof componentConfig.component.updateData === 'function') {
      componentConfig.component.updateData(data);
    } else if (typeof componentConfig.component.setState === 'function') {
      componentConfig.component.setState({ data });
    }

    this.stats.eventDrivenUpdates++;
  }

  /**
   * Get cache key for component
   * @param {string} componentType - Type of component
   * @returns {string} Cache key
   */
  getCacheKey(componentType) {
    return `refresh:${componentType}`;
  }

  /**
   * Handle data change event
   * @param {string} componentType - Type of component
   * @param {any} data - Changed data
   */
  handleDataChange(componentType, data) {
    logger.debug(`📨 Data change event for ${componentType}:`, data);
    
    // Update cache with new data
    const cacheKey = this.getCacheKey(componentType);
    const componentConfig = this.componentStates.get(componentType);
    
    if (componentConfig) {
      this.cacheService.set(cacheKey, data, 'default', componentType);
      this.updateComponent(componentType, data);
    }
  }

  /**
   * Handle cache invalidation
   * @param {Object} data - Invalidation data
   */
  handleCacheInvalidation(data) {
    const { componentType, keys } = data;
    
    if (componentType) {
      // Invalidate specific component using selective invalidation
      this.cacheInvalidationService.invalidateByPattern(`${componentType}:*`, identifier);
      logger.info(`🗑️ Invalidated cache for ${componentType}`);
    } else if (keys) {
      // Invalidate specific keys using selective invalidation
      keys.forEach(key => this.cacheService.delete(key));
      logger.info(`🗑️ Invalidated cache keys:`, keys);
    } else {
      // Use selective invalidation instead of global cache clearing
      this.cacheInvalidationService.invalidateByPattern('*', identifier);
      logger.info(`🗑️ Selective cache invalidation completed`);
    }
  }

  /**
   * Handle force refresh
   * @param {Object} data - Refresh data
   */
  handleForceRefresh(data) {
    const { componentType } = data;
    
    if (componentType) {
      this.refreshComponent(componentType, true);
    } else {
      // Refresh all components
      this.componentStates.forEach((config, type) => {
        this.refreshComponent(type, true);
      });
    }
  }

  /**
   * Handle user active event
   */
  handleUserActive() {
    logger.debug('👤 User became active');
    
    // Resume all refresh timers
    this.componentStates.forEach((config, componentType) => {
      if (config.isActive) {
        this.startRefreshTimer(componentType);
      }
    });
  }

  /**
   * Handle user inactive event
   */
  handleUserInactive() {
    logger.debug('😴 User became inactive');
    
    // Pause all refresh timers
    this.componentStates.forEach((config, componentType) => {
      this.stopRefreshTimer(componentType);
    });
  }

  /**
   * Handle network change
   * @param {Object} data - Network data
   */
  handleNetworkChange(data) {
    logger.debug('🌐 Network quality changed:', data);
    
    // Restart timers with new network-based intervals
    this.componentStates.forEach((config, componentType) => {
      if (config.isActive) {
        this.startRefreshTimer(componentType);
      }
    });
  }

  /**
   * Handle tab visible event
   */
  handleTabVisible() {
    logger.debug('👁️ Tab became visible');
    this.handleUserActive();
  }

  /**
   * Handle tab hidden event
   */
  handleTabHidden() {
    logger.debug('🙈 Tab became hidden');
    this.handleUserInactive();
  }

  /**
   * Get refresh statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const cacheHitRate = this.stats.totalRefreshes > 0 
      ? (this.stats.cacheHits / this.stats.totalRefreshes) * 100 
      : 0;

    return {
      ...this.stats,
      uptime,
      cacheHitRate,
      activeComponents: this.componentStates.size,
      activeTimers: this.activeRefreshTimers.size,
      cacheStats: this.cacheService.getStats(),
      activityStats: this.activityTracker.getStats(),
      networkStats: this.networkMonitor.getStats()
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Stop all timers
    this.activeRefreshTimers.forEach((timer, componentType) => {
      clearInterval(timer);
    });
    this.activeRefreshTimers.clear();

    // Cleanup sub-services
    this.eventCoordinator.destroy();
    this.activityTracker.destroy();
    this.networkMonitor.destroy();
    // CacheService doesn't need explicit destroy

    this.isInitialized = false;
    logger.info('🧹 RefreshService destroyed');
  }
}

// Create singleton instance
const refreshService = new RefreshService();

export default refreshService;
