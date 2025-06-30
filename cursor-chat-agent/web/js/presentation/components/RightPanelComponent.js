class RightPanelComponent {
  constructor(containerId, eventBus) {
    this.container = document.getElementById(containerId);
    this.eventBus = eventBus;
    this.currentTab = 'chat';
    this.isVisible = true;
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="right-panel-content">
        <div class="panel-header">
          <div class="panel-tabs">
            <button class="tab-btn ${this.currentTab === 'chat' ? 'active' : ''}" data-tab="chat">💬 Chat</button>
            <button class="tab-btn ${this.currentTab === 'files' ? 'active' : ''}" data-tab="files">📁 Files</button>
            <button class="tab-btn ${this.currentTab === 'settings' ? 'active' : ''}" data-tab="settings">⚙️</button>
          </div>
          <button id="togglePanelBtn" class="btn-icon" title="Panel ein-/ausblenden">◀</button>
        </div>
        
        <div class="panel-content">
          ${this.renderTabContent()}
        </div>
      </div>
    `;
  }

  renderTabContent() {
    switch (this.currentTab) {
      case 'chat':
        return this.renderChatTab();
      case 'files':
        return this.renderFilesTab();
      case 'settings':
        return this.renderSettingsTab();
      default:
        return this.renderChatTab();
    }
  }

  renderChatTab() {
    return `
      <div class="chat-tab">
        <div class="chat-info">
          <h4>Chat Info</h4>
          <div class="info-item">
            <span class="label">Nachrichten:</span>
            <span class="value" id="messageCount">0</span>
          </div>
          <div class="info-item">
            <span class="label">Zeichen:</span>
            <span class="value" id="charCount">0</span>
          </div>
          <div class="info-item">
            <span class="label">Start:</span>
            <span class="value" id="chatStart">-</span>
          </div>
        </div>
        
        <div class="quick-prompts">
          <h4>Schnell-Prompts</h4>
          <div class="prompt-list">
            <button class="prompt-btn" data-prompt="Erkläre mir das kurz">💡 Kurze Erklärung</button>
            <button class="prompt-btn" data-prompt="Zeige mir ein Beispiel">📝 Beispiel</button>
            <button class="prompt-btn" data-prompt="Debugge diesen Code">🐛 Debug</button>
            <button class="prompt-btn" data-prompt="Optimiere diesen Code">⚡ Optimieren</button>
          </div>
        </div>
      </div>
    `;
  }

  renderFilesTab() {
    return `
      <div class="files-tab">
        <div class="file-upload">
          <h4>Dateien hochladen</h4>
          <div class="upload-area" id="uploadArea">
            <input type="file" id="fileInput" multiple style="display: none;" />
            <div class="upload-placeholder">
              <span>📁 Dateien hier ablegen oder klicken</span>
            </div>
          </div>
        </div>
        
        <div class="attached-files">
          <h4>Angehängte Dateien</h4>
          <div class="file-list" id="fileList">
            <div class="no-files">Keine Dateien angehängt</div>
          </div>
        </div>
      </div>
    `;
  }

  renderSettingsTab() {
    return `
      <div class="settings-tab">
        <div class="setting-group">
          <h4>Chat-Einstellungen</h4>
          <div class="setting-item">
            <label for="autoScroll">Auto-Scroll</label>
            <input type="checkbox" id="autoScroll" checked />
          </div>
          <div class="setting-item">
            <label for="typingIndicator">Typing Indicator</label>
            <input type="checkbox" id="typingIndicator" checked />
          </div>
          <div class="setting-item">
            <label for="messageSound">Nachrichten-Sound</label>
            <input type="checkbox" id="messageSound" />
          </div>
        </div>
        
        <div class="setting-group">
          <h4>Theme</h4>
          <div class="theme-options">
            <button class="theme-btn active" data-theme="dark">🌙 Dark</button>
            <button class="theme-btn" data-theme="light">☀️ Light</button>
            <button class="theme-btn" data-theme="auto">🔄 Auto</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Tab switching
    const tabBtns = this.container.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Panel toggle
    const toggleBtn = this.container.querySelector('#togglePanelBtn');
    toggleBtn?.addEventListener('click', () => {
      this.togglePanel();
    });

    // Quick prompts
    const promptBtns = this.container.querySelectorAll('.prompt-btn');
    promptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        this.eventBus.emit('right-panel:quick-prompt', { prompt });
      });
    });

    // File upload
    const uploadArea = this.container.querySelector('#uploadArea');
    const fileInput = this.container.querySelector('#fileInput');
    
    uploadArea?.addEventListener('click', () => {
      fileInput?.click();
    });

    uploadArea?.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea?.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea?.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      this.handleFileUpload(files);
    });

    fileInput?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      this.handleFileUpload(files);
    });

    // Settings
    const settingInputs = this.container.querySelectorAll('input[type="checkbox"]');
    settingInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.eventBus.emit('right-panel:setting-changed', {
          setting: e.target.id,
          value: e.target.checked
        });
      });
    });

    // Theme buttons
    const themeBtns = this.container.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        this.setTheme(theme);
      });
    });
  }

  setupEventListeners() {
    this.eventBus.on('right-panel:chat-stats:updated', (data) => {
      this.updateChatStats(data);
    });

    this.eventBus.on('right-panel:files:updated', (data) => {
      this.updateFiles(data.files);
    });
  }

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
    this.bindEvents();
  }

  togglePanel() {
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'flex' : 'none';
    
    const toggleBtn = this.container.querySelector('#togglePanelBtn');
    if (toggleBtn) {
      toggleBtn.textContent = this.isVisible ? '◀' : '▶';
    }
  }

  handleFileUpload(files) {
    this.eventBus.emit('right-panel:files:upload', { files });
  }

  updateChatStats(stats) {
    const messageCount = this.container.querySelector('#messageCount');
    const charCount = this.container.querySelector('#charCount');
    const chatStart = this.container.querySelector('#chatStart');

    if (messageCount) messageCount.textContent = stats.messageCount || 0;
    if (charCount) charCount.textContent = stats.charCount || 0;
    if (chatStart) chatStart.textContent = stats.startTime || '-';
  }

  updateFiles(files) {
    const fileList = this.container.querySelector('#fileList');
    if (!fileList) return;

    if (files.length === 0) {
      fileList.innerHTML = '<div class="no-files">Keine Dateien angehängt</div>';
      return;
    }

    fileList.innerHTML = files.map(file => `
      <div class="file-item">
        <span class="file-name">${file.name}</span>
        <button class="file-remove-btn" data-file="${file.name}">×</button>
      </div>
    `).join('');

    // Bind remove buttons
    const removeBtns = fileList.querySelectorAll('.file-remove-btn');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const fileName = btn.dataset.file;
        this.eventBus.emit('right-panel:file:remove', { fileName });
      });
    });
  }

  setTheme(theme) {
    // Remove all theme classes
    document.body.classList.remove('light-theme', 'dark-theme', 'auto-theme');
    
    // Add new theme class
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else if (theme === 'auto') {
      document.body.classList.add('auto-theme');
    }

    // Update active button
    const themeBtns = this.container.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    this.eventBus.emit('right-panel:theme-changed', { theme });
  }
}

export default RightPanelComponent; 