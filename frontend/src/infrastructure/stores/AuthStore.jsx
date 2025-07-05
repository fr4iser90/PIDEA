import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔍 [AuthStore] Attempting login for:', email);
          
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();
          console.log('🔍 [AuthStore] Login response:', data);

          if (!response.ok) {
            throw new Error(data.error || data.message || 'Login failed');
          }

          // Backend returns: { success: true, data: { user, accessToken, refreshToken, expiresAt } }
          const userData = data.data || data;
          const token = userData.accessToken || userData.token;

          console.log('🔍 [AuthStore] Extracted data:', {
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
          });

          console.log('✅ [AuthStore] Login successful, state updated');
          return { success: true };
        } catch (error) {
          console.error('❌ [AuthStore] Login failed:', error);
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
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, username }),
          });

          const data = await response.json();

          if (!response.ok) {
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

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      // Getter for authenticated API calls
      getAuthHeaders: () => {
        const { token } = get();
        console.log('🔍 [AuthStore] getAuthHeaders called, token:', token ? token.substring(0, 20) + '...' : 'null');
        return token ? { Authorization: `Bearer ${token}` } : {};
      },

      // Check if token is valid
      validateToken: async () => {
        const { token } = get();
        if (!token) {
          console.log('🔍 [AuthStore] No token found for validation');
          set({ isAuthenticated: false });
          return false;
        }

        try {
          console.log('🔍 [AuthStore] Validating token...');
          const response = await fetch('/api/auth/validate', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          console.log('🔍 [AuthStore] Validation response status:', response.status);

          if (!response.ok) {
            console.log('❌ [AuthStore] Token validation failed:', response.status);
            set({ isAuthenticated: false, token: null, user: null });
            return false;
          }

          const data = await response.json();
          console.log('✅ [AuthStore] Token validation successful');
          set({ user: data.user, isAuthenticated: true });
          return true;
        } catch (error) {
          console.error('❌ [AuthStore] Token validation error:', error);
          set({ isAuthenticated: false, token: null, user: null });
          return false;
        }
      },

      // Refresh token if needed
      refreshToken: async () => {
        const { token } = get();
        if (!token) {
          console.log('🔍 [AuthStore] No token to refresh');
          return false;
        }

        try {
          console.log('🔍 [AuthStore] Refreshing token...');
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            console.log('❌ [AuthStore] Token refresh failed');
            set({ isAuthenticated: false, token: null, user: null });
            return false;
          }

          const data = await response.json();
          const newToken = data.accessToken || data.token;
          
          console.log('✅ [AuthStore] Token refreshed successfully');
          set({ token: newToken, isAuthenticated: true });
          return true;
        } catch (error) {
          console.error('❌ [AuthStore] Token refresh error:', error);
          set({ isAuthenticated: false, token: null, user: null });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore; 