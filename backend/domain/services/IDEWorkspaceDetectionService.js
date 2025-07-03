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
   */
  async detectAllWorkspaces() {
    try {
      console.log('[IDEWorkspaceDetectionService] Starting workspace detection for all IDEs...');
      
      // Verfügbare IDEs abrufen
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      
      if (availableIDEs.length === 0) {
        console.log('[IDEWorkspaceDetectionService] No IDEs available for workspace detection');
        return this.detectionResults;
      }
      
      console.log(`[IDEWorkspaceDetectionService] Found ${availableIDEs.length} IDEs for detection`);
      
      // Für jede IDE Workspace-Info sammeln
      for (const ide of availableIDEs) {
        await this.detectWorkspaceForIDE(ide.port);
      }
      
      console.log('[IDEWorkspaceDetectionService] Workspace detection completed');
      return this.detectionResults;
      
    } catch (error) {
      console.error('[IDEWorkspaceDetectionService] Error during workspace detection:', error);
      throw error;
    }
  }

  /**
   * Workspace für eine spezifische IDE erkennen
   */
  async detectWorkspaceForIDE(port) {
    try {
      console.log(`[IDEWorkspaceDetectionService] Detecting workspace for IDE on port ${port}...`);
      
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
        
        console.log(`[IDEWorkspaceDetectionService] Port ${port}: ${workspaceInfo.workspace}`);
        return workspaceInfo;
        
      } else {
        this.detectionResults.set(port, {
          success: false,
          error: 'No workspace info found'
        });
        
        console.log(`[IDEWorkspaceDetectionService] Port ${port}: No workspace info found`);
        return null;
      }
      
    } catch (error) {
      this.detectionResults.set(port, {
        success: false,
        error: error.message
      });
      
      console.log(`[IDEWorkspaceDetectionService] Port ${port}: ${error.message}`);
      throw error;
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
      console.error(`[IDEWorkspaceDetectionService] Error getting workspace path for port ${port}:`, error);
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
      console.error(`[IDEWorkspaceDetectionService] Error getting files list for port ${port}:`, error);
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
      console.error(`[IDEWorkspaceDetectionService] Error getting git status for port ${port}:`, error);
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
      console.error(`[IDEWorkspaceDetectionService] Error executing terminal command for port ${port}:`, error);
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
    console.log('[IDEWorkspaceDetectionService] Detection results cleared');
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