import { logger } from "@/infrastructure/logging/Logger";
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import webSocketService from './WebSocketService.jsx';
import TimeoutConfig from '@/config/timeout-config.js';

/**
 * SessionMonitorService - Proactive session monitoring and management
 * 
 * Features:
 * - Periodic session validation
 * - Session expiry warning system
 * - Activity-based session extension
 * - Cross-tab session synchronization
 * - Session state persistence
 */
class SessionMonitorService {
  constructor() {
    this.isMonitoring = false;
    this.validationInterval = null;
    this.warningInterval = null;
    this.lastActivity = Date.now();
    this.sessionTimeout = TimeoutConfig.getTimeout('AUTH', 'SESSION_TIMEOUT');
    this.warningThreshold = TimeoutConfig.getTimeout('AUTH', 'WARNING_THRESHOLD');
    this.validationIntervalMs = TimeoutConfig.getTimeout('AUTH', 'VALIDATION_INTERVAL');
    this.activityThreshold = TimeoutConfig.getTimeout('AUTH', 'ACTIVITY_THRESHOLD');
    
    // Event listeners
    this.eventListeners = new Map();
    
    // Cross-tab synchronization
    this.broadcastChannel = null;
    this.setupCrossTabSync();
    
    logger.info('SessionMonitorService initialized');
  }

  /**
   * Start session monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Session monitoring already active');
      return;
    }

    this.isMonitoring = true;
    this.lastActivity = Date.now();
    
    // Start periodic validation
    this.validationInterval = setInterval(() => {
      this.validateSession();
    }, this.validationIntervalMs);
    
    // Start activity tracking
    this.setupActivityTracking();
    
    // Listen for WebSocket events
    this.setupWebSocketListeners();
    
    logger.info('Session monitoring started');
    this.emit('monitoring-started');
  }

  /**
   * Stop session monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
    
    if (this.warningInterval) {
      clearInterval(this.warningInterval);
      this.warningInterval = null;
    }
    
    this.removeActivityTracking();
    this.removeWebSocketListeners();
    
    logger.info('Session monitoring stopped');
    this.emit('monitoring-stopped');
  }

  /**
   * Validate current session
   */
  async validateSession() {
    try {
      const authStore = useAuthStore.getState();
      
      if (!authStore.isAuthenticated) {
        logger.debug('User not authenticated, skipping session validation');
        return;
      }

      // Check if session is close to expiry
      const timeUntilExpiry = this.getTimeUntilExpiry();
      
      if (timeUntilExpiry <= 0) {
        logger.warn('Session expired, triggering logout');
        await this.handleSessionExpiry();
        return;
      }
      
      if (timeUntilExpiry <= this.warningThreshold) {
        logger.info('Session warning threshold reached');
        await this.showSessionWarning(timeUntilExpiry);
      }
      
      // Update last activity if user is active
      if (this.isUserActive()) {
        this.updateLastActivity();
      }
      
      logger.debug('Session validation completed', { timeUntilExpiry });
      
    } catch (error) {
      logger.error('Session validation failed:', error);
      this.emit('validation-error', error);
    }
  }

  /**
   * Get time until session expiry
   */
  getTimeUntilExpiry() {
    const authStore = useAuthStore.getState();
    // ✅ FIX: Use correct path for sessionExpiry
    if (!authStore.sessionExpiry) {
      return 0;
    }
    
    const expiryTime = new Date(authStore.sessionExpiry).getTime();
    const currentTime = Date.now();
    
    return expiryTime - currentTime;
  }

  /**
   * Show session warning modal
   */
  async showSessionWarning(timeUntilExpiry) {
    const minutesLeft = Math.ceil(timeUntilExpiry / (60 * 1000));
    
    // Emit event for App component to handle
    this.emit('session-warning', timeUntilExpiry);
    
    // Also show notification as fallback
    const notificationStore = useNotificationStore.getState();
    notificationStore.addNotification({
      id: `session-warning-${Date.now()}`,
      type: 'warning',
      title: 'Session Expiring Soon',
      message: `Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. Click to extend your session.`,
      duration: 0, // Persistent until user action
      actions: [
        {
          label: 'Extend Session',
          action: () => this.extendSession()
        },
        {
          label: 'Logout',
          action: () => this.logout()
        }
      ],
      onClose: () => this.handleWarningDismissed()
    });
    
    this.emit('session-warning-shown', { timeUntilExpiry, minutesLeft });
  }

  /**
   * Extend current session
   */
  async extendSession() {
    try {
      logger.info('Extending session...');
      
      const authStore = useAuthStore.getState();
      if (!authStore.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      // Call backend to extend session
      const response = await fetch('/api/auth/extend-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to extend session');
      }

      const data = await response.json();
      
      if (data.success) {
        // Update auth store with new expiry time
        authStore.updateSessionExpiry(data.expiresAt);
        
        // Clear warning notifications
        const notificationStore = useNotificationStore.getState();
        notificationStore.removeNotificationByType('session-warning');
        
        logger.info('Session extended successfully');
        this.emit('session-extended', { expiresAt: data.expiresAt });
        
        // Broadcast to other tabs
        this.broadcastToTabs('session-extended', { expiresAt: data.expiresAt });
      } else {
        throw new Error(data.error || 'Failed to extend session');
      }
      
    } catch (error) {
      logger.error('Failed to extend session:', error);
      this.emit('session-extension-failed', error);
      
      // Show error notification
      const notificationStore = useNotificationStore.getState();
      notificationStore.addNotification({
        type: 'error',
        title: 'Session Extension Failed',
        message: 'Unable to extend your session. Please save your work and login again.',
        duration: 10000
      });
    }
  }

  /**
   * Handle session expiry
   */
  async handleSessionExpiry() {
    logger.warn('Handling session expiry');
    
    // Save current state before logout
    await this.saveSessionState();
    
    // Clear all notifications
    const notificationStore = useNotificationStore.getState();
    notificationStore.clearAllNotifications();
    
    // Show session expired notification
    notificationStore.addNotification({
      type: 'error',
      title: 'Session Expired',
      message: 'Your session has expired. Please login again.',
      duration: 0
    });
    
    // Logout user
    const authStore = useAuthStore.getState();
    await authStore.logout();
    
    this.emit('session-expired');
    this.broadcastToTabs('session-expired');
  }

  /**
   * Handle warning dismissed
   */
  handleWarningDismissed() {
    logger.info('Session warning dismissed by user');
    this.emit('session-warning-dismissed');
  }

  /**
   * Setup activity tracking
   */
  setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      this.lastActivity = Date.now();
      this.emit('activity-detected');
    };
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
    
    // Store cleanup function
    this.removeActivityTracking = () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }

  /**
   * Check if user is currently active
   */
  isUserActive() {
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    return timeSinceLastActivity < this.activityThreshold;
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity() {
    this.lastActivity = Date.now();
    this.emit('activity-updated', { timestamp: this.lastActivity });
  }

  /**
   * Setup WebSocket listeners
   */
  setupWebSocketListeners() {
    if (!webSocketService) {
      logger.warn('WebSocket service not available');
      return;
    }

    // Listen for session events from server
    webSocketService.on('session-expired', () => {
      logger.info('Session expired notification received from server');
      this.handleSessionExpiry();
    });

    webSocketService.on('session-extended', (data) => {
      logger.info('Session extended notification received from server');
      const authStore = useAuthStore.getState();
      authStore.updateSessionExpiry(data.expiresAt);
      this.emit('session-extended', data);
    });
  }

  /**
   * Remove WebSocket listeners
   */
  removeWebSocketListeners() {
    if (!webSocketService) {
      return;
    }

    webSocketService.off('session-expired');
    webSocketService.off('session-extended');
  }

  /**
   * Setup cross-tab synchronization
   */
  setupCrossTabSync() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('session-sync');
      
      this.broadcastChannel.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'session-expired':
            logger.info('Session expired in another tab');
            this.handleSessionExpiry();
            break;
            
          case 'session-extended':
            logger.info('Session extended in another tab');
            const authStore = useAuthStore.getState();
            authStore.updateSessionExpiry(data.expiresAt);
            break;
            
          case 'logout':
            logger.info('Logout triggered in another tab');
            const authStore2 = useAuthStore.getState();
            authStore2.logout();
            break;
        }
      };
    } else {
      logger.warn('BroadcastChannel not supported, cross-tab sync disabled');
    }
  }

  /**
   * Broadcast message to other tabs
   */
  broadcastToTabs(type, data = {}) {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type, data });
    }
  }

  /**
   * Save current session state
   */
  async saveSessionState() {
    try {
      const authStore = useAuthStore.getState();
      const state = {
        user: authStore.user,
        lastActivity: this.lastActivity,
        timestamp: Date.now()
      };
      
      localStorage.setItem('session-state', JSON.stringify(state));
      logger.info('Session state saved');
      
    } catch (error) {
      logger.error('Failed to save session state:', error);
    }
  }

  /**
   * Restore session state
   */
  async restoreSessionState() {
    try {
      const savedState = localStorage.getItem('session-state');
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // Check if state is not too old (max 1 hour)
        const maxAge = 60 * 60 * 1000;
        if (Date.now() - state.timestamp < maxAge) {
          this.lastActivity = state.lastActivity;
          logger.info('Session state restored');
          return state;
        } else {
          localStorage.removeItem('session-state');
          logger.info('Session state too old, removed');
        }
      }
    } catch (error) {
      logger.error('Failed to restore session state:', error);
    }
    
    return null;
  }

  /**
   * Logout user
   */
  async logout() {
    logger.info('Logging out user...');
    
    // Save state before logout
    await this.saveSessionState();
    
    // Stop monitoring
    this.stopMonitoring();
    
    // Logout from auth store
    const authStore = useAuthStore.getState();
    await authStore.logout();
    
    // Broadcast to other tabs
    this.broadcastToTabs('logout');
    
    this.emit('logout');
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
          logger.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastActivity: this.lastActivity,
      timeUntilExpiry: this.getTimeUntilExpiry(),
      isUserActive: this.isUserActive()
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopMonitoring();
    
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    
    this.eventListeners.clear();
    
    logger.info('SessionMonitorService destroyed');
  }
}

// Create singleton instance
const sessionMonitorService = new SessionMonitorService();

export default sessionMonitorService;




