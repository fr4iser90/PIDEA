/**
 * FILE-BASIERTE WORKSPACE-ERKENNUNG
 * Terminal-Output über Files in /tmp/IDEWEB/{port}/
 */
const fs = require('fs');
const path = require('path');

class FileBasedWorkspaceDetector {
  constructor(browserManager) {
    this.browserManager = browserManager;
    this.baseDir = '/tmp/IDEWEB';
    this._detectionCache = new Map();
  }

  /**
   * HAUPTMETHODE: Workspace-Info über File-Output
   * Nur ausführen wenn keine Daten vorhanden sind
   */
  async getWorkspaceInfo(port) {
    const cacheKey = `workspace-${port}`;
    
    // 1. Prüfe Cache zuerst
    if (this._detectionCache.has(cacheKey)) {
      console.log(`[FileBasedWorkspaceDetector] Using cached workspace info for port ${port}`);
      return this._detectionCache.get(cacheKey);
    }

    // 2. Prüfe ob bereits Files vorhanden sind
    const existingData = await this._checkExistingFiles(port);
    if (existingData && existingData.workspace) {
      console.log(`[FileBasedWorkspaceDetector] Found existing workspace data for port ${port}:`, existingData.workspace);
      this._detectionCache.set(cacheKey, existingData);
      return existingData;
    }

    // 3. Nur wenn keine Daten vorhanden sind, neue Detection starten
    console.log(`[FileBasedWorkspaceDetector] No existing data found for port ${port}, starting new detection...`);

    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        console.error('[FileBasedWorkspaceDetector] No page available');
        return null;
      }

      // 1. Terminal öffnen und File-Struktur erstellen
      await this._setupTerminalAndFiles(page, port);

      // 2. Terminal-Befehle ausführen und Output in Files umleiten
      await this._executeTerminalCommands(page, port);

      // 3. Files auslesen und verarbeiten
      const workspaceInfo = await this._readWorkspaceFiles(port);

      // 4. Terminal schließen
      await this._closeTerminal(page);

      if (workspaceInfo.workspace) {
        console.log(`[FileBasedWorkspaceDetector] Workspace info found for port ${port}:`, workspaceInfo.workspace);
        this._detectionCache.set(cacheKey, workspaceInfo);
        return workspaceInfo;
      }

      console.error('[FileBasedWorkspaceDetector] Failed to get workspace info');
      return null;

    } catch (error) {
      console.error('[FileBasedWorkspaceDetector] Error in workspace detection:', error);
      return null;
    }
  }

  /**
   * Terminal öffnen und File-Struktur erstellen
   */
  async _setupTerminalAndFiles(page, port) {
    try {
      console.log(`[FileBasedWorkspaceDetector] Setting up terminal and file structure for port ${port}...`);

      // Terminal öffnen (Ctrl+Shift+`)
      await page.keyboard.down('Control');
      await page.keyboard.down('Shift');
      await page.keyboard.press('`');
      await page.keyboard.up('Shift');
      await page.keyboard.up('Control');

      // Warten bis Terminal offen ist
      await page.waitForTimeout(1000);

      // File-Struktur erstellen
      const commands = [
        `mkdir -p /tmp/IDEWEB/${port}`,
        `rm -f /tmp/IDEWEB/${port}/*.txt` // Alte Files löschen
      ];

      for (const command of commands) {
        await page.keyboard.type(command);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }

      console.log(`[FileBasedWorkspaceDetector] File structure created for port ${port}`);

    } catch (error) {
      console.error('[FileBasedWorkspaceDetector] Error setting up terminal:', error);
    }
  }

  /**
   * Terminal schließen
   */
  async _closeTerminal(page) {
    try {
      console.log('[FileBasedWorkspaceDetector] Closing terminal...');
      
      // Terminal schließen (Ctrl+D oder Ctrl+W)
      await page.keyboard.down('Control');
      await page.keyboard.press('D');
      await page.keyboard.up('Control');
      
      // Alternative: Ctrl+W falls Ctrl+D nicht funktioniert
      await page.waitForTimeout(500);
      
      console.log('[FileBasedWorkspaceDetector] Terminal closed');
      
    } catch (error) {
      console.error('[FileBasedWorkspaceDetector] Error closing terminal:', error);
    }
  }

  /**
   * Terminal-Befehle ausführen und Output in Files umleiten
   */
  async _executeTerminalCommands(page, port) {
    try {
      console.log(`[FileBasedWorkspaceDetector] Executing terminal commands for port ${port}...`);

      const commands = [
        `pwd > /tmp/IDEWEB/${port}/workspace.txt`,
        `ls -la > /tmp/IDEWEB/${port}/files.txt`,
        `git status > /tmp/IDEWEB/${port}/git-status.txt 2>&1`,
        `pwd && ls -la && git status > /tmp/IDEWEB/${port}/info.txt 2>&1`,
        `echo "Terminal session started at $(date)" > /tmp/IDEWEB/${port}/terminal-session.txt`
      ];

      for (const command of commands) {
        await page.keyboard.type(command);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(800); // Warten bis Output geschrieben ist
      }

      console.log(`[FileBasedWorkspaceDetector] Terminal commands executed for port ${port}`);

    } catch (error) {
      console.error('[FileBasedWorkspaceDetector] Error executing terminal commands:', error);
    }
  }

  /**
   * Prüfe ob bereits Files vorhanden sind ohne Terminal zu öffnen
   */
  async _checkExistingFiles(port) {
    try {
      const basePath = `/tmp/IDEWEB/${port}`;
      
      // Prüfe ob Verzeichnis existiert
      if (!fs.existsSync(basePath)) {
        return null;
      }

      // Prüfe ob workspace.txt existiert und nicht leer ist
      const workspaceFile = `${basePath}/workspace.txt`;
      if (!fs.existsSync(workspaceFile)) {
        return null;
      }

      const workspaceContent = fs.readFileSync(workspaceFile, 'utf8').trim();
      if (!workspaceContent) {
        return null;
      }

      // Wenn workspace.txt existiert und Inhalt hat, alle Files auslesen
      console.log(`[FileBasedWorkspaceDetector] Found existing files for port ${port}, reading them...`);
      return await this._readWorkspaceFiles(port);

    } catch (error) {
      console.error('[FileBasedWorkspaceDetector] Error checking existing files:', error);
      return null;
    }
  }

  /**
   * Files auslesen und verarbeiten
   */
  async _readWorkspaceFiles(port) {
    try {
      console.log(`[FileBasedWorkspaceDetector] Reading workspace files for port ${port}...`);

      const basePath = `/tmp/IDEWEB/${port}`;
      const workspaceInfo = {
        port: port,
        workspace: null,
        files: [],
        gitStatus: null,
        info: null,
        session: null,
        timestamp: new Date().toISOString()
      };

      // Workspace-Pfad lesen
      try {
        if (fs.existsSync(`${basePath}/workspace.txt`)) {
          workspaceInfo.workspace = fs.readFileSync(`${basePath}/workspace.txt`, 'utf8').trim();
        }
      } catch (error) {
        console.error('[FileBasedWorkspaceDetector] Error reading workspace.txt:', error);
      }

      // Files-Liste lesen
      try {
        if (fs.existsSync(`${basePath}/files.txt`)) {
          const filesContent = fs.readFileSync(`${basePath}/files.txt`, 'utf8');
          workspaceInfo.files = filesContent.split('\n').filter(line => line.trim());
        }
      } catch (error) {
        console.error('[FileBasedWorkspaceDetector] Error reading files.txt:', error);
      }

      // Git-Status lesen
      try {
        if (fs.existsSync(`${basePath}/git-status.txt`)) {
          workspaceInfo.gitStatus = fs.readFileSync(`${basePath}/git-status.txt`, 'utf8').trim();
        }
      } catch (error) {
        console.error('[FileBasedWorkspaceDetector] Error reading git-status.txt:', error);
      }

      // Info-File lesen
      try {
        if (fs.existsSync(`${basePath}/info.txt`)) {
          workspaceInfo.info = fs.readFileSync(`${basePath}/info.txt`, 'utf8').trim();
        }
      } catch (error) {
        console.error('[FileBasedWorkspaceDetector] Error reading info.txt:', error);
      }

      // Session-Info lesen
      try {
        if (fs.existsSync(`${basePath}/terminal-session.txt`)) {
          workspaceInfo.session = fs.readFileSync(`${basePath}/terminal-session.txt`, 'utf8').trim();
        }
      } catch (error) {
        console.error('[FileBasedWorkspaceDetector] Error reading terminal-session.txt:', error);
      }

      console.log(`[FileBasedWorkspaceDetector] Workspace files read for port ${port}`);
      return workspaceInfo;

    } catch (error) {
      console.error('[FileBasedWorkspaceDetector] Error reading workspace files:', error);
      return null;
    }
  }

  /**
   * Workspace-Pfad extrahieren
   */
  async getWorkspacePath(port) {
    const workspaceInfo = await this.getWorkspaceInfo(port);
    return workspaceInfo ? workspaceInfo.workspace : null;
  }

  /**
   * Files-Liste abrufen
   */
  async getFilesList(port) {
    const workspaceInfo = await this.getWorkspaceInfo(port);
    return workspaceInfo ? workspaceInfo.files : [];
  }

  /**
   * Git-Status abrufen
   */
  async getGitStatus(port) {
    const workspaceInfo = await this.getWorkspaceInfo(port);
    return workspaceInfo ? workspaceInfo.gitStatus : null;
  }

  /**
   * Terminal-Befehl ausführen und Output in File umleiten
   */
  async executeCommand(port, command, outputFile = null) {
    try {
      const page = await this.browserManager.getPage();
      if (!page) return null;

      // File-Struktur sicherstellen
      await this._setupTerminalAndFiles(page, port);

      // Befehl ausführen
      const fullCommand = outputFile 
        ? `${command} > /tmp/IDEWEB/${port}/${outputFile} 2>&1`
        : command;

      await page.keyboard.type(fullCommand);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Output lesen falls File angegeben
      if (outputFile) {
        const filePath = `/tmp/IDEWEB/${port}/${outputFile}`;
        if (fs.existsSync(filePath)) {
          const output = fs.readFileSync(filePath, 'utf8').trim();
          
          // Terminal schließen
          await this._closeTerminal(page);
          
          return output;
        }
      }

      // Terminal schließen
      await this._closeTerminal(page);
      
      return 'Command executed';

    } catch (error) {
      console.error('[FileBasedWorkspaceDetector] Error executing command:', error);
      return null;
    }
  }

  /**
   * Cache leeren
   */
  clearCache() {
    this._detectionCache.clear();
    console.log('[FileBasedWorkspaceDetector] Cache cleared');
  }

  /**
   * Cache-Status
   */
  getCacheStatus() {
    return {
      size: this._detectionCache.size,
      keys: Array.from(this._detectionCache.keys())
    };
  }

  /**
   * File-Struktur Status
   */
  getFileStructureStatus() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        return { exists: false, message: 'Base directory does not exist' };
      }

      const ports = fs.readdirSync(this.baseDir);
      const status = {};

      for (const port of ports) {
        const portPath = path.join(this.baseDir, port);
        if (fs.statSync(portPath).isDirectory === true) {
          const files = fs.readdirSync(portPath);
          status[port] = {
            files: files,
            count: files.length
          };
        }
      }

      return {
        exists: true,
        baseDir: this.baseDir,
        ports: status
      };

    } catch (error) {
      return { exists: false, error: error.message };
    }
  }
}

module.exports = FileBasedWorkspaceDetector; 