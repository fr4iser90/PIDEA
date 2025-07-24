/**
 * Git Status Command
 * Command for getting Git repository status
 */

class GitStatusCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.porcelain = params.porcelain !== undefined ? params.porcelain : true;
    this.commandId = `git-status-${Date.now()}`;
    this.timestamp = new Date();
  }

  validate() {
    if (!this.projectPath) {
      throw new Error('Project path is required');
    }
    return true;
  }

  getCommandData() {
    return {
      commandId: this.commandId,
      projectPath: this.projectPath,
      porcelain: this.porcelain,
      timestamp: this.timestamp
    };
  }
}

module.exports = GitStatusCommand; 