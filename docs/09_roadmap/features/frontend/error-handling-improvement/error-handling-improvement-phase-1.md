# Phase 1: Notification System Foundation

## Overview
Create the foundation for a centralized notification system that will handle all error messages, warnings, and success notifications in a compact, user-friendly way.

## Implementation Steps

### 1. Create NotificationStore with Zustand
**File**: `frontend/src/infrastructure/stores/NotificationStore.jsx`

```javascript
import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  maxNotifications: 5,
  autoDismissDelay: 5000, // 5 seconds

  // Actions
  addNotification: (notification) => {
    const { notifications, maxNotifications } = get();
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      dismissed: false,
      ...notification
    };

    set({
      notifications: [newNotification, ...notifications].slice(0, maxNotifications)
    });

    // Auto-dismiss for non-persistent notifications
    if (!notification.persistent) {
      setTimeout(() => {
        get().dismissNotification(newNotification.id);
      }, get().autoDismissDelay);
    }
  },

  dismissNotification: (id) => {
    set({
      notifications: get().notifications.filter(n => n.id !== id)
    });
  },

  clearAllNotifications: () => {
    set({ notifications: [] });
  },

  // Helper methods
  showError: (message, title = 'Error', persistent = false) => {
    get().addNotification({
      type: 'error',
      title,
      message,
      persistent,
      icon: '❌'
    });
  },

  showWarning: (message, title = 'Warning', persistent = false) => {
    get().addNotification({
      type: 'warning',
      title,
      message,
      persistent,
      icon: '⚠️'
    });
  },

  showSuccess: (message, title = 'Success', persistent = false) => {
    get().addNotification({
      type: 'success',
      title,
      message,
      persistent,
      icon: '✅'
    });
  },

  showInfo: (message, title = 'Info', persistent = false) => {
    get().addNotification({
      type: 'info',
      title,
      message,
      persistent,
      icon: 'ℹ️'
    });
  }
}));

export default useNotificationStore;
```

### 2. Implement NotificationSystem Component
**File**: `frontend/src/presentation/components/common/NotificationSystem.jsx`

```javascript
import React, { useEffect, useRef } from 'react';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import './NotificationSystem.css';

const NotificationSystem = () => {
  const { notifications, dismissNotification } = useNotificationStore();
  const containerRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to latest notification
    if (containerRef.current && notifications.length > 0) {
      containerRef.current.scrollTop = 0;
    }
  }, [notifications]);

  const handleDismiss = (id) => {
    dismissNotification(id);
  };

  const getNotificationClass = (type) => {
    switch (type) {
      case 'error': return 'notification-error';
      case 'warning': return 'notification-warning';
      case 'success': return 'notification-success';
      case 'info': return 'notification-info';
      default: return 'notification-default';
    }
  };

  return (
    <div className="notification-system" ref={containerRef}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification ${getNotificationClass(notification.type)}`}
          onClick={() => !notification.persistent && handleDismiss(notification.id)}
        >
          <div className="notification-header">
            <span className="notification-icon">{notification.icon}</span>
            <span className="notification-title">{notification.title}</span>
            <button
              className="notification-close"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(notification.id);
              }}
            >
              ×
            </button>
          </div>
          <div className="notification-message">{notification.message}</div>
          {notification.persistent && (
            <div className="notification-actions">
              <button
                className="notification-dismiss-btn"
                onClick={() => handleDismiss(notification.id)}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
```

### 3. Add Notification CSS Styles
**File**: `frontend/src/css/components/notification.css`

```css
.notification-system {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  pointer-events: none;
}

.notification {
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: slideIn 0.3s ease-out;
  max-width: 100%;
}

.notification:hover {
  transform: translateX(-4px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.notification-error {
  border-left: 4px solid #e53e3e;
  background: linear-gradient(135deg, #2d3748 0%, #2a2025 100%);
}

.notification-warning {
  border-left: 4px solid #d69e2e;
  background: linear-gradient(135deg, #2d3748 0%, #2a2520 100%);
}

.notification-success {
  border-left: 4px solid #38a169;
  background: linear-gradient(135deg, #2d3748 0%, #202a25 100%);
}

.notification-info {
  border-left: 4px solid #3182ce;
  background: linear-gradient(135deg, #2d3748 0%, #20252a 100%);
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.notification-icon {
  font-size: 16px;
  margin-right: 8px;
}

.notification-title {
  font-weight: 600;
  font-size: 14px;
  color: #e2e8f0;
  flex: 1;
}

.notification-close {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.notification-close:hover {
  background: rgba(160, 174, 192, 0.2);
  color: #e2e8f0;
}

.notification-message {
  font-size: 13px;
  color: #cbd5e0;
  line-height: 1.4;
  word-wrap: break-word;
}

.notification-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.notification-dismiss-btn {
  background: #4a5568;
  border: none;
  color: #e2e8f0;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.notification-dismiss-btn:hover {
  background: #2d3748;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

.notification.removing {
  animation: slideOut 0.3s ease-in forwards;
}

/* Responsive design */
@media (max-width: 768px) {
  .notification-system {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .notification {
    margin-bottom: 6px;
    padding: 10px 12px;
  }
}
```

### 4. Create Notification Types
**File**: `frontend/src/infrastructure/constants/NotificationTypes.js`

```javascript
export const NOTIFICATION_TYPES = {
  ERROR: 'error',
  WARNING: 'warning',
  SUCCESS: 'success',
  INFO: 'info'
};

export const NOTIFICATION_ICONS = {
  [NOTIFICATION_TYPES.ERROR]: '❌',
  [NOTIFICATION_TYPES.WARNING]: '⚠️',
  [NOTIFICATION_TYPES.SUCCESS]: '✅',
  [NOTIFICATION_TYPES.INFO]: 'ℹ️'
};

export const NOTIFICATION_TITLES = {
  [NOTIFICATION_TYPES.ERROR]: 'Error',
  [NOTIFICATION_TYPES.WARNING]: 'Warning',
  [NOTIFICATION_TYPES.SUCCESS]: 'Success',
  [NOTIFICATION_TYPES.INFO]: 'Info'
};

export const NOTIFICATION_DELAYS = {
  [NOTIFICATION_TYPES.ERROR]: 8000, // 8 seconds for errors
  [NOTIFICATION_TYPES.WARNING]: 6000, // 6 seconds for warnings
  [NOTIFICATION_TYPES.SUCCESS]: 4000, // 4 seconds for success
  [NOTIFICATION_TYPES.INFO]: 5000 // 5 seconds for info
};
```

## Success Criteria
- [ ] NotificationStore is created and functional
- [ ] NotificationSystem component renders correctly
- [ ] CSS styles are applied and responsive
- [ ] All notification types work properly
- [ ] Auto-dismiss functionality works
- [ ] Notifications are compact and visually appealing

## Testing Checklist
- [ ] Test notification creation for all types
- [ ] Test auto-dismiss functionality
- [ ] Test manual dismissal
- [ ] Test responsive design on mobile
- [ ] Test notification stacking (max 5)
- [ ] Test persistent vs non-persistent notifications

## Next Phase
Proceed to Phase 2: Error Display Component for creating compact error displays. 