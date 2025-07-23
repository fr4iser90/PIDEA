/**
 * GitCheckoutHandler
 * Handler for Checkout a Git branch
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitCheckoutHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitCheckoutHandler: Executing gitcheckoutcommand', commandData);

      
      // Check if branch exists
      const branchExistsResult = await execAsync(`git branch --list ${commandData.branchName}`, { cwd: commandData.projectPath });
      const branchExists = branchExistsResult.stdout.trim().includes(commandData.branchName);

      if (!branchExists && !commandData.createIfNotExists) {
        throw new Error(`Branch ${commandData.branchName} does not exist and createIfNotExists is false`);
      }

      // Build checkout command
      let checkoutCommand = `git checkout ${commandData.branchName}`;
      if (!branchExists && commandData.createIfNotExists) {
        checkoutCommand = `git checkout -b ${commandData.branchName}`;
      }

      // Execute git checkout command
      const result = await execAsync(checkoutCommand, { cwd: commandData.projectPath });

      this.logger.info('GitCheckoutHandler: GitCheckoutCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitCheckoutHandler: GitCheckoutCommand failed', {
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

module.exports = GitCheckoutHandler;
