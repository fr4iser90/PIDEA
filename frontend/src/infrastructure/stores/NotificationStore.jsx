import { create } from 'zustand';
import { NOTIFICATION_TYPES, NOTIFICATION_ICONS, NOTIFICATION_TITLES, NOTIFICATION_DELAYS } from '@/infrastructure/constants/NotificationTypes.js';

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
      const delay = NOTIFICATION_DELAYS[notification.type] || get().autoDismissDelay;
      setTimeout(() => {
        get().dismissNotification(newNotification.id);
      }, delay);
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
  showError: (message, title = NOTIFICATION_TITLES[NOTIFICATION_TYPES.ERROR], persistent = false) => {
    get().addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      title,
      message,
      persistent,
      icon: NOTIFICATION_ICONS[NOTIFICATION_TYPES.ERROR]
    });
  },

  showWarning: (message, title = NOTIFICATION_TITLES[NOTIFICATION_TYPES.WARNING], persistent = false) => {
    get().addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      title,
      message,
      persistent,
      icon: NOTIFICATION_ICONS[NOTIFICATION_TYPES.WARNING]
    });
  },

  showSuccess: (message, title = NOTIFICATION_TITLES[NOTIFICATION_TYPES.SUCCESS], persistent = false) => {
    get().addNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      title,
      message,
      persistent,
      icon: NOTIFICATION_ICONS[NOTIFICATION_TYPES.SUCCESS]
    });
  },

  showInfo: (message, title = NOTIFICATION_TITLES[NOTIFICATION_TYPES.INFO], persistent = false) => {
    get().addNotification({
      type: NOTIFICATION_TYPES.INFO,
      title,
      message,
      persistent,
      icon: NOTIFICATION_ICONS[NOTIFICATION_TYPES.INFO]
    });
  }
}));

export default useNotificationStore; 