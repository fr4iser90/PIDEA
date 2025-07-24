/**
 * Git Commit Command
 * Command for committing changes to Git repository
 */

class GitCommitCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.message = params.message;
    this.files = params.files || '.';
    this.author = params.author;
    this.email = params.email;
    this.commandId = `git-commit-${Date.now()}`;
    this.timestamp = new Date();
  }

  validate() {
    if (!this.projectPath) {
      throw new Error('Project path is required');
    }
    if (!this.message) {
      throw new Error('Commit message is required');
    }
    return true;
  }

  getCommandData() {
    return {
      commandId: this.commandId,
      projectPath: this.projectPath,
      message: this.message,
      files: this.files,
      author: this.author,
      email: this.email,
      timestamp: this.timestamp
    };
  }
}

module.exports = GitCommitCommand; 