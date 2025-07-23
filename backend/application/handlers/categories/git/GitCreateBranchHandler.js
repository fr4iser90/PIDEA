/**
 * GitCreateBranchHandler
 * Handler for Create a new Git branch
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitCreateBranchHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitCreateBranchHandler: Executing gitcreatebranchcommand', commandData);

      
      // Check if branch already exists
      const branchExistsResult = await execAsync(`git branch --list ${commandData.branchName}`, { cwd: commandData.projectPath });
      if (branchExistsResult.stdout.trim()) {
        if (commandData.checkout) {
          await execAsync(`git checkout ${commandData.branchName}`, { cwd: commandData.projectPath });
        }
        return {
          success: true,
          result: 'Branch already exists',
          timestamp: new Date()
        };
      }

      // Switch to base branch if specified
      if (commandData.fromBranch) {
        await execAsync(`git checkout ${commandData.fromBranch}`, { cwd: commandData.projectPath });
      }

      // Create new branch
      let createCommand = `git branch ${commandData.branchName}`;
      if (commandData.checkout) {
        createCommand = `git checkout -b ${commandData.branchName}`;
      }

      const result = await execAsync(createCommand, { cwd: commandData.projectPath });

      this.logger.info('GitCreateBranchHandler: GitCreateBranchCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitCreateBranchHandler: GitCreateBranchCommand failed', {
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

module.exports = GitCreateBranchHandler;
