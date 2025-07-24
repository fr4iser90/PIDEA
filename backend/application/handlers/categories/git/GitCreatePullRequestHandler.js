/**
 * GitCreatePullRequestHandler
 * Handler for Create pull request
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitCreatePullRequestHandler {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('GitCreatePullRequestHandler: Executing gitcreatepullrequestcommand', commandData);

      
      // Generate PR data
      const prTitle = commandData.title || `Merge ${commandData.sourceBranch} into ${commandData.targetBranch}`;
      const prDescription = commandData.description || `Automated pull request from ${commandData.sourceBranch}`;

      // Try GitHub CLI first, fallback to manual process
      try {
        const ghCheck = await execAsync('gh --version', { cwd: commandData.projectPath });
        
        if (ghCheck.exitCode === 0) {
          let ghCommand = `gh pr create --base ${commandData.targetBranch} --head ${commandData.sourceBranch} --title "${prTitle}" --body "${prDescription}"`;
          
          if (commandData.labels.length > 0) {
            ghCommand += ` --label "${commandData.labels.join(',')}"`;
          }
          
          if (commandData.reviewers.length > 0) {
            ghCommand += ` --reviewer "${commandData.reviewers.join(',')}"`;
          }

          const result = await execAsync(ghCommand, { cwd: commandData.projectPath });
          
          const prUrlMatch = result.stdout.match(/https:\/\/github\.com\/[^\s]+/);
          const prUrl = prUrlMatch ? prUrlMatch[0] : result.stdout;

          return {
            success: true,
            pullRequestUrl: prUrl,
            title: prTitle,
            method: 'github-cli',
            result: result.stdout,
            timestamp: new Date()
          };
        }
      } catch (ghError) {
        // Fallback: Manual process
        await execAsync(`git push origin ${commandData.sourceBranch}`, { cwd: commandData.projectPath });
        
        const remoteResult = await execAsync('git remote get-url origin', { cwd: commandData.projectPath });
        const remoteUrl = remoteResult.stdout.trim();
        
        let repoUrl = remoteUrl;
        if (remoteUrl.startsWith('git@github.com:')) {
          repoUrl = remoteUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '');
        }

        const prUrl = `${repoUrl}/compare/${commandData.targetBranch}...${commandData.sourceBranch}`;

        return {
          success: true,
          pullRequestUrl: prUrl,
          title: prTitle,
          method: 'manual',
          result: 'Push completed, create PR manually',
          timestamp: new Date()
        };
      }

      this.logger.info('GitCreatePullRequestHandler: GitCreatePullRequestCommand completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('GitCreatePullRequestHandler: GitCreatePullRequestCommand failed', {
        error: error.message,
        command: command.getCommandData()
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = GitCreatePullRequestHandler;
