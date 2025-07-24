/**
 * GitLogCommand
 * Get Git commit history
 */

class GitLogCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitlogcommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.limit = params.limit || 10;
    this.since = params.since;
    this.until = params.until;
    this.author = params.author;
    this.format = params.format || 'pretty=format:"%H|%an|%ae|%ad|%s"';
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
      
      limit: this.limit,
      since: this.since,
      until: this.until,
      author: this.author,
      format: this.format,
    };
  }
}

module.exports = GitLogCommand;
