/**
 * GitBranchHandler
 * Handler for Get Git branches
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitBranchHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitBranchHandler: Executing gitbranchcommand', commandData);

      
      const branches = {
        local: [],
        remote: [],
        all: []
      };

      // Get local branches
      if (commandData.includeLocal) {
        const localResult = await execAsync('git branch', { cwd: commandData.projectPath });
        branches.local = localResult.stdout
          .split('\n')
          .map(line => line.trim())
          .filter(line => line)
          .map(line => line.replace(/^\*?\s*/, ''));
      }

      // Get remote branches
      if (commandData.includeRemote) {
        const remoteResult = await execAsync('git branch -r', { cwd: commandData.projectPath });
        branches.remote = remoteResult.stdout
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('origin/'))
          .filter(line => !line.includes('HEAD ->'))
          .map(line => line.replace(/^origin\//, ''));
      }

      // Combine all branches
      branches.all = [...new Set([...branches.local, ...branches.remote])];

      return {
        success: true,
        branches,
        result: branches.all,
        timestamp: new Date()
      };

      this.logger.info('GitBranchHandler: GitBranchCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitBranchHandler: GitBranchCommand failed', {
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

module.exports = GitBranchHandler;
