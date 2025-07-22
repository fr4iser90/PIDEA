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
      authCheckInterval: 5 * 60 * 1000, // 5 minutes

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
          // Authentication handled via httpOnly cookies
          const userData = data.data || data;

          logger.info('🔍 [AuthStore] Login successful, cookies set by backend');
          logger.info('🔍 [AuthStore] User data:', userData.user);

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
        
        // Cookies are sent automatically with credentials: 'include'
        // No need to manually add Authorization header when using cookies
        logger.info('🔍 [AuthStore] Using cookie-based authentication');
        
        return headers;
      },

      // Enhanced authentication validation with instant auto-redirect
      validateToken: async () => {
        const { lastAuthCheck, authCheckInterval } = get();
        
        // Check if we need to validate (avoid too frequent checks)
        const now = new Date();
        if (lastAuthCheck && (now - lastAuthCheck) < authCheckInterval) {
          logger.info('🔍 [AuthStore] Skipping validation, too recent');
          return true;
        }

        try {
          logger.info('🔍 [AuthStore] Validating authentication...');
          
          const data = await apiCall('/api/auth/validate');
          logger.info('✅ [AuthStore] Authentication validation successful');
          set({ 
            user: data.data?.user || data.user, 
            isAuthenticated: true, 
            lastAuthCheck: now,
            redirectToLogin: false
          });
          return true;
        } catch (error) {
          logger.error('❌ [AuthStore] Authentication validation error:', error);
          // Set lastAuthCheck even on failure to prevent infinite loops
          set({ lastAuthCheck: now });
          await get().handleAuthFailure('Authentication check failed');
          return false;
        }
      },

      // Handle authentication failures without redirect
      handleAuthFailure: async (reason = 'Session expired') => {
        const { showWarning } = useNotificationStore.getState();
        
        logger.info('🔐 [AuthStore] Handling auth failure:', reason);
        
        set({ 
          isAuthenticated: false, 
          user: null,
          redirectToLogin: false, // Don't auto-redirect when user clears cookies
          lastAuthCheck: new Date()
        });

        // Only show notification for actual session expiry, not manual logout
        if (reason !== 'Manual logout') {
          showWarning(
            'Your session has expired. Please log in again.',
            'Session Expired',
            false
          );
        }

        // No automatic redirect - let AuthWrapper handle it
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