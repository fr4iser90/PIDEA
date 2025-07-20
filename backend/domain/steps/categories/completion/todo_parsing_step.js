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
  dependencies: ['taskRepository'],
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
    this.dependencies = ['taskRepository'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = TodoParsingStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath, todoInput } = context;
      
      logger.info(`📝 Parsing TODO items for project ${projectId}`);
      
      // Get task repository from application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const taskRepository = application.taskRepository;
      if (!taskRepository) {
        throw new Error('Task repository not available');
      }
      
      // Parse TODO items
      const tasks = await this.parseTodos(todoInput, projectId);
      
      // Save tasks to repository
      const savedTasks = [];
      for (const task of tasks) {
        const savedTask = await taskRepository.create(task);
        savedTasks.push(savedTask);
      }
      
      logger.info(`✅ TODO parsing completed: ${savedTasks.length} tasks created`);
      
      return {
        success: true,
        message: 'TODO parsing completed',
        data: {
          tasks: savedTasks,
          totalTasks: savedTasks.length,
          projectId
        }
      };
      
    } catch (error) {
      logger.error('❌ TODO parsing failed:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
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

  validateContext(context) {
    if (!context.projectId) {
      throw new Error('Project ID is required');
    }
  }
}

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => {
    const stepInstance = new TodoParsingStep();
    return await stepInstance.execute(context);
  }
}; 