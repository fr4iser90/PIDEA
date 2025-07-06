const TaskRepository = require('@/domain/repositories/TaskRepository');

/**
 * InMemoryTaskRepository - In-memory implementation for testing and development
 */
class InMemoryTaskRepository extends TaskRepository {
  constructor() {
    super();
    this.tasks = new Map();
  }

  async create(task) {
    this.tasks.set(task.id, task);
    return task;
  }

  async findById(id) {
    const task = this.tasks.get(id) || null;
    console.log('🔍 [InMemoryTaskRepository] findById:', { 
      requestedId: id, 
      found: !!task,
      totalTasks: this.tasks.size,
      availableIds: Array.from(this.tasks.keys()).slice(0, 5) // Show first 5 IDs
    });
    return task;
  }

  async findByProject(projectId, filters = {}) {
    let tasks = Array.from(this.tasks.values()).filter(task => task.belongsToProject(projectId));

    // Apply filters
    if (filters.status) {
      tasks = tasks.filter(task => task.status === filters.status);
    }
    if (filters.priority) {
      tasks = tasks.filter(task => task.priority === filters.priority);
    }
    if (filters.type) {
      tasks = tasks.filter(task => task.type === filters.type);
    }

    return tasks;
  }

  async update(id, updatedTask) {
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Replace the entire task object
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async delete(id) {
    const exists = this.tasks.has(id);
    this.tasks.delete(id);
    return exists;
  }

  async findByStatus(projectId, status) {
    return Array.from(this.tasks.values()).filter(
      task => task.belongsToProject(projectId) && task.status === status
    );
  }

  async findByPriority(projectId, priority) {
    return Array.from(this.tasks.values()).filter(
      task => task.belongsToProject(projectId) && task.priority === priority
    );
  }

  async findByType(projectId, type) {
    return Array.from(this.tasks.values()).filter(
      task => task.belongsToProject(projectId) && task.type === type
    );
  }

  async getProjectStats(projectId) {
    const projectTasks = Array.from(this.tasks.values()).filter(
      task => task.belongsToProject(projectId)
    );

    const stats = {
      total: projectTasks.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      failed: 0,
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      byType: {
        feature: 0,
        bug: 0,
        refactor: 0,
        documentation: 0,
        test: 0,
        optimization: 0,
        security: 0
      }
    };

    projectTasks.forEach(task => {
      stats[task.status]++;
      stats.byPriority[task.priority]++;
      stats.byType[task.type]++;
    });

    return stats;
  }

  // Clear all tasks (for testing)
  async clear() {
    this.tasks.clear();
  }
}

module.exports = InMemoryTaskRepository; 