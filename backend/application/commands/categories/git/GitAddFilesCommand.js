/**
 * Git Add Files Command
 * Command for adding files to Git staging area
 */

class GitAddFilesCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.files = params.files || '.';
    this.commandId = `git-add-${Date.now()}`;
    this.timestamp = new Date();
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
      files: this.files,
      timestamp: this.timestamp
    };
  }
}

module.exports = GitAddFilesCommand; 