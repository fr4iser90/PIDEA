// FrameworkModalComponent.js
// Zeigt den Inhalt einer Framework-.md-Datei im Modal (Read-Only, Editiermodus, Speichern, Löschen)

export default class FrameworkModalComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.framework = null;
    this.isEditing = false;
    this.content = '';
  }

  open(framework) {
    this.framework = framework;
    this.content = this.getFrameworkContent(framework.name);
    this.isEditing = false;
    this.render();
    this.container.style.display = 'block';
  }

  close() {
    this.container.style.display = 'none';
    this.framework = null;
    this.isEditing = false;
  }

  render() {
    if (!this.framework) return;
    this.container.innerHTML = `
      <div class="framework-modal-overlay">
        <div class="framework-modal">
          <div class="framework-modal-header">
            <span>${this.framework.name}</span>
            <button id="closeFrameworkModal">×</button>
          </div>
          <div class="framework-modal-content">
            ${this.isEditing ?
              `<textarea id="frameworkEditArea" rows="16">${this.content}</textarea>` :
              `<pre>${this.content}</pre>`
            }
          </div>
          <div class="framework-modal-actions">
            <button id="editFrameworkBtn">${this.isEditing ? 'Speichern' : 'Bearbeiten'}</button>
            <button id="deleteFrameworkBtn">Löschen</button>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelector('#closeFrameworkModal').onclick = () => this.close();
    this.container.querySelector('#editFrameworkBtn').onclick = () => {
      if (this.isEditing) {
        // Speichern
        this.content = this.container.querySelector('#frameworkEditArea').value;
        // TODO: Echte Speicherung ins Dateisystem
        this.isEditing = false;
        this.render();
      } else {
        this.isEditing = true;
        this.render();
      }
    };
    this.container.querySelector('#deleteFrameworkBtn').onclick = () => {
      if (confirm('Framework wirklich löschen?')) {
        // TODO: Echte Löschung im Dateisystem
        this.close();
      }
    };
  }

  getFrameworkContent(name) {
    // Platzhalter-Inhalte
    if (name === 'doc-general.md') return '# General Framework\n\n- Accessibility\n- Performance';
    if (name === 'doc-code.md') return '# Code Framework\n\n- Clean Code\n- Tests';
    return '# Custom Framework\n\n- Custom Rules';
  }
} 