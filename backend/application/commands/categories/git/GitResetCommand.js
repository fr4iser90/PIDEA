/**
 * GitResetCommand
 * Reset Git repository
 */

class GitResetCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitresetcommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.mode = params.mode || 'mixed';
    this.commit = params.commit || 'HEAD';
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
      
      mode: this.mode,
      commit: this.commit,
    };
  }
}

module.exports = GitResetCommand;
