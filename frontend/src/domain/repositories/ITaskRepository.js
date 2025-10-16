/**
 * ITaskRepository Interface
 * Defines the contract for task data access
 */
export class ITaskRepository {
  /**
   * Find task by ID
   * @param {string} taskId - The task ID
   * @returns {Promise<Task|null>} The task or null if not found
   */
  async findById(taskId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find tasks by project ID
   * @param {string} projectId - The project ID
   * @param {Object} options - Query options
   * @returns {Promise<Task[]>} Array of tasks
   */
  async findByProjectId(projectId, options = {}) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find tasks by status
   * @param {string} status - The task status
   * @param {Object} options - Query options
   * @returns {Promise<Task[]>} Array of tasks
   */
  async findByStatus(status, options = {}) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find tasks by type
   * @param {TaskType} type - The task type
   * @param {Object} options - Query options
   * @returns {Promise<Task[]>} Array of tasks
   */
  async findByType(type, options = {}) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find active tasks for project
   * @param {string} projectId - The project ID
   * @returns {Promise<Task[]>} Array of active tasks
   */
  async findActiveByProject(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find project by ID (for validation)
   * @param {string} projectId - The project ID
   * @returns {Promise<Project|null>} The project or null if not found
   */
  async findProjectById(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Save task
   * @param {Task} task - The task to save
   * @returns {Promise<Task>} The saved task
   */
  async save(task) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Update task
   * @param {Task} task - The task to update
   * @returns {Promise<Task>} The updated task
   */
  async update(task) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Delete task
   * @param {string} taskId - The task ID to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async delete(taskId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get task count by project
   * @param {string} projectId - The project ID
   * @returns {Promise<number>} Number of tasks
   */
  async countByProject(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get task count by status
   * @param {string} status - The task status
   * @returns {Promise<number>} Number of tasks
   */
  async countByStatus(status) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get task statistics
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Task statistics
   */
  async getStatistics(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Search tasks by query
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Task[]>} Array of matching tasks
   */
  async search(query, options = {}) {
    throw new Error('Method must be implemented by concrete repository');
  }
}
