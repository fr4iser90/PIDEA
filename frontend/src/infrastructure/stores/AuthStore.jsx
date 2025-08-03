import { logger } from "@/infrastructure/logging/Logger";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useNotificationStore from './NotificationStore.jsx';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

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
      authCheckInterval: 5 * 60 * 1000, // 5 minutes (increased to reduce requests)
      isValidating: false, // New state for race condition protection

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

          // CRITICAL FIX: Validate authentication with backend before setting state
          logger.info('🔍 [AuthStore] Validating authentication with backend...');
          const validationResult = await get().validateToken();
          
          if (!validationResult) {
            throw new Error('Authentication validation failed after login');
          }

          logger.info('✅ [AuthStore] Authentication validated successfully with backend');

          set({
            user: userData.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            redirectToLogin: false,
            lastAuthCheck: new Date()
          });

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
          lastAuthCheck: null
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
        const { lastAuthCheck, authCheckInterval, isValidating, isAuthenticated } = get();
        
        // Prevent race conditions
        if (isValidating) {
          logger.debug('🔍 [AuthStore] Validation already in progress, skipping');
          return true;
        }
        
        // ALWAYS validate with backend - never trust localStorage
        const now = new Date();
        const shouldValidate = !lastAuthCheck || (now - lastAuthCheck) >= authCheckInterval;
        
        // Remove the localStorage trust - always validate
        logger.debug('🔍 [AuthStore] Validating authentication with backend...');

        try {
          set({ isValidating: true });
          logger.debug('🔍 [AuthStore] Validating authentication...');
          
          const data = await apiCall('/api/auth/validate');
          
          // Check if validation was successful
          if (!data.success) {
            throw new Error(data.error || 'Authentication validation failed');
          }
          
          // Simple validation - if we get here, we're authenticated
          logger.debug('✅ [AuthStore] Authentication validation successful');
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
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore; 