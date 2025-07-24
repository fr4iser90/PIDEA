/**
 * GitCheckoutCommand
 * Checkout a Git branch
 */

class GitCheckoutCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitcheckoutcommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.branchName = params.branchName;
    this.createIfNotExists = params.createIfNotExists || false;
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
      createIfNotExists: this.createIfNotExists,
    };
  }
}

module.exports = GitCheckoutCommand;
