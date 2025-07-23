/**
 * GitCreateBranchCommand
 * Create a new Git branch
 */

class GitCreateBranchCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitcreatebranchcommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.branchName = params.branchName;
    this.checkout = params.checkout !== undefined ? params.checkout : true;
    this.fromBranch = params.fromBranch;
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
      checkout: this.checkout,
      fromBranch: this.fromBranch,
    };
  }
}

module.exports = GitCreateBranchCommand;
