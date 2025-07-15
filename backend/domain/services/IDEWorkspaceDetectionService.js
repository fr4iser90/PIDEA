
const Logger = require('@logging/Logger');
const logger = new Logger('IDEWorkspaceDetectionService');

/**
 * IDE WORKSPACE DETECTION SERVICE
 * Domain Service für File-basierte Workspace-Erkennung
 * DDD Pattern: Domain Service
 */

class IDEWorkspaceDetectionService {
  constructor(ideManager) {
    this.ideManager = ideManager;
    this.detectionResults = new Map();
  }

  /**
   * Alle verfügbaren IDEs scannen und Workspace-Info sammeln
   * Nur für IDEs ohne bereits vorhandene Detection-Ergebnisse
   */
  async detectAllWorkspaces() {
    try {
      logger.info('Starting workspace detection for all IDEs...');
      
      // Verfügbare IDEs abrufen
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      
      if (availableIDEs.length === 0) {
        logger.info('No IDEs available for workspace detection');
        return this.detectionResults;
      }
      
      // Filtere IDEs die bereits Detection-Ergebnisse haben
      const idesWithoutResults = availableIDEs.filter(ide => !this.detectionResults.has(ide.port));
      
      if (idesWithoutResults.length === 0) {
        logger.info('All IDEs already have detection results, skipping detection');
        return this.detectionResults;
      }
      
      logger.info(`Found ${idesWithoutResults.length} IDEs for detection (${availableIDEs.length - idesWithoutResults.length} already have results)`);
      
      // Nur für IDEs ohne Ergebnisse Workspace-Info sammeln
      for (const ide of idesWithoutResults) {
        await this.detectWorkspaceForIDE(ide.port);
      }
      
      logger.info('Workspace detection completed');
      return this.detectionResults;
      
    } catch (error) {
      logger.error('Error during workspace detection:', error);
      throw error;
    }
  }

  /**
   * Workspace für eine spezifische IDE erkennen
   * Nur wenn noch keine Ergebnisse für diesen Port vorhanden sind
   */
  async detectWorkspaceForIDE(port) {
    try {
      // Prüfe ob bereits Ergebnisse vorhanden sind
      if (this.detectionResults.has(port)) {
        const existingResult = this.detectionResults.get(port);
        logger.info(`Port ${port}: Using existing detection result:`, existingResult.workspace || existingResult.error);
        return existingResult;
      }
      
      logger.info(`Detecting workspace for IDE on port ${port}...`);
      
      const workspaceInfo = await this.ideManager.getWorkspaceInfo(port);
      
      if (workspaceInfo && workspaceInfo.workspace) {
        this.detectionResults.set(port, {
          success: true,
          workspace: workspaceInfo.workspace,
          files: workspaceInfo.files.length,
          gitStatus: workspaceInfo.gitStatus ? 'Available' : 'Not available',
          session: workspaceInfo.session,
          timestamp: workspaceInfo.timestamp
        });
        
        logger.info(`Port ${port}: ${workspaceInfo.workspace}`);
        
        // AUTOMATISCH Projekt in der DB erstellen
        await this.createProjectInDatabase(workspaceInfo.workspace, port);
        
        return workspaceInfo;
        
      } else {
        this.detectionResults.set(port, {
          success: false,
          error: 'No workspace info found'
        });
        
        logger.info(`Port ${port}: No workspace info found`);
        return null;
      }
      
    } catch (error) {
      this.detectionResults.set(port, {
        success: false,
        error: error.message
      });
      
      logger.info(`Port ${port}: ${error.message}`);
      throw error;
    }
  }

  /**
   * AUTOMATISCH Projekt in der DB erstellen
   * @param {string} workspacePath - Workspace path
   * @param {number} port - IDE port
   */
  async createProjectInDatabase(workspacePath, port) {
    try {
      // Use injected project repository
      if (!this.projectRepository) {
        logger.warn('No project repository available, skipping project creation');
        return;
      }
      
      logger.info('Project repository available:', typeof this.projectRepository);
      logger.info('Project repository methods:', Object.getOwnPropertyNames(this.projectRepository));
      
      if (!this.projectRepository.findOrCreateByWorkspacePath) {
        logger.warn('Project repository missing findOrCreateByWorkspacePath method, skipping project creation');
        return;
      }

      // Extract project name from workspace path
      const path = require('path');
      const projectName = path.basename(workspacePath);
      
      // Generate project ID
      const projectId = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      logger.info(`Creating project in database: ${projectId} (${projectName}) at ${workspacePath}`);
      
      // Detect ports from package.json files
      const detectedPorts = await this.detectPortsFromPackageJson(workspacePath);
      
      // Create project using findOrCreateByWorkspacePath
      const project = await this.projectRepository.findOrCreateByWorkspacePath(workspacePath, {
        id: projectId,
        name: projectName,
        description: `Project detected at ${workspacePath}`,
        type: 'development',
        // Add detected ports
        frontendPort: detectedPorts.frontendPort,
        backendPort: detectedPorts.backendPort,
        databasePort: detectedPorts.databasePort,
        // Add detected commands
        devCommand: detectedPorts.devCommand,
        startCommand: detectedPorts.startCommand,
        buildCommand: detectedPorts.buildCommand,
        testCommand: detectedPorts.testCommand,
        metadata: {
          detectedBy: 'IDEWorkspaceDetectionService',
          port: port,
          detectedPorts: detectedPorts,
          detectedAt: new Date().toISOString()
        }
      });
      
      logger.info(`Project created/found in database: ${project.id}`);
      logger.info(`Detected ports: Frontend=${detectedPorts.frontendPort}, Backend=${detectedPorts.backendPort}, Database=${detectedPorts.databasePort}`);
      
    } catch (error) {
      logger.error('Failed to create project in database:', error.message || error);
      logger.error('Error details:', error);
    }
  }

  /**
   * Detect ports from package.json files in the workspace
   * @param {string} workspacePath - Workspace path
   * @returns {Object} Detected ports and commands
   */
  async detectPortsFromPackageJson(workspacePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const result = {
        frontendPort: null,
        backendPort: null,
        databasePort: null,
        devCommand: null,
        startCommand: null,
        buildCommand: null,
        testCommand: null
      };

      // Check root package.json
      const rootPackagePath = path.join(workspacePath, 'package.json');
      if (fs.existsSync(rootPackagePath)) {
        const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
        const rootPorts = this.extractPortsFromScripts(rootPackage.scripts || {});
        
        // Root package.json usually contains workspace scripts
        if (rootPorts.devPort) result.frontendPort = rootPorts.devPort;
        if (rootPorts.startPort) result.backendPort = rootPorts.startPort;
        
        // Extract commands
        if (rootPackage.scripts?.dev) result.devCommand = rootPackage.scripts.dev;
        if (rootPackage.scripts?.start) result.startCommand = rootPackage.scripts.start;
        if (rootPackage.scripts?.build) result.buildCommand = rootPackage.scripts.build;
        if (rootPackage.scripts?.test) result.testCommand = rootPackage.scripts.test;
      }

      // Check frontend package.json
      const frontendPackagePath = path.join(workspacePath, 'frontend', 'package.json');
      if (fs.existsSync(frontendPackagePath)) {
        const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
        const frontendPorts = this.extractPortsFromScripts(frontendPackage.scripts || {});
        
        if (frontendPorts.devPort) result.frontendPort = frontendPorts.devPort;
        if (frontendPorts.startPort) result.frontendPort = frontendPorts.startPort;
        
        // Update commands if not already set
        if (!result.devCommand && frontendPackage.scripts?.dev) result.devCommand = frontendPackage.scripts.dev;
        if (!result.startCommand && frontendPackage.scripts?.start) result.startCommand = frontendPackage.scripts.start;
        if (!result.buildCommand && frontendPackage.scripts?.build) result.buildCommand = frontendPackage.scripts.build;
        if (!result.testCommand && frontendPackage.scripts?.test) result.testCommand = frontendPackage.scripts.test;
      }

      // Check backend package.json
      const backendPackagePath = path.join(workspacePath, 'backend', 'package.json');
      if (fs.existsSync(backendPackagePath)) {
        const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
        const backendPorts = this.extractPortsFromScripts(backendPackage.scripts || {});
        
        if (backendPorts.devPort) result.backendPort = backendPorts.devPort;
        if (backendPorts.startPort) result.backendPort = backendPorts.startPort;
        
        // Update commands if not already set
        if (!result.devCommand && backendPackage.scripts?.dev) result.devCommand = backendPackage.scripts.dev;
        if (!result.startCommand && backendPackage.scripts?.start) result.startCommand = backendPackage.scripts.start;
        if (!result.buildCommand && backendPackage.scripts?.build) result.buildCommand = backendPackage.scripts.build;
        if (!result.testCommand && backendPackage.scripts?.test) result.testCommand = backendPackage.scripts.test;
      }

      // Check for database port in docker-compose or other config files
      const dockerComposePath = path.join(workspacePath, 'docker-compose.yml');
      if (fs.existsSync(dockerComposePath)) {
        const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
        const dbPortMatch = dockerComposeContent.match(/ports:\s*-\s*"(\d+):\d+"/);
        if (dbPortMatch) {
          result.databasePort = parseInt(dbPortMatch[1]);
        }
      }

      logger.info(`Port detection completed for ${workspacePath}:`, result);
      return result;

    } catch (error) {
      logger.error('Error detecting ports from package.json:', error.message);
      return {
        frontendPort: null,
        backendPort: null,
        databasePort: null,
        devCommand: null,
        startCommand: null,
        buildCommand: null,
        testCommand: null
      };
    }
  }

  /**
   * Extract ports from package.json scripts
   * @param {Object} scripts - Package.json scripts object
   * @returns {Object} Extracted ports
   */
  extractPortsFromScripts(scripts) {
    const result = {
      devPort: null,
      startPort: null
    };

    for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
      if (!scriptCommand) continue;

      // Port extraction patterns
      const portPatterns = [
        /--port\s+(\d+)/i,
        /-p\s+(\d+)/i,
        /port\s*=\s*(\d+)/i,
        /--port=(\d+)/i,
        /:(\d+)/i  // For URLs like localhost:3000
      ];

      for (const pattern of portPatterns) {
        const match = scriptCommand.match(pattern);
        if (match) {
          const port = parseInt(match[1]);
          
          // Determine which port this is based on script name
          if (scriptName.toLowerCase().includes('dev') || scriptName.toLowerCase().includes('frontend')) {
            result.devPort = port;
          } else if (scriptName.toLowerCase().includes('start') || scriptName.toLowerCase().includes('backend')) {
            result.startPort = port;
          } else {
            // Default to dev port if script name doesn't give us a clue
            if (!result.devPort) result.devPort = port;
          }
          break;
        }
      }
    }

    return result;
  }

  /**
   * Workspace-Pfad für eine IDE abrufen
   */
  async getWorkspacePath(port) {
    try {
      const workspaceInfo = await this.ideManager.getWorkspacePath(port);
      return workspaceInfo;
    } catch (error) {
      logger.error(`Error getting workspace path for port ${port}:`, error);
      return null;
    }
  }

  /**
   * Files-Liste für eine IDE abrufen
   */
  async getFilesList(port) {
    try {
      const filesList = await this.ideManager.getFilesList(port);
      return filesList;
    } catch (error) {
      logger.error(`Error getting files list for port ${port}:`, error);
      return [];
    }
  }

  /**
   * Git-Status für eine IDE abrufen
   */
  async getGitStatus(port) {
    try {
      const gitStatus = await this.ideManager.getGitStatus(port);
      return gitStatus;
    } catch (error) {
      logger.error(`Error getting git status for port ${port}:`, error);
      return null;
    }
  }

  /**
   * Terminal-Befehl für eine IDE ausführen
   */
  async executeTerminalCommand(port, command, outputFile = null) {
    try {
      const result = await this.ideManager.executeTerminalCommand(port, command, outputFile);
      return result;
    } catch (error) {
      logger.error(`Error executing terminal command for port ${port}:`, error);
      return null;
    }
  }

  /**
   * Detection-Ergebnisse abrufen
   */
  getDetectionResults() {
    return Object.fromEntries(this.detectionResults);
  }

  /**
   * Detection-Statistiken abrufen
   */
  getDetectionStats() {
    const results = Array.from(this.detectionResults.values());
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return {
      total: this.detectionResults.size,
      successful,
      failed,
      successRate: this.detectionResults.size > 0 ? (successful / this.detectionResults.size) * 100 : 0
    };
  }

  /**
   * Detection-Ergebnisse zurücksetzen
   */
  clearDetectionResults() {
    this.detectionResults.clear();
    logger.info('Detection results cleared');
  }

  /**
   * Service-Status abrufen
   */
  getServiceStatus() {
    return {
      ideManagerAvailable: !!this.ideManager,
      fileDetectorAvailable: !!this.ideManager?.fileDetector,
      detectionResultsCount: this.detectionResults.size,
      stats: this.getDetectionStats()
    };
  }
}

module.exports = IDEWorkspaceDetectionService; 