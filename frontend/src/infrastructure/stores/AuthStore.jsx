import { logger } from "@/infrastructure/logging/Logger";
import { create } from 'zustand';
import useNotificationStore from './NotificationStore.jsx';
import apiService from '@/infrastructure/services/ApiService.js';
import sessionMonitorService from '../services/SessionMonitorService.jsx';
import activityTrackerService from '../services/ActivityTrackerService.jsx';
import crossTabSyncService from '../services/CrossTabSyncService.jsx';
import TimeoutConfig from '@/config/timeout-config.js';

const useAuthStore = create(
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
      isInitialized: false, // Track if store has been initialized
      
      // Session management state
      sessionExpiry: null,
      sessionWarningShown: false,
      sessionMonitoringActive: false,

      // Actions
      
      // Initialize store with cookie-only authentication
      initialize: async () => {
        const { isInitialized, isValidating } = get();
        
        // Prevent multiple initializations
        if (isInitialized || isValidating) {
          logger.debug('🔍 [AuthStore] Already initialized or validation in progress');
          return;
        }
        
        logger.info('🔍 [AuthStore] Initializing with cookie-only authentication...');
        set({ isValidating: true });
        
        try {
          // Check for cookies - if no cookies, user is not authenticated
          // Debug: Log all cookies to see what's available
          logger.info('🔍 [AuthStore] All cookies:', document.cookie);
          const hasAccessToken = document.cookie.includes('accessToken');
          const hasRefreshToken = document.cookie.includes('refreshToken');
          logger.info('🔍 [AuthStore] Has accessToken:', hasAccessToken, 'Has refreshToken:', hasRefreshToken);
          
          // If no cookies at all, user is not authenticated
          if (!hasAccessToken && !hasRefreshToken) {
            logger.info('❌ [AuthStore] No authentication cookies found');
            set({ 
              isAuthenticated: false, 
              user: null,
              isValidating: false,
              isInitialized: true,
              error: null,
              redirectToLogin: true
            });
            return;
          }
          
          // Validate cookies with backend - force validation during initialization
          logger.info('🔍 [AuthStore] Found cookies, validating with backend...');
          const isValid = await get().validateToken(true); // Force validation during initialization
          
          if (!isValid) {
            logger.info('❌ [AuthStore] Cookie validation failed');
            set({ 
              isAuthenticated: false, 
              user: null,
              isValidating: false,
              isInitialized: true,
              error: null,
              redirectToLogin: true
            });
            return;
          }
          
          logger.info('✅ [AuthStore] Cookie validation successful');
          
          // Get the current state after validation (which should have set the user)
          const currentState = get();
          logger.info('🔍 [AuthStore] State after validation:', { 
            isAuthenticated: currentState.isAuthenticated, 
            user: currentState.user,
            userId: currentState.user?.id 
          });
          
          // CRITICAL FIX: Ensure user state is preserved from validation
          set({ 
            isValidating: false,
            isInitialized: true,
            isAuthenticated: true,
            user: currentState.user, // Preserve user from validation
            error: null
          });
          
          logger.info('✅ [AuthStore] Initialization complete');
          logger.info('🔍 [AuthStore] Final state:', { 
            isAuthenticated: true, 
            user: currentState.user, 
            isInitialized: true 
          });
          
        } catch (error) {
          logger.error('❌ [AuthStore] Initialization failed:', error);
          set({ 
            isAuthenticated: false, 
            user: null,
            isValidating: false,
            isInitialized: true,
            error: error.message,
            redirectToLogin: true
          });
        }
      },
      
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        
        try {
          logger.debug('🔍 [AuthStore] Attempting login for:', email);
          
          const data = await apiService.call('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            credentials: 'include', // Include cookies
          });

          // Check if cookies were set
          logger.info('🔍 [AuthStore] Login response received, checking cookies...');
          logger.info('🔍 [AuthStore] Login response:', data);

          if (!data || !data.user) {
            throw new Error('Login failed - invalid response');
          }

          // Backend returns: { user: {...}, accessToken: "...", refreshToken: "...", expiresAt: {...} }
          const user = data.user;

          logger.info('🔍 [AuthStore] Login successful, cookies set by backend');
          logger.info('🔍 [AuthStore] User data:', user);

          // SIMPLIFIED: Trust the login response and set state immediately
          // Cookies are set by backend, no need for immediate validation
          logger.info('✅ [AuthStore] Login successful, setting authentication state');

          set({
            user: user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            redirectToLogin: false,
            lastAuthCheck: new Date(),
            sessionExpiry: data.expiresAt || null
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
          return { error: error.message };
        }
      },

      register: async (email, password, username) => {
        set({ isLoading: true, error: null });
        
        try {
          const data = await apiService.call('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, username }),
          });

          // Backend now sends data directly - no success wrapper
          if (!data || !data.user) {
            throw new Error('Registration failed - invalid response');
          }

          // Backend returns: { user: {...} } for register
          // Authentication handled via httpOnly cookies

          // CRITICAL FIX: Add delay to ensure cookies are properly set
          logger.info('🔍 [AuthStore] Waiting for cookies to be properly set after registration...');
          await new Promise(resolve => setTimeout(resolve, TimeoutConfig.getTimeout('AUTH', 'COOKIE_DELAY'))); // Use configurable delay

          // Validate authentication immediately after registration
          logger.info('🔍 [AuthStore] Validating authentication after registration...');
          const validationResult = await get().validateToken(true); // Force validation after registration
          
          if (!validationResult) {
            throw new Error('Authentication validation failed after registration');
          }

          logger.info('✅ [AuthStore] Authentication validated successfully after registration');

          set({
            user: data.user,
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
          return { error: error.message };
        }
      },

      logout: async () => {
        try {
          // SECURITY: Disconnect WebSocket before logout
          try {
            const { default: webSocketService } = await import('@/infrastructure/services/WebSocketService.jsx');
            webSocketService.disconnect();
            logger.info('✅ [AuthStore] WebSocket disconnected during logout');
          } catch (error) {
            logger.warn('⚠️ [AuthStore] WebSocket disconnect failed during logout:', error.message);
          }
          
          // Stop session monitoring services
          await get().stopSessionMonitoring();
          
          // Call logout endpoint to clear httpOnly cookies
          await apiService.call('/api/auth/logout', {
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
      validateToken: async (forceValidation = false) => {
        const { lastAuthCheck, authCheckInterval, isValidating, isAuthenticated, user } = get();
        
        // Prevent race conditions - but allow forced validation during initialization
        if (isValidating && !forceValidation) {
          logger.debug('🔍 [AuthStore] Validation already in progress, waiting for completion...');
          // Wait for the current validation to complete instead of skipping
          return new Promise((resolve) => {
            const checkValidation = () => {
              const currentState = get();
              if (!currentState.isValidating) {
                resolve(currentState.isAuthenticated);
              } else {
                setTimeout(checkValidation, 100);
              }
            };
            checkValidation();
          });
        }
        
        // OPTIMIZATION: Skip validation if recently validated and user exists (unless forced)
        const now = new Date();
        const recentlyValidated = lastAuthCheck && (now - lastAuthCheck) < (5 * 60 * 1000); // 5 minutes
        const hasUserData = user && isAuthenticated;
        
        if (recentlyValidated && hasUserData && !forceValidation) {
          logger.debug('🔍 [AuthStore] Recently validated with user data, skipping validation');
          return true;
        }
        
        logger.info('🔍 [AuthStore] Validating authentication with backend...');

        try {
          set({ isValidating: true });
          logger.info('🔍 [AuthStore] Making validation request to /api/auth/validate...');
          
          const data = await apiService.call('/api/auth/validate');
          
          logger.info('🔍 [AuthStore] Validation response received:', data);
          
          // Backend now sends data directly - no success wrapper
          // If we get here, validation was successful (no error thrown)
          if (!data || !data.user) {
            logger.error('❌ [AuthStore] Validation failed - no user data:', data);
            
            // If validation failed, try to refresh the token
            logger.info('🔄 [AuthStore] Trying to refresh token...');
            try {
              const refreshData = await apiService.call('/api/auth/refresh');
              logger.info('🔍 [AuthStore] Refresh response:', refreshData);
              
              if (refreshData && refreshData.user) {
                logger.info('✅ [AuthStore] Token refreshed successfully');
                set({ 
                  user: refreshData.user, 
                  isAuthenticated: true, 
                  lastAuthCheck: now,
                  redirectToLogin: false,
                  isValidating: false,
                  error: null
                });
                return true;
              }
            } catch (refreshError) {
              logger.error('❌ [AuthStore] Token refresh failed:', refreshError);
            }
            
            // All authentication attempts failed
            throw new Error('Authentication validation failed');
          }
          
          // Simple validation - if we get here, we're authenticated
          logger.info('✅ [AuthStore] Authentication validation successful');
          set({ 
            user: data.user, 
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
        
        // SECURITY: Disconnect WebSocket on auth failure
        try {
          const { default: webSocketService } = await import('@/infrastructure/services/WebSocketService.jsx');
          webSocketService.disconnect();
          logger.info('✅ [AuthStore] WebSocket disconnected due to auth failure');
        } catch (error) {
          logger.warn('⚠️ [AuthStore] WebSocket disconnect failed during auth failure:', error.message);
        }

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
          const data = await apiService.call('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include', // Include cookies
          });
          
          // Backend now sends data directly
          if (!data || !data.user) {
            logger.info('❌ [AuthStore] Authentication refresh failed');
            set({ isAuthenticated: false, user: null });
            return false;
          }
          
          logger.info('✅ [AuthStore] Authentication refreshed successfully (cookies updated)');
          set({ isAuthenticated: true, user: data.user });
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
          
          // SECURITY: Start WebSocket connection after successful authentication
          try {
            const { default: webSocketService } = await import('@/infrastructure/services/WebSocketService.jsx');
            await webSocketService.connect();
            logger.info('✅ [AuthStore] WebSocket connection established after login');
          } catch (error) {
            logger.warn('⚠️ [AuthStore] WebSocket connection failed after login:', error.message);
            // Don't fail login if WebSocket fails
          }
          
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

          await apiService.call('/api/session/activity', {
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
          
          const data = await apiService.call('/api/session/extend', {
            method: 'POST',
            credentials: 'include'
          });

          // Backend now sends data directly
          if (data && data.expiresAt) {
            set({ 
              sessionExpiry: data.expiresAt,
              sessionWarningShown: false 
            });
            
            // Broadcast to other tabs
            crossTabSyncService.broadcastSessionExtended({
              expiresAt: data.expiresAt
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
          const data = await apiService.call('/api/session/status', {
            credentials: 'include'
          });

          // Backend now sends data directly
          if (data) {
            return data;
          } else {
            throw new Error('Failed to get session status');
          }
          
        } catch (error) {
          logger.error('❌ [AuthStore] Failed to get session status:', error);
          return null;
        }
      },
    })
);

export default useAuthStore; 