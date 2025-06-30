import AppController from './presentation/controllers/AppController.js';
import SidebarComponent from './presentation/components/SidebarComponent.js';
import RightPanelComponent from './presentation/components/RightPanelComponent.js';
import EventBus from '../js/infrastructure/events/EventBus.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    // EventBus für die Komponenten
    const eventBus = new EventBus();

    // Sidebar (links) aktivieren
    new SidebarComponent('sidebar', eventBus);
    // RightPanel (rechts) aktivieren
    new RightPanelComponent('rightPanel', eventBus);

    // Chat-App initialisieren
    const app = new AppController();
    window.app = app;
    console.log('Cursor IDE Chat Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <span>⚠️</span>
      <span>Failed to initialize application. Please refresh the page.</span>
    `;
    document.body.appendChild(errorDiv);
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Handle global errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
}); 