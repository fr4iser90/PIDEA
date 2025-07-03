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
    
    // Prüfe Backend-Cache
    const cached = this.ideManager.getWorkspacePath(port);
    if (cached) {
      console.log(`[WorkspacePathDetector] Workspace path for port ${port} already set/cached:`, cached);
      return cached;
    }
    
    // Prüfe, ob bereits eine Erkennung läuft
    if (this._workspaceDetectionInProgress && this._workspaceDetectionInProgress[port]) {
      console.log(`[WorkspacePathDetector] Workspace detection already in progress for port ${port}, waiting...`);
      await this._workspaceDetectionInProgress[port];
      return this.ideManager.getWorkspacePath(port);
    }
    
    // Setze Flag für laufende Erkennung
    if (!this._workspaceDetectionInProgress) this._workspaceDetectionInProgress = {};
    this._workspaceDetectionInProgress[port] = new Promise(async (resolve) => {
      try {
        const page = await this.browserManager.getPage();
        if (!page) throw new Error('No Cursor IDE page available');
        
        // Method 1: Try to execute pwd command in terminal to get actual working directory
        console.log(`[WorkspacePathDetector] Trying to get pwd from terminal for port ${port}...`);
        
        // Use Playwright's keyboard API to open terminal (Ctrl+Shift+`)
        await page.keyboard.down('Control');
        await page.keyboard.down('Shift');
        await page.keyboard.press('`');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Control');
        
        // Wait for terminal to open
        await page.waitForTimeout(1000);
        
        // Look for terminal input
        const terminalInput = await page.$('.xterm-helper-textarea') || 
                             await page.$('.terminal-input') ||
                             await page.$('.xterm textarea');
        
        if (terminalInput) {
          console.log('[WorkspacePathDetector] Found terminal input, sending pwd command...');
          
          // Focus and send pwd command
          await terminalInput.focus();
          await terminalInput.type('pwd');
          await terminalInput.press('Enter');
          
          // Wait for output
          await page.waitForTimeout(2000);
          
          // Look for terminal output
          const terminalOutput = await page.$('.xterm-viewport') || 
                                await page.$('.terminal-output');
          
          if (terminalOutput) {
            const text = await terminalOutput.textContent();
            console.log('[WorkspacePathDetector] Terminal output:', text);
            
            // Find the path in the output
            const lines = text.split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
              const line = lines[i].trim();
              if (line && line.startsWith('/') && !line.includes('$') && !line.includes('>') && !line.includes('pwd')) {
                console.log('[WorkspacePathDetector] Found path:', line);
                
                // Close terminal with Ctrl+W
                await page.keyboard.down('Control');
                await page.keyboard.press('w');
                await page.keyboard.up('Control');
                
                this.ideManager.setWorkspacePath(port, line);
                resolve(line);
                return;
              }
            }
          }
          
          // Close terminal if no result
          await page.keyboard.down('Control');
          await page.keyboard.press('w');
          await page.keyboard.up('Control');
        } else {
          console.log('[WorkspacePathDetector] No terminal input found');
        }
        
        // If we get here, terminal method failed
        const actualPath = null;
        
        // Method 2: Fallback to VS Code API
        console.log(`[WorkspacePathDetector] Terminal method failed, trying VS Code API for port ${port}...`);
        const filePath = await page.evaluate(() => {
          try {
            // 1. VS Code API - Workspace Folders
            if (window.vscode && window.vscode.workspace && window.vscode.workspace.workspaceFolders) {
              const folders = window.vscode.workspace.workspaceFolders;
              if (folders.length > 0) {
                const uri = folders[0].uri;
                // Only use file:// URIs, skip virtual paths
                if (uri.scheme === 'file') {
                  return uri.fsPath || uri.path;
                }
              }
            }
            
            // 2. VS Code API - Root Path
            if (window.vscode && window.vscode.workspace && window.vscode.workspace.rootPath) {
              return window.vscode.workspace.rootPath;
            }
            
            // 3. Monaco Editor - Model URIs
            if (window.monaco && window.monaco.editor) {
              const models = window.monaco.editor.getModels();
              if (models.length > 0) {
                for (const model of models) {
                  const uri = model.uri;
                  if (uri && uri.path && !uri.path.includes('/.cache/') && !uri.path.includes('/usr/share/') && uri.scheme === 'file') {
                    return uri.path;
                  }
                }
              }
            }
            
            console.log('Could not detect workspace path from browser context');
            return null;
          } catch (error) {
            console.error('Error getting workspace path:', error);
            return null;
          }
        });
        
        if (filePath) {
          // Extrahiere Projekt-Root aus Datei-Pfad
          const workspacePath = this._extractProjectRoot(filePath);
          
          if (workspacePath) {
            // Sende Workspace-Pfad an Server API
            this.ideManager.setWorkspacePath(port, workspacePath);
            console.log(`[WorkspacePathDetector] Set workspace path for port ${port}:`, workspacePath);
            resolve(workspacePath);
          } else {
            console.error('[WorkspacePathDetector] Could not extract project root from file path:', filePath);
            resolve(null);
          }
        } else {
          console.error('[WorkspacePathDetector] Could not detect workspace path');
          resolve(null);
        }
        
      } catch (error) {
        console.error('[WorkspacePathDetector] Error in workspace detection:', error);
        resolve(null);
      } finally {
        // Flag entfernen
        delete this._workspaceDetectionInProgress[port];
      }
    });
    
    return await this._workspaceDetectionInProgress[port];
  }
}

module.exports = WorkspacePathDetector;
