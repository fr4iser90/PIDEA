/**
 * Project Middleware - Project validation and context middleware
 *
 * This module provides middleware for project validation, context injection,
 * and error handling for project-centric API endpoints.
 */
const Logger = require("@logging/Logger");
const logger = new Logger("ProjectMiddleware");

class ProjectMiddleware {
  constructor(projectApplicationService) {
    this.projectApplicationService = projectApplicationService;
    this.logger = logger;

    if (!this.projectApplicationService) {
      throw new Error(
        "ProjectMiddleware requires projectApplicationService dependency",
      );
    }
  }

  /**
   * Validate project ID and inject project context
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  validateProjectId = async (req, res, next) => {
    try {
      const { projectId } = req.params;

      if (!projectId || typeof projectId !== "string") {
        return res.badRequest("Invalid project ID");
      }

      // Check if project exists
      const project =
        await this.projectApplicationService.getProject(projectId);
      if (!project) {
        return res.notFound("Project not found");
      }

      // Add project to request for downstream middleware
      req.project = project;
      req.projectId = projectId;
      next();
    } catch (error) {
      this.logger.error("Project validation error:", error);
      res.internalError("Internal server error");
    }
  };

  /**
   * Validate project creation data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  validateCreate = (req, res, next) => {
    const { name, workspacePath, description } = req.body;
    const errors = [];

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.push("Project name is required");
    }

    if (!workspacePath || typeof workspacePath !== "string") {
      errors.push("Workspace path is required");
    }

    if (description && typeof description !== "string") {
      errors.push("Description must be a string");
    }

    if (errors.length > 0) {
      return res.badRequest(errors );
    }

    next();
  };

  /**
   * Validate project update data
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
      errors.push("Project name must be a non-empty string");
    }

    if (
      updates.workspacePath !== undefined &&
      typeof updates.workspacePath !== "string"
    ) {
      errors.push("Workspace path must be a string");
    }

    if (
      updates.description !== undefined &&
      typeof updates.description !== "string"
    ) {
      errors.push("Description must be a string");
    }

    if (errors.length > 0) {
      return res.badRequest(errors );
    }

    next();
  };

  /**
   * Validate project query parameters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  validateQuery = (req, res, next) => {
    const { page, limit, search } = req.query;
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

    if (search !== undefined && typeof search !== "string") {
      errors.push("Search must be a string");
    }

    if (errors.length > 0) {
      return res.badRequest(errors );
    }

    next();
  };

  /**
   * Inject project context for sub-resources
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  injectProjectContext = (req, res, next) => {
    const { projectId } = req.params;

    if (projectId) {
      req.projectId = projectId;
    }

    next();
  };
}

module.exports = ProjectMiddleware;
