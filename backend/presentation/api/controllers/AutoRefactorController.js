/**
 * AutoRefactorController - REST API endpoints for auto refactor operations
 */
const { validationResult } = require("express-validator");

class AutoRefactorController {
  constructor(dependencies = {}) {
    this.commandBus = dependencies.commandBus;
    this.logger = dependencies.logger || console;
  }

  /**
   * Execute auto refactor - Generate refactoring tasks
   * POST /api/projects/:projectId/auto-refactor/execute
   */
  async executeAutoRefactor(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.badRequest(errors.array());
      }

      const { projectId } = req.params;
      const { projectPath } = req.body;
      const userId = req.user?.id;

      this.logger.info("AutoRefactorController: Executing auto refactor", {
        projectId,
        projectPath,
        userId,
      });

      if (!projectPath) {
        return res.badRequest("Project path is required");
      }

      // Create and execute command
      const AutoRefactorCommand = require("@commands/categories/management/AutoRefactorCommand");
      const Logger = require("@logging/Logger");
      const logger = new Logger("Logger");
      const command = new AutoRefactorCommand({
        projectPath,
        requestedBy: userId,
        metadata: { projectId },
      });

      const result = await this.commandBus.execute(
        "AutoRefactorCommand",
        command,
      );

      this.logger.info("AutoRefactorController: Auto refactor completed", {
        taskCount: result.tasks?.length || 0,
      });

      res.success({
        message: result.message || "Auto refactor completed successfully",
        data: {
          tasks: result.tasks || [],
          projectPath,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error("AutoRefactorController: Auto refactor failed", {
        error: error.message,
        stack: error.stack,
      });

      res.error("Failed to execute auto refactor", 500, {
        details: error.message,
      });
    }
  }
}

module.exports = AutoRefactorController;
