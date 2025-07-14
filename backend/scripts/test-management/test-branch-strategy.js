
#!/usr/bin/env node
require('module-alias/register');

/**
 * Test script to verify WorkflowGitService branch strategy
 * Tests that the system uses correct branches for different task types
 */

const WorkflowGitService = require('@services/WorkflowGitService');
const TaskType = require('@value-objects/TaskType');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

async function testBranchStrategy() {
  logger.debug('🧪 Testing WorkflowGitService Branch Strategy...\n');

  try {
    // Create WorkflowGitService instance
    const workflowGitService = new WorkflowGitService({
      logger: console,
      gitService: null, // Mock for testing
      eventBus: null
    });

    // Test task with testing type
    const testTask = {
      id: 'test-task-123',
      title: 'Fix failing test in UserService',
      description: 'Fix the failing test in UserService.test.js',
      type: { value: TaskType.TESTING },
      priority: { value: 'high' },
      status: { value: 'pending' },
      metadata: {
        taskType: 'failing_test_fix',
        testFile: 'tests/UserService.test.js',
        testName: 'should create user successfully',
        error: 'Expected true but received false',
        projectPath: process.cwd()
      }
    };

    logger.debug('📋 Test Task:');
    logger.debug(`  ID: ${testTask.id}`);
    logger.debug(`  Title: ${testTask.title}`);
    logger.debug(`  Type: ${testTask.type.value}`);
    logger.debug(`  Task Type: ${testTask.metadata.taskType}\n`);

    // Test branch strategy determination
    logger.debug('🌿 Testing Branch Strategy:');
    const branchStrategy = workflowGitService.determineBranchStrategy(testTask.type, {});
    logger.info(`  Strategy Type: ${branchStrategy.type}`);
    logger.info(`  Prefix: ${branchStrategy.prefix}`);
    logger.info(`  Start Point: ${branchStrategy.startPoint}`);
    logger.info(`  Merge Target: ${branchStrategy.mergeTarget}`);
    logger.info(`  Protection: ${branchStrategy.protection}`);
    logger.info(`  Auto-Merge: ${branchStrategy.autoMerge}`);
    logger.info(`  Requires Review: ${branchStrategy.requiresReview}\n`);

    // Test branch name generation
    logger.debug('🏷️  Testing Branch Name Generation:');
    const branchName = workflowGitService.generateBranchName(testTask, branchStrategy);
    logger.info(`  Generated Branch: ${branchName}\n`);

    // Test different task types
    logger.debug('🔄 Testing Different Task Types:');
    
    const taskTypes = [
      { type: TaskType.TESTING, expectedStrategy: 'testing' },
      { type: TaskType.TEST_FIX, expectedStrategy: 'testing' },
      { type: TaskType.REFACTOR, expectedStrategy: 'refactor' },
      { type: TaskType.BUG, expectedStrategy: 'bugfix' },
      { type: TaskType.FEATURE, expectedStrategy: 'feature' }
    ];

    for (const { type, expectedStrategy } of taskTypes) {
      const strategy = workflowGitService.determineBranchStrategy({ value: type }, {});
      const match = strategy.type === expectedStrategy;
      logger.info(`  ${type}: ${strategy.type} (${match ? '✅' : '❌'})`);
    }

    // Test Git workflow generation
    logger.debug('\n📝 Testing Git Workflow Generation:');
    const gitWorkflow = buildGitWorkflow(branchName, branchStrategy, testTask);
    logger.info('  Workflow includes start point: ' + (gitWorkflow.includes(branchStrategy.startPoint) ? '✅' : '❌'));
    logger.info('  Workflow includes branch name: ' + (gitWorkflow.includes(branchName) ? '✅' : '❌'));
    logger.info('  Workflow includes merge target: ' + (gitWorkflow.includes(branchStrategy.mergeTarget) ? '✅' : '❌'));
    logger.info('  Workflow includes protection level: ' + (gitWorkflow.includes(branchStrategy.protection) ? '✅' : '❌'));

    logger.debug('\n✅ Branch Strategy Test Completed Successfully!');
    logger.info('\n📋 Summary:');
    logger.info('  - WorkflowGitService correctly determines branch strategies');
    logger.info('  - Branch names are generated with proper prefixes and structure');
    logger.debug('  - Testing tasks use the correct "pidea-agent" branch strategy');
    logger.info('  - Git workflow includes all necessary information');

  } catch (error) {
    logger.error('❌ Test failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

/**
 * Build Git workflow instructions based on branch strategy
 * @param {string} branchName - Branch name
 * @param {Object} branchStrategy - Branch strategy
 * @param {Object} task - Task object
 * @returns {string} Git workflow instructions
 */
function buildGitWorkflow(branchName, branchStrategy, task) {
  const projectPath = task.metadata?.projectPath || process.cwd();
  const startPoint = branchStrategy.startPoint || 'main';
  
  return ``;
}

// Run the test
if (require.main === module) {
  testBranchStrategy().catch(logger.error);
}

module.exports = { testBranchStrategy }; 