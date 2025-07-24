/**
 * Git Commit Handler
 * Handler for committing changes to Git repository
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitCommitHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const { projectPath, message, files, author, email } = command.getCommandData();

      this.logger.info('GitCommitHandler: Executing git commit', {
        projectPath,
        message,
        files
      });

      // Add files to staging first
      const addCommand = `git add ${files}`;
      await execAsync(addCommand, { cwd: projectPath });

      // Build commit command
      let commitCommand = `git commit -m "${message}"`;
      if (author && email) {
        commitCommand = `git commit -m "${message}" --author="${author} <${email}>"`;
      }

      // Execute git commit command
      const result = await execAsync(commitCommand, { cwd: projectPath });

      this.logger.info('GitCommitHandler: Git commit completed successfully', {
        message,
        files,
        result: result.stdout
      });

      return {
        success: true,
        message,
        files,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitCommitHandler: Git commit failed', {
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

module.exports = GitCommitHandler; 