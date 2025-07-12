# Phase 3: Instant Auto-Redirect Integration

## Overview
Implement seamless instant auto-redirect functionality that detects authentication failures and immediately redirects users to the login page with appropriate notifications, replacing the current intrusive error displays. No countdown, instant redirect.

## Implementation Steps

### 1. Enhance AuthStore with Instant Auto-Redirect Logic
**File**: `frontend/src/infrastructure/stores/AuthStore.jsx`

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useNotificationStore from './NotificationStore.jsx';

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
            redirectToLogin: false,
            lastAuthCheck: new Date()
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

      logout: () => {
        set({
          user: null,
          token: null,
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

      // Enhanced token validation with instant auto-redirect
      validateToken: async () => {
        const { token, lastAuthCheck, authCheckInterval } = get();
        
        if (!token) {
          console.log('🔍 [AuthStore] No token found for validation');
          set({ isAuthenticated: false });
          return false;
        }

        // Check if we need to validate (avoid too frequent checks)
        const now = new Date();
        if (lastAuthCheck && (now - lastAuthCheck) < authCheckInterval) {
          console.log('🔍 [AuthStore] Skipping validation, too recent');
          return true;
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
            await get().handleAuthFailure('Token validation failed');
            return false;
          }

          const data = await response.json();
          console.log('✅ [AuthStore] Token validation successful');
          set({ 
            user: data.user, 
            isAuthenticated: true, 
            lastAuthCheck: now,
            redirectToLogin: false
          });
          return true;
        } catch (error) {
          console.error('❌ [AuthStore] Token validation error:', error);
          await get().handleAuthFailure('Authentication check failed');
          return false;
        }
      },

      // Handle authentication failures with instant redirect
      handleAuthFailure: async (reason = 'Session expired') => {
        const { showWarning } = useNotificationStore.getState();
        
        console.log('🔐 [AuthStore] Handling auth failure:', reason);
        
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
        window.location.href = '/login';
      },

      // Enhanced API call wrapper with instant auto-redirect
      apiCall: async (url, options = {}) => {
        const { token, getAuthHeaders, handleAuthFailure } = get();
        
        const config = {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options.headers
          },
          ...options
        };

        try {
          const response = await fetch(url, config);
          
          if (response.status === 401) {
            console.log('🔐 [AuthStore] 401 Unauthorized detected');
            await handleAuthFailure('Authentication required');
            throw new Error('Authentication required. Please log in again.');
          }
          
          return response;
        } catch (error) {
          if (error.message.includes('Authentication required')) {
            throw error;
          }
          
          // Handle network errors
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.log('🌐 [AuthStore] Network error detected');
            const { showError } = useNotificationStore.getState();
            showError('Network connection issue. Please check your internet connection.');
          }
          
          throw error;
        }
      },

      // Getter for authenticated API calls
      getAuthHeaders: () => {
        const { token } = get();
        console.log('🔍 [AuthStore] getAuthHeaders called, token:', token ? token.substring(0, 20) + '...' : 'null');
        return token ? { Authorization: `Bearer ${token}` } : {};
      },

      // Refresh token if needed
      refreshToken: async () => {
        const { token } = get();
        if (!token) {
          return false;
        }

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: token }),
          });

          if (!response.ok) {
            await get().handleAuthFailure('Token refresh failed');
            return false;
          }

          const data = await response.json();
          set({
            token: data.accessToken,
            lastAuthCheck: new Date()
          });

          return true;
        } catch (error) {
          console.error('❌ [AuthStore] Token refresh failed:', error);
          await get().handleAuthFailure('Token refresh failed');
          return false;
        }
      },

      // Reset redirect flag
      resetRedirectFlag: () => {
        set({ redirectToLogin: false });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        lastAuthCheck: state.lastAuthCheck
      })
    }
  )
);

export default useAuthStore;
```

### 2. Update AuthWrapper with Notification Integration
**File**: `frontend/src/presentation/components/auth/AuthWrapper.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import LoginComponent from './LoginComponent.jsx';
import RegisterComponent from './RegisterComponent.jsx';

const AuthWrapper = ({ children }) => {
  const { 
    isAuthenticated, 
    validateToken, 
    isLoading, 
    token, 
    redirectToLogin,
    resetRedirectFlag 
  } = useAuthStore();
  
  const { showInfo, showWarning } = useNotificationStore();
  
  const [authMode, setAuthMode] = useState('login');
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      setIsValidating(true);
      setValidationError(null);
      
      try {
        console.log('🔍 [AuthWrapper] Checking authentication...');
        const isValid = await validateToken();
        
        if (!isValid) {
          console.log('❌ [AuthWrapper] Token validation failed');
          setValidationError('Session expired. Please log in again.');
          showWarning('Your session has expired. Please log in again.', 'Session Expired');
        } else {
          console.log('✅ [AuthWrapper] Token validation successful');
          showInfo('Welcome back!', 'Authentication Successful');
        }
      } catch (error) {
        console.error('❌ [AuthWrapper] Token validation error:', error);
        setValidationError('Authentication check failed. Please log in again.');
        showWarning('Authentication check failed. Please log in again.', 'Authentication Error');
      } finally {
        setIsValidating(false);
      }
    };

    // Only validate if we have a token
    if (token) {
      checkAuth();
    } else {
      console.log('🔍 [AuthWrapper] No token found, skipping validation');
      setIsValidating(false);
    }
  }, [validateToken, token, showWarning, showInfo]);

  // Handle redirect to login
  useEffect(() => {
    if (redirectToLogin && !isValidating) {
      console.log('🔄 [AuthWrapper] Redirecting to login...');
      resetRedirectFlag();
      // The redirect is handled by AuthStore.handleAuthFailure
    }
  }, [redirectToLogin, isValidating, resetRedirectFlag]);

  const handleSwitchToRegister = () => {
    setAuthMode('register');
    setValidationError(null);
  };

  const handleSwitchToLogin = () => {
    setAuthMode('login');
    setValidationError(null);
  };

  // Show loading while validating token
  if (isValidating || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {isValidating ? 'Validating session...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show auth forms if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        {validationError && (
          <div className="auth-error-banner">
            <span>⚠️ {validationError}</span>
          </div>
        )}
        
        {authMode === 'login' ? (
          <LoginComponent 
            onSwitchToRegister={handleSwitchToRegister}
            validationError={validationError}
          />
        ) : (
          <RegisterComponent 
            onSwitchToLogin={handleSwitchToLogin}
            validationError={validationError}
          />
        )}
      </div>
    );
  }

  // Show main app if authenticated
  return children;
};

export default AuthWrapper;
```

### 3. Implement Session Expiration Detection
**File**: `frontend/src/infrastructure/services/SessionMonitor.js`

```javascript
class SessionMonitor {
  constructor() {
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.warningThreshold = 2 * 60 * 1000; // 2 minutes before expiry
    this.intervalId = null;
    this.authStore = null;
    this.notificationStore = null;
  }

  initialize(authStore, notificationStore) {
    this.authStore = authStore;
    this.notificationStore = notificationStore;
    this.startMonitoring();
  }

  startMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.checkSession();
    }, this.checkInterval);

    console.log('🔍 [SessionMonitor] Session monitoring started');
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🔍 [SessionMonitor] Session monitoring stopped');
  }

  async checkSession() {
    if (!this.authStore) return;

    const { token, validateToken, handleAuthFailure } = this.authStore.getState();
    
    if (!token) {
      return;
    }

    try {
      // Try to validate token
      const isValid = await validateToken();
      
      if (!isValid) {
        console.log('🔐 [SessionMonitor] Session expired, triggering logout');
        await handleAuthFailure('Session expired');
      }
    } catch (error) {
      console.error('❌ [SessionMonitor] Session check failed:', error);
      await handleAuthFailure('Session check failed');
    }
  }

  // Check if token is about to expire
  checkTokenExpiry(token) {
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;

      // Show warning if token expires soon
      if (timeUntilExpiry > 0 && timeUntilExpiry < this.warningThreshold) {
        const minutesLeft = Math.ceil(timeUntilExpiry / (60 * 1000));
        this.notificationStore?.getState().showWarning(
          `Your session will expire in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}. Please save your work.`,
          'Session Expiring Soon'
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [SessionMonitor] Failed to parse token:', error);
      return false;
    }
  }

  // Extend session if possible
  async extendSession() {
    if (!this.authStore) return false;

    const { refreshToken } = this.authStore.getState();
    return await refreshToken();
  }
}

// Singleton instance
const sessionMonitor = new SessionMonitor();
export default sessionMonitor;
```

### 4. Update App.jsx with Global Notification System
**File**: `frontend/src/App.jsx`

```javascript
import React, { useState, useEffect, useRef } from 'react';
import EventBus from '@/infrastructure/events/EventBus.jsx';
import ChatComponent from '@/presentation/components/chat/main/ChatComponent.jsx';
import SidebarLeft from '@/presentation/components/SidebarLeft.jsx';
import SidebarRight from '@/presentation/components/SidebarRight.jsx';
import IDEMirrorComponent from '@/presentation/components/mirror/main/IDEMirrorComponent.jsx';
import PreviewComponent from '@/presentation/components/chat/main/PreviewComponent.jsx';
import GitManagementComponent from '@/presentation/components/git/main/GitManagementComponent.jsx';
import AuthWrapper from '@/presentation/components/auth/AuthWrapper.jsx';
import Header from '@/presentation/components/Header.jsx';
import Footer from '@/presentation/components/Footer.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import NotificationSystem from '@/presentation/components/common/NotificationSystem.jsx';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import { IDEProvider } from '@/presentation/components/ide/IDEContext.jsx';

function App() {
  const [eventBus] = useState(() => new EventBus());
  const [currentView, setCurrentView] = useState('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activePort, setActivePort] = useState(null);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(true);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(true);
  const [gitStatus, setGitStatus] = useState(null);
  const [gitBranch, setGitBranch] = useState('');
  const [attachedPrompts, setAttachedPrompts] = useState([]);
  const containerRef = useRef(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    console.log('🔄 App initializing...');
    setupEventListeners();
    initializeApp();
    fetchActivePort();
    return () => {
      // Cleanup if needed
    };
  }, []);

  const setupEventListeners = () => {
    if (eventBus) {
      eventBus.on('view-change', handleViewChange);
      eventBus.on('app-loading', handleLoading);
      eventBus.on('app-error', handleError);
      eventBus.on('app-ready', handleReady);
    }
  };

  const initializeApp = () => {
    setIsLoading(true);
    
    // Simulate app initialization
    setTimeout(() => {
      setIsLoading(false);
      if (eventBus) {
        eventBus.emit('app-ready');
      }
    }, 1000);
  };

  const handleViewChange = (data) => {
    setCurrentView(data.view);
  };

  const handleLoading = (data) => {
    setIsLoading(data.isLoading);
  };

  const handleError = (data) => {
    setError(data.error);
  };

  const handleReady = () => {
    console.log('✅ App ready');
  };

  // ... rest of existing methods ...

  if (isLoading) {
    return (
      <div className="app-root">
        <div className="loading-message">
          <div className="loading-spinner"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-root">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }

  return (
    <AuthWrapper>
      <IDEProvider eventBus={eventBus}>
        <div ref={containerRef} className="app-root">
          {/* Global Notification System */}
          <NotificationSystem />
          
          <Header 
            eventBus={eventBus}
            currentView={currentView}
            onNavigationClick={handleNavigationClick}
            onLeftSidebarToggle={handleLeftSidebarToggle}
            onRightSidebarToggle={handleRightSidebarToggle}
          />

          {/* Main Content */}
          <main className={`main-layout${isSplitView ? ' split-view' : ''}${!isLeftSidebarVisible ? ' sidebar-hidden' : ''}${!isRightSidebarVisible ? ' rightpanel-hidden' : ''}`}>
            {/* Left Sidebar */}
            {isLeftSidebarVisible && (
              <SidebarLeft eventBus={eventBus} activePort={activePort} onActivePortChange={setActivePort} />
            )}
            
            {/* Main View */}
            <div className="main-content">
              {renderView()}
              {isSplitView && <PreviewComponent eventBus={eventBus} activePort={activePort} />}
            </div>
            
            {/* Right Sidebar */}
            {isRightSidebarVisible && <SidebarRight eventBus={eventBus} attachedPrompts={attachedPrompts} setAttachedPrompts={setAttachedPrompts} activePort={activePort} />}
          </main>

          <Footer />
        </div>
      </IDEProvider>
    </AuthWrapper>
  );
}

export default App;
```

## Success Criteria
- [ ] Auto-redirect works instantly on authentication failures (no countdown)
- [ ] Session monitoring detects expired tokens
- [ ] Users receive appropriate notifications before redirect
- [ ] No intrusive error displays
- [ ] Smooth user experience during authentication flows
- [ ] Global notification system integrated

## Testing Checklist
- [ ] Test instant auto-redirect on token expiration
- [ ] Test session monitoring functionality
- [ ] Test notification integration
- [ ] Test network error handling
- [ ] Test manual logout functionality
- [ ] Test global notification system

## Next Phase
Proceed to Phase 4: API Error Handling Enhancement for improving error responses and categorization. 