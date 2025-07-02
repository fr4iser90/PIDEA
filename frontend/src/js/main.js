// Legacy main.js converted for React
// Error handling and global utilities

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Handle global errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Export for React usage
export const legacyUtils = {
  handleError: (error) => {
    console.error('Application error:', error);
  },
  logInfo: (message) => {
    console.log('Application info:', message);
  }
}; 