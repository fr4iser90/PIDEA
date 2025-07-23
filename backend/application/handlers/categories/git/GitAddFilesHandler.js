/**
 * Git Add Files Handler
 * Handler for adding files to Git staging area
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitAddFilesHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const { projectPath, files } = command.getCommandData();

      this.logger.info('GitAddFilesHandler: Executing git add', {
        projectPath,
        files
      });

      // Execute git add command
      const addCommand = `git add ${files}`;
      const result = await execAsync(addCommand, { cwd: projectPath });

      this.logger.info('GitAddFilesHandler: Git add completed successfully', {
        files,
        result: result.stdout
      });

      return {
        success: true,
        files,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitAddFilesHandler: Git add failed', {
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

module.exports = GitAddFilesHandler; 