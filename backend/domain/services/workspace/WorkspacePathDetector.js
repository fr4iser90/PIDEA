
class WorkspacePathDetector {
  constructor(browserManager, ideManager) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this._workspaceDetectionInProgress = {};
  }

  /**
   * Extrahiert den Projekt-Root-Pfad aus einem Datei-Pfad
   */
  _extractProjectRoot(filePath) {
    if (!filePath) return null;
    
    // Entferne file:// Protokoll falls vorhanden
    let path = filePath.replace(/^file:\/\//, '');
    
    // Entferne Dateinamen am Ende
    if (path.includes('/')) {
      const lastSlash = path.lastIndexOf('/');
      if (lastSlash > 0) {
        path = path.substring(0, lastSlash);
      }
    }
    
    // Suche nach typischen Projekt-Root-Indikatoren
    const pathParts = path.split('/');
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const currentPath = '/' + pathParts.slice(0, i + 1).join('/');
      
      // Prüfe ob es ein Projekt-Root ist
      if (this._isProjectRoot(currentPath)) {
        return currentPath;
      }
    }
    
    // Fallback: Gib den Pfad ohne Dateinamen zurück
    return path;
  }

  /**
   * Prüft ob ein Pfad ein Projekt-Root ist
   */
  _isProjectRoot(path) {
    // Typische Projekt-Root-Dateien
    const projectFiles = [
      'package.json', 'package-lock.json', 'yarn.lock',
      'Cargo.toml', 'Cargo.lock',
      'pyproject.toml', 'requirements.txt', 'setup.py',
      'composer.json', 'composer.lock',
      'Gemfile', 'Gemfile.lock',
      'go.mod', 'go.sum',
      'pom.xml', 'build.gradle',
      '.git', '.gitignore',
      'README.md', 'README.txt',
      'Makefile', 'CMakeLists.txt',
      'shell.nix', 'default.nix'
    ];
    
    // Prüfe ob eine dieser Dateien im Pfad existiert
    for (const file of projectFiles) {
      try {
        const fs = require('fs');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
        const filePath = path + '/' + file;
        if (fs.existsSync(filePath)) {
          return true;
        }
      } catch (error) {
        // Ignoriere Fehler beim Dateisystem-Zugriff
      }
    }
    
    return false;
  }

  /**
   * Ermittelt den absoluten Workspace-Pfad über Playwright page.evaluate().
   * Führt JavaScript im Browser aus um pwd zu bekommen und sendet es an Server API.
   */
  async addWorkspacePathDetectionViaPlaywright() {
    const port = this.ideManager.getActivePort();
    if (!port) throw new Error('No active IDE port');
    
    // DISABLED: Terminal-based detection removed to prevent unwanted terminal interactions
    // This method now returns null to force use of CDP-based detection only
    logger.info(`WorkspacePathDetector: Terminal-based detection disabled for port ${port} - using CDP-based detection only`);
    return null;
  }
}

module.exports = WorkspacePathDetector;
