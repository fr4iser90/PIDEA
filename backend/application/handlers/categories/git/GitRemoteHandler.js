/**
 * GitRemoteHandler
 * Handler for Add Git remote
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitRemoteHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitRemoteHandler: Executing gitremotecommand', commandData);

      
      // Execute git remote add command
      const result = await execAsync(`git remote add ${commandData.name} ${commandData.url}`, { cwd: commandData.projectPath });

      this.logger.info('GitRemoteHandler: GitRemoteCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitRemoteHandler: GitRemoteCommand failed', {
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

module.exports = GitRemoteHandler;
