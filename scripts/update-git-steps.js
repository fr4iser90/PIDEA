/**
 * Update Git Steps Script
 * Updates all Git steps to use the new DDD pattern with Commands and Handlers
 */

const fs = require('fs');
const path = require('path');

// Git steps to update
const gitSteps = [
  { 
    stepFile: 'git_pull_changes.js', 
    command: 'GitPullCommand', 
    handler: 'GitPullHandler',
    description: 'Pulls changes from remote repository using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_checkout_branch.js', 
    command: 'GitCheckoutCommand', 
    handler: 'GitCheckoutHandler',
    description: 'Checks out a Git branch using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_create_branch.js', 
    command: 'GitCreateBranchCommand', 
    handler: 'GitCreateBranchHandler',
    description: 'Creates a new Git branch using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_merge_branch.js', 
    command: 'GitMergeCommand', 
    handler: 'GitMergeHandler',
    description: 'Merges a Git branch using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_clone_repository.js', 
    command: 'GitCloneCommand', 
    handler: 'GitCloneHandler',
    description: 'Clones a Git repository using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_init_repository.js', 
    command: 'GitInitCommand', 
    handler: 'GitInitHandler',
    description: 'Initializes a Git repository using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_reset.js', 
    command: 'GitResetCommand', 
    handler: 'GitResetHandler',
    description: 'Resets Git repository using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_get_diff.js', 
    command: 'GitDiffCommand', 
    handler: 'GitDiffHandler',
    description: 'Gets Git diff using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_get_commit_history.js', 
    command: 'GitLogCommand', 
    handler: 'GitLogHandler',
    description: 'Gets Git commit history using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_add_remote.js', 
    command: 'GitRemoteCommand', 
    handler: 'GitRemoteHandler',
    description: 'Adds a Git remote using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_get_branches.js', 
    command: 'GitBranchCommand', 
    handler: 'GitBranchHandler',
    description: 'Gets all Git branches using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_create_pull_request.js', 
    command: 'GitCreatePullRequestCommand', 
    handler: 'GitCreatePullRequestHandler',
    description: 'Creates a pull request using DDD pattern with Commands and Handlers'
  },
  { 
    stepFile: 'git_push.js', 
    command: 'GitPushCommand', 
    handler: 'GitPushHandler',
    description: 'Pushes changes to remote Git repository using DDD pattern with Commands and Handlers'
  }
];

// Step template for DDD pattern
const stepTemplate = (stepName, command, handler, description) => `/**
 * ${stepName}
 * ${description}
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('${stepName}');
const CommandRegistry = require('@application/commands/CommandRegistry');
const HandlerRegistry = require('@application/handlers/HandlerRegistry');

// Step configuration
const config = {
  name: '${stepName}',
  type: 'git',
  description: '${description}',
  category: 'git',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000
  },
  validation: {
    required: ['projectPath'],
    optional: []
  }
};

class ${stepName} {
  constructor() {
    this.name = '${stepName}';
    this.description = '${description}';
    this.category = 'git';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ${stepName}.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(\`🔧 Executing \${this.name}...\`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, ...otherParams } = context;
      
      logger.info(\`Executing \${this.name} using DDD pattern\`, {
        projectPath,
        ...otherParams
      });

      // ✅ DDD PATTERN: Create Command and Handler
      const command = CommandRegistry.buildFromCategory('git', '${command}', {
        projectPath,
        ...otherParams
      });

      const handler = HandlerRegistry.buildFromCategory('git', '${handler}', {
        terminalService: context.terminalService,
        logger: logger
      });

      if (!command || !handler) {
        throw new Error('Failed to create Git command or handler');
      }

      // Execute command through handler
      const result = await handler.handle(command);

      logger.info(\`\${this.name} completed successfully using DDD pattern\`, {
        result: result.result
      });

      return {
        success: result.success,
        result: result.result,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(\`\${this.name} failed\`, {
        error: error.message,
        context
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required');
    }
  }
}

// Create instance for execution
const stepInstance = new ${stepName}();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
`;

// Update step files
function updateStepFiles() {
  const stepsDir = path.join(__dirname, '../backend/domain/steps/categories/git');

  gitSteps.forEach(step => {
    const stepPath = path.join(stepsDir, step.stepFile);
    
    if (fs.existsSync(stepPath)) {
      // Read current file
      const currentContent = fs.readFileSync(stepPath, 'utf8');
      
      // Check if already updated
      if (currentContent.includes('CommandRegistry') && currentContent.includes('HandlerRegistry')) {
        console.log(`⏭️  Already updated: ${step.stepFile}`);
        return;
      }
      
      // Generate new content
      const stepName = step.stepFile.replace('.js', '').split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('');
      
      const newContent = stepTemplate(stepName, step.command, step.handler, step.description);
      
      // Backup original file
      const backupPath = stepPath + '.backup';
      fs.writeFileSync(backupPath, currentContent);
      
      // Write new content
      fs.writeFileSync(stepPath, newContent);
      
      console.log(`✅ Updated: ${step.stepFile}`);
      console.log(`   Backup: ${step.stepFile}.backup`);
    } else {
      console.log(`❌ File not found: ${step.stepFile}`);
    }
  });

  console.log('\n🎉 Git Steps update completed!');
  console.log('\n📝 Summary:');
  console.log('- All Git steps now use DDD pattern with Commands and Handlers');
  console.log('- Original files backed up with .backup extension');
  console.log('- Steps are now reusable and follow clean architecture principles');
  console.log('\n🔧 Next steps:');
  console.log('1. Test the updated steps');
  console.log('2. Update any workflow configurations if needed');
  console.log('3. Remove backup files after testing');
}

// Run the updater
updateStepFiles(); 