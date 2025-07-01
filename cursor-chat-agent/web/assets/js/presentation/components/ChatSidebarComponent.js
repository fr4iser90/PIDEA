/**
 * ChatSidebarComponent - Manages the chat session sidebar for the chat mode
 * 
 * This component provides a dedicated sidebar for chat functionality including:
 * - Chat session management (create, select, delete)
 * - Session list display with metadata
 * - Quick actions (export, clear)
 * - Event-driven communication with other components
 * 
 * @class ChatSidebarComponent
 * @example
 * const chatSidebar = new ChatSidebarComponent('chatSidebarContent', eventBus);
 */
class ChatSidebarComponent {
  /**
   * Creates a new ChatSidebarComponent instance
   * 
   * @param {string} containerId - The DOM element ID where the sidebar will be rendered
   * @param {EventBus} eventBus - The event bus for component communication
   */
  constructor(containerId, eventBus) {
    this.container = document.getElementById(containerId);
    this.eventBus = eventBus;
    this.chatSessions = [];
    this.currentSessionId = null;
    
    this.init();
  }

  /**
   * Initializes the component by rendering and setting up event listeners
   * @private
   */
  init() {
    this.render();
    this.bindEvents();
    this.setupEventListeners();
  }

  /**
   * Renders the sidebar HTML structure
   * @private
   */
  render() {
    this.container.innerHTML = `
      <div class="chat-sidebar-content">
        <div class="sidebar-header">
          <h3>💬 Chat Sessions</h3>
          <button id="newChatBtn" class="btn-icon" title="Neuer Chat">➕</button>
        </div>
        
        <div class="chat-sessions-list" id="chatSessionsList">
          ${this.renderChatSessions()}
        </div>
        
        <div class="sidebar-footer">
          <div class="quick-actions">
            <button id="exportChatBtn" class="btn-secondary" title="Chat exportieren">📤 Export</button>
            <button id="clearChatBtn" class="btn-secondary" title="Chat löschen">🗑️ Clear</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the list of chat sessions
   * @private
   * @returns {string} HTML string for the chat sessions list
   */
  renderChatSessions() {
    if (this.chatSessions.length === 0) {
      return '<div class="no-sessions">Keine Chats vorhanden</div>';
    }

    return this.chatSessions.map(session => `
      <div class="chat-session-item ${session.id === this.currentSessionId ? 'active' : ''}" 
           data-session-id="${session.id}">
        <div class="session-info">
          <div class="session-title">${session.title}</div>
          <div class="session-meta">
            <span class="message-count">${session.messageCount || 0} Nachrichten</span>
            <span class="last-activity">${this.formatDate(session.lastActivity)}</span>
          </div>
        </div>
        <button class="session-delete-btn" data-session-id="${session.id}" title="Chat löschen">×</button>
      </div>
    `).join('');
  }

  /**
   * Formats a date into a human-readable relative time string
   * @private
   * @param {Date|string} date - The date to format
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return 'Gerade eben';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString();
  }

  /**
   * Binds DOM event listeners to interactive elements
   * @private
   */
  bindEvents() {
    const newChatBtn = this.container.querySelector('#newChatBtn');
    const exportChatBtn = this.container.querySelector('#exportChatBtn');
    const clearChatBtn = this.container.querySelector('#clearChatBtn');
    const sessionItems = this.container.querySelectorAll('.chat-session-item');
    const deleteBtns = this.container.querySelectorAll('.session-delete-btn');

    newChatBtn?.addEventListener('click', () => {
      this.eventBus.emit('chat-sidebar:new-chat');
    });

    exportChatBtn?.addEventListener('click', () => {
      this.eventBus.emit('chat-sidebar:export-chat');
    });

    clearChatBtn?.addEventListener('click', () => {
      this.eventBus.emit('chat-sidebar:clear-chat');
    });

    sessionItems.forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('session-delete-btn')) {
          const sessionId = item.dataset.sessionId;
          this.selectSession(sessionId);
        }
      });
    });

    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sessionId = btn.dataset.sessionId;
        this.deleteSession(sessionId);
      });
    });
  }

  /**
   * Sets up event listeners for external events
   * @private
   */
  setupEventListeners() {
    this.eventBus.on('chat-sidebar:sessions:updated', (data) => {
      this.updateSessions(data.sessions);
    });

    this.eventBus.on('chat-sidebar:session:selected', (data) => {
      this.setCurrentSession(data.sessionId);
    });
  }

  /**
   * Selects a chat session and emits the selection event
   * @param {string} sessionId - The ID of the session to select
   */
  selectSession(sessionId) {
    this.currentSessionId = sessionId;
    this.eventBus.emit('chat-sidebar:session:requested', { sessionId });
    this.render();
  }

  /**
   * Deletes a chat session after user confirmation
   * @param {string} sessionId - The ID of the session to delete
   */
  deleteSession(sessionId) {
    if (confirm('Chat wirklich löschen?')) {
      this.eventBus.emit('chat-sidebar:session:delete', { sessionId });
    }
  }

  /**
   * Updates the list of chat sessions and re-renders
   * @param {Array} sessions - Array of chat session objects
   */
  updateSessions(sessions) {
    this.chatSessions = sessions;
    this.render();
    this.bindEvents();
  }

  /**
   * Sets the currently active session
   * @param {string} sessionId - The ID of the session to set as current
   */
  setCurrentSession(sessionId) {
    this.currentSessionId = sessionId;
    this.render();
    this.bindEvents();
  }
}

export default ChatSidebarComponent; 