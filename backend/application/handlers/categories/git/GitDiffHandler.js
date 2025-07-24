/**
 * GitDiffHandler
 * Handler for Get Git diff
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitDiffHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitDiffHandler: Executing gitdiffcommand', commandData);

      
      // Build diff command
      let diffCommand = 'git diff';
      if (commandData.staged) {
        diffCommand += ' --staged';
      }
      if (commandData.commit1 && commandData.commit2) {
        diffCommand += ` ${commandData.commit1}..${commandData.commit2}`;
      } else if (commandData.commit1) {
        diffCommand += ` ${commandData.commit1}`;
      }
      if (commandData.file) {
        diffCommand += ` -- ${commandData.file}`;
      }

      // Execute git diff command
      const result = await execAsync(diffCommand, { cwd: commandData.projectPath });

      this.logger.info('GitDiffHandler: GitDiffCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitDiffHandler: GitDiffCommand failed', {
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

module.exports = GitDiffHandler;
