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
    this.availableIDEs = [];
    this.activePort = null;
    
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
        
        <div class="ide-management-section">
          <div class="ide-header">
            <h4>🖥️ IDE Management</h4>
            <button id="newIDEBtn" class="btn-icon" title="Neue IDE starten">🚀</button>
          </div>
          <div class="ide-list" id="ideList">
            ${this.renderIDEs()}
          </div>
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
   * Renders the list of available IDEs
   * @private
   * @returns {string} HTML string for the IDE list
   */
  renderIDEs() {
    if (this.availableIDEs.length === 0) {
      return '<div class="no-ides">Keine IDEs verfügbar</div>';
    }

    return this.availableIDEs.map(ide => `
      <div class="ide-item ${ide.port === this.activePort ? 'active' : ''}" 
           data-port="${ide.port}">
        <div class="ide-info">
          <div class="ide-title">Port ${ide.port}</div>
          <div class="ide-meta">
            <span class="ide-status ${ide.status}">${ide.status}</span>
            <span class="ide-source">${ide.source || 'unknown'}</span>
          </div>
        </div>
        <div class="ide-actions">
          ${ide.port === this.activePort ? '<span class="active-indicator">✓</span>' : ''}
          <button class="ide-stop-btn" data-port="${ide.port}" title="IDE stoppen">⏹️</button>
        </div>
      </div>
    `).join('');
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
    const newIDEBtn = this.container.querySelector('#newIDEBtn');
    const exportChatBtn = this.container.querySelector('#exportChatBtn');
    const clearChatBtn = this.container.querySelector('#clearChatBtn');
    const sessionItems = this.container.querySelectorAll('.chat-session-item');
    const deleteBtns = this.container.querySelectorAll('.session-delete-btn');
    const ideItems = this.container.querySelectorAll('.ide-item');
    const ideStopBtns = this.container.querySelectorAll('.ide-stop-btn');

    newChatBtn?.addEventListener('click', () => {
      this.eventBus.emit('chat-sidebar:new-chat');
    });

    newIDEBtn?.addEventListener('click', () => {
      this.eventBus.emit('chat-sidebar:new-ide');
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

    ideItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // Nur wenn nicht auf Stop-Button geklickt
        if (!e.target.classList.contains('ide-stop-btn')) {
          const port = parseInt(item.dataset.port);
          this.switchDirectlyToIDE(port);
        }
      });
    });

    ideStopBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const port = parseInt(btn.dataset.port);
        this.stopIDE(port);
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

    // IDE management events
    this.eventBus.on('ideListUpdated', (data) => {
      if (data.ides) {
        this.updateIDEs(data.ides);
      } else {
        this.refreshIDEList();
      }
    });

    this.eventBus.on('activeIDEChanged', (data) => {
      this.activePort = data.port;
      this.render();
      this.bindEvents();
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

  /**
   * Switches to a specific IDE
   * @param {number} port - The port of the IDE to switch to
   */
  switchToIDE(port) {
    this.eventBus.emit('chat-sidebar:ide:switch', { port });
  }

  /**
   * Switches directly to IDE and loads its chat
   * @param {number} port - The port of the IDE to switch to
   */
  switchDirectlyToIDE(port) {
    // 1. Switch IDE (existing infrastructure)
    this.eventBus.emit('chat-sidebar:ide:switch', { port });
    
    // 2. Load chat for this port (new functionality)
    this.eventBus.emit('chat-sidebar:load-chat-for-port', { port });
  }

  /**
   * Stops a specific IDE
   * @param {number} port - The port of the IDE to stop
   */
  stopIDE(port) {
    if (confirm(`IDE auf Port ${port} wirklich stoppen?`)) {
      this.eventBus.emit('chat-sidebar:ide:stop', { port });
    }
  }

  /**
   * Refreshes the IDE list from the server
   */
  async refreshIDEList() {
    try {
      const response = await fetch('/api/ide/available');
      const result = await response.json();
      if (result.success) {
        this.availableIDEs = result.data;
        this.render();
        this.bindEvents();
      }
    } catch (error) {
      console.error('Error refreshing IDE list:', error);
    }
  }

  /**
   * Updates the IDE list
   * @param {Array} ides - Array of IDE objects
   */
  updateIDEs(ides) {
    this.availableIDEs = ides;
    this.render();
    this.bindEvents();
  }
}

export default ChatSidebarComponent; 