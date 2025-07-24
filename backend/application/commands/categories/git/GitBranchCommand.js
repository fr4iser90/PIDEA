/**
 * GitBranchCommand
 * Get Git branches
 */

class GitBranchCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitbranchcommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.includeRemote = params.includeRemote !== undefined ? params.includeRemote : true;
    this.includeLocal = params.includeLocal !== undefined ? params.includeLocal : true;
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
      
      includeRemote: this.includeRemote,
      includeLocal: this.includeLocal,
    };
  }
}

module.exports = GitBranchCommand;
