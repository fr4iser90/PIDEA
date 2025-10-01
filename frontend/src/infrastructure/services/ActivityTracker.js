import { logger } from "@/infrastructure/logging/Logger";

/**
 * ActivityTracker - User activity monitoring and refresh pausing
 * Tracks user activity to optimize refresh frequency and improve battery life
 */
export class ActivityTracker {
  constructor() {
    this.isActive = true;
    this.lastActivity = Date.now();
    this.inactivityThreshold = 30000; // 30 seconds
    this.activityThreshold = 5000;    // 5 seconds
    
    this.eventListeners = new Map();
    this.activityEvents = new Map();
    
    // Activity statistics
    this.stats = {
      totalActivityEvents: 0,
      activeTime: 0,
      inactiveTime: 0,
      sessionStart: Date.now(),
      lastActiveTime: Date.now(),
      lastInactiveTime: null
    };
    
    this.isInitialized = false;
    this.activityTimer = null;
    this.inactivityTimer = null;
  }

  /**
   * Initialize the activity tracker
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('ActivityTracker already initialized');
      return;
    }

    try {
      logger.info('🔄 Initializing ActivityTracker...');
      
      // Set up activity detection
      this.setupActivityDetection();
      
      // Start activity monitoring
      this.startActivityMonitoring();
      
      this.isInitialized = true;
      logger.info('✅ ActivityTracker initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize ActivityTracker:', error);
      throw error;
    }
  }

  /**
   * Set up activity detection
   */
  setupActivityDetection() {
    if (typeof window === 'undefined') {
      logger.warn('Window object not available, activity tracking disabled');
      return;
    }

    // Mouse events
    this.addActivityEvent('mousemove', this.handleMouseMove.bind(this));
    this.addActivityEvent('mousedown', this.handleMouseDown.bind(this));
    this.addActivityEvent('mouseup', this.handleMouseUp.bind(this));
    this.addActivityEvent('click', this.handleClick.bind(this));
    this.addActivityEvent('scroll', this.handleScroll.bind(this));

    // Keyboard events
    this.addActivityEvent('keydown', this.handleKeyDown.bind(this));
    this.addActivityEvent('keyup', this.handleKeyUp.bind(this));

    // Touch events (for mobile)
    this.addActivityEvent('touchstart', this.handleTouchStart.bind(this));
    this.addActivityEvent('touchmove', this.handleTouchMove.bind(this));
    this.addActivityEvent('touchend', this.handleTouchEnd.bind(this));

    // Focus events
    this.addActivityEvent('focus', this.handleFocus.bind(this));
    this.addActivityEvent('blur', this.handleBlur.bind(this));

    // Page visibility events
    this.addActivityEvent('visibilitychange', this.handleVisibilityChange.bind(this));

    logger.info('👆 Activity detection set up');
  }

  /**
   * Add activity event listener
   * @param {string} eventType - Type of event
   * @param {Function} handler - Event handler
   */
  addActivityEvent(eventType, handler) {
    if (typeof document === 'undefined') {
      return;
    }

    const throttledHandler = this.throttle(handler, 100); // Throttle to 100ms
    
    document.addEventListener(eventType, throttledHandler, { passive: true });
    this.activityEvents.set(eventType, { handler, throttledHandler });
    
    logger.debug(`📝 Added activity event: ${eventType}`);
  }

  /**
   * Start activity monitoring
   */
  startActivityMonitoring() {
    // Check for inactivity every 5 seconds
    this.inactivityTimer = setInterval(() => {
      this.checkInactivity();
    }, 5000);

    // Update activity statistics every 30 seconds
    this.activityTimer = setInterval(() => {
      this.updateActivityStats();
    }, 30000);

    logger.info('⏰ Activity monitoring started');
  }

  /**
   * Check for user inactivity
   */
  checkInactivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    
    if (timeSinceLastActivity >= this.inactivityThreshold && this.isActive) {
      this.setInactive();
    } else if (timeSinceLastActivity < this.activityThreshold && !this.isActive) {
      this.setActive();
    }
  }

  /**
   * Set user as active
   */
  setActive() {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.lastActivity = Date.now();
    this.stats.lastActiveTime = Date.now();
    
    logger.debug('👤 User became active');
    
    // Emit activity event
    this.emit('user-active', {
      timestamp: Date.now(),
      inactiveDuration: Date.now() - (this.stats.lastInactiveTime || Date.now())
    });
  }

  /**
   * Set user as inactive
   */
  setInactive() {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.stats.lastInactiveTime = Date.now();
    
    logger.debug('😴 User became inactive');
    
    // Emit inactivity event
    this.emit('user-inactive', {
      timestamp: Date.now(),
      activeDuration: Date.now() - this.stats.lastActiveTime
    });
  }

  /**
   * Handle mouse move
   * @param {Event} event - Mouse event
   */
  handleMouseMove(event) {
    this.recordActivity('mousemove', event);
  }

  /**
   * Handle mouse down
   * @param {Event} event - Mouse event
   */
  handleMouseDown(event) {
    this.recordActivity('mousedown', event);
  }

  /**
   * Handle mouse up
   * @param {Event} event - Mouse event
   */
  handleMouseUp(event) {
    this.recordActivity('mouseup', event);
  }

  /**
   * Handle click
   * @param {Event} event - Click event
   */
  handleClick(event) {
    this.recordActivity('click', event);
  }

  /**
   * Handle scroll
   * @param {Event} event - Scroll event
   */
  handleScroll(event) {
    this.recordActivity('scroll', event);
  }

  /**
   * Handle key down
   * @param {Event} event - Keyboard event
   */
  handleKeyDown(event) {
    this.recordActivity('keydown', event);
  }

  /**
   * Handle key up
   * @param {Event} event - Keyboard event
   */
  handleKeyUp(event) {
    this.recordActivity('keyup', event);
  }

  /**
   * Handle touch start
   * @param {Event} event - Touch event
   */
  handleTouchStart(event) {
    this.recordActivity('touchstart', event);
  }

  /**
   * Handle touch move
   * @param {Event} event - Touch event
   */
  handleTouchMove(event) {
    this.recordActivity('touchmove', event);
  }

  /**
   * Handle touch end
   * @param {Event} event - Touch event
   */
  handleTouchEnd(event) {
    this.recordActivity('touchend', event);
  }

  /**
   * Handle focus
   * @param {Event} event - Focus event
   */
  handleFocus(event) {
    this.recordActivity('focus', event);
  }

  /**
   * Handle blur
   * @param {Event} event - Blur event
   */
  handleBlur(event) {
    this.recordActivity('blur', event);
  }

  /**
   * Handle visibility change
   * @param {Event} event - Visibility change event
   */
  handleVisibilityChange(event) {
    if (document.hidden) {
      this.recordActivity('visibility-hidden', event);
    } else {
      this.recordActivity('visibility-visible', event);
    }
  }

  /**
   * Record user activity
   * @param {string} eventType - Type of activity event
   * @param {Event} event - Original event
   */
  recordActivity(eventType, event) {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    
    // Only record if enough time has passed (throttling)
    if (timeSinceLastActivity < 100) {
      return;
    }
    
    this.lastActivity = now;
    this.stats.totalActivityEvents++;
    
    // Update activity status
    if (!this.isActive) {
      this.setActive();
    }
    
    logger.debug(`👆 Activity recorded: ${eventType}`);
  }

  /**
   * Update activity statistics
   */
  updateActivityStats() {
    const now = Date.now();
    const sessionDuration = now - this.stats.sessionStart;
    
    if (this.isActive) {
      this.stats.activeTime += 30000; // 30 seconds
    } else {
      this.stats.inactiveTime += 30000; // 30 seconds
    }
    
    // Calculate activity percentage
    const totalTime = this.stats.activeTime + this.stats.inactiveTime;
    const activityPercentage = totalTime > 0 ? (this.stats.activeTime / totalTime) * 100 : 0;
    
    logger.debug(`📊 Activity stats: ${activityPercentage.toFixed(1)}% active`);
  }

  /**
   * Throttle function calls
   * @param {Function} func - Function to throttle
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    
    return function (...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
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
          logger.error(`❌ Error in activity event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Check if user is currently active
   * @returns {boolean} Whether user is active
   */
  isUserActive() {
    return this.isActive;
  }

  /**
   * Get time since last activity
   * @returns {number} Time in milliseconds
   */
  getTimeSinceLastActivity() {
    return Date.now() - this.lastActivity;
  }

  /**
   * Get activity statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const now = Date.now();
    const sessionDuration = now - this.stats.sessionStart;
    const totalTime = this.stats.activeTime + this.stats.inactiveTime;
    const activityPercentage = totalTime > 0 ? (this.stats.activeTime / totalTime) * 100 : 0;
    
    return {
      ...this.stats,
      isActive: this.isActive,
      sessionDuration,
      activityPercentage,
      timeSinceLastActivity: this.getTimeSinceLastActivity(),
      inactivityThreshold: this.inactivityThreshold,
      activityThreshold: this.activityThreshold
    };
  }

  /**
   * Set inactivity threshold
   * @param {number} threshold - Threshold in milliseconds
   */
  setInactivityThreshold(threshold) {
    this.inactivityThreshold = threshold;
    logger.info(`⏰ Inactivity threshold set to ${threshold}ms`);
  }

  /**
   * Set activity threshold
   * @param {number} threshold - Threshold in milliseconds
   */
  setActivityThreshold(threshold) {
    this.activityThreshold = threshold;
    logger.info(`⏰ Activity threshold set to ${threshold}ms`);
  }

  /**
   * Force set active state
   */
  forceActive() {
    this.setActive();
    logger.info('👤 Forced active state');
  }

  /**
   * Force set inactive state
   */
  forceInactive() {
    this.setInactive();
    logger.info('😴 Forced inactive state');
  }

  /**
   * Reset activity tracking
   */
  reset() {
    this.isActive = true;
    this.lastActivity = Date.now();
    this.stats = {
      totalActivityEvents: 0,
      activeTime: 0,
      inactiveTime: 0,
      sessionStart: Date.now(),
      lastActiveTime: Date.now(),
      lastInactiveTime: null
    };
    
    logger.info('🔄 Activity tracking reset');
  }

  /**
   * Destroy activity tracker
   */
  destroy() {
    // Clear timers
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
    
    // Remove event listeners
    if (typeof document !== 'undefined') {
      this.activityEvents.forEach(({ handler, throttledHandler }, eventType) => {
        document.removeEventListener(eventType, throttledHandler);
      });
    }
    
    // Clear listeners
    this.eventListeners.clear();
    this.activityEvents.clear();
    
    this.isInitialized = false;
    logger.info('🧹 ActivityTracker destroyed');
  }
}
