/**
 * RefactorGenerateTaskStep - Creates refactoring tasks based on analysis
 * Generates detailed refactoring tasks for large files identified in analysis
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const Task = require('@entities/Task');
const TaskStatus = require('@value-objects/TaskStatus');
const TaskPriority = require('@value-objects/TaskPriority');
const TaskType = require('@value-objects/TaskType');

const config = {
  name: 'RefactorGenerateTask',
  type: 'refactoring',
  description: 'Creates refactoring tasks for identified large files',
  category: 'refactoring',
  version: '1.0.0',
};

async function execute(context, options = {}) {
  const projectPath = context.projectPath;
  const taskRepository = context.taskRepository;
  const largeFiles = context.largeFiles || [];

  if (!projectPath) throw new Error('Project path not found in context');
  if (!taskRepository) throw new Error('Task repository not found in context');

  console.log('🔧 [RefactorGenerateTask] Creating refactoring tasks...');
  console.log(`🔍 [RefactorGenerateTask] Received ${largeFiles.length} large files:`, largeFiles.slice(0, 3)); // Debug first 3 files

  try {
    const createdTasks = [];

    for (const fileInfo of largeFiles) {
      try {
        const task = await createRefactoringTask(fileInfo, projectPath, taskRepository, context);
        if (task) {
          createdTasks.push(task);
        }
      } catch (error) {
        console.error(`❌ [RefactorGenerateTask] Failed to create task for ${fileInfo.path}:`, error.message);
      }
    }

    console.log(`✅ [RefactorGenerateTask] Successfully created ${createdTasks.length} refactoring tasks`);

    return {
      success: true,
      tasks: createdTasks,
      taskCount: createdTasks.length,
      metadata: {
        projectPath,
        generationTimestamp: new Date().toISOString(),
        processedFiles: largeFiles.length
      }
    };

  } catch (error) {
    console.error('❌ [RefactorGenerateTask] Task generation failed:', error);
    throw error;
  }
}

async function createRefactoringTask(fileInfo, projectPath, taskRepository, context) {
  // Check if task already exists for this file
  let existingTasks = [];
  try {
    if (taskRepository && typeof taskRepository.findByProjectPath === 'function') {
      existingTasks = await taskRepository.findByProjectPath(projectPath);
    }
  } catch (error) {
    console.warn('⚠️ [RefactorGenerateTask] Error checking existing tasks:', error.message);
  }

  const existingTask = existingTasks.find(task => 
    task.metadata?.filePath === fileInfo.path && 
    task.title.includes(path.basename(fileInfo.path, path.extname(fileInfo.path)))
  );

  if (existingTask) {
    console.log(`⚠️ [RefactorGenerateTask] Task already exists for ${fileInfo.path}, skipping...`);
    return existingTask;
  }

  const taskId = `refactor_${Date.now()}_${uuidv4().substring(0, 8)}`;
  const fileName = path.basename(fileInfo.path, path.extname(fileInfo.path));
  const fileExt = path.extname(fileInfo.path);

  // Validate file info
  let lines = fileInfo.lines;
  if (!lines || lines <= 0) {
    console.warn(`⚠️ [RefactorGenerateTask] Invalid line count for ${fileInfo.path}: ${lines}, skipping...`);
    return null;
  }

  // Determine file type and create appropriate task
  let taskType = TaskType.REFACTOR;
  let taskTitle = '';
  let taskDescription = '';

  if (fileExt === '.jsx' || fileExt === '.tsx') {
    taskType = TaskType.REFACTOR_REACT;
    taskTitle = `Refactor React Component: ${fileName}`;
    taskDescription = `Split the large React component ${fileName} (${fileInfo.lines} lines) into smaller, more maintainable files.`;
  } else if (fileExt === '.js' || fileExt === '.ts') {
    taskType = TaskType.REFACTOR_NODE;
    taskTitle = `Refactor Node.js File: ${fileName}`;
    taskDescription = `Split the large Node.js file ${fileName} (${fileInfo.lines} lines) into smaller, more maintainable modules.`;
  } else {
    taskTitle = `Refactor File: ${fileName}`;
    taskDescription = `Split the large file ${fileName} (${fileInfo.lines} lines) into smaller, more maintainable files.`;
  }

  // Create task metadata
  const taskMetadata = {
    refactoringType: 'file-split',
    originalFile: fileInfo.path,
    filePath: fileInfo.path,
    projectPath: projectPath,
    fileSize: fileInfo.lines,
    package: fileInfo.package,
    lines: fileInfo.lines,
    currentLines: fileInfo.lines,
    targetLines: '<500',
    estimatedTime: fileInfo.estimatedTime,
    refactoringSteps: generateRefactoringSteps(fileInfo),
    analysisId: `refactor_generate_task_${Date.now()}_${uuidv4().substring(0, 8)}`
  };

  // Get projectId from context or use ProjectMappingService
  let projectId = context.projectId;
  
  if (!projectId && projectPath) {
    try {
      // Try to get projectId from ProjectMappingService
      const { ProjectMappingService } = require('@services/ProjectMappingService');
      const projectMappingService = new ProjectMappingService();
      projectId = await projectMappingService.getProjectIdFromWorkspace(projectPath);
    } catch (error) {
      console.warn('⚠️ [RefactorGenerateTask] Failed to get projectId from ProjectMappingService:', error.message);
      // Fallback: use projectPath as projectId (temporary)
      projectId = projectPath;
    }
  }
  
  if (!projectId) {
    throw new Error('Project ID is required for task creation');
  }

  // Create Task entity with explicit parameter order
  const task = new Task(
    taskId,           // id
    projectId,        // projectId
    taskTitle,        // title
    taskDescription,  // description
    TaskStatus.PENDING, // status
    TaskPriority.MEDIUM, // priority (explicit, no fallback)
    taskType,         // type
    null,             // category (explicit null)
    taskMetadata      // metadata
  );
  
  console.log('🔍 [RefactorGenerateTask] Task created with projectId:', task.projectId);

  // Save task to repository
  try {
    if (taskRepository && typeof taskRepository.create === 'function') {
      await taskRepository.create(task);
      console.log(`✅ [RefactorGenerateTask] Task saved to repository: ${taskId}`);
    } else {
      console.warn('⚠️ [RefactorGenerateTask] taskRepository.create not available, task created in memory only');
    }
  } catch (error) {
    console.error(`❌ [RefactorGenerateTask] Failed to save task ${taskId}:`, error.message);
  }

  console.log(`✅ [RefactorGenerateTask] Created refactoring task for ${fileInfo.path} (${fileInfo.lines} lines)`);

  return task;
}

function generateRefactoringSteps(fileInfo) {
  const fileName = path.basename(fileInfo.path, path.extname(fileInfo.path));
  const fileExt = path.extname(fileInfo.path);

  const baseSteps = [
    `Analyze the current structure of ${fileName} to identify extractable functions and components`,
    `Create backup of the original file before making changes`,
    `Extract utility functions and helper methods into separate modules`,
    `Separate business logic from presentation/UI logic`,
    `Extract constants and configuration into dedicated files`,
    `Split large functions into smaller, more focused functions`,
    `Update import statements in the original file`,
    `Test all extracted functionality to ensure no regressions`,
    `Update documentation and comments`,
    `Verify that the refactored code maintains the same functionality`
  ];

  if (fileExt === '.jsx' || fileExt === '.tsx') {
    return [
      ...baseSteps,
      `Extract reusable React components into separate files`,
      `Create custom hooks for shared logic`,
      `Separate component logic from UI rendering`,
      `Extract prop types and interfaces into types file`,
      `Create component-specific utility functions`
    ];
  } else if (fileExt === '.js' || fileExt === '.ts') {
    return [
      ...baseSteps,
      `Extract service layer functions into separate service files`,
      `Separate data processing logic from business logic`,
      `Create dedicated validation modules`,
      `Extract event handlers and listeners into separate files`,
      `Organize imports and exports for better maintainability`
    ];
  } else {
    return baseSteps;
  }
}

module.exports = { config, execute };
