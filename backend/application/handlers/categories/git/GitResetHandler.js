/**
 * GitResetHandler
 * Handler for Reset Git repository
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitResetHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitResetHandler: Executing gitresetcommand', commandData);

      
      // Validate mode
      const validModes = ['soft', 'mixed', 'hard'];
      if (!validModes.includes(commandData.mode)) {
        throw new Error(`Invalid reset mode: ${commandData.mode}. Valid modes: ${validModes.join(', ')}`);
      }

      // Build reset command
      const resetCommand = `git reset --${commandData.mode} ${commandData.commit}`;

      // Execute git reset command
      const result = await execAsync(resetCommand, { cwd: commandData.projectPath });

      this.logger.info('GitResetHandler: GitResetCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitResetHandler: GitResetCommand failed', {
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

module.exports = GitResetHandler;
