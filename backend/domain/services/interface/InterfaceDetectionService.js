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

    this.logger.info(`🔍 Finding workspace matches: ${availableIDEs.length} IDEs, ${projects.length} projects`);

    for (const ide of availableIDEs) {
      this.logger.info(`🔍 Processing IDE: ${ide.type || 'unknown'}:${ide.port}`);
      
      // Get workspace info for this IDE
      const workspaceInfo = await this.ideManager.getWorkspaceInfo(ide.port);
      
      if (!workspaceInfo) {
        this.logger.warn(`❌ No workspace info for IDE on port ${ide.port}`);
        continue;
      }

      // Handle different workspace info structures
      const ideWorkspacePath = workspaceInfo.workspacePath || workspaceInfo.workspace;
      
      if (!ideWorkspacePath) {
        this.logger.warn(`❌ No workspace path found in workspace info for IDE on port ${ide.port}:`, workspaceInfo);
        continue;
      }
      this.logger.info(`🔍 IDE ${ide.port} workspace: ${ideWorkspacePath}`);

      // Log all project workspaces for comparison
      this.logger.info(`🔍 Available project workspaces:`);
      projects.forEach(project => {
        this.logger.info(`  - Project ${project.id}: "${project.workspacePath}"`);
      });

      // Find matching project
      const matchingProject = projects.find(project => {
        const match = project.workspacePath === ideWorkspacePath;
        this.logger.info(`🔍 Comparing "${project.workspacePath}" === "${ideWorkspacePath}" = ${match}`);
        return match;
      });

      if (matchingProject) {
        this.logger.info(`✅ Found matching project: ${matchingProject.id}`);
        
        // Check if interface already exists for this IDE-project combination
        const existingInterfaces = await this.getProjectInterfaces(matchingProject.id);
        this.logger.info(`🔍 Existing interfaces for project ${matchingProject.id}: ${existingInterfaces.length}`);
        
        const interfaceExists = existingInterfaces.some(iface => 
          iface.config && iface.config.port === ide.port
        );

        if (!interfaceExists) {
          matches.push({
            ide,
            project: matchingProject,
            workspacePath: ideWorkspacePath
          });
          this.logger.info(`✅ Found match: IDE ${ide.port} ↔ Project ${matchingProject.id} (${ideWorkspacePath})`);
        } else {
          this.logger.info(`⚠️ Interface already exists for IDE ${ide.port} and project ${matchingProject.id}`);
        }
      } else {
        this.logger.warn(`❌ No matching project found for IDE workspace: ${ideWorkspacePath}`);
      }
    }

    this.logger.info(`🔍 Workspace matching completed: ${matches.length} matches found`);
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
    // All IDE types map to the generic 'ide' interface type
    // The InterfaceManager only has 'ide' registered, not specific IDE types
    return 'ide';
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
