class CodeRightPanelComponent {
  constructor(containerId, eventBus) {
    this.container = document.getElementById(containerId);
    this.eventBus = eventBus;
    this.currentTab = 'analysis';
    this.isVisible = true;
    this.currentFile = null;
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="code-right-panel-content">
        <div class="panel-header">
          <div class="panel-tabs">
            <button class="tab-btn ${this.currentTab === 'analysis' ? 'active' : ''}" data-tab="analysis">🔍 Analysis</button>
            <button class="tab-btn ${this.currentTab === 'outline' ? 'active' : ''}" data-tab="outline">📋 Outline</button>
            <button class="tab-btn ${this.currentTab === 'problems' ? 'active' : ''}" data-tab="problems">⚠️ Problems</button>
            <button class="tab-btn ${this.currentTab === 'git' ? 'active' : ''}" data-tab="git">📝 Git</button>
          </div>
          <button id="toggleCodePanelBtn" class="btn-icon" title="Panel ein-/ausblenden">◀</button>
        </div>
        
        <div class="panel-content">
          ${this.renderTabContent()}
        </div>
      </div>
    `;
  }

  renderTabContent() {
    switch (this.currentTab) {
      case 'analysis':
        return this.renderAnalysisTab();
      case 'outline':
        return this.renderOutlineTab();
      case 'problems':
        return this.renderProblemsTab();
      case 'git':
        return this.renderGitTab();
      default:
        return this.renderAnalysisTab();
    }
  }

  renderAnalysisTab() {
    return `
      <div class="analysis-tab">
        <div class="file-info">
          <h4>📄 Datei Info</h4>
          <div class="info-item">
            <span class="label">Name:</span>
            <span class="value" id="fileName">${this.currentFile ? this.currentFile.name : 'Keine Datei ausgewählt'}</span>
          </div>
          <div class="info-item">
            <span class="label">Größe:</span>
            <span class="value" id="fileSize">${this.currentFile ? this.formatFileSize(this.currentFile.size) : '-'}</span>
          </div>
          <div class="info-item">
            <span class="label">Zeilen:</span>
            <span class="value" id="lineCount">${this.currentFile ? this.currentFile.lineCount || 0 : '-'}</span>
          </div>
          <div class="info-item">
            <span class="label">Typ:</span>
            <span class="value" id="fileType">${this.currentFile ? this.getFileType(this.currentFile.name) : '-'}</span>
          </div>
        </div>
        
        <div class="code-actions">
          <h4>🔧 Aktionen</h4>
          <div class="action-list">
            <button class="action-btn" data-action="format">🎨 Formatieren</button>
            <button class="action-btn" data-action="lint">🔍 Lint</button>
            <button class="action-btn" data-action="search">🔍 Suchen</button>
            <button class="action-btn" data-action="replace">🔄 Ersetzen</button>
            <button class="action-btn" data-action="fold">📁 Faltungen</button>
            <button class="action-btn" data-action="minimap">🗺️ Minimap</button>
          </div>
        </div>
      </div>
    `;
  }

  renderOutlineTab() {
    return `
      <div class="outline-tab">
        <div class="outline-header">
          <h4>📋 Code Outline</h4>
          <button id="refreshOutlineBtn" class="btn-icon" title="Outline aktualisieren">🔄</button>
        </div>
        
        <div class="outline-content" id="outlineContent">
          ${this.renderOutlineContent()}
        </div>
      </div>
    `;
  }

  renderOutlineContent() {
    if (!this.currentFile) {
      return '<div class="no-outline">Keine Datei ausgewählt</div>';
    }

    // Mock outline data - in real implementation this would be parsed from the file
    const outline = [
      { type: 'class', name: 'AppController', line: 1, level: 0 },
      { type: 'method', name: 'constructor', line: 8, level: 1 },
      { type: 'method', name: 'init', line: 15, level: 1 },
      { type: 'method', name: 'setupComponents', line: 25, level: 1 },
      { type: 'method', name: 'setupEventListeners', line: 35, level: 1 }
    ];

    return outline.map(item => `
      <div class="outline-item ${item.type}" data-line="${item.line}" style="padding-left: ${item.level * 12}px">
        <span class="outline-icon">${this.getOutlineIcon(item.type)}</span>
        <span class="outline-name">${item.name}</span>
        <span class="outline-line">${item.line}</span>
      </div>
    `).join('');
  }

  renderProblemsTab() {
    return `
      <div class="problems-tab">
        <div class="problems-header">
          <h4>⚠️ Probleme</h4>
          <div class="problem-filters">
            <button class="filter-btn active" data-filter="all">Alle</button>
            <button class="filter-btn" data-filter="errors">Fehler</button>
            <button class="filter-btn" data-filter="warnings">Warnungen</button>
            <button class="filter-btn" data-filter="info">Info</button>
          </div>
        </div>
        
        <div class="problems-content" id="problemsContent">
          ${this.renderProblemsContent()}
        </div>
      </div>
    `;
  }

  renderProblemsContent() {
    // Mock problems data
    const problems = [
      { type: 'error', message: 'Unexpected token', line: 15, column: 5 },
      { type: 'warning', message: 'Unused variable', line: 23, column: 10 },
      { type: 'info', message: 'Consider using const instead of let', line: 8, column: 3 }
    ];

    if (problems.length === 0) {
      return '<div class="no-problems">Keine Probleme gefunden</div>';
    }

    return problems.map(problem => `
      <div class="problem-item ${problem.type}" data-line="${problem.line}" data-column="${problem.column}">
        <span class="problem-icon">${this.getProblemIcon(problem.type)}</span>
        <div class="problem-details">
          <div class="problem-message">${problem.message}</div>
          <div class="problem-location">Zeile ${problem.line}, Spalte ${problem.column}</div>
        </div>
      </div>
    `).join('');
  }

  renderGitTab() {
    return `
      <div class="git-tab">
        <div class="git-status">
          <h4>📝 Git Status</h4>
          <div class="status-info">
            <div class="status-item">
              <span class="label">Branch:</span>
              <span class="value" id="gitBranch">main</span>
            </div>
            <div class="status-item">
              <span class="label">Status:</span>
              <span class="value" id="gitStatus">Clean</span>
            </div>
          </div>
        </div>
        
        <div class="git-actions">
          <h4>🔧 Git Aktionen</h4>
          <div class="action-list">
            <button class="action-btn" data-action="stage">📥 Stage</button>
            <button class="action-btn" data-action="commit">💾 Commit</button>
            <button class="action-btn" data-action="push">📤 Push</button>
            <button class="action-btn" data-action="pull">📥 Pull</button>
            <button class="action-btn" data-action="diff">🔍 Diff</button>
            <button class="action-btn" data-action="blame">👤 Blame</button>
          </div>
        </div>
      </div>
    `;
  }

  getOutlineIcon(type) {
    switch (type) {
      case 'class': return '🏗️';
      case 'method': return '⚙️';
      case 'function': return '🔧';
      case 'variable': return '📦';
      case 'import': return '📥';
      default: return '📄';
    }
  }

  getProblemIcon(type) {
    switch (type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileType(filename) {
    if (!filename) return '-';
    const ext = filename.split('.').pop().toLowerCase();
    const types = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'html': 'HTML',
      'css': 'CSS',
      'json': 'JSON',
      'md': 'Markdown',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C'
    };
    return types[ext] || ext.toUpperCase();
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
    const toggleBtn = this.container.querySelector('#toggleCodePanelBtn');
    toggleBtn?.addEventListener('click', () => {
      this.togglePanel();
    });

    // Code actions
    const actionBtns = this.container.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleCodeAction(action);
      });
    });

    // Outline items
    const outlineItems = this.container.querySelectorAll('.outline-item');
    outlineItems.forEach(item => {
      item.addEventListener('click', () => {
        const line = parseInt(item.dataset.line);
        this.goToLine(line);
      });
    });

    // Problem items
    const problemItems = this.container.querySelectorAll('.problem-item');
    problemItems.forEach(item => {
      item.addEventListener('click', () => {
        const line = parseInt(item.dataset.line);
        const column = parseInt(item.dataset.column);
        this.goToLine(line, column);
      });
    });

    // Problem filters
    const filterBtns = this.container.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        this.filterProblems(filter);
      });
    });

    // Refresh outline
    const refreshBtn = this.container.querySelector('#refreshOutlineBtn');
    refreshBtn?.addEventListener('click', () => {
      this.refreshOutline();
    });
  }

  setupEventListeners() {
    this.eventBus.on('code-right-panel:file:selected', (data) => {
      this.setCurrentFile(data.file);
    });

    this.eventBus.on('code-right-panel:analysis:updated', (data) => {
      this.updateAnalysis(data.analysis);
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
  }

  handleCodeAction(action) {
    this.eventBus.emit('code-right-panel:action:requested', { action });
  }

  goToLine(line, column = 1) {
    this.eventBus.emit('code-right-panel:goto:line', { line, column });
  }

  filterProblems(filter) {
    const filterBtns = this.container.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = this.container.querySelector(`[data-filter="${filter}"]`);
    activeBtn?.classList.add('active');

    this.eventBus.emit('code-right-panel:problems:filter', { filter });
  }

  refreshOutline() {
    this.eventBus.emit('code-right-panel:outline:refresh');
  }

  setCurrentFile(file) {
    this.currentFile = file;
    this.render();
    this.bindEvents();
  }

  updateAnalysis(analysis) {
    // Update analysis data
    const fileName = this.container.querySelector('#fileName');
    const fileSize = this.container.querySelector('#fileSize');
    const lineCount = this.container.querySelector('#lineCount');
    const fileType = this.container.querySelector('#fileType');

    if (fileName) fileName.textContent = analysis.fileName || '-';
    if (fileSize) fileSize.textContent = this.formatFileSize(analysis.fileSize);
    if (lineCount) lineCount.textContent = analysis.lineCount || 0;
    if (fileType) fileType.textContent = analysis.fileType || '-';
  }
}

export default CodeRightPanelComponent; 