/**
 * GitCreatePullRequestCommand
 * Create pull request
 */

class GitCreatePullRequestCommand {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = `gitcreatepullrequestcommand-${Date.now()}`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    
    this.sourceBranch = params.sourceBranch;
    this.targetBranch = params.targetBranch || 'main';
    this.title = params.title;
    this.description = params.description;
    this.labels = params.labels || [];
    this.reviewers = params.reviewers || [];
  }

  validate() {
    if (!this.projectPath) {
      throw new Error('Project path is required');
    }
    
    if (!this.sourceBranch) {
      throw new Error('Source branch is required');
    }
    if (!this.targetBranch) {
      throw new Error('Target branch is required');
    }
    return true;
  }

  getCommandData() {
    return {
      commandId: this.commandId,
      projectPath: this.projectPath,
      timestamp: this.timestamp,
      
      sourceBranch: this.sourceBranch,
      targetBranch: this.targetBranch,
      title: this.title,
      description: this.description,
      labels: this.labels,
      reviewers: this.reviewers,
    };
  }
}

module.exports = GitCreatePullRequestCommand;
