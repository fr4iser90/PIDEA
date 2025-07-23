/**
 * GitCloneHandler
 * Handler for Clone a Git repository
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitCloneHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitCloneHandler: Executing gitclonecommand', commandData);

      
      // Build clone command
      let cloneCommand = `git clone ${commandData.url} ${commandData.targetPath}`;
      if (commandData.branch) {
        cloneCommand += ` -b ${commandData.branch}`;
      }
      if (commandData.depth) {
        cloneCommand += ` --depth ${commandData.depth}`;
      }
      if (commandData.singleBranch) {
        cloneCommand += ' --single-branch';
      }
      if (commandData.recursive) {
        cloneCommand += ' --recursive';
      }

      // Execute git clone command
      const result = await execAsync(cloneCommand);

      this.logger.info('GitCloneHandler: GitCloneCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitCloneHandler: GitCloneCommand failed', {
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

module.exports = GitCloneHandler;
