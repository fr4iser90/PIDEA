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