/**
 * GitRemoteCommand
 * Add Git remote
 */

class GitRemoteCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitremotecommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.name = params.name;
    this.url = params.url;
  }

  validate() {
    if (!this.projectPath) {
      throw new Error('Project path is required');
    }
    
    if (!this.name) {
      throw new Error('Remote name is required');
    }
    if (!this.url) {
      throw new Error('Remote URL is required');
    }
    return true;
  }

  getCommandData() {
    return {
      commandId: this.commandId,
      projectPath: this.projectPath,
      timestamp: this.timestamp,
      
      name: this.name,
      url: this.url,
    };
  }
}

module.exports = GitRemoteCommand;
