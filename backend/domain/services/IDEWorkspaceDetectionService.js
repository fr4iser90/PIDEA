
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

      // Extract project name from workspace path
      const path = require('path');
      const projectName = path.basename(workspacePath);
      
      // Generate project ID
      const projectId = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      logger.info(`Creating project in database: ${projectId} (${projectName}) at ${workspacePath}`);
      
      // Create project using findOrCreateByWorkspacePath
      const project = await this.projectRepository.findOrCreateByWorkspacePath(workspacePath, {
        id: projectId,
        name: projectName,
        description: `Project detected at ${workspacePath}`,
        type: 'development',
        metadata: {
          detectedBy: 'IDEWorkspaceDetectionService',
          port: port,
          detectedAt: new Date().toISOString()
        }
      });
      
      logger.info(`Project created/found in database: ${project.id}`);
      
    } catch (error) {
      logger.error('Failed to create project in database:', error.message);
    }
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