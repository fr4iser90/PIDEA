/**
 * TaskSequencer - Service for sequencing tasks based on dependencies
 * Implements topological sorting for task dependency resolution
 */
class TaskSequencer {
  constructor() {
    this.dependencyPatterns = [
      // After patterns
      {
        regex: /after\s+(.+)/gi,
        type: 'after',
        priority: 1
      },
      // Before patterns
      {
        regex: /before\s+(.+)/gi,
        type: 'before',
        priority: 2
      },
      // Depends on patterns
      {
        regex: /depends?\s+on\s+(.+)/gi,
        type: 'depends',
        priority: 3
      },
      // Requires patterns
      {
        regex: /requires?\s+(.+)/gi,
        type: 'requires',
        priority: 4
      },
      // Needs patterns
      {
        regex: /needs?\s+(.+)/gi,
        type: 'needs',
        priority: 5
      },
      // Prerequisite patterns
      {
        regex: /prerequisite\s+(.+)/gi,
        type: 'prerequisite',
        priority: 6
      }
    ];
    
    // Task type dependencies (built-in knowledge)
    this.typeDependencies = {
      'database': ['api', 'ui'], // Database changes should come before API/UI
      'api': ['ui'], // API changes should come before UI
      'test': ['ui', 'api', 'database'], // Tests should come after implementation
      'deployment': ['ui', 'api', 'database', 'test'], // Deployment should come last
      'security': ['ui', 'api', 'database'], // Security should be applied after implementation
      'performance': ['ui', 'api', 'database'], // Performance should be applied after implementation
      'refactor': ['ui', 'api', 'database'] // Refactoring should be applied after implementation
    };
    
    // Configuration
    this.config = {
      enableTypeDependencies: true,
      enableExplicitDependencies: true,
      enableImplicitDependencies: true,
      maxDependencyDepth: 10,
      circularDependencyDetection: true
    };
    
    this.logger = console;
  }

  /**
   * Initialize the task sequencer
   */
  async initialize() {
    this.logger.info('[TaskSequencer] Initializing task sequencer...');
    this.logger.info(`[TaskSequencer] Loaded ${this.dependencyPatterns.length} dependency patterns`);
    return true;
  }

  /**
   * Sequence tasks based on dependencies
   * @param {Array} tasks - Array of tasks to sequence
   * @returns {Promise<Array>} Sequenced tasks
   */
  async sequence(tasks) {
    try {
      this.logger.info(`[TaskSequencer] Sequencing ${tasks.length} tasks...`);
      
      if (!tasks || tasks.length === 0) {
        return [];
      }
      
      if (tasks.length === 1) {
        return tasks;
      }
      
      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(tasks);
      
      // Detect circular dependencies
      if (this.config.circularDependencyDetection) {
        const circularDeps = this.detectCircularDependencies(dependencyGraph);
        if (circularDeps.length > 0) {
          this.logger.warn('[TaskSequencer] Circular dependencies detected:', circularDeps);
          // Break circular dependencies by removing some edges
          this.breakCircularDependencies(dependencyGraph, circularDeps);
        }
      }
      
      // Perform topological sort
      const sortedTaskIds = this.topologicalSort(dependencyGraph);
      
      // Map back to task objects
      const sequencedTasks = sortedTaskIds.map(taskId => 
        tasks.find(task => task.id === taskId)
      ).filter(Boolean);
      
      this.logger.info(`[TaskSequencer] Successfully sequenced ${sequencedTasks.length} tasks`);
      
      return sequencedTasks;
      
    } catch (error) {
      this.logger.error('[TaskSequencer] Sequencing failed:', error.message);
      
      // Fallback: return tasks in original order
      this.logger.warn('[TaskSequencer] Falling back to original task order');
      return tasks;
    }
  }

  /**
   * Build dependency graph from tasks
   * @param {Array} tasks - Array of tasks
   * @returns {Object} Dependency graph
   */
  buildDependencyGraph(tasks) {
    const graph = {};
    const taskMap = new Map(tasks.map(task => [task.id, task]));
    
    // Initialize graph
    for (const task of tasks) {
      graph[task.id] = {
        task,
        dependencies: new Set(),
        dependents: new Set(),
        explicitDeps: [],
        implicitDeps: [],
        typeDeps: []
      };
    }
    
    // Process explicit dependencies
    if (this.config.enableExplicitDependencies) {
      this.processExplicitDependencies(graph, taskMap);
    }
    
    // Process type dependencies
    if (this.config.enableTypeDependencies) {
      this.processTypeDependencies(graph, taskMap);
    }
    
    // Process implicit dependencies
    if (this.config.enableImplicitDependencies) {
      this.processImplicitDependencies(graph, taskMap);
    }
    
    // Build adjacency lists
    for (const [taskId, node] of Object.entries(graph)) {
      for (const depId of node.dependencies) {
        if (graph[depId]) {
          graph[depId].dependents.add(taskId);
        }
      }
    }
    
    return graph;
  }

  /**
   * Process explicit dependencies from task descriptions
   * @param {Object} graph - Dependency graph
   * @param {Map} taskMap - Task ID to task mapping
   */
  processExplicitDependencies(graph, taskMap) {
    for (const [taskId, node] of Object.entries(graph)) {
      const task = node.task;
      const description = task.description.toLowerCase();
      
      for (const pattern of this.dependencyPatterns) {
        const matches = description.matchAll(pattern.regex);
        
        for (const match of matches) {
          const dependencyText = match[1].trim();
          const dependencyTask = this.findDependencyTask(dependencyText, taskMap);
          
          if (dependencyTask && dependencyTask.id !== taskId) {
            node.dependencies.add(dependencyTask.id);
            node.explicitDeps.push({
              type: pattern.type,
              text: dependencyText,
              taskId: dependencyTask.id,
              confidence: this.calculateDependencyConfidence(dependencyText, dependencyTask)
            });
          }
        }
      }
    }
  }

  /**
   * Process type-based dependencies
   * @param {Object} graph - Dependency graph
   * @param {Map} taskMap - Task ID to task mapping
   */
  processTypeDependencies(graph, taskMap) {
    for (const [taskId, node] of Object.entries(graph)) {
      const task = node.task;
      const taskType = task.type;
      
      if (this.typeDependencies[taskType]) {
        const dependentTypes = this.typeDependencies[taskType];
        
        for (const dependentType of dependentTypes) {
          const dependentTasks = Array.from(taskMap.values())
            .filter(t => t.type === dependentType && t.id !== taskId);
          
          for (const dependentTask of dependentTasks) {
            node.dependencies.add(dependentTask.id);
            node.typeDeps.push({
              type: 'type_dependency',
              dependentType,
              taskId: dependentTask.id,
              confidence: 0.7
            });
          }
        }
      }
    }
  }

  /**
   * Process implicit dependencies based on task content
   * @param {Object} graph - Dependency graph
   * @param {Map} taskMap - Task ID to task mapping
   */
  processImplicitDependencies(graph, taskMap) {
    for (const [taskId, node] of Object.entries(graph)) {
      const task = node.task;
      const description = task.description.toLowerCase();
      
      // Look for implicit dependencies based on content
      const implicitDeps = this.findImplicitDependencies(description, taskMap, taskId);
      
      for (const dep of implicitDeps) {
        node.dependencies.add(dep.taskId);
        node.implicitDeps.push(dep);
      }
    }
  }

  /**
   * Find dependency task based on text
   * @param {string} dependencyText - Dependency text
   * @param {Map} taskMap - Task ID to task mapping
   * @returns {Object|null} Matching task
   */
  findDependencyTask(dependencyText, taskMap) {
    const lowerText = dependencyText.toLowerCase();
    
    // Try exact match first
    for (const task of taskMap.values()) {
      if (task.description.toLowerCase().includes(lowerText) ||
          lowerText.includes(task.description.toLowerCase())) {
        return task;
      }
    }
    
    // Try partial match
    for (const task of taskMap.values()) {
      const words = lowerText.split(/\s+/);
      const taskWords = task.description.toLowerCase().split(/\s+/);
      
      const commonWords = words.filter(word => 
        taskWords.some(taskWord => 
          taskWord.includes(word) || word.includes(taskWord)
        )
      );
      
      if (commonWords.length >= Math.min(words.length, 2)) {
        return task;
      }
    }
    
    return null;
  }

  /**
   * Find implicit dependencies
   * @param {string} description - Task description
   * @param {Map} taskMap - Task ID to task mapping
   * @param {string} currentTaskId - Current task ID
   * @returns {Array} Implicit dependencies
   */
  findImplicitDependencies(description, taskMap, currentTaskId) {
    const dependencies = [];
    
    // Look for common patterns that suggest dependencies
    const patterns = [
      { regex: /button|form|input/gi, type: 'ui_component' },
      { regex: /api|endpoint|route/gi, type: 'api_endpoint' },
      { regex: /database|table|schema/gi, type: 'database_schema' },
      { regex: /test|spec/gi, type: 'test_implementation' }
    ];
    
    for (const pattern of patterns) {
      if (description.match(pattern.regex)) {
        const relatedTasks = Array.from(taskMap.values())
          .filter(task => 
            task.id !== currentTaskId &&
            task.description.toLowerCase().match(pattern.regex)
          );
        
        for (const relatedTask of relatedTasks) {
          dependencies.push({
            type: 'implicit',
            pattern: pattern.type,
            taskId: relatedTask.id,
            confidence: 0.5
          });
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Calculate dependency confidence
   * @param {string} dependencyText - Dependency text
   * @param {Object} dependencyTask - Dependency task
   * @returns {number} Confidence score
   */
  calculateDependencyConfidence(dependencyText, dependencyTask) {
    const textWords = dependencyText.toLowerCase().split(/\s+/);
    const taskWords = dependencyTask.description.toLowerCase().split(/\s+/);
    
    const commonWords = textWords.filter(word => 
      taskWords.some(taskWord => 
        taskWord.includes(word) || word.includes(taskWord)
      )
    );
    
    return Math.min(commonWords.length / Math.max(textWords.length, 1), 1.0);
  }

  /**
   * Detect circular dependencies
   * @param {Object} graph - Dependency graph
   * @returns {Array} Circular dependencies
   */
  detectCircularDependencies(graph) {
    const visited = new Set();
    const recursionStack = new Set();
    const circularDeps = [];
    
    const dfs = (taskId, path = []) => {
      if (recursionStack.has(taskId)) {
        const cycle = path.slice(path.indexOf(taskId));
        circularDeps.push(cycle);
        return;
      }
      
      if (visited.has(taskId)) {
        return;
      }
      
      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);
      
      const node = graph[taskId];
      if (node) {
        for (const depId of node.dependencies) {
          dfs(depId, [...path]);
        }
      }
      
      recursionStack.delete(taskId);
    };
    
    for (const taskId of Object.keys(graph)) {
      if (!visited.has(taskId)) {
        dfs(taskId);
      }
    }
    
    return circularDeps;
  }

  /**
   * Break circular dependencies
   * @param {Object} graph - Dependency graph
   * @param {Array} circularDeps - Circular dependencies
   */
  breakCircularDependencies(graph, circularDeps) {
    for (const cycle of circularDeps) {
      // Remove the edge with lowest confidence
      let lowestConfidence = 1.0;
      let edgeToRemove = null;
      
      for (let i = 0; i < cycle.length; i++) {
        const currentId = cycle[i];
        const nextId = cycle[(i + 1) % cycle.length];
        const node = graph[currentId];
        
        if (node && node.dependencies.has(nextId)) {
          const dep = node.explicitDeps.find(d => d.taskId === nextId) ||
                     node.implicitDeps.find(d => d.taskId === nextId) ||
                     node.typeDeps.find(d => d.taskId === nextId);
          
          const confidence = dep ? dep.confidence : 0.5;
          
          if (confidence < lowestConfidence) {
            lowestConfidence = confidence;
            edgeToRemove = { from: currentId, to: nextId };
          }
        }
      }
      
      if (edgeToRemove) {
        const node = graph[edgeToRemove.from];
        if (node) {
          node.dependencies.delete(edgeToRemove.to);
          this.logger.warn(`[TaskSequencer] Removed circular dependency: ${edgeToRemove.from} -> ${edgeToRemove.to}`);
        }
      }
    }
  }

  /**
   * Perform topological sort
   * @param {Object} graph - Dependency graph
   * @returns {Array} Sorted task IDs
   */
  topologicalSort(graph) {
    const result = [];
    const visited = new Set();
    const temp = new Set();
    
    const visit = (taskId) => {
      if (temp.has(taskId)) {
        throw new Error(`Circular dependency detected involving task ${taskId}`);
      }
      
      if (visited.has(taskId)) {
        return;
      }
      
      temp.add(taskId);
      
      const node = graph[taskId];
      if (node) {
        for (const depId of node.dependencies) {
          visit(depId);
        }
      }
      
      temp.delete(taskId);
      visited.add(taskId);
      result.push(taskId);
    };
    
    for (const taskId of Object.keys(graph)) {
      if (!visited.has(taskId)) {
        visit(taskId);
      }
    }
    
    return result;
  }

  /**
   * Get dependency analysis for tasks
   * @param {Array} tasks - Array of tasks
   * @returns {Object} Dependency analysis
   */
  async getDependencyAnalysis(tasks) {
    const graph = this.buildDependencyGraph(tasks);
    const circularDeps = this.detectCircularDependencies(graph);
    
    const analysis = {
      totalTasks: tasks.length,
      totalDependencies: 0,
      explicitDependencies: 0,
      implicitDependencies: 0,
      typeDependencies: 0,
      circularDependencies: circularDeps.length,
      dependencyGraph: {},
      recommendations: []
    };
    
    // Count dependencies
    for (const [taskId, node] of Object.entries(graph)) {
      analysis.totalDependencies += node.dependencies.size;
      analysis.explicitDependencies += node.explicitDeps.length;
      analysis.implicitDependencies += node.implicitDeps.length;
      analysis.typeDependencies += node.typeDeps.length;
      
      analysis.dependencyGraph[taskId] = {
        dependencies: Array.from(node.dependencies),
        dependents: Array.from(node.dependents),
        explicitDeps: node.explicitDeps,
        implicitDeps: node.implicitDeps,
        typeDeps: node.typeDeps
      };
    }
    
    // Generate recommendations
    if (circularDeps.length > 0) {
      analysis.recommendations.push('Circular dependencies detected - consider breaking cycles');
    }
    
    if (analysis.totalDependencies === 0) {
      analysis.recommendations.push('No dependencies found - tasks can be executed in any order');
    }
    
    return analysis;
  }

  /**
   * Get sequencer statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      patterns: this.dependencyPatterns.length,
      typeDependencies: Object.keys(this.typeDependencies).length,
      config: this.config
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('[TaskSequencer] Cleaning up task sequencer...');
    // No specific cleanup needed for task sequencer
  }
}

module.exports = TaskSequencer; 