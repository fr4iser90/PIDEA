export default class PreviewComponent {
  constructor(containerId = 'previewContainer') {
    this.containerId = containerId;
    this.isVisible = false;
    this.isModal = false;
    this.isFullScreen = false;
    this.currentContent = null;
    this.resizeObserver = null;
    this.init();
  }

  init() {
    this.createContainer();
    this.bindEvents();
    this.setupResizeObserver();
  }

  createContainer() {
    // Create main preview container
    this.container = document.createElement('div');
    this.container.id = this.containerId;
    this.container.className = 'preview-container';
    
    // Create preview header
    this.header = document.createElement('div');
    this.header.className = 'preview-header';
    this.header.innerHTML = `
      <div class="preview-title">
        <span class="preview-icon">👁️</span>
        <span class="preview-text">Preview</span>
      </div>
      <div class="preview-actions">
        <button class="preview-btn" id="previewRestartBtn" title="Restart App">
          <span class="btn-icon">🔄</span>
        </button>
        <button class="preview-btn" id="previewFullscreenBtn" title="Fullscreen">
          <span class="btn-icon">⛶</span>
        </button>
        <button class="preview-btn" id="previewModalBtn" title="Modal View">
          <span class="btn-icon">⊞</span>
        </button>
        <button class="preview-btn" id="previewCloseBtn" title="Close">
          <span class="btn-icon">✕</span>
        </button>
      </div>
    `;

    // Create preview content area
    this.content = document.createElement('div');
    this.content.className = 'preview-content';
    this.content.innerHTML = `
      <div class="preview-placeholder">
        <div class="preview-placeholder-icon">👁️</div>
        <h3>Preview Area</h3>
        <p>Content will appear here when available</p>
      </div>
    `;

    // Create floating actions container
    this.floatingActions = document.createElement('div');
    this.floatingActions.className = 'preview-floating-actions';
    this.floatingActions.innerHTML = `
      <button class="floating-action-btn" id="previewRefreshBtn" title="Refresh">
        <span class="btn-icon">🔄</span>
      </button>
      <button class="floating-action-btn" id="previewExportBtn" title="Export">
        <span class="btn-icon">📤</span>
      </button>
      <button class="floating-action-btn" id="previewShareBtn" title="Share">
        <span class="btn-icon">📤</span>
      </button>
    `;

    // Assemble the component
    this.container.appendChild(this.header);
    this.container.appendChild(this.content);
    this.container.appendChild(this.floatingActions);

    // Add to DOM
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
      mainContent.appendChild(this.container);
    }
  }

  bindEvents() {
    // Header action buttons
    this.container.querySelector('#previewRestartBtn').addEventListener('click', () => {
      this.restartApp();
    });

    this.container.querySelector('#previewFullscreenBtn').addEventListener('click', () => {
      this.toggleFullScreen();
    });

    this.container.querySelector('#previewModalBtn').addEventListener('click', () => {
      this.openInNewWindow();
    });

    this.container.querySelector('#previewCloseBtn').addEventListener('click', () => {
      this.hide();
    });

    // Floating action buttons
    this.container.querySelector('#previewRefreshBtn').addEventListener('click', () => {
      this.refresh();
    });

    this.container.querySelector('#previewExportBtn').addEventListener('click', () => {
      this.export();
    });

    this.container.querySelector('#previewShareBtn').addEventListener('click', () => {
      this.share();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F11' && this.isVisible) {
        e.preventDefault();
        this.toggleFullScreen();
      }
    });
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.handleResize(entry);
      }
    });
    
    if (this.container) {
      this.resizeObserver.observe(this.container);
    }
  }

  handleResize(entry) {
    // Handle responsive behavior
    const width = entry.contentRect.width;
    if (width < 400) {
      this.container.classList.add('preview-compact');
    } else {
      this.container.classList.remove('preview-compact');
    }
  }

  show(content = null, options = {}) {
    this.isVisible = true;
    this.container.style.display = 'flex';
    
    if (content) {
      this.setContent(content);
    }

    if (options.fullScreen) {
      this.showFullScreen();
    }

    this.container.classList.add('preview-visible');
    this.emit('show');
  }

  hide() {
    this.isVisible = false;
    this.isFullScreen = false;
    
    this.container.style.display = 'none';
    this.container.classList.remove('preview-visible', 'preview-fullscreen');
    
    this.emit('hide');
  }

  setContent(content) {
    this.currentContent = content;
    
    if (typeof content === 'string') {
      this.content.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.content.innerHTML = '';
      this.content.appendChild(content);
    } else if (content && content.html) {
      this.content.innerHTML = content.html;
    } else {
      this.content.innerHTML = `
        <div class="preview-placeholder">
          <div class="preview-placeholder-icon">👁️</div>
          <h3>Preview Content</h3>
          <p>${content?.message || 'No content available'}</p>
        </div>
      `;
    }

    this.emit('contentChanged', content);
  }

  openInNewWindow() {
    if (this.currentIframeUrl) {
      const previewUrl = `/web/pages/preview.html?url=${encodeURIComponent(this.currentIframeUrl)}`;
      const newWindow = window.open(previewUrl, 'preview', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      
      if (newWindow) {
        this.emit('newWindowOpened', { url: this.currentIframeUrl, window: newWindow });
      } else {
        console.warn('Popup blocked. Please allow popups for this site.');
      }
    }
  }

  showFullScreen() {
    this.isFullScreen = true;
    this.container.classList.add('preview-fullscreen');
    this.emit('fullscreenShow');
  }

  hideFullScreen() {
    this.isFullScreen = false;
    this.container.classList.remove('preview-fullscreen');
    this.emit('fullscreenHide');
  }

  toggleFullScreen() {
    if (this.isFullScreen) {
      this.hideFullScreen();
    } else {
      this.showFullScreen();
    }
  }

  refresh() {
    this.emit('refresh');
    // Add refresh animation
    this.content.classList.add('preview-refreshing');
    setTimeout(() => {
      this.content.classList.remove('preview-refreshing');
    }, 500);
  }

  export() {
    this.emit('export');
  }

  share() {
    this.emit('share');
  }

  async restartApp() {
    if (this.currentIframeUrl) {
      // Send restart command via API
      this.emit('restartApp', { url: this.currentIframeUrl });
    }
  }

  // Event system
  emit(eventName, data = null) {
    const event = new CustomEvent(`preview:${eventName}`, {
      detail: data,
      bubbles: true
    });
    this.container.dispatchEvent(event);
  }

  // Public API methods
  getContainer() {
    return this.container;
  }

  isVisible() {
    return this.isVisible;
  }

  getContent() {
    return this.currentContent;
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  setIframe(url) {
    const iframeHTML = `<iframe src="${url}" style="width:100%;height:100%;border:0;" allow="clipboard-write; clipboard-read; geolocation; microphone; camera"></iframe>`;
    this.setContent(iframeHTML);
    this.currentIframeUrl = url;
    
    // Emit event for URL change
    this.emit('urlChanged', { url: url });
  }
} 