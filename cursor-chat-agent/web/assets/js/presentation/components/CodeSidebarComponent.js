/**
 * CodeSidebarComponent - Manages the file explorer sidebar for the code explorer mode
 * 
 * This component provides a dedicated sidebar for code exploration functionality including:
 * - Project tree navigation with hierarchical display
 * - Folder expansion/collapse functionality
 * - File type detection and appropriate icons
 * - File selection and navigation
 * - Search and hidden files toggle
 * 
 * @class CodeSidebarComponent
 * @example
 * const codeSidebar = new CodeSidebarComponent('codeSidebarContent', eventBus);
 */
class CodeSidebarComponent {
  /**
   * Creates a new CodeSidebarComponent instance
   * 
   * @param {string} containerId - The DOM element ID where the sidebar will be rendered
   * @param {EventBus} eventBus - The event bus for component communication
   */
  constructor(containerId, eventBus) {
    this.container = document.getElementById(containerId);
    this.eventBus = eventBus;
    this.fileTree = [];
    this.currentFile = null;
    this.expandedFolders = new Set();
    
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
    this.loadFileTree();
  }

  /**
   * Renders the sidebar HTML structure
   * @private
   */
  render() {
    this.container.innerHTML = `
      <div class="sidebar-content">
        <div class="sidebar-header">
          <h3>📁 EXPLORER</h3>
          <button id="refreshFilesBtn" class="btn-icon" title="Refresh">🔄</button>
        </div>
        
        <div class="file-explorer" id="fileExplorer">
          <div class="file-tree-content">
            ${this.renderFileTree()}
          </div>
        </div>
        
        <div class="sidebar-footer">
          <div class="quick-actions">
            <button id="searchFilesBtn" class="btn-secondary" title="Search">🔍</button>
            <button id="showHiddenBtn" class="btn-secondary" title="Show Hidden">👁️</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the file tree structure
   * @private
   * @returns {string} HTML string for the file tree
   */
  renderFileTree(tree = this.fileTree, level = 0) {
    if (!tree || tree.length === 0) {
      return '<div class="no-files">Keine Dateien verfügbar</div>';
    }
    return tree.map(file => this.renderFileItem(file, level)).join('');
  }

  /**
   * Renders a single file or directory item with proper indentation
   * @private
   * @param {Object} file - File object with path, name, type properties
   * @param {number} level - Nesting level for indentation
   * @returns {string} HTML string for the file item
   */
  renderFileItem(file, level = 0) {
    const isExpanded = this.expandedFolders.has(file.path);
    const isSelected = this.currentFile && this.currentFile.path === file.path;
    if (file.type === 'directory') {
      return `
        <div class="file-item directory ${isSelected ? 'selected' : ''}" data-path="${file.path}">
          <div class="file-header" style="padding-left: ${level * 16}px">
            <button class="expand-btn ${isExpanded ? 'expanded' : ''}" data-path="${file.path}">
              ${isExpanded ? '▼' : '▶'}
            </button>
            <div class="file-info">
              <span class="file-icon" data-type="folder">📁</span>
              <span class="file-name">${file.name}</span>
            </div>
          </div>
          ${isExpanded && file.children && file.children.length > 0 ? `
            <div class="file-children">
              ${this.renderFileTree(file.children, level + 1)}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      const fileIcon = this.getFileIcon(file);
      return `
        <div class="file-item file ${isSelected ? 'selected' : ''}" data-path="${file.path}" style="padding-left: ${level * 16 + 20}px">
          <span class="file-icon" data-type="${fileIcon.type}">${fileIcon.icon}</span>
          <span class="file-name">${file.name}</span>
          ${file.selected ? '<span class="file-status">●</span>' : ''}
        </div>
      `;
    }
  }

  /**
   * Returns the appropriate icon for a file based on its extension
   * @private
   * @param {Object} file - File object with name property
   * @returns {string} Icon class and type for the file
   */
  getFileIcon(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    
    const iconMap = {
      'js': { icon: '📄', type: 'js' },
      'html': { icon: '🌐', type: 'html' },
      'css': { icon: '🎨', type: 'css' },
      'json': { icon: '📋', type: 'json' },
      'md': { icon: '📝', type: 'md' },
      'py': { icon: '🐍', type: 'py' },
      'java': { icon: '☕', type: 'java' },
      'cpp': { icon: '⚙️', type: 'cpp' },
      'c': { icon: '⚙️', type: 'cpp' },
      'ts': { icon: '📘', type: 'ts' },
      'jsx': { icon: '⚛️', type: 'jsx' },
      'tsx': { icon: '⚛️', type: 'tsx' },
      'sh': { icon: '💻', type: 'sh' },
      'yml': { icon: '⚙️', type: 'yml' },
      'yaml': { icon: '⚙️', type: 'yml' },
      'xml': { icon: '📄', type: 'xml' },
      'txt': { icon: '📄', type: 'txt' },
      'log': { icon: '📄', type: 'log' },
      'gitignore': { icon: '📄', type: 'gitignore' },
      'lock': { icon: '🔒', type: 'lock' }
    };
    
    return iconMap[extension] || { icon: '📄', type: 'file' };
  }

  /**
   * Binds DOM event listeners to interactive elements
   * @private
   */
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

  /**
   * Sets up event listeners for external events
   * @private
   */
  setupEventListeners() {
    this.eventBus.on('code-sidebar:files:loaded', (data) => {
      this.updateFileTree(data.files);
    });

    this.eventBus.on('code-sidebar:file:selected', (data) => {
      this.setCurrentFile(data.file);
    });
  }

  /**
   * Toggles the expansion state of a folder
   * @param {string} path - The path of the folder to toggle
   */
  toggleFolder(path) {
    if (this.expandedFolders.has(path)) {
      this.expandedFolders.delete(path);
    } else {
      this.expandedFolders.add(path);
    }
    this.render();
    this.bindEvents();
  }

  /**
   * Selects a file and emits the selection event
   * @param {string} path - The path of the file to select
   */
  selectFile(path) {
    this.currentFile = { path };
    this.eventBus.emit('code-sidebar:file:requested', { path });
    this.render();
    this.bindEvents();
  }

  /**
   * Sets the currently selected file
   * @param {Object} file - File object to set as current
   */
  setCurrentFile(file) {
    this.currentFile = file;
    this.render();
    this.bindEvents();
  }

  /**
   * Loads the file tree from the API
   * @private
   */
  async loadFileTree() {
    try {
      const response = await fetch('/api/files');
      
      if (!response.ok) {
        console.error('Failed to load file tree: HTTP', response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.updateFileTree(result.data);
      } else {
        console.error('Failed to load file tree:', result.error);
      }
    } catch (error) {
      console.error('Failed to load file tree:', error);
    }
  }

  /**
   * Updates the file tree and re-renders
   * @param {Array} files - Array of file objects
   */
  updateFileTree(files) {
    this.fileTree = files;
    this.render();
    this.bindEvents();
  }
}

export default CodeSidebarComponent; 