const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * RefactoringStep - Main refactoring orchestration step
 * Coordinates the refactoring process by calling analyze and generate task steps
 */

const config = {
  name: 'RefactoringStep',
  type: 'refactoring',
  description: 'Orchestrates the complete refactoring process',
  category: 'refactoring',
  version: '1.0.0',
};

async function execute(context, options = {}) {
  const projectPath = context.projectPath;
  const stepRegistry = context.stepRegistry;

  if (!projectPath) throw new Error('Project path not found in context');
  if (!stepRegistry) throw new Error('Step registry not found in context');

  logger.info('🚀 [RefactoringStep] Starting refactoring orchestration...');

  try {
    // Step 1: Analyze project for refactoring opportunities
    logger.info('📊 [RefactoringStep] Step 1: Analyzing project...');
    const analyzeResult = await stepRegistry.executeStep('RefactorAnalyze', context, options);
    
    if (!analyzeResult.success) {
      throw new Error('Project analysis failed');
    }

    // Extract largeFiles from the correct location in analyzeResult
    const largeFiles = analyzeResult.result?.largeFiles || analyzeResult.largeFiles || [];
    
    logger.info(`🔍 [RefactoringStep] Analysis result:`, {
      success: analyzeResult.success,
      largeFilesCount: largeFiles.length,
      largeFilesSample: largeFiles.slice(0, 2),
      resultKeys: analyzeResult.result ? Object.keys(analyzeResult.result) : [],
      analyzeResultKeys: Object.keys(analyzeResult)
    });

    // Step 2: Generate refactoring tasks
    logger.info('🔧 [RefactoringStep] Step 2: Generating refactoring tasks...');
    const taskContext = {
      ...context,
      largeFiles: largeFiles
    };
    
    logger.info(`🔍 [RefactoringStep] Task context:`, {
      largeFilesCount: taskContext.largeFiles ? taskContext.largeFiles.length : 0,
      hasLargeFiles: !!taskContext.largeFiles
    });
    
    const taskResult = await stepRegistry.executeStep('RefactorGenerateTask', taskContext, options);
    
    if (!taskResult.success) {
      throw new Error('Task generation failed');
    }

    const taskCount = taskResult.result?.taskCount || taskResult.taskCount || 0;
    
    logger.info(`✅ [RefactoringStep] Refactoring orchestration completed successfully!`);
    logger.info(`📊 Analysis found ${largeFiles.length} large files`);
    logger.info(`🔧 Generated ${taskCount} refactoring tasks`);

    return {
      success: true,
      message: `Refactoring orchestration completed. Created ${taskCount} refactoring tasks.`,
      largeFiles: largeFiles, // Pass the largeFiles data through
      analysis: analyzeResult,
      tasks: taskResult,
      metadata: {
        projectPath,
        orchestrationTimestamp: new Date().toISOString(),
        totalFiles: largeFiles.length,
        totalTasks: taskCount
      }
    };

  } catch (error) {
    logger.error('❌ [RefactoringStep] Refactoring orchestration failed:', error);
    throw error;
  }
}

module.exports = { config, execute }; 