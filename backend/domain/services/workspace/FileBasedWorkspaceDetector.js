
/**
 * FILE-BASIERTE WORKSPACE-ERKENNUNG
 * Terminal-Output über Files in /tmp/IDEWEB/{port}/
 */
const fs = require('fs');
const path = require('path');
const VSCodeTerminalHandler = require('../terminal/VSCodeTerminalHandler');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

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
      logger.info(`Using cached workspace info for port ${port}`);
      return this._detectionCache.get(cacheKey);
    }

    // 2. Prüfe ob bereits Files vorhanden sind
    const existingData = await this._checkExistingFiles(port);
    if (existingData && existingData.workspace) {
      logger.info(`Found existing workspace data for port ${port}`);
      this._detectionCache.set(cacheKey, existingData);
      return existingData;
    }

    // 3. Nur wenn keine Daten vorhanden sind, neue Detection starten
    logger.info(`No existing data found for port ${port}, starting new detection...`);

    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        logger.error('No page available');
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

      if (workspaceInfo && workspaceInfo.workspace) {
        logger.info(`Workspace info found for port ${port}:`, workspaceInfo.workspace);
        this._detectionCache.set(cacheKey, workspaceInfo);
        return workspaceInfo;
      }

      logger.error('Failed to get workspace info');
      return null;

    } catch (error) {
      logger.error('Error in workspace detection:', error);
      return null;
    }
  }

  /**
   * Terminal öffnen und File-Struktur erstellen
   */
  async _setupTerminalAndFiles(page, port) {
    // VSCode: use handler
    if (this._isVSCodePort(port)) {
      const handler = new VSCodeTerminalHandler();
      await handler.initialize(port);
      // File-Struktur erstellen
      await handler.executeCommand(`mkdir -p /tmp/IDEWEB/${port}/projects`);
      await handler.cleanup();
      return;
    }
    try {
      logger.info(`Setting up terminal and file structure for port ${port}...`);

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
        `mkdir -p /tmp/IDEWEB/${port}/projects`
      ];

      for (const command of commands) {
        await page.keyboard.type(command);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }

      logger.info(`File structure created for port ${port}`);

    } catch (error) {
      logger.error('Error setting up terminal:', error);
    }
  }

  /**
   * Terminal schließen
   */
  async _closeTerminal(page) {
    try {
      logger.info('Closing terminal...');
      
      await page.keyboard.type('exit');
      await page.keyboard.press('Enter');
      
      // Warten bis Terminal geschlossen ist
      await page.waitForTimeout(1000);
      
      logger.info('Terminal closed');
      
    } catch (error) {
      logger.error('Error closing terminal:', error);
    }
  }

  /**
   * Terminal-Befehle ausführen und Output in Files umleiten
   * NEW: Project-based structure
   */
  async _executeTerminalCommands(page, port) {
    // VSCode: use handler
    if (this._isVSCodePort(port)) {
      const handler = new VSCodeTerminalHandler();
      await handler.initialize(port);
      
      // Get current workspace and project name
      const workspacePath = await handler.executeCommand('pwd');
      const projectName = this._extractProjectName(workspacePath);
      
      // Create project directory and files
      const projectDir = `/tmp/IDEWEB/${port}/projects/${projectName}`;
      const commands = [
        `mkdir -p ${projectDir}`,
        `pwd > ${projectDir}/workspace.txt`,
        `ls -la > ${projectDir}/files.txt`,
        `git status > ${projectDir}/git-status.txt 2>&1`,
        `pwd && ls -la && git status > ${projectDir}/info.txt 2>&1`,
        `echo "Terminal session started at $(date)" > ${projectDir}/terminal-session.txt`,
        `echo "${projectName}" > /tmp/IDEWEB/${port}/current-project.txt`
      ];
      
      for (const command of commands) {
        await handler.executeCommand(command);
      }
      await handler.cleanup();
      return;
    }
    
    try {
      logger.info(`Executing terminal commands for port ${port}...`);

      // Get current workspace and project name
      const workspacePath = await this._getCurrentWorkspace(page);
      const projectName = this._extractProjectName(workspacePath);
      
      logger.info(`Detected project: ${projectName} at ${workspacePath}`);
      
      // Create project directory and files
      const projectDir = `/tmp/IDEWEB/${port}/projects/${projectName}`;
      const commands = [
        `mkdir -p ${projectDir}`,
        `pwd > ${projectDir}/workspace.txt`,
        `ls -la > ${projectDir}/files.txt`,
        `git status > ${projectDir}/git-status.txt 2>&1`,
        `pwd && ls -la && git status > ${projectDir}/info.txt 2>&1`,
        `echo "Terminal session started at $(date)" > ${projectDir}/terminal-session.txt`,
        `echo "${projectName}" > /tmp/IDEWEB/${port}/current-project.txt`
      ];

      for (const command of commands) {
        await page.keyboard.type(command);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(800); // Warten bis Output geschrieben ist
      }

      logger.info(`Terminal commands executed for port ${port}, project ${projectName}`);

    } catch (error) {
      logger.error('Error executing terminal commands:', error);
    }
  }

  /**
   * Get current workspace path from terminal
   */
  async _getCurrentWorkspace(page) {
    try {
      // Create temporary file to capture pwd output
      const tempFile = `/tmp/IDEWEB/pwd_temp_${Date.now()}.txt`;
      
      await page.keyboard.type(`pwd > ${tempFile}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Read the file
      if (fs.existsSync(tempFile)) {
        const workspacePath = fs.readFileSync(tempFile, 'utf8').trim();
        fs.unlinkSync(tempFile); // Clean up
        return workspacePath;
      }
      
      return process.cwd(); // Fallback
    } catch (error) {
      logger.error('Error getting current workspace:', error);
      return process.cwd(); // Fallback
    }
  }

  /**
   * Extract project name from workspace path
   */
  _extractProjectName(workspacePath) {
    try {
      if (!workspacePath) return 'unknown-project';
      
      // Get the last directory name from the path
      const pathParts = workspacePath.split('/').filter(part => part.trim());
      const projectName = pathParts[pathParts.length - 1] || 'unknown-project';
      
      // Clean the project name (remove special characters)
      const cleanName = projectName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      
      return cleanName || 'unknown-project';
    } catch (error) {
      logger.error('Error extracting project name:', error);
      return 'unknown-project';
    }
  }

  /**
   * Prüfe ob bereits Files vorhanden sind ohne Terminal zu öffnen
   * NEW: Check project-based structure
   */
  async _checkExistingFiles(port) {
    try {
      const basePath = `/tmp/IDEWEB/${port}`;
      
      // Prüfe ob Verzeichnis existiert
      if (!fs.existsSync(basePath)) {
        return null;
      }

      // Check current project
      const currentProjectFile = `${basePath}/current-project.txt`;
      let currentProject = null;
      
      if (fs.existsSync(currentProjectFile)) {
        currentProject = fs.readFileSync(currentProjectFile, 'utf8').trim();
        logger.info(`Current project: ${currentProject}`);
      }

      // If no current project, try to find any project with data
      if (!currentProject) {
        const projectsDir = `${basePath}/projects`;
        if (fs.existsSync(projectsDir)) {
          const projects = fs.readdirSync(projectsDir).filter(dir => {
            const projectPath = path.join(projectsDir, dir);
            return fs.statSync(projectPath).isDirectory();
          });
          
          if (projects.length > 0) {
            currentProject = projects[0]; // Use first available project
            logger.info(`Using first available project: ${currentProject}`);
          }
        }
      }

      if (!currentProject) {
        return null;
      }

      // Check project-specific workspace file
      const projectWorkspaceFile = `${basePath}/projects/${currentProject}/workspace.txt`;
      if (!fs.existsSync(projectWorkspaceFile)) {
        return null;
      }

      const workspaceContent = fs.readFileSync(projectWorkspaceFile, 'utf8').trim();
      if (!workspaceContent) {
        return null;
      }

      // Wenn workspace.txt existiert und Inhalt hat, alle Files auslesen
      logger.info(`Found existing files for port ${port}, project ${currentProject}, reading them...`);
      return await this._readWorkspaceFiles(port, currentProject);

    } catch (error) {
      logger.error('Error checking existing files:', error);
      return null;
    }
  }

  /**
   * Files auslesen und verarbeiten
   * NEW: Project-based file reading
   */
  async _readWorkspaceFiles(port, projectName = null) {
    try {
      // If no project name provided, try to get current project
      if (!projectName) {
        const currentProjectFile = `/tmp/IDEWEB/${port}/current-project.txt`;
        if (fs.existsSync(currentProjectFile)) {
          projectName = fs.readFileSync(currentProjectFile, 'utf8').trim();
        }
      }

      if (!projectName) {
        logger.error('No project name available for reading files');
        return null;
      }

      logger.info(`Reading workspace files for port ${port}, project ${projectName}...`);

      const basePath = `/tmp/IDEWEB/${port}/projects/${projectName}`;
      const workspaceInfo = {
        port: port,
        projectName: projectName,
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
        logger.error('Error reading workspace.txt:', error);
      }

      // Files-Liste lesen
      try {
        if (fs.existsSync(`${basePath}/files.txt`)) {
          const filesContent = fs.readFileSync(`${basePath}/files.txt`, 'utf8');
          workspaceInfo.files = filesContent.split('\n').filter(line => line.trim());
        }
      } catch (error) {
        logger.error('Error reading files.txt:', error);
      }

      // Git-Status lesen
      try {
        if (fs.existsSync(`${basePath}/git-status.txt`)) {
          workspaceInfo.gitStatus = fs.readFileSync(`${basePath}/git-status.txt`, 'utf8').trim();
        }
      } catch (error) {
        logger.error('Error reading git-status.txt:', error);
      }

      // Info-File lesen
      try {
        if (fs.existsSync(`${basePath}/info.txt`)) {
          workspaceInfo.info = fs.readFileSync(`${basePath}/info.txt`, 'utf8').trim();
        }
      } catch (error) {
        logger.error('Error reading info.txt:', error);
      }

      // Session-Info lesen
      try {
        if (fs.existsSync(`${basePath}/terminal-session.txt`)) {
          workspaceInfo.session = fs.readFileSync(`${basePath}/terminal-session.txt`, 'utf8').trim();
        }
      } catch (error) {
        logger.error('Error reading terminal-session.txt:', error);
      }

      logger.info(`Workspace files read for port ${port}, project ${projectName}`);
      return workspaceInfo;

    } catch (error) {
      logger.error('Error reading workspace files:', error);
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
   * NEW: Project-based command execution
   */
  async executeCommand(port, command, outputFile = null) {
    // VSCode: use handler
    if (this._isVSCodePort(port)) {
      const handler = new VSCodeTerminalHandler();
      await handler.initialize(port);
      
      // Get current project
      const currentProjectFile = `/tmp/IDEWEB/${port}/current-project.txt`;
      let projectName = 'unknown-project';
      
      if (fs.existsSync(currentProjectFile)) {
        projectName = fs.readFileSync(currentProjectFile, 'utf8').trim();
      }
      
      const projectDir = `/tmp/IDEWEB/${port}/projects/${projectName}`;
      
      let result = await handler.executeCommand(outputFile 
        ? `${command} > ${projectDir}/${outputFile} 2>&1`
        : command);
      await handler.cleanup();
      
      if (outputFile) {
        const filePath = `${projectDir}/${outputFile}`;
        if (fs.existsSync(filePath)) {
          return fs.readFileSync(filePath, 'utf8').trim();
        }
      }
      return result;
    }
    
    try {
      const page = await this.browserManager.getPage();
      if (!page) return null;

      // File-Struktur sicherstellen
      await this._setupTerminalAndFiles(page, port);

      // Get current project
      const currentProjectFile = `/tmp/IDEWEB/${port}/current-project.txt`;
      let projectName = 'unknown-project';
      
      if (fs.existsSync(currentProjectFile)) {
        projectName = fs.readFileSync(currentProjectFile, 'utf8').trim();
      }
      
      const projectDir = `/tmp/IDEWEB/${port}/projects/${projectName}`;

      // Befehl ausführen
      const fullCommand = outputFile 
        ? `${command} > ${projectDir}/${outputFile} 2>&1`
        : command;

      await page.keyboard.type(fullCommand);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Output lesen falls File angegeben
      if (outputFile) {
        const filePath = `${projectDir}/${outputFile}`;
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
      logger.error('Error executing command:', error);
      return null;
    }
  }

  /**
   * Cache leeren
   */
  clearCache() {
    this._detectionCache.clear();
    logger.info('Cache cleared');
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

  _isVSCodePort(port) {
    // VSCode ports: 9232-9241
    return Number(port) >= 9232 && Number(port) <= 9241;
  }
}

module.exports = FileBasedWorkspaceDetector; 