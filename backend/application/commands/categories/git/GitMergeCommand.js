/**
 * GitMergeCommand
 * Merge a Git branch
 */

class GitMergeCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitmergecommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.branchName = params.branchName;
    this.strategy = params.strategy || 'recursive';
    this.noFF = params.noFF || false;
  }

  validate() {
    if (!this.projectPath) {
      throw new Error('Project path is required');
    }
    
    if (!this.branchName) {
      throw new Error('Branch name is required');
    }
    return true;
  }

  getCommandData() {
    return {
      commandId: this.commandId,
      projectPath: this.projectPath,
      timestamp: this.timestamp,
      
      branchName: this.branchName,
      strategy: this.strategy,
      noFF: this.noFF,
    };
  }
}

module.exports = GitMergeCommand;
