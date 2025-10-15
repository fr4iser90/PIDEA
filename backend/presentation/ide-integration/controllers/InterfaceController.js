/**
 * InterfaceController - API controller for interface management
 *
 * This controller provides REST API endpoints for interface management,
 * including creation, retrieval, lifecycle management, and project integration.
 */
const Logger = require("@logging/Logger");
const ServiceLogger = require("@logging/ServiceLogger");

class InterfaceController {
  /**
   * Constructor for InterfaceController
   * @param {Object} dependencies - Dependency injection container
   */
  constructor(dependencies = {}) {
    this.projectApplicationService = dependencies.projectApplicationService;
    this.interfaceManager = dependencies.interfaceManager;
    this.interfaceFactory = dependencies.interfaceFactory;
    this.interfaceRegistry = dependencies.interfaceRegistry;
    this.logger =
      dependencies.logger || new ServiceLogger("InterfaceController");
  }

  /**
   * Get all interfaces
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllInterfaces(req, res) {
    try {
      this.logger.info("Getting all interfaces");

      if (!this.interfaceManager) {
        return res.error("Interface manager not available", 503);
      }

      const interfaces = this.interfaceManager.getAllInterfaces();
      const interfaceData = interfaces.map((interfaceInstance) => ({
        id: interfaceInstance.id,
        type: interfaceInstance.type,
        status: interfaceInstance.status,
        config: interfaceInstance.config,
        metadata: interfaceInstance.getMetadata(),
      }));

      res.success(interfaceData);
    } catch (error) {
      this.logger.error("Failed to get all interfaces:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Get interface by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getInterface(req, res) {
    try {
      const { interfaceId } = req.params;
      this.logger.info(`Getting interface: ${interfaceId}`);

      if (!this.interfaceManager) {
        return res.error("Interface manager not available", 503);
      }

      const interfaceInstance = this.interfaceManager.getInterface(interfaceId);
      if (!interfaceInstance) {
        return res.notFound("Interface not found: ${interfaceId}");
      }

      res.success({
        id: interfaceInstance.id,
        type: interfaceInstance.type,
        status: interfaceInstance.status,
        config: interfaceInstance.config,
        metadata: interfaceInstance.getMetadata(),
      });
    } catch (error) {
      this.logger.error("Failed to get interface:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Create interface
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createInterface(req, res) {
    try {
      const { interfaceType, config = {}, interfaceId } = req.body;
      this.logger.info(`Creating interface: ${interfaceType}`);

      if (!this.interfaceManager) {
        return res.error("Interface manager not available", 503);
      }

      if (!interfaceType) {
        return res.badRequest("interfaceType is required");
      }

      let interfaceInstance;
      if (this.interfaceFactory) {
        interfaceInstance = await this.interfaceFactory.createInterfaceByType(
          interfaceType,
          config,
          interfaceId,
        );
      } else {
        interfaceInstance = await this.interfaceManager.createInterface(
          interfaceType,
          config,
          interfaceId,
        );
      }

      res.created({
        id: interfaceInstance.id,
        type: interfaceInstance.type,
        status: interfaceInstance.status,
        config: interfaceInstance.config,
        metadata: interfaceInstance.getMetadata(),
      });
    } catch (error) {
      this.logger.error("Failed to create interface:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Remove interface
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async removeInterface(req, res) {
    try {
      const { interfaceId } = req.params;
      this.logger.info(`Removing interface: ${interfaceId}`);

      if (!this.interfaceManager) {
        return res.error("Interface manager not available", 503);
      }

      const removed = await this.interfaceManager.removeInterface(interfaceId);
      if (!removed) {
        return res.notFound("Interface not found: ${interfaceId}");
      }

      res.success({ removed: true });
    } catch (error) {
      this.logger.error("Failed to remove interface:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Start interface
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async startInterface(req, res) {
    try {
      const { interfaceId } = req.params;
      this.logger.info(`Starting interface: ${interfaceId}`);

      if (!this.interfaceManager) {
        return res.error("Interface manager not available", 503);
      }

      const started = await this.interfaceManager.startInterface(interfaceId);

      res.success({ started });
    } catch (error) {
      this.logger.error("Failed to start interface:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Stop interface
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async stopInterface(req, res) {
    try {
      const { interfaceId } = req.params;
      this.logger.info(`Stopping interface: ${interfaceId}`);

      if (!this.interfaceManager) {
        return res.error("Interface manager not available", 503);
      }

      const stopped = await this.interfaceManager.stopInterface(interfaceId);

      res.success({ stopped });
    } catch (error) {
      this.logger.error("Failed to stop interface:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Restart interface
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async restartInterface(req, res) {
    try {
      const { interfaceId } = req.params;
      this.logger.info(`Restarting interface: ${interfaceId}`);

      if (!this.interfaceManager) {
        return res.error("Interface manager not available", 503);
      }

      const restarted =
        await this.interfaceManager.restartInterface(interfaceId);

      res.success({ restarted });
    } catch (error) {
      this.logger.error("Failed to restart interface:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Get available interface types
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAvailableTypes(req, res) {
    try {
      this.logger.info("Getting available interface types");

      if (!this.interfaceManager) {
        return res.error("Interface manager not available", 503);
      }

      const types = this.interfaceManager.getAvailableTypes();

      res.success(types, 200, {
        meta: {
          total: types.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error("Failed to get available types:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Get interface statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getStats(req, res) {
    try {
      this.logger.info("Getting interface statistics");

      if (!this.interfaceManager) {
        return res.error("Interface manager not available", 503);
      }

      const stats = this.interfaceManager.getStats();
      const statusSummary = this.interfaceManager.getStatusSummary();

      res.success({
        stats,
        statusSummary,
      });
    } catch (error) {
      this.logger.error("Failed to get interface statistics:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Get project interfaces
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getProjectInterfaces(req, res) {
    try {
      const { projectId } = req.params;
      this.logger.info(`Getting interfaces for project: ${projectId}`);

      if (!this.projectApplicationService) {
        return res.error("Project application service not available", 503);
      }

      const interfaces =
        await this.projectApplicationService.getProjectInterfaces(projectId);

      res.success(interfaces, 200, {
        meta: {
          projectId,
          total: interfaces.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error("Failed to get project interfaces:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Create project interface
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createProjectInterface(req, res) {
    try {
      const { projectId } = req.params;
      const { interfaceType, config = {} } = req.body;
      this.logger.info(
        `Creating interface for project: ${projectId}, type: ${interfaceType}`,
      );

      if (!this.projectApplicationService) {
        return res.error("Project application service not available", 503);
      }

      if (!interfaceType) {
        return res.badRequest("interfaceType is required");
      }

      const interfaceData =
        await this.projectApplicationService.createProjectInterface(
          projectId,
          interfaceType,
          config,
        );

      res.created(interfaceData);
    } catch (error) {
      this.logger.error("Failed to create project interface:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Remove project interface
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async removeProjectInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      this.logger.info(
        `Removing interface ${interfaceId} from project: ${projectId}`,
      );

      if (!this.projectApplicationService) {
        return res.error("Project application service not available", 503);
      }

      const removed =
        await this.projectApplicationService.removeProjectInterface(
          projectId,
          interfaceId,
        );

      res.success({ removed });
    } catch (error) {
      this.logger.error("Failed to remove project interface:", error);
      res.error(error.message, 500);
    }
  }

  /**
   * Get available interface types for project
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAvailableTypesForProject(req, res) {
    try {
      const { projectId } = req.params;
      this.logger.info(
        `Getting available interface types for project: ${projectId}`,
      );

      if (!this.projectApplicationService) {
        return res.error("Project application service not available", 503);
      }

      const types =
        await this.projectApplicationService.getAvailableInterfaceTypes(
          projectId,
        );

      res.success(types, 200, {
        meta: {
          projectId,
          total: types.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error("Failed to get available types for project:", error);
      res.error(error.message, 500);
    }
  }
}

module.exports = InterfaceController;
