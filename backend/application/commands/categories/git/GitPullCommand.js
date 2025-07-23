/**
 * GitPullCommand
 * Pull changes from remote repository
 */

class GitPullCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitpullcommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.remote = params.remote || 'origin';
    this.branch = params.branch;
    this.rebase = params.rebase || false;
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
      timestamp: this.timestamp,
      
      remote: this.remote,
      branch: this.branch,
      rebase: this.rebase,
    };
  }
}

module.exports = GitPullCommand;
