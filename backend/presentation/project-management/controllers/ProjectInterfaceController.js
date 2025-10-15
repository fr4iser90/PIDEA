/**
 * ProjectInterfaceController - Handles project interface management HTTP requests
 *
 * LAYER COMPLIANCE FIXED:
 * ✅ Uses InterfaceManager (Application layer)
 * ✅ No direct repository or domain service access
 * ✅ Proper DDD layer separation maintained
 */
const Logger = require("@logging/Logger");
const logger = new Logger("ProjectInterfaceController");

class ProjectInterfaceController {
  constructor(interfaceManager, projectApplicationService) {
    this.interfaceManager = interfaceManager;
    this.projectApplicationService = projectApplicationService;
    this.logger = logger;

    if (!this.interfaceManager) {
      throw new Error(
        "ProjectInterfaceController requires interfaceManager dependency",
      );
    }
    if (!this.projectApplicationService) {
      throw new Error(
        "ProjectInterfaceController requires projectApplicationService dependency",
      );
    }
  }

  /**
   * Create a new interface for a project
   * POST /api/projects/:projectId/interfaces
   */
  async createInterface(req, res) {
    try {
      const { projectId } = req.params;
      const { name, type, configuration } = req.body;

      // Validate input
      const validation = this.validateInterfaceData({
        name,
        type,
        configuration,
      });
      if (!validation.isValid) {
        return res.badRequest(validation.errors );
      }

      // Verify project exists
      const project =
        await this.projectApplicationService.getProject(projectId);
      if (!project) {
        return res.notFound("Project not found");
      }

      // Create interface within project context
      const interfaceInstance = await this.interfaceManager.createInterface(
        projectId,
        {
          name,
          type,
          configuration,
          projectId,
        },
      );

      this.logger.info("Interface created:", {
        projectId,
        interfaceId: interfaceInstance.id,
        name,
      });
      res.created({ interface: interfaceInstance });
    } catch (error) {
      this.logger.error("Failed to create interface:", error);
      res.internalError("Internal server error");
    }
  }

  /**
   * Get a specific interface
   * GET /api/projects/:projectId/interfaces/:interfaceId
   */
  async getInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const interfaceInstance = await this.interfaceManager.getInterface(
        projectId,
        interfaceId,
      );

      if (!interfaceInstance) {
        return res.notFound("Interface not found");
      }

      res.success({ interface: interfaceInstance });
    } catch (error) {
      this.logger.error("Failed to get interface:", error);
      res.internalError("Internal server error");
    }
  }

  /**
   * Update an interface
   * PUT /api/projects/:projectId/interfaces/:interfaceId
   */
  async updateInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const updates = req.body;

      // Validate updates
      const validation = this.validateInterfaceData(updates, true);
      if (!validation.isValid) {
        return res.badRequest(validation.errors );
      }

      const interfaceInstance = await this.interfaceManager.updateInterface(
        projectId,
        interfaceId,
        updates,
      );

      if (!interfaceInstance) {
        return res.notFound("Interface not found");
      }

      this.logger.info("Interface updated:", {
        projectId,
        interfaceId,
        updates,
      });
      res.success({ interface: interfaceInstance });
    } catch (error) {
      this.logger.error("Failed to update interface:", error);
      res.internalError("Internal server error");
    }
  }

  /**
   * Delete an interface
   * DELETE /api/projects/:projectId/interfaces/:interfaceId
   */
  async deleteInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const deleted = await this.interfaceManager.deleteInterface(
        projectId,
        interfaceId,
      );

      if (!deleted) {
        return res.notFound("Interface not found");
      }

      this.logger.info("Interface deleted:", { projectId, interfaceId });
      res.status(204).send();
    } catch (error) {
      this.logger.error("Failed to delete interface:", error);
      res.internalError("Internal server error");
    }
  }

  /**
   * List all interfaces for a project
   * GET /api/projects/:projectId/interfaces
   */
  async listInterfaces(req, res) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10, type, status } = req.query;

      const result = await this.interfaceManager.listInterfaces(projectId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        status,
      });

      // 2025 Standard: Flat structure, no nested pagination
      res.success({
        ...result.interfaces,
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        projectId,
      });
    } catch (error) {
      this.logger.error("Failed to list interfaces:", error);
      res.internalError("Internal server error");
    }
  }

  /**
   * Start an interface
   * POST /api/projects/:projectId/interfaces/:interfaceId/start
   */
  async startInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const result = await this.interfaceManager.startInterface(
        projectId,
        interfaceId,
      );

      if (!result.success) {
        return res.badRequest(result.error );
      }

      this.logger.info("Interface started:", { projectId, interfaceId });
      res.success({
        message: "Interface started successfully",
        interface: result.interface,
      });
    } catch (error) {
      this.logger.error("Failed to start interface:", error);
      res.internalError("Internal server error");
    }
  }

  /**
   * Stop an interface
   * POST /api/projects/:projectId/interfaces/:interfaceId/stop
   */
  async stopInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const result = await this.interfaceManager.stopInterface(
        projectId,
        interfaceId,
      );

      if (!result.success) {
        return res.badRequest(result.error );
      }

      this.logger.info("Interface stopped:", { projectId, interfaceId });
      res.success({
        message: "Interface stopped successfully",
        interface: result.interface,
      });
    } catch (error) {
      this.logger.error("Failed to stop interface:", error);
      res.internalError("Internal server error");
    }
  }

  /**
   * Restart an interface
   * POST /api/projects/:projectId/interfaces/:interfaceId/restart
   */
  async restartInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const result = await this.interfaceManager.restartInterface(
        projectId,
        interfaceId,
      );

      if (!result.success) {
        return res.badRequest(result.error );
      }

      this.logger.info("Interface restarted:", { projectId, interfaceId });
      res.success({
        message: "Interface restarted successfully",
        interface: result.interface,
      });
    } catch (error) {
      this.logger.error("Failed to restart interface:", error);
      res.internalError("Internal server error");
    }
  }

  /**
   * Get interface status
   * GET /api/projects/:projectId/interfaces/:interfaceId/status
   */
  async getInterfaceStatus(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const status = await this.interfaceManager.getInterfaceStatus(
        projectId,
        interfaceId,
      );

      if (!status) {
        return res.notFound("Interface not found");
      }

      res.success({ status });
    } catch (error) {
      this.logger.error("Failed to get interface status:", error);
      res.internalError("Internal server error");
    }
  }

  /**
   * Get interface logs
   * GET /api/projects/:projectId/interfaces/:interfaceId/logs
   */
  async getInterfaceLogs(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const { lines = 100 } = req.query;

      const logs = await this.interfaceManager.getInterfaceLogs(
        projectId,
        interfaceId,
        {
          lines: parseInt(lines),
        },
      );

      if (!logs) {
        return res.notFound("Interface not found");
      }

      res.success({ logs });
    } catch (error) {
      this.logger.error("Failed to get interface logs:", error);
      res.internalError("Internal server error");
    }
  }

  /**
   * Get available IDE types (general - without projectId)
   * GET /api/interfaces/available-ides
   */
  async getAvailableIDEsGeneral(req, res) {
    try {
      this.logger.info("Getting available IDEs (general detection)");

      // Get available IDEs from IDE handler
      const availableIDEs = await this.interfaceManager.getAvailableIDEs();

      res.success(availableIDEs);
    } catch (error) {
      this.logger.error("Failed to get available IDEs:", error);
      res.internalError("Failed to get available IDEs", { message: error.message });
    }
  }

  /**
   * Get available IDE types (project-specific)
   * GET /api/projects/:projectId/interfaces/available-ides
   */
  async getAvailableIDEs(req, res) {
    try {
      const { projectId } = req.params;

      this.logger.info(`Getting available IDEs for project: ${projectId}`);

      // Get available IDEs from IDE handler
      const availableIDEs = await this.interfaceManager.getAvailableIDEs();

      res.success({ availableIDEs });
    } catch (error) {
      this.logger.error("Failed to get available IDEs:", error);
      res.internalError("Failed to get available IDEs", { message: error.message });
    }
  }

  /**
   * Get IDE features
   * GET /api/projects/:projectId/interfaces/:interfaceId/features
   */
  async getIDEFeatures(req, res) {
    try {
      const { projectId, interfaceId } = req.params;

      this.logger.info(
        `Getting IDE features for interface: ${interfaceId} in project: ${projectId}`,
      );

      // Get interface
      const interfaceInstance = await this.interfaceManager.getInterface(
        projectId,
        interfaceId,
      );

      if (!interfaceInstance) {
        return res.notFound("Interface not found", { message: `Interface ${interfaceId} not found` });
      }

      // Get IDE features
      const features = await this.interfaceManager.getIDEFeatures(interfaceId);

      res.success({ interfaceId, features });
    } catch (error) {
      this.logger.error("Failed to get IDE features:", error);
      res.internalError("Failed to get IDE features", { message: error.message });
    }
  }

  /**
   * Get IDE version
   * GET /api/projects/:projectId/interfaces/:interfaceId/version
   */
  async getIDEVersion(req, res) {
    try {
      const { projectId, interfaceId } = req.params;

      this.logger.info(
        `Getting IDE version for interface: ${interfaceId} in project: ${projectId}`,
      );

      // Get interface
      const interfaceInstance = await this.interfaceManager.getInterface(
        projectId,
        interfaceId,
      );

      if (!interfaceInstance) {
        return res.notFound("Interface not found", { message: `Interface ${interfaceId} not found` });
      }

      // Get IDE version
      const version = await this.interfaceManager.getIDEVersion(interfaceId);

      res.success({ interfaceId, version });
    } catch (error) {
      this.logger.error("Failed to get IDE version:", error);
      res.internalError("Failed to get IDE version", { message: error.message });
    }
  }

  /**
   * Get workspace info
   * GET /api/projects/:projectId/interfaces/:interfaceId/workspace-info
   */
  async getWorkspaceInfo(req, res) {
    try {
      const { projectId, interfaceId } = req.params;

      this.logger.info(
        `Getting workspace info for interface: ${interfaceId} in project: ${projectId}`,
      );

      // Get interface
      const interfaceInstance = await this.interfaceManager.getInterface(
        projectId,
        interfaceId,
      );

      if (!interfaceInstance) {
        return res.notFound("Interface not found", { message: `Interface ${interfaceId} not found` });
      }

      // Get workspace info
      const workspaceInfo =
        await this.interfaceManager.getWorkspaceInfo(interfaceId);

      res.success({ interfaceId, workspaceInfo });
    } catch (error) {
      this.logger.error("Failed to get workspace info:", error);
      res.internalError("Failed to get workspace info", { message: error.message });
    }
  }

  /**
   * Set workspace path
   * POST /api/projects/:projectId/interfaces/:interfaceId/set-workspace
   */
  async setWorkspacePath(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const { workspacePath } = req.body;

      this.logger.info(
        `Setting workspace path for interface: ${interfaceId} in project: ${projectId}`,
      );

      // Get interface
      const interfaceInstance = await this.interfaceManager.getInterface(
        projectId,
        interfaceId,
      );

      if (!interfaceInstance) {
        return res.notFound("Interface not found", { message: `Interface ${interfaceId} not found` });
      }

      // Set workspace path
      const result = await this.interfaceManager.setWorkspacePath(
        interfaceId,
        workspacePath,
      );

      res.success({ interfaceId, result });
    } catch (error) {
      this.logger.error("Failed to set workspace path:", error);
      res.internalError("Failed to set workspace path", { message: error.message });
    }
  }

  /**
   * Detect workspace paths
   * POST /api/projects/:projectId/interfaces/:interfaceId/detect-workspace-paths
   */
  async detectWorkspacePaths(req, res) {
    try {
      const { projectId, interfaceId } = req.params;

      this.logger.info(
        `Detecting workspace paths for interface: ${interfaceId} in project: ${projectId}`,
      );

      // Get interface
      const interfaceInstance = await this.interfaceManager.getInterface(
        projectId,
        interfaceId,
      );

      if (!interfaceInstance) {
        return res.notFound("Interface not found", { message: `Interface ${interfaceId} not found` });
      }

      // Detect workspace paths
      const workspacePaths =
        await this.interfaceManager.detectWorkspacePaths(interfaceId);

      res.success({ interfaceId, workspacePaths });
    } catch (error) {
      this.logger.error("Failed to detect workspace paths:", error);
      res.internalError("Failed to detect workspace paths", { message: error.message });
    }
  }

  /**
   * Monitor terminal
   * POST /api/projects/:projectId/interfaces/:interfaceId/monitor-terminal
   */
  async monitorTerminal(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const options = req.body;

      this.logger.info(
        `Monitoring terminal for interface: ${interfaceId} in project: ${projectId}`,
      );

      // Get interface
      const interfaceInstance = await this.interfaceManager.getInterface(
        projectId,
        interfaceId,
      );

      if (!interfaceInstance) {
        return res.notFound("Interface not found", { message: `Interface ${interfaceId} not found` });
      }

      // Monitor terminal
      const result = await this.interfaceManager.monitorTerminal(
        interfaceId,
        options,
      );

      res.success({ interfaceId, result });
    } catch (error) {
      this.logger.error("Failed to monitor terminal:", error);
      res.internalError("Failed to monitor terminal", { message: error.message });
    }
  }

  /**
   * Validate interface data
   * @param {Object} data - Interface data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateInterfaceData(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.name !== undefined) {
      if (
        !data.name ||
        typeof data.name !== "string" ||
        data.name.trim().length === 0
      ) {
        errors.push(
          "Interface name is required and must be a non-empty string",
        );
      }
    }

    if (!isUpdate || data.type !== undefined) {
      if (!data.type || typeof data.type !== "string") {
        errors.push("Interface type is required and must be a string");
      }

      const validTypes = [
        "cursor",
        "vscode",
        "windsurf",
        "jetbrains",
        "sublime",
      ];
      if (data.type && !validTypes.includes(data.type.toLowerCase())) {
        errors.push(`Interface type must be one of: ${validTypes.join(", ")}`);
      }
    }

    if (
      data.configuration !== undefined &&
      typeof data.configuration !== "object"
    ) {
      errors.push("Configuration must be an object");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = ProjectInterfaceController;
