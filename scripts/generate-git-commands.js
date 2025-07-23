/**
 * Generate Git Commands and Handlers Script
 * Automatically generates all Git commands and handlers following DDD pattern
 */

const fs = require('fs');
const path = require('path');

// Git operations to generate
const gitOperations = [
  { name: 'GitPullCommand', handler: 'GitPullHandler', step: 'git_pull_changes', description: 'Pull changes from remote repository' },
  { name: 'GitCheckoutCommand', handler: 'GitCheckoutHandler', step: 'git_checkout_branch', description: 'Checkout a Git branch' },
  { name: 'GitCreateBranchCommand', handler: 'GitCreateBranchHandler', step: 'git_create_branch', description: 'Create a new Git branch' },
  { name: 'GitMergeCommand', handler: 'GitMergeHandler', step: 'git_merge_branch', description: 'Merge a Git branch' },
  { name: 'GitCloneCommand', handler: 'GitCloneHandler', step: 'git_clone_repository', description: 'Clone a Git repository' },
  { name: 'GitInitCommand', handler: 'GitInitHandler', step: 'git_init_repository', description: 'Initialize a Git repository' },
  { name: 'GitResetCommand', handler: 'GitResetHandler', step: 'git_reset', description: 'Reset Git repository' },
  { name: 'GitDiffCommand', handler: 'GitDiffHandler', step: 'git_get_diff', description: 'Get Git diff' },
  { name: 'GitLogCommand', handler: 'GitLogHandler', step: 'git_get_commit_history', description: 'Get Git commit history' },
  { name: 'GitRemoteCommand', handler: 'GitRemoteHandler', step: 'git_add_remote', description: 'Add Git remote' },
  { name: 'GitBranchCommand', handler: 'GitBranchHandler', step: 'git_get_branches', description: 'Get Git branches' },
  { name: 'GitCreatePullRequestCommand', handler: 'GitCreatePullRequestHandler', step: 'git_create_pull_request', description: 'Create pull request' }
];

// Command template
const commandTemplate = (name, description) => `/**
 * ${name}
 * ${description}
 */

class ${name} {
  constructor(params) {
    this.projectPath = params.projectPath;
    this.commandId = \`${name.toLowerCase()}-\${Date.now()}\`;
    this.timestamp = new Date();
    
    // Add specific parameters based on operation
    ${getCommandParams(name)}
  }

  validate() {
    if (!this.projectPath) {
      throw new Error('Project path is required');
    }
    ${getCommandValidation(name)}
    return true;
  }

  getCommandData() {
    return {
      commandId: this.commandId,
      projectPath: this.projectPath,
      timestamp: this.timestamp,
      ${getCommandDataFields(name)}
    };
  }
}

module.exports = ${name};
`;

// Handler template
const handlerTemplate = (name, handlerName, description) => `/**
 * ${handlerName}
 * Handler for ${description}
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class ${handlerName} {
  constructor(dependencies) {
    this.terminalService = dependencies.terminalService;
    this.logger = dependencies.logger;
  }

  async handle(command) {
    try {
      // Validate command
      command.validate();

      const commandData = command.getCommandData();

      this.logger.info('${handlerName}: Executing ${name.toLowerCase()}', commandData);

      ${getHandlerLogic(name)}

      this.logger.info('${handlerName}: ${name} completed successfully', {
        result: result.stdout
      });

      return {
        success: true,
        result: result.stdout,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('${handlerName}: ${name} failed', {
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

module.exports = ${handlerName};
`;

// Helper functions
function getCommandParams(name) {
  const params = {
    'GitPullCommand': `
    this.remote = params.remote || 'origin';
    this.branch = params.branch;
    this.rebase = params.rebase || false;`,
    'GitCheckoutCommand': `
    this.branchName = params.branchName;
    this.createIfNotExists = params.createIfNotExists || false;`,
    'GitCreateBranchCommand': `
    this.branchName = params.branchName;
    this.checkout = params.checkout !== undefined ? params.checkout : true;
    this.fromBranch = params.fromBranch;`,
    'GitMergeCommand': `
    this.branchName = params.branchName;
    this.strategy = params.strategy || 'recursive';
    this.noFF = params.noFF || false;`,
    'GitCloneCommand': `
    this.url = params.url;
    this.targetPath = params.targetPath;
    this.branch = params.branch;
    this.depth = params.depth;
    this.singleBranch = params.singleBranch || false;
    this.recursive = params.recursive || false;`,
    'GitInitCommand': `
    this.bare = params.bare || false;
    this.initialBranch = params.initialBranch || 'main';`,
    'GitResetCommand': `
    this.mode = params.mode || 'mixed';
    this.commit = params.commit || 'HEAD';`,
    'GitDiffCommand': `
    this.staged = params.staged || false;
    this.file = params.file;
    this.commit1 = params.commit1;
    this.commit2 = params.commit2;`,
    'GitLogCommand': `
    this.limit = params.limit || 10;
    this.since = params.since;
    this.until = params.until;
    this.author = params.author;
    this.format = params.format || 'pretty=format:"%H|%an|%ae|%ad|%s"';`,
    'GitRemoteCommand': `
    this.name = params.name;
    this.url = params.url;`,
    'GitBranchCommand': `
    this.includeRemote = params.includeRemote !== undefined ? params.includeRemote : true;
    this.includeLocal = params.includeLocal !== undefined ? params.includeLocal : true;`,
    'GitCreatePullRequestCommand': `
    this.sourceBranch = params.sourceBranch;
    this.targetBranch = params.targetBranch || 'main';
    this.title = params.title;
    this.description = params.description;
    this.labels = params.labels || [];
    this.reviewers = params.reviewers || [];`
  };
  
  return params[name] || '';
}

function getCommandValidation(name) {
  const validations = {
    'GitCheckoutCommand': `
    if (!this.branchName) {
      throw new Error('Branch name is required');
    }`,
    'GitCreateBranchCommand': `
    if (!this.branchName) {
      throw new Error('Branch name is required');
    }`,
    'GitMergeCommand': `
    if (!this.branchName) {
      throw new Error('Branch name is required');
    }`,
    'GitCloneCommand': `
    if (!this.url) {
      throw new Error('Repository URL is required');
    }
    if (!this.targetPath) {
      throw new Error('Target path is required');
    }`,
    'GitRemoteCommand': `
    if (!this.name) {
      throw new Error('Remote name is required');
    }
    if (!this.url) {
      throw new Error('Remote URL is required');
    }`,
    'GitCreatePullRequestCommand': `
    if (!this.sourceBranch) {
      throw new Error('Source branch is required');
    }
    if (!this.targetBranch) {
      throw new Error('Target branch is required');
    }`
  };
  
  return validations[name] || '';
}

function getCommandDataFields(name) {
  const fields = {
    'GitPullCommand': `
      remote: this.remote,
      branch: this.branch,
      rebase: this.rebase,`,
    'GitCheckoutCommand': `
      branchName: this.branchName,
      createIfNotExists: this.createIfNotExists,`,
    'GitCreateBranchCommand': `
      branchName: this.branchName,
      checkout: this.checkout,
      fromBranch: this.fromBranch,`,
    'GitMergeCommand': `
      branchName: this.branchName,
      strategy: this.strategy,
      noFF: this.noFF,`,
    'GitCloneCommand': `
      url: this.url,
      targetPath: this.targetPath,
      branch: this.branch,
      depth: this.depth,
      singleBranch: this.singleBranch,
      recursive: this.recursive,`,
    'GitInitCommand': `
      bare: this.bare,
      initialBranch: this.initialBranch,`,
    'GitResetCommand': `
      mode: this.mode,
      commit: this.commit,`,
    'GitDiffCommand': `
      staged: this.staged,
      file: this.file,
      commit1: this.commit1,
      commit2: this.commit2,`,
    'GitLogCommand': `
      limit: this.limit,
      since: this.since,
      until: this.until,
      author: this.author,
      format: this.format,`,
    'GitRemoteCommand': `
      name: this.name,
      url: this.url,`,
    'GitBranchCommand': `
      includeRemote: this.includeRemote,
      includeLocal: this.includeLocal,`,
    'GitCreatePullRequestCommand': `
      sourceBranch: this.sourceBranch,
      targetBranch: this.targetBranch,
      title: this.title,
      description: this.description,
      labels: this.labels,
      reviewers: this.reviewers,`
  };
  
  return fields[name] || '';
}

function getHandlerLogic(name) {
  const logic = {
    'GitPullCommand': `
      // Build pull command
      let pullCommand = 'git pull';
      if (commandData.rebase) {
        pullCommand += ' --rebase';
      }
      pullCommand += \` \${commandData.remote}\`;
      if (commandData.branch) {
        pullCommand += \` \${commandData.branch}\`;
      }

      // Execute git pull command
      const result = await execAsync(pullCommand, { cwd: commandData.projectPath });`,
    'GitCheckoutCommand': `
      // Check if branch exists
      const branchExistsResult = await execAsync(\`git branch --list \${commandData.branchName}\`, { cwd: commandData.projectPath });
      const branchExists = branchExistsResult.stdout.trim().includes(commandData.branchName);

      if (!branchExists && !commandData.createIfNotExists) {
        throw new Error(\`Branch \${commandData.branchName} does not exist and createIfNotExists is false\`);
      }

      // Build checkout command
      let checkoutCommand = \`git checkout \${commandData.branchName}\`;
      if (!branchExists && commandData.createIfNotExists) {
        checkoutCommand = \`git checkout -b \${commandData.branchName}\`;
      }

      // Execute git checkout command
      const result = await execAsync(checkoutCommand, { cwd: commandData.projectPath });`,
    'GitCreateBranchCommand': `
      // Check if branch already exists
      const branchExistsResult = await execAsync(\`git branch --list \${commandData.branchName}\`, { cwd: commandData.projectPath });
      if (branchExistsResult.stdout.trim()) {
        if (commandData.checkout) {
          await execAsync(\`git checkout \${commandData.branchName}\`, { cwd: commandData.projectPath });
        }
        return {
          success: true,
          result: 'Branch already exists',
          timestamp: new Date()
        };
      }

      // Switch to base branch if specified
      if (commandData.fromBranch) {
        await execAsync(\`git checkout \${commandData.fromBranch}\`, { cwd: commandData.projectPath });
      }

      // Create new branch
      let createCommand = \`git branch \${commandData.branchName}\`;
      if (commandData.checkout) {
        createCommand = \`git checkout -b \${commandData.branchName}\`;
      }

      const result = await execAsync(createCommand, { cwd: commandData.projectPath });`,
    'GitMergeCommand': `
      // Build merge command
      let mergeCommand = 'git merge';
      if (commandData.noFF) {
        mergeCommand += ' --no-ff';
      }
      mergeCommand += \` \${commandData.branchName}\`;

      // Execute git merge command
      const result = await execAsync(mergeCommand, { cwd: commandData.projectPath });`,
    'GitCloneCommand': `
      // Build clone command
      let cloneCommand = \`git clone \${commandData.url} \${commandData.targetPath}\`;
      if (commandData.branch) {
        cloneCommand += \` -b \${commandData.branch}\`;
      }
      if (commandData.depth) {
        cloneCommand += \` --depth \${commandData.depth}\`;
      }
      if (commandData.singleBranch) {
        cloneCommand += ' --single-branch';
      }
      if (commandData.recursive) {
        cloneCommand += ' --recursive';
      }

      // Execute git clone command
      const result = await execAsync(cloneCommand);`,
    'GitInitCommand': `
      // Build init command
      let initCommand = 'git init';
      if (commandData.bare) {
        initCommand += ' --bare';
      }
      if (commandData.initialBranch) {
        initCommand += \` -b \${commandData.initialBranch}\`;
      }

      // Execute git init command
      const result = await execAsync(initCommand, { cwd: commandData.projectPath });`,
    'GitResetCommand': `
      // Validate mode
      const validModes = ['soft', 'mixed', 'hard'];
      if (!validModes.includes(commandData.mode)) {
        throw new Error(\`Invalid reset mode: \${commandData.mode}. Valid modes: \${validModes.join(', ')}\`);
      }

      // Build reset command
      const resetCommand = \`git reset --\${commandData.mode} \${commandData.commit}\`;

      // Execute git reset command
      const result = await execAsync(resetCommand, { cwd: commandData.projectPath });`,
    'GitDiffCommand': `
      // Build diff command
      let diffCommand = 'git diff';
      if (commandData.staged) {
        diffCommand += ' --staged';
      }
      if (commandData.commit1 && commandData.commit2) {
        diffCommand += \` \${commandData.commit1}..\${commandData.commit2}\`;
      } else if (commandData.commit1) {
        diffCommand += \` \${commandData.commit1}\`;
      }
      if (commandData.file) {
        diffCommand += \` -- \${commandData.file}\`;
      }

      // Execute git diff command
      const result = await execAsync(diffCommand, { cwd: commandData.projectPath });`,
    'GitLogCommand': `
      // Build log command
      let logCommand = \`git log --\${commandData.format}\`;
      if (commandData.limit) {
        logCommand += \` -\${commandData.limit}\`;
      }
      if (commandData.since) {
        logCommand += \` --since="\${commandData.since}"\`;
      }
      if (commandData.until) {
        logCommand += \` --until="\${commandData.until}"\`;
      }
      if (commandData.author) {
        logCommand += \` --author="\${commandData.author}"\`;
      }

      // Execute git log command
      const result = await execAsync(logCommand, { cwd: commandData.projectPath });`,
    'GitRemoteCommand': `
      // Execute git remote add command
      const result = await execAsync(\`git remote add \${commandData.name} \${commandData.url}\`, { cwd: commandData.projectPath });`,
    'GitBranchCommand': `
      const branches = {
        local: [],
        remote: [],
        all: []
      };

      // Get local branches
      if (commandData.includeLocal) {
        const localResult = await execAsync('git branch', { cwd: commandData.projectPath });
        branches.local = localResult.stdout
          .split('\\n')
          .map(line => line.trim())
          .filter(line => line)
          .map(line => line.replace(/^\\*?\\s*/, ''));
      }

      // Get remote branches
      if (commandData.includeRemote) {
        const remoteResult = await execAsync('git branch -r', { cwd: commandData.projectPath });
        branches.remote = remoteResult.stdout
          .split('\\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('origin/'))
          .filter(line => !line.includes('HEAD ->'))
          .map(line => line.replace(/^origin\\//, ''));
      }

      // Combine all branches
      branches.all = [...new Set([...branches.local, ...branches.remote])];

      return {
        success: true,
        branches,
        result: branches.all,
        timestamp: new Date()
      };`,
    'GitCreatePullRequestCommand': `
      // Generate PR data
      const prTitle = commandData.title || \`Merge \${commandData.sourceBranch} into \${commandData.targetBranch}\`;
      const prDescription = commandData.description || \`Automated pull request from \${commandData.sourceBranch}\`;

      // Try GitHub CLI first, fallback to manual process
      try {
        const ghCheck = await execAsync('gh --version', { cwd: commandData.projectPath });
        
        if (ghCheck.exitCode === 0) {
          let ghCommand = \`gh pr create --base \${commandData.targetBranch} --head \${commandData.sourceBranch} --title "\${prTitle}" --body "\${prDescription}"\`;
          
          if (commandData.labels.length > 0) {
            ghCommand += \` --label "\${commandData.labels.join(',')}"\`;
          }
          
          if (commandData.reviewers.length > 0) {
            ghCommand += \` --reviewer "\${commandData.reviewers.join(',')}"\`;
          }

          const result = await execAsync(ghCommand, { cwd: commandData.projectPath });
          
          const prUrlMatch = result.stdout.match(/https:\\/\\/github\\.com\\/[^\\s]+/);
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
        await execAsync(\`git push origin \${commandData.sourceBranch}\`, { cwd: commandData.projectPath });
        
        const remoteResult = await execAsync('git remote get-url origin', { cwd: commandData.projectPath });
        const remoteUrl = remoteResult.stdout.trim();
        
        let repoUrl = remoteUrl;
        if (remoteUrl.startsWith('git@github.com:')) {
          repoUrl = remoteUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '');
        }

        const prUrl = \`\${repoUrl}/compare/\${commandData.targetBranch}...\${commandData.sourceBranch}\`;

        return {
          success: true,
          pullRequestUrl: prUrl,
          title: prTitle,
          method: 'manual',
          result: 'Push completed, create PR manually',
          timestamp: new Date()
        };
      }`
  };
  
  return logic[name] || `
      // Execute command (implement specific logic)
      const result = await execAsync('git command', { cwd: commandData.projectPath });`;
}

// Generate files
function generateFiles() {
  const commandsDir = path.join(__dirname, '../backend/application/commands/categories/git');
  const handlersDir = path.join(__dirname, '../backend/application/handlers/categories/git');

  // Create directories if they don't exist
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
  }
  if (!fs.existsSync(handlersDir)) {
    fs.mkdirSync(handlersDir, { recursive: true });
  }

  gitOperations.forEach(operation => {
    // Generate command file
    const commandContent = commandTemplate(operation.name, operation.description);
    const commandPath = path.join(commandsDir, `${operation.name}.js`);
    
    if (!fs.existsSync(commandPath)) {
      fs.writeFileSync(commandPath, commandContent);
      console.log(`✅ Generated: ${commandPath}`);
    } else {
      console.log(`⏭️  Skipped (exists): ${commandPath}`);
    }

    // Generate handler file
    const handlerContent = handlerTemplate(operation.name, operation.handler, operation.description);
    const handlerPath = path.join(handlersDir, `${operation.handler}.js`);
    
    if (!fs.existsSync(handlerPath)) {
      fs.writeFileSync(handlerPath, handlerContent);
      console.log(`✅ Generated: ${handlerPath}`);
    } else {
      console.log(`⏭️  Skipped (exists): ${handlerPath}`);
    }
  });

  console.log('\n🎉 Git Commands and Handlers generation completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Update the remaining Git steps to use the new DDD pattern');
  console.log('2. Test the commands and handlers');
  console.log('3. Update any service registrations if needed');
}

// Run the generator
generateFiles(); 