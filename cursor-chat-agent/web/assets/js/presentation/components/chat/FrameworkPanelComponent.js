// FrameworkPanelComponent.js
// Zeigt alle Framework-.md-Dateien als Liste mit Toggle und Modal-Trigger

export default class FrameworkPanelComponent {
  constructor(containerId, onFrameworkClick, onToggle, frameworks) {
    this.container = document.getElementById(containerId);
    this.onFrameworkClick = onFrameworkClick;
    this.onToggle = onToggle;
    // Use provided frameworks or fallback to empty array
    this.frameworks = Array.isArray(frameworks) ? frameworks.map(fw => ({ ...fw })) : [];
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="framework-panel">
        <div class="framework-panel-header">Frameworks</div>
        <ul class="framework-list">
          ${this.frameworks.map((fw, i) => `
            <li class="framework-item">
              <span class="framework-name${fw.active ? ' active' : ''}" data-index="${i}">${fw.name}</span>
            </li>
          `).join('')}
        </ul>
        <button id="addFrameworkBtn">+ Neu</button>
      </div>
    `;
    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.framework-name').forEach(name => {
      name.onclick = (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.frameworks[idx].active = !this.frameworks[idx].active;
        this.onToggle && this.onToggle(this.frameworks[idx]);
        this.render();
      };
      name.onkeydown = (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          name.click();
        }
      };
    });
    this.container.querySelector('#addFrameworkBtn').onclick = () => {
      // Platzhalter: neues Framework anlegen
      const fname = prompt('Framework-Dateiname (.md):');
      if (fname && fname.endsWith('.md')) {
        this.frameworks.push({ name: fname, active: false });
        this.render();
      }
    };
  }

  getActiveFrameworks() {
    return this.frameworks.filter(fw => fw.active);
  }
} 