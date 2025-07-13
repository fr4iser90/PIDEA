import { logger } from "@/infrastructure/logging/Logger";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '@/css/global/main.css';
import '@/css/global/sidebar-left.css';
import '@/css/global/sidebar-right.css';
import '@/css/panel/chat-panel.css';

// Add global styles for animations
const globalStyles = document.createElement('style');
globalStyles.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes typing {
    0%, 20% { opacity: 1; }
    40% { opacity: 0.5; }
    60% { opacity: 0.3; }
    80%, 100% { opacity: 0.1; }
  }
  
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #1e1e1e;
    color: #e6e6e6;
  }
  
  #root {
    height: 100vh;
  }
`;
document.head.appendChild(globalStyles);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason);
});

// Handle global errors
window.addEventListener('error', (event) => {
  logger.error('Global error:', event.error);
}); 