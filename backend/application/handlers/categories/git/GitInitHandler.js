/**
 * GitInitHandler
 * Handler for Initialize a Git repository
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitInitHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitInitHandler: Executing gitinitcommand', commandData);

      
      // Build init command
      let initCommand = 'git init';
      if (commandData.bare) {
        initCommand += ' --bare';
      }
      if (commandData.initialBranch) {
        initCommand += ` -b ${commandData.initialBranch}`;
      }

      // Execute git init command
      const result = await execAsync(initCommand, { cwd: commandData.projectPath });

      this.logger.info('GitInitHandler: GitInitCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitInitHandler: GitInitCommand failed', {
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

module.exports = GitInitHandler;
