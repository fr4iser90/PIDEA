/**
 * GitLogHandler
 * Handler for Get Git commit history
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitLogHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitLogHandler: Executing gitlogcommand', commandData);

      
      // Build log command
      let logCommand = `git log --${commandData.format}`;
      if (commandData.limit) {
        logCommand += ` -${commandData.limit}`;
      }
      if (commandData.since) {
        logCommand += ` --since="${commandData.since}"`;
      }
      if (commandData.until) {
        logCommand += ` --until="${commandData.until}"`;
      }
      if (commandData.author) {
        logCommand += ` --author="${commandData.author}"`;
      }

      // Execute git log command
      const result = await execAsync(logCommand, { cwd: commandData.projectPath });

      this.logger.info('GitLogHandler: GitLogCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitLogHandler: GitLogCommand failed', {
        error: error.message,
        command: command.getCommandData()
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = GitLogHandler;
