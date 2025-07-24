/**
 * GitDiffCommand
 * Get Git diff
 */

class GitDiffCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitdiffcommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.staged = params.staged || false;
    this.file = params.file;
    this.commit1 = params.commit1;
    this.commit2 = params.commit2;
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
      
      staged: this.staged,
      file: this.file,
      commit1: this.commit1,
      commit2: this.commit2,
    };
  }
}

module.exports = GitDiffCommand;
