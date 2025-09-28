import { jest } from '@jest/globals';
import CrossTabSyncService from '@/infrastructure/services/CrossTabSyncService.jsx';

// Mock dependencies
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock BroadcastChannel
const mockBroadcastChannel = {
  postMessage: jest.fn(),
  close: jest.fn(),
  onmessage: null
};

global.BroadcastChannel = jest.fn(() => mockBroadcastChannel);

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock CustomEvent
global.CustomEvent = jest.fn();

describe('CrossTabSyncService', () => {
  let crossTabSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBroadcastChannel.postMessage.mockClear();
    mockBroadcastChannel.close.mockClear();
    mockBroadcastChannel.onmessage = null;
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    
    crossTabSyncService = new CrossTabSyncService();
  });

  afterEach(() => {
    if (crossTabSyncService) {
      crossTabSyncService.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(crossTabSyncService.isActive).toBe(false);
      expect(crossTabSyncService.broadcastChannel).toBeNull();
      expect(crossTabSyncService.storageKey).toBe('pidea-session-sync');
      expect(crossTabSyncService.channelName).toBe('pidea-session-sync');
    });

    it('should initialize message types', () => {
      expect(crossTabSyncService.messageTypes).toEqual({
        SESSION_EXPIRED: 'session-expired',
        SESSION_EXTENDED: 'session-extended',
        LOGOUT: 'logout',
        LOGIN: 'login',
        ACTIVITY_UPDATE: 'activity-update',
        WARNING_SHOWN: 'warning-shown',
        WARNING_DISMISSED: 'warning-dismissed'
      });
    });
  });

  describe('Synchronization Control', () => {
    it('should start sync successfully', () => {
      crossTabSyncService.startSync();
      
      expect(crossTabSyncService.isActive).toBe(true);
      expect(mockBroadcastChannel).toHaveBeenCalledWith('pidea-session-sync');
    });

    it('should not start sync if already active', () => {
      crossTabSyncService.startSync();
      const firstChannel = crossTabSyncService.broadcastChannel;
      
      crossTabSyncService.startSync();
      
      expect(crossTabSyncService.broadcastChannel).toBe(firstChannel);
    });

    it('should stop sync successfully', () => {
      crossTabSyncService.startSync();
      crossTabSyncService.stopSync();
      
      expect(crossTabSyncService.isActive).toBe(false);
      expect(mockBroadcastChannel.close).toHaveBeenCalled();
    });

    it('should handle stop sync when not active', () => {
      expect(() => {
        crossTabSyncService.stopSync();
      }).not.toThrow();
    });
  });

  describe('BroadcastChannel Support', () => {
    it('should setup BroadcastChannel for modern browsers', () => {
      crossTabSyncService.setupBroadcastChannel();
      
      expect(mockBroadcastChannel).toHaveBeenCalledWith('pidea-session-sync');
      expect(crossTabSyncService.broadcastChannel).toBeDefined();
    });

    it('should handle BroadcastChannel setup failure', () => {
      const originalBroadcastChannel = global.BroadcastChannel;
      global.BroadcastChannel = jest.fn().mockImplementation(() => {
        throw new Error('BroadcastChannel not supported');
      });
      
      const mockSetupLocalStorageSync = jest.spyOn(crossTabSyncService, 'setupLocalStorageSync');
      
      crossTabSyncService.setupBroadcastChannel();
      
      expect(mockSetupLocalStorageSync).toHaveBeenCalled();
      
      global.BroadcastChannel = originalBroadcastChannel;
    });

    it('should detect BroadcastChannel support', () => {
      expect(crossTabSyncService.isBroadcastChannelSupported()).toBe(true);
      
      const originalBroadcastChannel = global.BroadcastChannel;
      global.BroadcastChannel = undefined;
      
      expect(crossTabSyncService.isBroadcastChannelSupported()).toBe(false);
      
      global.BroadcastChannel = originalBroadcastChannel;
    });
  });

  describe('localStorage Fallback', () => {
    it('should setup localStorage sync', () => {
      const mockAddEventListener = jest.spyOn(window, 'addEventListener');
      
      crossTabSyncService.setupLocalStorageSync();
      
      expect(mockAddEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('pidea-session-sync', expect.any(Function));
    });

    it('should detect localStorage support', () => {
      expect(crossTabSyncService.isLocalStorageSupported()).toBe(true);
      
      // Mock localStorage failure
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      expect(crossTabSyncService.isLocalStorageSupported()).toBe(false);
    });
  });

  describe('Message Broadcasting', () => {
    beforeEach(() => {
      crossTabSyncService.startSync();
    });

    it('should broadcast messages via BroadcastChannel', () => {
      crossTabSyncService.broadcast('test-message', { data: 'test' });
      
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'test-message',
        payload: { data: 'test' },
        timestamp: expect.any(Number),
        tabId: expect.any(String)
      });
    });

    it('should broadcast messages via localStorage when BroadcastChannel unavailable', () => {
      crossTabSyncService.broadcastChannel = null;
      
      crossTabSyncService.broadcast('test-message', { data: 'test' });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pidea-session-sync',
        expect.stringContaining('"type":"test-message"')
      );
    });

    it('should not broadcast when sync is not active', () => {
      crossTabSyncService.stopSync();
      
      crossTabSyncService.broadcast('test-message', { data: 'test' });
      
      expect(mockBroadcastChannel.postMessage).not.toHaveBeenCalled();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should broadcast specific session events', () => {
      const payload = { sessionId: 'session-1' };
      
      crossTabSyncService.broadcastSessionExpired(payload);
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session-expired',
          payload
        })
      );
      
      crossTabSyncService.broadcastSessionExtended(payload);
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session-extended',
          payload
        })
      );
      
      crossTabSyncService.broadcastLogout(payload);
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logout',
          payload
        })
      );
      
      crossTabSyncService.broadcastLogin(payload);
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login',
          payload
        })
      );
    });
  });

  describe('Message Processing', () => {
    beforeEach(() => {
      crossTabSyncService.startSync();
    });

    it('should process BroadcastChannel messages', () => {
      const mockProcessMessage = jest.spyOn(crossTabSyncService, 'processMessage');
      const message = {
        type: 'session-expired',
        payload: { sessionId: 'session-1' },
        tabId: 'other-tab'
      };
      
      crossTabSyncService.handleMessage(message);
      
      expect(mockProcessMessage).toHaveBeenCalledWith(message);
    });

    it('should process localStorage storage events', () => {
      const mockProcessMessage = jest.spyOn(crossTabSyncService, 'processMessage');
      const message = {
        type: 'session-extended',
        payload: { sessionId: 'session-1' },
        tabId: 'other-tab'
      };
      
      const event = {
        key: 'pidea-session-sync',
        newValue: JSON.stringify(message)
      };
      
      crossTabSyncService.handleStorageEvent(event);
      
      expect(mockProcessMessage).toHaveBeenCalledWith(message);
    });

    it('should ignore messages from current tab', () => {
      const mockProcessMessage = jest.spyOn(crossTabSyncService, 'processMessage');
      const currentTabId = crossTabSyncService.getTabId();
      
      const message = {
        type: 'session-expired',
        payload: { sessionId: 'session-1' },
        tabId: currentTabId
      };
      
      crossTabSyncService.processMessage(message);
      
      expect(mockProcessMessage).not.toHaveBeenCalled();
    });

    it('should handle invalid message formats', () => {
      const mockEmit = jest.spyOn(crossTabSyncService, 'emit');
      
      crossTabSyncService.processMessage(null);
      crossTabSyncService.processMessage({});
      crossTabSyncService.processMessage({ type: null });
      
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should emit events for different message types', () => {
      const mockEmit = jest.spyOn(crossTabSyncService, 'emit');
      
      const messageTypes = [
        'session-expired',
        'session-extended',
        'logout',
        'login',
        'activity-update',
        'warning-shown',
        'warning-dismissed'
      ];
      
      messageTypes.forEach(type => {
        const message = {
          type,
          payload: { data: 'test' },
          tabId: 'other-tab'
        };
        
        crossTabSyncService.processMessage(message);
        
        expect(mockEmit).toHaveBeenCalledWith(type, { data: 'test' });
      });
    });

    it('should handle unknown message types', () => {
      const mockEmit = jest.spyOn(crossTabSyncService, 'emit');
      
      const message = {
        type: 'unknown-type',
        payload: { data: 'test' },
        tabId: 'other-tab'
      };
      
      crossTabSyncService.processMessage(message);
      
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should add and remove event listeners', () => {
      const mockCallback = jest.fn();
      
      crossTabSyncService.on('test-event', mockCallback);
      crossTabSyncService.emit('test-event', { data: 'test' });
      
      expect(mockCallback).toHaveBeenCalledWith({ data: 'test' });
      
      crossTabSyncService.off('test-event', mockCallback);
      crossTabSyncService.emit('test-event', { data: 'test' });
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tab Management', () => {
    it('should generate unique tab IDs', () => {
      const tabId1 = crossTabSyncService.getTabId();
      const tabId2 = crossTabSyncService.getTabId();
      
      expect(tabId1).toBe(tabId2); // Should be cached
      expect(tabId1).toMatch(/^tab-\d+-[a-z0-9]+$/);
    });

    it('should generate different tab IDs for different instances', () => {
      const service1 = new CrossTabSyncService();
      const service2 = new CrossTabSyncService();
      
      const tabId1 = service1.getTabId();
      const tabId2 = service2.getTabId();
      
      expect(tabId1).not.toBe(tabId2);
    });
  });

  describe('Capabilities Detection', () => {
    it('should report sync capabilities', () => {
      const capabilities = crossTabSyncService.getCapabilities();
      
      expect(capabilities).toEqual({
        broadcastChannel: true,
        localStorage: true,
        isActive: false,
        tabId: expect.any(String)
      });
    });

    it('should report capabilities when BroadcastChannel is unavailable', () => {
      const originalBroadcastChannel = global.BroadcastChannel;
      global.BroadcastChannel = undefined;
      
      const service = new CrossTabSyncService();
      const capabilities = service.getCapabilities();
      
      expect(capabilities.broadcastChannel).toBe(false);
      
      global.BroadcastChannel = originalBroadcastChannel;
    });
  });

  describe('Status and Cleanup', () => {
    it('should get sync status', () => {
      const status = crossTabSyncService.getStatus();
      
      expect(status).toEqual({
        isActive: false,
        tabId: expect.any(String),
        capabilities: expect.any(Object),
        messageTypes: expect.any(Object)
      });
    });

    it('should cleanup resources on destroy', () => {
      const mockStopSync = jest.spyOn(crossTabSyncService, 'stopSync');
      
      crossTabSyncService.destroy();
      
      expect(mockStopSync).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle BroadcastChannel errors gracefully', () => {
      const originalBroadcastChannel = global.BroadcastChannel;
      global.BroadcastChannel = jest.fn().mockImplementation(() => {
        throw new Error('BroadcastChannel error');
      });
      
      expect(() => {
        crossTabSyncService.setupBroadcastChannel();
      }).not.toThrow();
      
      global.BroadcastChannel = originalBroadcastChannel;
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      expect(() => {
        crossTabSyncService.broadcastViaLocalStorage({ type: 'test' });
      }).not.toThrow();
    });

    it('should handle JSON parsing errors', () => {
      const mockProcessMessage = jest.spyOn(crossTabSyncService, 'processMessage');
      
      const event = {
        key: 'pidea-session-sync',
        newValue: 'invalid-json'
      };
      
      crossTabSyncService.handleStorageEvent(event);
      
      expect(mockProcessMessage).not.toHaveBeenCalled();
    });

    it('should handle event listener errors', () => {
      const mockCallback = jest.fn().mockImplementation(() => {
        throw new Error('Event listener error');
      });
      
      crossTabSyncService.on('test-event', mockCallback);
      
      expect(() => {
        crossTabSyncService.emit('test-event', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with session monitoring', () => {
      const mockSessionMonitor = {
        handleSessionExpired: jest.fn(),
        handleSessionExtended: jest.fn()
      };
      
      crossTabSyncService.on('session-expired', mockSessionMonitor.handleSessionExpired);
      crossTabSyncService.on('session-extended', mockSessionMonitor.handleSessionExtended);
      
      crossTabSyncService.processMessage({
        type: 'session-expired',
        payload: { sessionId: 'session-1' },
        tabId: 'other-tab'
      });
      
      expect(mockSessionMonitor.handleSessionExpired).toHaveBeenCalledWith({ sessionId: 'session-1' });
    });

    it('should synchronize across multiple tabs', () => {
      const service1 = new CrossTabSyncService();
      const service2 = new CrossTabSyncService();
      
      service1.startSync();
      service2.startSync();
      
      const mockCallback = jest.fn();
      service2.on('session-expired', mockCallback);
      
      service1.broadcastSessionExpired({ sessionId: 'session-1' });
      
      // Simulate message processing
      const message = {
        type: 'session-expired',
        payload: { sessionId: 'session-1' },
        tabId: service1.getTabId()
      };
      
      service2.processMessage(message);
      
      expect(mockCallback).toHaveBeenCalledWith({ sessionId: 'session-1' });
    });
  });
});
