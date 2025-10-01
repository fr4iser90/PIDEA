import { logger } from "@/infrastructure/logging/Logger";

/**
 * NetworkMonitor - Network quality assessment and adaptive refresh
 * Monitors network conditions to optimize refresh frequency
 */
export class NetworkMonitor {
  constructor() {
    this.connectionQuality = 'unknown';
    this.connectionSpeed = 0;
    this.connectionType = 'unknown';
    this.isOnline = true;
    this.lastCheck = Date.now();
    
    this.eventListeners = new Map();
    this.qualityThresholds = {
      excellent: 1000,  // > 1 Mbps
      good: 500,        // > 500 Kbps
      fair: 100,        // > 100 Kbps
      poor: 50,          // > 50 Kbps
      'very-poor': 0      // < 50 Kbps
    };
    
    // Network statistics
    this.stats = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageSpeed: 0,
      qualityChanges: 0,
      startTime: Date.now()
    };
    
    this.isInitialized = false;
    this.checkInterval = null;
    this.speedTestInterval = 30000; // 30 seconds
  }

  /**
   * Initialize the network monitor
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('NetworkMonitor already initialized');
      return;
    }

    try {
      logger.info('🔄 Initializing NetworkMonitor...');
      
      // Set up network detection
      this.setupNetworkDetection();
      
      // Perform initial network check
      await this.checkNetworkQuality();
      
      // Start periodic monitoring
      this.startPeriodicMonitoring();
      
      this.isInitialized = true;
      logger.info('✅ NetworkMonitor initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize NetworkMonitor:', error);
      throw error;
    }
  }

  /**
   * Set up network detection
   */
  setupNetworkDetection() {
    if (typeof navigator === 'undefined') {
      logger.warn('Navigator object not available, network monitoring disabled');
      return;
    }

    // Online/offline detection
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Connection change detection (if available)
    if (navigator.connection) {
      navigator.connection.addEventListener('change', this.handleConnectionChange.bind(this));
      this.updateConnectionInfo();
    }

    logger.info('🌐 Network detection set up');
  }

  /**
   * Start periodic network monitoring
   */
  startPeriodicMonitoring() {
    this.checkInterval = setInterval(async () => {
      await this.checkNetworkQuality();
    }, this.speedTestInterval);

    logger.info('⏰ Periodic network monitoring started');
  }

  /**
   * Check network quality
   */
  async checkNetworkQuality() {
    try {
      this.stats.totalChecks++;
      this.lastCheck = Date.now();
      
      // Update connection info
      this.updateConnectionInfo();
      
      // Perform speed test
      const speed = await this.performSpeedTest();
      
      if (speed !== null) {
        this.connectionSpeed = speed;
        this.updateConnectionQuality();
        this.stats.successfulChecks++;
        
        // Update average speed
        this.updateAverageSpeed();
        
        logger.debug(`🌐 Network quality check: ${this.connectionQuality} (${speed} Kbps)`);
      } else {
        this.stats.failedChecks++;
        logger.warn('🌐 Network quality check failed');
      }
      
    } catch (error) {
      this.stats.failedChecks++;
      logger.error('❌ Network quality check error:', error);
    }
  }

  /**
   * Update connection information
   */
  updateConnectionInfo() {
    if (typeof navigator === 'undefined' || !navigator.connection) {
      return;
    }

    const connection = navigator.connection;
    
    // Update connection type
    if (connection.effectiveType) {
      this.connectionType = connection.effectiveType;
    }
    
    // Update connection speed if available
    if (connection.downlink) {
      this.connectionSpeed = connection.downlink * 1000; // Convert to Kbps
      this.updateConnectionQuality();
    }
    
    logger.debug(`🌐 Connection info: ${this.connectionType}, ${this.connectionSpeed} Kbps`);
  }

  /**
   * Perform speed test
   * @returns {Promise<number|null>} Speed in Kbps or null if failed
   */
  async performSpeedTest() {
    try {
      const startTime = Date.now();
      
      // Simple speed test using a small image
      const testImageUrl = '/api/health-check'; // Use existing endpoint
      const response = await fetch(testImageUrl, {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        return null;
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Estimate speed based on response time
      // This is a rough estimation
      const estimatedSpeed = this.estimateSpeedFromLatency(duration);
      
      return estimatedSpeed;
      
    } catch (error) {
      logger.error('Speed test failed:', error);
      return null;
    }
  }

  /**
   * Estimate speed from latency
   * @param {number} latency - Latency in milliseconds
   * @returns {number} Estimated speed in Kbps
   */
  estimateSpeedFromLatency(latency) {
    // Rough estimation based on latency
    if (latency < 50) return 1000;      // Excellent
    if (latency < 100) return 500;     // Good
    if (latency < 200) return 200;      // Fair
    if (latency < 500) return 100;     // Poor
    return 50;                         // Very poor
  }

  /**
   * Update connection quality based on speed
   */
  updateConnectionQuality() {
    const previousQuality = this.connectionQuality;
    
    if (this.connectionSpeed >= this.qualityThresholds.excellent) {
      this.connectionQuality = 'excellent';
    } else if (this.connectionSpeed >= this.qualityThresholds.good) {
      this.connectionQuality = 'good';
    } else if (this.connectionSpeed >= this.qualityThresholds.fair) {
      this.connectionQuality = 'fair';
    } else if (this.connectionSpeed >= this.qualityThresholds.poor) {
      this.connectionQuality = 'poor';
    } else {
      this.connectionQuality = 'very-poor';
    }
    
    // Emit quality change event if changed
    if (previousQuality !== this.connectionQuality) {
      this.stats.qualityChanges++;
      this.emit('network-changed', {
        quality: this.connectionQuality,
        speed: this.connectionSpeed,
        type: this.connectionType,
        previousQuality
      });
      
      logger.info(`🌐 Network quality changed: ${previousQuality} → ${this.connectionQuality}`);
    }
  }

  /**
   * Update average speed
   */
  updateAverageSpeed() {
    const totalSpeed = this.stats.averageSpeed * (this.stats.successfulChecks - 1) + this.connectionSpeed;
    this.stats.averageSpeed = totalSpeed / this.stats.successfulChecks;
  }

  /**
   * Handle online event
   */
  handleOnline() {
    this.isOnline = true;
    logger.info('🌐 Network connection restored');
    
    this.emit('network-online', {
      timestamp: Date.now()
    });
    
    // Check network quality immediately
    this.checkNetworkQuality();
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    this.isOnline = false;
    this.connectionQuality = 'offline';
    logger.warn('🌐 Network connection lost');
    
    this.emit('network-offline', {
      timestamp: Date.now()
    });
  }

  /**
   * Handle connection change event
   */
  handleConnectionChange() {
    logger.info('🌐 Connection changed');
    
    this.updateConnectionInfo();
    
    this.emit('connection-changed', {
      type: this.connectionType,
      speed: this.connectionSpeed,
      quality: this.connectionQuality,
      timestamp: Date.now()
    });
  }

  /**
   * Get network multiplier for refresh intervals
   * @returns {number} Multiplier (1.0 = normal, >1.0 = slower, <1.0 = faster)
   */
  getNetworkMultiplier() {
    switch (this.connectionQuality) {
      case 'excellent':
        return 0.5;  // Refresh faster
      case 'good':
        return 0.8;   // Slightly faster
      case 'fair':
        return 1.0;   // Normal speed
      case 'poor':
        return 1.5;   // Slower
      case 'very-poor':
        return 2.0;   // Much slower
      case 'offline':
        return 10.0;  // Very slow (fallback mode)
      default:
        return 1.0;   // Default normal speed
    }
  }

  /**
   * Check if network is suitable for real-time updates
   * @returns {boolean} Whether network is suitable
   */
  isSuitableForRealTime() {
    return this.isOnline && 
           this.connectionQuality !== 'very-poor' && 
           this.connectionQuality !== 'offline';
  }

  /**
   * Get recommended refresh interval for component
   * @param {number} baseInterval - Base interval in milliseconds
   * @param {string} componentType - Type of component
   * @returns {number} Recommended interval
   */
  getRecommendedInterval(baseInterval, componentType) {
    const multiplier = this.getNetworkMultiplier();
    
    // Apply component-specific adjustments
    const componentMultipliers = {
      git: 1.0,        // Git updates are important
      queue: 0.8,      // Queue updates are critical
      analysis: 1.5,   // Analysis updates can be slower
      ide: 1.0,        // IDE updates are important
      terminal: 0.6,   // Terminal updates are critical
      auth: 2.0        // Auth updates can be slower
    };
    
    const componentMultiplier = componentMultipliers[componentType] || 1.0;
    const adjustedMultiplier = multiplier * componentMultiplier;
    
    return Math.max(baseInterval * adjustedMultiplier, 1000); // Minimum 1 second
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
   * Emit event to listeners
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
          logger.error(`❌ Error in network event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Get network statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const successRate = this.stats.totalChecks > 0 
      ? (this.stats.successfulChecks / this.stats.totalChecks) * 100 
      : 0;

    return {
      ...this.stats,
      uptime,
      successRate,
      connectionQuality: this.connectionQuality,
      connectionSpeed: this.connectionSpeed,
      connectionType: this.connectionType,
      isOnline: this.isOnline,
      networkMultiplier: this.getNetworkMultiplier(),
      suitableForRealTime: this.isSuitableForRealTime(),
      lastCheck: this.lastCheck
    };
  }

  /**
   * Set speed test interval
   * @param {number} interval - Interval in milliseconds
   */
  setSpeedTestInterval(interval) {
    this.speedTestInterval = interval;
    
    // Restart monitoring with new interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.startPeriodicMonitoring();
    }
    
    logger.info(`⏰ Speed test interval set to ${interval}ms`);
  }

  /**
   * Set quality thresholds
   * @param {Object} thresholds - Quality thresholds
   */
  setQualityThresholds(thresholds) {
    this.qualityThresholds = { ...this.qualityThresholds, ...thresholds };
    this.updateConnectionQuality();
    logger.info('🌐 Quality thresholds updated');
  }

  /**
   * Force network quality check
   */
  async forceCheck() {
    logger.info('🌐 Forcing network quality check');
    await this.checkNetworkQuality();
  }

  /**
   * Destroy network monitor
   */
  destroy() {
    // Clear interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', this.handleConnectionChange);
      }
    }
    
    // Clear listeners
    this.eventListeners.clear();
    
    this.isInitialized = false;
    logger.info('🧹 NetworkMonitor destroyed');
  }
}
