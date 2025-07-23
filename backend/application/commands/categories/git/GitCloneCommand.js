/**
 * GitCloneCommand
 * Clone a Git repository
 */

class GitCloneCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitclonecommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.url = params.url;
    this.targetPath = params.targetPath;
    this.branch = params.branch;
    this.depth = params.depth;
    this.singleBranch = params.singleBranch || false;
    this.recursive = params.recursive || false;
  }

  validate() {
    if (!this.projectPath) {
      throw new Error('Project path is required');
    }
    
    if (!this.url) {
      throw new Error('Repository URL is required');
    }
    if (!this.targetPath) {
      throw new Error('Target path is required');
    }
    return true;
  }

  getCommandData() {
    return {
      commandId: this.commandId,
      projectPath: this.projectPath,
      timestamp: this.timestamp,
      
      url: this.url,
      targetPath: this.targetPath,
      branch: this.branch,
      depth: this.depth,
      singleBranch: this.singleBranch,
      recursive: this.recursive,
    };
  }
}

module.exports = GitCloneCommand;
