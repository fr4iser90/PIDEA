/**
 * GitInitCommand
 * Initialize a Git repository
 */

class GitInitCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitinitcommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.bare = params.bare || false;
    this.initialBranch = params.initialBranch || 'main';
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
      
      bare: this.bare,
      initialBranch: this.initialBranch,
    };
  }
}

module.exports = GitInitCommand;
