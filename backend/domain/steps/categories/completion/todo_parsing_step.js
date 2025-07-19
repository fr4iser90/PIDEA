/**
 * TODO Parsing Step - Parse TODO input into structured tasks
 * Converts raw TODO text into structured task objects with metadata
 * Used in workflow, not as user-facing button
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('todo_parsing_step');

// Step configuration
const config = {
  name: 'TodoParsingStep',
  type: 'completion',
  description: 'Parses TODO input into structured task objects',
  category: 'completion',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    enableDependencyDetection: true,
    enablePriorityDetection: true,
    enableTypeDetection: true,
    maxTasks: 50
  },
  validation: {
    requiredInputs: ['todoInput'],
    supportedFormats: ['text', 'markdown', 'list']
  }
};

class TodoParsingStep {
  constructor() {
    this.logger = logger;
  }

  /**
   * Execute TODO parsing
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Parsing results
   */
  async execute(context) {
    try {
      this.logger.info('Starting TODO parsing');
      
      const { todoInput, projectPath, options = {} } = context;
      
      if (!todoInput) {
        throw new Error('TODO input required for parsing');
      }

      const result = {
        timestamp: new Date(),
        projectPath,
        tasks: [],
        metadata: {
          totalTasks: 0,
          taskTypes: {},
          priorities: {},
          dependencies: []
        }
      };

      // Parse TODO input into tasks
      const tasks = await this._parseTodoInput(todoInput, options);
      
      // Detect task types and priorities
      const enhancedTasks = await this._enhanceTasks(tasks, options);
      
      // Detect dependencies between tasks
      const tasksWithDependencies = await this._detectDependencies(enhancedTasks, options);
      
      result.tasks = tasksWithDependencies;
      result.metadata.totalTasks = tasksWithDependencies.length;
      result.metadata.taskTypes = this._countTaskTypes(tasksWithDependencies);
      result.metadata.priorities = this._countPriorities(tasksWithDependencies);
      result.metadata.dependencies = this._extractDependencies(tasksWithDependencies);

      this.logger.info(`Parsed ${result.tasks.length} tasks from TODO input`);
      
      return result;
    } catch (error) {
      this.logger.error('TODO parsing failed:', error);
      throw error;
    }
  }

  /**
   * Parse raw TODO input into basic task objects
   */
  async _parseTodoInput(todoInput, options) {
    const tasks = [];
    const lines = todoInput.split('\n').filter(line => line.trim());
    
    let taskId = 1;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Parse different TODO formats
      const task = this._parseTodoLine(trimmedLine, taskId);
      
      if (task) {
        tasks.push(task);
        taskId++;
      }
      
      // Limit number of tasks
      if (tasks.length >= config.settings.maxTasks) {
        this.logger.warn(`Reached maximum task limit (${config.settings.maxTasks})`);
        break;
      }
    }
    
    return tasks;
  }

  /**
   * Parse individual TODO line
   */
  _parseTodoLine(line, taskId) {
    // Common TODO patterns
    const patterns = [
      // TODO: description
      /^TODO:\s*(.+)$/i,
      // - TODO: description
      /^-\s*TODO:\s*(.+)$/i,
      // * TODO: description
      /^\*\s*TODO:\s*(.+)$/i,
      // [ ] description
      /^\[\s*\]\s*(.+)$/,
      // - [ ] description
      /^-\s*\[\s*\]\s*(.+)$/,
      // * [ ] description
      /^\*\s*\[\s*\]\s*(.+)$/,
      // Numbered lists
      /^\d+\.\s*(.+)$/,
      // Simple dash lists
      /^-\s*(.+)$/,
      // Simple asterisk lists
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
      createdAt: new Date(),
      metadata: {
        originalLine: line,
        pattern: 'none'
      }
    };
  }

  /**
   * Enhance tasks with type and priority detection
   */
  async _enhanceTasks(tasks, options) {
    if (!config.settings.enableTypeDetection && !config.settings.enablePriorityDetection) {
      return tasks;
    }
    
    const enhancedTasks = [];
    
    for (const task of tasks) {
      const enhancedTask = { ...task };
      
      if (config.settings.enableTypeDetection) {
        enhancedTask.type = this._detectTaskType(task.description);
      }
      
      if (config.settings.enablePriorityDetection) {
        enhancedTask.priority = this._detectPriority(task.description);
      }
      
      enhancedTasks.push(enhancedTask);
    }
    
    return enhancedTasks;
  }

  /**
   * Detect task type from description
   */
  _detectTaskType(description) {
    const lowerDesc = description.toLowerCase();
    
    // Development tasks
    if (lowerDesc.includes('implement') || lowerDesc.includes('create') || lowerDesc.includes('add')) {
      return 'development';
    }
    
    // Testing tasks
    if (lowerDesc.includes('test') || lowerDesc.includes('spec') || lowerDesc.includes('coverage')) {
      return 'testing';
    }
    
    // Documentation tasks
    if (lowerDesc.includes('doc') || lowerDesc.includes('readme') || lowerDesc.includes('comment')) {
      return 'documentation';
    }
    
    // Refactoring tasks
    if (lowerDesc.includes('refactor') || lowerDesc.includes('clean') || lowerDesc.includes('optimize')) {
      return 'refactoring';
    }
    
    // Bug fixes
    if (lowerDesc.includes('fix') || lowerDesc.includes('bug') || lowerDesc.includes('error')) {
      return 'bugfix';
    }
    
    // Security tasks
    if (lowerDesc.includes('security') || lowerDesc.includes('vulnerability') || lowerDesc.includes('auth')) {
      return 'security';
    }
    
    // Performance tasks
    if (lowerDesc.includes('performance') || lowerDesc.includes('speed') || lowerDesc.includes('optimize')) {
      return 'performance';
    }
    
    return 'general';
  }

  /**
   * Detect priority from description
   */
  _detectPriority(description) {
    const lowerDesc = description.toLowerCase();
    
    // Critical priority keywords
    if (lowerDesc.includes('critical') || lowerDesc.includes('urgent') || lowerDesc.includes('asap')) {
      return 'critical';
    }
    
    // High priority keywords
    if (lowerDesc.includes('important') || lowerDesc.includes('high') || lowerDesc.includes('major')) {
      return 'high';
    }
    
    // Low priority keywords
    if (lowerDesc.includes('nice to have') || lowerDesc.includes('optional') || lowerDesc.includes('minor')) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Detect dependencies between tasks
   */
  async _detectDependencies(tasks, options) {
    if (!config.settings.enableDependencyDetection) {
      return tasks;
    }
    
    const tasksWithDependencies = [];
    
    for (const task of tasks) {
      const taskWithDeps = { ...task, dependencies: [] };
      
      // Check for explicit dependencies in description
      const dependencies = this._extractDependenciesFromDescription(task.description);
      taskWithDeps.dependencies = dependencies;
      
      // Check for implicit dependencies based on task type
      const implicitDeps = this._detectImplicitDependencies(task, tasks);
      taskWithDeps.dependencies = [...taskWithDeps.dependencies, ...implicitDeps];
      
      tasksWithDependencies.push(taskWithDeps);
    }
    
    return tasksWithDependencies;
  }

  /**
   * Extract explicit dependencies from task description
   */
  _extractDependenciesFromDescription(description) {
    const dependencies = [];
    const lowerDesc = description.toLowerCase();
    
    // After patterns
    const afterMatches = lowerDesc.match(/after\s+([^,\.]+)/g);
    if (afterMatches) {
      afterMatches.forEach(match => {
        const dep = match.replace('after', '').trim();
        dependencies.push({ type: 'after', target: dep });
      });
    }
    
    // Before patterns
    const beforeMatches = lowerDesc.match(/before\s+([^,\.]+)/g);
    if (beforeMatches) {
      beforeMatches.forEach(match => {
        const dep = match.replace('before', '').trim();
        dependencies.push({ type: 'before', target: dep });
      });
    }
    
    // Depends on patterns
    const dependsMatches = lowerDesc.match(/depends?\s+on\s+([^,\.]+)/g);
    if (dependsMatches) {
      dependsMatches.forEach(match => {
        const dep = match.replace(/depends?\s+on/, '').trim();
        dependencies.push({ type: 'depends', target: dep });
      });
    }
    
    return dependencies;
  }

  /**
   * Detect implicit dependencies based on task type
   */
  _detectImplicitDependencies(task, allTasks) {
    const dependencies = [];
    
    // Type-based dependencies
    const typeDependencies = {
      'testing': ['development', 'refactoring'],
      'documentation': ['development', 'refactoring'],
      'deployment': ['testing', 'development'],
      'security': ['development', 'refactoring'],
      'performance': ['development', 'refactoring']
    };
    
    const requiredTypes = typeDependencies[task.type] || [];
    
    for (const requiredType of requiredTypes) {
      const matchingTasks = allTasks.filter(t => t.type === requiredType && t.id !== task.id);
      matchingTasks.forEach(t => {
        dependencies.push({ type: 'implicit', target: t.id, reason: `requires_${requiredType}_task` });
      });
    }
    
    return dependencies;
  }

  /**
   * Count task types
   */
  _countTaskTypes(tasks) {
    return tasks.reduce((acc, task) => {
      acc[task.type] = (acc[task.type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Count priorities
   */
  _countPriorities(tasks) {
    return tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Extract all dependencies
   */
  _extractDependencies(tasks) {
    const allDependencies = [];
    
    tasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        allDependencies.push({
          taskId: task.id,
          dependencies: task.dependencies
        });
      }
    });
    
    return allDependencies;
  }
}

// Create instance for execution
const stepInstance = new TodoParsingStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 