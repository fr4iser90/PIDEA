import { logger } from "@/infrastructure/logging/Logger";

/**
 * CrossTabSyncService - Multi-tab session synchronization
 * 
 * Features:
 * - Cross-tab session state synchronization
 * - BroadcastChannel API for modern browsers
 * - localStorage fallback for older browsers
 * - Session expiry synchronization
 * - Logout synchronization
 * - Activity synchronization
 */
class CrossTabSyncService {
  constructor() {
    this.isActive = false;
    this.broadcastChannel = null;
    this.storageKey = 'pidea-session-sync';
    this.channelName = 'pidea-session-sync';
    
    // Event listeners
    this.eventListeners = new Map();
    
    // Message types
    this.messageTypes = {
      SESSION_EXPIRED: 'session-expired',
      SESSION_EXTENDED: 'session-extended',
      LOGOUT: 'logout',
      LOGIN: 'login',
      ACTIVITY_UPDATE: 'activity-update',
      WARNING_SHOWN: 'warning-shown',
      WARNING_DISMISSED: 'warning-dismissed'
    };
    
    logger.info('CrossTabSyncService initialized');
  }

  /**
   * Start cross-tab synchronization
   */
  startSync() {
    if (this.isActive) {
      logger.warn('Cross-tab sync already active');
      return;
    }

    this.isActive = true;
    
    // Try BroadcastChannel first (modern browsers)
    if (typeof BroadcastChannel !== 'undefined') {
      this.setupBroadcastChannel();
    } else {
      // Fallback to localStorage events
      this.setupLocalStorageSync();
    }
    
    logger.info('Cross-tab synchronization started');
    this.emit('sync-started');
  }

  /**
   * Stop cross-tab synchronization
   */
  stopSync() {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    
    this.removeLocalStorageListeners();
    
    logger.info('Cross-tab synchronization stopped');
    this.emit('sync-stopped');
  }

  /**
   * Setup BroadcastChannel for modern browsers
   */
  setupBroadcastChannel() {
    try {
      this.broadcastChannel = new BroadcastChannel(this.channelName);
      
      this.broadcastChannel.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      logger.info('BroadcastChannel setup successful');
      
    } catch (error) {
      logger.warn('BroadcastChannel setup failed, falling back to localStorage:', error);
      this.setupLocalStorageSync();
    }
  }

  /**
   * Setup localStorage fallback for older browsers
   */
  setupLocalStorageSync() {
    // Listen for storage events
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    
    // Listen for custom events (for same-tab communication)
    window.addEventListener('pidea-session-sync', this.handleCustomEvent.bind(this));
    
    logger.info('localStorage sync setup successful');
  }

  /**
   * Handle BroadcastChannel message
   */
  handleMessage(data) {
    if (!this.isActive) {
      return;
    }

    logger.debug('Received BroadcastChannel message:', data);
    this.processMessage(data);
  }

  /**
   * Handle localStorage storage event
   */
  handleStorageEvent(event) {
    if (!this.isActive || event.key !== this.storageKey) {
      return;
    }

    try {
      const data = JSON.parse(event.newValue);
      logger.debug('Received localStorage message:', data);
      this.processMessage(data);
    } catch (error) {
      logger.error('Failed to parse localStorage message:', error);
    }
  }

  /**
   * Handle custom event (same-tab communication)
   */
  handleCustomEvent(event) {
    if (!this.isActive) {
      return;
    }

    logger.debug('Received custom event:', event.detail);
    this.processMessage(event.detail);
  }

  /**
   * Process received message
   */
  processMessage(data) {
    if (!data || !data.type) {
      logger.warn('Invalid message format:', data);
      return;
    }

    const { type, payload, timestamp, tabId } = data;
    
    // Ignore messages from current tab
    if (tabId === this.getTabId()) {
      return;
    }

    logger.info(`Processing ${type} message from tab ${tabId}`);

    switch (type) {
      case this.messageTypes.SESSION_EXPIRED:
        this.emit('session-expired', payload);
        break;
        
      case this.messageTypes.SESSION_EXTENDED:
        this.emit('session-extended', payload);
        break;
        
      case this.messageTypes.LOGOUT:
        this.emit('logout', payload);
        break;
        
      case this.messageTypes.LOGIN:
        this.emit('login', payload);
        break;
        
      case this.messageTypes.ACTIVITY_UPDATE:
        this.emit('activity-update', payload);
        break;
        
      case this.messageTypes.WARNING_SHOWN:
        this.emit('warning-shown', payload);
        break;
        
      case this.messageTypes.WARNING_DISMISSED:
        this.emit('warning-dismissed', payload);
        break;
        
      default:
        logger.warn(`Unknown message type: ${type}`);
    }
  }

  /**
   * Broadcast message to other tabs
   */
  broadcast(type, payload = {}) {
    if (!this.isActive) {
      logger.warn('Cross-tab sync not active, cannot broadcast');
      return;
    }

    const message = {
      type,
      payload,
      timestamp: Date.now(),
      tabId: this.getTabId()
    };

    logger.debug(`Broadcasting ${type} message:`, message);

    // Send via BroadcastChannel if available
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    } else {
      // Send via localStorage
      this.broadcastViaLocalStorage(message);
    }

    this.emit('message-broadcast', { type, payload });
  }

  /**
   * Broadcast via localStorage
   */
  broadcastViaLocalStorage(message) {
    try {
      // Store in localStorage to trigger storage event
      localStorage.setItem(this.storageKey, JSON.stringify(message));
      
      // Also dispatch custom event for same-tab listeners
      const customEvent = new CustomEvent('pidea-session-sync', {
        detail: message
      });
      window.dispatchEvent(customEvent);
      
    } catch (error) {
      logger.error('Failed to broadcast via localStorage:', error);
    }
  }

  /**
   * Broadcast session expired
   */
  broadcastSessionExpired(payload = {}) {
    this.broadcast(this.messageTypes.SESSION_EXPIRED, payload);
  }

  /**
   * Broadcast session extended
   */
  broadcastSessionExtended(payload = {}) {
    this.broadcast(this.messageTypes.SESSION_EXTENDED, payload);
  }

  /**
   * Broadcast logout
   */
  broadcastLogout(payload = {}) {
    this.broadcast(this.messageTypes.LOGOUT, payload);
  }

  /**
   * Broadcast login
   */
  broadcastLogin(payload = {}) {
    this.broadcast(this.messageTypes.LOGIN, payload);
  }

  /**
   * Broadcast activity update
   */
  broadcastActivityUpdate(payload = {}) {
    this.broadcast(this.messageTypes.ACTIVITY_UPDATE, payload);
  }

  /**
   * Broadcast warning shown
   */
  broadcastWarningShown(payload = {}) {
    this.broadcast(this.messageTypes.WARNING_SHOWN, payload);
  }

  /**
   * Broadcast warning dismissed
   */
  broadcastWarningDismissed(payload = {}) {
    this.broadcast(this.messageTypes.WARNING_DISMISSED, payload);
  }

  /**
   * Get unique tab ID
   */
  getTabId() {
    if (!this.tabId) {
      this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.tabId;
  }

  /**
   * Remove localStorage event listeners
   */
  removeLocalStorageListeners() {
    window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    window.removeEventListener('pidea-session-sync', this.handleCustomEvent.bind(this));
  }

  /**
   * Check if BroadcastChannel is supported
   */
  isBroadcastChannelSupported() {
    return typeof BroadcastChannel !== 'undefined';
  }

  /**
   * Check if localStorage is available
   */
  isLocalStorageSupported() {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get sync capabilities
   */
  getCapabilities() {
    return {
      broadcastChannel: this.isBroadcastChannelSupported(),
      localStorage: this.isLocalStorageSupported(),
      isActive: this.isActive,
      tabId: this.getTabId()
    };
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
          logger.error(`Error in cross-tab sync event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      tabId: this.getTabId(),
      capabilities: this.getCapabilities(),
      messageTypes: this.messageTypes
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopSync();
    this.eventListeners.clear();
    logger.info('CrossTabSyncService destroyed');
  }
}

// Create singleton instance
const crossTabSyncService = new CrossTabSyncService();

export default crossTabSyncService;




