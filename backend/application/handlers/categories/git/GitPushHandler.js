/**
 * Git Push Handler
 * Handler for pushing changes to remote Git repository
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitPushHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const { projectPath, branch, remote, setUpstream } = command.getCommandData();

      this.logger.info('GitPushHandler: Executing git push', {
        projectPath,
        branch,
        remote,
        setUpstream
      });

      // Get current branch if not specified
      let currentBranch = branch;
      if (!currentBranch) {
        const branchResult = await execAsync('git branch --show-current', { cwd: projectPath });
        currentBranch = branchResult.stdout.trim();
      }

      // Build git push command
      let pushCommand = `git push ${remote} ${currentBranch}`;
      if (setUpstream) {
        pushCommand = `git push -u ${remote} ${currentBranch}`;
      }

      // Execute git push command
      const result = await execAsync(pushCommand, { cwd: projectPath });

      this.logger.info('GitPushHandler: Git push completed successfully', {
        branch: currentBranch,
        remote,
        setUpstream,
        result: result.stdout
      });

      return {
        success: true,
        branch: currentBranch,
        remote,
        setUpstream,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitPushHandler: Git push failed', {
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

module.exports = GitPushHandler; 