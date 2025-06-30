class CodeExplorerComponent {
  constructor(containerId, eventBus) {
    this.container = document.getElementById(containerId);
    this.eventBus = eventBus;
    this.currentFile = null;
    this.fileTree = [];
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="code-explorer-container">
        <div class="code-explorer-layout">
          <div class="code-explorer-tree" id="fileTree">
            <h3>Projektbaum</h3>
            <div class="file-tree-content">
              ${this.renderFileTree()}
            </div>
          </div>
          <div class="code-explorer-editor" id="codeEditor">
            <div class="editor-header">
              <span class="file-name">${this.currentFile ? this.currentFile.name : 'Keine Datei ausgewählt'}</span>
            </div>
            <div class="editor-content">
              <pre><code id="codeContent">${this.currentFile ? this.currentFile.content : 'Wählen Sie eine Datei aus dem Projektbaum aus.'}</code></pre>
            </div>
          </div>
          <div class="code-explorer-chat-toggle">
            <button id="toggleExplorerChat" title="Chat öffnen/schließen">💬</button>
          </div>
        </div>
      </div>
    `;
  }

  renderFileTree() {
    if (this.fileTree.length === 0) {
      return '<div class="no-files">Keine Dateien verfügbar</div>';
    }

    return this.fileTree.map(file => `
      <div class="file-item ${file.type}" data-path="${file.path}">
        <span class="file-icon">${this.getFileIcon(file)}</span>
        <span class="file-name">${file.name}</span>
      </div>
    `).join('');
  }

  getFileIcon(file) {
    if (file.type === 'directory') return '📁';
    if (file.name.endsWith('.js')) return '📄';
    if (file.name.endsWith('.html')) return '🌐';
    if (file.name.endsWith('.css')) return '🎨';
    if (file.name.endsWith('.json')) return '📋';
    if (file.name.endsWith('.md')) return '📝';
    return '📄';
  }

  bindEvents() {
    const toggleBtn = this.container.querySelector('#toggleExplorerChat');
    const fileItems = this.container.querySelectorAll('.file-item');

    toggleBtn.addEventListener('click', () => {
      this.eventBus.emit('code-explorer:toggle-chat');
    });

    fileItems.forEach(item => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        this.selectFile(path);
      });
    });
  }

  setupEventListeners() {
    this.eventBus.on('code-explorer:files:loaded', (data) => {
      this.updateFileTree(data.files);
    });

    this.eventBus.on('code-explorer:file:selected', (data) => {
      this.loadFile(data.file);
    });
  }

  selectFile(path) {
    this.eventBus.emit('code-explorer:file:requested', { path });
  }

  loadFile(file) {
    this.currentFile = file;
    this.render();
    this.highlightCode();
  }

  updateFileTree(files) {
    this.fileTree = files;
    this.render();
    this.bindEvents();
  }

  highlightCode() {
    if (window.hljs && this.currentFile) {
      const codeElement = this.container.querySelector('#codeContent');
      if (codeElement) {
        hljs.highlightElement(codeElement);
      }
    }
  }

  showError(error) {
    const editorContent = this.container.querySelector('.editor-content');
    if (editorContent) {
      editorContent.innerHTML = `
        <div class="error-message">
          <span>⚠️</span>
          <span>${error}</span>
        </div>
      `;
    }
  }
}

export default CodeExplorerComponent; 