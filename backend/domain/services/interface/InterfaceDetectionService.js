/**
 * InterfaceDetectionService - Automatic Interface Detection and Creation
 *
 * This service automatically detects when IDE workspaces match project workspaces
 * and creates interfaces to link them together.
 */

const Logger = require("@logging/Logger");
const ServiceLogger = require("@logging/ServiceLogger");

class InterfaceDetectionService {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new ServiceLogger("InterfaceDetectionService");
    this.interfaceManager = dependencies.interfaceManager;
    this.projectApplicationService = dependencies.projectApplicationService;
    this.ideManager = dependencies.ideManager;
    this.eventBus = dependencies.eventBus;

    // Detection state
    this.detectionEnabled = true;
    this.lastDetection = null;
    this.detectionInterval = 30000; // 30 seconds
    this.detectionTimer = null;

    this.logger.info("InterfaceDetectionService initialized");
  }

  /**
   * Start automatic interface detection
   */
  async startDetection() {
    if (!this.detectionEnabled) {
      this.logger.warn("Interface detection is disabled");
      return;
    }

    this.logger.info("Starting automatic interface detection");
    
    // Run initial detection
    await this.performDetection();

    // Set up periodic detection
    this.detectionTimer = setInterval(async () => {
      try {
        await this.performDetection();
      } catch (error) {
        this.logger.error("Error during periodic interface detection:", error);
      }
    }, this.detectionInterval);

    this.logger.info(`Interface detection started with ${this.detectionInterval}ms interval`);
  }

  /**
   * Stop automatic interface detection
   */
  stopDetection() {
    if (this.detectionTimer) {
      clearInterval(this.detectionTimer);
      this.detectionTimer = null;
      this.logger.info("Interface detection stopped");
    }
  }

  /**
   * Perform interface detection
   */
  async performDetection() {
    try {
      this.logger.info("Performing interface detection...");

      // Get all available IDEs
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      this.logger.info(`Found ${availableIDEs.length} available IDEs`);

      // Get all projects
      const projects = await this.projectApplicationService.getAllProjects();
      this.logger.info(`Found ${projects.length} projects`);

      // Find matches between IDE workspaces and project workspaces
      const matches = await this.findWorkspaceMatches(availableIDEs, projects);
      this.logger.info(`Found ${matches.length} workspace matches`);

      // Create interfaces for matches
      for (const match of matches) {
        await this.createInterfaceForMatch(match);
      }

      this.lastDetection = new Date();
      this.logger.info("Interface detection completed successfully");

    } catch (error) {
      this.logger.error("Error during interface detection:", error);
      throw error;
    }
  }

  /**
   * Find matches between IDE workspaces and project workspaces
   */
  async findWorkspaceMatches(availableIDEs, projects) {
    const matches = [];

    for (const ide of availableIDEs) {
      // Get workspace info for this IDE
      const workspaceInfo = await this.ideManager.getWorkspaceInfo(ide.port);
      
      if (!workspaceInfo || !workspaceInfo.workspace) {
        this.logger.debug(`No workspace info for IDE on port ${ide.port}`);
        continue;
      }

      const ideWorkspacePath = workspaceInfo.workspace;
      this.logger.debug(`IDE ${ide.port} workspace: ${ideWorkspacePath}`);

      // Find matching project
      const matchingProject = projects.find(project => 
        project.workspacePath === ideWorkspacePath
      );

      if (matchingProject) {
        // Check if interface already exists for this IDE-project combination
        const existingInterfaces = await this.getProjectInterfaces(matchingProject.id);
        const interfaceExists = existingInterfaces.some(iface => 
          iface.config && iface.config.port === ide.port
        );

        if (!interfaceExists) {
          matches.push({
            ide,
            project: matchingProject,
            workspacePath: ideWorkspacePath
          });
          this.logger.info(`Found match: IDE ${ide.port} ↔ Project ${matchingProject.id} (${ideWorkspacePath})`);
        } else {
          this.logger.debug(`Interface already exists for IDE ${ide.port} and project ${matchingProject.id}`);
        }
      } else {
        this.logger.debug(`No matching project found for IDE workspace: ${ideWorkspacePath}`);
      }
    }

    return matches;
  }

  /**
   * Create interface for a workspace match
   */
  async createInterfaceForMatch(match) {
    try {
      const { ide, project, workspacePath } = match;

      this.logger.info(`Creating interface for IDE ${ide.port} and project ${project.id}`);

      // Determine interface type based on IDE type
      const interfaceType = this.mapIDETypeToInterfaceType(ide.type || ide.ideType);

      // Create interface configuration
      const interfaceConfig = {
        port: ide.port,
        workspacePath: workspacePath,
        ideType: ide.type || ide.ideType,
        name: `${ide.type || ide.ideType} Interface (Port ${ide.port})`,
        version: ide.version || "unknown",
        url: ide.url,
        webSocketUrl: ide.webSocketUrl,
        projectId: project.id
      };

      // Create interface using ProjectApplicationService
      const interfaceInstance = await this.projectApplicationService.createProjectInterface(
        project.id,
        interfaceType,
        interfaceConfig
      );

      this.logger.info(`✅ Interface created: ${interfaceInstance.id} for project ${project.id}`);

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit('interface.auto-created', {
          interfaceId: interfaceInstance.id,
          projectId: project.id,
          idePort: ide.port,
          workspacePath: workspacePath
        });
      }

      return interfaceInstance;

    } catch (error) {
      this.logger.error(`Failed to create interface for match:`, error);
      throw error;
    }
  }

  /**
   * Map IDE type to interface type
   */
  mapIDETypeToInterfaceType(ideType) {
    // Use the IDE type directly as interface type
    // The system expects specific IDE types: cursor, vscode, windsurf, jetbrains, sublime
    const validTypes = ['cursor', 'vscode', 'windsurf', 'jetbrains', 'sublime'];
    
    if (validTypes.includes(ideType)) {
      return ideType;
    }
    
    // Default to cursor if unknown type
    return 'cursor';
  }

  /**
   * Get project interfaces
   */
  async getProjectInterfaces(projectId) {
    try {
      return await this.projectApplicationService.getProjectInterfaces(projectId);
    } catch (error) {
      this.logger.error(`Failed to get project interfaces for ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Get detection status
   */
  getDetectionStatus() {
    return {
      enabled: this.detectionEnabled,
      lastDetection: this.lastDetection,
      interval: this.detectionInterval,
      isRunning: this.detectionTimer !== null
    };
  }

  /**
   * Enable/disable detection
   */
  setDetectionEnabled(enabled) {
    this.detectionEnabled = enabled;
    this.logger.info(`Interface detection ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      this.startDetection();
    } else {
      this.stopDetection();
    }
  }

  /**
   * Set detection interval
   */
  setDetectionInterval(interval) {
    this.detectionInterval = interval;
    this.logger.info(`Detection interval set to ${interval}ms`);
    
    if (this.detectionTimer) {
      this.stopDetection();
      this.startDetection();
    }
  }

  /**
   * Destroy the service
   */
  async destroy() {
    this.stopDetection();
    this.logger.info("InterfaceDetectionService destroyed");
  }
}

module.exports = InterfaceDetectionService;
