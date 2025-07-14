const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');

#!/usr/bin/env node

/**
 * Idea to Execution Workflow CLI
 * 
 * Usage:
 *   node scripts/workflows/idea-to-execution.js "Your idea here"
 *   node scripts/workflows/idea-to-execution.js --interactive
 *   node scripts/workflows/idea-to-execution.js --file idea.txt
 */

const { IdeaToExecutionWorkflow } = require('../../backend/domain/workflows/steps');
const { WorkflowBuilder } = require('../../backend/domain/workflows');
const readline = require('readline');

class IdeaToExecutionCLI {
  constructor() {
    this.workflow = new IdeaToExecutionWorkflow();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run() {
    try {
      logger.info('🚀 Idea to Execution Workflow');
      logger.info('================================');
      
      const args = process.argv.slice(2);
      
      if (args.includes('--help') || args.includes('-h')) {
        this.showHelp();
        return;
      }
      
      let idea = '';
      
      if (args.includes('--interactive') || args.includes('-i')) {
        idea = await this.getIdeaInteractive();
      } else if (args.includes('--file') || args.includes('-f')) {
        const fileIndex = args.indexOf('--file') !== -1 ? args.indexOf('--file') : args.indexOf('-f');
        const filename = args[fileIndex + 1];
        idea = await this.getIdeaFromFile(filename);
      } else if (args.length > 0) {
        idea = args.join(' ');
      } else {
        logger.info('❌ No idea provided. Use --interactive or provide idea as argument.');
        this.showHelp();
        return;
      }
      
      if (!idea.trim()) {
        logger.info('❌ Idea cannot be empty');
        return;
      }
      
      logger.info(`💡 Processing idea: "${idea}"`);
      logger.info('');
      
      // Get project and user context
      const context = await this.getContext();
      
      // Execute workflow
      const result = await this.executeWorkflow(idea, context);
      
      // Display results
      this.displayResults(result);
      
    } catch (error) {
      console.error('❌ Workflow failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async getIdeaInteractive() {
    return new Promise((resolve) => {
      this.rl.question('💡 Please describe your idea: ', (idea) => {
        resolve(idea);
      });
    });
  }

  async getIdeaFromFile(filename) {
    const fs = require('fs');
    try {
      return fs.readFileSync(filename, 'utf8').trim();
    } catch (error) {
      throw new Error(`Failed to read file ${filename}: ${error.message}`);
    }
  }

  async getContext() {
    // For now, use default context
    // In a real implementation, you'd get this from user input or environment
    return {
      projectId: process.env.PROJECT_ID || 'default-project',
      userId: process.env.USER_ID || 'default-user',
      automationLevel: 'semi_auto'
    };
  }

  async executeWorkflow(idea, context) {
    logger.info('🔄 Starting workflow execution...');
    logger.info('');
    
    const workflowContext = {
      ...context,
      idea
    };
    
    return await this.workflow.execute(workflowContext);
  }

  displayResults(result) {
    logger.info('');
    logger.info('✅ Workflow completed successfully!');
    logger.info('====================================');
    logger.info('');
    
    logger.info('📋 Results Summary:');
    logger.info(`   Original Idea: ${result.originalIdea}`);
    logger.info(`   Task ID: ${result.taskId}`);
    logger.info(`   Subtasks Created: ${result.splitTasks.length}`);
    logger.info(`   Execution Results: ${result.executionResults.length}`);
    logger.info('');
    
    logger.info('📊 Execution Statistics:');
    const successful = result.executionResults.filter(r => r.success).length;
    const failed = result.executionResults.filter(r => !r.success).length;
    logger.info(`   Successful: ${successful}`);
    logger.info(`   Failed: ${failed}`);
    logger.info(`   Success Rate: ${((successful / result.executionResults.length) * 100).toFixed(1)}%`);
    logger.info('');
    
    if (result.executionResults.some(r => !r.success)) {
      logger.info('⚠️  Failed Subtasks:');
      result.executionResults
        .filter(r => !r.success)
        .forEach(r => {
          logger.info(`   - Subtask ${r.subtaskId}: ${r.error}`);
        });
      logger.info('');
    }
    
    logger.info('🎉 All done! Your idea has been processed and executed.');
  }

  showHelp() {
    logger.info('Idea to Execution Workflow CLI');
    logger.info('');
    logger.info('Usage:');
    logger.info('  node scripts/workflows/idea-to-execution.js "Your idea here"');
    logger.info('  node scripts/workflows/idea-to-execution.js --interactive');
    logger.info('  node scripts/workflows/idea-to-execution.js --file idea.txt');
    logger.info('');
    logger.info('Options:');
    logger.info('  --interactive, -i    Run in interactive mode');
    logger.info('  --file, -f <file>    Read idea from file');
    logger.info('  --help, -h           Show this help');
    logger.info('');
    logger.info('Examples:');
    logger.info('  node scripts/workflows/idea-to-execution.js "Create a user authentication system"');
    logger.info('  node scripts/workflows/idea-to-execution.js --interactive');
    logger.info('  node scripts/workflows/idea-to-execution.js --file my-idea.txt');
  }
}

// Run the CLI
if (require.main === module) {
  const cli = new IdeaToExecutionCLI();
  cli.run().catch(console.error);
}

module.exports = IdeaToExecutionCLI; 