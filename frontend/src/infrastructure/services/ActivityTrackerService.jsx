import { logger } from "@/infrastructure/logging/Logger";
import TimeoutConfig from '@/config/timeout-config.js';

/**
 * ActivityTrackerService - User activity detection and tracking
 * 
 * Features:
 * - Mouse, keyboard, and touch activity detection
 * - Scroll and focus activity tracking
 * - Debounced activity events
 * - Configurable activity thresholds
 * - Activity pattern analysis
 */
class ActivityTrackerService {
  constructor() {
    this.isTracking = false;
    this.lastActivity = Date.now();
    this.activityThreshold = TimeoutConfig.getTimeout('AUTH', 'ACTIVITY_THRESHOLD');
    this.debounceDelay = TimeoutConfig.getTimeout('UI', 'DEBOUNCE');
    this.debounceTimer = null;
    
    // Activity counters
    this.activityCounts = {
      mouse: 0,
      keyboard: 0,
      touch: 0,
      scroll: 0,
      focus: 0
    };
    
    // Event listeners
    this.eventListeners = new Map();
    this.documentListeners = new Map();
    
    // Activity patterns
    this.activityPatterns = {
      idle: false,
      active: false,
      veryActive: false
    };
    
    logger.info('ActivityTrackerService initialized');
  }

  /**
   * Start activity tracking
   */
  startTracking() {
    if (this.isTracking) {
      logger.warn('Activity tracking already active');
      return;
    }

    this.isTracking = true;
    this.lastActivity = Date.now();
    
    this.setupMouseTracking();
    this.setupKeyboardTracking();
    this.setupTouchTracking();
    this.setupScrollTracking();
    this.setupFocusTracking();
    this.setupVisibilityTracking();
    
    logger.info('Activity tracking started');
    this.emit('tracking-started');
  }

  /**
   * Stop activity tracking
   */
  stopTracking() {
    if (!this.isTracking) {
      return;
    }

    this.isTracking = false;
    
    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    // Remove all event listeners
    this.removeAllListeners();
    
    logger.info('Activity tracking stopped');
    this.emit('tracking-stopped');
  }

  /**
   * Setup mouse activity tracking
   */
  setupMouseTracking() {
    const mouseEvents = ['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick'];
    
    mouseEvents.forEach(event => {
      const handler = (e) => this.handleActivity('mouse', e);
      document.addEventListener(event, handler, { passive: true });
      this.documentListeners.set(event, handler);
    });
  }

  /**
   * Setup keyboard activity tracking
   */
  setupKeyboardTracking() {
    const keyboardEvents = ['keydown', 'keyup', 'keypress'];
    
    keyboardEvents.forEach(event => {
      const handler = (e) => this.handleActivity('keyboard', e);
      document.addEventListener(event, handler, { passive: true });
      this.documentListeners.set(event, handler);
    });
  }

  /**
   * Setup touch activity tracking
   */
  setupTouchTracking() {
    const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
    
    touchEvents.forEach(event => {
      const handler = (e) => this.handleActivity('touch', e);
      document.addEventListener(event, handler, { passive: true });
      this.documentListeners.set(event, handler);
    });
  }

  /**
   * Setup scroll activity tracking
   */
  setupScrollTracking() {
    const scrollEvents = ['scroll', 'wheel'];
    
    scrollEvents.forEach(event => {
      const handler = (e) => this.handleActivity('scroll', e);
      document.addEventListener(event, handler, { passive: true });
      this.documentListeners.set(event, handler);
    });
  }

  /**
   * Setup focus activity tracking
   */
  setupFocusTracking() {
    const focusEvents = ['focus', 'blur', 'focusin', 'focusout'];
    
    focusEvents.forEach(event => {
      const handler = (e) => this.handleActivity('focus', e);
      document.addEventListener(event, handler, { passive: true });
      this.documentListeners.set(event, handler);
    });
  }

  /**
   * Setup visibility change tracking
   */
  setupVisibilityTracking() {
    const handler = () => {
      if (document.hidden) {
        this.handleVisibilityChange(false);
      } else {
        this.handleVisibilityChange(true);
      }
    };
    
    document.addEventListener('visibilitychange', handler);
    this.documentListeners.set('visibilitychange', handler);
  }

  /**
   * Handle activity event
   */
  handleActivity(type, event) {
    if (!this.isTracking) {
      return;
    }

    // Update activity counter
    this.activityCounts[type]++;
    
    // Update last activity timestamp
    this.lastActivity = Date.now();
    
    // Debounce activity events
    this.debounceActivity();
    
    // Emit immediate activity event
    this.emit('activity-detected', {
      type,
      timestamp: this.lastActivity,
      event
    });
  }

  /**
   * Debounce activity events
   */
  debounceActivity() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.emitDebouncedActivity();
    }, this.debounceDelay);
  }

  /**
   * Emit debounced activity event
   */
  emitDebouncedActivity() {
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    
    // Determine activity pattern
    this.updateActivityPatterns();
    
    this.emit('activity-debounced', {
      timestamp: this.lastActivity,
      timeSinceLastActivity,
      activityCounts: { ...this.activityCounts },
      patterns: { ...this.activityPatterns }
    });
  }

  /**
   * Update activity patterns
   */
  updateActivityPatterns() {
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    
    // Idle: no activity for more than 5 minutes
    this.activityPatterns.idle = timeSinceLastActivity > 5 * 60 * 1000;
    
    // Active: activity within last 30 seconds
    this.activityPatterns.active = timeSinceLastActivity < 30 * 1000;
    
    // Very active: high activity rate
    const totalActivity = Object.values(this.activityCounts).reduce((sum, count) => sum + count, 0);
    this.activityPatterns.veryActive = totalActivity > 100; // Arbitrary threshold
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange(isVisible) {
    if (isVisible) {
      // Page became visible, check if user is still active
      const timeSinceLastActivity = Date.now() - this.lastActivity;
      
      if (timeSinceLastActivity < this.activityThreshold) {
        this.emit('user-returned', {
          timestamp: Date.now(),
          timeSinceLastActivity
        });
      } else {
        this.emit('user-returned-idle', {
          timestamp: Date.now(),
          timeSinceLastActivity
        });
      }
    } else {
      // Page became hidden
      this.emit('user-left', {
        timestamp: Date.now(),
        lastActivity: this.lastActivity
      });
    }
  }

  /**
   * Check if user is currently active
   */
  isUserActive() {
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    return timeSinceLastActivity < this.activityThreshold;
  }

  /**
   * Get time since last activity
   */
  getTimeSinceLastActivity() {
    return Date.now() - this.lastActivity;
  }

  /**
   * Get activity statistics
   */
  getActivityStats() {
    const timeSinceLastActivity = this.getTimeSinceLastActivity();
    const totalActivity = Object.values(this.activityCounts).reduce((sum, count) => sum + count, 0);
    
    return {
      isActive: this.isUserActive(),
      timeSinceLastActivity,
      activityCounts: { ...this.activityCounts },
      totalActivity,
      patterns: { ...this.activityPatterns },
      isTracking: this.isTracking
    };
  }

  /**
   * Reset activity counters
   */
  resetActivityCounters() {
    Object.keys(this.activityCounts).forEach(key => {
      this.activityCounts[key] = 0;
    });
    
    logger.info('Activity counters reset');
    this.emit('counters-reset');
  }

  /**
   * Set activity threshold
   */
  setActivityThreshold(threshold) {
    this.activityThreshold = threshold;
    logger.info(`Activity threshold set to ${threshold}ms`);
    this.emit('threshold-updated', { threshold });
  }

  /**
   * Set debounce delay
   */
  setDebounceDelay(delay) {
    this.debounceDelay = delay;
    logger.info(`Debounce delay set to ${delay}ms`);
    this.emit('debounce-delay-updated', { delay });
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this.documentListeners.forEach((handler, event) => {
      document.removeEventListener(event, handler);
    });
    this.documentListeners.clear();
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in activity event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get tracking status
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      lastActivity: this.lastActivity,
      activityThreshold: this.activityThreshold,
      debounceDelay: this.debounceDelay,
      activityCounts: { ...this.activityCounts },
      patterns: { ...this.activityPatterns }
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopTracking();
    this.eventListeners.clear();
    logger.info('ActivityTrackerService destroyed');
  }
}

// Create singleton instance
const activityTrackerService = new ActivityTrackerService();

export default activityTrackerService;




