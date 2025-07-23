/**
 * Git Status Handler
 * Handler for getting Git repository status
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitStatusHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const { projectPath, porcelain } = command.getCommandData();

      this.logger.info('GitStatusHandler: Executing git status', {
        projectPath,
        porcelain
      });

      // Build status command
      const statusCommand = porcelain ? 'git status --porcelain' : 'git status';
      
      // Execute git status command
      const result = await execAsync(statusCommand, { cwd: projectPath });

      // Parse status if porcelain format
      let status = { raw: result.stdout };
      
      if (porcelain) {
        status = this.parsePorcelainStatus(result.stdout);
      }

      this.logger.info('GitStatusHandler: Git status completed successfully', {
        modifiedCount: status.modified?.length || 0,
        addedCount: status.added?.length || 0,
        deletedCount: status.deleted?.length || 0,
        untrackedCount: status.untracked?.length || 0
      });

      return {
        success: true,
        status,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitStatusHandler: Git status failed', {
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

  parsePorcelainStatus(stdout) {
    const lines = stdout.split('\n').filter(line => line.trim());
    const status = {
      modified: [],
      added: [],
      deleted: [],
      untracked: [],
      staged: [],
      unstaged: [],
      renamed: [],
      copied: []
    };

    for (const line of lines) {
      const code = line.substring(0, 2);
      const file = line.substring(3);

      if (code === 'M ') status.modified.push(file);
      else if (code === 'A ') status.added.push(file);
      else if (code === 'D ') status.deleted.push(file);
      else if (code === '??') status.untracked.push(file);
      else if (code === 'M ') status.staged.push(file);
      else if (code === ' M') status.unstaged.push(file);
      else if (code === 'R ') status.renamed.push(file);
      else if (code === 'C ') status.copied.push(file);
    }

    return status;
  }
}

module.exports = GitStatusHandler; 