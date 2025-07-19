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
      token: null,
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

          // Backend returns: { success: true, data: { user, accessToken, refreshToken, expiresAt } }
          const userData = data.data || data;
          const token = userData.accessToken || userData.token;

          logger.info('🔍 [AuthStore] Parsed response data:', {
            hasData: !!data.data,
            userDataKeys: Object.keys(userData || {}),
            tokenExists: !!token,
            tokenLength: token ? token.length : 0
          });

          logger.info('🔍 [AuthStore] Extracted data:', {
            user: userData.user,
            token: token ? token.substring(0, 20) + '...' : 'null',
            tokenLength: token ? token.length : 0
          });

          set({
            user: userData.user,
            token: token,
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
          const userData = data.data || data;
          const token = userData.accessToken || userData.token;

          set({
            user: userData.user,
            token: token,
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
          // Call logout endpoint to clear cookies
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

      // Enhanced token validation with instant auto-redirect
      validateToken: async () => {
        const { lastAuthCheck, authCheckInterval } = get();
        
        // Check if we need to validate (avoid too frequent checks)
        const now = new Date();
        if (lastAuthCheck && (now - lastAuthCheck) < authCheckInterval) {
          logger.info('🔍 [AuthStore] Skipping validation, too recent');
          return true;
        }

        try {
          logger.info('🔍 [AuthStore] Validating token...');
          
          const data = await apiCall('/api/auth/validate');
          logger.info('✅ [AuthStore] Token validation successful');
          set({ 
            user: data.data?.user || data.user, 
            isAuthenticated: true, 
            lastAuthCheck: now,
            redirectToLogin: false
          });
          return true;
        } catch (error) {
          logger.error('❌ [AuthStore] Token validation error:', error);
          await get().handleAuthFailure('Authentication check failed');
          return false;
        }
      },

      // Handle authentication failures with instant redirect
      handleAuthFailure: async (reason = 'Session expired') => {
        const { showWarning } = useNotificationStore.getState();
        
        logger.info('🔐 [AuthStore] Handling auth failure:', reason);
        
        set({ 
          isAuthenticated: false, 
          token: null, 
          user: null,
          redirectToLogin: true,
          lastAuthCheck: new Date()
        });

        // Show notification
        showWarning(
          'Your session has expired. Redirecting to login...',
          'Session Expired',
          false
        );

        // Instant redirect - no countdown
        window.location.href = '/';
      },

      // Reset redirect flag
      resetRedirectFlag: () => {
        set({ redirectToLogin: false });
      },

      // Refresh token if needed
      refreshToken: async () => {
        try {
          logger.info('🔍 [AuthStore] Refreshing token...');
          const data = await apiCall('/api/auth/refresh', {
            method: 'POST',
          });
          
          if (!data.success) {
            logger.info('❌ [AuthStore] Token refresh failed');
            set({ isAuthenticated: false, token: null, user: null });
            return false;
          }
          
          const userData = data.data || data;
          const newToken = userData.accessToken || userData.token;
          
          logger.info('✅ [AuthStore] Token refreshed successfully');
          set({ token: newToken, isAuthenticated: true });
          return true;
        } catch (error) {
          logger.error('❌ [AuthStore] Token refresh error:', error);
          set({ isAuthenticated: false, token: null, user: null });
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