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
      console.log('🚀 Idea to Execution Workflow');
      console.log('================================');
      
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
        console.log('❌ No idea provided. Use --interactive or provide idea as argument.');
        this.showHelp();
        return;
      }
      
      if (!idea.trim()) {
        console.log('❌ Idea cannot be empty');
        return;
      }
      
      console.log(`💡 Processing idea: "${idea}"`);
      console.log('');
      
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
    console.log('🔄 Starting workflow execution...');
    console.log('');
    
    const workflowContext = {
      ...context,
      idea
    };
    
    return await this.workflow.execute(workflowContext);
  }

  displayResults(result) {
    console.log('');
    console.log('✅ Workflow completed successfully!');
    console.log('====================================');
    console.log('');
    
    console.log('📋 Results Summary:');
    console.log(`   Original Idea: ${result.originalIdea}`);
    console.log(`   Task ID: ${result.taskId}`);
    console.log(`   Subtasks Created: ${result.splitTasks.length}`);
    console.log(`   Execution Results: ${result.executionResults.length}`);
    console.log('');
    
    console.log('📊 Execution Statistics:');
    const successful = result.executionResults.filter(r => r.success).length;
    const failed = result.executionResults.filter(r => !r.success).length;
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success Rate: ${((successful / result.executionResults.length) * 100).toFixed(1)}%`);
    console.log('');
    
    if (result.executionResults.some(r => !r.success)) {
      console.log('⚠️  Failed Subtasks:');
      result.executionResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - Subtask ${r.subtaskId}: ${r.error}`);
        });
      console.log('');
    }
    
    console.log('🎉 All done! Your idea has been processed and executed.');
  }

  showHelp() {
    console.log('Idea to Execution Workflow CLI');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/workflows/idea-to-execution.js "Your idea here"');
    console.log('  node scripts/workflows/idea-to-execution.js --interactive');
    console.log('  node scripts/workflows/idea-to-execution.js --file idea.txt');
    console.log('');
    console.log('Options:');
    console.log('  --interactive, -i    Run in interactive mode');
    console.log('  --file, -f <file>    Read idea from file');
    console.log('  --help, -h           Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/workflows/idea-to-execution.js "Create a user authentication system"');
    console.log('  node scripts/workflows/idea-to-execution.js --interactive');
    console.log('  node scripts/workflows/idea-to-execution.js --file my-idea.txt');
  }
}

// Run the CLI
if (require.main === module) {
  const cli = new IdeaToExecutionCLI();
  cli.run().catch(console.error);
}

module.exports = IdeaToExecutionCLI; 