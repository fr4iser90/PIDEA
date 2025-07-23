/**
 * Git Push Command
 * Command for pushing changes to remote Git repository
 */

class GitPushCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.branch = params.branch;
    this.remote = params.remote || 'origin';
    this.setUpstream = params.setUpstream || false;
    this.commandId = `git-push-${Date.now()}`;
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
      branch: this.branch,
      remote: this.remote,
      setUpstream: this.setUpstream,
      timestamp: this.timestamp
    };
  }
}

module.exports = GitPushCommand; 