const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testGitBranches() {
  try {
    console.log('Testing Git branches directly...');
    
    const projectPath = '/home/fr4iser/Documents/Git/PIDEA';
    
    // Test local branches
    const localResult = await execAsync('git branch', { cwd: projectPath });
    const localBranches = localResult.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => line.replace(/^\*?\s*/, ''));
    
    console.log('Local branches:', localBranches);
    console.log('Local branches length:', localBranches.length);
    
    // Test remote branches
    const remoteResult = await execAsync('git branch -r', { cwd: projectPath });
    const remoteBranches = remoteResult.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('origin/'))
      .filter(line => !line.includes('HEAD ->'))
      .map(line => line.replace(/^origin\//, ''));
    
    console.log('Remote branches:', remoteBranches);
    console.log('Remote branches length:', remoteBranches.length);
    
    // Combine all branches
    const allBranches = [...new Set([...localBranches, ...remoteBranches])];
    console.log('All branches:', allBranches);
    console.log('All branches length:', allBranches.length);
    
    const result = {
      success: true,
      branches: {
        local: localBranches,
        remote: remoteBranches,
        all: allBranches
      },
      result: allBranches,
      timestamp: new Date()
    };
    
    console.log('Final result structure:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testGitBranches(); 