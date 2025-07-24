/**
 * GitMergeHandler
 * Handler for Merge a Git branch
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitMergeHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitMergeHandler: Executing gitmergecommand', commandData);

      
      // Build merge command
      let mergeCommand = 'git merge';
      if (commandData.noFF) {
        mergeCommand += ' --no-ff';
      }
      mergeCommand += ` ${commandData.branchName}`;

      // Execute git merge command
      const result = await execAsync(mergeCommand, { cwd: commandData.projectPath });

      this.logger.info('GitMergeHandler: GitMergeCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitMergeHandler: GitMergeCommand failed', {
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

module.exports = GitMergeHandler;
