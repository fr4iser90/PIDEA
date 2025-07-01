class CodeSidebarComponent {
  constructor(containerId, eventBus) {
    this.container = document.getElementById(containerId);
    this.eventBus = eventBus;
    this.fileTree = [];
    this.currentFile = null;
    this.expandedFolders = new Set();
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="code-sidebar-content">
        <div class="sidebar-header">
          <h3>📁 Projekt Explorer</h3>
          <button id="refreshFilesBtn" class="btn-icon" title="Dateien aktualisieren">🔄</button>
        </div>
        
        <div class="file-explorer" id="fileExplorer">
          <div class="file-tree-content">
            ${this.renderFileTree()}
          </div>
        </div>
        
        <div class="sidebar-footer">
          <div class="quick-actions">
            <button id="searchFilesBtn" class="btn-secondary" title="Dateien suchen">🔍 Suche</button>
            <button id="showHiddenBtn" class="btn-secondary" title="Versteckte Dateien">👁️ Hidden</button>
          </div>
        </div>
      </div>
    `;
  }

  renderFileTree() {
    if (this.fileTree.length === 0) {
      return '<div class="no-files">Keine Dateien verfügbar</div>';
    }

    return this.fileTree.map(file => this.renderFileItem(file)).join('');
  }

  renderFileItem(file, level = 0) {
    const isExpanded = this.expandedFolders.has(file.path);
    const isSelected = this.currentFile && this.currentFile.path === file.path;
    const indent = '  '.repeat(level);
    
    if (file.type === 'directory') {
      const children = this.fileTree.filter(f => 
        f.path.startsWith(file.path + '/') && 
        f.path.split('/').length === file.path.split('/').length + 1
      );
      
      return `
        <div class="file-item directory ${isSelected ? 'selected' : ''}" data-path="${file.path}">
          <div class="file-header" style="padding-left: ${level * 16}px">
            <button class="expand-btn ${isExpanded ? 'expanded' : ''}" data-path="${file.path}">
              ${isExpanded ? '▼' : '▶'}
            </button>
          </div>
          <div class="file-info">
            <span class="file-icon">📁</span>
            <span class="file-name">${file.name}</span>
          </div>
          ${isExpanded ? `
            <div class="file-children">
              ${children.map(child => this.renderFileItem(child, level + 1)).join('')}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      return `
        <div class="file-item file ${isSelected ? 'selected' : ''}" data-path="${file.path}" style="padding-left: ${level * 16 + 20}px">
          <span class="file-icon">${this.getFileIcon(file)}</span>
          <span class="file-name">${file.name}</span>
        </div>
      `;
    }
  }

  getFileIcon(file) {
    if (file.name.endsWith('.js')) return '📄';
    if (file.name.endsWith('.html')) return '🌐';
    if (file.name.endsWith('.css')) return '🎨';
    if (file.name.endsWith('.json')) return '📋';
    if (file.name.endsWith('.md')) return '📝';
    if (file.name.endsWith('.py')) return '🐍';
    if (file.name.endsWith('.java')) return '☕';
    if (file.name.endsWith('.cpp') || file.name.endsWith('.c')) return '⚙️';
    if (file.name.endsWith('.ts')) return '📘';
    if (file.name.endsWith('.jsx') || file.name.endsWith('.tsx')) return '⚛️';
    return '📄';
  }

  bindEvents() {
    const refreshBtn = this.container.querySelector('#refreshFilesBtn');
    const searchBtn = this.container.querySelector('#searchFilesBtn');
    const showHiddenBtn = this.container.querySelector('#showHiddenBtn');
    const expandBtns = this.container.querySelectorAll('.expand-btn');
    const fileItems = this.container.querySelectorAll('.file-item.file');

    refreshBtn?.addEventListener('click', () => {
      this.eventBus.emit('code-sidebar:refresh-files');
    });

    searchBtn?.addEventListener('click', () => {
      this.eventBus.emit('code-sidebar:search-files');
    });

    showHiddenBtn?.addEventListener('click', () => {
      this.eventBus.emit('code-sidebar:toggle-hidden');
    });

    expandBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = btn.dataset.path;
        this.toggleFolder(path);
      });
    });

    fileItems.forEach(item => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        this.selectFile(path);
      });
    });
  }

  setupEventListeners() {
    this.eventBus.on('code-sidebar:files:loaded', (data) => {
      this.updateFileTree(data.files);
    });

    this.eventBus.on('code-sidebar:file:selected', (data) => {
      this.setCurrentFile(data.file);
    });
  }

  toggleFolder(path) {
    if (this.expandedFolders.has(path)) {
      this.expandedFolders.delete(path);
    } else {
      this.expandedFolders.add(path);
    }
    this.render();
    this.bindEvents();
  }

  selectFile(path) {
    this.currentFile = { path };
    this.eventBus.emit('code-sidebar:file:requested', { path });
    this.render();
    this.bindEvents();
  }

  setCurrentFile(file) {
    this.currentFile = file;
    this.render();
    this.bindEvents();
  }

  updateFileTree(files) {
    this.fileTree = files;
    this.render();
    this.bindEvents();
  }
}

export default CodeSidebarComponent; 