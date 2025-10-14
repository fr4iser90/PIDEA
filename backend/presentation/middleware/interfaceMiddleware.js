/**
 * Interface Middleware - Interface validation and context middleware
 *
 * This module provides middleware for interface validation, context injection,
 * and error handling for interface-centric API endpoints within project context.
 */
const Logger = require("@logging/Logger");
const logger = new Logger("InterfaceMiddleware");

class InterfaceMiddleware {
  constructor(interfaceManager, projectApplicationService) {
    this.interfaceManager = interfaceManager;
    this.projectApplicationService = projectApplicationService;
    this.logger = logger;

    if (!this.interfaceManager) {
      throw new Error(
        "InterfaceMiddleware requires interfaceManager dependency",
      );
    }
    if (!this.projectApplicationService) {
      throw new Error(
        "InterfaceMiddleware requires projectApplicationService dependency",
      );
    }
  }

  /**
   * Validate interface ID and inject interface context
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  validateInterfaceId = async (req, res, next) => {
    try {
      const { projectId, interfaceId } = req.params;

      if (!interfaceId || typeof interfaceId !== "string") {
        return res.badRequest("Invalid interface ID");
      }

      // Check if project exists
      const project =
        await this.projectApplicationService.getProject(projectId);
      if (!project) {
        return res.notFound("Project not found");
      }

      // Check if interface exists within project context
      const interfaceInstance = await this.interfaceManager.getInterface(
        projectId,
        interfaceId,
      );
      if (!interfaceInstance) {
        return res.notFound("Interface not found");
      }

      // Add interface and project to request for downstream middleware
      req.interface = interfaceInstance;
      req.project = project;
      req.projectId = projectId;
      req.interfaceId = interfaceId;
      next();
    } catch (error) {
      this.logger.error("Interface validation error:", error);
      res.internalError("Internal server error");
    }
  };

  /**
   * Validate interface creation data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  validateCreate = (req, res, next) => {
    const { name, type, configuration } = req.body;
    const errors = [];

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.push("Interface name is required");
    }

    if (!type || typeof type !== "string") {
      errors.push("Interface type is required");
    }

    const validTypes = ["cursor", "vscode", "windsurf", "jetbrains", "sublime"];
    if (type && !validTypes.includes(type.toLowerCase())) {
      errors.push(`Interface type must be one of: ${validTypes.join(", ")}`);
    }

    if (configuration && typeof configuration !== "object") {
      errors.push("Configuration must be an object");
    }

    if (errors.length > 0) {
      return res.badRequest(errors );
    }

    next();
  };

  /**
   * Validate interface update data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  validateUpdate = (req, res, next) => {
    const updates = req.body;
    const errors = [];

    if (
      updates.name !== undefined &&
      (!updates.name || typeof updates.name !== "string")
    ) {
      errors.push("Interface name must be a non-empty string");
    }

    if (updates.type !== undefined) {
      if (typeof updates.type !== "string") {
        errors.push("Interface type must be a string");
      }

      const validTypes = [
        "cursor",
        "vscode",
        "windsurf",
        "jetbrains",
        "sublime",
      ];
      if (updates.type && !validTypes.includes(updates.type.toLowerCase())) {
        errors.push(`Interface type must be one of: ${validTypes.join(", ")}`);
      }
    }

    if (
      updates.configuration !== undefined &&
      typeof updates.configuration !== "object"
    ) {
      errors.push("Configuration must be an object");
    }

    if (errors.length > 0) {
      return res.badRequest(errors );
    }

    next();
  };

  /**
   * Validate interface query parameters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  validateQuery = (req, res, next) => {
    const { page, limit, type, status } = req.query;
    const errors = [];

    if (page !== undefined) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push("Page must be a positive integer");
      }
    }

    if (limit !== undefined) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push("Limit must be between 1 and 100");
      }
    }

    if (type !== undefined) {
      const validTypes = [
        "cursor",
        "vscode",
        "windsurf",
        "jetbrains",
        "sublime",
      ];
      if (!validTypes.includes(type.toLowerCase())) {
        errors.push(`Type filter must be one of: ${validTypes.join(", ")}`);
      }
    }

    if (status !== undefined) {
      const validStatuses = [
        "running",
        "stopped",
        "error",
        "starting",
        "stopping",
      ];
      if (!validStatuses.includes(status.toLowerCase())) {
        errors.push(
          `Status filter must be one of: ${validStatuses.join(", ")}`,
        );
      }
    }

    if (errors.length > 0) {
      return res.badRequest(errors );
    }

    next();
  };

  /**
   * Inject interface context for sub-resources
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  injectInterfaceContext = (req, res, next) => {
    const { projectId, interfaceId } = req.params;

    if (projectId) {
      req.projectId = projectId;
    }

    if (interfaceId) {
      req.interfaceId = interfaceId;
    }

    next();
  };
}

module.exports = InterfaceMiddleware;
