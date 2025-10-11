import React, { useEffect, useRef } from 'react';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import '@/scss/components/_notification.scss';;

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