/**
 * GitPullHandler
 * Handler for Pull changes from remote repository
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitPullHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitPullHandler: Executing gitpullcommand', commandData);

      
      // Build pull command
      let pullCommand = 'git pull';
      if (commandData.rebase) {
        pullCommand += ' --rebase';
      }
      pullCommand += ` ${commandData.remote}`;
      if (commandData.branch) {
        pullCommand += ` ${commandData.branch}`;
      }

      // Execute git pull command
      const result = await execAsync(pullCommand, { cwd: commandData.projectPath });

      this.logger.info('GitPullHandler: GitPullCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitPullHandler: GitPullCommand failed', {
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

module.exports = GitPullHandler;
