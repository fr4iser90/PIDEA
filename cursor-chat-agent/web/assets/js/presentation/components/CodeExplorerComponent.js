/**
 * CodeExplorerComponent - Manages the code editor area for the code explorer mode
 * 
 * This component provides the main editor area for code exploration including:
 * - File content display with syntax highlighting
 * - Editor header with file information
 * - Code content rendering
 * - Error handling and display
 * 
 * @class CodeExplorerComponent
 * @example
 * const codeExplorer = new CodeExplorerComponent('codeExplorerView', eventBus);
 */
class CodeExplorerComponent {
  /**
   * Creates a new CodeExplorerComponent instance
   * 
   * @param {string} containerId - The DOM element ID where the component will be rendered
   * @param {EventBus} eventBus - The event bus for component communication
   */
  constructor(containerId, eventBus) {
    this.container = document.getElementById(containerId);
    this.eventBus = eventBus;
    this.currentFile = null;
    
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
   * Renders the editor HTML structure
   * @private
   */
  render() {
    this.container.innerHTML = `
      <div class="code-explorer-container">
        <div class="code-explorer-layout">
          <div class="code-explorer-editor" id="codeEditor">
            <div class="editor-header">
              <span class="file-name">${this.currentFile ? this.currentFile.name : 'Keine Datei ausgewählt'}</span>
              <div class="editor-actions">
                <button id="toggleExplorerChat" title="Chat öffnen/schließen">💬</button>
              </div>
            </div>
            <div class="editor-content">
              <pre><code id="codeContent">${this.currentFile ? this.currentFile.content : 'Wählen Sie eine Datei aus dem Projektbaum aus.'}</code></pre>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Binds DOM event listeners to interactive elements
   * @private
   */
  bindEvents() {
    const toggleBtn = this.container.querySelector('#toggleExplorerChat');

    toggleBtn?.addEventListener('click', () => {
      this.eventBus.emit('code-explorer:toggle-chat');
    });
  }

  /**
   * Sets up event listeners for external events
   * @private
   */
  setupEventListeners() {
    this.eventBus.on('code-explorer:file:selected', (data) => {
      this.loadFile(data.file);
    });
  }

  /**
   * Loads and displays a file in the editor
   * @param {Object} file - File object with name and content properties
   */
  async loadFile(file) {
    try {
      this.currentFile = file;
      this.render();
      
      // Load file content from API
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`);
      const result = await response.json();
      
      if (result.success) {
        this.currentFile.content = result.data.content;
        this.render();
        this.highlightCode();
      } else {
        this.showError(`Fehler beim Laden der Datei: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
      this.showError('Fehler beim Laden der Datei');
    }
  }

  /**
   * Applies syntax highlighting to the code content
   * @private
   */
  highlightCode() {
    if (window.hljs && this.currentFile) {
      const codeElement = this.container.querySelector('#codeContent');
      if (codeElement) {
        hljs.highlightElement(codeElement);
      }
    }
  }

  /**
   * Displays an error message in the editor area
   * @param {string} error - Error message to display
   */
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