import { logger } from "@/infrastructure/logging/Logger";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useNotificationStore from './NotificationStore.jsx';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import sessionMonitorService from '../services/SessionMonitorService.jsx';
import activityTrackerService from '../services/ActivityTrackerService.jsx';
import crossTabSyncService from '../services/CrossTabSyncService.jsx';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      redirectToLogin: false,
      lastAuthCheck: null,
      authCheckInterval: 5 * 60 * 1000, // 5 minutes - reasonable cache duration
      isValidating: false, // New state for race condition protection
      
      // Session management state
      sessionExpiry: null,
      sessionWarningShown: false,
      sessionMonitoringActive: false,

      // Actions
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        
        try {
          logger.debug('🔍 [AuthStore] Attempting login for:', email);
          
          const data = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            credentials: 'include', // Include cookies
          });

          // Check if cookies were set
          logger.info('🔍 [AuthStore] Login response received, checking cookies...');
          logger.info('🔍 [AuthStore] Login response:', data);

          if (!data.success) {
            throw new Error(data.error || data.message || 'Login failed');
          }

          // Backend returns: { success: true, data: { user } }
          const userData = data.data || data;

          logger.info('🔍 [AuthStore] Login successful, cookies set by backend');
          logger.info('🔍 [AuthStore] User data:', userData.user);

          // SIMPLIFIED: Trust the login response and set state immediately
          // Cookies are set by backend, no need for immediate validation
          logger.info('✅ [AuthStore] Login successful, setting authentication state');

          set({
            user: userData.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            redirectToLogin: false,
            lastAuthCheck: new Date(),
            sessionExpiry: userData.expiresAt || null
          });

          // Start session monitoring services
          await get().startSessionMonitoring();

          logger.info('✅ [AuthStore] Login successful, state updated');
          return { success: true };
        } catch (error) {
          logger.error('❌ [AuthStore] Login failed:', error);
          set({
            isLoading: false,
            error: error.message,
          });
          return { success: false, error: error.message };
        }
      },

      register: async (email, password, username) => {
        set({ isLoading: true, error: null });
        
        try {
          const data = await apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, username }),
          });

          if (!data.success) {
            throw new Error(data.error || data.message || 'Registration failed');
          }

          // Backend returns: { success: true, user: ... } for register
          // Authentication handled via httpOnly cookies
          const userData = data.data || data;

          // CRITICAL FIX: Add delay to ensure cookies are properly set
          logger.info('🔍 [AuthStore] Waiting for cookies to be properly set after registration...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

          // Validate authentication immediately after registration
          logger.info('🔍 [AuthStore] Validating authentication after registration...');
          const validationResult = await get().validateToken();
          
          if (!validationResult) {
            throw new Error('Authentication validation failed after registration');
          }

          logger.info('✅ [AuthStore] Authentication validated successfully after registration');

          set({
            user: userData.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            redirectToLogin: false,
            lastAuthCheck: new Date()
          });

          return { success: true };
        } catch (error) {
          set({
            isLoading: false,
            error: error.message,
          });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        try {
          // Stop session monitoring services
          await get().stopSessionMonitoring();
          
          // Call logout endpoint to clear httpOnly cookies
          await apiCall('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
        } catch (error) {
          logger.error('Error during logout:', error);
        }
        
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          redirectToLogin: false,
          lastAuthCheck: null,
          sessionExpiry: null,
          sessionWarningShown: false,
          sessionMonitoringActive: false
        });
      },

      clearError: () => {
        set({ error: null });
      },

      // Get authentication headers for API calls
      getAuthHeaders: () => {
        const headers = {};
        
        // Use cookie-based authentication only (enterprise standard)
        logger.info('🔍 [AuthStore] Using cookie-based authentication');
        
        return headers;
      },

      // Professional authentication validation with proper caching
      validateToken: async () => {
        const { lastAuthCheck, authCheckInterval, isValidating, isAuthenticated, user } = get();
        
        // Prevent race conditions
        if (isValidating) {
          logger.debug('🔍 [AuthStore] Validation already in progress, skipping');
          return true;
        }
        
        // OPTIMIZATION: Skip validation if recently validated and user exists
        const now = new Date();
        const recentlyValidated = lastAuthCheck && (now - lastAuthCheck) < (5 * 60 * 1000); // 5 minutes
        const hasUserData = user && isAuthenticated;
        
        if (recentlyValidated && hasUserData) {
          logger.debug('🔍 [AuthStore] Recently validated with user data, skipping validation');
          return true;
        }
        
        logger.info('🔍 [AuthStore] Validating authentication with backend...');

        try {
          set({ isValidating: true });
          logger.info('🔍 [AuthStore] Making validation request to /api/auth/validate...');
          
          const data = await apiCall('/api/auth/validate');
          
          logger.info('🔍 [AuthStore] Validation response received:', data);
          
          // Check if validation was successful
          if (!data.success) {
            logger.error('❌ [AuthStore] Validation failed:', data.error);
            throw new Error(data.error || 'Authentication validation failed');
          }
          
          // Simple validation - if we get here, we're authenticated
          logger.info('✅ [AuthStore] Authentication validation successful');
          set({ 
            user: data.data?.user || data.user || null, 
            isAuthenticated: true, 
            lastAuthCheck: now,
            redirectToLogin: false,
            isValidating: false,
            error: null
          });
          return true;
        } catch (error) {
          logger.error('❌ [AuthStore] Authentication validation error:', error);
          set({ 
            isAuthenticated: false, 
            user: null,
            isValidating: false,
            redirectToLogin: true,
            error: error.message
          });
          
          // Show notification
          const notificationStore = useNotificationStore.getState();
          notificationStore.showNotification(
            'Session expired. Please log in again.',
            'Session Expired',
            false
          );

          return false;
        }
      },

      // Handle authentication failures without redirect
      handleAuthFailure: async (reason = 'Session expired') => {
        const { showWarning } = useNotificationStore.getState();
        
        logger.info('🔐 [AuthStore] Handling auth failure:', reason);
        
        // CRITICAL FIX: Always clear state when backend returns auth failure
        // The frontend state might be stale while backend cookies have expired
        logger.info('🔐 [AuthStore] Clearing authentication state due to backend auth failure');
        
        // Clear all authentication state immediately
        set({ 
          isAuthenticated: false, 
          user: null,
          redirectToLogin: false, // Don't force redirect, let React handle it
          lastAuthCheck: new Date(),
          error: reason
        });

        // Don't call logout endpoint to avoid infinite loop
        // Just clear the local state and let the user log in again

        // Only show notification for actual session expiry, not manual logout
        if (reason !== 'Manual logout') {
          showWarning(
            'Your session has expired. Please log in again.',
            'Session Expired',
            false
          );
        }

        // Don't force redirect - let React Router handle it naturally
      },

      // Reset redirect flag
      resetRedirectFlag: () => {
        set({ redirectToLogin: false });
      },

      // Refresh authentication if needed (cookies are handled automatically)
      refreshToken: async () => {
        try {
          logger.info('🔍 [AuthStore] Refreshing authentication...');
          const data = await apiCall('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include', // Include cookies
          });
          
          if (!data.success) {
            logger.info('❌ [AuthStore] Authentication refresh failed');
            set({ isAuthenticated: false, user: null });
            return false;
          }
          
          logger.info('✅ [AuthStore] Authentication refreshed successfully (cookies updated)');
          set({ isAuthenticated: true });
          return true;
        } catch (error) {
          logger.error('❌ [AuthStore] Authentication refresh error:', error);
          set({ isAuthenticated: false, user: null });
          return false;
        }
      },

      // Session Management Methods
      
      /**
       * Start session monitoring services
       */
      startSessionMonitoring: async () => {
        try {
          logger.info('🔍 [AuthStore] Starting session monitoring services...');
          
          // Start cross-tab synchronization
          crossTabSyncService.startSync();
          
          // Start activity tracking
          activityTrackerService.startTracking();
          
          // Start session monitoring
          sessionMonitorService.startMonitoring();
          
          // Setup event listeners
          get().setupSessionEventListeners();
          
          set({ sessionMonitoringActive: true });
          
          logger.info('✅ [AuthStore] Session monitoring services started');
          
        } catch (error) {
          logger.error('❌ [AuthStore] Failed to start session monitoring:', error);
        }
      },

      /**
       * Stop session monitoring services
       */
      stopSessionMonitoring: async () => {
        try {
          logger.info('🔍 [AuthStore] Stopping session monitoring services...');
          
          // Stop all services
          sessionMonitorService.stopMonitoring();
          activityTrackerService.stopTracking();
          crossTabSyncService.stopSync();
          
          // Remove event listeners
          get().removeSessionEventListeners();
          
          set({ sessionMonitoringActive: false });
          
          logger.info('✅ [AuthStore] Session monitoring services stopped');
          
        } catch (error) {
          logger.error('❌ [AuthStore] Failed to stop session monitoring:', error);
        }
      },

      /**
       * Setup session event listeners
       */
      setupSessionEventListeners: () => {
        // Session monitor events
        sessionMonitorService.on('session-warning-shown', (data) => {
          logger.info('🔍 [AuthStore] Session warning shown:', data);
          set({ sessionWarningShown: true });
        });

        sessionMonitorService.on('session-extended', (data) => {
          logger.info('🔍 [AuthStore] Session extended:', data);
          set({ 
            sessionExpiry: data.expiresAt,
            sessionWarningShown: false 
          });
        });

        sessionMonitorService.on('session-expired', () => {
          logger.info('🔍 [AuthStore] Session expired');
          get().handleAuthFailure('Session expired');
        });

        // Cross-tab sync events
        crossTabSyncService.on('session-expired', () => {
          logger.info('🔍 [AuthStore] Session expired in another tab');
          get().handleAuthFailure('Session expired in another tab');
        });

        crossTabSyncService.on('session-extended', (data) => {
          logger.info('🔍 [AuthStore] Session extended in another tab:', data);
          set({ sessionExpiry: data.expiresAt });
        });

        crossTabSyncService.on('logout', () => {
          logger.info('🔍 [AuthStore] Logout triggered in another tab');
          get().logout();
        });

        // Activity tracker events
        activityTrackerService.on('activity-debounced', async (data) => {
          if (data.patterns.active) {
            await get().recordActivity(data);
          }
        });
      },

      /**
       * Remove session event listeners
       */
      removeSessionEventListeners: () => {
        // Remove all event listeners
        sessionMonitorService.off('session-warning-shown');
        sessionMonitorService.off('session-extended');
        sessionMonitorService.off('session-expired');
        
        crossTabSyncService.off('session-expired');
        crossTabSyncService.off('session-extended');
        crossTabSyncService.off('logout');
        
        activityTrackerService.off('activity-debounced');
      },

      /**
       * Record user activity
       */
      recordActivity: async (activityData) => {
        try {
          const { user } = get();
          if (!user) return;

          await apiCall('/api/session/activity', {
            method: 'POST',
            body: JSON.stringify({
              type: 'user-interaction',
              details: {
                timestamp: activityData.timestamp,
                patterns: activityData.patterns
              },
              duration: activityData.timeSinceLastActivity || 0
            }),
            credentials: 'include'
          });

        } catch (error) {
          logger.error('❌ [AuthStore] Failed to record activity:', error);
        }
      },

      /**
       * Extend session manually
       */
      extendSession: async () => {
        try {
          logger.info('🔍 [AuthStore] Extending session...');
          
          const data = await apiCall('/api/session/extend', {
            method: 'POST',
            credentials: 'include'
          });

          if (data.success) {
            set({ 
              sessionExpiry: data.data.expiresAt,
              sessionWarningShown: false 
            });
            
            // Broadcast to other tabs
            crossTabSyncService.broadcastSessionExtended({
              expiresAt: data.data.expiresAt
            });
            
            logger.info('✅ [AuthStore] Session extended successfully');
            return true;
          } else {
            throw new Error(data.error || 'Failed to extend session');
          }
          
        } catch (error) {
          logger.error('❌ [AuthStore] Failed to extend session:', error);
          return false;
        }
      },

      /**
       * Update session expiry time
       */
      updateSessionExpiry: (expiresAt) => {
        set({ sessionExpiry: expiresAt });
      },

      /**
       * Get session status
       */
      getSessionStatus: async () => {
        try {
          const data = await apiCall('/api/session/status', {
            credentials: 'include'
          });

          if (data.success) {
            return data.data;
          } else {
            throw new Error(data.error || 'Failed to get session status');
          }
          
        } catch (error) {
          logger.error('❌ [AuthStore] Failed to get session status:', error);
          return null;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionExpiry: state.sessionExpiry,
      }),
    }
  )
);

export default useAuthStore; 