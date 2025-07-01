class ChatSidebarComponent {
  constructor(containerId, eventBus) {
    this.container = document.getElementById(containerId);
    this.eventBus = eventBus;
    this.chatSessions = [];
    this.currentSessionId = null;
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.setupEventListeners();
  }

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

  setupEventListeners() {
    this.eventBus.on('chat-sidebar:sessions:updated', (data) => {
      this.updateSessions(data.sessions);
    });

    this.eventBus.on('chat-sidebar:session:selected', (data) => {
      this.setCurrentSession(data.sessionId);
    });
  }

  selectSession(sessionId) {
    this.currentSessionId = sessionId;
    this.eventBus.emit('chat-sidebar:session:requested', { sessionId });
    this.render();
  }

  deleteSession(sessionId) {
    if (confirm('Chat wirklich löschen?')) {
      this.eventBus.emit('chat-sidebar:session:delete', { sessionId });
    }
  }

  updateSessions(sessions) {
    this.chatSessions = sessions;
    this.render();
    this.bindEvents();
  }

  setCurrentSession(sessionId) {
    this.currentSessionId = sessionId;
    this.render();
    this.bindEvents();
  }
}

export default ChatSidebarComponent; 