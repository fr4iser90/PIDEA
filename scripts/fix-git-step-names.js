/**
 * Fix Git Step Names Script
 * Updates all Git step class names and references to include "Step" suffix
 */

const fs = require('fs');
const path = require('path');

// Git steps that need name fixes
const gitSteps = [
  { 
    file: 'git_checkout_branch.js',
    oldName: 'GitCheckoutBranch',
    newName: 'GitCheckoutBranchStep'
  },
  { 
    file: 'git_clone_repository.js',
    oldName: 'GitCloneRepository',
    newName: 'GitCloneRepositoryStep'
  },
  { 
    file: 'git_get_diff.js',
    oldName: 'GitGetDiff',
    newName: 'GitGetDiffStep'
  },
  { 
    file: 'git_merge_branch.js',
    oldName: 'GitMergeBranch',
    newName: 'GitMergeBranchStep'
  },
  { 
    file: 'git_reset.js',
    oldName: 'GitReset',
    newName: 'GitResetStep'
  },
  { 
    file: 'git_init_repository.js',
    oldName: 'GitInitRepository',
    newName: 'GitInitRepositoryStep'
  },
  { 
    file: 'git_get_commit_history.js',
    oldName: 'GitGetCommitHistory',
    newName: 'GitGetCommitHistoryStep'
  },
  { 
    file: 'git_create_pull_request.js',
    oldName: 'GitCreatePullRequest',
    newName: 'GitCreatePullRequestStep'
  },
  { 
    file: 'git_add_remote.js',
    oldName: 'GitAddRemote',
    newName: 'GitAddRemoteStep'
  },
  { 
    file: 'git_create_branch.js',
    oldName: 'GitCreateBranch',
    newName: 'GitCreateBranchStep'
  },
  { 
    file: 'git_pull_changes.js',
    oldName: 'GitPullChanges',
    newName: 'GitPullChangesStep'
  }
];

function fixStepNames() {
  const stepsDir = path.join(__dirname, '../backend/domain/steps/categories/git');

  gitSteps.forEach(step => {
    const stepPath = path.join(stepsDir, step.file);
    
    if (fs.existsSync(stepPath)) {
      let content = fs.readFileSync(stepPath, 'utf8');
      
      // Fix class name
      content = content.replace(
        new RegExp(`class ${step.oldName}`, 'g'),
        `class ${step.newName}`
      );
      
      // Fix constructor name
      content = content.replace(
        new RegExp(`this.name = '${step.oldName}'`, 'g'),
        `this.name = '${step.newName}'`
      );
      
      // Fix getConfig() call
      content = content.replace(
        new RegExp(`${step.oldName}\\.getConfig\\(\\)`, 'g'),
        `${step.newName}.getConfig()`
      );
      
      // Fix new instance creation
      content = content.replace(
        new RegExp(`new ${step.oldName}\\(\\)`, 'g'),
        `new ${step.newName}()`
      );
      
      // Fix logger name
      content = content.replace(
        new RegExp(`new Logger\\('${step.oldName}'\\)`, 'g'),
        `new Logger('${step.newName}')`
      );
      
      fs.writeFileSync(stepPath, content);
      console.log(`✅ Fixed: ${step.file} (${step.oldName} → ${step.newName})`);
    } else {
      console.log(`❌ File not found: ${step.file}`);
    }
  });

  console.log('\n🎉 Git Step names fixed!');
  console.log('\n📝 Summary:');
  console.log('- All Git steps now have consistent "Step" suffix');
  console.log('- Class names, constructor names, and references updated');
  console.log('- Logger names updated');
}

// Run the fixer
fixStepNames(); 