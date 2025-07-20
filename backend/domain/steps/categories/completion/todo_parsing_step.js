/**
 * Todo Parsing Step
 * Parses TODO items into structured tasks
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('todo_parsing_step');

// Step configuration
const config = {
  name: 'TodoParsingStep',
  type: 'completion',
  category: 'completion',
  description: 'Parse TODO items into structured tasks',
  version: '1.0.0',
  dependencies: ['TaskRepository'],
  settings: {
    includePriorityDetection: true,
    includeTypeDetection: true,
    includeDependencyDetection: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath', 'todoInput']
  }
};

class TodoParsingStep {
  constructor() {
    this.name = 'TodoParsingStep';
    this.description = 'Parse TODO items into structured tasks';
    this.category = 'completion';
    this.version = '1.0.0';
  }

  async execute(context) {
    try {
      logger.info('Starting TodoParsingStep execution');
      
      // Get TaskRepository via dependency injection (NOT global.application!)
      const taskRepository = context.getService('TaskRepository');
      if (!taskRepository) {
        throw new Error('TaskRepository not available in context');
      }

      const { projectId, workspacePath, todoInput } = context;

      logger.info(`Parsing TODO items for project: ${projectId}`);
      
      // Parse TODO items
      const tasks = await this.parseTodos(todoInput, projectId);
      
      if (tasks.length === 0) {
        logger.info('No TODO items found to parse');
        return {
          success: true,
          message: 'No TODO items found to parse',
          data: { createdTasks: 0 }
        };
      }

      // Save tasks to repository
      const savedTasks = [];
      for (const task of tasks) {
        try {
          const savedTask = await taskRepository.create(task);
          savedTasks.push(savedTask);
          logger.info(`Created task: ${savedTask.id} - ${savedTask.description}`);
        } catch (error) {
          logger.error(`Failed to create task: ${task.description}`, error);
        }
      }
      
      logger.info(`TodoParsingStep completed: ${savedTasks.length}/${tasks.length} tasks created`);
      
      return {
        success: true,
        message: 'TODO parsing completed',
        data: {
          createdTasks: savedTasks.length,
          totalTasks: tasks.length,
          tasks: savedTasks,
          projectId
        }
      };
      
    } catch (error) {
      logger.error('Error in TodoParsingStep:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async parseTodos(todoInput, projectId) {
    const tasks = [];
    
    if (!todoInput) {
      return tasks;
    }
    
    const lines = todoInput.split('\n').filter(line => line.trim());
    let taskId = 1;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Parse TODO line
      const task = this.parseTodoLine(trimmedLine, taskId, projectId);
      
      if (task) {
        tasks.push(task);
        taskId++;
      }
    }
    
    return tasks;
  }

  parseTodoLine(line, taskId, projectId) {
    // Common TODO patterns
    const patterns = [
      /^TODO:\s*(.+)$/i,
      /^-\s*TODO:\s*(.+)$/i,
      /^\*\s*TODO:\s*(.+)$/i,
      /^\[\s*\]\s*(.+)$/,
      /^-\s*\[\s*\]\s*(.+)$/,
      /^\*\s*\[\s*\]\s*(.+)$/,
      /^\d+\.\s*(.+)$/,
      /^-\s*(.+)$/,
      /^\*\s*(.+)$/
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const description = match[1].trim();
        
        return {
          id: `task-${taskId}`,
          description,
          type: 'general',
          priority: 'medium',
          status: 'pending',
          projectId,
          createdAt: new Date(),
          metadata: {
            originalLine: line,
            pattern: pattern.toString()
          }
        };
      }
    }
    
    // If no pattern matches, treat as general task
    return {
      id: `task-${taskId}`,
      description: line,
      type: 'general',
      priority: 'medium',
      status: 'pending',
      projectId,
      createdAt: new Date(),
      metadata: {
        originalLine: line,
        pattern: 'none'
      }
    };
  }
}

// Create instance for execution
const stepInstance = new TodoParsingStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
